"""Xác nhận / bỏ đề xuất hành động của agent. Chỉ người bấm (JWT của họ) mới khiến hệ thống thực hiện.

Chuỗi trace: action_proposed (agent) -> action_confirmed (người) -> action_executed | action_refused (hệ thống).
Bấm hai lần: lần sau nhận kết quả đã lưu (idempotent). Backend từ chối (thiếu quyền...) thì đề xuất trở lại
PROPOSED, không có thay đổi nào trên hồ sơ; sự cố được ghi vào `agent.action_log` (REFUSED) và trace.
"""
from __future__ import annotations

import time

from . import actions, db


class ProposalError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


async def _emit(case_id: str, agent: str, etype: str, payload: dict) -> None:
    from .main import broadcast  # import trễ để tránh vòng

    await broadcast(await db.add_event(case_id, agent, etype, payload))


def _check_roles(proposal: dict, roles: frozenset[str]) -> None:
    allowed = actions.PROPOSAL_ROLES[proposal["kind"]]
    if "admin" in roles or not (roles & allowed):
        raise ProposalError(403, "ROLE_NOT_ALLOWED",
                            "Vai trò của bạn không được xác nhận hoặc bỏ loại đề xuất này.")


def _need_reason(reason: str) -> str:
    clean = (reason or "").strip()
    if len(clean) < 5:
        raise ProposalError(422, "REASON_REQUIRED", "Cần ghi lý do (tối thiểu 5 ký tự).")
    return clean


async def _load(pid: str) -> tuple[dict, dict]:
    proposal = await db.get_proposal(pid)  # RLS: không thấy -> như không tồn tại
    if proposal is None:
        raise ProposalError(404, "PROPOSAL_NOT_FOUND", "Không tìm thấy đề xuất hoặc không có quyền xem.")
    case = await db.get_case(proposal["case_id"])
    if case is None:
        raise ProposalError(404, "PROPOSAL_NOT_FOUND", "Không tìm thấy ca của đề xuất.")
    return proposal, case


async def confirm(pid: str, *, employee_id: str, roles: frozenset[str], jwt: str, reason: str,
                  loan_application_id: str | None) -> dict:
    proposal, case = await _load(pid)
    _check_roles(proposal, roles)
    reason = _need_reason(reason)
    key = f"proposal:{pid}"
    if proposal["status"] == "CONFIRMED":  # bấm lần hai: trả lại kết quả đã lưu
        return {"status": "confirmed", "replay": True, "result": proposal["result"]}
    if proposal["status"] == "DISMISSED":
        raise ProposalError(409, "PROPOSAL_DISMISSED", "Đề xuất đã bị bỏ.")
    request = case["payload"]["request"]
    loan_id = request.get("loan_application_id") or loan_application_id
    if not loan_id:
        raise ProposalError(422, "LOAN_REQUIRED", "Thiếu hồ sơ vay để áp dụng đề xuất.")
    if request.get("loan_application_id") and loan_application_id and loan_application_id != loan_id:
        raise ProposalError(409, "LOAN_MISMATCH", "Đề xuất thuộc hồ sơ vay khác.")
    try:
        loan = await actions.fetch_loan(jwt, loan_id, case["customer_id"])
    except actions.ActionRefused as e:
        raise ProposalError(e.status if e.status in (403, 404, 409) else 409, e.code, e.message) from e

    if not await db.claim_proposal(pid, "CONFIRMED", employee_id, reason):  # người khác/lần bấm khác đã nhận
        fresh = await db.get_proposal(pid)
        return {"status": (fresh or proposal)["status"].lower(), "replay": True,
                "result": (fresh or {}).get("result")}
    await _emit(case["case_id"], "hitl", "action_confirmed",
                {"proposal_id": pid, "kind": proposal["kind"], "by": employee_id, "reason": reason})
    try:
        result = await actions.execute_proposal(jwt, loan, proposal, reason)
    except actions.ActionRefused as e:
        info = {"status": e.status, "code": e.code, "message": e.message}
        await db.release_proposal(pid, employee_id, info)
        await db.record_action(case["case_id"], proposal["kind"], loan_id,
                               f"{key}:refused:{time.time_ns()}", employee_id, "REFUSED", info)
        await _emit(case["case_id"], "system", "action_refused", {"proposal_id": pid, "kind": proposal["kind"], **info})
        raise ProposalError(e.status if e.status in (403, 404, 409, 422) else 409, e.code, e.message) from e
    await db.set_proposal_result(pid, result)
    await db.record_action(case["case_id"], proposal["kind"], loan_id, key, employee_id, "EXECUTED", result)
    await _emit(case["case_id"], "system", "action_executed",
                {"proposal_id": pid, "kind": proposal["kind"], "by": employee_id, "result": result})
    return {"status": "confirmed", "replay": False, "result": result}


async def dismiss(pid: str, *, employee_id: str, roles: frozenset[str], reason: str) -> dict:
    proposal, case = await _load(pid)
    _check_roles(proposal, roles)
    reason = _need_reason(reason)
    if proposal["status"] == "DISMISSED":
        return {"status": "dismissed", "replay": True}
    if proposal["status"] == "CONFIRMED":
        raise ProposalError(409, "PROPOSAL_CONFIRMED", "Đề xuất đã được xác nhận và thực hiện.")
    if not await db.claim_proposal(pid, "DISMISSED", employee_id, reason):
        fresh = await db.get_proposal(pid)
        return {"status": (fresh or proposal)["status"].lower(), "replay": True}
    await _emit(case["case_id"], "hitl", "action_dismissed",
                {"proposal_id": pid, "kind": proposal["kind"], "by": employee_id, "reason": reason})
    return {"status": "dismissed", "replay": False}
