"""Báo cáo cuối hợp nhất — gộp XÁC ĐỊNH mọi phát hiện/điều kiện/trích dẫn của các chuyên gia.

Không dùng LLM: không bỏ sót, không diễn giải lại. Áp cho cả gói phê duyệt, Cần bổ sung và Từ chối.
"""
from __future__ import annotations

import re

from .schemas import Evidence, Verdict


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


_SEC = re.compile(r"§\s*(\d+(?:\.\d+)?)")
_DIEU = re.compile(r"Điều\s*(\d+)", re.IGNORECASE)


def _ref_keys(s: str) -> set[str]:
    return {f"§{m.group(1)}" for m in _SEC.finditer(s)} | {f"Điều {m.group(1)}" for m in _DIEU.finditer(s)}


def _verdict_text(v: Verdict) -> str:
    return " ".join([v.summary, *v.findings, *v.conditions])


def with_policy_evidence(v: Verdict, hits: list[dict]) -> Verdict:
    """Đính điều khoản chính sách (đoạn § của CS-TD-SME, không phải file .md) mà chuyên gia đã tra cứu VÀ kết luận
    thật sự nhắc tới (§ xuất hiện trong summary/findings/conditions): nguồn trích không phụ thuộc việc LLM có tự
    viết lại evidence hay không, nhưng không đính hàng loạt mọi điều khoản đã tra."""
    have = {_key(e.source) for e in v.evidence}
    used = _ref_keys(_verdict_text(v))
    extra = []
    for h in hits:
        if h["source"].endswith(".md") or _key(h["source"]) in have or not (_ref_keys(h["source"]) & used):
            continue
        have.add(_key(h["source"]))
        extra.append(Evidence(source=h["source"], quote=h["text"][:200]))
    return v.model_copy(update={"evidence": [*v.evidence, *extra]}) if extra else v


def _affirmed(pattern: str, text: str) -> bool:
    return any(not re.search(r"\b(không|chưa)\b", text[max(0, m.start() - 15):m.start()].casefold())
               for m in re.finditer(pattern, text, re.IGNORECASE))


def contradicted_by_tools(text: str, verified: dict | None) -> bool:
    """True nếu câu của chuyên gia khẳng định vi phạm/bắt buộc mà số Validation tự tính lại từ công cụ phủ nhận."""
    if not verified:
        return False
    exp, col, lev = verified.get("exposure"), verified.get("collateral"), verified.get("leverage")
    if exp and not exp["audit_required"] and _affirmed(
            r"(bắt buộc|phải)[^.\n]{0,30}(BCTC|báo cáo tài chính)[^.\n]{0,30}kiểm toán", text):
        return True
    if exp and exp["tier"] != "head_office" and _affirmed(r"vượt\s*100\s*tỷ", text):
        return True
    if col and col["eligible_value"] and not col["ltv_over"] and _affirmed(r"LTV[^.\n]{0,40}vượt", text):
        return True
    return bool(lev and not lev["over"] and _affirmed(r"Nợ vay\s*/\s*EBITDA[^.\n]{0,60}vượt", text))


def demote_unsupported(verdicts: dict[str, Verdict], verified: dict | None) -> tuple[dict[str, Verdict], list[str]]:
    """Bỏ khỏi phát hiện/điều kiện của chuyên gia các câu mâu thuẫn với số tính lại bằng công cụ (hạ cấp: chỉ
    liệt kê riêng trong báo cáo, không còn là phát hiện). Câu không bị công cụ phủ nhận thì giữ nguyên."""
    out, demoted = {}, []
    for name, v in verdicts.items():
        keep_f = [f for f in v.findings if not contradicted_by_tools(f, verified)]
        keep_c = [c for c in v.conditions if not contradicted_by_tools(c, verified)]
        demoted += [f"({name}) {t}" for t in [*v.findings, *v.conditions] if t not in keep_f and t not in keep_c]
        out[name] = v.model_copy(update={"findings": keep_f, "conditions": keep_c})
    return out, demoted


def merge_verdicts(verdicts: dict[str, Verdict], extra_findings: list[str] | None = None,
                   extra_conditions: list[str] | None = None, demoted: list[str] | None = None) -> dict:
    """Trả {findings, conditions, citations, summaries, text, demoted} từ các verdict chuyên gia."""
    findings = _dedup([f for v in verdicts.values() for f in v.findings] + list(extra_findings or []))
    conditions = _dedup([c for v in verdicts.values() for c in v.conditions] + list(extra_conditions or []))
    summaries = {name: f"[{v.decision.value}] {v.summary}" for name, v in verdicts.items()}
    body = " ".join([*summaries.values(), *findings, *conditions, *(demoted or [])])
    used = _ref_keys(body)
    cites: list[dict] = []
    seen: set[str] = set()
    for name, v in verdicts.items():
        for e in v.evidence:
            refs = _ref_keys(e.source)
            if refs and not (refs & used):  # điều khoản chính sách mà kết luận không nhắc tới: không liệt kê
                continue
            k = _key(e.source)
            if k not in seen:  # một dòng cho mỗi nguồn
                seen.add(k)
                cites.append({"agent": name, "source": e.source, "quote": e.quote[:160]})
    lines = [f"{name}: {s}" for name, s in summaries.items()]
    if findings:
        lines.append("Phát hiện:\n" + "\n".join(f"- {f}" for f in findings))
    if conditions:
        lines.append("Điều kiện:\n" + "\n".join(f"- {c}" for c in conditions))
    if demoted:
        lines.append("Đã hạ cấp (mâu thuẫn số công cụ tính lại, không phải phát hiện):\n"
                     + "\n".join(f"- {d}" for d in demoted))
    if cites:
        lines.append("Trích dẫn:\n" + "\n".join(f"- ({c['agent']}) {c['source']}: {c['quote']}" for c in cites))
    return {"findings": findings, "conditions": conditions, "citations": cites,
            "summaries": summaries, "demoted": list(demoted or []), "text": "\n".join(lines)}
