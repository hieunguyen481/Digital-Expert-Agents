"""Lat 9, trang 05: link truong-vung to, chot nguon, nhat ky append-only, cong chuyen Tham dinh, phan quyen."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from tests.integration.seed_ids import (
    ADMIN_HO,
    APPROVER_HO,
    AUDITOR_HO,
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    DOCUMENT_REVIEWER,
    LOAN_VINANOVA,
    RISK_HO,
    SME_LOANS,
)
from tests.integration.test_proposal_draft import _as

from app.exceptions import AuthorizationError, NotFoundError, ValidationError
from app.repositories.audit_repository import AuditRepository
from app.repositories.reconciliation_repository import ReconciliationRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.services.audit_service import AuditService
from app.services.reconciliation_service import ReconciliationService
from app.workflow.service import GateBlockedError, WorkflowService

LOAN_CHECKING = SME_LOANS[9]  # HTTD (DOCUMENT_REVIEWER) dang giu buoc Hau kiem, du lieu seed
ROLE = {
    CREDIT_OFFICER: "credit_officer", DOCUMENT_REVIEWER: "document_reviewer", CREDIT_APPRAISER: "credit_appraiser",
    RISK_HO: "risk_officer", COMPLIANCE_HO: "compliance_officer", APPROVER_HO: "loan_approver", AUDITOR_HO: "auditor",
}


class _P:
    def __init__(self, employee: UUID) -> None:
        self.employee_id = employee
        self.roles = frozenset({ROLE[employee]} if employee in ROLE else set())
        self.is_admin = employee == ADMIN_HO
        self.permissions = frozenset({"loan:read", "loan:update"})


def _svc(s: AsyncSession) -> ReconciliationService:
    wf = WorkflowRepository(s, cic_outage=False)
    return ReconciliationService(ReconciliationRepository(s), wf, WorkflowService(wf, AuditService(AuditRepository(s))))


async def _run(employee: UUID, body: Callable[[ReconciliationService], Awaitable[Any]]) -> Any:
    return await _as(employee, lambda s: body(_svc(s)))


async def _dscr(svc: ReconciliationService) -> dict[str, Any]:
    view = await svc.view(_P(CREDIT_APPRAISER), LOAN_VINANOVA)
    return next(c for c in view["conflicts"] if c["code"] == "dscr")


async def test_fields_have_page_and_highlight_for_two_way_link() -> None:
    async def body(svc: ReconciliationService) -> None:
        p = _P(CREDIT_APPRAISER)
        view = await svc.view(p, LOAN_VINANOVA)
        assert view["items"] and view["documents"] and "seed" in view["data_label"]
        detail = await svc.document(p, LOAN_VINANOVA, view["documents"][0]["document_id"])
        assert detail["fields"]
        for f in detail["fields"]:
            assert f["page_number"] and set(f["bounding_box"]) == {"x", "y", "w", "h"}

    await _run(CREDIT_APPRAISER, body)


async def test_dscr_conflict_shows_both_sources_and_resolution_is_logged() -> None:
    async def body(svc: ReconciliationService) -> None:
        conflict = await _dscr(svc)
        assert sorted(s["value"] for s in conflict["sources"]) == ["1,34", "1,76"]
        assert conflict["chosen_field_id"] is None
        chosen = conflict["sources"][1]
        with pytest.raises(ValidationError):
            await svc.resolve_conflict(_P(CREDIT_APPRAISER), LOAN_VINANOVA, conflict["conflict_id"],
                                       chosen_field_id=chosen["field_id"], reason="ngắn")
        await svc.resolve_conflict(_P(CREDIT_APPRAISER), LOAN_VINANOVA, conflict["conflict_id"],
                                   chosen_field_id=chosen["field_id"], reason="Dùng EBITDA đã kiểm toán")
        after = await _dscr(svc)
        assert after["chosen_field_id"] == chosen["field_id"]
        log = (await svc.log(_P(CREDIT_APPRAISER), LOAN_VINANOVA))["conflicts"]
        # nhật ký append-only nên có thể còn dòng của lần chạy trước: chỉ xét dòng vừa ghi
        first = [e for e in log if e["reason"] == "Dùng EBITDA đã kiểm toán"]
        assert len(first) == 1 and first[0]["old_value_text"] is None
        assert first[0]["new_value_text"] == chosen["value"] and first[0]["actor_name"]
        # số gốc không đổi
        assert [s["value"] for s in after["sources"]] == [s["value"] for s in conflict["sources"]]
        # chốt lại: giá trị cũ là lựa chọn trước
        other = conflict["sources"][0]
        await svc.resolve_conflict(_P(CREDIT_APPRAISER), LOAN_VINANOVA, conflict["conflict_id"],
                                   chosen_field_id=other["field_id"], reason="Quay lại số trên báo cáo")
        log = (await svc.log(_P(CREDIT_APPRAISER), LOAN_VINANOVA))["conflicts"]
        back = next(e for e in log if e["reason"] == "Quay lại số trên báo cáo")
        assert back["old_value_text"] == chosen["value"]

    await _run(CREDIT_APPRAISER, body)


@pytest.mark.parametrize("sql", [
    "UPDATE document.field_conflict_log SET reason = 'sua lai'",
    "DELETE FROM document.field_conflict_log",
    "TRUNCATE document.field_conflict_log",
    "UPDATE credit.checklist_check_log SET note = 'sua lai'",
    "DELETE FROM credit.checklist_check_log",
    "TRUNCATE credit.checklist_check_log",
])
async def test_logs_are_append_only(sql: str) -> None:
    async def body(svc: ReconciliationService) -> None:
        conflict = await _dscr(svc)
        await svc.resolve_conflict(_P(CREDIT_APPRAISER), LOAN_VINANOVA, conflict["conflict_id"],
                                   chosen_field_id=conflict["sources"][0]["field_id"], reason="Chốt thử nghiệm")
        s = svc._repo.session
        item = (await svc._repo.items(LOAN_VINANOVA))[0]
        await s.execute(text(
            "INSERT INTO credit.checklist_check_log (id, loan_application_id, checklist_item_id, requirement_code,"
            " actor_id, result, old_status, new_status) VALUES (gen_random_uuid(), :l, :i, :c, :a, 'PASS', 'RECEIVED', 'VALID')"
        ), {"l": LOAN_VINANOVA, "i": item["item_id"], "c": item["code"], "a": CREDIT_APPRAISER})
        with pytest.raises(DBAPIError):
            async with s.begin_nested():
                await s.execute(text(sql))

    await _run(CREDIT_APPRAISER, body)


async def test_transfer_locked_until_checklist_complete_then_goes_through_workflow() -> None:
    async def body(svc: ReconciliationService) -> None:
        p = _P(DOCUMENT_REVIEWER)
        view = await svc.view(p, LOAN_CHECKING)
        assert view["status"] == "CHECKING" and view["permissions"]["can_check"]
        assert view["transfer"]["visible"] and view["transfer"]["locked"] and view["transfer"]["reasons"]
        with pytest.raises(GateBlockedError):
            await svc.transfer(p, LOAN_CHECKING, expected_version=view["transfer"]["expected_version"], request_id=None)
        # FAIL cần lý do
        item = view["items"][0]
        with pytest.raises(ValidationError):
            await svc.check_item(p, LOAN_CHECKING, item["item_id"], result="FAIL", note=None)
        for it in view["items"]:
            if it["mandatory"]:
                await svc.check_item(p, LOAN_CHECKING, it["item_id"], result="PASS", note=None)
        view = await svc.view(p, LOAN_CHECKING)
        assert not view["transfer"]["locked"], view["transfer"]
        assert (await svc.log(p, LOAN_CHECKING))["checks"]
        result = await svc.transfer(p, LOAN_CHECKING, expected_version=view["transfer"]["expected_version"],
                                    request_id=None)
        assert result["status"] == "APPRAISAL"

    await _run(DOCUMENT_REVIEWER, body)


@pytest.mark.parametrize("employee", [CREDIT_OFFICER, DOCUMENT_REVIEWER, RISK_HO, COMPLIANCE_HO, APPROVER_HO, AUDITOR_HO, ADMIN_HO])
async def test_only_assigned_appraiser_can_resolve(employee: UUID) -> None:
    conflict = await _run(CREDIT_APPRAISER, _dscr)

    async def body(svc: ReconciliationService) -> None:
        with pytest.raises((AuthorizationError, NotFoundError)):
            await svc.resolve_conflict(_P(employee), LOAN_VINANOVA, conflict["conflict_id"],
                                       chosen_field_id=conflict["sources"][0]["field_id"], reason="Không có quyền")

    await _run(employee, body)


@pytest.mark.parametrize("employee", [CREDIT_OFFICER, CREDIT_APPRAISER, RISK_HO, COMPLIANCE_HO, APPROVER_HO, AUDITOR_HO, ADMIN_HO])
async def test_only_assigned_reviewer_can_check(employee: UUID) -> None:
    async def body(svc: ReconciliationService) -> None:
        item = (await svc._repo.items(LOAN_CHECKING))
        with pytest.raises((AuthorizationError, NotFoundError)):
            await svc.check_item(_P(employee), LOAN_CHECKING, item[0]["item_id"] if item else UUID(int=0),
                                 result="PASS", note=None)
        with pytest.raises((AuthorizationError, NotFoundError, GateBlockedError, PermissionError)):
            await svc.transfer(_P(employee), LOAN_CHECKING, expected_version=2, request_id=None)

    await _run(employee, body)
