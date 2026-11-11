from common.report import join_clauses


def test_join_clauses_khong_sinh_dau_cau_kep():
    out = join_clauses(["Bổ sung tờ khai thuế.", "Thế chấp thêm;", "  Giải trình dòng tiền.. "])
    assert out == "Bổ sung tờ khai thuế; Thế chấp thêm; Giải trình dòng tiền"
    assert ".;" not in out and ".." not in out


def test_join_clauses_bo_y_rong():
    assert join_clauses(["", "  ", "A."]) == "A"
