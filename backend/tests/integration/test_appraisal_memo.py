"""Lat 10 + 10b: chi so co nguon (DSCR 1,34 va 1,76), To trinh tu luu, chot ban bat bien, AI chen can xac nhan, phan quyen."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from tests.integration.seed_ids import (
    ADMIN_HO,
    APPROVER_HO,
    AUDITOR_HO,
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    DOCUMENT_REVIEWER,
    LOAN_VINANOVA,
    RISK_HO,
)
from tests.integration.test_proposal_draft import BRANCH, BRANCH_HO, _as
from tests.integration.test_reconciliation import ROLE

from app.exceptions import AuthorizationError, ConflictError, NotFoundError, ValidationError
from app.repositories.loan_detail_repository import LoanDetailRepository
from app.repositories.memo_repository import MemoRepository
from app.repositories.workflow_repository import WorkflowRepository
from app.services.loan_detail_service import LoanDetailService
from app.services.memo_service import MemoService
from app.workflow import gates
from app.workflow import memo as rules


class _P:
    def __init__(self, employee: UUID) -> None:
        self.employee_id = employee
        self.roles = frozenset({ROLE[employee]} if employee in ROLE else set())
        self.is_admin = employee == ADMIN_HO
        self.permissions = frozenset({"loan:read"})


async def _memo(employee: UUID, body: Callable[[MemoService, AsyncSession], Awaitable[Any]]) -> Any:
    return await _as(employee, lambda s: body(MemoService(MemoRepository(s)), s))


FULL = {str(n): f"Nội dung mục {n}" for n in rules.SECTION_NOS}


# ---- Lat 10: chi so co nguon ----------------------------------------------------------------------
async def test_dscr_shows_declared_and_recomputed_each_with_source() -> None:
    async def body(s: AsyncSession) -> None:
        data = await LoanDetailService(LoanDetailRepository(s)).overview(_P(CREDIT_APPRAISER), LOAN_VINANOVA)
        dscr = next(m for m in data["metrics"] if m["code"] == "dscr")
        assert [(v["kind"], v["value_text"]) for v in dscr["values"]] == [("DECLARED", "1,34"), ("RECOMPUTED", "1,76")]
        assert dscr["threshold"] == {"op": ">=", "value": 1.25}
        assert [v["result"] for v in dscr["values"]] == ["PASS", "PASS"]
        assert dscr["conflict_id"] is not None and dscr["chosen"] is None
        assert data["flags"] and data["timeline"] and data["collaterals"]

    await _as(CREDIT_APPRAISER, body)


async def test_every_metric_value_has_document_and_page() -> None:
    async def body(s: AsyncSession) -> None:
        data = await LoanDetailService(LoanDetailRepository(s)).overview(_P(CREDIT_APPRAISER), LOAN_VINANOVA)
        assert data["metrics"]
        for metric in data["metrics"]:
            for v in metric["values"]:
                assert v["document_id"] and v["document_title"] and v["page_number"] and v["field_id"], metric["code"]

    await _as(CREDIT_APPRAISER, body)


async def test_chosen_source_from_page_05_is_shown() -> None:
    async def body(s: AsyncSession) -> None:
        svc = LoanDetailService(LoanDetailRepository(s))
        before = next(m for m in (await svc.overview(_P(CREDIT_APPRAISER), LOAN_VINANOVA))["metrics"] if m["code"] == "dscr")
        recomputed = before["values"][1]["field_id"]
        await s.execute(text(
            "UPDATE document.field_conflict SET chosen_field_id=:f, resolution_reason='Dùng EBITDA đã kiểm toán',"
            " resolved_by=:a, resolved_at=now() WHERE id=:c"
        ), {"f": recomputed, "a": CREDIT_APPRAISER, "c": before["conflict_id"]})
        after = next(m for m in (await svc.overview(_P(CREDIT_APPRAISER), LOAN_VINANOVA))["metrics"] if m["code"] == "dscr")
        assert after["chosen"]["field_id"] == recomputed and after["chosen"]["reason"] == "Dùng EBITDA đã kiểm toán"

    await _as(CREDIT_APPRAISER, body)


# ---- Lat 10b: To trinh ------------------------------------------------------------------------
async def test_autosave_creates_draft_and_blocks_duplicate_version() -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(CREDIT_APPRAISER)
        first = (await svc.view(p, LOAN_VINANOVA))["draft"]
        assert first["version"] == 1 and first["sections"]["1"]["body"]  # từ seed, có sẵn mục 1
        saved = await svc.save(p, LOAN_VINANOVA, {"4": "Doanh thu 705 tỷ"}, expected_version=1)
        assert saved["draft"]["version"] == 2 and saved["draft"]["sections"]["4"]["body"] == "Doanh thu 705 tỷ"
        with pytest.raises(ConflictError) as err:
            await svc.save(p, LOAN_VINANOVA, {"4": "Ghi đè từ tab cũ"}, expected_version=1)
        assert err.value.code == "VERSION_CONFLICT" and err.value.details["current_version"] == 2

    await _memo(CREDIT_APPRAISER, body)


async def test_section_validation() -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(CREDIT_APPRAISER)
        with pytest.raises(ValidationError):
            await svc.save(p, LOAN_VINANOVA, {"8": "x"}, expected_version=1)
        with pytest.raises(ValidationError):  # mục 7 do người viết
            await svc.add_ai_block(p, LOAN_VINANOVA, section=7, text="Đề xuất duyệt", source_ref=None, expected_version=1)

    await _memo(CREDIT_APPRAISER, body)


async def _fill(svc: MemoService, p: _P, with_pending: bool = True) -> None:
    view = await svc.save(p, LOAN_VINANOVA, FULL, expected_version=1)
    if with_pending:
        await svc.add_ai_block(p, LOAN_VINANOVA, section=5, text="Bảng độ nhạy AI", source_ref="chat",
                               expected_version=view["draft"]["version"])


async def test_pending_ai_block_is_not_effective_until_confirmed() -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(CREDIT_APPRAISER)
        await _fill(svc, p)
        draft = (await svc.view(p, LOAN_VINANOVA))["draft"]
        block = draft["sections"]["5"]["ai_blocks"][0]
        assert block["state"] == "PENDING" and block["source"] == "AI"
        wf = WorkflowRepository(s, cic_outage=False)
        await wf.finalize_memo(LOAN_VINANOVA, CREDIT_APPRAISER)
        snap = (await svc.view(p, LOAN_VINANOVA))["finalized"]["content"]
        assert snap["5"]["ai_blocks"] == [] and snap["5"]["body"] == "Nội dung mục 5"

    await _memo(CREDIT_APPRAISER, body)


async def test_confirmed_ai_block_enters_final_version() -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(CREDIT_APPRAISER)
        await _fill(svc, p)
        draft = (await svc.view(p, LOAN_VINANOVA))["draft"]
        block = draft["sections"]["5"]["ai_blocks"][0]
        done = await svc.decide_ai_block(p, LOAN_VINANOVA, UUID(block["id"]), confirm=True, expected_version=draft["version"])
        assert done["draft"]["sections"]["5"]["ai_blocks"][0]["decided_by"] == str(CREDIT_APPRAISER)
        await WorkflowRepository(s, cic_outage=False).finalize_memo(LOAN_VINANOVA, CREDIT_APPRAISER)
        snap = (await svc.view(p, LOAN_VINANOVA))["finalized"]["content"]
        assert [b["text"] for b in snap["5"]["ai_blocks"]] == ["Bảng độ nhạy AI"]

    await _memo(CREDIT_APPRAISER, body)


async def test_gate_report_missing_until_all_seven_sections() -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(CREDIT_APPRAISER)
        wf = WorkflowRepository(s, cic_outage=False)
        assert "REPORT_MISSING" in (await gates.evaluate("appraisal_submit", LOAN_VINANOVA, wf)).blockers
        await svc.save(p, LOAN_VINANOVA, FULL, expected_version=1)
        assert "REPORT_MISSING" not in (await gates.evaluate("appraisal_submit", LOAN_VINANOVA, wf)).blockers
        await svc.save(p, LOAN_VINANOVA, {"7": "  "}, expected_version=2)
        assert "REPORT_MISSING" in (await gates.evaluate("appraisal_submit", LOAN_VINANOVA, wf)).blockers

    await _memo(CREDIT_APPRAISER, body)


async def test_finalized_version_is_immutable_and_locks_draft() -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(CREDIT_APPRAISER)
        await _fill(svc, p, with_pending=False)
        await WorkflowRepository(s, cic_outage=False).finalize_memo(LOAN_VINANOVA, CREDIT_APPRAISER)
        with pytest.raises(ConflictError) as err:
            await svc.save(p, LOAN_VINANOVA, {"4": "Sửa sau khi chốt"}, expected_version=2)
        assert err.value.code == "MEMO_LOCKED"
        for sql in ("UPDATE credit.appraisal_memo_version SET content='{}'::jsonb",
                    "DELETE FROM credit.appraisal_memo_version", "TRUNCATE credit.appraisal_memo_version",
                    "DELETE FROM credit.appraisal_memo"):
            with pytest.raises(DBAPIError):
                async with s.begin_nested():
                    await s.execute(text(sql))

    await _memo(CREDIT_APPRAISER, body)


async def test_reopen_creates_new_revision_from_final_version() -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(CREDIT_APPRAISER)
        await _fill(svc, p, with_pending=False)
        wf = WorkflowRepository(s, cic_outage=False)
        await wf.finalize_memo(LOAN_VINANOVA, CREDIT_APPRAISER)
        assert await wf.reopen_memo(LOAN_VINANOVA, CREDIT_APPRAISER) == 2
        view = await svc.view(p, LOAN_VINANOVA)
        assert view["draft"]["revision"] == 2 and view["editable"]
        assert view["draft"]["sections"]["4"]["body"] == "Nội dung mục 4"
        await svc.save(p, LOAN_VINANOVA, {"4": "Bản 2 đã sửa"}, expected_version=view["draft"]["version"])
        # bản chốt 1 giữ nguyên nội dung lúc trình
        assert (await svc.view(p, LOAN_VINANOVA))["finalized"]["content"]["4"]["body"] == "Nội dung mục 4"

    await _memo(CREDIT_APPRAISER, body)


@pytest.mark.parametrize("employee", [CREDIT_OFFICER, DOCUMENT_REVIEWER, RISK_HO, COMPLIANCE_HO, APPROVER_HO, AUDITOR_HO, ADMIN_HO])
async def test_other_roles_cannot_edit_or_read_draft(employee: UUID) -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(employee)
        try:
            view = await svc.view(p, LOAN_VINANOVA)
            assert view["draft"] is None and not view["editable"]
        except NotFoundError:
            pass
        with pytest.raises((AuthorizationError, NotFoundError)):
            await svc.save(p, LOAN_VINANOVA, {"4": "Không có quyền"}, expected_version=1)
        with pytest.raises((AuthorizationError, NotFoundError)):
            await svc.add_ai_block(p, LOAN_VINANOVA, section=5, text="x", source_ref=None, expected_version=1)
        assert await MemoRepository(s).draft(LOAN_VINANOVA) is None

    await _memo(employee, body)


@pytest.mark.parametrize("employee", [RISK_HO, APPROVER_HO, AUDITOR_HO])
async def test_downstream_roles_read_exact_finalized_version(employee: UUID) -> None:
    await _as(CREDIT_APPRAISER, lambda s: _finalize_and_read(s, employee))


async def _finalize_and_read(s: AsyncSession, _employee: UUID) -> None:
    svc = MemoService(MemoRepository(s))
    p = _P(CREDIT_APPRAISER)
    await _fill(svc, p, with_pending=False)
    await WorkflowRepository(s, cic_outage=False).finalize_memo(LOAN_VINANOVA, CREDIT_APPRAISER)
    frozen = (await svc.view(p, LOAN_VINANOVA))["finalized"]
    assert frozen["content"]["7"]["body"] == "Nội dung mục 7"


def _pdf_text(data: bytes) -> str:
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(data)
    return "\n".join(pdf[i].get_textpage().get_text_range() for i in range(len(pdf)))


async def test_pdf_not_available_until_finalized_then_matches_frozen_version() -> None:
    async def body(svc: MemoService, s: AsyncSession) -> None:
        p = _P(CREDIT_APPRAISER)
        await _fill(svc, p)  # có khối AI chưa xác nhận
        with pytest.raises(ConflictError) as err:
            await svc.export_pdf(LOAN_VINANOVA)
        assert err.value.code == "MEMO_NOT_FINALIZED"
        await WorkflowRepository(s, cic_outage=False).finalize_memo(LOAN_VINANOVA, CREDIT_APPRAISER)
        data, name = await svc.export_pdf(LOAN_VINANOVA)
        text = _pdf_text(data)
        assert data.startswith(b"%PDF") and name.endswith("-lan-1.pdf")
        assert "Nội dung mục 7" in text and "lần 1" in text and "Bảng độ nhạy AI" not in text

    await _memo(CREDIT_APPRAISER, body)


@pytest.mark.parametrize("employee", [RISK_HO, APPROVER_HO, COMPLIANCE_HO])
async def test_role_outside_loan_scope_cannot_export_pdf(employee: UUID) -> None:
    """Ai chưa thấy hồ sơ dưới RLS (chưa tới bước của họ) bị từ chối, kể cả khi đã có bản chốt."""
    seen: dict[str, bool] = {}

    async def body(s: AsyncSession) -> None:
        svc = MemoService(MemoRepository(s))
        await _fill(svc, _P(CREDIT_APPRAISER), with_pending=False)
        await WorkflowRepository(s, cic_outage=False).finalize_memo(LOAN_VINANOVA, CREDIT_APPRAISER)
        await s.execute(
            text("SELECT set_config('app.employee_id', :e, true), set_config('app.branch_id', :b, true)"),
            {"e": str(employee), "b": str(BRANCH.get(employee, BRANCH_HO))},
        )  # đổi sang người đọc trong cùng giao dịch
        with pytest.raises(NotFoundError):
            await svc.export_pdf(LOAN_VINANOVA)
        seen["denied"] = True

    await _as(CREDIT_APPRAISER, body)
    assert seen["denied"]
