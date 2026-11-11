"""F10 (M04): Thẩm định đang giữ hồ sơ ở bước Thẩm định được rà lại nhóm liên quan."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from uuid import uuid4

from app.services.submission_service import SubmissionService

LOAN = uuid4()


class Repo:
    def __init__(self, can_write: bool) -> None:
        self._can_write = can_write

    async def can_write(self, employee_id: Any, loan_id: Any) -> bool:
        return self._can_write


def _svc(can_write: bool) -> SubmissionService:
    svc = object.__new__(SubmissionService)
    svc._repo = Repo(can_write)  # type: ignore[attr-defined]
    return svc


def _p(*roles: str) -> Any:
    return SimpleNamespace(roles=frozenset(roles), employee_id=uuid4())


async def test_only_holding_appraiser_at_appraisal_reviews() -> None:
    appraisal = {"status": "APPRAISAL"}
    assert await _svc(True)._appraisal_review(_p("credit_appraiser"), appraisal, LOAN) is True
    assert await _svc(False)._appraisal_review(_p("credit_appraiser"), appraisal, LOAN) is False  # không giữ bước
    assert await _svc(True)._appraisal_review(_p("credit_officer"), appraisal, LOAN) is False
    assert await _svc(True)._appraisal_review(_p("credit_appraiser"), {"status": "RISK_REVIEW"}, LOAN) is False
