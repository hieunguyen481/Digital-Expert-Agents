"""Hành động trên hồ sơ ở trang 02b (lát 11), ngoài các chuyển bước đi qua WorkflowService.

AI chỉ đề xuất: mọi hành động ở đây do người đúng vai trò, đúng bước thực hiện. Mỗi hành động kiểm vai trò,
trạng thái, quyền ghi và lý do bắt buộc ở backend; giao diện chỉ ẩn/khóa nút, không dùng để chặn.
Chuyển bước (Yêu cầu bổ sung, Trả lại, Trình Rủi ro, quyết định...) vẫn qua `WorkflowService.transition`.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from app.exceptions import ConflictError, NotFoundError, ValidationError
from app.repositories.case_action_repository import CaseActionRepository
from app.services.audit_service import AuditService
from app.services.protocols import PrincipalLike
from app.workflow.gates import GateRepository, evaluate
from app.workflow.service import WorkflowService

CONCLUSIONS = {
    "SUSPECTED_FRAUD": "fraud_hold",  # Q-N: tạm dừng chờ xử lý
    "INSUFFICIENT_BASIS": "request_explanation",  # Q-N: dùng cơ chế chờ bổ sung
    "NO_ISSUE": None,  # đi tiếp
}
OPINION_ROLES = {"RISK": "risk_officer", "COMPLIANCE": "compliance_officer"}
_GATE_BY_STATUS = {"APPRAISAL": "appraisal_submit", "RISK_REVIEW": "risk_submit"}


def _need_role(principal: PrincipalLike, role: str) -> None:
    if getattr(principal, "is_admin", False) or role not in set(getattr(principal, "roles", ())):
        raise PermissionError(f"This action requires role {role}")


def _need_text(value: str | None, what: str) -> str:
    clean = (value or "").strip()
    if not clean:
        raise ValueError(f"{what} is required")
    return clean


class CaseActionService:
    def __init__(
        self, repository: CaseActionRepository, workflow: WorkflowService, gates: GateRepository,
        audit: AuditService | None = None,
    ) -> None:
        self._repo = repository
        self._workflow = workflow
        self._gates = gates
        self._audit = audit

    async def _loan(self, loan_id: UUID, *, status: str) -> Any:
        loan = await self._repo.loan(loan_id)
        if loan is None:
            raise NotFoundError("LOAN_NOT_FOUND", "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.")
        if loan["status"] != status:
            raise ConflictError(
                "INVALID_STATE_TRANSITION",
                f"Action is not allowed from status {loan['status']}.",
                {"status": loan["status"]},
            )
        return loan

    async def _flag(self, loan_id: UUID, flag_id: UUID) -> Any:
        flag = await self._repo.flag(loan_id, flag_id)
        if flag is None:
            raise NotFoundError("FLAG_NOT_FOUND", "Không tìm thấy cờ trên hồ sơ này.")
        return flag

    async def _log(self, principal: PrincipalLike, action: str, loan_id: UUID, **metadata: Any) -> None:
        if self._audit is not None:
            await self._audit.record(
                principal=principal, action=action, resource_type="LOAN_APPLICATION", resource_id=loan_id,
                loan_application_id=loan_id, result="SUCCESS", request_id=uuid4(), correlation_id=uuid4(),
                metadata=metadata,
            )

    async def state(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        """Trạng thái hành động cho giao diện: ý kiến, ngoại lệ chờ, cấp phê duyệt, E8, điều kiện còn thiếu."""
        loan = await self._repo.loan(loan_id)
        if loan is None:
            raise NotFoundError("LOAN_NOT_FOUND", "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.")
        revision = await self._repo.memo_revision(loan_id)
        gate = _GATE_BY_STATUS.get(str(loan["status"]))
        blockers = list((await evaluate(gate, loan_id, self._gates)).blockers) if gate else []
        current = await self._repo.current_tier(loan_id)
        required = await self._repo.required_tier(loan_id)
        return {
            "version": loan["version"],
            "status": loan["status"],
            "memo_revision": revision,
            "opinions": [] if revision is None else [dict(o) for o in await self._repo.opinions(loan_id, revision)],
            "pending_exceptions": [dict(e) for e in await self._repo.pending_exceptions(loan_id)],
            "tier": {"submitted": current, "required": required, "upgrade_due": current is not None and required > current},
            # E8: người đã tham gia hoặc từng là QHKH trong 2 năm không được duyệt (kèm lý do cho giao diện).
            "excluded": await self._repo.is_excluded(principal.employee_id, loan_id),
            "blockers": blockers,
        }

    async def handle_flag(self, principal: PrincipalLike, loan_id: UUID, flag_id: UUID, note: str | None) -> None:
        _need_role(principal, "credit_appraiser")
        clean = _need_text(note, "A handling note")
        await self._loan(loan_id, status="APPRAISAL")
        if not await self._repo.can_write(principal.employee_id, loan_id):
            raise PermissionError("Only the appraiser holding the case may handle its flags")
        flag = await self._flag(loan_id, flag_id)
        if flag["status"] != "OPEN":
            raise ConflictError("FLAG_NOT_OPEN", "Chỉ xử lý được cờ đang mở.", {"status": flag["status"]})
        await self._repo.set_flag_handled(flag_id, clean)
        await self._log(principal, "CASE_FLAG_HANDLE", loan_id, flag_id=flag_id, code=flag["code"])

    async def early_warning(self, principal: PrincipalLike, loan_id: UUID, flag_id: UUID, note: str | None) -> None:
        """F8: chỉ thông báo cho Tuân thủ; hồ sơ vẫn ở Thẩm định, cờ vẫn mở."""
        _need_role(principal, "credit_appraiser")
        await self._loan(loan_id, status="APPRAISAL")
        flag = await self._flag(loan_id, flag_id)
        if flag["code"] != "cickh" or flag["status"] != "OPEN":
            raise ConflictError("FLAG_NOT_EARLY_WARNABLE", "Chỉ báo sớm cờ CIC khách tự nộp đang mở.", {})
        recipient = await self._repo.early_warn(loan_id, flag_id, principal.employee_id, (note or "").strip() or None)
        await self._log(principal, "CASE_EARLY_WARNING", loan_id, flag_id=flag_id, recipient=recipient)

    async def conclude_flag(
        self, principal: PrincipalLike, loan_id: UUID, flag_id: UUID, conclusion: str, reason: str | None,
        *, request_id: UUID | None = None,
    ) -> str:
        """F8: Tuân thủ kết luận cờ cickh, 3 lựa chọn, đều bắt buộc lý do; AI không gợi ý."""
        _need_role(principal, "compliance_officer")
        if conclusion not in CONCLUSIONS:
            raise ValueError(f"conclusion must be one of {sorted(CONCLUSIONS)}")
        clean = _need_text(reason, "A reason")
        loan = await self._loan(loan_id, status="RISK_REVIEW")
        flag = await self._flag(loan_id, flag_id)
        if flag["code"] != "cickh":
            raise ConflictError("FLAG_NOT_CONCLUDABLE", "Chỉ kết luận cờ CIC khách tự nộp.", {})
        if flag["status"] == "CONCLUDED":
            raise ConflictError("FLAG_NOT_CONCLUDABLE", "Cờ đã có kết luận.", {})
        await self._repo.set_flag_concluded(flag_id, loan_id, principal.employee_id, conclusion, clean)
        action = CONCLUSIONS[conclusion]
        status = str(loan["status"])
        if action is not None:
            result = await self._workflow.transition(
                principal, loan_id, action, expected_version=int(loan["version"]), reason=clean, request_id=request_id
            )
            status = result.status
        await self._log(principal, "CASE_FLAG_CONCLUDE", loan_id, flag_id=flag_id, conclusion=conclusion)
        return status

    async def add_opinion(self, principal: PrincipalLike, loan_id: UUID, kind: str, content: str | None) -> None:
        """Q-N: bước Ý kiến Rủi ro có 2 ý kiến con; mỗi loại một ý kiến cho mỗi bản Tờ trình đã chốt."""
        if kind not in OPINION_ROLES:
            raise ValueError(f"kind must be one of {sorted(OPINION_ROLES)}")
        _need_role(principal, OPINION_ROLES[kind])
        clean = _need_text(content, "The opinion")
        await self._loan(loan_id, status="RISK_REVIEW")
        revision = await self._repo.memo_revision(loan_id)
        if revision is None:
            raise ValidationError("REPORT_MISSING", "Hồ sơ chưa có bản Tờ trình đã chốt.", {})
        if any(o["kind"] == kind for o in await self._repo.opinions(loan_id, revision)):
            raise ConflictError("OPINION_EXISTS", "Ý kiến này đã được ghi cho bản Tờ trình hiện tại.", {"kind": kind})
        await self._repo.add_opinion(loan_id, kind, revision, clean, principal.employee_id)
        await self._log(principal, "CASE_RISK_OPINION", loan_id, kind=kind, memo_revision=revision)

    async def upgrade_approval(self, principal: PrincipalLike, loan_id: UUID, reason: str | None) -> int:
        """Q4, F10: Thẩm định cộng lại mà tổng vượt cấp đã ghi lúc gửi thì Nâng cấp phê duyệt."""
        _need_role(principal, "credit_appraiser")
        clean = _need_text(reason, "A reason")
        await self._loan(loan_id, status="APPRAISAL")
        if not await self._repo.can_write(principal.employee_id, loan_id):
            raise PermissionError("Only the appraiser holding the case may upgrade the approval tier")
        current = await self._repo.current_tier(loan_id)
        required = await self._repo.required_tier(loan_id)
        if current is None or required <= current:
            raise ConflictError(
                "TIER_NOT_EXCEEDED", "Tổng cấp tín dụng chưa vượt cấp phê duyệt hiện tại.",
                {"current_tier": current, "required_tier": required},
            )
        await self._repo.add_tier_upgrade(
            loan_id, required, clean, principal.employee_id,
            f"Nâng cấp phê duyệt: cấp {current} lên cấp {required}",
        )
        await self._log(principal, "CASE_APPROVAL_UPGRADE", loan_id, from_tier=current, to_tier=required)
        return required
