"""Ha tang kiem thu tich hop tren PostgreSQL that (dang nhap bank_app, chiu RLS)."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from uuid import UUID

import asyncpg
import pytest
import pytest_asyncio


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    for item in items:
        if "tests/integration" in item.nodeid.replace("\\", "/"):
            item.add_marker(pytest.mark.integration)


async def act_as(
    conn: asyncpg.Connection,
    employee_id: UUID,
    branch_id: UUID,
    *,
    is_admin: bool = False,
) -> None:
    """Dat ngu canh RLS (transaction-local) giong rls_context.set_rls_context."""
    await conn.execute(
        "SELECT set_config('app.employee_id', $1, true),"
        " set_config('app.branch_id', $2, true),"
        " set_config('app.is_admin', $3, true)",
        str(employee_id),
        str(branch_id),
        "true" if is_admin else "false",
    )


@pytest_asyncio.fixture
async def db() -> AsyncIterator[asyncpg.Connection]:
    dsn = os.environ.get("TEST_APP_DSN")
    if not dsn:
        pytest.skip("TEST_APP_DSN chua dat; chay backend/scripts/test-integration.ps1")
    conn = await asyncpg.connect(dsn)
    tx = conn.transaction()
    await tx.start()
    try:
        yield conn
    finally:
        await tx.rollback()
        await conn.close()
