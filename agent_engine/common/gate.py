"""Cổng cuối của hồ sơ: luật XÁC ĐỊNH từ dữ kiện công cụ (common.facts) và xung đột đã kiểm chứng, không để LLM chọn.

Thứ tự: dừng cứng -> Từ chối; thiếu dữ liệu chặn thật / vi phạm ngưỡng / xung đột chưa giải -> Cần bổ sung;
còn lại -> đề xuất phê duyệt. Chuyên gia trả need_more_info vì thiếu *trường phụ* (DSCR, người đại diện...) không làm
đổi cổng: các trường đó thành điều kiện bổ sung trước giải ngân (rules.md Q7).
"""
from __future__ import annotations

from .schemas import VerdictDecision


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


def reconcile_experts(verdicts: dict, rec_decision: VerdictDecision) -> tuple[dict, list[str]]:
    """Kết luận cổng không được thuận lợi hơn chuyên gia mà không nêu lý do (L05).

    Cổng chỉ chặn bằng dữ kiện công cụ (blockers/breaches/hard_stops, đã gồm các điều bắt buộc theo luật như AML, CIC, BCTC).
    Khi cổng đề xuất phê duyệt mà chuyên gia vẫn "Cần thêm thông tin", điều chuyên gia còn thiếu không nằm trong dữ kiện
    chặn, tức chỉ là điều kiện xử lý được sau quyết định (rules.md Q7): chuyển thành "Đồng ý có điều kiện" và ghi rõ lý do,
    để kết luận từng chuyên gia khớp kết luận cổng."""
    if rec_decision != VerdictDecision.APPROVE:
        return verdicts, []
    out, notes = dict(verdicts), []
    for name, v in verdicts.items():
        if v.decision == VerdictDecision.NEED_MORE_INFO:
            reason = (v.summary or "").strip()
            out[name] = v.model_copy(update={
                "decision": VerdictDecision.FLAG,
                "summary": "Phần còn thiếu không chặn việc áp dụng chính sách, xử lý như điều kiện trước giải ngân: " + reason,
                "conditions": [*v.conditions, *([reason] if reason and reason not in v.conditions else [])]})
            notes.append(f"{name}: từ 'Cần thêm thông tin' thành 'Đồng ý có điều kiện' vì dữ kiện công cụ không có thiếu hụt chặn")
    return out, notes
