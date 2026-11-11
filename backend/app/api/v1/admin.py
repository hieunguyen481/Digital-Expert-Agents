"""Quản trị (chỉ đọc): người dùng và vai, ma trận quyền, ngưỡng cấp phê duyệt, cấu hình AI.

Chỉ cần quyền ``admin:manage`` (Q-J: Quản trị không đọc dữ liệu tín dụng); các bảng định danh
và tham chiếu đọc được dưới RLS của bank_app. Không trả secret, URL hay khóa API.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import SessionDep, get_settings_from_state
from app.auth.dependencies import require_permissions
from app.auth.principal import CurrentPrincipal
from app.config import Settings
from app.repositories.base import fetch_all
from app.schemas.common import APIModel

router = APIRouter(prefix="/admin", tags=["admin"])
AdminDep = Annotated[CurrentPrincipal, Depends(require_permissions("admin:manage"))]


class AdminUser(APIModel):
    employee_id: str
    employee_code: str
    full_name: str
    email: str
    department: str | None
    branch: str | None
    status: str
    roles: list[str]


class AdminPermissionRow(APIModel):
    role_code: str
    role_name: str
    permissions: list[str]


class AdminThreshold(APIModel):
    tier: int
    max_total_vnd: str | None
    valid_from: str
    approvers: int


class AdminFlag(APIModel):
    key: str
    label: str
    value: str


class AdminAiConfig(APIModel):
    flags: list[AdminFlag]
    note: str


@router.get("/users", response_model=list[AdminUser], operation_id="admin_list_users")
async def list_users(_: AdminDep, session: SessionDep) -> list[AdminUser]:
    rows = await fetch_all(
        session,
        """
        SELECT e.id::text AS employee_id, e.employee_code::text AS employee_code, e.full_name,
               e.email::text AS email, d.department_name AS department, b.branch_name AS branch,
               e.employment_status AS status,
               COALESCE(array_agg(r.role_code::text ORDER BY r.role_code)
                        FILTER (WHERE r.role_code IS NOT NULL), '{}') AS roles
        FROM identity.employee AS e
        LEFT JOIN identity.department AS d ON d.id = e.department_id
        LEFT JOIN identity.branch AS b ON b.id = e.branch_id
        LEFT JOIN identity.employee_role AS er
               ON er.employee_id = e.id AND er.valid_from <= CURRENT_TIMESTAMP
              AND (er.valid_until IS NULL OR er.valid_until > CURRENT_TIMESTAMP)
        LEFT JOIN identity.role AS r ON r.id = er.role_id
        GROUP BY e.id, d.department_name, b.branch_name
        ORDER BY e.full_name
        """,
    )
    return [AdminUser.model_validate(r) for r in rows]


@router.get("/permissions", response_model=list[AdminPermissionRow], operation_id="admin_permissions")
async def list_permissions(_: AdminDep, session: SessionDep) -> list[AdminPermissionRow]:
    rows = await fetch_all(
        session,
        """
        SELECT r.role_code::text AS role_code, r.role_name,
               COALESCE(array_agg(p.permission_code::text ORDER BY p.permission_code)
                        FILTER (WHERE p.permission_code IS NOT NULL), '{}') AS permissions
        FROM identity.role AS r
        LEFT JOIN identity.role_permission AS rp ON rp.role_id = r.id
        LEFT JOIN identity.permission AS p ON p.id = rp.permission_id
        GROUP BY r.id ORDER BY r.role_code
        """,
    )
    return [AdminPermissionRow.model_validate(r) for r in rows]


@router.get("/thresholds", response_model=list[AdminThreshold], operation_id="admin_thresholds")
async def list_thresholds(_: AdminDep, session: SessionDep) -> list[AdminThreshold]:
    rows = await fetch_all(
        session,
        """
        SELECT t.tier::int AS tier, t.max_total_vnd::text AS max_total_vnd,
               t.valid_from::text AS valid_from,
               (SELECT count(*) FROM identity.employee_authority AS a
                 WHERE a.tier = t.tier AND a.valid_from <= CURRENT_DATE
                   AND (a.valid_until IS NULL OR a.valid_until >= CURRENT_DATE))::int AS approvers
        FROM credit.authority_tier AS t
        WHERE t.version = (SELECT max(version) FROM credit.authority_tier
                            WHERE valid_from <= CURRENT_DATE)
        ORDER BY t.tier
        """,
    )
    return [AdminThreshold.model_validate(r) for r in rows]


def _on_off(value: bool) -> str:
    return "Bật" if value else "Tắt"


@router.get("/ai-config", response_model=AdminAiConfig, operation_id="admin_ai_config")
async def ai_config(
    _: AdminDep, settings: Annotated[Settings, Depends(get_settings_from_state)]
) -> AdminAiConfig:
    """Chỉ tên nhà cung cấp, tên mô hình và cờ bật/tắt; không trả URL, khóa hay secret."""
    flags = [
        AdminFlag(key="llm_provider", label="Nhà cung cấp mô hình ngôn ngữ", value=settings.llm_provider),
        AdminFlag(key="llm_model_name", label="Mô hình ngôn ngữ", value=settings.llm_model_name),
        AdminFlag(key="vision_model_name", label="Mô hình đọc ảnh (OCR)", value=settings.vision_model_name),
        AdminFlag(key="ocr_provider", label="Nhà cung cấp OCR", value=settings.ocr_provider),
        AdminFlag(key="embedding_provider", label="Nhà cung cấp embedding", value=settings.embedding_provider),
        AdminFlag(key="embedding_model_name", label="Mô hình embedding", value=settings.embedding_model_name),
        AdminFlag(key="agent_engine", label="Đội agent (Agent Engine)", value=_on_off(bool(settings.agent_engine_url))),
        AdminFlag(key="demo_switch_enabled", label="Chế độ demo đổi tài khoản", value=_on_off(settings.demo_switch_enabled)),
    ]
    return AdminAiConfig(
        flags=flags,
        note="Chỉ đọc. Cấu hình ở biến môi trường của dịch vụ backend (infra/.env.local); sửa rồi khởi động lại dịch vụ.",
    )


__all__ = ["router"]
