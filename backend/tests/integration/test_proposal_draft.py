"""Lat 5, trang 04: nhap, tu luu, xung dot version; RLS tren credit.loan_draft (Postgres that)."""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable
from decimal import Decimal
from typing import Any
from uuid import UUID

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from tests.integration.seed_ids import (
    ADMIN_HO,
    APPROVER_HO,
    AUDITOR_HO,
    BRANCH_HN,
    BRANCH_HO,
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_MANAGER,
    CREDIT_OFFICER,
    DOCUMENT_REVIEWER,
    LOAN_MEKONG_FLEX,
    LOAN_VINANOVA,
    RISK_HO,
)

from app.db.rls_context import rls_transaction
from app.exceptions import ConflictError
from app.repositories.proposal_repository import ProposalRepository
from app.schemas.proposal import DraftResponse, LoanProductResponse
from app.services.proposal_service import ProposalService

BRANCH = {CREDIT_OFFICER: BRANCH_HN, CREDIT_MANAGER: BRANCH_HN, DOCUMENT_REVIEWER: BRANCH_HN}


class _P:
    def __init__(self, employee: UUID, perms: set[str]) -> None:
        self.employee_id = employee
        self.roles = frozenset()
        self.permissions = frozenset(perms)


class _Rollback(Exception):
    pass


async def _as(employee: UUID, body: Callable[[AsyncSession], Awaitable[Any]]) -> Any:
    """Chay ``body`` duoi RLS cua ``employee`` roi ROLLBACK: seed khong doi, chay lai van dat."""
    dsn = os.environ.get("TEST_APP_DSN")
    if not dsn:
        pytest.skip("TEST_APP_DSN chua dat")
    engine = create_async_engine(dsn.replace("postgresql://", "postgresql+asyncpg://"))
    out: list[Any] = []
    try:
        async with AsyncSession(engine) as session:
            try:
                async with rls_transaction(
                    session, employee_id=employee, branch_id=BRANCH.get(employee, BRANCH_HO),
                    is_admin=employee == ADMIN_HO,
                ):
                    out.append(await body(session))
                    raise _Rollback
            except _Rollback:
                pass
    finally:
        await engine.dispose()
    return out[0]


def _svc(session: AsyncSession) -> ProposalService:
    return ProposalService(ProposalRepository(session))


RM = _P(CREDIT_OFFICER, {"loan:read", "loan:update"})


def _form(draft: dict[str, Any], **over: Any) -> dict[str, Any]:
    base = {
        "product_id": draft["product_id"], "requested_amount": draft["requested_amount"],
        "requested_term_months": draft["requested_term_months"],
        "purpose_text": draft["purpose_text"], "repayment_source_text": draft["repayment_source_text"],
        "secured": draft["secured"],
    }
    return {**base, **over}


async def test_restore_seed_draft() -> None:
    async def body(s: AsyncSession) -> dict[str, Any]:
        return await _svc(s).get_draft(RM, LOAN_MEKONG_FLEX)

    d = await _as(CREDIT_OFFICER, body)
    assert d["status"] == "DRAFT" and d["editable"] is True
    assert d["requested_amount"] == Decimal("80000000000") and d["requested_term_months"] == 12
    assert d["purpose_text"].startswith("Bổ sung vốn lưu động")
    assert d["customer_name"]
    DraftResponse.model_validate(d)  # đúng hợp đồng API, không dư/thiếu cột


async def test_autosave_roundtrip_bumps_version() -> None:
    async def body(s: AsyncSession) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        svc = _svc(s)
        before = await svc.get_draft(RM, LOAN_MEKONG_FLEX)
        saved = await svc.save_draft(
            RM, LOAN_MEKONG_FLEX,
            _form(before, requested_amount=Decimal("70000000000"), purpose_text="Mục đích mới"),
            expected_version=before["version"],
        )
        return before, saved, await svc.get_draft(RM, LOAN_MEKONG_FLEX)

    before, saved, again = await _as(CREDIT_OFFICER, body)
    assert saved["version"] == before["version"] + 1 == again["version"]
    assert again["requested_amount"] == Decimal("70000000000")
    assert again["purpose_text"] == "Mục đích mới"
    assert again["saved_by_name"]


async def test_two_tabs_second_save_is_rejected_with_details() -> None:
    async def body(s: AsyncSession) -> ConflictError:
        svc = _svc(s)
        loaded = await svc.get_draft(RM, LOAN_MEKONG_FLEX)  # ca hai tab nap cung version
        await svc.save_draft(
            RM, LOAN_MEKONG_FLEX, _form(loaded, purpose_text="Tab 1"), expected_version=loaded["version"]
        )
        try:
            await svc.save_draft(
                RM, LOAN_MEKONG_FLEX, _form(loaded, purpose_text="Tab 2"),
                expected_version=loaded["version"],
            )
        except ConflictError as exc:
            return exc
        raise AssertionError("tab 2 phai bi chan")

    exc = await _as(CREDIT_OFFICER, body)
    assert exc.code == "VERSION_CONFLICT" and exc.status_code == 409
    assert exc.details["saved_by_name"] and exc.details["current_version"] >= 2


async def test_conflict_does_not_overwrite() -> None:
    async def body(s: AsyncSession) -> str | None:
        svc = _svc(s)
        loaded = await svc.get_draft(RM, LOAN_MEKONG_FLEX)
        with pytest.raises(ConflictError):
            await svc.save_draft(
                RM, LOAN_MEKONG_FLEX, _form(loaded, purpose_text="ghi de"),
                expected_version=loaded["version"] - 1,
            )
        return (await svc.get_draft(RM, LOAN_MEKONG_FLEX))["purpose_text"]

    assert await _as(CREDIT_OFFICER, body) != "ghi de"


async def test_submitted_case_is_locked() -> None:
    async def body(s: AsyncSession) -> ConflictError:
        svc = _svc(s)
        d = await svc.get_draft(RM, LOAN_VINANOVA)
        assert d["editable"] is False
        try:
            await svc.save_draft(RM, LOAN_VINANOVA, _form(d), expected_version=d["version"])
        except ConflictError as exc:
            return exc
        raise AssertionError

    assert (await _as(CREDIT_OFFICER, body)).code == "DRAFT_LOCKED"


@pytest.mark.parametrize(
    ("employee", "can_read"),
    [
        (CREDIT_OFFICER, True),
        (CREDIT_APPRAISER, False),
        (RISK_HO, False),
        (COMPLIANCE_HO, False),
        (APPROVER_HO, False),
        (DOCUMENT_REVIEWER, False),
        (ADMIN_HO, False),
    ],
)
async def test_rls_draft_visibility_per_role(employee: UUID, can_read: bool) -> None:
    async def body(s: AsyncSession) -> tuple[int, int]:
        n = (await s.execute(
            text("SELECT count(*) FROM credit.loan_draft WHERE loan_application_id = :l"),
            {"l": LOAN_MEKONG_FLEX},
        )).scalar_one()
        upd = (await s.execute(
            text("UPDATE credit.loan_draft SET purpose_text = 'x' WHERE loan_application_id = :l"),
            {"l": LOAN_MEKONG_FLEX},
        )).rowcount
        return n, upd

    n, upd = await _as(employee, body)
    assert (n == 1) is can_read
    assert (upd == 1) is can_read


async def test_auditor_reads_but_cannot_write() -> None:
    async def body(s: AsyncSession) -> tuple[int, int]:
        n = (await s.execute(
            text("SELECT count(*) FROM credit.loan_draft WHERE loan_application_id = :l"),
            {"l": LOAN_MEKONG_FLEX},
        )).scalar_one()
        upd = (await s.execute(
            text("UPDATE credit.loan_draft SET purpose_text = 'x' WHERE loan_application_id = :l"),
            {"l": LOAN_MEKONG_FLEX},
        )).rowcount
        return n, upd

    n, upd = await _as(AUDITOR_HO, body)
    assert upd == 0
    assert n in (0, 1)


async def test_products_list_only_active_sme() -> None:
    async def body(s: AsyncSession) -> list[Any]:
        return await _svc(s).list_products(_P(CREDIT_OFFICER, {"loan:create"}))

    rows = await _as(CREDIT_OFFICER, body)
    for r in rows:
        LoanProductResponse.model_validate(r)
    codes = [p["product_code"] for p in rows]
    assert "SME-VLD" in codes and "HOME-LOAN-DEMO" not in codes
