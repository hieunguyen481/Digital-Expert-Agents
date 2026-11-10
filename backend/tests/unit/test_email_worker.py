"""Worker email: dựng thư, chuyển thư demo, thử lại và gửi thật tới SMTP giả lập cục bộ (không ra Internet)."""

from __future__ import annotations

import asyncio
import email
import smtplib
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
    def __init__(self, rows, sent_last_hour: int = 0) -> None:
        self.rows, self.done = list(rows), {}
        self.deferred, self.released_calls, self.sent_last_hour, self.claimed_batch = {}, 0, sent_last_hour, None

    async def claim(self, worker, batch):
        self.claimed_batch = batch
        rows, self.rows = self.rows[:batch], self.rows[batch:]
        return rows

    async def release_stale(self):
        self.released_calls += 1
        return 0

    async def sent_in_last_hour(self):
        return self.sent_last_hour

    async def defer(self, delivery_id, until, error):
        self.deferred[delivery_id] = (until, error)

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


def test_sending_is_off_by_default() -> None:
    assert not EmailSettings.from_env({"SMTP_APP_PASSWORD": "abcd efgh ijkl mnop"}).enabled
    on = EmailSettings.from_env({"SMTP_APP_PASSWORD": "x", "EMAIL_SEND_ENABLED": "true"})
    assert on.enabled and on.max_per_hour == 20
    assert not EmailSettings.from_env({"EMAIL_SEND_ENABLED": "true"}).enabled  # thiếu mật khẩu


@pytest.mark.asyncio
async def test_hourly_cap_limits_batch_and_stops_at_cap() -> None:
    rows = [{**ROW, "id": uuid4()} for _ in range(5)]
    sent_ids: list = []
    store = MemStore(rows, sent_last_hour=18)
    worker = EmailWorker(store, cfg(max_per_hour=20), sender=lambda m, c: sent_ids.append(m["Message-ID"]))
    assert await worker.run_once() == 2 and store.claimed_batch == 2
    full = MemStore(rows, sent_last_hour=20)
    assert await EmailWorker(full, cfg(max_per_hour=20), sender=lambda m, c: sent_ids.append("x")).run_once() == 0
    assert full.claimed_batch is None and len(sent_ids) == 2  # chạm trần thì không claim, không gọi SMTP


@pytest.mark.asyncio
async def test_stale_processing_rows_are_released_each_round() -> None:
    store = MemStore([])
    await EmailWorker(store, cfg(), sender=lambda m, c: None).run_once()
    assert store.released_calls == 1


@pytest.mark.asyncio
async def test_quota_error_defers_batch_and_pauses_instead_of_hammering_smtp() -> None:
    rows = [{**ROW, "id": uuid4()} for _ in range(3)]
    calls: list = []

    def limit(msg, c):
        calls.append(1)
        raise smtplib.SMTPDataError(550, b"5.4.5 Daily user sending limit exceeded")

    store = MemStore(rows)
    worker = EmailWorker(store, cfg(quota_pause_seconds=3600), sender=limit)
    assert await worker.run_once() == 0
    assert len(calls) == 1 and set(store.deferred) == {r["id"] for r in rows} and not store.done
    assert await worker.run_once() == 0 and len(calls) == 1  # đang nghỉ: không gọi SMTP, không claim thêm
