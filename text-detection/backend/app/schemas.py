from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class AssessmentCategory(str, Enum):
    LIKELY_AI_GENERATED = "LIKELY_AI_GENERATED"
    POSSIBLY_AI_ASSISTED = "POSSIBLY_AI_ASSISTED"
    LIKELY_HUMAN_WRITTEN = "LIKELY_HUMAN_WRITTEN"
    MIXED_UNCERTAIN = "MIXED_UNCERTAIN"
    INCONCLUSIVE = "INCONCLUSIVE"


class AnalysisStatus(str, Enum):
    IDLE = "idle"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    ANALYZING = "analyzing"
    COMPLETE = "complete"
    ERROR = "error"


class TextInputRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="Text to analyze")


class TextInputResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    message: str


class DetectorResultSchema(BaseModel):
    name: str
    label: str
    confidence: float
    raw_scores: Dict[str, float]
    processing_time: float


class TextStatisticsSchema(BaseModel):
    character_count: int
    word_count: int
    sentence_count: int
    paragraph_count: int
    avg_word_length: float
    avg_sentence_length: float
    type_token_ratio: float
    hapax_legomena_ratio: float


class LinguisticFeaturesSchema(BaseModel):
    statistics: TextStatisticsSchema
    perplexity_scores: List[float]
    burstiness_score: float
    repetition_score: float
    sentence_length_variance: float
    pos_distribution: Dict[str, float]
    function_word_ratio: float
    readability_scores: Dict[str, float]
    ngram_entropy: Dict[int, float]


class EvidenceSchema(BaseModel):
    ai_indicators: List[str]
    human_indicators: List[str]
    stylistic_observations: List[str]
    limitations: List[str]


class TechnicalDetailsSchema(BaseModel):
    processing_time: float
    models_used: List[str]
    text_hash: str


class AnalysisResultSchema(BaseModel):
    id: str
    timestamp: float
    text_hash: str
    text_length: int
    overall_assessment: AssessmentCategory
    ai_generated_probability: Optional[float]
    confidence: float
    detector_agreement: float
    detectors: List[DetectorResultSchema]
    linguistic_features: LinguisticFeaturesSchema
    evidence: EvidenceSchema
    technical_details: TechnicalDetailsSchema


class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    progress: int
    message: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    detectors_loaded: int
    models: List[str]


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None