"""Xuất PDF Tờ trình từ bản đã chốt (Q-L). Chỉ đọc nội dung bất biến; khối AI chưa xác nhận không có mặt."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from fpdf import FPDF

from app.workflow import memo as rules

FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"
VN = ZoneInfo("Asia/Ho_Chi_Minh")
FAMILY = "DejaVu"


class _MemoPdf(FPDF):
    def __init__(self, header_line: str) -> None:
        super().__init__(format="A4")
        self._header_line = header_line
        self.add_font(FAMILY, "", str(FONTS / "DejaVuSans.ttf"))
        self.add_font(FAMILY, "B", str(FONTS / "DejaVuSans-Bold.ttf"))
        self.set_margins(18, 22, 18)
        self.set_auto_page_break(True, margin=16)

    def header(self) -> None:
        self.set_font(FAMILY, "", 8)
        self.set_text_color(90, 90, 90)
        self.cell(0, 5, self._header_line, new_x="LMARGIN", new_y="NEXT")
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)
        self.set_text_color(0, 0, 0)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font(FAMILY, "", 8)
        self.cell(0, 5, f"Trang {self.page_no()}/{{nb}}", align="C")


def render(
    *, application_number: str, customer_name: str | None, revision: int,
    finalized_at: datetime, finalized_by_name: str, content: dict,
) -> bytes:
    when = finalized_at.astimezone(VN).strftime("%d/%m/%Y %H:%M")
    pdf = _MemoPdf(f"Hồ sơ {application_number} · Tờ trình lần {revision} · Chốt lúc {when} (GMT+7)")
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_font(FAMILY, "B", 15)
    pdf.multi_cell(0, 8, "TỜ TRÌNH THẨM ĐỊNH TÍN DỤNG", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font(FAMILY, "", 10)
    meta = [f"Mã hồ sơ: {application_number}", f"Khách hàng: {customer_name or '—'}",
            f"Phiên bản Tờ trình: lần {revision}", f"Thời điểm chốt: {when} (GMT+7)",
            f"Người chốt: {finalized_by_name}"]
    for line in meta:
        pdf.multi_cell(0, 6, line, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    sections = rules.effective_content(content)
    for no in rules.SECTION_NOS:
        sec = sections[str(no)]
        pdf.set_font(FAMILY, "B", 11)
        pdf.multi_cell(0, 7, f"{no}. {rules.SECTION_TITLES[no]}", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font(FAMILY, "", 10)
        body = sec["body"].strip()
        pdf.multi_cell(0, 5.5, body or "(để trống)", new_x="LMARGIN", new_y="NEXT")
        for block in sec["ai_blocks"]:
            pdf.ln(1)
            pdf.multi_cell(0, 5.5, f"{block['text']}\n[Nội dung AI đề xuất, đã được người xác nhận]",
                           new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
    return bytes(pdf.output())
