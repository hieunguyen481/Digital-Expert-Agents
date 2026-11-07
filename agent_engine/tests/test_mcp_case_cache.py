"""MCP dùng lại kết quả đọc trong cùng một case; case khác hoặc lỗi thì truy vấn lại (không cần Postgres)."""
import asyncio

import pytest

from common import identity
from mcp_core_banking import server as S


class _Req:
    def __init__(self, h):
        self.request_context = type("R", (), {"request": type("Q", (), {"headers": h})()})()


def _ctx(case):
    ident = identity.Identity("10000000-0000-4000-8000-000000000001", "30000000-0000-4000-8000-000000000002")
    h = identity.headers_for(ident)
    if case:
        h["x-engine-case"] = case
    return _Req(h)


@pytest.fixture(autouse=True)
def _patch(monkeypatch):
    S._CASE_CACHE.clear()
    calls, audits = [], []

    async def fake_run(tool, ctx, args, fn, customer_arg="business_id"):
        calls.append(tool)
        await asyncio.sleep(0.01)
        return {"error": "từ chối: x"} if args.get("bad") else {"v": len(calls)}

    async def fake_audit(tool, emp, cust, keys, outcome, detail=None):
        audits.append(outcome)

    monkeypatch.setattr(S, "_run_tool", fake_run)
    monkeypatch.setattr(S, "_audit", fake_audit)
    return calls, audits


def test_same_case_runs_once_even_concurrently(_patch):
    calls, audits = _patch
    a = {"business_id": "b1"}

    async def go():
        return await asyncio.gather(*[S.run_tool("get_business", _ctx("case1"), a, None) for _ in range(3)])
    res = asyncio.run(go())
    assert calls == ["get_business"] and res[0] == res[1] == res[2]
    assert audits == ["cache_hit", "cache_hit"]


def test_other_case_or_no_case_or_error_not_shared(_patch):
    calls, _ = _patch
    a = {"business_id": "b1"}

    async def go():
        await S.run_tool("get_business", _ctx("c1"), a, None)
        await S.run_tool("get_business", _ctx("c2"), a, None)
        await S.run_tool("get_business", _ctx(None), a, None)
        await S.run_tool("get_business", _ctx(None), a, None)
        bad = {"business_id": "b1", "bad": 1}
        await S.run_tool("get_cic_status", _ctx("c1"), bad, None)
        await S.run_tool("get_cic_status", _ctx("c1"), bad, None)
    asyncio.run(go())
    assert len(calls) == 6
