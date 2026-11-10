"""Store của gateway trong Postgres (schema agent, V030): cases, events/trace, plans, approval tokens.

Mọi truy vấn chạy trong giao dịch `SET LOCAL ROLE bank_engine` + danh tính nhân viên (app.employee_id
...), nên RLS quyết định ai thấy hồ sơ/trace nào. Danh tính lấy từ contextvar `identity.current()`
(gateway đặt từ JWT đã xác thực, background task đặt từ danh tính người nộp hồ sơ).
"""
from __future__ import annotations

import json
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import asyncpg

from common import config, identity, labels

from . import proposals

_pool: asyncpg.Pool | None = None
_JSON_COLS = {"payload", "package", "plan"}


class NoIdentity(Exception):
    pass


async def _init_conn(con: asyncpg.Connection) -> None:
    await con.set_type_codec("jsonb", schema="pg_catalog", format="text",
                             encoder=lambda v: json.dumps(v, ensure_ascii=False, default=str),
                             decoder=json.loads)


async def pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(config.DATABASE_URL, min_size=1, max_size=8,
                                          init=_init_conn)
    return _pool


async def close() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def tx(ident: identity.Identity | None = None,
             system: bool = False) -> AsyncIterator[asyncpg.Connection]:
    """Giao dịch dưới RLS. `system=True` chỉ dành cho hàm SECURITY DEFINER (SLA watcher)."""
    ident = ident or identity.current()
    if ident is None and not system:
        raise NoIdentity("thiếu danh tính nhân viên cho truy vấn")
    p = await pool()
    async with p.acquire() as con, con.transaction():
        await con.execute("SET LOCAL ROLE bank_engine")
        if ident is not None:
            await con.fetch(
                "SELECT set_config('app.employee_id',$1,true), set_config('app.branch_id',$2,true),"
                " set_config('app.is_admin',$3,true)",
                ident.employee_id, ident.branch_id, "true" if ident.is_admin else "false")
        yield con


def _case(r: asyncpg.Record | None) -> dict | None:
    if r is None:
        return None
    d = dict(r)
    d["customer_id"] = str(d["customer_id"])
    d["submitted_by"] = str(d["submitted_by"])
    d["approver"] = str(d["approver"]) if d["approver"] else None
    return d


# ---- cases ----
async def create_case(case_id: str, payload: dict) -> None:
    now = time.time()
    async with tx() as con:
        await con.execute(
            "INSERT INTO agent.case_run(case_id, customer_id, submitted_by, state, payload,"
            " created_at, updated_at) VALUES ($1,$2,$3,'Draft',$4,$5,$5)",
            case_id, uuid.UUID(payload["request"]["business_id"]),
            uuid.UUID(identity.current().employee_id), payload, now)


async def get_case(case_id: str) -> dict | None:
    async with tx() as con:
        return _case(await con.fetchrow("SELECT * FROM agent.case_run WHERE case_id=$1", case_id))


_UPDATABLE = {"state", "payload", "package", "approver", "replan_count", "sla_deadline"}


async def update_case(case_id: str, **fields: Any) -> None:
    sets, vals = ["updated_at=$1"], [time.time()]
    for k, v in fields.items():
        if k not in _UPDATABLE:
            raise ValueError(f"cột không được phép: {k}")
        vals.append(uuid.UUID(v) if k == "approver" and v else v)
        sets.append(f"{k}=${len(vals)}")
    vals.append(case_id)
    async with tx() as con:
        await con.execute(f"UPDATE agent.case_run SET {', '.join(sets)} WHERE case_id=${len(vals)}",
                          *vals)


async def list_cases(limit: int = 50) -> list[dict]:
    """Danh sách hồ sơ dưới RLS của người gọi, kèm tóm tắt số liệu tính từ trace thật."""
    async with tx() as con:
        rows = await con.fetch(
            "SELECT r.case_id, r.customer_id, r.submitted_by, r.approver, r.state, r.created_at,"
            " r.updated_at, r.replan_count, r.payload->'request' AS request,"
            " COUNT(*) FILTER (WHERE e.type='tool_call') AS tool_calls,"
            " COUNT(*) FILTER (WHERE e.type='llm_usage') AS llm_calls,"
            " SUM((e.payload->>'cost_usd')::float8) FILTER (WHERE e.type='llm_usage') AS cost_usd"
            " FROM agent.case_run r LEFT JOIN agent.case_event e ON e.case_id=r.case_id"
            " GROUP BY r.case_id ORDER BY r.created_at DESC LIMIT $1", max(1, min(limit, 200)))
    out = []
    for r in rows:
        d = _case(dict(r))
        d["request"] = {k: (d["request"] or {}).get(k) for k in ("amount", "purpose", "term_months")}
        out.append(d)
    return out


async def case_stats() -> dict:
    """Thống kê tổng hợp dưới RLS: chỉ gồm hồ sơ người gọi được phép thấy."""
    async with tx() as con:
        by_state = await con.fetch(
            "SELECT state, COUNT(*) AS n FROM agent.case_run GROUP BY state")
        total = await con.fetchrow(
            "SELECT COUNT(*) AS cases,"
            " AVG(updated_at - created_at) FILTER (WHERE state <> 'Draft' AND state <> 'In Analysis')"
            "   AS avg_seconds FROM agent.case_run")
        ev = await con.fetchrow(
            "SELECT COUNT(*) FILTER (WHERE type='tool_call') AS tool_calls,"
            " COUNT(*) FILTER (WHERE type='llm_usage') AS llm_calls,"
            " SUM((payload->>'cost_usd')::float8) FILTER (WHERE type='llm_usage') AS cost_usd,"
            " COUNT(*) FILTER (WHERE type='llm_usage' AND payload ? 'cost_usd') AS costed_calls,"
            " COUNT(*) FILTER (WHERE type='a2a_challenge') AS challenges"
            " FROM agent.case_event")
        tools = await con.fetch(
            "SELECT payload->>'tool' AS tool, COUNT(*) AS n,"
            " COUNT(*) FILTER (WHERE payload->>'outcome' <> 'ok') AS failed"
            " FROM agent.case_event WHERE type='tool_call' GROUP BY 1 ORDER BY n DESC")
        agents = await con.fetch(
            "SELECT agent, COUNT(*) FILTER (WHERE type='task_finished') AS tasks,"
            " COUNT(*) FILTER (WHERE type='agent_error') AS errors,"
            " COUNT(*) FILTER (WHERE type='tool_call') AS tool_calls"
            " FROM agent.case_event WHERE agent NOT IN ('gateway','orchestrator','hitl','sla')"
            " GROUP BY agent ORDER BY agent")
    return {
        "cases": total["cases"],
        "avg_seconds": float(total["avg_seconds"]) if total["avg_seconds"] is not None else None,
        "by_state": {r["state"]: r["n"] for r in by_state},
        "tool_calls": ev["tool_calls"], "llm_calls": ev["llm_calls"],
        "cost_usd": ev["cost_usd"] if ev["costed_calls"] else None,
        "challenges": ev["challenges"],
        "tools": [dict(r) for r in tools],
        "agents": [dict(r) for r in agents],
    }


async def list_pending_approval() -> list[dict]:
    async with tx(system=True) as con:
        rows = await con.fetch("SELECT * FROM agent.pending_approvals()")
    return [dict(r) for r in rows]


async def add_system_event(case_id: str, etype: str, payload: dict) -> dict:
    async with tx(system=True) as con:
        eid = await con.fetchval("SELECT agent.add_system_event($1,$2,$3)", case_id, etype, payload)
    return {"id": eid, "ts": time.time(), "case_id": case_id, "agent": "sla", "type": etype,
            "payload": payload}


# ---- events (trace) ----
async def add_event(case_id: str, agent: str, etype: str, payload: dict) -> dict:
    payload = labels.humanize_payload(payload)  # L07: người dùng chỉ thấy tiếng Việt; bản gốc quote ở raw_quote
    ts = time.time()
    async with tx() as con:
        eid = await con.fetchval(
            "INSERT INTO agent.case_event(ts, case_id, agent, type, payload)"
            " VALUES ($1,$2,$3,$4,$5) RETURNING id", ts, case_id, agent, etype, payload)
    return {"id": eid, "ts": ts, "case_id": case_id, "agent": agent, "type": etype,
            "payload": payload}


async def get_events(case_id: str, after_id: int = 0) -> list[dict]:
    async with tx() as con:
        rows = await con.fetch(
            "SELECT id, ts, case_id, agent, type, payload FROM agent.case_event"
            " WHERE case_id=$1 AND id>$2 ORDER BY id", case_id, after_id)
    return [dict(r) for r in rows]


# ---- plans ----
async def save_plan(case_id: str, version: int, plan: dict) -> None:
    async with tx() as con:
        await con.execute(
            "INSERT INTO agent.case_plan(case_id, version, plan, ts) VALUES ($1,$2,$3,$4)"
            " ON CONFLICT (case_id, version) DO UPDATE SET plan=EXCLUDED.plan, ts=EXCLUDED.ts",
            case_id, version, plan, time.time())


async def get_latest_plan(case_id: str) -> dict | None:
    async with tx() as con:
        return await con.fetchval(
            "SELECT plan FROM agent.case_plan WHERE case_id=$1 ORDER BY version DESC LIMIT 1",
            case_id)


# ---- tokens ----
async def save_token(token: str, case_id: str, package_hash: str, policy_version: str,
                     approver: str, expires_at: float) -> None:
    async with tx() as con:
        await con.execute(
            "INSERT INTO agent.approval_token(token, case_id, package_hash, policy_version,"
            " approver, expires_at) VALUES ($1,$2,$3,$4,$5,$6)",
            token, case_id, package_hash, policy_version, uuid.UUID(approver), expires_at)


async def get_token(token: str) -> dict | None:
    async with tx() as con:
        r = await con.fetchrow("SELECT * FROM agent.approval_token WHERE token=$1", token)
    if not r:
        return None
    d = dict(r)
    d["approver"] = str(d["approver"])
    return d


async def mark_token_used(token: str) -> bool:
    """Đánh dấu dùng một lần; trả False nếu đã bị dùng (chống chạy đua)."""
    async with tx() as con:
        return await con.fetchval(
            "UPDATE agent.approval_token SET used=TRUE WHERE token=$1 AND NOT used RETURNING TRUE",
            token) is True


# ---- hành động đã thực thi ----
async def record_action(case_id: str, action: str, loan_id: str, key: str, executed_by: str,
                        outcome: str, result: dict) -> bool:
    """Ghi nhật ký hành động; trả False nếu idempotency_key đã tồn tại."""
    async with tx() as con:
        return await con.fetchval(
            "INSERT INTO agent.action_log(case_id, action, loan_application_id, idempotency_key,"
            " executed_by, outcome, result, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)"
            " ON CONFLICT (idempotency_key) DO NOTHING RETURNING TRUE",
            case_id, action, uuid.UUID(loan_id), key, uuid.UUID(executed_by), outcome, result,
            time.time()) is True


async def get_action_by_key(key: str) -> dict | None:
    async with tx() as con:
        r = await con.fetchrow("SELECT * FROM agent.action_log WHERE idempotency_key=$1", key)
    return dict(r) if r else None


# ---- đề xuất hành động của đội agent (V049): chỉ người xác nhận mới chuyển trạng thái ----
_PROP_COLS = ("id::text AS id, case_id, kind, title, rationale, evidence, params, source_agent, status,"
              " decided_by::text AS decided_by, decided_reason, decided_at, result, created_at")


def _prop_text(it: dict) -> str:
    pr = it.get("params") or {}
    if isinstance(pr, str):
        import json
        pr = json.loads(pr)
    return pr.get("text") or " ".join(pr.get("documents") or []) or it.get("title", "")


async def add_proposals(case_id: str, items: list[dict]) -> list[dict]:
    items = labels.humanize_payload(items)
    out = []
    async with tx() as con:
        have = [(r["kind"], r["title"], r["params"]) for r in await con.fetch(
            "SELECT kind, title, params FROM agent.action_proposal WHERE case_id=$1", case_id)]
        for it in items:
            # chạy lại/phân tích lại không nhân đôi đề xuất: trùng tiêu đề, hoặc cùng việc diễn đạt khác chữ
            if any(k == it["kind"] and (t == it["title"] or proposals.similar(_prop_text(it), _prop_text({"params": pr, "title": t})))
                   for k, t, pr in have):
                continue
            have.append((it["kind"], it["title"], it["params"]))
            pid = uuid.uuid4()
            await con.execute(
                "INSERT INTO agent.action_proposal(id, case_id, kind, title, rationale, evidence, params,"
                " source_agent, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
                pid, case_id, it["kind"], it["title"], it["rationale"], it["evidence"], it["params"],
                it["source_agent"], time.time())
            out.append({**it, "id": str(pid), "status": "PROPOSED"})
    return out


async def list_proposals(case_id: str) -> list[dict]:
    async with tx() as con:
        rows = await con.fetch(f"SELECT {_PROP_COLS} FROM agent.action_proposal WHERE case_id=$1"
                               " ORDER BY created_at, id", case_id)
    return [dict(r) for r in rows]


async def get_proposal(pid: str) -> dict | None:
    try:
        key = uuid.UUID(pid)
    except ValueError:
        return None
    async with tx() as con:
        r = await con.fetchrow(f"SELECT {_PROP_COLS} FROM agent.action_proposal WHERE id=$1", key)
    return dict(r) if r else None


async def claim_proposal(pid: str, status: str, by: str, reason: str) -> bool:
    """Chuyển PROPOSED -> CONFIRMED/DISMISSED đúng một lần (bấm hai lần: lần sau trả False)."""
    async with tx() as con:
        return await con.fetchval(
            "UPDATE agent.action_proposal SET status=$2, decided_by=$3, decided_reason=$4, decided_at=$5"
            " WHERE id=$1 AND status='PROPOSED' RETURNING TRUE",
            uuid.UUID(pid), status, uuid.UUID(by), reason, time.time()) is True


async def release_proposal(pid: str, by: str, result: dict) -> None:
    """Backend từ chối: trả về PROPOSED để người có quyền khác/sau đó xử lý; lý do từ chối ghi vào result."""
    async with tx() as con:
        await con.execute(
            "UPDATE agent.action_proposal SET status='PROPOSED', decided_by=NULL, decided_reason=NULL,"
            " decided_at=NULL, result=$3 WHERE id=$1 AND status='CONFIRMED' AND decided_by=$2",
            uuid.UUID(pid), uuid.UUID(by), result)


async def set_proposal_result(pid: str, result: dict) -> None:
    async with tx() as con:
        await con.execute("UPDATE agent.action_proposal SET result=$2 WHERE id=$1", uuid.UUID(pid), result)


# ---- benchmark (V032, V033): chỉ đọc, dưới RLS ----
_BENCH_COLS = ("run_id, created_at, label, cases_version, grader_version, regrade_of, llm_mode, planner_model,"
               " specialist_model, git_commit, runs_per_case, total_cost_usd, summary, per_case, runs")


def _bench_row(r) -> dict:
    """Không trả văn bản kết luận / nguồn của từng lượt (runs[].conclusion_text, sources)."""
    d = dict(r)
    d["created_at"] = d["created_at"].isoformat()
    d["total_cost_usd"] = float(d["total_cost_usd"]) if d["total_cost_usd"] is not None else None
    d["runs"] = [{k: v for k, v in x.items() if k not in ("conclusion_text", "sources")} for x in d["runs"]]
    return d


async def latest_benchmark() -> dict | None:
    """Lượt mặc định: lượt đo thật (không phải chấm lại), bộ ca mới nhất, rồi theo thời gian."""
    async with tx() as con:
        r = await con.fetchrow(
            f"SELECT {_BENCH_COLS} FROM agent.benchmark_run"
            " ORDER BY (regrade_of IS NULL) DESC, cases_version DESC, created_at DESC LIMIT 1")
    return _bench_row(r) if r else None


async def get_benchmark(run_id: str) -> dict | None:
    async with tx() as con:
        r = await con.fetchrow(f"SELECT {_BENCH_COLS} FROM agent.benchmark_run WHERE run_id=$1", run_id)
    return _bench_row(r) if r else None


async def list_benchmarks() -> list[dict]:
    """Danh sách lượt đo để chọn trên dashboard (không kèm số liệu chi tiết)."""
    async with tx() as con:
        rows = await con.fetch(
            "SELECT run_id, created_at, label, cases_version, grader_version, regrade_of, llm_mode,"
            " runs_per_case, total_cost_usd,"
            " ARRAY(SELECT k FROM jsonb_object_keys(summary) k WHERE k IN ('single','multi')) AS modes"
            " FROM agent.benchmark_run"
            " ORDER BY (regrade_of IS NULL) DESC, cases_version DESC, created_at DESC")
    out = []
    for r in rows:
        d = dict(r)
        d["created_at"] = d["created_at"].isoformat()
        d["total_cost_usd"] = float(d["total_cost_usd"]) if d["total_cost_usd"] is not None else None
        d["modes"] = sorted(d["modes"] or [])
        out.append(d)
    return out
