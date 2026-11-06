"""Danh tính người dùng đi xuyên gateway -> agent -> MCP, ngoài tham số của LLM.

Gateway lấy employee_id từ JWT đã xác thực, ký HMAC bằng ENGINE_SERVICE_TOKEN và gắn vào header.
Agent chỉ chuyển tiếp; MCP kiểm chữ ký, thiếu/sai thì từ chối. LLM không có đường nào chọn được.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Mapping

from . import config

H_IDENTITY = "x-engine-identity"
H_SIGNATURE = "x-engine-signature"
H_SERVICE = "x-engine-service-token"
_TTL = 3600


class IdentityError(Exception):
    pass


@dataclass(frozen=True)
class Identity:
    employee_id: str
    branch_id: str
    is_admin: bool = False


_current: ContextVar[Identity | None] = ContextVar("engine_identity", default=None)


def set_current(identity: Identity | None) -> None:
    _current.set(identity)


def current() -> Identity | None:
    return _current.get()


def _sign(raw: bytes, key: str | None = None) -> str:
    k = (key if key is not None else config.ENGINE_SERVICE_TOKEN).encode()
    return hmac.new(k, raw, hashlib.sha256).hexdigest()


def headers_for(identity: Identity | None = None) -> dict[str, str]:
    """Header nội bộ cho lời gọi xuống agent/MCP/gateway-internal."""
    h = {H_SERVICE: config.ENGINE_SERVICE_TOKEN}
    ident = identity or current()
    if ident:
        raw = base64.urlsafe_b64encode(json.dumps({
            "e": ident.employee_id, "b": ident.branch_id, "a": ident.is_admin,
            "x": int(time.time()) + _TTL}).encode())
        h[H_IDENTITY] = raw.decode()
        h[H_SIGNATURE] = _sign(raw)
    return h


def service_ok(headers: Mapping[str, str]) -> bool:
    given = headers.get(H_SERVICE, "")
    return bool(config.ENGINE_SERVICE_TOKEN) and hmac.compare_digest(
        given, config.ENGINE_SERVICE_TOKEN)


def verify(headers: Mapping[str, str]) -> Identity:
    """Kiểm chữ ký danh tính; ném IdentityError nếu thiếu hoặc không hợp lệ."""
    if not service_ok(headers):
        raise IdentityError("thiếu hoặc sai token dịch vụ")
    raw = headers.get(H_IDENTITY, "").encode()
    sig = headers.get(H_SIGNATURE, "")
    if not raw or not sig or not hmac.compare_digest(sig, _sign(raw)):
        raise IdentityError("thiếu danh tính nhân viên hoặc chữ ký không hợp lệ")
    try:
        d = json.loads(base64.urlsafe_b64decode(raw))
        if int(d["x"]) < time.time():
            raise IdentityError("danh tính đã hết hạn")
        return Identity(str(d["e"]), str(d["b"]), bool(d["a"]))
    except IdentityError:
        raise
    except Exception as e:  # noqa: BLE001
        raise IdentityError("danh tính không đọc được") from e
