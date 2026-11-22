import os
import uuid
import time
import json
import logging
import shutil
import tempfile
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.config import settings
from app.schemas import (
    AnalysisResult, AnalysisStatus, AssessmentCategory,
    VideoInfo, FrameAnalysis, TemporalAnalysis, Evidence, TechnicalDetails,
    DetectorResult
)
from app.services.video_processor import video_processor
from app.services.frame_sampler import frame_sampler, SamplingConfig
from app.models.video_detection_models import (
    create_frame_detectors, analyze_frame, aggregate_frame_results, TemporalAnalyzer
)

logger = logging.getLogger(__name__)


@dataclass
class AnalysisState:
    analysis_id: str
    status: AnalysisStatus = AnalysisStatus.IDLE
    progress: int = 0
    message: str = ""
    video_path: str = ""
    original_filename: str = ""
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None
    temp_dir: str = ""
    frames_dir: str = ""
    start_time: float = 0


class VideoAnalysisService:
    def __init__(self):
        self.analyses: Dict[str, AnalysisState] = {}
        self._detectors = None
        self._temporal_analyzer = None
        self.executor = ThreadPoolExecutor(max_workers=4)

    @property
    def detectors(self):
        if self._detectors is None:
            self._detectors = create_frame_detectors()
        return self._detectors

    @property
    def temporal_analyzer(self):
        if self._temporal_analyzer is None:
            self._temporal_analyzer = TemporalAnalyzer()
        return self._temporal_analyzer

    def create_analysis(self, video_path: str, original_filename: str) -> str:
        analysis_id = str(uuid.uuid4())[:8]
        temp_dir = os.path.join(settings.TEMP_DIR, analysis_id)
        frames_dir = os.path.join(temp_dir, "frames")
        os.makedirs(frames_dir, exist_ok=True)

        state = AnalysisState(
            analysis_id=analysis_id,
            status=AnalysisStatus.IDLE,
            video_path=video_path,
            original_filename=original_filename,
            temp_dir=temp_dir,
            frames_dir=frames_dir,
            start_time=time.time()
        )
        self.analyses[analysis_id] = state
        return analysis_id

    def get_state(self, analysis_id: str) -> Optional[AnalysisState]:
        return self.analyses.get(analysis_id)

    def update_status(self, analysis_id: str, status: AnalysisStatus, progress: int, message: str = ""):
        state = self.analyses.get(analysis_id)
        if state:
            state.status = status
            state.progress = progress
            state.message = message

    def analyze_video_async(self, analysis_id: str):
        self.executor.submit(self._analyze_video, analysis_id)

    def _analyze_video(self, analysis_id: str):
        state = self.analyses.get(analysis_id)
        if not state:
            return

        try:
            state.start_time = time.time()
            self.update_status(analysis_id, AnalysisStatus.EXTRACTING_FRAMES, 10, "Extracting video metadata...")

            file_info = video_processor.get_file_info(state.video_path, state.original_filename)

            video_info = VideoInfo(
                filename=file_info["filename"],
                duration=file_info["duration"],
                width=file_info["dimensions"]["width"],
                height=file_info["dimensions"]["height"],
                fps=file_info["fps"],
                total_frames=file_info["total_frames"],
                codec=file_info["codec"],
                format=file_info["format"],
                size=file_info["size"],
                bitrate=file_info.get("bitrate")
            )

            self.update_status(analysis_id, AnalysisStatus.EXTRACTING_FRAMES, 20, "Sampling frames for analysis...")

            frame_data = frame_sampler.sample_frames(state.video_path)

            if len(frame_data) < settings.MIN_FRAMES_FOR_ANALYSIS:
                raise ValueError(f"Insufficient frames extracted: {len(frame_data)} (minimum: {settings.MIN_FRAMES_FOR_ANALYSIS})")

            self.update_status(analysis_id, AnalysisStatus.ANALYZING_FRAMES, 30, f"Analyzing {len(frame_data)} frames...")

            frame_analyses = []
            frame_results = []

            for i, frame_info in enumerate(frame_data):
                progress = 30 + int(50 * (i / len(frame_data)))
                self.update_status(analysis_id, AnalysisStatus.ANALYZING_FRAMES, progress, f"Analyzing frame {i+1}/{len(frame_data)}...")

                frame = frame_info["frame"]
                results = analyze_frame(frame, self.detectors)
                frame_results.append(results)

                detector_results = [
                    DetectorResult(
                        name=r.name,
                        category=r.category,
                        confidence=r.confidence,
                        details=r.details,
                        processing_time=r.processing_time
                    )
                    for r in results
                ]

                categories = [r.category for r in results]
                confidences = [r.confidence for r in results]
                overall_cat = max(set(categories), key=categories.count) if categories else AssessmentCategory.INCONCLUSIVE
                overall_conf = np.mean(confidences) if confidences else 0

                frame_analyses.append(FrameAnalysis(
                    frame_index=frame_info["frame_index"],
                    timestamp=frame_info["timestamp"],
                    thumbnail_path=None,
                    detectors=detector_results,
                    overall_category=overall_cat,
                    confidence=overall_conf
                ))

            self.update_status(analysis_id, AnalysisStatus.AGGREGATING, 85, "Performing temporal analysis...")

            frame_indices = [f["frame_index"] for f in frame_data]
            timestamps = [f["timestamp"] for f in frame_data]
            temporal_result = self.temporal_analyzer.analyze(frame_results, frame_indices, timestamps)

            temporal_analysis = TemporalAnalysis(
                consistency_score=temporal_result["consistency_score"],
                frame_similarity_variance=temporal_result["frame_similarity_variance"],
                scene_changes=temporal_result["scene_changes"],
                flicker_detected=temporal_result["flicker_detected"],
                details=temporal_result["details"]
            )

            overall, ai_prob, confidence, detector_agreement, synthetic_indicators, manipulation_indicators, authenticity_indicators, temporal_indicators = aggregate_frame_results(
                frame_results, temporal_result
            )

            evidence = Evidence(
                synthetic_indicators=synthetic_indicators,
                manipulation_indicators=manipulation_indicators,
                authenticity_indicators=authenticity_indicators,
                temporal_indicators=temporal_indicators,
                limitations=[
                    "Analysis based on sampled frames, not full video",
                    "Deep learning models may have false positives/negatives",
                    "Temporal analysis limited by frame sampling rate",
                    "Compression artifacts may mimic manipulation signatures",
                    "Results are probabilistic, not definitive"
                ]
            )

            technical_details = TechnicalDetails(
                processing_time=time.time() - state.start_time,
                models_used=[d.name for d in self.detectors],
                frames_analyzed=len(frame_data),
                video_hash=video_processor.compute_video_hash(state.video_path),
                temporal_analysis=temporal_analysis
            )

            result = AnalysisResult(
                id=analysis_id,
                timestamp=datetime.fromtimestamp(state.start_time),
                video_info=video_info,
                overall_assessment=overall,
                ai_generated_probability=ai_prob if overall in [AssessmentCategory.LIKELY_AI_GENERATED, AssessmentCategory.POSSIBLE_MANIPULATION] else None,
                confidence=confidence,
                detector_agreement=detector_agreement,
                frame_analyses=frame_analyses,
                temporal_analysis=temporal_analysis,
                evidence=evidence,
                technical_details=technical_details
            )

            state.result = result
            self.update_status(analysis_id, AnalysisStatus.COMPLETE, 100, "Analysis complete")

            self._save_result(analysis_id, result)

        except Exception as e:
            logger.error(f"Analysis failed for {analysis_id}: {e}", exc_info=True)
            state.error = str(e)
            self.update_status(analysis_id, AnalysisStatus.ERROR, 0, f"Analysis failed: {str(e)}")
        finally:
            self._cleanup_temp(analysis_id)

    def _save_result(self, analysis_id: str, result: AnalysisResult):
        result_path = os.path.join(settings.RESULTS_DIR, f"{analysis_id}.json")
        with open(result_path, 'w') as f:
            json.dump(result.model_dump(mode='json'), f, indent=2, default=str)

    def _cleanup_temp(self, analysis_id: str):
        state = self.analyses.get(analysis_id)
        if state and state.temp_dir and os.path.exists(state.temp_dir):
            try:
                shutil.rmtree(state.temp_dir)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp dir for {analysis_id}: {e}")

    def get_result(self, analysis_id: str) -> Optional[AnalysisResult]:
        state = self.analyses.get(analysis_id)
        if state and state.result:
            return state.result

        result_path = os.path.join(settings.RESULTS_DIR, f"{analysis_id}.json")
        if os.path.exists(result_path):
            with open(result_path, 'r') as f:
                data = json.load(f)
            return AnalysisResult(**data)

        return None


import numpy as np
analysis_service = VideoAnalysisService()