"""Kiem tra kieu tham so asyncpg cua report/job/customer repository qua AsyncSession that (RLS)."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from tests.integration.seed_ids import BRANCH_HN, CREDIT_MANAGER, CREDIT_OFFICER, CUSTOMER_A

from app.db.rls_context import set_rls_context
from app.repositories.customer_repository import CustomerRepository
from app.repositories.job_repository import JobRepository
from app.repositories.report_repository import ReportRepository


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    dsn = os.environ.get("TEST_APP_DSN")
    if not dsn:
        pytest.skip("TEST_APP_DSN chua dat; chay backend/scripts/test-integration.ps1")
    engine = create_async_engine(dsn.replace("postgresql://", "postgresql+asyncpg://", 1))
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                yield AsyncSession(bind=connection)
            finally:
                await transaction.rollback()
    finally:
        await engine.dispose()


async def test_report_create_with_missing_case_raises_lookup_not_type_error(session):
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    with pytest.raises(LookupError):
        await ReportRepository(session).create(
            report_id=uuid4(),
            analysis_case_id=uuid4(),
            report_type="CREDIT_MEMO",
            actor_id=CREDIT_OFFICER,
            outbox_id=uuid4(),
            correlation_id=uuid4(),
            event={},
            headers={},
        )


@pytest.mark.parametrize("status", ["REVIEWED", "CHANGES_REQUESTED", "APPROVED"])
async def test_report_review_missing_report_returns_none(session, status):
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    result = await ReportRepository(session).review(uuid4(), CREDIT_OFFICER, status, "ghi chu")
    assert result is None


async def test_report_review_without_note_returns_none(session):
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    assert await ReportRepository(session).review(uuid4(), CREDIT_OFFICER, "APPROVED") is None


async def test_job_append_event_has_no_type_error_for_missing_job(session):
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    try:
        result = await JobRepository(session).append_event(uuid4(), "PROGRESS", {"k": 1})
    except IntegrityError:
        return  # job khong ton tai: FK tu choi - hop le, khong phai loi kieu tham so
    assert result is None


async def test_claim_same_owner_does_not_bump_version(session):
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    repo = CustomerRepository(session)
    current = (
        await session.execute(
            text("SELECT version FROM customer.customer WHERE id = :id"), {"id": CUSTOMER_A}
        )
    ).scalar_one()
    stale = current - 1  # expected_version cu mot bac van phai thanh cong khi da la chu
    row = await repo.claim_assignment(
        CUSTOMER_A, employee_id=CREDIT_OFFICER, expected_version=stale
    )
    assert row is not None
    assert row["assigned_employee_id"] == CREDIT_OFFICER
    assert row["assignment_version"] == current
    after = (
        await session.execute(
            text("SELECT version FROM customer.customer WHERE id = :id"), {"id": CUSTOMER_A}
        )
    ).scalar_one()
    assert after == current


async def test_claim_other_owner_returns_none(session):
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    current = (
        await session.execute(
            text("SELECT version FROM customer.customer WHERE id = :id"), {"id": CUSTOMER_A}
        )
    ).scalar_one()
    row = await CustomerRepository(session).claim_assignment(
        CUSTOMER_A, employee_id=CREDIT_MANAGER, expected_version=current
    )
    assert row is None
