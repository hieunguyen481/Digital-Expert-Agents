"""Bang chuyen trang thai (Task 9)."""

from __future__ import annotations

import pytest

from app.workflow.transitions import TRANSITIONS, possible_targets

# Tap trang thai cua ck_loan_application_status (V021).
V021_STATUSES = frozenset(
    {
        "DRAFT", "CHECKING", "RETURNED_TO_RM", "APPRAISAL", "APPRAISAL_PENDING_INFO",
        "RISK_REVIEW", "RISK_PENDING_INFO", "RISK_HOLD_FRAUD", "APPROVAL",
        "COUNCIL_SESSION", "APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED", "WITHDRAWN",
    }
)

EXPECTED = {
    "submit_to_checking": ({"DRAFT", "RETURNED_TO_RM"}, "CHECKING", {"credit_officer"}, False, "rm_submit"),
    "return_to_rm": (
        {"CHECKING", "APPRAISAL"}, "RETURNED_TO_RM", {"document_reviewer", "credit_appraiser"}, True, None,
    ),
    "pass_to_appraisal": ({"CHECKING"}, "APPRAISAL", {"document_reviewer"}, False, "checking_pass"),
    "request_info": ({"APPRAISAL"}, "APPRAISAL_PENDING_INFO", {"credit_appraiser"}, True, None),
    "accept_info": ({"APPRAISAL_PENDING_INFO"}, "APPRAISAL", {"document_reviewer"}, False, None),
    "submit_to_risk": ({"APPRAISAL"}, "RISK_REVIEW", {"credit_appraiser"}, False, "appraisal_submit"),
    "risk_return": ({"RISK_REVIEW"}, "APPRAISAL", {"risk_officer", "compliance_officer"}, True, None),
    "request_explanation": ({"RISK_REVIEW"}, "RISK_PENDING_INFO", {"compliance_officer"}, True, None),
    "accept_explanation": ({"RISK_PENDING_INFO"}, "RISK_REVIEW", {"document_reviewer"}, False, None),
    "fraud_hold": ({"RISK_REVIEW"}, "RISK_HOLD_FRAUD", {"compliance_officer"}, True, None),
    "fraud_release": ({"RISK_HOLD_FRAUD"}, "RISK_REVIEW", {"compliance_officer"}, True, None),
    "submit_to_approval": ({"RISK_REVIEW"}, None, {"risk_officer"}, False, "risk_submit"),
    "decide": ({"APPROVAL"}, None, {"loan_approver"}, True, None),
    "return_for_supplement": ({"APPROVAL"}, None, {"loan_approver"}, True, None),
    "withdraw": (
        {"RETURNED_TO_RM", "APPRAISAL_PENDING_INFO"}, "WITHDRAWN", {"credit_officer", "credit_manager"}, True, None,
    ),
}


def test_every_action_in_table() -> None:
    assert set(TRANSITIONS) == set(EXPECTED)


@pytest.mark.parametrize("action", sorted(EXPECTED))
def test_action_matches_table(action: str) -> None:
    froms, to, roles, reason, gate = EXPECTED[action]
    t = TRANSITIONS[action]
    assert t.action == action
    assert t.from_status == frozenset(froms)
    assert t.to_status == to
    assert t.roles == frozenset(roles)
    assert t.reason_required is reason
    assert t.gate == gate


def test_no_action_allows_admin() -> None:
    assert all("admin" not in t.roles for t in TRANSITIONS.values())


def test_every_status_belongs_to_v021() -> None:
    for t in TRANSITIONS.values():
        assert t.from_status <= V021_STATUSES
        assert possible_targets(t) <= V021_STATUSES
        if t.to_status is not None:
            assert t.to_status in V021_STATUSES


def test_withdraw_not_allowed_from_fraud_hold() -> None:
    assert "RISK_HOLD_FRAUD" not in TRANSITIONS["withdraw"].from_status
