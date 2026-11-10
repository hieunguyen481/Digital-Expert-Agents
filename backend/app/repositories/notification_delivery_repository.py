"""Outbox gửi thông báo ra kênh ngoài (V048). Worker gửi email gắn vào đây, ngoài giao dịch nghiệp vụ.

Luồng: ``claim`` (đánh dấu PROCESSING) -> gửi SMTP -> ``finish`` (SENT hoặc lùi hạn thử lại).
Mỗi bản ghi có người nhận, loại, tiêu đề, nội dung, ``link_path`` (đường dẫn hồ sơ, chưa gồm địa chỉ gốc).
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import Record, execute_returning, fetch_all


class NotificationDeliveryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def claim(self, channel: str, worker: str, batch_size: int = 50) -> list[Record]:
        if not worker.strip():
            raise ValueError("worker is required")
        return await fetch_all(
            self.session,
            "SELECT * FROM integration.claim_notification_deliveries(:channel, :worker, :batch)",
            {"channel": channel, "worker": worker, "batch": batch_size},
        )

    async def finish(self, delivery_id: UUID, *, ok: bool, error: str | None = None) -> None:
        await execute_returning(
            self.session,
            "SELECT integration.finish_notification_delivery(:id, :ok, :error) AS done",
            {"id": delivery_id, "ok": ok, "error": error},
        )

    async def release_stale(self, channel: str, minutes: int = 5) -> int:
        row = await execute_returning(
            self.session,
            "SELECT integration.release_stale_deliveries(:channel, make_interval(mins => :m)) AS n",
            {"channel": channel, "m": minutes},
        )
        return int(row["n"]) if row else 0

    async def sent_in_last_hour(self, channel: str) -> int:
        row = await execute_returning(
            self.session,
            "SELECT integration.deliveries_sent_since(:channel, interval '1 hour') AS n",
            {"channel": channel},
        )
        return int(row["n"]) if row else 0

    async def defer(self, delivery_id: UUID, until: datetime, error: str | None = None) -> None:
        await execute_returning(
            self.session,
            "SELECT integration.defer_notification_delivery(:id, :until, :error) AS done",
            {"id": delivery_id, "until": until, "error": error},
        )
