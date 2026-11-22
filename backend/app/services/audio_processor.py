import os
import hashlib
import logging
import tempfile
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import librosa
import soundfile as sf
import ffmpeg

logger = logging.getLogger(__name__)


class AudioProcessor:
    SUPPORTED_FORMATS = {
        '.wav', '.wave', '.mp3', '.m4a', '.mp4',
        '.flac', '.ogg', '.opus', '.webm'
    }
    MAX_DURATION = 300  # seconds
    TARGET_SAMPLE_RATE = 16000

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def validate_audio(self, file_path: str) -> Tuple[bool, Optional[str]]:
        try:
            info = sf.info(file_path)
            if info.frames == 0:
                return False, "Empty audio file"

            duration = info.frames / info.samplerate
            if duration > self.MAX_DURATION:
                return False, f"Audio duration exceeds maximum ({self.MAX_DURATION}s)"

            ext = os.path.splitext(file_path)[1].lower()
            if ext not in self.SUPPORTED_FORMATS:
                return False, f"Unsupported format: {ext}"

            return True, None
        except Exception as e:
            return False, f"Invalid audio file: {str(e)}"

    def load_audio(self, file_path: str, target_sr: int = None) -> Tuple[np.ndarray, int]:
        target_sr = target_sr or self.TARGET_SAMPLE_RATE
        try:
            y, sr = librosa.load(file_path, sr=target_sr, mono=True)
            return y, sr
        except Exception as e:
            self.logger.warning(f"Librosa failed, trying ffmpeg: {e}")
            return self._load_with_ffmpeg(file_path, target_sr)

    def _load_with_ffmpeg(self, file_path: str, target_sr: int) -> Tuple[np.ndarray, int]:
        try:
            out, _ = (
                ffmpeg.input(file_path)
                .output('-', format='f32le', acodec='pcm_f32le', ac=1, ar=target_sr)
                .run(capture_stdout=True, capture_stderr=True)
            )
            y = np.frombuffer(out, dtype=np.float32)
            return y, target_sr
        except Exception as e:
            raise ValueError(f"Failed to decode audio: {str(e)}")

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        metadata = {
            "duration": 0.0,
            "sample_rate": 0,
            "channels": 0,
            "format": "",
            "bitrate": 0,
            "codec": "",
            "has_tags": False,
            "tags": {},
        }

        try:
            info = sf.info(file_path)
            metadata["duration"] = info.frames / info.samplerate
            metadata["sample_rate"] = info.samplerate
            metadata["channels"] = info.channels
            metadata["format"] = info.format
            metadata["subtype"] = info.subtype

            # Try to get more metadata with ffprobe
            probe = ffmpeg.probe(file_path)
            if 'format' in probe:
                fmt = probe['format']
                metadata["bitrate"] = int(fmt.get('bit_rate', 0))
                metadata["tags"] = fmt.get('tags', {})
                metadata["has_tags"] = bool(metadata["tags"])

            if 'streams' in probe:
                for stream in probe['streams']:
                    if stream.get('codec_type') == 'audio':
                        metadata["codec"] = stream.get('codec_name', '')
                        break

        except Exception as e:
            self.logger.warning(f"Metadata extraction failed: {e}")

        return metadata

    def compute_hash(self, file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hasher.update(chunk)
        return hasher.hexdigest()[:16]

    def get_file_info(self, file_path: str, original_filename: str) -> Dict[str, Any]:
        stat = os.stat(file_path)
        info = sf.info(file_path)
        return {
            "filename": original_filename,
            "format": info.format,
            "duration": info.frames / info.samplerate,
            "sample_rate": info.samplerate,
            "channels": info.channels,
            "size": stat.st_size,
        }

    def extract_features(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        features = {}

        # Basic properties
        features["duration"] = len(y) / sr
        features["rms_energy"] = float(np.sqrt(np.mean(y**2)))
        features["zero_crossing_rate"] = float(np.mean(librosa.feature.zero_crossing_rate(y)))

        # Spectral features
        stft = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))
        features["spectral_centroid"] = float(np.mean(librosa.feature.spectral_centroid(S=stft, sr=sr)))
        features["spectral_bandwidth"] = float(np.mean(librosa.feature.spectral_bandwidth(S=stft, sr=sr)))
        features["spectral_rolloff"] = float(np.mean(librosa.feature.spectral_rolloff(S=stft, sr=sr)))
        features["spectral_flatness"] = float(np.mean(librosa.feature.spectral_flatness(S=stft)))

        # MFCCs
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        features["mfcc_mean"] = np.mean(mfccs, axis=1).tolist()
        features["mfcc_std"] = np.std(mfccs, axis=1).tolist()

        # Chroma
        chroma = librosa.feature.chroma_stft(S=stft, sr=sr)
        features["chroma_mean"] = float(np.mean(chroma))
        features["chroma_std"] = float(np.std(chroma))

        # Tonnetz
        try:
            tonnetz = librosa.feature.tonnetz(y=librosa.effects.harmonic(y), sr=sr)
            features["tonnetz_mean"] = np.mean(tonnetz, axis=1).tolist()
        except:
            features["tonnetz_mean"] = [0.0] * 6

        # Spectral contrast
        contrast = librosa.feature.spectral_contrast(S=stft, sr=sr)
        features["spectral_contrast_mean"] = np.mean(contrast, axis=1).tolist()

        # Rhythm features
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        features["tempo"] = float(tempo)
        features["beat_count"] = len(beats)

        # Harmonic/Percussive separation
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        features["harmonic_ratio"] = float(np.sum(y_harmonic**2) / (np.sum(y**2) + 1e-10))
        features["percussive_ratio"] = float(np.sum(y_percussive**2) / (np.sum(y**2) + 1e-10))

        return features

    def generate_spectrogram(self, y: np.ndarray, sr: int, n_fft: int = 2048, hop_length: int = 512) -> np.ndarray:
        stft = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
        magnitude = np.abs(stft)
        log_magnitude = librosa.amplitude_to_db(magnitude, ref=np.max)
        return log_magnitude

    def generate_mel_spectrogram(self, y: np.ndarray, sr: int, n_mels: int = 128) -> np.ndarray:
        mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels)
        log_mel = librosa.power_to_db(mel_spec, ref=np.max)
        return log_mel

    def detect_voice_activity(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        # Energy-based VAD (no external dependencies)
        frame_duration = 0.03  # 30ms
        frame_size = int(sr * frame_duration)
        hop_size = frame_size // 2

        if len(y) < frame_size:
            return {
                "speech_ratio": 1.0 if len(y) > 0 else 0.0,
                "total_frames": 1,
                "speech_frames": 1 if len(y) > 0 else 0,
                "has_speech": len(y) > 0,
            }

        speech_frames = 0
        total_frames = 0

        # Calculate frame energies
        energies = []
        for i in range(0, len(y) - frame_size + 1, hop_size):
            frame = y[i:i + frame_size]
            energy = np.sum(frame ** 2)
            energies.append(energy)
            total_frames += 1

        if not energies:
            return {
                "speech_ratio": 0.0,
                "total_frames": 0,
                "speech_frames": 0,
                "has_speech": False,
            }

        # Adaptive threshold: median energy * 0.1
        energies = np.array(energies)
        threshold = np.median(energies) * 0.1
        speech_frames = np.sum(energies > threshold)

        speech_ratio = speech_frames / total_frames if total_frames > 0 else 0

        return {
            "speech_ratio": float(speech_ratio),
            "total_frames": int(total_frames),
            "speech_frames": int(speech_frames),
            "has_speech": bool(speech_ratio > 0.1),
        }

    def analyze_signal_quality(self, y: np.ndarray, sr: int) -> Dict[str, Any]:
        # Signal-to-noise ratio estimation
        signal_power = np.mean(y**2)
        noise_floor = np.percentile(y**2, 10)
        snr = 10 * np.log10(signal_power / (noise_floor + 1e-10))

        # Dynamic range
        dynamic_range = np.max(np.abs(y)) / (np.mean(np.abs(y)) + 1e-10)

        # Clipping detection
        clipping_threshold = 0.99
        clipped_samples = np.sum(np.abs(y) > clipping_threshold)
        clipping_ratio = clipped_samples / len(y)

        return {
            "snr_db": float(snr),
            "dynamic_range": float(dynamic_range),
            "clipping_ratio": float(clipping_ratio),
            "is_clipped": bool(clipping_ratio > 0.01),
        }

    def segment_audio(self, y: np.ndarray, sr: int, segment_duration: float = 5.0) -> List[Tuple[np.ndarray, float, float]]:
        """Split audio into overlapping segments for analysis."""
        segment_samples = int(segment_duration * sr)
        hop_samples = segment_samples // 2  # 50% overlap

        segments = []
        for start in range(0, len(y) - segment_samples + 1, hop_samples):
            end = start + segment_samples
            segment = y[start:end]
            start_time = start / sr
            end_time = end / sr
            segments.append((segment, start_time, end_time))

        # Handle remaining tail
        if len(y) % hop_samples > segment_samples // 4:
            start = len(y) - segment_samples
            if start >= 0:
                segment = y[start:]
                segments.append((segment, start / sr, len(y) / sr))

        return segments


audio_processor = AudioProcessor()