"""Bộ chấm tự động theo cases_v*.json. Thuần regex, không gọi LLM; dùng chung cho cả hai chế độ."""
from __future__ import annotations

import re
import statistics
from pathlib import Path
from typing import Any

CORPUS = Path(__file__).resolve().parents[2] / "rag_corpus" / "shared_cs_td_sme_2025.md"
_SEC = re.compile(r"§\s*(\d+(?:\.\d+)?)")


def valid_sections() -> set[str]:
    text = CORPUS.read_text(encoding="utf-8")
    return {m.group(1) for line in text.splitlines() if line.startswith("## ") for m in _SEC.finditer(line)}


GRADER_VERSION = "v2"
# v2: mẫu "forbidden" bị bỏ qua khi khớp nằm trong câu phủ định (v1 khớp nhầm "Blacklist không hit").
_NEG_WORDS = ("không", "chưa", "no", "false")
_NEG_AFTER = re.compile(r"^\s{0,3}(=\s*false|false|trở lên|trở xuống)", re.IGNORECASE)


def _has(pattern: str, text: str) -> bool:
    return re.search(pattern, text, re.IGNORECASE) is not None


def _is_negated(text: str, m: re.Match, pattern: str) -> bool:
    """Phủ định nếu trong đoạn khớp hoặc <=12 ký tự trước nó có không/chưa/false (trừ từ chính mẫu
    đang tìm, vd. mẫu "chưa có" thì "chưa" không tính), hoặc ngay sau có =false/false/trở lên."""
    near = text[max(0, m.start() - 12):m.end()].lower()
    words = [w for w in _NEG_WORDS if w not in pattern.lower()]
    if any(re.search(rf"\b{w}\b", near) for w in words):
        return True
    return bool(_NEG_AFTER.match(text[m.end():m.end() + 14]))


def _has_affirmed(pattern: str, text: str) -> bool:
    return any(not _is_negated(text, m, pattern) for m in re.finditer(pattern, text, re.IGNORECASE))


def grade(case: dict, out: dict) -> dict[str, Any]:
    """out: conclusion_text, sources(list[str]), gate, tools_called(list[str])."""
    text = out.get("conclusion_text", "")
    sources = " | ".join(out.get("sources", []))
    cite_pool = sources + " | " + text

    found = {f["id"]: all(_has(p, text) for p in f["all"]) for f in case["required_findings"]}
    cites = {c["id"]: _has(c["pattern"], cite_pool) for c in case["required_citations"]}
    false_hits = [f["id"] for f in case["forbidden"] if _has_affirmed(f["pattern"], text)]
    called = set(out.get("tools_called", []))
    tools = {t: t in called for t in case["required_tools"]}

    valid = valid_sections()
    cited = {m.group(1) for m in _SEC.finditer(cite_pool)}
    bad_cites = sorted(cited - valid)

    n = lambda d: sum(1 for v in d.values() if v)  # noqa: E731
    return {
        "findings": found, "findings_hit": n(found), "findings_total": len(found),
        "citations": cites, "citations_hit": n(cites), "citations_total": len(cites),
        "tools": tools, "tools_hit": n(tools), "tools_total": len(tools),
        "false_findings": false_hits, "false_count": len(false_hits),
        "invalid_citations": bad_cites,
        "grader_version": GRADER_VERSION,
        "gate": out.get("gate"), "gate_ok": out.get("gate") in case["expected_gate"],
    }


def _mean_sd(xs: list[float]) -> tuple[float | None, float | None]:
    xs = [x for x in xs if x is not None]
    if not xs:
        return None, None
    return statistics.fmean(xs), (statistics.stdev(xs) if len(xs) > 1 else 0.0)


def summarize(runs: list[dict]) -> dict[str, Any]:
    """runs: [{mode, case_id, grade, calls, latency_s, tokens, cost_usd, error}] -> trung bình ± độ lệch chuẩn."""
    out: dict[str, Any] = {}
    for mode in sorted({r["mode"] for r in runs}):
        rs = [r for r in runs if r["mode"] == mode]
        ok = [r for r in rs if not r.get("error")]
        def ratio(key_hit, key_tot):  # noqa: ANN001
            return [r["grade"][key_hit] / r["grade"][key_tot] for r in ok if r["grade"][key_tot]]
        m: dict[str, Any] = {"runs": len(rs), "errors": len(rs) - len(ok)}
        for name, series in {
            "finding_recall": ratio("findings_hit", "findings_total"),
            "citation_recall": ratio("citations_hit", "citations_total"),
            "tool_recall": ratio("tools_hit", "tools_total"),
            "false_findings": [r["grade"]["false_count"] for r in ok],
            "invalid_citations": [len(r["grade"]["invalid_citations"]) for r in ok],
            "gate_ok": [1.0 if r["grade"]["gate_ok"] else 0.0 for r in ok],
            "tool_calls": [r["calls"] for r in ok],
            "latency_s": [r["latency_s"] for r in ok],
            "total_tokens": [r["tokens"]["total"] for r in ok],
            "cost_usd": [r["cost_usd"] for r in ok],
        }.items():
            mean, sd = _mean_sd(series)
            m[name] = {"mean": mean, "sd": sd}
        out[mode] = m
    return out
