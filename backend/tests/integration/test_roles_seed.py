"""Ma tran vai tro/quyen, nhan vien moi va tham quyen phe duyet (seed)."""

from __future__ import annotations

import pytest
from tests.integration.seed_ids import (
    APPROVER2_HO,
    APPROVER_HO,
    BRANCH_HN,
    CREDIT_APPRAISER,
    CREDIT_MANAGER,
    CREDIT_OFFICER,
    DIRECTOR_HN,
    DOCUMENT_REVIEWER,
    RISK_HO,
)

EXPECTED: dict[str, set[str]] = {
    "credit_officer": {
        "customer:read", "customer:search", "account:read", "transaction:read",
        "document:read", "document:upload", "document:download", "document:verify",
        "loan:read", "loan:create", "loan:update", "loan:submit",
        "policy:read", "report:read", "report:generate",
    },
    "credit_manager": {
        "customer:read", "customer:search", "account:read", "transaction:read",
        "document:read", "document:download", "loan:read", "loan:update",
        "loan:analyze", "loan:submit", "policy:read", "report:read",
        "report:generate", "report:review", "report:export",
    },
    "document_reviewer": {
        "customer:read", "customer:search", "document:read", "document:download",
        "document:verify", "loan:read", "policy:read", "report:read",
    },
    "credit_appraiser": {
        "customer:read", "customer:search", "account:read", "transaction:read",
        "document:read", "document:download", "document:verify", "loan:read",
        "loan:update", "loan:analyze", "policy:read", "report:read",
        "report:generate",
    },
    "compliance_officer": {
        "customer:read", "customer:search", "document:read", "document:download",
        "document:verify", "loan:read", "loan:analyze", "policy:read",
        "report:read", "report:review",
    },
    "risk_officer": {
        "customer:read", "customer:search", "account:read", "transaction:read",
        "document:read", "loan:read", "loan:analyze", "policy:read",
        "report:read", "report:review",
    },
    "loan_approver": {
        "customer:read", "customer:search", "account:read", "transaction:read",
        "document:read", "document:download", "loan:read", "loan:approve",
        "policy:read", "report:read", "report:review", "report:export",
    },
    "auditor": {
        "customer:read", "account:read", "transaction:read", "document:read",
        "document:download", "loan:read", "policy:read", "report:read",
        "report:export", "audit:read",
    },
    "admin": {"admin:manage"},
}


@pytest.mark.parametrize("role_code", sorted(EXPECTED))
async def test_role_permission_set(db, role_code):
    rows = await db.fetch(
        """
        SELECT p.permission_code
        FROM identity.role_permission rp
        JOIN identity.role r ON r.id = rp.role_id
        JOIN identity.permission p ON p.id = rp.permission_id
        WHERE r.role_code = $1
        """,
        role_code,
    )
    assert {r["permission_code"] for r in rows} == EXPECTED[role_code]


@pytest.mark.parametrize(
    ("employee_id", "role_code", "email"),
    [
        (CREDIT_APPRAISER, "credit_appraiser", "appraiser@example.local"),
        (RISK_HO, "risk_officer", "risk@example.local"),
        (DIRECTOR_HN, "loan_approver", "director.hn@example.local"),
        (APPROVER2_HO, "loan_approver", "approver2@example.local"),
    ],
)
async def test_new_employees(db, employee_id, role_code, email):
    emp = await db.fetchrow(
        "SELECT email, employment_status, identity_subject FROM identity.employee WHERE id = $1",
        employee_id,
    )
    assert emp["email"] == email
    assert emp["employment_status"] == "ACTIVE"
    assert emp["identity_subject"] == str(employee_id)
    roles = await db.fetch(
        """
        SELECT r.role_code FROM identity.employee_role er
        JOIN identity.role r ON r.id = er.role_id WHERE er.employee_id = $1
        """,
        employee_id,
    )
    assert [r["role_code"] for r in roles] == [role_code]


async def test_employee_authority(db):
    rows = await db.fetch(
        "SELECT employee_id, tier, unit_scope, branch_id FROM identity.employee_authority"
    )
    got = {r["employee_id"]: (r["tier"], r["unit_scope"], r["branch_id"]) for r in rows}
    assert got[APPROVER_HO] == (2, "HO", None)
    assert got[DIRECTOR_HN] == (1, "BRANCH", BRANCH_HN)
    assert got[APPROVER2_HO] == (2, "HO", None)


async def test_branch_scope_rows_removed_for_staff_and_added_for_director(db):
    rows = await db.fetch(
        "SELECT employee_id FROM identity.employee_scope WHERE scope_type = 'BRANCH'"
    )
    ids = {r["employee_id"] for r in rows}
    assert not ({CREDIT_OFFICER, CREDIT_MANAGER, DOCUMENT_REVIEWER} & ids)
    assert DIRECTOR_HN in ids
