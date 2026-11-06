"""WorkflowService tren Postgres that (Task 9).

Du lieu dung bang ket noi migrator va COMMIT (WorkflowService chay qua
SQLAlchemy AsyncSession rieng dang nhap bank_app, moi lenh mot giao dich RLS nhu
mot request that), roi xoa trong ``finally``. Dong audit.audit_event chi them nen
o lai (khong co FK toi ho so). credit.loan_decision chi them (trigger), nen
``cleanup`` tat trigger trong mot giao dich migrator de xoa dong cua test.
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
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    DOCUMENT_REVIEWER,
    RISK_HO,
)

from app.auth.principal import CurrentPrincipal
from app.db.rls_context import rls_transaction
from app.exceptions import ConflictError
from app.repositories.audit_repository import AuditRepository
from app.repositories.loan_repository import LoanRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.services.audit_service import AuditService
from app.services.loan_service import LoanService
from app.workflow import sla
from app.workflow.gates import evaluate
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
        self.extra_documents: list[UUID] = []

    async def create(
        self, *, status: str = "DRAFT", cic: bool = True, amount: Decimal = Decimal("5000000000")
    ) -> Case:
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
            amount, status, CREDIT_OFFICER,
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
        """Buoc nhan hom qua, han = +2 ngay LV tu hom nay."""
        await self.mig.execute(
            "INSERT INTO credit.case_step (id, loan_application_id, step_code,"
            " assignee_employee_id, received_at, due_at, completed_at, result, created_by,"
            " created_at) VALUES ($1, $2, $3, $4, now() - interval '1 day',"
            " credit.add_workdays(now(), 2), CASE WHEN $5 THEN now() END, $6, $7, now())",
            uuid4(), self.loan_id, step_code, assignee, completed, result, CREDIT_OFFICER,
        )

    async def add_checklist_item(
        self, code: str, document_type: str, status: str, *, document_id: UUID | None = None
    ) -> None:
        await self.mig.execute(
            "INSERT INTO credit.loan_checklist_item (id, loan_application_id, requirement_code,"
            " document_type, requirement_status, mandatory_level, linked_document_id,"
            " created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 'MANDATORY', $6, now(), now())",
            uuid4(), self.loan_id, code, document_type, status, document_id,
        )

    async def add_document(self, document_type: str, *, issued_days_ago: int) -> UUID:
        document_id = uuid4()
        await self.mig.execute(
            "INSERT INTO document.document (id, document_type, classification,"
            " verification_status, processing_status, created_by, created_at, updated_at,"
            " issued_date) VALUES ($1, $2, 'CONFIDENTIAL', 'VERIFIED', 'COMPLETED', $3,"
            " now(), now(), CURRENT_DATE - $4::int)",
            document_id, document_type, CREDIT_OFFICER, issued_days_ago,
        )
        self.extra_documents.append(document_id)
        return document_id

    async def add_exception(self, code: str) -> None:
        await self.mig.execute(
            "INSERT INTO credit.case_exception (id, loan_application_id, checklist_code, kind,"
            " reason, proposed_by, proposed_at) VALUES ($1, $2, $3, 'DOCUMENT', 'De xuat', $4,"
            " now())",
            uuid4(), self.loan_id, code, CREDIT_OFFICER,
        )

    async def cleanup(self) -> None:
        m = self.mig
        async with m.transaction():
            await m.execute(
                "ALTER TABLE credit.loan_decision DISABLE TRIGGER trg_loan_decision_append_only"
            )
            await m.execute(
                "DELETE FROM credit.loan_decision WHERE loan_application_id = $1", self.loan_id
            )
            await m.execute(
                "ALTER TABLE credit.loan_decision ENABLE TRIGGER trg_loan_decision_append_only"
            )
        await m.execute("DELETE FROM credit.case_flag WHERE loan_application_id = $1", self.loan_id)
        await m.execute(
            "DELETE FROM credit.case_exception WHERE loan_application_id = $1", self.loan_id
        )
        await m.execute(
            "DELETE FROM credit.loan_checklist_item WHERE loan_application_id = $1", self.loan_id
        )
        await m.execute(
            "DELETE FROM identity.employee_scope WHERE scope_type = 'LOAN_APPLICATION'"
            " AND scope_id = $1",
            self.loan_id,
        )
        await m.execute("DELETE FROM credit.case_step WHERE loan_application_id = $1", self.loan_id)
        await m.execute("DELETE FROM banking.credit_report WHERE customer_id = $1", self.customer_id)
        await m.execute("DELETE FROM banking.cic_consent WHERE customer_id = $1", self.customer_id)
        await m.execute("DELETE FROM document.document WHERE id = $1", self.document_id)
        await m.execute("DELETE FROM document.document WHERE id = ANY($1::uuid[])", self.extra_documents)
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


# ---------------------------------------------------------------------------
# Vong sua 1: moi nhanh SQL con lai chay tren Postgres that
# ---------------------------------------------------------------------------


async def step_by_id(mig: asyncpg.Connection, step_id: UUID) -> asyncpg.Record:
    return await mig.fetchrow("SELECT * FROM credit.case_step WHERE id = $1", step_id)


async def closed_step(mig: asyncpg.Connection, loan_id: UUID, code: str) -> asyncpg.Record:
    return await mig.fetchrow(
        "SELECT * FROM credit.case_step WHERE loan_application_id = $1 AND step_code = $2"
        " AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1",
        loan_id, code,
    )


async def audit_actions(mig: asyncpg.Connection, loan_id: UUID) -> list[str]:
    rows = await mig.fetch(
        "SELECT action FROM audit.audit_event WHERE loan_application_id = $1"
        " ORDER BY event_time, created_at, action",
        loan_id,
    )
    return [r["action"] for r in rows]


async def holidays_of(mig: asyncpg.Connection) -> frozenset[date]:
    return (await clock(mig))[1]


def vn_date(moment: datetime) -> date:
    return moment.astimezone(sla.TZ).date()


async def test_submit_to_approval_routes_to_individual_approver(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="RISK_REVIEW")
    await case.add_step("RISK_REVIEW", RISK_HO)
    holidays = await holidays_of(mig)
    risk = await principal(mig, RISK_HO)
    result = await transition(engine, risk, case.loan_id, "submit_to_approval", 1)
    approval = await open_step(mig, case.loan_id, "APPROVAL")
    assert result.status == "APPROVAL" and result.step_code == "APPROVAL"
    assert result.assignee_employee_id == approval["assignee_employee_id"]
    # Tong 5 ty -> cap 1: nguoi co tham quyen cap 1 cung chi nhanh HN (hoac cap tren).
    authority = await mig.fetchrow(
        "SELECT tier, branch_id FROM identity.employee_authority WHERE employee_id = $1",
        result.assignee_employee_id,
    )
    assert authority["tier"] > 1 or authority["branch_id"] == BRANCH_HN
    assert approval["due_at"] == sla.add_workdays(approval["received_at"], 2, holidays)
    assert result.due_at == approval["due_at"]
    loan = await mig.fetchrow(
        "SELECT status, version, approval_tier, submitted_at FROM credit.loan_application"
        " WHERE id = $1",
        case.loan_id,
    )
    assert (loan["status"], loan["version"], loan["approval_tier"]) == ("APPROVAL", 2, 1)
    assert loan["submitted_at"] == approval["received_at"]
    assert (await closed_step(mig, case.loan_id, "RISK_REVIEW"))["result"] == "SUBMITTED"
    assert await audit_actions(mig, case.loan_id) == ["WORKFLOW_SUBMIT_TO_APPROVAL"]


async def test_submit_to_approval_above_100_billion_goes_to_council(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="RISK_REVIEW", amount=Decimal("150000000000"))
    await case.add_step("RISK_REVIEW", RISK_HO)
    risk = await principal(mig, RISK_HO)
    result = await transition(engine, risk, case.loan_id, "submit_to_approval", 1)
    council = await open_step(mig, case.loan_id, "COUNCIL_SESSION")
    assert (result.status, result.step_code) == ("COUNCIL_SESSION", "COUNCIL_SESSION")
    assert result.assignee_employee_id is None and result.due_at is None
    assert council["assignee_employee_id"] is None and council["due_at"] is None
    loan = await mig.fetchrow(
        "SELECT status, approval_tier FROM credit.loan_application WHERE id = $1", case.loan_id
    )
    assert (loan["status"], loan["approval_tier"]) == ("COUNCIL_SESSION", 3)
    assert await audit_actions(mig, case.loan_id) == ["WORKFLOW_SUBMIT_TO_APPROVAL"]


async def test_decide_through_loan_service(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPROVAL")
    await case.add_step("APPROVAL", APPROVER_HO)
    approver = await principal(mig, APPROVER_HO)
    approver = CurrentPrincipal(
        employee_id=approver.employee_id, subject=approver.subject, branch_id=approver.branch_id,
        roles=approver.roles, permissions=frozenset({"loan:read", "loan:approve"}),
    )
    async with (
        AsyncSession(engine) as session,
        rls_transaction(session, approver.employee_id, approver.branch_id),
    ):
        audit = AuditService(AuditRepository(session))
        loans = LoanService(
            LoanRepository(session), audit, None, WorkflowService(WorkflowRepository(session), audit)
        )
        row = await loans.decide(
            approver, case.loan_id, decision_type="APPROVED",
            approved_amount=Decimal("5000000000"), approved_term_months=12, conditions=[],
            rationale="Du dieu kien", approval_request_id=None, is_override=False,
            override_reason=None,
        )
    assert row["decision_type"] == "APPROVED"
    assert row["decision_maker_id"] == APPROVER_HO
    assert tuple(await loan_row(mig, case.loan_id)) == ("APPROVED", 2)
    approval = await closed_step(mig, case.loan_id, "APPROVAL")
    assert (approval["result"], approval["reason"]) == ("APPROVED", "Du dieu kien")
    assert await open_step(mig, case.loan_id, "APPROVAL") is None
    assert sorted(await audit_actions(mig, case.loan_id)) == [
        "LOAN_DECISION_CREATED", "WORKFLOW_DECIDE",
    ]


@pytest.mark.parametrize(
    ("target", "step_code", "assignee"),
    [("APPRAISAL", "APPRAISAL", CREDIT_APPRAISER), ("RETURNED_TO_RM", "RM_REWORK", CREDIT_OFFICER)],
)
async def test_return_for_supplement(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case,
    target: str, step_code: str, assignee: UUID,
) -> None:
    await case.create(status="APPROVAL")
    await case.add_step("APPRAISAL", CREDIT_APPRAISER, completed=True, result="SUBMITTED")
    await case.add_step("APPROVAL", APPROVER_HO)
    holidays = await holidays_of(mig)
    approver = await principal(mig, APPROVER_HO)
    result = await transition(
        engine, approver, case.loan_id, "return_for_supplement", 1,
        reason="Bo sung phuong an", params={"target": target},
    )
    new_step = await open_step(mig, case.loan_id, step_code)
    assert (result.status, result.step_code) == (target, step_code)
    assert result.assignee_employee_id == assignee == new_step["assignee_employee_id"]
    assert new_step["due_at"] == sla.add_workdays(new_step["received_at"], 5, holidays)
    assert new_step["created_by"] == APPROVER_HO
    assert (await closed_step(mig, case.loan_id, "APPROVAL"))["result"] == "RETURN_FOR_SUPPLEMENT"
    decision = await mig.fetchrow(
        "SELECT decision_type, decision_maker_id, rationale FROM credit.loan_decision"
        " WHERE loan_application_id = $1",
        case.loan_id,
    )
    assert tuple(decision) == ("RETURN_FOR_SUPPLEMENT", APPROVER_HO, "Bo sung phuong an")
    assert await audit_actions(mig, case.loan_id) == ["WORKFLOW_RETURN_FOR_SUPPLEMENT"]
    # Q-O: nguoi da tra lai van duoc duyet khi ho so quay lai.
    assert await mig.fetchval("SELECT credit.is_excluded($1, $2)", APPROVER_HO, case.loan_id) is False


async def enter_risk_review(engine: AsyncEngine, mig: asyncpg.Connection, case: Case) -> None:
    """Dua ho so APPRAISAL vao RISK_REVIEW bang chinh credit.apply_transition.

    Cong appraisal_submit cua WorkflowService luon chan REPORT_MISSING toi Ke hoach 5,
    nen tham dinh vien goi thang ham SQL (cong Python khong nam trong ham; moi kiem
    tra cua ham - vai tro, quyen ghi, phien ban, nguoi nhan, han - van chay), dung
    nguoi nhan va han tinh nhu WorkflowService.
    """
    await case.add_step("APPRAISAL", CREDIT_APPRAISER)
    appraiser = await principal(mig, CREDIT_APPRAISER)
    async with (
        AsyncSession(engine) as session,
        rls_transaction(session, appraiser.employee_id, appraiser.branch_id),
    ):
        repo = WorkflowRepository(session)
        now = await repo.db_now()
        due = sla.add_workdays(now, await repo.sla_workdays("RISK_REVIEW"), await repo.holidays())
        risk = await repo.pick_role_assignee(case.loan_id, "RISK_REVIEW", "risk_officer")
        await repo.apply_transition(
            case.loan_id, action="submit_to_risk", expected_version=1, from_status="APPRAISAL",
            to_status="RISK_REVIEW", reason=None, new_assignee=risk, new_due_at=due,
            remaining_workdays=None, approval_tier=None, withdraw_kind=None,
        )


async def compliance_scopes(mig: asyncpg.Connection, loan_id: UUID) -> list[asyncpg.Record]:
    return await mig.fetch(
        "SELECT employee_id, permission_code::text AS permission, assigned_by, reason"
        " FROM identity.employee_scope WHERE scope_type = 'LOAN_APPLICATION' AND scope_id = $1",
        loan_id,
    )


async def test_entering_risk_review_grants_compliance_read(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    compliance = await principal(mig, COMPLIANCE_HO)
    # Truoc khi vao Y kien Rui ro, Tuan thu khong doc duoc ho so.
    with pytest.raises(LookupError):
        await transition(engine, compliance, case.loan_id, "fraud_hold", 1, reason="x")
    await enter_risk_review(engine, mig, case)
    scopes = await compliance_scopes(mig, case.loan_id)
    assert [tuple(r)[:3] for r in scopes] == [(COMPLIANCE_HO, "loan:read", CREDIT_APPRAISER)]
    assert "submit_to_risk" in scopes[0]["reason"]
    assert (await open_step(mig, case.loan_id, "RISK_REVIEW"))["assignee_employee_id"] == RISK_HO
    async with (
        AsyncSession(engine) as session,
        rls_transaction(session, compliance.employee_id, compliance.branch_id),
    ):
        loan = await WorkflowRepository(session).get_loan(case.loan_id)
    assert loan is not None and loan["status"] == "RISK_REVIEW"


@pytest.mark.parametrize("actor", [RISK_HO, COMPLIANCE_HO])
async def test_risk_return_resets_appraisal_to_five_workdays(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case, actor: UUID
) -> None:
    await case.create(status="APPRAISAL")
    await enter_risk_review(engine, mig, case)  # Tuan thu doc duoc, khong giu buoc RISK_REVIEW
    holidays = await holidays_of(mig)
    who = await principal(mig, actor)
    result = await transition(engine, who, case.loan_id, "risk_return", 2, reason="Sai DSCR")
    appraisal = await open_step(mig, case.loan_id, "APPRAISAL")
    assert (result.status, result.step_code) == ("APPRAISAL", "APPRAISAL")
    assert result.assignee_employee_id == CREDIT_APPRAISER == appraisal["assignee_employee_id"]
    assert appraisal["due_at"] == sla.add_workdays(appraisal["received_at"], 5, holidays)
    assert result.due_at == appraisal["due_at"]
    risk = await closed_step(mig, case.loan_id, "RISK_REVIEW")
    assert (risk["result"], risk["reason"]) == ("RETURNED", "Sai DSCR")
    assert await audit_actions(mig, case.loan_id) == ["WORKFLOW_RISK_RETURN"]


async def test_compliance_request_and_accept_explanation(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await case.add_step("CHECKING", DOCUMENT_REVIEWER, completed=True, result="PASSED")
    await enter_risk_review(engine, mig, case)
    holidays = await holidays_of(mig)
    risk_step = await open_step(mig, case.loan_id, "RISK_REVIEW")

    compliance = await principal(mig, COMPLIANCE_HO)
    r1 = await transition(
        engine, compliance, case.loan_id, "request_explanation", 2, reason="Chua du can cu cickh"
    )
    paused = await step_by_id(mig, risk_step["id"])
    pending = await open_step(mig, case.loan_id, "RISK_PENDING_INFO")
    remaining = sla.workdays_between(vn_date(paused["paused_at"]), vn_date(risk_step["due_at"]), holidays)
    assert (r1.status, r1.step_code) == ("RISK_PENDING_INFO", "RISK_REVIEW")
    assert r1.assignee_employee_id == RISK_HO
    assert paused["completed_at"] is None and paused["remaining_workdays"] == remaining
    assert pending["assignee_employee_id"] == DOCUMENT_REVIEWER
    assert pending["due_at"] == sla.add_workdays(pending["received_at"], 5, holidays)

    httd = await principal(mig, DOCUMENT_REVIEWER)
    r2 = await transition(engine, httd, case.loan_id, "accept_explanation", 3)
    resumed = await step_by_id(mig, risk_step["id"])
    assert (r2.status, r2.step_code, r2.assignee_employee_id) == ("RISK_REVIEW", "RISK_REVIEW", RISK_HO)
    assert resumed["due_at"] == sla.add_workdays(resumed["resumed_at"], remaining, holidays)
    assert r2.due_at == resumed["due_at"]
    assert (await closed_step(mig, case.loan_id, "RISK_PENDING_INFO"))["result"] == "ACCEPTED"
    assert tuple(await loan_row(mig, case.loan_id)) == ("RISK_REVIEW", 4)
    assert await audit_actions(mig, case.loan_id) == [
        "WORKFLOW_REQUEST_EXPLANATION", "WORKFLOW_ACCEPT_EXPLANATION",
    ]
    # Quay lai RISK_REVIEW khong cap them pham vi (idempotent).
    assert [r["employee_id"] for r in await compliance_scopes(mig, case.loan_id)] == [COMPLIANCE_HO]


async def test_compliance_fraud_hold_then_release_keeps_remaining_days(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await enter_risk_review(engine, mig, case)
    holidays = await holidays_of(mig)
    risk_step = await open_step(mig, case.loan_id, "RISK_REVIEW")
    compliance = await principal(mig, COMPLIANCE_HO)

    r1 = await transition(engine, compliance, case.loan_id, "fraud_hold", 2, reason="Dau hieu gia mao")
    held = await step_by_id(mig, risk_step["id"])
    remaining = sla.workdays_between(vn_date(held["paused_at"]), vn_date(risk_step["due_at"]), holidays)
    hold = await open_step(mig, case.loan_id, "FRAUD_HOLD")
    assert (r1.status, r1.step_code, r1.assignee_employee_id, r1.due_at) == (
        "RISK_HOLD_FRAUD", "FRAUD_HOLD", COMPLIANCE_HO, None,
    )
    assert (held["result"], held["remaining_workdays"]) == ("FRAUD_HOLD", remaining)
    assert held["completed_at"] is not None
    assert hold["assignee_employee_id"] == COMPLIANCE_HO and hold["due_at"] is None

    r2 = await transition(engine, compliance, case.loan_id, "fraud_release", 3, reason="Da xu ly xong")
    review = await open_step(mig, case.loan_id, "RISK_REVIEW")
    assert (r2.status, r2.step_code, r2.assignee_employee_id) == ("RISK_REVIEW", "RISK_REVIEW", RISK_HO)
    assert review["assignee_employee_id"] == RISK_HO
    assert review["due_at"] == sla.add_workdays(review["received_at"], remaining, holidays)
    assert review["resumed_at"] == review["received_at"]
    assert (await closed_step(mig, case.loan_id, "FRAUD_HOLD"))["result"] == "RELEASED"
    assert tuple(await loan_row(mig, case.loan_id)) == ("RISK_REVIEW", 4)
    assert await audit_actions(mig, case.loan_id) == ["WORKFLOW_FRAUD_HOLD", "WORKFLOW_FRAUD_RELEASE"]
    assert [r["employee_id"] for r in await compliance_scopes(mig, case.loan_id)] == [COMPLIANCE_HO]


async def test_compliance_without_read_access_cannot_act(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    # Ho so dat thang vao RISK_REVIEW (khong qua apply_transition): khong co pham vi Tuan thu.
    await case.create(status="RISK_REVIEW")
    await case.add_step("RISK_REVIEW", RISK_HO)
    compliance = await principal(mig, COMPLIANCE_HO)
    with pytest.raises(LookupError):
        await transition(engine, compliance, case.loan_id, "fraud_hold", 1, reason="x")
    assert tuple(await loan_row(mig, case.loan_id)) == ("RISK_REVIEW", 1)


async def test_return_to_rm_opens_rework_for_rm(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="CHECKING")
    await case.add_step("CHECKING", DOCUMENT_REVIEWER)
    holidays = await holidays_of(mig)
    httd = await principal(mig, DOCUMENT_REVIEWER)
    result = await transition(engine, httd, case.loan_id, "return_to_rm", 1, reason="Sai de xuat")
    rework = await open_step(mig, case.loan_id, "RM_REWORK")
    assert (result.status, result.step_code) == ("RETURNED_TO_RM", "RM_REWORK")
    assert result.assignee_employee_id == CREDIT_OFFICER == rework["assignee_employee_id"]
    assert rework["due_at"] == sla.add_workdays(rework["received_at"], 5, holidays)
    assert (await closed_step(mig, case.loan_id, "CHECKING"))["result"] == "RETURNED"
    assert await audit_actions(mig, case.loan_id) == ["WORKFLOW_RETURN_TO_RM"]


async def test_withdraw_closes_every_open_step(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="RETURNED_TO_RM")
    await case.add_step("RM_REWORK", CREDIT_OFFICER)
    rm = await principal(mig, CREDIT_OFFICER)
    result = await transition(
        engine, rm, case.loan_id, "withdraw", 1,
        reason="Qua han bo sung", params={"withdraw_kind": "OVERDUE"},
    )
    assert (result.status, result.step_code, result.assignee_employee_id, result.due_at) == (
        "WITHDRAWN", "RM_REWORK", None, None,
    )
    loan = await mig.fetchrow(
        "SELECT status, withdraw_reason FROM credit.loan_application WHERE id = $1", case.loan_id
    )
    assert tuple(loan) == ("WITHDRAWN", "OVERDUE: Qua han bo sung")
    assert await mig.fetchval(
        "SELECT count(*) FROM credit.case_step WHERE loan_application_id = $1"
        " AND completed_at IS NULL",
        case.loan_id,
    ) == 0
    assert (await closed_step(mig, case.loan_id, "RM_REWORK"))["result"] == "WITHDRAWN"
    assert await audit_actions(mig, case.loan_id) == ["WORKFLOW_WITHDRAW"]


async def test_withdraw_without_open_step_returns_no_step_code(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="RETURNED_TO_RM")
    rm = await principal(mig, CREDIT_OFFICER)
    result = await transition(
        engine, rm, case.loan_id, "withdraw", 1,
        reason="Khach rut", params={"withdraw_kind": "CUSTOMER"},
    )
    assert result.status == "WITHDRAWN" and result.step_code is None


async def test_rm_submit_checklist_exceptions_become_case_flags(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create()
    statement = await case.add_document("BANK_STATEMENT", issued_days_ago=40)  # qua 30 ngay (E6)
    await case.add_checklist_item("NQ", "RESOLUTION", "REQUIRED")  # thieu
    await case.add_checklist_item("DKKD", "BUSINESS_REGISTRATION", "REQUIRED")  # thieu, co ngoai le
    await case.add_checklist_item("A01-07", "BANK_STATEMENT", "RECEIVED", document_id=statement)
    await case.add_exception("DKKD")
    rm = await principal(mig, CREDIT_OFFICER)

    with pytest.raises(GateBlockedError) as blocked:
        await transition(engine, rm, case.loan_id, "submit_to_checking", 1)
    assert blocked.value.blockers == ("DOC_MISSING", "DOC_EXPIRED")

    await case.add_exception("NQ")
    await case.add_exception("A01-07")  # sao ke het hieu luc duoc ngoai le (F5 chi cam CIC)
    result = await transition(engine, rm, case.loan_id, "submit_to_checking", 1)
    assert result.status == "CHECKING"
    assert result.carried_flags == ("EXCEPTION:A01-07", "EXCEPTION:DKKD", "EXCEPTION:NQ")
    flags = await mig.fetch(
        "SELECT code, status, blocks_submission, source, severity, created_by FROM credit.case_flag"
        " WHERE loan_application_id = $1 ORDER BY code",
        case.loan_id,
    )
    assert [tuple(f) for f in flags] == [
        (code, "OPEN", False, "GATE:rm_submit", "MEDIUM", CREDIT_OFFICER)
        for code in ("EXCEPTION:A01-07", "EXCEPTION:DKKD", "EXCEPTION:NQ")
    ]
    # Co chuyen kem khong tinh vao FLAGS_OPEN o Tham dinh.
    httd = await principal(mig, result.assignee_employee_id)
    async with (
        AsyncSession(engine) as session,
        rls_transaction(session, httd.employee_id, httd.branch_id),
    ):
        gate = await evaluate("appraisal_submit", case.loan_id, WorkflowRepository(session))
    assert gate.blockers == ("REPORT_MISSING",)
