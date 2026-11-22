import uuid
import time
import logging
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np

from app.config import settings
from app.schemas import (
    AnalysisResult, DetectorResult, Evidence, TechnicalDetails,
    PhotoInfo, AssessmentCategory, AnalysisStatus
)
from app.services.photo_processor import photo_processor
from app.models.photo_detection_models import (
    create_image_detectors, analyze_image, aggregate_image_results, DetectionResult as ModelDetectionResult
)

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self):
        self.analysis_store: Dict[str, Dict[str, Any]] = {}
        self.results_dir = settings.RESULTS_DIR
        self._detectors = None
        os.makedirs(self.results_dir, exist_ok=True)

    @property
    def detectors(self):
        if self._detectors is None:
            self._detectors = create_image_detectors()
        return self._detectors

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
        if analysis_id not in self.analysis_store:
            raise ValueError("Analysis not found")

        analysis = self.analysis_store[analysis_id]
        file_path = analysis["file_path"]
        original_filename = analysis["original_filename"]

        start_time = time.perf_counter()

        try:
            analysis["status"] = AnalysisStatus.ANALYZING
            analysis["progress"] = 30

            valid, error = photo_processor.validate_image(file_path)
            if not valid:
                raise ValueError(error)

            analysis["progress"] = 50

            image = photo_processor.load_image(file_path)
            metadata = photo_processor.extract_metadata(file_path)
            file_info = photo_processor.get_file_info(file_path, original_filename)
            image_hash = photo_processor.compute_hash(file_path)

            analysis["progress"] = 70

            detector_results = analyze_image(image, self.detectors)

            analysis["progress"] = 85

            result = self._aggregate_results(
                analysis_id=analysis_id,
                file_info=file_info,
                metadata=metadata,
                image_hash=image_hash,
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
        image_hash: str,
        detector_results: List[ModelDetectionResult],
        processing_time: float,
    ) -> AnalysisResult:
        categories = [r.category for r in detector_results]
        confidences = [r.confidence for r in detector_results]

        category_weights = {
            AssessmentCategory.LIKELY_AI_GENERATED: 1.0,
            AssessmentCategory.POSSIBLE_MANIPULATION: 0.6,
            AssessmentCategory.INCONCLUSIVE: 0.0,
            AssessmentCategory.LIKELY_AUTHENTIC: -0.5,
        }

        weighted_score = sum(
            category_weights.get(cat, 0) * conf / 100
            for cat, conf in zip(categories, confidences)
        ) / len(categories) if categories else 0

        synthetic_detector = next((r for r in detector_results if r.name == "SyntheticImageDetector"), None)
        ai_probability = None
        if synthetic_detector:
            ai_probability = synthetic_detector.details.get("ai_probability")
            if ai_probability is not None:
                ai_probability = round(ai_probability * 100, 1)

        if weighted_score > 0.4:
            overall = AssessmentCategory.LIKELY_AI_GENERATED
        elif weighted_score > 0.1:
            overall = AssessmentCategory.POSSIBLE_MANIPULATION
        elif weighted_score < -0.2:
            overall = AssessmentCategory.LIKELY_AUTHENTIC
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
            if result.category == AssessmentCategory.LIKELY_AI_GENERATED:
                synthetic_indicators.extend(indicators)
            elif result.category == AssessmentCategory.POSSIBLE_MANIPULATION:
                manipulation_indicators.extend(indicators)
            elif result.category == AssessmentCategory.LIKELY_AUTHENTIC:
                authenticity_indicators.extend(indicators)

            if "error" in result.details:
                limitations.append(f"{result.name}: {result.details['error']}")

        limitations.extend([
            "Results are probabilistic estimates, not definitive proof",
            "Detection accuracy varies by AI model and generation method",
            "High-quality synthetic images may evade detection",
            "Heavily processed authentic images may be misclassified",
            "Low resolution images provide limited evidence",
            "Compression artifacts can mask or create false signals",
            "EXIF data can be stripped or modified",
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
            photo_info=PhotoInfo(
                filename=file_info["filename"],
                width=file_info["width"],
                height=file_info["height"],
                format=file_info["format"],
                mode=file_info["mode"],
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
                image_hash=image_hash,
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