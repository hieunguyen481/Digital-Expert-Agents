"""Tai hien lo hong RLS tren Postgres that: nguoi duyet khong co scope van thay khach chi nhanh khac."""

from __future__ import annotations

from tests.integration.conftest import act_as
from tests.integration.seed_ids import (
    APPROVER_HO,
    BRANCH_HN,
    BRANCH_HO,
    CREDIT_OFFICER,
    CUSTOMER_A,
    LOAN_1,
)


async def test_approver_without_scope_sees_no_branch2_customer(db):
    await act_as(db, APPROVER_HO, BRANCH_HO)
    # Khach cua ho so ma nguoi phe duyet dang nhan buoc (seed SME: Thanh Dat, Minh Tam) thi
    # doc duoc theo Q-M; ngoai ra khong thay khach nao cua chi nhanh HN.
    rows = await db.fetch(
        """
        SELECT c.id FROM customer.customer AS c
        WHERE c.home_branch_id = $1
          AND NOT EXISTS (
              SELECT 1 FROM credit.loan_application AS la
              JOIN credit.case_step AS s ON s.loan_application_id = la.id
              WHERE la.primary_customer_id = c.id AND s.assignee_employee_id = $2
          )
        """,
        BRANCH_HN,
        APPROVER_HO,
    )
    assert rows == []


async def test_can_access_customer_false_without_scope(db):
    await act_as(db, APPROVER_HO, BRANCH_HO)
    assert (
        await db.fetchval("SELECT identity.can_access_customer($1,$2)", APPROVER_HO, CUSTOMER_A)
        is False
    )


async def test_rm_sees_own_customer(db):
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    assert await db.fetchval("SELECT count(*) FROM customer.customer WHERE id = $1", CUSTOMER_A) == 1


async def test_can_access_loan_false_without_scope(db):
    await act_as(db, APPROVER_HO, BRANCH_HO)
    assert await db.fetchval("SELECT identity.can_access_loan($1,$2)", APPROVER_HO, LOAN_1) is False
