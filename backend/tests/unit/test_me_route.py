"""/me uses the RLS session and returns the profile fields."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from tests.contract.test_foundation_contract import _settings

from app.api.dependencies import get_rls_session
from app.auth.dependencies import get_current_principal
from app.auth.principal import CurrentPrincipal
from app.main import create_app
from app.repositories.employee_repository import EmployeeProfile, EmployeeRepository


def _client(monkeypatch: pytest.MonkeyPatch, profile: EmployeeProfile | None) -> tuple[TestClient, dict[str, Any]]:
    seen: dict[str, Any] = {}
    employee_id, branch_id = uuid4(), uuid4()
    application = create_app(_settings())

    async def _principal() -> CurrentPrincipal:
        return CurrentPrincipal(
            employee_id=employee_id,
            subject="s",
            branch_id=branch_id,
            roles=frozenset({"approver"}),
            permissions=frozenset({"loan:read"}),
            is_admin=False,
        )

    async def _session() -> Any:
        seen["session_used"] = True
        yield "rls-session"

    async def _profile(self: EmployeeRepository, employee: UUID) -> EmployeeProfile | None:
        seen["session"] = self.session
        seen["employee"] = employee
        return profile

    application.dependency_overrides[get_current_principal] = _principal
    application.dependency_overrides[get_rls_session] = _session
    monkeypatch.setattr(EmployeeRepository, "get_profile", _profile)
    seen["employee_id"] = employee_id
    return TestClient(application), seen


def test_me_returns_profile_through_rls_session(monkeypatch: pytest.MonkeyPatch) -> None:
    client, seen = _client(
        monkeypatch, EmployeeProfile("Tran Thi B", "b@x.vn", "HO", "Hoi so", 2)
    )
    body = client.get("/api/v1/me").json()
    assert body["full_name"] == "Tran Thi B"
    assert body["branch_code"] == "HO" and body["branch_name"] == "Hoi so"
    assert body["approval_tier"] == 2 and body["email"] == "b@x.vn"
    assert seen["session"] == "rls-session" and seen["employee"] == seen["employee_id"]


def test_me_without_profile_is_401(monkeypatch: pytest.MonkeyPatch) -> None:
    client, _ = _client(monkeypatch, None)
    assert client.get("/api/v1/me").status_code == 401
