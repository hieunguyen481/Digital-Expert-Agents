"""WorkflowService tren Postgres that (Task 9).

Du lieu dung bang ket noi migrator va COMMIT (WorkflowService chay qua
SQLAlchemy AsyncSession rieng dang nhap bank_app, moi lenh mot giao dich RLS nhu
mot request that), roi xoa trong ``finally``. Dong audit.audit_event chi them nen
o lai (khong co FK toi ho so). Khong test nao tao credit.loan_decision (chi them).
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

import asyncpg
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from tests.integration.seed_ids import (
    ADMIN_HO,
    APPROVER_HO,
    BRANCH_HN,
    CREDIT_OFFICER,
)

from app.auth.principal import CurrentPrincipal
from app.db.rls_context import rls_transaction
from app.exceptions import ConflictError
from app.repositories.audit_repository import AuditRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.services.audit_service import AuditService
from app.workflow import sla
from app.workflow.service import GateBlockedError, TransitionResult, WorkflowService

PRODUCT = UUID("40000000-0000-4000-8000-000000000001")


def _dsn(name: str) -> str:
    dsn = os.environ.get(name)
    if not dsn:
        pytest.skip(f"{name} chua dat; chay backend/scripts/test-integration.ps1")
    return dsn


@pytest_asyncio.fixture
async def mig() -> AsyncIterator[asyncpg.Connection]:
    conn = await asyncpg.connect(_dsn("TEST_MIGRATOR_DSN"))
    try:
        yield conn
    finally:
        await conn.close()


@pytest_asyncio.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    dsn = _dsn("TEST_APP_DSN").replace("postgresql://", "postgresql+asyncpg://", 1)
    eng = create_async_engine(dsn, pool_size=2, max_overflow=0)
    try:
        yield eng
    finally:
        await eng.dispose()


class Case:
    """Mot ho so test da commit; ``cleanup`` xoa moi dong lien quan."""

    def __init__(self, mig: asyncpg.Connection) -> None:
        self.mig = mig
        self.party_id = uuid4()
        self.customer_id = uuid4()
        self.loan_id = uuid4()
        self.document_id = uuid4()

    async def create(self, *, status: str = "DRAFT", cic: bool = True) -> Case:
        m = self.mig
        await m.execute(
            "INSERT INTO customer.party (id, party_type, display_name, status, created_at,"
            " updated_at) VALUES ($1, 'ORGANIZATION', 'Test T9', 'ACTIVE', now(), now())",
            self.party_id,
        )
        await m.execute(
            "INSERT INTO customer.customer (id, party_id, customer_number, home_branch_id,"
            " relationship_manager_id, kyc_status, status, created_at, updated_at)"
            " VALUES ($1, $2, $3, $4, $5, 'VERIFIED', 'ACTIVE', now(), now())",
            self.customer_id, self.party_id, f"T9-{self.customer_id}", BRANCH_HN, CREDIT_OFFICER,
        )
        await m.execute(
            "INSERT INTO credit.loan_application (id, application_number, primary_customer_id,"
            " product_id, requested_amount, currency, requested_term_months, loan_purpose,"
            " status, created_at, created_by, updated_at)"
            " VALUES ($1, $2, $3, $4, $5, 'VND', 12, 'WORKING_CAPITAL', $6, now(), $7, now())",
            self.loan_id, f"T9-{self.loan_id}", self.customer_id, PRODUCT,
            Decimal("5000000000"), status, CREDIT_OFFICER,
        )
        if cic:
            await m.execute(
                "INSERT INTO document.document (id, document_type, classification,"
                " verification_status, processing_status, created_by, created_at, updated_at)"
                " VALUES ($1, 'CIC_CONSENT', 'CONFIDENTIAL', 'VERIFIED', 'COMPLETED', $2,"
                " now(), now())",
                self.document_id, CREDIT_OFFICER,
            )
            await m.execute(
                "INSERT INTO banking.cic_consent (id, customer_id, document_id, signed_on,"
                " confirmed_by, confirmed_at) VALUES ($1, $2, $3, CURRENT_DATE, $4, now())",
                uuid4(), self.customer_id, self.document_id, CREDIT_OFFICER,
            )
            await m.execute(
                "INSERT INTO banking.credit_report (id, customer_id, provider, requested_at,"
                " report_as_of_date, created_at, valid_until, source)"
                " VALUES ($1, $2, 'CIC', now(), CURRENT_DATE, now(), CURRENT_DATE + 29,"
                " 'SIMULATED')",
                uuid4(), self.customer_id,
            )
        return self

    async def add_step(
        self, step_code: str, assignee: UUID, *, completed: bool = False, result: str | None = None
    ) -> None:
        await self.mig.execute(
            "INSERT INTO credit.case_step (id, loan_application_id, step_code,"
            " assignee_employee_id, received_at, due_at, completed_at, result, created_by,"
            " created_at) VALUES ($1, $2, $3, $4, now() - interval '1 day',"
            " credit.add_workdays(now(), 2), CASE WHEN $5 THEN now() END, $6, $7, now())",
            uuid4(), self.loan_id, step_code, assignee, completed, result, CREDIT_OFFICER,
        )

    async def cleanup(self) -> None:
        m = self.mig
        await m.execute("DELETE FROM credit.case_step WHERE loan_application_id = $1", self.loan_id)
        await m.execute("DELETE FROM banking.credit_report WHERE customer_id = $1", self.customer_id)
        await m.execute("DELETE FROM banking.cic_consent WHERE customer_id = $1", self.customer_id)
        await m.execute("DELETE FROM document.document WHERE id = $1", self.document_id)
        await m.execute("DELETE FROM credit.loan_application WHERE id = $1", self.loan_id)
        await m.execute("DELETE FROM customer.customer WHERE id = $1", self.customer_id)
        await m.execute("DELETE FROM customer.party WHERE id = $1", self.party_id)


@pytest_asyncio.fixture
async def case(mig: asyncpg.Connection) -> AsyncIterator[Case]:
    created = Case(mig)
    try:
        yield created
    finally:
        await created.cleanup()


async def principal(mig: asyncpg.Connection, employee_id: UUID) -> CurrentPrincipal:
    branch = await mig.fetchval("SELECT branch_id FROM identity.employee WHERE id = $1", employee_id)
    roles = await mig.fetch(
        "SELECT r.role_code::text AS code FROM identity.employee_role er"
        " JOIN identity.role r ON r.id = er.role_id WHERE er.employee_id = $1",
        employee_id,
    )
    codes = frozenset(r["code"] for r in roles)
    return CurrentPrincipal(
        employee_id=employee_id,
        subject=str(employee_id),
        branch_id=branch,
        roles=codes,
        permissions=frozenset({"loan:read"}),
        is_admin="admin" in codes,
    )


async def transition(
    engine: AsyncEngine, who: CurrentPrincipal, loan_id: UUID, action: str, version: int, **kw: Any
) -> TransitionResult:
    async with (
        AsyncSession(engine) as session,
        rls_transaction(session, who.employee_id, who.branch_id, who.is_admin),
    ):
        service = WorkflowService(WorkflowRepository(session), AuditService(AuditRepository(session)))
        return await service.transition(who, loan_id, action, expected_version=version, **kw)


async def loan_row(mig: asyncpg.Connection, loan_id: UUID) -> asyncpg.Record:
    return await mig.fetchrow(
        "SELECT status, version FROM credit.loan_application WHERE id = $1", loan_id
    )


async def open_step(mig: asyncpg.Connection, loan_id: UUID, code: str) -> asyncpg.Record:
    return await mig.fetchrow(
        "SELECT * FROM credit.case_step WHERE loan_application_id = $1 AND step_code = $2"
        " AND completed_at IS NULL",
        loan_id, code,
    )


async def clock(mig: asyncpg.Connection) -> tuple[datetime, frozenset[date]]:
    now = await mig.fetchval("SELECT now()")
    days = await mig.fetch("SELECT day FROM credit.holiday")
    return now, frozenset(r["day"] for r in days)


async def audit_count(mig: asyncpg.Connection, loan_id: UUID) -> int:
    return await mig.fetchval(
        "SELECT count(*) FROM audit.audit_event WHERE loan_application_id = $1"
        " AND action LIKE 'WORKFLOW_%'",
        loan_id,
    )


async def test_checking_appraisal_pending_info_round_trip(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create()
    rm = await principal(mig, CREDIT_OFFICER)

    # QHKH gui HTTD: buoc CHECKING 2 ngay LV.
    r1 = await transition(engine, rm, case.loan_id, "submit_to_checking", 1)
    _, holidays = await clock(mig)
    checking = await open_step(mig, case.loan_id, "CHECKING")
    assert r1.status == "CHECKING" and r1.step_code == "CHECKING"
    assert r1.assignee_employee_id == checking["assignee_employee_id"]
    assert checking["due_at"] == sla.add_workdays(checking["received_at"], 2, holidays)
    assert await audit_count(mig, case.loan_id) == 1

    # HTTD chuyen Tham dinh: buoc APPRAISAL 5 ngay LV, CHECKING dong.
    httd = await principal(mig, r1.assignee_employee_id)
    r2 = await transition(engine, httd, case.loan_id, "pass_to_appraisal", 2)
    appraisal = await open_step(mig, case.loan_id, "APPRAISAL")
    assert r2.status == "APPRAISAL"
    assert appraisal["due_at"] == sla.add_workdays(appraisal["received_at"], 5, holidays)
    assert await open_step(mig, case.loan_id, "CHECKING") is None

    # Gia lap da dung 2 ngay: con 3 ngay LV toi han.
    await mig.execute(
        "UPDATE credit.case_step SET due_at = credit.add_workdays(now(), 3) WHERE id = $1",
        appraisal["id"],
    )
    due_before = await mig.fetchval("SELECT due_at FROM credit.case_step WHERE id = $1", appraisal["id"])

    # Tham dinh yeu cau bo sung: SLA tam dung, buoc PENDING_INFO 5 ngay LV tu ngay yeu cau.
    appraiser = await principal(mig, r2.assignee_employee_id)
    r3 = await transition(engine, appraiser, case.loan_id, "request_info", 3, reason="Thieu sao ke")
    paused = await mig.fetchrow("SELECT * FROM credit.case_step WHERE id = $1", appraisal["id"])
    pending = await open_step(mig, case.loan_id, "PENDING_INFO")
    remaining = sla.workdays_between(
        paused["paused_at"].astimezone(sla.TZ).date(), due_before.astimezone(sla.TZ).date(), holidays
    )
    assert r3.status == "APPRAISAL_PENDING_INFO"
    assert paused["paused_at"] is not None and paused["completed_at"] is None
    assert paused["remaining_workdays"] == remaining
    assert pending["due_at"] == sla.add_workdays(pending["received_at"], 5, holidays)
    assert pending["assignee_employee_id"] == r1.assignee_employee_id  # cung HTTD

    # F7: HTTD ghi dat -> SLA Tham dinh tinh tiep so ngay con lai tu luc nay.
    r4 = await transition(engine, httd, case.loan_id, "accept_info", 4)
    resumed = await mig.fetchrow("SELECT * FROM credit.case_step WHERE id = $1", appraisal["id"])
    assert r4.status == "APPRAISAL" and r4.step_code == "APPRAISAL"
    assert resumed["resumed_at"] is not None
    assert resumed["due_at"] == sla.add_workdays(resumed["resumed_at"], remaining, holidays)
    assert r4.due_at == resumed["due_at"]
    assert await open_step(mig, case.loan_id, "PENDING_INFO") is None
    assert tuple(await loan_row(mig, case.loan_id)) == ("APPRAISAL", 5)
    # Moi chuyen buoc mot dong nhat ky.
    assert await audit_count(mig, case.loan_id) == 4

    # Trinh Rui ro bi chan boi REPORT_MISSING cho toi Ke hoach 5.
    with pytest.raises(GateBlockedError) as blocked:
        await transition(engine, appraiser, case.loan_id, "submit_to_risk", 5)
    assert blocked.value.blockers == ("REPORT_MISSING",)
    assert await audit_count(mig, case.loan_id) == 4


async def test_rm_submit_gate_blocks_without_consent(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(cic=False)
    rm = await principal(mig, CREDIT_OFFICER)
    with pytest.raises(GateBlockedError) as blocked:
        await transition(engine, rm, case.loan_id, "submit_to_checking", 1)
    assert blocked.value.blockers == ("CIC_EXPIRED_NO_EXCEPTION", "CONSENT_MISSING")
    assert tuple(await loan_row(mig, case.loan_id)) == ("DRAFT", 1)


async def test_excluded_approver_cannot_decide(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPROVAL")
    # Nguoi duyet tung nhan buoc Kiem tra cua chinh ho so nay (E8).
    await case.add_step("CHECKING", APPROVER_HO, completed=True, result="PASSED")
    await case.add_step("APPROVAL", APPROVER_HO)
    approver = await principal(mig, APPROVER_HO)
    with pytest.raises(PermissionError):
        await transition(
            engine, approver, case.loan_id, "decide", 1,
            reason="Dong y", params={"decision_type": "REJECTED"},
        )
    assert tuple(await loan_row(mig, case.loan_id)) == ("APPROVAL", 1)
    assert await mig.fetchval(
        "SELECT count(*) FROM credit.loan_decision WHERE loan_application_id = $1", case.loan_id
    ) == 0


@pytest.mark.parametrize("action", ["submit_to_checking", "withdraw", "decide", "fraud_hold"])
async def test_admin_cannot_run_any_action(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case, action: str
) -> None:
    await case.create()
    admin = await principal(mig, ADMIN_HO)
    assert admin.is_admin
    with pytest.raises(PermissionError):
        await transition(engine, admin, case.loan_id, action, 1, reason="x")


async def test_admin_cannot_call_apply_transition_directly(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create()
    admin = await principal(mig, ADMIN_HO)
    async with AsyncSession(engine) as session, rls_transaction(session, admin.employee_id, admin.branch_id, True):
        with pytest.raises(PermissionError):
            await WorkflowRepository(session).apply_transition(
                case.loan_id, action="submit_to_checking", expected_version=1,
                from_status="DRAFT", to_status="CHECKING", reason=None,
                new_assignee=None, new_due_at=None, remaining_workdays=None,
                approval_tier=None, withdraw_kind=None,
            )


async def test_database_rejects_skipped_checks(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    """Goi thang ham SQL: khong nhay buoc, khong tu dat han / nguoi nhan."""
    await case.create()
    rm = await principal(mig, CREDIT_OFFICER)
    async with AsyncSession(engine) as session, rls_transaction(session, rm.employee_id, rm.branch_id):
        repo = WorkflowRepository(session)
        assignee = await repo.pick_role_assignee(case.loan_id, "CHECKING", "document_reviewer")
        base = {
            "expected_version": 1, "from_status": "DRAFT", "reason": None, "new_assignee": assignee,
            "new_due_at": None, "remaining_workdays": None, "approval_tier": None, "withdraw_kind": None,
        }
        # Han sai (NULL thay vi +2 ngay LV) bi tu choi.
        with pytest.raises(ValueError):
            await repo.apply_transition(
                case.loan_id, action="submit_to_checking", to_status="CHECKING", **base
            )
    async with AsyncSession(engine) as session, rls_transaction(session, rm.employee_id, rm.branch_id):
        # QHKH khong duoc tu nhay DRAFT -> APPROVED.
        with pytest.raises((ValueError, PermissionError)):
            await WorkflowRepository(session).apply_transition(
                case.loan_id, action="decide", to_status="APPROVED", **base
            )
    assert tuple(await loan_row(mig, case.loan_id)) == ("DRAFT", 1)


async def test_withdraw_rejected_during_fraud_hold(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="RISK_HOLD_FRAUD")
    rm = await principal(mig, CREDIT_OFFICER)
    with pytest.raises(ConflictError) as error:
        await transition(
            engine, rm, case.loan_id, "withdraw", 1,
            reason="Khach rut", params={"withdraw_kind": "CUSTOMER"},
        )
    assert error.value.code == "INVALID_STATE_TRANSITION"
    # Database cung chan (Q-N: khong cho rut khi dang xu ly dau hieu gian lan).
    async with AsyncSession(engine) as session, rls_transaction(session, rm.employee_id, rm.branch_id):
        with pytest.raises((ValueError, PermissionError)):
            await WorkflowRepository(session).apply_transition(
                case.loan_id, action="withdraw", expected_version=1,
                from_status="RISK_HOLD_FRAUD", to_status="WITHDRAWN", reason="Khach rut",
                new_assignee=None, new_due_at=None, remaining_workdays=None,
                approval_tier=None, withdraw_kind="CUSTOMER",
            )
    assert tuple(await loan_row(mig, case.loan_id)) == ("RISK_HOLD_FRAUD", 1)


async def test_concurrent_transition_one_wins(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    """Review Focus 4: hai ket noi cung expected_version, dung mot thanh cong."""
    await case.create()
    rm = await principal(mig, CREDIT_OFFICER)
    first_applied = asyncio.Event()
    release_first = asyncio.Event()

    async def first() -> TransitionResult:
        async with AsyncSession(engine) as session, rls_transaction(session, rm.employee_id, rm.branch_id):
            service = WorkflowService(
                WorkflowRepository(session), AuditService(AuditRepository(session))
            )
            result = await service.transition(
                rm, case.loan_id, "submit_to_checking", expected_version=1
            )
            first_applied.set()
            await release_first.wait()  # giu khoa dong ho so toi khi commit
        return result

    async def second() -> TransitionResult:
        await first_applied.wait()
        # Doc phien ban 1 (lan dau chua commit) roi cho khoa trong apply_transition.
        return await transition(engine, rm, case.loan_id, "submit_to_checking", 1)

    async def releaser() -> None:
        await first_applied.wait()
        await asyncio.sleep(1.0)
        release_first.set()

    results = await asyncio.gather(first(), second(), releaser(), return_exceptions=True)
    outcomes = results[:2]
    winners = [r for r in outcomes if isinstance(r, TransitionResult)]
    losers = [r for r in outcomes if isinstance(r, ConflictError)]
    assert len(winners) == 1 and len(losers) == 1, outcomes
    assert losers[0].code == "VERSION_CONFLICT"
    assert tuple(await loan_row(mig, case.loan_id)) == ("CHECKING", 2)
    assert await mig.fetchval(
        "SELECT count(*) FROM credit.case_step WHERE loan_application_id = $1", case.loan_id
    ) == 1
