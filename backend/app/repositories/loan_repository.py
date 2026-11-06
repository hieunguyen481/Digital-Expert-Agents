"""Loan application aggregate persistence.

All access begins at ``credit.loan_application`` so PostgreSQL RLS participates
before related, otherwise-unprotected child rows are returned.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.compat import UTC
from app.repositories.base import (
    Record,
    execute_returning,
    fetch_all,
    fetch_one,
    insert_sql,
    require_fields,
)

_LOAN_COLUMNS = frozenset(
    {
        "id",
        "application_number",
        "primary_customer_id",
        "product_id",
        "requested_amount",
        "currency",
        "requested_term_months",
        "loan_purpose",
        "interest_rate_assumption",
        "repayment_method",
        "status",
        "assigned_employee_id",
        "submitted_at",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
        "version",
    }
)
_LOAN_REQUIRED = (
    "id",
    "application_number",
    "primary_customer_id",
    "product_id",
    "requested_amount",
    "currency",
    "requested_term_months",
    "loan_purpose",
    "status",
    "created_at",
    "created_by",
    "updated_at",
)
_LOAN_UPDATABLE = frozenset(
    {
        "product_id",
        "requested_amount",
        "currency",
        "requested_term_months",
        "loan_purpose",
        "interest_rate_assumption",
        "repayment_method",
        "assigned_employee_id",
        "updated_by",
    }
)
_LOAN_PARTY_COLUMNS = frozenset({"id", "loan_application_id", "party_id", "party_role", "created_at"})
_DOCUMENT_LINK_COLUMNS = frozenset(
    {"id", "document_id", "entity_type", "entity_id", "relationship_type", "created_at"}
)
class LoanRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, values: Mapping[str, Any]) -> Record:
        payload = dict(values)
        now = datetime.now(UTC)
        loan_id = UUID(str(payload.get("id") or uuid4()))
        payload.setdefault("id", loan_id)
        payload.setdefault(
            "application_number",
            f"LA-{now:%Y%m%d}-{str(loan_id).split('-')[0].upper()}",
        )
        payload.setdefault("status", "DRAFT")
        payload.setdefault("created_at", now)
        payload.setdefault("updated_at", now)
        payload.setdefault("version", 1)
        require_fields(payload, _LOAN_REQUIRED)
        row = await execute_returning(
            self.session,
            insert_sql("credit.loan_application", payload, _LOAN_COLUMNS),
            payload,
        )
        if row is None:
            raise RuntimeError("Loan application insert returned no row")
        return row

    async def get(self, loan_application_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            """
            SELECT la.*, lp.product_code, lp.product_name,
                   lp.customer_type AS product_customer_type,
                   lp.min_amount, lp.max_amount,
                   lp.min_term_months, lp.max_term_months
            FROM credit.loan_application AS la
            JOIN credit.loan_product AS lp ON lp.id = la.product_id
            WHERE la.id = :loan_id
            """,
            {"loan_id": loan_application_id},
        )

    async def update(
        self,
        loan_application_id: UUID,
        values: Mapping[str, Any],
        expected_version: int,
    ) -> Record | None:
        unknown = set(values) - _LOAN_UPDATABLE
        if unknown:
            raise ValueError(f"Unsupported loan fields: {', '.join(sorted(unknown))}")
        if not values:
            raise ValueError("No loan fields supplied")
        assignments = ", ".join(f"{name} = :{name}" for name in values)
        statement = text(
            f"""
            UPDATE credit.loan_application
            SET {assignments}, updated_at = CURRENT_TIMESTAMP, version = version + 1
            WHERE id = :loan_id AND version = :expected_version
            RETURNING *
            """
        )
        params = dict(values)
        params.update({"loan_id": loan_application_id, "expected_version": expected_version})
        return await execute_returning(self.session, statement, params)

    async def add_party(
        self,
        loan_application_id: UUID,
        *,
        party_id: UUID,
        party_role: str,
    ) -> Record:
        values = {
            "id": uuid4(),
            "loan_application_id": loan_application_id,
            "party_id": party_id,
            "party_role": party_role,
            "created_at": datetime.now(UTC),
        }
        row = await execute_returning(
            self.session,
            insert_sql("credit.loan_party", values, _LOAN_PARTY_COLUMNS),
            values,
        )
        if row is None:
            raise RuntimeError("Loan party insert returned no row")
        return row

    async def link_document(
        self,
        loan_application_id: UUID,
        *,
        document_id: UUID,
    ) -> Record:
        payload = {
            "id": uuid4(),
            "document_id": document_id,
            "entity_type": "LOAN_APPLICATION",
            "entity_id": loan_application_id,
            "relationship_type": "SUPPORTING_DOCUMENT",
            "created_at": datetime.now(UTC),
        }
        # Touching the protected parent makes a missing/unauthorized loan a no-op;
        # can_link_document (V027) requires write access to the loan and a document
        # owned by its primary customer or a confirmed related party.
        row = await execute_returning(
            self.session,
            """
            INSERT INTO document.document_link (
                id, document_id, entity_type, entity_id, relationship_type, created_at
            )
            SELECT :id, :document_id, 'LOAN_APPLICATION', la.id,
                   :relationship_type, :created_at
            FROM credit.loan_application AS la
            JOIN document.document AS d ON d.id = :document_id
            WHERE la.id = :loan_id
              AND identity.can_link_document(
                  identity.current_employee_id(), d.id, 'LOAN_APPLICATION', la.id
              )
            RETURNING *
            """,
            {**payload, "loan_id": loan_application_id},
        )
        if row is None:
            raise LookupError("Loan or document is missing or unauthorized")
        return row

    async def checklist(self, loan_application_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """
            SELECT ci.*
            FROM credit.loan_application AS la
            JOIN credit.loan_checklist_item AS ci ON ci.loan_application_id = la.id
            WHERE la.id = :loan_id
            ORDER BY ci.mandatory_level, ci.requirement_code, ci.id
            """,
            {"loan_id": loan_application_id},
        )

    async def calculations(self, loan_application_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """
            SELECT cr.*
            FROM credit.loan_application AS la
            JOIN credit.calculation_record AS cr ON cr.loan_application_id = la.id
            WHERE la.id = :loan_id
            ORDER BY cr.calculated_at DESC, cr.id
            """,
            {"loan_id": loan_application_id},
        )

    async def policy_checks(self, loan_application_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """
            SELECT pc.*, pv.version_number AS policy_version_number,
                   pv.effective_from, pv.effective_until,
                   pcl.clause_number, pcl.title AS clause_title
            FROM credit.loan_application AS la
            JOIN credit.policy_check AS pc ON pc.loan_application_id = la.id
            JOIN policy.policy_version AS pv ON pv.id = pc.policy_version_id
            LEFT JOIN policy.policy_clause AS pcl ON pcl.id = pc.clause_id
            WHERE la.id = :loan_id
            ORDER BY pc.checked_at DESC, pc.id
            """,
            {"loan_id": loan_application_id},
        )

    async def list_analyses(self, loan_application_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """
            SELECT ac.* FROM credit.loan_application AS la
            JOIN ai.analysis_case AS ac ON ac.loan_application_id = la.id
            WHERE la.id = :loan_id
            ORDER BY ac.created_at DESC, ac.id
            """,
            {"loan_id": loan_application_id},
        )

    async def latest_decision(self, loan_application_id: UUID) -> Record | None:
        """Quyet dinh moi nhat (credit.loan_decision chi them, ghi qua WorkflowService)."""
        return await fetch_one(
            self.session,
            """
            SELECT decision.*
            FROM credit.loan_application AS la
            JOIN credit.loan_decision AS decision ON decision.loan_application_id = la.id
            WHERE la.id = :loan_id
            ORDER BY decision.decision_at DESC, decision.created_at DESC
            LIMIT 1
            """,
            {"loan_id": loan_application_id},
        )

    async def can_access(self, loan_application_id: UUID) -> bool:
        row = await fetch_one(
            self.session,
            """SELECT identity.can_access_loan(
                       identity.current_employee_id(), :loan_id
                   ) AS allowed""",
            {"loan_id": loan_application_id},
        )
        return bool(row and row["allowed"])
