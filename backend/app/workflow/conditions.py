"""Bảng điều kiện gửi HTTD của trang 04 (lát 7), dựng từ chính dữ kiện của cổng `rm_submit`.

Không có luật riêng: mỗi dòng là một mã chặn của `gates.evaluate`, nên bảng và việc chuyển bước
không thể lệch nhau. Dòng KÈM CỜ là điều kiện không chặn nhưng được chuyển sang bước sau.
"""

from __future__ import annotations

from typing import Any

from app.workflow.gates import CIC_DOCUMENT_TYPES, GateFacts, GateResult

# (mã dòng, các mã chặn của cổng, nhãn, phần của trang để sửa)
_ROWS: tuple[tuple[str, tuple[str, ...], str, str], ...] = (
    ("DOCS", ("DOC_MISSING", "DOC_EXPIRED"), "Tài liệu bắt buộc đủ, còn hiệu lực (hoặc có đề xuất ngoại lệ)", "docs"),
    ("CIC", ("CIC_EXPIRED_NO_EXCEPTION",), "Kết quả tra cứu CIC còn hiệu lực đến ngày trình", "docs"),
    ("CONSENT", ("CONSENT_MISSING",), "Văn bản đồng ý tra CIC có hiệu lực", "docs"),
    ("AI_CONFIRMED", ("AI_UNCONFIRMED",), "Mọi giá trị do AI điền đã được người xác nhận", "need"),
    ("RELATED_PARTIES", ("RELATED_PARTY_UNCONFIRMED",), "Đã xác nhận nhóm khách hàng liên quan", "related"),
    ("LEASE", ("LEASE_PAYMENT_UNSET",), "Đã chọn cách trả tiền thuê đất cho tài sản trên đất thuê", "collateral"),
    ("AUDITED_FS", ("AUDITED_FS_REQUIRED",), "Có BCTC kiểm toán khi tổng cấp tín dụng trên 20 tỷ", "docs"),
)
_CARRIED_LABELS = {
    "CIC_OUTAGE": "Hệ thống CIC gián đoạn: chuyển kèm cờ",
    "NEEDS_VERIFICATION": "Có trường cần kiểm chứng: chuyển kèm cờ",
    "NOT_IN_GROUP": "Có bên được xác nhận không thuộc nhóm: chuyển kèm cờ",
    "LEASE_ANNUAL": "Tiền thuê đất trả hằng năm: chuyển kèm cờ",
    "LEASE_ONE_TIME_NO_PROOF": "Thuê đất trả một lần chưa có chứng từ: chuyển kèm cờ",
}


_DOC_NAMES = {
    "SME-01-CREDIT-REQUEST": "Giấy đề nghị cấp tín dụng",
    "SME-02-BUSINESS-REGISTRATION": "Giấy chứng nhận đăng ký doanh nghiệp",
    "SME-03-CHARTER": "Điều lệ công ty",
    "SME-04-SHAREHOLDERS-RELATED": "Danh sách cổ đông và bên liên quan",
    "SME-05-REPRESENTATIVE-ID": "Giấy tờ tùy thân người đại diện",
    "SME-06-BOARD-RESOLUTION": "Nghị quyết về vay vốn",
    "SME-07-CIC-CONSENT": "Văn bản đồng ý tra cứu CIC",
    "SME-08-AUDITED-FS": "BCTC năm đã kiểm toán",
    "SME-09-QUARTERLY-FS": "BCTC quý gần nhất",
    "SME-10-RECEIVABLES-INVENTORY": "Bảng kê công nợ phải thu và hàng tồn kho",
    "SME-11-BANK-STATEMENT-12M": "Sao kê tài khoản 12 tháng",
    "SME-12-VAT-RETURNS": "Tờ khai thuế GTGT",
    "SME-13-CIC-REPORT": "Kết quả tra cứu CIC",
    "SME-14-BUSINESS-PLAN": "Phương án kinh doanh và sử dụng vốn",
    "SME-15-SALES-CONTRACTS": "Hợp đồng đầu ra",
    "SME-16-COLLATERAL": "Hồ sơ tài sản bảo đảm",
}


def _detail(code: str, facts: GateFacts) -> str | None:
    if code == "DOCS":
        short = [_DOC_NAMES.get(i.code, i.code) for i in facts.checklist if i.mandatory and not i.has_exception
                 and (not i.has_document or i.expired or i.status in {"REQUIRED", "INCOMPLETE", "EXPIRED"}) and i.document_type not in CIC_DOCUMENT_TYPES
                 and i.status not in {"WAIVED", "NOT_APPLICABLE"}]
        return f"Còn thiếu hoặc hết hạn: {', '.join(short)}" if short else None
    if code == "AI_CONFIRMED" and facts.ai_proposed_fields:
        return f"{facts.ai_proposed_fields} giá trị chờ xác nhận"
    if code == "RELATED_PARTIES" and facts.proposed_related_parties:
        return f"{facts.proposed_related_parties} bên chờ xác nhận"
    if code == "LEASE" and facts.lease_unset:
        return f"{facts.lease_unset} tài sản chưa chọn"
    if code == "AUDITED_FS" and facts.total_credit_exposure is not None:
        return f"Tổng cấp tín dụng {facts.total_credit_exposure:,.0f} VND".replace(",", ".")
    return None


def build_conditions(facts: GateFacts, result: GateResult) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for code, blockers, label, section in _ROWS:
        met = not any(b in result.blockers for b in blockers)
        rows.append({"code": code, "label": label, "kind": "BLOCKER", "met": met,
                     "detail": None if met else _detail(code, facts), "section": section})
    for flag in result.carried_flags:
        base = flag.split(":", 1)[0]
        label = _CARRIED_LABELS.get(base, flag)
        if base == "EXCEPTION":
            label = f"Ngoại lệ tài liệu đang áp dụng: {flag.split(':', 1)[1]}"
        rows.append(
            {"code": flag, "label": label, "kind": "CARRIED", "met": True, "detail": None, "section": "summary"}
        )
    return rows
