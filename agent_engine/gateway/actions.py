"""Thực thi hành động nghiệp vụ THẬT sau khi người có thẩm quyền xác nhận.

Bảng ánh xạ tool ghi của agent -> hành động workflow thật:
  create_loan_draft          -> bản nháp đề xuất trong trace (agent.case_event); KHÔNG đổi hồ sơ.
  commit_loan                -> chuyển bước `decide` (WorkflowService, backend) với JWT của NGƯỜI duyệt,
                                chỉ sau khi approval token hợp lệ; backend kiểm vai trò, trạng thái
                                APPROVAL, phiên bản và tách bạch E8.
  create_disbursement_schedule -> không có hành động workflow: agent không giải ngân, luôn từ chối.
Agent không giữ JWT: token của người duyệt chỉ nằm trong request /approve, đi thẳng tới backend.
"""
from __future__ import annotations

import httpx

from common import config

# Allowlist: agent/gateway chỉ được yêu cầu đúng chuyển bước này. Không có approve/giải ngân tự động.
ALLOWED_ACTIONS = frozenset({"decide", "request_info"})

# Đề xuất hành động (V049): vai trò được xác nhận/bỏ từng loại. Backend vẫn kiểm lại bằng JWT người bấm.
PROPOSAL_ROLES = {
    "add_risk_flag": frozenset({"credit_appraiser", "risk_officer", "document_reviewer"}),
    "request_documents": frozenset({"credit_appraiser"}),
    "add_disbursement_condition": frozenset({"credit_appraiser", "loan_approver"}),
}


class ActionRefused(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def _headers(jwt: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {jwt}"}


async def fetch_loan(jwt: str, loan_id: str, customer_id: str) -> dict:
    """Đọc hồ sơ vay bằng quyền của người duyệt; phải thuộc đúng khách hàng của case."""
    async with httpx.AsyncClient(base_url=config.BACKEND_URL, timeout=20) as c:
        r = await c.get(f"/api/v1/loan-applications/{loan_id}", headers=_headers(jwt))
    if r.status_code != 200:
        raise ActionRefused(r.status_code, "LOAN_NOT_READABLE", "không đọc được hồ sơ vay với quyền hiện tại")
    loan = r.json()
    if str(loan.get("primary_customer_id") or loan.get("primaryCustomerId")) != customer_id:
        raise ActionRefused(409, "LOAN_CUSTOMER_MISMATCH", "hồ sơ vay không thuộc khách hàng của case")
    return loan


async def execute_decision(jwt: str, loan: dict, *, decision_type: str, amount: float,
                           term_months: int, conditions: list[str], reason: str) -> dict:
    """Gọi backend chuyển bước `decide` dưới danh tính người duyệt."""
    action = "decide"
    if action not in ALLOWED_ACTIONS:  # phòng thủ: allowlist cứng
        raise ActionRefused(403, "ACTION_NOT_ALLOWED", action)
    body = {"action": action, "expected_version": int(loan["version"]), "reason": reason,
            "params": {"decision_type": decision_type, "approved_amount": amount,
                       "approved_term_months": term_months,
                       "conditions": [{"text": c} for c in conditions]}}
    async with httpx.AsyncClient(base_url=config.BACKEND_URL, timeout=30) as c:
        r = await c.post(f"/api/v1/loan-applications/{loan['id']}/transitions", json=body,
                         headers=_headers(jwt))
    if r.status_code != 200:
        try:
            err = r.json().get("error") or r.json()
        except Exception:  # noqa: BLE001
            err = {}
        raise ActionRefused(r.status_code, str((err or {}).get("code") or "REJECTED"),
                            str((err or {}).get("message") or "backend từ chối chuyển bước"))
    return r.json()


async def _post(jwt: str, path: str, body: dict) -> dict:
    async with httpx.AsyncClient(base_url=config.BACKEND_URL, timeout=30) as c:
        r = await c.post(path, json=body, headers=_headers(jwt))
    if r.status_code >= 300:
        try:
            err = r.json().get("error") or r.json()
        except Exception:  # noqa: BLE001
            err = {}
        raise ActionRefused(r.status_code, str((err or {}).get("code") or "REJECTED"),
                            str((err or {}).get("message") or "backend từ chối hành động"))
    return r.json() if r.content else {}


async def execute_proposal(jwt: str, loan: dict, proposal: dict, reason: str) -> dict:
    """Thực hiện đề xuất đã được người xác nhận, qua API nghiệp vụ hiện có, bằng JWT của chính người bấm."""
    kind, params, loan_id = proposal["kind"], proposal["params"], loan["id"]
    if kind == "add_risk_flag":
        out = await _post(jwt, f"/api/v1/loan-applications/{loan_id}/agent-flags", {
            "proposal_id": proposal["id"], "severity": params.get("severity", "MEDIUM"),
            "title": proposal["title"][:300], "reason": reason})
        return {"api": "agent-flags", "flag_id": out.get("id"), "created": out.get("created")}
    if kind == "add_disbursement_condition":
        if not str(params.get("text") or "").strip():
            raise ActionRefused(422, "BAD_PROPOSAL", "Đề xuất thiếu nội dung điều kiện.")
        out = await _post(jwt, f"/api/v1/loan-applications/{loan_id}/disbursement-conditions", {
            "proposal_id": proposal["id"], "text": str(params["text"])[:2000], "reason": reason})
        return {"api": "disbursement-conditions", "condition_id": out.get("id"), "created": out.get("created")}
    if kind == "request_documents":
        if "request_info" not in ALLOWED_ACTIONS:
            raise ActionRefused(403, "ACTION_NOT_ALLOWED", "request_info")
        listing = "; ".join(params.get("documents") or [])
        out = await _post(jwt, f"/api/v1/loan-applications/{loan_id}/transitions", {
            "action": "request_info", "expected_version": int(loan["version"]),
            "reason": f"{reason} — Cần bổ sung: {listing}"[:1900]})
        return {"api": "transitions/request_info", "workflow_status": out.get("status"),
                "documents": params.get("documents") or []}
    raise ActionRefused(422, "UNKNOWN_KIND", kind)
