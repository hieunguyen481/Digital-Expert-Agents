"""Client gọi Agent Engine (agent_engine/) từ backend, luôn kèm JWT của người dùng.

Engine tự xác thực JWT (JWKS Keycloak), chạy dưới RLS bằng danh tính nhân viên đó. Lỗi engine
được báo rõ bằng `AgentEngineError`, không âm thầm đổi sang đường khác.
"""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.auth.bearer import current_bearer

_FINAL_STATES = {"Pending Approval", "Needs Info", "Rejected", "Escalated", "Completed"}


class AgentEngineError(Exception):
    """Engine từ chối hoặc không phản hồi. `status` là mã HTTP của engine (0 = không kết nối)."""

    def __init__(self, status: int, detail: Any) -> None:
        super().__init__(str(detail))
        self.status = status
        self.detail = detail


class AgentEngineClient:
    def __init__(self, base_url: str, timeout: float = 60.0) -> None:
        self._base = base_url.rstrip("/")
        self._timeout = timeout

    def _headers(self, jwt: str | None) -> dict[str, str]:
        token = jwt or current_bearer.get()
        if not token:
            raise AgentEngineError(401, "Thiếu JWT của người dùng để gọi agent engine")
        return {"Authorization": f"Bearer {token}"}

    async def _call(self, method: str, path: str, *, jwt: str | None = None, **kw: Any) -> Any:
        headers = self._headers(jwt)
        try:
            async with httpx.AsyncClient(base_url=self._base, timeout=self._timeout) as c:
                r = await c.request(method, path, headers=headers, **kw)
        except httpx.HTTPError as e:
            raise AgentEngineError(0, f"Không kết nối được agent engine: {type(e).__name__}") from e
        if r.status_code >= 400:
            try:
                detail = r.json().get("detail", r.text)
            except ValueError:
                detail = r.text
            raise AgentEngineError(r.status_code, detail)
        return r.json()

    async def create_case(self, request: dict[str, Any],
                          documents: list[dict[str, Any]] | None = None,
                          jwt: str | None = None) -> str:
        data = await self._call("POST", "/cases", jwt=jwt,
                                json={"request": request, "documents": documents or []})
        return data["case_id"]

    async def run(self, case_id: str, jwt: str | None = None) -> None:
        await self._call("POST", f"/cases/{case_id}/run", jwt=jwt)

    async def list_cases(self, limit: int = 50, jwt: str | None = None) -> list[dict[str, Any]]:
        return await self._call("GET", "/cases", jwt=jwt, params={"limit": limit})

    async def case_stats(self, jwt: str | None = None) -> dict[str, Any]:
        return await self._call("GET", "/cases/stats", jwt=jwt)

    async def get_case(self, case_id: str, jwt: str | None = None) -> dict[str, Any]:
        return await self._call("GET", f"/cases/{case_id}", jwt=jwt)

    async def get_events(self, case_id: str, after: int = 0,
                         jwt: str | None = None) -> list[dict[str, Any]]:
        return await self._call("GET", f"/cases/{case_id}/events", jwt=jwt, params={"after": after})

    async def wait_final(self, case_id: str, timeout_s: float = 600, jwt: str | None = None) -> str:
        token = jwt or current_bearer.get()
        for _ in range(int(timeout_s)):
            state = (await self.get_case(case_id, jwt=token)).get("state", "")
            if state in _FINAL_STATES:
                return state
            await asyncio.sleep(1)
        raise TimeoutError(f"case {case_id} chưa đạt trạng thái cuối sau {timeout_s}s")

    async def approve(self, case_id: str, body: dict[str, Any], jwt: str | None = None) -> Any:
        """Người có thẩm quyền xác nhận; engine phát approval token và gọi backend `decide`."""
        return await self._call("POST", f"/cases/{case_id}/approve", jwt=jwt, json=body)

    async def loan_decided(self, case_id: str, loan_id: str, jwt: str | None = None) -> Any:
        """Báo hồ sơ đã được quyết định trên workflow; engine tự kiểm lại và đóng ca còn mở."""
        return await self._call("POST", f"/cases/{case_id}/loan-decided", jwt=jwt,
                                json={"loan_application_id": loan_id})

    async def proposals(self, case_id: str, jwt: str | None = None) -> Any:
        return await self._call("GET", f"/cases/{case_id}/proposals", jwt=jwt)

    async def decide_proposal(self, proposal_id: str, verb: str, body: dict[str, Any], jwt: str | None = None) -> Any:
        """verb: confirm | dismiss. Engine thực hiện bằng JWT của chính người bấm."""
        return await self._call("POST", f"/proposals/{proposal_id}/{verb}", jwt=jwt, json=body)

    async def reject(self, case_id: str, body: dict[str, Any], jwt: str | None = None) -> Any:
        return await self._call("POST", f"/cases/{case_id}/reject", jwt=jwt, json=body)

    async def benchmark_runs(self, jwt: str | None = None) -> dict[str, Any]:
        return await self._call("GET", "/benchmark/runs", jwt=jwt)

    async def benchmark_run(self, run_id: str, jwt: str | None = None) -> dict[str, Any]:
        return await self._call("GET", f"/benchmark/runs/{run_id}", jwt=jwt)

    async def benchmark_latest(self, jwt: str | None = None) -> dict[str, Any]:
        """Kết quả benchmark single-agent vs multi-agent mới nhất (engine đọc dưới RLS)."""
        return await self._call("GET", "/benchmark/latest", jwt=jwt)

    async def agent_registry(self, jwt: str | None = None) -> list[dict[str, Any]]:
        return await self._call("GET", "/agents", jwt=jwt)

    async def stream(self, case_id: str, jwt: str | None = None) -> AsyncIterator[bytes]:
        """Chuyển tiếp SSE của engine (đã xác thực bằng header)."""
        headers = self._headers(jwt)
        try:
            async with httpx.AsyncClient(base_url=self._base, timeout=None) as c, c.stream(
                    "GET", f"/cases/{case_id}/stream", headers=headers) as r:
                if r.status_code >= 400:
                    await r.aread()
                    raise AgentEngineError(r.status_code, r.text)
                async for chunk in r.aiter_raw():
                    yield chunk
        except httpx.HTTPError as e:
            raise AgentEngineError(0, f"Mất kết nối agent engine: {type(e).__name__}") from e
