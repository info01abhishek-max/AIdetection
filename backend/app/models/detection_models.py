import os
import hashlib
import time
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import numpy as np
from PIL import Image
import cv2
from skimage import feature, filters, measure
from skimage.feature import local_binary_pattern, graycomatrix, graycoprops
import torch
import torch.nn.functional as F
from torchvision import transforms
import timm

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class DetectionResult:
    name: str
    category: str
    confidence: float
    details: Dict[str, Any]
    processing_time: float


class BaseDetector(ABC):
    def __init__(self, name: str):
        self.name = name
        self.loaded = False

    @abstractmethod
    def load(self) -> bool:
        pass

    @abstractmethod
    def detect(self, image: np.ndarray, metadata: Dict[str, Any]) -> DetectionResult:
        pass

    def _time_it(self, func, *args, **kwargs) -> Tuple[Any, float]:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = (time.perf_counter() - start) * 1000
        return result, elapsed


class SyntheticDetector(BaseDetector):
    def __init__(self):
        super().__init__("Synthetic Detection")
        self.model = None
        self.transform = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def load(self) -> bool:
        try:
            self.model = timm.create_model(
                'efficientnet_b0',
                pretrained=True,
                num_classes=2,
                drop_rate=0.2,
            )
            self.model.eval()
            self.model.to(self.device)

            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])

            self.loaded = True
            logger.info(f"{self.name} loaded successfully on {self.device}")
            return True
        except Exception as e:
            logger.error(f"Failed to load {self.name}: {e}")
            self.loaded = False
            return False

    def detect(self, image: np.ndarray, metadata: Dict[str, Any]) -> DetectionResult:
        if not self.loaded:
            return DetectionResult(
                name=self.name,
                category="INCONCLUSIVE",
                confidence=0.0,
                details={"error": "Model not loaded"},
                processing_time=0.0
            )

        def _detect():
            pil_image = Image.fromarray(image)
            input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

            with torch.no_grad():
                outputs = self.model(input_tensor)
                probabilities = F.softmax(outputs, dim=1)
                ai_prob = probabilities[0, 1].item()

            confidence = ai_prob * 100

            if confidence > 70:
                category = "LIKELY_AI_GENERATED"
            elif confidence > 40:
                category = "POSSIBLE_MANIPULATION"
            elif confidence < 30:
                category = "LIKELY_CAMERA_ORIGINATED"
            else:
                category = "INCONCLUSIVE"

            details = {
                "ai_probability": ai_prob,
                "model": "efficientnet_b0",
                "device": str(self.device),
                "input_shape": list(input_tensor.shape),
            }

            return category, confidence, details

        (category, confidence, details), processing_time = self._time_it(_detect)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details=details,
            processing_time=processing_time
        )


class FrequencyAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Frequency Analysis")

    def load(self) -> bool:
        self.loaded = True
        return True

    def detect(self, image: np.ndarray, metadata: Dict[str, Any]) -> DetectionResult:
        def _detect():
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0

            f_transform = np.fft.fft2(gray)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = np.log(np.abs(f_shift) + 1)

            h, w = magnitude_spectrum.shape
            center_h, center_w = h // 2, w // 2

            low_freq_radius = min(h, w) // 8
            high_freq_mask = np.ones_like(magnitude_spectrum)
            y, x = np.ogrid[:h, :w]
            mask = (x - center_w)**2 + (y - center_h)**2 <= low_freq_radius**2
            high_freq_mask[mask] = 0

            high_freq_energy = np.sum(magnitude_spectrum * high_freq_mask)
            total_energy = np.sum(magnitude_spectrum)
            high_freq_ratio = high_freq_energy / (total_energy + 1e-10)

            radial_profile = self._radial_profile(magnitude_spectrum)
            spectral_flatness = np.std(radial_profile) / (np.mean(radial_profile) + 1e-10)

            jpeg_artifacts = self._detect_jpeg_artifacts(gray)

            ai_score = 0.0
            indicators = []

            if high_freq_ratio < 0.05:
                ai_score += 0.3
                indicators.append("Unusually low high-frequency content")

            if spectral_flatness < 0.1:
                ai_score += 0.25
                indicators.append("Abnormally flat frequency spectrum")

            if jpeg_artifacts > 0.5:
                ai_score += 0.2
                indicators.append("JPEG quantization artifacts inconsistent with camera")

            if metadata.get("has_exif", False) is False:
                ai_score += 0.15
                indicators.append("No EXIF metadata present")

            confidence = min(ai_score * 100, 95)

            if confidence > 60:
                category = "LIKELY_AI_GENERATED"
            elif confidence > 35:
                category = "POSSIBLE_MANIPULATION"
            elif confidence < 25:
                category = "LIKELY_CAMERA_ORIGINATED"
            else:
                category = "INCONCLUSIVE"

            details = {
                "high_frequency_ratio": float(high_freq_ratio),
                "spectral_flatness": float(spectral_flatness),
                "jpeg_artifact_score": float(jpeg_artifacts),
                "indicators": indicators,
            }

            return category, confidence, details

        (category, confidence, details), processing_time = self._time_it(_detect)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details=details,
            processing_time=processing_time
        )

    def _radial_profile(self, data: np.ndarray) -> np.ndarray:
        h, w = data.shape
        center = np.array([(w - 1) / 2.0, (h - 1) / 2.0])
        y, x = np.indices((h, w))
        r = np.sqrt((x - center[0])**2 + (y - center[1])**2)
        r = r.astype(int)

        tbin = np.bincount(r.ravel(), data.ravel())
        nr = np.bincount(r.ravel())
        radial_profile = tbin / (nr + 1e-10)
        return radial_profile[:min(h, w)//2]

    def _detect_jpeg_artifacts(self, gray: np.ndarray) -> float:
        block_size = 8
        h, w = gray.shape
        artifact_scores = []

        for y in range(0, h - block_size, block_size):
            for x in range(0, w - block_size, block_size):
                block = gray[y:y+block_size, x:x+block_size]
                dct_block = cv2.dct(block)
                high_freq_coeffs = dct_block[4:, 4:]
                artifact_scores.append(np.mean(np.abs(high_freq_coeffs)))

        if not artifact_scores:
            return 0.0

        return float(np.std(artifact_scores) / (np.mean(artifact_scores) + 1e-10))


class TextureAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Texture Analysis")

    def load(self) -> bool:
        self.loaded = True
        return True

    def detect(self, image: np.ndarray, metadata: Dict[str, Any]) -> DetectionResult:
        def _detect():
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

            lbp = local_binary_pattern(gray, P=8, R=1, method='uniform')
            lbp_hist, _ = np.histogram(lbp.ravel(), bins=59, range=(0, 59), density=True)
            lbp_entropy = -np.sum(lbp_hist * np.log(lbp_hist + 1e-10))

            glcm = graycomatrix(gray, distances=[1, 2, 4], angles=[0, np.pi/4, np.pi/2, 3*np.pi/4],
                               levels=256, symmetric=True, normed=True)

            contrast = np.mean(graycoprops(glcm, 'contrast'))
            dissimilarity = np.mean(graycoprops(glcm, 'dissimilarity'))
            homogeneity = np.mean(graycoprops(glcm, 'homogeneity'))
            energy = np.mean(graycoprops(glcm, 'energy'))
            correlation = np.mean(graycoprops(glcm, 'correlation'))

            noise_map = self._estimate_noise(gray)
            noise_mean = np.mean(noise_map)
            noise_std = np.std(noise_map)

            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size

            ai_score = 0.0
            indicators = []

            if lbp_entropy < 3.5:
                ai_score += 0.25
                indicators.append("Low texture complexity (LBP entropy)")

            if homogeneity > 0.9:
                ai_score += 0.2
                indicators.append("Excessively uniform texture regions")

            if noise_std / (noise_mean + 1e-10) < 0.1:
                ai_score += 0.25
                indicators.append("Unnaturally consistent noise pattern")

            if edge_density < 0.02:
                ai_score += 0.15
                indicators.append("Unusually low edge density")

            confidence = min(ai_score * 100, 95)

            if confidence > 55:
                category = "LIKELY_AI_GENERATED"
            elif confidence > 30:
                category = "POSSIBLE_MANIPULATION"
            elif confidence < 20:
                category = "LIKELY_CAMERA_ORIGINATED"
            else:
                category = "INCONCLUSIVE"

            details = {
                "lbp_entropy": float(lbp_entropy),
                "glcm_contrast": float(contrast),
                "glcm_homogeneity": float(homogeneity),
                "glcm_energy": float(energy),
                "glcm_correlation": float(correlation),
                "noise_mean": float(noise_mean),
                "noise_std": float(noise_std),
                "edge_density": float(edge_density),
                "indicators": indicators,
            }

            return category, confidence, details

        (category, confidence, details), processing_time = self._time_it(_detect)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details=details,
            processing_time=processing_time
        )

    def _estimate_noise(self, gray: np.ndarray) -> np.ndarray:
        kernel = np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]) / 8.0
        noise = cv2.filter2D(gray.astype(np.float32), -1, kernel)
        return np.abs(noise)


class MetadataInspector(BaseDetector):
    def __init__(self):
        super().__init__("Metadata Inspection")

    def load(self) -> bool:
        self.loaded = True
        return True

    def detect(self, image: np.ndarray, metadata: Dict[str, Any]) -> DetectionResult:
        def _detect():
            indicators = []
            ai_score = 0.0

            has_exif = metadata.get("has_exif", False)
            if not has_exif:
                ai_score += 0.2
                indicators.append("No EXIF metadata detected")
            else:
                indicators.append("EXIF metadata present")

            software = metadata.get("software", "")
            if software:
                ai_keywords = ["midjourney", "dall-e", "stable diffusion", "gpt", "ai", "generative"]
                if any(kw in software.lower() for kw in ai_keywords):
                    ai_score += 0.5
                    indicators.append(f"Software tag indicates AI generation: {software}")

            datetime_original = metadata.get("datetime_original", "")
            if not datetime_original and has_exif:
                ai_score += 0.1
                indicators.append("No DateTimeOriginal in EXIF")

            make = metadata.get("make", "")
            model = metadata.get("model", "")
            if not make and not model and has_exif:
                ai_score += 0.15
                indicators.append("No camera make/model in EXIF")

            gps_info = metadata.get("gps_info", False)
            if not gps_info and has_exif:
                indicators.append("No GPS data in EXIF")

            confidence = min(ai_score * 100, 80)

            if confidence > 50:
                category = "LIKELY_AI_GENERATED"
            elif confidence > 25:
                category = "POSSIBLE_MANIPULATION"
            else:
                category = "LIKELY_CAMERA_ORIGINATED" if has_exif else "INCONCLUSIVE"

            details = {
                "has_exif": has_exif,
                "software": software,
                "make": make,
                "model": model,
                "datetime_original": datetime_original,
                "has_gps": gps_info,
                "indicators": indicators,
            }

            return category, confidence, details

        (category, confidence, details), processing_time = self._time_it(_detect)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details=details,
            processing_time=processing_time
        )


class ConsistencyChecker(BaseDetector):
    def __init__(self):
        super().__init__("Consistency Check")

    def load(self) -> bool:
        self.loaded = True
        return True

    def detect(self, image: np.ndarray, metadata: Dict[str, Any]) -> DetectionResult:
        def _detect():
            indicators = []
            ai_score = 0.0

            h, w = image.shape[:2]
            quadrants = [
                image[0:h//2, 0:w//2],
                image[0:h//2, w//2:w],
                image[h//2:h, 0:w//2],
                image[h//2:h, w//2:w],
            ]

            quadrant_stats = []
            for i, quad in enumerate(quadrants):
                gray = cv2.cvtColor(quad, cv2.COLOR_RGB2GRAY)
                mean_val = np.mean(gray)
                std_val = np.std(gray)
                quadrant_stats.append((mean_val, std_val))

            means = [s[0] for s in quadrant_stats]
            stds = [s[1] for s in quadrant_stats]

            mean_cv = np.std(means) / (np.mean(means) + 1e-10)
            std_cv = np.std(stds) / (np.mean(stds) + 1e-10)

            if mean_cv < 0.01:
                ai_score += 0.2
                indicators.append("Suspiciously uniform illumination across quadrants")

            if std_cv < 0.05:
                ai_score += 0.15
                indicators.append("Low texture variation across image regions")

            color_consistency = self._check_color_consistency(image)
            if color_consistency < 0.1:
                ai_score += 0.15
                indicators.append("Unnatural color distribution consistency")

            compression_consistency = self._check_compression_consistency(image)
            if compression_consistency > 0.8:
                ai_score += 0.2
                indicators.append("Uniform compression artifacts (possible re-compression)")

            confidence = min(ai_score * 100, 85)

            if confidence > 50:
                category = "POSSIBLE_MANIPULATION"
            elif confidence > 25:
                category = "POSSIBLE_MANIPULATION"
            elif confidence < 15:
                category = "LIKELY_CAMERA_ORIGINATED"
            else:
                category = "INCONCLUSIVE"

            details = {
                "mean_coefficient_variation": float(mean_cv),
                "std_coefficient_variation": float(std_cv),
                "color_consistency_score": float(color_consistency),
                "compression_consistency": float(compression_consistency),
                "indicators": indicators,
            }

            return category, confidence, details

        (category, confidence, details), processing_time = self._time_it(_detect)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details=details,
            processing_time=processing_time
        )

    def _check_color_consistency(self, image: np.ndarray) -> float:
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
        l_channel = lab[:, :, 0]

        h, w = l_channel.shape
        grid_size = 16
        cell_h, cell_w = h // grid_size, w // grid_size

        means = []
        for i in range(grid_size):
            for j in range(grid_size):
                cell = l_channel[i*cell_h:(i+1)*cell_h, j*cell_w:(j+1)*cell_w]
                if cell.size > 0:
                    means.append(np.mean(cell))

        if len(means) < 4:
            return 1.0

        return float(np.std(means) / (np.mean(means) + 1e-10))

    def _check_compression_consistency(self, image: np.ndarray) -> float:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY).astype(np.float32)

        h, w = gray.shape
        block_size = 8
        dct_variances = []

        for y in range(0, h - block_size, block_size):
            for x in range(0, w - block_size, block_size):
                block = gray[y:y+block_size, x:x+block_size]
                dct = cv2.dct(block)
                dct_variances.append(np.var(dct))

        if not dct_variances:
            return 0.0

        return float(np.std(dct_variances) / (np.mean(dct_variances) + 1e-10))


class DetectorRegistry:
    def __init__(self):
        self.detectors: List[BaseDetector] = []

    def register(self, detector: BaseDetector):
        self.detectors.append(detector)

    def load_all(self) -> Dict[str, bool]:
        results = {}
        for detector in self.detectors:
            results[detector.name] = detector.load()
        return results

    def run_all(self, image: np.ndarray, metadata: Dict[str, Any]) -> List[DetectionResult]:
        results = []
        for detector in self.detectors:
            if detector.loaded:
                try:
                    result = detector.detect(image, metadata)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Detector {detector.name} failed: {e}")
                    results.append(DetectionResult(
                        name=detector.name,
                        category="INCONCLUSIVE",
                        confidence=0.0,
                        details={"error": str(e)},
                        processing_time=0.0
                    ))
        return results


detector_registry = DetectorRegistry()
detector_registry.register(SyntheticDetector())
detector_registry.register(FrequencyAnalyzer())
detector_registry.register(TextureAnalyzer())
detector_registry.register(MetadataInspector())
detector_registry.register(ConsistencyChecker())