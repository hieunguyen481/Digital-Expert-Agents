"""Trang 05 "Đối chiếu tài liệu" (lát 9).

AI chỉ đề xuất: trường `AI_PROPOSED` / `NEEDS_VERIFICATION` được hiển thị đúng nhãn và không tự có hiệu lực.
Chốt nguồn và cập nhật checklist là việc của người, mỗi lần đều ghi nhật ký append-only.
Chuyển Thẩm định đi qua `WorkflowService.transition("pass_to_appraisal")`; việc mở/khóa nút do chính
`gates.evaluate("checking_pass")` quyết, không có luật riêng ở đây.
"""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from app.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from app.repositories.reconciliation_repository import ReconciliationRepository
from app.services.protocols import PrincipalLike
from app.workflow import gates
from app.workflow.gates import GateFacts
from app.workflow.service import WorkflowService

CHECK_ROLE = "document_reviewer"  # Hậu kiểm tín dụng
RESOLVE_ROLE = "credit_appraiser"  # Thẩm định
DATA_LABEL = "Dữ liệu tài liệu hiện là dữ liệu seed; chưa có pipeline trích xuất thật (lát 8)."
BLOCKER_TEXT = {
    "CHECK_FAILED": "Còn mục checklist bắt buộc chưa đạt (chưa có tài liệu hợp lệ hoặc hậu kiểm không đạt) và chưa có ngoại lệ.",
}
_ALLOWED_STATUS = {"CHECKING"}


class _Facts:
    def __init__(self, facts: GateFacts) -> None:
        self._facts = facts

    async def gate_facts(self, loan_id: UUID) -> GateFacts:
        return self._facts


class ReconciliationService:
    def __init__(self, repository: ReconciliationRepository, facts_source: Any, workflow: WorkflowService) -> None:
        self._repo = repository
        self._facts = facts_source
        self._workflow = workflow

    async def _loan(self, loan_id: UUID) -> Any:
        loan = await self._repo.loan(loan_id)
        if loan is None:
            raise NotFoundError("LOAN_NOT_FOUND", "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.")
        return loan

    async def _require(self, principal: PrincipalLike, loan_id: UUID, role: str, what: str) -> Any:
        loan = await self._loan(loan_id)
        roles = set(getattr(principal, "roles", ()))
        if getattr(principal, "is_admin", False) or role not in roles:
            raise AuthorizationError("ROLE_NOT_ALLOWED", f"Vai trò hiện tại không được {what}.")
        if not await self._repo.can_write_loan(principal.employee_id, loan_id):
            raise AuthorizationError("NOT_ASSIGNED", f"Hồ sơ này chưa giao cho bạn nên không thể {what}.")
        return loan

    async def view(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        loan = await self._loan(loan_id)
        roles = set(getattr(principal, "roles", ()))
        assigned = await self._repo.can_write_loan(principal.employee_id, loan_id)
        documents = [dict(r) for r in await self._repo.documents(loan_id)]
        items = []
        for row in await self._repo.items(loan_id):
            r = dict(row)
            check = (
                {"result": r["check_result"], "note": r["check_note"], "actor_name": r["check_actor_name"],
                 "at": r["check_at"]}
                if r["check_result"] else None
            )
            items.append({
                "item_id": r["item_id"], "code": r["code"], "document_type": r["document_type"],
                "mandatory": r["mandatory"], "status": r["status"], "has_exception": r["has_exception"],
                "document_ids": list(r["document_ids"] or []), "check": check,
            })
        linked = {d for i in items for d in i["document_ids"]}
        conflicts = []
        for row in await self._repo.conflicts(loan_id):
            c = dict(row)
            sources = {s["field_id"]: dict(s) for s in await self._repo.sources(list(c["field_ids"]))}
            conflicts.append({
                "conflict_id": c["conflict_id"], "code": c["code"],
                "sources": [sources[f] for f in c["field_ids"] if f in sources],
                "chosen_field_id": c["chosen_field_id"], "resolution_reason": c["resolution_reason"],
                "resolved_by_name": c["resolved_by_name"], "resolved_at": c["resolved_at"],
            })
        transfer = await self._transfer(loan_id, loan, roles)
        return {
            "loan_application_id": loan["id"], "application_number": loan["application_number"],
            "customer_name": loan["customer_name"], "status": loan["status"], "items": items,
            "documents": documents,
            "extra_document_ids": [d["document_id"] for d in documents if d["document_id"] not in linked],
            "conflicts": conflicts, "transfer": transfer,
            "permissions": {
                "can_check": assigned and CHECK_ROLE in roles and not getattr(principal, "is_admin", False),
                "can_resolve": assigned and RESOLVE_ROLE in roles and not getattr(principal, "is_admin", False),
                "can_confirm_fields": assigned and bool(roles & {CHECK_ROLE, RESOLVE_ROLE})
                and not getattr(principal, "is_admin", False),
            },
            "data_label": DATA_LABEL,
        }

    async def _transfer(self, loan_id: UUID, loan: Any, roles: set[str]) -> dict[str, Any]:
        if loan["status"] not in _ALLOWED_STATUS:
            return {"visible": False, "locked": True, "reasons": [], "carried_flags": [],
                    "expected_version": int(loan["version"])}
        facts = await self._facts.gate_facts(loan_id)
        result = await gates.evaluate("checking_pass", loan_id, _Facts(facts))
        reasons = [BLOCKER_TEXT.get(code, code) for code in result.blockers]
        return {
            "visible": CHECK_ROLE in roles, "locked": not result.ok, "reasons": reasons,
            "carried_flags": list(result.carried_flags), "expected_version": int(loan["version"]),
        }

    async def document(self, principal: PrincipalLike, loan_id: UUID, document_id: UUID) -> dict[str, Any]:
        await self._loan(loan_id)
        docs = [dict(d) for d in await self._repo.documents(loan_id) if d["document_id"] == document_id]
        if not docs:
            raise NotFoundError("DOCUMENT_NOT_FOUND", "Tài liệu không thuộc hồ sơ này.")
        fields = [dict(f) for f in await self._repo.fields(loan_id, document_id)]
        return {"document": docs[0], "fields": fields, "has_page_image": False}

    async def check_item(
        self, principal: PrincipalLike, loan_id: UUID, item_id: UUID, *, result: str, note: str | None
    ) -> dict[str, Any]:
        loan = await self._require(principal, loan_id, CHECK_ROLE, "cập nhật checklist")
        if loan["status"] not in _ALLOWED_STATUS:
            raise ConflictError("INVALID_STATE", "Chỉ cập nhật checklist khi hồ sơ đang ở bước Hậu kiểm.")
        item = await self._repo.item(loan_id, item_id)
        if item is None:
            raise NotFoundError("ITEM_NOT_FOUND", "Không tìm thấy mục checklist của hồ sơ này.")
        note = (note or "").strip() or None
        if result == "FAIL" and (note is None or len(note) < 5):
            raise ValidationError("NOTE_REQUIRED", "Ghi lý do khi đánh dấu không đạt (tối thiểu 5 ký tự).")
        if result == "PASS" and not item["has_document"]:
            raise ConflictError("NO_DOCUMENT", "Mục này chưa có tài liệu gắn vào nên chưa thể đánh dấu đạt.")
        new_status = "VALID" if result == "PASS" else "INCOMPLETE"
        await self._repo.set_item_status(item_id, new_status)
        await self._repo.log_check(
            loan_id=loan_id, item_id=item_id, code=item["code"], actor_id=principal.employee_id,
            result=result, old_status=item["status"], new_status=new_status, note=note,
        )
        return {"item_id": item_id, "status": new_status}

    async def resolve_conflict(
        self, principal: PrincipalLike, loan_id: UUID, conflict_id: UUID, *, chosen_field_id: UUID, reason: str
    ) -> dict[str, Any]:
        await self._require(principal, loan_id, RESOLVE_ROLE, "chốt nguồn")
        conflict = await self._repo.conflict(loan_id, conflict_id)
        if conflict is None:
            raise NotFoundError("CONFLICT_NOT_FOUND", "Không tìm thấy mâu thuẫn của hồ sơ này.")
        if chosen_field_id not in list(conflict["field_ids"]):
            raise ValidationError("FIELD_NOT_IN_CONFLICT", "Giá trị được chọn không thuộc mâu thuẫn này.")
        reason = reason.strip()
        if len(reason) < 5:
            raise ValidationError("REASON_REQUIRED", "Ghi lý do chốt nguồn (tối thiểu 5 ký tự).")
        sources = {s["field_id"]: dict(s) for s in await self._repo.sources(list(conflict["field_ids"]))}
        previous = conflict["chosen_field_id"]
        updated = await self._repo.resolve_conflict(
            conflict_id, previous=previous, chosen=chosen_field_id, reason=reason, actor_id=principal.employee_id
        )
        if not updated:
            raise ConflictError("CONFLICT_CHANGED", "Mâu thuẫn vừa được người khác chốt; tải lại trang.")
        candidates = [
            {"field_id": str(f), "value": sources[f]["value"], "document": sources[f]["document_title"]}
            for f in conflict["field_ids"] if f in sources
        ]
        await self._repo.log_conflict(
            loan_id=loan_id, conflict_id=conflict_id, code=conflict["code"], actor_id=principal.employee_id,
            old_field_id=previous, old_value=sources[previous]["value"] if previous in sources else None,
            new_field_id=chosen_field_id, new_value=sources[chosen_field_id]["value"],
            candidates=json.dumps(candidates, ensure_ascii=False), reason=reason,
        )
        return {"conflict_id": conflict_id, "chosen_field_id": chosen_field_id}

    async def transfer(
        self, principal: PrincipalLike, loan_id: UUID, *, expected_version: int, request_id: UUID | None
    ) -> dict[str, Any]:
        await self._loan(loan_id)
        result = await self._workflow.transition(
            principal, loan_id, "pass_to_appraisal", expected_version=expected_version, request_id=request_id
        )
        return {"status": result.status, "step_code": result.step_code, "carried_flags": list(result.carried_flags)}

    async def log(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        await self._loan(loan_id)
        return {
            "conflicts": [dict(r) for r in await self._repo.conflict_log(loan_id)],
            "checks": [dict(r) for r in await self._repo.check_log(loan_id)],
        }
