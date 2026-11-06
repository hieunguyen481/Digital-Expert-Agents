"""Gateway: không token 401, token sai 401, thiếu quyền 403, /internal chỉ cho dịch vụ."""
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from common import config, identity
from gateway.auth import Authenticator
from gateway.main import app

KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER = rsa.generate_private_key(public_exponent=65537, key_size=2048)
# Nhân viên thật trong seed (Postgres): RLS cần mã thật. Token/JWKS vẫn giả lập ở test này.
EMP = {"cr": ("10000000-0000-4000-8000-000000000001", "credit_officer"),
       "ap": ("10000000-0000-4000-8000-000000000010", "loan_approver"),
       "au": ("10000000-0000-4000-8000-000000000006", "auditor"),
       "rm": ("44444444-4444-4444-8444-444444444444", "relationship_manager")}


class FakeJwks:
    async def get_key(self, kid):
        if kid != "k1":
            raise KeyError(kid)
        return KEY.public_key()


class FakeResolver:
    async def resolve(self, subject):
        if subject not in EMP:
            return None
        eid, role = EMP[subject]
        return eid, "30000000-0000-4000-8000-000000000002", frozenset({role})


def token(sub="cr", key=KEY, kid="k1", alg="RS256", iss=None, aud=None, exp=300, realm=None):
    now = int(time.time())
    claims = {"sub": sub, "iss": iss or config.KEYCLOAK_ISSUER_URL, "aud": aud or config.OIDC_AUDIENCE,
              "iat": now, "exp": now + exp,
              "realm_access": {"roles": realm if realm is not None else [EMP[sub][1] if sub in EMP else "x"]}}
    return jwt.encode(claims, key, algorithm=alg, headers={"kid": kid})


@pytest.fixture()
def client():
    app.state.auth = Authenticator(jwks=FakeJwks(), resolver=FakeResolver())
    with TestClient(app) as c:
        yield c


def H(t):
    return {"Authorization": f"Bearer {t}"}


CASE = {"request": {"business_id": "56000000-0000-4000-8000-000000000001", "amount": 1e9,
                    "term_months": 12, "purpose": "von luu dong"}}


def test_health_is_public(client):
    assert client.get("/health").status_code == 200


@pytest.mark.parametrize("method,path", [("get", "/agents"), ("get", "/cases/x"),
                                         ("get", "/audit/mcp"), ("post", "/cases"),
                                         ("post", "/internal/events")])
def test_no_token_401(client, method, path):
    assert getattr(client, method)(path).status_code == 401


def test_bad_tokens_401(client):
    bad = [token(key=OTHER), token(kid="nope"), token(iss="http://evil/realms/x"),
           token(aud="other"), token(exp=-100), "garbage",
           token(alg="HS256", key="secret" * 8)]
    for t in bad:
        assert client.get("/agents", headers=H(t)).status_code == 401, t[:20]


def test_unknown_employee_401(client):
    assert client.get("/agents", headers=H(token("ghost", realm=["credit_officer"]))).status_code == 401


def test_role_not_enough_403(client):
    assert client.get("/agents", headers=H(token("rm"))).status_code == 403          # vai trò ngoài danh sách
    assert client.post("/cases/x/approve", headers=H(token("cr")),
                       json={"loan_application_id": "x", "reason": "x"}).status_code == 403                    # không phải approver
    assert client.get("/audit/mcp", headers=H(token("cr"))).status_code == 403       # không phải auditor
    # vai trò chỉ có trong DB mà không có trong token thì không có hiệu lực
    assert client.get("/audit/mcp", headers=H(token("au", realm=[]))).status_code == 403


def test_internal_not_for_users(client):
    body = {"case_id": "c", "agent": "a", "type": "t"}
    assert client.post("/internal/events", json=body, headers=H(token("ap"))).status_code == 401
    assert client.post("/internal/events", json=body,
                       headers=identity.headers_for()).status_code == 401   # thiếu danh tính đã ký


def test_create_case_binds_authenticated_identity(client):
    r = client.post("/cases", json={**CASE, "submitted_by": "ke_gia_mao"}, headers=H(token("cr")))
    assert r.status_code == 200
    got = client.get(f"/cases/{r.json()['case_id']}", headers=H(token("cr"))).json()
    assert got["payload"]["submitted_by"] == EMP["cr"][0]
    assert got["submitted_by"] == EMP["cr"][0]
