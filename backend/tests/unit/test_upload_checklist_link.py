"""L01 (phuong an A): QHKH chon muc danh muc khi tai; backend lien ket tai lieu vao dung muc."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.exceptions import AuthorizationError, ConflictError
from app.services.upload_service import UploadService

LOAN, DOC = uuid4(), uuid4()


class Repo:
    def __init__(self, *, can_write=True, item_type="BUSINESS_REGISTRATION", has_doc=True) -> None:
        self.can_write, self.item_type, self.has_doc, self.linked = can_write, item_type, has_doc, []

    async def loan_upload_state(self, employee_id, loan_id):  # noqa: ANN001
        return {"status": "DRAFT", "can_write": self.can_write}

    async def checklist_item(self, loan_id, code):  # noqa: ANN001
        return None if code == "NOPE" else {"id": uuid4(), "document_type": self.item_type}

    async def loan_has_document(self, loan_id, document_id):  # noqa: ANN001
        return self.has_doc

    async def link_checklist_document(self, item, document_id):  # noqa: ANN001
        self.linked.append((item, document_id))


def _run(repo: Repo, code: str = "SME-02"):
    svc = UploadService(repo, None, max_size_bytes=1)  # type: ignore[arg-type]
    who = SimpleNamespace(employee_id=uuid4(), permissions={"document:upload"})
    return asyncio.run(svc.link_to_checklist(who, LOAN, checklist_code=code, document_id=DOC))


def test_links_document_to_chosen_item() -> None:
    repo = Repo()
    _run(repo)
    assert repo.linked and repo.linked[0][1] == DOC


def test_unknown_item_or_foreign_document_is_not_linked() -> None:
    with pytest.raises(LookupError):
        _run(Repo(), "NOPE")
    repo = Repo(has_doc=False)
    with pytest.raises(LookupError):
        _run(repo)
    assert not repo.linked


def test_cic_report_cannot_be_uploaded_and_locked_loan_refuses() -> None:
    with pytest.raises(ConflictError):
        _run(Repo(item_type="CIC_REPORT"))
    with pytest.raises(AuthorizationError):
        _run(Repo(can_write=False))
