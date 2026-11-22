import logging
from typing import List, Dict, Any, Optional, Generator
from dataclasses import dataclass
import numpy as np
import cv2

from app.config import settings
from app.services.video_processor import video_processor

logger = logging.getLogger(__name__)


@dataclass
class SamplingConfig:
    max_frames: int = settings.MAX_FRAMES_TO_ANALYZE
    sample_rate: int = settings.FRAME_SAMPLE_RATE
    min_frames: int = settings.MIN_FRAMES_FOR_ANALYSIS
    strategy: str = "uniform"  # uniform, adaptive, keyframe, hybrid


class FrameSampler:
    def __init__(self, config: Optional[SamplingConfig] = None):
        self.config = config or SamplingConfig()
        self.logger = logging.getLogger(__name__)

    def sample_frames(self, video_path: str) -> List[Dict[str, Any]]:
        indices = self._get_frame_indices(video_path)
        frames = []

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Could not open video file")

        fps = cap.get(cv2.CAP_PROP_FPS)

        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            timestamp = idx / fps if fps > 0 else 0
            frames.append({
                "frame_index": idx,
                "timestamp": timestamp,
                "frame": frame_rgb,
                "width": frame.shape[1],
                "height": frame.shape[0]
            })

        cap.release()
        return frames

    def sample_frame_generator(self, video_path: str) -> Generator[Dict[str, Any], None, None]:
        indices = self._get_frame_indices(video_path)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("Could not open video file")

        fps = cap.get(cv2.CAP_PROP_FPS)

        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            timestamp = idx / fps if fps > 0 else 0
            yield {
                "frame_index": idx,
                "timestamp": timestamp,
                "frame": frame_rgb,
                "width": frame.shape[1],
                "height": frame.shape[0]
            }

        cap.release()

    def _get_frame_indices(self, video_path: str) -> List[int]:
        metadata = video_processor.extract_metadata(video_path)
        total_frames = metadata.total_frames

        if self.config.strategy == "uniform":
            return self._uniform_sampling(total_frames)
        elif self.config.strategy == "adaptive":
            return self._adaptive_sampling(video_path, total_frames)
        elif self.config.strategy == "keyframe":
            return self._keyframe_sampling(video_path, total_frames)
        elif self.config.strategy == "hybrid":
            return self._hybrid_sampling(video_path, total_frames)
        else:
            return self._uniform_sampling(total_frames)

    def _uniform_sampling(self, total_frames: int) -> List[int]:
        if total_frames <= self.config.max_frames * self.config.sample_rate:
            return list(range(0, total_frames, self.config.sample_rate))

        step = total_frames // self.config.max_frames
        indices = [i * step for i in range(self.config.max_frames)]
        return [min(idx, total_frames - 1) for idx in indices]

    def _adaptive_sampling(self, video_path: str, total_frames: int) -> List[int]:
        if total_frames <= self.config.max_frames:
            return list(range(total_frames))

        scene_changes = self._detect_scene_changes(video_path, sample_every=30)

        if len(scene_changes) <= self.config.max_frames:
            return scene_changes[:self.config.max_frames]

        uniform_indices = self._uniform_sampling(total_frames)
        combined = list(set(scene_changes + uniform_indices))
        combined.sort()
        return combined[:self.config.max_frames]

    def _keyframe_sampling(self, video_path: str, total_frames: int) -> List[int]:
        if total_frames <= self.config.max_frames:
            return list(range(total_frames))

        cap = cv2.VideoCapture(video_path)
        keyframes = []

        for i in range(total_frames):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if not ret:
                continue

            if self._is_keyframe(frame):
                keyframes.append(i)
                if len(keyframes) >= self.config.max_frames:
                    break

        cap.release()

        if len(keyframes) < self.config.min_frames:
            return self._uniform_sampling(total_frames)

        return keyframes[:self.config.max_frames]

    def _hybrid_sampling(self, video_path: str, total_frames: int) -> List[int]:
        uniform = self._uniform_sampling(total_frames)
        scene_changes = self._detect_scene_changes(video_path, sample_every=15)

        combined = list(set(uniform + scene_changes))
        combined.sort()

        if len(combined) > self.config.max_frames:
            step = len(combined) / self.config.max_frames
            indices = [int(i * step) for i in range(self.config.max_frames)]
            return [combined[i] for i in indices]

        return combined

    def _detect_scene_changes(self, video_path: str, sample_every: int = 30, threshold: float = 0.3) -> List[int]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        scene_changes = [0]
        prev_hist = None

        for i in range(0, total_frames, sample_every):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if not ret:
                continue

            hist = cv2.calcHist([frame], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
            cv2.normalize(hist, hist)

            if prev_hist is not None:
                correlation = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                if correlation < (1 - threshold):
                    scene_changes.append(i)

            prev_hist = hist

        cap.release()
        return scene_changes

    def _is_keyframe(self, frame: np.ndarray) -> bool:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        return edge_density > 0.1


frame_sampler = FrameSampler()