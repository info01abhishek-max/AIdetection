import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # API Settings
    API_TITLE: str = "AI Text Detection API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "AI-generated text detection and linguistic analysis system"

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8003
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]

    # File Upload Settings
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    MAX_TEXT_LENGTH: int = 50000  # 50k characters
    MIN_TEXT_LENGTH: int = 50  # Minimum for analysis
    SUPPORTED_MIME_TYPES: List[str] = [
        "text/plain",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    SUPPORTED_EXTENSIONS: List[str] = [".txt", ".pdf", ".docx"]

    # NLP Model Settings
    MODEL_CACHE_DIR: str = str(Path(__file__).parent.parent / "models")
    AI_DETECTOR_MODEL: str = "roberta-base-openai-detector"  # Or similar
    PERPLEXITY_MODEL: str = "gpt2"
    ENABLE_CUDA: bool = False

    # Analysis Settings
    DEFAULT_CHUNK_SIZE: int = 512
    MAX_CHUNKS: int = 10
    PERPLEXITY_WINDOW: int = 100

    # Processing Limits
    MAX_PROCESSING_TIME: int = 60  # seconds
    CLEANUP_INTERVAL: int = 300  # seconds

    # Privacy
    RETAIN_FILES: bool = False
    RETAIN_RESULTS: bool = False

    # Supabase Cloud Storage Configuration
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_BUCKET_TEXT: str = "text-analyses"
    LOCAL_TEMP_DIR: str = "./temp"
    MAX_LOCAL_TEMP_AGE_HOURS: int = 24

    # Cloud Storage Options
    ENABLE_CLOUD_STORAGE: bool = False  # Set to True when Supabase is configured
    UPLOAD_ORIGINALS_TO_CLOUD: bool = True
    UPLOAD_REPORTS_TO_CLOUD: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Create model cache directory
Path(settings.MODEL_CACHE_DIR).mkdir(parents=True, exist_ok=True)

# Create local temp directory
os.makedirs(settings.LOCAL_TEMP_DIR, exist_ok=True)

# Check if cloud storage is configured
settings.ENABLE_CLOUD_STORAGE = bool(settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY)