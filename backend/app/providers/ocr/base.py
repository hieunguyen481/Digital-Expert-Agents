"""Structured OCR provider interface."""

from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel, ConfigDict, Field


class OCRBlock(BaseModel):
    """Một dòng chữ và vùng của nó trên trang, toạ độ chuẩn hoá 0..1 (gốc ở góc trên trái)."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    text: str
    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    w: float = Field(ge=0.0, le=1.0)
    h: float = Field(ge=0.0, le=1.0)


class OCRPage(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    page_number: int = Field(ge=1)
    text: str
    confidence: float = Field(ge=0.0, le=1.0)
    width: int | None = Field(default=None, ge=1)
    height: int | None = Field(default=None, ge=1)
    blocks: tuple[OCRBlock, ...] = ()


class OCRResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    pages: tuple[OCRPage, ...]
    provider: str
    model_name: str
    model_version: str


class OCRProvider(Protocol):
    async def extract(self, content: bytes, *, mime_type: str) -> OCRResult: ...
