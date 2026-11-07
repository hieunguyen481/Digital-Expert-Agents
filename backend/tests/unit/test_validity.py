"""Hiệu lực văn bản đồng ý CIC, kết quả tra CIC, sao kê (F11, Q10, E6, E9): hàm thuần."""

from __future__ import annotations

from datetime import date

from app.workflow import validity as v

TODAY = date(2026, 11, 7)


def _c(**kw: object) -> dict[str, object]:
    return {"confirmed_by": "emp", "valid_until": None, **kw}


def test_consent_without_valid_until_covers_whole_case() -> None:
    s = v.evaluate_consent([_c()], TODAY)
    assert s.usable and s.code == v.CONSENT_OK


def test_consent_expired_on_document_blocks_lookup() -> None:
    s = v.evaluate_consent([_c(valid_until=date(2026, 11, 6))], TODAY)
    assert not s.usable and s.code == v.CONSENT_EXPIRED and s.lock_reason


def test_consent_valid_until_today_still_usable() -> None:
    assert v.evaluate_consent([_c(valid_until=TODAY)], TODAY).usable


def test_consent_unconfirmed_ai_blocks() -> None:
    s = v.evaluate_consent([_c(confirmed_by=None)], TODAY)
    assert s.code == v.CONSENT_UNCONFIRMED and not s.usable
    only_doc = v.evaluate_consent([], TODAY, document_status="AI_PROPOSED")
    assert only_doc.code == v.CONSENT_UNCONFIRMED


def test_consent_missing_blocks() -> None:
    s = v.evaluate_consent([], TODAY)
    assert s.code == v.CONSENT_MISSING and not s.usable


def test_expired_old_consent_does_not_hide_a_newer_valid_one() -> None:
    assert v.evaluate_consent([_c(valid_until=date(2026, 1, 1)), _c()], TODAY).usable


def test_report_valid_through_lookup_day_plus_29() -> None:
    last = date(2026, 10, 9)  # + 29 = 2026-11-07
    assert v.validity_end(last) == TODAY
    assert v.evaluate_report(last, TODAY, None).status == "VALID"
    assert v.evaluate_report(date(2026, 10, 8), TODAY, None).status == "EXPIRED"


def test_report_older_than_30_days_is_expired_and_none_is_none() -> None:
    r = v.evaluate_report(date(2026, 10, 5), TODAY, date(2026, 11, 20))
    assert r.status == "EXPIRED" and r.valid_until == date(2026, 11, 3) and not r.relookup_flag
    assert v.evaluate_report(None, TODAY, None).status == "NONE"


def test_report_flagged_when_it_ends_before_risk_deadline() -> None:
    r = v.evaluate_report(date(2026, 10, 20), TODAY, date(2026, 11, 20))  # hết 18/11 < 20/11
    assert r.status == "VALID" and r.relookup_flag
    assert not v.evaluate_report(date(2026, 11, 7), TODAY, date(2026, 11, 20)).relookup_flag


def test_statement_valid_30_days_from_issue_date() -> None:
    assert v.statement_valid_until(date(2026, 10, 9)) == date(2026, 11, 7)


def test_plan_deadlines_skip_weekends_and_holidays() -> None:
    d = v.plan_deadlines(date(2026, 11, 6), {"CHECKING": 2, "APPRAISAL": 5, "RISK_REVIEW": 3}, frozenset())
    assert d["CHECKING"] == date(2026, 11, 10)  # T6 → T3
    assert d["RISK_REVIEW"] == date(2026, 11, 20)
