"""Ngữ cảnh trace của tác vụ đang chạy (case + agent) để ghi lời gọi MCP và chi phí LLM vào trace."""
from __future__ import annotations

from contextvars import ContextVar

_ctx: ContextVar[tuple[str, str] | None] = ContextVar("engine_trace_ctx", default=None)


def bind(case_id: str, agent: str) -> None:
    _ctx.set((case_id, agent))


def current() -> tuple[str, str] | None:
    return _ctx.get()
