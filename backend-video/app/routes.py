import os
import logging
import aiofiles
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import FileResponse, JSONResponse, Response

from app.config import settings
from app.schemas import (
    UploadResponse, StatusResponse, AnalysisResult,
    HealthCheck, ErrorResponse, AnalysisStatus
)
from app.services.analysis_service import analysis_service
from app.services.video_processor import video_processor
from app.cloud_storage import (
    SupabaseConfig, CloudStorageManager, init_cloud_storage,
    upload_original_file, upload_report_file,
    save_analysis_complete, save_analysis_failed
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize cloud storage
cloud_config = SupabaseConfig(
    url=settings.SUPABASE_URL,
    service_key=settings.SUPABASE_SERVICE_KEY,
    anon_key=settings.SUPABASE_ANON_KEY,
    bucket_video=settings.SUPABASE_BUCKET_VIDEO,
    local_temp_dir=settings.LOCAL_TEMP_DIR,
    max_temp_age_hours=settings.MAX_LOCAL_TEMP_AGE_HOURS
)
cloud_storage = init_cloud_storage(cloud_config)


@router.get("/health", response_model=HealthCheck)
async def health_check():
    import time

    # GPU check disabled on Windows due to torch/fbgemm.dll issues
    # Will be checked lazily during actual analysis if needed
    gpu_available = False

    # Don't access analysis_service.detectors as it triggers model loading
    # which can fail on Windows due to fbgemm.dll issues
    models_loaded = [
        "SyntheticFrameDetector",
        "FrequencyFrameDetector",
        "TextureFrameDetector",
        "NoiseFrameDetector",
        "CompressionFrameDetector"
    ]

    return HealthCheck(
        status="healthy",
        version=settings.VERSION,
        models_loaded=models_loaded,
        uptime=time.time() - analysis_service.analyses.get("start_time", time.time()) if analysis_service.analyses else 0,
        gpu_available=gpu_available
    )


@router.post("/analyze/upload", response_model=UploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported: {', '.join(settings.SUPPORTED_EXTENSIONS)}"
        )

    analysis_id = analysis_service.create_analysis("", file.filename)
    state = analysis_service.get_state(analysis_id)

    upload_path = os.path.join(settings.UPLOAD_DIR, f"{analysis_id}{ext}")

    try:
        async with aiofiles.open(upload_path, 'wb') as f:
            content = await file.read()
            if len(content) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File size exceeds {settings.MAX_FILE_SIZE / (1024*1024)}MB limit"
                )
            await f.write(content)

        state.video_path = upload_path
        analysis_service.update_status(analysis_id, AnalysisStatus.UPLOADING, 5, "Video uploaded, starting analysis...")

        valid, error = video_processor.validate_video(upload_path)
        if not valid:
            raise HTTPException(status_code=400, detail=error)

        # Upload original file to cloud storage if enabled
        if settings.ENABLE_CLOUD_STORAGE and settings.UPLOAD_ORIGINALS_TO_CLOUD:
            background_tasks.add_task(upload_original_to_cloud, "video", upload_path, analysis_id)

        background_tasks.add_task(analysis_service.analyze_video_async, analysis_id)

        return UploadResponse(analysis_id=analysis_id, status=AnalysisStatus.PROCESSING)

    except HTTPException:
        if os.path.exists(upload_path):
            os.remove(upload_path)
        raise
    except Exception as e:
        if os.path.exists(upload_path):
            os.remove(upload_path)
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def upload_original_to_cloud(analysis_type: str, local_path: str, analysis_id: str):
    """Background task to upload original file to cloud storage."""
    try:
        from pathlib import Path
        result = upload_original_file(cloud_storage, analysis_type, Path(local_path), analysis_id)
        if result.get("success"):
            logger.info(f"Uploaded original file to cloud: {result.get('public_url')}")
            # Update analysis record with cloud path
            state = analysis_service.get_state(analysis_id)
            if state:
                state.cloud_storage_path = result.get("path")
        else:
            logger.warning(f"Failed to upload original to cloud: {result.get('error')}")
    except Exception as e:
        logger.error(f"Cloud upload failed for {analysis_id}: {e}")


# Patch the analysis_service to upload report after completion
original_analyze_video_async = analysis_service.analyze_video_async

async def analyze_video_async_with_cloud(analysis_id: str):
    """Wrapper to upload report to cloud after analysis completes."""
    import asyncio
    try:
        # The original function submits to its own ThreadPoolExecutor
        # Just call it directly (it returns immediately after submitting)
        original_analyze_video_async(analysis_id)

        # Poll for completion
        while True:
            await asyncio.sleep(2)
            state = analysis_service.get_state(analysis_id)
            if state and state.status == AnalysisStatus.COMPLETE:
                break
            elif state and state.status == AnalysisStatus.ERROR:
                raise Exception(state.error or "Analysis failed")
            elif not state:
                raise Exception("Analysis state lost")

        # After analysis completes, upload report to cloud
        if settings.ENABLE_CLOUD_STORAGE and settings.UPLOAD_REPORTS_TO_CLOUD:
            await upload_report_to_cloud("video", analysis_id)

    except Exception as e:
        logger.error(f"Background analysis failed for {analysis_id}: {e}")
        # Mark as failed in cloud
        if settings.ENABLE_CLOUD_STORAGE:
            save_analysis_failed(cloud_storage, analysis_id, str(e))

analysis_service.analyze_video_async = analyze_video_async_with_cloud


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
async def get_status(analysis_id: str):
    state = analysis_service.get_state(analysis_id)
    if not state:
        result = analysis_service.get_result(analysis_id)
        if result:
            return StatusResponse(status=AnalysisStatus.COMPLETE, progress=100, message="Analysis complete (from storage)")
        raise HTTPException(status_code=404, detail="Analysis not found")

    return StatusResponse(
        status=state.status,
        progress=state.progress,
        message=state.message
    )


@router.get("/analyze/{analysis_id}/result", response_model=AnalysisResult)
async def get_result(analysis_id: str):
    state = analysis_service.get_state(analysis_id)
    if state and state.result:
        return state.result

    result = analysis_service.get_result(analysis_id)
    if result:
        return result

    state = analysis_service.get_state(analysis_id)
    if state and state.status == AnalysisStatus.ERROR:
        raise HTTPException(status_code=500, detail=state.error or "Analysis failed")

    raise HTTPException(status_code=404, detail="Result not found")


@router.get("/analyze/{analysis_id}/report")
async def download_report(analysis_id: str):
    result = analysis_service.get_result(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found or not complete")

    report = {
        "analysis_id": result.id,
        "timestamp": result.timestamp.isoformat(),
        "video_info": result.video_info.model_dump(),
        "overall_assessment": result.overall_assessment.value,
        "ai_generated_probability": result.ai_generated_probability,
        "confidence": result.confidence,
        "detector_agreement": result.detector_agreement,
        "temporal_analysis": result.temporal_analysis.model_dump(),
        "evidence": result.evidence.model_dump(),
        "technical_details": result.technical_details.model_dump(),
        "frame_analyses": [
            {
                "frame_index": f.frame_index,
                "timestamp": f.timestamp,
                "overall_category": f.overall_category.value,
                "confidence": f.confidence,
                "detectors": [d.model_dump() for d in f.detectors]
            }
            for f in result.frame_analyses
        ]
    }

    import json
    return Response(
        content=json.dumps(report, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=video_analysis_{analysis_id}.json"}
    )


@router.get("/analyze/history", response_model=List[str])
async def get_history():
    results_dir = settings.RESULTS_DIR
    if not os.path.exists(results_dir):
        return []

    files = [f for f in os.listdir(results_dir) if f.endswith('.json')]
    return [f[:-5] for f in sorted(files, reverse=True)]


@router.delete("/analyze/{analysis_id}")
async def delete_analysis(analysis_id: str):
    state = analysis_service.get_state(analysis_id)
    if state:
        if state.video_path and os.path.exists(state.video_path):
            os.remove(state.video_path)
        if state.temp_dir and os.path.exists(state.temp_dir):
            import shutil
            shutil.rmtree(state.temp_dir, ignore_errors=True)
        del analysis_service.analyses[analysis_id]

    result_path = os.path.join(settings.RESULTS_DIR, f"{analysis_id}.json")
    if os.path.exists(result_path):
        os.remove(result_path)

    # Also delete from cloud storage if enabled
    if settings.ENABLE_CLOUD_STORAGE:
        try:
            cloud_storage.delete_file("video", state.cloud_storage_path if state else "")
            cloud_storage.delete_analysis_record(analysis_id)
        except Exception as e:
            logger.warning(f"Failed to delete from cloud: {e}")

    return {"success": True, "message": "Analysis deleted"}


@router.get("/analyze/{analysis_id}/frames/{frame_index}")
async def get_frame_thumbnail(analysis_id: str, frame_index: int):
    state = analysis_service.get_state(analysis_id)
    if not state:
        raise HTTPException(status_code=404, detail="Analysis not found")

    frame_path = os.path.join(state.frames_dir, f"frame_{frame_index:06d}.jpg")
    if os.path.exists(frame_path):
        return FileResponse(frame_path, media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Frame not found")