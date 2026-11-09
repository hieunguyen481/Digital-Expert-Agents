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
