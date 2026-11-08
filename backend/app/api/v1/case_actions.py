"""Hành động trên hồ sơ ở trang 02b (lát 11). Chuyển bước vẫn đi qua POST /transitions."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response

from app.api.dependencies import get_case_action_service
from app.api.v1._utils import request_uuid
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.schemas.case_action import (
    CaseActionState,
    FlagConclusionRequest,
    FlagConclusionResponse,
    FlagNoteRequest,
    OpinionRequest,
    UpgradeRequest,
    UpgradeResponse,
)
from app.services.case_action_service import CaseActionService

router = APIRouter(prefix="/loan-applications", tags=["case-actions"])
Principal = Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))]
Service = Annotated[CaseActionService, Depends(get_case_action_service)]


@router.get("/{loan_id}/actions", response_model=CaseActionState)
async def action_state(loan_id: UUID, principal: Principal, service: Service) -> CaseActionState:
    return CaseActionState.model_validate(await service.state(principal, loan_id))


@router.post("/{loan_id}/flags/{flag_id}/handle", status_code=204)
async def handle_flag(loan_id: UUID, flag_id: UUID, body: FlagNoteRequest, principal: Principal, service: Service) -> Response:
    await service.handle_flag(principal, loan_id, flag_id, body.note)
    return Response(status_code=204)


@router.post("/{loan_id}/flags/{flag_id}/early-warning", status_code=204)
async def early_warning(loan_id: UUID, flag_id: UUID, body: FlagNoteRequest, principal: Principal, service: Service) -> Response:
    await service.early_warning(principal, loan_id, flag_id, body.note)
    return Response(status_code=204)


@router.post("/{loan_id}/flags/{flag_id}/conclusion", response_model=FlagConclusionResponse)
async def conclude_flag(
    loan_id: UUID, flag_id: UUID, body: FlagConclusionRequest, request: Request, principal: Principal, service: Service
) -> FlagConclusionResponse:
    status = await service.conclude_flag(
        principal, loan_id, flag_id, body.conclusion, body.reason, request_id=request_uuid(request)
    )
    return FlagConclusionResponse(status=status)


@router.post("/{loan_id}/risk-opinions", status_code=204)
async def add_opinion(loan_id: UUID, body: OpinionRequest, principal: Principal, service: Service) -> Response:
    await service.add_opinion(principal, loan_id, body.kind, body.content)
    return Response(status_code=204)


@router.post("/{loan_id}/approval-upgrade", response_model=UpgradeResponse)
async def upgrade_approval(loan_id: UUID, body: UpgradeRequest, principal: Principal, service: Service) -> UpgradeResponse:
    return UpgradeResponse(tier=await service.upgrade_approval(principal, loan_id, body.reason))
