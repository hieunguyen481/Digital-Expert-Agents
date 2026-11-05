"""verify_field chay that tren PostgreSQL (bank_app, RLS) qua DocumentService + DocumentRepository.

Dung AsyncSession that cua SQLAlchemy, gan vao mot giao dich duoc rollback o cuoi.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from types import SimpleNamespace
from uuid import UUID

import pytest
import pytest_asyncio
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from tests.integration.seed_ids import BRANCH_HN, CREDIT_OFFICER

from app.db.rls_context import set_rls_context
from app.repositories.document_repository import DocumentRepository
from app.services.document_service import DocumentService

_SEED_FIELD = UUID("52300000-0000-4000-8000-000000000001")


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


def _principal() -> SimpleNamespace:
    return SimpleNamespace(
        employee_id=CREDIT_OFFICER,
        permissions=frozenset({"document:verify"}),
        roles=frozenset({"credit_officer"}),
    )


async def test_verify_field_writes_new_vocabulary(session):
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    service = DocumentService(DocumentRepository(session), storage=None)  # type: ignore[arg-type]

    corrected = await service.verify_field(
        _principal(),
        _SEED_FIELD,
        verification_status="CONFIRMED",
        corrected_value_text="27500000",
        verification_reason="Doi chieu ban goc: OCR doc sai",
    )
    assert corrected["verification_status"] == "CONFIRMED"
    assert corrected["source_type"] == "HUMAN"
    assert corrected["corrected_value_text"] == "27500000"

    flagged = await service.verify_field(
        _principal(),
        _SEED_FIELD,
        verification_status="NEEDS_VERIFICATION",
        corrected_value_text=None,
        verification_reason="Can doi chieu them",
    )
    assert flagged["verification_status"] == "NEEDS_VERIFICATION"
    # Khong sua gia tri thi giu nguon da ghi.
    assert flagged["source_type"] == "HUMAN"


async def test_old_vocabulary_rejected_by_database(session):
    await set_rls_context(session, CREDIT_OFFICER, BRANCH_HN)
    repository = DocumentRepository(session)
    with pytest.raises(DBAPIError, match="ck_extracted_field_verification_status"):
        async with session.begin_nested():
            await repository.update_field(
                _SEED_FIELD,
                corrected_value_text=None,
                verification_status="VERIFIED",
                verified_by=CREDIT_OFFICER,
                verification_reason="tu vung cu",
            )
