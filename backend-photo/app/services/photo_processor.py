import os
import hashlib
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image
import cv2

logger = logging.getLogger(__name__)


class PhotoProcessor:
    SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'}
    MAX_DIMENSION = 4096

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def validate_image(self, file_path: str) -> Tuple[bool, Optional[str]]:
        try:
            with Image.open(file_path) as img:
                img.verify()
            with Image.open(file_path) as img:
                if img.width > self.MAX_DIMENSION or img.height > self.MAX_DIMENSION:
                    return False, f"Image dimensions exceed maximum ({self.MAX_DIMENSION}px)"
                if img.width == 0 or img.height == 0:
                    return False, "Empty image"
            return True, None
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"

    def load_image(self, file_path: str) -> np.ndarray:
        image = cv2.imread(file_path)
        if image is None:
            raise ValueError("Failed to load image")
        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return image

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        metadata = {
            "width": 0,
            "height": 0,
            "format": "",
            "mode": "",
            "has_exif": False,
            "exif_data": {},
        }

        try:
            with Image.open(file_path) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height
                metadata["format"] = img.format or ""
                metadata["mode"] = img.mode

                exif = img.getexif()
                if exif:
                    metadata["has_exif"] = True
                    for tag_id, value in exif.items():
                        tag_name = Image.ExifTags.TAGS.get(tag_id, tag_id)
                        metadata["exif_data"][tag_name] = str(value)

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
        with Image.open(file_path) as img:
            return {
                "filename": original_filename,
                "width": img.width,
                "height": img.height,
                "format": img.format or "UNKNOWN",
                "mode": img.mode,
                "size": stat.st_size,
            }


photo_processor = PhotoProcessor()