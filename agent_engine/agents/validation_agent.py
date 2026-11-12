"""Validation & Recommendation Agent — chốt chất lượng trước khi trình người duyệt.

Bước 1: xác thực facts/evidence/nhất quán giữa các verdict.
Bước 2: nếu mâu thuẫn -> CHALLENGE trực tiếp agent liên quan qua A2A (tối đa
        MAX_CHALLENGE_ROUNDS vòng, máy tự giải trước khi phiền con người).
Bước 3: tổng hợp khuyến nghị có cấu trúc cho Approval Package.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncio  # noqa: E402

from agents.base import a2a_send, build_agent_app  # noqa: E402
from common import config, consistency, facts as facts_mod, gate, mcp_client, rag, recompute  # noqa: E402
from common.report import demote_unsupported, join_clauses, merge_verdicts  # noqa: E402
from common.schemas import (  # noqa: E402
    AgentCard, AgentSkill, Envelope, Evidence, MessageType, Verdict, VerdictDecision,
)

CARD = AgentCard(
    agent_id="validation",
    name="Validation & Recommendation Agent",
    description="Kiểm chứng chéo kết luận của các chuyên gia: facts, evidence, "
                "citations, nhất quán; điều phối challenge giữa các agent; "
                "tổng hợp khuyến nghị trình phê duyệt.",
    url=config.agent_url("validation"),
    skills=[
        AgentSkill(id="fact_check", name="Xác thực kết luận",
                   description="Kiểm tra evidence, tính nhất quán giữa các verdict"),
        AgentSkill(id="recommend", name="Tổng hợp khuyến nghị",
                   description="Tạo khuyến nghị có cấu trúc kèm điều kiện"),
    ],
)


async def _independent_checks(request: dict) -> dict:
    """Kiểm chứng độc lập: tự gọi công cụ core banking và tính lại, không tin số của chuyên gia."""
    bid, amount = request.get("business_id"), float(request.get("amount") or 0)

    async def call(name: str) -> list:
        try:
            r = await mcp_client.call_tool(name, {"business_id": bid})
            return r if isinstance(r, list) else []
        except Exception:  # noqa: BLE001 - thiếu dữ liệu thì bỏ qua phép tính đó, không chặn hồ sơ
            return []

    cols, loans, fin = await asyncio.gather(
        call("get_collateral"), call("get_existing_loans"), call("get_financials"))
    try:
        bank = await mcp_client.call_tool("get_bank_exposure", facts_mod.tool_args("bank_exposure", request))
    except Exception:  # noqa: BLE001
        bank = None
    bank_existing = bank.get("existing_bank_exposure") if isinstance(bank, dict) else None
    if not request.get("has_collateral"):
        cols = []  # CX1: không lấy TSĐB của khoản vay khác của khách
    col = recompute.collateral_check(cols, amount) if cols else None
    exp = recompute.exposure_check(loans, amount, bank_existing)
    lev = recompute.leverage_check(fin, loans, amount)
    return {"amount": amount, "collateral": col, "exposure": exp, "leverage": lev,
            "lines": recompute.describe(col, exp, lev, amount), "has_collateral_data": bool(cols)}


def _checked_collateral(v: Verdict | None) -> bool:
    if not v:
        return False
    text = " ".join([v.summary, *v.findings, *v.conditions]).casefold()
    return (v.max_secured_limit is not None or "ltv" in text or "tsđb" in text
            or any("get_collateral" in e.source for e in v.evidence))


def _find_conflict(verdicts: dict[str, Verdict], verified: dict | None = None,
                   challenged: frozenset[str] = frozenset()) -> dict | None:
    """Phát hiện mâu thuẫn giữa các verdict và với số tính lại — trả về challenge cần gửi (nếu có)."""
    credit = verdicts.get("credit")
    compliance = verdicts.get("compliance")
    col = (verified or {}).get("collateral")
    # số Validation tự tính lại từ hồ sơ TSĐB thắng số do chuyên gia báo
    cap = (col["max_secured_limit"] if col and col["eligible_value"]
           else (compliance.max_secured_limit if compliance else None))
    # cờ challenge: bỏ nhánh dựa vào chữ trong verdict; chỉ challenge khi số tính lại mâu thuẫn
    if (compliance and verified and verified.get("has_collateral_data") and "compliance" not in challenged
            and not config.opt("challenge") and not _checked_collateral(compliance)):
        return {
            "target": "compliance",
            "reason": "Core banking có hồ sơ TSĐB của khách nhưng kết luận tuân thủ chưa kiểm tra "
                      "pháp lý TSĐB và giới hạn LTV — kiểm tra đầy đủ mọi TSĐB",
            "check_collateral": True,
        }
    if credit and credit.proposed_limit and cap and credit.proposed_limit > cap + 1:  # sai số float
        return {
            "target": "credit",
            "reason": (
                f"Hạn mức đề xuất {credit.proposed_limit:,.0f} VND vượt giới hạn "
                f"cho vay có bảo đảm {cap:,.0f} VND "
                f"(LTV {config.LTV_MAX:.0%} theo chính sách, tính lại từ hồ sơ TSĐB)"
            ),
            "max_secured_limit": cap,
        }
    return None


async def handle_task(env: Envelope) -> Verdict:
    raw = env.payload.get("params", {}).get("verdicts", {})
    verdicts: dict[str, Verdict] = {k: Verdict(**v) for k, v in raw.items()}

    trace: list[str] = []
    challenge_rounds = 0
    challenged: set[str] = set()

    # ---- Bước 1: xác thực cơ bản ----
    issues: list[str] = []
    for name, v in verdicts.items():
        if name in ("credit", "compliance") and not v.evidence:
            issues.append(f"Kết luận của {name} thiếu trích dẫn nguồn")
    trace.append(f"Đã xác thực {len(verdicts)} kết luận chuyên gia: "
                 + (f"{len(issues)} kết luận thiếu trích dẫn nguồn" if issues else "đều có trích dẫn nguồn"))

    request = env.payload.get("params", {}).get("request", {})
    shared = env.payload.get("params", {}).get("facts")
    if shared:
        verified = shared  # bảng dữ kiện chung đã gọi công cụ một lần
    elif request.get("business_id") and (config.opt("gate") or config.opt("facts")):
        verified = await facts_mod.gather(request)
    else:
        verified = await _independent_checks(request) if request.get("business_id") else None
    if verified:
        trace.append("Kiểm chứng độc lập bằng công cụ: " + " | ".join(verified["lines"]))

    # ---- Bước 2: vòng challenge máy-tự-giải ----
    while challenge_rounds < config.MAX_CHALLENGE_ROUNDS:
        conflict = _find_conflict(verdicts, verified, frozenset(challenged))
        if conflict is None:
            break
        challenge_rounds += 1
        challenged.add(conflict["target"])
        trace.append(
            f"Vòng {challenge_rounds}: CHALLENGE {conflict['target']} — {conflict['reason']}"
        )
        resp = await a2a_send(CARD.agent_id, conflict["target"], Envelope(
            case_id=env.case_id, task_id=env.task_id,
            from_agent=CARD.agent_id, to_agent=conflict["target"],
            type=MessageType.CHALLENGE,
            payload={**{k: v for k, v in conflict.items() if k != "target"},
                     "request": request},
        ))
        if resp.type == MessageType.CHALLENGE_RESPONSE and "verdict" in resp.payload:
            verdicts[conflict["target"]] = Verdict(**resp.payload["verdict"])
            trace.append(
                f"{conflict['target']} đã điều chỉnh: "
                f"{verdicts[conflict['target']].summary}"
            )
        else:
            trace.append(f"{conflict['target']} không phản hồi hợp lệ — dừng vòng challenge")
            break

    unresolved = _find_conflict(verdicts, verified, frozenset({"compliance"}))

    # ---- Bước 3: tổng hợp khuyến nghị ----
    decisions = {name: v.decision for name, v in verdicts.items()}
    credit = verdicts.get("credit")

    # Số liệu tính lại -> phát hiện/điều kiện của riêng Validation (cộng vào báo cáo hợp nhất)
    own_findings: list[str] = list(verified["lines"]) if verified else []
    own_conditions: list[str] = []
    breach = False
    if verified:
        col, exp, lev = verified["collateral"], verified["exposure"], verified["leverage"]
        if exp["audit_required"]:
            own_conditions.append("Điều kiện tiên quyết trước khi trình cấp phê duyệt: BCTC kiểm toán (ý kiến chấp nhận toàn phần) "
                                  "bắt buộc vì tổng cấp tín dụng > 20 tỷ (CS-TD-SME/2025 §4.1, §6.1)")
        if col and col["ltv_over"] and not (credit and credit.proposed_limit
                                            and credit.proposed_limit <= col["max_secured_limit"] + 1):
            breach = True
            own_conditions.append("Giảm số tiền vay về trong giới hạn LTV hoặc bổ sung TSĐB đủ điều kiện pháp lý")
        if lev and lev["over"]:
            breach = True
            own_conditions.append("Bổ sung phương án giảm đòn bẩy hoặc nguồn trả nợ: Nợ vay/EBITDA sau cấp TD vượt ngưỡng")
    # Phát hiện/điều kiện của chuyên gia mâu thuẫn số công cụ vừa tính lại bị hạ cấp trước khi vào báo cáo
    numeric_notes = consistency.check_verdicts(verdicts, verified)  # phản biện số lệch, tính trước khi hạ cấp
    own_findings.extend(numeric_notes)
    trace.extend(numeric_notes)
    verdicts, demoted = demote_unsupported(verdicts, verified)
    if demoted:
        trace.append(f"Hạ cấp {len(demoted)} câu của chuyên gia mâu thuẫn số tính lại bằng công cụ")
    report = merge_verdicts(verdicts, own_findings, own_conditions, demoted)

    if config.opt("gate") and verified and "blockers" in verified:
        # Cổng xác định: dữ kiện công cụ + xung đột đã kiểm chứng; thiếu trường phụ chỉ thành điều kiện bổ sung
        rec_decision, rec, gate_why = gate.decide(verified, unresolved)
        trace.append(f"Cổng xác định: {rec_decision.value} ({'; '.join(gate_why) or 'không có căn cứ chặn'})")
        verdicts, reconciled = gate.reconcile_experts(verdicts, rec_decision, bool(verified['exposure']['audit_required']))
        trace.extend(reconciled)
        if reconciled:
            report = merge_verdicts(verdicts, own_findings, own_conditions, demoted)
        if rec_decision == VerdictDecision.APPROVE:
            limit_txt = f" hạn mức {credit.proposed_limit:,.0f} VND" if credit and credit.proposed_limit else ""
            rec = f"ĐỀ XUẤT PHÊ DUYỆT{limit_txt}"
            # Tiêu đề không được trái ý kiến chuyên gia: cổng vẫn quyết, nhưng nêu rõ chuyên gia nào còn đề nghị bổ sung/lưu ý
            dissent = [f"{name}: {v.summary[:140]}" for name, v in verdicts.items()
                       if v.decision == VerdictDecision.NEED_MORE_INFO]
            if dissent:  # không còn xảy ra sau reconcile_experts; giữ làm lưới an toàn
                rec += " — lưu ý, chuyên gia còn ý kiến khác: " + " | ".join(dissent)
            elif verified["exposure"]["audit_required"]:
                rec += " với điều kiện tiên quyết: " + gate.AUDIT_PREREQ
            elif any(v.decision == VerdictDecision.FLAG for v in verdicts.values()):
                rec += " kèm điều kiện"
        if rec_decision == VerdictDecision.APPROVE:  # đề xuất phê duyệt thì không còn điều kiện "Chưa thể phê duyệt"
            verdicts = {k: v.model_copy(update={
                "conditions": [consistency.unblock_for_approval(c) for c in v.conditions],
                "findings": [consistency.unblock_for_approval(c) for c in v.findings]}) for k, v in verdicts.items()}
            report = merge_verdicts(verdicts, own_findings, own_conditions, demoted)
        extra = [*gate_why]
        if verified["ancillary"]:
            extra.append("Bổ sung trước giải ngân (không chặn trình): " + "; ".join(verified["ancillary"]))
        if extra:
            report = merge_verdicts(verdicts, [*own_findings, *extra], [*own_conditions, *extra], demoted)
    elif VerdictDecision.REJECT in decisions.values():
        rec_decision, rec = VerdictDecision.REJECT, "TỪ CHỐI: có chuyên gia kết luận không đạt điều kiện"
    elif unresolved is not None or issues:
        rec_decision = VerdictDecision.NEED_MORE_INFO
        rec = "ESCALATE: mâu thuẫn không tự giải được sau vòng challenge hoặc thiếu evidence"
    elif VerdictDecision.NEED_MORE_INFO in decisions.values():
        rec_decision, rec = VerdictDecision.NEED_MORE_INFO, "CẦN BỔ SUNG: hồ sơ chưa đủ để trình phê duyệt"
    elif breach:
        rec_decision = VerdictDecision.NEED_MORE_INFO
        rec = "CẦN BỔ SUNG/ĐIỀU CHỈNH: số liệu Validation tính lại vượt ngưỡng chính sách"
    else:
        rec_decision = VerdictDecision.APPROVE
        limit_txt = f" hạn mức {credit.proposed_limit:,.0f} VND" if credit and credit.proposed_limit else ""
        flag_txt = " (có yếu tố cần cấp thẩm quyền lưu ý)" if VerdictDecision.FLAG in decisions.values() else ""
        rec = f"ĐỀ XUẤT PHÊ DUYỆT{limit_txt}{flag_txt}"

    # LLM narrative (hybrid/llm): diễn giải facts đã chốt thành khuyến nghị điều hành
    # — KHÔNG thay đổi quyết định/con số, chỉ viết lời văn cho người duyệt.
    if config.opt("report"):  # báo cáo dựng xác định: bỏ lượt LLM tường thuật
        conds = report["conditions"][:3]
        narrative = rec.rstrip(" .;:") + ". Điều kiện chính: " + join_clauses(conds) + "." if conds else rec
    else:
        narrative = await _synthesize_narrative(rec_decision, rec, verdicts, trace)

    return Verdict(
        agent=CARD.agent_id, task_id=env.task_id or "",
        decision=rec_decision,
        summary=rec,
        findings=report["findings"],        # hợp nhất mọi phát hiện của chuyên gia + số tính lại
        conditions=report["conditions"],
        proposed_limit=credit.proposed_limit if credit else None,
        evidence=[Evidence(source="validation", quote=t) for t in trace] + _clause_evidence(verified),
        data={
            "final_verdicts": {k: v.model_dump(mode="json") for k, v in verdicts.items()},
            "challenge_rounds": challenge_rounds,
            "issues": issues,
            "numeric_challenges": len(numeric_notes),  # phản biện số liệu (chuyên gia nêu số lệch số tính lại)
            "narrative": narrative,
            "report": report,
            "verified": verified,
        },
    )


def _clause_evidence(verified: dict | None) -> list[Evidence]:
    """Nguồn chính sách của chính các phép tính Validation đã áp dụng (không phụ thuộc chuyên gia có trích hay không)."""
    if not verified:
        return []
    exp, col, lev = verified["exposure"], verified["collateral"], verified["leverage"]
    sections = ["3.1", *(["4.1", "6.1"] if exp["audit_required"] else [])]
    if col and col["assets"]:
        sections.append("7.1")
    if lev:
        sections.append("4.2")
    out = []
    for sec in sections:
        c = rag.clause(sec)
        if c:
            out.append(Evidence(source=c["source"], quote=c["text"][:300]))
    return out


async def _synthesize_narrative(rec_decision, rec: str,
                                verdicts: dict, trace: list[str]) -> str:
    """Dùng LLM (gpt-oss-120b) viết khuyến nghị điều hành từ facts đã chốt.
    An toàn: chỉ diễn giải, quyết định & con số do rules quyết. Fail -> trả rec gốc."""
    if config.LLM_MODE not in ("llm", "hybrid"):
        return rec
    from common import llm

    facts = {
        name: {"decision": v.decision.value, "summary": v.summary,
               "proposed_limit": v.proposed_limit,
               "max_secured_limit": v.max_secured_limit,
               "findings": v.findings, "conditions": v.conditions}
        for name, v in verdicts.items()
    }
    try:
        data = await llm.chat_json(
            system="Bạn là thư ký hội đồng tín dụng. Dựa TRÊN CÁC FACTS đã được "
                   "các chuyên gia chốt (không được thay đổi quyết định hay con số), "
                   "viết một khuyến nghị điều hành ngắn gọn, mạch lạc bằng tiếng Việt "
                   "cho cấp phê duyệt. Nêu rõ: kết luận, hạn mức (nếu có), lý do chính, "
                   "và điểm cần lưu ý. Trả JSON {\"narrative\": string}.",
            user=f"Quyết định tổng hợp: {rec_decision.value} ({rec})\n"
                 f"Facts theo chuyên gia: {facts}\n"
                 f"Nhật ký kiểm chứng & challenge: {trace}",
            schema_hint='{"narrative": string}',
        )
        return data.get("narrative", rec) or rec
    except Exception:  # noqa: BLE001
        return rec


app = build_agent_app(CARD, handle_task)
