"""Truy vấn trang 04 (nháp đề xuất vay), chạy dưới RLS của người gọi."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, fetch_all, fetch_one

_DRAFT_SQL = """
SELECT la.id AS loan_application_id, la.application_number::text AS application_number,
       la.status, la.version, la.assigned_employee_id, la.primary_customer_id,
       party.display_name AS customer_name,
       la.product_id, lp.product_code, lp.product_name,
       lp.min_amount, lp.max_amount, lp.min_term_months, lp.max_term_months,
       la.requested_amount, la.requested_term_months,
       draft.purpose_text, draft.repayment_source_text,
       COALESCE(draft.secured, TRUE) AS secured,
       draft.saved_at, saver.full_name AS saved_by_name
FROM credit.loan_application AS la
JOIN credit.loan_product AS lp ON lp.id = la.product_id
LEFT JOIN credit.loan_party AS borrower
  ON borrower.loan_application_id = la.id AND borrower.party_role = 'PRIMARY_BORROWER'
LEFT JOIN customer.party AS party ON party.id = borrower.party_id
LEFT JOIN credit.loan_draft AS draft ON draft.loan_application_id = la.id
LEFT JOIN identity.employee AS saver ON saver.id = draft.saved_by
WHERE la.id = :loan_id
"""


class ProposalRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_draft(self, loan_id: UUID) -> Record | None:
        return await fetch_one(self.session, _DRAFT_SQL, {"loan_id": loan_id})

    async def save_draft(
        self, loan_id: UUID, *, values: Mapping[str, Any], expected_version: int, employee_id: UUID
    ) -> bool:
        """Ghi cột có kiểu + phần văn bản; False nếu version lệch (không ghi gì)."""
        row = await fetch_one(
            self.session,
            """
            UPDATE credit.loan_application
            SET product_id = :product_id, requested_amount = :requested_amount,
                requested_term_months = :requested_term_months, updated_by = :employee_id,
                updated_at = CURRENT_TIMESTAMP, version = version + 1
            WHERE id = :loan_id AND version = :expected_version
            RETURNING id
            """,
            {**values, "loan_id": loan_id, "expected_version": expected_version,
             "employee_id": employee_id},
        )
        if row is None:
            return False
        await fetch_one(
            self.session,
            """
            INSERT INTO credit.loan_draft
                (loan_application_id, purpose_text, repayment_source_text, secured, saved_at, saved_by)
            VALUES (:loan_id, :purpose_text, :repayment_source_text, :secured,
                    CURRENT_TIMESTAMP, :employee_id)
            ON CONFLICT (loan_application_id) DO UPDATE
            SET purpose_text = EXCLUDED.purpose_text,
                repayment_source_text = EXCLUDED.repayment_source_text,
                secured = EXCLUDED.secured, saved_at = EXCLUDED.saved_at, saved_by = EXCLUDED.saved_by
            RETURNING loan_application_id
            """,
            {**values, "loan_id": loan_id, "employee_id": employee_id},
        )
        return True

    async def list_products(self) -> list[Record]:
        return await fetch_all(
            self.session,
            """
            SELECT id, product_code::text AS product_code, product_name, customer_type, loan_purpose,
                   min_amount, max_amount, min_term_months, max_term_months
            FROM credit.loan_product
            WHERE status = 'ACTIVE' AND customer_type = 'ORGANIZATION'
              AND effective_from <= CURRENT_DATE
              AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
            ORDER BY product_name
            """,
        )
