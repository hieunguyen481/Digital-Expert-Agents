"""Bang chuyen trang thai ho so (user-flows.md muc 5, rules.md Q-N, Q-O).

Moi chuyen buoc di qua WorkflowService. ``to_status=None`` nghia la service tu
quyet trang thai dich (dinh tuyen phe duyet: APPROVAL hoac COUNCIL_SESSION).
Bang nay duoc lap lai trong ``credit.apply_transition`` (V025) de database tu
kiem tra lai; sua mot ben thi phai sua ca ben kia.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from types import MappingProxyType


@dataclass(frozen=True)
class Transition:
    action: str
    from_status: frozenset[str]
    to_status: str | None
    roles: frozenset[str]
    reason_required: bool
    gate: str | None


# Trang thai dich cu the cua cac action co nhieu dich (decide, return_for_supplement).
DECISION_STATUSES = frozenset({"APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED"})
SUPPLEMENT_TARGETS = frozenset({"APPRAISAL", "RETURNED_TO_RM"})
WITHDRAW_KINDS = frozenset({"CUSTOMER", "OVERDUE"})
APPROVAL_TARGETS = frozenset({"APPROVAL", "COUNCIL_SESSION"})


def _t(
    action: str,
    from_status: set[str],
    to_status: str | None,
    roles: set[str],
    *,
    reason: bool = False,
    gate: str | None = None,
) -> Transition:
    return Transition(action, frozenset(from_status), to_status, frozenset(roles), reason, gate)


_ALL = (
    _t("submit_to_checking", {"DRAFT", "RETURNED_TO_RM"}, "CHECKING", {"credit_officer"}, gate="rm_submit"),
    _t(
        "return_to_rm",
        {"CHECKING", "APPRAISAL"},
        "RETURNED_TO_RM",
        {"document_reviewer", "credit_appraiser"},
        reason=True,
    ),
    _t("pass_to_appraisal", {"CHECKING"}, "APPRAISAL", {"document_reviewer"}, gate="checking_pass"),
    _t("request_info", {"APPRAISAL"}, "APPRAISAL_PENDING_INFO", {"credit_appraiser"}, reason=True),
    _t("accept_info", {"APPRAISAL_PENDING_INFO"}, "APPRAISAL", {"document_reviewer"}),
    _t("submit_to_risk", {"APPRAISAL"}, "RISK_REVIEW", {"credit_appraiser"}, gate="appraisal_submit"),
    _t(
        "risk_return",
        {"RISK_REVIEW"},
        "APPRAISAL",
        {"risk_officer", "compliance_officer"},
        reason=True,
    ),
    _t(
        "request_explanation",
        {"RISK_REVIEW"},
        "RISK_PENDING_INFO",
        {"compliance_officer"},
        reason=True,
    ),
    _t("accept_explanation", {"RISK_PENDING_INFO"}, "RISK_REVIEW", {"document_reviewer"}),
    _t("fraud_hold", {"RISK_REVIEW"}, "RISK_HOLD_FRAUD", {"compliance_officer"}, reason=True),
    _t("fraud_release", {"RISK_HOLD_FRAUD"}, "RISK_REVIEW", {"compliance_officer"}, reason=True),
    _t("submit_to_approval", {"RISK_REVIEW"}, None, {"risk_officer"}, gate="risk_submit"),
    _t("decide", {"APPROVAL"}, None, {"loan_approver"}, reason=True),
    _t("return_for_supplement", {"APPROVAL"}, None, {"loan_approver"}, reason=True),
    _t(
        "withdraw",
        {"RETURNED_TO_RM", "APPRAISAL_PENDING_INFO"},
        "WITHDRAWN",
        {"credit_officer", "credit_manager"},
        reason=True,
    ),
)

TRANSITIONS: Mapping[str, Transition] = MappingProxyType({t.action: t for t in _ALL})


def possible_targets(transition: Transition) -> frozenset[str]:
    """Moi trang thai dich co the cua mot action (ke ca khi to_status=None)."""
    if transition.to_status is not None:
        return frozenset({transition.to_status})
    if transition.action == "decide":
        return DECISION_STATUSES
    if transition.action == "return_for_supplement":
        return SUPPLEMENT_TARGETS
    if transition.action == "submit_to_approval":
        return APPROVAL_TARGETS
    raise KeyError(transition.action)
