"""Q-J: Quan tri he thong khong co quyen nghiep vu o tang RLS."""

from __future__ import annotations

from uuid import uuid4

import asyncpg
import pytest
from tests.integration.conftest import act_as
from tests.integration.seed_ids import ADMIN_HO, BRANCH_HO, LOAN_1


async def test_admin_sees_no_customer(db):
    await act_as(db, ADMIN_HO, BRANCH_HO, is_admin=True)
    assert await db.fetchval("SELECT count(*) FROM customer.customer") == 0


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
