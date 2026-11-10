"""Chế độ demo đổi tài khoản: tắt thì 404; chỉ Quản trị; chỉ tài khoản seed; token thật qua client demo; có nhật ký."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import httpx
import pytest
from pydantic import SecretStr
from fastapi.testclient import TestClient
from tests.contract.test_foundation_contract import _settings

from app.api.dependencies import get_audit_service, get_rls_session
from app.api.v1 import demo_switch
from app.auth.dependencies import get_current_principal
from app.auth.principal import CurrentPrincipal
from app.main import create_app

TOKEN_URL = "http://keycloak:8080/realms/bank-ai/protocol/openid-connect/token"
RISK = demo_switch.DemoAccount(email="risk@example.local", full_name="Rủi ro", roles=["risk_officer"])


class _FakeKeycloak:
    """Thay httpx.AsyncClient trong module demo_switch (respx sẽ chặn luôn cả TestClient)."""

    calls: list[dict[str, Any]] = []
    response = httpx.Response(200, json={"access_token": "jwt-of-risk", "expires_in": 3600})

    def __init__(self, **_kw: Any) -> None: ...

    async def __aenter__(self) -> _FakeKeycloak:
        return self

    async def __aexit__(self, *_a: Any) -> None: ...

    async def post(self, url: str, data: dict[str, str]) -> httpx.Response:
        self.calls.append({"url": url, **data})
        return self.response


class _Audit:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def record(self, **kw: Any) -> None:
        self.calls.append(kw)


def _client(monkeypatch: pytest.MonkeyPatch, *, enabled: bool, role: str = "admin") -> tuple[TestClient, _Audit]:
    settings = _settings().model_copy(
        update={"demo_switch_enabled": enabled, "demo_client_secret": SecretStr("client-secret"), "seed_user_password": SecretStr("seed-pw"),
                "keycloak_token_url": TOKEN_URL}
    )
    app = create_app(settings)
    app.state.settings = settings
    audit = _Audit()

    async def _principal() -> CurrentPrincipal:
        return CurrentPrincipal(employee_id=uuid4(), subject="s", branch_id=uuid4(), roles=frozenset({role}),
                                permissions=frozenset(), is_admin=role == "admin")

    async def _session() -> Any:
        yield "rls-session"

    async def _accounts(_session: Any) -> list[demo_switch.DemoAccount]:
        return [RISK]

    app.dependency_overrides[get_current_principal] = _principal
    app.dependency_overrides[get_rls_session] = _session
    app.dependency_overrides[get_audit_service] = lambda: audit
    monkeypatch.setattr(demo_switch, "_accounts", _accounts)
    return TestClient(app), audit


def test_disabled_mode_returns_404_everywhere(monkeypatch: pytest.MonkeyPatch) -> None:
    client, audit = _client(monkeypatch, enabled=False)
    assert client.get("/api/v1/demo/accounts").status_code == 404
    assert client.post("/api/v1/demo/switch", json={"email": "risk@example.local"}).status_code == 404
    assert audit.calls == []


def test_only_admin_may_use_it(monkeypatch: pytest.MonkeyPatch) -> None:
    client, _ = _client(monkeypatch, enabled=True, role="risk_officer")
    assert client.get("/api/v1/demo/accounts").status_code == 403
    assert client.post("/api/v1/demo/switch", json={"email": "risk@example.local"}).status_code == 403


def test_account_outside_seed_list_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    client, audit = _client(monkeypatch, enabled=True)
    response = client.post("/api/v1/demo/switch", json={"email": "someone@bank.vn"})
    assert response.status_code == 422 and audit.calls == []


def test_switch_gets_real_token_from_demo_client_and_audits(monkeypatch: pytest.MonkeyPatch) -> None:
    _FakeKeycloak.calls = []
    _FakeKeycloak.response = httpx.Response(200, json={"access_token": "jwt-of-risk", "expires_in": 3600})
    monkeypatch.setattr(demo_switch.httpx, "AsyncClient", _FakeKeycloak)
    client, audit = _client(monkeypatch, enabled=True)
    response = client.post("/api/v1/demo/switch", json={"email": "Risk@example.local"})
    assert response.status_code == 200
    assert response.json()["access_token"] == "jwt-of-risk" and response.json()["account"]["roles"] == ["risk_officer"]
    sent = _FakeKeycloak.calls[0]
    assert sent["url"] == TOKEN_URL and sent["grant_type"] == "password" and sent["client_id"] == "bank-ai-demo"
    assert sent["username"] == "risk@example.local" and sent["password"] == "seed-pw"
    assert "seed-pw" not in response.text and "client-secret" not in response.text
    assert [c["action"] for c in audit.calls] == ["DEMO_ACCOUNT_SWITCH"]
    assert audit.calls[0]["metadata"]["target_email"] == "risk@example.local"


def test_keycloak_refusal_is_an_error_without_token(monkeypatch: pytest.MonkeyPatch) -> None:
    _FakeKeycloak.response = httpx.Response(401, json={"error": "invalid_grant"})
    monkeypatch.setattr(demo_switch.httpx, "AsyncClient", _FakeKeycloak)
    client, audit = _client(monkeypatch, enabled=True)
    response = client.post("/api/v1/demo/switch", json={"email": "risk@example.local"})
    assert response.status_code == 503 and "access_token" not in response.text and audit.calls == []
