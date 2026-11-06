"""Role-aware work queue ("Việc của tôi")."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import PrincipalDep, get_work_item_service
from app.schemas.work_item import WorkFilter, WorkItemsResponse
from app.services.work_item_service import WorkItemService

router = APIRouter(prefix="/work-items", tags=["work-items"])


@router.get("", response_model=WorkItemsResponse, operation_id="list_work_items")
async def list_work_items(
    principal: PrincipalDep,
    service: Annotated[WorkItemService, Depends(get_work_item_service)],
    filter: Annotated[WorkFilter, Query()] = "all",  # noqa: A002
) -> WorkItemsResponse:
    return await service.list(principal, filter_=filter)
