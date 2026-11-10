"""OCR cho trang PDF quét ảnh: dựng ảnh trang rồi chạy Tesseract (tiếng Việt), lấy vùng từng dòng.

Trang có lớp chữ vẫn dùng lớp chữ gốc (``PdfTextOCRProvider``); chỉ trang không có chữ mới OCR.
Kết quả OCR là AI đề xuất (độ tin cậy < 1), người dùng xác nhận theo Q7.
"""

from __future__ import annotations

import asyncio
import csv
import io
import shutil
import subprocess
from collections import OrderedDict

import pypdfium2 as pdfium

from app.providers.ocr.base import OCRBlock, OCRPage, OCRResult
from app.providers.ocr.pdf_text import MAX_PAGES, OCRNoTextLayerError, PdfTextOCRProvider

RENDER_SCALE = 300 / 72  # ~300 dpi
TESSERACT_TIMEOUT_SECONDS = 90


class OCRUnavailableError(RuntimeError):
    """Máy chủ chưa cài Tesseract hoặc gói ngôn ngữ."""


def parse_tsv(tsv: str, width: int, height: int) -> tuple[list[OCRBlock], float]:
    """Gộp các từ của Tesseract TSV thành dòng; trả (các dòng, độ tin cậy trung bình 0..1)."""
    lines: OrderedDict[tuple[str, str, str], list[dict[str, str]]] = OrderedDict()
    for row in csv.DictReader(io.StringIO(tsv), delimiter="\t", quoting=csv.QUOTE_NONE):
        text = (row.get("text") or "").strip()
        try:
            conf = float(row.get("conf") or -1)
        except ValueError:
            continue
        if not text or conf < 0:
            continue
        lines.setdefault((row["block_num"], row["par_num"], row["line_num"]), []).append(row | {"text": text})
    blocks: list[OCRBlock] = []
    confs: list[float] = []
    for words in lines.values():
        left = min(int(w["left"]) for w in words)
        top = min(int(w["top"]) for w in words)
        right = max(int(w["left"]) + int(w["width"]) for w in words)
        bottom = max(int(w["top"]) + int(w["height"]) for w in words)
        x, y = min(max(left / width, 0.0), 1.0), min(max(top / height, 0.0), 1.0)
        blocks.append(
            OCRBlock(
                text=" ".join(w["text"] for w in words),
                x=x,
                y=y,
                w=min(max((right - left) / width, 0.0), 1.0 - x),
                h=min(max((bottom - top) / height, 0.0), 1.0 - y),
            )
        )
        confs.extend(float(w["conf"]) / 100 for w in words)
    return blocks, (sum(confs) / len(confs) if confs else 0.0)


def _tesseract(png: bytes, lang: str) -> str:
    try:
        done = subprocess.run(  # noqa: S603 - đối số cố định, không từ người dùng
            ["tesseract", "stdin", "stdout", "-l", lang, "--psm", "4", "tsv"],
            input=png, capture_output=True, timeout=TESSERACT_TIMEOUT_SECONDS, check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise OCRUnavailableError("OCR quá thời gian xử lý một trang") from exc
    if done.returncode != 0:
        raise OCRUnavailableError("Tesseract lỗi: " + done.stderr.decode(errors="replace")[:200])
    return done.stdout.decode("utf-8", errors="replace")


class ScanFallbackOCRProvider:
    """Lớp chữ trước; trang quét ảnh thì OCR bằng Tesseract."""

    provider = "pdf-text-layer+tesseract"
    model_name = "pdfium+tesseract"
    model_version = "5"

    def __init__(self, lang: str = "vie+eng") -> None:
        self._lang = lang
        self._text = PdfTextOCRProvider()

    async def extract(self, content: bytes, *, mime_type: str) -> OCRResult:
        if mime_type != "application/pdf":
            raise OCRNoTextLayerError("chỉ đọc được PDF; ảnh đơn chưa được hỗ trợ")
        return await asyncio.to_thread(self._extract_sync, content)

    def _extract_sync(self, content: bytes) -> OCRResult:
        try:
            return self._text._extract_sync(content)
        except OCRNoTextLayerError:
            pass
        if shutil.which("tesseract") is None:
            raise OCRUnavailableError("Chưa cài Tesseract để đọc PDF quét ảnh")
        pdf = pdfium.PdfDocument(content)
        try:
            if len(pdf) == 0 or len(pdf) > MAX_PAGES:
                raise ValueError(f"PDF must have between 1 and {MAX_PAGES} pages")
            pages: list[OCRPage] = []
            for index in range(len(pdf)):
                image = pdf[index].render(scale=RENDER_SCALE).to_pil().convert("L")
                buf = io.BytesIO()
                image.save(buf, format="PNG")
                blocks, conf = parse_tsv(_tesseract(buf.getvalue(), self._lang), image.width, image.height)
                pages.append(
                    OCRPage(
                        page_number=index + 1, text="\n".join(b.text for b in blocks),
                        confidence=min(conf, 0.99), width=image.width, height=image.height, blocks=tuple(blocks),
                    )
                )
            if not any(p.blocks for p in pages):
                raise OCRNoTextLayerError("Không đọc được chữ nào từ PDF quét ảnh")
            return OCRResult(
                pages=tuple(pages), provider=self.provider, model_name=self.model_name, model_version=self.model_version
            )
        finally:
            pdf.close()
