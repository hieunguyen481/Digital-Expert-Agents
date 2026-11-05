"""Tai hien lo hong RLS tren Postgres that: nguoi duyet khong co scope van thay khach chi nhanh khac."""

from __future__ import annotations

import pytest

from tests.integration.conftest import act_as
from tests.integration.seed_ids import (
    APPROVER_HO,
    BRANCH_HN,
    BRANCH_HO,
    CREDIT_OFFICER,
    CUSTOMER_A,
)


@pytest.mark.xfail(strict=True, reason="Task 2")
async def test_approver_without_scope_sees_no_branch2_customer(db):
    await act_as(db, APPROVER_HO, BRANCH_HO)
    rows = await db.fetch("SELECT id FROM customer.customer WHERE home_branch_id = $1", BRANCH_HN)
    assert rows == []


@pytest.mark.xfail(strict=True, reason="Task 2")
async def test_can_access_customer_false_without_scope(db):
    await act_as(db, APPROVER_HO, BRANCH_HO)
    assert (
        await db.fetchval("SELECT identity.can_access_customer($1,$2)", APPROVER_HO, CUSTOMER_A)
        is False
    )


async def test_rm_sees_own_customer(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    assert await db.fetchval("SELECT count(*) FROM customer.customer WHERE id = $1", CUSTOMER_A) == 1
