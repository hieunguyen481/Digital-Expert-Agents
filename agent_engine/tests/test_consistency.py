from common import consistency, recompute
from common.report import demote_unsupported
from common.schemas import Evidence, Verdict, VerdictDecision


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
    assert out["credit"].findings == ["Dòng tiền ổn"] and not any("1,39" in d for d in demoted)
    assert "28" not in out["compliance"].summary


def test_unblock_for_approval():
    assert consistency.unblock_for_approval("Chưa thể phê duyệt: cần xác nhận hồ sơ kiểm toán") == "Cần xác nhận hồ sơ kiểm toán"
    assert consistency.unblock_for_approval("Bổ sung BCTC") == "Bổ sung BCTC"


def test_demoted_list_does_not_repeat_mismatched_number():
    from common.report import demote_unsupported
    from common.schemas import Verdict, VerdictDecision
    v = Verdict(agent="credit", task_id="t", decision=VerdictDecision.FLAG, summary="ok",
                findings=["nợ vay/EBITDA sau cấp tín dụng là 1,39 lần."])
    verified = {"leverage": {"ratio": 1.82, "ebitda": 1e11, "debt": 1.8e11, "over": False, "max": 3.5}}
    out, demoted = demote_unsupported({"credit": v}, verified)
    assert out["credit"].findings == [] and not any("1,39" in d for d in demoted)


def test_leverage_phrasings_and_evidence():
    ver = _verified()  # 1,82 lần
    for bad in ("Đòn bẩy sau cấp 1,39 lần, dưới ngưỡng",
                "Nợ vay sau cấp 136 tỷ / EBITDA 98 tỷ = 1,39 lần",
                "Nợ vay/EBITDA sau cấp 1,39 lần",
                "Đòn bẩy tài chính sau cấp khoảng 1,39 lần"):
        assert consistency.mismatches(bad, ver), bad
    for ok in ("Đòn bẩy sau cấp 1,82 lần",
               "Nợ vay sau cấp 178 tỷ / EBITDA 98 tỷ = 1,82 lần",
               "Nợ vay/EBITDA tối đa 3,5 lần theo §4.2",
               "Đòn bẩy không vượt 3,5 lần",
               "Đòn bẩy hiện hữu trước cấp 0,57 lần",
               "EBITDA 98 tỷ, dòng tiền ổn"):
        assert not consistency.mismatches(ok, ver), ok
    v = _v("credit", summary="ok")
    v = v.model_copy(update={"evidence": [Evidence(source="credit", quote="Đòn bẩy sau cấp 1,39 lần")]})
    notes = consistency.check_verdicts({"credit": v}, ver)
    assert len(notes) == 1 and "1,82" in notes[0]
    out, _ = demote_unsupported({"credit": v}, ver)
    assert out["credit"].evidence == []


def test_user_facing_text_has_no_internal_rule_codes():
    import re
    from common import policy_checklist
    exp = recompute.exposure_check([{"outstanding": 98e9}], 80e9, 0)
    lines = recompute.describe(None, exp, None, 80e9)
    text = " ".join(lines) + " " + policy_checklist.POLICY_CHECKLIST
    assert "§3.1" in text and not re.search(r"\bQ-?[0-9A-Z]\b", text)


def test_leverage_moi_cach_viet_va_loai_so_lech_khoi_goi_cuoi():
    ver = _verified()  # 1,82 lần
    for t in ["Nợ sau cấp 136 tỷ/EBITDA 98 tỷ = 1,39 lần", "Nợ vay sau cấp 136 / EBITDA 98 = 1,39 lần",
              "Tổng nợ / EBITDA = 1,39 lần", "Đòn bẩy sau cấp 1,39 lần"]:
        assert consistency.mismatches(t, ver), t
    assert not consistency.mismatches("Nợ sau cấp 178 tỷ/EBITDA 98 tỷ = 1,82 lần", ver)
    assert not consistency.mismatches("Nợ hiện hữu 56 tỷ/EBITDA 98 tỷ = 0,57 lần", ver)
    vs = {"credit": _v("credit", findings=["Nợ sau cấp 136 tỷ/EBITDA 98 tỷ = 1,39 lần", "Dòng tiền ổn"])}
    assert len(consistency.check_verdicts(vs, ver)) == 1
    out, _ = demote_unsupported(vs, ver)
    assert out["credit"].findings == ["Dòng tiền ổn"]


def test_ltv_nguong_chinh_sach_khong_bi_nham_voi_ltv_thuc():
    ver = _verified()
    col = ver["collateral"]
    real = round(col["ltv"] * 100, 1)
    for t in ["LTV ≤ 70%", "LTV tối đa 70%", "LTV trần 70%", "LTV không vượt 70%", "LTV < 70%", "LTV vượt ngưỡng 70%"]:
        assert not consistency.mismatches(t, ver), t
    assert consistency.mismatches("LTV 70% theo hồ sơ", ver) or abs(real - 70) <= 0.6


def test_declared_only_collateral_is_not_challenged_for_missing_appraisal():
    """T02: TSĐB mới có giá khai (chưa thẩm định) thì chuyên gia nói "chưa có định giá" là đúng, không phản biện."""
    declared = [{"collateral_id": "c1", "legal_status": "clear", "valuation": 145e9, "valuation_basis": "declared",
                 "valuation_status": "NEEDS_VERIFICATION"}]
    ver = {"collateral": recompute.collateral_check(declared, 80e9)}
    assert not consistency.mismatches("TSĐB chưa có giá trị định giá, cần thẩm định", ver)
    appraised = [{"collateral_id": "c1", "legal_status": "clear", "valuation": 30e9, "valuation_basis": "appraised"}]
    ver = {"collateral": recompute.collateral_check(appraised, 20e9)}
    assert consistency.mismatches("TSĐB chưa có định giá", ver)


def test_policy_ltv_cap_is_not_read_as_actual_ltv():
    """T03: "theo LTV 70%", "mức LTV 70%" là trần chính sách; LTV thực nêu sai vẫn bị phản biện."""
    cols = [{"collateral_id": "c1", "legal_status": "clear", "valuation": 20e9, "valuation_basis": "appraised"}]
    ver = {"collateral": recompute.collateral_check(cols, 9e9)}  # LTV 45%, trần 70%
    for ok in ("LTV 45%; mức tối đa 70%",
               "Hạn mức bảo đảm tối đa 14 tỷ theo LTV 70%",
               "Áp dụng mức LTV 70% của chính sách",
               "LTV 45%, thấp hơn quy định LTV 70%"):
        assert not consistency.mismatches(ok, ver), ok
    for bad in ("LTV 70%", "LTV thực tế của khoản vay là 70%", "Tính lại. LTV 60% theo hồ sơ", "theo số liệu, LTV 52%"):
        assert consistency.mismatches(bad, ver), bad


def test_challenge_note_has_single_verb():
    """T06: dòng phản biện không lặp chữ "nêu"."""
    ver = _verified()
    notes = consistency.check_verdicts({"credit": _v("credit", summary="chưa có giá trị định giá"),
                                        "compliance": _v("compliance", summary="Không có EBITDA để tính")}, ver)
    assert len(notes) == 2 and not any("nêu nêu" in n for n in notes)
