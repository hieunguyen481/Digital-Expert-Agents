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
import uuid  # noqa: E402

import asyncpg  # noqa: E402
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402
from sse_starlette.sse import EventSourceResponse  # noqa: E402

from common import config, identity, mcp_client, rag  # noqa: E402
from common.schemas import CaseCreate, CaseState, new_id  # noqa: E402
from gateway import actions, approval, db, orchestrator, planner, proposal_flow  # noqa: E402
from gateway.auth import (Principal, current_principal, internal_only,  # noqa: E402
                          require_roles)

def _authed(*roles: str):
    """Xác thực JWT + vai trò, rồi đặt danh tính cho mọi truy vấn DB (RLS) của request."""
    base = require_roles(*roles)

    async def dep(user: Principal = Depends(base)) -> Principal:
        identity.set_current(user.identity())
        return user
    return dep


USER = Depends(_authed())

app = FastAPI(title="Digital Expert Agents — Gateway")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"])

# ---- SSE broadcast (chỉ người đã qua kiểm quyền đọc case mới đăng ký) ----
_subscribers: dict[str, list[asyncio.Queue]] = {}


async def broadcast(event: dict) -> None:
    for q in _subscribers.get(event["case_id"], []):
        await q.put(event)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    await db.pool()
    asyncio.create_task(_sla_watcher())


@app.on_event("shutdown")
async def shutdown() -> None:
    await db.close()


async def _visible_case(case_id: str) -> dict:
    """Case hiển thị được dưới RLS của người gọi; không thấy -> 404 (không lộ có tồn tại)."""
    case = await db.get_case(case_id)
    if case is None:
        raise HTTPException(404, "case không tồn tại hoặc không có quyền")
    return case


# ---- Cases ----
@app.post("/cases")
async def create_case(body: CaseCreate, user: Principal = USER) -> dict:
    try:
        uuid.UUID(body.request.business_id)
    except ValueError:
        raise HTTPException(422, "business_id phải là mã khách hàng (UUID)") from None
    case_id = new_id("case")
    payload = body.model_dump(mode="json")
    payload["submitted_by"] = user.employee_id  # danh tính từ JWT, không tin giá trị client gửi
    payload["_identity"] = {"employee_id": user.employee_id, "branch_id": user.branch_id,
                            "is_admin": user.is_admin}
    try:
        await db.create_case(case_id, payload)
    except asyncpg.PostgresError:  # RLS không cho thấy khách hàng, hoặc khách không tồn tại
        raise HTTPException(403, "không có quyền với khách hàng này") from None
    await broadcast(await db.add_event(case_id, "gateway", "case_created", {
        "request": body.request.model_dump(mode="json"),
        "submitted_by": user.employee_id,
        "documents": [d.get("doc_type") for d in body.documents],
    }))
    return {"case_id": case_id, "state": CaseState.DRAFT.value}


@app.get("/cases")
async def list_cases(limit: int = 50, customer_id: str | None = None, user: Principal = USER) -> list[dict]:
    return await db.list_cases(limit, customer_id)


@app.get("/policy/search")
async def policy_search(q: str, k: int = 3, user: Principal = USER) -> list[dict]:
    """Điều khoản chính sách CS-TD-SME/2025 liên quan câu hỏi (BM25 trên corpus, không LLM) để chat trả lời có căn cứ."""
    from common import rag

    hits = [h for h in rag.search("credit", q[:500], k=200) if not h["source"].endswith(".md")][:max(1, min(k, 5))]
    return [{"source": h["source"], "text": h["text"][:900]} for h in hits]


@app.get("/cases/stats")
async def case_stats(user: Principal = USER) -> dict:
    return await db.case_stats()


@app.post("/cases/{case_id}/run")
async def run_case(case_id: str, background: BackgroundTasks, user: Principal = USER) -> dict:
    await _visible_case(case_id)
    background.add_task(orchestrator.run_analysis, case_id, user.identity())
    return {"status": "started"}


@app.get("/cases/{case_id}")
async def get_case(case_id: str, user: Principal = USER) -> dict:
    case = await _visible_case(case_id)
    case["plan"] = await db.get_latest_plan(case_id)
    case["payload"].pop("_identity", None)
    return case


@app.get("/cases/{case_id}/events")
async def get_events(case_id: str, after: int = 0, user: Principal = USER) -> list[dict]:
    await _visible_case(case_id)
    return await db.get_events(case_id, after)


@app.get("/cases/{case_id}/stream")
async def stream_events(case_id: str, user: Principal = USER):
    """SSE; xác thực bằng header Authorization (trình duyệt dùng fetch streaming, không đặt token lên URL)."""
    await _visible_case(case_id)
    ident = user.identity()
    q: asyncio.Queue = asyncio.Queue()
    _subscribers.setdefault(case_id, []).append(q)

    async def gen():
        identity.set_current(ident)
        try:
            last = 0
            for e in await db.get_events(case_id):  # phát lại lịch sử trước
                last = e["id"]
                yield {"data": json.dumps(e, ensure_ascii=False, default=str)}
            while True:
                e = await q.get()
                if e["id"] > last:
                    last = e["id"]
                    yield {"data": json.dumps(e, ensure_ascii=False, default=str)}
        finally:
            _subscribers.get(case_id, []).remove(q)

    return EventSourceResponse(gen())


# ---- HITL: chỉ người có thẩm quyền xác nhận; agent không có đường tự phê duyệt ----
class ApproveBody(BaseModel):
    approver_level: str = "branch_director"
    loan_application_id: str
    decision_type: str = "APPROVED"
    approved_amount: float | None = None   # mặc định lấy hạn mức agent đề xuất
    approved_term_months: int | None = None
    conditions: list[str] | None = None
    reason: str


class RejectBody(BaseModel):
    reason: str = ""


class SupplementBody(BaseModel):
    documents: list[dict]


@app.post("/cases/{case_id}/approve")
async def approve(case_id: str, body: ApproveBody, request: Request,
                  user: Principal = Depends(_authed(*config.APPROVER_ROLES))) -> dict:
    case = await _visible_case(case_id)
    if case["state"] != CaseState.PENDING_APPROVAL.value:
        raise HTTPException(409, "case không ở trạng thái Pending Approval")
    package = case.get("package") or {}
    required = package.get("required_approver_level", "branch_director")
    if body.approver_level != required:
        raise HTTPException(403, f"sai thẩm quyền: cần {required}, nhận {body.approver_level}")
    if not body.reason.strip():
        raise HTTPException(422, "xác nhận phải kèm lý do")
    if body.decision_type not in ("APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED"):
        raise HTTPException(422, "decision_type không hợp lệ")
    amount = body.approved_amount if body.approved_amount is not None else package.get("proposed_limit")
    term = body.approved_term_months or case["payload"]["request"].get("term_months")
    if body.decision_type != "REJECTED" and (not amount or not term):
        raise HTTPException(422, "thiếu số tiền hoặc kỳ hạn phê duyệt")
    confirm = {"loan_application_id": body.loan_application_id,
               "decision_type": body.decision_type, "approved_amount": amount or 0,
               "term_months": term or 0, "reason": body.reason.strip(),
               "conditions": body.conditions if body.conditions is not None
               else package.get("conditions") or []}
    jwt = request.headers["authorization"].partition(" ")[2].strip()
    result = await orchestrator.approve_and_commit(case_id, user.employee_id, jwt, confirm)
    if result.get("status") == "refused":
        raise HTTPException(result["http_status"] if result["http_status"] in (403, 404, 409, 422)
                            else 409, {"code": result["code"], "message": result["message"]})
    return result


@app.post("/cases/{case_id}/reject")
async def reject(case_id: str, body: RejectBody,
                 user: Principal = Depends(_authed(*config.APPROVER_ROLES))) -> dict:
    case = await _visible_case(case_id)
    if case["state"] != CaseState.PENDING_APPROVAL.value:
        raise HTTPException(409, "case không ở trạng thái Pending Approval")
    await db.update_case(case_id, state=CaseState.REJECTED.value, approver=user.employee_id)
    await broadcast(await db.add_event(case_id, "hitl", "rejected",
                                       {"approver": user.employee_id, "reason": body.reason}))
    return {"status": "rejected"}


class LoanDecidedBody(BaseModel):
    loan_application_id: str


@app.post("/cases/{case_id}/loan-decided")
async def loan_decided(case_id: str, body: LoanDecidedBody, request: Request,
                       user: Principal = USER) -> dict:
    """Backend báo hồ sơ đã được quyết định trên workflow; engine tự kiểm lại rồi đóng ca."""
    await _visible_case(case_id)
    jwt = request.headers["authorization"].partition(" ")[2].strip()
    try:
        return await orchestrator.close_on_loan_decision(
            case_id, user.employee_id, jwt, body.loan_application_id)
    except actions.ActionRefused as e:
        raise HTTPException(e.status if e.status in (403, 404, 409) else 409,
                            {"code": e.code, "message": e.message}) from e


# ---- Đề xuất hành động của agent: chỉ người có thẩm quyền xác nhận/bỏ; agent không có đường tự thực hiện ----
class ProposalDecisionBody(BaseModel):
    reason: str
    loan_application_id: str | None = None


def _proposal_http(e: proposal_flow.ProposalError) -> HTTPException:
    return HTTPException(e.status, {"code": e.code, "message": e.message})


@app.get("/cases/{case_id}/proposals")
async def list_proposals(case_id: str, user: Principal = USER) -> list[dict]:
    await _visible_case(case_id)
    return await db.list_proposals(case_id)


@app.post("/proposals/{proposal_id}/confirm")
async def confirm_proposal(proposal_id: str, body: ProposalDecisionBody, request: Request,
                           user: Principal = USER) -> dict:
    jwt = request.headers["authorization"].partition(" ")[2].strip()
    try:
        return await proposal_flow.confirm(
            proposal_id, employee_id=user.employee_id, roles=user.roles, jwt=jwt, reason=body.reason,
            loan_application_id=body.loan_application_id)
    except proposal_flow.ProposalError as e:
        raise _proposal_http(e) from e


@app.post("/proposals/{proposal_id}/dismiss")
async def dismiss_proposal(proposal_id: str, body: ProposalDecisionBody, user: Principal = USER) -> dict:
    try:
        return await proposal_flow.dismiss(
            proposal_id, employee_id=user.employee_id, roles=user.roles, reason=body.reason)
    except proposal_flow.ProposalError as e:
        raise _proposal_http(e) from e


@app.post("/cases/{case_id}/supplement")
async def supplement(case_id: str, body: SupplementBody, user: Principal = USER) -> dict:
    await _visible_case(case_id)
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


# ---- Benchmark single-agent vs multi-agent (kết quả đã lưu, đọc dưới RLS) ----
@app.get("/benchmark/latest")
async def benchmark_latest(user: Principal = USER) -> dict:
    run = await db.latest_benchmark()
    return {"status": "ok", "run": run} if run else {"status": "empty", "run": None}


@app.get("/benchmark/runs")
async def benchmark_runs(user: Principal = USER) -> dict:
    return {"runs": await db.list_benchmarks()}


@app.get("/benchmark/runs/{run_id}")
async def benchmark_run(run_id: str, user: Principal = USER) -> dict:
    run = await db.get_benchmark(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="không có lượt đo này")
    return {"status": "ok", "run": run}


# ---- Internal ----
class EventBody(BaseModel):
    case_id: str
    agent: str
    type: str
    payload: dict = {}


def _internal_identity(request: Request) -> None:
    """Dịch vụ nội bộ phải kèm danh tính đã ký (do gateway cấp); thiếu/giả -> 401."""
    try:
        identity.set_current(identity.verify(request.headers))
    except identity.IdentityError as e:
        raise HTTPException(401, str(e)) from None


@app.post("/internal/events", dependencies=[Depends(internal_only)])
async def post_event(body: EventBody, request: Request) -> dict:
    _internal_identity(request)
    await broadcast(await db.add_event(body.case_id, body.agent, body.type, body.payload))
    return {"ok": True}


class TokenVerifyBody(BaseModel):
    case_id: str
    token: str


@app.post("/internal/tokens/verify", dependencies=[Depends(internal_only)])
async def verify_token(body: TokenVerifyBody, request: Request) -> dict:
    _internal_identity(request)
    return await approval.verify(body.case_id, body.token)


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
            for row in await db.list_pending_approval():
                cid, deadline = row["case_id"], row["sla_deadline"] or 0
                now = time.time()
                if deadline and now > deadline and cid not in reminded:
                    reminded.add(cid)
                    await broadcast(await db.add_system_event(cid, "sla_reminder", {
                        "message": "Quá SLA phê duyệt — đã nhắc người duyệt, giữ checkpoint"}))
                elif deadline and now > deadline * 1 + config.APPROVAL_SLA_SECONDS \
                        and f"{cid}:esc" not in reminded:
                    reminded.add(f"{cid}:esc")
                    await broadcast(await db.add_system_event(cid, "sla_escalated", {
                        "message": "Người phê duyệt không phản hồi — chuyển hàng đợi "
                                   "cấp dự phòng theo ma trận thẩm quyền"}))
        except Exception:  # noqa: BLE001
            pass


if __name__ == "__main__":
    uvicorn.run(app, host=config.HOST, port=config.GATEWAY_PORT, log_level="warning")
