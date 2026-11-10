"""Đề xuất hành động ghi của đội agent (V049) — agent chỉ ĐỀ XUẤT, kèm căn cứ.

Ba loại: ghi cờ rủi ro, yêu cầu bổ sung tài liệu (kèm danh sách), điều kiện trước giải ngân. Hàm ở đây chỉ dựng
đề xuất từ kết luận cuối của đội agent; việc thực hiện nằm ở `main.py` sau xác nhận của người có thẩm quyền.
"""
from __future__ import annotations

from common.schemas import Verdict, VerdictDecision

MAX_CONDITIONS = 5
MAX_DOCUMENTS = 8
_LABEL = {"credit": "Tín dụng", "compliance": "Tuân thủ", "operations": "Vận hành", "validation": "Thẩm định chéo"}


def _evidence(v: Verdict, n: int = 4) -> list[dict]:
    return [{"source": e.source, "quote": e.quote[:300]} for e in v.evidence[:n]]


def derive(validation: Verdict, final_verdicts: list[Verdict], report: dict) -> list[dict]:
    """Danh sách đề xuất (dict) từ kết luận cuối; rỗng nếu không có căn cứ."""
    out: list[dict] = []
    for v in final_verdicts:
        if v.agent == "validation" or v.decision not in (VerdictDecision.FLAG, VerdictDecision.REJECT):
            continue
        evidence, why = _evidence(v), "; ".join(v.findings[:3]) or v.summary
        if not evidence and not v.findings:
            continue  # không có căn cứ thì không đề xuất
        label = _LABEL.get(v.agent, v.agent)
        out.append({"kind": "add_risk_flag", "source_agent": v.agent, "evidence": evidence,
                    "title": f"{label}: {v.summary[:200]}", "rationale": why[:1500],
                    "params": {"severity": "HIGH" if v.decision == VerdictDecision.REJECT else "MEDIUM"}})

    if validation.decision == VerdictDecision.NEED_MORE_INFO:
        docs: list[str] = []
        evidence: list[dict] = []
        for v in final_verdicts:
            if v.decision == VerdictDecision.NEED_MORE_INFO:
                docs += [c for c in v.conditions if c not in docs]
                evidence += _evidence(v, 2)
        docs = docs[:MAX_DOCUMENTS]
        if docs:
            out.append({"kind": "request_documents", "source_agent": "validation", "evidence": evidence[:6],
                        "title": f"Yêu cầu khách bổ sung {len(docs)} mục",
                        "rationale": validation.summary[:1500], "params": {"documents": docs}})

    if validation.decision == VerdictDecision.APPROVE:
        for cond in list(dict.fromkeys(report.get("conditions") or []))[:MAX_CONDITIONS]:
            out.append({"kind": "add_disbursement_condition", "source_agent": "validation",
                        "evidence": _evidence(validation, 3),
                        "title": f"Điều kiện trước giải ngân: {cond[:140]}",
                        "rationale": "Điều kiện nêu trong báo cáo cuối của đội agent khi đề xuất phê duyệt.",
                        "params": {"text": cond}})
    return out
