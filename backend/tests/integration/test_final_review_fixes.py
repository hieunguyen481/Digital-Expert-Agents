# ruff: noqa: F811 - fixture mig/engine/case nhap tu test_workflow_service.
"""V027: sua 4 phat hien cua vong review cuoi Ke hoach 1.

I1 - lien ket tai lieu (document.document_link) khong mo rong quyen ghi tai lieu.
I2 - doi QHKH ghi lich su (E8: cuu QHKH trong 2 nam bi loai khoi phe duyet).
I3 - so tien duyet khong vuot so tien de nghi (Python va apply_transition).
I4 - ly do buoc lien quan gian lan / AML bi an voi QHKH, HTTD... (Q-M).
"""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID, uuid4

import asyncpg
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from tests.integration.conftest import act_as
from tests.integration.seed_ids import (
    APPROVER_HO,
    BRANCH_HN,
    BRANCH_HO,
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    CUSTOMER_A,
    CUSTOMER_B,
    DIRECTOR_HN,
    DOCUMENT_REVIEWER,
    RISK_HO,
)
from tests.integration.test_workflow_service import (  # noqa: F401 - fixture
    Case,
    case,
    engine,
    enter_risk_review,
    loan_row,
    mig,
    principal,
    transition,
)

from app.auth.principal import CurrentPrincipal
from app.db.rls_context import rls_transaction, set_rls_context
from app.exceptions import ValidationError
from app.repositories.customer_repository import CustomerRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.schemas.workflow import CaseStepResponse
from app.workflow.service import WorkflowService

_PRODUCT = "40000000-0000-4000-8000-000000000001"


# ---------------------------------------------------------------------------
# I1 - document_link
# ---------------------------------------------------------------------------
async def _loan(db: asyncpg.Connection, customer_id: UUID) -> UUID:
    """QHKH (...0001) lap ho so DRAFT cho khach cua minh."""
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    loan_id = uuid4()
    await db.execute(
        """
        INSERT INTO credit.loan_application (
            id, application_number, primary_customer_id, product_id,
            requested_amount, currency, requested_term_months, loan_purpose,
            status, assigned_employee_id, created_at, created_by, updated_at
        )
        VALUES ($1, $2, $3, $4, 1000000000, 'VND', 12, 'WORKING_CAPITAL',
                'DRAFT', $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP)
        """,
        loan_id, f"LA-V027-{uuid4().hex[:8]}", customer_id, _PRODUCT, CREDIT_OFFICER,
    )
    return loan_id


async def _step(db: asyncpg.Connection, loan_id: UUID, assignee: UUID, *, completed: bool) -> None:
    await db.execute(
        """
        INSERT INTO credit.case_step (
            id, loan_application_id, step_code, assignee_employee_id,
            received_at, completed_at, result, created_by, created_at
        )
        VALUES ($1, $2, 'APPRAISAL', $3, CURRENT_TIMESTAMP,
                CASE WHEN $4 THEN CURRENT_TIMESTAMP END,
                CASE WHEN $4 THEN 'DONE' END, $5, CURRENT_TIMESTAMP)
        """,
        uuid4(), loan_id, assignee, completed, CREDIT_OFFICER,
    )


async def _owned_document(db: asyncpg.Connection, customer_id: UUID) -> UUID:
    """QHKH tao tai lieu (BCTC) thuoc khach ``customer_id``."""
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    document_id = uuid4()
    await db.execute(
        """
        INSERT INTO document.document (
            id, document_type, owner_party_id, classification, verification_status,
            processing_status, created_by, created_at, updated_at
        )
        SELECT $1, 'FINANCIAL_STATEMENT', c.party_id, 'CONFIDENTIAL', 'UNVERIFIED',
               'COMPLETED', $2, now(), now()
        FROM customer.customer AS c WHERE c.id = $3
        """,
        document_id, CREDIT_OFFICER, customer_id,
    )
    return document_id


async def _link(db: asyncpg.Connection, document_id: UUID, loan_id: UUID) -> None:
    await db.execute(
        """
        INSERT INTO document.document_link (
            id, document_id, entity_type, entity_id, relationship_type, created_at
        ) VALUES ($1, $2, 'LOAN_APPLICATION', $3, 'SUPPORTING_DOCUMENT', now())
        """,
        uuid4(), document_id, loan_id,
    )


async def _escalation_setup(db: asyncpg.Connection) -> tuple[UUID, UUID, UUID]:
    """L0 (khach B) tham dinh vien da xong buoc; L1 (khach A) dang giu buoc mo."""
    l0 = await _loan(db, CUSTOMER_B)
    l1 = await _loan(db, CUSTOMER_A)
    bctc_b = await _owned_document(db, CUSTOMER_B)
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    await _link(db, bctc_b, l0)
    await _step(db, l0, CREDIT_APPRAISER, completed=True)
    await _step(db, l1, CREDIT_APPRAISER, completed=False)
    assert await db.execute(
        "UPDATE credit.loan_application SET status = 'APPRAISAL' WHERE id = $1", l1
    ) == "UPDATE 1"
    return l0, l1, bctc_b


async def test_appraiser_cannot_link_other_customers_document_to_gain_write(db) -> None:
    _, l1, bctc_b = await _escalation_setup(db)

    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    # Doc duoc (tung tham dinh L0) nhung khong ghi duoc.
    assert await db.fetchval("SELECT count(*) FROM document.document WHERE id = $1", bctc_b) == 1
    assert await db.fetchval(
        "SELECT identity.can_write_document($1, $2)", CREDIT_APPRAISER, bctc_b
    ) is False
    assert await db.fetchval("SELECT identity.can_write_loan($1, $2)", CREDIT_APPRAISER, l1) is True

    # Lien ket BCTC cua khach B vao ho so L1 (khach A) bi RLS chan.
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        async with db.transaction():
            await _link(db, bctc_b, l1)

    assert await db.fetchval(
        "SELECT identity.can_write_document($1, $2)", CREDIT_APPRAISER, bctc_b
    ) is False
    assert await db.execute(
        "UPDATE document.document SET title = 'sua' WHERE id = $1", bctc_b
    ) == "UPDATE 0"


async def test_customer_link_requires_same_owner(db) -> None:
    """Lien ket CUSTOMER cung phai dung chu: BCTC khach B khong gan vao khach A."""
    _, _, bctc_b = await _escalation_setup(db)
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        async with db.transaction():
            await db.execute(
                """
                INSERT INTO document.document_link (
                    id, document_id, entity_type, entity_id, relationship_type, created_at
                ) VALUES ($1, $2, 'CUSTOMER', $3, 'SUBMITTED_DOCUMENT', now())
                """,
                uuid4(), bctc_b, CUSTOMER_A,
            )


async def test_appraiser_links_primary_customer_document(db) -> None:
    _, l1, _ = await _escalation_setup(db)
    bctc_a = await _owned_document(db, CUSTOMER_A)

    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    await _link(db, bctc_a, l1)
    assert await db.fetchval(
        "SELECT count(*) FROM document.document_link WHERE document_id = $1 AND entity_id = $2",
        bctc_a, l1,
    ) == 1
    assert await db.fetchval(
        "SELECT identity.can_write_document($1, $2)", CREDIT_APPRAISER, bctc_a
    ) is True


async def test_document_link_rows_follow_entity_read_access(db) -> None:
    l0, _, _ = await _escalation_setup(db)
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    assert await db.fetchval(
        "SELECT count(*) FROM document.document_link WHERE entity_id = $1", l0
    ) == 1
    # Dong nghiep cung chi nhanh khong doc duoc ho so thi khong thay lien ket.
    await act_as(db, DOCUMENT_REVIEWER, BRANCH_HN)
    assert await db.fetchval(
        "SELECT count(*) FROM document.document_link WHERE entity_id = $1", l0
    ) == 0


# ---------------------------------------------------------------------------
# I2 - lich su QHKH
# ---------------------------------------------------------------------------
class _RollbackError(Exception):
    pass


async def _new_customer_with_loan(session: AsyncSession) -> tuple[UUID, UUID, int]:
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    repo = CustomerRepository(session)
    customer = await repo.create_draft(employee_id=CREDIT_OFFICER, branch_id=BRANCH_HN)
    customer_id = UUID(str(customer["id"]))
    loan_id = uuid4()
    await session.execute(
        text(
            """
            INSERT INTO credit.loan_application (
                id, application_number, primary_customer_id, product_id,
                requested_amount, currency, requested_term_months, loan_purpose,
                status, assigned_employee_id, created_at, created_by, updated_at
            )
            VALUES (:id, :no, :customer, CAST(:product AS uuid), 1000000000, 'VND', 12,
                    'WORKING_CAPITAL', 'DRAFT', :rm, CURRENT_TIMESTAMP, :rm, CURRENT_TIMESTAMP)
            """
        ),
        {
            "id": loan_id, "no": f"LA-RM-{uuid4().hex[:8]}", "customer": customer_id,
            "product": _PRODUCT, "rm": CREDIT_OFFICER,
        },
    )
    assignment = await repo.get_assignment(customer_id)
    assert assignment is not None
    return customer_id, loan_id, int(assignment["assignment_version"])


async def _excluded(session: AsyncSession, employee_id: UUID, loan_id: UUID) -> bool:
    result = await session.execute(
        text("SELECT credit.is_excluded(:e, :l)"), {"e": employee_id, "l": loan_id}
    )
    return bool(result.scalar_one())


async def _history(session: AsyncSession, customer_id: UUID) -> list[tuple[UUID, bool]]:
    result = await session.execute(
        text(
            "SELECT employee_id, valid_until IS NULL AS is_open"
            " FROM customer.relationship_manager_history WHERE customer_id = :c"
            " ORDER BY valid_from, employee_id"
        ),
        {"c": customer_id},
    )
    return [(UUID(str(row[0])), bool(row[1])) for row in result.all()]


async def test_takeover_records_former_rm_as_excluded(engine: AsyncEngine) -> None:
    with pytest.raises(_RollbackError):
        async with AsyncSession(engine) as session, session.begin():
            customer_id, loan_id, version = await _new_customer_with_loan(session)
            assert await _history(session, customer_id) == [(CREDIT_OFFICER, True)]

            await set_rls_context(session, DIRECTOR_HN, BRANCH_HN)
            row = await CustomerRepository(session).takeover_assignment(
                customer_id, employee_id=DIRECTOR_HN, expected_version=version
            )
            assert row is not None and row["assigned_employee_id"] == DIRECTOR_HN

            assert await _excluded(session, CREDIT_OFFICER, loan_id) is True
            assert sorted(await _history(session, customer_id)) == sorted(
                [(CREDIT_OFFICER, False), (DIRECTOR_HN, True)]
            )
            raise _RollbackError


async def test_release_then_claim_records_former_rm(engine: AsyncEngine) -> None:
    with pytest.raises(_RollbackError):
        async with AsyncSession(engine) as session, session.begin():
            customer_id, loan_id, version = await _new_customer_with_loan(session)
            repo = CustomerRepository(session)
            released = await repo.release_assignment(
                customer_id, employee_id=CREDIT_OFFICER, assignment_version=version
            )
            assert released is not None

            await set_rls_context(session, DIRECTOR_HN, BRANCH_HN)
            claimed = await repo.claim_assignment(
                customer_id,
                employee_id=DIRECTOR_HN,
                expected_version=int(released["assignment_version"]),
            )
            assert claimed is not None and claimed["assigned_employee_id"] == DIRECTOR_HN
            assert await _excluded(session, CREDIT_OFFICER, loan_id) is True
            # Nhan lai chinh minh (khong doi gia tri) khong them dong.
            await repo.claim_assignment(
                customer_id,
                employee_id=DIRECTOR_HN,
                expected_version=int(claimed["assignment_version"]),
            )
            await session.execute(
                text("UPDATE customer.customer SET relationship_manager_id = :e WHERE id = :c"),
                {"e": DIRECTOR_HN, "c": customer_id},
            )
            assert sorted(await _history(session, customer_id)) == sorted(
                [(CREDIT_OFFICER, False), (DIRECTOR_HN, True)]
            )
            raise _RollbackError


async def test_runtime_still_cannot_write_rm_history(db) -> None:
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        await db.execute(
            "UPDATE customer.relationship_manager_history SET valid_until = DATE '2000-01-01'"
            " WHERE customer_id = $1",
            CUSTOMER_A,
        )


# ---------------------------------------------------------------------------
# I3 - so tien duyet
# ---------------------------------------------------------------------------
def _approver(base: CurrentPrincipal) -> CurrentPrincipal:
    return CurrentPrincipal(
        employee_id=base.employee_id, subject=base.subject, branch_id=base.branch_id,
        roles=base.roles, permissions=frozenset({"loan:read", "loan:approve"}),
    )


async def test_decide_rejects_amount_above_requested(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPROVAL", amount=Decimal("5000000000"))
    await case.add_step("APPROVAL", APPROVER_HO)
    approver = _approver(await principal(mig, APPROVER_HO))
    with pytest.raises(ValidationError) as error:
        await transition(
            engine, approver, case.loan_id, "decide", 1, reason="Dong y",
            params={
                "decision_type": "APPROVED", "approved_amount": "500000000000",
                "approved_term_months": 12,
            },
        )
    assert error.value.code == "APPROVED_AMOUNT_EXCEEDS_REQUESTED"
    assert error.value.status == 422
    assert tuple(await loan_row(mig, case.loan_id)) == ("APPROVAL", 1)


async def test_apply_transition_rechecks_recorded_amount(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPROVAL", amount=Decimal("5000000000"))
    await case.add_step("APPROVAL", APPROVER_HO)
    approver = await principal(mig, APPROVER_HO)
    with pytest.raises(ValueError):
        async with (
            AsyncSession(engine) as session,
            rls_transaction(session, approver.employee_id, approver.branch_id),
        ):
            repo = WorkflowRepository(session)
            await repo.insert_decision(
                case.loan_id, decision_type="APPROVED", decision_maker_id=APPROVER_HO,
                rationale="Dong y", approved_amount=Decimal("500000000000"),
                approved_term_months=12,
            )
            await repo.apply_transition(
                case.loan_id, action="decide", expected_version=1, from_status="APPROVAL",
                to_status="APPROVED", reason="Dong y", new_assignee=None, new_due_at=None,
                remaining_workdays=None, approval_tier=None, withdraw_kind=None,
            )
    assert tuple(await loan_row(mig, case.loan_id)) == ("APPROVAL", 1)


async def test_decide_accepts_amount_equal_to_requested(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPROVAL", amount=Decimal("5000000000"))
    await case.add_step("APPROVAL", APPROVER_HO)
    approver = _approver(await principal(mig, APPROVER_HO))
    result = await transition(
        engine, approver, case.loan_id, "decide", 1, reason="Dong y",
        params={"decision_type": "APPROVED", "approved_amount": "5000000000",
                "approved_term_months": 12},
    )
    assert result.status == "APPROVED"


# ---------------------------------------------------------------------------
# I4 - an ly do gian lan / AML
# ---------------------------------------------------------------------------
async def _steps(engine: AsyncEngine, who: CurrentPrincipal, loan_id: UUID) -> list[dict]:
    async with (
        AsyncSession(engine) as session,
        rls_transaction(session, who.employee_id, who.branch_id),
    ):
        rows = await WorkflowService(WorkflowRepository(session)).steps(who, loan_id)
    return [CaseStepResponse.model_validate(dict(row)).model_dump() for row in rows]


def _by_result(steps: list[dict], step_code: str, result: str) -> dict:
    return next(s for s in steps if s["step_code"] == step_code and s["result"] == result)


async def test_fraud_reasons_hidden_from_rm_visible_to_compliance(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case
) -> None:
    await case.create(status="APPRAISAL")
    await enter_risk_review(engine, mig, case)
    compliance = await principal(mig, COMPLIANCE_HO)
    await transition(engine, compliance, case.loan_id, "fraud_hold", 2, reason="Dau hieu gia mao")
    await transition(engine, compliance, case.loan_id, "fraud_release", 3, reason="Da xu ly xong")

    rm = await principal(mig, CREDIT_OFFICER)
    rm_steps = await _steps(engine, rm, case.loan_id)
    for code, result in (("RISK_REVIEW", "FRAUD_HOLD"), ("FRAUD_HOLD", "RELEASED")):
        step = _by_result(rm_steps, code, result)
        assert step["reason"] is None and step["reason_restricted"] is True
    # Buoc thuong khong bi an.
    assert all(
        s["reason_restricted"] is False
        for s in rm_steps
        if s["result"] not in {"FRAUD_HOLD", "RELEASED"}
    )

    seen = await _steps(engine, compliance, case.loan_id)
    assert _by_result(seen, "RISK_REVIEW", "FRAUD_HOLD")["reason"] == "Dau hieu gia mao"
    assert _by_result(seen, "FRAUD_HOLD", "RELEASED")["reason"] == "Da xu ly xong"
    assert all(s["reason_restricted"] is False for s in seen)


async def test_runtime_cannot_read_step_reason_column_directly(
    mig: asyncpg.Connection, case: Case, db
) -> None:
    await case.create(status="APPRAISAL")
    await case.add_step("APPRAISAL", CREDIT_APPRAISER)
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        await db.fetch(
            "SELECT reason FROM credit.case_step WHERE loan_application_id = $1", case.loan_id
        )


@pytest.mark.parametrize(
    ("actor", "appraiser_sees"), [(COMPLIANCE_HO, False), (RISK_HO, True)]
)
async def test_risk_return_reason_masked_only_when_compliance_authored(
    engine: AsyncEngine, mig: asyncpg.Connection, case: Case, actor: UUID, appraiser_sees: bool
) -> None:
    await case.create(status="APPRAISAL")
    await enter_risk_review(engine, mig, case)
    await transition(engine, await principal(mig, actor), case.loan_id, "risk_return", 2,
                     reason="Nghi van rua tien")

    appraiser = await principal(mig, CREDIT_APPRAISER)
    step = _by_result(await _steps(engine, appraiser, case.loan_id), "RISK_REVIEW", "RETURNED")
    assert step["reason_restricted"] is (not appraiser_sees)
    assert step["reason"] == ("Nghi van rua tien" if appraiser_sees else None)

    risk = await principal(mig, RISK_HO)
    step = _by_result(await _steps(engine, risk, case.loan_id), "RISK_REVIEW", "RETURNED")
    assert step["reason"] == "Nghi van rua tien" and step["reason_restricted"] is False
