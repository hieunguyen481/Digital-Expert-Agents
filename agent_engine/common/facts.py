"""Bảng dữ kiện chung của một hồ sơ: công cụ core banking được gọi MỘT lần, mọi chuyên gia đọc chung.

`build` là hàm thuần (không LLM, không I/O): từ kết quả công cụ tính lại tổng cấp tín dụng, LTV, Nợ vay/EBITDA và
phân loại khoảng trống dữ liệu thành *chặn thật* (blockers, không áp dụng được chính sách) so với *trường phụ*
(ancillary, nêu thành điều kiện bổ sung, rules.md Q7), kèm vi phạm ngưỡng (breaches) và dừng cứng (hard_stops).
"""
from __future__ import annotations

import asyncio
from datetime import date, datetime

from . import mcp_client, recompute

CIC_VALID_DAYS = 30  # CS-TD-SME/2025 §6.3


def _as_date(x) -> date | None:
    try:
        return datetime.fromisoformat(str(x)[:10]).date()
    except (TypeError, ValueError):
        return None


def build(raw: dict, request: dict, today: date | None = None) -> dict:
    today = today or date.today()
    amount = float(request.get("amount") or 0)
    biz, fin, loans = raw.get("business") or {}, raw.get("financials") or [], raw.get("loans") or []
    cic, bl, cols = raw.get("cic") or {}, raw.get("blacklist") or {}, raw.get("collateral") or []
    col = recompute.collateral_check(cols, amount) if cols else None
    exp = recompute.exposure_check(loans, amount)
    # Nợ vay lấy số CAO HƠN giữa BCTC và dư nợ hệ thống (CIC); lệch nhau là một phát hiện (đối chiếu số liệu).
    conflicts: list[str] = []
    fin_for_lev = fin
    cic_total = float(cic.get("total_outstanding") or 0)
    if fin:
        latest0 = max(fin, key=lambda f: f.get("year") or 0)
        bctc_debt = float(latest0.get("total_debt") or 0)
        if cic_total > bctc_debt > 0:
            fin_for_lev = [*[f for f in fin if f is not latest0], {**latest0, "total_debt": cic_total}]
            conflicts.append(f"BCTC ghi nợ vay {bctc_debt / 1e9:,.1f} tỷ nhưng CIC ghi {cic_total / 1e9:,.1f} tỷ ở "
                             "các TCTD: lấy số cao hơn để tính Nợ vay/EBITDA")
        inflow = (raw.get("inflow") or {}).get("verified_annual_inflow")
        revenue = float(latest0.get("revenue") or 0)
        if inflow and revenue and inflow < 0.7 * revenue:
            breaches_inflow = (f"Tiền về tài khoản 12 tháng {inflow / 1e9:,.1f} tỷ chỉ bằng {inflow / revenue:.0%} "
                               f"doanh thu BCTC {revenue / 1e9:,.1f} tỷ — cần đối chiếu số liệu")
        else:
            breaches_inflow = ""
    else:
        breaches_inflow = ""
    lev = recompute.leverage_check(fin_for_lev, loans, amount)
    blockers: list[str] = []
    breaches: list[str] = []
    hard_stops: list[str] = []
    ancillary: list[str] = []

    if bl.get("hit"):
        hard_stops.append("Chủ thể trùng khớp danh sách trừng phạt/AML — dừng cứng")
    group = cic.get("cic_group")
    if group is None:
        blockers.append("Chưa có kết quả tra cứu CIC — phải tra cứu trước khi trình (CS-TD-SME/2025 §6.1, §6.3)")
    else:
        if group >= 3:
            hard_stops.append(f"CIC nhóm {group}: không đủ điều kiện cấp tín dụng")
        d = _as_date(cic.get("report_date"))
        if d and (today - d).days > CIC_VALID_DAYS:
            blockers.append(f"Bản CIC tra cứu ngày {d.isoformat()} đã quá {CIC_VALID_DAYS} ngày, hết hiệu lực — "
                            "phải tra lại trước khi trình (CS-TD-SME/2025 §6.3, §6.4)")
    if not fin:
        blockers.append("Chưa có BCTC/số liệu tài chính — chưa tính được Nợ vay/EBITDA (CS-TD-SME/2025 §4.2, §6.1)")
    if biz and not biz.get("account_number"):
        blockers.append("Doanh nghiệp chưa có tài khoản thanh toán tại ngân hàng — cần mở tài khoản trước khi giải ngân")
    if breaches_inflow:
        breaches.append(breaches_inflow)
    if request.get("has_collateral"):
        if not cols:
            blockers.append("Khai có TSĐB nhưng không có hồ sơ tài sản trong core banking (CS-TD-SME/2025 §7.1)")
        elif col and col["no_eligible_collateral"]:
            blockers.append("Không có TSĐB nào rõ pháp lý để tính LTV (CS-TD-SME/2025 §7.1)")
    if col and col["ltv_over"]:
        breaches.append(f"LTV {col['ltv']:.1%} vượt trần {col['ltv_max']:.0%} (CS-TD-SME/2025 §7.1)")
    if lev and lev["over"]:
        breaches.append(f"Nợ vay/EBITDA sau cấp {lev['ratio']:.2f} lần vượt trần {lev['max']} (CS-TD-SME/2025 §4.2)")
    latest = max(fin, key=lambda f: f.get("year") or 0) if fin else {}
    dscr = (latest.get("reported_ratios") or {}).get("dscr")
    if dscr and dscr["value"] < 1.0:
        hard_stops.append(f"DSCR {dscr['value']:.2f} < 1,0: không đủ khả năng trả nợ")
    elif dscr and dscr["value"] < 1.25:
        breaches.append(f"DSCR {dscr['value']:.2f} dưới ngưỡng 1,25 (CS-TD-SME/2025 §4.2)")
    # Trường phụ: không chặn, nêu thành điều kiện bổ sung trước giải ngân (rules.md Q7)
    if fin and not dscr:
        ancillary.append("DSCR/lịch trả nợ dự phóng chưa có trong hồ sơ")
    if biz and not biz.get("legal_rep_name"):
        ancillary.append("người đại diện pháp luật chưa có trong hồ sơ")
    if latest.get("data_note"):
        ancillary.append(str(latest["data_note"]))
    if bl and not bl.get("screened", True):
        ancillary.append("chưa có kết quả tra cứu AML/trừng phạt")
    return {"amount": amount, "has_collateral_data": bool(cols), "collateral": col, "exposure": exp, "leverage": lev,
            "lines": recompute.describe(col, exp, lev, amount) + conflicts, "blockers": blockers, "breaches": breaches,
            "hard_stops": hard_stops, "ancillary": ancillary, "raw": raw}


_TOOLS = {"business": "get_business", "financials": "get_financials", "loans": "get_existing_loans",
          "cic": "get_cic_status", "blacklist": "check_blacklist", "collateral": "get_collateral",
          "inflow": "get_annual_inflow"}


async def gather(request: dict) -> dict:
    """Gọi mọi công cụ đọc song song, đúng một lần; lỗi từng công cụ thì để trống (không chặn hồ sơ)."""
    bid = request["business_id"]

    async def one(tool: str):
        try:
            return await mcp_client.call_tool(tool, {"business_id": bid})
        except Exception:  # noqa: BLE001
            return None

    res = await asyncio.gather(*[one(t) for t in _TOOLS.values()])
    raw = dict(zip(_TOOLS, res))
    for k in ("financials", "loans", "collateral"):
        raw[k] = raw[k] if isinstance(raw[k], list) else []
    return build(raw, request)
