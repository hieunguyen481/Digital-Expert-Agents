"""Chạy đội agent từ trang Hồ sơ vay. Đọc theo quyền đọc hồ sơ; chạy chỉ người đang giữ hồ sơ (403 có lý do)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_loan_agent_run_service
from app.api.v1.agent_cases import _raise
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.schemas.loan_agent_run import AgentRunOverview
from app.services.agent_engine_client import AgentEngineError
from app.services.loan_agent_run_service import LoanAgentRunService

router = APIRouter(prefix="/loan-applications", tags=["loan-agent-run"])
Principal = Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))]
Service = Annotated[LoanAgentRunService, Depends(get_loan_agent_run_service)]


@router.get("/{loan_id}/agent-runs", response_model=AgentRunOverview)
async def agent_runs(loan_id: UUID, principal: Principal, service: Service) -> AgentRunOverview:
    return AgentRunOverview.model_validate(await service.overview(principal, loan_id))


@router.post("/{loan_id}/agent-runs", response_model=AgentRunOverview, status_code=201)
async def start_agent_run(loan_id: UUID, principal: Principal, service: Service) -> AgentRunOverview:
    try:
        return AgentRunOverview.model_validate(await service.start(principal, loan_id))
    except AgentEngineError as e:
        raise _raise(e) from e
