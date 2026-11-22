import os
import magic
from pathlib import Path
from typing import Optional, Tuple
import pdfplumber
from docx import Document
import logging

logger = logging.getLogger(__name__)


class FileExtractor:
    SUPPORTED_MIME_TYPES = {
        "text/plain": [".txt"],
        "application/pdf": [".pdf"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    }

    SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".docx"]

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    def __init__(self, max_size: Optional[int] = None):
        self.max_size = max_size or self.MAX_FILE_SIZE

    def validate_file(self, file_path: Path, mime_type: str) -> Tuple[bool, Optional[str]]:
        if not file_path.exists():
            return False, "File does not exist"

        file_size = file_path.stat().st_size
        if file_size > self.max_size:
            return False, f"File size {file_size} exceeds maximum {self.max_size}"

        if file_size == 0:
            return False, "File is empty"

        if mime_type not in self.SUPPORTED_MIME_TYPES:
            return False, f"Unsupported MIME type: {mime_type}"

        ext = file_path.suffix.lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            return False, f"Unsupported file extension: {ext}"

        expected_exts = self.SUPPORTED_MIME_TYPES.get(mime_type, [])
        if ext not in expected_exts:
            return False, f"Extension {ext} does not match MIME type {mime_type}"

        return True, None

    def detect_mime_type(self, file_path: Path) -> str:
        try:
            mime = magic.Magic(mime=True)
            return mime.from_file(str(file_path))
        except Exception:
            ext = file_path.suffix.lower()
            mime_map = {
                ".txt": "text/plain",
                ".pdf": "application/pdf",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }
            return mime_map.get(ext, "application/octet-stream")

    def extract_text(self, file_path: Path) -> Tuple[str, dict]:
        mime_type = self.detect_mime_type(file_path)

        valid, error = self.validate_file(file_path, mime_type)
        if not valid:
            raise ValueError(error)

        if mime_type == "text/plain":
            return self._extract_txt(file_path)
        elif mime_type == "application/pdf":
            return self._extract_pdf(file_path)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return self._extract_docx(file_path)
        else:
            raise ValueError(f"Unsupported file type: {mime_type}")

    def _extract_txt(self, file_path: Path) -> Tuple[str, dict]:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            return text, {"encoding": "utf-8", "method": "direct_read"}
        except UnicodeDecodeError:
            try:
                with open(file_path, "r", encoding="latin-1") as f:
                    text = f.read()
                return text, {"encoding": "latin-1", "method": "direct_read"}
            except Exception as e:
                raise ValueError(f"Failed to read text file: {e}")

    def _extract_pdf(self, file_path: Path) -> Tuple[str, dict]:
        text_parts = []
        metadata = {"pages": 0, "method": "pdfplumber"}

        try:
            with pdfplumber.open(file_path) as pdf:
                metadata["pages"] = len(pdf.pages)
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

            text = "\n\n".join(text_parts)
            if not text.strip():
                raise ValueError("No text extracted from PDF")

            return text, metadata
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {e}")

    def _extract_docx(self, file_path: Path) -> Tuple[str, dict]:
        try:
            doc = Document(file_path)
            text_parts = []

            for para in doc.paragraphs:
                if para.text.strip():
                    text_parts.append(para.text)

            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text for cell in row.cells)
                    if row_text.strip():
                        text_parts.append(row_text)

            text = "\n\n".join(text_parts)
            if not text.strip():
                raise ValueError("No text extracted from DOCX")

            metadata = {
                "paragraphs": len(doc.paragraphs),
                "tables": len(doc.tables),
                "method": "python-docx",
            }
            return text, metadata
        except Exception as e:
            raise ValueError(f"Failed to extract text from DOCX: {e}")


def extract_text_from_file(file_path: Path, max_size: Optional[int] = None) -> Tuple[str, dict]:
    extractor = FileExtractor(max_size)
    return extractor.extract_text(file_path)