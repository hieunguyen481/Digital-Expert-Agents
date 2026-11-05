"""E8 (credit.is_excluded), Q4/Q-T (credit.total_credit_exposure), Q-M (credit.required_tier).

bank_app khong ghi duoc relationship_manager_history, loan_account, customer_exposure,
nen du lieu dung bang ket noi migrator TRONG MOT GIAO DICH va rollback cuoi test:
khong dong nao duoc commit, UUID moi nen khong dung seed. Cac test cuoi chay bang
bank_app tren seed de kiem quyen EXECUTE.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

import asyncpg
import pytest
import pytest_asyncio
from tests.integration.conftest import act_as
from tests.integration.seed_ids import (
    APPROVER_HO,
    BRANCH_HN,
    BRANCH_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    DIRECTOR_HN,
    LOAN_1,
    RISK_HO,
)

PRODUCT = UUID("40000000-0000-4000-8000-000000000001")
BILLION = Decimal(1_000_000_000)
T0 = datetime(2026, 11, 2, 9, tzinfo=UTC)


@pytest_asyncio.fixture
async def mig() -> AsyncIterator[asyncpg.Connection]:
    dsn = os.environ.get("TEST_MIGRATOR_DSN")
    if not dsn:
        pytest.skip("TEST_MIGRATOR_DSN chua dat; chay backend/scripts/test-integration.ps1")
    conn = await asyncpg.connect(dsn)
    tx = conn.transaction()
    await tx.start()
    try:
        yield conn
    finally:
        try:
            await tx.rollback()
        finally:
            await conn.close()


async def new_customer(
    conn: asyncpg.Connection, *, rm: UUID | None = CREDIT_OFFICER, branch: UUID = BRANCH_HN
) -> tuple[UUID, UUID]:
    """Tra (customer_id, party_id)."""
    party_id, customer_id = uuid4(), uuid4()
    await conn.execute(
        "INSERT INTO customer.party (id, party_type, display_name, status, created_at,"
        " updated_at) VALUES ($1, 'ORGANIZATION', 'Test T8', 'ACTIVE', now(), now())",
        party_id,
    )
    await conn.execute(
        "INSERT INTO customer.customer (id, party_id, customer_number, home_branch_id,"
        " relationship_manager_id, kyc_status, status, created_at, updated_at)"
        " VALUES ($1, $2, $3, $4, $5, 'VERIFIED', 'ACTIVE', now(), now())",
        customer_id,
        party_id,
        f"T8-{customer_id}",
        branch,
        rm,
    )
    return customer_id, party_id


async def new_loan(conn: asyncpg.Connection, customer_id: UUID, amount: Decimal) -> UUID:
    loan_id = uuid4()
    await conn.execute(
        "INSERT INTO credit.loan_application (id, application_number, primary_customer_id,"
        " product_id, requested_amount, currency, requested_term_months, loan_purpose,"
        " status, created_at, created_by, updated_at)"
        " VALUES ($1, $2, $3, $4, $5, 'VND', 12, 'WORKING_CAPITAL', 'RISK_REVIEW',"
        " now(), $6, now())",
        loan_id,
        f"T8-{loan_id}",
        customer_id,
        PRODUCT,
        amount,
        CREDIT_OFFICER,
    )
    return loan_id


async def new_loan_account(
    conn: asyncpg.Connection, customer_id: UUID, outstanding: Decimal, status: str = "ACTIVE"
) -> None:
    loan_id = await new_loan(conn, customer_id, outstanding)
    account_id = uuid4()
    await conn.execute(
        "INSERT INTO credit.loan_account (id, loan_application_id, account_number_masked,"
        " account_number_hash, principal_amount, outstanding_principal, interest_rate,"
        " disbursement_date, maturity_date, status, created_at, updated_at)"
        " VALUES ($1, $2, '****0000', $3, $4, $4, 0.1, DATE '2025-01-01',"
        " DATE '2030-01-01', $5, now(), now())",
        account_id,
        loan_id,
        account_id.hex + account_id.hex,
        outstanding,
        status,
    )


async def add_related(conn: asyncpg.Connection, loan_id: UUID, party_id: UUID, status: str) -> None:
    decided = status != "PROPOSED"
    await conn.execute(
        "INSERT INTO credit.case_related_party (loan_application_id, party_id, status, basis,"
        " decided_by, decided_at) VALUES ($1, $2, $3, $4, $5, $6)",
        loan_id,
        party_id,
        status,
        "test" if status == "NOT_IN_GROUP" else None,
        CREDIT_APPRAISER if decided else None,
        T0 if decided else None,
    )


async def add_exposure(conn: asyncpg.Connection, customer_id: UUID, amount: Decimal) -> None:
    await conn.execute(
        "INSERT INTO credit.customer_exposure (id, customer_id, exposure_type, amount,"
        " as_of_date) VALUES ($1, $2, 'GUARANTEE', $3, CURRENT_DATE)",
        uuid4(),
        customer_id,
        amount,
    )


async def add_step(
    conn: asyncpg.Connection,
    loan_id: UUID,
    code: str,
    *,
    assignee: UUID | None,
    created_by: UUID,
    at: datetime,
    completed: bool = True,
    result: str | None = "DONE",
) -> None:
    await conn.execute(
        "INSERT INTO credit.case_step (id, loan_application_id, step_code,"
        " assignee_employee_id, received_at, completed_at, result, created_by, created_at)"
        " VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $5)",
        uuid4(),
        loan_id,
        code,
        assignee,
        at,
        at + timedelta(hours=1) if completed else None,
        result if completed else None,
        created_by,
    )


async def add_rm_history(conn: asyncpg.Connection, customer_id: UUID, employee_id: UUID, until: date | None) -> None:
    await conn.execute(
        "INSERT INTO customer.relationship_manager_history (customer_id, employee_id,"
        " valid_from, valid_until) VALUES ($1, $2, DATE '2020-01-01', $3)",
        customer_id,
        employee_id,
        until,
    )


async def two_years_ago(conn: asyncpg.Connection) -> date:
    return await conn.fetchval("SELECT (CURRENT_DATE - INTERVAL '2 years')::date")


async def is_excluded(conn: asyncpg.Connection, employee_id: UUID, loan_id: UUID) -> bool:
    return await conn.fetchval("SELECT credit.is_excluded($1, $2)", employee_id, loan_id)


# ---------------------------------------------------------------------------
# E8
# ---------------------------------------------------------------------------


async def test_former_rm_within_2_years_is_excluded(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    # "Tung la QHKH den 12/2024": hom nay (11/2026) cach chua toi 2 nam.
    until = (await two_years_ago(mig)) + timedelta(days=30)
    await add_rm_history(mig, customer_id, DIRECTOR_HN, until)

    assert await is_excluded(mig, DIRECTOR_HN, loan_id) is True


async def test_former_rm_on_2_year_boundary_is_excluded(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await add_rm_history(mig, customer_id, DIRECTOR_HN, await two_years_ago(mig))

    assert await is_excluded(mig, DIRECTOR_HN, loan_id) is True


async def test_current_rm_history_row_is_excluded(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig, rm=None)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await add_rm_history(mig, customer_id, DIRECTOR_HN, None)

    assert await is_excluded(mig, DIRECTOR_HN, loan_id) is True


async def test_former_rm_over_2_years_not_excluded(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    until = (await two_years_ago(mig)) - timedelta(days=1)
    await add_rm_history(mig, customer_id, DIRECTOR_HN, until)

    assert await is_excluded(mig, DIRECTOR_HN, loan_id) is False


async def test_current_rm_is_excluded(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig, rm=CREDIT_OFFICER)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)

    assert await is_excluded(mig, CREDIT_OFFICER, loan_id) is True
    assert await is_excluded(mig, APPROVER_HO, loan_id) is False


async def test_step_participant_is_excluded(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await add_step(mig, loan_id, "APPRAISAL", assignee=CREDIT_APPRAISER, created_by=CREDIT_OFFICER, at=T0)
    await add_step(
        mig,
        loan_id,
        "RISK_REVIEW",
        assignee=RISK_HO,
        created_by=CREDIT_APPRAISER,
        at=T0 + timedelta(days=1),
        completed=False,
    )

    assert await is_excluded(mig, CREDIT_APPRAISER, loan_id) is True
    assert await is_excluded(mig, RISK_HO, loan_id) is True
    assert await is_excluded(mig, APPROVER_HO, loan_id) is False


async def test_step_creator_is_excluded(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await add_step(mig, loan_id, "CHECKING", assignee=None, created_by=DIRECTOR_HN, at=T0)

    assert await is_excluded(mig, DIRECTOR_HN, loan_id) is True


async def test_approver_on_own_open_approval_step_not_excluded(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await add_step(mig, loan_id, "RISK_REVIEW", assignee=RISK_HO, created_by=CREDIT_APPRAISER, at=T0)
    await add_step(
        mig, loan_id, "APPROVAL", assignee=APPROVER_HO, created_by=RISK_HO, at=T0 + timedelta(days=1), completed=False
    )

    assert await is_excluded(mig, APPROVER_HO, loan_id) is False


async def test_approver_who_returned_can_decide_again(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await add_step(mig, loan_id, "RISK_REVIEW", assignee=RISK_HO, created_by=CREDIT_APPRAISER, at=T0)
    await add_step(
        mig,
        loan_id,
        "APPROVAL",
        assignee=APPROVER_HO,
        created_by=RISK_HO,
        at=T0 + timedelta(days=1),
        result="RETURN_FOR_SUPPLEMENT",
    )
    # Tra lai bo sung sinh buoc APPRAISAL moi do chinh cap phe duyet tao.
    await add_step(
        mig, loan_id, "APPRAISAL", assignee=CREDIT_APPRAISER, created_by=APPROVER_HO, at=T0 + timedelta(days=2)
    )
    await add_step(
        mig, loan_id, "RISK_REVIEW", assignee=RISK_HO, created_by=CREDIT_APPRAISER, at=T0 + timedelta(days=3)
    )
    await add_step(
        mig, loan_id, "APPROVAL", assignee=APPROVER_HO, created_by=RISK_HO, at=T0 + timedelta(days=4), completed=False
    )

    assert await is_excluded(mig, APPROVER_HO, loan_id) is False


async def test_approver_with_other_decision_is_excluded(mig: asyncpg.Connection) -> None:
    """Chi buoc APPROVAL dang mo hoac 'Tra lai bo sung' moi duoc bo qua."""
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await add_step(mig, loan_id, "APPROVAL", assignee=APPROVER_HO, created_by=RISK_HO, at=T0, result="ESCALATED")

    assert await is_excluded(mig, APPROVER_HO, loan_id) is True


async def test_step_created_before_becoming_approver_still_excludes(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await add_step(mig, loan_id, "CHECKING", assignee=None, created_by=APPROVER_HO, at=T0)
    await add_step(
        mig, loan_id, "APPROVAL", assignee=APPROVER_HO, created_by=RISK_HO, at=T0 + timedelta(days=1), completed=False
    )

    assert await is_excluded(mig, APPROVER_HO, loan_id) is True


# ---------------------------------------------------------------------------
# Q4 / Q-T
# ---------------------------------------------------------------------------


async def exposure_as_rm(conn: asyncpg.Connection, loan_id: UUID) -> Decimal:
    await act_as(conn, CREDIT_OFFICER, BRANCH_HN)
    return await conn.fetchval("SELECT credit.total_credit_exposure($1)", loan_id)


async def tier_as_rm(conn: asyncpg.Connection, loan_id: UUID) -> int:
    await act_as(conn, CREDIT_OFFICER, BRANCH_HN)
    return await conn.fetchval("SELECT credit.required_tier($1)", loan_id)


async def group_case_95_2(conn: asyncpg.Connection) -> UUID:
    """Khach 80 ty de xuat + ben lien quan CONFIRMED du no 15,2 ty; ben PROPOSED 50 ty."""
    customer_id, _ = await new_customer(conn)
    loan_id = await new_loan(conn, customer_id, 80 * BILLION)
    related_id, related_party = await new_customer(conn)
    await new_loan_account(conn, related_id, Decimal("15200000000"))
    await add_related(conn, loan_id, related_party, "CONFIRMED")
    proposed_id, proposed_party = await new_customer(conn)
    await new_loan_account(conn, proposed_id, 50 * BILLION)
    await add_exposure(conn, proposed_id, 7 * BILLION)
    await add_related(conn, loan_id, proposed_party, "PROPOSED")
    rejected_id, rejected_party = await new_customer(conn)
    await new_loan_account(conn, rejected_id, 30 * BILLION)
    await add_related(conn, loan_id, rejected_party, "NOT_IN_GROUP")
    return loan_id


async def test_exposure_counts_confirmed_related_party_only(mig: asyncpg.Connection) -> None:
    loan_id = await group_case_95_2(mig)

    assert await exposure_as_rm(mig, loan_id) == Decimal("95200000000")


async def test_exposure_adds_own_outstanding_and_off_balance(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 10 * BILLION)
    await new_loan_account(mig, customer_id, 3 * BILLION)
    await new_loan_account(mig, customer_id, 4 * BILLION, status="CLOSED")
    await add_exposure(mig, customer_id, 2 * BILLION)

    assert await exposure_as_rm(mig, loan_id) == 15 * BILLION


async def test_tier_95_2_is_2(mig: asyncpg.Connection) -> None:
    loan_id = await group_case_95_2(mig)

    assert await tier_as_rm(mig, loan_id) == 2


async def test_tier_exactly_20_is_1(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 20 * BILLION)

    assert await tier_as_rm(mig, loan_id) == 1


async def test_tier_exactly_100_is_2(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, 100 * BILLION)

    assert await tier_as_rm(mig, loan_id) == 2


async def test_tier_100_000_000_001_is_3(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig)
    loan_id = await new_loan(mig, customer_id, Decimal("100000000001"))

    assert await tier_as_rm(mig, loan_id) == 3


async def test_exposure_requires_read_access(mig: asyncpg.Connection) -> None:
    customer_id, _ = await new_customer(mig, rm=CREDIT_OFFICER)
    loan_id = await new_loan(mig, customer_id, 5 * BILLION)
    await act_as(mig, RISK_HO, BRANCH_HO)

    for sql in ("SELECT credit.total_credit_exposure($1)", "SELECT credit.required_tier($1)"):
        with pytest.raises(asyncpg.InsufficientPrivilegeError):
            async with mig.transaction():  # savepoint: giao dich ngoai van dung duoc
                await mig.fetchval(sql, loan_id)


# ---------------------------------------------------------------------------
# bank_app goi duoc (EXECUTE) tren seed
# ---------------------------------------------------------------------------


async def test_bank_app_can_call_functions(db: asyncpg.Connection) -> None:
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)

    assert await db.fetchval("SELECT credit.is_excluded($1, $2)", CREDIT_OFFICER, LOAN_1) is True
    assert await db.fetchval("SELECT credit.total_credit_exposure($1)", LOAN_1) > 0
    assert await db.fetchval("SELECT credit.required_tier($1)", LOAN_1) == 1
