"""Trang 02b "Chi tiết hồ sơ vay", phần đọc (lát 10): chỉ số có nguồn, cờ, TSBĐ, dòng thời gian. Chạy dưới RLS."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, fetch_all, fetch_one

# Chỉ lấy số có tài liệu nguồn (JOIN bắt buộc): số không có nguồn thì không hiện.
_METRICS_SQL = """
SELECT field.id AS field_id, field.field_name, field.ocr_value_text AS value_text, field.value_number,
       field.page_number, field.verification_status, field.source_type, field.verification_reason,
       doc.id AS document_id, doc.title AS document_title,
       checker.full_name AS verified_by_name, field.verified_at
FROM credit.loan_application AS la
JOIN document.document_link AS link
  ON link.entity_type = 'LOAN_APPLICATION' AND link.entity_id = la.id
JOIN document.document AS doc ON doc.id = link.document_id
JOIN document.document_version AS ver ON ver.document_id = doc.id AND ver.is_current
JOIN document.extracted_field AS field ON field.document_version_id = ver.id
LEFT JOIN identity.employee AS checker ON checker.id = field.verified_by
WHERE la.id = :loan_id AND field.field_name = ANY(string_to_array(:names, ','))
ORDER BY field.field_name, doc.id
"""

_CONFLICT_SQL = """
SELECT conflict.id AS conflict_id, conflict.code, conflict.field_ids, conflict.chosen_field_id,
       conflict.resolution_reason, conflict.resolved_at, resolver.full_name AS resolved_by_name
FROM document.field_conflict AS conflict
LEFT JOIN identity.employee AS resolver ON resolver.id = conflict.resolved_by
WHERE conflict.loan_application_id = :loan_id
"""

_THRESHOLDS_SQL = """
SELECT clause.clause_number, clause.metadata
FROM policy.policy AS pol
JOIN policy.policy_version AS ver ON ver.policy_id = pol.id AND ver.status = 'ACTIVE'
JOIN policy.policy_clause AS clause ON clause.policy_version_id = ver.id
WHERE pol.policy_code = 'CS-TD-SME/2025' AND clause.clause_number = ANY(string_to_array(:clauses, ','))
"""


class LoanDetailRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def loan(self, loan_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            """SELECT la.id, la.application_number, la.status, la.requested_amount, la.currency,
                      la.requested_term_months, la.approval_tier, la.version,
                      party.display_name AS customer_name, assignee.full_name AS assignee_name,
                      dec.approved_amount, dec.approved_term_months, dec.decision_type, dec.conditions
               FROM credit.loan_application AS la
               LEFT JOIN LATERAL (
                 SELECT d.approved_amount, d.approved_term_months, d.decision_type, d.conditions
                 FROM credit.loan_decision AS d WHERE d.loan_application_id = la.id
                 ORDER BY d.decision_at DESC LIMIT 1
               ) AS dec ON TRUE
               LEFT JOIN credit.loan_party AS borrower
                 ON borrower.loan_application_id = la.id AND borrower.party_role = 'PRIMARY_BORROWER'
               LEFT JOIN customer.party AS party ON party.id = borrower.party_id
               LEFT JOIN LATERAL (
                 -- L10: người giữ = người của bước chính đang mở; hồ sơ đã kết thúc thì không có.
                 SELECT st.assignee_employee_id FROM credit.case_step AS st
                 WHERE st.loan_application_id = la.id AND st.completed_at IS NULL
                   AND st.step_code NOT IN ('PENDING_INFO', 'RISK_PENDING_INFO')
                   AND la.status NOT IN ('APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'WITHDRAWN')
                 ORDER BY st.received_at DESC LIMIT 1
               ) AS cur ON TRUE
               LEFT JOIN identity.employee AS assignee ON assignee.id = cur.assignee_employee_id
               WHERE la.id = :loan_id""",
            {"loan_id": loan_id},
        )

    async def metric_fields(self, loan_id: UUID, names: list[str]) -> list[Record]:
        return await fetch_all(self.session, _METRICS_SQL, {"loan_id": loan_id, "names": ",".join(names)})

    async def conflicts(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _CONFLICT_SQL, {"loan_id": loan_id})

    async def thresholds(self, clauses: list[str]) -> list[Record]:
        return await fetch_all(self.session, _THRESHOLDS_SQL, {"clauses": ",".join(clauses)})

    async def flags(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """SELECT flag.id, flag.code, flag.severity, flag.title, flag.status, flag.source,
                      flag.blocks_submission, flag.handling_note, flag.compliance_conclusion,
                      flag.compliance_reason, flag.created_at, flag.early_warned_at, flag.early_warning_note
               FROM credit.case_flag AS flag WHERE flag.loan_application_id = :loan_id
               ORDER BY CASE flag.severity WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END, flag.created_at""",
            {"loan_id": loan_id},
        )

    async def collaterals(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """SELECT col.id, col.collateral_type, col.description, owner.display_name AS owner_name,
                      col.declared_value, col.appraised_value, col.eligible_value, col.currency,
                      col.valuation_date, col.valuation_status, col.ownership_verification_status
               FROM credit.collateral AS col JOIN customer.party AS owner ON owner.id = col.owner_party_id
               WHERE col.loan_application_id = :loan_id ORDER BY col.created_at, col.id""",
            {"loan_id": loan_id},
        )

    async def steps(self, loan_id: UUID) -> list[Record]:
        # bank_app không đọc trực tiếp case_step (Q-M): dùng hàm SQL đã che lý do bước AML/gian lận.
        return await fetch_all(
            self.session,
            """SELECT step.*, assignee.full_name AS assignee_name
               FROM credit.list_case_steps(:loan_id) AS step
               LEFT JOIN identity.employee AS assignee ON assignee.id = step.assignee_employee_id
               ORDER BY step.received_at""",
            {"loan_id": loan_id},
        )
