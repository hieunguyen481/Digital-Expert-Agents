"""Tài liệu đính kèm, văn bản đồng ý và tra cứu CIC của trang 04 (lát 6)."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date
from typing import Any, Protocol
from uuid import UUID

from app.exceptions import ConflictError
from app.providers.cic_simulated import LABEL, SOURCE, CicNoDataError, simulate_lookup
from app.services.access import require_permission
from app.services.protocols import PrincipalLike
from app.services.proposal_service import ProposalService
from app.workflow import validity

MESSAGE_RELOOKUP = "Cần tra cứu lại CIC trước khi trình (hết hiệu lực {until})"


class CicRepositoryLike(Protocol):
    async def consents(self, customer_id: UUID) -> list[Mapping[str, Any]]: ...
    async def consent_document_status(self, loan_id: UUID) -> str | None: ...
    async def latest_report(self, customer_id: UUID) -> Mapping[str, Any] | None: ...
    async def documents(self, loan_id: UUID) -> list[Mapping[str, Any]]: ...
    async def sla_days(self) -> dict[str, int]: ...
    async def holidays(self) -> frozenset[date]: ...
    async def consent_document_belongs(self, loan_id: UUID, document_id: UUID) -> bool: ...
    async def insert_consent(self, **kw: Any) -> UUID: ...
    async def insert_report(self, **kw: Any) -> UUID: ...


def _d(value: Any) -> date | None:
    return value if isinstance(value, date) else None


class CicService:
    def __init__(self, proposals: ProposalService, repository: CicRepositoryLike) -> None:
        self._proposals = proposals
        self._repo = repository

    async def status(self, principal: PrincipalLike, loan_id: UUID, *, today: date | None = None) -> dict[str, Any]:
        loan = await self._proposals.get_draft(principal, loan_id)
        day = today or validity.today_vn()
        customer_id = loan["primary_customer_id"]
        consents = await self._repo.consents(customer_id)
        doc_status = await self._repo.consent_document_status(loan_id)
        consent = validity.evaluate_consent(consents, day, document_status=doc_status)
        latest = await self._repo.latest_report(customer_id)
        deadlines = validity.plan_deadlines(day, await self._repo.sla_days(), await self._repo.holidays())
        as_of = _d(latest["report_as_of_date"]) if latest else None
        report = validity.evaluate_report(as_of, day, deadlines["RISK_REVIEW"])
        lock = None if consent.usable else consent.lock_reason
        shown = next((c for c in consents if c.get("confirmed_by") is not None), None)
        return {
            "editable": loan["editable"],
            "consent": {
                "code": consent.code, "usable": consent.usable, "lock_reason": consent.lock_reason,
                "signed_on": shown["signed_on"] if shown else None,
                "valid_until": consent.valid_until,
                "confirmed_by_name": shown["confirmed_by_name"] if shown else None,
            },
            "report": None if latest is None else {
                "looked_up_on": as_of,
                "valid_until": report.valid_until,
                "looked_up_by_name": latest["looked_up_by_name"],
                "source": latest["source"],
                "source_label": (latest["risk_summary"] or {}).get("source_label")
                or (LABEL if latest["source"] == SOURCE else None),
                "summary": dict(latest["risk_summary"] or {}),
            },
            "report_status": report.status,
            "relookup_flag": report.relookup_flag,
            "relookup_flag_text": MESSAGE_RELOOKUP.format(until=report.valid_until.strftime("%d/%m/%Y"))
            if report.relookup_flag and report.valid_until else None,
            "lookup_locked": lock is not None or not loan["editable"],
            "lock_reason": lock or (None if loan["editable"] else "Đề xuất đã gửi, không tra cứu được nữa."),
            "today": day,
        }

    async def record_consent(
        self, principal: PrincipalLike, loan_id: UUID, *, document_id: UUID, signed_on: date,
        valid_until: date | None,
    ) -> dict[str, Any]:
        """Người xác nhận văn bản đồng ý đã được tải lên: ghi người xác nhận và thời điểm xác nhận."""
        loan = await self._proposals.editable_loan(principal, loan_id)
        if valid_until is not None and valid_until < signed_on:
            raise ConflictError("CONSENT_DATES_INVALID", "Hạn hiệu lực không được trước ngày ký.")
        if not await self._repo.consent_document_belongs(loan_id, document_id):
            raise LookupError("Consent document is not attached to this loan application")
        await self._repo.insert_consent(
            customer_id=loan["primary_customer_id"], document_id=document_id, signed_on=signed_on,
            valid_until=valid_until, employee_id=principal.employee_id,
        )
        return await self.status(principal, loan_id)

    async def lookup(self, principal: PrincipalLike, loan_id: UUID, *, today: date | None = None) -> dict[str, Any]:
        loan = await self._proposals.editable_loan(principal, loan_id)
        day = today or validity.today_vn()
        customer_id = loan["primary_customer_id"]
        consents = await self._repo.consents(customer_id)
        consent = validity.evaluate_consent(
            consents, day, document_status=await self._repo.consent_document_status(loan_id)
        )
        if not consent.usable:
            raise ConflictError("CIC_LOOKUP_LOCKED", consent.lock_reason or "Chưa tra cứu CIC được.",
                                {"consent": consent.code})
        usable = next(c for c in consents
                      if c.get("confirmed_by") is not None
                      and (c.get("valid_until") is None or c["valid_until"] >= day))
        previous = await self._repo.latest_report(customer_id)
        try:
            summary = simulate_lookup(None if previous is None else previous["risk_summary"])
        except CicNoDataError as exc:
            raise ConflictError("CIC_NO_SIMULATED_DATA", str(exc)) from exc
        await self._repo.insert_report(
            customer_id=customer_id, consent_id=usable["id"], employee_id=principal.employee_id,
            today=day, valid_until=validity.validity_end(day), summary=summary, source=SOURCE,
        )
        return await self.status(principal, loan_id, today=day)

    async def documents(self, principal: PrincipalLike, loan_id: UUID, *, today: date | None = None) -> list[dict[str, Any]]:
        require_permission(principal, "loan:read")
        await self._proposals.get_draft(principal, loan_id)
        day = today or validity.today_vn()
        out: list[dict[str, Any]] = []
        for row in await self._repo.documents(loan_id):
            state, note, until = _document_state(row, day)
            out.append({
                "item_id": row["item_id"], "code": row["code"], "document_type": row["document_type"],
                "mandatory": row["mandatory_level"] == "MANDATORY", "state": state,
                "document_id": row["document_id"], "title": row["title"],
                "verification_status": row["verification_status"], "issued_date": _d(row["issued_date"]),
                "valid_until": until, "has_exception": bool(row["has_exception"]), "note": note,
            })
        return out


def _document_state(row: Mapping[str, Any], today: date) -> tuple[str, str | None, date | None]:
    """OK | AI (chưa người xác nhận) | MISSING | EXPIRED, kèm hạn hiệu lực (E6: sao kê 30 ngày từ ngày cấp)."""
    if row["document_id"] is None:
        return ("EXPIRED", "Kết quả tra cứu đã hết hiệu lực", None) if row["status"] == "EXPIRED" \
            else ("MISSING", None, None)
    until = _d(row["document_valid_until"])
    issued = _d(row["issued_date"])
    if row["document_type"] in validity.STATEMENT_TYPES and issued is not None:
        until = validity.statement_valid_until(issued)
    if until is not None and until < today:
        return "EXPIRED", None, until
    if row["status"] == "INCOMPLETE":
        return "MISSING", "Tài liệu chưa đầy đủ", until
    if row["verification_status"] == "AI_PROPOSED":
        return "AI", None, until
    return "OK", None, until
