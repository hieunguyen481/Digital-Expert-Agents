"""Đối chiếu số/trạng thái mà chuyên gia nêu với dữ kiện Validation đã tính lại (thuần hàm, không LLM).

Chỉ số (Nợ vay/EBITDA, DSCR, LTV, giá trị TSĐB, EBITDA) chỉ có MỘT giá trị trong một lượt: số tính lại từ công cụ.
Câu của chuyên gia nêu số khác bị coi là mâu thuẫn: nêu thành phản biện và không đưa vào bản tổng hợp.
"""
from __future__ import annotations

import re

_NUM = r"(\d+(?:[.,]\d+)?)"


def _f(s: str) -> float:
    return float(s.replace(",", "."))


def _fmt(x: float, nd: int = 2) -> str:
    return f"{x:,.{nd}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _official_dscr(verified: dict) -> float | None:
    fin = (verified.get("raw") or {}).get("financials") or []
    if not fin:
        return None
    latest = max(fin, key=lambda f: f.get("year") or 0)
    d = (latest.get("reported_ratios") or {}).get("dscr")
    return float(d["value"]) if d and d.get("value") else None


def _collateral_totals(verified: dict) -> set[float]:
    col = verified.get("collateral")
    if not col:
        return set()
    excluded = sum(float(x.get("valuation") or 0) for x in col.get("excluded", []))
    return {col["eligible_value"] / 1e9, (col["eligible_value"] + excluded) / 1e9}


def mismatches(text: str, verified: dict | None) -> list[str]:
    """Mô tả từng chỉ số trong `text` lệch số tính lại; rỗng nếu không lệch/không đủ dữ kiện để so."""
    if not verified or not text:
        return []
    out: list[str] = []
    lev, col = verified.get("leverage"), verified.get("collateral")
    if lev:
        for m in re.finditer(r"Nợ vay\s*/\s*EBITDA[^\n]{0,90}?" + _NUM + r"\s*lần", text, re.IGNORECASE):
            if abs(_f(m.group(1)) - lev["ratio"]) > 0.015:
                out.append(f"Nợ vay/EBITDA {m.group(1)} lần (tính lại {_fmt(lev['ratio'])} lần)")
        for m in re.finditer(r"EBITDA[^\n.]{0,25}?" + _NUM + r"\s*tỷ", text, re.IGNORECASE):
            if abs(_f(m.group(1)) - lev["ebitda"] / 1e9) > 0.05:
                out.append(f"EBITDA {m.group(1)} tỷ (số liệu BCTC {_fmt(lev['ebitda'] / 1e9, 1)} tỷ)")
        if re.search(r"(không|chưa)\s+(có|đủ)[^\n.]{0,15}EBITDA", text, re.IGNORECASE):
            out.append(f"nêu không có EBITDA (BCTC ghi {_fmt(lev['ebitda'] / 1e9, 1)} tỷ)")
    dscr = _official_dscr(verified)
    if dscr:
        for m in re.finditer(r"DSCR[^\n]{0,60}?" + _NUM, text, re.IGNORECASE):
            if abs(_f(m.group(1)) - dscr) > 0.005:
                out.append(f"DSCR {m.group(1)} (số chính thức {_fmt(dscr)})")
    if col and col.get("ltv"):
        for m in re.finditer(r"LTV[^\n]{0,60}?" + _NUM + r"\s*%", text, re.IGNORECASE):
            if re.search(r"tối đa|trần|ngưỡng|giới hạn|không vượt", m.group(0), re.IGNORECASE):
                continue  # trần chính sách, không phải LTV thực tế
            if abs(_f(m.group(1)) - col["ltv"] * 100) > 0.6:
                out.append(f"LTV {m.group(1)}% (tính lại {_fmt(col['ltv'] * 100, 1)}%)")
    if col and col["assets"]:
        allowed = _collateral_totals(verified)
        for m in re.finditer(r"(?:định giá|giá trị TSĐB)[^\n.]{0,25}?" + _NUM + r"\s*tỷ", text, re.IGNORECASE):
            if allowed and all(abs(_f(m.group(1)) - a) > 0.05 for a in allowed):
                out.append(f"giá trị TSĐB {m.group(1)} tỷ (hồ sơ ghi {_fmt(max(allowed), 1)} tỷ)")
        if re.search(r"chưa có[^\n.]{0,20}(giá trị )?định giá", text, re.IGNORECASE) and max(allowed or {0}) > 0:
            out.append(f"nêu chưa có định giá (hồ sơ ghi {_fmt(max(allowed), 1)} tỷ)")
    return out


def check_verdicts(verdicts: dict, verified: dict | None) -> list[str]:
    """Phản biện số liệu: một dòng cho mỗi chuyên gia/chỉ số lệch, và mâu thuẫn giữa các chuyên gia với nhau."""
    notes: list[str] = []
    for name, v in verdicts.items():
        seen: set[str] = set()
        for t in [v.summary, *v.findings, *v.conditions]:
            for m in mismatches(t, verified):
                if m not in seen:
                    seen.add(m)
                    notes.append(f"Phản biện số liệu: {name} nêu {m}; bản tổng hợp chỉ dùng số đã tính lại từ công cụ")
    return notes


_BLOCKING = re.compile(r"^\s*(chưa|không)\s+thể\s+phê\s+duyệt\s*[:\-–—]?\s*", re.IGNORECASE)


def unblock_for_approval(text: str) -> str:
    """Kết luận đề xuất phê duyệt thì điều kiện không được ghi 'Chưa thể phê duyệt': giữ việc cần làm, bỏ tiền tố."""
    s = _BLOCKING.sub("", text)
    return (s[:1].upper() + s[1:]) if s != text else text
