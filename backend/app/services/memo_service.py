"""Tờ trình thẩm định (lát 10b, Q-L).

- Chỉ Thẩm định đang giữ bước (RLS `can_write_loan`) sửa bản nháp, khi hồ sơ ở bước Thẩm định.
- Tự lưu có khóa lạc quan `version`; lưu trùng version → 409 VERSION_CONFLICT.
- AI chỉ đề xuất: khối AI vào dưới dạng PENDING, chỉ CONFIRMED khi người xác nhận; chưa xác nhận thì không vào bản chốt.
- Người khác (Rủi ro, cấp phê duyệt, kiểm toán) chỉ đọc bản đã chốt lúc trình (`appraisal_memo_version`).
Chốt bản và mở bản mới khi trả lại do `WorkflowService` gọi trong cùng giao dịch với việc chuyển bước.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from app.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from app.repositories.memo_repository import MemoRepository
from app.services.protocols import PrincipalLike
from app.workflow import memo as rules

MEMO_ROLE = "credit_appraiser"
EDIT_STATUS = "APPRAISAL"
MAX_TEXT = 20000


class MemoService:
    def __init__(self, repository: MemoRepository) -> None:
        self._repo = repository

    async def _loan(self, loan_id: UUID) -> Mapping[str, Any]:
        loan = await self._repo.loan(loan_id)
        if loan is None:
            raise NotFoundError("LOAN_NOT_FOUND", "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.")
        return loan

    def _is_author(self, principal: PrincipalLike) -> bool:
        return MEMO_ROLE in set(getattr(principal, "roles", ())) and not getattr(principal, "is_admin", False)

    async def _editable(self, principal: PrincipalLike, loan_id: UUID) -> Mapping[str, Any]:
        loan = await self._loan(loan_id)
        if not self._is_author(principal):
            raise AuthorizationError("ROLE_NOT_ALLOWED", "Vai trò hiện tại không được soạn Tờ trình.")
        if loan["status"] != EDIT_STATUS:
            raise ConflictError("MEMO_LOCKED", "Hồ sơ không ở bước Thẩm định nên không sửa được Tờ trình.")
        if not await self._repo.can_write_loan(principal.employee_id, loan_id):
            raise AuthorizationError("NOT_ASSIGNED", "Hồ sơ này chưa giao cho bạn nên không soạn được Tờ trình.")
        return loan

    async def view(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        loan = await self._loan(loan_id)
        versions = [dict(v) for v in await self._repo.versions(loan_id)]
        draft = None
        editable = False
        row = await self._repo.draft(loan_id)  # RLS: chỉ người đang giữ bước thấy được bản nháp
        if row is not None and self._is_author(principal):
            sections = rules.normalize(row["sections"])
            editable = row["state"] == "DRAFT" and loan["status"] == EDIT_STATUS
            draft = {"revision": row["revision"], "version": row["version"], "sections": sections,
                     "updated_at": row["updated_at"], "updated_by_name": row["updated_by_name"]}
        elif (
            row is None and self._is_author(principal) and loan["status"] == EDIT_STATUS
            and await self._repo.can_write_loan(principal.employee_id, loan_id)
        ):
            nxt = versions[0]["revision"] + 1 if versions else 1
            draft = {"revision": nxt, "version": 0, "sections": rules.blank_sections(),
                     "updated_at": None, "updated_by_name": None}
            editable = True
        progress = rules.completion(draft["sections"]) if draft else None
        return {
            "loan_application_id": loan_id,
            "loan_status": loan["status"],
            "titles": {str(k): v for k, v in rules.SECTION_TITLES.items()},
            "draft": draft,
            "editable": editable,
            "progress": {str(k): v for k, v in progress.items()} if progress else None,
            "finalized": ({**versions[0], "sections": versions[0]["content"]} if versions else None),
            "versions": [{"revision": v["revision"], "finalized_at": v["finalized_at"],
                          "finalized_by_name": v["finalized_by_name"]} for v in versions],
        }

    async def _load_for_edit(self, principal: PrincipalLike, loan_id: UUID, expected_version: int) -> dict[str, Any]:
        await self._editable(principal, loan_id)
        row = await self._repo.draft(loan_id, lock=True)
        if row is None:
            if expected_version != 0:
                raise self._conflict(None)
            versions = await self._repo.versions(loan_id)
            base = rules.normalize(versions[0]["content"]) if versions else rules.blank_sections()
            if not await self._repo.create_draft(loan_id, base, principal.employee_id):
                raise self._conflict(None)
            row = await self._repo.draft(loan_id, lock=True)
            expected_version = 1
        if row is None or row["state"] != "DRAFT":
            raise ConflictError("MEMO_LOCKED", "Bản Tờ trình đã chốt, không sửa được.")
        if row["version"] != expected_version:
            raise self._conflict(row)
        return {"sections": rules.normalize(row["sections"]), "version": row["version"]}

    @staticmethod
    def _conflict(row: Mapping[str, Any] | None) -> ConflictError:
        return ConflictError(
            "VERSION_CONFLICT",
            "Tờ trình đã được lưu ở nơi khác (tab hoặc phiên khác); tải lại trước khi sửa tiếp.",
            {"current_version": row["version"] if row else None,
             "saved_by_name": row["updated_by_name"] if row else None},
        )

    async def _write(self, principal: PrincipalLike, loan_id: UUID, state: dict[str, Any], sections: dict[str, Any]) -> None:
        if not await self._repo.save(
            loan_id, sections, expected_version=state["version"], employee_id=principal.employee_id
        ):
            raise self._conflict(await self._repo.draft(loan_id))

    async def save(
        self, principal: PrincipalLike, loan_id: UUID, bodies: Mapping[str, str], *, expected_version: int
    ) -> dict[str, Any]:
        for key, text in bodies.items():
            if key not in {str(n) for n in rules.SECTION_NOS}:
                raise ValidationError("MEMO_SECTION_INVALID", f"Mục {key} không có trong Tờ trình (chỉ mục 1–7).")
            if len(text) > MAX_TEXT:
                raise ValidationError("MEMO_TEXT_TOO_LONG", f"Mục {key} dài quá {MAX_TEXT} ký tự.")
        state = await self._load_for_edit(principal, loan_id, expected_version)
        sections = state["sections"]
        for key, text in bodies.items():
            sections[key]["body"] = text
        await self._write(principal, loan_id, state, sections)
        return await self.view(principal, loan_id)

    async def add_ai_block(
        self, principal: PrincipalLike, loan_id: UUID, *, section: int, text: str, source_ref: str | None,
        expected_version: int,
    ) -> dict[str, Any]:
        if section not in rules.SECTION_TITLES:
            raise ValidationError("MEMO_SECTION_INVALID", "Mục phải từ 1 đến 7.")
        if section in rules.HUMAN_ONLY_SECTIONS:
            raise ValidationError("MEMO_AI_NOT_ALLOWED", "Mục 7 do người thẩm định tự viết; AI không được chèn.")
        if not text.strip() or len(text) > MAX_TEXT:
            raise ValidationError("MEMO_TEXT_INVALID", "Nội dung gợi ý trống hoặc quá dài.")
        state = await self._load_for_edit(principal, loan_id, expected_version)
        sections = state["sections"]
        sections[str(section)]["ai_blocks"].append({
            "id": str(uuid4()), "text": text, "state": rules.PENDING, "source": "AI",
            "source_ref": source_ref, "created_at": datetime.now(UTC).isoformat(),
            "created_by": str(principal.employee_id), "decided_by": None, "decided_at": None,
        })
        await self._write(principal, loan_id, state, sections)
        return await self.view(principal, loan_id)

    async def decide_ai_block(
        self, principal: PrincipalLike, loan_id: UUID, block_id: UUID, *, confirm: bool, expected_version: int
    ) -> dict[str, Any]:
        state = await self._load_for_edit(principal, loan_id, expected_version)
        sections = state["sections"]
        for section in sections.values():
            for block in section["ai_blocks"]:
                if block["id"] == str(block_id):
                    if block["state"] != rules.PENDING:
                        raise ConflictError("MEMO_BLOCK_DECIDED", "Khối AI này đã được quyết định.")
                    block["state"] = rules.CONFIRMED if confirm else rules.REJECTED
                    block["decided_by"] = str(principal.employee_id)
                    block["decided_at"] = datetime.now(UTC).isoformat()
                    await self._write(principal, loan_id, state, sections)
                    return await self.view(principal, loan_id)
        raise NotFoundError("MEMO_BLOCK_NOT_FOUND", "Không tìm thấy khối AI trong Tờ trình.")
