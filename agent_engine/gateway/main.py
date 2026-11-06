"""Gateway API — cổng duy nhất cho UI: cases, HITL, events (SSE + polling), registry.

Chạy: python -m gateway.main  (hoặc qua run_all.py)
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx  # noqa: E402
import uvicorn  # noqa: E402
from fastapi import BackgroundTasks, Depends, FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402
from sse_starlette.sse import EventSourceResponse  # noqa: E402

from common import config, identity, mcp_client, rag  # noqa: E402
from common.schemas import CaseCreate, CaseState, new_id  # noqa: E402
from gateway import approval, db, orchestrator, planner  # noqa: E402
from gateway.auth import (Principal, current_principal, internal_only,  # noqa: E402
                          require_roles)

USER = Depends(require_roles())

app = FastAPI(title="SHB Digital Expert Agents — Gateway")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"])

# ---- SSE broadcast ----
_subscribers: dict[str, list[asyncio.Queue]] = {}


async def broadcast(event: dict) -> None:
    for q in _subscribers.get(event["case_id"], []):
        await q.put(event)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    db.init()
    asyncio.create_task(_sla_watcher())


# ---- Cases ----
@app.post("/cases")
async def create_case(body: CaseCreate, user: Principal = USER) -> dict:
    case_id = new_id("case")
    payload = body.model_dump(mode="json")
    payload["submitted_by"] = user.employee_id  # danh tính từ JWT, không tin giá trị client gửi
    payload["_identity"] = {"employee_id": user.employee_id, "branch_id": user.branch_id,
                            "is_admin": user.is_admin}
    db.create_case(case_id, payload)
    await broadcast(db.add_event(case_id, "gateway", "case_created", {
        "request": body.request.model_dump(mode="json"),
        "submitted_by": user.employee_id,
        "documents": [d.get("doc_type") for d in body.documents],
    }))
    return {"case_id": case_id, "state": CaseState.DRAFT.value}


@app.post("/cases/{case_id}/run")
async def run_case(case_id: str, background: BackgroundTasks, user: Principal = USER) -> dict:
    if db.get_case(case_id) is None:
        return {"error": "case không tồn tại"}
    background.add_task(orchestrator.run_analysis, case_id)
    return {"status": "started"}


@app.get("/cases/{case_id}")
async def get_case(case_id: str, user: Principal = USER) -> dict:
    case = db.get_case(case_id)
    if case is None:
        return {"error": "case không tồn tại"}
    case["plan"] = db.get_latest_plan(case_id)
    return case


@app.get("/cases/{case_id}/events")
async def get_events(case_id: str, after: int = 0, user: Principal = USER) -> list[dict]:
    return db.get_events(case_id, after)


@app.get("/cases/{case_id}/stream")
async def stream_events(case_id: str, user: Principal = USER):
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.setdefault(case_id, []).append(q)

    async def gen():
        try:
            for e in db.get_events(case_id):  # phát lại lịch sử trước
                yield {"data": json.dumps(e, ensure_ascii=False, default=str)}
            while True:
                e = await q.get()
                yield {"data": json.dumps(e, ensure_ascii=False, default=str)}
        finally:
            _subscribers.get(case_id, []).remove(q)

    return EventSourceResponse(gen())


# ---- HITL ----
class ApproveBody(BaseModel):
    approver: str
    approver_level: str = "branch_director"


class RejectBody(BaseModel):
    approver: str
    reason: str = ""


class SupplementBody(BaseModel):
    documents: list[dict]


@app.post("/cases/{case_id}/approve")
async def approve(case_id: str, body: ApproveBody, background: BackgroundTasks,
                  user: Principal = Depends(require_roles(*config.APPROVER_ROLES))) -> dict:
    case = db.get_case(case_id)
    if not case or case["state"] != CaseState.PENDING_APPROVAL.value:
        return {"error": "case không ở trạng thái Pending Approval"}
    required = (case.get("package") or {}).get("required_approver_level", "branch_director")
    if body.approver_level != required:
        return {"error": f"sai thẩm quyền: cần {required}, nhận {body.approver_level}"}
    background.add_task(orchestrator.approve_and_commit, case_id, user.employee_id)
    return {"status": "approving"}


@app.post("/cases/{case_id}/reject")
async def reject(case_id: str, body: RejectBody,
                 user: Principal = Depends(require_roles(*config.APPROVER_ROLES))) -> dict:
    db.update_case(case_id, state=CaseState.REJECTED.value, approver=user.employee_id)
    await broadcast(db.add_event(case_id, "hitl", "rejected",
                                 {"approver": body.approver, "reason": body.reason}))
    return {"status": "rejected"}


@app.post("/cases/{case_id}/supplement")
async def supplement(case_id: str, body: SupplementBody, user: Principal = USER) -> dict:
    return await orchestrator.supplement_and_replan(case_id, body.documents)


# ---- Direct Answer (triage: câu hỏi chỉ-đọc trả lời ngay bằng RAG) ----
class AskBody(BaseModel):
    question: str


@app.post("/ask")
async def direct_answer(body: AskBody, user: Principal = USER) -> dict:
    hits = (rag.search("credit", body.question, k=2)
            + rag.search("compliance", body.question, k=2)
            + rag.search("ops", body.question, k=2))
    hits = sorted(hits, key=lambda h: -h["score"])[:3]
    return {"answer_mode": "direct_faq", "passages": hits,
            "note": "Câu hỏi phức tạp hơn? Tạo case để hội đồng chuyên gia xử lý."}


# ---- Internal ----
class EventBody(BaseModel):
    case_id: str
    agent: str
    type: str
    payload: dict = {}


@app.post("/internal/events", dependencies=[Depends(internal_only)])
async def post_event(body: EventBody) -> dict:
    await broadcast(db.add_event(body.case_id, body.agent, body.type, body.payload))
    return {"ok": True}


class TokenVerifyBody(BaseModel):
    case_id: str
    token: str


@app.post("/internal/tokens/verify", dependencies=[Depends(internal_only)])
async def verify_token(body: TokenVerifyBody) -> dict:
    return approval.verify(body.case_id, body.token)


# ---- Registry & audit ----
@app.get("/agents")
async def agents(user: Principal = USER) -> list[dict]:
    registry = await planner.get_registry()
    return [c.model_dump() for c in registry.values()]


@app.get("/audit/mcp")
async def mcp_audit(limit: int = 30,
                    user: Principal = Depends(require_roles(*config.AUDIT_ROLES))) -> list[dict]:
    identity.set_current(user.identity())
    return await mcp_client.call_tool("get_audit_log", {"limit": limit})


# ---- SLA watcher: nhắc việc + escalate phê duyệt quá hạn ----
async def _sla_watcher() -> None:
    reminded: set[str] = set()
    while True:
        await asyncio.sleep(10)
        try:
            for row in db.list_pending_approval():
                cid, deadline = row["case_id"], row["sla_deadline"] or 0
                now = time.time()
                if deadline and now > deadline and cid not in reminded:
                    reminded.add(cid)
                    await broadcast(db.add_event(cid, "sla", "sla_reminder", {
                        "message": "Quá SLA phê duyệt — đã nhắc người duyệt, giữ checkpoint"}))
                elif deadline and now > deadline * 1 + config.APPROVAL_SLA_SECONDS \
                        and f"{cid}:esc" not in reminded:
                    reminded.add(f"{cid}:esc")
                    await broadcast(db.add_event(cid, "sla", "sla_escalated", {
                        "message": "Người phê duyệt không phản hồi — chuyển hàng đợi "
                                   "cấp dự phòng theo ma trận thẩm quyền"}))
        except Exception:  # noqa: BLE001
            pass


if __name__ == "__main__":
    uvicorn.run(app, host=config.HOST, port=config.GATEWAY_PORT, log_level="warning")
