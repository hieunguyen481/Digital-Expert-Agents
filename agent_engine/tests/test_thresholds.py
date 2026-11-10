"""L16: ngưỡng chính sách đến từ cấu hình; số DSCR thực của hồ sơ không bị đụng."""
from common import config, thresholds
from common.schemas import Verdict


def test_wrong_dscr_threshold_is_replaced_with_config_and_citation():
    out = thresholds.enforce("DSCR 1,34 dưới ngưỡng 1,2 nên cần phương án")
    assert "1,34" in out and "1,2 " not in out and "1,25 (CS-TD-SME/2025 §4.2)" in out
    assert thresholds.enforce("DSCR tối thiểu 1.2") .startswith("DSCR tối thiểu 1,25")


def test_correct_values_untouched():
    for t in ["DSCR 1,34 ≥ 1,25 (CS-TD-SME/2025 §4.2)", "DSCR dưới ngưỡng 1,0: từ chối", "LTV 55% ≤ 70%"]:
        assert thresholds.enforce(t) == t


def test_ltv_threshold_from_config():
    assert thresholds.enforce("LTV tối đa 60%") == f"LTV tối đa {config.LTV_MAX * 100:g}%"


def test_from_llm_applies_it():
    v = Verdict.from_llm("credit", "t", {"decision": "approve", "summary": "ok", "findings": ["DSCR tối thiểu 1,2 đạt"]})
    assert "1,25" in v.findings[0]


def test_facts_expose_one_official_dscr_and_config_threshold():
    from common import facts
    fin = [{"year": 2025, "revenue": 1, "ebitda": 1, "total_debt": 1, "equity": 1,
            "reported_ratios": {"dscr": {"value": 1.34, "status": "NEEDS_VERIFICATION"}}}]
    f = facts.build({"financials": fin}, {"requested_amount": 1e9}) if hasattr(facts, "build") else None
    assert any("DSCR chính thức của hồ sơ = 1.34" in l and "1,25" not in l and "1.25" in l for l in f["lines"])
