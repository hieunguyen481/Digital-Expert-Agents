"""Trích trường bằng LLM; vùng tô lấy từ dòng chữ của tài liệu, không phải toạ độ do LLM nêu.

AI chỉ đề xuất: mỗi trường phải trỏ tới dòng nguồn (``p1:L3``) và giá trị phải xuất hiện trong chính các dòng đó,
nếu không thì bỏ. Trường ra ở trạng thái AI_PROPOSED; người xác nhận mới có hiệu lực.
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from pydantic import BaseModel, Field

from app.document_processing.extraction import _parse_amount
from app.document_processing.models import ExtractedFieldResult, PageResult
from app.providers.llm.base import LLMProvider

MAX_PROMPT_CHARS = 24_000

_SYSTEM = (
    "Bạn trích các trường dữ liệu từ văn bản của tài liệu hồ sơ tín dụng. Mỗi dòng có nhãn dạng [p1:L3] "
    "(trang 1, dòng 3). Chỉ trích giá trị CÓ THẬT trong văn bản, chép nguyên văn, không suy đoán, không tính toán. "
    "field_name là snake_case tiếng Anh ngắn (vd company_name, tax_code, legal_representative, charter_capital, "
    "address, revenue, net_profit, total_assets, issue_date, loan_amount). value_type là TEXT, MONEY hoặc DATE. "
    "refs là danh sách nhãn dòng chứa giá trị. Không có trường nào thì trả danh sách rỗng."
)


class _LLMField(BaseModel):
    field_name: str = Field(min_length=1, max_length=60)
    value: str = Field(min_length=1, max_length=500)
    value_type: str = "TEXT"
    refs: list[str] = Field(min_length=1, max_length=6)


class _LLMFields(BaseModel):
    fields: list[_LLMField] = Field(default_factory=list)


_REF = re.compile(r"^p(\d+):L(\d+)$")


def _squash(value: str) -> str:
    return re.sub(r"\s+", "", value).lower()


def _parse_money(value: str) -> Decimal:
    digits = re.sub(r"[^\d.,]", "", value)
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", digits):  # 5.000.000.000 kiểu Việt Nam: dấu chấm ngăn nghìn
        digits = digits.replace(".", "")
    return _parse_amount(digits)


class LLMFieldExtractor:
    def __init__(self, llm: LLMProvider, *, confidence: Decimal = Decimal("0.80")) -> None:
        self._llm = llm
        self._confidence = confidence

    async def extract(self, pages: tuple[PageResult, ...]) -> tuple[ExtractedFieldResult, ...]:
        lines: dict[str, tuple[PageResult, dict[str, float | str]]] = {}
        rendered: list[str] = []
        for page in pages:
            for number, block in enumerate(page.blocks, start=1):
                ref = f"p{page.page_number}:L{number}"
                lines[ref] = (page, block)
                rendered.append(f"[{ref}] {block['text']}")
        if not rendered:
            return ()
        prompt = "\n".join(rendered)[:MAX_PROMPT_CHARS]
        response = await self._llm.generate_structured(
            system_prompt=_SYSTEM, user_prompt=prompt, response_model=_LLMFields
        )
        results: list[ExtractedFieldResult] = []
        for item in response.fields:
            located = [lines[ref] for ref in item.refs if _REF.match(ref) and ref in lines]
            if not located or len({page.page_number for page, _ in located}) != 1:
                continue
            source = " ".join(str(block["text"]) for _, block in located)
            if _squash(item.value) not in _squash(source):
                continue  # giá trị không nằm trong dòng dẫn: coi là bịa, bỏ
            page = located[0][0]
            left = min(float(b["x"]) for _, b in located)
            top = min(float(b["y"]) for _, b in located)
            right = max(float(b["x"]) + float(b["w"]) for _, b in located)
            bottom = max(float(b["y"]) + float(b["h"]) for _, b in located)
            number: Decimal | None = None
            value_type = item.value_type if item.value_type in {"TEXT", "MONEY", "DATE"} else "TEXT"
            if value_type == "MONEY":
                try:
                    number = _parse_money(item.value)
                except (InvalidOperation, ValueError):
                    value_type = "TEXT"
            results.append(
                ExtractedFieldResult(
                    field_name=re.sub(r"[^a-z0-9_]", "_", item.field_name.lower())[:60],
                    value_type=value_type,
                    ocr_value_text=item.value,
                    normalized_value_text=item.value.strip(),
                    value_number=number,
                    page_number=page.page_number,
                    bounding_box={"x": left, "y": top, "w": right - left, "h": bottom - top},
                    confidence=self._confidence,
                    source_text=source[:500],
                )
            )
        return tuple(results)
