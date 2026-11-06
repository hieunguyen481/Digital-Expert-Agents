"""Dieu kien tung cong (spec muc 5) tren repo gia."""

from __future__ import annotations

from dataclasses import replace
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from app.workflow.gates import (
    ChecklistFact,
    FlagFact,
    GateFacts,
    GateResult,
    carried_flag_rows,
    evaluate,
)

TODAY = date(2026, 11, 5)
LOAN = uuid4()


class FakeRepo:
    def __init__(self, facts: GateFacts) -> None:
        self.facts = facts

    async def gate_facts(self, loan_id: UUID) -> GateFacts:
        assert loan_id == LOAN
        return self.facts


def ok_facts(**changes: object) -> GateFacts:
    """Ho so du dieu kien moi cong (tru REPORT_MISSING chua co o ke hoach nay)."""
    base = GateFacts(
        today=TODAY,
        checklist=(
            ChecklistFact("A01-07", "BANK_STATEMENT", True, "VALID", True, False, False),
            ChecklistFact("DKKD", "BUSINESS_REGISTRATION", True, "VALID", True, False, False),
        ),
        cic_valid_until=TODAY + timedelta(days=10),
        cic_outage=False,
        consent_valid=True,
        total_credit_exposure=Decimal("5000000000"),
        has_audited_fs=False,
    )
    return replace(base, **changes)


async def run(gate: str, facts: GateFacts) -> GateResult:
    return await evaluate(gate, LOAN, FakeRepo(facts))


async def test_rm_submit_passes_clean_case() -> None:
    result = await run("rm_submit", ok_facts())
    assert result == GateResult(ok=True, blockers=(), carried_flags=())


async def test_cic_expired_blocks_even_with_exception() -> None:
    # F5: CIC het hieu luc khong duoc de xuat ngoai le.
    facts = ok_facts(
        cic_valid_until=TODAY - timedelta(days=1),
        checklist=(ChecklistFact("CIC", "CIC_REPORT", True, "EXPIRED", True, True, True),),
    )
    result = await run("rm_submit", facts)
    assert not result.ok
    assert "CIC_EXPIRED_NO_EXCEPTION" in result.blockers


async def test_cic_expired_passes_during_cic_outage() -> None:
    result = await run("rm_submit", ok_facts(cic_valid_until=TODAY - timedelta(days=1), cic_outage=True))
    assert result.ok
    assert "CIC_OUTAGE" in result.carried_flags


async def test_consent_missing_blocks_even_with_exception() -> None:
    # E9: thieu van ban dong y tra cuu CIC khong duoc ngoai le.
    facts = ok_facts(
        consent_valid=False,
        checklist=(ChecklistFact("DONGY-CIC", "CIC_CONSENT", True, "REQUIRED", False, False, True),),
    )
    result = await run("rm_submit", facts)
    assert result.blockers == ("CONSENT_MISSING",)


async def test_expired_statement_with_exception_is_carried() -> None:
    facts = ok_facts(
        checklist=(ChecklistFact("A01-07", "BANK_STATEMENT", True, "VALID", True, True, True),)
    )
    result = await run("rm_submit", facts)
    assert result.ok
    assert result.carried_flags == ("EXCEPTION:A01-07",)


async def test_expired_statement_without_exception_blocks() -> None:
    facts = ok_facts(
        checklist=(ChecklistFact("A01-07", "BANK_STATEMENT", True, "VALID", True, True, False),)
    )
    assert (await run("rm_submit", facts)).blockers == ("DOC_EXPIRED",)


async def test_missing_document_blocks_without_exception() -> None:
    facts = ok_facts(checklist=(ChecklistFact("NQ", "RESOLUTION", True, "REQUIRED", False, False, False),))
    assert (await run("rm_submit", facts)).blockers == ("DOC_MISSING",)


async def test_audited_fs_required_above_20_billion() -> None:
    facts = ok_facts(total_credit_exposure=Decimal("20000000001"))
    assert (await run("rm_submit", facts)).blockers == ("AUDITED_FS_REQUIRED",)


async def test_audited_fs_not_required_at_exactly_20_billion() -> None:
    facts = ok_facts(total_credit_exposure=Decimal("20000000000"))
    assert (await run("rm_submit", facts)).ok


async def test_audited_fs_present_above_threshold_passes() -> None:
    facts = ok_facts(total_credit_exposure=Decimal("80000000000"), has_audited_fs=True)
    assert (await run("rm_submit", facts)).ok


@pytest.mark.parametrize(
    ("changes", "blocker", "carried"),
    [
        ({"ai_proposed_fields": 1}, "AI_UNCONFIRMED", None),
        ({"needs_verification_fields": 2}, None, "NEEDS_VERIFICATION"),
        ({"proposed_related_parties": 1}, "RELATED_PARTY_UNCONFIRMED", None),
        ({"not_in_group_parties": 1}, None, "NOT_IN_GROUP"),
        ({"lease_unset": 1}, "LEASE_PAYMENT_UNSET", None),
        ({"lease_annual": 1}, None, "LEASE_ANNUAL"),
        ({"lease_one_time_without_proof": 1}, None, "LEASE_ONE_TIME_NO_PROOF"),
    ],
)
async def test_rm_submit_field_rules(changes: dict, blocker: str | None, carried: str | None) -> None:
    result = await run("rm_submit", ok_facts(**changes))
    assert result.blockers == ((blocker,) if blocker else ())
    assert result.carried_flags == ((carried,) if carried else ())


async def test_checking_pass_blocks_failed_item_without_exception() -> None:
    facts = ok_facts(checklist=(ChecklistFact("NQ", "RESOLUTION", True, "INCONSISTENT", True, False, False),))
    assert (await run("checking_pass", facts)).blockers == ("CHECK_FAILED",)


async def test_checking_pass_carries_failed_item_with_exception() -> None:
    facts = ok_facts(
        checklist=(ChecklistFact("NQ", "RESOLUTION", True, "INCONSISTENT", True, False, True),),
        needs_verification_fields=1,
    )
    result = await run("checking_pass", facts)
    assert result.ok
    assert result.carried_flags == ("EXCEPTION:NQ", "NEEDS_VERIFICATION")


async def test_checking_pass_cic_item_cannot_be_excepted() -> None:
    facts = ok_facts(checklist=(ChecklistFact("CIC", "CIC_REPORT", True, "EXPIRED", True, True, True),))
    assert (await run("checking_pass", facts)).blockers == ("CHECK_FAILED",)


async def test_appraisal_submit_ignores_cickh_flag() -> None:
    facts = ok_facts(flags=(FlagFact("cickh", "OPEN", None),))
    result = await run("appraisal_submit", facts)
    # TODO(Ke hoach 5): REPORT_MISSING het khi co bang to trinh.
    assert result.blockers == ("REPORT_MISSING",)
    assert result.carried_flags == ("cickh",)


async def test_appraisal_submit_blocks_open_flags_and_unconfirmed_fields() -> None:
    facts = ok_facts(
        flags=(FlagFact("audit", "OPEN", None), FlagFact("eq", "HANDLED", None)),
        needs_verification_fields=1,
    )
    result = await run("appraisal_submit", facts)
    assert result.blockers == ("FIELDS_UNCONFIRMED", "FLAGS_OPEN", "REPORT_MISSING")


async def test_appraisal_submit_blocks_unresolved_conflict() -> None:
    result = await run("appraisal_submit", ok_facts(unresolved_conflicts=1))
    assert "FIELDS_UNCONFIRMED" in result.blockers


async def test_risk_submit_requires_compliance_conclusion_on_cickh() -> None:
    facts = ok_facts(flags=(FlagFact("cickh", "OPEN", None),))
    assert (await run("risk_submit", facts)).blockers == ("OPINIONS_MISSING",)


async def test_risk_submit_carries_concluded_flags_and_exceptions() -> None:
    facts = ok_facts(
        flags=(FlagFact("cickh", "CONCLUDED", "NO_ISSUE"), FlagFact("eq", "HANDLED", None)),
        checklist=(ChecklistFact("A01-07", "BANK_STATEMENT", True, "VALID", True, False, True),),
    )
    result = await run("risk_submit", facts)
    assert result.ok
    assert result.carried_flags == ("EXCEPTION:A01-07", "FLAG:cickh", "FLAG:eq")


async def test_risk_submit_blocks_expired_cic_even_during_outage() -> None:
    # Q-O / F5: gian doan CIC van phai tra lai truoc khi trinh phe duyet.
    facts = ok_facts(cic_valid_until=TODAY - timedelta(days=1), cic_outage=True)
    assert (await run("risk_submit", facts)).blockers == ("VALIDITY_AT_APPROVAL",)


async def test_risk_submit_expired_statement_needs_exception() -> None:
    expired = ChecklistFact("A01-07", "BANK_STATEMENT", True, "VALID", True, True, False)
    assert (await run("risk_submit", ok_facts(checklist=(expired,)))).blockers == (
        "VALIDITY_AT_APPROVAL",
    )
    excepted = replace(expired, has_exception=True)
    assert (await run("risk_submit", ok_facts(checklist=(excepted,)))).ok


async def test_unknown_gate_rejected() -> None:
    with pytest.raises(ValueError):
        await run("nope", ok_facts())


async def test_non_blocking_carried_flags_do_not_block_later_gates() -> None:
    # Co chuyen kem tu cong truoc (blocks_submission = FALSE) chi de Tham dinh xem.
    facts = ok_facts(
        flags=(
            FlagFact("NEEDS_VERIFICATION", "OPEN", None, blocks_submission=False),
            FlagFact("EXCEPTION:A01-07", "OPEN", None, blocks_submission=False),
        )
    )
    assert (await run("appraisal_submit", facts)).blockers == ("REPORT_MISSING",)
    assert (await run("risk_submit", facts)).ok


def test_carried_flag_rows_skip_existing_flags() -> None:
    rows = carried_flag_rows(("EXCEPTION:NQ", "NEEDS_VERIFICATION", "cickh", "FLAG:eq", "CIC_OUTAGE"))
    assert [(r.code, r.severity) for r in rows] == [
        ("EXCEPTION:NQ", "MEDIUM"),
        ("NEEDS_VERIFICATION", "LOW"),
        ("CIC_OUTAGE", "MEDIUM"),
    ]
