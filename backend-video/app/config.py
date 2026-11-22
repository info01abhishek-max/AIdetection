from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "AI Video Authenticity Analysis API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8001

    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    MAX_DURATION: int = 300  # 5 minutes
    SUPPORTED_FORMATS: List[str] = ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm"]
    SUPPORTED_EXTENSIONS: List[str] = [".mp4", ".mov", ".mkv", ".webm"]

    MAX_FRAMES_TO_ANALYZE: int = 50
    FRAME_SAMPLE_RATE: int = 1  # analyze every Nth frame
    MIN_FRAMES_FOR_ANALYSIS: int = 5

    UPLOAD_DIR: str = "./uploads"
    RESULTS_DIR: str = "./results"
    TEMP_DIR: str = "./temp"
    MODEL_CACHE_DIR: str = "./models"

    SYNTHETIC_DETECTION_THRESHOLD: float = 0.5
    TEMPORAL_CONSISTENCY_THRESHOLD: float = 0.3
    CONFIDENCE_CALIBRATION_ENABLED: bool = True

    LOG_LEVEL: str = "INFO"

    USE_GPU: bool = True

    # Supabase Cloud Storage Configuration
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_BUCKET_VIDEO: str = "video-analyses"
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

for dir_path in [settings.UPLOAD_DIR, settings.RESULTS_DIR, settings.TEMP_DIR, settings.MODEL_CACHE_DIR]:
    os.makedirs(dir_path, exist_ok=True)

# Create local temp directory
os.makedirs(settings.LOCAL_TEMP_DIR, exist_ok=True)

# Check if cloud storage is configured
settings.ENABLE_CLOUD_STORAGE = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY)