"""Queue and badge queries for "Việc của tôi" (run under the caller's RLS)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, fetch_all, fetch_one

# "Chờ bạn": bước chính đang mở giao cho mình và không tạm dừng SLA, cộng bước chờ bổ sung
# (PENDING_INFO / RISK_PENDING_INFO) tính cho QHKH của khách (người phải tải lên).
# Dùng chung với test seed (backend/tests/integration/test_sme_seed.py).
MINE_STEP_PREDICATE = """
  step.completed_at IS NULL
  AND (
      (
          step.step_code NOT IN ('PENDING_INFO', 'RISK_PENDING_INFO')
          AND step.assignee_employee_id = :employee_id
          AND (step.paused_at IS NULL OR step.resumed_at IS NOT NULL)
      )
      OR (
          step.step_code IN ('PENDING_INFO', 'RISK_PENDING_INFO')
          AND EXISTS (
              SELECT 1 FROM customer.customer AS c
              WHERE c.id = loan.primary_customer_id
                AND c.relationship_manager_id = :employee_id
          )
      )
  )
"""

BADGE_SQL = f"""
SELECT count(*)
FROM credit.case_step AS step
JOIN credit.loan_application AS loan ON loan.id = step.loan_application_id
WHERE (CAST(:loan_ids AS uuid[]) IS NULL OR step.loan_application_id = ANY(CAST(:loan_ids AS uuid[])))
  AND {MINE_STEP_PREDICATE}
"""  # noqa: S608 - chỉ nối hằng số cột, không có dữ liệu người dùng

# bank_app co quyen SELECT theo cot tren case_step (khong gom ``reason``), nen khong dung ``*``.
_STEP_COLS = (
    "id, loan_application_id, step_code, assignee_employee_id, "
    "received_at, due_at, paused_at, remaining_workdays, resumed_at, completed_at, result"
)


def _cols(alias: str) -> str:
    return ", ".join(f"{alias}.{c.strip()}" for c in _STEP_COLS.split(","))


_TERMINAL = "('APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'WITHDRAWN')"

# Cột hiển thị chung cho hàng chờ; {step_source} cung cấp bảng ``step`` + cờ ``mine``.
_ITEM_SELECT = """
SELECT loan.id AS loan_application_id, loan.application_number::text AS application_number,
       party.display_name AS customer_name, loan.requested_amount, loan.status,
       step.step_code, step.received_at AS step_received_at, step.due_at,
       (step.paused_at IS NOT NULL AND step.resumed_at IS NULL) AS paused,
       step.remaining_workdays,
       now() AS now,
       ((step.due_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ctx.today) AS due_is_today,
       credit.workdays_between(ctx.today, (step.due_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
           AS workdays_to_due,
       ((step.received_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= ctx.anchor) AS is_new,
       (
           step.step_code = 'RM_REWORK'
           OR (
               step.step_code = 'APPRAISAL'
               AND COALESCE((
                   SELECT prev.result = 'RETURNED'
                   FROM credit.case_step AS prev
                   WHERE prev.loan_application_id = step.loan_application_id
                     AND prev.completed_at IS NOT NULL
                     AND prev.completed_at <= step.received_at
                   ORDER BY prev.completed_at DESC LIMIT 1
               ), FALSE)
           )
       ) AS is_return,
       (SELECT count(*) FROM credit.case_flag AS f
         WHERE f.loan_application_id = loan.id AND f.status = 'OPEN') AS open_flags,
       (SELECT count(*) FROM credit.case_flag AS f
         WHERE f.loan_application_id = loan.id AND f.status = 'OPEN'
           AND f.severity = 'HIGH') AS high_flags,
       (SELECT count(*) FROM document.extracted_field AS ef
          JOIN document.document_version AS dv ON dv.id = ef.document_version_id AND dv.is_current
          JOIN document.document_link AS dl ON dl.document_id = dv.document_id
         WHERE dl.entity_type = 'LOAN_APPLICATION' AND dl.entity_id = loan.id
           AND ef.verification_status IN ('NEEDS_VERIFICATION', 'AI_PROPOSED')) AS fields_to_confirm
"""

_CTX = """
ctx AS (
    SELECT today,
           (SELECT max(today - g) FROM generate_series(0, 7) AS g
             WHERE credit.is_workday(today - g)) AS anchor
    FROM (SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today) AS t
)
"""

QUEUE_SQL = f"""
WITH {_CTX},
mine_step AS (
    SELECT DISTINCT ON (step.loan_application_id) {_cols('step')}
    FROM credit.case_step AS step
    JOIN credit.loan_application AS loan ON loan.id = step.loan_application_id
    WHERE {MINE_STEP_PREDICATE}
    ORDER BY step.loan_application_id, step.received_at DESC
),
main_step AS (
    SELECT DISTINCT ON (step.loan_application_id) {_cols('step')}
    FROM credit.case_step AS step
    WHERE step.completed_at IS NULL
      AND step.step_code NOT IN ('PENDING_INFO', 'RISK_PENDING_INFO')
    ORDER BY step.loan_application_id, step.received_at DESC
),
follow AS (
    SELECT loan.id
    FROM credit.loan_application AS loan
    LEFT JOIN customer.customer AS cu ON cu.id = loan.primary_customer_id
    WHERE loan.status NOT IN {_TERMINAL}
      AND loan.id NOT IN (SELECT loan_application_id FROM mine_step)
      AND (
          cu.relationship_manager_id = :employee_id
          OR EXISTS (
              SELECT 1 FROM credit.case_step AS h
              WHERE h.loan_application_id = loan.id AND h.assignee_employee_id = :employee_id
          )
          OR (
              loan.status IN ('RISK_REVIEW', 'RISK_PENDING_INFO', 'RISK_HOLD_FRAUD')
              AND EXISTS (
                  SELECT 1 FROM identity.employee_scope AS sc
                  WHERE sc.scope_type = 'LOAN_APPLICATION' AND sc.scope_id = loan.id
                    AND sc.employee_id = :employee_id AND sc.permission_code = 'loan:read'
                    AND sc.valid_from <= CURRENT_TIMESTAMP
                    AND (sc.valid_until IS NULL OR sc.valid_until > CURRENT_TIMESTAMP)
              )
              AND EXISTS (
                  SELECT 1 FROM credit.case_flag AS f
                  WHERE f.loan_application_id = loan.id AND f.status = 'OPEN'
              )
          )
      )
    ORDER BY loan.updated_at DESC
    LIMIT 10
),
picked AS (
    SELECT loan_application_id, id AS step_id, TRUE AS mine FROM mine_step
    UNION ALL
    SELECT m.loan_application_id, m.id, FALSE
    FROM main_step AS m WHERE m.loan_application_id IN (SELECT id FROM follow)
)
{_ITEM_SELECT}, picked.mine
FROM picked
JOIN credit.case_step AS step ON step.id = picked.step_id
JOIN credit.loan_application AS loan ON loan.id = picked.loan_application_id
JOIN credit.loan_party AS lp
  ON lp.loan_application_id = loan.id AND lp.party_role = 'PRIMARY_BORROWER'
JOIN customer.party AS party ON party.id = lp.party_id
CROSS JOIN ctx
"""  # noqa: S608 - chỉ nối hằng số cột, không có dữ liệu người dùng

AUDIT_SQL = f"""
WITH {_CTX},
recent AS (
    SELECT loan.id,
           GREATEST(
               (SELECT max(d.decision_at) FROM credit.loan_decision AS d
                 WHERE d.loan_application_id = loan.id),
               (SELECT max(COALESCE(s.completed_at, s.received_at)) FROM credit.case_step AS s
                 WHERE s.loan_application_id = loan.id)
           ) AS last_at
    FROM credit.loan_application AS loan
    ORDER BY 2 DESC NULLS LAST
    LIMIT 10
)
{_ITEM_SELECT}
FROM recent
JOIN credit.loan_application AS loan ON loan.id = recent.id
JOIN LATERAL (
    SELECT {_cols('s')} FROM credit.case_step AS s
    WHERE s.loan_application_id = loan.id
    ORDER BY (s.completed_at IS NULL) DESC, s.received_at DESC LIMIT 1
) AS step ON TRUE
JOIN credit.loan_party AS lp
  ON lp.loan_application_id = loan.id AND lp.party_role = 'PRIMARY_BORROWER'
JOIN customer.party AS party ON party.id = lp.party_id
CROSS JOIN ctx
ORDER BY recent.last_at DESC NULLS LAST
"""  # noqa: S608 - chỉ nối hằng số cột, không có dữ liệu người dùng


class WorkItemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def badge(self, employee_id: UUID) -> int:
        row = await fetch_one(
            self.session, BADGE_SQL, {"employee_id": employee_id, "loan_ids": None}
        )
        return int(row["count"]) if row else 0

    async def queue(self, employee_id: UUID) -> list[Record]:
        return await fetch_all(self.session, QUEUE_SQL, {"employee_id": employee_id})

    async def audit_recent(self) -> list[Record]:
        return await fetch_all(self.session, AUDIT_SQL)


def asyncpg_badge_sql() -> str:
    """BADGE_SQL with asyncpg positional binds ($1 = employee, $2 = loan ids)."""
    return BADGE_SQL.replace(":employee_id", "$1").replace(":loan_ids", "$2")


__all__ = ["BADGE_SQL", "WorkItemRepository", "asyncpg_badge_sql"]
