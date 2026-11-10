"""QA3-05 / E5: tai lieu tai vao muc BCTC kiem toan duoc gan document_subtype = 'AUDITED'."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.repositories.document_repository import DocumentRepository


class _Session:
    def __init__(self) -> None:
        self.sql: list[str] = []

    async def execute(self, statement: Any, params: Any = None) -> None:
        self.sql.append(str(statement))


async def _link(code: str) -> list[str]:
    session = _Session()
    repo = DocumentRepository(session)  # type: ignore[arg-type]
    item = {"id": uuid4(), "document_type": "FINANCIAL_STATEMENT", "requirement_code": code}
    await repo.link_checklist_document(item, uuid4())
    return session.sql


async def test_audited_checklist_item_sets_audited_subtype() -> None:
    assert any("document_subtype = 'AUDITED'" in s for s in await _link("SME-08-AUDITED-FS"))


async def test_other_checklist_item_does_not_set_subtype() -> None:
    assert not any("document_subtype" in s for s in await _link("SME-07-TAX-FS"))
