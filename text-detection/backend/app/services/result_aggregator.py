from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum
import hashlib
import time
import json


class AssessmentCategory(str, Enum):
    LIKELY_AI_GENERATED = "LIKELY_AI_GENERATED"
    POSSIBLY_AI_ASSISTED = "POSSIBLY_AI_ASSISTED"
    LIKELY_HUMAN_WRITTEN = "LIKELY_HUMAN_WRITTEN"
    MIXED_UNCERTAIN = "MIXED_UNCERTAIN"
    INCONCLUSIVE = "INCONCLUSIVE"


@dataclass
class Evidence:
    ai_indicators: List[str] = field(default_factory=list)
    human_indicators: List[str] = field(default_factory=list)
    stylistic_observations: List[str] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)


@dataclass
class DetectorResult:
    name: str
    label: str
    confidence: float
    raw_scores: Dict[str, float]
    processing_time: float


@dataclass
class LinguisticFeatures:
    statistics: Dict[str, Any]
    perplexity_scores: List[float]
    burstiness_score: float
    repetition_score: float
    sentence_length_variance: float
    pos_distribution: Dict[str, float]
    function_word_ratio: float
    readability_scores: Dict[str, float]
    ngram_entropy: Dict[int, float]


@dataclass
class AnalysisResult:
    id: str
    timestamp: float
    text_hash: str
    text_length: int
    overall_assessment: AssessmentCategory
    ai_generated_probability: Optional[float]
    confidence: float
    detector_agreement: float
    detectors: List[DetectorResult]
    linguistic_features: LinguisticFeatures
    evidence: Evidence
    technical_details: Dict[str, Any]


class ResultAggregator:
    def __init__(self, min_text_length: int = 50):
        self.min_text_length = min_text_length

    def classify(
        self,
        detector_results: List[DetectorResult],
        linguistic_features: LinguisticFeatures,
        text_length: int,
    ) -> tuple[AssessmentCategory, Optional[float], float, float, Evidence]:
        evidence = Evidence()

        if text_length < self.min_text_length:
            evidence.limitations.append(
                f"Text length ({text_length} chars) below minimum ({self.min_text_length}) for reliable analysis"
            )
            return (
                AssessmentCategory.INCONCLUSIVE,
                None,
                0.0,
                0.0,
                evidence,
            )

        detector_labels = [r.label for r in detector_results if r.label != "Error"]
        detector_confidences = [r.confidence for r in detector_results if r.label != "Error"]

        if not detector_labels:
            evidence.limitations.append("All detectors failed to produce results")
            return (
                AssessmentCategory.INCONCLUSIVE,
                None,
                0.0,
                0.0,
                evidence,
            )

        ai_votes = sum(1 for l in detector_labels if l == "AI")
        human_votes = sum(1 for l in detector_labels if l == "Human")
        total_votes = len(detector_labels)

        agreement = max(ai_votes, human_votes) / total_votes if total_votes > 0 else 0

        ai_confidences = [
            r.confidence for r in detector_results if r.label == "AI" and r.label != "Error"
        ]
        human_confidences = [
            r.confidence for r in detector_results if r.label == "Human" and r.label != "Error"
        ]

        avg_ai_conf = sum(ai_confidences) / len(ai_confidences) if ai_confidences else 0
        avg_human_conf = sum(human_confidences) / len(human_confidences) if human_confidences else 0

        perplexity_scores = [
            s for s in linguistic_features.perplexity_scores if not (s != s)
        ]
        avg_perplexity = sum(perplexity_scores) / len(perplexity_scores) if perplexity_scores else float('nan')

        burstiness = linguistic_features.burstiness_score
        repetition = linguistic_features.repetition_score
        ttr = linguistic_features.statistics.type_token_ratio
        hapax = linguistic_features.statistics.hapax_legomena_ratio
        function_word_ratio = linguistic_features.function_word_ratio

        ai_probability = None
        confidence = 0.0

        if ai_votes > human_votes:
            ai_probability = avg_ai_conf / 100.0
            confidence = avg_ai_conf * agreement
            evidence.ai_indicators.append(
                f"Majority of detectors ({ai_votes}/{total_votes}) classified as AI-generated"
            )
            if avg_perplexity < 100:
                evidence.ai_indicators.append(
                    f"Low perplexity ({avg_perplexity:.1f}) suggests predictable, AI-like text"
                )
            if burstiness < 0.5:
                evidence.ai_indicators.append(
                    f"Low burstiness ({burstiness:.3f}) indicates uniform sentence structure typical of AI"
                )
            if repetition > 0.1:
                evidence.ai_indicators.append(
                    f"Elevated n-gram repetition ({repetition:.3f}) suggests template-like generation"
                )
            if ttr < 0.4:
                evidence.ai_indicators.append(
                    f"Low type-token ratio ({ttr:.3f}) indicates limited vocabulary diversity"
                )

        elif human_votes > ai_votes:
            ai_probability = 1.0 - (avg_human_conf / 100.0)
            confidence = avg_human_conf * agreement
            evidence.human_indicators.append(
                f"Majority of detectors ({human_votes}/{total_votes}) classified as human-written"
            )
            if avg_perplexity > 200:
                evidence.human_indicators.append(
                    f"High perplexity ({avg_perplexity:.1f}) suggests less predictable, human-like text"
                )
            if burstiness > 1.0:
                evidence.human_indicators.append(
                    f"High burstiness ({burstiness:.3f}) indicates varied sentence structure typical of human writing"
                )
            if ttr > 0.5:
                evidence.human_indicators.append(
                    f"High type-token ratio ({ttr:.3f}) indicates rich vocabulary diversity"
                )

        else:
            ai_probability = 0.5
            confidence = 50.0 * agreement
            evidence.stylistic_observations.append(
                "Detectors evenly split between AI and human classifications"
            )

        if text_length < 200:
            evidence.limitations.append(
                "Short text length limits reliability of statistical measures"
            )
            confidence *= 0.7

        if abs(avg_perplexity - 150) < 50:
            evidence.stylistic_observations.append(
                "Perplexity in ambiguous range - not strongly indicative either way"
            )

        if repetition > 0.05:
            evidence.stylistic_observations.append(
                f"Some n-gram repetition detected ({repetition:.3f})"
            )

        avg_sent_len = linguistic_features.statistics.avg_sentence_length
        if avg_sent_len > 25:
            evidence.stylistic_observations.append(
                f"Long average sentence length ({avg_sent_len:.1f} words) - may indicate formal/academic style"
            )
        elif avg_sent_len < 10:
            evidence.stylistic_observations.append(
                f"Short average sentence length ({avg_sent_len:.1f} words) - may indicate conversational style"
            )

        if ai_probability is not None:
            if ai_probability > 0.8 and confidence > 70:
                category = AssessmentCategory.LIKELY_AI_GENERATED
            elif ai_probability > 0.6 and confidence > 50:
                category = AssessmentCategory.POSSIBLY_AI_ASSISTED
            elif ai_probability < 0.2 and confidence > 70:
                category = AssessmentCategory.LIKELY_HUMAN_WRITTEN
            elif ai_probability < 0.4 and confidence > 50:
                category = AssessmentCategory.LIKELY_HUMAN_WRITTEN
            else:
                category = AssessmentCategory.MIXED_UNCERTAIN
        else:
            category = AssessmentCategory.INCONCLUSIVE

        if agreement < 0.6:
            evidence.limitations.append("Low agreement between detectors")
            if category != AssessmentCategory.INCONCLUSIVE:
                category = AssessmentCategory.MIXED_UNCERTAIN

        return category, ai_probability, confidence, agreement, evidence


def compute_text_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def create_analysis_result(
    text: str,
    detector_results: List[DetectorResult],
    linguistic_features: LinguisticFeatures,
    processing_time: float,
    models_used: List[str],
    min_text_length: int = 50,
) -> AnalysisResult:
    aggregator = ResultAggregator(min_text_length)

    category, ai_prob, confidence, agreement, evidence = aggregator.classify(
        detector_results, linguistic_features, len(text)
    )

    return AnalysisResult(
        id=f"txt_{int(time.time() * 1000)}",
        timestamp=time.time(),
        text_hash=compute_text_hash(text),
        text_length=len(text),
        overall_assessment=category,
        ai_generated_probability=ai_prob,
        confidence=confidence,
        detector_agreement=agreement,
        detectors=detector_results,
        linguistic_features=linguistic_features,
        evidence=evidence,
        technical_details={
            "processing_time": processing_time,
            "models_used": models_used,
            "text_hash": compute_text_hash(text),
        },
    )