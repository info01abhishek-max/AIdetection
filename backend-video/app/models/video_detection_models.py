import logging
import time
import hashlib
import numpy as np
import cv2
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from skimage.feature import local_binary_pattern, graycomatrix, graycoprops
from skimage.filters import gabor
from skimage.measure import shannon_entropy
from skimage.color import rgb2gray

from app.config import settings
from app.schemas import AssessmentCategory

logger = logging.getLogger(__name__)


@dataclass
class DetectionResult:
    name: str
    category: AssessmentCategory
    confidence: float
    details: Dict[str, Any]
    processing_time: float


class BaseFrameDetector(ABC):
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"{__name__}.{name}")

    @abstractmethod
    def analyze(self, frame: np.ndarray) -> DetectionResult:
        pass

    def _calculate_confidence(self, score: float, threshold: float) -> Tuple[AssessmentCategory, float]:
        if score > threshold:
            return AssessmentCategory.LIKELY_AI_GENERATED, min(score * 100, 100)
        elif score < threshold * 0.5:
            return AssessmentCategory.LIKELY_AUTHENTIC, min((1 - score) * 100, 100)
        else:
            return AssessmentCategory.POSSIBLE_MANIPULATION, min(abs(score - 0.5) * 200, 100)


class SyntheticFrameDetector(BaseFrameDetector):
    def __init__(self):
        super().__init__("SyntheticFrameDetector")
        self.threshold = settings.SYNTHETIC_DETECTION_THRESHOLD
        self._model = None
        self._transform = None
        self._load_model()

    def _load_model(self):
        try:
            import torch
            import timm
            import os
            from torchvision import transforms

            # Set cache directory for timm/torch hub
            if hasattr(settings, 'MODEL_CACHE_DIR'):
                os.environ['TORCH_HOME'] = settings.MODEL_CACHE_DIR
                os.environ['TIMM_CACHE_DIR'] = settings.MODEL_CACHE_DIR

            self._model = timm.create_model(
                'efficientnet_b0',
                pretrained=True,
                num_classes=2
            )
            self._model.eval()

            self._transform = transforms.Compose([
                transforms.ToPILImage(),
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])

            if settings.USE_GPU and torch.cuda.is_available():
                self._model = self._model.cuda()

            self.logger.info("Synthetic detection model loaded successfully")
        except Exception as e:
            self.logger.warning(f"Could not load synthetic detection model: {e}")
            self._model = None
            self._transform = None

    def analyze(self, frame: np.ndarray) -> DetectionResult:
        start_time = time.time()

        if self._model is None:
            return self._fallback_analysis(frame, start_time)

        try:
            import torch
            input_tensor = self._transform(frame).unsqueeze(0)
            if settings.USE_GPU and torch.cuda.is_available():
                input_tensor = input_tensor.cuda()

            with torch.no_grad():
                output = self._model(input_tensor)
                probs = torch.softmax(output, dim=1)
                ai_prob = probs[0, 1].item()

            category, confidence = self._calculate_confidence(ai_prob, self.threshold)

            return DetectionResult(
                name=self.name,
                category=category,
                confidence=confidence,
                details={
                    "ai_probability": ai_prob,
                    "model": "efficientnet_b0",
                    "method": "deep_learning_classification"
                },
                processing_time=time.time() - start_time
            )
        except Exception as e:
            self.logger.error(f"Synthetic detection failed: {e}")
            return self._fallback_analysis(frame, start_time)

    def _fallback_analysis(self, frame: np.ndarray, start_time: float) -> DetectionResult:
        gray = rgb2gray(frame)
        entropy = shannon_entropy(gray)
        lbp = local_binary_pattern(gray, 8, 1, method='uniform')
        lbp_hist, _ = np.histogram(lbp.ravel(), bins=10, range=(0, 10), density=True)
        lbp_entropy = shannon_entropy(lbp_hist)

        score = (entropy / 8.0 + lbp_entropy / 3.0) / 2
        category, confidence = self._calculate_confidence(score, self.threshold)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details={
                "entropy": float(entropy),
                "lbp_entropy": float(lbp_entropy),
                "method": "statistical_fallback",
                "note": "Deep learning model unavailable, using statistical analysis"
            },
            processing_time=time.time() - start_time
        )


class FrequencyFrameDetector(BaseFrameDetector):
    def __init__(self):
        super().__init__("FrequencyFrameDetector")
        self.threshold = 0.45

    def analyze(self, frame: np.ndarray) -> DetectionResult:
        start_time = time.time()
        gray = rgb2gray(frame)

        h, w = gray.shape
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude = np.log(np.abs(f_shift) + 1)

        center_h, center_w = h // 2, w // 2
        radius = min(h, w) // 8
        y, x = np.ogrid[:h, :w]
        mask = (x - center_w) ** 2 + (y - center_h) ** 2 <= radius ** 2

        # Ensure mask matches magnitude shape exactly
        if mask.shape != magnitude.shape:
            mask = mask[:magnitude.shape[0], :magnitude.shape[1]]

        low_freq = magnitude[mask]
        high_freq = magnitude[~mask]

        low_energy = float(np.mean(low_freq)) if low_freq.size > 0 else 0.0
        high_energy = float(np.mean(high_freq)) if high_freq.size > 0 else 0.0
        freq_ratio = high_energy / (low_energy + 1e-8)

        # DCT requires dimensions multiple of 8, pad if necessary
        dct_h = ((h + 7) // 8) * 8
        dct_w = ((w + 7) // 8) * 8
        gray_padded = cv2.copyMakeBorder(gray, 0, dct_h - h, 0, dct_w - w, cv2.BORDER_REFLECT)
        dct = cv2.dct(np.float32(gray_padded))
        dct_high = dct[h // 4:, w // 4:]
        dct_energy = float(np.mean(np.abs(dct_high))) if dct_high.size > 0 else 0.0

        score = min(freq_ratio / 2.0 + dct_energy / 100.0, 1.0)
        category, confidence = self._calculate_confidence(score, self.threshold)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details={
                "frequency_ratio": float(freq_ratio),
                "dct_high_energy": float(dct_energy),
                "low_freq_energy": float(low_energy),
                "high_freq_energy": float(high_energy),
                "method": "frequency_domain_analysis"
            },
            processing_time=time.time() - start_time
        )


class TextureFrameDetector(BaseFrameDetector):
    def __init__(self):
        super().__init__("TextureFrameDetector")
        self.threshold = 0.4

    def analyze(self, frame: np.ndarray) -> DetectionResult:
        start_time = time.time()
        gray = (rgb2gray(frame) * 255).astype(np.uint8)

        lbp = local_binary_pattern(gray, 24, 3, method='uniform')
        lbp_hist, _ = np.histogram(lbp.ravel(), bins=26, range=(0, 26), density=True)
        lbp_entropy = shannon_entropy(lbp_hist)

        glcm = graycomatrix(gray, distances=[1, 2, 3], angles=[0, np.pi/4, np.pi/2, 3*np.pi/4], levels=256)
        contrast = np.mean(graycoprops(glcm, 'contrast'))
        homogeneity = np.mean(graycoprops(glcm, 'homogeneity'))
        energy = np.mean(graycoprops(glcm, 'energy'))
        correlation = np.mean(graycoprops(glcm, 'correlation'))

        gabor_responses = []
        for frequency in [0.1, 0.2, 0.4]:
            for theta in [0, np.pi/4, np.pi/2, 3*np.pi/4]:
                real, _ = gabor(gray, frequency=frequency, theta=theta)
                gabor_responses.append(np.mean(np.abs(real)))
        gabor_mean = np.mean(gabor_responses)

        texture_score = (
            (1 - min(lbp_entropy / 4.0, 1.0)) * 0.3 +
            (1 - min(homogeneity, 1.0)) * 0.2 +
            min(contrast / 100.0, 1.0) * 0.2 +
            (1 - energy) * 0.15 +
            (1 - correlation) * 0.15
        )

        category, confidence = self._calculate_confidence(texture_score, self.threshold)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details={
                "lbp_entropy": float(lbp_entropy),
                "glcm_contrast": float(contrast),
                "glcm_homogeneity": float(homogeneity),
                "glcm_energy": float(energy),
                "glcm_correlation": float(correlation),
                "gabor_mean": float(gabor_mean),
                "method": "texture_analysis"
            },
            processing_time=time.time() - start_time
        )


class NoiseFrameDetector(BaseFrameDetector):
    def __init__(self):
        super().__init__("NoiseFrameDetector")
        self.threshold = 0.5

    def analyze(self, frame: np.ndarray) -> DetectionResult:
        start_time = time.time()
        gray = rgb2gray(frame)

        kernel = np.array([[-1, 2, -1], [-1, 2, -1], [-1, 2, -1]]) / 6
        noise_residual = cv2.filter2D(gray, -1, kernel)
        noise_mean = np.mean(np.abs(noise_residual))
        noise_std = np.std(noise_residual)

        prnu = self._estimate_prnu(gray)

        fft = np.fft.fft2(gray)
        fft_shift = np.fft.fftshift(fft)
        magnitude = np.abs(fft_shift)
        h, w = magnitude.shape
        center = magnitude[h//2-10:h//2+10, w//2-10:w//2+10]
        noise_floor = np.median(magnitude) / (np.max(center) + 1e-8)

        score = (noise_std * 10 + (1 - prnu) * 0.5 + noise_floor * 0.3)
        score = min(score, 1.0)

        category, confidence = self._calculate_confidence(score, self.threshold)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details={
                "noise_mean": float(noise_mean),
                "noise_std": float(noise_std),
                "prnu_estimate": float(prnu),
                "noise_floor": float(noise_floor),
                "method": "noise_analysis"
            },
            processing_time=time.time() - start_time
        )

    def _estimate_prnu(self, gray: np.ndarray) -> float:
        denoised = cv2.GaussianBlur(gray, (5, 5), 1.5)
        residual = gray - denoised
        residual_norm = residual / (denoised + 1e-8)
        return float(np.mean(np.abs(residual_norm)))


class CompressionFrameDetector(BaseFrameDetector):
    def __init__(self):
        super().__init__("CompressionFrameDetector")
        self.threshold = 0.4

    def analyze(self, frame: np.ndarray) -> DetectionResult:
        start_time = time.time()
        gray = rgb2gray(frame)

        block_artifacts = self._detect_block_artifacts(gray)
        dct_stats = self._analyze_dct_coefficients(gray)
        quantization = self._estimate_quantization(gray)

        score = (block_artifacts + dct_stats + quantization) / 3
        category, confidence = self._calculate_confidence(score, self.threshold)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details={
                "block_artifacts": float(block_artifacts),
                "dct_coefficient_stats": float(dct_stats),
                "quantization_estimate": float(quantization),
                "method": "compression_analysis"
            },
            processing_time=time.time() - start_time
        )

    def _detect_block_artifacts(self, gray: np.ndarray) -> float:
        h, w = gray.shape
        if w <= 8 or h <= 8:
            return 0.0

        # Use matching slice ranges to avoid broadcast errors
        v_slice_start = 8
        v_slice_end = w - (w % 8) if w % 8 != 0 else w
        v_diff = np.abs(gray[:, v_slice_start:v_slice_end:8] - gray[:, v_slice_start-1:v_slice_end-1:8]).mean()

        h_slice_start = 8
        h_slice_end = h - (h % 8) if h % 8 != 0 else h
        h_diff = np.abs(gray[h_slice_start:h_slice_end:8, :] - gray[h_slice_start-1:h_slice_end-1:8, :]).mean()

        return min((v_diff + h_diff) / 20.0, 1.0)

    def _analyze_dct_coefficients(self, gray: np.ndarray) -> float:
        h, w = gray.shape
        dct_h = ((h + 7) // 8) * 8
        dct_w = ((w + 7) // 8) * 8
        gray_padded = cv2.copyMakeBorder(gray, 0, dct_h - h, 0, dct_w - w, cv2.BORDER_REFLECT)
        dct = cv2.dct(np.float32(gray_padded))
        h, w = dct.shape
        blocks_h, blocks_w = h // 8, w // 8
        zero_counts = []

        for i in range(blocks_h):
            for j in range(blocks_w):
                block = dct[i*8:(i+1)*8, j*8:(j+1)*8]
                zero_count = np.sum(np.abs(block) < 1.0)
                zero_counts.append(zero_count / 64.0)

        return min(np.mean(zero_counts) * 2, 1.0) if zero_counts else 0

    def _estimate_quantization(self, gray: np.ndarray) -> float:
        h, w = gray.shape
        dct_h = ((h + 7) // 8) * 8
        dct_w = ((w + 7) // 8) * 8
        gray_padded = cv2.copyMakeBorder(gray, 0, dct_h - h, 0, dct_w - w, cv2.BORDER_REFLECT)
        dct = cv2.dct(np.float32(gray_padded))
        high_freq = dct[4:, 4:]
        hist, bins = np.histogram(high_freq.ravel(), bins=50)
        peaks = np.sum(hist > np.mean(hist) * 2)
        return min(peaks / 20.0, 1.0)


class TemporalAnalyzer:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.consistency_threshold = settings.TEMPORAL_CONSISTENCY_THRESHOLD

    def analyze(self, frame_results: List[List[DetectionResult]], frame_indices: List[int], timestamps: List[float]) -> Dict[str, Any]:
        if len(frame_results) < 2:
            return self._empty_temporal_analysis()

        detector_names = frame_results[0] and [d.name for d in frame_results[0]] or []
        if not detector_names:
            return self._empty_temporal_analysis()

        consistency_scores = {}
        for det_name in detector_names:
            scores = []
            categories = []
            for frame_dets in frame_results:
                det = next((d for d in frame_dets if d.name == det_name), None)
                if det:
                    scores.append(det.confidence / 100.0)
                    categories.append(det.category.value)

            if scores:
                consistency_scores[det_name] = {
                    "variance": float(np.var(scores)),
                    "mean": float(np.mean(scores)),
                    "std": float(np.std(scores)),
                    "category_changes": sum(1 for i in range(1, len(categories)) if categories[i] != categories[i-1])
                }

        frame_similarities = self._compute_frame_similarities(frame_results)
        scene_changes = self._detect_scene_changes(frame_similarities, timestamps)
        flicker = self._detect_flicker(frame_results, detector_names)

        overall_consistency = 1 - np.mean([v["variance"] for v in consistency_scores.values()]) if consistency_scores else 0
        frame_similarity_variance = float(np.var(frame_similarities)) if frame_similarities else 0

        temporal_indicators = []
        if overall_consistency < 0.5:
            temporal_indicators.append("Low frame-to-frame consistency detected")
        if scene_changes > len(frame_results) * 0.3:
            temporal_indicators.append(f"High number of scene changes ({scene_changes})")
        if flicker:
            temporal_indicators.append("Temporal flicker detected in detector responses")

        return {
            "consistency_score": float(overall_consistency),
            "frame_similarity_variance": frame_similarity_variance,
            "scene_changes": scene_changes,
            "flicker_detected": flicker,
            "detector_consistency": consistency_scores,
            "details": {
                "frame_count": len(frame_results),
                "temporal_indicators": temporal_indicators
            }
        }

    def _compute_frame_similarities(self, frame_results: List[List[DetectionResult]]) -> List[float]:
        similarities = []
        for i in range(1, len(frame_results)):
            prev_scores = {d.name: d.confidence for d in frame_results[i-1]}
            curr_scores = {d.name: d.confidence for d in frame_results[i]}
            common = set(prev_scores.keys()) & set(curr_scores.keys())
            if common:
                diffs = [abs(prev_scores[k] - curr_scores[k]) for k in common]
                similarities.append(1 - np.mean(diffs) / 100.0)
        return similarities

    def _detect_scene_changes(self, similarities: List[float], timestamps: List[float]) -> int:
        if len(similarities) < 2:
            return 0
        threshold = np.mean(similarities) - 1.5 * np.std(similarities)
        return sum(1 for s in similarities if s < threshold)

    def _detect_flicker(self, frame_results: List[List[DetectionResult]], detector_names: List[str]) -> bool:
        for det_name in detector_names:
            categories = []
            for frame_dets in frame_results:
                det = next((d for d in frame_dets if d.name == det_name), None)
                if det:
                    categories.append(det.category)
            changes = sum(1 for i in range(1, len(categories)) if categories[i] != categories[i-1])
            if changes > len(frame_results) * 0.4:
                return True
        return False

    def _empty_temporal_analysis(self) -> Dict[str, Any]:
        return {
            "consistency_score": 1.0,
            "frame_similarity_variance": 0.0,
            "scene_changes": 0,
            "flicker_detected": False,
            "detector_consistency": {},
            "details": {"frame_count": 0, "temporal_indicators": ["Insufficient frames for temporal analysis"]}
        }


def create_frame_detectors() -> List[BaseFrameDetector]:
    return [
        SyntheticFrameDetector(),
        FrequencyFrameDetector(),
        TextureFrameDetector(),
        NoiseFrameDetector(),
        CompressionFrameDetector(),
    ]


def analyze_frame(frame: np.ndarray, detectors: List[BaseFrameDetector]) -> List[DetectionResult]:
    return [det.analyze(frame) for det in detectors]


def aggregate_frame_results(frame_results: List[List[DetectionResult]], temporal_analysis: Dict[str, Any]) -> Tuple[AssessmentCategory, float, float, List[str], List[str], List[str], List[str]]:
    if not frame_results:
        return AssessmentCategory.INCONCLUSIVE, 0, 0, [], [], [], ["No frames analyzed"]

    detector_names = [d.name for d in frame_results[0]]
    avg_confidences = {}
    category_votes = {}

    for det_name in detector_names:
        confidences = []
        categories = []
        for frame_dets in frame_results:
            det = next((d for d in frame_dets if d.name == det_name), None)
            if det:
                confidences.append(det.confidence)
                categories.append(det.category)

        if confidences:
            avg_confidences[det_name] = np.mean(confidences)
            category_votes[det_name] = max(set(categories), key=categories.count) if categories else AssessmentCategory.INCONCLUSIVE

    ai_votes = sum(1 for c in category_votes.values() if c == AssessmentCategory.LIKELY_AI_GENERATED)
    authentic_votes = sum(1 for c in category_votes.values() if c == AssessmentCategory.LIKELY_AUTHENTIC)
    manipulation_votes = sum(1 for c in category_votes.values() if c == AssessmentCategory.POSSIBLE_MANIPULATION)

    total_votes = len(category_votes)
    detector_agreement = max(ai_votes, authentic_votes, manipulation_votes) / total_votes if total_votes > 0 else 0

    if ai_votes > authentic_votes and ai_votes > manipulation_votes:
        overall = AssessmentCategory.LIKELY_AI_GENERATED
        ai_prob = ai_votes / total_votes
    elif authentic_votes > ai_votes and authentic_votes > manipulation_votes:
        overall = AssessmentCategory.LIKELY_AUTHENTIC
        ai_prob = 1 - (authentic_votes / total_votes)
    elif manipulation_votes > 0:
        overall = AssessmentCategory.POSSIBLE_MANIPULATION
        ai_prob = manipulation_votes / total_votes
    else:
        overall = AssessmentCategory.INCONCLUSIVE
        ai_prob = 0.5

    confidence = np.mean(list(avg_confidences.values())) if avg_confidences else 0

    synthetic_indicators = []
    manipulation_indicators = []
    authenticity_indicators = []
    temporal_indicators = temporal_analysis.get("details", {}).get("temporal_indicators", [])

    for det_name, cat in category_votes.items():
        if cat == AssessmentCategory.LIKELY_AI_GENERATED:
            synthetic_indicators.append(f"{det_name}: AI-generated patterns detected")
        elif cat == AssessmentCategory.POSSIBLE_MANIPULATION:
            manipulation_indicators.append(f"{det_name}: Possible manipulation signs")
        elif cat == AssessmentCategory.LIKELY_AUTHENTIC:
            authenticity_indicators.append(f"{det_name}: Natural patterns consistent with real content")

    return overall, ai_prob, confidence, detector_agreement, synthetic_indicators, manipulation_indicators, authenticity_indicators, temporal_indicators