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


async def _ask(responder, route=None, conv=None):
    return await responder.respond(
        principal=_principal(("loan_approver",)),
        conversation=conv if conv is not None else {"active_customer_id": str(CUSTOMER)},
        message="Phân tích khoản vay", route=route or {"route_type": "ORCHESTRATED"})


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
