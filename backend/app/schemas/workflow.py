"""Hop dong API chuyen buoc ho so (Task 9)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.common import APIModel


class TransitionRequest(APIModel):
    action: str = Field(min_length=1, max_length=40)
    expected_version: int = Field(gt=0)
    reason: str | None = Field(default=None, max_length=4000)
    params: dict[str, Any] | None = None


class TransitionResponse(APIModel):
    status: str
    step_code: str | None
    assignee_employee_id: UUID | None
    due_at: datetime | None
    carried_flags: list[str]


class CaseStepResponse(APIModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")
    id: UUID
    loan_application_id: UUID
    step_code: str
    assignee_employee_id: UUID | None
    received_at: datetime
    due_at: datetime | None
    paused_at: datetime | None
    remaining_workdays: int | None
    resumed_at: datetime | None
    completed_at: datetime | None
    result: str | None
    reason: str | None
    created_by: UUID
