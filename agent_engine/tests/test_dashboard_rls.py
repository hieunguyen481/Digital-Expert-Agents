"""Danh sách và thống kê cho dashboard chạy dưới RLS: mỗi vai trò chỉ thấy case được phép.

Cần Postgres đã migrate + seed: DATABASE_URL (bank_app) và TEST_ADMIN_DATABASE_URL (bank_migrator, chỉ để dựng
dữ liệu thử). Thiếu biến thì bỏ qua. Dữ liệu thử có tiền tố `case_rlstest_` và được xóa sau test.
"""
import os
import time
import uuid

import asyncpg
import pytest

from common import identity
from gateway import db

pytestmark = pytest.mark.skipif(
    not all(os.getenv(k) for k in ("DATABASE_URL", "TEST_ADMIN_DATABASE_URL")),
    reason="cần Postgres đã seed")

VINA = "56000000-0000-4000-8000-000000000001"
BRANCH_HN = "30000000-0000-4000-8000-000000000002"
OFFICER = identity.Identity("10000000-0000-4000-8000-000000000001", BRANCH_HN)       # QHKH phụ trách
OUTSIDER = identity.Identity("10000000-0000-4000-8000-000000000005",
                             "30000000-0000-4000-8000-000000000001")                 # người duyệt, không đọc được khách


@pytest.fixture
async def seeded_case():
    case_id = f"case_rlstest_{uuid.uuid4().hex[:8]}"
    now = time.time()
    con = await asyncpg.connect(os.environ["TEST_ADMIN_DATABASE_URL"])
    try:
        await con.execute(
            "INSERT INTO agent.case_run(case_id, customer_id, submitted_by, state, payload, created_at, updated_at)"
            " VALUES ($1,$2,$3,'Pending Approval',$4::jsonb,$5,$6)",
            case_id, uuid.UUID(VINA), uuid.UUID(OFFICER.employee_id),
            '{"request":{"amount":1000,"purpose":"X","term_months":6}}', now, now + 12)
        for agent, etype, payload in [
            ("credit", "tool_call", '{"tool":"get_financials","outcome":"ok","duration_ms":5}'),
            ("compliance", "tool_call", '{"tool":"get_cic_status","outcome":"denied","duration_ms":7}'),
            ("planner", "llm_usage", '{"model":"m","prompt_tokens":10,"completion_tokens":5,"cost_usd":0.002}'),
            ("validation", "a2a_challenge", '{"to":"credit","payload":{"reason":"r"}}'),
        ]:
            await con.execute(
                "INSERT INTO agent.case_event(ts, case_id, agent, type, payload) VALUES ($1,$2,$3,$4,$5::jsonb)",
                now, case_id, agent, etype, payload)
        yield case_id
    finally:
        await con.execute("DELETE FROM agent.case_event WHERE case_id=$1", case_id)
        await con.execute("DELETE FROM agent.case_run WHERE case_id=$1", case_id)
        await con.close()
        await db.close()


async def test_list_and_stats_follow_rls(seeded_case):
    identity.set_current(OFFICER)
    mine = await db.list_cases(200)
    row = next(c for c in mine if c["case_id"] == seeded_case)
    assert (row["tool_calls"], row["llm_calls"], row["cost_usd"]) == (2, 1, 0.002)
    assert row["request"]["amount"] == 1000

    stats = await db.case_stats()
    assert stats["tool_calls"] >= 2 and stats["challenges"] >= 1 and stats["cost_usd"] >= 0.002
    assert any(t["tool"] == "get_cic_status" and t["failed"] >= 1 for t in stats["tools"])

    identity.set_current(OUTSIDER)
    assert all(c["case_id"] != seeded_case for c in await db.list_cases(200))
    other = await db.case_stats()
    assert seeded_case not in {c["case_id"] for c in await db.list_cases(200)}
    assert other["cases"] <= stats["cases"] - 1


async def test_step_assignee_sees_case_of_loan_they_hold():
    """Q-M: người được giao bước của hồ sơ đọc được lượt chạy agent của khách đó dù không đọc được khách."""
    case_id = f"case_rlstest_{uuid.uuid4().hex[:8]}"
    loan_id, now = uuid.uuid4(), time.time()
    con = await asyncpg.connect(os.environ["TEST_ADMIN_DATABASE_URL"])
    try:
        product = await con.fetchval("SELECT id FROM credit.loan_product LIMIT 1")
        await con.execute(
            "INSERT INTO agent.case_run(case_id, customer_id, submitted_by, state, payload, created_at, updated_at)"
            " VALUES ($1,$2,$3,'Pending Approval','{}'::jsonb,$4,$4)",
            case_id, uuid.UUID(VINA), uuid.UUID(OFFICER.employee_id), now)
        await con.execute(
            "INSERT INTO credit.loan_application (id, application_number, primary_customer_id, product_id,"
            " requested_amount, currency, requested_term_months, loan_purpose, status, created_at, created_by,"
            " updated_at) VALUES ($1,$2,$3,$4,1000,'VND',12,'WORKING_CAPITAL','RISK_REVIEW',now(),$5,now())",
            loan_id, f"RLS-{loan_id}", uuid.UUID(VINA), product, uuid.UUID(OFFICER.employee_id))
        identity.set_current(OUTSIDER)
        assert all(c["case_id"] != case_id for c in await db.list_cases(500))
        await con.execute(
            "INSERT INTO credit.case_step (id, loan_application_id, step_code, assignee_employee_id, received_at,"
            " due_at, created_by, created_at) VALUES ($1,$2,'RISK_REVIEW',$3,now(),now() + interval '2 day',$4,now())",
            uuid.uuid4(), loan_id, uuid.UUID(OUTSIDER.employee_id), uuid.UUID(OFFICER.employee_id))
        assert any(c["case_id"] == case_id for c in await db.list_cases(500))
    finally:
        await con.execute("DELETE FROM agent.case_run WHERE case_id=$1", case_id)
        await con.execute("DELETE FROM credit.case_step WHERE loan_application_id=$1", loan_id)
        await con.execute("DELETE FROM credit.loan_application WHERE id=$1", loan_id)
        await con.close()
        await db.close()
