"""Hanh dong tren ho so 02b (lat 11) tren Postgres that: ly do bat buoc, bao som, nang cap, E8, che ket luan."""

from __future__ import annotations

from collections.abc import AsyncIterator
from decimal import Decimal
from uuid import UUID, uuid4

import asyncpg
import pytest
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from tests.integration.seed_ids import (
    APPROVER2_HO,
    APPROVER_HO,
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    DOCUMENT_REVIEWER,
    RISK_HO,
)
from tests.integration.test_workflow_service import (  # noqa: F401  (fixture)
    Case,
    case,
    engine,
    enter_risk_review,
    loan_row,
    mig,
    open_step,
    principal,
    transition,
)

from app.api.v1.case_actions import router as _router  # noqa: F401  (import kiem tra duoc)
from app.db.rls_context import rls_transaction
from app.exceptions import ConflictError, ValidationError
from app.repositories.audit_repository import AuditRepository
from app.repositories.case_action_repository import CaseActionRepository
from app.repositories.loan_detail_repository import LoanDetailRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.services.audit_service import AuditService
from app.services.case_action_service import CaseActionService
from app.services.loan_detail_service import LoanDetailService
from app.workflow.service import GateBlockedError, WorkflowService


async def act(engine: AsyncEngine, who, fn):
    """Chay mot hanh dong nhu mot request that: phien RLS rieng, commit khi xong."""
    async with AsyncSession(engine) as session, rls_transaction(session, who.employee_id, who.branch_id, who.is_admin):
        audit = AuditService(AuditRepository(session))
        repo = WorkflowRepository(session)
        service = CaseActionService(CaseActionRepository(session), WorkflowService(repo, audit), repo, audit)
        return await fn(service)


async def add_flag(mig: asyncpg.Connection, case: Case, code: str = "cickh", status: str = "OPEN") -> UUID:
    flag_id = uuid4()
    await mig.execute(
        "INSERT INTO credit.case_flag (id, loan_application_id, code, severity, title, blocks_submission,"
        " status, source, created_at, updated_at) VALUES ($1, $2, $3, 'HIGH', 'Co test', true, $4,"
        " 'TEST', now(), now())",
        flag_id, case.loan_id, code, status,
    )
    return flag_id


async def test_opinions_required_before_submit_and_reason_mandatory(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await enter_risk_review(engine, mig, case)
    risk = await principal(mig, RISK_HO)
    compliance = await principal(mig, COMPLIANCE_HO)
    # Chua chot To trinh -> khong ghi duoc y kien (REPORT_MISSING).
    with pytest.raises(ValidationError):
        await act(engine, risk, lambda s: s.add_opinion(risk, case.loan_id, "RISK", "Y kien"))
    await mig.execute(
        "INSERT INTO credit.appraisal_memo_version (id, loan_application_id, revision, content, finalized_by)"
        " VALUES ($1, $2, 1, '{}'::jsonb, $3)", uuid4(), case.loan_id, CREDIT_APPRAISER,
    )
    with pytest.raises(ValueError):  # thieu noi dung
        await act(engine, risk, lambda s: s.add_opinion(risk, case.loan_id, "RISK", "  "))
    with pytest.raises(PermissionError):  # sai vai tro
        await act(engine, compliance, lambda s: s.add_opinion(compliance, case.loan_id, "RISK", "x"))
    await act(engine, risk, lambda s: s.add_opinion(risk, case.loan_id, "RISK", "Rui ro chap nhan"))
    with pytest.raises(ConflictError):  # moi loai mot y kien cho moi ban
        await act(engine, risk, lambda s: s.add_opinion(risk, case.loan_id, "RISK", "lai"))
    with pytest.raises(GateBlockedError) as blocked:  # thieu y kien Tuan thu
        await transition(engine, risk, case.loan_id, "submit_to_approval", 2)
    assert "OPINIONS_MISSING" in blocked.value.blockers
    await act(engine, compliance, lambda s: s.add_opinion(compliance, case.loan_id, "COMPLIANCE", "Tuan thu on"))
    result = await transition(engine, risk, case.loan_id, "submit_to_approval", 2)
    assert result.status == "APPROVAL"


async def test_early_warning_notifies_without_changing_step(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await case.add_step("APPRAISAL", CREDIT_APPRAISER)
    flag = await add_flag(mig, case)
    appraiser = await principal(mig, CREDIT_APPRAISER)
    before = tuple(await loan_row(mig, case.loan_id))
    await act(engine, appraiser, lambda s: s.early_warning(appraiser, case.loan_id, flag, "Nghi van"))
    assert tuple(await loan_row(mig, case.loan_id)) == before  # khong doi buoc, khong doi phien ban
    row = await mig.fetchrow("SELECT status, early_warned_at FROM credit.case_flag WHERE id = $1", flag)
    assert row["status"] == "OPEN" and row["early_warned_at"] is not None
    assert await mig.fetchval("SELECT count(*) FROM integration.notification WHERE resource_id = $1", case.loan_id) == 1
    assert (await open_step(mig, case.loan_id, "APPRAISAL")) is not None


async def test_flag_conclusion_needs_reason_and_compliance_role(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await enter_risk_review(engine, mig, case)
    flag = await add_flag(mig, case)
    compliance = await principal(mig, COMPLIANCE_HO)
    risk = await principal(mig, RISK_HO)
    with pytest.raises(ValueError):
        await act(engine, compliance, lambda s: s.conclude_flag(compliance, case.loan_id, flag, "NO_ISSUE", ""))
    with pytest.raises(PermissionError):
        await act(engine, risk, lambda s: s.conclude_flag(risk, case.loan_id, flag, "NO_ISSUE", "x"))
    status = await act(
        engine, compliance, lambda s: s.conclude_flag(compliance, case.loan_id, flag, "SUSPECTED_FRAUD", "Chung tu gia")
    )
    assert status == "RISK_HOLD_FRAUD"
    row = await mig.fetchrow("SELECT status, compliance_conclusion FROM credit.case_flag WHERE id = $1", flag)
    assert (row["status"], row["compliance_conclusion"]) == ("CONCLUDED", "SUSPECTED_FRAUD")


async def test_upgrade_when_total_exceeds_tier(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await case.add_step("APPRAISAL", CREDIT_APPRAISER)
    await mig.execute(
        "INSERT INTO credit.approval_tier_event (id, loan_application_id, tier, kind, created_by)"
        " VALUES ($1, $2, 1, 'SUBMIT', $3)", uuid4(), case.loan_id, CREDIT_OFFICER,
    )
    appraiser = await principal(mig, CREDIT_APPRAISER)
    with pytest.raises(ConflictError):  # 5 ty van cap 1
        await act(engine, appraiser, lambda s: s.upgrade_approval(appraiser, case.loan_id, "Ly do"))
    await mig.execute(
        "UPDATE credit.loan_application SET requested_amount = $2 WHERE id = $1", case.loan_id, Decimal("50000000000")
    )
    with pytest.raises(ValueError):
        await act(engine, appraiser, lambda s: s.upgrade_approval(appraiser, case.loan_id, " "))
    tier = await act(engine, appraiser, lambda s: s.upgrade_approval(appraiser, case.loan_id, "Cong lai du no"))
    assert tier == 2
    assert await mig.fetchval("SELECT count(*) FROM credit.case_flag WHERE loan_application_id = $1", case.loan_id) == 1


async def test_excluded_participant_skipped_and_peer_gets_case(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    """E8 + Q-M: nguoi da tham gia buoc cua ho so bi loai, ho so chuyen nguoi cung cap (cap 2)."""
    await case.create(status="RISK_REVIEW", amount=Decimal("50000000000"))
    await case.add_step("RISK_REVIEW", RISK_HO)
    await case.add_step("APPRAISAL", APPROVER_HO, completed=True, result="SUBMITTED")  # APPROVER_HO da tham gia
    await case.add_opinions()
    risk = await principal(mig, RISK_HO)
    result = await transition(engine, risk, case.loan_id, "submit_to_approval", 1)
    assert result.assignee_employee_id == APPROVER2_HO
    excluded = await principal(mig, APPROVER_HO)
    state = await act(engine, excluded, lambda s: s.state(excluded, case.loan_id))
    assert state["excluded"] is True


async def test_rm_and_reviewer_cannot_read_flag_conclusion(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await case.add_step("RM_DRAFT", CREDIT_OFFICER, completed=True, result="SUBMITTED")  # QHKH doc duoc, khong ghi
    await case.add_step("CHECKING", DOCUMENT_REVIEWER, completed=True, result="PASSED")  # HTTD
    await case.add_step("APPRAISAL", COMPLIANCE_HO)  # chi de Tuan thu doc duoc
    flag = await add_flag(mig, case, status="CONCLUDED")
    await mig.execute(
        "UPDATE credit.case_flag SET compliance_conclusion = 'SUSPECTED_FRAUD', compliance_reason = 'Bi mat' WHERE id = $1",
        flag,
    )
    seen: dict[UUID, object] = {}
    for who in (CREDIT_OFFICER, DOCUMENT_REVIEWER, COMPLIANCE_HO):
        p = await principal(mig, who)
        async with AsyncSession(engine) as session, rls_transaction(session, p.employee_id, p.branch_id):
            overview = await LoanDetailService(LoanDetailRepository(session)).overview(p, case.loan_id)
        seen[who] = [f["compliance_conclusion"] for f in overview["flags"]]
    assert seen[CREDIT_OFFICER] in ([None], [])
    assert seen[DOCUMENT_REVIEWER] in ([None], [])
    assert seen[COMPLIANCE_HO] == ["SUSPECTED_FRAUD"]


async def test_appraiser_handles_flag_with_note(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await case.add_step("APPRAISAL", CREDIT_APPRAISER)
    flag = await add_flag(mig, case, code="dso")
    appraiser = await principal(mig, CREDIT_APPRAISER)
    with pytest.raises(ValueError):
        await act(engine, appraiser, lambda s: s.handle_flag(appraiser, case.loan_id, flag, " "))
    await act(engine, appraiser, lambda s: s.handle_flag(appraiser, case.loan_id, flag, "Da ra soat"))
    row = await mig.fetchrow("SELECT status, handling_note FROM credit.case_flag WHERE id = $1", flag)
    assert (row["status"], row["handling_note"]) == ("HANDLED", "Da ra soat")


async def test_former_rm_within_2_years_cannot_decide_and_case_goes_to_peer(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    """E8: QHKH cu trong 2 nam khong duoc phe duyet (duong 02b va the AI cung goi transition `decide`); Q-M: chuyen nguoi cung cap."""
    await case.create(status="RISK_REVIEW", amount=Decimal("50000000000"))
    await mig.execute(
        "INSERT INTO customer.relationship_manager_history (customer_id, employee_id, valid_from, valid_until)"
        " VALUES ($1, $2, DATE '2020-01-01', CURRENT_DATE - 30)", case.customer_id, APPROVER_HO,
    )
    await case.add_step("RISK_REVIEW", RISK_HO)
    await case.add_opinions()
    risk = await principal(mig, RISK_HO)
    result = await transition(engine, risk, case.loan_id, "submit_to_approval", 1)
    assert result.assignee_employee_id == APPROVER2_HO  # APPROVER_HO bi E8 loai, nguoi cung cap nhan truoc


async def test_former_rm_holding_approval_step_cannot_decide(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPROVAL")
    await mig.execute(
        "INSERT INTO customer.relationship_manager_history (customer_id, employee_id, valid_from, valid_until)"
        " VALUES ($1, $2, DATE '2020-01-01', CURRENT_DATE - 30)", case.customer_id, APPROVER_HO,
    )
    await case.add_step("APPROVAL", APPROVER_HO)
    former = await principal(mig, APPROVER_HO)
    with pytest.raises(PermissionError):
        await transition(engine, former, case.loan_id, "decide", 1, reason="Dong y", params={"decision_type": "REJECTED"})
    assert await mig.fetchval("SELECT count(*) FROM credit.loan_decision WHERE loan_application_id = $1", case.loan_id) == 0
