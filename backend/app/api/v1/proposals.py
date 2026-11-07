"""Trang 04 "Tạo đề xuất vay": nháp và tự lưu (lát 5), tra cứu CIC, nhóm liên quan, gửi HTTD (lát 6-7)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.api.dependencies import get_cic_service, get_proposal_service, get_submission_service
from app.api.v1._utils import request_uuid
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.schemas.proposal import (
    CicStatus,
    CollateralItem,
    ConsentCreateRequest,
    DraftResponse,
    DraftSaveRequest,
    ExceptionCreateRequest,
    ExceptionItem,
    LeaseChoice,
    LoanProductResponse,
    ProposalDocument,
    RelatedParties,
    RelatedPartyDecision,
    SubmitConditions,
    SubmitRequest,
    SubmitResult,
)
from app.services.cic_service import CicService
from app.services.proposal_service import ProposalService
from app.services.submission_service import SubmissionService

router = APIRouter(tags=["proposals"])
PREFIX = "/loan-applications"

ServiceDep = Annotated[ProposalService, Depends(get_proposal_service)]
CicDep = Annotated[CicService, Depends(get_cic_service)]
SubDep = Annotated[SubmissionService, Depends(get_submission_service)]


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


@router.get(PREFIX + "/{loan_application_id}/proposal-documents", response_model=list[ProposalDocument])
async def list_proposal_documents(
    loan_application_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))],
    service: CicDep,
) -> list[ProposalDocument]:
    return [ProposalDocument.model_validate(r) for r in await service.documents(principal, loan_application_id)]


@router.get(PREFIX + "/{loan_application_id}/cic", response_model=CicStatus)
async def get_cic_status(
    loan_application_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))],
    service: CicDep,
) -> CicStatus:
    return CicStatus.model_validate(await service.status(principal, loan_application_id))


@router.post(PREFIX + "/{loan_application_id}/cic-consent", response_model=CicStatus)
async def confirm_cic_consent(
    loan_application_id: UUID,
    body: ConsentCreateRequest,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:update"))],
    service: CicDep,
) -> CicStatus:
    return CicStatus.model_validate(
        await service.record_consent(
            principal, loan_application_id, document_id=body.document_id,
            signed_on=body.signed_on, valid_until=body.valid_until,
        )
    )


@router.post(PREFIX + "/{loan_application_id}/cic-lookups", response_model=CicStatus)
async def lookup_cic(
    loan_application_id: UUID,
    principal: Annotated[CurrentPrincipal, Depends(require_permissions("loan:update"))],
    service: CicDep,
) -> CicStatus:
    return CicStatus.model_validate(await service.lookup(principal, loan_application_id))


READ = Annotated[CurrentPrincipal, Depends(require_permissions("loan:read"))]
WRITE = Annotated[CurrentPrincipal, Depends(require_permissions("loan:update"))]
LOAN = PREFIX + "/{loan_application_id}"


@router.get(LOAN + "/related-parties", response_model=RelatedParties)
async def get_related_parties(loan_application_id: UUID, principal: READ, service: SubDep) -> RelatedParties:
    return RelatedParties.model_validate(await service.related_parties(principal, loan_application_id))


@router.put(LOAN + "/related-parties/{party_id}", response_model=RelatedParties)
async def decide_related_party(
    loan_application_id: UUID, party_id: UUID, body: RelatedPartyDecision, principal: WRITE, service: SubDep
) -> RelatedParties:
    result = await service.decide_related_party(
        principal, loan_application_id, party_id, status=body.status, basis=body.basis
    )
    return RelatedParties.model_validate(result)


@router.put(LOAN + "/collaterals/{collateral_id}/lease-payment", response_model=list[CollateralItem])
async def choose_lease_payment(
    loan_application_id: UUID, collateral_id: UUID, body: LeaseChoice, principal: WRITE, service: SubDep
) -> list[CollateralItem]:
    rows = await service.choose_lease_payment(principal, loan_application_id, collateral_id, body.land_lease_payment)
    return [CollateralItem.model_validate(r) for r in rows]


@router.post(LOAN + "/exceptions", response_model=ExceptionItem, status_code=201)
async def propose_exception(
    loan_application_id: UUID, body: ExceptionCreateRequest, principal: WRITE, service: SubDep
) -> ExceptionItem:
    row = await service.propose_exception(
        principal, loan_application_id, checklist_code=body.checklist_code, reason=body.reason
    )
    return ExceptionItem.model_validate(row)


@router.post(LOAN + "/exceptions/{exception_id}/withdraw", status_code=204)
async def withdraw_exception(loan_application_id: UUID, exception_id: UUID, principal: WRITE, service: SubDep) -> None:
    await service.withdraw_exception(principal, loan_application_id, exception_id)


@router.get(LOAN + "/submit-conditions", response_model=SubmitConditions)
async def get_submit_conditions(loan_application_id: UUID, principal: READ, service: SubDep) -> SubmitConditions:
    return SubmitConditions.model_validate(await service.conditions(principal, loan_application_id))


@router.post(LOAN + "/submissions", response_model=SubmitResult)
async def submit_proposal(
    loan_application_id: UUID, body: SubmitRequest, request: Request, principal: WRITE, service: SubDep
) -> SubmitResult:
    result = await service.submit(
        principal, loan_application_id, expected_version=body.expected_version, request_id=request_uuid(request)
    )
    return SubmitResult.model_validate(result)
