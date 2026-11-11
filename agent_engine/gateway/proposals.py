"""Đề xuất hành động ghi của đội agent (V049) — agent chỉ ĐỀ XUẤT, kèm căn cứ.

Ba loại: ghi cờ rủi ro, yêu cầu bổ sung tài liệu (kèm danh sách), điều kiện trước giải ngân. Hàm ở đây chỉ dựng
đề xuất từ kết luận cuối của đội agent; việc thực hiện nằm ở `main.py` sau xác nhận của người có thẩm quyền.
"""
from __future__ import annotations

import re

from common import gate
from common.schemas import Verdict, VerdictDecision

MAX_DOCUMENTS = 8
_LABEL = {"credit": "Tín dụng", "compliance": "Tuân thủ", "operations": "Vận hành", "validation": "Thẩm định chéo"}


# Hành vi thuộc giai đoạn giải ngân (không cần để trình/quyết định) hoặc nêu rõ "không chặn trình".
_AFTER_DECISION = re.compile(
    r"không chặn|ký hợp đồng|mở tài khoản|đăng ký giao dịch bảo đảm|giải ngân (?:từng đợt|theo tiến độ)|kiểm tra (?:việc )?sử dụng vốn|"
    r"sau (?:khi )?(?:phê duyệt|quyết định|duyệt)|trước khi (?:nhận|rút) vốn", re.I)
_BEFORE_DECISION = re.compile(
    r"trước khi (?:trình|phê duyệt|quyết định|duyệt|thẩm định)|trước quyết định|trước khi có quyết định|"
    r"xác minh|bổ sung|cung cấp|nộp|đối soát|đối chiếu|hoàn thiện|hoàn tất (?:sàng lọc|kiểm tra)|bắt buộc|chưa có|thiếu", re.I)


def is_pre_decision(text: str) -> bool:
    """Việc phải xong TRƯỚC quyết định (bổ sung/xác minh/đối soát dữ liệu, tài liệu bắt buộc) là yêu cầu bổ sung, không phải
    điều kiện trước giải ngân, kể cả khi câu có chữ "trước giải ngân". Điều kiện thuộc giai đoạn giải ngân (mở tài khoản,
    ký hợp đồng, nêu rõ "không chặn trình") vẫn là điều kiện trước giải ngân."""
    return not _AFTER_DECISION.search(text) and bool(_BEFORE_DECISION.search(text))


_STOP = {"và", "của", "các", "cho", "khi", "là", "có", "được", "theo", "bổ", "sung", "cung", "cấp", "hoàn", "thiện", "nộp",
         "xác", "minh", "đối", "soát", "chiếu", "trước", "giải", "ngân"}


def _tokens(t: str) -> set[str]:
    return set(re.findall(r"\w+", t.casefold())) - _STOP


def similar(a: str, b: str, thr: float = 0.7) -> bool:
    """Cùng một việc được diễn đạt khác chữ (Jaccard theo từ >= ngưỡng, hoặc câu ngắn nằm gọn trong câu dài)."""
    ta, tb = _tokens(a), _tokens(b)
    if not (ta and tb):
        return False
    inter = len(ta & tb)
    return inter / len(ta | tb) >= thr or (inter >= 3 and inter / min(len(ta), len(tb)) >= 0.6)


def _evidence(v: Verdict, n: int = 4) -> list[dict]:
    return [{"source": e.source, "quote": e.quote[:300]} for e in v.evidence[:n]]


def _texts(it: dict) -> list[str]:
    """Các nội dung độc lập của một đề xuất: từng tài liệu (request_documents), điều kiện, hoặc tiêu đề."""
    pr = it.get("params") or {}
    if isinstance(pr, str):
        import json
        pr = json.loads(pr)
    return list(pr.get("documents") or []) or [pr.get("text") or it.get("title", "")]


def _strip(text: str) -> str:
    return re.sub(r"^[^:]{0,40}:\s*", "", text)  # bỏ tiền tố "Tín dụng:", "Điều kiện trước giải ngân:"


def dedupe_items(items: list[dict], have: list[dict] | None = None) -> list[dict]:
    """Mỗi nội dung một thẻ: bỏ nội dung trùng (khác chữ, khác loại) với thẻ đứng trước trong cùng lượt và với
    đề xuất đã có (`have`: dict kind/title/params/status). Thứ tự ưu tiên: yêu cầu bổ sung > điều kiện > cờ rủi ro."""
    rank = {"request_documents": 0, "add_disbursement_condition": 1, "add_risk_flag": 2}
    seen = [_strip(t) for h in (have or []) for t in _texts(h)]
    out: list[dict] = []
    for it in sorted(items, key=lambda x: rank.get(x["kind"], 3)):
        texts = _texts(it)
        fresh = [t for t in texts if not any(similar(_strip(t), k, 0.6) for k in seen)]
        if not fresh:
            continue
        if it["kind"] == "request_documents" and len(fresh) != len(texts):
            it = {**it, "params": {**it["params"], "documents": fresh},
                  "title": f"Yêu cầu khách bổ sung {len(fresh)} mục"}
        seen += [_strip(t) for t in fresh]
        out.append(it)
    return out


def derive(validation: Verdict, final_verdicts: list[Verdict], report: dict) -> list[dict]:
    """Danh sách đề xuất (dict) từ kết luận cuối; rỗng nếu không có căn cứ."""
    out: list[dict] = []
    for v in final_verdicts:
        if v.agent == "validation" or v.decision not in (VerdictDecision.FLAG, VerdictDecision.REJECT):
            continue
        if v.summary.startswith(gate.NON_BLOCKING):
            continue  # phần còn thiếu đã nêu thành điều kiện/yêu cầu bổ sung của báo cáo cuối, không lặp thành cờ rủi ro
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
        parts = [p.strip(" .") for c in dict.fromkeys(report.get("conditions") or []) for p in re.split(r";\s+", c) if p.strip(" .")]
        for c in dict.fromkeys(parts):
            if not any(similar(c, k) for k in conds):
                conds.append(c)
        pre = [c for c in conds if is_pre_decision(c)]  # chưa gộp với yêu cầu bổ sung của chuyên gia: dedupe_items lo
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
    return dedupe_items(out)
