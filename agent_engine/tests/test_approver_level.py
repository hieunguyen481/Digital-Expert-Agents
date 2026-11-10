"""B1 (QA4): cấp duyệt lấy một nguồn từ tổng cấp tín dụng (Q4), khớp `credit.required_tier` của backend."""
from common import recompute as rc

T = 1e9


def test_total_exactly_20_ty_is_branch():
    assert rc.package_approver_level(rc.exposure_check([], 15 * T, 5 * T), 15 * T) == "branch_director"


def test_total_above_20_ty_is_head_office_l2():
    assert rc.approver_level(20 * T + 1) == "head_office_l2"
    assert rc.package_approver_level(rc.exposure_check([], 15 * T, 8 * T), 15 * T) == "head_office_l2"


def test_total_exactly_100_ty_is_head_office_l2_above_is_head_office():
    assert rc.approver_level(100 * T) == "head_office_l2"
    assert rc.approver_level(100 * T + 1) == "council"


def test_existing_loans_push_small_request_up_a_tier():
    exp = rc.exposure_check([], 15 * T, 70 * T)
    assert rc.package_approver_level(exp, 15 * T) == "head_office_l2"


def test_missing_exposure_falls_back_to_limit():
    assert rc.package_approver_level(None, 15 * T) == "branch_director"
    assert rc.package_approver_level(None, 120 * T) == "council"
