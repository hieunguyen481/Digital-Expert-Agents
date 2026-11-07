"""Trang 04 "Tạo đề xuất vay": nháp và tự lưu (lát 5), tra cứu CIC, nhóm liên quan, gửi HTTD (lát 6-7)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_proposal_service
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.schemas.proposal import DraftResponse, DraftSaveRequest, LoanProductResponse
from app.services.proposal_service import ProposalService

router = APIRouter(tags=["proposals"])
PREFIX = "/loan-applications"

ServiceDep = Annotated[ProposalService, Depends(get_proposal_service)]


@router.get(PREFIX + "/{loan_application_id}/draft", response_model=DraftResponse)
async def get_draft(
    loan_application_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))],
    service: ServiceDep,
) -> DraftResponse:
    return DraftResponse.model_validate(await service.get_draft(principal, loan_application_id))


@router.put(PREFIX + "/{loan_application_id}/draft", response_model=DraftResponse)
async def save_draft(
    loan_application_id: UUID,
    body: DraftSaveRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:update"))],
    service: ServiceDep,
) -> DraftResponse:
    values = body.model_dump(exclude={"version"})
    return DraftResponse.model_validate(
        await service.save_draft(principal, loan_application_id, values, expected_version=body.version)
    )


@router.get("/loan-products", response_model=list[LoanProductResponse])
async def list_loan_products(
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:create"))],
    service: ServiceDep,
) -> list[LoanProductResponse]:
    return [LoanProductResponse.model_validate(r) for r in await service.list_products(principal)]
