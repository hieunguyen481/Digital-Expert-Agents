"""V021: loi quy trinh trong database (trang thai moi, buoc, SLA, cap phe duyet, co, quyet dinh chi them)."""

from __future__ import annotations

from uuid import uuid4

import asyncpg
import pytest
from tests.integration.conftest import act_as
from tests.integration.seed_ids import BRANCH_HN, CREDIT_OFFICER, CUSTOMER_A, LOAN_1

_PRODUCT = "40000000-0000-4000-8000-000000000001"


async def test_old_status_document_collection_is_rejected(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            """
            INSERT INTO credit.loan_application (
                id, application_number, primary_customer_id, product_id,
                requested_amount, currency, requested_term_months, loan_purpose,
                status, assigned_employee_id, created_at, created_by, updated_at
            )
            VALUES ($1, $2, $3, $4, 1000000, 'VND', 12, 'WORKING_CAPITAL',
                    'DOCUMENT_COLLECTION', $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP)
            """,
            uuid4(),
            f"LA-TEST-{uuid4().hex[:8]}",
            CUSTOMER_A,
            _PRODUCT,
            CREDIT_OFFICER,
        )


async def _insert_open_step(db, step_code: str) -> None:
    await db.execute(
        """
        INSERT INTO credit.case_step (
            id, loan_application_id, step_code, assignee_employee_id,
            received_at, created_by, created_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP)
        """,
        uuid4(),
        LOAN_1,
        step_code,
        CREDIT_OFFICER,
    )


async def test_only_one_open_step_per_case(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    await _insert_open_step(db, "CHECKING")
    with pytest.raises(asyncpg.UniqueViolationError):
        await _insert_open_step(db, "APPRAISAL")


async def test_pending_info_step_may_coexist_with_open_step(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    await _insert_open_step(db, "APPRAISAL")
    await _insert_open_step(db, "PENDING_INFO")


async def test_high_flag_handled_requires_note(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    flag_id = uuid4()
    await db.execute(
        """
        INSERT INTO credit.case_flag (
            id, loan_application_id, code, severity, title, blocks_submission,
            status, source, created_by, created_at, updated_at
        )
        VALUES ($1, $2, 'TEST_HIGH', 'HIGH', 'Co muc cao', TRUE, 'OPEN',
                'TEST', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        flag_id,
        LOAN_1,
        CREDIT_OFFICER,
    )
    with pytest.raises(asyncpg.CheckViolationError):
        await db.execute(
            "UPDATE credit.case_flag SET status = 'HANDLED' WHERE id = $1",
            flag_id,
        )


async def test_loan_decision_update_is_rejected(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        await db.execute(
            "UPDATE credit.loan_decision SET rationale = 'sua' WHERE loan_application_id = $1",
            LOAN_1,
        )


async def test_sla_parameters_seeded(db):
    rows = await db.fetch("SELECT step_code, workdays FROM credit.sla_parameter ORDER BY step_code")
    assert {r["step_code"]: r["workdays"] for r in rows} == {
        "CHECKING": 2,
        "APPRAISAL": 5,
        "RISK_REVIEW": 3,
        "APPROVAL": 2,
        "CUSTOMER_SUPPLEMENT": 5,
    }


async def test_authority_tier_version_1_has_three_tiers(db):
    rows = await db.fetch("SELECT tier, max_total_vnd FROM credit.authority_tier WHERE version = 1 ORDER BY tier")
    assert [(r["tier"], r["max_total_vnd"]) for r in rows] == [
        (1, 20_000_000_000),
        (2, 100_000_000_000),
        (3, None),
    ]


async def test_rm_cannot_rewrite_own_history(db):
    """E8: cuu QHKH khong duoc tu sua lich su de thoat loai tru phe duyet."""
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    # Moi lenh trong savepoint rieng de lenh sau khong chay tren giao dich da hong.
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        async with db.transaction():
            await db.execute(
                """
            INSERT INTO customer.relationship_manager_history (
                customer_id, employee_id, valid_from, valid_until
            )
            VALUES ($1, $2, DATE '2020-01-01', DATE '2020-12-31')
            """,
                CUSTOMER_A,
                CREDIT_OFFICER,
            )
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        async with db.transaction():
            await db.execute(
                """
            UPDATE customer.relationship_manager_history
            SET valid_until = DATE '2020-12-31'
            WHERE employee_id = $1
            """,
                CREDIT_OFFICER,
            )
