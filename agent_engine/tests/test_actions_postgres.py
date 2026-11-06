"""Acceptance trên Postgres + Keycloak + backend thật (bỏ qua nếu thiếu biến môi trường).

Chạy trong container engine: cần DATABASE_URL, KC_TOKEN_URL, KC_CLIENT_SECRET, SEED_USER_PASSWORD.
Test `valid_confirmation` tự dựng một hồ sơ TEST ở bước APPROVAL (cần TEST_ADMIN_DATABASE_URL, role
bank_migrator) rồi duyệt qua API thật; thiếu biến thì bỏ qua.
"""
import os
import uuid

import httpx
import pytest

from common import config, identity
from gateway import db
from gateway.main import app

pytestmark = pytest.mark.skipif(
    not all(os.getenv(k) for k in ("DATABASE_URL", "KC_TOKEN_URL", "KC_CLIENT_SECRET",
                                   "SEED_USER_PASSWORD")), reason="cần Postgres + Keycloak thật")

BRANCH_HN = "30000000-0000-4000-8000-000000000002"
OFFICER = "10000000-0000-4000-8000-000000000001"
VINA = "56000000-0000-4000-8000-000000000001"


def loan(n: int) -> str:
    return f"75000000-0000-4000-8000-{n:012d}"


def cust(n: int) -> str:
    return f"56000000-0000-4000-8000-{n:012d}"


async def kc_token(email: str) -> str:
    async with httpx.AsyncClient() as c:
        r = await c.post(os.environ["KC_TOKEN_URL"], data={
            "grant_type": "password", "client_id": "bank-ai-backend",
            "client_secret": os.environ["KC_CLIENT_SECRET"], "username": email,
            "password": os.environ["SEED_USER_PASSWORD"]})
    r.raise_for_status()
    return r.json()["access_token"]


def H(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture
async def api():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),
                                 base_url="http://engine") as c:
        yield c
    await db.close()


async def seed_pending(customer: str, case_id: str) -> None:
    """Dựng case ở Pending Approval như sau một lượt phân tích (gói trình duyệt đã có)."""
    identity.set_current(identity.Identity(OFFICER, BRANCH_HN))
    await db.create_case(case_id, {"request": {"business_id": customer, "amount": 1e9,
                                               "term_months": 12, "purpose": "test"}})
    await db.update_case(case_id, state="Pending Approval",
                         package={"proposed_limit": 1e9, "plan_version": 1,
                                  "required_approver_level": "branch_director"})
    identity.set_current(None)


def confirm(loan_id: str) -> dict:
    return {"loan_application_id": loan_id, "approver_level": "branch_director",
            "decision_type": "APPROVED", "reason": "xác nhận trong test",
            "approved_amount": 1e9, "approved_term_months": 12}


async def test_agent_cannot_act_without_human_confirmation(api):
    officer = await kc_token("credit.officer@example.local")
    r = await api.post("/cases/x/approve", json=confirm(loan(14)))
    assert r.status_code == 401                                   # không token -> không xác nhận
    r = await api.post("/cases/x/approve", json=confirm(loan(14)), headers=H(officer))
    assert r.status_code == 403                                   # chuyên viên không có quyền duyệt
    from gateway import actions
    assert actions.ALLOWED_ACTIONS == frozenset({"decide"})         # không có giải ngân / commit


async def test_trace_not_readable_by_unauthorized(api):
    officer = await kc_token("credit.officer@example.local")
    r = await api.post("/cases", headers=H(officer), json={"request": {
        "business_id": VINA, "amount": 1e9, "term_months": 12, "purpose": "test"}})
    assert r.status_code == 200, r.text
    cid = r.json()["case_id"]
    assert (await api.get(f"/cases/{cid}/events", headers=H(officer))).status_code == 200
    # nhân viên ngoài phạm vi khách hàng không đọc được trace, không chạy được case
    stranger = await kc_token("compliance@example.local")
    assert (await api.get(f"/cases/{cid}/events", headers=H(stranger))).status_code == 404
    assert (await api.post(f"/cases/{cid}/run", headers=H(stranger))).status_code == 404
    assert (await api.get(f"/cases/{cid}", headers=H(stranger))).status_code == 404
    # khách hàng ngoài phạm vi: không tạo được case
    r = await api.post("/cases", headers=H(stranger), json={"request": {
        "business_id": VINA, "amount": 1e9, "term_months": 12, "purpose": "test"}})
    assert r.status_code == 403


async def test_e8_violation_refused_by_backend_and_nothing_written():
    """approver@ bị E8 loại khỏi hồ sơ 15: backend từ chối `decide`, trạng thái không đổi."""
    from gateway import actions
    approver = await kc_token("approver@example.local")
    with pytest.raises(actions.ActionRefused) as e:
        await actions.execute_decision(approver, {"id": loan(15), "version": 1},
                                       decision_type="APPROVED", amount=1e9, term_months=12,
                                       conditions=[], reason="thử vi phạm E8")
    assert e.value.status in (403, 404, 409, 422)
    assert await _status(loan(15)) == "APPROVAL"


async def test_confirmation_for_other_customers_loan_refused(api):
    """Xác nhận gắn vào hồ sơ vay của khách khác với case -> bị từ chối, không ghi gì."""
    approver = await kc_token("approver@example.local")
    cid = f"case_x_{uuid.uuid4().hex[:8]}"
    await seed_pending(cust(14), cid)
    before = await _status(loan(13))     # có thể đã bị test valid_confirmation tiêu thụ ở lượt chạy trước
    r = await api.post(f"/cases/{cid}/approve", headers=H(approver), json=confirm(loan(13)))
    assert r.status_code in (403, 404, 409, 422), r.text
    assert await _status(loan(13)) == before and await _action(cid) == []


async def _fresh_approval_loan() -> tuple[str, str]:
    """Nhân bản hồ sơ mẫu 13 thành hồ sơ TEST đang ở bước APPROVAL (cần TEST_ADMIN_DATABASE_URL).

    Dùng role chủ schema (bank_migrator) chỉ để dựng dữ liệu thử; việc duyệt vẫn đi qua API thật.
    """
    import asyncpg
    n = 900000 + uuid.uuid4().int % 99999
    new_loan = loan(n)
    con = await asyncpg.connect(os.environ["TEST_ADMIN_DATABASE_URL"])
    try:
        async with con.transaction():
            await con.execute(
                """INSERT INTO credit.loan_application
                   (id, application_number, primary_customer_id, product_id, requested_amount, currency,
                    requested_term_months, loan_purpose, interest_rate_assumption, repayment_method, status,
                    assigned_employee_id, submitted_at, created_at, created_by, updated_at, updated_by,
                    version, approval_tier)
                   SELECT $2::uuid, 'HSV-TEST-' || $3, primary_customer_id, product_id, requested_amount,
                          currency, requested_term_months, loan_purpose, interest_rate_assumption,
                          repayment_method, 'APPROVAL', assigned_employee_id, submitted_at, created_at,
                          created_by, updated_at, updated_by, 1, approval_tier
                   FROM credit.loan_application WHERE id = $1::uuid""", loan(13), new_loan, str(n))
            await con.execute(
                """INSERT INTO credit.case_step
                   (id, loan_application_id, step_code, assignee_employee_id, received_at, due_at,
                    completed_at, result, reason, created_by, created_at)
                   SELECT gen_random_uuid(), $2::uuid, step_code, assignee_employee_id, received_at, due_at,
                          CASE WHEN step_code='APPROVAL' THEN NULL ELSE completed_at END,
                          CASE WHEN step_code='APPROVAL' THEN NULL ELSE result END,
                          CASE WHEN step_code='APPROVAL' THEN NULL ELSE reason END, created_by, created_at
                   FROM credit.case_step WHERE loan_application_id = $1::uuid""", loan(13), new_loan)
            customer = await con.fetchval(
                "SELECT primary_customer_id::text FROM credit.loan_application WHERE id=$1::uuid", new_loan)
    finally:
        await con.close()
    return new_loan, customer


async def _purge_test_loans() -> None:
    """Xoá hồ sơ HSV-TEST-* (và bản ghi con) để test không làm đổi hồ sơ mẫu / số đếm của DB dùng chung.

    loan_decision là append-only (trigger); chủ schema tắt trigger trong chính giao dịch này, chỉ cho
    các hồ sơ TEST do test này tự dựng."""
    import asyncpg
    con = await asyncpg.connect(os.environ["TEST_ADMIN_DATABASE_URL"])
    try:
        async with con.transaction():
            ids = [r[0] for r in await con.fetch(
                "SELECT id FROM credit.loan_application WHERE application_number LIKE 'HSV-TEST-%'")]
            if not ids:
                return
            kids = await con.fetch(
                """SELECT c.conrelid::regclass::text AS tbl, a.attname AS col FROM pg_constraint c
                   JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
                   WHERE c.confrelid='credit.loan_application'::regclass AND c.contype='f'""")
            await con.execute("ALTER TABLE credit.loan_decision DISABLE TRIGGER trg_loan_decision_append_only")
            for k in kids:
                if k["tbl"] == "ai.conversation":
                    await con.execute(f"UPDATE {k['tbl']} SET {k['col']}=NULL WHERE {k['col']} = ANY($1::uuid[])", ids)
                else:
                    await con.execute(f"DELETE FROM {k['tbl']} WHERE {k['col']} = ANY($1::uuid[])", ids)
            await con.execute("DELETE FROM credit.loan_application WHERE id = ANY($1::uuid[])", ids)
            await con.execute("ALTER TABLE credit.loan_decision ENABLE TRIGGER trg_loan_decision_append_only")
    finally:
        await con.close()


async def test_valid_confirmation_writes_real_action(api):
    if not os.getenv("TEST_ADMIN_DATABASE_URL"):
        pytest.skip("cần TEST_ADMIN_DATABASE_URL để dựng hồ sơ thử ở bước APPROVAL")
    await _purge_test_loans()
    new_loan, customer = await _fresh_approval_loan()
    try:
        await _confirm_and_check(api, new_loan, customer)
    finally:
        await _purge_test_loans()


async def _confirm_and_check(api, new_loan: str, customer: str) -> None:
    assert await _status(new_loan) == "APPROVAL"
    approver = await kc_token("approver@example.local")
    cid = f"case_ok_{uuid.uuid4().hex[:8]}"
    await seed_pending(customer, cid)
    r = await api.post(f"/cases/{cid}/approve", headers=H(approver), json=confirm(new_loan))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "completed"
    assert await _status(new_loan) != "APPROVAL"
    rows = await _action(cid)
    assert rows and rows[0]["outcome"] == "EXECUTED"


async def _status(loan_id: str) -> str:
    t = await kc_token("auditor@example.local")      # chỉ đọc
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{config.BACKEND_URL}/api/v1/loan-applications/{loan_id}", headers=H(t))
    r.raise_for_status()
    return r.json()["status"]


async def _action(case_id: str) -> list:
    async with db.tx(identity.Identity(OFFICER, BRANCH_HN)) as con:
        return [dict(r) for r in await con.fetch(
            "SELECT outcome FROM agent.action_log WHERE case_id=$1 AND outcome='EXECUTED'", case_id)]
