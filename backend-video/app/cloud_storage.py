"""
Shared Supabase Cloud Storage Module
Provides unified cloud storage and database operations for all four detection backends.
"""

import os
import json
import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List, BinaryIO
from pathlib import Path

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

logger = logging.getLogger(__name__)


class SupabaseConfig:
    """Configuration for Supabase connection."""

    def __init__(
        self,
        url: str = None,
        service_key: str = None,
        anon_key: str = None,
        bucket_photo: str = "photo-analyses",
        bucket_video: str = "video-analyses",
        bucket_audio: str = "audio-analyses",
        bucket_text: str = "text-analyses",
        local_temp_dir: str = "./temp",
        max_temp_age_hours: int = 24
    ):
        self.url = url or os.getenv("SUPABASE_URL")
        self.service_key = service_key or os.getenv("SUPABASE_SERVICE_KEY")
        self.anon_key = anon_key or os.getenv("SUPABASE_ANON_KEY")
        self.bucket_photo = bucket_photo or os.getenv("SUPABASE_BUCKET_PHOTO", "photo-analyses")
        self.bucket_video = bucket_video or os.getenv("SUPABASE_BUCKET_VIDEO", "video-analyses")
        self.bucket_audio = bucket_audio or os.getenv("SUPABASE_BUCKET_AUDIO", "audio-analyses")
        self.bucket_text = bucket_text or os.getenv("SUPABASE_BUCKET_TEXT", "text-analyses")
        self.local_temp_dir = Path(local_temp_dir or os.getenv("LOCAL_TEMP_DIR", "./temp"))
        self.max_temp_age_hours = max_temp_age_hours

        # Create local temp directory
        self.local_temp_dir.mkdir(parents=True, exist_ok=True)

    def get_bucket_for_type(self, analysis_type: str) -> str:
        """Get the appropriate bucket name for an analysis type."""
        buckets = {
            "photo": self.bucket_photo,
            "video": self.bucket_video,
            "audio": self.bucket_audio,
            "text": self.bucket_text,
        }
        return buckets.get(analysis_type, self.bucket_photo)

    def is_configured(self) -> bool:
        """Check if Supabase is properly configured."""
        return bool(self.url and self.service_key)


class CloudStorageManager:
    """Manages cloud storage operations for analysis files and results."""

    def __init__(self, config: SupabaseConfig):
        self.config = config
        self.client: Optional[Client] = None
        self._initialized = False

    def initialize(self) -> bool:
        """Initialize Supabase client."""
        if not SUPABASE_AVAILABLE:
            logger.warning("supabase package not installed. Cloud storage disabled.")
            return False

        if not self.config.is_configured():
            logger.warning("Supabase not configured (missing URL or service key). Cloud storage disabled.")
            return False

        try:
            self.client = create_client(self.config.url, self.config.service_key)
            self._initialized = True
            logger.info("Supabase client initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self._initialized = False
            return False

    def is_ready(self) -> bool:
        """Check if cloud storage is ready to use."""
        return self._initialized and self.client is not None

    # ==================== STORAGE OPERATIONS ====================

    def upload_file(
        self,
        analysis_type: str,
        local_path: Path,
        destination_path: str,
        content_type: str = None
    ) -> Dict[str, Any]:
        """
        Upload a file to Supabase Storage.

        Args:
            analysis_type: Type of analysis (photo, video, audio, text)
            local_path: Local file path to upload
            destination_path: Destination path in bucket (e.g., "originals/uuid.jpg")
            content_type: MIME type of file

        Returns:
            Dict with upload result including public URL
        """
        if not self.is_ready():
            raise RuntimeError("Cloud storage not initialized")

        bucket = self.config.get_bucket_for_type(analysis_type)

        try:
            with open(local_path, "rb") as f:
                file_data = f.read()

            # Determine content type
            if not content_type:
                import mimetypes
                content_type = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"

            # Upload to Supabase
            result = self.client.storage.from_(bucket).upload(
                path=destination_path,
                file=file_data,
                file_options={"content-type": content_type, "upsert": "true"}
            )

            if hasattr(result, 'error') and result.error:
                raise Exception(f"Upload failed: {result.error}")

            # Get public URL
            public_url = self.client.storage.from_(bucket).get_public_url(destination_path)

            logger.info(f"Uploaded {local_path} to {bucket}/{destination_path}")
            return {
                "success": True,
                "bucket": bucket,
                "path": destination_path,
                "public_url": public_url,
                "size": len(file_data)
            }

        except Exception as e:
            logger.error(f"Failed to upload {local_path}: {e}")
            return {"success": False, "error": str(e)}

    def download_file(
        self,
        analysis_type: str,
        storage_path: str,
        local_path: Path
    ) -> bool:
        """Download a file from Supabase Storage."""
        if not self.is_ready():
            raise RuntimeError("Cloud storage not initialized")

        bucket = self.config.get_bucket_for_type(analysis_type)

        try:
            file_data = self.client.storage.from_(bucket).download(storage_path)

            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(file_data)

            logger.info(f"Downloaded {bucket}/{storage_path} to {local_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to download {storage_path}: {e}")
            return False

    def get_signed_url(
        self,
        analysis_type: str,
        storage_path: str,
        expires_in: int = 3600
    ) -> Optional[str]:
        """Generate a signed URL for private file access."""
        if not self.is_ready():
            return None

        bucket = self.config.get_bucket_for_type(analysis_type)

        try:
            result = self.client.storage.from_(bucket).create_signed_url(storage_path, expires_in)
            if hasattr(result, 'error') and result.error:
                raise Exception(result.error)
            return result.get('signedURL') or result.get('signed_url')
        except Exception as e:
            logger.error(f"Failed to create signed URL for {storage_path}: {e}")
            return None

    def delete_file(self, analysis_type: str, storage_path: str) -> bool:
        """Delete a file from Supabase Storage."""
        if not self.is_ready():
            return False

        bucket = self.config.get_bucket_for_type(analysis_type)

        try:
            result = self.client.storage.from_(bucket).remove([storage_path])
            if hasattr(result, 'error') and result.error:
                raise Exception(result.error)
            logger.info(f"Deleted {bucket}/{storage_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete {storage_path}: {e}")
            return False

    def list_files(self, analysis_type: str, prefix: str = "") -> List[Dict]:
        """List files in a bucket with optional prefix."""
        if not self.is_ready():
            return []

        bucket = self.config.get_bucket_for_type(analysis_type)

        try:
            result = self.client.storage.from_(bucket).list(prefix)
            if hasattr(result, 'error') and result.error:
                raise Exception(result.error)
            return result or []
        except Exception as e:
            logger.error(f"Failed to list files in {bucket}/{prefix}: {e}")
            return []

    # ==================== DATABASE OPERATIONS ====================

    def create_analysis_record(self, analysis_data: Dict[str, Any]) -> Optional[str]:
        """
        Create a new analysis record in the database.

        Args:
            analysis_data: Dictionary with analysis metadata

        Returns:
            Analysis ID if successful, None otherwise
        """
        if not self.is_ready():
            return None

        # Generate ID if not provided
        analysis_id = analysis_data.get("id") or str(uuid.uuid4())

        record = {
            "id": analysis_id,
            "analysis_type": analysis_data.get("analysis_type"),
            "filename": analysis_data.get("filename"),
            "original_file_path": analysis_data.get("original_file_path"),
            "cloud_storage_path": analysis_data.get("cloud_storage_path"),
            "file_size": analysis_data.get("file_size"),
            "mime_type": analysis_data.get("mime_type"),
            "status": analysis_data.get("status", "pending"),
            "ai_generated_probability": analysis_data.get("ai_generated_probability"),
            "confidence": analysis_data.get("confidence"),
            "overall_assessment": analysis_data.get("overall_assessment"),
            "detector_results": analysis_data.get("detector_results"),
            "technical_indicators": analysis_data.get("technical_indicators"),
            "summary": analysis_data.get("summary"),
            "processing_time_ms": analysis_data.get("processing_time_ms"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Remove None values
        record = {k: v for k, v in record.items() if v is not None}

        try:
            result = self.client.table("analyses").insert(record).execute()
            if hasattr(result, 'error') and result.error:
                raise Exception(result.error)
            logger.info(f"Created analysis record: {analysis_id}")
            return analysis_id
        except Exception as e:
            logger.error(f"Failed to create analysis record: {e}")
            return None

    def update_analysis_record(self, analysis_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing analysis record."""
        if not self.is_ready():
            return False

        updates["updated_at"] = datetime.utcnow().isoformat()

        # Remove None values
        updates = {k: v for k, v in updates.items() if v is not None}

        try:
            result = self.client.table("analyses").update(updates).eq("id", analysis_id).execute()
            if hasattr(result, 'error') and result.error:
                raise Exception(result.error)
            logger.info(f"Updated analysis record: {analysis_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update analysis record {analysis_id}: {e}")
            return False

    def get_analysis_record(self, analysis_id: str) -> Optional[Dict]:
        """Get an analysis record by ID."""
        if not self.is_ready():
            return None

        try:
            result = self.client.table("analyses").select("*").eq("id", analysis_id).single().execute()
            if hasattr(result, 'error') and result.error:
                if "PGRST116" in str(result.error):  # Not found
                    return None
                raise Exception(result.error)
            return result.data
        except Exception as e:
            logger.error(f"Failed to get analysis record {analysis_id}: {e}")
            return None

    def get_analysis_history(
        self,
        analysis_type: str = None,
        page: int = 1,
        page_size: int = 20,
        status: str = None
    ) -> Dict[str, Any]:
        """Get paginated analysis history."""
        if not self.is_ready():
            return {"items": [], "total": 0, "page": page, "page_size": page_size}

        try:
            query = self.client.table("analyses").select("*", count="exact")

            if analysis_type:
                query = query.eq("analysis_type", analysis_type)
            if status:
                query = query.eq("status", status)

            query = query.order("created_at", desc=True)
            query = query.range((page - 1) * page_size, page * page_size - 1)

            result = query.execute()
            if hasattr(result, 'error') and result.error:
                raise Exception(result.error)

            return {
                "items": result.data or [],
                "total": result.count or 0,
                "page": page,
                "page_size": page_size
            }
        except Exception as e:
            logger.error(f"Failed to get analysis history: {e}")
            return {"items": [], "total": 0, "page": page, "page_size": page_size}

    def delete_analysis_record(self, analysis_id: str) -> bool:
        """Delete an analysis record."""
        if not self.is_ready():
            return False

        try:
            result = self.client.table("analyses").delete().eq("id", analysis_id).execute()
            if hasattr(result, 'error') and result.error:
                raise Exception(result.error)
            logger.info(f"Deleted analysis record: {analysis_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete analysis record {analysis_id}: {e}")
            return False

    # ==================== LOCAL TEMP FILE MANAGEMENT ====================

    def get_temp_path(self, analysis_type: str, filename: str) -> Path:
        """Get a local temporary file path for processing."""
        # Create type-specific subdirectory
        temp_dir = self.config.local_temp_dir / analysis_type
        temp_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        ext = Path(filename).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        return temp_dir / unique_name

    def cleanup_temp_files(self, max_age_hours: int = None) -> int:
        """Clean up old temporary files."""
        max_age = max_age_hours or self.config.max_temp_age_hours
        cutoff_time = datetime.now().timestamp() - (max_age * 3600)
        cleaned = 0

        try:
            for file_path in self.config.local_temp_dir.rglob("*"):
                if file_path.is_file():
                    if file_path.stat().st_mtime < cutoff_time:
                        file_path.unlink()
                        cleaned += 1
            logger.info(f"Cleaned up {cleaned} temporary files older than {max_age} hours")
        except Exception as e:
            logger.error(f"Failed to cleanup temp files: {e}")

        return cleaned

    def safe_remove_temp(self, file_path: Path) -> bool:
        """Safely remove a temporary file if it exists."""
        try:
            if file_path and file_path.exists():
                file_path.unlink()
                return True
        except Exception as e:
            logger.warning(f"Failed to remove temp file {file_path}: {e}")
        return False


# ==================== GLOBAL INSTANCE ====================

_global_storage: Optional[CloudStorageManager] = None


def get_cloud_storage(config: SupabaseConfig = None) -> CloudStorageManager:
    """Get or create global cloud storage manager."""
    global _global_storage

    if _global_storage is None:
        if config is None:
            config = SupabaseConfig()
        _global_storage = CloudStorageManager(config)
        _global_storage.initialize()

    return _global_storage


def init_cloud_storage(config: SupabaseConfig = None) -> CloudStorageManager:
    """Initialize cloud storage with config."""
    global _global_storage
    if config is None:
        config = SupabaseConfig()
    _global_storage = CloudStorageManager(config)
    _global_storage.initialize()
    return _global_storage


# ==================== HELPER FUNCTIONS ====================

def upload_original_file(
    storage: CloudStorageManager,
    analysis_type: str,
    local_path: Path,
    analysis_id: str
) -> Dict[str, Any]:
    """Upload original file to cloud with standardized path."""
    ext = local_path.suffix
    dest_path = f"originals/{analysis_id}{ext}"
    return storage.upload_file(analysis_type, local_path, dest_path)


def upload_report_file(
    storage: CloudStorageManager,
    analysis_type: str,
    report_data: Dict[str, Any],
    analysis_id: str
) -> Dict[str, Any]:
    """Upload analysis report as JSON to cloud."""
    import tempfile

    # Write report to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(report_data, f, indent=2, default=str)
        temp_path = Path(f.name)

    try:
        dest_path = f"reports/{analysis_id}.json"
        return storage.upload_file(analysis_type, temp_path, dest_path, "application/json")
    finally:
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()


def save_analysis_complete(
    storage: CloudStorageManager,
    analysis_id: str,
    analysis_type: str,
    result_data: Dict[str, Any]
) -> bool:
    """Save complete analysis results to cloud and database."""

    # Upload report
    upload_report_file(storage, analysis_type, result_data, analysis_id)

    # Update database record
    updates = {
        "status": "completed",
        "completed_at": datetime.utcnow().isoformat(),
        "ai_generated_probability": result_data.get("ai_generated_probability"),
        "confidence": result_data.get("confidence"),
        "overall_assessment": result_data.get("overall_assessment"),
        "detector_results": result_data.get("detectors"),
        "technical_indicators": result_data.get("technical_indicators"),
        "summary": result_data.get("summary"),
        "processing_time_ms": result_data.get("processing_time_total_ms"),
    }

    return storage.update_analysis_record(analysis_id, updates)


def save_analysis_failed(
    storage: CloudStorageManager,
    analysis_id: str,
    error_message: str
) -> bool:
    """Mark analysis as failed in database."""
    updates = {
        "status": "failed",
        "completed_at": datetime.utcnow().isoformat(),
        "error_message": error_message,
    }
    return storage.update_analysis_record(analysis_id, updates)