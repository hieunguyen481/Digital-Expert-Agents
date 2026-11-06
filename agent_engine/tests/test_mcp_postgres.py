"""MCP trên Postgres thật (cần DATABASE_URL, stack bank-ai-workbench, V028/V029 đã áp dụng)."""
import os

import asyncpg
import pytest

from common import identity
from mcp_core_banking import server

pytestmark = pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="cần DATABASE_URL")

VINA = "56000000-0000-4000-8000-000000000001"
OFFICER = "10000000-0000-4000-8000-000000000001"   # đọc được VinaNova
NO_ACCESS = "10000000-0000-4000-8000-000000000002"  # không đọc được VinaNova


class _Req:
    def __init__(self, headers): self.headers = headers


class _RC:
    def __init__(self, headers): self.request = _Req(headers)


class Ctx:
    def __init__(self, headers): self.request_context = _RC(headers)


async def ctx_for(emp: str | None, tamper: bool = False) -> Ctx:
    if emp is None:
        return Ctx(identity.headers_for())  # chỉ token dịch vụ, không danh tính
    con = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        branch = await con.fetchval("SELECT branch_id FROM identity.employee WHERE id=$1::uuid", emp)
    finally:
        await con.close()
    h = identity.headers_for(identity.Identity(emp, str(branch), False))
    if tamper:
        h[identity.H_SIGNATURE] = "0" * 64
    return Ctx(h)


@pytest.fixture(autouse=True)
async def fresh_pool():
    server._pool = None
    yield
    if server._pool:
        await server._pool.close()
        server._pool = None


async def test_missing_identity_denied():
    r = await server.get_business(VINA, await ctx_for(None))
    assert "từ chối" in r["error"]


async def test_forged_signature_denied():
    r = await server.get_business(VINA, await ctx_for(OFFICER, tamper=True))
    assert "từ chối" in r["error"]


async def test_employee_without_access_denied_on_every_read():
    ctx = await ctx_for(NO_ACCESS)
    for fn in (server.get_business, server.get_financials, server.get_collateral,
               server.check_blacklist, server.get_cic_status, server.get_existing_loans):
        r = await fn(VINA, ctx)
        r = r[0] if isinstance(r, list) else r
        assert "từ chối" in r.get("error", ""), fn.__name__


async def test_authorised_employee_reads_vinanova_seed():
    ctx = await ctx_for(OFFICER)
    biz = await server.get_business(VINA, ctx)
    assert biz["name"] == "Công ty Cổ phần Bao bì VinaNova"
    fin = await server.get_financials(VINA, ctx)
    assert [f["year"] for f in fin] == [2023, 2024, 2025]
    assert (fin[0]["revenue"], fin[0]["ebitda"]) == (520e9, 62e9)
    assert fin[0]["total_debt"] is None and "total_debt" in fin[0]["missing_fields"]
    last = fin[-1]
    assert (last["revenue"], last["ebitda"]) == (705e9, 98e9)
    assert last["data_label"] == "DU_LIEU_MAU"
    dscr = last["reported_ratios"]["dscr"]
    assert dscr["value"] == 1.34 and dscr["status"] == "NEEDS_VERIFICATION"
    assert any("1.445" in w for w in last["warnings"])
    assert any("1.888" in w for w in last["warnings"])
    cic = await server.get_cic_status(VINA, ctx)
    assert cic["cic_group"] == 1 and cic["total_outstanding"] == 98e9
    col = await server.get_collateral(VINA, ctx)
    assert col[0]["valuation"] == 145e9 and col[0]["legal_status"] == "clear"
    loans = await server.get_existing_loans(VINA, ctx)   # seed VinaNova: 2 nghĩa vụ mẫu có nhãn
    assert sorted(l["outstanding"] for l in loans) == [42e9, 56e9]
    assert all("(mau)" in l["lender"] for l in loans)
    bl = await server.check_blacklist(VINA, ctx)
    assert bl["hit"] is False and bl["screened"] is True   # seed VinaNova có KYC mẫu


async def test_agent_cannot_commit_or_disburse():
    """Agent chỉ tạo bản nháp không hiệu lực; commit/giải ngân bị từ chối và ghi audit."""
    ctx = await ctx_for(OFFICER)
    draft = await server.create_loan_draft("c", VINA, 1.0, 12, ctx)
    assert draft["status"] == "DRAFT_PROPOSAL" and draft["effective"] is False
    for r in (await server.commit_loan("k", "c", VINA, 1.0, 12, ctx),
              await server.create_disbursement_schedule("L1", ctx)):
        assert "error" in r
    rows = await server.get_audit_log(await ctx_for(OFFICER), 10)
    assert {"commit_loan", "create_disbursement_schedule"} <= {r["tool"] for r in rows if r["outcome"] == "denied"}


async def test_audit_persisted_with_employee_and_no_values():
    await server.get_business(VINA, await ctx_for(OFFICER))
    rows = await server.get_audit_log(await ctx_for(OFFICER), 5)
    mine = [r for r in rows if r["tool"] == "get_business" and r["employee_id"] == OFFICER]
    assert mine and mine[0]["arg_keys"] == ["business_id"] and mine[0]["outcome"] == "ok"
    assert VINA not in str(mine[0]["arg_keys"])
