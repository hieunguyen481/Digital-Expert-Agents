"""Hợp đồng API hành động trên hồ sơ (lát 11)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import Field

from app.schemas.common import APIModel


class FlagNoteRequest(APIModel):
    note: str | None = Field(default=None, max_length=4000)


class FlagConclusionRequest(APIModel):
    conclusion: Literal["SUSPECTED_FRAUD", "INSUFFICIENT_BASIS", "NO_ISSUE"]
    reason: str | None = Field(default=None, max_length=4000)


class FlagConclusionResponse(APIModel):
    status: str


class OpinionRequest(APIModel):
    kind: Literal["RISK", "COMPLIANCE"]
    content: str | None = Field(default=None, max_length=8000)


class UpgradeRequest(APIModel):
    reason: str | None = Field(default=None, max_length=4000)


class UpgradeResponse(APIModel):
    tier: int


class CaseActionState(APIModel):
    version: int
    status: str
    memo_revision: int | None
    opinions: list[dict[str, Any]]
    pending_exceptions: list[dict[str, Any]]
    tier: dict[str, Any]
    excluded: bool
    blockers: list[str]
