"""Request/response models cho trang 04 "Tạo đề xuất vay"."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import APIModel, DecimalString


class DraftSaveRequest(APIModel):
    product_id: UUID
    requested_amount: DecimalString = Field(gt=0)
    requested_term_months: int = Field(gt=0)
    purpose_text: str | None = Field(default=None, max_length=2000)
    repayment_source_text: str | None = Field(default=None, max_length=2000)
    secured: bool = True
    # Version của hồ sơ lúc client nạp nháp; lệch thì 409 VERSION_CONFLICT (2 tab cùng sửa).
    version: int = Field(gt=0)


class DraftResponse(APIModel):
    assigned_employee_id: UUID | None = None
    loan_application_id: UUID
    application_number: str
    status: str
    version: int
    editable: bool
    primary_customer_id: UUID
    customer_name: str | None
    product_id: UUID
    product_code: str
    product_name: str
    min_amount: DecimalString | None
    max_amount: DecimalString | None
    min_term_months: int | None
    max_term_months: int | None
    requested_amount: DecimalString
    requested_term_months: int
    purpose_text: str | None
    repayment_source_text: str | None
    secured: bool
    saved_at: datetime | None
    saved_by_name: str | None


class LoanProductResponse(APIModel):
    customer_type: str
    id: UUID
    product_code: str
    product_name: str
    loan_purpose: str | None
    min_amount: DecimalString | None
    max_amount: DecimalString | None
    min_term_months: int | None
    max_term_months: int | None
