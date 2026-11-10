"""Đo OCR PDF quét ảnh: tạo PDF có chữ (fpdf2), render thành ảnh rồi gói lại thành PDF không lớp chữ,
chạy ScanFallbackOCRProvider, in tỉ lệ trường đúng và thời gian. Chạy: python scripts/measure_scan_ocr.py"""
import asyncio
import io
import random
import re
import time
import unicodedata

import pypdfium2 as pdfium
from fpdf import FPDF
from PIL import Image

from app.providers.ocr.scan_ocr import ScanFallbackOCRProvider

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
DOCS = {
    "giay-de-nghi-vay": [("Tên khách hàng", "Công ty TNHH Vận tải Sông Hồng"), ("Mã số thuế", "0101234567"),
                         ("Số tiền đề nghị vay", "5.000.000.000 đồng"), ("Kỳ hạn", "36 tháng"), ("Mục đích vay", "Bổ sung vốn lưu động")],
    "bao-cao-tai-chinh": [("Doanh thu năm 2025", "42.800.000.000 đồng"), ("Lợi nhuận sau thuế", "3.150.000.000 đồng"),
                          ("Tổng tài sản", "28.400.000.000 đồng"), ("Nợ phải trả", "15.900.000.000 đồng"), ("Vốn chủ sở hữu", "12.500.000.000 đồng")],
    "hop-dong-the-chap": [("Bên thế chấp", "Nguyễn Văn An"), ("Số CCCD", "001085012345"), ("Tài sản bảo đảm", "Quyền sử dụng đất tại Cầu Giấy, Hà Nội"),
                          ("Giá trị định giá", "9.200.000.000 đồng"), ("Ngày ký", "15/03/2026")],
}


def text_pdf(fields) -> bytes:
    pdf = FPDF(); pdf.add_page(); pdf.add_font("dv", fname=FONT); pdf.set_font("dv", size=14)
    for k, v in fields:
        pdf.cell(0, 12, f"{k}: {v}", new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())


def scan_pdf(src: bytes, noise: float) -> bytes:
    img = pdfium.PdfDocument(src)[0].render(scale=2).to_pil().convert("L")
    if noise:
        px = img.load(); rnd = random.Random(7)
        for _ in range(int(img.width * img.height * noise)):
            px[rnd.randrange(img.width), rnd.randrange(img.height)] = rnd.choice((0, 255))
    buf = io.BytesIO(); img.save(buf, format="PDF"); return buf.getvalue()


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", s.lower()).replace("đ", "d").encode("ascii", "ignore").decode())


async def main() -> None:
    ocr = ScanFallbackOCRProvider()
    print("tai_lieu | nhieu | truong_dung | thoi_gian_s | so_dong | vung_hop_le")
    for name, fields in DOCS.items():
        for noise in (0, 0.0005):
            data = scan_pdf(text_pdf(fields), noise)
            t = time.perf_counter(); res = await ocr.extract(data, mime_type="application/pdf"); dt = time.perf_counter() - t
            page = res.pages[0]; text = norm(page.text)
            ok = sum(norm(v) in text for _, v in fields)
            boxes = all(0 <= b.x0 < b.x1 <= 1 and 0 <= b.y0 < b.y1 <= 1 for b in page.blocks) if hasattr(page.blocks[0], "x0") else True
            print(f"{name} | {noise} | {ok}/{len(fields)} | {dt:.2f} | {len(page.blocks)} | {boxes}")


asyncio.run(main())
