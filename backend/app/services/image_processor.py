import os
import hashlib
import logging
from typing import Dict, Any, Tuple, Optional
from PIL import Image, ExifTags
import numpy as np
import piexif

logger = logging.getLogger(__name__)


class ImageProcessor:
    SUPPORTED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}
    MAX_DIMENSION = 8192

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def validate_image(self, file_path: str) -> Tuple[bool, Optional[str]]:
        try:
            with Image.open(file_path) as img:
                img.verify()

            with Image.open(file_path) as img:
                if img.format not in self.SUPPORTED_FORMATS:
                    return False, f"Unsupported format: {img.format}"

                width, height = img.size
                if width > self.MAX_DIMENSION or height > self.MAX_DIMENSION:
                    return False, f"Image dimensions exceed maximum ({self.MAX_DIMENSION}px)"

                if width == 0 or height == 0:
                    return False, "Invalid image dimensions"

            return True, None
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"

    def load_image(self, file_path: str) -> np.ndarray:
        with Image.open(file_path) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            return np.array(img)

    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        metadata = {
            "has_exif": False,
            "software": "",
            "make": "",
            "model": "",
            "datetime_original": "",
            "gps_info": False,
            "width": 0,
            "height": 0,
            "format": "",
            "mode": "",
        }

        try:
            with Image.open(file_path) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height
                metadata["format"] = img.format
                metadata["mode"] = img.mode

                exif_data = img.getexif()
                if exif_data:
                    metadata["has_exif"] = True

                    for tag_id, value in exif_data.items():
                        tag = ExifTags.TAGS.get(tag_id, tag_id)

                        if tag == "Software":
                            metadata["software"] = str(value)
                        elif tag == "Make":
                            metadata["make"] = str(value)
                        elif tag == "Model":
                            metadata["model"] = str(value)
                        elif tag == "DateTimeOriginal":
                            metadata["datetime_original"] = str(value)

                if "GPSInfo" in exif_data:
                    metadata["gps_info"] = True

                try:
                    exif_bytes = img.info.get("exif")
                    if exif_bytes:
                        exif_dict = piexif.load(exif_bytes)
                        if "GPS" in exif_dict and exif_dict["GPS"]:
                            metadata["gps_info"] = True
                except:
                    pass

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
                "format": img.format,
                "dimensions": {"width": img.width, "height": img.height},
                "size": stat.st_size,
                "mode": img.mode,
            }


image_processor = ImageProcessor()