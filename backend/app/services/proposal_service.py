"""Nghiệp vụ trang 04 "Tạo đề xuất vay": nháp, tự lưu, xung đột version (lát 5)."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Protocol
from uuid import UUID

from app.exceptions import ConflictError
from app.services.access import require_permission
from app.services.protocols import PrincipalLike

# Chỉ QHKH sửa được khi hồ sơ còn ở nháp hoặc bị trả lại (spec §5).
EDITABLE_STATUSES = frozenset({"DRAFT", "RETURNED_TO_RM"})


class ProposalRepositoryLike(Protocol):
    async def get_draft(self, loan_id: UUID) -> Mapping[str, Any] | None: ...

    async def list_products(self) -> list[Mapping[str, Any]]: ...

    async def save_draft(
        self, loan_id: UUID, *, values: Mapping[str, Any], expected_version: int, employee_id: UUID
    ) -> bool: ...


class ProposalService:
    def __init__(self, repository: ProposalRepositoryLike) -> None:
        self._repo = repository

    async def list_products(self, principal: PrincipalLike) -> list[Mapping[str, Any]]:
        require_permission(principal, "loan:create")
        return list(await self._repo.list_products())

    async def get_draft(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        require_permission(principal, "loan:read")
        row = await self._repo.get_draft(loan_id)
        if row is None:
            raise LookupError("Loan application was not found or is outside the authorized scope")
        return {**row, "editable": row["status"] in EDITABLE_STATUSES}

    async def save_draft(
        self,
        principal: PrincipalLike,
        loan_id: UUID,
        values: Mapping[str, Any],
        *,
        expected_version: int,
    ) -> dict[str, Any]:
        require_permission(principal, "loan:update")
        current = await self.get_draft(principal, loan_id)
        if not current["editable"]:
            raise ConflictError("DRAFT_LOCKED", "Đề xuất đã gửi, không sửa được nháp.")
        assigned = current.get("assigned_employee_id")
        if assigned is not None and UUID(str(assigned)) != principal.employee_id:
            raise PermissionError("Loan application is being handled by another employee")
        if not await self._repo.save_draft(
            loan_id, values=values, expected_version=expected_version,
            employee_id=principal.employee_id,
        ):
            raise ConflictError(
                "VERSION_CONFLICT",
                "Đề xuất đã được lưu ở nơi khác (tab hoặc phiên khác); tải lại trước khi sửa tiếp.",
                {
                    "current_version": current["version"],
                    "saved_at": current["saved_at"].isoformat() if current["saved_at"] else None,
                    "saved_by_name": current["saved_by_name"],
                },
            )
        return await self.get_draft(principal, loan_id)
