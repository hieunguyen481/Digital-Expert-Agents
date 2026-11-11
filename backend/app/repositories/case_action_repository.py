"""Dữ liệu cho các hành động trên hồ sơ (lát 11): cờ, ý kiến Rủi ro, nâng cấp phê duyệt. Chạy trong phiên RLS."""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, fetch_all, fetch_one


class CaseActionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def loan(self, loan_id: UUID) -> Record | None:
        return await fetch_one(
            self.session, "SELECT id, status, version FROM credit.loan_application WHERE id = :id", {"id": loan_id}
        )

    async def supplement_deadline(self, loan_id: UUID) -> Record | None:
        """Han bo sung dang mo (Q11) va da gia han chua; doc buoc qua ham SQL vi bank_app khong doc case_step."""
        return await fetch_one(
            self.session,
            """
            SELECT step.due_at,
                   EXISTS (SELECT 1 FROM credit.deadline_extension AS ext
                           WHERE ext.loan_application_id = :id AND ext.case_step_id = step.id) AS extended
            FROM credit.list_case_steps(:id) AS step
            WHERE step.completed_at IS NULL AND step.step_code IN ('RM_REWORK', 'PENDING_INFO')
            ORDER BY step.received_at DESC LIMIT 1
            """,
            {"id": loan_id},
        )

    async def can_write(self, employee_id: UUID, loan_id: UUID) -> bool:
        row = await fetch_one(
            self.session, "SELECT identity.can_write_loan(:e, :l) AS ok", {"e": employee_id, "l": loan_id}
        )
        return bool(row and row["ok"])

    async def is_excluded(self, employee_id: UUID, loan_id: UUID) -> bool:
        row = await fetch_one(
            self.session, "SELECT credit.is_excluded(:e, :l) AS ex", {"e": employee_id, "l": loan_id}
        )
        return bool(row and row["ex"])

    async def flag(self, loan_id: UUID, flag_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            "SELECT id, code, severity, status, title FROM credit.case_flag "
            "WHERE id = :f AND loan_application_id = :l",
            {"f": flag_id, "l": loan_id},
        )

    async def set_flag_handled(self, flag_id: UUID, note: str) -> None:
        await fetch_one(
            self.session,
            "UPDATE credit.case_flag SET status = 'HANDLED', handling_note = :n, updated_at = CURRENT_TIMESTAMP "
            "WHERE id = :f RETURNING id",
            {"f": flag_id, "n": note},
        )

    async def set_flag_concluded(self, flag_id: UUID, loan_id: UUID, caller: UUID, conclusion: str, reason: str) -> None:
        await fetch_one(
            self.session,
            "SELECT credit.conclude_case_flag(:l, :f, :c, :k, :r) IS NULL AS done",
            {"l": loan_id, "f": flag_id, "c": caller, "k": conclusion, "r": reason},
        )

    async def early_warn(self, loan_id: UUID, flag_id: UUID, caller: UUID, note: str | None) -> UUID:
        row = await fetch_one(
            self.session,
            "SELECT credit.early_warn_compliance(:l, :f, :c, :n) AS recipient",
            {"l": loan_id, "f": flag_id, "c": caller, "n": note},
        )
        return UUID(str(row["recipient"])) if row else caller

    async def memo_revision(self, loan_id: UUID) -> int | None:
        row = await fetch_one(
            self.session,
            "SELECT max(revision) AS revision FROM credit.appraisal_memo_version WHERE loan_application_id = :l",
            {"l": loan_id},
        )
        return None if row is None or row["revision"] is None else int(row["revision"])

    async def opinions(self, loan_id: UUID, revision: int) -> list[Record]:
        return await fetch_all(
            self.session,
            """SELECT opinion.id, opinion.kind, opinion.content, opinion.memo_revision, opinion.created_at,
                      author.full_name AS author_name
               FROM credit.risk_opinion AS opinion JOIN identity.employee AS author ON author.id = opinion.author_id
               WHERE opinion.loan_application_id = :l AND opinion.memo_revision = :r ORDER BY opinion.created_at""",
            {"l": loan_id, "r": revision},
        )

    async def add_opinion(self, loan_id: UUID, kind: str, revision: int, content: str, author: UUID) -> UUID:
        new_id = uuid4()
        await fetch_one(
            self.session,
            "INSERT INTO credit.risk_opinion (id, loan_application_id, kind, memo_revision, content, author_id) "
            "VALUES (:id, :l, :k, :r, :c, :a) RETURNING id",
            {"id": new_id, "l": loan_id, "k": kind, "r": revision, "c": content, "a": author},
        )
        return new_id

    async def pending_exceptions(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """SELECT exc.id, exc.checklist_code,
                      (SELECT req.requirement_description FROM policy.checklist_rule_requirement AS req
                        WHERE req.requirement_code = exc.checklist_code LIMIT 1) AS checklist_label, exc.kind, exc.reason, exc.proposed_at, proposer.full_name AS proposed_by_name
               FROM credit.case_exception AS exc JOIN identity.employee AS proposer ON proposer.id = exc.proposed_by
               WHERE exc.loan_application_id = :l AND exc.decision IS NULL AND exc.withdrawn_at IS NULL ORDER BY exc.proposed_at, exc.id""",
            {"l": loan_id},
        )

    async def required_tier(self, loan_id: UUID) -> int:
        row = await fetch_one(self.session, "SELECT credit.required_tier(:l) AS t", {"l": loan_id})
        if row is None or row["t"] is None:
            raise LookupError("Required approval tier could not be computed")
        return int(row["t"])

    async def current_tier(self, loan_id: UUID) -> int | None:
        row = await fetch_one(
            self.session,
            "SELECT tier FROM credit.approval_tier_event WHERE loan_application_id = :l "
            "ORDER BY created_at DESC, id LIMIT 1",
            {"l": loan_id},
        )
        return None if row is None else int(row["tier"])

    async def add_tier_upgrade(self, loan_id: UUID, tier: int, reason: str, by: UUID, title: str) -> None:
        await fetch_one(
            self.session,
            "INSERT INTO credit.approval_tier_event (id, loan_application_id, tier, kind, reason, created_by) "
            "VALUES (:id, :l, :t, 'UPGRADE', :r, :b) RETURNING id",
            {"id": uuid4(), "l": loan_id, "t": tier, "r": reason, "b": by},
        )
        await fetch_one(
            self.session,
            """INSERT INTO credit.case_flag (id, loan_application_id, code, severity, title, blocks_submission,
                                             status, source, created_by, created_at, updated_at)
               VALUES (:id, :l, 'TIER_UPGRADE', 'MEDIUM', :title, FALSE, 'OPEN', 'APPRAISAL', :b,
                       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id""",
            {"id": uuid4(), "l": loan_id, "title": title, "b": by},
        )

    async def add_agent_flag(self, loan_id: UUID, source: str, severity: str, title: str, by: UUID) -> tuple[UUID, bool]:
        """Cờ do người xác nhận đề xuất của agent; cùng `source` thì không tạo thêm (idempotent). Trả (id, mới?)."""
        existing = await fetch_one(
            self.session,
            "SELECT id FROM credit.case_flag WHERE loan_application_id = :l AND source = :s",
            {"l": loan_id, "s": source},
        )
        if existing is not None:
            return existing["id"], False
        flag_id = uuid4()
        await fetch_one(
            self.session,
            """INSERT INTO credit.case_flag (id, loan_application_id, code, severity, title, blocks_submission,
                                             status, source, created_by, created_at, updated_at)
               VALUES (:id, :l, 'agent_proposed', :sev, :title, FALSE, 'OPEN', :src, :b,
                       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id""",
            {"id": flag_id, "l": loan_id, "sev": severity, "title": title, "src": source, "b": by},
        )
        return flag_id, True

    async def add_disbursement_condition(self, loan_id: UUID, source: str, text: str, by: UUID) -> tuple[UUID, bool]:
        existing = await fetch_one(
            self.session,
            "SELECT id FROM credit.pre_disbursement_condition WHERE loan_application_id = :l AND source = :s",
            {"l": loan_id, "s": source},
        )
        if existing is not None:
            return existing["id"], False
        cond_id = uuid4()
        await fetch_one(
            self.session,
            "INSERT INTO credit.pre_disbursement_condition (id, loan_application_id, condition_text, source, created_by) "
            "VALUES (:id, :l, :t, :s, :b) RETURNING id",
            {"id": cond_id, "l": loan_id, "t": text, "s": source, "b": by},
        )
        return cond_id, True

    async def disbursement_conditions(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            "SELECT id, condition_text, source, created_at FROM credit.pre_disbursement_condition "
            "WHERE loan_application_id = :l ORDER BY created_at",
            {"l": loan_id},
        )
