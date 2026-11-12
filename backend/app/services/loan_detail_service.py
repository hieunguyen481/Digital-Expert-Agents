"""Trang 02b "Chi tiết hồ sơ vay", phần đọc (lát 10).

Mỗi chỉ số là một trường trích xuất có tài liệu và trang nguồn (không có nguồn thì không hiện, không tự tính).
Ngưỡng lấy từ điều khoản chính sách CS-TD-SME/2025 trong database. DSCR có 2 giá trị (khai báo và tính lại) khi
có mâu thuẫn mở ở trang 05; nguồn đã chốt (nếu có) kèm người chốt và lý do.
AI chỉ đề xuất: nhãn trạng thái của trường đi nguyên theo dữ liệu.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from app.exceptions import NotFoundError
from app.repositories.loan_detail_repository import LoanDetailRepository
from app.services.protocols import PrincipalLike

# code trường -> (tên hiển thị, đơn vị, khóa ngưỡng, so sánh, điều khoản)
METRICS: dict[str, tuple[str, str, str | None, str | None, str | None]] = {
    "dscr": ("DSCR dự phóng", "lần", "dscr_min", ">=", "4.2"),
    "dti": ("Nợ vay/EBITDA sau cấp TD", "lần", "debt_to_ebitda_max", "<=", "4.2"),
    "icr": ("EBIT/Chi phí lãi vay", "lần", "ebit_interest_min", ">=", "4.2"),
    "dso": ("Kỳ thu tiền bình quân", "ngày", "dso_max_days", "<=", "4.4"),
    "ltv": ("LTV – dư nợ/giá trị xử lý TSBĐ", "%", None, None, None),
    "de": ("Nợ phải trả/VCSH", "lần", None, None, None),
    "cr": ("Thanh toán hiện hành", "lần", None, None, None),
    "qr": ("Thanh toán nhanh", "lần", None, None, None),
}
# Giá trị "tính lại" của một chỉ số, cùng một tài liệu, nằm trong mâu thuẫn mở cùng mã chỉ số (trang 05).
RECOMPUTED = {"dscr": "dscr_ebitda128"}
# Q-M: QHKH và HTTD không đọc nội dung kết luận AML/gian lận.
COMPLIANCE_READERS = frozenset({"compliance_officer", "risk_officer", "loan_approver", "auditor", "credit_appraiser"})


def _source(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "field_id": row["field_id"], "document_id": row["document_id"], "document_title": row["document_title"],
        "page_number": row["page_number"], "source_type": row["source_type"],
        "verification_status": row["verification_status"], "value_text": row["value_text"],
        "value_number": None if row["value_number"] is None else float(row["value_number"]),
        "note": row["verification_reason"], "verified_by_name": row["verified_by_name"],
        "verified_at": row["verified_at"],
    }


def _result(value: float | None, op: str | None, limit: float | None) -> str | None:
    if value is None or op is None or limit is None:
        return None
    ok = value >= limit if op == ">=" else value <= limit
    return "PASS" if ok else "FAIL"


class LoanDetailService:
    def __init__(self, repository: LoanDetailRepository) -> None:
        self._repo = repository

    async def overview(self, principal: PrincipalLike, loan_id: UUID) -> dict[str, Any]:
        loan = await self._repo.loan(loan_id)
        if loan is None:
            # C-N5: chuông cũ trỏ tới hồ sơ đã chuyển đi; chỉ cho biết đã chuyển, không lộ nội dung.
            if await self._repo.had_notification(loan_id):
                raise NotFoundError("LOAN_REASSIGNED", "Hồ sơ đã chuyển cho người khác.")
            raise NotFoundError("LOAN_NOT_FOUND", "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.")
        names = list(METRICS) + list(RECOMPUTED.values())
        fields = [dict(r) for r in await self._repo.metric_fields(loan_id, names)]
        by_id = {f["field_id"]: f for f in fields}
        conflicts = {c["code"]: dict(c) for c in await self._repo.conflicts(loan_id)}
        clauses = sorted({m[4] for m in METRICS.values() if m[4]})
        limits = {c["clause_number"]: c["metadata"] or {} for c in await self._repo.thresholds(clauses)}
        metrics = []
        for code, (label, unit, key, op, clause) in METRICS.items():
            declared = next((f for f in fields if f["field_name"] == code), None)
            if declared is None:  # không có nguồn thì không hiện
                continue
            limit = None if key is None else limits.get(clause or "", {}).get(key)
            limit = None if limit is None else float(limit)
            recomputed = next((f for f in fields if f["field_name"] == RECOMPUTED.get(code)), None)
            conflict = conflicts.get(code)
            chosen = None
            if conflict and conflict["chosen_field_id"] in by_id:
                chosen = {"field_id": conflict["chosen_field_id"], "reason": conflict["resolution_reason"],
                          "resolved_by_name": conflict["resolved_by_name"], "resolved_at": conflict["resolved_at"]}
            values = [("DECLARED", declared)] + ([("RECOMPUTED", recomputed)] if recomputed else [])
            metrics.append({
                "code": code, "label": label, "unit": unit, "clause": clause,
                "threshold": None if limit is None else {"op": op, "value": limit},
                "conflict_id": conflict["conflict_id"] if conflict and recomputed else None,
                "chosen": chosen if recomputed else None,
                "values": [
                    {"kind": kind, "result": _result(None if src["value_number"] is None else float(src["value_number"]), op, limit),
                     **_source(src)}
                    for kind, src in values
                ],
            })
        roles = set(getattr(principal, "roles", ()))
        see_compliance = bool(roles & COMPLIANCE_READERS) and not getattr(principal, "is_admin", False)
        flags = []
        for f in await self._repo.flags(loan_id):
            row = dict(f)
            if not see_compliance:
                row["compliance_conclusion"] = row["compliance_reason"] = None
            flags.append(row)
        timeline = [dict(s) for s in await self._repo.steps(loan_id)]
        return {
            "loan": dict(loan), "metrics": metrics, "flags": flags,
            "collaterals": [dict(c) for c in await self._repo.collaterals(loan_id)],
            "timeline": timeline,
            "supplement_request": supplement_request(dict(loan).get("status"), timeline),
        }


_SUPPLEMENT_STEPS = {"PENDING_INFO", "RISK_PENDING_INFO"}
_RESTRICTED_EXPLANATION_TEXT = "Tuân thủ yêu cầu giải trình. Nội dung chi tiết do Tuân thủ trao đổi trực tiếp."


def supplement_request(status: Any, timeline: list[dict[str, Any]]) -> dict[str, Any] | None:
    """E2: QHKH thấy nội dung cần bổ sung / lý do trả lại ngay trên hồ sơ.

    Lý do nằm ở chính bước mới mở (PENDING_INFO / RM_REWORK, V056). Hồ sơ cũ chưa có thì
    lùi về lý do của bước chính đã đóng gần nhất.
    """
    status_text = str(status or "")
    if status_text == "RETURNED_TO_RM":
        opened = next((s for s in reversed(timeline) if s["step_code"] == "RM_REWORK" and not s["completed_at"]), None)
        kind = "RETURNED"
    elif status_text.endswith("_PENDING_INFO"):
        opened = next(
            (s for s in reversed(timeline) if s["step_code"] in _SUPPLEMENT_STEPS and not s["completed_at"]), None
        )
        kind = "SUPPLEMENT"
    elif status_text == "APPRAISAL":
        # C-N6: Rủi ro/Phê duyệt trả lại bổ sung về Thẩm định; lý do nằm ở bước vừa bị trả.
        opened = next((s for s in reversed(timeline) if s["step_code"] == "APPRAISAL" and not s["completed_at"]), None)
        returned = None
        if opened is not None:
            closed = [
                s for s in timeline
                if s["completed_at"] and s["completed_at"] <= opened["received_at"]
                and s["step_code"] not in _SUPPLEMENT_STEPS
            ]
            closed.sort(key=lambda s: s["completed_at"])
            returned = closed[-1] if closed else None
        if opened is None or returned is None or returned.get("result") not in {"RETURNED", "RETURN_FOR_SUPPLEMENT"}:
            return None
        return {
            "kind": "RETURNED_TO_APPRAISAL",
            "reason": returned.get("reason"),
            "requested_at": opened["received_at"],
            "due_at": opened["due_at"],
        }
    else:
        return None
    if opened is None:
        return None
    reason = opened.get("reason")
    if not reason and opened.get("reason_restricted"):
        # Lý do bước này bị che với vai người xem (Q-M): không lùi về lý do cũ của bước khác, nói trung tính.
        reason = _RESTRICTED_EXPLANATION_TEXT if opened["step_code"] == "RISK_PENDING_INFO" else None
    elif not reason:
        before = [
            s for s in timeline
            if s["completed_at"] and s["step_code"] not in _SUPPLEMENT_STEPS and s["received_at"] <= opened["received_at"]
            and s.get("reason")
        ]
        reason = before[-1]["reason"] if before else None
    return {
        "kind": kind,
        "reason": reason,
        "requested_at": opened["received_at"],
        "due_at": opened["due_at"],
    }
