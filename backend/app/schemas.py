from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AssessmentCategory(str, Enum):
    LIKELY_SYNTHETIC = "LIKELY_SYNTHETIC"
    LIKELY_HUMAN_RECORDED = "LIKELY_HUMAN_RECORDED"
    POSSIBLE_MANIPULATION = "POSSIBLE_MANIPULATION"
    INCONCLUSIVE = "INCONCLUSIVE"


class AnalysisStatus(str, Enum):
    IDLE = "idle"
    UPLOADING = "uploading"
    SCANNING = "scanning"
    ANALYZING = "analyzing"
    COMPLETE = "complete"
    ERROR = "error"


class DetectorResult(BaseModel):
    name: str
    category: AssessmentCategory
    confidence: float = Field(ge=0, le=100)
    details: Dict[str, Any] = {}
    processing_time: float


class Evidence(BaseModel):
    synthetic_indicators: List[str] = []
    manipulation_indicators: List[str] = []
    authenticity_indicators: List[str] = []
    limitations: List[str] = []


class TechnicalDetails(BaseModel):
    processing_time: float
    models_used: List[str]
    audio_hash: str


class AudioInfo(BaseModel):
    filename: str
    duration: float
    sample_rate: int
    channels: int
    format: str
    size: int


class AnalysisResult(BaseModel):
    id: str
    timestamp: datetime
    audio_info: AudioInfo
    overall_assessment: AssessmentCategory
    ai_generated_probability: Optional[float] = None
    confidence: float = Field(ge=0, le=100)
    detector_agreement: float = Field(ge=0, le=1)
    detectors: List[DetectorResult]
    evidence: Evidence
    technical_details: TechnicalDetails


class UploadResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus


class StatusResponse(BaseModel):
    status: AnalysisStatus
    progress: int


class HealthCheck(BaseModel):
    status: str
    version: str
    models_loaded: List[str]
    uptime: float


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    message: Optional[str] = None