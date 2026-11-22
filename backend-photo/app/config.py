from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "AI Photo Authenticity Analysis API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8002

    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    SUPPORTED_FORMATS: List[str] = [
        "image/jpeg", "image/jpg", "image/png", "image/webp",
        "image/bmp", "image/tiff", "image/tif"
    ]
    SUPPORTED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"]

    UPLOAD_DIR: str = "./uploads"
    RESULTS_DIR: str = "./results"
    MODEL_CACHE_DIR: str = "./models"

    SYNTHETIC_DETECTION_THRESHOLD: float = 0.5
    CONFIDENCE_CALIBRATION_ENABLED: bool = True

    LOG_LEVEL: str = "INFO"

    USE_GPU: bool = False  # Default to CPU for stability

    # Supabase Cloud Storage Configuration
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_BUCKET_PHOTO: str = "photo-analyses"
    LOCAL_TEMP_DIR: str = "./temp"
    MAX_LOCAL_TEMP_AGE_HOURS: int = 24

    # Cloud Storage Options
    ENABLE_CLOUD_STORAGE: bool = False  # Set to True when Supabase is configured
    UPLOAD_ORIGINALS_TO_CLOUD: bool = True
    UPLOAD_REPORTS_TO_CLOUD: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

for dir_path in [settings.UPLOAD_DIR, settings.RESULTS_DIR, settings.MODEL_CACHE_DIR]:
    os.makedirs(dir_path, exist_ok=True)

# Create local temp directory
os.makedirs(settings.LOCAL_TEMP_DIR, exist_ok=True)

# Check if cloud storage is configured
settings.ENABLE_CLOUD_STORAGE = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY)