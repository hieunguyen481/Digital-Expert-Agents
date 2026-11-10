"""Kết quả benchmark đọc dưới RLS: có danh tính thì thấy, không có thì không; không lộ văn bản kết luận.

Cần Postgres đã migrate (V032) và một dòng agent.benchmark_run (run.py --import-file). Thiếu biến thì bỏ qua.
"""
import os

import asyncpg
import pytest

from common import identity
from gateway import db

pytestmark = pytest.mark.skipif(
    not all(os.getenv(k) for k in ("DATABASE_URL", "TEST_ADMIN_DATABASE_URL")),
    reason="cần Postgres đã migrate")

OFFICER = identity.Identity("10000000-0000-4000-8000-000000000001", "30000000-0000-4000-8000-000000000002")


@pytest.fixture
async def stored_run():
    con = await asyncpg.connect(os.environ["TEST_ADMIN_DATABASE_URL"])
    try:
        run_id = "rlstest_bench"
        await con.execute(
            "INSERT INTO agent.benchmark_run(run_id, created_at, cases_version, llm_mode, planner_model,"
            " specialist_model, git_commit, runs_per_case, summary, per_case, runs)"
            " VALUES ($1, now() + interval '100 years', 'vT', 'hybrid', 'p', 's', 'abc', 1, '{}', '{}',"
            " '[{\"mode\":\"single\",\"conclusion_text\":\"BÍ MẬT\",\"latency_s\":1}]'::jsonb)"
            " ON CONFLICT DO NOTHING", run_id)
        yield run_id
    finally:
        await con.execute("DELETE FROM agent.benchmark_run WHERE run_id=$1", "rlstest_bench")
        await con.close()
        await db.close()


async def test_latest_benchmark_follows_rls_and_hides_text(stored_run):
    identity.set_current(OFFICER)
    r = await db.latest_benchmark()
    assert r and r["run_id"] == stored_run and r["cases_version"] == "vT"
    assert "conclusion_text" not in r["runs"][0] and r["runs"][0]["latency_s"] == 1
    identity.set_current(None)
    with pytest.raises(db.NoIdentity):
        await db.latest_benchmark()


async def test_list_and_get_benchmark_follow_rls(stored_run):
    identity.set_current(OFFICER)
    runs = await db.list_benchmarks()
    assert any(r["run_id"] == stored_run and r["grader_version"] == "v1" and r["regrade_of"] is None for r in runs)
    assert all(set(r["modes"]) <= {"single", "multi"} for r in runs)
    one = await db.get_benchmark(stored_run)
    assert one and "conclusion_text" not in one["runs"][0]
    assert await db.get_benchmark("khong-co") is None
    identity.set_current(None)
    with pytest.raises(db.NoIdentity):
        await db.list_benchmarks()
