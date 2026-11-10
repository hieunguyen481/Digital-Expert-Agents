"""Ngưỡng chính sách lấy từ cấu hình (L16): agent không tự nêu số ngưỡng.

Nguồn: `config.DSCR_MIN`, `config.LTV_MAX` (CS-TD-SME/2025 §4.2, §7.1). Văn bản do LLM sinh được chuẩn hóa: số ngưỡng
sai (vd. "DSCR tối thiểu 1,2") bị thay bằng số cấu hình kèm trích dẫn; số DSCR thực của hồ sơ không bị đụng.
"""
from __future__ import annotations

import re

from . import config

DSCR_REF, LTV_REF = "CS-TD-SME/2025 §4.2", "CS-TD-SME/2025 §7.1"


def _vn(x: float) -> str:
    return f"{x:g}".replace(".", ",")


def statement() -> str:
    """Câu ngưỡng đưa vào prompt chuyên gia và chatbot đơn (cùng một văn bản)."""
    return (f"Ngưỡng chính sách chỉ được nêu đúng các số sau, không tự nêu số khác: DSCR ≥ {_vn(config.DSCR_MIN)} lần "
            f"({DSCR_REF}); LTV ≤ {_vn(config.LTV_MAX * 100)}% ({LTV_REF}).")


_DSCR = re.compile(r"(DSCR[^;\n]{0,40}?(?:tối thiểu|ngưỡng|≥|>=|yêu cầu)[^\d.;\n]{0,12}?)(\d+(?:[.,]\d+)?)")
_LTV = re.compile(r"(LTV[^;\n]{0,40}?(?:tối đa|ngưỡng|≤|<=)[^\d.;\n]{0,12}?)(\d+(?:[.,]\d+)?)\s*%")


def _num(s: str) -> float:
    return float(s.replace(",", "."))


def enforce(text: str) -> str:
    """Thay số ngưỡng DSCR/LTV sai trong câu bằng số cấu hình; 1,0 (mức từ chối) được giữ."""
    def dscr(m: re.Match) -> str:
        v = _num(m.group(2))
        if abs(v - config.DSCR_MIN) < 1e-9 or abs(v - 1.0) < 1e-9:
            return m.group(0)
        cite = "" if "§4.2" in text[m.end():m.end() + 40] else f" ({DSCR_REF})"
        return f"{m.group(1)}{_vn(config.DSCR_MIN)}{cite}"

    def ltv(m: re.Match) -> str:
        v = _num(m.group(2))
        if abs(v - config.LTV_MAX * 100) < 1e-9:
            return m.group(0)
        return f"{m.group(1)}{_vn(config.LTV_MAX * 100)}%"

    return _LTV.sub(ltv, _DSCR.sub(dscr, text))
