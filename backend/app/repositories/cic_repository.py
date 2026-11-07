"""Truy vấn tài liệu, văn bản đồng ý và tra cứu CIC của trang 04, chạy dưới RLS của người gọi."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, fetch_all, fetch_one

_CONSENTS_SQL = """
SELECT consent.id, consent.document_id, consent.signed_on, consent.valid_until,
       consent.confirmed_by, consent.confirmed_at, employee.full_name AS confirmed_by_name
FROM banking.cic_consent AS consent
LEFT JOIN identity.employee AS employee ON employee.id = consent.confirmed_by
WHERE consent.customer_id = :customer_id
ORDER BY consent.signed_on DESC, consent.created_at DESC
"""

_CONSENT_DOC_SQL = """
SELECT doc.verification_status
FROM credit.loan_checklist_item AS item
JOIN document.document AS doc ON doc.id = item.linked_document_id
WHERE item.loan_application_id = :loan_id AND item.document_type = 'CIC_CONSENT'
ORDER BY doc.created_at DESC LIMIT 1
"""

_REPORT_SQL = """
SELECT report.id, report.report_as_of_date, report.valid_until, report.source,
       report.requested_at, report.risk_summary, employee.full_name AS looked_up_by_name
FROM banking.credit_report AS report
LEFT JOIN identity.employee AS employee ON employee.id = report.looked_up_by
WHERE report.customer_id = :customer_id
ORDER BY report.requested_at DESC LIMIT 1
"""

_DOCUMENTS_SQL = """
SELECT item.id AS item_id, item.requirement_code::text AS code, item.document_type,
       item.mandatory_level, item.requirement_status AS status,
       doc.id AS document_id, doc.title, doc.verification_status, doc.issued_date,
       doc.valid_until AS document_valid_until,
       EXISTS (
           SELECT 1 FROM credit.case_exception AS exc
           WHERE exc.loan_application_id = item.loan_application_id AND exc.kind = 'DOCUMENT'
             AND exc.checklist_code = item.requirement_code::text
             AND exc.withdrawn_at IS NULL
             AND (exc.decision IS NULL OR exc.decision = 'ACCEPTED')
       ) AS has_exception
FROM credit.loan_checklist_item AS item
LEFT JOIN document.document AS doc ON doc.id = item.linked_document_id
WHERE item.loan_application_id = :loan_id
ORDER BY item.requirement_code, item.id
"""


class CicRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def consents(self, customer_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _CONSENTS_SQL, {"customer_id": customer_id})

    async def consent_document_status(self, loan_id: UUID) -> str | None:
        row = await fetch_one(self.session, _CONSENT_DOC_SQL, {"loan_id": loan_id})
        return None if row is None else str(row["verification_status"])

    async def latest_report(self, customer_id: UUID) -> Record | None:
        return await fetch_one(self.session, _REPORT_SQL, {"customer_id": customer_id})

    async def documents(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _DOCUMENTS_SQL, {"loan_id": loan_id})

    async def sla_days(self) -> dict[str, int]:
        rows = await fetch_all(self.session, "SELECT step_code, workdays FROM credit.sla_parameter", {})
        return {str(r["step_code"]): int(r["workdays"]) for r in rows}

    async def holidays(self) -> frozenset[date]:
        rows = await fetch_all(self.session, "SELECT day FROM credit.holiday", {})
        return frozenset(r["day"] for r in rows)

    async def consent_document_belongs(self, loan_id: UUID, document_id: UUID) -> bool:
        row = await fetch_one(
            self.session,
            """SELECT 1 AS ok FROM credit.loan_checklist_item AS item
               JOIN document.document AS doc ON doc.id = item.linked_document_id
               WHERE item.loan_application_id = :loan_id AND doc.id = :doc
                 AND doc.document_type = 'CIC_CONSENT'""",
            {"loan_id": loan_id, "doc": document_id},
        )
        return row is not None

    async def insert_consent(
        self, *, customer_id: UUID, document_id: UUID, signed_on: date,
        valid_until: date | None, employee_id: UUID,
    ) -> UUID:
        consent_id = uuid4()
        await fetch_one(
            self.session,
            """INSERT INTO banking.cic_consent
                   (id, customer_id, document_id, signed_on, valid_until, confirmed_by, confirmed_at)
               VALUES (:id, :customer_id, :document_id, :signed_on, :valid_until, :employee_id, now())
               RETURNING id""",
            {"id": consent_id, "customer_id": customer_id, "document_id": document_id,
             "signed_on": signed_on, "valid_until": valid_until, "employee_id": employee_id},
        )
        return consent_id

    async def insert_report(
        self, *, customer_id: UUID, consent_id: UUID, employee_id: UUID, today: date,
        valid_until: date, summary: Mapping[str, Any], source: str,
    ) -> UUID:
        report_id = uuid4()
        await fetch_one(
            self.session,
            """INSERT INTO banking.credit_report
                   (id, customer_id, provider, requested_at, report_as_of_date, risk_summary,
                    looked_up_by, consent_id, valid_until, source, created_at)
               VALUES (:id, :customer_id, 'CIC', now(), :today, CAST(:summary AS jsonb),
                       :employee_id, :consent_id, :valid_until, :source, now())
               RETURNING id""",
            {"id": report_id, "customer_id": customer_id, "today": today, "summary": dict(summary),
             "employee_id": employee_id, "consent_id": consent_id, "valid_until": valid_until,
             "source": source},
        )
        return report_id
