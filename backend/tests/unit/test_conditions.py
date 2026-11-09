"""Lát 7, trang 04: bảng điều kiện gửi dựng từ dữ kiện cổng rm_submit; nút gửi khóa đúng theo bảng."""

from __future__ import annotations

import asyncio
from datetime import date
from decimal import Decimal
from uuid import uuid4

from app.workflow import gates
from app.workflow.conditions import build_conditions
from app.workflow.gates import ChecklistFact, GateFacts

DAY = date(2026, 11, 7)


class _Src:
    def __init__(self, facts: GateFacts) -> None:
        self.facts = facts

    async def gate_facts(self, loan_id):  # noqa: ANN001
        return self.facts


def _table(**over):
    base = {"today": DAY, "cic_valid_until": date(2026, 12, 1), "consent_valid": True, "checklist": (_doc(),)}
    facts = GateFacts(**{**base, **over})
    result = asyncio.run(gates.evaluate("rm_submit", uuid4(), _Src(facts)))
    return result, {r["code"]: r for r in build_conditions(facts, result)}


def _doc(**kw):
    base = {"code": "BCTC", "document_type": "FINANCIAL_STATEMENT", "mandatory": True, "status": "VALID",
            "has_document": True, "expired": False, "has_exception": False}
    return ChecklistFact(**{**base, **kw})


def test_all_met_enables_submit() -> None:
    result, rows = _table(checklist=(_doc(),))
    assert result.ok and all(r["met"] for r in rows.values() if r["kind"] == "BLOCKER")


def test_each_blocker_locks_its_own_row() -> None:
    cases = {
        "DOCS": {"checklist": (_doc(has_document=False, status="REQUIRED"),)},
        "CIC": {"cic_valid_until": date(2026, 11, 6)},
        "CONSENT": {"consent_valid": False},
        "AI_CONFIRMED": {"ai_proposed_fields": 2},
        "RELATED_PARTIES": {"proposed_related_parties": 1},
        "LEASE": {"lease_unset": 1},
        "AUDITED_FS": {"total_credit_exposure": Decimal("20000000001"), "has_audited_fs": False},
    }
    for code, over in cases.items():
        result, rows = _table(**over)
        assert not result.ok, code
        assert [c for c, r in rows.items() if r["kind"] == "BLOCKER" and not r["met"]] == [code], code


def test_exception_lets_document_through_but_is_flagged() -> None:
    result, rows = _table(checklist=(_doc(has_document=False, status="REQUIRED", has_exception=True),))
    assert result.ok and rows["EXCEPTION:BCTC"]["kind"] == "CARRIED"


def test_cic_documents_never_pass_by_exception() -> None:
    # E9/F5: văn bản đồng ý thiếu thì khóa dù có đề xuất ngoại lệ.
    result, rows = _table(consent_valid=False, checklist=(_doc(code="CONSENT", document_type="CIC_CONSENT",
                                                                has_document=False, has_exception=True),))
    assert not result.ok and not rows["CONSENT"]["met"]


def test_exactly_20_billion_needs_no_audited_fs() -> None:
    result, _ = _table(total_credit_exposure=Decimal("20000000000"))
    assert result.ok
