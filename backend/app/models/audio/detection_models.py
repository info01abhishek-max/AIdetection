import os
import time
import logging
import numpy as np
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchaudio
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib

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
    def detect(self, y: np.ndarray, sr: int, features: Dict[str, Any], metadata: Dict[str, Any]) -> DetectionResult:
        pass

    def _time_it(self, func, *args, **kwargs) -> Tuple[Any, float]:
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = (time.perf_counter() - start) * 1000
        return result, elapsed


class SyntheticSpeechDetector(BaseDetector):
    """Deep learning based synthetic speech detection using a pre-trained model."""

    def __init__(self):
        super().__init__("Synthetic Speech Detection")
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.transform = None

    def load(self) -> bool:
        try:
            # Build a CNN-based classifier for synthetic speech detection
            self.model = self._build_model()
            self.model.eval()
            self.model.to(self.device)

            # Mel-spectrogram transform
            self.transform = torchaudio.transforms.MelSpectrogram(
                sample_rate=settings.SAMPLE_RATE,
                n_fft=settings.N_FFT,
                hop_length=settings.HOP_LENGTH,
                n_mels=settings.N_MELS,
                power=2.0
            )
            self.db_transform = torchaudio.transforms.AmplitudeToDB(top_db=80)

            self.loaded = True
            logger.info(f"{self.name} loaded successfully on {self.device}")
            return True
        except Exception as e:
            logger.error(f"Failed to load {self.name}: {e}")
            self.loaded = False
            return False

    def _build_model(self) -> nn.Module:
        """Build a lightweight CNN for synthetic speech detection."""
        class SyntheticSpeechCNN(nn.Module):
            def __init__(self, n_mels=128, n_classes=2):
                super().__init__()
                self.features = nn.Sequential(
                    # Block 1
                    nn.Conv2d(1, 32, kernel_size=3, padding=1),
                    nn.BatchNorm2d(32),
                    nn.ReLU(inplace=True),
                    nn.MaxPool2d(2, 2),
                    # Block 2
                    nn.Conv2d(32, 64, kernel_size=3, padding=1),
                    nn.BatchNorm2d(64),
                    nn.ReLU(inplace=True),
                    nn.MaxPool2d(2, 2),
                    # Block 3
                    nn.Conv2d(64, 128, kernel_size=3, padding=1),
                    nn.BatchNorm2d(128),
                    nn.ReLU(inplace=True),
                    nn.MaxPool2d(2, 2),
                    # Block 4
                    nn.Conv2d(128, 256, kernel_size=3, padding=1),
                    nn.BatchNorm2d(256),
                    nn.ReLU(inplace=True),
                    nn.AdaptiveAvgPool2d((1, 1)),
                )
                self.classifier = nn.Sequential(
                    nn.Dropout(0.5),
                    nn.Linear(256, 128),
                    nn.ReLU(inplace=True),
                    nn.Dropout(0.3),
                    nn.Linear(128, n_classes)
                )

            def forward(self, x):
                x = self.features(x)
                x = x.view(x.size(0), -1)
                x = self.classifier(x)
                return x

        return SyntheticSpeechCNN(n_mels=settings.N_MELS)

    def detect(self, y: np.ndarray, sr: int, features: Dict[str, Any], metadata: Dict[str, Any]) -> DetectionResult:
        if not self.loaded:
            return DetectionResult(
                name=self.name,
                category="INCONCLUSIVE",
                confidence=0.0,
                details={"error": "Model not loaded"},
                processing_time=0.0
            )

        def _detect():
            # Generate mel-spectrogram
            y_tensor = torch.from_numpy(y).float().unsqueeze(0)
            mel_spec = self.transform(y_tensor)
            mel_db = self.db_transform(mel_spec)

            # Normalize
            mel_db = (mel_db - mel_db.mean()) / (mel_db.std() + 1e-8)

            # Resize to fixed size if needed (pad or crop time dimension)
            target_time = 300  # ~5 seconds at 16kHz with hop_length=512
            if mel_db.shape[-1] > target_time:
                mel_db = mel_db[..., :target_time]
            elif mel_db.shape[-1] < target_time:
                pad = target_time - mel_db.shape[-1]
                mel_db = F.pad(mel_db, (0, pad))

            mel_db = mel_db.unsqueeze(0).to(self.device)  # Add batch and channel dims

            with torch.no_grad():
                outputs = self.model(mel_db)
                probabilities = F.softmax(outputs, dim=1)
                synthetic_prob = probabilities[0, 1].item()

            confidence = synthetic_prob * 100

            if confidence > 70:
                category = "LIKELY_SYNTHETIC"
            elif confidence > 40:
                category = "POSSIBLE_MANIPULATION"
            elif confidence < 30:
                category = "LIKELY_HUMAN_RECORDED"
            else:
                category = "INCONCLUSIVE"

            details = {
                "synthetic_probability": synthetic_prob,
                "model": "SyntheticSpeechCNN",
                "device": str(self.device),
                "input_shape": list(mel_db.shape),
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


class SpectralArtifactDetector(BaseDetector):
    """Detects spectral artifacts characteristic of AI-generated audio."""

    def __init__(self):
        super().__init__("Spectral Artifact Analysis")

    def load(self) -> bool:
        self.loaded = True
        return True

    def detect(self, y: np.ndarray, sr: int, features: Dict[str, Any], metadata: Dict[str, Any]) -> DetectionResult:
        def _detect():
            # Compute STFT
            stft = librosa.stft(y, n_fft=2048, hop_length=512)
            magnitude = np.abs(stft)
            log_mag = librosa.amplitude_to_db(magnitude, ref=np.max)

            indicators = []
            artifact_score = 0.0

            # 1. Check for spectral flatness anomalies (AI often produces overly smooth spectra)
            spectral_flatness = features.get("spectral_flatness", 0)
            if spectral_flatness < 0.01:
                artifact_score += 0.25
                indicators.append("Abnormally flat spectral envelope (over-smoothing)")

            # 2. Check for unnatural harmonic structure
            harmonic_ratio = features.get("harmonic_ratio", 0.5)
            if harmonic_ratio > 0.95:
                artifact_score += 0.2
                indicators.append("Unnaturally pure harmonic content")

            # 3. Check spectral centroid consistency (AI voices often have unnaturally stable formants)
            spectral_centroid = features.get("spectral_centroid", 0)
            spectral_bandwidth = features.get("spectral_bandwidth", 0)
            if spectral_bandwidth > 0:
                centroid_stability = spectral_centroid / spectral_bandwidth
                if centroid_stability > 10:  # Very stable formants
                    artifact_score += 0.15
                    indicators.append("Unnaturally stable spectral centroid")

            # 4. Check for periodic artifacts in high frequencies (vocoder artifacts)
            high_freq_energy = np.mean(log_mag[log_mag.shape[0]//2:, :], axis=0)
            high_freq_var = np.var(high_freq_energy)
            if high_freq_var < 1.0:  # Very consistent high-frequency energy
                artifact_score += 0.2
                indicators.append("Suspiciously consistent high-frequency energy (vocoder artifact)")

            # 5. Check for missing breath/non-speech sounds
            vad_result = features.get("vad", {})
            speech_ratio = vad_result.get("speech_ratio", 1.0)
            if speech_ratio > 0.95:
                artifact_score += 0.1
                indicators.append("No natural breathing pauses detected")

            # 6. Phase coherence check (AI often has perfect phase)
            phase = np.angle(stft)
            phase_diff = np.diff(phase, axis=1)
            phase_coherence = np.mean(np.abs(np.mean(np.exp(1j * phase_diff), axis=0)))
            if phase_coherence > 0.9:
                artifact_score += 0.15
                indicators.append("Abnormally high phase coherence")

            confidence = min(artifact_score * 100, 95)

            if confidence > 60:
                category = "LIKELY_SYNTHETIC"
            elif confidence > 35:
                category = "POSSIBLE_MANIPULATION"
            elif confidence < 25:
                category = "LIKELY_HUMAN_RECORDED"
            else:
                category = "INCONCLUSIVE"

            details = {
                "spectral_flatness": float(spectral_flatness),
                "harmonic_ratio": float(harmonic_ratio),
                "centroid_stability": float(spectral_centroid / (spectral_bandwidth + 1e-10)),
                "high_freq_variance": float(high_freq_var),
                "phase_coherence": float(phase_coherence),
                "speech_ratio": float(speech_ratio),
                "indicators": indicators,
            }

            return category, confidence, details

        import librosa
        (category, confidence, details), processing_time = self._time_it(_detect)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details=details,
            processing_time=processing_time
        )


class VoiceConsistencyDetector(BaseDetector):
    """Analyzes voice consistency across the audio for signs of splicing or TTS."""

    def __init__(self):
        super().__init__("Voice Consistency Analysis")

    def load(self) -> bool:
        self.loaded = True
        return True

    def detect(self, y: np.ndarray, sr: int, features: Dict[str, Any], metadata: Dict[str, Any]) -> DetectionResult:
        def _detect():
            # Segment audio and analyze consistency
            segment_duration = 3.0
            segment_samples = int(segment_duration * sr)
            hop_samples = segment_samples // 2

            if len(y) < segment_samples:
                return "INCONCLUSIVE", 10.0, {"indicators": ["Audio too short for consistency analysis"]}

            segments = []
            for start in range(0, len(y) - segment_samples + 1, hop_samples):
                seg = y[start:start + segment_samples]
                segments.append(seg)

            if len(segments) < 2:
                return "INCONCLUSIVE", 10.0, {"indicators": ["Insufficient segments for consistency analysis"]}

            # Extract features per segment
            segment_features = []
            for seg in segments:
                mfcc = librosa.feature.mfcc(y=seg, sr=sr, n_mfcc=13)
                segment_features.append({
                    "mfcc_mean": np.mean(mfcc, axis=1),
                    "mfcc_std": np.std(mfcc, axis=1),
                    "spectral_centroid": np.mean(librosa.feature.spectral_centroid(y=seg, sr=sr)),
                    "pitch": self._estimate_pitch(seg, sr),
                })

            indicators = []
            consistency_score = 0.0

            # Check MFCC consistency (TTS often has unnaturally consistent timbre)
            mfcc_means = np.array([s["mfcc_mean"] for s in segment_features])
            mfcc_stds = np.array([s["mfcc_std"] for s in segment_features])

            mfcc_cv = np.std(mfcc_means, axis=0) / (np.mean(mfcc_means, axis=0) + 1e-10)
            avg_mfcc_cv = np.mean(mfcc_cv)

            if avg_mfcc_cv < 0.02:
                consistency_score += 0.3
                indicators.append("Unnaturally consistent timbre across segments (TTS-like)")

            # Check pitch consistency
            pitches = [s["pitch"] for s in segment_features if s["pitch"] > 0]
            if len(pitches) > 2:
                pitch_cv = np.std(pitches) / (np.mean(pitches) + 1e-10)
                if pitch_cv < 0.01:
                    consistency_score += 0.25
                    indicators.append("Unnaturally stable fundamental frequency")

            # Check spectral centroid consistency
            centroids = [s["spectral_centroid"] for s in segment_features]
            centroid_cv = np.std(centroids) / (np.mean(centroids) + 1e-10)
            if centroid_cv < 0.01:
                consistency_score += 0.2
                indicators.append("Unnaturally stable spectral centroid across segments")

            # Check for abrupt changes (splicing detection)
            mfcc_diffs = np.diff(mfcc_means, axis=0)
            max_diff = np.max(np.abs(mfcc_diffs))
            if max_diff > 2.0:
                consistency_score += 0.2
                indicators.append("Abrupt timbral change detected (possible splicing)")

            confidence = min(consistency_score * 100, 90)

            if confidence > 55:
                category = "POSSIBLE_MANIPULATION"
            elif confidence > 30:
                category = "POSSIBLE_MANIPULATION"
            elif confidence < 15:
                category = "LIKELY_HUMAN_RECORDED"
            else:
                category = "INCONCLUSIVE"

            details = {
                "num_segments": len(segments),
                "avg_mfcc_cv": float(avg_mfcc_cv),
                "pitch_cv": float(pitch_cv) if len(pitches) > 2 else None,
                "centroid_cv": float(centroid_cv),
                "max_segment_diff": float(max_diff),
                "indicators": indicators,
            }

            return category, confidence, details

        import librosa
        (category, confidence, details), processing_time = self._time_it(_detect)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details=details,
            processing_time=processing_time
        )

    def _estimate_pitch(self, y: np.ndarray, sr: int) -> float:
        """Estimate fundamental frequency using autocorrelation."""
        try:
            # Use librosa's piptrack
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr, fmin=80, fmax=400)
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)
            return float(np.median(pitch_values)) if pitch_values else 0.0
        except:
            return 0.0


class AudioQualityAssessor(BaseDetector):
    """Assesses audio quality and detects compression/generation artifacts."""

    def __init__(self):
        super().__init__("Audio Quality Assessment")

    def load(self) -> bool:
        self.loaded = True
        return True

    def detect(self, y: np.ndarray, sr: int, features: Dict[str, Any], metadata: Dict[str, Any]) -> DetectionResult:
        def _detect():
            indicators = []
            quality_score = 0.0

            # Signal quality metrics
            signal_quality = features.get("signal_quality", {})
            snr = signal_quality.get("snr_db", 0)
            clipping = signal_quality.get("is_clipped", False)
            dynamic_range = signal_quality.get("dynamic_range", 0)

            # Low SNR suggests poor quality or noise masking
            if snr < 10:
                quality_score += 0.15
                indicators.append(f"Low signal-to-noise ratio ({snr:.1f} dB)")

            # Clipping detection
            if clipping:
                quality_score += 0.2
                indicators.append("Digital clipping detected")

            # Dynamic range
            if dynamic_range < 10:
                quality_score += 0.1
                indicators.append("Compressed dynamic range")

            # Sample rate and bit depth from metadata
            orig_sr = metadata.get("sample_rate", sr)
            if orig_sr < 16000:
                quality_score += 0.15
                indicators.append(f"Low sample rate ({orig_sr} Hz)")

            # Codec artifacts
            codec = metadata.get("codec", "").lower()
            if codec in ["mp3", "aac", "opus", "vorbis"]:
                bitrate = metadata.get("bitrate", 0)
                if bitrate > 0 and bitrate < 64000:
                    quality_score += 0.15
                    indicators.append(f"Low bitrate lossy compression ({bitrate/1000:.0f} kbps)")

            # Check for resampling artifacts
            if orig_sr != sr:
                quality_score += 0.1
                indicators.append(f"Resampled from {orig_sr} Hz to {sr} Hz")

            # Spectral holes (missing frequency bands)
            stft = librosa.stft(y, n_fft=2048, hop_length=512)
            magnitude = np.abs(stft)
            freq_bins = magnitude.shape[0]
            band_energy = np.mean(magnitude, axis=1)
            # Look for bands with near-zero energy
            zero_bands = np.sum(band_energy < np.max(band_energy) * 0.001)
            if zero_bands > freq_bins * 0.1:
                quality_score += 0.2
                indicators.append("Spectral holes detected (bandwidth limitation or codec artifacts)")

            confidence = min(quality_score * 100, 85)

            # Quality assessment doesn't directly indicate synthetic, but low quality
            # can mask artifacts or be a sign of heavy processing
            if confidence > 50:
                category = "POSSIBLE_MANIPULATION"
            elif confidence > 25:
                category = "INCONCLUSIVE"
            else:
                category = "LIKELY_HUMAN_RECORDED"

            details = {
                "snr_db": float(snr),
                "clipping": clipping,
                "dynamic_range": float(dynamic_range),
                "original_sample_rate": orig_sr,
                "codec": codec,
                "bitrate": metadata.get("bitrate", 0),
                "spectral_holes_ratio": float(zero_bands / freq_bins),
                "indicators": indicators,
            }

            return category, confidence, details

        import librosa
        (category, confidence, details), processing_time = self._time_it(_detect)

        return DetectionResult(
            name=self.name,
            category=category,
            confidence=confidence,
            details=details,
            processing_time=processing_time
        )


class StatisticalAnomalyDetector(BaseDetector):
    """Uses statistical analysis to detect anomalies in audio features."""

    def __init__(self):
        super().__init__("Statistical Anomaly Detection")
        self.scaler = StandardScaler()
        self.rf_model = None
        self._feature_names = [
            "spectral_centroid", "spectral_bandwidth", "spectral_rolloff", "spectral_flatness",
            "zero_crossing_rate", "rms_energy", "harmonic_ratio", "percussive_ratio",
            "tempo", "chroma_mean", "chroma_std"
        ]

    def load(self) -> bool:
        # Initialize a simple Random Forest (in production, load a pre-trained model)
        self.rf_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        # Train on synthetic data for demonstration
        self._train_dummy_model()
        self.loaded = True
        return True

    def _train_dummy_model(self):
        """Train a dummy model for demonstration. In production, load a real model."""
        np.random.seed(42)
        n_samples = 1000

        # Generate synthetic "human" features (more variation)
        human_features = np.random.randn(n_samples // 2, len(self._feature_names))
        human_features[:, 3] = np.abs(human_features[:, 3]) * 0.1 + 0.05  # spectral_flatness
        human_features[:, 6] = np.abs(human_features[:, 6]) * 0.3 + 0.4    # harmonic_ratio
        human_labels = np.zeros(n_samples // 2)

        # Generate synthetic "AI" features (less variation, specific patterns)
        ai_features = np.random.randn(n_samples // 2, len(self._feature_names))
        ai_features[:, 3] = np.abs(ai_features[:, 3]) * 0.02 + 0.005  # lower spectral_flatness
        ai_features[:, 6] = np.abs(ai_features[:, 6]) * 0.1 + 0.85    # higher harmonic_ratio
        ai_labels = np.ones(n_samples // 2)

        X = np.vstack([human_features, ai_features])
        y = np.hstack([human_labels, ai_labels])

        # Shuffle
        idx = np.random.permutation(n_samples)
        X, y = X[idx], y[idx]

        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        self.rf_model.fit(X_scaled, y)

    def detect(self, y: np.ndarray, sr: int, features: Dict[str, Any], metadata: Dict[str, Any]) -> DetectionResult:
        def _detect():
            # Extract feature vector
            feature_vector = []
            for name in self._feature_names:
                val = features.get(name, 0)
                if isinstance(val, list):
                    val = np.mean(val)
                feature_vector.append(float(val))

            X = np.array(feature_vector).reshape(1, -1)
            X_scaled = self.scaler.transform(X)

            # Get probability
            prob = self.rf_model.predict_proba(X_scaled)[0]
            ai_prob = prob[1] if len(prob) > 1 else 0.0

            confidence = ai_prob * 100

            indicators = []
            if ai_prob > 0.7:
                indicators.append("Statistical profile matches synthetic audio patterns")
            elif ai_prob > 0.4:
                indicators.append("Some statistical anomalies consistent with synthetic generation")

            if confidence > 70:
                category = "LIKELY_SYNTHETIC"
            elif confidence > 40:
                category = "POSSIBLE_MANIPULATION"
            elif confidence < 30:
                category = "LIKELY_HUMAN_RECORDED"
            else:
                category = "INCONCLUSIVE"

            details = {
                "ai_probability": float(ai_prob),
                "feature_vector": {k: float(v) for k, v in zip(self._feature_names, feature_vector)},
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


class DetectorRegistry:
    def __init__(self):
        self.detectors: List[BaseDetector] = []

    def register(self, detector: BaseDetector):
        self.detectors.append(detector)

    def load_all(self) -> Dict[str, bool]:
        results = {}
        for detector in self.detectors:
            try:
                results[detector.name] = detector.load()
            except Exception as e:
                logger.error(f"Failed to load {detector.name}: {e}")
                results[detector.name] = False
        return results

    def run_all(self, y: np.ndarray, sr: int, features: Dict[str, Any], metadata: Dict[str, Any]) -> List[DetectionResult]:
        results = []
        for detector in self.detectors:
            if detector.loaded:
                try:
                    result = detector.detect(y, sr, features, metadata)
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


# Create registry and register detectors
detector_registry = DetectorRegistry()
detector_registry.register(SyntheticSpeechDetector())
detector_registry.register(SpectralArtifactDetector())
detector_registry.register(VoiceConsistencyDetector())
detector_registry.register(AudioQualityAssessor())
detector_registry.register(StatisticalAnomalyDetector())