from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AssessmentCategory(str, Enum):
    LIKELY_AI_GENERATED = "LIKELY_AI_GENERATED"
    LIKELY_AUTHENTIC = "LIKELY_AUTHENTIC"
    POSSIBLE_MANIPULATION = "POSSIBLE_MANIPULATION"
    INCONCLUSIVE = "INCONCLUSIVE"


class AnalysisStatus(str, Enum):
    IDLE = "idle"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    EXTRACTING_FRAMES = "extracting_frames"
    ANALYZING_FRAMES = "analyzing_frames"
    AGGREGATING = "aggregating"
    COMPLETE = "complete"
    ERROR = "error"


class DetectorResult(BaseModel):
    name: str
    category: AssessmentCategory
    confidence: float = Field(ge=0, le=100)
    details: Dict[str, Any] = {}
    processing_time: float


class FrameAnalysis(BaseModel):
    frame_index: int
    timestamp: float
    thumbnail_path: Optional[str] = None
    detectors: List[DetectorResult]
    overall_category: AssessmentCategory
    confidence: float


class VideoInfo(BaseModel):
    filename: str
    duration: float
    width: int
    height: int
    fps: float
    total_frames: int
    codec: str
    format: str
    size: int
    bitrate: Optional[int] = None


class TemporalAnalysis(BaseModel):
    consistency_score: float
    frame_similarity_variance: float
    scene_changes: int
    flicker_detected: bool
    details: Dict[str, Any]


class Evidence(BaseModel):
    synthetic_indicators: List[str] = []
    manipulation_indicators: List[str] = []
    authenticity_indicators: List[str] = []
    temporal_indicators: List[str] = []
    limitations: List[str] = []


class TechnicalDetails(BaseModel):
    processing_time: float
    models_used: List[str]
    frames_analyzed: int
    video_hash: str
    temporal_analysis: TemporalAnalysis


class AnalysisResult(BaseModel):
    id: str
    timestamp: datetime
    video_info: VideoInfo
    overall_assessment: AssessmentCategory
    ai_generated_probability: Optional[float] = None
    confidence: float = Field(ge=0, le=100)
    detector_agreement: float = Field(ge=0, le=1)
    frame_analyses: List[FrameAnalysis]
    temporal_analysis: TemporalAnalysis
    evidence: Evidence
    technical_details: TechnicalDetails


class UploadResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus


class StatusResponse(BaseModel):
    status: AnalysisStatus
    progress: int
    message: Optional[str] = None


class HealthCheck(BaseModel):
    status: str
    version: str
    models_loaded: List[str]
    uptime: float
    gpu_available: bool


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    message: Optional[str] = None