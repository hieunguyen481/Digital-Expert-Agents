"""Tờ trình thẩm định (lát 10b): bản nháp tự lưu, khối AI chờ xác nhận, bản đã chốt."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.api.dependencies import get_memo_service
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.schemas.memo import AiBlockCreate, AiBlockDecision, MemoSaveRequest, MemoView
from app.services.memo_service import MemoService

router = APIRouter(tags=["memo"])
Svc = Annotated[MemoService, Depends(get_memo_service)]
# Quyền vai trò và việc được giao do service + RLS kiểm (giống trang 05).
READ = Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))]
BASE = "/loan-applications/{loan_application_id}/memo"


@router.get(BASE, response_model=MemoView)
async def get_memo(loan_application_id: UUID, principal: READ, service: Svc) -> MemoView:
    return MemoView.model_validate(await service.view(principal, loan_application_id))


@router.put(BASE, response_model=MemoView)
async def save_memo(loan_application_id: UUID, body: MemoSaveRequest, principal: READ, service: Svc) -> MemoView:
    result = await service.save(principal, loan_application_id, body.bodies, expected_version=body.version)
    return MemoView.model_validate(result)


@router.post(BASE + "/ai-blocks", response_model=MemoView, status_code=201)
async def add_ai_block(loan_application_id: UUID, body: AiBlockCreate, principal: READ, service: Svc) -> MemoView:
    result = await service.add_ai_block(
        principal, loan_application_id, section=body.section, text=body.text, source_ref=body.source_ref,
        expected_version=body.version,
    )
    return MemoView.model_validate(result)


@router.post(BASE + "/ai-blocks/{block_id}/decision", response_model=MemoView)
async def decide_ai_block(
    loan_application_id: UUID, block_id: UUID, body: AiBlockDecision, principal: READ, service: Svc
) -> MemoView:
    result = await service.decide_ai_block(
        principal, loan_application_id, block_id, confirm=body.decision == "CONFIRM", expected_version=body.version
    )
    return MemoView.model_validate(result)


@router.get(BASE + "/pdf", response_class=Response, responses={200: {"content": {"application/pdf": {}}}})
async def export_memo_pdf(
    loan_application_id: UUID, principal: READ, service: Svc, revision: int | None = None
) -> Response:
    data, name = await service.export_pdf(loan_application_id, revision)
    return Response(data, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{name}"'})
