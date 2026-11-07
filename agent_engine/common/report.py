"""Báo cáo cuối hợp nhất — gộp XÁC ĐỊNH mọi phát hiện/điều kiện/trích dẫn của các chuyên gia.

Không dùng LLM: không bỏ sót, không diễn giải lại. Áp cho cả gói phê duyệt, Cần bổ sung và Từ chối.
"""
from __future__ import annotations

import re

from .schemas import Verdict


def _key(s: str) -> str:
    return re.sub(r"\W+", " ", s.casefold()).strip()


def _dedup(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out = []
    for s in items:
        k = _key(s)
        if s and k not in seen:
            seen.add(k)
            out.append(s)
    return out


def merge_verdicts(verdicts: dict[str, Verdict], extra_findings: list[str] | None = None,
                   extra_conditions: list[str] | None = None) -> dict:
    """Trả {findings, conditions, citations, summaries, text} từ các verdict chuyên gia."""
    findings = _dedup([f for v in verdicts.values() for f in v.findings] + list(extra_findings or []))
    conditions = _dedup([c for v in verdicts.values() for c in v.conditions] + list(extra_conditions or []))
    cites: list[dict] = []
    seen: set[str] = set()
    for name, v in verdicts.items():
        for e in v.evidence:
            k = _key(f"{e.source} {e.quote}")[:200]
            if k not in seen:
                seen.add(k)
                cites.append({"agent": name, "source": e.source, "quote": e.quote})
    summaries = {name: f"[{v.decision.value}] {v.summary}" for name, v in verdicts.items()}
    lines = [f"{name}: {s}" for name, s in summaries.items()]
    if findings:
        lines.append("Phát hiện:\n" + "\n".join(f"- {f}" for f in findings))
    if conditions:
        lines.append("Điều kiện:\n" + "\n".join(f"- {c}" for c in conditions))
    if cites:
        lines.append("Trích dẫn:\n" + "\n".join(f"- ({c['agent']}) {c['source']}: {c['quote']}" for c in cites))
    return {"findings": findings, "conditions": conditions, "citations": cites,
            "summaries": summaries, "text": "\n".join(lines)}
