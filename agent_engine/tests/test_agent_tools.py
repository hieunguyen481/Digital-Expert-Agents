"""Cờ agent_tools: giới hạn công cụ theo chuyên môn, không lặp, gọi bù có nhãn, kết quả null, tắt cờ về đường cũ."""
import asyncio

from common import agent_tools, config, events, facts, llm, mcp_client, trace_ctx

REQ = {"business_id": "b1", "amount": 10e9, "has_collateral": False}
DATA = {"get_business": {"account_number": "1", "legal_rep_name": "A"}, "check_blacklist": {"hit": False, "screened": True},
        "get_cic_status": {"cic_group": 1, "report_date": "2026-11-09"}, "get_collateral": [],
        "get_financials": [{"year": 2025, "ebitda": 30e9, "total_debt": 50e9, "equity": 20e9, "revenue": 90e9}],
        "get_existing_loans": [{"outstanding": 4e9}], "get_annual_inflow": {"verified_annual_inflow": 80e9}}


def _setup(monkeypatch, llm_calls):
    mcp, ev = [], []

    async def call_tool(name, args=None, initiated_by="agent"):
        mcp.append((name, initiated_by, trace_ctx.current()[1]))
        return DATA[name]

    async def emit(case, agent, etype, payload=None):
        ev.append((agent, etype, payload))

    async def tool_loop(system, user, tools, submit_tool="submit_verdict", **kw):
        seen["tools"] = [t.name for t in tools]
        for n in llm_calls:  # LLM gọi (có thể lặp) các công cụ theo kịch bản
            await next(t for t in tools if t.name == n).fn()
        return {}

    seen: dict = {}
    monkeypatch.setattr(mcp_client, "call_tool", call_tool)
    monkeypatch.setattr(events, "emit", emit)
    monkeypatch.setattr(llm, "tool_loop", tool_loop)
    agent_tools._boards.clear()
    trace_ctx.bind("c1", "credit")
    return mcp, ev, seen


def test_scope_limit_and_no_repeat(monkeypatch):
    mcp, ev, seen = _setup(monkeypatch, ["get_financials", "get_financials", "get_existing_loans", "get_annual_inflow"])
    out = asyncio.run(agent_tools.select_and_gather("credit", REQ, "c1"))
    assert set(seen["tools"]) == {"get_financials", "get_existing_loans", "get_annual_inflow", agent_tools.DONE}
    assert [m[0] for m in mcp] == ["get_financials", "get_existing_loans", "get_annual_inflow"]  # không lặp
    assert all(m[1] == "agent" and m[2] == "credit" for m in mcp)
    assert out["_meta"]["compensated"] == []
    # bị challenge chạy lại: không gọi MCP thêm
    asyncio.run(agent_tools.select_and_gather("credit", REQ, "c1"))
    assert len(mcp) == 3


def test_compensation_is_labelled_and_collateral_conditional(monkeypatch):
    mcp, ev, _ = _setup(monkeypatch, ["check_blacklist"])
    trace_ctx.bind("c1", "compliance")
    out = asyncio.run(agent_tools.select_and_gather("compliance", REQ, "c1"))
    assert out["_meta"]["compensated"] == ["business", "cic"]  # TSĐB không khai -> không bắt buộc
    comp = [m for m in mcp if m[1] == "system_compensation"]
    assert [m[0] for m in comp] == ["get_business", "get_cic_status"] and all(m[2] == "orchestrator" for m in comp)
    assert trace_ctx.current()[1] == "compliance"  # ngữ cảnh trả lại đúng agent
    assert any(e[1] == "shared_board_updated" for e in ev)
    mcp.clear()
    asyncio.run(agent_tools.select_and_gather("compliance", {**REQ, "has_collateral": True}, "c2", check_collateral=False))
    assert "get_collateral" in [m[0] for m in mcp]  # khai có TSĐB -> bắt buộc, LLM không gọi thì bù


def test_null_results_do_not_crash(monkeypatch):
    _setup(monkeypatch, [])

    async def boom(*a, **k):
        raise RuntimeError("down")
    monkeypatch.setattr(mcp_client, "call_tool", boom)
    out = asyncio.run(agent_tools.select_and_gather("credit", REQ, "c3"))
    assert out["financials"] == [] and out["inflow"] is None
    f = agent_tools.scoped_facts("credit", out, REQ)
    assert f["blockers"]  # thiếu BCTC / CIC là chặn thật, không phải lỗi


def test_merge_fills_missing_for_validation(monkeypatch):
    mcp, ev, _ = _setup(monkeypatch, [])
    shared = asyncio.run(agent_tools.merge_for_validation("c4", REQ, [{"financials": DATA["get_financials"], "loans": []}]))
    names = {m[0] for m in mcp}
    assert "get_financials" not in names and "get_cic_status" in names
    assert all(m[1] == "system_compensation" for m in mcp)
    assert shared["leverage"] and any(e[1] == "facts_recomputed" for e in ev)


def test_flag_off_returns_to_old_path(monkeypatch):
    monkeypatch.setattr(config, "OPT_FLAGS", frozenset(config.OPT_DEFAULT) - {"agent_tools"})
    monkeypatch.setattr(config, "LLM_MODE", "llm")
    assert not agent_tools.enabled()
    monkeypatch.setattr(config, "OPT_FLAGS", frozenset(config.OPT_DEFAULT))
    assert agent_tools.enabled()
    monkeypatch.setattr(config, "LLM_MODE", "rules")
    assert not agent_tools.enabled()
