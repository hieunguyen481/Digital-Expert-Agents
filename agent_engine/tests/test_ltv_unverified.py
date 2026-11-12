"""Q01/P06: LTV trên giá khai (chưa định giá) là "Cần xác minh"; không lộ mã kỹ thuật ở lý do chặn AML."""
from common import recompute


def _col(basis, status):
    return {"collateral_id": "c1", "type": "real_estate", "description": "Nhà xưởng", "valuation": 145e9,
            "valuation_basis": basis, "valuation_status": status, "legal_status": "clear"}


def _lines(cols, amount=80e9):
    col = recompute.collateral_check(cols, amount)
    exp = recompute.exposure_check([], amount, 0)
    return col, recompute.describe(col, exp, None, amount)


def test_declared_value_is_provisional_not_within_threshold():
    col, lines = _lines([_col("declared", "NEEDS_VERIFICATION")])
    assert col["valuation_unverified"] is True
    ltv = next(x for x in lines if "LTV" in x)
    assert "55.2%" in ltv
    assert "cần xác minh" in ltv and "chưa có chứng thư định giá" in ltv
    assert "trong ngưỡng" not in ltv


def test_appraised_value_keeps_normal_line():
    col, lines = _lines([_col("appraised", "VERIFIED")])
    assert col["valuation_unverified"] is False
    ltv = next(x for x in lines if "LTV" in x)
    assert "trong ngưỡng LTV" in ltv and "cần xác minh" not in ltv


def test_aml_blocker_has_no_tool_codes():
    import inspect
    from common import facts
    src = inspect.getsource(facts)
    assert "check_blacklist; " not in src and "compliance_policy Điều" not in src


def test_proposal_rationale_is_plain_sentence_case_and_short():
    from gateway.proposals import plain_rationale, RATIONALE_MAX
    t = plain_rationale("CẦN BỔ SUNG: thiếu dữ liệu chặn — Chưa có kết quả tra cứu CIC — phải tra cứu trước khi trình; "
                        + "Chưa có BCTC " * 40)
    assert t.startswith("Thiếu dữ liệu chặn: Chưa có kết quả tra cứu CIC")
    assert "CẦN BỔ SUNG" not in t and len(t) <= RATIONALE_MAX + 2
    assert plain_rationale("Điều kiện đã gọn.") == "Điều kiện đã gọn."
