"""QA3-06/07: chữ và số tiếng Việt, không mã thô."""

from app.services.submission_service import _vn_int
from app.workflow.conditions import _DOC_NAMES


def test_vn_int_uses_dot_thousands_separator() -> None:
    assert _vn_int(1500) == "1.500"
    assert _vn_int(500) == "500"
    assert _vn_int(1_234_567) == "1.234.567"


def test_every_sme_checklist_code_has_vietnamese_name() -> None:
    assert len(_DOC_NAMES) == 16
    assert all(not name.startswith("SME-") for name in _DOC_NAMES.values())
