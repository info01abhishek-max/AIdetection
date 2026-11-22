import uuid
import time
import logging
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import asdict
import numpy as np

from app.config import settings
from app.schemas import (
    AnalysisResult, DetectorResult, Evidence, TechnicalDetails,
    AudioInfo, AssessmentCategory, AnalysisStatus
)
from app.services.audio_processor import audio_processor
from app.models.audio.detection_models import detector_registry, DetectionResult as ModelDetectionResult

# Ensure detectors are loaded (in case lifespan didn't run, e.g., in tests)
_detectors_initialized = False

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self):
        self.analysis_store: Dict[str, Dict[str, Any]] = {}
        self.results_dir = settings.RESULTS_DIR
        os.makedirs(self.results_dir, exist_ok=True)

    def create_analysis(self, file_path: str, original_filename: str) -> str:
        analysis_id = str(uuid.uuid4())[:12]

        self.analysis_store[analysis_id] = {
            "id": analysis_id,
            "status": AnalysisStatus.UPLOADING,
            "progress": 10,
            "file_path": file_path,
            "original_filename": original_filename,
            "created_at": datetime.utcnow(),
            "result": None,
            "error": None,
        }

        return analysis_id

    def get_status(self, analysis_id: str) -> Dict[str, Any]:
        if analysis_id not in self.analysis_store:
            return {"status": AnalysisStatus.ERROR, "progress": 0}
        return {
            "status": self.analysis_store[analysis_id]["status"],
            "progress": self.analysis_store[analysis_id]["progress"],
        }

    def run_analysis(self, analysis_id: str) -> AnalysisResult:
        global _detectors_initialized
        if not _detectors_initialized:
            detector_registry.load_all()
            _detectors_initialized = True

        if analysis_id not in self.analysis_store:
            raise ValueError("Analysis not found")

        analysis = self.analysis_store[analysis_id]
        file_path = analysis["file_path"]
        original_filename = analysis["original_filename"]

        start_time = time.perf_counter()

        try:
            analysis["status"] = AnalysisStatus.SCANNING
            analysis["progress"] = 30

            valid, error = audio_processor.validate_audio(file_path)
            if not valid:
                raise ValueError(error)

            analysis["status"] = AnalysisStatus.ANALYZING
            analysis["progress"] = 50

            # Load audio
            y, sr = audio_processor.load_audio(file_path, settings.SAMPLE_RATE)
            metadata = audio_processor.extract_metadata(file_path)
            file_info = audio_processor.get_file_info(file_path, original_filename)
            audio_hash = audio_processor.compute_hash(file_path)

            analysis["progress"] = 60

            # Extract features
            features = audio_processor.extract_features(y, sr)

            # Voice activity detection
            vad_result = audio_processor.detect_voice_activity(y, sr)
            features["vad"] = vad_result

            # Signal quality analysis
            signal_quality = audio_processor.analyze_signal_quality(y, sr)
            features["signal_quality"] = signal_quality

            analysis["progress"] = 70

            # Run all detectors
            detector_results = detector_registry.run_all(y, sr, features, metadata)

            analysis["progress"] = 85

            # Aggregate results
            result = self._aggregate_results(
                analysis_id=analysis_id,
                file_info=file_info,
                metadata=metadata,
                audio_hash=audio_hash,
                features=features,
                detector_results=detector_results,
                processing_time=(time.perf_counter() - start_time) * 1000,
            )

            analysis["status"] = AnalysisStatus.COMPLETE
            analysis["progress"] = 100
            analysis["result"] = result

            self._save_result(analysis_id, result)

            return result

        except Exception as e:
            logger.error(f"Analysis failed for {analysis_id}: {e}")
            analysis["status"] = AnalysisStatus.ERROR
            analysis["error"] = str(e)
            raise

    def _convert_to_native(self, obj: Any) -> Any:
        """Convert numpy types to Python native types for JSON serialization."""
        if isinstance(obj, dict):
            return {k: self._convert_to_native(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_to_native(v) for v in obj]
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return obj

    def _aggregate_results(
        self,
        analysis_id: str,
        file_info: Dict[str, Any],
        metadata: Dict[str, Any],
        audio_hash: str,
        features: Dict[str, Any],
        detector_results: List[ModelDetectionResult],
        processing_time: float,
    ) -> AnalysisResult:
        categories = [r.category for r in detector_results]
        confidences = [r.confidence for r in detector_results]

        category_weights = {
            "LIKELY_SYNTHETIC": 1.0,
            "POSSIBLE_MANIPULATION": 0.6,
            "INCONCLUSIVE": 0.0,
            "LIKELY_HUMAN_RECORDED": -0.5,
        }

        weighted_score = sum(
            category_weights.get(cat, 0) * conf / 100
            for cat, conf in zip(categories, confidences)
        ) / len(categories) if categories else 0

        # Get synthetic probability from the deep learning detector
        synthetic_detector = next((r for r in detector_results if r.name == "Synthetic Speech Detection"), None)
        ai_probability = None
        if synthetic_detector:
            ai_probability = synthetic_detector.details.get("synthetic_probability")
            if ai_probability is not None:
                ai_probability = round(ai_probability * 100, 1)

        # Determine overall assessment
        if weighted_score > 0.4:
            overall = AssessmentCategory.LIKELY_SYNTHETIC
        elif weighted_score > 0.1:
            overall = AssessmentCategory.POSSIBLE_MANIPULATION
        elif weighted_score < -0.2:
            overall = AssessmentCategory.LIKELY_HUMAN_RECORDED
        else:
            overall = AssessmentCategory.INCONCLUSIVE

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        category_counts = {}
        for cat in categories:
            category_counts[cat] = category_counts.get(cat, 0) + 1
        max_count = max(category_counts.values()) if category_counts else 0
        detector_agreement = max_count / len(categories) if categories else 0

        synthetic_indicators = []
        manipulation_indicators = []
        authenticity_indicators = []
        limitations = []

        for result in detector_results:
            indicators = result.details.get("indicators", [])
            if result.category == "LIKELY_SYNTHETIC":
                synthetic_indicators.extend(indicators)
            elif result.category == "POSSIBLE_MANIPULATION":
                manipulation_indicators.extend(indicators)
            elif result.category == "LIKELY_HUMAN_RECORDED":
                authenticity_indicators.extend(indicators)

            if "error" in result.details:
                limitations.append(f"{result.name}: {result.details['error']}")

        limitations.extend([
            "Results are probabilistic estimates, not definitive proof",
            "Detection accuracy varies by AI model and generation method",
            "High-quality synthetic audio may evade detection",
            "Heavily processed human recordings may be misclassified",
            "Short clips (<3s) provide limited evidence",
            "Background noise and music can reduce detection accuracy",
            "Multiple speakers may complicate analysis",
            "Lossy compression can mask or create artifacts",
        ])

        schema_detectors = [
            DetectorResult(
                name=r.name,
                category=r.category,
                confidence=round(r.confidence, 1),
                details=self._convert_to_native(r.details),
                processing_time=round(r.processing_time, 1),
            )
            for r in detector_results
        ]

        return AnalysisResult(
            id=analysis_id,
            timestamp=datetime.utcnow().isoformat(),
            audio_info=AudioInfo(
                filename=file_info["filename"],
                duration=file_info["duration"],
                sample_rate=file_info["sample_rate"],
                channels=file_info["channels"],
                format=file_info["format"],
                size=file_info["size"],
            ),
            overall_assessment=overall,
            ai_generated_probability=ai_probability,
            confidence=round(avg_confidence, 1),
            detector_agreement=round(detector_agreement, 3),
            detectors=schema_detectors,
            evidence=Evidence(
                synthetic_indicators=list(set(synthetic_indicators)),
                manipulation_indicators=list(set(manipulation_indicators)),
                authenticity_indicators=list(set(authenticity_indicators)),
                limitations=list(set(limitations)),
            ),
            technical_details=TechnicalDetails(
                processing_time=round(processing_time, 1),
                models_used=[r.name for r in detector_results],
                audio_hash=audio_hash,
            ),
        )

    def _save_result(self, analysis_id: str, result: AnalysisResult):
        result_path = os.path.join(self.results_dir, f"{analysis_id}.json")
        with open(result_path, "w") as f:
            json.dump(result.model_dump(mode='json'), f, indent=2, default=str)

    def get_result(self, analysis_id: str) -> Optional[AnalysisResult]:
        if analysis_id in self.analysis_store:
            result = self.analysis_store[analysis_id].get("result")
            if result:
                return result

        result_path = os.path.join(self.results_dir, f"{analysis_id}.json")
        if os.path.exists(result_path):
            with open(result_path, "r") as f:
                data = json.load(f)
                return AnalysisResult(**data)
        return None

    def generate_report(self, analysis_id: str, format: str = "json") -> bytes:
        result = self.get_result(analysis_id)
        if not result:
            raise ValueError("Result not found")

        if format == "json":
            return result.model_dump_json(indent=2, mode='json').encode()
        else:
            raise ValueError(f"Unsupported format: {format}")


analysis_service = AnalysisService()