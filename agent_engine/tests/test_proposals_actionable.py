from common.schemas import Verdict, VerdictDecision as D
from gateway import proposals


def _val(conds):
    return Verdict(agent="validation", task_id="t", decision=D.APPROVE, summary="ĐỀ XUẤT PHÊ DUYỆT", conditions=conds)


def test_cau_nhan_xet_khong_sinh_de_xuat():
    conds = ["Các chỉ tiêu hiện tính được khác chưa cho thấy vi phạm ngưỡng", "KYB đạt, không có trùng danh sách đen, CIC nhóm 1",
             "Hạn mức đủ điều kiện hiện tại là 0 đồng", "Đăng ký giao dịch bảo đảm trước giải ngân",
             "Điều kiện tiên quyết trước khi trình cấp phê duyệt: BCTC kiểm toán"]
    items = proposals.derive(_val(conds), [], {"conditions": conds})
    texts = [t for it in items for t in proposals._texts(it)]
    assert not any("chưa cho thấy" in t or "KYB đạt" in t or "là 0 đồng" in t for t in texts), texts
    assert any("Đăng ký giao dịch bảo đảm" in t for t in texts)
    assert any("BCTC kiểm toán" in t for t in texts)
