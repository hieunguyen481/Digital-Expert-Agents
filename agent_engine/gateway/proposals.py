"""Đề xuất hành động ghi của đội agent (V049) — agent chỉ ĐỀ XUẤT, kèm căn cứ.

Ba loại: ghi cờ rủi ro, yêu cầu bổ sung tài liệu (kèm danh sách), điều kiện trước giải ngân. Hàm ở đây chỉ dựng
đề xuất từ kết luận cuối của đội agent; việc thực hiện nằm ở `main.py` sau xác nhận của người có thẩm quyền.
"""
from __future__ import annotations

import re

from common.schemas import Verdict, VerdictDecision

MAX_DOCUMENTS = 8
_LABEL = {"credit": "Tín dụng", "compliance": "Tuân thủ", "operations": "Vận hành", "validation": "Thẩm định chéo"}


_AFTER_DECISION = re.compile(r"giải ngân|sau (?:khi )?(?:phê duyệt|quyết định|duyệt)|ký hợp đồng|trước khi (?:nhận|rút) vốn", re.I)
_BEFORE_DECISION = re.compile(
    r"trước khi (?:trình|phê duyệt|quyết định|duyệt|thẩm định)|trước quyết định|trước khi có quyết định|"
    r"xác minh|bổ sung|cung cấp|nộp|hoàn tất (?:sàng lọc|kiểm tra)|chưa có|thiếu", re.I)


def is_pre_decision(text: str) -> bool:
    """Việc phải xong TRƯỚC quyết định (bổ sung/xác minh dữ liệu) là yêu cầu bổ sung, không phải điều kiện trước giải ngân.
    Câu nêu rõ giải ngân/sau phê duyệt luôn là điều kiện trước giải ngân."""
    return not _AFTER_DECISION.search(text) and bool(_BEFORE_DECISION.search(text))


def _tokens(t: str) -> set[str]:
    return set(re.findall(r"\w+", t.casefold())) - {"và", "của", "các", "cho", "khi", "là", "có", "được", "theo"}


def similar(a: str, b: str, thr: float = 0.7) -> bool:
    """Cùng một việc được diễn đạt khác chữ giữa hai lượt chạy (Jaccard theo từ >= ngưỡng)."""
    ta, tb = _tokens(a), _tokens(b)
    return bool(ta and tb) and len(ta & tb) / len(ta | tb) >= thr


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
        # điều kiện bắt buộc (vd. Q-V thiếu TK thanh toán) không bị cắt: mỗi điều kiện khác nhau là một đề xuất
        conds: list[str] = []
        for c in dict.fromkeys(report.get("conditions") or []):
            if not any(similar(c, k) for k in conds):
                conds.append(c)
        pre = [c for c in conds if is_pre_decision(c)]
        if pre:  # việc phải làm trước quyết định: yêu cầu bổ sung (người dùng xác nhận gửi khách), không phải điều kiện giải ngân
            out.append({"kind": "request_documents", "source_agent": "validation", "evidence": _evidence(validation, 3),
                        "title": f"Yêu cầu khách bổ sung {len(pre[:MAX_DOCUMENTS])} mục",
                        "rationale": "Việc cần hoàn tất trước khi trình quyết định, nêu trong báo cáo cuối của đội agent.",
                        "params": {"documents": pre[:MAX_DOCUMENTS]}})
        for cond in (c for c in conds if c not in pre):
            out.append({"kind": "add_disbursement_condition", "source_agent": "validation",
                        "evidence": _evidence(validation, 3),
                        "title": f"Điều kiện trước giải ngân: {cond[:140]}",
                        "rationale": "Điều kiện nêu trong báo cáo cuối của đội agent khi đề xuất phê duyệt.",
                        "params": {"text": cond}})
    return out
