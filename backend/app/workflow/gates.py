"""Dieu kien tung cong chuyen buoc (spec muc 5 "Dieu kien tung cong", rules.md).

Cong thuan: ``evaluate`` chi doc mot ``GateFacts`` do repository dung tu
database (WorkflowRepository.gate_facts) va tra blocker / co chuyen kem. Nhu
vay luat nghiep vu kiem thu duoc bang repo gia, con cach lay so lieu nam o
repository.

| Cong | Chan khi | Chuyen kem |
|---|---|---|
| rm_submit | DOC_MISSING, DOC_EXPIRED (tru khi co de xuat ngoai le, E1);
|   CIC_EXPIRED_NO_EXCEPTION (F5, chi bo qua khi he thong CIC gian doan);
|   CONSENT_MISSING (E9, khong ngoai le); AI_UNCONFIRMED (Q7);
|   RELATED_PARTY_UNCONFIRMED (E4); LEASE_PAYMENT_UNSET (F9);
|   AUDITED_FS_REQUIRED (E5, tong > 20 ty) | EXCEPTION:<ma>, NEEDS_VERIFICATION,
|   NOT_IN_GROUP, LEASE_ANNUAL, LEASE_ONE_TIME_NO_PROOF, CIC_OUTAGE |
| checking_pass | CHECK_FAILED | EXCEPTION:<ma>, NEEDS_VERIFICATION |
| appraisal_submit | FIELDS_UNCONFIRMED, FLAGS_OPEN (tru cickh), REPORT_MISSING | cickh |
| risk_submit | OPINIONS_MISSING, VALIDITY_AT_APPROVAL (Q10, Q-O) | EXCEPTION:<ma>, FLAG:<ma> |
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Protocol
from uuid import UUID

BLOCKER_CODES = (
    "DOC_MISSING",
    "DOC_EXPIRED",
    "CIC_EXPIRED_NO_EXCEPTION",
    "CONSENT_MISSING",
    "AI_UNCONFIRMED",
    "RELATED_PARTY_UNCONFIRMED",
    "LEASE_PAYMENT_UNSET",
    "AUDITED_FS_REQUIRED",
    "CHECK_FAILED",
    "FIELDS_UNCONFIRMED",
    "FLAGS_OPEN",
    "REPORT_MISSING",
    "OPINIONS_MISSING",
    "VALIDITY_AT_APPROVAL",
)
GATES = frozenset({"rm_submit", "checking_pass", "appraisal_submit", "risk_submit"})

# E5: BCTC kiem toan bat buoc khi tong cap tin dung > 20 ty (dung 20 ty thi khong).
AUDITED_FS_THRESHOLD_VND = Decimal("20000000000")
# Muc CIC/van ban dong y: kiem bang banking.credit_report / banking.cic_consent,
# khong bao gio duoc ngoai le (F5, E9).
CIC_DOCUMENT_TYPES = frozenset({"CIC_REPORT", "CREDIT_REPORT", "CIC_CONSENT"})
# Q10/E6: tai lieu hieu luc 30 ngay tinh toi ngay trinh phe duyet.
VALIDITY_30_DAY_TYPES = frozenset({"BANK_STATEMENT", "DEBT_CONFIRMATION"})
CIC_SELF_SUBMITTED_FLAG = "cickh"
_SKIPPED_STATUSES = frozenset({"WAIVED", "NOT_APPLICABLE"})
_MISSING_STATUSES = frozenset({"REQUIRED", "INCOMPLETE"})


@dataclass(frozen=True)
class ChecklistFact:
    """Mot muc credit.loan_checklist_item kem tinh trang tai lieu."""

    code: str
    document_type: str | None
    mandatory: bool
    status: str  # requirement_status
    has_document: bool  # co tai lieu counts_for_checklist gan vao muc
    expired: bool  # tai lieu het hieu luc hom nay (E6 / valid_until / EXPIRED)
    has_exception: bool  # co de xuat ngoai le DOCUMENT chua bi tu choi


@dataclass(frozen=True)
class FlagFact:
    code: str
    status: str
    compliance_conclusion: str | None


@dataclass(frozen=True)
class GateFacts:
    today: date
    checklist: tuple[ChecklistFact, ...] = ()
    cic_valid_until: date | None = None
    cic_outage: bool = False
    consent_valid: bool = False
    ai_proposed_fields: int = 0
    needs_verification_fields: int = 0
    unresolved_conflicts: int = 0
    proposed_related_parties: int = 0
    not_in_group_parties: int = 0
    lease_unset: int = 0
    lease_annual: int = 0
    lease_one_time_without_proof: int = 0
    total_credit_exposure: Decimal | None = None
    has_audited_fs: bool = False
    flags: tuple[FlagFact, ...] = ()


@dataclass(frozen=True)
class GateResult:
    ok: bool
    blockers: tuple[str, ...]
    carried_flags: tuple[str, ...]


class GateRepository(Protocol):
    async def gate_facts(self, loan_id: UUID) -> GateFacts: ...


async def evaluate(gate: str, loan_id: UUID, repo: GateRepository) -> GateResult:
    if gate not in GATES:
        raise ValueError(f"Unknown gate: {gate}")
    facts = await repo.gate_facts(loan_id)
    blockers: set[str] = set()
    carried: list[str] = []
    if gate == "rm_submit":
        _rm_submit(facts, blockers, carried)
    elif gate == "checking_pass":
        _checking_pass(facts, blockers, carried)
    elif gate == "appraisal_submit":
        _appraisal_submit(facts, blockers, carried)
    else:
        _risk_submit(facts, blockers, carried)
    ordered = tuple(code for code in BLOCKER_CODES if code in blockers)
    return GateResult(ok=not ordered, blockers=ordered, carried_flags=_unique(carried))


def _active_items(facts: GateFacts) -> Iterable[ChecklistFact]:
    return (i for i in facts.checklist if i.mandatory and i.status not in _SKIPPED_STATUSES)


def _cic_valid(facts: GateFacts) -> bool:
    return facts.cic_valid_until is not None and facts.cic_valid_until >= facts.today


def _rm_submit(facts: GateFacts, blockers: set[str], carried: list[str]) -> None:
    for item in _active_items(facts):
        if item.document_type in CIC_DOCUMENT_TYPES:
            continue
        missing = not item.has_document or item.status in _MISSING_STATUSES
        expired = item.expired or item.status == "EXPIRED"
        if not (missing or expired):
            continue
        if item.has_exception:
            carried.append(f"EXCEPTION:{item.code}")
        else:
            blockers.add("DOC_MISSING" if missing else "DOC_EXPIRED")
    if not _cic_valid(facts):
        if facts.cic_outage:
            carried.append("CIC_OUTAGE")
        else:
            blockers.add("CIC_EXPIRED_NO_EXCEPTION")
    if not facts.consent_valid:
        blockers.add("CONSENT_MISSING")
    if facts.ai_proposed_fields:
        blockers.add("AI_UNCONFIRMED")
    if facts.needs_verification_fields:
        carried.append("NEEDS_VERIFICATION")
    if facts.proposed_related_parties:
        blockers.add("RELATED_PARTY_UNCONFIRMED")
    if facts.not_in_group_parties:
        carried.append("NOT_IN_GROUP")
    if facts.lease_unset:
        blockers.add("LEASE_PAYMENT_UNSET")
    if facts.lease_annual:
        carried.append("LEASE_ANNUAL")
    if facts.lease_one_time_without_proof:
        carried.append("LEASE_ONE_TIME_NO_PROOF")
    total = facts.total_credit_exposure
    if total is not None and total > AUDITED_FS_THRESHOLD_VND and not facts.has_audited_fs:
        blockers.add("AUDITED_FS_REQUIRED")


def _checking_pass(facts: GateFacts, blockers: set[str], carried: list[str]) -> None:
    for item in _active_items(facts):
        passed = item.status == "VALID" and item.has_document and not item.expired
        if passed:
            continue
        if item.has_exception and item.document_type not in CIC_DOCUMENT_TYPES:
            carried.append(f"EXCEPTION:{item.code}")
        else:
            blockers.add("CHECK_FAILED")
    if facts.needs_verification_fields:
        carried.append("NEEDS_VERIFICATION")


def _appraisal_submit(facts: GateFacts, blockers: set[str], carried: list[str]) -> None:
    if facts.ai_proposed_fields or facts.needs_verification_fields or facts.unresolved_conflicts:
        blockers.add("FIELDS_UNCONFIRMED")
    for flag in facts.flags:
        if flag.status != "OPEN":
            continue
        if flag.code == CIC_SELF_SUBMITTED_FLAG:
            carried.append(flag.code)
        else:
            blockers.add("FLAGS_OPEN")
    # TODO(Ke hoach 5): kiem tra bang to trinh (Q-L); chua co bang o Ke hoach 1
    # nen cong nay luon chan bang REPORT_MISSING.
    blockers.add("REPORT_MISSING")


def _risk_submit(facts: GateFacts, blockers: set[str], carried: list[str]) -> None:
    for flag in facts.flags:
        awaiting = flag.status in {"OPEN", "FORWARDED_COMPLIANCE"}
        needs_compliance = (
            flag.code == CIC_SELF_SUBMITTED_FLAG and flag.compliance_conclusion is None
        )
        if awaiting or needs_compliance:
            blockers.add("OPINIONS_MISSING")
    # Q-O: CIC gian doan khong mien tra lai truoc khi trinh phe duyet.
    if not _cic_valid(facts):
        blockers.add("VALIDITY_AT_APPROVAL")
    for item in _active_items(facts):
        if item.has_exception and item.document_type not in CIC_DOCUMENT_TYPES:
            carried.append(f"EXCEPTION:{item.code}")
        elif item.document_type in VALIDITY_30_DAY_TYPES and (
            item.expired or item.status == "EXPIRED"
        ):
            blockers.add("VALIDITY_AT_APPROVAL")
    for flag in facts.flags:
        if flag.status in {"HANDLED", "CONCLUDED"}:
            carried.append(f"FLAG:{flag.code}")


def _unique(values: Iterable[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(values))
