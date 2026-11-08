"""Dựng ảnh PNG từng trang để trang 05 hiển thị dưới vùng tô."""

from __future__ import annotations

import asyncio
import hashlib
import io

import pypdfium2 as pdfium

SCALE = 1.5


def _render_sync(content: bytes) -> list[bytes]:
    pdf = pdfium.PdfDocument(content)
    try:
        images: list[bytes] = []
        for index in range(len(pdf)):
            buffer = io.BytesIO()
            pdf[index].render(scale=SCALE).to_pil().convert("RGB").save(buffer, format="PNG", optimize=True)
            images.append(buffer.getvalue())
        return images
    finally:
        pdf.close()


async def render_pdf_pages(content: bytes) -> list[tuple[bytes, str]]:
    """Trả về (png, sha256) cho từng trang, theo thứ tự trang."""
    images = await asyncio.to_thread(_render_sync, content)
    return [(png, hashlib.sha256(png).hexdigest()) for png in images]
