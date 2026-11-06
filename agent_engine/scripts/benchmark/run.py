#!/usr/bin/env python3
"""Benchmark single-agent vs multi-agent trên stack đang chạy (xem README.md).

Một lệnh chạy 1 ca:  python3 agent_engine/scripts/benchmark/run.py --cases C1 --runs 1
Cả bộ (5 ca x 3 lần x 2 chế độ): python3 agent_engine/scripts/benchmark/run.py --runs 3
Nạp kết quả đã lưu vào Postgres: python3 .../run.py --import-file agent_engine/benchmark_results/<file>.json

Chỉ dùng thư viện chuẩn trên host. Multi-agent chạy qua gateway HTTP với JWT Keycloak thật của
credit.officer; single-agent chạy trong container engine (docker exec) với đúng danh tính đó.
Chạy đo chỉ tạo dữ liệu agent.* (case, event) và audit.engine_mcp_call; không xác nhận/duyệt hồ sơ.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import grade as G  # noqa: E402

OFFICER = {"employee_id": "10000000-0000-4000-8000-000000000001",
           "branch_id": "30000000-0000-4000-8000-000000000002"}
STATE_GATE = {"Pending Approval": "PENDING_APPROVAL", "Needs Info": "NEEDS_INFO",
              "Rejected": "REJECTED", "Escalated": "ESCALATED", "Completed": "COMPLETED"}


def env_local(key: str) -> str:
    m = re.search(rf"^{key}=(.*)$", (ROOT / "infra/.env.local").read_text(), re.M)
    if not m:
        raise SystemExit(f"thiếu {key} trong infra/.env.local")
    return m.group(1).strip().strip("\"'")


def sh(cmd: list[str], stdin: str | None = None, timeout: int = 900) -> str:
    r = subprocess.run(cmd, input=stdin, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{cmd[:3]} -> {r.stderr[-300:]}")
    return r.stdout


def http(method: str, url: str, token: str | None = None, body: dict | None = None,
         form: dict | None = None):
    data = urllib.parse.urlencode(form).encode() if form else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if body is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read() or b"null")


def get_token(a) -> str:
    return http("POST", f"{a.keycloak}/realms/bank-ai/protocol/openid-connect/token", form={
        "grant_type": "password", "client_id": "bank-ai-backend",
        "client_secret": env_local("KEYCLOAK_BACKEND_CLIENT_SECRET"),
        "username": "credit.officer@example.local", "password": env_local("SEED_USER_PASSWORD")})["access_token"]


def audit_tools(a, t0: float, t1: float) -> list[str]:
    q = (f"SELECT tool FROM audit.engine_mcp_call WHERE employee_id='{OFFICER['employee_id']}' "
         f"AND called_at >= to_timestamp({t0 - 0.5}) AND called_at <= to_timestamp({t1 + 1}) "
         f"AND outcome <> 'denied' ORDER BY id")
    out = sh(["docker", "exec", a.postgres, "psql", "-U", "postgres", "-d", "bank_ai", "-Atc", q])
    return [x for x in out.split() if x]


def usage_snapshot(a) -> dict[str, int]:
    """Số dòng hiện có của log các tiến trình engine (LLM_USAGE ghi vào /engine/logs/*.log)."""
    out = sh(["docker", "exec", a.engine, "sh", "-c", "wc -l /engine/logs/*.log"])
    return {l.split()[1]: int(l.split()[0]) for l in out.splitlines() if l.split()[-1].endswith(".log")}


def llm_usage(a, snap: dict[str, int]) -> dict:
    """Cộng LLM_USAGE phát sinh SAU snapshot. Chạy tuần tự nên quy được cho đúng lượt; nếu có người
    khác dùng engine đồng thời thì số bị lẫn (ghi chú trong README)."""
    tot = {"prompt": 0, "completion": 0, "total": 0}
    cost, n, have_cost = 0.0, 0, True
    for f, lines in snap.items():
        text = sh(["docker", "exec", a.engine, "sh", "-c", f"tail -n +{lines + 1} {f} | grep '^LLM_USAGE ' || true"])
        for line in text.splitlines():
            u = json.loads(line[len("LLM_USAGE "):])
            n += 1
            tot["prompt"] += int(u.get("prompt_tokens") or 0)
            tot["completion"] += int(u.get("completion_tokens") or 0)
            tot["total"] += int(u.get("total_tokens") or 0)
            if u.get("cost") is None:
                have_cost = False
            else:
                cost += float(u["cost"])
    return {"tokens": tot, "cost_usd": cost if have_cost else None, "llm_requests": n}


def run_multi(a, token: str, case: dict) -> dict:
    gw = a.gateway
    snap = usage_snapshot(a)
    t0 = time.time()
    cid = http("POST", f"{gw}/cases", token, {"request": case["request"], "documents": []})["case_id"]
    http("POST", f"{gw}/cases/{cid}/run", token)
    state = ""
    while time.time() - t0 < a.timeout:
        state = http("GET", f"{gw}/cases/{cid}", token)["state"]
        if state in STATE_GATE:
            break
        time.sleep(1)
    t1 = time.time()
    if state not in STATE_GATE:
        return {"error": f"không tới trạng thái cuối sau {a.timeout}s (state={state})", "case_id": cid}
    events = http("GET", f"{gw}/cases/{cid}/events?after=0", token)
    parts, sources = [], []
    for e in events:
        if e["type"] != "task_finished":
            continue
        v = e["payload"]["verdict"]
        parts += [v.get("summary", "")] + list(v.get("findings") or []) + list(v.get("conditions") or [])
        parts.append(str((v.get("data") or {}).get("narrative") or ""))
        sources += [x.get("source", "") for x in v.get("evidence") or []]
    tools = audit_tools(a, t0, t1)
    use = llm_usage(a, snap)
    return {"error": None, "case_id": cid, "latency_s": t1 - t0, "gate": STATE_GATE[state],
            "conclusion_text": "\n".join(p for p in parts if p), "sources": sources,
            "tools_called": tools, "calls": len(tools), **use}


def run_single(a, case: dict) -> dict:
    sh(["docker", "exec", a.engine, "mkdir", "-p", "/tmp/bench"])
    sh(["docker", "cp", str(HERE / "single_agent_runner.py"), f"{a.engine}:/tmp/bench/single_agent_runner.py"])
    t0 = time.time()
    out = sh(["docker", "exec", "-i", a.engine, "python", "/tmp/bench/single_agent_runner.py"],
             stdin=json.dumps({"request": case["request"], "identity": OFFICER}), timeout=a.timeout)
    t1 = time.time()
    line = next(x for x in out.splitlines() if x.startswith("RESULT_JSON "))
    r = json.loads(line[len("RESULT_JSON "):])
    tools = audit_tools(a, t0, t1)
    r.update({"tools_called": tools, "calls": len(tools)})
    r["rag_calls"] = len(r.get("rag_calls", []))
    r.pop("raw_verdict", None)
    return r


def sql_lit(v) -> str:
    return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'"


def import_file(a, path: Path) -> None:
    d = json.loads(path.read_text())
    s = lambda x: "'" + str(x).replace("'", "''") + "'"  # noqa: E731
    sql = (
        "INSERT INTO agent.benchmark_run(run_id, created_at, label, cases_version, llm_mode, planner_model, "
        "specialist_model, git_commit, runs_per_case, total_cost_usd, summary, per_case, runs) VALUES ("
        f"{s(d['run_id'])}, {s(d['created_at'])}::timestamptz, {s(d['label'])}, {s(d['cases_version'])}, "
        f"{s(d['llm_mode'])}, {s(d['planner_model'])}, {s(d['specialist_model'])}, {s(d['git_commit'])}, "
        f"{int(d['runs_per_case'])}, {d['total_cost_usd'] if d['total_cost_usd'] is not None else 'NULL'}, "
        f"{sql_lit(d['summary'])}::jsonb, {sql_lit(d['per_case'])}::jsonb, {sql_lit(d['runs'])}::jsonb) "
        "ON CONFLICT (run_id) DO NOTHING;")
    sh(["docker", "exec", "-i", a.postgres, "psql", "-U", "postgres", "-d", "bank_ai",
        "-v", "ON_ERROR_STOP=1", "-q"], stdin=sql)
    print(f"đã nạp {d['run_id']} vào agent.benchmark_run")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--cases", default="all", help="vd C1,C3 hoặc all")
    p.add_argument("--runs", type=int, default=3)
    p.add_argument("--modes", default="single,multi")
    p.add_argument("--cases-file", default=str(HERE / "cases_v1.json"))
    p.add_argument("--label", default="")
    p.add_argument("--max-cost", type=float, default=2.0, help="dừng nếu tổng chi phí vượt (USD)")
    p.add_argument("--gateway", default="http://127.0.0.1:8010")
    p.add_argument("--keycloak", default="http://127.0.0.1:8080")
    p.add_argument("--engine", default="bank-ai-workbench-engine-1")
    p.add_argument("--postgres", default="bank-ai-workbench-postgres-1")
    p.add_argument("--timeout", type=int, default=600)
    p.add_argument("--no-import", action="store_true")
    p.add_argument("--import-file")
    a = p.parse_args()
    if a.import_file:
        return import_file(a, Path(a.import_file))

    spec = json.loads(Path(a.cases_file).read_text())
    cases = [c for c in spec["cases"] if a.cases == "all" or c["id"] in a.cases.split(",")]
    modes = a.modes.split(",")
    envv = dict(x.split("=", 1) for x in sh(["docker", "exec", a.engine, "env"]).splitlines() if "=" in x)
    started = datetime.now(timezone.utc)
    token = get_token(a)
    runs, spent = [], 0.0
    stop = False
    for case in cases:
        for i in range(a.runs):
            for mode in modes:
                if stop:
                    break
                token = get_token(a)  # token Keycloak sống ngắn
                try:
                    r = run_multi(a, token, case) if mode == "multi" else run_single(a, case)
                except Exception as e:  # noqa: BLE001
                    r = {"error": f"{type(e).__name__}: {e}"[:300]}
                row = {"mode": mode, "case_id": case["id"], "iteration": i + 1, "error": r.get("error")}
                if not r.get("error"):
                    row.update({
                        "latency_s": r["latency_s"], "calls": r["calls"], "tokens": r["tokens"],
                        "cost_usd": r["cost_usd"], "llm_requests": r.get("llm_requests"),
                        "gate": r["gate"], "case_id_engine": r.get("case_id"),
                        "grade": G.grade(case, r), "conclusion_text": r["conclusion_text"],
                        "tools_called": r["tools_called"]})
                    spent += r["cost_usd"] or 0.0
                runs.append(row)
                print(f"{case['id']} #{i + 1} {mode:6s} err={row['error']} "
                      f"lat={row.get('latency_s', 0):.1f}s calls={row.get('calls')} "
                      f"cost=${row.get('cost_usd')} gate={row.get('gate')} "
                      f"find={row.get('grade', {}).get('findings_hit')}/{row.get('grade', {}).get('findings_total')} "
                      f"false={row.get('grade', {}).get('false_count')}", flush=True)
                if spent > a.max_cost:
                    print(f"DỪNG: chi phí ${spent:.4f} vượt ngưỡng ${a.max_cost}")
                    stop = True
    ok = [r for r in runs if not r["error"]]
    per_case = {c["id"]: G.summarize([r for r in ok if r["case_id"] == c["id"]]) for c in cases}
    now = datetime.now(timezone.utc)
    res = {
        "run_id": now.strftime("%Y%m%dT%H%M%SZ") + (f"-{a.label}" if a.label else ""),
        "created_at": now.isoformat(), "started_at": started.isoformat(), "label": a.label,
        "cases_version": spec["version"], "llm_mode": envv.get("LLM_MODE", "?"),
        "planner_model": envv.get("PLANNER_MODEL", "?"), "specialist_model": envv.get("SPECIALIST_MODEL", "?"),
        "git_commit": sh(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"]).strip(),
        "runs_per_case": a.runs, "cases": [c["id"] for c in cases],
        "total_cost_usd": spent if all(r["cost_usd"] is not None for r in ok) else None,
        "summary": G.summarize(ok), "per_case": per_case, "runs": runs,
    }
    outdir = ROOT / "agent_engine" / "benchmark_results"
    outdir.mkdir(exist_ok=True)
    path = outdir / f"{res['run_id']}.json"
    path.write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(f"đã lưu {path.relative_to(ROOT)}  tổng chi phí ${spent:.4f}")
    if not a.no_import:
        try:
            import_file(a, path)
        except Exception as e:  # noqa: BLE001
            print(f"CHƯA nạp vào Postgres (bảng chưa có hoặc DB không chạm được): {str(e)[-200:]}")


if __name__ == "__main__":
    main()
