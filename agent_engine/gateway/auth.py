"""Xác thực gateway: JWT Keycloak (issuer, audience, JWKS, RS256) + vai trò từ Postgres.

Giống backend: vai trò chỉ có hiệu lực khi có ở cả token (realm_access) lẫn DB (identity.*).
Mọi route trừ /health yêu cầu Bearer; /internal/* chỉ nhận token dịch vụ nội bộ.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Protocol

import httpx
import jwt
from fastapi import Depends, HTTPException, Request

from common import config, identity


@dataclass(frozen=True)
class Principal:
    employee_id: str
    branch_id: str
    subject: str
    roles: frozenset[str]

    @property
    def is_admin(self) -> bool:
        return "admin" in self.roles

    def identity(self) -> identity.Identity:
        return identity.Identity(self.employee_id, self.branch_id, self.is_admin)


class JwksProvider(Protocol):
    async def get_key(self, kid: str) -> Any: ...


class HttpJwks:
    def __init__(self, url: str, ttl: float = 300) -> None:
        self._url, self._ttl, self._keys, self._at = url, ttl, {}, 0.0

    async def get_key(self, kid: str) -> Any:
        if kid not in self._keys or time.time() - self._at > self._ttl:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(self._url)
                r.raise_for_status()
            self._keys = {k["kid"]: jwt.PyJWK(k).key for k in r.json()["keys"]
                          if "kid" in k and k.get("use", "sig") == "sig" and k.get("kty") == "RSA"}
            self._at = time.time()
        if kid not in self._keys:
            raise KeyError(kid)
        return self._keys[kid]


class EmployeeResolver(Protocol):
    async def resolve(self, subject: str) -> tuple[str, str, frozenset[str]] | None: ...


class PgEmployeeResolver:
    async def resolve(self, subject: str):
        import asyncpg
        con = await asyncpg.connect(config.DATABASE_URL)
        try:
            r = await con.fetchrow(
                """SELECT e.id, e.branch_id,
                          COALESCE(array_agg(DISTINCT r.role_code::text) FILTER (WHERE r.id IS NOT NULL),
                                   ARRAY[]::text[]) AS roles
                     FROM identity.employee e
                     LEFT JOIN identity.employee_role er ON er.employee_id=e.id
                      AND er.valid_from <= CURRENT_TIMESTAMP
                      AND (er.valid_until IS NULL OR er.valid_until > CURRENT_TIMESTAMP)
                     LEFT JOIN identity.role r ON r.id=er.role_id
                    WHERE e.identity_subject=$1 AND e.employment_status='ACTIVE'
                    GROUP BY e.id, e.branch_id""", subject)
        finally:
            await con.close()
        return (str(r["id"]), str(r["branch_id"]), frozenset(r["roles"])) if r else None


class Authenticator:
    def __init__(self, jwks: JwksProvider | None = None,
                 resolver: EmployeeResolver | None = None) -> None:
        self.jwks = jwks or HttpJwks(config.KEYCLOAK_JWKS_URL)
        self.resolver = resolver or PgEmployeeResolver()

    async def authenticate(self, token: str) -> Principal:
        try:
            header = jwt.get_unverified_header(token)
            if header.get("alg") != "RS256" or not header.get("kid"):
                raise ValueError("header")
            key = await self.jwks.get_key(header["kid"])
            claims = jwt.decode(
                token, key=key, algorithms=["RS256"], issuer=config.KEYCLOAK_ISSUERS,
                audience=config.OIDC_AUDIENCE, leeway=30,
                options={"require": ["iss", "aud", "exp", "iat", "sub"]})
        except Exception as e:  # noqa: BLE001 - mọi lỗi token đều là 401, không lộ chi tiết
            raise HTTPException(401, "token không hợp lệ", {"WWW-Authenticate": "Bearer"}) from e
        realm = (claims.get("realm_access") or {}).get("roles", [])
        rec = await self.resolver.resolve(claims["sub"])
        if rec is None:
            raise HTTPException(401, "tài khoản nhân viên không hoạt động")
        emp, branch, db_roles = rec
        return Principal(emp, branch, claims["sub"], db_roles & frozenset(realm))


def get_auth(request: Request) -> Authenticator:
    if not hasattr(request.app.state, "auth"):
        request.app.state.auth = Authenticator()
    return request.app.state.auth


async def current_principal(request: Request, auth: Authenticator = Depends(get_auth)) -> Principal:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "thiếu Bearer token", {"WWW-Authenticate": "Bearer"})
    return await auth.authenticate(token.strip())


def require_roles(*roles: str):
    needed = frozenset(roles) if roles else config.GATEWAY_ROLES

    async def dep(p: Principal = Depends(current_principal)) -> Principal:
        if not p.roles & needed:
            raise HTTPException(403, "không đủ quyền")
        return p
    return dep


async def internal_only(request: Request) -> None:
    if not identity.service_ok(request.headers):
        raise HTTPException(401, "chỉ dịch vụ nội bộ")
