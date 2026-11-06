"""JWT của request hiện tại, để chuyển tiếp cho Agent Engine (engine tự xác thực lại)."""

from contextvars import ContextVar

current_bearer: ContextVar[str | None] = ContextVar("current_bearer", default=None)
