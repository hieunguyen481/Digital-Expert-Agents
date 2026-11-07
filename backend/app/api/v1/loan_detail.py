"""Trang 02b "Chi tiết hồ sơ vay", phần đọc (lát 10). Quyền đọc theo RLS của hồ sơ."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.dependencies import get_loan_detail_service
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.schemas.loan_detail import LoanOverview
from app.services.loan_detail_service import LoanDetailService

router = APIRouter(tags=["loan-detail"])


@router.get("/loan-applications/{loan_application_id}/overview", response_model=LoanOverview)
async def get_overview(
    loan_application_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))],
    service: Annotated[LoanDetailService, Depends(get_loan_detail_service)],
) -> LoanOverview:
    return LoanOverview.model_validate(await service.overview(principal, loan_application_id))
