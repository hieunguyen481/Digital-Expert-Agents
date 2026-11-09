"""V042 + LoanAgentRunService trên Postgres thật: RLS của credit.loan_agent_run, quyền chạy theo người đang giữ hồ sơ."""

from __future__ import annotations

import time
from typing import Any
from uuid import uuid4

import asyncpg
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from tests.integration.seed_ids import CREDIT_APPRAISER, CREDIT_OFFICER, DOCUMENT_REVIEWER, RISK_HO
from tests.integration.test_workflow_service import Case, case, engine, mig, principal  # noqa: F401

from app.db.rls_context import rls_transaction
from app.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.repositories.loan_agent_run_repository import LoanAgentRunRepository
from app.services.loan_agent_run_service import LoanAgentRunService

pytestmark = pytest.mark.integration


class Engine:
    def __init__(self) -> None:
        self.state = "Planning"
        self.created: list[dict[str, Any]] = []

    async def create_case(self, request: dict[str, Any]) -> str:
        self.created.append(request)
        return f"it_{uuid4().hex[:12]}"

    async def run(self, case_id: str) -> None:
        return None

    async def get_case(self, case_id: str) -> dict[str, Any]:
        return {"state": self.state, "updated_at": time.time()}


async def call(db: AsyncEngine, who: Any, eng: Engine, fn: str) -> Any:
    async with AsyncSession(db) as session, rls_transaction(session, who.employee_id, who.branch_id, who.is_admin):
        service = LoanAgentRunService(LoanAgentRunRepository(session), eng)  # type: ignore[arg-type]
        try:
            return await getattr(service, fn)(who, call.loan)
        finally:
            await session.commit()


async def test_holder_runs_twice_old_run_kept_and_nonholders_denied(
    case: Case, mig: asyncpg.Connection, engine: AsyncEngine  # noqa: F811
) -> None:
    await case.create(status="DRAFT")
    call.loan = case.loan_id
    eng = Engine()
    officer = await principal(mig, CREDIT_OFFICER)
    risk = await principal(mig, RISK_HO)
    try:
        first = await call(engine, officer, eng, "start")
        assert first["can_run"] and len(first["runs"]) == 1
        assert eng.created[0]["business_id"] == str(case.customer_id) and eng.created[0]["amount"] == 5e9
        with pytest.raises(ConflictError):  # đang chạy
            await call(engine, officer, eng, "start")
        eng.state = "Pending Approval"
        second = await call(engine, officer, eng, "start")
        assert len(second["runs"]) == 2 and second["latest"]["case_id"] != second["runs"][1]["case_id"]
        assert first["runs"][0]["case_id"] == second["runs"][1]["case_id"]  # lượt cũ còn nguyên
        # Rủi ro không thấy hồ sơ DRAFT (RLS) nên không chạy được; nếu thấy thì phải 403 có lý do.
        with pytest.raises((NotFoundError, AuthorizationError)):
            await call(engine, risk, eng, "start")
    finally:
        await mig.execute("DELETE FROM credit.loan_agent_run WHERE loan_application_id = $1", case.loan_id)


async def test_appraiser_holding_step_can_run(case: Case, mig: asyncpg.Connection, engine: AsyncEngine) -> None:  # noqa: F811
    await case.create(status="APPRAISAL")
    await case.add_step("APPRAISAL", CREDIT_APPRAISER)
    call.loan = case.loan_id
    eng = Engine()
    try:
        overview = await call(engine, await principal(mig, CREDIT_APPRAISER), eng, "overview")
        assert overview["can_run"] is True
        officer = await call(engine, await principal(mig, CREDIT_OFFICER), eng, "overview")
        assert officer["can_run"] is False and officer["deny_reason"]
        with pytest.raises(AuthorizationError) as exc:  # QHKH không chạy ở bước thẩm định
            await call(engine, await principal(mig, CREDIT_OFFICER), eng, "start")
        assert exc.value.status_code == 403 and exc.value.message and eng.created == []
    finally:
        await mig.execute("DELETE FROM credit.loan_agent_run WHERE loan_application_id = $1", case.loan_id)


async def test_rls_blocks_insert_by_non_holder_and_forged_author(
    case: Case, mig: asyncpg.Connection, engine: AsyncEngine  # noqa: F811
) -> None:
    await case.create(status="DRAFT")
    sql = text("INSERT INTO credit.loan_agent_run (id, loan_application_id, case_id, started_by)"
               " VALUES (:id, :loan, :cid, :by)")
    try:
        for who, by in ((RISK_HO, RISK_HO), (DOCUMENT_REVIEWER, DOCUMENT_REVIEWER), (CREDIT_OFFICER, RISK_HO)):
            p = await principal(mig, who)
            async with AsyncSession(engine) as s:
                with pytest.raises(DBAPIError):
                    async with rls_transaction(s, p.employee_id, p.branch_id, p.is_admin):
                        await s.execute(sql, {"id": uuid4(), "loan": case.loan_id, "cid": f"x_{uuid4().hex}", "by": by})
        assert await mig.fetchval("SELECT count(*) FROM credit.loan_agent_run WHERE loan_application_id=$1",
                                  case.loan_id) == 0
        # Không sửa/xóa được lượt đã ghi (append-only).
        p = await principal(mig, CREDIT_OFFICER)
        async with AsyncSession(engine) as s, rls_transaction(s, p.employee_id, p.branch_id, p.is_admin):
            await s.execute(sql, {"id": uuid4(), "loan": case.loan_id, "cid": f"x_{uuid4().hex}", "by": CREDIT_OFFICER})
            with pytest.raises(DBAPIError):
                await s.execute(text("DELETE FROM credit.loan_agent_run"))
    finally:
        await mig.execute("DELETE FROM credit.loan_agent_run WHERE loan_application_id = $1", case.loan_id)
