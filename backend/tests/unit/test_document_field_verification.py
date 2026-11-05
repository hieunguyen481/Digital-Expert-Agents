"""Xac nhan truong trich xuat theo tu vung V022 (AI_PROPOSED / CONFIRMED / NEEDS_VERIFICATION)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.document import FieldVerificationRequest
from app.services.document_service import DocumentService


class _Repository:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def update_field(self, field_id, **kwargs):
        self.calls.append({"field_id": field_id, **kwargs})
        return {"id": field_id, **kwargs}


def _principal(*permissions: str) -> Any:
    return SimpleNamespace(employee_id=uuid4(), permissions=frozenset(permissions), roles=frozenset())


def _service() -> tuple[DocumentService, _Repository]:
    repository = _Repository()
    return DocumentService(repository, storage=None), repository  # type: ignore[arg-type]


async def test_confirm_keeps_source_type():
    service, repository = _service()
    await service.verify_field(
        _principal("document:verify"),
        uuid4(),
        verification_status="CONFIRMED",
        corrected_value_text=None,
        verification_reason="Khop ban goc",
    )
    assert repository.calls[0]["verification_status"] == "CONFIRMED"
    assert repository.calls[0]["source_type"] is None


async def test_correction_is_confirmed_human_value():
    service, repository = _service()
    await service.verify_field(
        _principal("document:verify"),
        uuid4(),
        verification_status="CONFIRMED",
        corrected_value_text="28000000",
        verification_reason="OCR doc sai so",
    )
    assert repository.calls[0]["corrected_value_text"] == "28000000"
    assert repository.calls[0]["source_type"] == "HUMAN"


async def test_needs_verification_without_correction():
    service, repository = _service()
    await service.verify_field(
        _principal("document:verify"),
        uuid4(),
        verification_status="NEEDS_VERIFICATION",
        corrected_value_text=None,
        verification_reason="Anh mo, can doi chieu",
    )
    assert repository.calls[0]["verification_status"] == "NEEDS_VERIFICATION"


@pytest.mark.parametrize("status", ["VERIFIED", "CORRECTED", "REJECTED", "NEEDS_REVIEW", "AI_PROPOSED"])
async def test_old_or_ai_only_statuses_rejected(status):
    service, repository = _service()
    with pytest.raises(ValueError):
        await service.verify_field(
            _principal("document:verify"),
            uuid4(),
            verification_status=status,
            corrected_value_text=None,
            verification_reason="ly do",
        )
    assert repository.calls == []
    with pytest.raises(ValidationError):
        FieldVerificationRequest(verification_status=status, verification_reason="ly do")


async def test_correction_requires_confirmed():
    service, _ = _service()
    with pytest.raises(ValueError):
        await service.verify_field(
            _principal("document:verify"),
            uuid4(),
            verification_status="NEEDS_VERIFICATION",
            corrected_value_text="1",
            verification_reason="ly do",
        )


async def test_reason_is_mandatory():
    service, _ = _service()
    with pytest.raises(ValueError):
        await service.verify_field(
            _principal("document:verify"),
            uuid4(),
            verification_status="CONFIRMED",
            corrected_value_text=None,
            verification_reason="   ",
        )
    with pytest.raises(ValidationError):
        FieldVerificationRequest(verification_status="CONFIRMED", verification_reason="")


async def test_missing_permission_rejected():
    service, _ = _service()
    with pytest.raises(PermissionError):
        await service.verify_field(
            _principal("document:read"),
            uuid4(),
            verification_status="CONFIRMED",
            corrected_value_text=None,
            verification_reason="ly do",
        )
