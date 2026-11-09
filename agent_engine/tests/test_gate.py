"""Cổng xác định: tách thiếu dữ liệu chặn thật và thiếu trường phụ (không cần LLM, không cần DB)."""
from datetime import date

from common import facts, gate
from common.schemas import VerdictDecision as D

REQ = {"business_id": "b", "amount": 10e9, "has_collateral": False}
TODAY = date(2026, 11, 9)
BIZ = {"account_number": "123", "legal_rep_name": "A"}
FIN = [{"year": 2025, "ebitda": 30e9, "total_debt": 50e9, "equity": 1, "revenue": 1,
        "reported_ratios": {"dscr": {"value": 1.5, "status": "CONFIRMED"}}}]
LOANS = [{"outstanding": 4e9}]
CIC = {"cic_group": 1, "report_date": "2026-11-09"}
BL = {"hit": False, "screened": True}


def _g(**over):
    raw = {"business": BIZ, "financials": FIN, "loans": LOANS, "cic": CIC, "blacklist": BL, "collateral": []}
    raw.update(over)
    req = over.pop("req", REQ) if "req" in over else REQ
    raw.pop("req", None)
    return gate.decide(facts.build(raw, req, TODAY))[0]


def test_ancillary_gaps_do_not_block():
    fin = [{**FIN[0], "reported_ratios": {}, "data_note": "thiếu số liệu: dscr"}]
    f = facts.build({"business": {"account_number": "1"}, "financials": fin, "loans": LOANS, "cic": CIC,
                     "blacklist": BL, "collateral": []}, REQ, TODAY)
    assert f["ancillary"] and not f["blockers"]
    assert gate.decide(f)[0] == D.APPROVE


def test_blocking_gaps():
    assert _g() == D.APPROVE
    assert _g(cic={"cic_group": None}) == D.NEED_MORE_INFO
    assert _g(cic={"cic_group": 1, "report_date": "2026-09-25"}) == D.NEED_MORE_INFO  # quá 30 ngày
    assert _g(financials=[]) == D.NEED_MORE_INFO
    assert _g(business={"legal_rep_name": "A"}) == D.NEED_MORE_INFO  # chưa có tài khoản thanh toán


def test_cic_debt_and_inflow_conflicts():
    cic = {**CIC, "total_outstanding": 45e9}  # BCTC ghi 50, CIC 45: lấy số cao hơn là 50 -> (50+10)/30 = 2 đạt
    assert _g(cic=cic) == D.APPROVE
    cic = {**CIC, "total_outstanding": 120e9}  # (120+10)/30 = 4,3 > 3,5
    assert _g(cic=cic) == D.NEED_MORE_INFO
    fin = [{**FIN[0], "revenue": 300e9}]
    assert _g(financials=fin, inflow={"verified_annual_inflow": 90e9}) == D.NEED_MORE_INFO  # tiền về 30% doanh thu


def test_hard_stop_and_breach():
    assert _g(blacklist={"hit": True, "screened": True}) == D.REJECT
    assert _g(cic={"cic_group": 3, "report_date": "2026-11-09"}) == D.REJECT
    assert _g(financials=[{**FIN[0], "ebitda": 10e9}]) == D.NEED_MORE_INFO  # (50+10)/10 = 6 > 3,5


def test_collateral_blocks_only_when_declared():
    pend = [{"collateral_id": "c", "valuation": 40e9, "legal_status": "pending"}]
    req = {**REQ, "has_collateral": True}
    f = facts.build({"business": BIZ, "financials": FIN, "loans": LOANS, "cic": CIC, "blacklist": BL,
                     "collateral": pend}, req, TODAY)
    assert gate.decide(f)[0] == D.NEED_MORE_INFO
    ok = [{"collateral_id": "c", "valuation": 20e9, "legal_status": "clear"}]
    f = facts.build({"business": BIZ, "financials": FIN, "loans": LOANS, "cic": CIC, "blacklist": BL,
                     "collateral": ok}, {**req, "amount": 14e9}, TODAY)
    assert gate.decide(f)[0] == D.APPROVE  # LTV đúng trần 70%, không vượt


def test_template_plan_cic_group_null():
    """CIC chưa tra cứu (cic_group null) không được làm Planner xác định sập."""
    from gateway import planner
    p = planner._template_plan("c", {"request": {"business_id": "b", "amount": 1}}, {"cic_group": None}, 1)
    assert [t.agent for t in p.tasks][-1] == "validation"
