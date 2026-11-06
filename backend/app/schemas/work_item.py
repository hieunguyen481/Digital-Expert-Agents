"""Response models for the "Việc của tôi" queue."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from app.schemas.common import APIModel, DecimalString

SlaLevel = Literal["over", "today", "soon", "ok", "pause", "none"]
WorkTag = Literal["new", "ret", "bosung", "over"]
WorkFilter = Literal["all", "over", "ret", "bosung", "new"]


class WorkItem(APIModel):
    loan_application_id: UUID
    application_number: str
    customer_name: str
    requested_amount: DecimalString
    status: str
    step_code: str
    step_received_at: datetime
    due_at: datetime | None
    paused: bool
    remaining_workdays: int | None
    sla_level: SlaLevel
    mine: bool
    tags: list[WorkTag]
    open_flags: int
    high_flags: int
    fields_to_confirm: int


class WorkItemFacts(APIModel):
    overdue: int
    due_within_1_workday: int
    returned: int
    waiting_supplement: int


class WorkItemsResponse(APIModel):
    badge: int
    facts: WorkItemFacts
    items: list[WorkItem]
