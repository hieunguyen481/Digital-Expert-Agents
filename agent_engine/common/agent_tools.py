"""Cờ `agent_tools`: chuyên gia TỰ chọn và gọi công cụ thuộc chuyên môn, kết quả ghi lên bảng chung của case.

Hai pha trong DAG: (1) mỗi chuyên gia chạy một lượt chọn công cụ (llm.tool_loop, chỉ thấy công cụ của `_SCOPES`),
công cụ bắt buộc mà LLM bỏ sót thì hệ thống gọi bù (đánh dấu rõ trong trace); rồi tính lại số trên phần đã gom
và kết luận. (2) Orchestrator hợp các bảng, gọi bù phần còn thiếu cho Validation. `build` và cổng giữ nguyên.
Mỗi công cụ tối đa một lần mỗi case (bảng của case nằm trong tiến trình agent, dùng lại khi bị challenge).
"""
from __future__ import annotations

import asyncio
from typing import Any

from . import config, events, facts as facts_mod, llm, mcp_client, trace_ctx

DONE = "da_du_du_lieu"
_TOOL_BY_KEY = facts_mod._TOOLS  # khóa bảng chung -> tên công cụ MCP
_DESC = {"business": "Hồ sơ pháp nhân (KYB)", "blacklist": "Tra danh sách đen/trừng phạt AML", "cic": "Tra CIC",
         "collateral": "Hồ sơ tài sản bảo đảm", "financials": "Báo cáo tài chính các năm", "loans": "Khoản vay hiện hữu",
         "inflow": "Tiền về tài khoản 12 tháng đã xác minh"}
_boards: dict[tuple[str, str], dict[str, Any]] = {}  # (case, scope) -> kết quả công cụ đã gọi


def enabled() -> bool:
    return config.opt("agent_tools") and config.LLM_MODE == "llm"


def mandatory(scope: str, request: dict, check_collateral: bool = False) -> list[str]:
    """Công cụ bắt buộc của chuyên môn: cả phạm vi, trừ TSĐB khi hồ sơ không khai và không được yêu cầu kiểm."""
    need_col = bool(request.get("has_collateral")) or check_collateral
    return [k for k in facts_mod._SCOPES[scope] if k != "collateral" or need_col]


def _norm(key: str, v: Any) -> Any:
    return (v if isinstance(v, list) else []) if key in ("financials", "loans", "collateral") else v


async def _call(key: str, bid: str, *, system: bool) -> Any:
    try:
        return _norm(key, await mcp_client.call_tool(_TOOL_BY_KEY[key], {"business_id": bid},
                                                     initiated_by="system_compensation" if system else "agent"))
    except Exception:  # noqa: BLE001 - lỗi từng công cụ: để trống, không chặn hồ sơ (như gather)
        return _norm(key, None)


async def select_and_gather(scope: str, request: dict, case_id: str, *, check_collateral: bool = False) -> dict:
    """Chuyên gia chọn công cụ; trả về {khóa: kết quả} của phạm vi, kèm `_meta` (called/compensated)."""
    bid = request["business_id"]
    board = _boards.setdefault((case_id, scope), {})
    called: list[str] = []
    locks = {k: asyncio.Lock() for k in facts_mod._SCOPES[scope]}

    def make(key: str) -> llm.ToolDef:
        async def fn() -> Any:
            async with locks[key]:
                if key in board:  # không lặp: dùng lại kết quả đã có, không gọi MCP lần nữa
                    return board[key]
                board[key] = await _call(key, bid, system=False)
                called.append(key)
                return board[key]
        return llm.ToolDef(_TOOL_BY_KEY[key], _DESC[key], {"type": "object", "properties": {}}, fn)

    keys = list(facts_mod._SCOPES[scope])
    tools = [make(k) for k in keys] + [llm.ToolDef(
        DONE, "Gọi khi đã đủ dữ kiện cần cho chuyên môn của bạn", {"type": "object", "properties": {}}, None)]  # type: ignore[arg-type]
    if any(k not in board for k in keys):
        await llm.tool_loop(
            system="Bạn là chuyên gia của ngân hàng chuẩn bị thẩm định hồ sơ vay doanh nghiệp. Chọn các công cụ tra cứu "
                   "THUỘC CHUYÊN MÔN của bạn và cần để kết luận; gọi tất cả cùng một lượt, mỗi công cụ tối đa một lần. "
                   f"Khi đã đủ dữ kiện thì gọi {DONE}.",
            user=f"Đề nghị vay: {request}. Yêu cầu kiểm tra TSĐB: {check_collateral}.",
            tools=tools, submit_tool=DONE, max_iterations=4)
    missing = [k for k in mandatory(scope, request, check_collateral) if k not in board]
    comp = []
    if missing:
        ctx = trace_ctx.current()
        trace_ctx.bind(case_id, "orchestrator")  # gọi bù là việc của hệ thống, không gán cho quyết định của agent
        try:
            for k in missing:
                board[k] = await _call(k, bid, system=True)
                comp.append(k)
        finally:
            if ctx:
                trace_ctx.bind(*ctx)
    await events.emit(case_id, scope, "shared_board_updated",
                      {"scope": scope, "called_by_agent": called, "compensated": comp,
                       "mandatory": mandatory(scope, request, check_collateral), "board_keys": sorted(board)})
    out = dict(board)
    out["_meta"] = {"called": called, "compensated": comp}
    return out


def scoped_facts(scope: str, board: dict, request: dict) -> dict:
    """Số tính lại (hàm thuần `build`) trên phần bảng chuyên gia có; phần ngoài phạm vi để trống."""
    raw = {k: _norm(k, board.get(k)) for k in facts_mod._TOOLS}
    return facts_mod.build(raw, request)


async def merge_for_validation(case_id: str, request: dict, boards: list[dict]) -> dict:
    """Pha 2: hợp các bảng của chuyên gia, gọi bù phần còn thiếu (agent = orchestrator), dựng bảng chung đầy đủ."""
    raw: dict[str, Any] = {}
    for b in boards:
        raw.update({k: v for k, v in b.items() if k in _TOOL_BY_KEY})
    missing = [k for k in _TOOL_BY_KEY if k not in raw]
    trace_ctx.bind(case_id, "orchestrator")
    for k in missing:
        raw[k] = await _call(k, request["business_id"], system=True)
    for k in ("financials", "loans", "collateral"):
        raw[k] = _norm(k, raw.get(k))
    shared = facts_mod.build(raw, request)
    await events.emit(case_id, "orchestrator", "facts_recomputed",
                      {"compensated": missing, "lines": len(shared.get("lines") or []),
                       "blockers": len(shared["blockers"]), "hard_stops": len(shared["hard_stops"])})
    return shared
