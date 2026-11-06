"""Acceptance trên Postgres + Keycloak + backend thật (bỏ qua nếu thiếu biến môi trường).

Chạy trong container engine: cần DATABASE_URL, KC_TOKEN_URL, KC_CLIENT_SECRET, SEED_USER_PASSWORD.
Test `valid_confirmation` tiêu thụ một hồ sơ đang ở bước APPROVAL (chuyển bước thật), tự bỏ qua khi
không còn hồ sơ phù hợp.
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
    r = await api.post(f"/cases/{cid}/approve", headers=H(approver), json=confirm(loan(13)))
    assert r.status_code in (403, 404, 409, 422), r.text
    assert await _status(loan(13)) == "APPROVAL" and await _action(cid) == []


async def test_valid_confirmation_writes_real_action(api):
    n = None
    for cand in (14, 13, 18):
        if await _status(loan(cand)) == "APPROVAL":
            n = cand
            break
    if n is None:
        pytest.skip("các hồ sơ mẫu đã được duyệt ở lần chạy trước")
    approver = await kc_token("approver@example.local")
    cid = f"case_ok_{uuid.uuid4().hex[:8]}"
    await seed_pending(cust(n), cid)
    r = await api.post(f"/cases/{cid}/approve", headers=H(approver), json=confirm(loan(n)))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "completed"
    assert await _status(loan(n)) != "APPROVAL"
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
