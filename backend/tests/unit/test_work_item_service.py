"""SLA level, tags, facts and permissions of the work queue."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.services.work_item_service import WorkItemService, sla_level, tags_for

NOW = datetime(2026, 11, 6, 5, 0, tzinfo=UTC)


def _lvl(**kw):  # type: ignore[no-untyped-def]
    base = dict(due_at=NOW + timedelta(days=5), now=NOW, paused=False, due_is_today=False, workdays_to_due=3)
    base.update(kw)
    return sla_level(**base)


def test_sla_levels() -> None:
    assert _lvl(paused=True) == "pause"
    assert _lvl(due_at=None) == "none"
    assert _lvl(due_at=NOW - timedelta(hours=1)) == "over"
    assert _lvl(due_at=NOW + timedelta(hours=2), due_is_today=True, workdays_to_due=0) == "today"
    assert _lvl(workdays_to_due=1) == "soon"
    assert _lvl() == "ok"


def test_tags() -> None:
    assert tags_for(level="over", is_new=True, is_return=True, status="APPRAISAL_PENDING_INFO") == [
        "new", "ret", "bosung", "over",
    ]
    assert tags_for(level="ok", is_new=False, is_return=False, status="APPRAISAL") == []


class _Principal:
    def __init__(self, permissions: set[str], roles: set[str]) -> None:
        self.employee_id = uuid4()
        self.permissions = frozenset(permissions)
        self.roles = frozenset(roles)


class _Repo:
    def __init__(self, rows: list[dict]) -> None:  # type: ignore[type-arg]
        self.rows = rows

    async def badge(self, employee_id):  # type: ignore[no-untyped-def]
        return sum(1 for r in self.rows if r["mine"])

    async def queue(self, employee_id):  # type: ignore[no-untyped-def]
        return self.rows

    async def audit_recent(self):  # type: ignore[no-untyped-def]
        return self.rows


def _row(number: str, *, mine: bool, due_in_days: int, ret: bool = False, status: str = "APPRAISAL") -> dict:  # type: ignore[type-arg]
    return {
        "loan_application_id": uuid4(), "application_number": number, "customer_name": "KH",
        "requested_amount": 1, "status": status, "step_code": "APPRAISAL",
        "step_received_at": NOW - timedelta(days=1), "due_at": NOW + timedelta(days=due_in_days),
        "paused": False, "remaining_workdays": None, "now": NOW, "due_is_today": False,
        "workdays_to_due": due_in_days, "is_new": False, "is_return": ret, "open_flags": 0,
        "high_flags": 0, "fields_to_confirm": 0, "mine": mine,
    }


async def test_order_facts_and_filter() -> None:
    rows = [
        _row("B", mine=False, due_in_days=-2),
        _row("C", mine=True, due_in_days=3, ret=True),
        _row("A", mine=True, due_in_days=-1),
        _row("D", mine=True, due_in_days=1),
    ]
    service = WorkItemService(_Repo(rows))
    result = await service.list(_Principal({"loan:read"}, {"credit_appraiser"}))
    assert [i.application_number for i in result.items] == ["A", "D", "C", "B"]
    assert result.badge == 3
    assert (result.facts.overdue, result.facts.due_within_1_workday, result.facts.returned) == (1, 1, 1)
    only = await service.list(_Principal({"loan:read"}, {"credit_appraiser"}), filter_="ret")
    assert [i.application_number for i in only.items] == ["C"]


async def test_auditor_is_read_only() -> None:
    result = await WorkItemService(_Repo([_row("X", mine=True, due_in_days=-1)])).list(
        _Principal({"loan:read"}, {"auditor"})
    )
    assert result.badge == 0 and not result.items[0].mine
    assert result.facts.overdue == 0


async def test_requires_loan_read() -> None:
    with pytest.raises(PermissionError):
        await WorkItemService(_Repo([])).list(_Principal(set(), {"admin"}))
