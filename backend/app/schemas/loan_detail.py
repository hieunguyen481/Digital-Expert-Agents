"""Schema trang 02b phần đọc (lát 10)."""

from __future__ import annotations

from typing import Any

from app.schemas.common import APIModel


class LoanOverview(APIModel):
    loan: dict[str, Any]
    metrics: list[dict[str, Any]]
    flags: list[dict[str, Any]]
    collaterals: list[dict[str, Any]]
    timeline: list[dict[str, Any]]
