"""Đọc lớp chữ của PDF (pypdfium2) kèm vùng từng dòng; không gọi dịch vụ ngoài.

PDF quét ảnh không có lớp chữ: provider báo lỗi rõ (``OCRNoTextLayerError``) để tài liệu ở trạng thái thất bại,
không bịa nội dung.
"""

from __future__ import annotations

import asyncio

import pypdfium2 as pdfium

from app.providers.ocr.base import OCRBlock, OCRPage, OCRResult

MAX_PAGES = 30


class OCRNoTextLayerError(ValueError):
    """Tài liệu không có lớp chữ để đọc."""


class PdfTextOCRProvider:
    provider = "pdf-text-layer"
    model_name = "pdfium"
    model_version = str(pdfium.PDFIUM_INFO.version) if hasattr(pdfium, "PDFIUM_INFO") else "1"

    async def extract(self, content: bytes, *, mime_type: str) -> OCRResult:
        if mime_type != "application/pdf":
            raise OCRNoTextLayerError("only PDF text layers are readable; image OCR is not configured")
        return await asyncio.to_thread(self._extract_sync, content)

    def _extract_sync(self, content: bytes) -> OCRResult:
        pdf = pdfium.PdfDocument(content)
        try:
            if len(pdf) == 0 or len(pdf) > MAX_PAGES:
                raise ValueError(f"PDF must have between 1 and {MAX_PAGES} pages")
            pages: list[OCRPage] = []
            for index in range(len(pdf)):
                page = pdf[index]
                width, height = page.get_size()
                textpage = page.get_textpage()
                blocks: list[OCRBlock] = []
                for rect_index in range(textpage.count_rects()):
                    left, bottom, right, top = textpage.get_rect(rect_index)
                    text = " ".join(textpage.get_text_bounded(left, bottom, right, top).split())
                    if not text:
                        continue
                    x, y = max(0.0, left / width), max(0.0, 1 - top / height)
                    blocks.append(
                        OCRBlock(
                            text=text,
                            x=min(x, 1.0),
                            y=min(y, 1.0),
                            w=min(max(0.0, (right - left) / width), 1.0 - min(x, 1.0)),
                            h=min(max(0.0, (top - bottom) / height), 1.0 - min(y, 1.0)),
                        )
                    )
                pages.append(
                    OCRPage(
                        page_number=index + 1,
                        text="\n".join(block.text for block in blocks),
                        confidence=1.0,  # lớp chữ gốc của tệp, không phải suy đoán của OCR
                        width=max(1, round(width)),
                        height=max(1, round(height)),
                        blocks=tuple(blocks),
                    )
                )
            if not any(page.blocks for page in pages):
                raise OCRNoTextLayerError("PDF has no text layer (scanned document)")
            return OCRResult(
                pages=tuple(pages), provider=self.provider, model_name=self.model_name,
                model_version=self.model_version,
            )
        finally:
            pdf.close()
