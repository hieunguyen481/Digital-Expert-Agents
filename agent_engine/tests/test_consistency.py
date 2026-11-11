from common import consistency, recompute
from common.report import demote_unsupported
from common.schemas import Verdict, VerdictDecision


def _verified():
    cols = [{"collateral_id": "c1", "legal_status": "clear", "valuation": 30e9}]
    fin = [{"year": 2025, "ebitda": 98e9, "total_debt": 100e9, "reported_ratios": {"dscr": {"value": 1.34, "status": "ok"}}}]
    return {"collateral": recompute.collateral_check(cols, 20e9),
            "leverage": recompute.leverage_check(fin, [], 78e9), "raw": {"financials": fin}}


def _v(agent, summary="", findings=(), conditions=()):
    return Verdict(agent=agent, task_id="t", decision=VerdictDecision.FLAG, summary=summary,
                   findings=list(findings), conditions=list(conditions))


def test_mismatch_flagged_and_demoted():
    ver = _verified()  # ratio = 178/98 = 1.816
    assert consistency.mismatches("Nợ vay/EBITDA sau cấp 1,39 lần", ver)
    assert not consistency.mismatches("Nợ vay/EBITDA sau cấp 1,82 lần", ver)
    assert consistency.mismatches("DSCR tính lại 1,445", ver)
    assert not consistency.mismatches("DSCR 1,34 đạt ngưỡng", ver)
    assert consistency.mismatches("TSĐB định giá 28 tỷ, pháp lý rõ", ver)
    assert not consistency.mismatches("TSĐB định giá 30 tỷ, pháp lý rõ", ver)
    assert consistency.mismatches("chưa có giá trị định giá và pháp lý", ver)
    vs = {"credit": _v("credit", findings=["Nợ vay/EBITDA 1,39 lần", "Dòng tiền ổn"]),
          "compliance": _v("compliance", summary="TSĐB định giá 28 tỷ. Pháp lý rõ")}
    notes = consistency.check_verdicts(vs, ver)
    assert len(notes) == 2 and all("Phản biện" in n for n in notes)
    out, demoted = demote_unsupported(vs, ver)
    assert out["credit"].findings == ["Dòng tiền ổn"] and demoted
    assert "28" not in out["compliance"].summary


def test_unblock_for_approval():
    assert consistency.unblock_for_approval("Chưa thể phê duyệt: cần xác nhận hồ sơ kiểm toán") == "Cần xác nhận hồ sơ kiểm toán"
    assert consistency.unblock_for_approval("Bổ sung BCTC") == "Bổ sung BCTC"
