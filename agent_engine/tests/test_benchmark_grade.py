"""Test bộ chấm benchmark bằng văn bản tổng hợp (không gọi LLM, không cần stack)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts" / "benchmark"))
import grade as G  # noqa: E402

CASES = json.loads((Path(__file__).resolve().parents[1] / "scripts/benchmark/cases_v1.json").read_text())


def case(cid):
    return next(c for c in CASES["cases"] if c["id"] == cid)


def test_cases_valid_shape():
    assert len(CASES["cases"]) >= 5
    for c in CASES["cases"]:
        assert c["required_findings"] and c["expected_gate"] and c["required_tools"]


def test_grade_counts_hits_false_and_gate():
    out = {"conclusion_text": "DSCR ghi 1,34 nhưng tính lại 1,445, ngưỡng 1,25. CIC nhóm 3.",
           "sources": ["RAG:CS-TD-SME/2025 §4.2 – Khả năng trả nợ", "RAG:x §9.9"],
           "tools_called": ["get_financials"], "gate": "AUTO_APPROVED"}
    g = G.grade(case("C1"), out)
    assert g["findings"]["dscr_conflict"] and g["findings"]["dscr_threshold"]
    assert not g["findings"]["audited_fs"]
    assert g["false_findings"] == ["false_cic_bad"]
    assert g["citations"]["cite_dscr"] and not g["citations"]["cite_authority"]
    assert g["invalid_citations"] == ["9.9"]
    assert g["tools_hit"] == 1 and not g["gate_ok"]


def test_evidence_quotes_not_in_conclusion_scope():
    # Chỉ văn bản kết luận được chấm phát hiện; nguồn chỉ dùng cho trích dẫn
    g = G.grade(case("C2"), {"conclusion_text": "", "sources": ["kiểm toán"], "tools_called": [], "gate": "NEEDS_INFO"})
    assert g["findings_hit"] == 0 and g["gate_ok"]


def test_summarize_mean_sd():
    base = {"findings_hit": 1, "findings_total": 2, "citations_hit": 0, "citations_total": 1,
            "tools_hit": 1, "tools_total": 1, "false_count": 0, "invalid_citations": [], "gate_ok": True}
    runs = [{"mode": "m", "case_id": "C1", "grade": base, "calls": c, "latency_s": 10.0,
             "tokens": {"total": 100}, "cost_usd": 0.01} for c in (4, 6)]
    s = G.summarize(runs)["m"]
    assert s["tool_calls"]["mean"] == 5 and round(s["tool_calls"]["sd"], 3) == 1.414
    assert s["finding_recall"]["mean"] == 0.5
