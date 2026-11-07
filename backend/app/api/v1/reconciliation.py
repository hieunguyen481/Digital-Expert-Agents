"""Trang 05 "Đối chiếu tài liệu": tài liệu theo hồ sơ, chốt nguồn mâu thuẫn, checklist, chuyển Thẩm định."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.api.dependencies import get_reconciliation_service
from app.api.v1._utils import request_uuid
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.schemas.proposal import SubmitRequest, SubmitResult
from app.schemas.reconciliation import (
    CheckRequest,
    ReconDocumentDetail,
    ReconLog,
    ReconView,
    ResolveRequest,
)
from app.services.reconciliation_service import ReconciliationService

router = APIRouter(tags=["reconciliation"])
Svc = Annotated[ReconciliationService, Depends(get_reconciliation_service)]
READ = Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))]
# Ghi (hậu kiểm, chốt nguồn, chuyển bước) cũng cần `loan:read`: vai trò và việc được giao do service/workflow kiểm,
# giống POST /loan-applications/{id}/transitions; Hậu kiểm chỉ có `loan:read` nên không thể đòi `loan:update`.
BASE = "/loan-applications/{loan_application_id}/reconciliation"


@router.get(BASE, response_model=ReconView)
async def get_reconciliation(loan_application_id: UUID, principal: READ, service: Svc) -> ReconView:
    return ReconView.model_validate(await service.view(principal, loan_application_id))


@router.get(BASE + "/documents/{document_id}", response_model=ReconDocumentDetail)
async def get_reconciliation_document(
    loan_application_id: UUID, document_id: UUID, principal: READ, service: Svc
) -> ReconDocumentDetail:
    return ReconDocumentDetail.model_validate(await service.document(principal, loan_application_id, document_id))


@router.get(BASE + "/log", response_model=ReconLog)
async def get_reconciliation_log(loan_application_id: UUID, principal: READ, service: Svc) -> ReconLog:
    return ReconLog.model_validate(await service.log(principal, loan_application_id))


@router.post(BASE + "/items/{item_id}/check")
async def check_item(
    loan_application_id: UUID, item_id: UUID, body: CheckRequest, principal: READ, service: Svc
) -> dict[str, object]:
    return await service.check_item(principal, loan_application_id, item_id, result=body.result, note=body.note)


@router.post(BASE + "/conflicts/{conflict_id}/resolution")
async def resolve_conflict(
    loan_application_id: UUID, conflict_id: UUID, body: ResolveRequest, principal: READ, service: Svc
) -> dict[str, object]:
    return await service.resolve_conflict(
        principal, loan_application_id, conflict_id, chosen_field_id=body.chosen_field_id, reason=body.reason
    )


@router.post(BASE + "/transfer", response_model=SubmitResult)
async def transfer_to_appraisal(
    loan_application_id: UUID, body: SubmitRequest, request: Request, principal: READ, service: Svc
) -> SubmitResult:
    result = await service.transfer(
        principal, loan_application_id, expected_version=body.expected_version, request_id=request_uuid(request)
    )
    return SubmitResult.model_validate(result)
