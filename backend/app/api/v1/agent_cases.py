"""Cổng chuyển tiếp tới Agent Engine cho giao diện: trace, SSE, xác nhận của người duyệt.

Mọi lời gọi mang JWT của người dùng; engine tự xác thực và áp RLS. Backend không quyết định thay.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.dependencies import PrincipalDep
from app.exceptions import AppError, DependencyUnavailableError
from app.services.agent_engine_client import AgentEngineClient, AgentEngineError

router = APIRouter(prefix="/agent-cases", tags=["agent-cases"])


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
