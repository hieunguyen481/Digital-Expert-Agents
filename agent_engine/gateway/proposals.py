"""Đề xuất hành động ghi của đội agent (V049) — agent chỉ ĐỀ XUẤT, kèm căn cứ.

Ba loại: ghi cờ rủi ro, yêu cầu bổ sung tài liệu (kèm danh sách), điều kiện trước giải ngân. Hàm ở đây chỉ dựng
đề xuất từ kết luận cuối của đội agent; việc thực hiện nằm ở `main.py` sau xác nhận của người có thẩm quyền.
"""
from __future__ import annotations

import re

from common import gate
from common.schemas import Verdict, VerdictDecision

MAX_DOCUMENTS = 8
_LABEL = {"credit": "Tín dụng", "compliance": "Tuân thủ", "operations": "Vận hành", "validation": "Thẩm định chéo"}


# Nghiệp vụ: tài liệu/dữ liệu cần để RA quyết định (BCTC kiểm toán khi tổng cấp tín dụng > 20 tỷ, dữ liệu DSCR, đối soát
# dư nợ/inflow/CIC...) là yêu cầu bổ sung; việc chỉ ràng buộc giai đoạn giải ngân là điều kiện trước giải ngân (Q-V, Q7).
_EXPLICIT_STAGE = re.compile(r"không chặn", re.I)  # đội agent tự nêu "không chặn trình": điều kiện giải ngân đúng nghĩa
_DECISION_ANCHOR = re.compile(
    r"trước (?:khi )?(?:trình|phê duyệt|quyết định|duyệt|xem xét|thẩm định|chốt)|bắt buộc|chưa thể|"
    r"trước khi (?:tính|xác định|hoàn tất thẩm định)|để (?:xác định|tính)|ltv|hạn mức (?:có )?bảo đảm|"
    r"kiểm toán|dscr|ebitda|inflow|doanh thu|dư nợ|tctd|cic|ngành|tập trung|đối soát|đối chiếu|xác minh số liệu|chênh lệch", re.I)
_STAGE_ACTION = re.compile(
    r"hợp đồng|mở tài khoản|công chứng|đăng ký giao dịch bảo đảm|bảo hiểm|giải ngân (?:từng đợt|theo tiến độ)|"
    r"sử dụng vốn|trước khi (?:nhận|rút) vốn", re.I)
_STAGE_BOUND = re.compile(
    r"trước (?:khi )?giải ngân|(?:pháp lý|định giá|đăng ký)[^.;]{0,40}(?:tsđb|tài sản bảo đảm)|người đại diện", re.I)
# Vế không có tín hiệu rõ ở trên: còn động từ bổ sung/xác minh thì coi là việc trước quyết định (như trước đây), không thì
# giữ là điều kiện. Phần chưa rõ nghiệp vụ này đã nêu ở handback.
_GENERIC_REQUEST = re.compile(r"xác minh|bổ sung|cung cấp|nộp|đối soát|đối chiếu|hoàn thiện|hoàn tất|chưa có|thiếu", re.I)


# Điều kiện do mã dựng (cổng, công cụ) có dấu hiệu riêng dù không mở đầu bằng động từ: vẫn giữ
_TOOL_CONDITION = re.compile(r"tiên quyết|bắt buộc|không chặn|trước (?:khi )?giải ngân|trước khi trình", re.I)


def is_actionable(text: str) -> bool:
    """Chỉ VIỆC PHẢI LÀM mới thành đề xuất hành động; câu nhận xét/kết luận/hiện trạng số liệu thì không."""
    return gate.is_action(text) or bool(_TOOL_CONDITION.search(text))


def is_disbursement_condition(text: str) -> bool:
    """Vế chỉ ràng buộc giai đoạn giải ngân: nêu rõ "không chặn trình", hoặc hành vi giai đoạn giải ngân (ký hợp đồng,
    mở tài khoản, công chứng, đăng ký giao dịch bảo đảm, bảo hiểm...), hoặc việc gắn "trước giải ngân" (hoàn thiện
    pháp lý/định giá TSĐB, thông tin người đại diện) mà không phải dữ liệu để ra quyết định. Còn lại là yêu cầu bổ sung."""
    if _EXPLICIT_STAGE.search(text):
        return True
    if _DECISION_ANCHOR.search(text):
        return False
    if _STAGE_ACTION.search(text) or _STAGE_BOUND.search(text):
        return True
    return not _GENERIC_REQUEST.search(text)


def is_pre_decision(text: str) -> bool:
    return not is_disbursement_condition(text)


# "Yêu cầu khách bổ sung" chỉ gồm thứ KHÁCH nộp/giải trình được (rules.md Q6, F6). Việc nội bộ của ngân hàng (trình cấp
# phê duyệt, tra CIC/AML — F5: ngân hàng tự tra lại, đối chiếu hạn mức do Rủi ro cấu hình) và câu hiện trạng không vào thẻ;
# chúng vẫn nằm nguyên trong báo cáo cuối của đội agent.
_INTERNAL = re.compile(
    r"^\s*(?:đề nghị\s+)?trình\b|cấu hình|bộ phận rủi ro|\bcic\b|\baml\b|sàng lọc|danh sách đen|"
    r"^\s*(?:xác nhận|kiểm tra|đối chiếu)\s+(?:giới hạn|hạn mức|mức độ)\s+tập trung ngành", re.I)
_TAIL_INTERNAL = re.compile(r"\s*(?:,|và)\s+(?:đề nghị\s+)?trình\s+cấp\b.*$", re.I)
_ASK = (r"bổ sung|cung cấp|nộp|giải trình|làm rõ|hoàn thiện|hoàn tất|xác minh|xác nhận|đối chiếu|đối soát|cập nhật|"
        r"điều chỉnh|giảm")
_LEAD_FILLER = re.compile(r"^\s*(?:(?:yêu cầu|đề nghị)\s+(?:khách\s+(?:hàng\s+)?)?|(?:cần|nên)\s+)(?=" + _ASK + r")", re.I)
_CUSTOMER_LEAD = re.compile(r"^(?:phải có|" + _ASK + r")\b", re.I)
_STATUS = re.compile(r"\b(?:hiện|còn chờ|chưa|chỉ (?:tính|ghi nhận)|đồng thời|bằng 0|tối đa|đang|đã|là|không)\b|^\s*nếu\b", re.I)
_VAGUE = re.compile(
    r"(?:hồ sơ|dữ liệu|thông tin|tài liệu|đối chiếu)\s+(?:bắt buộc|chặn|trọng yếu|cần thiết|còn thiếu)\b(?!\s*(?:gồm|như|:))|"
    r"^(?:bổ sung|hoàn thiện|cung cấp)\s+(?:hồ sơ|dữ liệu|thông tin|tài liệu)(?:\s+(?:trước|để)\b|$)", re.I)


def customer_items(texts: list[str]) -> list[str]:
    """Chuẩn hóa danh sách gửi khách: tách vế ghép bằng ';', bỏ việc nội bộ, câu hiện trạng và vế chung chung không nêu
    thứ cần nộp; mỗi mục viết hoa đầu câu, không lặp."""
    out: list[str] = []
    for raw in texts:
        for part in re.split(r";\s+", raw):
            t = _TAIL_INTERNAL.sub("", part.strip(" .")).strip(" .")
            t = _LEAD_FILLER.sub("", t)
            t = re.sub(r"\binflow\b", "dòng tiền vào", t, flags=re.I)
            if not t or _INTERNAL.search(t) or _VAGUE.search(t):
                continue
            if not _CUSTOMER_LEAD.match(t) and _STATUS.search(t):
                continue  # câu hiện trạng/nhận xét ("Hạn mức bảo đảm hiện tính bằng 0...", "Định giá còn chờ xác minh")
            t = t[:1].upper() + t[1:]
            if not same_task(t, out):
                out.append(t)
    return out


_STOP = {"và", "của", "các", "cho", "khi", "là", "có", "được", "theo", "bổ", "sung", "cung", "cấp", "hoàn", "thiện", "nộp",
         "xác", "minh", "đối", "soát", "chiếu", "trước", "giải", "ngân",
         # chữ khung của câu điều kiện (không nói về đối tượng): "thông tin ... hoàn tất", "(không chặn trình)", "chưa có trong hồ sơ"
         "thông", "tin", "tất", "không", "chặn", "chưa", "trong", "hồ", "sơ"}


def _tokens(t: str) -> set[str]:
    return set(re.findall(r"\w+", t.casefold())) - _STOP


def similar(a: str, b: str, thr: float = 0.7) -> bool:
    """Cùng một việc được diễn đạt khác chữ (Jaccard theo từ >= ngưỡng, hoặc câu ngắn nằm gọn trong câu dài)."""
    ta, tb = _tokens(a), _tokens(b)
    if not (ta and tb):
        return False
    inter = len(ta & tb)
    return inter / len(ta | tb) >= thr or (inter >= 3 and inter / min(len(ta), len(tb)) >= 0.6)


# Cùng một đối tượng nghiệp vụ thì là cùng một việc dù viết khác chữ ("chứng thư định giá" / "hồ sơ định giá").
_TOPICS = {"người đại diện": r"người đại diện", "định giá": r"định giá", "kiểm toán": r"kiểm toán",
           "lịch trả nợ": r"lịch trả nợ", "tài khoản thanh toán": r"tài khoản thanh toán",
           "dòng tiền/doanh thu": r"(?:dòng tiền vào|inflow)[^.;]*doanh thu|doanh thu[^.;]*(?:dòng tiền vào|inflow)",
           "tập trung ngành": r"tập trung ngành", "cic": r"\bcic\b"}
_TOPIC_RE = {k: re.compile(v, re.I) for k, v in _TOPICS.items()}


def _topics(t: str) -> set[str]:
    return {k for k, rx in _TOPIC_RE.items() if rx.search(t)}


def same_task(text: str, seen: list[str], thr: float = 0.7) -> bool:
    """`text` đã có trong `seen`: gần giống chữ với một mục, hoặc mọi đối tượng nó nêu đều đã được các mục trước nêu."""
    if any(similar(text, k, thr) for k in seen):
        return True
    tp = _topics(text)
    return bool(tp) and tp <= {x for k in seen for x in _topics(k)}


def _evidence(v: Verdict, n: int = 4) -> list[dict]:
    return [{"source": e.source, "quote": e.quote[:300]} for e in v.evidence[:n]]


_CAPS_LEAD = re.compile(r"^\s*([A-ZÀ-ỴĐ][A-ZÀ-ỴĐ/ ]{3,}[A-ZÀ-ỴĐ]):\s*")
RATIONALE_MAX = 320


def plain_rationale(text: str, limit: int = RATIONALE_MAX) -> str:
    """Căn cứ viết như người: bỏ nhãn cổng viết hoa ("CẦN BỔ SUNG: thiếu dữ liệu chặn — ..."), gọn, cắt ở ranh giới vế."""
    t = (text or "").strip()
    m = _CAPS_LEAD.match(t)
    if m:
        t = t[m.end():]
    t = t.replace(" — ", ": ", 1) if t[:1].islower() or t.startswith("thiếu") else t
    t = (t[:1].upper() + t[1:]) if t else t
    if len(t) <= limit:
        return t
    cut = t[:limit]
    for sep in ("; ", ". "):
        i = cut.rfind(sep)
        if i > limit // 2:
            return cut[:i].rstrip(" ;.") + " …"
    return cut.rstrip() + " …"


def _expert_evidence(v: Verdict, n: int = 3) -> list[dict]:
    """Căn cứ của đề xuất do Validation đưa ra: bỏ các dòng nhật ký kiểm chứng chung (lặp ở mọi thẻ), giữ điều khoản/công cụ."""
    return [{"source": e.source, "quote": e.quote[:300]} for e in v.evidence if e.source != "validation"][:n]


def _texts(it: dict) -> list[str]:
    """Các nội dung độc lập của một đề xuất: từng tài liệu (request_documents), điều kiện, hoặc tiêu đề."""
    pr = it.get("params") or {}
    if isinstance(pr, str):
        import json
        pr = json.loads(pr)
    return list(pr.get("documents") or []) or [pr.get("text") or it.get("title", "")]


def _strip(text: str) -> str:
    return re.sub(r"^[^:]{0,40}:\s*", "", text)  # bỏ tiền tố "Tín dụng:", "Điều kiện trước giải ngân:"


def dedupe_items(items: list[dict], have: list[dict] | None = None) -> list[dict]:
    """Mỗi nội dung một thẻ: bỏ nội dung trùng (khác chữ, khác loại) với thẻ đứng trước trong cùng lượt và với
    đề xuất đã có (`have`: dict kind/title/params/status). Thứ tự ưu tiên: yêu cầu bổ sung > điều kiện > cờ rủi ro."""
    rank = {"request_documents": 0, "add_disbursement_condition": 1, "add_risk_flag": 2}
    seen = [_strip(t) for h in (have or []) for t in _texts(h)]
    seen_cond = [_strip(t) for h in (have or []) if h.get("kind") == "add_disbursement_condition" for t in _texts(h)]
    out: list[dict] = []
    for it in sorted(items, key=lambda x: rank.get(x["kind"], 3)):
        texts = _texts(it)
        # điều kiện giải ngân đội agent nêu rõ "không chặn trình" không bị nuốt bởi yêu cầu bổ sung nói gần giống
        ref = seen_cond if it["kind"] == "add_disbursement_condition" and all(_EXPLICIT_STAGE.search(t) for t in texts) else seen
        dup = (lambda t: any(similar(_strip(t), k, 0.6) for k in ref)) if it["kind"] == "add_risk_flag" \
            else (lambda t: same_task(_strip(t), ref, 0.6))  # cờ rủi ro là nhận định, không gộp theo đối tượng
        fresh = [t for t in texts if not dup(t)]
        if not fresh:
            continue
        if it["kind"] == "request_documents" and len(fresh) != len(texts):
            it = {**it, "params": {**it["params"], "documents": fresh},
                  "title": f"Yêu cầu khách bổ sung {len(fresh)} mục"}
        seen += [_strip(t) for t in fresh]
        if it["kind"] == "add_disbursement_condition":
            seen_cond += [_strip(t) for t in fresh]
        out.append(it)
    return out


def derive(validation: Verdict, final_verdicts: list[Verdict], report: dict) -> list[dict]:
    """Danh sách đề xuất (dict) từ kết luận cuối; rỗng nếu không có căn cứ."""
    out: list[dict] = []
    for v in final_verdicts:
        if v.agent == "validation" or v.decision not in (VerdictDecision.FLAG, VerdictDecision.REJECT):
            continue
        if v.summary.startswith(gate.NON_BLOCKING):
            continue  # phần còn thiếu đã nêu thành điều kiện/yêu cầu bổ sung của báo cáo cuối, không lặp thành cờ rủi ro
        evidence, why = _evidence(v), "; ".join(v.findings[:3]) or v.summary
        if not evidence and not v.findings:
            continue  # không có căn cứ thì không đề xuất
        label = _LABEL.get(v.agent, v.agent)
        out.append({"kind": "add_risk_flag", "source_agent": v.agent, "evidence": evidence,
                    "title": f"{label}: {v.summary[:200]}", "rationale": plain_rationale(why),
                    "params": {"severity": "HIGH" if v.decision == VerdictDecision.REJECT else "MEDIUM"}})

    if validation.decision == VerdictDecision.NEED_MORE_INFO:
        docs: list[str] = []
        evidence: list[dict] = []
        for v in final_verdicts:
            if v.decision == VerdictDecision.NEED_MORE_INFO:
                docs += [c for c in v.conditions if c not in docs]
                evidence += _evidence(v, 2)
        docs = customer_items(docs)[:MAX_DOCUMENTS]
        if docs:
            out.append({"kind": "request_documents", "source_agent": "validation", "evidence": evidence[:6],
                        "title": f"Yêu cầu khách bổ sung {len(docs)} mục",
                        "rationale": plain_rationale(validation.summary), "params": {"documents": docs}})

    if validation.decision == VerdictDecision.APPROVE:
        # điều kiện bắt buộc (vd. Q-V thiếu TK thanh toán) không bị cắt: mỗi điều kiện khác nhau là một đề xuất
        conds: list[str] = []
        parts = [p.strip(" .") for c in dict.fromkeys(report.get("conditions") or []) for p in re.split(r";\s+", c) if p.strip(" .")]
        for c in dict.fromkeys(p for p in parts if is_actionable(p)):
            if not same_task(c, conds):
                conds.append(c)
        pre_raw = [c for c in conds if is_pre_decision(c)]  # chưa gộp với yêu cầu bổ sung của chuyên gia: dedupe_items lo
        pre = customer_items(pre_raw)
        if pre:  # việc phải làm trước quyết định: yêu cầu bổ sung (người dùng xác nhận gửi khách), không phải điều kiện giải ngân
            out.append({"kind": "request_documents", "source_agent": "validation", "evidence": _expert_evidence(validation, 3),
                        "title": f"Yêu cầu khách bổ sung {len(pre[:MAX_DOCUMENTS])} mục",
                        "rationale": "Điều kiện tiên quyết: phải hoàn tất trước khi trình cấp phê duyệt (khác điều kiện trước giải ngân); nêu trong báo cáo cuối của đội agent.",
                        "params": {"documents": pre[:MAX_DOCUMENTS]}})
        for cond in (c for c in conds if c not in pre_raw):
            out.append({"kind": "add_disbursement_condition", "source_agent": "validation",
                        "evidence": _expert_evidence(validation, 3),
                        "title": f"Điều kiện trước giải ngân: {cond[:140]}",
                        "rationale": "Điều kiện nêu trong báo cáo cuối của đội agent khi đề xuất phê duyệt.",
                        "params": {"text": cond}})
    return dedupe_items(out)
