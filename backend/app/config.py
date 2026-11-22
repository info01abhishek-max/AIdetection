from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "AI Audio Authenticity Analysis API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    MAX_DURATION: int = 300  # 5 minutes
    SUPPORTED_FORMATS: List[str] = [
        "audio/wav", "audio/wave", "audio/x-wav",
        "audio/mpeg", "audio/mp3",
        "audio/mp4", "audio/m4a",
        "audio/flac", "audio/x-flac",
        "audio/ogg", "audio/vorbis", "audio/opus",
        "audio/webm"
    ]

    UPLOAD_DIR: str = "./uploads"
    RESULTS_DIR: str = "./results"
    MODEL_CACHE_DIR: str = "./models"

    SAMPLE_RATE: int = 16000
    N_FFT: int = 2048
    HOP_LENGTH: int = 512
    N_MELS: int = 128

    SYNTHETIC_DETECTION_THRESHOLD: float = 0.5
    CONFIDENCE_CALIBRATION_ENABLED: bool = True

    LOG_LEVEL: str = "INFO"

    # Supabase Cloud Storage Configuration
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_BUCKET_AUDIO: str = "audio-analyses"
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

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.RESULTS_DIR, exist_ok=True)
os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)

# Create local temp directory
os.makedirs(settings.LOCAL_TEMP_DIR, exist_ok=True)

# Check if cloud storage is configured
settings.ENABLE_CLOUD_STORAGE = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY)