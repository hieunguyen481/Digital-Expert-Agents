"""Cổng cuối của hồ sơ: luật XÁC ĐỊNH từ dữ kiện công cụ (common.facts) và xung đột đã kiểm chứng, không để LLM chọn.

Thứ tự: dừng cứng -> Từ chối; thiếu dữ liệu chặn thật / vi phạm ngưỡng / xung đột chưa giải -> Cần bổ sung;
còn lại -> đề xuất phê duyệt. Chuyên gia trả need_more_info vì thiếu *trường phụ* (DSCR, người đại diện...) không làm
đổi cổng: các trường đó thành điều kiện bổ sung trước giải ngân (rules.md Q7).
"""
from __future__ import annotations

import re

from .schemas import VerdictDecision


NON_BLOCKING = "Phần còn thiếu không chặn việc áp dụng chính sách, được xử lý thành điều kiện. "
# Điều kiện tiên quyết khi tổng cấp tín dụng > 20 tỷ mà chưa có bằng chứng BCTC đã kiểm toán (engine không có dữ liệu này,
# nên coi là chưa có): đề xuất phê duyệt nhưng phải có BCTC kiểm toán trước khi trình cấp phê duyệt.
AUDIT_PREREQ = "phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)"


def decide(facts: dict, unresolved: dict | None = None) -> tuple[VerdictDecision, str, list[str]]:
    """Trả (quyết định, lý do ngắn, danh sách căn cứ)."""
    if facts["hard_stops"]:
        return VerdictDecision.REJECT, "TỪ CHỐI: " + "; ".join(facts["hard_stops"]), facts["hard_stops"]
    why = [*facts["blockers"], *facts["breaches"]]
    if unresolved is not None:
        why.append(unresolved.get("reason", "mâu thuẫn chưa giải"))
    if facts["blockers"]:
        return VerdictDecision.NEED_MORE_INFO, "CẦN BỔ SUNG: thiếu dữ liệu chặn — " + "; ".join(facts["blockers"]), why
    if why:
        return VerdictDecision.NEED_MORE_INFO, "CẦN BỔ SUNG/ĐIỀU CHỈNH: " + "; ".join(why), why
    return VerdictDecision.APPROVE, "ĐỀ XUẤT PHÊ DUYỆT", []


_NEG_LEAD = re.compile(r"^\s*(?:chưa|không)\s+(?:thể|đủ)\s+[^:;.—–]*?[:\-–—]\s*", re.I)
_NEG_SENT = re.compile(r"^\s*(?:chưa|không)\s+(?:thể|đủ)\b", re.I)
_NOT_YET = re.compile(r"^chưa\s+(?=\w)", re.I)
_LABEL_LEAD = re.compile(r"^\s*(?:đồng ý có điều kiện|cần thêm thông tin)\s*[:\-–—]\s*", re.I)
_AUDIT = re.compile(r"kiểm toán", re.I)


# VIỆC PHẢI LÀM = vế có động từ hành động kèm đối tượng ("Bổ sung BCTC kiểm toán", "cần mở tài khoản thanh toán").
# Câu nhận xét/kết luận ("KYB đạt", "chưa cho thấy vi phạm", "Hạn mức hiện tại là 0 đồng") hay vế chỉ có động từ mà không
# nêu việc gì ("Hồ sơ cần bổ sung trước khi xem xét") thì không phải điều kiện.
_VERBS = (r"bổ sung|cung cấp|nộp|mở|định giá|thẩm định lại|xác minh|xác nhận|đối chiếu|đối soát|hoàn tất|hoàn thiện|đăng ký|ký|"
          r"cập nhật|tra cứu|công chứng|mua|thu thập|giải trình|làm rõ|kiểm tra|giảm|điều chỉnh|gia hạn|lập|thiếu|chưa|chờ|chứng minh|chênh lệch|lệch|không khớp|có")
_ACTION = re.compile(r"(?<!\w)(?:(?:cần|phải|nên)\s+(?:có|(?:" + _VERBS + r"))|(?:" + _VERBS.replace("|có", "") + r"))(?!\w)(.*)$", re.I)
_PAST_OR_STATUS = re.compile(r"^\s*(?:đã|đều|đang)\b|\b(?:đạt|chưa cho thấy|không (?:có )?(?:trùng|vi phạm|phát hiện))\b", re.I)
_OBJECT_STOP = re.compile(r"^\s*(?:(?:trước|sau|để|khi|nếu|vì|do)\b|[,(])", re.I)


def is_action(text: str) -> bool:
    """Vế là việc phải làm (xác định bằng luật, không LLM): có động từ hành động và có nêu đối tượng của việc."""
    t = (text or "").strip()
    if not t or _PAST_OR_STATUS.search(t):
        return False
    for m in _ACTION.finditer(t):
        obj = m.group(1)
        if obj.strip() and not _OBJECT_STOP.match(obj):
            return True
    return False


def split_clauses(text: str) -> list[str]:
    """Tách một câu kết luận của chuyên gia thành các việc còn thiếu, bằng luật xác định (không LLM): bỏ câu dẫn phủ định
    ("Chưa thể chốt phê duyệt: ...", "Chưa thể chấp thuận ..."), đổi "chưa <việc>" thành "cần <việc>"."""
    out: list[str] = []
    for part in re.split(r";\s*|(?<=[.])\s+", text or ""):
        c = part.strip(" .;")
        c = _LABEL_LEAD.sub("", c)
        c = _NEG_LEAD.sub("", c).strip(" .;")
        if not c or _NEG_SENT.match(c):
            continue
        if _NOT_YET.match(c):
            c = "cần " + _NOT_YET.sub("", c)
        if not is_action(c):
            continue  # câu nhận xét/kết luận/hiện trạng: không phải điều kiện
        c = c[:1].upper() + c[1:]
        if c not in out:
            out.append(c)
    return out


def conditions_summary(items: list[str], audit_required: bool = False) -> tuple[str, list[str]]:
    """Câu tóm tắt do mã sinh: điều kiện tiên quyết trước khi trình cấp phê duyệt tách khỏi điều kiện trước giải ngân."""
    pre = [i for i in items if audit_required and _AUDIT.search(i)]
    rest = [i for i in items if i not in pre]
    if pre:
        pre = ["Phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)"]
    parts = []
    if pre:
        parts.append("Điều kiện tiên quyết trước khi trình cấp phê duyệt: " + "; ".join(pre) + ".")
    if rest:
        parts.append("Điều kiện bổ sung: " + "; ".join(r.rstrip(".") for r in rest) + ".")
    return NON_BLOCKING + " ".join(parts), [*pre, *rest]


def reconcile_experts(verdicts: dict, rec_decision: VerdictDecision, audit_required: bool = False) -> tuple[dict, list[str]]:
    """Kết luận cổng không được thuận lợi hơn chuyên gia mà không nêu lý do (L05).

    Cổng chỉ chặn bằng dữ kiện công cụ (blockers/breaches/hard_stops, đã gồm các điều bắt buộc theo luật như AML, CIC, BCTC).
    Khi cổng đề xuất phê duyệt mà chuyên gia vẫn "Cần thêm thông tin", điều chuyên gia còn thiếu không nằm trong dữ kiện
    chặn, tức chỉ là điều kiện xử lý được sau quyết định (rules.md Q7): chuyển thành "Đồng ý có điều kiện"; tóm tắt được
    mã dựng lại từ danh sách việc còn thiếu (không giữ câu phủ định của LLM) để khớp kết luận cổng."""
    if rec_decision != VerdictDecision.APPROVE:
        return verdicts, []
    out, notes = dict(verdicts), []
    for name, v in verdicts.items():
        if v.decision == VerdictDecision.NEED_MORE_INFO:
            items = split_clauses(v.summary)
            summary, items = conditions_summary(items, audit_required)
            if not items:
                summary = NON_BLOCKING
            conds = [c for c in v.conditions if not (audit_required and _AUDIT.search(c))]
            out[name] = v.model_copy(update={
                "decision": VerdictDecision.FLAG, "summary": summary,
                "conditions": [*conds, *[i for i in items if i not in conds]]})
            notes.append(f"{name}: từ 'Cần thêm thông tin' thành 'Đồng ý có điều kiện' vì dữ kiện công cụ không có thiếu hụt chặn")
    return out, notes
