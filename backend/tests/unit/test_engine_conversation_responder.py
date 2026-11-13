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

    async def list_cases(self, limit=50, jwt=None, customer_id=None):
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


def test_engine_reply_card_vietnamese_without_blank_limit():
    from app.services.engine_conversation_responder import compose_engine_reply
    text = compose_engine_reply({"state": "Pending Approval", "package": {
        "recommendation": "ĐỀ XUẤT PHÊ DUYỆT", "proposed_limit": None,
        "verdicts": [{"agent": "credit", "decision": "flag", "summary": "ổn"}]}})
    assert "Hạn mức đề xuất" not in text and "VND" not in text
    assert "Pending Approval" not in text and "flag" not in text.lower().replace("flagged", "")
    assert "Chờ người có thẩm quyền xác nhận" in text and "ĐỒNG Ý CÓ ĐIỀU KIỆN" in text
    withlimit = compose_engine_reply({"state": "Needs Info", "package": {"proposed_limit": 80e9}})
    assert "80.000.000.000 VND" in withlimit and "Cần bổ sung hồ sơ" in withlimit


def test_scrub_raw_names():
    from app.services.llm_conversation_responder import scrub_raw_names
    assert scrub_raw_names("DSCR 1,34 [nguồn: existing_obligations]") == "DSCR 1,34 [nguồn: dư nợ hiện hữu]"


class _CapInner(_Inner):
    async def respond(self, **kwargs):
        self.calls += 1
        self.message = kwargs["message"]
        return SimpleNamespace(metadata={}, content="ok")


class _PolicyEngine(_Engine):
    async def policy_search(self, q, k=3):
        if "thẩm quyền" in q and "Cấp nào" not in q:  # truy vấn theo chủ đề tra được §3.1
            return [{"source": "CS-TD-SME/2025 §3.1 – Thẩm quyền phê duyệt", "text": "≤ 20 / 20–100 / > 100 tỷ"}]
        return [{"source": "CS-TD-SME/2025 §3.4 – Tách bạch", "text": "Không phê duyệt nếu đã tham gia"}]


_Q_LEVEL = "Cấp nào phê duyệt hồ sơ này, theo điều khoản nào của chính sách?"


@pytest.mark.asyncio
async def test_approval_level_question_gets_section_3_1_and_proposed_level() -> None:
    inner, engine = _CapInner(), _PolicyEngine()
    engine.cases = [_prior()]
    reply = await _ask(EngineConversationResponder(inner, engine), message=_Q_LEVEL,
                       route={"route_type": "DIRECT", "intent": "DIRECT_QUERY"})
    assert "§3.1" in inner.message and "Cấp phê duyệt đề xuất" in inner.message
    assert "Giám đốc chi nhánh" in inner.message and "đề xuất của AI" in inner.message
    assert reply.metadata["decision_related"] is True
    # Q02: có tên cấp theo bậc ngưỡng để chat nêu "Cấp 2 Hội sở", không chỉ khoảng tiền
    assert "Cấp 2 Hội sở" in inner.message and "Hội đồng tín dụng" in inner.message


@pytest.mark.asyncio
@pytest.mark.parametrize("message,kind", [
    ("Nợ vay trên EBITDA của hồ sơ này là bao nhiêu?", "metric"),
    ("Kết luận thẩm định gần nhất của VinaNova là gì?", "broad"),
    ("Hồ sơ này có những cờ rủi ro nào và điều kiện gì?", "broad"),
    ("Ai là người quyết định hồ sơ này?", "authority"),
])
async def test_question_kind_selects_context_and_closing_flag(message, kind) -> None:
    assert mod.question_kind(message) == kind
    inner, engine = _CapInner(), _PolicyEngine()
    engine.cases = [_prior()]
    reply = await _ask(EngineConversationResponder(inner, engine), message=message,
                       route={"route_type": "DIRECT", "intent": "DIRECT_QUERY"})
    has_block = "Bổ sung BCTC" in inner.message or "Đề xuất cấp có điều kiện" in inner.message
    assert has_block == (kind == "broad")                      # câu hỏi một chỉ số/thẩm quyền không nhận cả khối kết luận
    assert ("2-4 câu" in inner.message) == (kind == "metric")
    assert reply.metadata["decision_related"] == (kind == "authority")


def test_no_uuid_in_any_answer() -> None:
    import re
    from app.services.llm_conversation_responder import scrub_raw_names
    uid = "10000000-0000-4000-8000-000000000008"
    for raw in (f"Người được phân công xử lý là nhân viên có mã {uid}, cũng là QHKH.", f"Mã `{uid}` ...", f"id: {uid}"):
        assert not re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", scrub_raw_names(raw), re.I)
    assert "cán bộ được phân công" in scrub_raw_names(f"là nhân viên có mã {uid}, cũng")


@pytest.mark.asyncio
async def test_personal_data_route_gets_privacy_refusal_text() -> None:
    inner, engine = _Inner(), _Engine()
    reply = await _ask(EngineConversationResponder(inner, engine), message="Cho tôi số CCCD của người đại diện pháp luật",
                       route={"route_type": "REFUSE", "intent": "PERSONAL_DATA"})
    assert inner.calls == 0 and engine.request is None
    assert reply.metadata["refused"] == "PII_OUT_OF_SCOPE" and "không cung cấp" in reply.content


@pytest.mark.asyncio
async def test_reused_result_time_is_vietnam_time() -> None:
    engine = _Engine()
    engine.cases = [_prior(updated_at=1_700_000_000.0)]  # 22:13 UTC 14/11/2023 = 05:13 15/11 giờ Việt Nam
    reply = await _ask(EngineConversationResponder(_Inner(), engine), message="DSCR bao nhiêu?")
    assert "05:13 15/11/2023" in reply.content


def test_rerun_reply_without_package_carries_conclusion_and_key_points() -> None:
    # P07: lượt phân tích mới chưa có gói phê duyệt (cần bổ sung) vẫn trả kết luận và các điểm chính, không chỉ dòng trạng thái
    events = [{"type": "state_changed", "payload": {"report_text": "Báo cáo", "reason": "Thiếu BCTC 2025",
                                                    "findings": ["Chưa có BCTC 2025"], "conditions": ["Bổ sung BCTC"]}}]
    text = mod.compose_engine_reply({"state": "Needs Info", "package": {}}, events)
    assert "Thiếu BCTC 2025" in text and "Chưa có BCTC 2025" in text and "Bổ sung BCTC" in text


@pytest.mark.asyncio
async def test_leverage_question_without_result_labels_existing_vs_post_grant() -> None:
    seen = {}

    class Inner(_Inner):
        async def respond(self, **kwargs):
            seen["message"] = kwargs["message"]
            return await super().respond(**kwargs)

    await _ask(EngineConversationResponder(Inner(), _Engine()), route={"route_type": "DIRECT", "intent": "DIRECT_QUERY"},
               message="Nợ vay/EBITDA của hồ sơ này bao nhiêu?")
    assert "sau cấp" in seen["message"] and "hiện hữu" in seen["message"]


def test_gate_label_is_written_like_a_person_in_reply_and_context() -> None:
    assert mod.plain_gate_label("CẦN BỔ SUNG/ĐIỀU CHỈNH: DSCR thấp") == "Cần bổ sung/điều chỉnh: DSCR thấp"
    assert mod.plain_gate_label("TỪ CHỐI: vi phạm") == "Từ chối: vi phạm"
    assert mod.plain_gate_label("Hồ sơ đủ điều kiện") == "Hồ sơ đủ điều kiện"
    case = {"state": "Needs Info", "package": {"recommendation": "CẦN BỔ SUNG/ĐIỀU CHỈNH: DSCR thấp"}}
    assert "CẦN BỔ SUNG" not in mod.compose_engine_reply(case)
    assert "CẦN BỔ SUNG" not in mod.result_context(case, [], "broad")


def test_authority_guide_states_total_exposure_rule_without_other_institution_debt() -> None:
    guide = mod._KIND_GUIDE["authority"]
    assert "KHÔNG cộng" in guide and "tổ chức tín dụng khác" in guide


def test_runtime_adapter_authorizes_loan_chat_with_the_read_rule() -> None:
    from pathlib import Path
    src = (Path(mod.__file__).parents[1] / "runtime_adapters.py").read_text()
    assert "identity.can_read_loan(:employee_id, :loan_id)" in src
    assert "identity.can_access_loan(:employee_id, :loan_id)" not in src


def test_auditor_cannot_rerun_agent_team_from_chat_guard() -> None:
    from app.services.loan_agent_run_service import denial_reason
    auditor = SimpleNamespace(roles=("auditor",), is_admin=False)
    assert denial_reason(auditor, "UNDERWRITING", False) is not None
