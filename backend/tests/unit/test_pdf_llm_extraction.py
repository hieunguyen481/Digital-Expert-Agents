"""Lat 8: lop chu PDF -> dong co vung; LLM chi de xuat, vung lay tu dong nguon, gia tri bia bi bo."""

from __future__ import annotations

from decimal import Decimal

import pypdfium2 as pdfium
import pytest

from app.document_processing.llm_extraction import LLMFieldExtractor, _LLMField, _LLMFields
from app.document_processing.models import PageResult
from app.providers.ocr.pdf_text import OCRNoTextLayerError, PdfTextOCRProvider


def _pdf(text: str | None) -> bytes:
    """PDF toi thieu viet tay; pdfium tu sua bang xref."""
    stream = f"BT /F1 14 Tf 72 700 Td ({text}) Tj ET" if text else ""
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    body = "%PDF-1.4\n" + "".join(f"{n} 0 obj\n{o}\nendobj\n" for n, o in enumerate(objs, 1))
    return (body + "trailer\n<< /Root 1 0 R /Size 6 >>\n%%EOF").encode()


class _LLM:
    def __init__(self, fields: list[_LLMField]) -> None:
        self._fields = fields

    async def generate_structured(self, **_: object) -> _LLMFields:
        return _LLMFields(fields=self._fields)


def _page() -> PageResult:
    blocks = (
        {"text": "Ten cong ty: ABC", "x": 0.1, "y": 0.1, "w": 0.4, "h": 0.02},
        {"text": "Von dieu le 5.000.000.000", "x": 0.1, "y": 0.2, "w": 0.5, "h": 0.02},
    )
    return PageResult(page_number=2, text_content="x", ocr_confidence=Decimal("1"), blocks=blocks)


async def test_field_box_comes_from_cited_lines_and_page():
    out = await LLMFieldExtractor(_LLM([
        _LLMField(field_name="Charter Capital", value="5.000.000.000", value_type="MONEY", refs=["p2:L2"]),
    ])).extract((_page(),))
    assert len(out) == 1 and out[0].page_number == 2
    assert out[0].bounding_box == pytest.approx({"x": 0.1, "y": 0.2, "w": 0.5, "h": 0.02})
    assert out[0].value_number == Decimal("5000000000") and out[0].field_name == "charter_capital"


async def test_hallucinated_or_unlocated_fields_are_dropped():
    out = await LLMFieldExtractor(_LLM([
        _LLMField(field_name="tax_code", value="0101234567", refs=["p2:L1"]),   # gia tri khong co trong dong
        _LLMField(field_name="company_name", value="ABC", refs=["p9:L9"]),     # dong khong ton tai
    ])).extract((_page(),))
    assert out == ()


async def test_non_pdf_and_empty_pdf_fail_explicitly():
    provider = PdfTextOCRProvider()
    with pytest.raises(OCRNoTextLayerError):
        await provider.extract(b"x", mime_type="image/png")
    with pytest.raises(OCRNoTextLayerError):
        await provider.extract(_pdf(None), mime_type="application/pdf")


async def test_text_pdf_gives_normalised_line_box():
    result = await PdfTextOCRProvider().extract(_pdf("Ten cong ty ABC"), mime_type="application/pdf")
    block = result.pages[0].blocks[0]
    assert "Ten cong ty ABC" in block.text
    assert 0 <= block.x < 0.3 and 0.1 < block.y < 0.2 and 0 < block.w < 0.5  # 700/842 tu tren xuong ~ 0.17


async def test_worker_records_failure_for_load_and_pipeline_errors():
    from types import SimpleNamespace
    from uuid import uuid4

    from app.workers.document_worker import DocumentWorker

    job = uuid4()
    event = SimpleNamespace(event_type="document.processing.requested", payload={"job_id": str(job)})
    failed: list[tuple] = []

    class Repo:
        def __init__(self, ok: bool) -> None:
            self.ok = ok

        async def load_pipeline_input(self, e):
            if not self.ok:
                raise RuntimeError("no input")
            return SimpleNamespace(job_id=job, document_version_id=uuid4())

        async def fail_job(self, job_id, step, code):
            failed.append((job_id, step, code))

    class Boom:
        async def run(self, request):
            raise OCRNoTextLayerError("scan")

    assert await DocumentWorker(Repo(False), Boom()).handle(event) is None  # type: ignore[arg-type]
    assert await DocumentWorker(Repo(True), Boom()).handle(event) is not None  # type: ignore[arg-type]
    assert failed == [(job, "LOAD_INPUT", "RUNTIMEERROR"), (job, "PIPELINE", "OCRNOTEXTLAYERERROR")]


def test_document_view_matches_api_schema_for_pipeline_and_failed_rows():
    from uuid import uuid4

    from app.schemas.reconciliation import ReconDocument
    from app.services.reconciliation_service import _document_view

    base = {"document_id": uuid4(), "version_id": uuid4(), "title": "t", "document_type": "X",
            "verification_status": "UNVERIFIED", "from_pipeline": True, "job_status": "FAILED",
            "job_progress": 40, "job_step": "OCR", "job_error_code": "OCRNOTEXTLAYERERROR"}
    failed = ReconDocument.model_validate(_document_view(base))
    assert failed.data_source == "PIPELINE" and "thất bại" in (failed.processing_error or "")
    seed = ReconDocument.model_validate(_document_view({**base, "from_pipeline": False, "job_status": None}))
    assert seed.data_source == "SEED" and seed.processing_error is None
