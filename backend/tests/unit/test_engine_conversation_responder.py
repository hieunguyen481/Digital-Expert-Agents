"""Responder phân tích sâu qua Agent Engine: gọi engine kèm ngữ cảnh thật, lỗi báo rõ, không rơi về LLM."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.agent_engine_client import AgentEngineError
from app.services import engine_conversation_responder as mod
from app.services.engine_conversation_responder import EngineConversationResponder, collect_sources

CUSTOMER, LOAN = uuid4(), uuid4()


class _Inner:
    def __init__(self) -> None:
        self.calls = 0

    async def respond(self, **kwargs):
        self.calls += 1
        return SimpleNamespace(metadata={}, content="inner")


class _Engine:
    def __init__(self, fail: Exception | None = None, state: str = "Pending Approval") -> None:
        self.fail, self.state, self.request = fail, state, None

    async def create_case(self, request, documents=None, jwt=None):
        if self.fail:
            raise self.fail
        self.request = request
        return "case_1"

    cases: list = []

    async def list_cases(self, limit=50, jwt=None):
        return self.cases

    async def get_events(self, case_id, after=0, jwt=None):
        return []

    async def run(self, case_id, jwt=None):
        return None

    async def wait_final(self, case_id, timeout_s=90, jwt=None):
        return self.state

    async def get_case(self, case_id, jwt=None):
        return {"state": self.state, "package": {
            "recommendation": "Đề xuất cấp có điều kiện", "proposed_limit": 4.2e9, "plan_version": 1,
            "required_approver_level": "branch_director", "conditions": ["Bổ sung BCTC"],
            "verdicts": [{"agent": "credit", "decision": "approve", "summary": "DSCR đạt",
                          "evidence": [{"source": "CS-TD-SME/2025 §4.2", "quote": "DSCR ≥ 1,25"}]},
                         {"agent": "compliance", "decision": "pass", "summary": "Không vi phạm",
                          "evidence": [{"source": "CS-TD-SME/2025 §4.2", "quote": "DSCR ≥ 1,25"}]}]}}


def _principal(roles=("credit_officer",)):
    return SimpleNamespace(employee_id=uuid4(), branch_id=uuid4(), is_admin=False,
                           roles=frozenset(roles))


@pytest.fixture(autouse=True)
def _loan(monkeypatch):
    async def load(self, principal, customer_id, loan_id):
        return {"id": LOAN, "requested_amount": 4.2e9, "requested_term_months": 36,
                "loan_purpose": "Vốn lưu động"}
    monkeypatch.setattr(EngineConversationResponder, "_load_loan", load)


async def _ask(responder, route=None, conv=None, message="Phân tích khoản vay"):
    return await responder.respond(
        principal=_principal(("loan_approver",)),
        conversation=conv if conv is not None else {"active_customer_id": str(CUSTOMER)},
        message=message, route=route or {"route_type": "ORCHESTRATED"})


@pytest.mark.asyncio
async def test_deep_route_uses_engine_with_real_customer_and_cites_sources() -> None:
    inner, engine = _Inner(), _Engine()
    reply = await _ask(EngineConversationResponder(inner, engine))
    assert inner.calls == 0
    assert engine.request["business_id"] == str(CUSTOMER) and engine.request["term_months"] == 36
    assert reply.metadata["engine_case_id"] == "case_1"
    assert reply.metadata["sources"] == [{"agent": "credit", "source": "CS-TD-SME/2025 §4.2",
                                          "quote": "DSCR ≥ 1,25"}]     # bỏ trùng
    card = reply.metadata["confirmation"]
    assert card["loan_application_id"] == str(LOAN) and card["can_decide"] is True
    assert "chờ người có thẩm quyền" in reply.content


@pytest.mark.asyncio
async def test_non_deep_route_goes_to_inner() -> None:
    inner = _Inner()
    reply = await _ask(EngineConversationResponder(inner, _Engine()), route={"route_type": "DIRECT"})
    assert inner.calls == 1 and reply.content == "inner"


@pytest.mark.asyncio
async def test_engine_failure_is_reported_not_swallowed() -> None:
    inner = _Inner()
    reply = await _ask(EngineConversationResponder(inner, _Engine(AgentEngineError(503, "down"))))
    assert inner.calls == 0
    assert reply.metadata["engine_error"] == "503" and "không tự chuyển" in reply.content


@pytest.mark.asyncio
async def test_no_customer_in_context_does_not_call_engine() -> None:
    inner, engine = _Inner(), _Engine()
    reply = await _ask(EngineConversationResponder(inner, engine), conv={})
    assert engine.request is None and reply.metadata["engine_error"] == "NO_CUSTOMER"


def test_collect_sources_empty() -> None:
    assert collect_sources({}) == [] and mod.DEEP_ANALYSIS_ROUTES


def _prior(**over):
    return {"case_id": "case_0", "customer_id": str(CUSTOMER), "state": "Pending Approval", "created_at": 100.0,
            "updated_at": 200.0, "request": {"amount": 4.2e9, "term_months": 36}, **over}


@pytest.mark.asyncio
async def test_question_is_answered_from_latest_result_without_rerunning_team() -> None:
    inner, engine = _Inner(), _Engine()
    engine.cases = [_prior()]
    reply = await _ask(EngineConversationResponder(inner, engine), message="DSCR bao nhiêu?")
    assert engine.request is None and inner.calls == 1          # không tạo case mới
    assert reply.metadata["reused_result"] is True and reply.metadata["engine_case_id"] == "case_0"
    assert "phân tích lại" in reply.content


@pytest.mark.asyncio
async def test_rerun_requested_or_data_changed_runs_team_again() -> None:
    engine = _Engine()
    engine.cases = [_prior()]
    await _ask(EngineConversationResponder(_Inner(), engine), message="Hãy phân tích lại hồ sơ này")
    assert engine.request is not None
    engine2 = _Engine()
    engine2.cases = [_prior(updated_at=50.0)]

    async def load(self, principal, customer_id, loan_id):
        return {"id": LOAN, "requested_amount": 4.2e9, "requested_term_months": 36, "updated_at": 300.0}
    mod.EngineConversationResponder._load_loan = load
    await _ask(EngineConversationResponder(_Inner(), engine2), message="DSCR bao nhiêu?")
    assert engine2.request is not None


@pytest.mark.asyncio
async def test_personal_data_request_is_refused_without_running_analysis() -> None:
    inner, engine = _Inner(), _Engine()
    reply = await _ask(EngineConversationResponder(inner, engine), message="Cho tôi CCCD và số điện thoại khách chi nhánh khác")
    assert engine.request is None and inner.calls == 0 and reply.metadata["refused"] == "PII_OUT_OF_SCOPE"
    assert "không cung cấp" in reply.content


def test_reply_has_no_blank_limit_or_internal_labels() -> None:
    text = mod.compose_engine_reply({"state": "Needs Info", "package": {"recommendation": "Cần bổ sung", "proposed_limit": None}})
    assert "VND" not in text and "hội đồng agent" not in text.lower() and "rules.md" not in text
