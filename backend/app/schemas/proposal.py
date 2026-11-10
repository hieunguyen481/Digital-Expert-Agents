"""Request/response models cho trang 04 "Tạo đề xuất vay"."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.common import APIModel, DecimalString

# Cận trên cứng 100.000 tỷ: chặn nhầm đơn vị (L10), khác ngưỡng cảnh báo F12 cấu hình được.
AMOUNT_HARD_MAX = Decimal(10) ** 14


class DraftSaveRequest(APIModel):
    product_id: UUID
    requested_amount: DecimalString = Field(gt=0, le=AMOUNT_HARD_MAX)
    requested_term_months: int = Field(gt=0, le=600)
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


class ConsentState(APIModel):
    code: str  # OK | MISSING | UNCONFIRMED | EXPIRED
    usable: bool
    lock_reason: str | None = None
    signed_on: date | None = None
    valid_until: date | None = None
    confirmed_by_name: str | None = None


class CicReport(APIModel):
    looked_up_on: date
    valid_until: date
    looked_up_by_name: str | None = None
    source: str
    source_label: str | None = None
    summary: dict[str, object] = Field(default_factory=dict)


class CicStatus(APIModel):
    editable: bool
    consent: ConsentState
    report: CicReport | None = None
    report_status: str  # NONE | VALID | EXPIRED
    relookup_flag: bool
    relookup_flag_text: str | None = None
    lookup_locked: bool
    lock_reason: str | None = None
    today: date


class ConsentCreateRequest(APIModel):
    document_id: UUID
    signed_on: date
    valid_until: date | None = None


class ProposalDocument(APIModel):
    item_id: UUID
    code: str
    label: str | None = None
    document_type: str | None = None
    mandatory: bool
    state: str  # OK | AI | MISSING | EXPIRED
    document_id: UUID | None = None
    title: str | None = None
    verification_status: str | None = None
    issued_date: date | None = None
    valid_until: date | None = None
    has_exception: bool = False
    note: str | None = None


class ExposureLine(APIModel):
    party_id: UUID
    name: str
    relation: str
    status: str | None
    basis: str | None
    proposed_by_ai: bool
    outstanding: DecimalString
    off_balance: DecimalString


class RelatedParties(APIModel):
    editable: bool
    lines: list[ExposureLine]
    total_exposure: DecimalString
    required_tier: int


class RelatedPartyDecision(APIModel):
    status: str = Field(pattern="^(CONFIRMED|NOT_IN_GROUP)$")
    basis: str | None = Field(default=None, max_length=1000)


class CollateralItem(APIModel):
    id: UUID
    collateral_type: str
    description: str | None
    owner_name: str
    on_leased_land: bool
    land_lease_payment: str | None
    has_lease_proof: bool


class LeaseChoice(APIModel):
    land_lease_payment: str = Field(pattern="^(ANNUAL|ONE_TIME)$")


class ExceptionItem(APIModel):
    id: UUID
    checklist_code: str | None
    kind: str
    reason: str
    proposed_at: datetime
    decision: str | None
    withdrawn_at: datetime | None


class ExceptionCreateRequest(APIModel):
    checklist_code: str = Field(min_length=1, max_length=100)
    reason: str = Field(min_length=10, max_length=1000)


class SubmitCondition(APIModel):
    code: str
    label: str
    kind: str
    met: bool
    detail: str | None
    section: str


class SubmitConditions(APIModel):
    editable: bool
    can_submit: bool
    lock_reason: str | None
    required_tier: int
    amount_warning: str | None = None
    conditions: list[SubmitCondition]
    exceptions: list[ExceptionItem]
    collaterals: list[CollateralItem]


class SubmitRequest(APIModel):
    expected_version: int = Field(ge=1)


class SubmitResult(APIModel):
    status: str
    step_code: str | None
    carried_flags: list[str]
