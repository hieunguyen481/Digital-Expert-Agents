"""Bảng dữ kiện chung của một hồ sơ: công cụ core banking được gọi MỘT lần, mọi chuyên gia đọc chung.

`build` là hàm thuần (không LLM, không I/O): từ kết quả công cụ tính lại tổng cấp tín dụng, LTV, Nợ vay/EBITDA và
phân loại khoảng trống dữ liệu thành *chặn thật* (blockers, không áp dụng được chính sách) so với *trường phụ*
(ancillary, nêu thành điều kiện bổ sung, rules.md Q7), kèm vi phạm ngưỡng (breaches) và dừng cứng (hard_stops).
"""
from __future__ import annotations

import asyncio
from datetime import date, datetime

from . import config, labels, mcp_client, recompute

CIC_VALID_DAYS = 30  # CS-TD-SME/2025 §6.3; rules.md Q10: hiệu lực đến hết ngày tra cứu + 29


def _as_date(x) -> date | None:
    try:
        return datetime.fromisoformat(str(x)[:10]).date()
    except (TypeError, ValueError):
        return None


def _weak_indicators(fin: list[dict]) -> list[str]:
    """Chỉ tiêu xấu có sẵn trong số liệu (EBITDA âm, vốn chủ sở hữu âm) -> dòng số tính lại, để chuyên gia nêu."""
    out: list[str] = []
    for f in sorted(fin, key=lambda x: x.get("year") or 0):
        for key, label in (("ebitda", "EBITDA"), ("equity", "Vốn chủ sở hữu")):
            v = f.get(key)
            if isinstance(v, (int, float)) and v < 0:
                out.append(f"Chỉ tiêu xấu: {label} năm {f.get('year')} âm ({v / 1e9:,.1f} tỷ)")
    return out


def build(raw: dict, request: dict, today: date | None = None) -> dict:
    today = today or date.today()
    amount = float(request.get("amount") or 0)
    biz, fin, loans = raw.get("business") or {}, raw.get("financials") or [], raw.get("loans") or []
    cic, bl = raw.get("cic") or {}, raw.get("blacklist") or {}
    # CX1: hồ sơ không khai TSĐB thì không tính LTV bằng tài sản của khoản vay khác của khách
    cols = (raw.get("collateral") or []) if request.get("has_collateral") else []
    col = recompute.collateral_check(cols, amount) if cols else None
    bank = raw.get("bank_exposure")
    bank_existing = bank.get("existing_bank_exposure") if isinstance(bank, dict) else None
    exp = recompute.exposure_check(loans, amount, bank_existing)
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
    conflicts.extend(_weak_indicators(fin))
    blockers: list[str] = []
    breaches: list[str] = []
    hard_stops: list[str] = []
    ancillary: list[str] = []

    if bl.get("hit"):
        hard_stops.append(f"Chủ thể {labels.sanction_phrase(bl)} — dừng cứng")
    group = cic.get("cic_group")
    if group is None:
        blockers.append("Chưa có kết quả tra cứu CIC — phải tra cứu trước khi trình (CS-TD-SME/2025 §6.1, §6.3)")
    else:
        if group >= 3:
            hard_stops.append(f"CIC nhóm {group}: không đủ điều kiện cấp tín dụng")
        d = _as_date(cic.get("report_date"))
        if d and (today - d).days > CIC_VALID_DAYS - 1:
            blockers.append(f"Bản CIC tra cứu ngày {d.isoformat()} đã quá {CIC_VALID_DAYS} ngày, hết hiệu lực — "
                            "phải tra lại trước khi trình (CS-TD-SME/2025 §6.3, §6.4)")
    if bl and not bl.get("screened", True):
        blockers.append("Chưa có kết quả sàng lọc AML/trừng phạt — phải hoàn tất trước khi trình (tra cứu danh sách đen/trừng phạt; "
                        "chính sách tuân thủ Điều 6)")
    if not fin:
        blockers.append("Chưa có BCTC/số liệu tài chính — chưa tính được Nợ vay/EBITDA (CS-TD-SME/2025 §4.2, §6.1)")
    if biz and not biz.get("account_number"):
        ancillary.append("Mở tài khoản thanh toán tại ngân hàng cho doanh nghiệp trước giải ngân (không chặn trình)")
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
    elif dscr and dscr["value"] < config.DSCR_MIN:
        breaches.append(f"DSCR {dscr['value']:.2f} dưới ngưỡng {config.DSCR_MIN:g} (CS-TD-SME/2025 §4.2)")
    dscr_line = ([f"DSCR chính thức của hồ sơ = {dscr['value']:.2f} (số đã ghi, trạng thái {dscr['status']}; ngưỡng "
                  f"{config.DSCR_MIN:g}, CS-TD-SME/2025 §4.2). Chỉ dùng số này làm DSCR; các số tính lại ở cảnh báo chỉ để đối chiếu, "
                  "không coi là DSCR khác"] if dscr else [])
    # Trường phụ: không chặn, nêu thành điều kiện bổ sung trước giải ngân (rules.md Q7)
    if fin and not dscr:
        ancillary.append("Bổ sung lịch trả nợ dự phóng để tính DSCR trước giải ngân (không chặn trình)")
    if biz and not biz.get("legal_rep_name"):
        ancillary.append("Bổ sung thông tin người đại diện pháp luật vào hồ sơ trước giải ngân (không chặn trình)")
    if latest.get("data_note"):
        ancillary.append("Bổ sung trước giải ngân (không chặn trình): " + str(latest["data_note"]))
    return {"amount": amount, "has_collateral_data": bool(cols), "collateral": col, "exposure": exp, "leverage": lev,
            "lines": recompute.describe(col, exp, lev, amount) + dscr_line + conflicts, "blockers": blockers, "breaches": breaches,
            "hard_stops": hard_stops, "ancillary": ancillary, "raw": raw}


def tool_args(key: str, request: dict) -> dict:
    args = {"business_id": request["business_id"]}
    if key == "bank_exposure" and request.get("loan_application_id"):
        args["loan_application_id"] = str(request["loan_application_id"])
    return args


_TOOLS = {"business": "get_business", "financials": "get_financials", "loans": "get_existing_loans",
          "cic": "get_cic_status", "blacklist": "check_blacklist", "collateral": "get_collateral",
          "inflow": "get_annual_inflow", "bank_exposure": "get_bank_exposure"}


async def gather(request: dict) -> dict:
    """Gọi mọi công cụ đọc song song, đúng một lần; lỗi từng công cụ thì để trống (không chặn hồ sơ)."""
    async def one(key: str, tool: str):
        try:
            return await mcp_client.call_tool(tool, tool_args(key, request))
        except Exception:  # noqa: BLE001
            return None

    res = await asyncio.gather(*[one(k, t) for k, t in _TOOLS.items()])
    raw = dict(zip(_TOOLS, res))
    for k in ("financials", "loans", "collateral"):
        raw[k] = raw[k] if isinstance(raw[k], list) else []
    return build(raw, request)


_SCOPES = {"credit": ("financials", "loans", "inflow"),
           "compliance": ("business", "blacklist", "cic", "collateral")}


def scoped_text(facts: dict, scope: str) -> str:
    """Phần bảng dữ kiện thuộc chuyên môn của agent (ngữ cảnh hẹp) + số đã tính lại, dạng JSON gọn cho prompt."""
    import json
    raw = facts.get("raw") or {}
    data = {k: raw.get(k) for k in _SCOPES[scope]}
    data["so_tinh_lai"] = facts.get("lines")
    return json.dumps(data, ensure_ascii=False, default=str, separators=(",", ":"))


LLM_HINT = (" Nếu so_tinh_lai có dòng 'Chỉ tiêu xấu' thì nêu chỉ tiêu đó trong findings. Trích dẫn (quote) và findings viết "
            "bằng tiếng Việt nghiệp vụ, không chép nguyên tên khóa hay chữ tiếng Anh từ dữ kiện.")
COMPACT_HINT = " Trả lời ngắn: tối đa 5 findings, mỗi câu dưới 30 từ; evidence tối đa 4 mục, quote dưới 200 ký tự."
