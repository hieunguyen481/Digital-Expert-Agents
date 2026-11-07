"""Lat 6, trang 04: tai lieu, van ban dong y, tra CIC mo phong; RLS credit_report (Postgres that)."""

from __future__ import annotations

from datetime import timedelta
from uuid import UUID

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from tests.integration.seed_ids import (
    ADMIN_HO,
    APPROVER_HO,
    AUDITOR_HO,
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    DOCUMENT_REVIEWER,
    LOAN_MEKONG_FLEX,
    RISK_HO,
)
from tests.integration.test_proposal_draft import RM, _as, _P

from app.exceptions import ConflictError
from app.repositories.cic_repository import CicRepository
from app.repositories.proposal_repository import ProposalRepository
from app.schemas.proposal import CicStatus, ProposalDocument
from app.services.cic_service import CicService
from app.services.proposal_service import ProposalService
from app.workflow.validity import today_vn


def _svc(s: AsyncSession) -> CicService:
    return CicService(ProposalService(ProposalRepository(s)), CicRepository(s))


async def _consent_sql(s: AsyncSession, sql: str) -> None:
    await s.execute(text(sql))


async def test_mekong_status_consent_ok_report_expired_and_contract() -> None:
    # Xét tại 60 ngày sau: mọi bản tra gần nhất (kể cả do e2e vừa tạo) đều đã quá 30 ngày.
    async def body(s: AsyncSession):
        return await _svc(s).status(RM, LOAN_MEKONG_FLEX, today=today_vn() + timedelta(days=60))

    st = await _as(CREDIT_OFFICER, body)
    CicStatus.model_validate(st)
    assert st["consent"]["usable"] and st["consent"]["valid_until"] is None
    assert st["report_status"] == "EXPIRED" and st["lookup_locked"] is False


async def test_lookup_creates_simulated_report_valid_29_days() -> None:
    async def body(s: AsyncSession):
        return await _svc(s).lookup(RM, LOAN_MEKONG_FLEX)

    st = await _as(CREDIT_OFFICER, body)
    day = today_vn()
    assert st["report_status"] == "VALID"
    assert st["report"]["valid_until"] == day + timedelta(days=29)
    assert st["report"]["source"] == "SIMULATED" and "mô phỏng" in st["report"]["source_label"]
    assert st["report"]["looked_up_on"] == day


async def test_lookup_blocked_when_consent_valid_until_passed() -> None:
    async def body(s: AsyncSession):
        await _consent_sql(s, "UPDATE banking.cic_consent SET valid_until = CURRENT_DATE - 1 "
                              "WHERE customer_id = (SELECT primary_customer_id FROM credit.loan_application "
                              f"WHERE id = '{LOAN_MEKONG_FLEX}')")
        st = await _svc(s).status(RM, LOAN_MEKONG_FLEX)
        with pytest.raises(ConflictError) as err:
            await _svc(s).lookup(RM, LOAN_MEKONG_FLEX)
        return st, err.value

    st, err = await _as(CREDIT_OFFICER, body)
    assert st["lookup_locked"] and st["consent"]["code"] == "EXPIRED"
    assert err.code == "CIC_LOOKUP_LOCKED"


async def test_lookup_blocked_when_consent_unconfirmed() -> None:
    async def body(s: AsyncSession):
        await _consent_sql(s, "UPDATE banking.cic_consent SET confirmed_by = NULL, confirmed_at = NULL "
                              "WHERE customer_id = (SELECT primary_customer_id FROM credit.loan_application "
                              f"WHERE id = '{LOAN_MEKONG_FLEX}')")
        with pytest.raises(ConflictError) as err:
            await _svc(s).lookup(RM, LOAN_MEKONG_FLEX)
        return err.value

    assert (await _as(CREDIT_OFFICER, body)).code == "CIC_LOOKUP_LOCKED"


async def test_record_consent_requires_document_of_this_loan() -> None:
    async def body(s: AsyncSession):
        with pytest.raises(LookupError):
            await _svc(s).record_consent(
                RM, LOAN_MEKONG_FLEX, document_id=UUID(int=1), signed_on=today_vn(), valid_until=None
            )

    await _as(CREDIT_OFFICER, body)


async def test_documents_checklist_shows_missing_and_expired_for_mekong() -> None:
    async def body(s: AsyncSession):
        return await _svc(s).documents(RM, LOAN_MEKONG_FLEX)

    docs = await _as(CREDIT_OFFICER, body)
    for d in docs:
        ProposalDocument.model_validate(d)
    by = {d["code"]: d for d in docs}
    assert by["SME-09-QUARTERLY-FS"]["state"] == "MISSING"
    assert by["SME-13-CIC-REPORT"]["state"] == "EXPIRED"
    assert by["SME-01-CREDIT-REQUEST"]["state"] == "OK"
    assert by["SME-04-SHAREHOLDERS-RELATED"]["state"] == "AI"


@pytest.mark.parametrize(
    ("employee", "can_read"),
    [(CREDIT_OFFICER, True), (CREDIT_APPRAISER, False), (RISK_HO, False), (COMPLIANCE_HO, False),
     (APPROVER_HO, False), (DOCUMENT_REVIEWER, False), (ADMIN_HO, False), (AUDITOR_HO, True)],
)
async def test_rls_credit_report_and_consent_per_role(employee: UUID, can_read: bool) -> None:
    async def body(s: AsyncSession):
        sel = "SELECT count(*) FROM banking.{} WHERE customer_id = (SELECT primary_customer_id " \
              f"FROM credit.loan_application WHERE id = '{LOAN_MEKONG_FLEX}')"
        reports = (await s.execute(text(sel.format("credit_report")))).scalar_one()
        consents = (await s.execute(text(sel.format("cic_consent")))).scalar_one()
        return reports, consents

    reports, consents = await _as(employee, body)
    assert (reports > 0) is can_read and (consents > 0) is can_read


async def test_role_without_loan_access_cannot_use_service() -> None:
    async def body(s: AsyncSession):
        with pytest.raises(LookupError):
            await _svc(s).status(_P(DOCUMENT_REVIEWER, {"loan:read"}), LOAN_MEKONG_FLEX)

    await _as(DOCUMENT_REVIEWER, body)


async def test_non_rm_cannot_insert_credit_report() -> None:
    async def body(s: AsyncSession):
        try:
            await s.execute(text(
                "INSERT INTO banking.credit_report (id, customer_id, provider, requested_at, "
                "report_as_of_date, created_at) SELECT gen_random_uuid(), primary_customer_id, 'CIC', now(), "
                f"CURRENT_DATE, now() FROM credit.loan_application WHERE id = '{LOAN_MEKONG_FLEX}'"))
        except Exception as exc:  # noqa: BLE001
            return type(exc).__name__
        return "inserted"

    assert await _as(AUDITOR_HO, body) != "inserted"
