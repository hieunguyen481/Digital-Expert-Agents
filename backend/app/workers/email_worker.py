"""Worker gửi email từ outbox ``integration.notification_delivery`` (V048/V050) qua SMTP.

Chạy ngoài giao dịch nghiệp vụ: claim lô → gửi từng thư → ``finish``. Lỗi lùi hạn và quá 5 lần thì FAILED
(hàm SQL lo). Mỗi thư mang ``Message-ID`` cố định theo id bản ghi, nên thử lại không tạo thư khác nhau.
Giới hạn: nếu tiến trình chết đúng giữa lúc gửi xong và ghi SENT, bản ghi PROCESSING được lấy lại sau 5 phút
và thư có thể tới hai lần (at-least-once).

Chế độ chuyển thư demo (``EMAIL_DEMO_REDIRECT_TO``): mọi thư đi tới một địa chỉ; tiêu đề ghi người nhận gốc
và vai trò. Để trống thì gửi tới địa chỉ thật của người nhận.
Mật khẩu ứng dụng Gmail chỉ đọc từ biến môi trường ``SMTP_APP_PASSWORD``; thiếu thì worker không chạy.
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import smtplib
import ssl
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr
from typing import Any
from uuid import UUID

logger = logging.getLogger("email_worker")

ROLE_LABELS = {
    "credit_officer": "QHKH",
    "document_reviewer": "Hỗ trợ tín dụng",
    "credit_appraiser": "Thẩm định",
    "credit_manager": "Trưởng phòng",
    "risk_officer": "Rủi ro",
    "compliance_officer": "Tuân thủ",
    "loan_approver": "Phê duyệt",
    "auditor": "Kiểm toán",
    "admin": "Quản trị",
}
DEFAULT_GMAIL_USER = "lamdanh100@gmail.com"


@dataclass(frozen=True, slots=True)
class EmailSettings:
    host: str = "smtp.gmail.com"
    port: int = 587
    starttls: bool = True
    user: str = DEFAULT_GMAIL_USER
    password: str = ""
    sender: str = DEFAULT_GMAIL_USER
    sender_name: str = "AI Credit Workbench"
    demo_redirect_to: str = DEFAULT_GMAIL_USER
    base_url: str = "http://localhost:3000"
    poll_seconds: float = 10.0
    batch_size: int = 20
    timeout_seconds: float = 20.0

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> EmailSettings:
        e = os.environ if env is None else env
        user = e.get("SMTP_USER", DEFAULT_GMAIL_USER).strip()
        return cls(
            host=e.get("SMTP_HOST", "smtp.gmail.com").strip(),
            port=int(e.get("SMTP_PORT", "587")),
            starttls=e.get("SMTP_STARTTLS", "true").strip().lower() not in {"0", "false", "no"},
            user=user,
            password=e.get("SMTP_APP_PASSWORD", "").replace(" ", ""),
            sender=e.get("SMTP_FROM", user).strip() or user,
            demo_redirect_to=e.get("EMAIL_DEMO_REDIRECT_TO", DEFAULT_GMAIL_USER).strip(),
            base_url=e.get("APP_BASE_URL", "http://localhost:3000").strip().rstrip("/"),
            poll_seconds=float(e.get("EMAIL_POLL_SECONDS", "10")),
        )

    @property
    def enabled(self) -> bool:
        return bool(self.password)


def role_text(roles: str | None) -> str:
    codes = [c.strip() for c in (roles or "").split(",") if c.strip()]
    return ", ".join(ROLE_LABELS.get(c, c) for c in codes)


def build_message(row: Mapping[str, Any], cfg: EmailSettings) -> EmailMessage:
    """Dựng thư tiếng Việt từ một bản ghi outbox; chuyển thư demo thì ghi người nhận gốc vào tiêu đề."""
    original = str(row["recipient_email"])
    roles = role_text(row.get("recipient_roles"))
    name = str(row.get("recipient_name") or "")
    msg = EmailMessage()
    title = str(row["title"])
    if cfg.demo_redirect_to:
        who = f"{original} · {roles}" if roles else original
        msg["Subject"] = f"[Demo → {who}] {title}"
        msg["To"] = cfg.demo_redirect_to
    else:
        msg["Subject"] = title
        msg["To"] = original
    msg["From"] = formataddr((cfg.sender_name, cfg.sender))
    msg["Message-ID"] = f"<delivery-{row['id']}@bank-ai.local>"
    link = f"{cfg.base_url}{row['link_path']}" if row.get("link_path") else None
    lines = [f"Xin chào {name}," if name else "Xin chào,", "", str(row["message"]), ""]
    if link:
        lines += [f"Mở hồ sơ: {link}", ""]
    if cfg.demo_redirect_to:
        lines += [f"(Thư demo: người nhận gốc {original}" + (f", vai trò {roles}" if roles else "") + ")", ""]
    lines += ["— AI Credit Intelligence Workbench"]
    msg.set_content("\n".join(lines))
    return msg


def send_smtp(msg: EmailMessage, cfg: EmailSettings) -> None:
    """Gửi một thư (đồng bộ). Gmail: STARTTLS cổng 587, đăng nhập bằng mật khẩu ứng dụng."""
    with smtplib.SMTP(cfg.host, cfg.port, timeout=cfg.timeout_seconds) as smtp:
        if cfg.starttls:
            smtp.starttls(context=ssl.create_default_context())
        if cfg.password:
            smtp.login(cfg.user, cfg.password)
        smtp.send_message(msg, from_addr=cfg.sender)


class DeliveryStore:
    """Giao thức tối thiểu của kho outbox (khớp NotificationDeliveryRepository qua giao dịch riêng)."""

    async def claim(self, worker: str, batch: int) -> Sequence[Mapping[str, Any]]:  # pragma: no cover
        raise NotImplementedError

    async def finish(self, delivery_id: UUID, ok: bool, error: str | None) -> None:  # pragma: no cover
        raise NotImplementedError


class EmailWorker:
    def __init__(
        self,
        store: DeliveryStore,
        cfg: EmailSettings,
        *,
        worker_id: str = "email-worker",
        sender: Callable[[EmailMessage, EmailSettings], None] = send_smtp,
    ) -> None:
        self._store, self._cfg, self._id, self._send = store, cfg, worker_id, sender

    async def run_once(self) -> int:
        rows = await self._store.claim(self._id, self._cfg.batch_size)
        sent = 0
        for row in rows:
            try:
                msg = build_message(row, self._cfg)
                await asyncio.to_thread(self._send, msg, self._cfg)
            except Exception as exc:  # noqa: BLE001 - mọi lỗi gửi đều lùi hạn qua finish
                logger.warning("gửi thư %s thất bại: %s", row["id"], type(exc).__name__)
                await self._store.finish(row["id"], False, f"{type(exc).__name__}: {exc}"[:500])
            else:
                await self._store.finish(row["id"], True, None)
                sent += 1
        return sent

    async def run(self, stop: asyncio.Event) -> None:
        while not stop.is_set():
            try:
                n = await self.run_once()
            except Exception:  # noqa: BLE001
                logger.exception("vòng gửi thư lỗi")
                n = 0
            if n == 0:
                try:
                    await asyncio.wait_for(stop.wait(), timeout=self._cfg.poll_seconds)
                except TimeoutError:
                    pass


class _SessionStore(DeliveryStore):
    def __init__(self, factory: Any) -> None:
        self._factory = factory

    async def claim(self, worker: str, batch: int) -> Sequence[Mapping[str, Any]]:
        from app.repositories.notification_delivery_repository import NotificationDeliveryRepository

        async with self._factory() as session, session.begin():
            return await NotificationDeliveryRepository(session).claim("EMAIL", worker, batch)

    async def finish(self, delivery_id: UUID, ok: bool, error: str | None) -> None:
        from app.repositories.notification_delivery_repository import NotificationDeliveryRepository

        async with self._factory() as session, session.begin():
            await NotificationDeliveryRepository(session).finish(delivery_id, ok=ok, error=error)


async def _amain(cfg: EmailSettings) -> None:
    from app.db.session import create_session_factory

    _, factory = create_session_factory()
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)
    logger.info("email worker chạy: %s:%s, chuyển thư demo tới %s", cfg.host, cfg.port, cfg.demo_redirect_to or "(người nhận thật)")
    await EmailWorker(_SessionStore(factory), cfg).run(stop)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    cfg = EmailSettings.from_env()
    if not cfg.enabled:
        logger.error(
            "email worker KHÔNG chạy: thiếu SMTP_APP_PASSWORD (mật khẩu ứng dụng Gmail của %s) trong infra/.env.local. "
            "Hệ thống vẫn hoạt động; thông báo trong ứng dụng không bị ảnh hưởng, thư PENDING chờ trong outbox.",
            cfg.user,
        )
        return
    asyncio.run(_amain(cfg))


if __name__ == "__main__":
    main()
