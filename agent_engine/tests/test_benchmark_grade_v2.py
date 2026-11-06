"""Bộ chấm v2: không khớp nhầm câu phủ định (các câu thật lấy từ kết quả v1 llm); cases_v2 hợp lệ."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "benchmark"))
import grade as G  # noqa: E402

CASES = json.loads((Path(__file__).resolve().parents[1] / "scripts/benchmark/cases_v2.json").read_text())


def forbidden(cid, text):
    c = next(c for c in CASES["cases"] if c["id"] == cid)
    return G.grade(c, {"conclusion_text": text, "sources": [], "tools_called": [], "gate": None})["false_findings"]


def test_negated_sentences_not_false_findings():
    assert forbidden("C1", "Blacklist không hit, hit=false.") == []
    assert forbidden("C1", "Yêu cầu CIC nhóm 3 trở lên không đủ điều kiện.") == []
    assert forbidden("C1", "Danh sách đen: hit=false.") == []
    assert forbidden("C3", "Chưa có EBITDA dương, hạn mức dương không áp dụng.") == []
    assert forbidden("C4", "KYC VERIFIED nhưng thiếu tên người đại diện pháp luật.") == []


def test_real_false_findings_still_caught():
    assert forbidden("C1", "CIC nhóm 3, khách bị trễ hạn.") == ["false_cic_bad"]
    assert forbidden("C1", "Khách có tên trong blacklist (trùng tên).") == ["false_blacklist"]
    assert "false_kyc_unverified" in forbidden("C4", "KYC chưa được xác minh.")
    assert "false_ebitda_positive" in forbidden("C3", "EBITDA 2025 dương và ổn định.")


def test_cases_v2_shape():
    ids = [c["id"] for c in CASES["cases"]]
    assert ids[:5] == ["C1", "C2", "C3", "C4", "C5"] and len(ids) >= 10
    for c in CASES["cases"]:
        assert c["required_findings"] and c["expected_gate"] and c["required_tools"]
    for cid in ("C3", "C5"):  # không TSBĐ -> không bắt get_collateral
        assert "get_collateral" not in next(c for c in CASES["cases"] if c["id"] == cid)["required_tools"]
