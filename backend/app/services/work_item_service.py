"""Queue rules for "Việc của tôi": SLA level, tags, facts, ordering."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Any, Protocol

from app.schemas.work_item import WorkItem, WorkItemFacts, WorkItemsResponse
from app.services.access import require_permission
from app.services.protocols import PrincipalLike

FILTERS = ("all", "over", "ret", "bosung", "new")


class WorkItemRepositoryLike(Protocol):
    async def badge(self, employee_id: Any) -> int: ...

    async def queue(self, employee_id: Any) -> Sequence[Mapping[str, Any]]: ...

    async def audit_recent(self) -> Sequence[Mapping[str, Any]]: ...


def sla_level(
    *,
    due_at: datetime | None,
    now: datetime,
    paused: bool,
    due_is_today: bool,
    workdays_to_due: int | None,
) -> str:
    if paused:
        return "pause"
    if due_at is None:
        return "none"
    if now > due_at:
        return "over"
    if due_is_today:
        return "today"
    if workdays_to_due is not None and workdays_to_due <= 1:
        return "soon"
    return "ok"


def tags_for(*, level: str, is_new: bool, is_return: bool, status: str) -> list[str]:
    tags: list[str] = []
    if is_new:
        tags.append("new")
    if is_return:
        tags.append("ret")
    if status.endswith("_PENDING_INFO"):
        tags.append("bosung")
    if level == "over":
        tags.append("over")
    return tags


def to_item(row: Mapping[str, Any], now: datetime, mine: bool) -> WorkItem:
    paused = bool(row["paused"])
    level = sla_level(
        due_at=row["due_at"],
        now=now,
        paused=paused,
        due_is_today=bool(row["due_is_today"]),
        workdays_to_due=row["workdays_to_due"],
    )
    return WorkItem(
        loan_application_id=row["loan_application_id"],
        application_number=row["application_number"],
        customer_name=row["customer_name"],
        requested_amount=row["requested_amount"],
        status=row["status"],
        step_code=row["step_code"],
        step_received_at=row["step_received_at"],
        due_at=row["due_at"],
        paused=paused,
        remaining_workdays=row["remaining_workdays"] if paused else None,
        sla_level=level,  # type: ignore[arg-type]
        mine=mine,
        tags=tags_for(  # type: ignore[arg-type]
            level=level,
            is_new=bool(row["is_new"]),
            is_return=bool(row["is_return"]),
            status=row["status"],
        ),
        open_flags=int(row["open_flags"]),
        high_flags=int(row["high_flags"]),
        fields_to_confirm=int(row["fields_to_confirm"]),
    )


def _sort_key(item: WorkItem) -> tuple[Any, ...]:
    return (
        not item.mine,
        item.sla_level != "over",
        item.due_at is None,
        item.due_at or datetime.max.replace(tzinfo=item.step_received_at.tzinfo),
        -item.step_received_at.timestamp(),
    )


def facts_for(items: Sequence[WorkItem]) -> WorkItemFacts:
    mine = [i for i in items if i.mine]
    return WorkItemFacts(
        overdue=sum(1 for i in mine if i.sla_level == "over"),
        due_within_1_workday=sum(1 for i in mine if i.sla_level in ("today", "soon")),
        returned=sum(1 for i in mine if "ret" in i.tags),
        waiting_supplement=sum(1 for i in items if "bosung" in i.tags),
    )


class WorkItemService:
    def __init__(self, repository: WorkItemRepositoryLike) -> None:
        self._repository = repository

    async def list(
        self, principal: PrincipalLike, *, filter_: str = "all"
    ) -> WorkItemsResponse:
        require_permission(principal, "loan:read")
        if filter_ not in FILTERS:
            raise ValueError("Unsupported work item filter")
        if "auditor" in principal.roles:
            rows = await self._repository.audit_recent()
            items = [to_item(r, r["now"], False) for r in rows]
            if filter_ != "all":
                items = [i for i in items if filter_ in i.tags]
            return WorkItemsResponse(
                badge=0,
                facts=WorkItemFacts(
                    overdue=0, due_within_1_workday=0, returned=0, waiting_supplement=0
                ),
                items=items,
            )
        rows = await self._repository.queue(principal.employee_id)
        badge = await self._repository.badge(principal.employee_id)
        items = sorted(
            (to_item(r, r["now"], bool(r["mine"])) for r in rows), key=_sort_key
        )
        facts = facts_for(items)
        if filter_ != "all":
            items = [i for i in items if filter_ in i.tags]
        return WorkItemsResponse(badge=badge, facts=facts, items=items)
