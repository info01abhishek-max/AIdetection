import os
import cv2
import hashlib
import logging
import tempfile
import subprocess
import json
from typing import Dict, Any, List, Tuple, Optional, Generator
from dataclasses import dataclass
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class VideoMetadata:
    width: int
    height: int
    fps: float
    total_frames: int
    duration: float
    codec: str
    format: str
    bitrate: Optional[int] = None


class VideoProcessor:
    SUPPORTED_EXTENSIONS = settings.SUPPORTED_EXTENSIONS
    MAX_DURATION = settings.MAX_DURATION
    MAX_FILE_SIZE = settings.MAX_FILE_SIZE
    MAX_FRAMES = settings.MAX_FRAMES_TO_ANALYZE
    SAMPLE_RATE = settings.FRAME_SAMPLE_RATE
    MIN_FRAMES = settings.MIN_FRAMES_FOR_ANALYSIS

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def validate_video(self, file_path: str) -> Tuple[bool, Optional[str]]:
        if not os.path.exists(file_path):
            return False, "File does not exist"

        file_size = os.path.getsize(file_path)
        if file_size > self.MAX_FILE_SIZE:
            return False, f"File size exceeds {self.MAX_FILE_SIZE / (1024*1024)}MB limit"

        ext = os.path.splitext(file_path)[1].lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            return False, f"Unsupported format. Supported: {', '.join(self.SUPPORTED_EXTENSIONS)}"

        try:
            metadata = self.extract_metadata(file_path)
            if metadata.duration > self.MAX_DURATION:
                return False, f"Video duration exceeds {self.MAX_DURATION}s limit"
            if metadata.total_frames == 0:
                return False, "Video has no frames"
            if metadata.width == 0 or metadata.height == 0:
                return False, "Invalid video dimensions"
        except Exception as e:
            return False, f"Failed to read video: {str(e)}"

        return True, None

    def extract_metadata(self, file_path: str) -> VideoMetadata:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise ValueError("Could not open video file")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        codec_int = int(cap.get(cv2.CAP_PROP_FOURCC))
        codec = "".join([chr((codec_int >> 8 * i) & 0xFF) for i in range(4)])

        duration = total_frames / fps if fps > 0 else 0

        bitrate = None
        try:
            probe = subprocess.run(
                ["ffprobe", "-v", "quiet", "-show_entries", "format=bit_rate", "-of", "json", file_path],
                capture_output=True, text=True, timeout=30
            )
            if probe.returncode == 0:
                data = json.loads(probe.stdout)
                bitrate = int(data.get("format", {}).get("bit_rate", 0)) or None
        except Exception:
            pass

        cap.release()

        fmt = os.path.splitext(file_path)[1].lower().lstrip('.')

        return VideoMetadata(
            width=width,
            height=height,
            fps=fps,
            total_frames=total_frames,
            duration=duration,
            codec=codec if codec else "unknown",
            format=fmt,
            bitrate=bitrate
        )

    def extract_frames(self, file_path: str, output_dir: str) -> List[Dict[str, Any]]:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise ValueError("Could not open video file")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)

        frame_indices = self._calculate_frame_indices(total_frames)
        frames_data = []

        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            timestamp = idx / fps if fps > 0 else 0

            frame_filename = f"frame_{idx:06d}.jpg"
            frame_path = os.path.join(output_dir, frame_filename)
            cv2.imwrite(frame_path, frame)

            frames_data.append({
                "frame_index": idx,
                "timestamp": timestamp,
                "path": frame_path,
                "width": frame.shape[1],
                "height": frame.shape[0]
            })

        cap.release()
        return frames_data

    def _calculate_frame_indices(self, total_frames: int) -> List[int]:
        if total_frames <= self.MAX_FRAMES * self.SAMPLE_RATE:
            return list(range(0, total_frames, self.SAMPLE_RATE))

        step = total_frames // self.MAX_FRAMES
        indices = [i * step for i in range(self.MAX_FRAMES)]
        return [min(idx, total_frames - 1) for idx in indices]

    def extract_frame_generator(self, file_path: str) -> Generator[Tuple[int, float, np.ndarray], None, None]:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise ValueError("Could not open video file")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_indices = self._calculate_frame_indices(total_frames)

        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            timestamp = idx / fps if fps > 0 else 0
            yield idx, timestamp, frame_rgb

        cap.release()

    def compute_video_hash(self, file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hasher.update(chunk)
        return hasher.hexdigest()[:16]

    def get_file_info(self, file_path: str, original_filename: str) -> Dict[str, Any]:
        stat = os.stat(file_path)
        metadata = self.extract_metadata(file_path)
        return {
            "filename": original_filename,
            "format": metadata.format,
            "dimensions": {"width": metadata.width, "height": metadata.height},
            "size": stat.st_size,
            "duration": metadata.duration,
            "fps": metadata.fps,
            "total_frames": metadata.total_frames,
            "codec": metadata.codec,
            "bitrate": metadata.bitrate,
        }


video_processor = VideoProcessor()