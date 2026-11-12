"""Luot chay doi agent theo ho so vay (credit.loan_agent_run, V042). Moi truy van chay duoi RLS cua nguoi goi."""

from __future__ import annotations

from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, execute_returning, fetch_all, fetch_one


class LoanAgentRunRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def loan(self, loan_id: UUID) -> Record | None:
        return await fetch_one(
            self.session,
            """SELECT id, status, primary_customer_id, requested_amount, requested_term_months, loan_purpose
               FROM credit.loan_application WHERE id = :loan_id""",
            {"loan_id": loan_id},
        )

    async def latest_loan_id_for_customer(self, customer_id: UUID) -> UUID | None:
        """Hồ sơ vay mới nhất của khách trong phạm vi RLS của người gọi (không tính hồ sơ đã rút)."""
        row = await fetch_one(
            self.session,
            """SELECT id FROM credit.loan_application
               WHERE primary_customer_id = :customer_id AND status <> 'WITHDRAWN'
               ORDER BY created_at DESC, id LIMIT 1""",
            {"customer_id": customer_id},
        )
        return UUID(str(row["id"])) if row else None

    async def holds(self, loan_id: UUID) -> bool:
        """Co dang giu ho so khong: dung chinh ham RLS cua workflow (nguoi nhan buoc mo hoac QHKH khi DRAFT/bo sung)."""
        row = await fetch_one(
            self.session,
            "SELECT identity.can_write_loan(identity.current_employee_id(), :loan_id) AS ok",
            {"loan_id": loan_id},
        )
        return bool(row and row["ok"])

    async def first_collateral_id(self, loan_id: UUID) -> str | None:
        """Tài sản bảo đảm đầu tiên của hồ sơ (theo thời điểm tạo); None nếu hồ sơ không có."""
        row = await fetch_one(
            self.session,
            "SELECT id FROM credit.collateral WHERE loan_application_id = :loan_id ORDER BY created_at, id LIMIT 1",
            {"loan_id": loan_id},
        )
        return str(row["id"]) if row else None

    async def has_collateral(self, loan_id: UUID) -> bool:
        row = await fetch_one(
            self.session,
            "SELECT EXISTS (SELECT 1 FROM credit.collateral WHERE loan_application_id = :loan_id) AS ok",
            {"loan_id": loan_id},
        )
        return bool(row and row["ok"])

    async def lock(self, loan_id: UUID) -> None:
        """Khoa trong giao dich theo ho so de hai lan bam dong thoi khong cung tao luot."""
        await fetch_one(self.session, "SELECT pg_advisory_xact_lock(hashtextextended(:key, 0)) AS l",
                        {"key": f"loan_agent_run:{loan_id}"})

    async def list(self, loan_id: UUID) -> list[Record]:
        return await fetch_all(
            self.session,
            """SELECT run.id, run.case_id, run.created_at, run.started_by, emp.full_name AS started_by_name
               FROM credit.loan_agent_run AS run
               LEFT JOIN identity.employee AS emp ON emp.id = run.started_by
               WHERE run.loan_application_id = :loan_id ORDER BY run.created_at DESC, run.id DESC""",
            {"loan_id": loan_id},
        )

    async def insert(self, loan_id: UUID, case_id: str, started_by: UUID) -> UUID:
        run_id = uuid4()
        await execute_returning(
            self.session,
            """INSERT INTO credit.loan_agent_run (id, loan_application_id, case_id, started_by)
               VALUES (:id, :loan_id, :case_id, :by) RETURNING id""",
            {"id": run_id, "loan_id": loan_id, "case_id": case_id, "by": started_by},
        )
        return run_id
