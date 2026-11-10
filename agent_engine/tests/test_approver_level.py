"""B1 (QA4): cấp duyệt lấy một nguồn từ tổng cấp tín dụng (Q4), khớp `credit.required_tier` của backend."""
from common import recompute as rc

T = 1e9


def test_total_exactly_20_ty_is_branch():
    assert rc.package_approver_level(rc.exposure_check([{"outstanding": 5 * T}], 15 * T), 15 * T) == "branch_director"


def test_total_above_20_ty_is_regional():
    assert rc.approver_level(20 * T + 1) == "regional"
    assert rc.package_approver_level(rc.exposure_check([{"outstanding": 8 * T}], 15 * T), 15 * T) == "regional"


def test_total_exactly_100_ty_is_regional_above_is_head_office():
    assert rc.approver_level(100 * T) == "regional"
    assert rc.approver_level(100 * T + 1) == "head_office"


def test_existing_loans_push_small_request_up_a_tier():
    exp = rc.exposure_check([{"outstanding": 70 * T}], 15 * T)
    assert rc.package_approver_level(exp, 15 * T) == "regional"


def test_missing_exposure_falls_back_to_limit():
    assert rc.package_approver_level(None, 15 * T) == "branch_director"
    assert rc.package_approver_level(None, 120 * T) == "head_office"
