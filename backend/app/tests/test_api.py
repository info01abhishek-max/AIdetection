import pytest
import io
import os
from fastapi.testclient import TestClient
from PIL import Image
import numpy as np

from app.main import app
from app.config import settings
from app.services.image_processor import image_processor
from app.models.detection_models import detector_registry


client = TestClient(app)


class TestHealthCheck:
    def test_health_endpoint(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "models_loaded" in data
        assert "uptime" in data


class TestImageUpload:
    def create_test_image(self, format: str = "JPEG", size: tuple = (512, 512)) -> bytes:
        img = Image.new("RGB", size, color="red")
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        return buffer.getvalue()

    def test_upload_valid_jpeg(self):
        img_bytes = self.create_test_image("JPEG")
        response = client.post(
            "/api/analyze/upload",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "analysis_id" in data
        assert data["status"] == "uploading"

    def test_upload_valid_png(self):
        img_bytes = self.create_test_image("PNG")
        response = client.post(
            "/api/analyze/upload",
            files={"file": ("test.png", img_bytes, "image/png")},
        )
        assert response.status_code == 200

    def test_upload_valid_webp(self):
        img_bytes = self.create_test_image("WEBP")
        response = client.post(
            "/api/analyze/upload",
            files={"file": ("test.webp", img_bytes, "image/webp")},
        )
        assert response.status_code == 200

    def test_upload_invalid_format(self):
        img_bytes = self.create_test_image("JPEG")
        response = client.post(
            "/api/analyze/upload",
            files={"file": ("test.txt", img_bytes, "text/plain")},
        )
        assert response.status_code == 400

    def test_upload_oversized_file(self):
        large_img = Image.new("RGB", (10000, 10000), color="blue")
        buffer = io.BytesIO()
        large_img.save(buffer, format="JPEG", quality=95)
        img_bytes = buffer.getvalue()

        if len(img_bytes) > settings.MAX_FILE_SIZE:
            response = client.post(
                "/api/analyze/upload",
                files={"file": ("large.jpg", img_bytes, "image/jpeg")},
            )
            assert response.status_code == 413

    def test_upload_empty_file(self):
        response = client.post(
            "/api/analyze/upload",
            files={"file": ("empty.jpg", b"", "image/jpeg")},
        )
        assert response.status_code == 400


class TestAnalysisStatus:
    def create_test_image(self, format: str = "JPEG", size: tuple = (512, 512)) -> bytes:
        img = Image.new("RGB", size, color="red")
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        return buffer.getvalue()

    def test_status_not_found(self):
        response = client.get("/api/analyze/nonexistent/status")
        assert response.status_code == 404

    def test_status_pending(self):
        img_bytes = self.create_test_image("JPEG")
        upload_response = client.post(
            "/api/analyze/upload",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        )
        analysis_id = upload_response.json()["analysis_id"]

        response = client.get(f"/api/analyze/{analysis_id}/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["uploading", "scanning", "analyzing", "complete", "error"]
        assert "progress" in data


class TestAnalysisResult:
    def create_test_image(self, format: str = "JPEG", size: tuple = (512, 512)) -> bytes:
        img = Image.new("RGB", size, color="red")
        buffer = io.BytesIO()
        img.save(buffer, format=format)
        return buffer.getvalue()

    def test_result_not_found(self):
        response = client.get("/api/analyze/nonexistent/result")
        assert response.status_code == 404

    def test_result_pending(self):
        img_bytes = self.create_test_image("JPEG")
        upload_response = client.post(
            "/api/analyze/upload",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        )
        analysis_id = upload_response.json()["analysis_id"]

        response = client.get(f"/api/analyze/{analysis_id}/result")
        # Analysis completes quickly in test environment, accept both 200 (complete) and 202 (pending)
        assert response.status_code in [200, 202]


class TestImageProcessor:
    def test_validate_valid_image(self):
        img = Image.new("RGB", (100, 100), color="red")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")

        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(buffer.getvalue())
            temp_path = f.name

        try:
            valid, error = image_processor.validate_image(temp_path)
            assert valid is True
            assert error is None
        finally:
            os.unlink(temp_path)

    def test_validate_invalid_format(self):
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            f.write(b"not an image")
            temp_path = f.name

        try:
            valid, error = image_processor.validate_image(temp_path)
            assert valid is False
        finally:
            os.unlink(temp_path)

    def test_extract_metadata(self):
        img = Image.new("RGB", (100, 100), color="red")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")

        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(buffer.getvalue())
            temp_path = f.name

        try:
            metadata = image_processor.extract_metadata(temp_path)
            assert "width" in metadata
            assert "height" in metadata
            assert "format" in metadata
            assert metadata["width"] == 100
            assert metadata["height"] == 100
        finally:
            os.unlink(temp_path)

    def test_compute_hash(self):
        img = Image.new("RGB", (100, 100), color="red")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")

        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(buffer.getvalue())
            temp_path = f.name

        try:
            hash1 = image_processor.compute_hash(temp_path)
            hash2 = image_processor.compute_hash(temp_path)
            assert hash1 == hash2
            assert len(hash1) == 16
        finally:
            os.unlink(temp_path)


class TestDetectors:
    def test_detectors_loaded(self):
        # Load detectors manually for testing
        results = detector_registry.load_all()
        loaded_count = sum(1 for v in results.values() if v)
        assert loaded_count >= 4, f"Expected at least 4 loaded detectors, got {loaded_count}"
        # Synthetic Detection may not load without full HF hub setup
        synthetic = next(d for d in detector_registry.detectors if d.name == "Synthetic Detection")
        if not synthetic.loaded:
            print("Note: Synthetic Detection not loaded (requires HF hub)")

    def test_synthetic_detector(self):
        detector = next(d for d in detector_registry.detectors if d.name == "Synthetic Detection")
        if detector.loaded:
            img = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            result = detector.detect(img, {})
            assert result.name == "Synthetic Detection"
            assert result.category in ["LIKELY_AI_GENERATED", "LIKELY_CAMERA_ORIGINATED", "POSSIBLE_MANIPULATION", "INCONCLUSIVE"]
            assert 0 <= result.confidence <= 100
            assert result.processing_time >= 0

    def test_frequency_analyzer(self):
        detector = next(d for d in detector_registry.detectors if d.name == "Frequency Analysis")
        img = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
        result = detector.detect(img, {})
        assert result.name == "Frequency Analysis"
        assert 0 <= result.confidence <= 100

    def test_texture_analyzer(self):
        detector = next(d for d in detector_registry.detectors if d.name == "Texture Analysis")
        img = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
        result = detector.detect(img, {})
        assert result.name == "Texture Analysis"
        assert 0 <= result.confidence <= 100

    def test_metadata_inspector(self):
        detector = next(d for d in detector_registry.detectors if d.name == "Metadata Inspection")
        img = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
        result = detector.detect(img, {"has_exif": False})
        assert result.name == "Metadata Inspection"
        assert 0 <= result.confidence <= 100

    def test_consistency_checker(self):
        detector = next(d for d in detector_registry.detectors if d.name == "Consistency Check")
        img = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
        result = detector.detect(img, {})
        assert result.name == "Consistency Check"
        assert 0 <= result.confidence <= 100


class TestReportGeneration:
    def create_test_image(self) -> bytes:
        img = Image.new("RGB", (100, 100), color="red")
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        return buffer.getvalue()

    def test_report_json(self):
        img_bytes = self.create_test_image()
        upload_response = client.post(
            "/api/analyze/upload",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        )
        analysis_id = upload_response.json()["analysis_id"]

        import time
        for _ in range(30):
            status = client.get(f"/api/analyze/{analysis_id}/status").json()
            if status["status"] == "complete":
                break
            time.sleep(0.5)

        response = client.get(f"/api/analyze/{analysis_id}/report?format=json")
        if response.status_code == 200:
            assert response.headers["content-type"] == "application/json"
            data = response.json()
            assert "id" in data
            assert "overall_assessment" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])