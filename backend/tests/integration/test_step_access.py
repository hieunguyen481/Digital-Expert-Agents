"""V023: quyen theo buoc xu ly (Q-M), ham ngay lam viec.

Moi kiem thu chay trong giao dich duoc rollback (fixture db), dang nhap bank_app nen chiu RLS.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import asyncpg
import pytest
from tests.integration.conftest import act_as
from tests.integration.seed_ids import (
    AUDITOR_HO,
    BRANCH_HN,
    BRANCH_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    CUSTOMER_A,
    CUSTOMER_B,
    CUSTOMER_C,
    DIRECTOR_HN,
    DOCUMENT_REVIEWER,
    LOAN_1,
)

_PRODUCT = "40000000-0000-4000-8000-000000000001"
# Tai lieu / truong trich xuat seed cua khach A (R__seed_demo_customers.sql).
_SEED_DOCUMENT = UUID("52100000-0000-4000-8000-000000000001")
_SEED_FIELD = UUID("52300000-0000-4000-8000-000000000001")


async def _draft_loan(db, status: str = "DRAFT") -> UUID:
    """QHKH (...0001) lap ho so moi cho khach A (chi nhanh HN)."""
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
                $5, $6, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP)
        """,
        loan_id,
        f"LA-STEP-{uuid4().hex[:8]}",
        CUSTOMER_A,
        _PRODUCT,
        status,
        CREDIT_OFFICER,
    )
    return loan_id


async def _add_step(db, loan_id: UUID, step_code: str, assignee: UUID, *, completed: bool = False) -> None:
    """QHKH (dang o DRAFT nen duoc ghi) tao buoc giao cho nguoi khac."""
    await db.execute(
        """
        INSERT INTO credit.case_step (
            id, loan_application_id, step_code, assignee_employee_id,
            received_at, completed_at, result, created_by, created_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP,
                CASE WHEN $5 THEN CURRENT_TIMESTAMP END,
                CASE WHEN $5 THEN 'DONE' END,
                $6, CURRENT_TIMESTAMP)
        """,
        uuid4(),
        loan_id,
        step_code,
        assignee,
        completed,
        CREDIT_OFFICER,
    )


async def _insert_analysis_case(db, loan_id: UUID, *, created_by: UUID = CREDIT_OFFICER) -> UUID:
    case_id = uuid4()
    await db.execute(
        """
        INSERT INTO ai.analysis_case (
            id, case_type, customer_id, loan_application_id, created_by, status,
            objective, correlation_id, created_at
        )
        VALUES ($1, 'LOAN_APPLICATION_ANALYSIS', $2, $3, $4, 'CREATED',
                'kiem thu', $5, CURRENT_TIMESTAMP)
        """,
        case_id,
        CUSTOMER_A,
        loan_id,
        created_by,
        uuid4(),
    )
    return case_id


async def _count_loan(db, loan_id: UUID) -> int:
    return await db.fetchval("SELECT count(*) FROM credit.loan_application WHERE id = $1", loan_id)


async def _count_customer(db, customer_id: UUID) -> int:
    return await db.fetchval("SELECT count(*) FROM customer.customer WHERE id = $1", customer_id)


# --- Q-M: ai doc duoc ho so nao ---------------------------------------------


async def test_assignee_from_other_branch_reads_assigned_case(db):
    """Review Focus 1: Hoi so doc ho so duoc phan cong du khac chi nhanh."""
    loan_id = await _draft_loan(db)
    await _add_step(db, loan_id, "APPRAISAL", CREDIT_APPRAISER)

    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    assert await _count_loan(db, loan_id) == 1
    assert await _count_customer(db, CUSTOMER_A) == 1
    assert await db.fetchval("SELECT count(*) FROM credit.case_step WHERE loan_application_id = $1", loan_id) == 1
    # Chi doc ho so duoc giao, khong lan sang khach khac cua chi nhanh HN.
    assert await _count_customer(db, CUSTOMER_B) == 0
    assert await _count_loan(db, LOAN_1) == 0


async def test_same_branch_colleague_cannot_read(db):
    loan_id = await _draft_loan(db)

    await act_as(db, DOCUMENT_REVIEWER, BRANCH_HN)
    assert await _count_loan(db, loan_id) == 0
    assert await _count_loan(db, LOAN_1) == 0
    assert await _count_customer(db, CUSTOMER_A) == 0
    assert await db.fetchval("SELECT identity.can_access_customer($1, $2)", DOCUMENT_REVIEWER, CUSTOMER_A) is False


async def test_past_assignee_reads_but_cannot_write(db):
    loan_id = await _draft_loan(db)
    await _add_step(db, loan_id, "APPRAISAL", CREDIT_APPRAISER, completed=True)

    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    assert await _count_loan(db, loan_id) == 1
    assert await db.fetchval("SELECT identity.can_write_loan($1, $2)", CREDIT_APPRAISER, loan_id) is False
    result = await db.execute("UPDATE credit.loan_application SET loan_purpose = 'SUA' WHERE id = $1", loan_id)
    assert result == "UPDATE 0"


async def test_open_step_assignee_can_write(db):
    loan_id = await _draft_loan(db)
    await _add_step(db, loan_id, "APPRAISAL", CREDIT_APPRAISER)
    # QHKH chuyen ho so khoi DRAFT (WITH CHECK xet trang thai truoc khi sua).
    assert (
        await db.execute("UPDATE credit.loan_application SET status = 'APPRAISAL' WHERE id = $1", loan_id) == "UPDATE 1"
    )
    # Het DRAFT thi QHKH khong ghi duoc nua.
    assert (
        await db.execute("UPDATE credit.loan_application SET loan_purpose = 'SUA' WHERE id = $1", loan_id) == "UPDATE 0"
    )

    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    assert await db.fetchval("SELECT identity.can_write_loan($1, $2)", CREDIT_APPRAISER, loan_id) is True
    assert (
        await db.execute("UPDATE credit.loan_application SET loan_purpose = 'TD' WHERE id = $1", loan_id) == "UPDATE 1"
    )


@pytest.mark.parametrize("status", ["DRAFT", "RETURNED_TO_RM", "APPRAISAL_PENDING_INFO"])
async def test_rm_writes_only_in_rm_statuses(db, status):
    loan_id = await _draft_loan(db, status)
    assert await db.fetchval("SELECT identity.can_write_loan($1, $2)", CREDIT_OFFICER, loan_id) is True


async def test_rm_cannot_write_case_in_appraisal(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    # LOAN_1 dang APPRAISAL, QHKH van doc duoc nhung khong ghi.
    assert await _count_loan(db, LOAN_1) == 1
    assert await db.fetchval("SELECT identity.can_write_loan($1, $2)", CREDIT_OFFICER, LOAN_1) is False
    assert (
        await db.execute("UPDATE credit.loan_application SET loan_purpose = 'SUA' WHERE id = $1", LOAN_1) == "UPDATE 0"
    )


async def test_auditor_reads_all_cannot_write(db):
    loan_id = await _draft_loan(db)
    await _add_step(db, loan_id, "APPRAISAL", CREDIT_APPRAISER)

    await act_as(db, AUDITOR_HO, BRANCH_HO)
    assert await _count_loan(db, LOAN_1) == 1
    assert await _count_loan(db, loan_id) == 1
    assert await db.fetchval("SELECT identity.can_read_loan($1, $2)", AUDITOR_HO, LOAN_1) is True
    assert await db.fetchval("SELECT count(*) FROM credit.case_step WHERE loan_application_id = $1", loan_id) == 1
    assert (
        await db.execute("UPDATE credit.loan_application SET loan_purpose = 'SUA' WHERE id = $1", LOAN_1) == "UPDATE 0"
    )
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        await db.execute(
            """
            INSERT INTO credit.case_flag (
                id, loan_application_id, code, severity, title, blocks_submission,
                status, source, created_by, created_at, updated_at
            )
            VALUES ($1, $2, 'AUDIT', 'LOW', 'Kiem toan thu ghi', FALSE, 'OPEN',
                    'TEST', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            uuid4(),
            LOAN_1,
            AUDITOR_HO,
        )


async def test_auditor_reads_case_business_data_read_only(db):
    """Q-M: Kiem toan doc toan he thong (khach, tai lieu, truong, tai khoan, giao dich, AI), chi doc."""
    loan_id = await _draft_loan(db)  # QHKH (...0001) dang o DRAFT
    case_id = await _insert_analysis_case(db, loan_id)

    await act_as(db, AUDITOR_HO, BRANCH_HO)
    customers = await db.fetchval(
        "SELECT count(*) FROM customer.customer WHERE id = ANY($1::uuid[])",
        [CUSTOMER_A, CUSTOMER_B, CUSTOMER_C],
    )
    assert customers == 3
    assert await db.fetchval("SELECT count(*) FROM banking.account") >= 7
    assert await db.fetchval('SELECT count(*) FROM banking."transaction"') > 0
    assert await db.fetchval("SELECT count(*) FROM document.document WHERE id = $1", _SEED_DOCUMENT) == 1
    assert (
        await db.fetchval("SELECT count(*) FROM document.document_version WHERE document_id = $1", _SEED_DOCUMENT) == 1
    )
    assert await db.fetchval("SELECT count(*) FROM document.extracted_field WHERE id = $1", _SEED_FIELD) == 1
    assert await db.fetchval("SELECT count(*) FROM ai.analysis_case WHERE id = $1", case_id) == 1

    assert await db.execute("UPDATE customer.customer SET risk_rating = 'HIGH' WHERE id = $1", CUSTOMER_A) == "UPDATE 0"
    assert await db.execute("UPDATE document.document SET title = 'sua' WHERE id = $1", _SEED_DOCUMENT) == "UPDATE 0"
    assert (
        await db.execute("UPDATE document.extracted_field SET verification_reason = 'x' WHERE id = $1", _SEED_FIELD)
        == "UPDATE 0"
    )
    assert await db.execute("UPDATE banking.account SET status = 'CLOSED'") == "UPDATE 0"
    assert await db.execute("UPDATE ai.analysis_case SET objective = 'x' WHERE id = $1", case_id) == "UPDATE 0"


async def test_past_assignee_cannot_write_customer_or_documents(db):
    """Nguoi da xong buoc doc duoc khach/tai lieu nhung khong ghi (vong sua Task 6)."""
    loan_id = await _draft_loan(db)
    await _add_step(db, loan_id, "APPRAISAL", CREDIT_APPRAISER, completed=True)

    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    assert await _count_customer(db, CUSTOMER_A) == 1
    assert await db.fetchval("SELECT count(*) FROM document.document WHERE id = $1", _SEED_DOCUMENT) == 1
    assert await db.execute("UPDATE customer.customer SET risk_rating = 'HIGH' WHERE id = $1", CUSTOMER_A) == "UPDATE 0"
    assert await db.execute("UPDATE document.document SET title = 'sua' WHERE id = $1", _SEED_DOCUMENT) == "UPDATE 0"
    assert (
        await db.execute("UPDATE document.extracted_field SET verification_reason = 'x' WHERE id = $1", _SEED_FIELD)
        == "UPDATE 0"
    )
    assert await db.execute("UPDATE banking.account SET status = 'CLOSED'") == "UPDATE 0"
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        async with db.transaction():
            await db.execute(
                """
                INSERT INTO banking.cic_consent (id, customer_id, document_id, signed_on)
                VALUES ($1, $2, $3, CURRENT_DATE)
                """,
                uuid4(),
                CUSTOMER_A,
                _SEED_DOCUMENT,
            )
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        async with db.transaction():
            await db.execute(
                """
                INSERT INTO credit.loan_application (
                    id, application_number, primary_customer_id, product_id,
                    requested_amount, currency, requested_term_months, loan_purpose,
                    status, assigned_employee_id, created_at, created_by, updated_at
                )
                VALUES ($1, $2, $3, $4, 1000000, 'VND', 12, 'WORKING_CAPITAL',
                        'DRAFT', $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP)
                """,
                uuid4(),
                f"LA-PAST-{uuid4().hex[:8]}",
                CUSTOMER_A,
                _PRODUCT,
                CREDIT_APPRAISER,
            )
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        async with db.transaction():
            await _insert_analysis_case(db, loan_id, created_by=CREDIT_APPRAISER)


async def test_open_step_assignee_writes_customer_documents(db):
    loan_id = await _draft_loan(db)
    await _add_step(db, loan_id, "APPRAISAL", CREDIT_APPRAISER)

    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    assert await db.execute("UPDATE document.document SET title = 'TD' WHERE id = $1", _SEED_DOCUMENT) == "UPDATE 1"
    assert (
        await db.execute("UPDATE document.extracted_field SET verification_reason = 'TD' WHERE id = $1", _SEED_FIELD)
        == "UPDATE 1"
    )


async def test_director_reads_branch_customers(db):
    await act_as(db, DIRECTOR_HN, BRANCH_HN)
    rows = await db.fetch(
        "SELECT id FROM customer.customer WHERE id = ANY($1::uuid[]) ORDER BY id",
        [CUSTOMER_A, CUSTOMER_B, CUSTOMER_C],
    )
    assert [r["id"] for r in rows] == [CUSTOMER_A, CUSTOMER_B]
    assert await _count_loan(db, LOAN_1) == 1


async def test_can_read_and_write_loan_require_current_employee(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    assert await db.fetchval("SELECT identity.can_read_loan($1, $2)", AUDITOR_HO, LOAN_1) is False
    assert await db.fetchval("SELECT identity.can_write_loan($1, $2)", CREDIT_APPRAISER, LOAN_1) is False


# --- Ngay lam viec ------------------------------------------------------------


@pytest.mark.parametrize(
    ("start", "n", "expected"),
    [
        # Thu Sau 06/11/2026 10:00 (gio VN) + 2 ngay LV -> Thu Ba 10/11 17:00.
        (datetime(2026, 11, 6, 3, 0, tzinfo=UTC), 2, datetime(2026, 11, 10, 10, 0, tzinfo=UTC)),
        # Thu Bay -> tinh tu Thu Hai 09/11; +2 -> Thu Tu 11/11 17:00.
        (datetime(2026, 11, 7, 3, 0, tzinfo=UTC), 2, datetime(2026, 11, 11, 10, 0, tzinfo=UTC)),
        # Chu Nhat, n = 0 -> ngay lam viec ke tiep 17:00.
        (datetime(2026, 11, 8, 3, 0, tzinfo=UTC), 0, datetime(2026, 11, 9, 10, 0, tzinfo=UTC)),
        # 23:30 UTC Thu Sau = 06:30 Thu Bay gio VN -> tinh tu Thu Hai; +5 -> Thu Hai 16/11.
        (datetime(2026, 11, 6, 23, 30, tzinfo=UTC), 5, datetime(2026, 11, 16, 10, 0, tzinfo=UTC)),
    ],
)
async def test_add_workdays(db, start, n, expected):
    assert await db.fetchval("SELECT credit.add_workdays($1, $2)", start, n) == expected


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        (date(2026, 11, 6), date(2026, 11, 6), 0),
        (date(2026, 11, 6), date(2026, 11, 9), 1),  # Thu Sau -> Thu Hai
        (date(2026, 11, 6), date(2026, 11, 13), 5),
        (date(2026, 11, 13), date(2026, 11, 6), -5),
        (date(2026, 11, 7), date(2026, 11, 8), 0),  # chi cuoi tuan
    ],
)
async def test_workdays_between(db, a, b, expected):
    assert await db.fetchval("SELECT credit.workdays_between($1, $2)", a, b) == expected
