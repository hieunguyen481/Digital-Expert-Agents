"""Đề xuất hành động ghi của agent: dựng từ căn cứ, và chỉ thực hiện sau xác nhận của người có quyền."""
import pytest

from common.schemas import Evidence, Verdict, VerdictDecision
from gateway import actions, proposal_flow, proposals

APPR = frozenset({"credit_appraiser"})


def verdict(agent, decision, **kw):
    return Verdict(agent=agent, task_id=f"t_{agent}", decision=decision, summary=kw.pop("summary", "tóm tắt"), **kw)


def test_derive_three_kinds_with_evidence():
    flagged = verdict("compliance", VerdictDecision.FLAG, summary="Lệch MST giữa BCTC và đăng ký",
                      evidence=[Evidence(source="BCTC", quote="MST 0312345678")], findings=["MST lệch"])
    need = verdict("credit", VerdictDecision.NEED_MORE_INFO, conditions=["Sao kê 12 tháng", "BCTC kiểm toán"],
                   evidence=[Evidence(source="checklist", quote="thiếu sao kê")])
    flags = proposals.derive(verdict("validation", VerdictDecision.NEED_MORE_INFO, summary="Cần bổ sung"),
                             [flagged, need], {})
    kinds = {p["kind"]: p for p in flags}
    assert set(kinds) == {"add_risk_flag", "request_documents"}
    assert kinds["add_risk_flag"]["params"]["severity"] == "MEDIUM" and kinds["add_risk_flag"]["evidence"]
    assert kinds["request_documents"]["params"]["documents"] == ["Sao kê 12 tháng", "BCTC kiểm toán"]
    cond = proposals.derive(verdict("validation", VerdictDecision.APPROVE, evidence=[Evidence(source="g", quote="q")]),
                            [], {"conditions": ["Mở tài khoản thanh toán", "Mở tài khoản thanh toán"]})
    assert [p["params"]["text"] for p in cond] == ["Mở tài khoản thanh toán"]  # bỏ trùng


def test_derive_skips_without_basis():
    bare = verdict("credit", VerdictDecision.FLAG)  # không evidence, không findings
    assert proposals.derive(verdict("validation", VerdictDecision.APPROVE), [bare], {}) == []


class FakeDb:
    def __init__(self, kind="add_risk_flag"):
        self.p = {"id": "p1", "case_id": "c1", "kind": kind, "title": "T", "params": {"severity": "HIGH"},
                  "status": "PROPOSED", "result": None}
        self.actions, self.events = [], []

    async def get_proposal(self, pid): return dict(self.p)
    async def get_case(self, cid): return {"case_id": "c1", "customer_id": "cu", "payload": {"request": {"loan_application_id": "L1"}}}

    async def claim_proposal(self, pid, status, by, reason):
        if self.p["status"] != "PROPOSED":
            return False
        self.p.update(status=status, decided_by=by)
        return True

    async def release_proposal(self, pid, by, result): self.p.update(status="PROPOSED", result=result)
    async def set_proposal_result(self, pid, result): self.p["result"] = result
    async def record_action(self, *a): self.actions.append(a); return True
    async def add_event(self, case_id, agent, etype, payload): self.events.append(etype); return {"type": etype}


@pytest.fixture
def env(monkeypatch):
    fake, calls = FakeDb(), []

    async def fetch_loan(jwt, loan_id, customer_id): return {"id": loan_id, "version": 3}

    async def execute(jwt, loan, proposal, reason):
        calls.append(jwt)
        if jwt == "denied":
            raise actions.ActionRefused(403, "FORBIDDEN", "không đủ quyền")
        return {"api": "agent-flags", "flag_id": "f1"}

    async def broadcast(e): pass
    monkeypatch.setattr(proposal_flow, "db", fake)
    monkeypatch.setattr(actions, "fetch_loan", fetch_loan)
    monkeypatch.setattr(actions, "execute_proposal", execute)
    import gateway.main as main
    monkeypatch.setattr(main, "broadcast", broadcast)
    return fake, calls


async def test_nothing_executes_until_confirmed(env):
    fake, calls = env
    assert calls == [] and fake.p["status"] == "PROPOSED"
    res = await proposal_flow.confirm("p1", employee_id="e1", roles=APPR, jwt="jwt", reason="đủ căn cứ rồi",
                                      loan_application_id=None)
    assert res["status"] == "confirmed" and calls == ["jwt"]
    assert fake.events == ["action_confirmed", "action_executed"]
    assert fake.actions[0][1] == "add_risk_flag" and fake.actions[0][5] == "EXECUTED"


async def test_double_confirm_executes_once(env):
    fake, calls = env
    await proposal_flow.confirm("p1", employee_id="e1", roles=APPR, jwt="jwt", reason="đủ căn cứ rồi", loan_application_id=None)
    again = await proposal_flow.confirm("p1", employee_id="e1", roles=APPR, jwt="jwt", reason="đủ căn cứ rồi", loan_application_id=None)
    assert again["replay"] is True and calls == ["jwt"] and len(fake.actions) == 1


async def test_dismiss_needs_reason_and_blocks_confirm(env):
    fake, calls = env
    with pytest.raises(proposal_flow.ProposalError) as e:
        await proposal_flow.dismiss("p1", employee_id="e1", roles=APPR, reason=" ")
    assert e.value.status == 422
    await proposal_flow.dismiss("p1", employee_id="e1", roles=APPR, reason="không phù hợp hồ sơ")
    assert fake.events == ["action_dismissed"]
    with pytest.raises(proposal_flow.ProposalError) as e:
        await proposal_flow.confirm("p1", employee_id="e1", roles=APPR, jwt="jwt", reason="đủ căn cứ rồi", loan_application_id=None)
    assert e.value.status == 409 and calls == []


async def test_role_without_authority_refused_before_anything(env):
    fake, calls = env
    with pytest.raises(proposal_flow.ProposalError) as e:
        await proposal_flow.confirm("p1", employee_id="e2", roles=frozenset({"auditor"}), jwt="jwt",
                                    reason="đủ căn cứ rồi", loan_application_id=None)
    assert e.value.status == 403 and calls == [] and fake.p["status"] == "PROPOSED"


async def test_backend_refusal_returns_to_proposed_and_logs(env):
    fake, calls = env
    with pytest.raises(proposal_flow.ProposalError) as e:
        await proposal_flow.confirm("p1", employee_id="e1", roles=APPR, jwt="denied", reason="đủ căn cứ rồi", loan_application_id=None)
    assert e.value.status == 403 and fake.p["status"] == "PROPOSED"
    assert fake.actions[0][5] == "REFUSED" and "action_refused" in fake.events


def test_derive_keeps_every_condition_including_q_v_account():
    conds = [f"Điều kiện {i}" for i in range(1, 6)] + ["Mở tài khoản thanh toán trước giải ngân (Q-V)"]
    out = proposals.derive(verdict("validation", VerdictDecision.APPROVE, evidence=[Evidence(source="g", quote="q")]),
                           [], {"conditions": conds})
    assert [p["params"]["text"] for p in out] == conds
