"""Current employee endpoint."""


from fastapi import APIRouter

from app.api.dependencies import PrincipalDep, SessionDep
from app.exceptions import AuthenticationError
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.auth import MeResponse

router = APIRouter(prefix="/me", tags=["current-employee"])


@router.get("", response_model=MeResponse, operation_id="get_current_employee")
async def get_me(principal: PrincipalDep, session: SessionDep) -> MeResponse:
    profile = await EmployeeRepository(session).get_profile(principal.employee_id)
    if profile is None:
        raise AuthenticationError("PROFILE_NOT_FOUND", "Employee profile is not available.")
    return MeResponse(
        employee_id=principal.employee_id,
        subject=principal.subject,
        branch_id=principal.branch_id,
        roles=sorted(principal.roles),
        permissions=sorted(principal.permissions),
        is_admin=principal.is_admin,
        full_name=profile.full_name,
        email=profile.email,
        branch_code=profile.branch_code,
        branch_name=profile.branch_name,
        approval_tier=profile.approval_tier,
    )
