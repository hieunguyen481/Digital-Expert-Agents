"""Tờ trình thẩm định (Q-L): 7 mục, luật hoàn tất và nội dung hiệu lực. Hàm thuần, không đụng database."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

SECTION_TITLES: dict[int, str] = {
    1: "Thông tin khách hàng",
    2: "Đề nghị cấp tín dụng",
    3: "Pháp lý, UBO & người có liên quan",
    4: "Tình hình hoạt động kinh doanh",
    5: "Phân tích tài chính & khả năng trả nợ",
    6: "Tài sản bảo đảm",
    7: "Đánh giá rủi ro & đề xuất của Chuyên viên Thẩm định",
}
SECTION_NOS = tuple(SECTION_TITLES)
# Mục 7 là kết luận của người thẩm định: AI không được chèn (spec §10, mockup 02b).
HUMAN_ONLY_SECTIONS = frozenset({7})
PENDING, CONFIRMED, REJECTED = "PENDING", "CONFIRMED", "REJECTED"


def blank_sections() -> dict[str, dict[str, Any]]:
    return {str(no): {"body": "", "ai_blocks": []} for no in SECTION_NOS}


def normalize(sections: Mapping[str, Any] | None) -> dict[str, dict[str, Any]]:
    out = blank_sections()
    for key, value in (sections or {}).items():
        if key in out and isinstance(value, Mapping):
            out[key] = {"body": str(value.get("body") or ""), "ai_blocks": list(value.get("ai_blocks") or [])}
    return out


def effective_section(section: Mapping[str, Any]) -> dict[str, Any]:
    """Chỉ phần người viết và khối AI đã xác nhận; khối chờ hoặc bị loại bỏ không có hiệu lực."""
    return {
        "body": str(section.get("body") or ""),
        "ai_blocks": [b for b in section.get("ai_blocks") or [] if b.get("state") == CONFIRMED],
    }


def effective_content(sections: Mapping[str, Any] | None) -> dict[str, dict[str, Any]]:
    return {key: effective_section(value) for key, value in normalize(sections).items()}


def section_complete(no: int, section: Mapping[str, Any]) -> bool:
    eff = effective_section(section)
    if no in HUMAN_ONLY_SECTIONS:
        return bool(eff["body"].strip())
    return bool(eff["body"].strip()) or bool(eff["ai_blocks"])


def completion(sections: Mapping[str, Any] | None) -> dict[int, bool]:
    norm = normalize(sections)
    return {no: section_complete(no, norm[str(no)]) for no in SECTION_NOS}


def memo_complete(sections: Mapping[str, Any] | None) -> bool:
    return all(completion(sections).values())
