"""Client MCP: mọi agent gọi tool nghiệp vụ qua đây — không import trực tiếp.

Mỗi call mở một session streamable-http (local nên chi phí không đáng kể).
"""
from __future__ import annotations

import json
import time
from typing import Any

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from . import config, events, identity, trace_ctx


async def call_tool(name: str, arguments: dict[str, Any] | None = None) -> Any:
    t0 = time.monotonic()
    outcome = "ok"
    try:
        async with streamablehttp_client(config.MCP_CORE_BANKING_URL, headers=identity.headers_for()) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(name, arguments or {})
        return _guard(_unwrap(result))
    except McpDenied:
        outcome = "denied"
        raise
    except Exception:
        outcome = "error"
        raise
    finally:
        ctx = trace_ctx.current()
        if ctx is not None:  # chỉ ghi khi đang chạy trong một case; không ghi giá trị tham số
            await events.emit(ctx[0], ctx[1], "tool_call", {
                "tool": name, "outcome": outcome, "arg_keys": sorted(arguments or {}),
                "duration_ms": int((time.monotonic() - t0) * 1000)})


class McpDenied(PermissionError):
    """MCP từ chối (thiếu danh tính / không có quyền): agent không được đi tiếp với dữ liệu rỗng."""


def _guard(value: Any) -> Any:
    first = value[0] if isinstance(value, list) and len(value) == 1 else value
    if isinstance(first, dict) and str(first.get("error", "")).startswith("từ chối"):
        raise McpDenied(first["error"])
    return value


def _unwrap(result) -> Any:
    if result.structuredContent is not None:
        sc = result.structuredContent
        # FastMCP bọc giá trị trả về đơn trong {"result": ...}
        return sc.get("result", sc) if isinstance(sc, dict) else sc
    texts = [c.text for c in result.content if getattr(c, "text", None)]
    raw = "\n".join(texts)
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw


async def list_tools() -> list[dict]:
    async with streamablehttp_client(config.MCP_CORE_BANKING_URL, headers=identity.headers_for()) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            res = await session.list_tools()
    return [
        {"name": t.name, "description": t.description or "", "input_schema": t.inputSchema}
        for t in res.tools
    ]
