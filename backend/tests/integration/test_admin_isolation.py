"""Q-J: Quan tri he thong khong co quyen nghiep vu o tang RLS."""

from __future__ import annotations

from uuid import uuid4

import asyncpg
import pytest
from tests.integration.conftest import act_as
from tests.integration.seed_ids import (
    ACCOUNT_A_HO,
    ADMIN_HO,
    APPROVER_HO,
    BRANCH_HN,
    BRANCH_HO,
    CREDIT_OFFICER,
    LOAN_1,
)


async def test_admin_sees_no_customer(db):
    await act_as(db, ADMIN_HO, BRANCH_HO, is_admin=True)
    assert await db.fetchval("SELECT count(*) FROM customer.customer") == 0
    assert await db.fetchval("SELECT count(*) FROM banking.account") == 0
    assert await db.fetchval("SELECT count(*) FROM credit.loan_application") == 0


async def test_admin_cannot_see_ho_branch_customer_or_account(db):
    """Quan tri ngoi o Hoi so khong duoc thay khach/tai khoan Hoi so qua quy tac cung chi nhanh."""
    # Nhan vien Hoi so lap khach hang Hoi so (customer_insert_policy cho phep), khong co QHKH.
    await act_as(db, APPROVER_HO, BRANCH_HO)
    party_id, customer_id = uuid4(), uuid4()
    await db.execute(
        """
        INSERT INTO customer.party (
            id, party_type, display_name, status, created_at, created_by,
            updated_at, updated_by, version
        )
        VALUES ($1, 'PERSON', 'Khach Hoi so thu', 'ACTIVE', CURRENT_TIMESTAMP, $2,
                CURRENT_TIMESTAMP, $2, 1)
        """,
        party_id,
        APPROVER_HO,
    )
    await db.execute(
        """
        INSERT INTO customer.customer (
            id, party_id, customer_number, customer_segment, home_branch_id,
            relationship_manager_id, onboarding_date, kyc_status, risk_rating,
            risk_rating_as_of, status, created_at, updated_at, version
        )
        VALUES ($1, $2, $3, 'MASS', $4, NULL, CURRENT_DATE, 'VERIFIED', 'LOW',
                CURRENT_DATE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
        """,
        customer_id,
        party_id,
        f"CIF-HO-{uuid4().hex[:8]}",
        BRANCH_HO,
    )
    # Tai khoan chi nhanh Hoi so co that (seed): QHKH cua chu tai khoan thay duoc.
    # bank_app khong tao duoc tai khoan duoi RLS (tai khoan den tu core banking, chua co
    # chu tai khoan thi WITH CHECK khong qua), nen dung tai khoan seed ACCOUNT_A_HO.
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    assert await db.fetchval("SELECT count(*) FROM banking.account WHERE id = $1", ACCOUNT_A_HO) == 1

    for is_admin in (True, False):
        await act_as(db, ADMIN_HO, BRANCH_HO, is_admin=is_admin)
        assert await db.fetchval("SELECT count(*) FROM customer.customer WHERE id = $1", customer_id) == 0
        assert (
            await db.fetchval("SELECT identity.can_access_customer($1, $2)", ADMIN_HO, customer_id)
            is False
        )
        assert (
            await db.fetchval("SELECT count(*) FROM banking.account WHERE branch_id = $1", BRANCH_HO)
            == 0
        )


async def test_admin_cannot_insert_loan_decision(db):
    await act_as(db, ADMIN_HO, BRANCH_HO, is_admin=True)
    with pytest.raises(asyncpg.InsufficientPrivilegeError):
        await db.execute(
            """
            INSERT INTO credit.loan_decision (
                id, loan_application_id, decision_type, rationale,
                decision_maker_id, decision_at, created_at
            )
            VALUES ($1, $2, 'APPROVED', 'admin thu ghi quyet dinh', $3,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            uuid4(),
            LOAN_1,
            ADMIN_HO,
        )
