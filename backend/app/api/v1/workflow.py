"""Chuyen buoc ho so qua WorkflowService duy nhat (Task 9).

POST /loan-applications/{id}/transitions -> 200 TransitionResponse;
409 VERSION_CONFLICT / INVALID_STATE_TRANSITION; 422 GATE_BLOCKED (details.blockers);
403 sai vai tro hoac bi tach bach. Vai tro kiem o service va o database.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.api.dependencies import get_workflow_service
from app.api.v1._utils import request_uuid
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.schemas.workflow import CaseStepResponse, TransitionRequest, TransitionResponse
from app.workflow.service import WorkflowService

router = APIRouter(prefix="/loan-applications", tags=["workflow"])


@router.post("/{loan_application_id}/transitions", response_model=TransitionResponse)
async def transition_loan_application(
    loan_application_id: UUID,
    body: TransitionRequest,
    request: Request,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))],
    service: Annotated[WorkflowService, Depends(get_workflow_service)],
) -> TransitionResponse:
    result = await service.transition(
        principal,
        loan_application_id,
        body.action,
        expected_version=body.expected_version,
        reason=body.reason,
        params=body.params,
        request_id=request_uuid(request),
    )
    return TransitionResponse(
        status=result.status,
        step_code=result.step_code,
        assignee_employee_id=result.assignee_employee_id,
        due_at=result.due_at,
        carried_flags=list(result.carried_flags),
    )


@router.get("/{loan_application_id}/steps", response_model=list[CaseStepResponse])
async def list_case_steps(
    loan_application_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))],
    service: Annotated[WorkflowService, Depends(get_workflow_service)],
) -> list[CaseStepResponse]:
    return [
        CaseStepResponse.model_validate(row)
        for row in await service.steps(principal, loan_application_id)
    ]
