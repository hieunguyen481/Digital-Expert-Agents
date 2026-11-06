"""Own profile through the RLS session (EmployeeRepository)."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from tests.integration.seed_ids import (
    ADMIN_HO,
    APPROVER_HO,
    BRANCH_HN,
    BRANCH_HO,
    CREDIT_OFFICER,
    DIRECTOR_HN,
)

from app.db.rls_context import rls_transaction
from app.repositories.employee_repository import EmployeeRepository
import os


@pytest.mark.parametrize(
    ("employee", "branch", "admin", "code", "tier"),
    [
        (APPROVER_HO, BRANCH_HO, False, "HO", 2),
        (DIRECTOR_HN, BRANCH_HN, False, "HN-DEMO", 1),
        (CREDIT_OFFICER, BRANCH_HN, False, "HN-DEMO", None),
        (ADMIN_HO, BRANCH_HO, True, "HO", None),
    ],
)
async def test_profile(employee, branch, admin, code, tier) -> None:  # type: ignore[no-untyped-def]
    dsn = os.environ.get("TEST_APP_DSN")
    if not dsn:
        pytest.skip("TEST_APP_DSN chua dat")
    engine = create_async_engine(dsn.replace("postgresql://", "postgresql+asyncpg://"))
    try:
        from sqlalchemy.ext.asyncio import AsyncSession

        async with AsyncSession(engine) as session:
            async with rls_transaction(
                session, employee_id=employee, branch_id=branch, is_admin=admin
            ):
                profile = await EmployeeRepository(session).get_profile(employee)
    finally:
        await engine.dispose()
    assert profile is not None
    assert profile.branch_code == code
    assert profile.approval_tier == tier
    assert profile.full_name
