from common.pii import mask, mask_text


def test_money_and_metrics_not_masked():
    for t in ["giá trị định giá=30000000000.0", "Hạn mức 80000000000 VND", "EBITDA 98000000000",
              "DSCR=1.34", "tổng 100000000000.0", "giá trị 1234567890123"]:
        assert mask_text(t) == t
    assert mask({"valuation": 30000000000.0, "note": "định giá 28000000000"})["note"] == "định giá 28000000000"


def test_identifiers_still_masked():
    assert mask_text("CCCD 079123456789") == "CCCD 079******789"
    assert mask_text("SĐT 0912345678") == "SĐT 091*****78"
    assert mask_text("liên hệ +84912345678") == "liên hệ +8491*****78"
    assert mask_text("số tài khoản: 1234567890") == "số tài khoản: 12*****90"
    assert mask({"cccd": "079123456789", "account_number": "123"}) == {"cccd": "***", "account_number": "***"}
