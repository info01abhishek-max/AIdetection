import time
import logging
import uuid
import json
import os
from typing import List, Optional
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass

from app.config import settings
from app.services.nlp_analyzer import analyze_text_linguistics, LinguisticFeatures
from app.services.ai_detector import (
    create_detector_ensemble,
    DetectorResult,
    EnsembleDetector,
)
from app.services.file_extractor import extract_text_from_file
from app.services.result_aggregator import (
    create_analysis_result,
    AnalysisResult,
    AssessmentCategory,
)

logger = logging.getLogger(__name__)


@dataclass
class AnalysisState:
    analysis_id: str
    status: str = "idle"
    progress: int = 0
    text: str = ""
    file_path: str = ""
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None
    created_at: datetime = None


class AnalysisService:
    def __init__(self):
        self.detector_ensemble: Optional[EnsembleDetector] = None
        self._initialized = False
        self.analysis_store: dict = {}
        self.results_dir = Path(settings.MODEL_CACHE_DIR).parent / "results"
        self.results_dir.mkdir(parents=True, exist_ok=True)

    def initialize(self):
        if self._initialized:
            return

        logger.info("Initializing analysis service...")
        self.detector_ensemble = create_detector_ensemble(settings.MODEL_CACHE_DIR)
        # Pre-load the detector models at startup to avoid thread safety issues
        for detector in self.detector_ensemble.detectors:
            try:
                detector.load()
                logger.info(f"Pre-loaded detector: {detector.model_name}")
            except Exception as e:
                logger.error(f"Failed to pre-load detector {detector.model_name}: {e}")
        self._initialized = True
        logger.info("Analysis service initialized")

    def create_analysis(self, text: str = "", file_path: str = "") -> str:
        analysis_id = f"txt_{uuid.uuid4().hex[:12]}"
        state = AnalysisState(
            analysis_id=analysis_id,
            status="uploading",
            progress=10,
            text=text,
            file_path=file_path,
            created_at=datetime.utcnow(),
        )
        self.analysis_store[analysis_id] = state
        return analysis_id

    def get_state(self, analysis_id: str) -> Optional[AnalysisState]:
        return self.analysis_store.get(analysis_id)

    def update_status(self, analysis_id: str, status: str, progress: int, error: str = None):
        state = self.analysis_store.get(analysis_id)
        if state:
            state.status = status
            state.progress = progress
            if error:
                state.error = error

    def analyze_text(self, text: str) -> AnalysisResult:
        """Synchronous text analysis - runs inline, not in background thread"""
        if not self._initialized:
            self.initialize()

        start_time = time.time()
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Empty text provided")

        logger.info(f"Analyzing text of length {len(clean_text)}")

        try:
            linguistic_features = analyze_text_linguistics(
                clean_text, cache_dir=settings.MODEL_CACHE_DIR, enable_perplexity=False
            )
        except Exception as e:
            logger.warning(f"Linguistic analysis failed, using fallback: {e}")
            from app.services.nlp_analyzer import LinguisticFeatures, TextStatistics
            linguistic_features = LinguisticFeatures(
                statistics=TextStatistics(
                    character_count=len(clean_text),
                    word_count=len(clean_text.split()),
                    sentence_count=len([s for s in clean_text.split('.') if s.strip()]),
                    paragraph_count=1,
                    avg_word_length=5.0,
                    avg_sentence_length=20.0,
                    type_token_ratio=0.5,
                    hapax_legomena_ratio=0.3,
                ),
                perplexity_scores=[],  # Empty list instead of NaN
                burstiness_score=1.0,
                repetition_score=0.0,
                sentence_length_variance=0.0,
                pos_distribution={},
                function_word_ratio=0.3,
                readability_scores={},
                ngram_entropy={1: 5.0, 2: 4.0, 3: 3.0, 4: 2.0},
            )

        detector_results = self.detector_ensemble.predict(clean_text)
        models_used = [r.name for r in detector_results]

        result = create_analysis_result(
            text=clean_text,
            detector_results=detector_results,
            linguistic_features=linguistic_features,
            processing_time=time.time() - start_time,
            models_used=models_used,
            min_text_length=settings.MIN_TEXT_LENGTH,
        )

        logger.info(
            f"Analysis complete: {result.overall_assessment.value} "
            f"(confidence: {result.confidence:.1f}%)"
        )

        return result

    def analyze_file(self, file_path: Path) -> AnalysisResult:
        """Synchronous file analysis - runs inline"""
        if not self._initialized:
            self.initialize()

        text, metadata = extract_text_from_file(file_path, settings.MAX_FILE_SIZE)
        logger.info(f"Extracted text from file: {len(text)} chars, metadata: {metadata}")

        return self.analyze_text(text)

    def _save_result(self, analysis_id: str, result: AnalysisResult):
        result_path = self.results_dir / f"{analysis_id}.json"
        with open(result_path, "w") as f:
            json.dump(result.__dict__, f, indent=2, default=str)

    def get_result(self, analysis_id: str) -> Optional[AnalysisResult]:
        state = self.analysis_store.get(analysis_id)
        if state and state.result:
            return state.result

        result_path = self.results_dir / f"{analysis_id}.json"
        if result_path.exists():
            with open(result_path, "r") as f:
                data = json.load(f)
            # Reconstruct AnalysisResult from dict
            return self._dict_to_result(data)

        return None

    def _dict_to_result(self, data: dict) -> AnalysisResult:
        from app.services.result_aggregator import (
            AnalysisResult, AssessmentCategory, Evidence, DetectorResult, LinguisticFeatures, TextStatistics
        )
        return AnalysisResult(**data)


analysis_service = AnalysisService()