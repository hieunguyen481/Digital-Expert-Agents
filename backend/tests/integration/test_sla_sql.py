"""Kiem cheo app.workflow.sla voi credit.add_workdays / credit.workdays_between."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from datetime import date, datetime

import asyncpg
import pytest
import pytest_asyncio

from app.workflow.sla import TZ, add_workdays, workdays_between

NO_HOLIDAYS: frozenset[date] = frozenset()
HOLIDAY = date(2026, 11, 2)


def dt(day: int, month: int, hour: int = 0) -> datetime:
    return datetime(2026, month, day, hour, tzinfo=TZ)


@pytest_asyncio.fixture
async def holiday_row() -> AsyncIterator[date]:
    """bank_app chi SELECT credit.holiday, nen chen/xoa bang ket noi migrator rieng."""
    dsn = os.environ.get("TEST_MIGRATOR_DSN")
    if not dsn:
        pytest.skip("TEST_MIGRATOR_DSN chua dat; chay backend/scripts/test-integration.ps1")
    admin = await asyncpg.connect(dsn)
    inserted = False
    try:
        status = await admin.execute(
            "INSERT INTO credit.holiday (day, name) VALUES ($1, 'test holiday')"
            " ON CONFLICT (day) DO NOTHING",
            HOLIDAY,
        )
        inserted = status.endswith(" 1")
        yield HOLIDAY
    finally:
        try:
            if inserted:
                await admin.execute("DELETE FROM credit.holiday WHERE day = $1", HOLIDAY)
        finally:
            await admin.close()


ADD_CASES = [
    (dt(30, 10, 16), 5),
    (dt(5, 11, 9), 5),
    (dt(5, 11, 9), 2),
    (dt(4, 11, 9), 2),
    (dt(5, 11, 9), 0),
    (dt(31, 10, 10), 0),
    (dt(31, 10, 10), 2),
]


@pytest.mark.parametrize(("start", "n"), ADD_CASES)
async def test_add_workdays_matches_sql(db: asyncpg.Connection, start: datetime, n: int) -> None:
    sql_value = await db.fetchval("SELECT credit.add_workdays($1, $2)", start, n)
    assert sql_value == add_workdays(start, n, NO_HOLIDAYS)


@pytest.mark.parametrize(
    ("a", "b"),
    [
        (date(2026, 11, 5), date(2026, 11, 6)),
        (date(2026, 11, 5), date(2026, 11, 5)),
        (date(2026, 11, 6), date(2026, 11, 5)),
        (date(2026, 10, 30), date(2026, 11, 9)),
        (date(2026, 11, 9), date(2026, 10, 30)),
    ],
)
async def test_workdays_between_matches_sql(db: asyncpg.Connection, a: date, b: date) -> None:
    sql_value = await db.fetchval("SELECT credit.workdays_between($1, $2)", a, b)
    assert sql_value == workdays_between(a, b, NO_HOLIDAYS)


async def test_holiday_cases_match_sql(db: asyncpg.Connection, holiday_row: date) -> None:
    holidays = frozenset({holiday_row})
    start = dt(31, 10, 10)
    sql_value = await db.fetchval("SELECT credit.add_workdays($1, $2)", start, 2)
    assert sql_value == add_workdays(start, 2, holidays) == dt(5, 11, 17)
    a, b = date(2026, 10, 30), date(2026, 11, 4)
    sql_between = await db.fetchval("SELECT credit.workdays_between($1, $2)", a, b)
    assert sql_between == workdays_between(a, b, holidays) == 2


async def test_negative_n_rejected_by_sql_and_python(db: asyncpg.Connection) -> None:
    with pytest.raises(asyncpg.InvalidParameterValueError):
        await db.fetchval("SELECT credit.add_workdays($1, -1)", dt(5, 11, 9))
    with pytest.raises(ValueError):
        add_workdays(dt(5, 11, 9), -1, NO_HOLIDAYS)
