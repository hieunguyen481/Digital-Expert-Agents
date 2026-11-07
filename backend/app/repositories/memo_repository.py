"""Tờ trình thẩm định (lát 10b): bản nháp tự lưu và các bản đã chốt, chạy dưới RLS của người gọi."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, fetch_all, fetch_one

_DRAFT_SQL = """
SELECT memo.id, memo.revision, memo.state, memo.sections, memo.version, memo.updated_at,
       emp.full_name AS updated_by_name
FROM credit.appraisal_memo AS memo
JOIN identity.employee AS emp ON emp.id = memo.updated_by
WHERE memo.loan_application_id = :loan_id
"""


class MemoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def loan(self, loan_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            """SELECT la.id, la.status, la.application_number, party.display_name AS customer_name
               FROM credit.loan_application AS la
               LEFT JOIN credit.loan_party AS borrower
                 ON borrower.loan_application_id = la.id AND borrower.party_role = 'PRIMARY_BORROWER'
               LEFT JOIN customer.party AS party ON party.id = borrower.party_id
               WHERE la.id = :loan_id""",
            {"loan_id": loan_id},
        )

    async def can_write_loan(self, employee_id: UUID, loan_id: UUID) -> bool:
        row = await fetch_one(
            self.session, "SELECT identity.can_write_loan(:e, :l) AS ok", {"e": employee_id, "l": loan_id}
        )
        return bool(row and row["ok"])

    async def draft(self, loan_id: UUID, *, lock: bool = False) -> Record | None:
        sql = _DRAFT_SQL + (" FOR UPDATE OF memo" if lock else "")
        return await fetch_one(self.session, sql, {"loan_id": loan_id})

    async def create_draft(self, loan_id: UUID, sections: dict[str, Any], employee_id: UUID) -> bool:
        """Tạo bản nháp đầu tiên; False nếu đã có (người khác tạo trước)."""
        row = await fetch_one(
            self.session,
            """INSERT INTO credit.appraisal_memo (id, loan_application_id, sections, updated_by)
               VALUES (:id, :loan_id, CAST(:sections AS jsonb), :emp)
               ON CONFLICT (loan_application_id) DO NOTHING RETURNING id""",
            {"id": uuid4(), "loan_id": loan_id, "sections": sections, "emp": employee_id},
        )
        return row is not None

    async def save(
        self, loan_id: UUID, sections: dict[str, Any], *, expected_version: int, employee_id: UUID
    ) -> bool:
        row = await fetch_one(
            self.session,
            """UPDATE credit.appraisal_memo
               SET sections = CAST(:sections AS jsonb), version = version + 1,
                   updated_by = :emp, updated_at = CURRENT_TIMESTAMP
               WHERE loan_application_id = :loan_id AND version = :v AND state = 'DRAFT' RETURNING id""",
            {"sections": sections, "loan_id": loan_id, "v": expected_version, "emp": employee_id},
        )
        return row is not None

    async def versions(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """SELECT snap.revision, snap.content, snap.finalized_at, emp.full_name AS finalized_by_name
               FROM credit.appraisal_memo_version AS snap
               JOIN identity.employee AS emp ON emp.id = snap.finalized_by
               WHERE snap.loan_application_id = :loan_id ORDER BY snap.revision DESC""",
            {"loan_id": loan_id},
        )
