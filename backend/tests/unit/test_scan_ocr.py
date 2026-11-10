import io
import shutil

import pypdfium2 as pdfium
import pytest
from PIL import Image, ImageDraw, ImageFont

from app.providers.ocr.pdf_text import OCRNoTextLayerError
from app.providers.ocr.scan_ocr import ScanFallbackOCRProvider, parse_tsv

TSV = (
    "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n"
    "4\t1\t1\t1\t1\t0\t100\t50\t300\t40\t-1\t\n"
    "5\t1\t1\t1\t1\t1\t100\t50\t100\t40\t90\tMã\n"
    "5\t1\t1\t1\t1\t2\t220\t55\t180\t30\t80\tsố\n"
    "5\t1\t1\t1\t2\t1\t100\t200\t50\t20\t70\tHết\n"
)


def test_parse_tsv_groups_words_into_normalised_lines():
    blocks, conf = parse_tsv(TSV, 1000, 1000)
    assert [b.text for b in blocks] == ["Mã số", "Hết"]
    first = blocks[0]
    assert (first.x, first.y, first.w, first.h) == (0.1, 0.05, 0.3, 0.04)
    assert conf == pytest.approx(0.8)


def _scan_pdf(text: str) -> bytes:
    image = Image.new("L", (1240, 600), 255)
    font = ImageFont.load_default(size=48)
    ImageDraw.Draw(image).text((60, 200), text, fill=0, font=font)
    buf = io.BytesIO()
    image.convert("RGB").save(buf, "PDF", resolution=150)
    return buf.getvalue()


@pytest.mark.skipif(shutil.which("tesseract") is None, reason="cần Tesseract trong image")
@pytest.mark.asyncio
async def test_scanned_pdf_is_read_with_region():
    result = await ScanFallbackOCRProvider(lang="eng").extract(_scan_pdf("Total 742350"), mime_type="application/pdf")
    block = result.pages[0].blocks[0]
    assert "742350" in block.text and 0.0 < block.y < 0.8 and block.w > 0.1
    assert result.pages[0].confidence < 1.0  # AI đề xuất, không phải lớp chữ gốc


@pytest.mark.skipif(shutil.which("tesseract") is None, reason="cần Tesseract trong image")
@pytest.mark.asyncio
async def test_blank_scan_still_reports_no_text():
    buf = io.BytesIO()
    Image.new("RGB", (600, 600), "white").save(buf, "PDF")
    with pytest.raises(OCRNoTextLayerError):
        await ScanFallbackOCRProvider(lang="eng").extract(buf.getvalue(), mime_type="application/pdf")
