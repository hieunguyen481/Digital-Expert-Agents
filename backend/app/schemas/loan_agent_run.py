"""Hợp đồng API chạy đội agent trên hồ sơ vay."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.schemas.common import APIModel


class AgentRunItem(APIModel):
    id: UUID
    case_id: str
    created_at: datetime
    started_by: UUID
    started_by_name: str | None = None


class AgentRunOverview(APIModel):
    can_run: bool
    deny_reason: str | None = None
    latest: AgentRunItem | None = None
    runs: list[AgentRunItem]
