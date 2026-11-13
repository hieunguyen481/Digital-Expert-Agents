"""Cờ chuyển kèm từ ngoại lệ tài liệu hiện tên tiếng Việt của tài liệu, không phải mã mục (T05)."""
from __future__ import annotations

import pytest
from app.repositories import loan_detail_repository as mod


@pytest.mark.asyncio
async def test_flags_query_resolves_exception_code_to_document_name(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, str] = {}

    async def fake_fetch_all(_session: object, sql: str, _params: dict) -> list:
        seen["sql"] = sql
        return []

    monkeypatch.setattr(mod, "fetch_all", fake_fetch_all)
    await mod.LoanDetailRepository(session=None).flags("x")  # type: ignore[arg-type]
    sql = seen["sql"]
    assert "requirement_description" in sql and "flag.code LIKE 'EXCEPTION:%'" in sql
    assert "COALESCE(" in sql and "flag.title) AS title" in sql  # cờ khác giữ nguyên tiêu đề
