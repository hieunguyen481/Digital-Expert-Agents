"""I3: so tien duyet khong vuot so tien de nghi (kiem o WorkflowService truoc khi ghi)."""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

import pytest

from app.auth.principal import CurrentPrincipal
from app.exceptions import ValidationError
from app.workflow.service import WorkflowService

LOAN_ID = uuid4()


class _Repo:
    """Chi get_loan; moi lenh khac lam test that bai (kiem tra phai chan truoc)."""

    def __init__(self, requested: Decimal, holder: bool = True) -> None:
        self.requested = requested
        self.holder = holder

    async def can_write_loan(self, *_args: Any) -> bool:
        return self.holder

    async def get_loan(self, loan_id: UUID) -> dict[str, Any]:
        return {
            "id": loan_id, "status": "APPROVAL", "version": 1,
            "primary_customer_id": uuid4(), "approval_tier": 1,
            "relationship_manager_id": uuid4(), "requested_amount": self.requested,
        }

    def __getattr__(self, name: str) -> Any:
        raise AssertionError(f"unexpected repository call: {name}")


def _approver() -> CurrentPrincipal:
    return CurrentPrincipal(
        employee_id=uuid4(), subject="approver", branch_id=uuid4(),
        roles=frozenset({"loan_approver"}), permissions=frozenset({"loan:read", "loan:approve"}),
    )


@pytest.mark.parametrize("decision_type", ["APPROVED", "APPROVED_WITH_CONDITIONS"])
async def test_decide_rejects_amount_above_requested(decision_type: str) -> None:
    service = WorkflowService(_Repo(Decimal("20000000000")))
    with pytest.raises(ValidationError) as error:
        await service.transition(
            _approver(), LOAN_ID, "decide", expected_version=1, reason="Dong y",
            params={
                "decision_type": decision_type,
                "approved_amount": "500000000000",
                "approved_term_months": 12,
                "conditions": [{"code": "C1"}],
            },
        )
    assert error.value.code == "APPROVED_AMOUNT_EXCEEDS_REQUESTED"
    assert error.value.status == 422
    assert error.value.details == {
        "approved_amount": "500000000000",
        "requested_amount": "20000000000",
    }


@pytest.mark.parametrize("amount", ["0", "-5", None])
async def test_decide_rejects_non_positive_amount(amount: str | None) -> None:
    service = WorkflowService(_Repo(Decimal("20000000000")))
    with pytest.raises(ValidationError) as error:
        await service.transition(
            _approver(), LOAN_ID, "decide", expected_version=1, reason="Dong y",
            params={
                "decision_type": "APPROVED",
                "approved_amount": amount,
                "approved_term_months": 12,
            },
        )
    assert error.value.code == "APPROVED_AMOUNT_INVALID"
    assert error.value.status == 422


async def test_decide_by_non_holder_is_403_not_db_error() -> None:
    """QA3-01: nguoi khong giu buoc bi chan truoc khi ghi (PermissionError -> 403)."""
    service = WorkflowService(_Repo(Decimal("1000000000"), holder=False))
    with pytest.raises(PermissionError, match="đang giữ bước"):
        await service.transition(
            _approver(), LOAN_ID, "decide", expected_version=1, reason="Dong y",
            params={"decision_type": "APPROVED", "approved_amount": "1", "approved_term_months": 12},
        )
