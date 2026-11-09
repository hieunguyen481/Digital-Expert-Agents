"""Compliance Agent — chuyên gia pháp chế & tuân thủ.

KYB, blacklist/AML, CIC, thẩm định pháp lý TSĐB; tính giới hạn cho vay có bảo đảm
(max_secured_limit = LTV_MAX x định giá) — đầu vào cho vòng challenge của Validation.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.base import build_agent_app  # noqa: E402
from common import agent_tools, config, facts as facts_mod, llm, mcp_client, rag, recompute  # noqa: E402
from common.expert_rules import EXPERT_RULES  # noqa: E402
from common.report import with_policy_evidence  # noqa: E402
from common.schemas import (  # noqa: E402
    AgentCard, AgentSkill, Envelope, Evidence, Verdict, VerdictDecision,
)

CARD = AgentCard(
    agent_id="compliance",
    name="Legal & Compliance Agent",
    description="Chuyên gia số pháp chế & tuân thủ: KYB, AML/blacklist, CIC, "
                "thẩm định pháp lý tài sản bảo đảm, giới hạn LTV.",
    url=config.agent_url("compliance"),
    skills=[
        AgentSkill(id="kyb_aml", name="KYB & AML",
                   description="Xác minh pháp nhân, người đại diện, danh sách đen, CIC"),
        AgentSkill(id="collateral_legal", name="Pháp lý TSĐB",
                   description="Kiểm tra trạng thái pháp lý tài sản và giới hạn LTV"),
    ],
)


async def _rules_task(env: Envelope) -> Verdict:
    params = env.payload.get("params", {})
    request = params.get("request", {})
    business_id = request["business_id"]
    check_collateral = params.get("check_collateral", request.get("has_collateral", False))

    biz = await mcp_client.call_tool("get_business", {"business_id": business_id})
    bl = await mcp_client.call_tool("check_blacklist", {
        "business_id": business_id})
    cic = await mcp_client.call_tool("get_cic_status", {"business_id": business_id})

    evidence = [
        Evidence(source="core-banking:get_business",
                 quote=f"{biz.get('name')} — MST {biz.get('tax_code')}, "
                       f"đại diện: {biz.get('legal_rep_name')}"),
        Evidence(source="core-banking:get_cic_status",
                 quote=f"CIC nhóm {cic.get('cic_group')}, quá hạn {cic.get('overdue_amount', 0):,.0f}"),
    ]
    for p in rag.search_policy("compliance", "KYB danh sách đen AML nhóm nợ LTV tài sản bảo đảm"):
        evidence.append(Evidence(source=f"RAG:{p['source']}", quote=p["text"][:300]))

    findings: list[str] = []
    conditions: list[str] = []

    if not bl.get("screened", True):
        findings.append(bl.get("note", "Chưa có kết quả tra cứu AML/danh sách đen"))
        conditions.append("Tra cứu AML/danh sách đen trước khi trình phê duyệt")
    if bl.get("hit"):
        return Verdict(
            agent=CARD.agent_id, task_id=env.task_id or "",
            decision=VerdictDecision.REJECT,
            summary=f"HARD STOP: người đại diện có tên trong danh sách đen AML "
                    f"({bl['detail'].get('reason', '')}) — từ chối, không cần thẩm định tiếp",
            evidence=evidence, confidence=1.0,
        )

    decision = VerdictDecision.APPROVE
    if (cic.get("cic_group") or 1) >= 3:
        decision = VerdictDecision.REJECT
        findings.append(f"CIC nhóm {cic['cic_group']}: không đủ điều kiện cấp tín dụng")
    elif (cic.get("cic_group") or 1) == 2:
        decision = VerdictDecision.FLAG
        findings.append("CIC nhóm 2: cần phê duyệt cấp cao hơn và điều kiện tăng cường")
        conditions.append("Bổ sung giải trình lịch sử nợ nhóm 2 và nguồn trả nợ")

    if biz.get("industry_risk") == "high":
        findings.append(f"Ngành '{biz.get('industry')}' thuộc nhóm rủi ro cao theo khẩu vị rủi ro")
        conditions.append("Áp dụng tỷ lệ tài trợ thận trọng cho ngành rủi ro cao")

    max_secured = None
    if check_collateral:
        cols = await mcp_client.call_tool("get_collateral", {"business_id": business_id})
        if not cols:
            decision = VerdictDecision.NEED_MORE_INFO
            findings.append("Khai có TSĐB nhưng không tìm thấy hồ sơ tài sản")
        else:
            chk = recompute.collateral_check(cols, float(request.get("amount") or 0))
            for col in cols:
                if col["legal_status"] != "clear":
                    decision = VerdictDecision.NEED_MORE_INFO
                    findings.append(f"TSĐB {col['collateral_id']} chưa hoàn thiện pháp lý: "
                                    f"{col['legal_status']}")
            if chk["eligible_value"]:
                max_secured = chk["max_secured_limit"]
                evidence.append(Evidence(
                    source="core-banking:get_collateral",
                    quote=f"{chk['eligible_assets']}/{chk['assets']} TSĐB đủ điều kiện pháp lý, tổng định giá "
                          f"{chk['eligible_value']:,.0f}. Giới hạn bảo đảm (LTV {config.LTV_MAX:.0%}): "
                          f"{max_secured:,.0f} VND"))
                conditions.append("Hoàn thiện đăng ký giao dịch bảo đảm trước giải ngân")

    summary = {
        VerdictDecision.APPROVE: "Đạt các kiểm tra tuân thủ KYB/AML/CIC",
        VerdictDecision.FLAG: "Đạt có điều kiện — tồn tại yếu tố rủi ro cần cấp thẩm quyền lưu ý",
        VerdictDecision.REJECT: "Không đạt điều kiện tuân thủ",
        VerdictDecision.NEED_MORE_INFO: "Thiếu hồ sơ pháp lý — cần bổ sung",
    }[decision]
    if max_secured:
        summary += f". Giới hạn cho vay có bảo đảm: {max_secured:,.0f} VND"

    return Verdict(
        agent=CARD.agent_id, task_id=env.task_id or "", decision=decision,
        summary=summary, evidence=evidence, findings=findings, conditions=conditions,
        max_secured_limit=max_secured,
        data={"cic_group": cic.get("cic_group"), "blacklist_hit": False},
    )


async def _facts_task(env: Envelope, shared: dict) -> Verdict:
    """Cờ facts: dữ kiện từ bảng chung, RAG hẹp nạp trước -> đúng một lượt LLM."""
    params = env.payload.get("params", {})
    request = params.get("request", {})
    hits = rag.search_policy("compliance", "KYB AML CIC nhóm nợ pháp lý tài sản bảo đảm LTV")
    policy = "\n".join(f"[{h['source']}] {h['text'][:300]}" for h in hits)
    submit = llm.ToolDef("submit_verdict", "Nộp kết luận tuân thủ",
                         {"type": "object", "properties": {
                             "decision": {"type": "string",
                                          "enum": ["approve", "reject", "need_more_info", "flag"]},
                             "summary": {"type": "string"},
                             "max_secured_limit": {"type": "number"},
                             "findings": {"type": "array", "items": {"type": "string"}},
                             "conditions": {"type": "array", "items": {"type": "string"}},
                             "evidence": {"type": "array", "items": {"type": "object", "properties": {
                                 "source": {"type": "string"}, "quote": {"type": "string"}}}},
                         }, "required": ["decision", "summary"]}, None)  # type: ignore[arg-type]
    result = await llm.tool_loop(
        system=f"Bạn là chuyên gia pháp chế & tuân thủ ngân hàng. Kiểm tra KYB, "
               f"blacklist (hit = từ chối ngay), CIC (nhóm >=3 từ chối, nhóm 2 flag), "
               f"pháp lý TSĐB (LTV tối đa {config.LTV_MAX:.0%} — tính max_secured_limit). "
               f"Dữ kiện công cụ và quy định đã cho sẵn, KHÔNG cần gọi thêm. {EXPERT_RULES}"
               + (facts_mod.COMPACT_HINT if config.opt("compact") else "") + " Kết thúc bằng submit_verdict.",
        user=f"Kiểm tra tuân thủ đề nghị vay: {request}, "
             f"kiểm tra TSĐB: {params.get('check_collateral', False)}\n"
             f"Dữ kiện: {facts_mod.scoped_text(shared, 'compliance')}\nQuy định:\n{policy}"
             + (f"\nYêu cầu rà soát từ Validation: {params['challenge_reason']}"
                if params.get("challenge_reason") else ""),
        tools=[submit],
    )
    return with_policy_evidence(Verdict.from_llm(CARD.agent_id, env.task_id or "", result), hits)


async def _llm_task(env: Envelope) -> Verdict:
    params = env.payload.get("params", {})
    request = params.get("request", {})
    business_id = request["business_id"]
    shared = params.get("facts")
    if shared and config.opt("facts"):
        return await _facts_task(env, shared)
    if not shared and agent_tools.enabled():  # cờ agent_tools: tự chọn công cụ thuộc chuyên môn
        board = await agent_tools.select_and_gather("compliance", request, env.case_id, check_collateral=params.get("check_collateral", False))
        meta = board.pop("_meta")
        verdict = await _facts_task(env, agent_tools.scoped_facts("compliance", board, request))
        verdict.data.update({"_board": board, "_tools": meta})
        return verdict

    async def t_biz() -> dict:
        return await mcp_client.call_tool("get_business", {"business_id": business_id})

    async def t_blacklist() -> dict:
        return await mcp_client.call_tool("check_blacklist", {"business_id": business_id})

    async def t_cic() -> dict:
        return await mcp_client.call_tool("get_cic_status", {"business_id": business_id})

    async def t_collateral() -> list:
        return await mcp_client.call_tool("get_collateral", {"business_id": business_id})

    policy_hits: list[dict] = []

    async def t_policy(query: str) -> list:
        hits = rag.search_policy("compliance", query)
        policy_hits.extend(hits)
        return hits

    tools = [
        llm.ToolDef("get_business", "Hồ sơ pháp nhân", {"type": "object", "properties": {}}, t_biz),
        llm.ToolDef("check_blacklist", "Tra danh sách đen AML",
                    {"type": "object", "properties": {}}, t_blacklist),
        llm.ToolDef("get_cic_status", "Tra CIC", {"type": "object", "properties": {}}, t_cic),
        llm.ToolDef("get_collateral", "Hồ sơ TSĐB", {"type": "object", "properties": {}}, t_collateral),
        llm.ToolDef("search_compliance_policy", "Tra cứu quy định tuân thủ nội bộ",
                    {"type": "object", "properties": {"query": {"type": "string"}},
                     "required": ["query"]}, t_policy),
        llm.ToolDef("submit_verdict", "Nộp kết luận tuân thủ",
                    {"type": "object", "properties": {
                        "decision": {"type": "string",
                                     "enum": ["approve", "reject", "need_more_info", "flag"]},
                        "summary": {"type": "string"},
                        "max_secured_limit": {"type": "number"},
                        "findings": {"type": "array", "items": {"type": "string"}},
                        "conditions": {"type": "array", "items": {"type": "string"}},
                        "evidence": {"type": "array", "items": {"type": "object", "properties": {
                            "source": {"type": "string"}, "quote": {"type": "string"}}}},
                    }, "required": ["decision", "summary"]}, None),  # type: ignore[arg-type]
    ]
    result = await llm.tool_loop(
        system=f"Bạn là chuyên gia pháp chế & tuân thủ ngân hàng. Kiểm tra KYB, "
               f"blacklist (hit = từ chối ngay), CIC (nhóm >=3 từ chối, nhóm 2 flag), "
               f"pháp lý TSĐB (LTV tối đa {config.LTV_MAX:.0%} — tính max_secured_limit). "
               f"Trích dẫn quy định qua search_compliance_policy. {EXPERT_RULES} Kết thúc bằng submit_verdict.",
        user=f"Kiểm tra tuân thủ đề nghị vay: {request}, "
             f"kiểm tra TSĐB: {params.get('check_collateral', False)}"
             + (f"\nYêu cầu rà soát từ Validation: {params['challenge_reason']}"
                if params.get("challenge_reason") else ""),
        tools=tools,
    )
    return with_policy_evidence(Verdict.from_llm(CARD.agent_id, env.task_id or "", result), policy_hits)


async def handle_task(env: Envelope) -> Verdict:
    if config.LLM_MODE == "llm":
        return await _llm_task(env)
    return await _rules_task(env)


async def handle_challenge(env: Envelope) -> Verdict:
    """Validation yêu cầu rà soát lại (vd. chưa kiểm TSĐB dù core banking có hồ sơ) -> chạy lại đầy đủ."""
    p = env.payload
    redo = env.model_copy(update={"payload": {"params": {
        "request": p.get("request", {}), "check_collateral": True,
        "challenge_reason": p.get("reason", "")}}})
    v = await handle_task(redo)
    return v.model_copy(update={"revision_of": env.task_id,
                                "revision_reason": f"Chấp nhận challenge: {p.get('reason', '')}"})


app = build_agent_app(CARD, handle_task, handle_challenge=handle_challenge)
