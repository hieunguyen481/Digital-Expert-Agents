"""Nhóm khách hàng liên quan, cấp phê duyệt, ngoại lệ và gửi HTTD của trang 04 (lát 7).

Gửi HTTD đi qua `WorkflowService.transition("submit_to_checking")`: cổng, vai trò, bản ghi bước và
khóa version đều do workflow quyết, trang này không có đường đi riêng.
"""

from __future__ import annotations

from typing import Any, Protocol
from uuid import UUID

from app.exceptions import ConflictError
from app.services.cic_service import CicService
from app.services.proposal_service import ProposalService
from app.services.protocols import PrincipalLike
from app.workflow import gates
from app.workflow.conditions import build_conditions
from app.workflow.gates import CIC_DOCUMENT_TYPES, GateFacts, GateResult
from app.workflow.service import WorkflowService


class GateFactsSource(Protocol):
    async def gate_facts(self, loan_id: UUID) -> GateFacts: ...


class _FixedFacts:
    def __init__(self, facts: GateFacts) -> None:
        self._facts = facts

    async def gate_facts(self, loan_id: UUID) -> GateFacts:
        return self._facts


class SubmissionService:
    def __init__(
        self, proposals: ProposalService, repository: Any, facts_source: GateFactsSource,
        workflow: WorkflowService, cic: CicService,
    ) -> None:
        self._proposals = proposals
        self._repo = repository
        self._facts = facts_source
        self._workflow = workflow
        self._cic = cic

    async def related_parties(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        loan = await self._proposals.get_draft(principal, loan_id)
        lines = await self._repo.exposure_lines(loan_id)
        total, tier = await self._repo.total_exposure_and_tier(loan_id)
        return {
            "editable": loan["editable"], "lines": [dict(r) for r in lines],
            "total_exposure": total, "required_tier": tier,
        }

    async def decide_related_party(
        self, principal: PrincipalLike, loan_id: UUID, party_id: UUID, *, status: str, basis: str | None
    ) -> dict[str, Any]:
        await self._proposals.editable_loan(principal, loan_id)
        if status == "NOT_IN_GROUP" and len((basis or "").strip()) < 10:
            raise ConflictError(
                "BASIS_REQUIRED", "Cần ghi căn cứ (tối thiểu 10 ký tự) khi xác nhận bên này không thuộc nhóm."
            )
        updated = await self._repo.set_related_status(
            loan_id, party_id, status=status, basis=(basis or "").strip() or None, employee_id=principal.employee_id
        )
        if not updated:
            raise LookupError("Related party is not part of this loan application")
        return await self.related_parties(principal, loan_id)

    async def choose_lease_payment(
        self, principal: PrincipalLike, loan_id: UUID, collateral_id: UUID, payment: str
    ) -> list[dict[str, Any]]:
        await self._proposals.editable_loan(principal, loan_id)
        if not await self._repo.set_lease_payment(loan_id, collateral_id, payment):
            raise LookupError("Collateral is not on leased land for this loan application")
        return [dict(r) for r in await self._repo.collaterals(loan_id)]

    async def propose_exception(
        self, principal: PrincipalLike, loan_id: UUID, *, checklist_code: str, reason: str
    ) -> dict[str, Any]:
        await self._proposals.editable_loan(principal, loan_id)
        item = await self._repo.checklist_document_type(loan_id, checklist_code)
        if item is None:
            raise LookupError("Checklist item was not found for this loan application")
        if item["document_type"] in CIC_DOCUMENT_TYPES:
            raise ConflictError(
                "EXCEPTION_NOT_ALLOWED", "Không đề xuất ngoại lệ cho văn bản đồng ý hoặc kết quả CIC."
            )
        if await self._repo.active_exception(loan_id, checklist_code):
            raise ConflictError("EXCEPTION_EXISTS", "Mục này đã có đề xuất ngoại lệ đang hiệu lực.")
        row = await self._repo.insert_exception(
            loan_id, code=checklist_code, reason=reason.strip(), employee_id=principal.employee_id
        )
        return dict(row)

    async def withdraw_exception(self, principal: PrincipalLike, loan_id: UUID, exception_id: UUID) -> None:
        await self._proposals.editable_loan(principal, loan_id)
        if not await self._repo.withdraw_exception(loan_id, exception_id):
            raise ConflictError("EXCEPTION_NOT_WITHDRAWABLE", "Không rút được: đề xuất đã được quyết hoặc đã rút.")

    async def conditions(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        loan = await self._proposals.get_draft(principal, loan_id)
        facts = await self._facts.gate_facts(loan_id)
        result: GateResult = await gates.evaluate("rm_submit", loan_id, _FixedFacts(facts))
        _, tier = await self._repo.total_exposure_and_tier(loan_id)
        rows = build_conditions(facts, result)
        lock = None
        if not loan["editable"]:
            lock = "Đề xuất đã gửi."
        elif not result.ok:
            unmet = [r["label"] for r in rows if r["kind"] == "BLOCKER" and not r["met"]]
            lock = "Chưa đủ điều kiện: " + "; ".join(unmet)
        return {
            "editable": loan["editable"], "can_submit": loan["editable"] and result.ok, "lock_reason": lock,
            "required_tier": tier, "conditions": rows,
            "exceptions": [dict(r) for r in await self._repo.exceptions(loan_id)],
            "collaterals": [dict(r) for r in await self._repo.collaterals(loan_id)],
        }

    async def submit(
        self, principal: PrincipalLike, loan_id: UUID, *, expected_version: int, request_id: UUID | None
    ) -> dict[str, Any]:
        await self._proposals.editable_loan(principal, loan_id)
        result = await self._workflow.transition(
            principal, loan_id, "submit_to_checking", expected_version=expected_version, request_id=request_id
        )
        return {"status": result.status, "step_code": result.step_code, "carried_flags": list(result.carried_flags)}
