"""Xoá dữ liệu phân tích của agent engine trong Postgres (chạy giữa 2 lượt demo).

Chạy: RESET_DATABASE_URL=postgresql://<chủ schema agent>@host/bank_ai python -m scripts.reset_demo
Cần quyền ghi bỏ qua RLS (postgres hoặc bank_migrator); KHÔNG dùng role bank_engine.
Chỉ xoá schema `agent` (case, sự kiện, plan, approval token, action log). Dữ liệu nghiệp vụ
(hồ sơ vay đã chuyển bước qua API) không bị đụng tới: khôi phục bằng seed/migration của infra.
"""
from __future__ import annotations

import asyncio
import os
import sys

import asyncpg

# Con trước cha: các bảng con tham chiếu agent.case_run.
TABLES = ("action_log", "approval_token", "case_plan", "case_event", "case_run")


async def main() -> int:
    url = os.environ.get("RESET_DATABASE_URL")
    if not url:
        print("Thiếu RESET_DATABASE_URL (role có quyền xoá bỏ qua RLS, không phải bank_engine).",
              file=sys.stderr)
        return 2
    con = await asyncpg.connect(url)
    try:
        async with con.transaction():
            for table in TABLES:
                n = await con.fetchval(f"WITH d AS (DELETE FROM agent.{table} RETURNING 1) "
                                       "SELECT count(*) FROM d")
                print(f"agent.{table}: xoá {n} dòng")
    finally:
        await con.close()
    print("Đã reset dữ liệu demo của agent engine.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
