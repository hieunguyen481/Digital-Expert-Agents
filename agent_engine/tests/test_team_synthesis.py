"""Báo cáo cuối hợp nhất, Validation kiểm chứng độc lập, Planner bật kiểm TSĐB theo dữ liệu thật."""
import pytest

from agents import validation_agent as va
from common import recompute
from common.report import merge_verdicts
from common.schemas import Envelope, Evidence, MessageType, Plan, PlanTask, Verdict, VerdictDecision
from gateway import orchestrator as orch
from gateway import planner

BIZ = "56000000-0000-4000-8000-000099000000"
REQ = {"business_id": BIZ, "amount": 15e9, "term_months": 36, "purpose": "x", "has_collateral": True}

COLS = [
    {"collateral_id": "c1", "valuation": 20e9, "legal_status": "clear", "type": "RE", "description": "BĐS"},
    {"collateral_id": "c2", "valuation": 10e9, "legal_status": "pending", "type": "MC", "description": "MM"},
]
LOANS = [{"loan_id": "l1", "outstanding": 8e9}, {"loan_id": "l2", "outstanding": 4e9}]
FIN = [{"year": 2025, "ebitda": 10e9, "total_debt": 30e9, "equity": 20e9, "revenue": 100e9}]


def _v(agent, decision=VerdictDecision.APPROVE, **kw):
    kw.setdefault("summary", f"{agent} xong")
    return Verdict(agent=agent, task_id=f"t_{agent}", decision=decision, **kw)


def _specialists():
    return {
        "credit": _v("credit", findings=["DSCR 1,10 dưới ngưỡng 1,25 (§4.2)", "Có 2 khoản vay hiện hữu"],
                     conditions=["Bổ sung BCTC quý"], evidence=[Evidence(source="core-banking:get_financials", quote="DSCR 1,10")],
                     proposed_limit=15e9),
        "compliance": _v("compliance", VerdictDecision.FLAG, findings=["LTV tối đa 70% tương ứng 14 tỷ", "CIC nhóm 2"],
                         conditions=["Bổ sung BCTC quý", "Hoàn thiện đăng ký giao dịch bảo đảm"],
                         evidence=[Evidence(source="CS-TD-SME/2025 §7.1 – LTV và TSBĐ", quote="LTV ≤ 70%")],
                         max_secured_limit=14e9),
        "operations": _v("operations", findings=["Thiếu tài khoản thanh toán"]),
    }


def test_recompute_numbers():
    col = recompute.collateral_check(COLS, 15e9)
    assert col["eligible_value"] == 20e9 and col["ltv"] == pytest.approx(0.75) and col["ltv_over"]
    assert col["max_secured_limit"] == pytest.approx(14e9) and len(col["excluded"]) == 1
    exp = recompute.exposure_check(LOANS, 15e9)
    assert exp["total"] == 27e9 and exp["audit_required"] and exp["tier"] == "regional"
    assert not recompute.exposure_check([], 20e9)["audit_required"]       # đúng 20 tỷ: chưa bắt buộc
    lev = recompute.leverage_check(FIN, LOANS, 15e9)
    assert lev["ratio"] == pytest.approx(4.5) and lev["over"]


def test_merge_keeps_everything_and_dedups():
    r = merge_verdicts(_specialists(), ["Tính lại LTV 75%"], [])
    assert r["conditions"].count("Bổ sung BCTC quý") == 1
    for v in _specialists().values():
        assert set(v.findings) <= set(r["findings"])
        assert set(v.conditions) <= set(r["conditions"])
    assert {c["source"] for c in r["citations"]} >= {"core-banking:get_financials", "CS-TD-SME/2025 §7.1 – LTV và TSBĐ"}
    assert "Tính lại LTV 75%" in r["findings"] and "LTV tối đa 70%" in r["text"]


async def _run_validation(monkeypatch, verdicts, cols=COLS, loans=LOANS, fin=FIN, sent=None):
    async def fake_tool(name, args=None):
        return {"get_collateral": cols, "get_existing_loans": loans, "get_financials": fin}[name]

    async def fake_send(frm, to, env):
        if sent is not None:
            sent.append((to, env.payload))
        return env.model_copy(update={"type": MessageType.ERROR, "payload": {}})

    monkeypatch.setattr(va.mcp_client, "call_tool", fake_tool)
    monkeypatch.setattr(va, "a2a_send", fake_send)
    monkeypatch.setattr(va.config, "LLM_MODE", "rules")
    env = Envelope(case_id="c", task_id="t_validation", from_agent="orchestrator", to_agent="validation",
                   type=MessageType.TASK_REQUEST,
                   payload={"params": {"request": REQ, "verdicts": {k: v.model_dump(mode="json") for k, v in verdicts.items()}}})
    return await va.handle_task(env)


async def test_validation_recomputes_independently(monkeypatch):
    out = await _run_validation(monkeypatch, _specialists())
    text = " ".join(out.findings)
    assert "Tính lại LTV" in text and "75.0%" in text and "27.0 tỷ" in text      # tổng cấp tín dụng 12 + 15
    assert out.data["verified"]["exposure"]["audit_required"]
    assert any("kiểm toán" in c for c in out.conditions)
    assert out.decision == VerdictDecision.NEED_MORE_INFO                       # LTV, đòn bẩy vượt ngưỡng


async def test_validation_challenges_compliance_that_skipped_collateral(monkeypatch):
    sv = _specialists()
    sv["compliance"] = _v("compliance", findings=["CIC nhóm 1"], summary="Đạt KYB/AML")
    sent: list = []
    await _run_validation(monkeypatch, sv, sent=sent)
    assert sent and sent[0][0] == "compliance" and sent[0][1]["check_collateral"] is True
    assert sent[0][1]["request"]["business_id"] == BIZ


async def test_validation_challenges_credit_over_recomputed_cap(monkeypatch):
    sv = _specialists()
    sv["compliance"] = _v("compliance", findings=["ok"], max_secured_limit=None, summary="Đã xét LTV")
    sent: list = []
    await _run_validation(monkeypatch, sv, sent=sent)
    credit_msgs = [p for to, p in sent if to == "credit"]
    assert credit_msgs and credit_msgs[0]["max_secured_limit"] == pytest.approx(14e9)


async def test_package_and_stop_reason_carry_every_verdict_finding(monkeypatch):
    out = await _run_validation(monkeypatch, _specialists())
    captured: dict = {}

    async def fake_update(case_id, **kw):
        captured.update(kw)

    async def noop(*a, **k):
        return None
    monkeypatch.setattr(orch.db, "update_case", fake_update)
    monkeypatch.setattr(orch, "_set_state", noop)
    monkeypatch.setattr(orch, "_emit", noop)
    plan = Plan(case_id="c", version=1, rationale="", tasks=[])
    await orch._build_package("c", plan, out)
    pkg = captured["package"]
    stop = orch._final_report(out)                 # đúng dict được gắn vào sự kiện Cần bổ sung / Từ chối
    for name, v in _specialists().items():
        assert set(v.findings) <= set(pkg["findings"]) and set(v.findings) <= set(stop["findings"]), name
        assert set(v.conditions) <= set(pkg["conditions"]) and set(v.conditions) <= set(stop["conditions"]), name
        assert all(e.quote in pkg["report_text"] for e in v.evidence)
    assert {c["source"] for c in pkg["citations"]} == {c["source"] for c in stop["citations"]}


def test_planner_enables_collateral_from_data_not_only_flag():
    req = {**REQ, "has_collateral": False}
    payload = {"request": req, "documents": []}
    plan = planner._template_plan("c", payload, {"collateral_count": 2}, 1)
    comp = next(t for t in plan.tasks if t.agent == "compliance")
    assert comp.params["check_collateral"] is True
    llm_plan = Plan(case_id="c", version=1, rationale="", tasks=[
        PlanTask(task_id="a", agent="compliance", objective="KYB", params={"check_collateral": False})])
    planner.ensure_collateral_check(llm_plan, payload, {"collateral_count": 2})
    assert llm_plan.tasks[0].params["check_collateral"] is True
    none = Plan(case_id="c", version=1, rationale="", tasks=[
        PlanTask(task_id="a", agent="compliance", objective="KYB", params={"check_collateral": False})])
    planner.ensure_collateral_check(none, payload, {"collateral_count": 0})
    assert none.tasks[0].params["check_collateral"] is False


def test_ops_dry_run_runs_in_parallel_with_specialists():
    plan = planner._template_plan("c", {"request": REQ, "documents": []}, {}, 1)
    ops = next(t for t in plan.tasks if t.agent == "operations")
    assert ops.depends_on == []
    p2 = Plan(case_id="c", version=1, rationale="", tasks=[
        PlanTask(task_id="d", agent="document", objective="d"),
        PlanTask(task_id="c", agent="credit", objective="c", depends_on=["d"]),
        PlanTask(task_id="o", agent="operations", objective="o", depends_on=["d", "c"], params={"phase": "dry_run"})])
    planner.parallelize_ops(p2)
    assert p2.tasks[2].depends_on == ["d"]


async def test_final_report_keeps_every_source_and_drops_claims_tools_contradict(monkeypatch):
    from common.report import with_policy_evidence
    sv = _specialists()
    clause = {"source": "CS-TD-SME/2025 §4.2 – Khả năng trả nợ", "text": "DSCR ≥ 1,25", "score": 1.0}
    sv["credit"] = with_policy_evidence(sv["credit"], [clause, {"source": "credit_guide.md", "text": "x", "score": 1}])
    assert [e.source for e in sv["credit"].evidence] == ["core-banking:get_financials", clause["source"]]
    assert with_policy_evidence(sv["credit"], [clause]) is sv["credit"]            # không đính trùng
    unsupported = "Nếu tổng nợ 55 tỷ vượt 20 tỷ, phải có BCTC kiểm toán chấp nhận toàn phần"
    sv["compliance"] = sv["compliance"].model_copy(update={"conditions": [*sv["compliance"].conditions, unsupported]})
    out = await _run_validation(monkeypatch, sv, loans=[{"loan_id": "l1", "outstanding": 1e9}])  # tổng 16 tỷ
    assert not out.data["verified"]["exposure"]["audit_required"]
    assert unsupported not in out.conditions and unsupported not in out.data["report"]["text"].split("Đã hạ cấp")[0]
    assert any(unsupported in d for d in out.data["report"]["demoted"])
    kept = {*out.findings, *out.conditions}
    for v in sv.values():                                                        # phát hiện không bị công cụ phủ nhận thì giữ
        assert (set(v.findings) | set(v.conditions)) - {unsupported} <= kept
    sources = {e.source for e in out.evidence}
    assert "CS-TD-SME/2025 §7.1 – LTV và TSBĐ" in sources and "CS-TD-SME/2025 §3.1 – Thẩm quyền phê duyệt" in sources
    cites = {c["source"] for c in out.data["report"]["citations"]}
    assert {e.source for v in sv.values() for e in v.evidence} <= cites         # mọi nguồn của chuyên gia có trong báo cáo cuối
