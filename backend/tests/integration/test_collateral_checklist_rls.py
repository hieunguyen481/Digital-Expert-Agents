"""V041: RLS cho credit.collateral va credit.loan_checklist_item (Postgres that, ROLLBACK sau moi test)."""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from tests.integration.seed_ids import ADMIN_HO, AUDITOR_HO, BRANCH_HN, BRANCH_HO, CREDIT_OFFICER, DOCUMENT_REVIEWER, LOAN_VINANOVA

from app.db.rls_context import rls_transaction

TABLES = ("credit.collateral", "credit.loan_checklist_item")
BRANCH = {CREDIT_OFFICER: BRANCH_HN, DOCUMENT_REVIEWER: BRANCH_HN}


class _Rollback(Exception):
    pass


async def _as(employee: UUID | None, body: Callable[[AsyncSession], Awaitable[Any]]) -> Any:
    dsn = os.environ.get("TEST_APP_DSN")
    if not dsn:
        pytest.skip("TEST_APP_DSN chua dat")
    engine = create_async_engine(dsn.replace("postgresql://", "postgresql+asyncpg://"))
    out: list[Any] = []
    try:
        async with AsyncSession(engine) as session:
            try:
                if employee is None:  # khong dat ngu canh RLS: nhan vien hien tai = NULL
                    out.append(await body(session))
                else:
                    async with rls_transaction(
                        session, employee_id=employee, branch_id=BRANCH.get(employee, BRANCH_HO),
                        is_admin=employee == ADMIN_HO,
                    ):
                        out.append(await body(session))
                        raise _Rollback
                raise _Rollback
            except _Rollback:
                await session.rollback()
    finally:
        await engine.dispose()
    return out[0]


def _count(table: str) -> Callable[[AsyncSession], Awaitable[int]]:
    async def body(s: AsyncSession) -> int:
        return int((await s.execute(text(f"SELECT count(*) FROM {table}"))).scalar_one())

    return body


@pytest.mark.parametrize("table", TABLES)
async def test_no_employee_context_reads_nothing(table: str) -> None:
    assert await _as(None, _count(table)) == 0


@pytest.mark.parametrize("table", TABLES)
async def test_admin_isolated_from_business_rows(table: str) -> None:
    assert await _as(ADMIN_HO, _count(table)) == 0


@pytest.mark.parametrize("table", TABLES)
async def test_employee_without_assignment_reads_fewer_rows_than_auditor(table: str) -> None:
    total = await _as(AUDITOR_HO, _count(table))  # kiem toan doc moi ho so
    assert await _as(CREDIT_OFFICER, _count(table)) > 0  # QHKH phu trach
    assert await _as(DOCUMENT_REVIEWER, _count(table)) < total


@pytest.mark.parametrize("table", TABLES)
async def test_auditor_cannot_update(table: str) -> None:
    async def body(s: AsyncSession) -> int:
        col = "valuation_status" if table.endswith("collateral") else "requirement_status"
        return (await s.execute(text(f"UPDATE {table} SET {col} = {col}"))).rowcount

    assert await _as(AUDITOR_HO, body) == 0


async def test_loan_checklist_visible_to_auditor() -> None:
    async def body(s: AsyncSession) -> int:
        q = "SELECT count(*) FROM credit.loan_checklist_item WHERE loan_application_id = :l"
        return int((await s.execute(text(q), {"l": LOAN_VINANOVA})).scalar_one())

    assert await _as(AUDITOR_HO, body) > 0
