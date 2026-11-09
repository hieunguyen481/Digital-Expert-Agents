"""L08: tệp khai PDF nhưng nội dung là PNG/văn bản bị chặn ngay lúc hoàn tất tải lên."""

from __future__ import annotations

import asyncio
import base64
import hashlib
from datetime import datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.compat import UTC
from app.exceptions import ValidationError
from app.services.upload_service import UploadService


class Storage:
    def __init__(self, content: bytes) -> None:
        self.content = content
        self.ranges: list[tuple[int, int] | None] = []

    async def stat_object(self, bucket, key, *, version_id=None):  # noqa: ANN001
        return SimpleNamespace(
            size_bytes=len(self.content),
            checksum_sha256_base64=base64.b64encode(hashlib.sha256(self.content).digest()).decode(),
        )

    async def get_object(self, bucket, key, *, version_id=None, byte_range=None):  # noqa: ANN001
        self.ranges.append(byte_range)
        lo, hi = byte_range or (0, len(self.content) - 1)
        return self.content[lo : hi + 1]


class Repo:
    def __init__(self, content: bytes, mime: str) -> None:
        self.upload = {
            "status": "CREATED", "expires_at": datetime.now(UTC) + timedelta(minutes=5),
            "quarantine_object_key": "q/1", "expected_size_bytes": len(content),
            "expected_sha256": hashlib.sha256(content).hexdigest(), "expected_mime_type": mime,
            "customer_id": uuid4(), "loan_application_id": None,
        }
        self.completed = False

    async def get_upload(self, upload_id):  # noqa: ANN001
        return self.upload

    async def complete_upload(self, **kw):  # noqa: ANN003
        self.completed = True
        return {"id": kw["upload_id"]}


def _run(content: bytes, mime: str):
    storage, repo = Storage(content), Repo(content, mime)
    svc = UploadService(repo, storage, max_size_bytes=10**7)  # type: ignore[arg-type]
    who = SimpleNamespace(employee_id=uuid4(), permissions={"document:upload"})
    out = asyncio.run(svc.complete_upload(who, uuid4()))
    return out, storage, repo


def test_real_pdf_passes_and_reads_only_prefix() -> None:
    _, storage, repo = _run(b"%PDF-1.7\n" + b"x" * 5000, "application/pdf")
    assert repo.completed and storage.ranges == [(0, 7)]


def test_png_declared_as_pdf_is_rejected() -> None:
    with pytest.raises(ValidationError) as err:
        _run(b"\x89PNG\r\n\x1a\n" + b"x" * 100, "application/pdf")
    assert err.value.code == "DOCUMENT_CONTENT_MISMATCH"


def test_text_declared_as_pdf_is_rejected() -> None:
    with pytest.raises(ValidationError):
        _run(b"ghi chu\n" * 10, "application/pdf")


def test_zero_bytes_declared_as_pdf_is_rejected() -> None:
    with pytest.raises(ValidationError):
        _run(b"\x00" * 64, "application/pdf")


@pytest.mark.parametrize("mime,head", [
    ("image/png", b"\x89PNG\r\n\x1a\n"), ("image/jpeg", b"\xff\xd8\xff\xe0"),
    ("image/tiff", b"II*\x00"), ("image/tiff", b"MM\x00*"),
])
def test_matching_images_pass(mime: str, head: bytes) -> None:
    assert _run(head + b"x" * 50, mime)[2].completed
