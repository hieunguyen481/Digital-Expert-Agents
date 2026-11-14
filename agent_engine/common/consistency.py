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


def _appraised_value(col: dict) -> float:
    """Giá trị TSĐB đã có định giá thẩm định (tỷ): phần đủ điều kiện trừ phần mới chỉ có giá khai/cần xác minh."""
    return max(0.0, (col.get("eligible_value") or 0) - (col.get("unverified_value") or 0)) / 1e9


def _is_policy_cap(text: str, m: re.Match, col: dict) -> bool:
    """Số sau "LTV" là trần chính sách chứ không phải LTV thực: trùng trần và vế đứng trước có chữ chỉ mức/chính sách."""
    if abs(_f(m.group(1)) - (col.get("ltv_max") or 0) * 100) > 0.05:
        return False
    lead = re.split(r"[.;\n]", text[max(0, m.start() - 60):m.start()])[-1]
    return bool(_POLICY_LEAD.search(lead))


def _collateral_totals(verified: dict) -> set[float]:
    col = verified.get("collateral")
    if not col:
        return set()
    excluded = sum(float(x.get("valuation") or 0) for x in col.get("excluded", []))
    return {col["eligible_value"] / 1e9, (col["eligible_value"] + excluded) / 1e9}


# Đòn bẩy sau cấp viết theo nhiều cách: "Nợ vay/EBITDA … X lần", "Nợ sau cấp 136 tỷ/EBITDA 98 tỷ = X lần", "Đòn bẩy … X lần"
_LEVERAGE = re.compile(r"(?:Nợ[^\n/]{0,60}/\s*EBITDA|Đòn bẩy(?:\s+tài\s+chính)?)[^\n]{0,90}?" + _NUM + r"\s*lần", re.IGNORECASE)
_THRESHOLD = re.compile(r"tối đa|trần|ngưỡng|giới hạn|không vượt|vượt|[≤≥<>]", re.IGNORECASE)
# Chữ đứng TRƯỚC "LTV" cho biết con số là mức chính sách ("hạn mức bảo đảm tối đa 14 tỷ theo LTV 70%", "mức LTV 70%")
_POLICY_LEAD = re.compile(r"tối đa|trần|ngưỡng|giới hạn|không vượt|theo|mức|chính sách|quy định|[≤≥<>]", re.IGNORECASE)
_PRE_LOAN = re.compile(r"trước\s+(?:khi\s+)?cấp|hiện hữu|hiện tại", re.IGNORECASE)


def leverage_mismatches(text: str, verified: dict | None) -> list[str]:
    """Đòn bẩy sau cấp nêu trong `text` (mọi cách viết) lệch số tính lại. Dùng cho cả trích dẫn bằng chứng."""
    lev = (verified or {}).get("leverage")
    out: list[str] = []
    for m in (_LEVERAGE.finditer(text) if lev and text else ()):
        if _THRESHOLD.search(m.group(0)) or _PRE_LOAN.search(m.group(0)):
            continue  # trần chính sách hoặc đòn bẩy trước cấp: không phải số sau cấp
        if abs(_f(m.group(1)) - lev["ratio"]) > 0.015:
            out.append(f"Nợ vay/EBITDA {m.group(1)} lần (tính lại {_fmt(lev['ratio'])} lần)")
    return out


def mismatches(text: str, verified: dict | None) -> list[str]:
    """Mô tả từng chỉ số trong `text` lệch số tính lại; rỗng nếu không lệch/không đủ dữ kiện để so."""
    if not verified or not text:
        return []
    out: list[str] = leverage_mismatches(text, verified)
    lev, col = verified.get("leverage"), verified.get("collateral")
    if lev:
        for m in re.finditer(r"EBITDA[^\n.]{0,25}?" + _NUM + r"\s*tỷ", text, re.IGNORECASE):
            if abs(_f(m.group(1)) - lev["ebitda"] / 1e9) > 0.05:
                out.append(f"EBITDA {m.group(1)} tỷ (số liệu BCTC {_fmt(lev['ebitda'] / 1e9, 1)} tỷ)")
        if re.search(r"(không|chưa)\s+(có|đủ)[^\n.]{0,15}EBITDA", text, re.IGNORECASE):
            out.append(f"không có EBITDA (BCTC ghi {_fmt(lev['ebitda'] / 1e9, 1)} tỷ)")
    dscr = _official_dscr(verified)
    if dscr:
        for m in re.finditer(r"DSCR[^\n]{0,60}?" + _NUM, text, re.IGNORECASE):
            if abs(_f(m.group(1)) - dscr) > 0.005:
                out.append(f"DSCR {m.group(1)} (số chính thức {_fmt(dscr)})")
    if col and col.get("ltv"):
        for m in re.finditer(r"LTV[^\n]{0,60}?" + _NUM + r"\s*%", text, re.IGNORECASE):
            if _THRESHOLD.search(m.group(0)) or _is_policy_cap(text, m, col):
                continue  # trần chính sách, không phải LTV thực tế
            if abs(_f(m.group(1)) - col["ltv"] * 100) > 0.6:
                out.append(f"LTV {m.group(1)}% (tính lại {_fmt(col['ltv'] * 100, 1)}%)")
    if col and col["assets"]:
        allowed = _collateral_totals(verified)
        for m in re.finditer(r"(?:định giá|giá trị TSĐB)[^\n.]{0,25}?" + _NUM + r"\s*tỷ", text, re.IGNORECASE):
            if allowed and all(abs(_f(m.group(1)) - a) > 0.05 for a in allowed):
                out.append(f"giá trị TSĐB {m.group(1)} tỷ (hồ sơ ghi {_fmt(max(allowed), 1)} tỷ)")
        # Chỉ phản biện khi hồ sơ THẬT SỰ có giá thẩm định: TSĐB mới có giá khai thì "chưa có định giá" là câu đúng
        appraised = _appraised_value(col)
        if re.search(r"chưa có[^\n.]{0,20}(giá trị )?định giá", text, re.IGNORECASE) and appraised > 0:
            out.append(f"chưa có định giá (hồ sơ ghi giá thẩm định {_fmt(appraised, 1)} tỷ)")
    return out


def check_verdicts(verdicts: dict, verified: dict | None) -> list[str]:
    """Phản biện số liệu: một dòng cho mỗi chuyên gia/chỉ số lệch, và mâu thuẫn giữa các chuyên gia với nhau."""
    notes: list[str] = []
    for name, v in verdicts.items():
        seen: set[str] = set()
        # trích dẫn bằng chứng chỉ quét đòn bẩy: số khác trong trích dẫn có thể là ngưỡng chính sách hay số nguồn gốc
        scans = [(t, mismatches) for t in [v.summary, *v.findings, *v.conditions]]
        scans += [(e.quote, leverage_mismatches) for e in v.evidence]
        for t, fn in scans:
            for m in fn(t, verified):
                if m not in seen:
                    seen.add(m)
                    notes.append(f"Phản biện số liệu: {name} nêu {m}; bản tổng hợp chỉ dùng số đã tính lại từ công cụ")
    return notes


_BLOCKING = re.compile(r"^\s*(chưa|không)\s+thể\s+(?:chốt\s+|chấp\s+thuận\s+|kết\s+luận\s+)?(?:phê\s+duyệt)?[^:;.]*?[:\-–—]\s*|"
                       r"^\s*(chưa|không)\s+thể\s+phê\s+duyệt\s*[:\-–—]?\s*", re.IGNORECASE)


def unblock_for_approval(text: str) -> str:
    """Kết luận đề xuất phê duyệt thì điều kiện không được ghi 'Chưa thể phê duyệt': giữ việc cần làm, bỏ tiền tố."""
    s = _BLOCKING.sub("", text)
    return (s[:1].upper() + s[1:]) if s != text else text
