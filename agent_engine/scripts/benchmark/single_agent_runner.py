"""Chatbot single-agent chạy TRONG container engine (cần MCP :8200 + danh tính đã ký).

Cùng model với Specialist (config.SPECIALIST_MODEL), cùng vòng lặp tool-calling (llm.tool_loop),
cùng công cụ MCP (liệt kê động từ server), cùng RAG (rag.search), cùng danh tính (employee_id/branch_id
của người gọi). KHÔNG có planner, agent chuyên môn riêng, Validation. Không bị làm yếu: prompt gộp
đủ nhiệm vụ của Credit + Compliance + Operations, ngưỡng DSCR/LTV giống prompt của Specialist.

Vào: JSON stdin {"request": {...}, "identity": {"employee_id","branch_id","is_admin"}}
Ra:  một dòng JSON cuối cùng trên stdout (các dòng khác là log).
"""
from __future__ import annotations

import asyncio
import inspect
import json
import sys
import time

sys.path.insert(0, "/engine")

from common import config, identity, llm, mcp_client, rag  # noqa: E402

MAX_ITER = 15  # nhiều hơn mặc định 10 của Specialist vì một agent phải làm việc của cả hội đồng

SYSTEM = (
    "Bạn là chatbot thẩm định tín dụng SME của ngân hàng SHB, làm MỘT MÌNH toàn bộ việc: "
    "thẩm định tài chính, tuân thủ và vận hành. "
    f"Phân tích DSCR (tối thiểu {config.DSCR_MIN}), đòn bẩy, dòng tiền; đề xuất hạn mức. "
    "Kiểm tra KYB, blacklist AML (hit = từ chối ngay), CIC (nhóm >=3 từ chối, nhóm 2 flag), "
    f"pháp lý TSĐB (LTV tối đa {config.LTV_MAX:.0%}). Kiểm tra điều kiện vận hành trước khi trình. "
    "Dùng công cụ để lấy dữ liệu thật, không bịa số. Trích dẫn chính sách qua search_policy. "
    "Bạn không có quyền phê duyệt: kết luận chỉ là khuyến nghị; nếu đề xuất duyệt thì phải đặt "
    "requires_human_approval=true để người có thẩm quyền xác nhận. Kết thúc bằng submit_verdict."
)

SUBMIT = llm.ToolDef("submit_verdict", "Nộp kết luận thẩm định cuối cùng", {
    "type": "object", "properties": {
        "decision": {"type": "string", "enum": ["approve", "reject", "need_more_info"]},
        "summary": {"type": "string"},
        "proposed_limit": {"type": "number"},
        "requires_human_approval": {"type": "boolean"},
        "findings": {"type": "array", "items": {"type": "string"}},
        "conditions": {"type": "array", "items": {"type": "string"}},
        "evidence": {"type": "array", "items": {"type": "object", "properties": {
            "source": {"type": "string"}, "quote": {"type": "string"}}}},
    }, "required": ["decision", "summary"]}, None)  # type: ignore[arg-type]


def _mk_tool(spec: dict, counter: list) -> llm.ToolDef:
    async def fn(**kw):
        counter.append(spec["name"])
        return await mcp_client.call_tool(spec["name"], kw)
    return llm.ToolDef(spec["name"], spec["description"], spec["input_schema"], fn)


async def main() -> None:
    inp = json.loads(sys.stdin.read())
    i = inp["identity"]
    identity.set_current(identity.Identity(i["employee_id"], i["branch_id"], bool(i.get("is_admin"))))

    usages: list[dict] = []
    def _record(resp) -> None:
        usages.append(resp.usage.model_dump() if getattr(resp, "usage", None) is not None else {})

    # llm._log_usage là hàm đồng bộ ở bản cũ, async (resp, model) ở bản mới: giữ đúng kiểu của bản đang chạy.
    if inspect.iscoroutinefunction(llm._log_usage):
        async def _patched(resp, model=None) -> None:
            _record(resp)
    else:
        def _patched(resp, model=None) -> None:  # type: ignore[misc]
            _record(resp)
    llm._log_usage = _patched  # type: ignore[assignment]
    calls: list[str] = []
    rag_calls: list[str] = []

    async def search_policy(query: str, domain: str = "credit") -> list:
        rag_calls.append(domain)
        return rag.search(domain if domain in ("credit", "compliance", "ops") else "credit", query)

    mcp_specs = await mcp_client.list_tools()
    tools = [_mk_tool(s, calls) for s in mcp_specs]
    tools.append(llm.ToolDef(
        "search_policy", "Tra cứu chính sách nội bộ (domain: credit|compliance|ops)",
        {"type": "object", "properties": {"query": {"type": "string"},
                                          "domain": {"type": "string", "enum": ["credit", "compliance", "ops"]}},
         "required": ["query"]}, search_policy))
    tools.append(SUBMIT)

    t0 = time.perf_counter()
    err = None
    result: dict = {}
    try:
        result = await llm.tool_loop(
            system=SYSTEM, user=f"Thẩm định đề nghị vay: {inp['request']}",
            tools=tools, max_iterations=MAX_ITER)
    except Exception as e:  # noqa: BLE001
        err = f"{type(e).__name__}: {e}"[:300]
    latency = time.perf_counter() - t0

    def tot(k: str) -> int:
        return sum(int(u.get(k) or 0) for u in usages)
    costs = [u.get("cost") for u in usages if u.get("cost") is not None]
    ev = result.get("evidence") or []
    ev = ev if isinstance(ev, list) else [ev]
    listify = lambda x: x if isinstance(x, list) else ([x] if x else [])  # noqa: E731
    decision = str(result.get("decision", "")).lower()
    if err:
        gate = "ERROR"
    elif decision == "approve":
        gate = "PENDING_APPROVAL" if result.get("requires_human_approval") else "AUTO_APPROVED"
    else:
        gate = {"reject": "REJECTED", "need_more_info": "NEEDS_INFO"}.get(decision, "NO_DECISION")
    print("RESULT_JSON " + json.dumps({
        "error": err, "latency_s": latency, "gate": gate, "decision": decision,
        "conclusion_text": "\n".join([str(result.get("summary", ""))] + [str(x) for x in listify(result.get("findings"))]
                                     + [str(x) for x in listify(result.get("conditions"))]),
        "sources": [str(e.get("source", "")) if isinstance(e, dict) else str(e) for e in ev],
        "mcp_calls_local": calls, "rag_calls": rag_calls, "llm_requests": len(usages),
        "tokens": {"prompt": tot("prompt_tokens"), "completion": tot("completion_tokens"),
                   "total": tot("total_tokens")},
        "cost_usd": sum(float(c) for c in costs) if costs else None,
        "raw_verdict": result,
    }, ensure_ascii=False, default=str))


asyncio.run(main())
