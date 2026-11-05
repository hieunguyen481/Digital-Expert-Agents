"""Explicit state transitions for human-controlled business workflows."""

from __future__ import annotations

from collections.abc import Mapping

LOAN_TRANSITIONS: Mapping[str, frozenset[str]] = {
    # Tạm thời: ánh xạ máy trạng thái cũ sang tên trạng thái V021. Task 9 thay
    # toàn bộ bằng app.workflow.transitions; các trạng thái mới chưa có chuyển.
    "DRAFT": frozenset({"CHECKING", "WITHDRAWN"}),
    "CHECKING": frozenset({"APPRAISAL", "APPRAISAL_PENDING_INFO", "WITHDRAWN"}),
    "APPRAISAL": frozenset({"APPRAISAL_PENDING_INFO", "APPROVAL", "WITHDRAWN"}),
    "APPRAISAL_PENDING_INFO": frozenset({"CHECKING", "APPRAISAL", "WITHDRAWN"}),
    "APPROVAL": frozenset(
        {"APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED", "APPRAISAL_PENDING_INFO"}
    ),
    "RETURNED_TO_RM": frozenset(),
    "RISK_REVIEW": frozenset(),
    "RISK_PENDING_INFO": frozenset(),
    "RISK_HOLD_FRAUD": frozenset(),
    "COUNCIL_SESSION": frozenset(),
    "APPROVED": frozenset(),
    "APPROVED_WITH_CONDITIONS": frozenset(),
    "REJECTED": frozenset(),
    "WITHDRAWN": frozenset(),
}

UPLOAD_TRANSITIONS: Mapping[str, frozenset[str]] = {
    "CREATED": frozenset({"UPLOADING", "UPLOADED", "EXPIRED", "FAILED"}),
    "UPLOADING": frozenset({"UPLOADED", "EXPIRED", "FAILED"}),
    "UPLOADED": frozenset({"VERIFYING", "FAILED"}),
    "VERIFYING": frozenset({"COMPLETED", "FAILED"}),
    "COMPLETED": frozenset(),
    "EXPIRED": frozenset(),
    "FAILED": frozenset(),
}


def can_transition(current: str, target: str, transitions: Mapping[str, frozenset[str]]) -> bool:
    """Return whether a transition is explicitly allowed.

    Treating a same-state request as idempotent is useful for retry-safe APIs.
    Unknown states are denied rather than silently accepted.
    """

    if current == target:
        return current in transitions
    return target in transitions.get(current, frozenset())


def require_transition(current: str, target: str, transitions: Mapping[str, frozenset[str]]) -> None:
    if not can_transition(current, target, transitions):
        msg = f"Transition {current} -> {target} is not allowed"
        raise ValueError(msg)

