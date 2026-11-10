"""Orchestrator: Plan Executor (topo-sort DAG, chạy song song) + state machine case.

Luồng: In Analysis -> (DAG: doc -> credit ∥ compliance ∥ ops dry-run -> validation
với vòng challenge) -> Pending Approval -> [HITL] -> Executing (commit) -> Completed.
Re-plan có giới hạn; vượt giới hạn -> Escalated.
"""
from __future__ import annotations

import asyncio
import time
import traceback

import httpx

from common import agent_tools, config, identity, trace_ctx
from common import facts as facts_mod
from common.schemas import (
    ApprovalPackage, CaseState, Envelope, MessageType, Plan, Verdict, VerdictDecision,
)
from . import actions, approval, db, planner, proposals


async def _emit(case_id: str, agent: str, etype: str, payload: dict | None = None):
    from .main import broadcast  # import trễ để tránh vòng

    await broadcast(await db.add_event(case_id, agent, etype, payload or {}))


_RUN_ENDED = {CaseState.NEEDS_INFO, CaseState.PENDING_APPROVAL, CaseState.ESCALATED,
              CaseState.COMPLETED, CaseState.REJECTED}


async def _set_state(case_id: str, state: CaseState) -> None:
    await db.update_case(case_id, state=state.value)
    if state in _RUN_ENDED:
        agent_tools.clear_case(case_id)


def _bind_identity(payload: dict) -> None:
    """Đặt danh tính người tạo case (đã xác thực ở gateway) cho mọi lời gọi xuống agent/MCP."""
    i = (payload or {}).get("_identity")
    identity.set_current(identity.Identity(i["employee_id"], i["branch_id"], bool(i.get("is_admin")))
                         if i else None)


async def _dispatch(case_id: str, task_id: str, agent: str, payload: dict) -> Verdict:
    """Gửi task_request A2A tới agent, nhận task_result."""
    env = Envelope(case_id=case_id, task_id=task_id, from_agent="orchestrator",
                   to_agent=agent, type=MessageType.TASK_REQUEST, payload=payload)
    async with httpx.AsyncClient(timeout=600) as client:
        resp = await client.post(f"{config.agent_url(agent)}/a2a",
                                 json=env.model_dump(mode="json"),
                                 headers=identity.headers_for())
        resp.raise_for_status()
    reply = Envelope(**resp.json())
    if reply.type == MessageType.ERROR:
        raise RuntimeError(f"{agent} lỗi: {reply.payload.get('error')}")
    return Verdict(**reply.payload["verdict"])


async def run_analysis(case_id: str, ident: identity.Identity | None = None) -> None:
    """Chạy một vòng phân tích đầy đủ (plan -> DAG -> validation -> package)."""
    if ident is not None:
        identity.set_current(ident)
    case = await db.get_case(case_id)
    if case is None:
        return
    payload = case["payload"]
    _bind_identity(payload)
    trace_ctx.bind(case_id, "planner")
    version = case["replan_count"] + 1

    try:
        await _set_state(case_id, CaseState.IN_ANALYSIS)
        await _emit(case_id, "orchestrator", "state_changed",
                    {"state": CaseState.IN_ANALYSIS.value})

        plan, source = await planner.make_plan(case_id, payload, version)
        await db.save_plan(case_id, version, plan.model_dump(mode="json"))
        await _emit(case_id, "planner", "plan_created",
                    {"version": version, "source": source,
                     "rationale": plan.rationale,
                     "tasks": [t.model_dump(mode="json") for t in plan.tasks]})

        verdicts, verdict_by_agent = await _execute_dag(case_id, plan)

        # Tìm theo AGENT, không theo task_id (Planner LLM có thể đặt task_id tuỳ ý)
        validation = verdict_by_agent.get("validation")
        if validation is None:
            raise RuntimeError("thiếu verdict validation")

        await _propose_actions(case_id, validation)
        if validation.decision == VerdictDecision.APPROVE:
            await _build_package(case_id, plan, validation)
        elif validation.decision == VerdictDecision.REJECT:
            await _set_state(case_id, CaseState.REJECTED)
            await _emit(case_id, "orchestrator", "state_changed",
                        {"state": CaseState.REJECTED.value,
                         "reason": validation.summary, **_final_report(validation)})
        else:  # need_more_info / không hội tụ
            await _set_state(case_id, CaseState.NEEDS_INFO)
            await _emit(case_id, "orchestrator", "state_changed",
                        {"state": CaseState.NEEDS_INFO.value,
                         "reason": validation.summary, **_final_report(validation)})
    except Exception as e:  # noqa: BLE001
        traceback.print_exc()
        await _set_state(case_id, CaseState.ESCALATED)
        await _emit(case_id, "orchestrator", "state_changed",
                    {"state": CaseState.ESCALATED.value, "reason": str(e)})


async def _execute_dag(case_id: str, plan: Plan
                       ) -> tuple[dict[str, Verdict], dict[str, Verdict]]:
    """Topo-sort + chạy song song các task không phụ thuộc nhau.
    Trả về (verdicts theo task_id, verdicts theo agent)."""
    verdicts: dict[str, Verdict] = {}          # theo task_id
    verdict_by_agent: dict[str, Verdict] = {}  # theo agent (cho validation)
    remaining = {t.task_id: t for t in plan.tasks}
    shared_facts = None
    boards: list[dict] = []  # cờ agent_tools: bảng chung do chuyên gia gom, hợp lại cho Validation
    use_tools = agent_tools.enabled()
    if use_tools:
        pass
    elif config.opt("facts") or config.opt("gate"):  # công cụ gọi một lần, mọi chuyên gia đọc chung
        req = next((t.params.get("request") for t in plan.tasks if t.params.get("request")), None)
        if req and req.get("business_id"):
            shared_facts = await facts_mod.gather(req)

    while remaining:
        ready = [t for t in remaining.values()
                 if all(d in verdicts for d in t.depends_on)]
        if not ready:
            raise RuntimeError("DAG bế tắc — dependency không thỏa")
        await _emit(case_id, "orchestrator", "tasks_dispatched",
                    {"parallel": [t.task_id for t in ready]})

        async def _run(t):
            params = dict(t.params)
            if shared_facts and t.agent in ("credit", "compliance", "validation"):
                params["facts"] = shared_facts
            if t.agent == "validation":
                req = params.get("request") or {}
                if use_tools and boards and req.get("business_id"):
                    params["facts"] = await agent_tools.merge_for_validation(case_id, req, boards)
                params["verdicts"] = {
                    a: v.model_dump(mode="json") for a, v in verdict_by_agent.items()
                }
            return t, await _dispatch(case_id, t.task_id, t.agent,
                                      {"objective": t.objective, "params": params})

        results = await asyncio.gather(*[_run(t) for t in ready])
        for t, v in results:
            board = v.data.pop("_board", None)
            if board is not None:
                boards.append(board)
            verdicts[t.task_id] = v
            verdict_by_agent[t.agent] = v
            remaining.pop(t.task_id)
    return verdicts, verdict_by_agent


async def _propose_actions(case_id: str, validation: Verdict) -> None:
    """Agent chỉ ĐỀ XUẤT: lưu đề xuất + ghi trace; không có lời gọi nào ghi vào hồ sơ ở đây."""
    try:
        final = [Verdict(**v) for v in validation.data.get("final_verdicts", {}).values()]
        items = proposals.derive(validation, final, _final_report(validation))
        for p in await db.add_proposals(case_id, items):
            await _emit(case_id, p["source_agent"], "action_proposed",
                        {"proposal_id": p["id"], "kind": p["kind"], "title": p["title"],
                         "rationale": p["rationale"], "evidence": p["evidence"]})
    except Exception:  # noqa: BLE001 - lỗi dựng đề xuất không được làm hỏng kết luận phân tích
        traceback.print_exc()


def _final_report(validation: Verdict) -> dict:
    """Báo cáo cuối hợp nhất của Validation — dùng chung cho gói phê duyệt, Cần bổ sung, Từ chối."""
    rep = validation.data.get("report") or {}
    return {"findings": rep.get("findings", validation.findings),
            "conditions": rep.get("conditions", validation.conditions),
            "citations": rep.get("citations", []),
            "report_text": rep.get("text", "")}


async def _build_package(case_id: str, plan: Plan, validation: Verdict) -> None:
    final_verdicts = [
        Verdict(**v) for v in validation.data.get("final_verdicts", {}).values()
    ]
    for v in final_verdicts:  # bảng công cụ thô không đưa vào gói phê duyệt
        v.data.pop("_board", None)
    report = _final_report(validation)
    limit = validation.proposed_limit
    level = ("branch_director"
             if (limit or 0) <= config.BRANCH_APPROVAL_LIMIT else "head_office")
    package = ApprovalPackage(
        case_id=case_id, plan_version=plan.version,
        policy_version=config.POLICY_VERSION,
        recommendation=validation.data.get("narrative") or validation.summary,
        proposed_limit=limit,
        conditions=validation.conditions,
        verdicts=final_verdicts,
        trace_summary=[e.quote for e in validation.evidence],
        required_approver_level=level,
        findings=report["findings"], citations=report["citations"], report_text=report["report_text"],
    ).model_dump(mode="json")

    import time as _t
    await db.update_case(case_id, package=package,
                   sla_deadline=_t.time() + config.APPROVAL_SLA_SECONDS)
    await _set_state(case_id, CaseState.PENDING_APPROVAL)
    await _emit(case_id, "orchestrator", "approval_package_ready",
                {"package": package,
                 "package_hash": approval.package_hash(package)})
    await _emit(case_id, "orchestrator", "state_changed",
                {"state": CaseState.PENDING_APPROVAL.value,
                 "required_approver_level": level})


async def approve_and_commit(case_id: str, approver: str, jwt: str, confirm: dict) -> dict:
    """Người có thẩm quyền xác nhận -> token -> Operations kiểm -> backend thực thi `decide`.

    Agent không tự chạy bước này: chỉ gateway, sau request /approve của người duyệt. Backend kiểm
    vai trò, trạng thái, phiên bản và tách bạch E8 bằng JWT của người duyệt. Bị từ chối thì giữ
    nguyên Pending Approval (không escalate), ghi sự kiện `commit_refused`.
    """
    case = await db.get_case(case_id)
    if not case or case["state"] != CaseState.PENDING_APPROVAL.value:
        return {"error": "case không ở trạng thái Pending Approval"}
    package = case["package"]
    request = case["payload"]["request"]
    loan_id = confirm["loan_application_id"]
    key = f"{case_id}:v{package.get('plan_version', 1)}:{loan_id}"

    async def refuse(status: int, code: str, message: str) -> dict:
        await db.record_action(case_id, "decide", loan_id, f"{key}:refused:{time.time_ns()}",
                               approver, "REFUSED", {"status": status, "code": code})
        await _emit(case_id, "hitl", "commit_refused",
                    {"approver": approver, "status": status, "code": code, "message": message})
        return {"status": "refused", "http_status": status, "code": code, "message": message}

    try:
        loan = await actions.fetch_loan(jwt, loan_id, case["customer_id"])
    except actions.ActionRefused as e:
        return await refuse(e.status, e.code, e.message)

    tok = await approval.issue(case_id, package, approver)
    await db.update_case(case_id, approver=approver)
    await _emit(case_id, "hitl", "approved",
                {"approver": approver, "token_expires_at": tok["expires_at"],
                 "loan_application_id": loan_id})
    await _set_state(case_id, CaseState.EXECUTING)
    await _emit(case_id, "orchestrator", "state_changed", {"state": CaseState.EXECUTING.value})

    verdict = await _dispatch(case_id, "t_commit", "operations", {
        "objective": "Kiểm token và điều kiện trước khi thực thi",
        "params": {"phase": "commit", "approval_token": tok["token"], "idempotency_key": key,
                   "approved_limit": package.get("proposed_limit"),
                   "plan_version": package.get("plan_version", 1), "request": request},
    })

    if verdict.decision == VerdictDecision.PASS_:
        try:
            result = await actions.execute_decision(
                jwt, loan, decision_type=confirm["decision_type"],
                amount=float(confirm["approved_amount"]), term_months=int(confirm["term_months"]),
                conditions=confirm.get("conditions") or [], reason=confirm["reason"])
        except actions.ActionRefused as e:
            await _set_state(case_id, CaseState.PENDING_APPROVAL)
            return await refuse(e.status, e.code, e.message)
        await db.record_action(case_id, "decide", loan_id, key, approver, "EXECUTED", result)
        await _set_state(case_id, CaseState.COMPLETED)
        await _emit(case_id, "orchestrator", "state_changed",
                    {"state": CaseState.COMPLETED.value, "loan_application_id": loan_id,
                     "workflow_status": result.get("status")})
        return {"status": "completed", "workflow_status": result.get("status")}

    # Token vô hiệu / precondition fail -> re-plan có giới hạn; quá giới hạn -> Escalated
    stage = verdict.data.get("stage", "")
    await _emit(case_id, "operations", "commit_blocked", {"stage": stage, "summary": verdict.summary})
    if stage in ("token_verify", "precondition") and case["replan_count"] < config.MAX_REPLAN_ROUNDS:
        await db.update_case(case_id, replan_count=case["replan_count"] + 1)
        await _emit(case_id, "planner", "replan_triggered",
                    {"reason": verdict.summary, "round": case["replan_count"] + 1})
        asyncio.create_task(run_analysis(case_id))
        return {"status": "replanning", "reason": verdict.summary}

    await _set_state(case_id, CaseState.ESCALATED)
    await _emit(case_id, "orchestrator", "state_changed",
                {"state": CaseState.ESCALATED.value, "reason": verdict.summary})
    return {"status": "escalated", "reason": verdict.summary}


_DECIDED = {"APPROVED": CaseState.COMPLETED, "APPROVED_WITH_CONDITIONS": CaseState.COMPLETED,
            "REJECTED": CaseState.REJECTED}
_CLOSABLE = (CaseState.PENDING_APPROVAL.value, CaseState.ESCALATED.value, CaseState.NEEDS_INFO.value)


async def close_on_loan_decision(case_id: str, user_id: str, jwt: str, loan_id: str) -> dict:
    """Quyết định trên hồ sơ (workflow `decide`) là nguồn duy nhất; đóng ca còn mở theo đó.

    Engine không tự quyết: đọc lại hồ sơ bằng JWT của người gọi, chỉ đóng khi hồ sơ đã ở trạng
    thái quyết định. Ghi `agent.action_log` với khóa cố định theo (ca, hồ sơ) nên chạy lại không
    ghi hai lần. Ca đang Executing/đã đóng (đường /approve) thì bỏ qua.
    """
    case = await db.get_case(case_id)
    if not case:
        return {"status": "not_found"}
    if case["state"] not in _CLOSABLE:
        return {"status": "ignored", "state": case["state"]}
    loan = await actions.fetch_loan(jwt, loan_id, case["customer_id"])
    target = _DECIDED.get(str(loan.get("status")))
    if target is None:
        return {"status": "ignored", "loan_status": loan.get("status")}
    key = f"{case_id}:loan-decided:{loan_id}"
    first = await db.record_action(case_id, "decide", loan_id, key, user_id, "EXECUTED",
                                   {"status": loan.get("status"), "source": "loan_workflow"})
    if not first:
        return {"status": "already_recorded"}
    await db.update_case(case_id, approver=user_id)
    await _emit(case_id, "hitl", "decided_on_loan",
                {"approver": user_id, "loan_application_id": loan_id,
                 "workflow_status": loan.get("status")})
    await _set_state(case_id, target)
    await _emit(case_id, "orchestrator", "state_changed",
                {"state": target.value, "loan_application_id": loan_id,
                 "workflow_status": loan.get("status")})
    return {"status": "closed", "state": target.value}


async def supplement_and_replan(case_id: str, documents: list[dict]) -> dict:
    """Chuyên viên bổ sung hồ sơ -> Document Agent -> re-plan (giới hạn số vòng)."""
    case = await db.get_case(case_id)
    if not case:
        return {"error": "case không tồn tại"}
    if case["replan_count"] >= config.MAX_REPLAN_ROUNDS:
        await _set_state(case_id, CaseState.ESCALATED)
        await _emit(case_id, "orchestrator", "state_changed",
                    {"state": CaseState.ESCALATED.value,
                     "reason": f"vượt giới hạn {config.MAX_REPLAN_ROUNDS} vòng re-plan"})
        return {"status": "escalated"}
    payload = case["payload"]
    payload["documents"] = payload.get("documents", []) + documents
    await db.update_case(case_id, payload=payload, replan_count=case["replan_count"] + 1)
    await _emit(case_id, "hitl", "documents_supplemented",
                {"count": len(documents)})
    await _emit(case_id, "planner", "replan_triggered",
                {"reason": "bổ sung hồ sơ", "round": case["replan_count"] + 1})
    asyncio.create_task(run_analysis(case_id))
    return {"status": "replanning"}
