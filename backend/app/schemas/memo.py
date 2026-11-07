"""Schema Tờ trình thẩm định (lát 10b)."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MemoSaveRequest(_Model):
    version: int = Field(ge=0)
    # Chỉ phần người viết của từng mục: {"4": "..."}; khối AI đi qua endpoint riêng.
    bodies: dict[str, str]


class AiBlockCreate(_Model):
    version: int = Field(ge=0)
    section: int
    text: str
    source_ref: str | None = None


class AiBlockDecision(_Model):
    version: int = Field(ge=0)
    decision: str = Field(pattern="^(CONFIRM|REJECT)$")


class MemoVersionSummary(BaseModel):
    revision: int
    finalized_at: datetime
    finalized_by_name: str


class MemoView(BaseModel):
    loan_application_id: UUID
    loan_status: str
    titles: dict[str, str]
    draft: dict[str, Any] | None
    editable: bool
    progress: dict[str, bool] | None
    finalized: dict[str, Any] | None
    versions: list[MemoVersionSummary]
