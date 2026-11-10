"""Lát 7, trang 04: nhóm liên quan, cấp phê duyệt, ngoại lệ, điều kiện gửi và gửi HTTD (Postgres thật, RLS)."""

from __future__ import annotations

from uuid import UUID, uuid4

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

from app.workflow.conditions import _DOC_NAMES
from app.exceptions import ConflictError
from app.repositories.cic_repository import CicRepository
from app.repositories.proposal_repository import ProposalRepository
from app.repositories.submission_repository import SubmissionRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.schemas.proposal import RelatedParties, SubmitConditions
from app.services.cic_service import CicService
from app.services.proposal_service import ProposalService
from app.services.submission_service import SubmissionService
from app.workflow.service import GateBlockedError, WorkflowService


class _Audit:
    async def record(self, *a, **k):  # noqa: ANN002, ANN003
        return None

    def __getattr__(self, name):  # noqa: ANN001
        async def _noop(*a, **k):  # noqa: ANN002, ANN003
            return None
        return _noop


def _svc(s: AsyncSession) -> SubmissionService:
    proposals = ProposalService(ProposalRepository(s))
    workflow_repo = WorkflowRepository(s, cic_outage=False)
    return SubmissionService(
        proposals, SubmissionRepository(s), workflow_repo,
        WorkflowService(workflow_repo, _Audit()), CicService(proposals, CicRepository(s)),
    )


RM_ROLE = _P(CREDIT_OFFICER, {"loan:read", "loan:update"})
RM_ROLE.roles = frozenset({"credit_officer"})
L = LOAN_MEKONG_FLEX


async def test_conditions_table_matches_contract_and_locks_submit() -> None:
    st = await _as(CREDIT_OFFICER, lambda s: _svc(s).conditions(RM_ROLE, L))
    SubmitConditions.model_validate(st)
    codes = [c["code"] for c in st["conditions"] if c["kind"] == "BLOCKER"]
    assert codes == ["DOCS", "CIC", "CONSENT", "AI_CONFIRMED", "RELATED_PARTIES", "LEASE", "AUDITED_FS"]
    unmet = [c for c in st["conditions"] if c["kind"] == "BLOCKER" and not c["met"]]
    assert st["can_submit"] is (not unmet) and (st["lock_reason"] is None) is st["can_submit"]
    assert st["required_tier"] in (1, 2, 3)


async def test_submit_blocked_by_gate_when_conditions_unmet() -> None:
    async def body(s: AsyncSession):
        # Ép một điều kiện chặn: một bên liên quan chờ xác nhận.
        await s.execute(text("UPDATE credit.case_related_party SET status='PROPOSED', basis=NULL, decided_by=NULL, "
                             "decided_at=NULL WHERE loan_application_id=:l"), {"l": L})
        st = await _svc(s).conditions(RM_ROLE, L)
        with pytest.raises(GateBlockedError) as err:
            await _svc(s).submit(RM_ROLE, L, expected_version=st_version(await _version(s)), request_id=None)
        return st, err.value

    def st_version(v):  # noqa: ANN001, ANN202
        return v

    st, err = await _as(CREDIT_OFFICER, body)
    assert not st["can_submit"] and "RELATED_PARTY_UNCONFIRMED" in err.blockers
    row = next(c for c in st["conditions"] if c["code"] == "RELATED_PARTIES")
    assert not row["met"] and row["section"] == "related"


async def _version(s: AsyncSession) -> int:
    return (await s.execute(text("SELECT version FROM credit.loan_application WHERE id=:l"), {"l": L})).scalar_one()


async def test_related_party_confirm_needs_basis_for_not_in_group_and_unlocks() -> None:
    async def body(s: AsyncSession):
        svc = _svc(s)
        before = await svc.related_parties(RM_ROLE, L)
        other = next(r for r in before["lines"] if r["relation"] == "RELATED")
        with pytest.raises(ConflictError):
            await svc.decide_related_party(RM_ROLE, L, other["party_id"], status="NOT_IN_GROUP", basis="ngắn")
        after = await svc.decide_related_party(
            RM_ROLE, L, other["party_id"], status="NOT_IN_GROUP", basis="Không có quan hệ sở hữu hay điều hành.")
        return before, after

    before, after = await _as(CREDIT_OFFICER, body)
    RelatedParties.model_validate(after)
    line = next(r for r in after["lines"] if r["relation"] == "RELATED")
    assert line["status"] == "NOT_IN_GROUP" and line["basis"]
    assert after["total_exposure"] >= before["lines"][0]["outstanding"]


async def test_exception_rules_and_withdraw() -> None:
    async def body(s: AsyncSession):
        svc = _svc(s)
        st = await svc.conditions(RM_ROLE, L)
        cic_code = (await s.execute(text(
            "SELECT requirement_code::text FROM credit.loan_checklist_item WHERE loan_application_id=:l "
            "AND document_type='CIC_CONSENT'"), {"l": L})).scalar_one_or_none()
        other = (await s.execute(text(
            "SELECT requirement_code::text FROM credit.loan_checklist_item WHERE loan_application_id=:l "
            "AND document_type <> 'CIC_CONSENT' ORDER BY requirement_code LIMIT 1"), {"l": L})).scalar_one()
        errs = []
        if cic_code:
            with pytest.raises(ConflictError) as e1:
                await svc.propose_exception(RM_ROLE, L, checklist_code=cic_code, reason="Khách hàng chưa ký kịp.")
            errs.append(e1.value.code)
        made = await svc.propose_exception(RM_ROLE, L, checklist_code=other, reason="Khách hàng bổ sung sau 3 ngày.")
        with pytest.raises(ConflictError) as e2:
            await svc.propose_exception(RM_ROLE, L, checklist_code=other, reason="Khách hàng bổ sung sau 3 ngày.")
        await svc.withdraw_exception(RM_ROLE, L, made["id"])
        with pytest.raises(ConflictError):
            await svc.withdraw_exception(RM_ROLE, L, made["id"])
        again = await svc.propose_exception(RM_ROLE, L, checklist_code=other, reason="Khách hàng bổ sung sau 3 ngày.")
        return st, errs, e2.value.code, made, again

    st, errs, dup, made, again = await _as(CREDIT_OFFICER, body)
    assert all(c == "EXCEPTION_NOT_ALLOWED" for c in errs) and dup == "EXCEPTION_EXISTS"
    assert made["id"] != again["id"] and again["withdrawn_at"] is None


async def test_withdrawn_exception_no_longer_exempts_document() -> None:
    async def body(s: AsyncSession):
        svc = _svc(s)
        code = (await s.execute(text(
            "SELECT requirement_code::text FROM credit.loan_checklist_item WHERE loan_application_id=:l "
            "AND mandatory_level='MANDATORY' AND document_type NOT IN ('CIC_CONSENT','CIC_REPORT','CREDIT_REPORT') "
            "AND linked_document_id IS NULL LIMIT 1"), {"l": L})).scalar_one_or_none()
        if code is None:
            return None
        made = await svc.propose_exception(RM_ROLE, L, checklist_code=code, reason="Khách hàng bổ sung sau 3 ngày.")
        with_exc = {c["code"]: c for c in (await svc.conditions(RM_ROLE, L))["conditions"]}
        await svc.withdraw_exception(RM_ROLE, L, made["id"])
        without = {c["code"]: c for c in (await svc.conditions(RM_ROLE, L))["conditions"]}
        return code, with_exc, without

    out = await _as(CREDIT_OFFICER, body)
    if out is None:
        pytest.skip("Mekong không còn mục bắt buộc thiếu tài liệu")
    code, with_exc, without = out
    name = _DOC_NAMES.get(code, code)  # chi tiet DOCS hien ten tieng Viet cua tai lieu, khong hien ma
    assert f"EXCEPTION:{code}" in with_exc and name not in (with_exc["DOCS"]["detail"] or "")
    assert f"EXCEPTION:{code}" not in without and name in (without["DOCS"]["detail"] or "")


async def test_submit_goes_through_workflow_and_locks_edit() -> None:
    async def body(s: AsyncSession):
        svc = _svc(s)
        # Làm đủ điều kiện trong giao dịch (rollback sau): xác nhận bên liên quan + chọn thuê đất + ngoại lệ tài liệu.
        for r in (await svc.related_parties(RM_ROLE, L))["lines"]:
            if r["relation"] == "RELATED":
                await svc.decide_related_party(RM_ROLE, L, r["party_id"], status="CONFIRMED", basis=None)
        for c in (await svc.conditions(RM_ROLE, L))["collaterals"]:
            if c["on_leased_land"] and not c["land_lease_payment"]:
                await svc.choose_lease_payment(RM_ROLE, L, c["id"], "ANNUAL")
        proposals = ProposalService(ProposalRepository(s))
        await CicService(proposals, CicRepository(s)).lookup(RM_ROLE, L)
        for code in (await s.execute(text(
            "SELECT requirement_code::text FROM credit.loan_checklist_item WHERE loan_application_id=:l "
            "AND mandatory_level='MANDATORY' AND (linked_document_id IS NULL "
            "OR requirement_status IN ('REQUIRED','INCOMPLETE')) "
            "AND document_type NOT IN ('CIC_CONSENT','CIC_REPORT','CREDIT_REPORT')"), {"l": L})).scalars().all():
            await svc.propose_exception(RM_ROLE, L, checklist_code=code, reason="Khách hàng bổ sung sau 3 ngày.")
        st = await svc.conditions(RM_ROLE, L)
        if not st["can_submit"]:
            return st, None, None
        res = await svc.submit(RM_ROLE, L, expected_version=await _version(s), request_id=uuid4())
        status = (await s.execute(text("SELECT status FROM credit.loan_application WHERE id=:l"), {"l": L})).scalar_one()
        with pytest.raises(ConflictError):
            await svc.propose_exception(RM_ROLE, L, checklist_code="X", reason="Không sửa được sau khi gửi.")
        return st, res, status

    st, res, status = await _as(CREDIT_OFFICER, body)
    assert res is not None, st["lock_reason"]
    assert res["status"] == "CHECKING" == status


async def test_submit_with_stale_version_is_rejected() -> None:
    async def body(s: AsyncSession):
        with pytest.raises(ConflictError) as err:
            await _svc(s).submit(RM_ROLE, L, expected_version=(await _version(s)) + 5, request_id=None)
        return err.value

    err = await _as(CREDIT_OFFICER, body)
    assert err is not None


@pytest.mark.parametrize(
    ("employee", "can_read", "can_write"),
    [(CREDIT_OFFICER, True, True), (CREDIT_APPRAISER, False, False), (RISK_HO, False, False),
     (COMPLIANCE_HO, False, False), (APPROVER_HO, False, False), (DOCUMENT_REVIEWER, False, False),
     (ADMIN_HO, False, False), (AUDITOR_HO, True, False)],
)
async def test_rls_related_party_exception_exposure_per_role(employee: UUID, can_read: bool, can_write: bool) -> None:
    async def body(s: AsyncSession):
        n = (await s.execute(text("SELECT count(*) FROM credit.case_related_party WHERE loan_application_id=:l"),
                             {"l": L})).scalar_one()
        upd = (await s.execute(text("UPDATE credit.case_related_party SET basis = basis WHERE loan_application_id=:l"),
                               {"l": L})).rowcount
        ins = None
        try:
            async with s.begin_nested():
                await s.execute(text(
                    "INSERT INTO credit.case_exception (id, loan_application_id, checklist_code, kind, reason, "
                    "proposed_by, proposed_at) VALUES (:id, :l, 'X', 'DOCUMENT', 'thử', :e, now())"),
                    {"id": uuid4(), "l": L, "e": employee})
            ins = "inserted"
        except Exception:  # noqa: BLE001
            ins = "denied"
        lines = None
        try:
            async with s.begin_nested():
                lines = (await s.execute(text("SELECT count(*) FROM credit.case_exposure_lines(:l)"),
                                         {"l": L})).scalar_one()
        except Exception:  # noqa: BLE001
            lines = "denied"
        return n, upd, ins, lines

    n, upd, ins, lines = await _as(employee, body)
    assert (n > 0) is can_read and (upd > 0) is can_write
    assert (ins == "inserted") is can_write
    assert (lines != "denied" and lines > 0) is can_read
