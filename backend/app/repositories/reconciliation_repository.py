"""Truy vấn trang 05 "Đối chiếu tài liệu", chạy dưới RLS của người gọi."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text as _text
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, fetch_all, fetch_one

_LOAN_SQL = """
SELECT la.id, la.application_number, la.status, la.version, party.display_name AS customer_name,
       (SELECT c.id FROM customer.customer AS c WHERE c.party_id = borrower.party_id LIMIT 1) AS customer_id
FROM credit.loan_application AS la
LEFT JOIN credit.loan_party AS borrower
  ON borrower.loan_application_id = la.id AND borrower.party_role = 'PRIMARY_BORROWER'
LEFT JOIN customer.party AS party ON party.id = borrower.party_id
WHERE la.id = :loan_id
"""

_ITEMS_SQL = """
SELECT item.id AS item_id, item.requirement_code AS code, item.document_type,
       (SELECT req.requirement_description FROM policy.checklist_rule_requirement AS req
        JOIN policy.checklist_rule AS rule ON rule.id = req.checklist_rule_id AND rule.rule_code = 'SME-6.1'
        WHERE req.requirement_code = item.requirement_code LIMIT 1) AS label,
       item.mandatory_level = 'MANDATORY' AS mandatory, item.requirement_status AS status,
       EXISTS (
           SELECT 1 FROM credit.case_exception AS exc
           WHERE exc.loan_application_id = item.loan_application_id
             AND exc.checklist_code = item.requirement_code AND exc.withdrawn_at IS NULL
       ) AS has_exception,
       COALESCE((
           SELECT array_agg(DISTINCT doc_id) FROM (
               SELECT item.linked_document_id AS doc_id
               UNION ALL
               SELECT item_document.document_id
               FROM credit.checklist_item_document AS item_document
               WHERE item_document.checklist_item_id = item.id
           ) AS ids WHERE doc_id IS NOT NULL
       ), '{}') AS document_ids,
       last_check.result AS check_result, last_check.note AS check_note,
       last_check.created_at AS check_at, checker.full_name AS check_actor_name
FROM credit.loan_checklist_item AS item
LEFT JOIN LATERAL (
    SELECT log.result, log.note, log.created_at, log.actor_id
    FROM credit.checklist_check_log AS log
    WHERE log.checklist_item_id = item.id
    ORDER BY log.created_at DESC, log.id DESC LIMIT 1
) AS last_check ON TRUE
LEFT JOIN identity.employee AS checker ON checker.id = last_check.actor_id
WHERE item.loan_application_id = :loan_id
ORDER BY item.created_at, item.requirement_code
"""

_DOCUMENTS_SQL = """
SELECT doc.id AS document_id, ver.id AS version_id, doc.title, doc.document_type, doc.document_subtype,
       doc.verification_status, doc.issued_date, doc.counts_for_checklist,
       GREATEST(1, COALESCE((SELECT max(f.page_number) FROM document.extracted_field AS f
                             WHERE f.document_version_id = ver.id), 1),
                COALESCE((SELECT max(p.page_number) FROM document.document_page AS p
                          WHERE p.document_version_id = ver.id), 1)) AS page_count,
       ver.id IS NOT NULL AND job.id IS NOT NULL AS from_pipeline,
       doc.processing_status, job.status AS job_status, job.progress_percent AS job_progress,
       job.current_step AS job_step, job.error_code AS job_error_code,
       (SELECT count(*) FROM document.extracted_field AS f WHERE f.document_version_id = ver.id) AS field_count,
       (SELECT count(*) FROM document.extracted_field AS f
        WHERE f.document_version_id = ver.id AND f.verification_status = 'NEEDS_VERIFICATION') AS needs_verification_count,
       (SELECT count(*) FROM document.extracted_field AS f
        WHERE f.document_version_id = ver.id AND f.verification_status = 'AI_PROPOSED') AS ai_proposed_count
FROM document.document AS doc
LEFT JOIN LATERAL (
    SELECT v.id FROM document.document_version AS v
    WHERE v.document_id = doc.id AND v.is_current ORDER BY v.version_number DESC LIMIT 1
) AS ver ON TRUE
LEFT JOIN LATERAL (
    SELECT j.id, j.status, j.progress_percent, j.current_step, j.error_code FROM integration.background_job AS j
    WHERE j.job_type = 'DOCUMENT_PROCESSING' AND j.resource_id = ver.id ORDER BY j.created_at DESC LIMIT 1
) AS job ON TRUE
WHERE doc.id IN (
    SELECT link.document_id FROM document.document_link AS link
    WHERE link.entity_type = 'LOAN_APPLICATION' AND link.entity_id = :loan_id
)
ORDER BY doc.created_at, doc.title
"""

_CONFLICTS_SQL = """
SELECT conflict.id AS conflict_id, conflict.code, conflict.field_ids, conflict.chosen_field_id,
       conflict.resolution_reason, conflict.resolved_at, resolver.full_name AS resolved_by_name
FROM document.field_conflict AS conflict
LEFT JOIN identity.employee AS resolver ON resolver.id = conflict.resolved_by
WHERE conflict.loan_application_id = :loan_id
ORDER BY conflict.created_at, conflict.code
"""

_SOURCES_SQL = """
SELECT f.id AS field_id, doc.id AS document_id, doc.title AS document_title, f.field_name::text AS field_name,
       COALESCE(f.corrected_value_text, f.ocr_value_text) AS value, f.value_number, f.page_number,
       f.source_type, f.verification_status
FROM document.extracted_field AS f
JOIN document.document_version AS ver ON ver.id = f.document_version_id
JOIN document.document AS doc ON doc.id = ver.document_id
WHERE f.id IN (SELECT CAST(jsonb_array_elements_text(CAST(:field_ids AS jsonb)) AS uuid))
"""

_FIELDS_SQL = """
SELECT f.id AS field_id, f.field_name::text AS field_name, f.value_type,
       COALESCE(f.corrected_value_text, f.ocr_value_text) AS value, f.value_number, f.page_number,
       f.bounding_box, f.source_text, f.confidence, f.verification_status, f.source_type,
       f.verification_reason, verifier.full_name AS verified_by_name, f.verified_at,
       (SELECT conflict.id FROM document.field_conflict AS conflict
        WHERE conflict.loan_application_id = :loan_id AND f.id = ANY(conflict.field_ids)
        ORDER BY conflict.created_at LIMIT 1) AS conflict_id
FROM document.extracted_field AS f
JOIN document.document_version AS ver ON ver.id = f.document_version_id
LEFT JOIN identity.employee AS verifier ON verifier.id = f.verified_by
WHERE ver.document_id = :document_id AND ver.is_current
ORDER BY f.page_number NULLS LAST, f.created_at, f.field_name
"""


class ReconciliationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def loan(self, loan_id: UUID) -> Record | None:
        return await fetch_one(self.session, _LOAN_SQL, {"loan_id": loan_id})

    async def can_write_loan(self, employee_id: UUID, loan_id: UUID) -> bool:
        row = await fetch_one(
            self.session, "SELECT identity.can_write_loan(:employee_id, :loan_id) AS ok",
            {"employee_id": employee_id, "loan_id": loan_id},
        )
        return bool(row and row["ok"])

    async def items(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _ITEMS_SQL, {"loan_id": loan_id})

    async def page_images_ready(self, version_id: UUID) -> bool:
        row = await fetch_one(
            self.session,
            """
            SELECT count(*) > 0 AND bool_and(page_image_object_id IS NOT NULL) AS ready
            FROM document.document_page WHERE document_version_id = :version_id
            """,
            {"version_id": version_id},
        )
        return bool(row and row["ready"])

    async def documents(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _DOCUMENTS_SQL, {"loan_id": loan_id})

    async def conflicts(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _CONFLICTS_SQL, {"loan_id": loan_id})

    async def conflict(self, loan_id: UUID, conflict_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            _CONFLICTS_SQL.replace("ORDER BY", "AND conflict.id = :conflict_id ORDER BY"),
            {"loan_id": loan_id, "conflict_id": conflict_id},
        )

    async def sources(self, field_ids: Sequence[UUID]) -> list[Record]:
        return await fetch_all(self.session, _SOURCES_SQL, {"field_ids": [str(f) for f in field_ids]})

    async def fields(self, loan_id: UUID, document_id: UUID) -> list[Record]:
        return await fetch_all(self.session, _FIELDS_SQL, {"loan_id": loan_id, "document_id": document_id})

    async def item(self, loan_id: UUID, item_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            """
            SELECT item.id, item.requirement_code AS code, item.requirement_status AS status,
                   EXISTS (
                       SELECT 1 FROM credit.checklist_item_document AS item_document
                       WHERE item_document.checklist_item_id = item.id
                   ) OR item.linked_document_id IS NOT NULL AS has_document
            FROM credit.loan_checklist_item AS item
            WHERE item.id = :item_id AND item.loan_application_id = :loan_id
            """,
            {"loan_id": loan_id, "item_id": item_id},
        )

    async def set_item_status(self, item_id: UUID, status: str) -> None:
        await self.session.execute(
            _text("UPDATE credit.loan_checklist_item SET requirement_status = :status, "
                  "updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
            {"id": item_id, "status": status},
        )

    async def log_check(
        self, *, loan_id: UUID, item_id: UUID, code: str, actor_id: UUID, result: str,
        old_status: str, new_status: str, note: str | None,
    ) -> UUID:
        log_id = uuid4()
        await self.session.execute(
            _text(
                "INSERT INTO credit.checklist_check_log (id, loan_application_id, checklist_item_id, "
                "requirement_code, actor_id, result, old_status, new_status, note) VALUES "
                "(:id, :loan_id, :item_id, :code, :actor_id, :result, :old_status, :new_status, :note)"
            ),
            {"id": log_id, "loan_id": loan_id, "item_id": item_id, "code": code, "actor_id": actor_id,
             "result": result, "old_status": old_status, "new_status": new_status, "note": note},
        )
        return log_id

    async def resolve_conflict(
        self, conflict_id: UUID, *, previous: UUID | None, chosen: UUID, reason: str, actor_id: UUID
    ) -> bool:
        result = await self.session.execute(
            _text(
                "UPDATE document.field_conflict SET chosen_field_id = :chosen, resolution_reason = :reason, "
                "resolved_by = :actor_id, resolved_at = CURRENT_TIMESTAMP "
                "WHERE id = :id AND chosen_field_id IS NOT DISTINCT FROM :previous"
            ),
            {"id": conflict_id, "chosen": chosen, "reason": reason, "actor_id": actor_id, "previous": previous},
        )
        return bool(result.rowcount)

    async def log_conflict(
        self, *, loan_id: UUID, conflict_id: UUID, code: str, actor_id: UUID, old_field_id: UUID | None,
        old_value: str | None, new_field_id: UUID, new_value: str | None, candidates: Any, reason: str,
    ) -> UUID:
        log_id = uuid4()
        await self.session.execute(
            _text(
                "INSERT INTO document.field_conflict_log (id, loan_application_id, conflict_id, conflict_code, "
                "actor_id, old_field_id, old_value_text, new_field_id, new_value_text, candidates, reason) "
                "VALUES (:id, :loan_id, :conflict_id, :code, :actor_id, :old_field_id, :old_value, "
                ":new_field_id, :new_value, CAST(:candidates AS jsonb), :reason)"
            ),
            {"id": log_id, "loan_id": loan_id, "conflict_id": conflict_id, "code": code, "actor_id": actor_id,
             "old_field_id": old_field_id, "old_value": old_value, "new_field_id": new_field_id,
             "new_value": new_value, "candidates": candidates, "reason": reason},
        )
        return log_id

    async def conflict_log(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """
            SELECT log.id AS log_id, log.conflict_id, log.conflict_code, actor.full_name AS actor_name,
                   log.old_value_text, log.new_value_text, log.reason, log.created_at AS at
            FROM document.field_conflict_log AS log
            LEFT JOIN identity.employee AS actor ON actor.id = log.actor_id
            WHERE log.loan_application_id = :loan_id ORDER BY log.created_at, log.id
            """,
            {"loan_id": loan_id},
        )

    async def check_log(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """
            SELECT log.id AS log_id, log.requirement_code, actor.full_name AS actor_name, log.result,
                   log.old_status, log.new_status, log.note, log.created_at AS at
            FROM credit.checklist_check_log AS log
            LEFT JOIN identity.employee AS actor ON actor.id = log.actor_id
            WHERE log.loan_application_id = :loan_id ORDER BY log.created_at, log.id
            """,
            {"loan_id": loan_id},
        )

