"""L17: việc trước quyết định là yêu cầu bổ sung; điều kiện giải ngân đúng nghĩa; diễn đạt khác chữ không nhân đôi."""
from common.schemas import Verdict, VerdictDecision
from gateway import proposals


def _approve(conds):
    return Verdict(agent="validation", task_id="t", decision=VerdictDecision.APPROVE, summary="ok"), {"conditions": conds}


def test_pre_decision_items_become_request_documents():
    v, rep = _approve(["Xác minh DSCR và EBITDA trước khi trình phê duyệt", "Mở tài khoản thanh toán trước giải ngân",
                       "Bổ sung BCTC kiểm toán"])
    kinds = {p["kind"]: p for p in proposals.derive(v, [], rep)}
    assert kinds["request_documents"]["params"]["documents"] == ["Xác minh DSCR và EBITDA trước khi trình phê duyệt",
                                                                 "Bổ sung BCTC kiểm toán"]
    assert [p["params"]["text"] for p in proposals.derive(v, [], rep) if p["kind"] == "add_disbursement_condition"] == [
        "Mở tài khoản thanh toán trước giải ngân"]


def test_similar_wording_collapses():
    assert proposals.similar("Xác minh DSCR và EBITDA trước khi trình", "Xác minh DSCR, EBITDA trước khi trình phê duyệt")
    assert not proposals.similar("Mở tài khoản thanh toán", "Định giá lại tài sản bảo đảm")
    v, rep = _approve(["Mở tài khoản thanh toán trước giải ngân", "Mở tài khoản thanh toán trước khi giải ngân"])
    assert len(proposals.derive(v, [], rep)) == 1
