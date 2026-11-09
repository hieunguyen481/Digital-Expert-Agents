"""L08 gỡ tài liệu lỗi, L09 cảnh báo lệch tên khách hàng."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.exceptions import AuthorizationError, ConflictError
from app.services.reconciliation_service import ReconciliationService, customer_mismatch_warnings


def _f(value: str) -> dict:
    return {"field_name": "company_name", "value": value}


def test_same_company_with_other_form_has_no_warning() -> None:
    assert not customer_mismatch_warnings([_f("CONG TY CO PHAN LOGISTICS CANG XANH HAI PHONG")], "Công ty Cổ phần Logistics Cảng Xanh Hải Phòng")
    assert not customer_mismatch_warnings([_f("CTCP Logistics Cảng Xanh")], "Công ty Cổ phần Logistics Cảng Xanh Hải Phòng")


def test_other_company_warns() -> None:
    out = customer_mismatch_warnings([_f("CONG TY TNHH LAT TAM")], "CTCP Logistics Cảng Xanh")
    assert len(out) == 1 and "LAT TAM" in out[0]


def test_other_fields_ignored() -> None:
    assert not customer_mismatch_warnings([{"field_name": "tax_code", "value": "123"}], "CTCP A")


class Repo:
    def __init__(self, ok: bool = True, write: bool = True, status: str = "CHECKING") -> None:
        self.ok, self.write, self.status = ok, write, status

    async def loan(self, loan_id):  # noqa: ANN001
        return {"id": loan_id, "status": self.status}

    async def can_write_loan(self, employee, loan_id):  # noqa: ANN001
        return self.write

    async def remove_failed_document(self, loan_id, document_id):  # noqa: ANN001
        return self.ok


def _remove(repo: Repo, roles=("document_reviewer",), perms=()):  # noqa: ANN001
    svc = ReconciliationService(repo, None, None)  # type: ignore[arg-type]
    who = SimpleNamespace(employee_id=uuid4(), roles=set(roles), permissions=set(perms), is_admin=False)
    return asyncio.run(svc.remove_document(who, uuid4(), uuid4()))


def test_reviewer_removes_failed_document() -> None:
    _remove(Repo())


def test_cannot_remove_healthy_document() -> None:
    with pytest.raises(ConflictError):
        _remove(Repo(ok=False))


def test_not_assigned_or_wrong_role_or_late_step() -> None:
    with pytest.raises(AuthorizationError):
        _remove(Repo(write=False))
    with pytest.raises(AuthorizationError):
        _remove(Repo(), roles=("loan_approver",))
    with pytest.raises(ConflictError):
        _remove(Repo(status="APPROVAL"))
