"""Hiệu lực văn bản đồng ý CIC, kết quả tra CIC, sao kê (F11, Q10, E6, E9). Hàm thuần, không đọc DB."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from app.workflow.sla import TZ, add_workdays

VALIDITY_DAYS = 30  # tính cả ngày cấp/tra cứu: hiệu lực đến hết ngày + 29
STATEMENT_TYPES = frozenset({"BANK_STATEMENT", "DEBT_CONFIRMATION"})

CONSENT_OK = "OK"
CONSENT_MISSING = "MISSING"
CONSENT_UNCONFIRMED = "UNCONFIRMED"
CONSENT_EXPIRED = "EXPIRED"

_CONSENT_LOCK = {
    CONSENT_MISSING: "Chưa tra cứu CIC được: thiếu văn bản đồng ý tra cứu CIC của khách (§6.1). "
    "Tải và xác nhận văn bản này trước.",
    CONSENT_UNCONFIRMED: "Chưa tra cứu CIC được: văn bản đồng ý tra cứu CIC do AI phân loại, "
    "chưa được xác nhận. Xác nhận văn bản này trước (§6.1).",
    CONSENT_EXPIRED: "Chưa tra cứu CIC được: văn bản đồng ý tra cứu CIC đã quá hạn ghi trên văn bản. "
    "Cần văn bản đồng ý mới của khách (§6.1).",
}


def today_vn(now: datetime | None = None) -> date:
    return (now or datetime.now(TZ)).astimezone(TZ).date()


def validity_end(start: date) -> date:
    """Hiệu lực 30 ngày tính cả ngày đầu: đến hết ngày + 29 (Q10, E6)."""
    return start + timedelta(days=VALIDITY_DAYS - 1)


@dataclass(frozen=True)
class ConsentState:
    code: str
    usable: bool
    lock_reason: str | None
    valid_until: date | None = None


def evaluate_consent(
    consents: Iterable[Mapping[str, Any]],
    today: date,
    *,
    document_status: str | None = None,
) -> ConsentState:
    """Dùng được khi có văn bản đã người xác nhận và `valid_until` rỗng (suốt hồ sơ, F11) hoặc chưa qua.

    `document_status`: trạng thái xác minh của tài liệu đồng ý trên danh mục hồ sơ; có tài liệu
    nhưng chưa có bản ghi đồng ý đã xác nhận nghĩa là AI phân loại chưa được người xác nhận.
    """
    rows = list(consents)
    for row in rows:
        until = row.get("valid_until")
        if row.get("confirmed_by") is not None and (until is None or until >= today):
            return ConsentState(CONSENT_OK, True, None, until)
    if any(r.get("confirmed_by") is None for r in rows) or (not rows and document_status):
        return ConsentState(CONSENT_UNCONFIRMED, False, _CONSENT_LOCK[CONSENT_UNCONFIRMED])
    if rows:
        return ConsentState(CONSENT_EXPIRED, False, _CONSENT_LOCK[CONSENT_EXPIRED])
    return ConsentState(CONSENT_MISSING, False, _CONSENT_LOCK[CONSENT_MISSING])


@dataclass(frozen=True)
class ReportState:
    status: str  # NONE | VALID | EXPIRED
    valid_until: date | None
    relookup_flag: bool  # "Cần tra cứu lại trước khi trình" (Q10)


def evaluate_report(as_of: date | None, today: date, review_deadline: date | None) -> ReportState:
    """Kết quả tra CIC hiệu lực đến hết ngày tra + 29, xét tại ngày trình. Còn hiệu lực nhưng hết trước
    hạn Rủi ro (mốc dự kiến nếu gửi hôm nay) thì gắn cờ tra lại trước khi trình."""
    if as_of is None:
        return ReportState("NONE", None, False)
    until = validity_end(as_of)
    if until < today:
        return ReportState("EXPIRED", until, False)
    return ReportState("VALID", until, review_deadline is not None and until < review_deadline)


def statement_valid_until(issued: date) -> date:
    return validity_end(issued)


def plan_deadlines(
    today: date, sla: Mapping[str, int], holidays: frozenset[date]
) -> dict[str, date]:
    """Hạn dự kiến từng bước nếu gửi hôm nay: Kiểm tra → Thẩm định → Rủi ro (ngày làm việc)."""
    start = datetime.combine(today, datetime.min.time(), tzinfo=TZ)
    checking = add_workdays(start, sla["CHECKING"], holidays)
    appraisal = add_workdays(checking, sla["APPRAISAL"], holidays)
    risk = add_workdays(appraisal, sla["RISK_REVIEW"], holidays)
    return {"CHECKING": checking.date(), "APPRAISAL": appraisal.date(), "RISK_REVIEW": risk.date()}
