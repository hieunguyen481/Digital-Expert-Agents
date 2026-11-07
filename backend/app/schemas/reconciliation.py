"""Request/response models cho trang 05 "Đối chiếu tài liệu"."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import APIModel


class ReconDocument(APIModel):
    document_id: UUID
    version_id: UUID | None = None
    title: str | None = None
    document_type: str
    document_subtype: str | None = None
    verification_status: str
    issued_date: date | None = None
    counts_for_checklist: bool = True
    page_count: int = 1
    field_count: int = 0
    needs_verification_count: int = 0
    ai_proposed_count: int = 0


class ReconCheck(APIModel):
    result: Literal["PASS", "FAIL"]
    note: str | None = None
    actor_name: str | None = None
    at: datetime


class ReconItem(APIModel):
    item_id: UUID
    code: str
    document_type: str | None = None
    mandatory: bool
    status: str
    has_exception: bool = False
    document_ids: list[UUID] = Field(default_factory=list)
    check: ReconCheck | None = None


class ReconSource(APIModel):
    field_id: UUID
    document_id: UUID
    document_title: str | None = None
    field_name: str
    value: str | None = None
    value_number: float | None = None
    page_number: int | None = None
    source_type: str
    verification_status: str


class ReconConflict(APIModel):
    conflict_id: UUID
    code: str
    sources: list[ReconSource]
    chosen_field_id: UUID | None = None
    resolution_reason: str | None = None
    resolved_by_name: str | None = None
    resolved_at: datetime | None = None


class ReconTransfer(APIModel):
    """Nút "Chuyển Thẩm định": mở hay khóa do chính cổng `checking_pass` quyết."""

    visible: bool
    locked: bool
    reasons: list[str]
    carried_flags: list[str]
    expected_version: int


class ReconPermissions(APIModel):
    can_check: bool
    can_resolve: bool
    can_confirm_fields: bool


class ReconView(APIModel):
    loan_application_id: UUID
    application_number: str
    customer_name: str | None = None
    status: str
    items: list[ReconItem]
    documents: list[ReconDocument]
    extra_document_ids: list[UUID]
    conflicts: list[ReconConflict]
    transfer: ReconTransfer
    permissions: ReconPermissions
    data_label: str


class ReconField(APIModel):
    field_id: UUID
    field_name: str
    value_type: str
    value: str | None = None
    value_number: float | None = None
    page_number: int | None = None
    bounding_box: dict[str, Any] | None = None
    source_text: str | None = None
    confidence: float | None = None
    verification_status: str
    source_type: str
    verification_reason: str | None = None
    verified_by_name: str | None = None
    verified_at: datetime | None = None
    conflict_id: UUID | None = None


class ReconDocumentDetail(APIModel):
    document: ReconDocument
    fields: list[ReconField]
    has_page_image: bool


class CheckRequest(APIModel):
    result: Literal["PASS", "FAIL"]
    note: str | None = Field(default=None, max_length=1000)


class ResolveRequest(APIModel):
    chosen_field_id: UUID
    reason: str = Field(min_length=5, max_length=1000)


class ConflictLogEntry(APIModel):
    log_id: UUID
    conflict_id: UUID
    conflict_code: str
    actor_name: str | None = None
    old_value_text: str | None = None
    new_value_text: str | None = None
    reason: str
    at: datetime


class CheckLogEntry(APIModel):
    log_id: UUID
    requirement_code: str
    actor_name: str | None = None
    result: str
    old_status: str
    new_status: str
    note: str | None = None
    at: datetime


class ReconLog(APIModel):
    conflicts: list[ConflictLogEntry]
    checks: list[CheckLogEntry]
