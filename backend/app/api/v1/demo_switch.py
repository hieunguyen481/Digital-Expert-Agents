"""Chế độ demo đổi tài khoản (ngoại lệ có giới hạn của Q-J, docs/business/rules.md).

Chỉ chạy khi `DEMO_SWITCH_ENABLED=true`; tắt thì mọi route ở đây trả 404. Chỉ Quản trị gọi được và chỉ chọn trong tài
khoản seed `@example.local`. Token là token thật do Keycloak cấp qua client demo (password grant, mật khẩu seed đọc từ
env phía server, không bao giờ trả về frontend). Mỗi lần đổi ghi nhật ký kiểm toán.
"""

from __future__ import annotations

from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import PrincipalDep, SessionDep, get_audit_service, get_settings_from_state
from app.api.v1._utils import request_uuid
from app.config import Settings
from app.exceptions import AuthorizationError, DependencyUnavailableError, NotFoundError, ValidationError
from app.services.audit_service import AuditService

SEED_DOMAIN = "@example.local"

router = APIRouter(prefix="/demo", tags=["demo"])


def require_demo_enabled(request: Request) -> Settings:
    settings = get_settings_from_state(request)
    if not settings.demo_switch_enabled:
        raise NotFoundError("NOT_FOUND", "Không tìm thấy.")
    return settings


DemoSettings = Annotated[Settings, Depends(require_demo_enabled)]


class DemoAccount(BaseModel):
    email: str
    full_name: str
    roles: list[str]


class DemoSwitchRequest(BaseModel):
    email: str


class DemoToken(BaseModel):
    access_token: str
    expires_in: int
    account: DemoAccount


def _require_admin(principal: Any) -> None:
    if "admin" not in principal.roles:
        raise AuthorizationError("DEMO_ADMIN_ONLY", "Chỉ Quản trị được đổi tài khoản demo.")


async def _accounts(session: AsyncSession) -> list[DemoAccount]:
    rows = (
        await session.execute(
            text(
                """
                SELECT e.email, e.full_name, COALESCE(array_agg(r.role_code::text ORDER BY r.role_code)
                       FILTER (WHERE r.role_code IS NOT NULL), '{}') AS roles
                FROM identity.employee e
                LEFT JOIN identity.employee_role er ON er.employee_id = e.id
                LEFT JOIN identity.role r ON r.id = er.role_id
                WHERE e.email::text LIKE :domain AND e.employment_status = 'ACTIVE'
                GROUP BY e.email, e.full_name
                ORDER BY e.full_name
                """
            ),
            {"domain": f"%{SEED_DOMAIN}"},
        )
    ).mappings()
    return [
        DemoAccount(email=str(r["email"]), full_name=str(r["full_name"]), roles=list(r["roles"]))
        for r in rows
        if "admin" not in r["roles"]
    ]


@router.get("/accounts", response_model=list[DemoAccount])
async def demo_accounts(
    _settings: DemoSettings, principal: PrincipalDep, session: SessionDep
) -> list[DemoAccount]:
    _require_admin(principal)
    return await _accounts(session)


@router.post("/switch", response_model=DemoToken)
async def demo_switch(
    body: DemoSwitchRequest,
    request: Request,
    settings: DemoSettings,
    principal: PrincipalDep,
    session: SessionDep,
    audit: Annotated[AuditService, Depends(get_audit_service)],
) -> DemoToken:
    _require_admin(principal)
    account = next((a for a in await _accounts(session) if a.email == body.email.strip().lower()), None)
    if account is None:
        raise ValidationError("DEMO_ACCOUNT_NOT_ALLOWED", "Tài khoản không nằm trong danh sách demo.", {})
    if settings.demo_client_secret is None or settings.seed_user_password is None:
        raise DependencyUnavailableError("DEMO_NOT_CONFIGURED", "Thiếu cấu hình client demo hoặc mật khẩu seed.")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                settings.keycloak_token_url,
                data={
                    "grant_type": "password",
                    "client_id": settings.demo_client_id,
                    "client_secret": settings.demo_client_secret.get_secret_value(),
                    "username": account.email,
                    "password": settings.seed_user_password.get_secret_value(),
                    "scope": "openid",
                },
            )
    except httpx.HTTPError as exc:
        raise DependencyUnavailableError("KEYCLOAK_UNAVAILABLE", "Không liên lạc được Keycloak.") from exc
    if response.status_code != 200:
        raise DependencyUnavailableError("DEMO_TOKEN_REFUSED", "Keycloak từ chối cấp token cho tài khoản này.")
    await audit.record(
        principal=principal,
        action="DEMO_ACCOUNT_SWITCH",
        resource_type="EMPLOYEE",
        resource_id=None,
        result="SUCCESS",
        request_id=request_uuid(request),
        correlation_id=request_uuid(request, "correlation_id"),
        metadata={"target_email": account.email, "target_roles": ",".join(account.roles)},
    )
    payload = response.json()
    return DemoToken(access_token=payload["access_token"], expires_in=int(payload.get("expires_in", 300)), account=account)
