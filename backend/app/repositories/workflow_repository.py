"""Du lieu cho WorkflowService: buoc xu ly, dinh tuyen, so lieu cong va chuyen buoc.

Moi truy van chay trong phien RLS cua nhan vien dang thao tac. Doi trang thai di
qua mot ham ``credit.apply_transition`` (V025, SECURITY DEFINER) de dong buoc cu
va mo buoc moi nguyen tu; ham tu kiem tra lai vai tro, quyen ghi va phien ban.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions import ConflictError
from app.repositories.base import Record, execute_returning, fetch_all, fetch_one
from app.workflow.gates import CarriedFlag, ChecklistFact, FlagFact, GateFacts
from app.workflow.routing import ApproverCandidate
from app.workflow.sla import TZ

VERSION_CONFLICT_SQLSTATE = "WF409"


def _sqlstate(error: DBAPIError) -> str | None:
    orig: Any = error.orig
    for candidate in (orig, getattr(orig, "__cause__", None)):
        code = getattr(candidate, "sqlstate", None) or getattr(candidate, "pgcode", None)
        if code:
            return str(code)
    return None


class WorkflowRepository:
    """Cai dat ``routing.ApproverDirectory`` va ``gates.GateRepository``."""

    def __init__(self, session: AsyncSession, *, cic_outage: bool = False) -> None:
        self.session = session
        # F5: chi nguoi van hanh bat co nay khi he thong CIC gian doan.
        self.cic_outage = cic_outage

    # -- thoi gian ------------------------------------------------------------
    async def db_now(self) -> datetime:
        """Thoi diem giao dich; trung CURRENT_TIMESTAMP trong apply_transition."""
        row = await fetch_one(self.session, "SELECT CURRENT_TIMESTAMP AS now")
        if row is None:
            raise RuntimeError("Database clock unavailable")
        now: datetime = row["now"]
        return now

    async def holidays(self) -> frozenset[date]:
        rows = await fetch_all(self.session, "SELECT day FROM credit.holiday")
        return frozenset(row["day"] for row in rows)

    async def sla_workdays(self, step_code: str) -> int:
        row = await fetch_one(
            self.session,
            "SELECT workdays FROM credit.sla_parameter WHERE step_code = :code",
            {"code": step_code},
        )
        if row is None:
            raise LookupError(f"No SLA parameter for {step_code}")
        return int(row["workdays"])

    # -- ho so va buoc ----------------------------------------------------------
    async def get_loan(self, loan_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            """
            SELECT la.id, la.status, la.version, la.primary_customer_id, la.approval_tier,
                   la.requested_amount, customer_record.relationship_manager_id
            FROM credit.loan_application AS la
            LEFT JOIN customer.customer AS customer_record
              ON customer_record.id = la.primary_customer_id
            WHERE la.id = :loan_id
            """,
            {"loan_id": loan_id},
        )

    async def list_steps(self, loan_id: UUID) -> list[Record]:
        # Q-M (V027): bank_app khong doc truc tiep case_step.reason; ham SQL an ly
        # do buoc gian lan / AML voi nguoi khong co vai tro Tuan thu, Rui ro, Phe
        # duyet, Kiem toan (reason = NULL, reason_restricted = TRUE).
        return await fetch_all(
            self.session,
            "SELECT * FROM credit.list_case_steps(:loan_id)",
            {"loan_id": loan_id},
        )

    async def open_steps(self, loan_id: UUID) -> list[Record]:
        return [row for row in await self.list_steps(loan_id) if row["completed_at"] is None]

    async def last_step(
        self, loan_id: UUID, step_code: str, *, result: str | None = None
    ) -> Record | None:
        rows = [
            row
            for row in await self.list_steps(loan_id)
            if row["step_code"] == step_code and (result is None or row["result"] == result)
        ]
        return rows[-1] if rows else None

    async def pick_role_assignee(self, loan_id: UUID, step_code: str, role: str) -> UUID | None:
        row = await fetch_one(
            self.session,
            "SELECT credit.pick_role_assignee(:loan_id, :step_code, :role) AS employee_id",
            {"loan_id": loan_id, "step_code": step_code, "role": role},
        )
        return row["employee_id"] if row else None

    # -- routing.ApproverDirectory ----------------------------------------------
    async def list_approver_candidates(self, tier: int) -> Sequence[ApproverCandidate]:
        rows = await fetch_all(
            self.session,
            """
            SELECT employee_id, tier, unit_scope, branch_id, open_step_count
            FROM credit.approver_candidates(CAST(:tier AS smallint))
            """,
            {"tier": tier},
        )
        return [
            ApproverCandidate(
                employee_id=row["employee_id"],
                tier=int(row["tier"]),
                unit_scope=str(row["unit_scope"]),
                branch_id=row["branch_id"],
                open_step_count=int(row["open_step_count"]),
            )
            for row in rows
        ]

    async def customer_branch_id(self, loan_id: UUID) -> UUID:
        row = await fetch_one(
            self.session,
            """
            SELECT customer_record.home_branch_id
            FROM credit.loan_application AS la
            JOIN customer.customer AS customer_record ON customer_record.id = la.primary_customer_id
            WHERE la.id = :loan_id
            """,
            {"loan_id": loan_id},
        )
        if row is None:
            raise LookupError("Loan application was not found or is outside the authorized scope")
        return UUID(str(row["home_branch_id"]))

    async def is_excluded(self, employee_id: UUID, loan_id: UUID) -> bool:
        row = await fetch_one(
            self.session,
            "SELECT credit.is_excluded(:employee_id, :loan_id) AS excluded",
            {"employee_id": employee_id, "loan_id": loan_id},
        )
        return bool(row and row["excluded"])

    async def required_tier(self, loan_id: UUID) -> int:
        row = await fetch_one(
            self.session, "SELECT credit.required_tier(:loan_id) AS tier", {"loan_id": loan_id}
        )
        if row is None or row["tier"] is None:
            raise LookupError("Required approval tier could not be computed")
        return int(row["tier"])

    # -- quyet dinh ---------------------------------------------------------------
    async def insert_decision(
        self,
        loan_id: UUID,
        *,
        decision_type: str,
        decision_maker_id: UUID,
        rationale: str,
        approved_amount: Decimal | None = None,
        approved_term_months: int | None = None,
        conditions: Sequence[Mapping[str, Any]] = (),
        approval_request_id: UUID | None = None,
        is_override: bool = False,
        override_reason: str | None = None,
    ) -> Record:
        """credit.loan_decision chi them; ghi TRUOC apply_transition khi buoc con mo
        (policy insert can can_write_loan)."""
        row = await execute_returning(
            self.session,
            """
            INSERT INTO credit.loan_decision (
                id, loan_application_id, approval_request_id, decision_type,
                approved_amount, approved_term_months, conditions, rationale,
                decision_maker_id, decision_at, is_override, override_reason,
                created_at, decision_source
            )
            VALUES (
                :id, :loan_id, :approval_request_id, :decision_type,
                :approved_amount, :approved_term_months, CAST(:conditions AS jsonb), :rationale,
                :decision_maker_id, CURRENT_TIMESTAMP, :is_override, :override_reason,
                CURRENT_TIMESTAMP, 'INDIVIDUAL'
            )
            RETURNING *
            """,
            {
                "id": uuid4(),
                "loan_id": loan_id,
                "approval_request_id": approval_request_id,
                "decision_type": decision_type,
                "approved_amount": approved_amount,
                "approved_term_months": approved_term_months,
                "conditions": list(conditions),
                "rationale": rationale,
                "decision_maker_id": decision_maker_id,
                "is_override": is_override,
                "override_reason": override_reason,
            },
        )
        if row is None:
            raise RuntimeError("Loan decision insert returned no row")
        return row

    async def latest_decision(self, loan_id: UUID) -> Record | None:
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
            {"loan_id": loan_id},
        )

    async def persist_carried_flags(
        self, loan_id: UUID, *, gate: str, flags: Sequence[CarriedFlag], created_by: UUID
    ) -> None:
        """Luu co chuyen kem (OPEN, khong chan trinh); bo qua ma da co tren ho so.

        Ghi truoc apply_transition trong cung giao dich, khi nguoi chuyen buoc con
        quyen ghi ho so (policy case_flag_insert_policy = can_write_loan).
        """
        statement = text(
            """
            INSERT INTO credit.case_flag (
                id, loan_application_id, code, severity, title, blocks_submission,
                status, source, created_by, created_at, updated_at
            )
            SELECT :id, :loan_id, :code, :severity, :title, FALSE,
                   'OPEN', :source, :created_by, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (
                SELECT 1 FROM credit.case_flag AS existing
                WHERE existing.loan_application_id = :loan_id AND existing.code = :code
            )
            """
        )
        for flag in flags:
            await self.session.execute(
                statement,
                {
                    "id": uuid4(),
                    "loan_id": loan_id,
                    "code": flag.code,
                    "severity": flag.severity,
                    "title": flag.title,
                    "source": f"GATE:{gate}",
                    "created_by": created_by,
                },
            )

    # -- chuyen buoc ---------------------------------------------------------------
    async def apply_transition(
        self,
        loan_id: UUID,
        *,
        action: str,
        expected_version: int,
        from_status: str,
        to_status: str,
        reason: str | None,
        new_assignee: UUID | None,
        new_due_at: datetime | None,
        remaining_workdays: int | None,
        approval_tier: int | None,
        withdraw_kind: str | None,
    ) -> Record:
        try:
            row = await fetch_one(
                self.session,
                """
                SELECT out_status, out_version, out_step_code, out_assignee, out_due_at
                FROM credit.apply_transition(
                    :loan_id, :action, :expected_version, :from_status, :to_status,
                    :reason, :new_assignee, :new_due_at, :remaining_workdays,
                    CAST(:approval_tier AS smallint), :withdraw_kind
                )
                """,
                {
                    "loan_id": loan_id,
                    "action": action,
                    "expected_version": expected_version,
                    "from_status": from_status,
                    "to_status": to_status,
                    "reason": reason,
                    "new_assignee": new_assignee,
                    "new_due_at": new_due_at,
                    "remaining_workdays": remaining_workdays,
                    "approval_tier": approval_tier,
                    "withdraw_kind": withdraw_kind,
                },
            )
        except DBAPIError as error:
            state = _sqlstate(error)
            if state == VERSION_CONFLICT_SQLSTATE:
                raise ConflictError(
                    "VERSION_CONFLICT",
                    "The loan application was changed by another request.",
                    {"loan_application_id": str(loan_id)},
                ) from error
            if state == "42501":
                raise PermissionError(f"Database refused workflow action {action}") from error
            if state in {"22023", "55000"}:
                raise ValueError(f"Database rejected workflow action {action}") from error
            raise
        if row is None:
            raise RuntimeError("apply_transition returned no row")
        return row

    # -- gates.GateRepository -----------------------------------------------------
    async def gate_facts(self, loan_id: UUID) -> GateFacts:
        today = (await self.db_now()).astimezone(TZ).date()
        params = {"loan_id": loan_id, "today": today}
        summary = await fetch_one(self.session, _GATE_SUMMARY_SQL, params)
        if summary is None:
            raise LookupError("Loan application was not found or is outside the authorized scope")
        checklist = await fetch_all(self.session, _CHECKLIST_SQL, params)
        flags = await fetch_all(
            self.session,
            """
            SELECT flag.code, flag.status, flag.compliance_conclusion, flag.blocks_submission
            FROM credit.loan_application AS la
            JOIN credit.case_flag AS flag ON flag.loan_application_id = la.id
            WHERE la.id = :loan_id
            ORDER BY flag.created_at, flag.code
            """,
            {"loan_id": loan_id},
        )
        exposure = await fetch_one(
            self.session,
            "SELECT credit.total_credit_exposure(:loan_id) AS total",
            {"loan_id": loan_id},
        )
        return GateFacts(
            today=today,
            checklist=tuple(
                ChecklistFact(
                    code=str(row["code"]),
                    document_type=row["document_type"],
                    mandatory=bool(row["mandatory"]),
                    status=str(row["status"]),
                    has_document=bool(row["has_document"]),
                    expired=bool(row["has_document"]) and not bool(row["has_valid_document"]),
                    has_exception=bool(row["has_exception"]),
                )
                for row in checklist
            ),
            cic_valid_until=summary["cic_valid_until"],
            cic_outage=self.cic_outage,
            consent_valid=bool(summary["consent_valid"]),
            ai_proposed_fields=int(summary["ai_proposed_fields"]),
            needs_verification_fields=int(summary["needs_verification_fields"]),
            unresolved_conflicts=int(summary["unresolved_conflicts"]),
            proposed_related_parties=int(summary["proposed_related_parties"]),
            not_in_group_parties=int(summary["not_in_group_parties"]),
            lease_unset=int(summary["lease_unset"]),
            lease_annual=int(summary["lease_annual"]),
            lease_one_time_without_proof=int(summary["lease_one_time_without_proof"]),
            total_credit_exposure=exposure["total"] if exposure else None,
            has_audited_fs=bool(summary["has_audited_fs"]),
            flags=tuple(
                FlagFact(
                    str(f["code"]),
                    str(f["status"]),
                    f["compliance_conclusion"],
                    bool(f["blocks_submission"]),
                )
                for f in flags
            ),
        )


# Tai lieu cua ho so: lien ket LOAN_APPLICATION, tai lieu gan muc danh muc (N-N
# hoac linked_document_id).
_LOAN_DOCUMENTS_CTE = """
loan_documents AS (
    SELECT link.document_id
    FROM document.document_link AS link
    WHERE link.entity_type = 'LOAN_APPLICATION' AND link.entity_id = :loan_id
    UNION
    SELECT item_document.document_id
    FROM credit.loan_checklist_item AS item
    JOIN credit.checklist_item_document AS item_document ON item_document.checklist_item_id = item.id
    WHERE item.loan_application_id = :loan_id
    UNION
    SELECT item.linked_document_id
    FROM credit.loan_checklist_item AS item
    WHERE item.loan_application_id = :loan_id AND item.linked_document_id IS NOT NULL
)
"""

_GATE_SUMMARY_SQL = f"""
WITH loan AS (
    SELECT la.id, la.primary_customer_id
    FROM credit.loan_application AS la
    WHERE la.id = :loan_id
),
{_LOAN_DOCUMENTS_CTE},
loan_fields AS (
    SELECT field.verification_status
    FROM document.extracted_field AS field
    JOIN document.document_version AS version_record
      ON version_record.id = field.document_version_id
    WHERE version_record.is_current
      AND version_record.document_id IN (SELECT document_id FROM loan_documents)
)
SELECT
    (
        SELECT COALESCE(
                   report.valid_until,
                   (report.requested_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + 29
               )
        FROM banking.credit_report AS report
        WHERE report.customer_id = loan.primary_customer_id
        ORDER BY report.requested_at DESC
        LIMIT 1
    ) AS cic_valid_until,
    EXISTS (
        SELECT 1
        FROM banking.cic_consent AS consent
        WHERE consent.customer_id = loan.primary_customer_id
          AND consent.confirmed_by IS NOT NULL
          AND (consent.valid_until IS NULL OR consent.valid_until >= :today)
    ) AS consent_valid,
    (SELECT count(*) FROM loan_fields WHERE verification_status = 'AI_PROPOSED') AS ai_proposed_fields,
    (SELECT count(*) FROM loan_fields WHERE verification_status = 'NEEDS_VERIFICATION')
        AS needs_verification_fields,
    (
        SELECT count(*) FROM document.field_conflict AS conflict
        WHERE conflict.loan_application_id = loan.id AND conflict.chosen_field_id IS NULL
    ) AS unresolved_conflicts,
    (
        SELECT count(*) FROM credit.case_related_party AS related
        WHERE related.loan_application_id = loan.id AND related.status = 'PROPOSED'
    ) AS proposed_related_parties,
    (
        SELECT count(*) FROM credit.case_related_party AS related
        WHERE related.loan_application_id = loan.id AND related.status = 'NOT_IN_GROUP'
    ) AS not_in_group_parties,
    (
        SELECT count(*) FROM credit.collateral AS collateral
        WHERE collateral.loan_application_id = loan.id
          AND collateral.on_leased_land AND collateral.land_lease_payment IS NULL
    ) AS lease_unset,
    (
        SELECT count(*) FROM credit.collateral AS collateral
        WHERE collateral.loan_application_id = loan.id
          AND collateral.on_leased_land AND collateral.land_lease_payment = 'ANNUAL'
    ) AS lease_annual,
    (
        SELECT count(*) FROM credit.collateral AS collateral
        WHERE collateral.loan_application_id = loan.id
          AND collateral.on_leased_land AND collateral.land_lease_payment = 'ONE_TIME'
          AND collateral.land_lease_proof_document_id IS NULL
    ) AS lease_one_time_without_proof,
    EXISTS (
        SELECT 1 FROM document.document AS doc
        WHERE doc.id IN (SELECT document_id FROM loan_documents)
          AND doc.document_type = 'FINANCIAL_STATEMENT'
          AND doc.document_subtype = 'AUDITED'
          AND doc.counts_for_checklist
    ) AS has_audited_fs
FROM loan
"""  # noqa: S608 - khong noi tham so nguoi dung

_CHECKLIST_SQL = """
WITH item_documents AS (
    SELECT item.id AS item_id, doc.*
    FROM credit.loan_checklist_item AS item
    JOIN document.document AS doc
      ON doc.id = item.linked_document_id
      OR doc.id IN (
          SELECT item_document.document_id
          FROM credit.checklist_item_document AS item_document
          WHERE item_document.checklist_item_id = item.id
      )
    WHERE item.loan_application_id = :loan_id
      AND doc.counts_for_checklist
)
SELECT item.requirement_code AS code,
       item.document_type,
       item.mandatory_level = 'MANDATORY' AS mandatory,
       item.requirement_status AS status,
       EXISTS (SELECT 1 FROM item_documents AS d WHERE d.item_id = item.id) AS has_document,
       EXISTS (
           SELECT 1 FROM item_documents AS d
           WHERE d.item_id = item.id
             AND (d.valid_until IS NULL OR d.valid_until >= :today)
             AND NOT (
                 d.document_type IN ('BANK_STATEMENT', 'DEBT_CONFIRMATION')
                 AND d.issued_date IS NOT NULL
                 AND d.issued_date + 29 < :today
             )
       ) AS has_valid_document,
       EXISTS (
           SELECT 1 FROM credit.case_exception AS exception_record
           WHERE exception_record.loan_application_id = item.loan_application_id
             AND exception_record.kind = 'DOCUMENT'
             AND exception_record.checklist_code = item.requirement_code::text
             AND (exception_record.decision IS NULL OR exception_record.decision = 'ACCEPTED')
       ) AS has_exception
FROM credit.loan_application AS la
JOIN credit.loan_checklist_item AS item ON item.loan_application_id = la.id
WHERE la.id = :loan_id
ORDER BY item.requirement_code, item.id
"""
