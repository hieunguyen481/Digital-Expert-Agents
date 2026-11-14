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


def test_mandatory_and_data_items_are_requests_not_conditions_or_flags():
    """Tài liệu bắt buộc/dữ liệu cần bổ sung dù có chữ "trước giải ngân" là yêu cầu bổ sung; mỗi nội dung một thẻ."""
    from common import gate
    from common.schemas import Verdict, VerdictDecision
    v, rep = _approve([
        "Cung cấp inflow cùng kỳ doanh thu BCTC và hồ sơ pháp lý, định giá TSĐB để xác định LTV trước giải ngân.",
        "Bổ sung BCTC kiểm toán; bổ sung thông tin người đại diện trước giải ngân.",
        "BCTC kiểm toán (ý kiến chấp nhận toàn phần) bắt buộc vì tổng cấp tín dụng > 20 tỷ",
        "Bổ sung trước giải ngân (không chặn trình): người đại diện pháp luật chưa có trong hồ sơ",
        "Mở tài khoản thanh toán trước giải ngân"])
    flag = Verdict(agent="credit", task_id="c", decision=VerdictDecision.FLAG, summary=gate.NON_BLOCKING + "thiếu BCTC",
                   findings=["thiếu BCTC"], evidence=[])
    items = proposals.derive(v, [flag], rep)
    assert not [p for p in items if p["kind"] == "add_risk_flag"]
    docs = [d for p in items if p["kind"] == "request_documents" for d in p["params"]["documents"]]
    assert sum("kiểm toán" in d.casefold() for d in docs) == 1
    assert sum("người đại diện" in d.casefold() for p in items for d in proposals._texts(p)) == 1
    conds = [p["params"]["text"] for p in items if p["kind"] == "add_disbursement_condition"]
    assert len(conds) == 2 and "Mở tài khoản thanh toán trước giải ngân" in conds  # + người đại diện (Q7: không chặn trình)


def test_condition_parts_are_classified_by_meaning():
    """Mỗi vế (tách theo ";") phân loại theo nghĩa: dữ liệu/tài liệu để ra quyết định → yêu cầu bổ sung; chỉ ràng buộc
    giai đoạn giải ngân → điều kiện giải ngân. Không phụ thuộc hồ sơ nào."""
    requests = [
        "Bổ sung BCTC kiểm toán với ý kiến chấp nhận toàn phần",
        "Đối chiếu lịch trả nợ và nguồn tính DSCR",
        "Đối chiếu inflow với doanh thu cùng kỳ",
        "Xác nhận CIC còn hiệu lực tại ngày trình phê duyệt",
        "Hoàn thiện hồ sơ TSĐB để xác định LTV",
        "BCTC kiểm toán bắt buộc vì tổng cấp tín dụng > 20 tỷ",
    ]
    conditions = [
        "Bổ sung trước giải ngân (không chặn trình): người đại diện pháp luật chưa có trong hồ sơ",
        "Bổ sung thông tin người đại diện trước giải ngân",
        "Hoàn thiện hồ sơ pháp lý và định giá tài sản bảo đảm trước giải ngân",
        "Mở tài khoản thanh toán trước giải ngân",
        "Ký hợp đồng tín dụng kèm lịch trả nợ",
        "Đăng ký giao dịch bảo đảm và mua bảo hiểm tài sản",
    ]
    assert not [t for t in requests if proposals.is_disbursement_condition(t)]
    assert all(proposals.is_disbursement_condition(t) for t in conditions)


def test_compound_conditions_split_and_explicit_stage_condition_survives():
    v, rep = _approve([
        "Bổ sung BCTC kiểm toán; bổ sung và xác minh thông tin người đại diện trước giải ngân.",
        "Cung cấp BCTC kiểm toán và thông tin người đại diện trước phê duyệt; đối chiếu inflow với doanh thu",
        "Bổ sung trước giải ngân (không chặn trình): người đại diện pháp luật chưa có trong hồ sơ"])
    items = proposals.derive(v, [], rep)
    assert [p["kind"] for p in items].count("add_disbursement_condition") == 1
    again = proposals.dedupe_items(proposals.derive(v, [], rep), have=items)
    assert again == []  # chạy lại không phình thêm


def test_ancillary_gaps_become_whole_action_conditions():
    """T07: thiếu trường phụ thành điều kiện viết như việc phải làm, mỗi việc một thẻ, không có mảnh câu hiện trạng."""
    texts = ["Mở tài khoản thanh toán tại ngân hàng cho doanh nghiệp trước giải ngân (không chặn trình)",
             "Bổ sung lịch trả nợ dự phóng để tính DSCR trước giải ngân (không chặn trình)",
             "Bổ sung thông tin người đại diện pháp luật vào hồ sơ trước giải ngân (không chặn trình)"]
    v, rep = _approve(texts)
    items = proposals.derive(v, [], rep)
    conds = [p["params"]["text"] for p in items if p["kind"] == "add_disbursement_condition"]
    assert len(conds) == len(texts) == len(items)
    assert all(c[:1].isupper() and "chưa có trong hồ sơ" not in c for c in conds)


def test_customer_request_excludes_internal_tasks_status_and_repeats():
    """T09/T11 (chấm lần 11): thẻ gửi khách không lẫn việc nội bộ, câu hiện trạng, vế chung chung hay mục lặp."""
    got = proposals.customer_items([
        "Xác nhận giới hạn tập trung ngành theo cấu hình Rủi ro trước khi cấp tín dụng",
        "Phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)",
        "Bổ sung chứng thư định giá hợp lệ và hoàn tất xác minh tài sản",
        "Hạn mức bảo đảm hiện tính bằng 0 do chưa có giá trị định giá đủ điều kiện",
        "Yêu cầu bổ sung hồ sơ định giá trước khi áp dụng LTV",
        "Đối chiếu thời hạn hiệu lực CIC tại ngày trình phê duyệt",
        "Bổ sung BCTC kiểm toán theo yêu cầu; trình Cấp 2 Hội sở phê duyệt.",
        "Cần hoàn thiện hồ sơ bắt buộc trước khi xem xét phê duyệt",
        "đối chiếu inflow với doanh thu theo kỳ",
        "Hạn mức có bảo đảm tối đa 0 đồng",
    ])
    assert got == [
        "Phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)",
        "Bổ sung chứng thư định giá hợp lệ và hoàn tất xác minh tài sản",
        "Đối chiếu dòng tiền vào với doanh thu theo kỳ",
    ]
    # tên tài liệu trần (không động từ) và việc khách tự làm được vẫn giữ
    assert proposals.customer_items(["Giấy phép kinh doanh", "Điều chỉnh khoản vay xuống tối đa 28 tỷ"]) == [
        "Giấy phép kinh doanh", "Điều chỉnh khoản vay xuống tối đa 28 tỷ"]


def test_same_topic_conditions_become_one_card():
    items = [{"kind": "add_disbursement_condition", "title": f"Điều kiện trước giải ngân: {t}", "params": {"text": t}}
             for t in ("Bổ sung thông tin người đại diện pháp luật vào hồ sơ trước giải ngân (không chặn trình)",
                       "Bổ sung, xác minh thông tin người đại diện và giấy tờ định danh trước giải ngân")]
    assert len(proposals.dedupe_items(items)) == 1
    flag = {"kind": "add_risk_flag", "title": "Tín dụng: CIC ghi nợ nhóm 3", "params": {"severity": "HIGH"}}
    req = {"kind": "request_documents", "title": "t", "params": {"documents": ["Bổ sung báo cáo CIC"]}}
    assert len(proposals.dedupe_items([req, flag])) == 2  # cờ rủi ro không bị gộp theo đối tượng
