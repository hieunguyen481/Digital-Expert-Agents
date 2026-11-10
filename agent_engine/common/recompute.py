"""Tính lại các chỉ số tín dụng từ dữ liệu gốc của core banking (thuần hàm, không LLM).

Validation dùng để kiểm chứng ĐỘC LẬP số liệu của chuyên gia: LTV, giới hạn bảo đảm,
tổng cấp tín dụng (Q4), cấp phê duyệt, bắt buộc kiểm toán BCTC (E5), Nợ vay/EBITDA sau cấp TD.
Ngưỡng lấy từ `common.config` / chính sách CS-TD-SME/2025, không gắn với hồ sơ cụ thể nào.
"""
from __future__ import annotations

from . import config

TIER_LIMITS_VND = (20e9, 100e9)   # ≤20 / 20–100 / >100 tỷ (BANK.TIERS)
AUDIT_THRESHOLD_VND = 20e9        # E5: tổng cấp tín dụng > 20 tỷ -> BCTC kiểm toán
DEBT_EBITDA_MAX = 3.5             # CS-TD-SME/2025 §4.2


def _num(x) -> float:
    try:
        return float(x or 0)
    except (TypeError, ValueError):
        return 0.0


def collateral_check(collaterals: list[dict], amount: float, ltv_max: float | None = None) -> dict:
    """LTV = khoản vay mới / tổng giá trị TSĐB đủ điều kiện (pháp lý rõ ràng)."""
    ltv_max = config.LTV_MAX if ltv_max is None else ltv_max
    eligible = [c for c in collaterals if c.get("legal_status") == "clear" and _num(c.get("valuation")) > 0]
    excluded = [c for c in collaterals if c not in eligible]
    value = sum(_num(c["valuation"]) for c in eligible)
    return {
        "assets": len(collaterals), "eligible_assets": len(eligible),
        "eligible_value": value, "max_secured_limit": ltv_max * value,
        "ltv": (amount / value) if value else None, "ltv_max": ltv_max,
        "ltv_over": bool(value) and amount > ltv_max * value + 1,
        "no_eligible_collateral": bool(collaterals) and not eligible,
        "excluded": [{"collateral_id": c.get("collateral_id"), "legal_status": c.get("legal_status"),
                      "valuation": _num(c.get("valuation"))} for c in excluded],
    }


def approver_level(total: float) -> str:
    """Cấp duyệt theo TỔNG cấp tín dụng (Q4, CS-TD-SME/2025 §3.1): nguồn duy nhất, khớp `credit.required_tier`."""
    if total <= TIER_LIMITS_VND[0]:
        return "branch_director"
    return "regional" if total <= TIER_LIMITS_VND[1] else "head_office"


def package_approver_level(exposure: dict | None, limit: float | None) -> str:
    """Cấp duyệt của gói: theo tổng cấp tín dụng đã tính lại (gồm dư nợ hiện hữu); thiếu thì theo hạn mức đề xuất."""
    total = (exposure or {}).get("total")
    return approver_level(_num(limit) if total is None else _num(total))


def exposure_check(loans: list[dict], amount: float) -> dict:
    """Q4: tổng cấp tín dụng = dư nợ hiện hữu tại ngân hàng + đề xuất mới."""
    existing = sum(_num(x.get("outstanding")) for x in loans)
    total = existing + amount
    level = approver_level(total)
    tier = "branch" if level == "branch_director" else level
    return {"existing": existing, "loans": len(loans), "total": total, "tier": tier,
            "audit_required": total > AUDIT_THRESHOLD_VND}


def leverage_check(financials: list[dict], loans: list[dict], amount: float) -> dict | None:
    """Nợ vay/EBITDA sau cấp TD = (tổng nợ vay trên BCTC, thiếu thì dư nợ hiện hữu) + khoản mới, chia EBITDA."""
    if not financials:
        return None
    latest = max(financials, key=lambda r: _num(r.get("year")))
    ebitda = _num(latest.get("ebitda"))
    if ebitda <= 0:
        return None
    base = _num(latest.get("total_debt")) or sum(_num(x.get("outstanding")) for x in loans)
    debt = base + amount
    ratio = debt / ebitda
    return {"year": latest.get("year"), "debt_after": debt, "ebitda": ebitda, "ratio": ratio,
            "max": DEBT_EBITDA_MAX, "over": ratio > DEBT_EBITDA_MAX}


def _bn(v: float) -> str:
    return f"{v / 1e9:,.1f} tỷ"


def describe(col: dict | None, exp: dict, lev: dict | None, amount: float) -> list[str]:
    """Các dòng kết quả tính lại, diễn đạt bằng số (đưa vào báo cáo cuối)."""
    out = [f"Tính lại tổng cấp tín dụng: dư nợ hiện hữu {_bn(exp['existing'])} + đề xuất {_bn(amount)} "
           f"= {_bn(exp['total'])}; "
           + ("vượt 20 tỷ nên BCTC kiểm toán bắt buộc" if exp["audit_required"]
              else "không vượt 20 tỷ nên chưa bắt buộc BCTC kiểm toán")
           + f" (CS-TD-SME/2025 §4.1, §6.1); cấp phê duyệt: {exp['tier']} (CS-TD-SME/2025 §3.1)"]
    if col is not None and col["assets"]:
        if col["eligible_value"]:
            out.append(f"Tính lại LTV: đề xuất {_bn(amount)} / TSĐB đủ điều kiện {_bn(col['eligible_value'])} "
                       f"= {col['ltv']:.1%} (tối đa {col['ltv_max']:.0%}, tương ứng {_bn(col['max_secured_limit'])})"
                       + ("; VƯỢT ngưỡng LTV" if col["ltv_over"] else "; trong ngưỡng LTV") + " (CS-TD-SME/2025 §7.1)")
        for x in col["excluded"]:
            out.append(f"TSĐB {x['collateral_id']} không tính vào LTV (pháp lý: {x['legal_status']}, "
                       f"giá trị {_bn(x['valuation'])})")
        if col["no_eligible_collateral"]:
            out.append("Không có TSĐB nào đủ điều kiện pháp lý để tính LTV")
    if lev:
        out.append(f"Tính lại Nợ vay/EBITDA sau cấp TD ({lev['year']}): {_bn(lev['debt_after'])} / "
                   f"{_bn(lev['ebitda'])} = {lev['ratio']:.2f} lần (tối đa {lev['max']}); "
                   + ("VƯỢT ngưỡng" if lev["over"] else "trong ngưỡng") + " (CS-TD-SME/2025 §4.2)")
    return out
