import os
import uuid
import logging
import tempfile
import json
import io
from pathlib import Path
from typing import Dict, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Query
from fastapi.responses import JSONResponse, StreamingResponse

from app.config import settings
from app.services.analysis_service import analysis_service
from app.services.file_extractor import FileExtractor
from app.schemas import (
    TextInputRequest,
    TextInputResponse,
    AnalysisResultSchema,
    AnalysisStatusResponse,
    HealthResponse,
    ErrorResponse,
    AssessmentCategory,
    AnalysisStatus,
)
from app.cloud_storage import (
    SupabaseConfig, CloudStorageManager, init_cloud_storage,
    upload_original_file, upload_report_file,
    save_analysis_complete, save_analysis_failed
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Use the analysis_service's store to ensure consistency
file_extractor = FileExtractor(settings.MAX_FILE_SIZE)

UPLOAD_DIR = Path(tempfile.gettempdir()) / "text_detection_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Initialize cloud storage
cloud_config = SupabaseConfig(
    url=settings.SUPABASE_URL,
    service_key=settings.SUPABASE_SERVICE_KEY,
    anon_key=settings.SUPABASE_ANON_KEY,
    bucket_text=settings.SUPABASE_BUCKET_TEXT,
    local_temp_dir=settings.LOCAL_TEMP_DIR,
    max_temp_age_hours=settings.MAX_LOCAL_TEMP_AGE_HOURS
)
cloud_storage = init_cloud_storage(cloud_config)


def cleanup_old_files():
    import time
    current_time = time.time()
    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file():
            file_age = current_time - file_path.stat().st_mtime
            if file_age > settings.CLEANUP_INTERVAL:
                try:
                    file_path.unlink()
                except Exception:
                    pass


@router.get("/health", response_model=HealthResponse)
async def health_check():
    detectors_loaded = 0
    models = []
    if analysis_service.detector_ensemble:
        detectors_loaded = len(analysis_service.detector_ensemble.detectors)
        models = [d.model_name for d in analysis_service.detector_ensemble.detectors]

    return HealthResponse(
        status="healthy",
        version=settings.API_VERSION,
        detectors_loaded=detectors_loaded,
        models=models,
    )


@router.post("/analyze/text", response_model=TextInputResponse)
async def analyze_text(request: TextInputRequest):
    if not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty",
        )

    if len(request.text) > settings.MAX_TEXT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text exceeds maximum length of {settings.MAX_TEXT_LENGTH} characters",
        )

    analysis_id = f"txt_{uuid.uuid4().hex[:12]}"

    analysis_service.analysis_store[analysis_id] = {
        "status": AnalysisStatus.PROCESSING,
        "progress": 10,
        "text": request.text,
        "result": None,
        "error": None,
    }

    # Run analysis synchronously (no background threads to avoid PyTorch threading issues)
    try:
        result = analysis_service.analyze_text(request.text)
        analysis_service.analysis_store[analysis_id]["result"] = result
        analysis_service.analysis_store[analysis_id]["status"] = AnalysisStatus.COMPLETE
        analysis_service.analysis_store[analysis_id]["progress"] = 100
        analysis_service._save_result(analysis_id, result)

        # Upload report to cloud storage if enabled
        if settings.ENABLE_CLOUD_STORAGE and settings.UPLOAD_REPORTS_TO_CLOUD:
            await upload_report_to_cloud("text", analysis_id, result)

    except Exception as e:
        logger.error(f"Text analysis failed for {analysis_id}: {e}", exc_info=True)
        analysis_service.analysis_store[analysis_id]["status"] = AnalysisStatus.ERROR
        analysis_service.analysis_store[analysis_id]["error"] = str(e)
        # Mark as failed in cloud
        if settings.ENABLE_CLOUD_STORAGE:
            save_analysis_failed(cloud_storage, analysis_id, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}",
        )

    return TextInputResponse(
        analysis_id=analysis_id,
        status=AnalysisStatus.COMPLETE,
        message="Analysis complete",
    )


@router.post("/analyze/file", response_model=TextInputResponse)
async def analyze_file(
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided",
        )

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Supported: {', '.join(settings.SUPPORTED_EXTENSIONS)}",
        )

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum of {settings.MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    analysis_id = f"txt_{uuid.uuid4().hex[:12]}"
    file_path = UPLOAD_DIR / f"{analysis_id}{file_ext}"

    with open(file_path, "wb") as f:
        f.write(content)

    analysis_service.analysis_store[analysis_id] = {
        "status": AnalysisStatus.UPLOADING,
        "progress": 20,
        "file_path": str(file_path),
        "result": None,
        "error": None,
    }

    # Run analysis synchronously
    try:
        result = analysis_service.analyze_file(file_path)
        analysis_service.analysis_store[analysis_id]["result"] = result
        analysis_service.analysis_store[analysis_id]["status"] = AnalysisStatus.COMPLETE
        analysis_service.analysis_store[analysis_id]["progress"] = 100
        analysis_service._save_result(analysis_id, result)

        # Upload original file to cloud storage if enabled
        if settings.ENABLE_CLOUD_STORAGE and settings.UPLOAD_ORIGINALS_TO_CLOUD:
            await upload_original_to_cloud("text", file_path, analysis_id)

        # Upload report to cloud storage if enabled
        if settings.ENABLE_CLOUD_STORAGE and settings.UPLOAD_REPORTS_TO_CLOUD:
            await upload_report_to_cloud("text", analysis_id, result)

    except Exception as e:
        logger.error(f"File analysis failed for {analysis_id}: {e}", exc_info=True)
        analysis_service.analysis_store[analysis_id]["status"] = AnalysisStatus.ERROR
        analysis_service.analysis_store[analysis_id]["error"] = str(e)
        # Clean up uploaded file
        if not settings.RETAIN_FILES:
            try:
                os.unlink(file_path)
            except Exception:
                pass
        # Mark as failed in cloud
        if settings.ENABLE_CLOUD_STORAGE:
            save_analysis_failed(cloud_storage, analysis_id, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}",
        )
    finally:
        # Clean up uploaded file on success too
        if not settings.RETAIN_FILES and analysis_service.analysis_store[analysis_id]["status"] == AnalysisStatus.COMPLETE:
            try:
                os.unlink(file_path)
            except Exception:
                pass

    return TextInputResponse(
        analysis_id=analysis_id,
        status=AnalysisStatus.COMPLETE,
        message="Analysis complete",
    )


async def upload_original_to_cloud(analysis_type: str, local_path: Path, analysis_id: str):
    """Background task to upload original file to cloud storage."""
    try:
        result = upload_original_file(cloud_storage, analysis_type, local_path, analysis_id)
        if result.get("success"):
            logger.info(f"Uploaded original file to cloud: {result.get('public_url')}")
            # Update analysis record with cloud path
            data = analysis_service.analysis_store.get(analysis_id, {})
            data["cloud_storage_path"] = result.get("path")
        else:
            logger.warning(f"Failed to upload original to cloud: {result.get('error')}")
    except Exception as e:
        logger.error(f"Cloud upload failed for {analysis_id}: {e}")


async def upload_report_to_cloud(analysis_type: str, analysis_id: str, result):
    """Upload analysis report to cloud storage and update database."""
    try:
        # Save complete analysis to cloud (both storage and database)
        success = save_analysis_complete(cloud_storage, analysis_id, analysis_type, result)
        if success:
            logger.info(f"Uploaded analysis report to cloud for {analysis_id}")
        else:
            logger.warning(f"Failed to upload analysis report to cloud for {analysis_id}")
    except Exception as e:
        logger.error(f"Cloud report upload failed for {analysis_id}: {e}")


@router.get("/analysis/{analysis_id}/status", response_model=AnalysisStatusResponse)
async def get_analysis_status(analysis_id: str):
    if analysis_id not in analysis_service.analysis_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    data = analysis_service.analysis_store[analysis_id]
    return AnalysisStatusResponse(
        analysis_id=analysis_id,
        status=data["status"],
        progress=data["progress"],
        message=data.get("error"),
    )


@router.get("/analysis/{analysis_id}/result", response_model=AnalysisResultSchema)
async def get_analysis_result(analysis_id: str):
    if analysis_id not in analysis_service.analysis_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    data = analysis_service.analysis_store[analysis_id]

    if data["status"] != AnalysisStatus.COMPLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis not complete. Current status: {data['status']}",
        )

    if data["result"] is None:
        # Try loading from disk
        result = analysis_service.get_result(analysis_id)
        if result:
            data["result"] = result
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Analysis result not available",
            )

    result = data["result"]

    return AnalysisResultSchema(
        id=result.id,
        timestamp=result.timestamp,
        text_hash=result.text_hash,
        text_length=result.text_length,
        overall_assessment=result.overall_assessment,
        ai_generated_probability=result.ai_generated_probability,
        confidence=result.confidence,
        detector_agreement=result.detector_agreement,
        detectors=[
            {
                "name": d.name,
                "label": d.label,
                "confidence": d.confidence,
                "raw_scores": d.raw_scores,
                "processing_time": d.processing_time,
            }
            for d in result.detectors
        ],
        linguistic_features={
            "statistics": {
                "character_count": result.linguistic_features.statistics.character_count,
                "word_count": result.linguistic_features.statistics.word_count,
                "sentence_count": result.linguistic_features.statistics.sentence_count,
                "paragraph_count": result.linguistic_features.statistics.paragraph_count,
                "avg_word_length": result.linguistic_features.statistics.avg_word_length,
                "avg_sentence_length": result.linguistic_features.statistics.avg_sentence_length,
                "type_token_ratio": result.linguistic_features.statistics.type_token_ratio,
                "hapax_legomena_ratio": result.linguistic_features.statistics.hapax_legomena_ratio,
            },
            "perplexity_scores": result.linguistic_features.perplexity_scores,
            "burstiness_score": result.linguistic_features.burstiness_score,
            "repetition_score": result.linguistic_features.repetition_score,
            "sentence_length_variance": result.linguistic_features.sentence_length_variance,
            "pos_distribution": result.linguistic_features.pos_distribution,
            "function_word_ratio": result.linguistic_features.function_word_ratio,
            "readability_scores": result.linguistic_features.readability_scores,
            "ngram_entropy": result.linguistic_features.ngram_entropy,
        },
        evidence={
            "ai_indicators": result.evidence.ai_indicators,
            "human_indicators": result.evidence.human_indicators,
            "stylistic_observations": result.evidence.stylistic_observations,
            "limitations": result.evidence.limitations,
        },
        technical_details=result.technical_details,
    )


@router.post("/analysis/{analysis_id}/poll")
async def poll_analysis(analysis_id: str):
    return await get_analysis_status(analysis_id)


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str):
    if analysis_id not in analysis_service.analysis_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    data = analysis_service.analysis_store[analysis_id]
    if "file_path" in data and data["file_path"]:
        try:
            os.unlink(data["file_path"])
        except Exception:
            pass

    # Also delete from cloud storage if enabled
    if settings.ENABLE_CLOUD_STORAGE:
        try:
            cloud_storage.delete_file("text", data.get("cloud_storage_path", ""))
            cloud_storage.delete_analysis_record(analysis_id)
        except Exception as e:
            logger.warning(f"Failed to delete from cloud: {e}")

    del analysis_service.analysis_store[analysis_id]
    return {"message": "Analysis deleted"}


@router.get("/stats")
async def get_stats():
    total = len(analysis_service.analysis_store)
    completed = sum(1 for d in analysis_service.analysis_store.values() if d["status"] == AnalysisStatus.COMPLETE)
    errors = sum(1 for d in analysis_service.analysis_store.values() if d["status"] == AnalysisStatus.ERROR)
    processing = sum(1 for d in analysis_service.analysis_store.values() if d["status"] in [
        AnalysisStatus.PROCESSING, AnalysisStatus.ANALYZING, AnalysisStatus.UPLOADING
    ])

    assessments = {}
    for d in analysis_service.analysis_store.values():
        if d["result"]:
            cat = d["result"].overall_assessment.value
            assessments[cat] = assessments.get(cat, 0) + 1

    return {
        "total_analyses": total,
        "completed": completed,
        "errors": errors,
        "processing": processing,
        "assessments": assessments,
    }


@router.get("/analysis/{analysis_id}/report")
async def download_report(analysis_id: str, format: str = Query("json", enum=["json"])):
    """Download analysis report in specified format."""
    if analysis_id not in analysis_service.analysis_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    data = analysis_service.analysis_store[analysis_id]

    if data["status"] != AnalysisStatus.COMPLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Analysis not complete. Current status: {data['status']}",
        )

    if data["result"] is None:
        result = analysis_service.get_result(analysis_id)
        if result:
            data["result"] = result
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Analysis result not available",
            )

    result = data["result"]

    if format == "json":
        # Build comprehensive report
        report = {
            "analysis_id": result.id,
            "timestamp": result.timestamp,
            "text_hash": result.text_hash,
            "text_length": result.text_length,
            "overall_assessment": result.overall_assessment.value,
            "ai_generated_probability": result.ai_generated_probability,
            "confidence": result.confidence,
            "detector_agreement": result.detector_agreement,
            "detectors": [
                {
                    "name": d.name,
                    "label": d.label,
                    "confidence": d.confidence,
                    "raw_scores": d.raw_scores,
                    "processing_time": d.processing_time,
                }
                for d in result.detectors
            ],
            "linguistic_features": {
                "statistics": {
                    "character_count": result.linguistic_features.statistics.character_count,
                    "word_count": result.linguistic_features.statistics.word_count,
                    "sentence_count": result.linguistic_features.statistics.sentence_count,
                    "paragraph_count": result.linguistic_features.statistics.paragraph_count,
                    "avg_word_length": result.linguistic_features.statistics.avg_word_length,
                    "avg_sentence_length": result.linguistic_features.statistics.avg_sentence_length,
                    "type_token_ratio": result.linguistic_features.statistics.type_token_ratio,
                    "hapax_legomena_ratio": result.linguistic_features.statistics.hapax_legomena_ratio,
                },
                "perplexity_scores": result.linguistic_features.perplexity_scores,
                "burstiness_score": result.linguistic_features.burstiness_score,
                "repetition_score": result.linguistic_features.repetition_score,
                "sentence_length_variance": result.linguistic_features.sentence_length_variance,
                "pos_distribution": result.linguistic_features.pos_distribution,
                "function_word_ratio": result.linguistic_features.function_word_ratio,
                "readability_scores": result.linguistic_features.readability_scores,
                "ngram_entropy": result.linguistic_features.ngram_entropy,
            },
            "evidence": {
                "ai_indicators": result.evidence.ai_indicators,
                "human_indicators": result.evidence.human_indicators,
                "stylistic_observations": result.evidence.stylistic_observations,
                "limitations": result.evidence.limitations,
            },
            "technical_details": result.technical_details,
        }

        json_data = json.dumps(report, indent=2, default=str)
        return StreamingResponse(
            io.BytesIO(json_data.encode()),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="text_analysis_report_{analysis_id}.json"'}
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported format: {format}",
    )