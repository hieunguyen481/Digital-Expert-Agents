"""Xuất PDF Tờ trình: đọc lại chữ từ PDF, quyền loan:read ở route."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pypdfium2 as pdfium
import pytest
from fastapi.testclient import TestClient
from tests.contract.test_foundation_contract import _settings

from app.api.dependencies import get_memo_service
from app.auth.dependencies import get_current_principal
from app.auth.principal import CurrentPrincipal
from app.main import create_app
from app.services.memo_service import MemoService
from app.workflow import memo_pdf

AT = datetime(2026, 11, 5, 3, 30, tzinfo=UTC)  # 10:30 GMT+7


def _text(data: bytes) -> str:
    pdf = pdfium.PdfDocument(data)
    return "\n".join(pdf[i].get_textpage().get_text_range() for i in range(len(pdf)))


def _content() -> dict[str, Any]:
    c: dict[str, Any] = {str(n): {"body": f"Nội dung mục {n}", "ai_blocks": []} for n in range(1, 8)}
    c["5"]["ai_blocks"] = [
        {"id": "a", "text": "Khối AI đã xác nhận", "state": "CONFIRMED"},
        {"id": "b", "text": "Khối AI chưa xác nhận", "state": "PENDING"},
    ]
    return c


def _render() -> bytes:
    return memo_pdf.render(
        application_number="LA-2026-0001", customer_name="Công ty Vinanova", revision=2,
        finalized_at=AT, finalized_by_name="Nguyễn Thị Thẩm Định", content=_content(),
    )


def test_pdf_has_vietnamese_text_header_and_only_confirmed_ai() -> None:
    data = _render()
    assert data.startswith(b"%PDF")
    text = _text(data)
    for expected in ("LA-2026-0001", "lần 2", "05/11/2026 10:30", "Thông tin khách hàng",
                     "Đánh giá rủi ro & đề xuất của Chuyên viên Thẩm định", "Nội dung mục 7",
                     "Khối AI đã xác nhận", "Nguyễn Thị Thẩm Định"):
        assert expected in text
    assert "chưa xác nhận" not in text


class _FakeService(MemoService):
    def __init__(self) -> None:  # noqa: D107
        pass

    async def export_pdf(self, loan_id: Any, revision: int | None = None) -> tuple[bytes, str]:
        return _render(), "to-trinh.pdf"


def _client(permissions: frozenset[str]) -> TestClient:
    app = create_app(_settings())

    async def _principal() -> CurrentPrincipal:
        return CurrentPrincipal(employee_id=uuid4(), subject="s", branch_id=uuid4(),
                                roles=frozenset({"risk_officer"}), permissions=permissions, is_admin=False)

    app.dependency_overrides[get_current_principal] = _principal
    app.dependency_overrides[get_memo_service] = _FakeService
    return TestClient(app)


def test_route_returns_pdf_with_permission() -> None:
    res = _client(frozenset({"loan:read"})).get(f"/api/v1/loan-applications/{uuid4()}/memo/pdf")
    assert res.status_code == 200 and res.headers["content-type"] == "application/pdf"
    assert "attachment" in res.headers["content-disposition"] and "LA-2026-0001" in _text(res.content)


def test_route_denies_without_loan_read() -> None:
    res = _client(frozenset()).get(f"/api/v1/loan-applications/{uuid4()}/memo/pdf")
    assert res.status_code == 403
