"""Q-D2: truong phong chi doc ho so thuoc phong minh (identity.loan_in_manager_department, V053).

Chay bang migrator trong mot giao dich va rollback cuoi test (khong dong nao duoc commit).
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from uuid import UUID

import asyncpg
import pytest
import pytest_asyncio
from tests.integration.seed_ids import APPRAISER_2, CREDIT_APPRAISER, CREDIT_MANAGER, CREDIT_OFFICER, LOAN_1

DOCOPS = UUID("31000000-0000-4000-8000-000000000002")


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


async def in_scope(conn: asyncpg.Connection, employee: UUID) -> bool:
    return await conn.fetchval("SELECT identity.loan_in_manager_department($1, $2)", employee, LOAN_1)


async def test_manager_reads_case_of_own_department(mig: asyncpg.Connection) -> None:
    # LOAN_1: QHKH = CREDIT_OFFICER, cung phong tin dung voi truong phong.
    assert await in_scope(mig, CREDIT_MANAGER)


async def test_manager_of_other_department_does_not_read(mig: asyncpg.Connection) -> None:
    await mig.execute("UPDATE identity.employee SET department_id = $1 WHERE id = $2", DOCOPS, CREDIT_MANAGER)
    assert not await in_scope(mig, CREDIT_MANAGER)


async def test_non_manager_never_gets_department_scope(mig: asyncpg.Connection) -> None:
    assert not await in_scope(mig, CREDIT_OFFICER)


async def test_team_appraisers_share_manager_department(mig: asyncpg.Connection) -> None:
    rows = await mig.fetch(
        "SELECT id FROM identity.employee WHERE department_id = "
        "(SELECT department_id FROM identity.employee WHERE id = $1)",
        CREDIT_MANAGER,
    )
    assert {CREDIT_APPRAISER, APPRAISER_2} <= {r["id"] for r in rows}
