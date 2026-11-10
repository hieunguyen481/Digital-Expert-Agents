"""Ma trận phân quyền (docs/business/ma-tran-phan-quyen.md) khớp mã: hành động × trạng thái × vai trò và route."""

from __future__ import annotations

import importlib
import pkgutil
from typing import Any
from uuid import uuid4

import pytest
from fastapi.routing import APIRoute
from tests.matrix_doc import cells, table

import app.api.v1 as v1
from app.exceptions import ConflictError
from app.workflow.service import WorkflowService
from app.workflow.transitions import TRANSITIONS

ROLES = [r for r in table("transition")[0][3:] if not r.startswith("Căn cứ")]
STATUSES = [
    "DRAFT", "CHECKING", "RETURNED_TO_RM", "APPRAISAL", "APPRAISAL_PENDING_INFO", "RISK_REVIEW", "RISK_PENDING_INFO",
    "RISK_HOLD_FRAUD", "APPROVAL", "COUNCIL_SESSION", "APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED", "WITHDRAWN",
]


class _Principal:
    def __init__(self, role: str) -> None:
        self.employee_id = uuid4()
        self.roles = frozenset({role})
        self.is_admin = role == "admin"


class _Repo:
    """Chỉ trả hồ sơ ở trạng thái cần thử; mọi truy vấn khác nghĩa là đã qua cổng vai trò + trạng thái."""

    def __init__(self, status: str) -> None:
        self.status = status

    async def can_write_loan(self, *_args: Any) -> bool:
        return True

    async def get_loan(self, _loan_id: Any) -> dict[str, Any]:
        return {"status": self.status, "version": 1, "requested_amount": 1000}

    def __getattr__(self, name: str) -> Any:
        async def _reached(*_a: Any, **_k: Any) -> Any:
            raise RuntimeError("past-guards")
        return _reached


def _doc_matrix() -> dict[tuple[str, str, str], bool]:
    """(vai trò, hành động, trạng thái) -> được phép theo tài liệu."""
    _header, body = table("transition")
    out: dict[tuple[str, str, str], bool] = {}
    for row in body:
        action, from_statuses = row[0], set(row[1].split(","))
        for i, role in enumerate(ROLES):
            allowed_role = row[3 + i] == "✔"
            for status in STATUSES:
                out[(role, action, status)] = allowed_role and status in from_statuses
    return out


def test_matrix_actions_are_exactly_the_transition_table() -> None:
    assert {k[1] for k in _doc_matrix()} == set(TRANSITIONS)
    assert len(_doc_matrix()) == len(ROLES) * len(TRANSITIONS) * len(STATUSES) == 1890


@pytest.mark.asyncio
async def test_every_role_action_status_cell_matches_the_service() -> None:
    """1890 ô: dịch vụ chặn đúng ô doc ghi không được (PermissionError/INVALID_STATE_TRANSITION), qua cổng ở ô được."""
    wrong: list[str] = []
    for (role, action, status), allowed in _doc_matrix().items():
        service = WorkflowService(_Repo(status), None)  # type: ignore[arg-type]
        try:
            await service.transition(_Principal(role), uuid4(), action, expected_version=1, reason="đủ lý do xử lý")
            outcome = "allowed"
        except PermissionError:
            outcome = "role"
        except ConflictError as exc:
            outcome = "state" if exc.code == "INVALID_STATE_TRANSITION" else "allowed"
        except Exception:  # noqa: BLE001 - lỗi sau cổng (tham số, cổng điều kiện...) nghĩa là vai trò+trạng thái hợp lệ
            outcome = "allowed"
        if (outcome == "allowed") != allowed:
            wrong.append(f"{role}/{action}/{status}: doc={allowed} thực tế={outcome}")
    assert not wrong, "\n".join(wrong[:20])


def test_reason_required_column_matches_table() -> None:
    _header, body = table("transition")
    assert {r[0]: r[2] == "có" for r in body} == {a: t.reason_required for a, t in TRANSITIONS.items()}


def _routes() -> dict[str, str]:
    def deps(d: Any) -> Any:
        for s in d.dependencies:
            yield s.call
            yield from deps(s)

    out: dict[str, str] = {}
    for mod in pkgutil.iter_modules(v1.__path__):
        router = getattr(importlib.import_module(f"app.api.v1.{mod.name}"), "router", None)
        for r in getattr(router, "routes", []):
            if isinstance(r, APIRoute):
                need = {p for c in deps(r.dependant) for p in getattr(c, "required_permissions", ())}
                out[f"{','.join(sorted(r.methods - {'HEAD'}))} {r.path}"] = ",".join(sorted(need)) or "-"
    return out


def test_every_api_route_is_in_the_matrix_with_its_permission() -> None:
    doc = {row[0]: row[1] for row in table("route")[1]}
    assert doc == _routes()


def test_admin_has_no_business_permission_in_matrix() -> None:
    perms = cells("permission")
    assert {k[0] for k, v in perms.items() if k[1] == "admin" and v} == {"admin:manage"}
