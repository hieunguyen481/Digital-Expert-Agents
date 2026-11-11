"""Bảng nhãn tiếng Việt DUY NHẤT cho khóa kỹ thuật lộ ra người dùng (L07): tên dữ kiện công cụ, tên công cụ, trạng thái, số tiền.

Dịch tại điểm ghi sự kiện/gói kết quả (gateway.db), nên khung đội agent, trace, chat và lý do của Planner đều đọc bản đã dịch.
Bản gốc của trích nguồn giữ ở `raw_quote` để hiện trong phần chi tiết kỹ thuật thu gọn dành cho kiểm toán.
"""
from __future__ import annotations

import re
from typing import Any

FIELD = {
    "total_debt": "tổng nợ vay", "debt_service": "nghĩa vụ trả nợ hằng năm", "ebitda": "EBITDA", "equity": "vốn chủ sở hữu",
    "revenue": "doanh thu", "current_assets": "tài sản ngắn hạn", "current_liabilities": "nợ ngắn hạn",
    "verified_annual_inflow": "tiền về tài khoản 12 tháng đã xác minh", "kyc_status": "trạng thái KYC",
    "aml_risk_level": "mức rủi ro AML", "pep_status": "trạng thái PEP", "cic_group": "nhóm nợ CIC",
    "overdue_amount": "dư nợ quá hạn", "total_outstanding": "tổng dư nợ", "outstanding": "dư nợ",
    "monthly_payment": "số trả nợ hằng tháng", "report_date": "ngày tra cứu CIC", "valuation_status": "trạng thái định giá",
    "valuation_basis": "cơ sở định giá", "valuation": "giá trị định giá", "legal_status": "tình trạng pháp lý",
    "collateral_id": "mã tài sản bảo đảm", "has_collateral": "có khai tài sản bảo đảm", "draft_id": "mã bản nháp",
    "max_secured_limit": "hạn mức bảo đảm tối đa", "industry_risk": "rủi ro ngành", "account_number": "số tài khoản",
    "legal_rep_name": "người đại diện pháp luật", "legal_rep_cccd": "CCCD người đại diện", "business_id": "mã khách hàng",
    "existing_bank_exposure": "dư nợ hiện hữu tại ngân hàng", "screened": "đã sàng lọc", "hit": "trùng danh sách",
    "term_months": "kỳ hạn (tháng)", "loan_application_id": "mã hồ sơ vay", "kyc_assessment": "đánh giá KYC",
    "industry": "ngành", "established_year": "năm thành lập", "verified_status": "trạng thái xác minh",
    "sanction_status": "kết quả sàng lọc trừng phạt",
}
STATUS = {
    "NEEDS_VERIFICATION": "cần xác minh", "VERIFIED": "đã xác minh", "CONFIRMED": "đã xác nhận", "PENDING": "chờ xử lý",
    "NOT_PEP": "không thuộc diện PEP", "LOW": "thấp", "MEDIUM": "trung bình", "HIGH": "cao", "CLEAR": "không trùng",
    "need_more_info": "cần thêm thông tin", "approve": "đồng ý", "reject": "từ chối", "flag": "đồng ý có điều kiện",
    "dry-run": "chạy thử, chưa ghi", "dry_run": "chạy thử, chưa ghi", "clear": "rõ ràng", "pending": "chưa hoàn thiện",
    "branch_director": "Giám đốc chi nhánh (cấp 1)", "head_office_l2": "Cấp 2 Hội sở", "head_office": "Cấp 2 Hội sở",
    "council": "Hội đồng tín dụng", "POSSIBLE_MATCH": "có thể trùng danh sách, cần rà soát",
    "ai_proposed": "do AI đề xuất, chưa xác nhận", "pending_registration": "đang chờ đăng ký", "encumbered": "đang bị ràng buộc",
    "disputed": "đang tranh chấp", "unknown": "chưa rõ", "NEEDS_REVIEW": "cần rà soát",
    "declared": "giá trị khai báo", "appraised": "giá trị thẩm định", "eligible": "giá trị đủ điều kiện",
}
TOOL = {
    "create_loan_draft": "tạo bản nháp hồ sơ vay", "get_business": "hồ sơ doanh nghiệp (KYB)",
    "get_financials": "báo cáo tài chính các năm", "get_existing_loans": "khoản vay hiện hữu",
    "get_cic_status": "tra cứu CIC", "check_blacklist": "tra danh sách đen/trừng phạt", "get_collateral": "tài sản bảo đảm",
    "get_annual_inflow": "tiền về tài khoản 12 tháng", "get_bank_exposure": "dư nợ tại ngân hàng",
    "commit_loan": "tạo khoản vay", "create_disbursement_schedule": "lập lịch giải ngân",
}
# Nguồn trích dẫn: bảng dữ liệu, tệp corpus, khóa nội bộ -> tên nguồn nghiệp vụ (chi tiết thô chỉ ở `raw_source`)
SOURCE = {
    "customer.kyc_assessment": "Đánh giá KYC của khách hàng", "customer.customer": "Hồ sơ khách hàng",
    "customer.organization_profile": "Hồ sơ doanh nghiệp", "customer.person_profile": "Hồ sơ cá nhân",
    "credit.loan_account": "Khoản vay hiện hữu", "credit.customer_exposure": "Tổng dư nợ của khách",
    "credit.collateral": "Hồ sơ tài sản bảo đảm", "credit.existing_obligation": "Nghĩa vụ nợ hiện hữu",
    "credit.sme_financial_year": "Báo cáo tài chính các năm", "banking.credit_report": "Báo cáo CIC",
    "banking.credit_facility": "Hạn mức tín dụng hiện hữu", "banking.account_holder": "Chủ tài khoản",
    "banking.account_monthly_summary": "Tiền về tài khoản theo tháng", "banking.account": "Tài khoản thanh toán",
    "document.extracted_field": "Trường trích xuất từ tài liệu", "document.document": "Tài liệu hồ sơ",
    "document.document_version": "Tài liệu hồ sơ",
    "so_tinh_lai": "Số tính lại từ công cụ", "validation": "Kiểm chứng của Validation", "llm": "Phân tích của chuyên gia",
    "compliance_policy": "Quy định tuân thủ nội bộ", "ops_procedures": "Quy trình vận hành nội bộ",
    "shared_cs_td_sme_2025": "Chính sách tín dụng SME 2025 (CS-TD-SME/2025)",
}
_TABLE = re.compile(r"\b(?:customer|credit|banking|document|agent|audit)\.[a-z_]+\b")
_EMPTY = re.compile(r"""\b([a-z_]+)\s*[:=]\s*["']?(?:\[\]|\{\}|None|null)["']?""")
_EMPTY_LABEL = {"collateral": "tài sản bảo đảm", "loans": "khoản vay hiện hữu", "financials": "báo cáo tài chính",
                "documents": "tài liệu", "findings": "phát hiện", "conditions": "điều kiện"}


LEGAL = {"clear": "pháp lý rõ ràng", "pending": "pháp lý chưa hoàn thiện", "ai_proposed": "do AI đề xuất, chưa được xác nhận",
         "unknown": "chưa rõ pháp lý", "not_verified": "chưa xác minh quyền sở hữu", "rejected": "xác minh không đạt"}


def legal_vi(status) -> str:
    """Tình trạng pháp lý của tài sản bảo đảm bằng tiếng Việt; giá trị lạ thì nói chưa rõ, không lộ enum thô."""
    return LEGAL.get(str(status or "unknown").lower(), "chưa rõ pháp lý")


def collateral_name(c: dict, index: int | None = None) -> str:
    """Tên gọi tài sản cho người đọc: mô tả, hoặc loại, hoặc số thứ tự; không bao giờ là mã UUID."""
    d = str(c.get("description") or "").strip()
    if d:
        return d if len(d) <= 60 else d[:57].rstrip() + "..."
    t = str(c.get("type") or "").strip().replace("_", " ").lower()
    n = f" số {index}" if index else ""
    return f"tài sản bảo đảm{n}" + (f" ({t})" if t else "")


def sanction_phrase(bl: dict) -> str:
    """Kết quả sàng lọc có trùng: khớp hẳn thì nói trùng; POSSIBLE_MATCH chỉ là có thể trùng, cần rà soát."""
    reason = str((bl.get("detail") or {}).get("reason") or "")
    if "POSSIBLE_MATCH" in reason:
        return "có thể trùng danh sách trừng phạt/AML, cần rà soát"
    return "trùng khớp danh sách trừng phạt/AML"


def humanize_source(s: str) -> str:
    """Tên nguồn nghiệp vụ; điều khoản chính sách (có §/Điều) và nguồn đã là tiếng Việt giữ nguyên."""
    if not isinstance(s, str) or not s:
        return s
    parts = [p.strip() for p in s.split("+")] if "+" in s and "§" not in s else [s.strip()]

    def one(p: str) -> str:
        name = re.sub(r"\.md$", "", p.removeprefix("core-banking:"))
        if name in SOURCE:
            return SOURCE[name]
        if p.startswith("core-banking:") and name in TOOL:
            return TOOL[name][:1].upper() + TOOL[name][1:]
        if _TABLE.fullmatch(name):
            return "Dữ liệu core banking"
        return p
    return " + ".join(dict.fromkeys(one(p) for p in parts))


_VALUE = {"None": "không có", "null": "không có", "True": "có", "False": "không", "true": "có", "false": "không"}
# chỉ các khóa văn bản người đọc; không đụng enum/id máy đọc (decision, agent, kind...)
TEXT_KEYS = frozenset({"summary", "findings", "conditions", "quote", "rationale", "objective", "title", "text", "narrative",
                       "recommendation", "trace_summary", "reason", "report_text", "warnings", "note", "lines"})

_TERMS = {**{k: v for k, v in FIELD.items()}, **TOOL, **STATUS}
_KV = re.compile(r"\b(" + "|".join(map(re.escape, sorted(FIELD, key=len, reverse=True))) + r")\b\s*(?:[:=]\s*)?"
                 r"(None|null|True|False|true|false)\b")
_WORD = re.compile(r"(?<![\w-])(" + "|".join(map(re.escape, sorted(_TERMS, key=len, reverse=True))) + r")(?![\w-])")
_MONEY = re.compile(r"(?<![\w.,*-])(\d{1,3}(?:,\d{3}){2,}|\d{7,})(?:\.0+)?(?![\w*-])(?!,\d)(?!\s*%)")
_DEC = re.compile(r"(?<![\w§.])(\d+)\.(\d+)(?=\s*(?:tỷ|%|lần|triệu)\b|%)")
_DRAFT = re.compile(r"(?:\bdraft_id\s*[:=]\s*)?\bdraft-case_\w+,?\s*")
_COUNT = re.compile(r"\bcount\s*=\s*(\d+)")
# câu tiếng Anh/khóa nội bộ do LLM chép nguyên từ kết quả công cụ vào trích dẫn
_EN = (
    (re.compile(r"\bVerified annual inflow\b\s*", re.I), "tiền về tài khoản 12 tháng đã xác minh "),
    (re.compile(r",\s*months\s+(\d+)", re.I), r", \1 tháng"),
    (re.compile(r"\bblacklist\.(?=\s*(?:hit|trùng danh sách))", re.I), ""),
    (re.compile(r"\bblacklist\b\.?", re.I), "danh sách đen/trừng phạt"),
    (re.compile(r"\bevidence\b", re.I), "trích dẫn"),
    (re.compile(r"\bverdicts?\b", re.I), "kết luận chuyên gia"),
    (re.compile(r"\binflow\b", re.I), "tiền về"),
    (re.compile(r"\bDU_LIEU_MAU-?", re.I), ""),
)
_DSCR = re.compile(r"(DSCR[^\d\n]{0,15}?)(\d+)\.(\d+)")


def vn_money(v: float) -> str:
    """Số tiền kiểu Việt Nam: 80 tỷ / 1,5 tỷ / 250 triệu / 12.345.678 đồng."""
    if v >= 1e9:
        s = f"{v / 1e9:,.2f}".rstrip("0").rstrip(".")
        return s.replace(",", "§").replace(".", ",").replace("§", ".") + " tỷ"
    if v >= 1e6 and v % 1e6 == 0:
        return f"{int(v // 1e6):,}".replace(",", ".") + " triệu"
    return f"{int(v):,}".replace(",", ".") + " đồng"


def humanize(text: str) -> str:
    """Dịch khóa kỹ thuật, trạng thái, tên công cụ, số tiền trong một câu; câu không có mã thô giữ nguyên."""
    if not isinstance(text, str) or not text:
        return text
    t = _EMPTY.sub(lambda m: f"{_EMPTY_LABEL.get(m.group(1), FIELD.get(m.group(1), m.group(1)))}: không có", text)
    t = _TABLE.sub(lambda m: SOURCE.get(m.group(0), "dữ liệu core banking"), t)
    t = _DRAFT.sub("", t)
    t = _COUNT.sub(lambda m: f"số lượng {m.group(1)}", t)
    t = _KV.sub(lambda m: f"{FIELD[m.group(1)]}: {_VALUE[m.group(2)]}", t)
    t = _WORD.sub(lambda m: _TERMS[m.group(1)], t)
    for rx, rep in _EN:
        t = rx.sub(rep, t)
    t = _MONEY.sub(lambda m: vn_money(float(m.group(1).replace(",", ""))), t)
    t = _DSCR.sub(lambda m: f"{m.group(1)}{m.group(2)},{m.group(3)}", t)
    return _DEC.sub(lambda m: f"{m.group(1)},{m.group(2)}", t)


def humanize_payload(obj: Any, _key: str | None = None) -> Any:
    """Duyệt payload: chỉ dịch các khóa văn bản (TEXT_KEYS); trích nguồn đã dịch giữ bản gốc ở `raw_quote`."""
    if isinstance(obj, dict):
        out = {k: humanize_payload(v, k) for k, v in obj.items()}
        src = obj.get("source")
        if isinstance(src, str) and "quote" in obj and humanize_source(src) != src and "source_label" not in out:
            out["source_label"] = humanize_source(src)  # `source` giữ nguyên (đối chiếu/benchmark); UI hiện source_label
        q = obj.get("quote")
        if isinstance(q, str) and out.get("quote") != q and "raw_quote" not in out:
            out["raw_quote"] = q
        return out
    if isinstance(obj, list):
        return [humanize_payload(v, _key) for v in obj]
    if isinstance(obj, str) and _key in TEXT_KEYS:
        return humanize(obj)
    return obj
