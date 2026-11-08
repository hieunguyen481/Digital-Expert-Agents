"""Cổng chuyển tiếp tới Agent Engine cho giao diện: trace, SSE, xác nhận của người duyệt.

Mọi lời gọi mang JWT của người dùng; engine tự xác thực và áp RLS. Backend không quyết định thay.
"""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.dependencies import PrincipalDep, SessionDep
from app.repositories.base import fetch_all
from app.exceptions import AppError, DependencyUnavailableError
from app.services.agent_engine_client import AgentEngineClient, AgentEngineError

router = APIRouter(prefix="/agent-cases", tags=["agent-cases"])
benchmark_router = APIRouter(prefix="/agent-benchmark", tags=["agent-benchmark"])


class ConfirmBody(BaseModel):
    loan_application_id: str
    decision_type: str = "APPROVED"
    reason: str = Field(min_length=1, max_length=2000)
    approver_level: str = "branch_director"
    approved_amount: float | None = None
    approved_term_months: int | None = None
    conditions: list[str] | None = None


class RejectBody(BaseModel):
    reason: str = Field(min_length=1, max_length=2000)


def _engine(request: Request) -> AgentEngineClient:
    engine = getattr(request.app.state, "agent_engine", None)
    if engine is None:
        raise DependencyUnavailableError("AGENT_ENGINE_UNAVAILABLE", "Agent engine chưa được cấu hình.")
    return engine


def _raise(e: AgentEngineError) -> AppError:
    status = e.status if e.status in (401, 403, 404, 409, 422) else 502
    detail = e.detail if isinstance(e.detail, dict) else {"message": str(e.detail)}
    return AppError(str(detail.get("code") or "AGENT_ENGINE_ERROR"),
                    str(detail.get("message") or "Agent engine từ chối yêu cầu."), status)


@router.get("", operation_id="list_agent_cases")
async def list_cases(request: Request, principal: PrincipalDep, limit: int = 50) -> Any:
    """Danh sách case mà người gọi được phép thấy (engine áp RLS bằng JWT của họ)."""
    del principal
    try:
        return await _engine(request).list_cases(limit)
    except AgentEngineError as e:
        raise _raise(e) from e


@router.get("/stats", operation_id="agent_case_stats")
async def case_stats(request: Request, principal: PrincipalDep) -> Any:
    """Thống kê tổng hợp trên đúng các case người gọi được thấy."""
    del principal
    try:
        return await _engine(request).case_stats()
    except AgentEngineError as e:
        raise _raise(e) from e


@router.get("/approver-names", operation_id="agent_case_approver_names")
async def approver_names(principal: PrincipalDep, session: SessionDep, ids: str = "") -> dict[str, str]:
    """Tên người duyệt theo mã nhân viên (giao diện không hiện UUID). Mã không hợp lệ/không có thì bỏ qua."""
    del principal
    wanted: list[UUID] = []
    for raw in ids.split(",")[:50]:
        try:
            wanted.append(UUID(raw.strip()))
        except ValueError:
            continue
    if not wanted:
        return {}
    rows = await fetch_all(
        session, "SELECT id::text AS id, full_name FROM identity.employee WHERE id = ANY(:ids)", {"ids": wanted})
    return {str(r["id"]): str(r["full_name"]) for r in rows}


@router.get("/{case_id}", operation_id="get_agent_case")
async def get_case(case_id: str, request: Request, principal: PrincipalDep) -> Any:
    del principal
    try:
        return await _engine(request).get_case(case_id)
    except AgentEngineError as e:
        raise _raise(e) from e


@router.get("/{case_id}/events", operation_id="list_agent_case_events")
async def get_events(case_id: str, request: Request, principal: PrincipalDep,
                     after: int = 0) -> Any:
    del principal
    try:
        return await _engine(request).get_events(case_id, after)
    except AgentEngineError as e:
        raise _raise(e) from e


@router.get("/{case_id}/stream", operation_id="stream_agent_case")
async def stream_case(case_id: str, request: Request, principal: PrincipalDep) -> StreamingResponse:
    """SSE; trình duyệt dùng fetch streaming kèm header Authorization (không token trên URL)."""
    del principal
    engine = _engine(request)
    stream = engine.stream(case_id)
    try:
        first = await anext(stream)         # lỗi xác thực/quyền hiện ra trước khi bắt đầu stream
    except StopAsyncIteration:
        first = b""
    except AgentEngineError as e:
        raise _raise(e) from e

    async def body():
        yield first
        async for chunk in stream:
            yield chunk
    return StreamingResponse(body(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/{case_id}/approve", operation_id="confirm_agent_case")
async def confirm(case_id: str, body: ConfirmBody, request: Request,
                  principal: PrincipalDep) -> Any:
    """Người có thẩm quyền xác nhận đề xuất; engine phát token rồi gọi `decide` bằng JWT này."""
    del principal
    try:
        return await _engine(request).approve(case_id, body.model_dump(exclude_none=True))
    except AgentEngineError as e:
        raise _raise(e) from e


@router.post("/{case_id}/reject", operation_id="reject_agent_case")
async def reject(case_id: str, body: RejectBody, request: Request,
                 principal: PrincipalDep) -> Any:
    del principal
    try:
        return await _engine(request).reject(case_id, body.model_dump())
    except AgentEngineError as e:
        raise _raise(e) from e


@benchmark_router.get("/latest", operation_id="get_agent_benchmark_latest")
async def benchmark_latest(request: Request, principal: PrincipalDep) -> Any:
    """Kết quả đo single-agent vs multi-agent đã lưu; chưa có thì `status=empty` (không dựng số)."""
    del principal
    try:
        return await _engine(request).benchmark_latest()
    except AgentEngineError as e:
        raise _raise(e) from e


@benchmark_router.get("/runs", operation_id="list_agent_benchmark_runs")
async def benchmark_runs(request: Request, principal: PrincipalDep) -> Any:
    """Các lượt đo đã lưu (v1 gốc, v1 chấm lại bằng bộ chấm mới, v2) để dashboard chọn."""
    del principal
    try:
        return await _engine(request).benchmark_runs()
    except AgentEngineError as e:
        raise _raise(e) from e


@benchmark_router.get("/runs/{run_id}", operation_id="get_agent_benchmark_run")
async def benchmark_run(run_id: str, request: Request, principal: PrincipalDep) -> Any:
    del principal
    try:
        return await _engine(request).benchmark_run(run_id)
    except AgentEngineError as e:
        raise _raise(e) from e
