"""L07: khóa kỹ thuật được dịch ở một chỗ; số tiền kiểu Việt Nam; enum máy đọc không bị đụng."""
import re

from common.labels import humanize, humanize_payload, vn_money

RAW = re.compile(r"total_debt|NEEDS_VERIFICATION|has_collateral|kyc_status|cic_group|valuation_status|create_loan_draft|"
                 r"head_office|need_more_info|draft_id|collateral_id: None|dry-run")


def test_known_keys_and_statuses_are_translated():
    s = ("total_debt: None; kyc_status: VERIFIED; cic_group: 1; valuation_status: NEEDS_VERIFICATION; "
         "collateral_id: None; has_collateral: False; create_loan_draft; need_more_info; dry-run")
    assert not RAW.search(humanize(s))
    assert "cần xác minh" in humanize("valuation_status: NEEDS_VERIFICATION")


def test_money_and_decimals_vietnamese_style():
    assert vn_money(80e9) == "80 tỷ" and vn_money(1.5e9) == "1,5 tỷ" and vn_money(250e6) == "250 triệu"
    assert humanize("hạn mức 80,000,000,000 VND") == "hạn mức 80 tỷ VND"
    assert humanize("tổng 178.0 tỷ, LTV 55.2%, DSCR 1.34; CS-TD-SME/2025 §4.2") == "tổng 178,0 tỷ, LTV 55,2%, DSCR 1,34; CS-TD-SME/2025 §4.2"


def test_payload_only_touches_text_keys_and_keeps_raw_quote():
    p = {"decision": "need_more_info", "agent": "credit",
         "evidence": [{"source": "core-banking:get_cic_status", "quote": "cic_group: 3"}],
         "findings": ["valuation_status: NEEDS_VERIFICATION"]}
    out = humanize_payload(p)
    assert out["decision"] == "need_more_info" and out["evidence"][0]["source"] == p["evidence"][0]["source"]
    assert out["evidence"][0]["quote"] == "nhóm nợ CIC: 3" and out["evidence"][0]["raw_quote"] == "cic_group: 3"
    assert out["findings"] == ["trạng thái định giá: cần xác minh"]


def test_tool_choices_differ_by_record_with_reasons():
    from common import agent_tools
    with_col = agent_tools.choices("compliance", {"has_collateral": True}, {}, ["blacklist"], [], False)
    no_col = agent_tools.choices("compliance", {"has_collateral": False}, {}, ["blacklist"], [], False)
    assert {c["key"]: c["how"] for c in with_col} != {c["key"]: c["how"] for c in no_col} or all(c["reason"] for c in no_col)
    assert all(c["reason"] and "Q3" not in c["reason"] for c in with_col + no_col)


def test_approval_tier_keys_are_translated():
    out = humanize("cấp phê duyệt: head_office (CS-TD-SME/2025 §3.1); head_office_l2, branch_director, council")
    assert "head_office" not in out and "branch_director" not in out and "council" not in out
    assert "Cấp 2 Hội sở" in out and "Hội đồng tín dụng" in out
