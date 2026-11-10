"""GET /work-items logic on seed data, under RLS."""

from __future__ import annotations

import os
from uuid import UUID

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from tests.integration.seed_ids import (
    ADMIN_HO,
    APPROVER_HO,
    AUDITOR_HO,
    BRANCH_HN,
    BRANCH_HO,
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    DOCUMENT_REVIEWER,
    RISK_HO,
)

from app.db.rls_context import rls_transaction
from app.repositories.work_item_repository import WorkItemRepository
from app.services.work_item_service import WorkItemService

ROLES = {
    CREDIT_OFFICER: ({"credit_officer"}, BRANCH_HN),
    DOCUMENT_REVIEWER: ({"document_reviewer"}, BRANCH_HN),
    CREDIT_APPRAISER: ({"credit_appraiser"}, BRANCH_HO),
    RISK_HO: ({"risk_officer"}, BRANCH_HO),
    APPROVER_HO: ({"loan_approver"}, BRANCH_HO),
    COMPLIANCE_HO: ({"compliance_officer"}, BRANCH_HO),
    AUDITOR_HO: ({"auditor"}, BRANCH_HO),
    ADMIN_HO: ({"admin"}, BRANCH_HO),
}


class _P:
    def __init__(self, employee: UUID, perms: set[str]) -> None:
        self.employee_id = employee
        self.roles = frozenset(ROLES[employee][0])
        self.permissions = frozenset(perms)


async def _run(employee: UUID, filter_: str = "all"):  # type: ignore[no-untyped-def]
    dsn = os.environ.get("TEST_APP_DSN")
    if not dsn:
        pytest.skip("TEST_APP_DSN chua dat")
    engine = create_async_engine(dsn.replace("postgresql://", "postgresql+asyncpg://"))
    try:
        async with AsyncSession(engine) as session, rls_transaction(
            session, employee_id=employee, branch_id=ROLES[employee][1],
            is_admin=employee == ADMIN_HO,
        ):
            return await WorkItemService(WorkItemRepository(session)).list(
                _P(employee, {"loan:read"}), filter_=filter_
            )
    finally:
        await engine.dispose()


@pytest.mark.parametrize(
    ("employee", "badge"),
    [(CREDIT_OFFICER, 4), (DOCUMENT_REVIEWER, 3), (CREDIT_APPRAISER, 4), (RISK_HO, 2), (APPROVER_HO, 3)],
)
async def test_badge_and_mine_rows(employee, badge) -> None:  # type: ignore[no-untyped-def]
    result = await _run(employee)
    assert result.badge == badge
    assert sum(1 for i in result.items if i.mine) == badge


async def test_qhkh_rows_and_filter() -> None:
    result = await _run(CREDIT_OFFICER)
    by = {i.application_number: i for i in result.items}
    assert "DX-2026-00412" in by
    assert "ret" in by["HSV-2026-00201"].tags
    only = await _run(CREDIT_OFFICER, "bosung")
    assert [i.application_number for i in only.items] == ["HSV-2026-00196"]


async def test_risk_overdue() -> None:
    by = {i.application_number: i for i in (await _run(RISK_HO)).items}
    assert by["HSV-2026-00176"].sla_level == "over"


async def test_compliance_has_opinion_tasks_for_risk_review_loans() -> None:
    """L03: hồ sơ ở Ý kiến Rủi ro chưa có ý kiến Tuân thủ là việc của Tuân thủ."""
    result = await _run(COMPLIANCE_HO)
    mine = sorted(i.application_number for i in result.items if i.mine)
    assert mine == ["HSV-2026-00176", "HSV-2026-00181"]
    assert result.badge == 2


async def test_vinanova_flags() -> None:
    by = {i.application_number: i for i in (await _run(CREDIT_APPRAISER)).items}
    assert (by["HSV-2026-00187"].high_flags, by["HSV-2026-00187"].open_flags) == (4, 8)


async def test_auditor_read_only() -> None:
    result = await _run(AUDITOR_HO)
    assert result.badge == 0 and len(result.items) > 10  # kiểm toán đọc toàn hệ thống (L03)
    assert not any(i.mine for i in result.items)


async def test_admin_forbidden() -> None:
    dsn = os.environ.get("TEST_APP_DSN")
    if not dsn:
        pytest.skip("TEST_APP_DSN chua dat")
    with pytest.raises(PermissionError):
        await WorkItemService(None).list(_P(ADMIN_HO, set()))  # type: ignore[arg-type]
