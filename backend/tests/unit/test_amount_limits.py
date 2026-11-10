"""F12/L10: ngưỡng cảnh báo cấu hình được, cận trên cứng chặn nhầm đơn vị."""

from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.loan import LoanCreateRequest
from app.schemas.proposal import DraftSaveRequest


def _draft(amount: str) -> DraftSaveRequest:
    return DraftSaveRequest(product_id=uuid4(), requested_amount=Decimal(amount), requested_term_months=12, version=1)


def test_draft_accepts_amount_above_warning_threshold() -> None:
    assert _draft("600000000000").requested_amount == Decimal("600000000000")


def test_draft_rejects_amount_above_hard_cap() -> None:
    with pytest.raises(ValidationError):
        _draft(str(999999 * 10**9))


def test_loan_create_rejects_amount_above_hard_cap() -> None:
    with pytest.raises(ValidationError):
        LoanCreateRequest(
            primary_customer_id=uuid4(), product_id=uuid4(), requested_amount=Decimal(10) ** 15,
            currency="VND", requested_term_months=12,
        )
