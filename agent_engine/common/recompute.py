"""Tính lại các chỉ số tín dụng từ dữ liệu gốc của core banking (thuần hàm, không LLM).

Validation dùng để kiểm chứng ĐỘC LẬP số liệu của chuyên gia: LTV, giới hạn bảo đảm,
tổng cấp tín dụng (Q4), cấp phê duyệt, bắt buộc kiểm toán BCTC (E5), Nợ vay/EBITDA sau cấp TD.
Ngưỡng lấy từ `common.config` / chính sách CS-TD-SME/2025, không gắn với hồ sơ cụ thể nào.
"""
from __future__ import annotations

from . import config
from .labels import collateral_name, legal_vi

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
    # F3 (rules.md): giá lấy từ giá khai, chưa có chứng thư định giá -> LTV chỉ là tạm tính, "Cần xác minh"
    unverified = [c for c in eligible if c.get("valuation_basis") == "declared"
                  or c.get("valuation_status") == "NEEDS_VERIFICATION"]
    unverified_value = sum(_num(c["valuation"]) for c in unverified)
    return {
        "valuation_unverified": bool(unverified), "unverified_value": unverified_value,
        "assets": len(collaterals), "eligible_assets": len(eligible),
        "eligible_value": value, "max_secured_limit": ltv_max * value,
        "ltv": (amount / value) if value else None, "ltv_max": ltv_max,
        "ltv_over": bool(value) and amount > ltv_max * value + 1,
        "no_eligible_collateral": bool(collaterals) and not eligible,
        "excluded": [{"collateral_id": c.get("collateral_id"), "legal_status": c.get("legal_status"),
                      "name": collateral_name(c, i), "valuation": _num(c.get("valuation"))}
                     for i, c in enumerate(collaterals, 1) if c in excluded],
    }


LEVEL_LABEL_VI = {"branch_director": "Giám đốc chi nhánh (cấp 1)", "head_office_l2": "Cấp 2 Hội sở",
                  "council": "Hội đồng tín dụng"}


def approver_level(total: float) -> str:
    """Cấp duyệt theo TỔNG cấp tín dụng (Q4: ≤20 chi nhánh / 20–100 Cấp 2 Hội sở / >100 Hội đồng, Q-P): nguồn duy
    nhất, khớp `credit.required_tier`."""
    if total <= TIER_LIMITS_VND[0]:
        return "branch_director"
    return "head_office_l2" if total <= TIER_LIMITS_VND[1] else "council"


def package_approver_level(exposure: dict | None, limit: float | None) -> str:
    """Cấp duyệt của gói: theo tổng cấp tín dụng đã tính lại (gồm dư nợ hiện hữu); thiếu thì theo hạn mức đề xuất."""
    total = (exposure or {}).get("total")
    return approver_level(_num(limit) if total is None else _num(total))


def exposure_check(loans: list[dict], amount: float, bank_existing: float | None = None) -> dict:
    """Q4: tổng cấp tín dụng = dư nợ hiện hữu TẠI NGÂN HÀNG + đề xuất mới. `bank_existing` lấy từ công cụ
    get_bank_exposure (cùng cách tính backend credit.total_credit_exposure); thiếu thì coi là 0, không đoán theo tên chủ nợ.
    Dư nợ ở TCTD khác (`loans`, credit.existing_obligation) không tính vào cấp phê duyệt, chỉ vào khả năng trả nợ."""
    existing = _num(bank_existing)
    other_lenders = sum(_num(x.get("outstanding")) for x in loans)
    total = existing + amount
    level = approver_level(total)
    tier = level
    return {"existing": existing, "other_lenders": other_lenders, "loans": len(loans), "total": total, "tier": tier,
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
    out = [f"Tính lại tổng cấp tín dụng: dư nợ hiện hữu tại ngân hàng {_bn(exp['existing'])} + đề xuất {_bn(amount)} "
           f"= {_bn(exp['total'])}; "
           + ("vượt 20 tỷ nên BCTC kiểm toán bắt buộc" if exp["audit_required"]
              else "không vượt 20 tỷ nên chưa bắt buộc BCTC kiểm toán")
           + f" (CS-TD-SME/2025 §4.1, §6.1); cấp phê duyệt: {LEVEL_LABEL_VI[exp['tier']]} (CS-TD-SME/2025 §3.1)"]
    if exp.get("other_lenders"):
        out.append(f"Căn cứ cấp phê duyệt: tổng tại ngân hàng {_bn(exp['total'])}; dư nợ {_bn(exp['other_lenders'])} tại tổ "
                   "chức tín dụng khác không tính vào cấp phê duyệt theo quy tắc tính tổng cấp tín dụng (CS-TD-SME/2025 §3.1), nhưng vẫn tính vào khả năng trả nợ")
    if col is not None and col["assets"]:
        if col["eligible_value"] and col.get("valuation_unverified"):
            out.append(f"LTV tạm tính {col['ltv']:.1%} (đề xuất {_bn(amount)} / {_bn(col['eligible_value'])}, "
                       f"trong đó {_bn(col['unverified_value'])} là giá khai), chưa có chứng thư định giá: cần xác minh "
                       f"(CS-TD-SME/2025 §7.1)")
        elif col["eligible_value"]:
            out.append(f"Tính lại LTV: đề xuất {_bn(amount)} / TSĐB đủ điều kiện {_bn(col['eligible_value'])} "
                       f"= {col['ltv']:.1%} (tối đa {col['ltv_max']:.0%}, tương ứng {_bn(col['max_secured_limit'])})"
                       + ("; VƯỢT ngưỡng LTV" if col["ltv_over"] else "; trong ngưỡng LTV") + " (CS-TD-SME/2025 §7.1)")
        for x in col["excluded"]:
            out.append(f"{x['name'][:1].upper() + x['name'][1:]} không tính vào LTV (pháp lý: {legal_vi(x['legal_status'])}, "
                       f"giá trị {_bn(x['valuation'])})")
        if col["no_eligible_collateral"]:
            out.append("Không có TSĐB nào đủ điều kiện pháp lý để tính LTV")
    if lev:
        out.append(f"Tính lại Nợ vay/EBITDA sau cấp TD ({lev['year']}): {_bn(lev['debt_after'])} / "
                   f"{_bn(lev['ebitda'])} = {lev['ratio']:.2f} lần (tối đa {lev['max']}); "
                   + ("VƯỢT ngưỡng" if lev["over"] else "trong ngưỡng") + " (CS-TD-SME/2025 §4.2)")
    return out
