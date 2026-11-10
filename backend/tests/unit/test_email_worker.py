"""Worker email: dựng thư, chuyển thư demo, thử lại và gửi thật tới SMTP giả lập cục bộ (không ra Internet)."""

from __future__ import annotations

import asyncio
import email
from email import policy
from uuid import uuid4

import pytest

from app.workers.email_worker import EmailSettings, EmailWorker, build_message, role_text, send_smtp

ROW = {
    "id": uuid4(), "recipient_email": "appraiser@example.local", "recipient_name": "Lê Quang Huy",
    "recipient_roles": "credit_appraiser", "title": "Bạn được giao hồ sơ HSV-2026-00187",
    "message": "Hồ sơ vừa được giao cho bạn.", "link_path": "/ho-so-vay/abc", "attempt_count": 0,
}


def cfg(**kw) -> EmailSettings:
    base = dict(host="127.0.0.1", port=0, starttls=False, password="x", base_url="http://localhost:3000")
    base.update(kw)
    return EmailSettings(**base)


class FakeSmtp:
    """SMTP tối thiểu: ghi lại thư nhận được."""

    def __init__(self) -> None:
        self.messages: list[bytes] = []
        self.rcpt: list[str] = []
        self.auth = ""
        self.server: asyncio.AbstractServer | None = None

    async def start(self) -> int:
        self.server = await asyncio.start_server(self._handle, "127.0.0.1", 0)
        return self.server.sockets[0].getsockname()[1]

    async def stop(self) -> None:
        assert self.server
        self.server.close()
        await self.server.wait_closed()

    async def _handle(self, r: asyncio.StreamReader, w: asyncio.StreamWriter) -> None:
        async def say(line: str) -> None:
            w.write((line + "\r\n").encode())
            await w.drain()

        await say("220 fake ESMTP")
        while True:
            line = (await r.readline()).decode().strip()
            if not line:
                break
            cmd = line.upper()
            if cmd.startswith("EHLO") or cmd.startswith("HELO"):
                await say("250-fake")
                await say("250 AUTH PLAIN LOGIN")
            elif cmd.startswith("AUTH"):
                self.auth = line
                await say("235 ok")
            elif cmd.startswith("RCPT"):
                self.rcpt.append(line.split(":", 1)[1].strip(" <>"))
                await say("250 ok")
            elif cmd.startswith(("MAIL", "RSET")):
                await say("250 ok")
            elif cmd == "DATA":
                await say("354 go")
                buf = b""
                while not buf.endswith(b"\r\n.\r\n"):
                    buf += await r.readline()
                self.messages.append(buf[:-5])
                await say("250 queued")
            elif cmd == "QUIT":
                await say("221 bye")
                break
            else:
                await say("250 ok")
        w.close()


class MemStore:
    def __init__(self, rows) -> None:
        self.rows, self.done = list(rows), {}

    async def claim(self, worker, batch):
        rows, self.rows = self.rows, []
        return rows

    async def finish(self, delivery_id, ok, error):
        self.done[delivery_id] = (ok, error)


def test_role_text_vietnamese() -> None:
    assert role_text("credit_appraiser, risk_officer") == "Thẩm định, Rủi ro"


def test_demo_redirect_subject_and_recipient() -> None:
    msg = build_message(ROW, cfg(demo_redirect_to="lamdanh100@gmail.com"))
    assert msg["To"] == "lamdanh100@gmail.com"
    assert msg["Subject"] == "[Demo → appraiser@example.local · Thẩm định] Bạn được giao hồ sơ HSV-2026-00187"
    body = msg.get_content()
    assert "Mở hồ sơ: http://localhost:3000/ho-so-vay/abc" in body
    assert "Xin chào Lê Quang Huy," in body


def test_no_redirect_sends_to_real_recipient() -> None:
    msg = build_message(ROW, cfg(demo_redirect_to=""))
    assert msg["To"] == "appraiser@example.local"
    assert msg["Subject"].startswith("Bạn được giao")
    assert "Thư demo" not in msg.get_content()


def test_missing_password_disables_worker() -> None:
    assert not EmailSettings.from_env({}).enabled
    assert EmailSettings.from_env({"SMTP_APP_PASSWORD": "abcd efgh ijkl mnop"}).password == "abcdefghijklmnop"
    assert EmailSettings.from_env({}).host == "smtp.gmail.com" and EmailSettings.from_env({}).port == 587


@pytest.mark.asyncio
async def test_worker_delivers_to_fake_smtp() -> None:
    smtp = FakeSmtp()
    port = await smtp.start()
    store = MemStore([ROW])
    try:
        sent = await EmailWorker(store, cfg(port=port, demo_redirect_to="lamdanh100@gmail.com")).run_once()
    finally:
        await smtp.stop()
    assert sent == 1 and store.done[ROW["id"]] == (True, None)
    assert smtp.rcpt == ["lamdanh100@gmail.com"] and smtp.auth.startswith("AUTH")
    parsed = email.message_from_bytes(smtp.messages[0], policy=policy.default)
    assert parsed["Subject"].startswith("[Demo → appraiser@example.local · Thẩm định]")
    assert parsed["Message-ID"] == f"<delivery-{ROW['id']}@bank-ai.local>"
    assert "http://localhost:3000/ho-so-vay/abc" in parsed.get_content()


@pytest.mark.asyncio
async def test_failure_is_reported_and_no_duplicate_send() -> None:
    calls = []

    def boom(msg, c):
        calls.append(msg["Message-ID"])
        raise ConnectionRefusedError("smtp down")

    store = MemStore([ROW])
    worker = EmailWorker(store, cfg(), sender=boom)
    assert await worker.run_once() == 0
    ok, err = store.done[ROW["id"]]
    assert ok is False and "ConnectionRefusedError" in err
    # Lô đã giao cho finish; vòng sau không còn bản ghi nào (claim chỉ trả PENDING đến hạn) nên không gửi lại.
    assert await worker.run_once() == 0 and len(calls) == 1


def test_send_smtp_unreachable_raises() -> None:
    with pytest.raises(OSError):
        send_smtp(build_message(ROW, cfg(port=1)), cfg(port=1, timeout_seconds=1))
