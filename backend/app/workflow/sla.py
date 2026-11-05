"""Tinh ngay lam viec va SLA; khop credit.add_workdays / credit.workdays_between (V023)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Ho_Chi_Minh")
DUE_TIME = time(17, 0)


def _local_date(moment: datetime) -> date:
    if moment.tzinfo is None:
        return moment.date()
    return moment.astimezone(TZ).date()


def is_workday(day: date, holidays: frozenset[date]) -> bool:
    return day.isoweekday() < 6 and day not in holidays


def add_workdays(start: datetime, n: int, holidays: frozenset[date]) -> datetime:
    """17:00 (gio VN) cua ngay lam viec thu n sau ngay bat dau (ngay bat dau khong tinh).

    Ngay bat dau khong phai ngay lam viec thi lui sang ngay lam viec ke tiep.
    """
    if n < 0:
        raise ValueError(f"n must be >= 0, got {n}")
    cursor = _local_date(start)
    while not is_workday(cursor, holidays):
        cursor += timedelta(days=1)
    remaining = n
    while remaining > 0:
        cursor += timedelta(days=1)
        if is_workday(cursor, holidays):
            remaining -= 1
    return datetime.combine(cursor, DUE_TIME, tzinfo=TZ)


def workdays_between(a: date, b: date, holidays: frozenset[date]) -> int:
    """So ngay lam viec trong (a, b]; am neu b < a."""
    low, high = (a, b) if a <= b else (b, a)
    count = sum(
        1
        for offset in range(1, (high - low).days + 1)
        if is_workday(low + timedelta(days=offset), holidays)
    )
    return count if b >= a else -count


@dataclass(frozen=True)
class Pause:
    remaining_workdays: int
    paused_at: datetime


def pause(due_at: datetime, at: datetime, holidays: frozenset[date]) -> Pause:
    return Pause(
        remaining_workdays=workdays_between(_local_date(at), _local_date(due_at), holidays),
        paused_at=at,
    )


def resume(p: Pause, at: datetime, holidays: frozenset[date]) -> datetime:
    """Han moi; neu da qua han luc tam dung thi han = 17:00 ngay `at` (van qua han)."""
    return add_workdays(at, max(p.remaining_workdays, 0), holidays)


def due_text(due_at: datetime, today: date, holidays: frozenset[date]) -> str:
    n = workdays_between(today, _local_date(due_at), holidays)
    if n == 0:
        return "hạn hôm nay"
    if n > 0:
        return f"còn {n} ngày LV"
    return f"quá hạn {-n} ngày LV"
