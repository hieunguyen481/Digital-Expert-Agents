"""N02, N05, N06, N09, N10 (chấm lần 3): chuỗi hiển thị cho người dùng nhất quán và là tiếng Việt nghiệp vụ.

Dữ liệu lấy từ ca thật VinaNova 80 tỷ (cảnh 1) và ca TSĐB pháp lý chưa rõ trong lần chấm."""
import re

from common import gate, labels, recompute
from common.schemas import Verdict, VerdictDecision as D

# Câu LLM thật của ca VinaNova (case_345109974d59)
CREDIT = ("Chưa thể chốt phê duyệt: hồ sơ chưa chứng minh BCTC kiểm toán bắt buộc đã có; DSCR cần xác minh và chưa đủ dữ "
          "liệu định giá/pháp lý để kiểm tra LTV.")
COMPLIANCE = ("Chưa thể chấp thuận: định giá TSĐB còn chờ xác minh và chưa có dữ liệu xác nhận BCTC kiểm toán bắt buộc. "
              "Hạn mức bảo đảm đủ điều kiện hiện tính được: 0 đồng.")
UUID = "00000000-0000-4000-8000-000000771003"

# mọi thứ không được xuất hiện trong chuỗi hiển thị
BANNED = re.compile(r"verdict|evidence|inflow|blacklist\.|ai_proposed|DU_LIEU_MAU|tỷ\.0|phải nêu trong kết luận|POSSIBLE_MATCH|"
                    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-|đồng-\d{4}", re.I)


def _v(agent, summary, conditions=()):
    return Verdict(agent=agent, task_id="t", decision=D.NEED_MORE_INFO, summary=summary, conditions=list(conditions))


def _experts():
    return gate.reconcile_experts({"credit": _v("credit", CREDIT), "compliance": _v("compliance", COMPLIANCE)},
                                  D.APPROVE, audit_required=True)[0]


def test_n02_expert_summaries_have_no_negative_lead_next_to_conditional_label():
    for v in _experts().values():
        assert v.decision == D.FLAG
        assert not re.search(r"chưa thể (chốt|chấp thuận)", v.summary, re.I), v.summary
        assert "Điều kiện tiên quyết trước khi trình cấp phê duyệt: Phải có BCTC kiểm toán" in v.summary
    assert "DSCR cần xác minh" in _experts()["credit"].summary


def test_n02_audit_prerequisite_is_one_sentence_everywhere():
    for v in _experts().values():
        audit = [c for c in v.conditions if "kiểm toán" in c.lower()]
        assert audit == ["Phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)"]
    assert gate.AUDIT_PREREQ in "đề xuất phê duyệt với điều kiện tiên quyết: " + gate.AUDIT_PREREQ


def test_n02_without_audit_requirement_items_are_plain_conditions():
    out = gate.reconcile_experts({"credit": _v("credit", "Chưa thể chốt phê duyệt: thiếu hồ sơ pháp lý")}, D.APPROVE)[0]["credit"]
    assert "Điều kiện tiên quyết" not in out.summary and "Thiếu hồ sơ pháp lý" in out.summary


def test_n05_excluded_collateral_has_no_uuid_and_vietnamese_legal_status():
    col = recompute.collateral_check(
        [{"collateral_id": UUID, "type": "REAL_ESTATE", "description": "Nhà xưởng KCN Tân Bình", "valuation": 77.1e9,
          "legal_status": "ai_proposed"}], 40e9)
    line = [x for x in recompute.describe(col, {"existing": 0, "total": 40e9, "tier": "head_office_l2", "audit_required": True,
                                                "loans": 0, "other_lenders": 0}, None, 40e9) if "không tính vào LTV" in x][0]
    assert UUID not in line and not BANNED.search(line)
    assert "Nhà xưởng KCN Tân Bình" in line and "chưa được xác nhận" in line


def test_n05_money_formatter_ignores_ids_and_trailing_zero():
    assert labels.humanize(f"TSĐB {UUID} giá 77100000000") == f"TSĐB {UUID} giá 77,1 tỷ"
    assert labels.humanize('"amount":5000000000.0,') == '"amount":5 tỷ,'
    assert labels.humanize("tổng 145000000000.0 đồng") == "tổng 145 tỷ đồng"


def test_n06_english_llm_quotes_are_translated():
    t = labels.humanize("Verified annual inflow 668,8 tỷ, months 11; blacklist.hit: false; TK nhận vốn DU_LIEU_MAU-****0187")
    assert not BANNED.search(t), t
    assert "11 tháng" in t and "****0187" in t


def test_n09_possible_match_is_not_called_a_match():
    bl = {"hit": True, "detail": {"reason": "sanction_status=POSSIBLE_MATCH"}}
    assert "có thể trùng" in labels.sanction_phrase(bl) and "cần rà soát" in labels.sanction_phrase(bl)
    assert labels.sanction_phrase({"hit": True, "detail": {"reason": "sanction_status=MATCH"}}).startswith("trùng khớp")
    assert "có thể trùng" in labels.humanize("sanction_status=POSSIBLE_MATCH")


def test_n10_operations_does_not_claim_a_draft_was_written():
    import inspect
    from agents import operations_agent
    src = inspect.getsource(operations_agent._dry_run)
    assert "chưa hiệu lực" not in src and "chưa ghi vào hệ thống" in src


def test_general_scan_of_sample_case_display_text():
    """Một ca mẫu: các chuỗi hiển thị dựng từ mã (tóm tắt, điều kiện, dòng tính lại, nhãn) không lộ chuỗi kỹ thuật."""
    from common import facts
    raw = {"business": {"account_number": "1", "legal_rep_name": "A"},
           "financials": [{"year": 2025, "ebitda": -2e9, "equity": -1e9, "total_debt": 10e9, "revenue": 705e9,
                           "reported_ratios": {"dscr": {"value": 1.4, "status": "NEEDS_VERIFICATION"}}}],
           "loans": [], "cic": {"cic_group": 1, "report_date": "2099-01-01"}, "blacklist": {"hit": False, "screened": True},
           "collateral": [{"collateral_id": UUID, "type": "REAL_ESTATE", "description": "", "valuation": 77.1e9,
                           "legal_status": "ai_proposed"}]}
    f = facts.build(raw, {"business_id": "b", "amount": 80e9, "has_collateral": True})
    experts = _experts()
    texts = [*f["lines"], *f["breaches"], *f["blockers"], *f["hard_stops"]]
    for v in experts.values():
        texts += [v.summary, *v.conditions]
    for t in texts:
        h = labels.humanize(t)
        assert not BANNED.search(h), h
