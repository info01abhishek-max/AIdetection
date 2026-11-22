import os
import logging
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional
import io

from app.config import settings
from app.schemas import (
    UploadResponse, StatusResponse, AnalysisResult, HealthCheck, ErrorResponse
)
from app.services.analysis_service import analysis_service
from app.services.audio_processor import audio_processor
from app.cloud_storage import (
    SupabaseConfig, CloudStorageManager, init_cloud_storage,
    upload_original_file, upload_report_file,
    save_analysis_complete, save_analysis_failed
)

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize cloud storage
cloud_config = SupabaseConfig(
    url=settings.SUPABASE_URL,
    service_key=settings.SUPABASE_SERVICE_KEY,
    anon_key=settings.SUPABASE_ANON_KEY,
    bucket_audio=settings.SUPABASE_BUCKET_AUDIO,
    local_temp_dir=settings.LOCAL_TEMP_DIR,
    max_temp_age_hours=settings.MAX_LOCAL_TEMP_AGE_HOURS
)
cloud_storage = init_cloud_storage(cloud_config)


@router.get("/health", response_model=HealthCheck)
async def health_check():
    import time
    from app.models.audio.detection_models import detector_registry
    start_time = getattr(health_check, 'start_time', time.time())
    health_check.start_time = start_time

    # Ensure detectors are loaded (lifespan may not run in tests)
    if not any(d.loaded for d in detector_registry.detectors):
        detector_registry.load_all()

    models_loaded = [d.name for d in detector_registry.detectors if d.loaded]

    return HealthCheck(
        status="healthy" if len(models_loaded) > 0 else "degraded",
        version=settings.VERSION,
        models_loaded=models_loaded,
        uptime=time.time() - start_time,
    )


@router.post("/analyze/upload", response_model=UploadResponse)
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    if file.content_type not in settings.SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(settings.SUPPORTED_FORMATS)}"
        )

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / (1024*1024)}MB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in [".wav", ".mp3", ".m4a", ".flac", ".ogg", ".opus", ".webm"]:
        file_ext = ".wav"

    saved_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    valid, error = audio_processor.validate_audio(file_path)
    if not valid:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=error)

    analysis_id = analysis_service.create_analysis(file_path, file.filename or "unknown")

    # Upload original file to cloud storage if enabled
    if settings.ENABLE_CLOUD_STORAGE and settings.UPLOAD_ORIGINALS_TO_CLOUD:
        background_tasks.add_task(upload_original_to_cloud, "audio", file_path, analysis_id)

    background_tasks.add_task(run_analysis_task, analysis_id)

    return UploadResponse(analysis_id=analysis_id, status="uploading")


async def upload_original_to_cloud(analysis_type: str, local_path: str, analysis_id: str):
    """Background task to upload original file to cloud storage."""
    try:
        from pathlib import Path
        result = upload_original_file(cloud_storage, analysis_type, Path(local_path), analysis_id)
        if result.get("success"):
            logger.info(f"Uploaded original file to cloud: {result.get('public_url')}")
            # Update analysis record with cloud path
            analysis = analysis_service.analysis_store.get(analysis_id, {})
            analysis["cloud_storage_path"] = result.get("path")
        else:
            logger.warning(f"Failed to upload original to cloud: {result.get('error')}")
    except Exception as e:
        logger.error(f"Cloud upload failed for {analysis_id}: {e}")


async def run_analysis_task(analysis_id: str):
    try:
        analysis_service.run_analysis(analysis_id)

        # After analysis completes, upload report to cloud
        if settings.ENABLE_CLOUD_STORAGE and settings.UPLOAD_REPORTS_TO_CLOUD:
            await upload_report_to_cloud("audio", analysis_id)

    except Exception as e:
        logger.error(f"Background analysis failed for {analysis_id}: {e}")
        # Mark as failed in cloud
        if settings.ENABLE_CLOUD_STORAGE:
            save_analysis_failed(cloud_storage, analysis_id, str(e))


async def upload_report_to_cloud(analysis_type: str, analysis_id: str):
    """Upload analysis report to cloud storage and update database."""
    try:
        result = analysis_service.get_result(analysis_id)
        if result:
            # Save complete analysis to cloud (both storage and database)
            success = save_analysis_complete(cloud_storage, analysis_id, analysis_type, result)
            if success:
                logger.info(f"Uploaded analysis report to cloud for {analysis_id}")
            else:
                logger.warning(f"Failed to upload analysis report to cloud for {analysis_id}")
    except Exception as e:
        logger.error(f"Cloud report upload failed for {analysis_id}: {e}")


@router.get("/analyze/{analysis_id}/status", response_model=StatusResponse)
async def get_analysis_status(analysis_id: str):
    status = analysis_service.get_status(analysis_id)
    if status["status"] == "error" and analysis_id not in analysis_service.analysis_store:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return StatusResponse(**status)


@router.get("/analyze/{analysis_id}/result", response_model=AnalysisResult)
async def get_analysis_result(analysis_id: str):
    result = analysis_service.get_result(analysis_id)
    if not result:
        status = analysis_service.get_status(analysis_id)
        if status["status"] in ["uploading", "scanning", "analyzing"]:
            raise HTTPException(status_code=202, detail="Analysis still in progress")
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.get("/analyze/{analysis_id}/report")
async def download_report(analysis_id: str, format: str = Query("json", enum=["json"])):
    try:
        report_data = analysis_service.generate_report(analysis_id, format)
        result = analysis_service.get_result(analysis_id)

        if format == "json":
            filename = f"analysis-report-{analysis_id}.json"
            return StreamingResponse(
                io.BytesIO(report_data),
                media_type="application/json",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'}
            )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.delete("/analyze/{analysis_id}")
async def delete_analysis(analysis_id: str):
    if analysis_id in analysis_service.analysis_store:
        analysis = analysis_service.analysis_store[analysis_id]
        file_path = analysis.get("file_path")
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        result_path = os.path.join(settings.RESULTS_DIR, f"{analysis_id}.json")
        if os.path.exists(result_path):
            os.remove(result_path)

        # Also delete from cloud storage if enabled
        if settings.ENABLE_CLOUD_STORAGE:
            try:
                cloud_storage.delete_file("audio", analysis.get("cloud_storage_path", ""))
                cloud_storage.delete_analysis_record(analysis_id)
            except Exception as e:
                logger.warning(f"Failed to delete from cloud: {e}")

        del analysis_service.analysis_store[analysis_id]
        return {"success": True, "message": "Analysis deleted"}

    raise HTTPException(status_code=404, detail="Analysis not found")


from app.models.audio.detection_models import detector_registry