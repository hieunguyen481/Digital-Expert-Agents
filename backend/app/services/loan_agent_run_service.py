"""Chạy đội agent trên một hồ sơ vay thật (trang Hồ sơ vay). AI chỉ đề xuất; người có thẩm quyền quyết định.

Quyền chạy dùng lại cơ chế "đang giữ hồ sơ" của workflow (`identity.can_write_loan`) cộng vai trò theo bước:
QHKH (credit_officer) khi lập/bổ sung hồ sơ, Thẩm định (credit_appraiser) khi thẩm định. Quản trị không chạy.
Mỗi lần chạy tạo case mới và giữ case cũ; đang có lượt chưa kết thúc thì không tạo thêm.
"""

from __future__ import annotations

import logging
import time
from typing import Any
from uuid import UUID

from app.exceptions import AuthorizationError, ConflictError, DependencyUnavailableError, NotFoundError
from app.repositories.loan_agent_run_repository import LoanAgentRunRepository
from app.services.agent_engine_client import AgentEngineClient, AgentEngineError
from app.services.protocols import PrincipalLike
log = logging.getLogger(__name__)

FINAL_STATES = {"Pending Approval", "Needs Info", "Rejected", "Escalated", "Completed"}
STALE_AFTER_SECONDS = 20 * 60  # lượt treo (engine sập) không khóa hồ sơ mãi
ROLE_STATUSES: dict[str, frozenset[str]] = {
    "credit_officer": frozenset({"DRAFT", "RETURNED_TO_RM", "APPRAISAL_PENDING_INFO"}),
    "credit_appraiser": frozenset({"APPRAISAL"}),
}


def _iso(row: Any) -> dict[str, Any]:
    return {"id": row["id"], "case_id": row["case_id"], "created_at": row["created_at"],
            "started_by": row["started_by"], "started_by_name": row["started_by_name"]}


_STATUS_VI = {
    "DRAFT": "Nháp", "CHECKING": "Đang kiểm tra", "RETURNED_TO_RM": "Trả về QHKH", "APPRAISAL": "Đang thẩm định",
    "APPRAISAL_PENDING_INFO": "Thẩm định – chờ bổ sung", "RISK_REVIEW": "Đang cho ý kiến rủi ro",
    "COMPLIANCE_REVIEW": "Đang cho ý kiến tuân thủ", "APPROVAL": "Chờ phê duyệt", "APPROVED": "Đã phê duyệt",
    "APPROVED_WITH_CONDITIONS": "Phê duyệt có điều kiện", "REJECTED": "Từ chối", "COMMITTEE": "Chờ Hội đồng",
}


def denial_reason(principal: PrincipalLike, status: str, holds: bool) -> str | None:
    """None nếu được chạy; ngược lại là lý do tiếng Việt hiển thị cho người dùng."""
    roles = set(getattr(principal, "roles", ()))
    if getattr(principal, "is_admin", False):
        return "Quản trị hệ thống không chạy đội agent trên hồ sơ."
    allowed = [r for r in ROLE_STATUSES if r in roles]
    if not allowed:
        return "Chỉ Quan hệ khách hàng hoặc Thẩm định đang giữ hồ sơ mới được chạy đội agent."
    if not any(status in ROLE_STATUSES[r] for r in allowed):
        return f"Hồ sơ đang ở trạng thái “{_STATUS_VI.get(status, status)}”, vai trò của bạn không được chạy đội agent ở bước này."
    if not holds:
        return "Bạn không phải người đang giữ hồ sơ này."
    return None


class LoanAgentRunService:
    def __init__(self, repository: LoanAgentRunRepository, engine: AgentEngineClient | None) -> None:
        self._repo = repository
        self._engine = engine

    async def _loan(self, loan_id: UUID) -> Any:
        loan = await self._repo.loan(loan_id)
        if loan is None:
            raise NotFoundError("LOAN_NOT_FOUND", "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.")
        return loan

    async def open_case_ids(self, loan_id: UUID) -> list[str]:
        """Mã ca đã chạy trên hồ sơ; dùng để báo engine khi hồ sơ được quyết định."""
        if self._engine is None:
            return []
        return [str(r["case_id"]) for r in await self._repo.list(loan_id)]

    async def notify_decided(self, jwt: str, loan_id: UUID, case_ids: list[str]) -> None:
        """Best-effort sau khi `decide` đã commit: engine tự kiểm lại hồ sơ rồi đóng ca còn mở."""
        if self._engine is None:
            return
        for case_id in case_ids:
            try:
                await self._engine.loan_decided(case_id, str(loan_id), jwt=jwt)
            except AgentEngineError as e:
                log.warning("loan_decided notify failed case=%s status=%s", case_id, e.status)

    async def overview(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        loan = await self._loan(loan_id)
        reason = denial_reason(principal, str(loan["status"]), await self._repo.holds(loan_id))
        runs = [_iso(r) for r in await self._repo.list(loan_id)]
        return {"can_run": reason is None, "deny_reason": reason, "latest": runs[0] if runs else None,
                "runs": runs}

    async def _active(self, case_id: str) -> bool:
        if self._engine is None:
            return False
        try:
            case = await self._engine.get_case(case_id)
        except AgentEngineError as e:
            if e.status == 404:
                return False
            raise
        if str(case.get("state") or "") in FINAL_STATES:
            return False
        updated = case.get("updated_at")
        return not (isinstance(updated, (int, float)) and time.time() - updated > STALE_AFTER_SECONDS)

    async def start(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        loan = await self._loan(loan_id)
        reason = denial_reason(principal, str(loan["status"]), await self._repo.holds(loan_id))
        if reason is not None:
            raise AuthorizationError("AGENT_RUN_NOT_ALLOWED", reason, {"status": str(loan["status"])})
        if self._engine is None:
            raise DependencyUnavailableError("AGENT_ENGINE_UNAVAILABLE", "Agent engine chưa được cấu hình.")
        await self._repo.lock(loan_id)
        runs = await self._repo.list(loan_id)
        if runs and await self._active(str(runs[0]["case_id"])):
            raise ConflictError("AGENT_RUN_IN_PROGRESS", "Đội agent đang chạy trên hồ sơ này, vui lòng chờ kết thúc.",
                                {"case_id": str(runs[0]["case_id"])})
        collateral_id = await self._repo.first_collateral_id(loan_id)
        request = {
            "business_id": str(loan["primary_customer_id"]),
            "amount": float(loan["requested_amount"]),
            "term_months": int(loan["requested_term_months"]),
            "purpose": str(loan["loan_purpose"]),
            "has_collateral": collateral_id is not None,
            "collateral_id": collateral_id,
        }
        case_id = await self._engine.create_case(request)
        await self._engine.run(case_id)
        await self._repo.insert(loan_id, case_id, principal.employee_id)
        return await self.overview(principal, loan_id)
