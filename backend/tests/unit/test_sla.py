from __future__ import annotations

from datetime import date, datetime

import pytest

from app.workflow.sla import (
    TZ,
    Pause,
    add_workdays,
    due_text,
    pause,
    resume,
    workdays_between,
)

NO_HOLIDAYS: frozenset[date] = frozenset()


def dt(day: int, month: int, hour: int = 0, minute: int = 0) -> datetime:
    return datetime(2026, month, day, hour, minute, tzinfo=TZ)


@pytest.mark.parametrize(
    ("start", "n", "expected"),
    [
        (dt(30, 10, 16), 5, dt(6, 11, 17)),
        (dt(5, 11, 9), 5, dt(12, 11, 17)),
        (dt(5, 11, 9), 2, dt(9, 11, 17)),
        (dt(4, 11, 9), 2, dt(6, 11, 17)),
        (dt(5, 11, 9), 0, dt(5, 11, 17)),
        (dt(31, 10, 10), 0, dt(2, 11, 17)),
    ],
)
def test_add_workdays(start: datetime, n: int, expected: datetime) -> None:
    assert add_workdays(start, n, NO_HOLIDAYS) == expected


def test_received_on_holiday_counts_from_next_workday() -> None:
    # 31/10 la thu Bay, 02/11 la ngay nghi => bat dau tu thu Ba 03/11; +2 = thu Nam 05/11
    # (khop credit.add_workdays: ngay bat dau khong duoc tinh).
    holidays = frozenset({date(2026, 11, 2)})
    assert add_workdays(dt(31, 10, 10), 2, holidays) == dt(5, 11, 17)


def test_add_workdays_negative_raises() -> None:
    with pytest.raises(ValueError):
        add_workdays(dt(5, 11, 9), -1, NO_HOLIDAYS)


def test_workdays_between() -> None:
    assert workdays_between(date(2026, 11, 5), date(2026, 11, 6), NO_HOLIDAYS) == 1
    assert workdays_between(date(2026, 11, 5), date(2026, 11, 5), NO_HOLIDAYS) == 0
    assert workdays_between(date(2026, 11, 6), date(2026, 11, 5), NO_HOLIDAYS) == -1


def test_pause_after_due_keeps_overdue() -> None:
    p = pause(dt(4, 11, 17), dt(6, 11, 10), NO_HOLIDAYS)
    assert p.remaining_workdays == -2
    assert resume(p, dt(9, 11, 10), NO_HOLIDAYS) == dt(9, 11, 17)


def test_pause_resume_preserves_remaining_workdays() -> None:
    p = pause(dt(6, 11, 17), dt(3, 11, 10), NO_HOLIDAYS)
    assert p == Pause(remaining_workdays=3, paused_at=dt(3, 11, 10))
    assert resume(p, dt(5, 11, 10), NO_HOLIDAYS) == dt(10, 11, 17)


def test_due_text() -> None:
    due = dt(6, 11, 17)
    assert due_text(due, date(2026, 11, 5), NO_HOLIDAYS) == "còn 1 ngày LV"
    assert due_text(due, date(2026, 11, 6), NO_HOLIDAYS) == "hạn hôm nay"
    assert due_text(due, date(2026, 11, 10), NO_HOLIDAYS) == "quá hạn 2 ngày LV"
