"""Truy vấn nhóm liên quan, tài sản, ngoại lệ của trang 04 (lát 7), chạy dưới RLS của người gọi."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, fetch_all, fetch_one

_LINES_SQL = """
SELECT line.line_party_id AS party_id, line.line_name AS name, line.line_relation AS relation,
       related.status, related.basis, COALESCE(related.proposed_by_ai, false) AS proposed_by_ai,
       line.line_outstanding AS outstanding, line.line_off_balance AS off_balance
FROM credit.case_exposure_lines(:loan_id) AS line
LEFT JOIN credit.case_related_party AS related
       ON related.loan_application_id = :loan_id AND related.party_id = line.line_party_id
ORDER BY (line.line_relation = 'PRIMARY') DESC, line.line_name
"""

_COLLATERAL_SQL = """
SELECT collateral.id, collateral.collateral_type, collateral.description,
       party.display_name AS owner_name, collateral.on_leased_land, collateral.land_lease_payment,
       collateral.land_lease_proof_document_id IS NOT NULL AS has_lease_proof
FROM credit.collateral AS collateral
JOIN customer.party AS party ON party.id = collateral.owner_party_id
WHERE collateral.loan_application_id = :loan_id
ORDER BY collateral.created_at, collateral.id
"""

_EXCEPTIONS_SQL = """
SELECT id, checklist_code, kind, reason, proposed_at, decision, withdrawn_at
FROM credit.case_exception
WHERE loan_application_id = :loan_id
ORDER BY proposed_at, id
"""


class SubmissionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def exposure_lines(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _LINES_SQL, {"loan_id": loan_id})

    async def latest_revenue(self, loan_id: UUID) -> tuple[int, Any] | None:
        """Doanh thu năm gần nhất của khách chính (Q8); None nếu chưa có số liệu."""
        row = await fetch_one(
            self.session,
            """SELECT fy.fiscal_year, fy.revenue
               FROM credit.loan_application AS la
               JOIN credit.sme_financial_year AS fy ON fy.customer_id = la.primary_customer_id
               WHERE la.id = :loan_id AND fy.revenue IS NOT NULL
               ORDER BY fy.fiscal_year DESC LIMIT 1""",
            {"loan_id": loan_id},
        )
        return (int(row["fiscal_year"]), row["revenue"]) if row else None

    async def total_exposure_and_tier(self, loan_id: UUID) -> tuple[Any, int]:
        row = await fetch_one(
            self.session,
            "SELECT credit.total_credit_exposure(:loan_id) AS total, credit.required_tier(:loan_id) AS tier",
            {"loan_id": loan_id},
        )
        return (row["total"] if row else 0, int(row["tier"]) if row and row["tier"] is not None else 1)

    async def set_related_status(
        self, loan_id: UUID, party_id: UUID, *, status: str, basis: str | None, employee_id: UUID
    ) -> bool:
        row = await fetch_one(
            self.session,
            """
            UPDATE credit.case_related_party
            SET status = :status, basis = :basis, decided_by = :employee_id, decided_at = now()
            WHERE loan_application_id = :loan_id AND party_id = :party_id
            RETURNING party_id
            """,
            {"loan_id": loan_id, "party_id": party_id, "status": status, "basis": basis, "employee_id": employee_id},
        )
        return row is not None

    async def collaterals(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _COLLATERAL_SQL, {"loan_id": loan_id})

    async def set_lease_payment(self, loan_id: UUID, collateral_id: UUID, payment: str) -> bool:
        row = await fetch_one(
            self.session,
            """
            UPDATE credit.collateral SET land_lease_payment = :payment, updated_at = now(), version = version + 1
            WHERE id = :collateral_id AND loan_application_id = :loan_id AND on_leased_land
            RETURNING id
            """,
            {"loan_id": loan_id, "collateral_id": collateral_id, "payment": payment},
        )
        return row is not None

    async def exceptions(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _EXCEPTIONS_SQL, {"loan_id": loan_id})

    async def checklist_document_type(self, loan_id: UUID, code: str) -> Record | None:
        return await fetch_one(
            self.session,
            "SELECT document_type, mandatory_level FROM credit.loan_checklist_item "
            "WHERE loan_application_id = :loan_id AND requirement_code::text = :code",
            {"loan_id": loan_id, "code": code},
        )

    async def active_exception(self, loan_id: UUID, code: str) -> bool:
        row = await fetch_one(
            self.session,
            "SELECT 1 AS found FROM credit.case_exception WHERE loan_application_id = :loan_id "
            "AND checklist_code = :code AND withdrawn_at IS NULL AND (decision IS NULL OR decision = 'ACCEPTED')",
            {"loan_id": loan_id, "code": code},
        )
        return row is not None

    async def insert_exception(self, loan_id: UUID, *, code: str, reason: str, employee_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            """
            INSERT INTO credit.case_exception
                (id, loan_application_id, checklist_code, kind, reason, proposed_by, proposed_at)
            VALUES (:id, :loan_id, :code, 'DOCUMENT', :reason, :employee_id, now())
            RETURNING id, checklist_code, kind, reason, proposed_at, decision, withdrawn_at
            """,
            {"id": uuid4(), "loan_id": loan_id, "code": code, "reason": reason, "employee_id": employee_id},
        )

    async def withdraw_exception(self, loan_id: UUID, exception_id: UUID) -> bool:
        row = await fetch_one(
            self.session,
            "UPDATE credit.case_exception SET withdrawn_at = now() WHERE id = :id "
            "AND loan_application_id = :loan_id AND decision IS NULL AND withdrawn_at IS NULL RETURNING id",
            {"id": exception_id, "loan_id": loan_id},
        )
        return row is not None
