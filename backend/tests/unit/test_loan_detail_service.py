"""Trang 02b phần đọc: số không có nguồn không hiện; che kết luận tuân thủ với QHKH/HTTD; ngưỡng từ chính sách."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

import pytest

from app.services.loan_detail_service import LoanDetailService

LOAN = uuid4()


def _field(name: str, text: str, number: float, **extra: Any) -> dict[str, Any]:
    return {"field_id": uuid4(), "field_name": name, "value_text": text, "value_number": number, "page_number": 3,
            "verification_status": "NEEDS_VERIFICATION", "source_type": "AI_OCR", "verification_reason": None,
            "document_id": uuid4(), "document_title": "BCTC 2025", "verified_by_name": None, "verified_at": None,
            **extra}


class FakeRepo:
    def __init__(self, fields: list[dict[str, Any]]) -> None:
        self.fields = fields

    async def loan(self, loan_id: UUID) -> dict[str, Any]:
        return {"id": loan_id}

    async def metric_fields(self, loan_id: UUID, names: list[str]) -> list[dict[str, Any]]:
        return [f for f in self.fields if f["field_name"] in names]

    async def conflicts(self, loan_id: UUID) -> list[dict[str, Any]]:
        return []

    async def thresholds(self, clauses: list[str]) -> list[dict[str, Any]]:
        return [{"clause_number": "4.2", "metadata": {"dscr_min": 1.25, "ebit_interest_min": 2.0}}]

    async def flags(self, loan_id: UUID) -> list[dict[str, Any]]:
        return [{"id": 1, "compliance_conclusion": "NO_ISSUE", "compliance_reason": "đã rà"}]

    async def collaterals(self, loan_id: UUID) -> list[dict[str, Any]]:
        return []

    async def steps(self, loan_id: UUID) -> list[dict[str, Any]]:
        return []


class P:
    def __init__(self, role: str) -> None:
        self.roles = frozenset({role})
        self.is_admin = False


async def test_only_metrics_with_a_source_are_shown() -> None:
    svc = LoanDetailService(FakeRepo([_field("dscr", "1,34", 1.34)]))  # type: ignore[arg-type]
    data = await svc.overview(P("credit_appraiser"), LOAN)
    assert [m["code"] for m in data["metrics"]] == ["dscr"]  # dti, icr, ... không có nguồn nên không hiện
    value = data["metrics"][0]["values"][0]
    assert value["document_id"] and value["page_number"] == 3 and value["result"] == "PASS"
    assert data["metrics"][0]["threshold"] == {"op": ">=", "value": 1.25}


async def test_failing_value_and_missing_threshold() -> None:
    svc = LoanDetailService(FakeRepo([_field("dscr", "1,10", 1.10), _field("ltv", "55,2", 55.2)]))  # type: ignore[arg-type]
    metrics = {m["code"]: m for m in (await svc.overview(P("credit_appraiser"), LOAN))["metrics"]}
    assert metrics["dscr"]["values"][0]["result"] == "FAIL"
    assert metrics["ltv"]["threshold"] is None and metrics["ltv"]["values"][0]["result"] is None


@pytest.mark.parametrize("role,sees", [("credit_officer", False), ("document_reviewer", False), ("admin", False),
                                       ("risk_officer", True), ("compliance_officer", True), ("auditor", True)])
async def test_compliance_conclusion_masking(role: str, sees: bool) -> None:
    data = await LoanDetailService(FakeRepo([])).overview(P(role), LOAN)  # type: ignore[arg-type]
    assert (data["flags"][0]["compliance_conclusion"] == "NO_ISSUE") is sees


def test_supplement_request_shows_reason_to_rm() -> None:
    """L07: hồ sơ chờ bổ sung -> nội dung yêu cầu lấy từ bước Thẩm định vừa đóng."""
    from datetime import UTC, datetime, timedelta

    from app.services.loan_detail_service import supplement_request

    t0 = datetime(2026, 11, 5, tzinfo=UTC)
    steps = [
        {"step_code": "APPRAISAL", "received_at": t0, "completed_at": t0 + timedelta(days=1),
         "due_at": None, "reason": "Thiếu BCTC 2025 và sao kê 12 tháng"},
        {"step_code": "PENDING_INFO", "received_at": t0 + timedelta(days=1), "completed_at": None,
         "due_at": t0 + timedelta(days=6), "reason": None},
    ]
    got = supplement_request("APPRAISAL_PENDING_INFO", steps)
    assert got is not None and got["reason"] == "Thiếu BCTC 2025 và sao kê 12 tháng"
    assert got["due_at"] == t0 + timedelta(days=6)
    assert supplement_request("APPRAISAL", steps) is None


def test_supplement_request_covers_returned_to_rm_and_own_reason() -> None:
    """L02: lý do trả lại hiện cho QHKH; ưu tiên lý do ghi trên chính bước mới mở (V056)."""
    from datetime import UTC, datetime, timedelta

    from app.services.loan_detail_service import supplement_request

    t0 = datetime(2026, 11, 5, tzinfo=UTC)
    steps = [
        {"step_code": "CHECKING", "received_at": t0, "completed_at": t0 + timedelta(days=1),
         "due_at": None, "reason": "Cũ"},
        {"step_code": "RM_REWORK", "received_at": t0 + timedelta(days=1), "completed_at": None,
         "due_at": None, "reason": "Sửa lại mục đích vay"},
    ]
    got = supplement_request("RETURNED_TO_RM", steps)
    assert got is not None and got["kind"] == "RETURNED" and got["reason"] == "Sửa lại mục đích vay"
    pend = [{"step_code": "PENDING_INFO", "received_at": t0, "completed_at": None, "due_at": None,
             "reason": "Bổ sung sao kê"}]
    got = supplement_request("APPRAISAL_PENDING_INFO", pend)
    assert got is not None and got["kind"] == "SUPPLEMENT" and got["reason"] == "Bổ sung sao kê"


def test_job_error_text_is_vietnamese_without_raw_code() -> None:
    """L05: lỗi OCR hiện lý do tiếng Việt, không mã thô, không bảo 'báo quản trị'."""
    from app.services.reconciliation_service import job_error_text

    text = job_error_text("OCRNOTEXTLAYERERROR")
    assert "lớp chữ" in text and "O_C_R" not in text and "quản trị" not in text
    assert "quản trị" not in job_error_text("PDFIUM_ERROR") and "PDFIUM" not in job_error_text("PDFIUM_ERROR")
    assert "quản trị" not in job_error_text(None)


def test_loan_overview_schema_accepts_supplement_request():
    # Lỗi gộp L07: service trả supplement_request nhưng schema (extra=forbid) từ chối → /overview 422.
    from app.schemas.loan_detail import LoanOverview

    base = {"loan": {}, "metrics": [], "flags": [], "collaterals": [], "timeline": []}
    assert LoanOverview.model_validate({**base, "supplement_request": None}).supplement_request is None
    got = LoanOverview.model_validate({**base, "supplement_request": {"reason": "x", "requested_at": "t", "due_at": None}})
    assert got.supplement_request["reason"] == "x"


def test_supplement_request_after_approval_returns_for_supplement() -> None:
    """C-N6: Phê duyệt trả lại bổ sung về Thẩm định, lý do hiện ở khung việc cần làm."""
    from datetime import UTC, datetime, timedelta

    from app.services.loan_detail_service import supplement_request

    t0 = datetime(2026, 11, 5, tzinfo=UTC)
    steps = [
        {"step_code": "APPROVAL", "received_at": t0, "completed_at": t0 + timedelta(days=1),
         "due_at": None, "reason": "Cần thêm báo cáo thẩm định tài sản", "result": "RETURN_FOR_SUPPLEMENT"},
        {"step_code": "APPRAISAL", "received_at": t0 + timedelta(days=1), "completed_at": None,
         "due_at": t0 + timedelta(days=4), "reason": None, "result": None},
    ]
    got = supplement_request("APPRAISAL", steps)
    assert got is not None
    assert got["kind"] == "RETURNED_TO_APPRAISAL"
    assert got["reason"] == "Cần thêm báo cáo thẩm định tài sản"


class _GoneRepo:
    def __init__(self, notified: bool) -> None:
        self.notified = notified

    async def loan(self, loan_id: UUID) -> None:
        return None

    async def had_notification(self, loan_id: UUID) -> bool:
        return self.notified


async def test_reassigned_loan_says_moved_without_content() -> None:
    """C-N5: người từng nhận thông báo về hồ sơ nhưng không còn đọc được nhận thông điệp "đã chuyển"."""
    from app.exceptions import NotFoundError

    with pytest.raises(NotFoundError) as moved:
        await LoanDetailService(_GoneRepo(True)).overview(P("credit_appraiser"), LOAN)  # type: ignore[arg-type]
    assert moved.value.code == "LOAN_REASSIGNED"
    with pytest.raises(NotFoundError) as unknown:
        await LoanDetailService(_GoneRepo(False)).overview(P("credit_appraiser"), LOAN)  # type: ignore[arg-type]
    assert unknown.value.code == "LOAN_NOT_FOUND"


def _explanation_steps(reason, restricted):
    from datetime import UTC, datetime, timedelta

    t0 = datetime(2026, 11, 5, tzinfo=UTC)
    return [
        {"step_code": "RISK_REVIEW", "received_at": t0, "completed_at": t0 + timedelta(days=1),
         "due_at": None, "reason": "Lý do trả lại CŨ của bước khác"},
        {"step_code": "RISK_PENDING_INFO", "received_at": t0 + timedelta(days=1), "completed_at": None,
         "due_at": t0 + timedelta(days=3), "reason": reason, "reason_restricted": restricted},
    ]


def test_hidden_step_reason_gets_neutral_text_not_old_reason() -> None:
    """P01: bước còn bị che (reason_restricted) không lùi về lý do cũ của bước khác, chỉ câu trung tính."""
    from app.services.loan_detail_service import supplement_request

    got = supplement_request("RISK_PENDING_INFO", _explanation_steps(None, True))
    assert got is not None
    assert got["reason"] == "Tuân thủ yêu cầu giải trình. Nội dung chi tiết do Tuân thủ trao đổi trực tiếp."
    assert "CŨ" not in got["reason"]


def test_explanation_reason_visible_to_recipient_and_privileged() -> None:
    """P01 + V067: lý do giải trình không bị che nên HTTD và vai được xem đều thấy đúng lý do đã lưu."""
    from app.services.loan_detail_service import supplement_request

    got = supplement_request("RISK_PENDING_INFO", _explanation_steps("Giải trình nguồn tiền quý 2.", False))
    assert got is not None and got["reason"] == "Giải trình nguồn tiền quý 2." and got["kind"] == "EXPLANATION"  # Q05
