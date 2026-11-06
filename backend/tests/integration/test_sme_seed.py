"""Du lieu mau SME dot 1 (infra/database/seeds/R__seed_sme_batch1.sql).

Doc qua bank_app voi act_as dung vai tro (chiu RLS): moi vai tro thay dung phan cua minh.
Tai lieu chi o muc metadata (document / document_version tro object chua tai len MinIO).
Ngay neo (anchor) = ngay lam viec gan nhat <= hom nay theo gio Viet Nam (rules.md Q-Q).
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import asyncpg
from tests.integration.conftest import act_as
from tests.integration.seed_ids import (
    APPROVER_HO,
    AUDITOR_HO,
    BRANCH_HN,
    BRANCH_HO,
    COMPLIANCE_HO,
    CREDIT_APPRAISER,
    CREDIT_OFFICER,
    CUSTOMER_VINANOVA,
    DOCUMENT_REVIEWER,
    LOAN_BAC_HA,
    LOAN_DAI_THANH,
    LOAN_MEKONG_FLEX,
    LOAN_VINANOVA,
    PARTY_MEKONG_INVEST,
    RISK_HO,
    SME_CHECKLIST_RULE,
    SME_LOANS,
    SME_POLICY_VERSION,
)

BILLION = Decimal(1_000_000_000)

# §6.1 theo thu tu bang F-DOC (rules.md); ma requirement_code sap xep dung thu tu.
CHECKLIST_CODES = [
    ("SME-01-CREDIT-REQUEST", "CREDIT_APPLICATION_FORM"),
    ("SME-02-BUSINESS-REGISTRATION", "BUSINESS_REGISTRATION"),
    ("SME-03-CHARTER", "COMPANY_CHARTER"),
    ("SME-04-SHAREHOLDERS-RELATED", "SHAREHOLDER_LIST"),
    ("SME-05-REPRESENTATIVE-ID", "IDENTITY_DOCUMENT"),
    ("SME-06-BOARD-RESOLUTION", "BOARD_RESOLUTION"),
    ("SME-07-CIC-CONSENT", "CIC_CONSENT"),
    ("SME-08-AUDITED-FS", "FINANCIAL_STATEMENT"),
    ("SME-09-QUARTERLY-FS", "FINANCIAL_STATEMENT"),
    ("SME-10-RECEIVABLES-INVENTORY", "RECEIVABLES_INVENTORY_LIST"),
    ("SME-11-BANK-STATEMENT-12M", "BANK_STATEMENT"),
    ("SME-12-VAT-RETURNS", "TAX_RETURN"),
    ("SME-13-CIC-REPORT", "CIC_REPORT"),
    ("SME-14-BUSINESS-PLAN", "BUSINESS_PLAN"),
    ("SME-15-SALES-CONTRACTS", "SALES_CONTRACT"),
    ("SME-16-COLLATERAL", "COLLATERAL_DOCUMENT"),
]

# 25 so lieu cua 02b (8 chi so + 17 dong BCTC), trang thai theo BANK.VINANOVA.metricStatus.
METRIC_STATUS = {
    "dscr": "NEEDS_VERIFICATION",
    "dti": "NEEDS_VERIFICATION",
    "ltv": "NEEDS_VERIFICATION",
    "de": "CONFIRMED",
    "cr": "NEEDS_VERIFICATION",
    "qr": "NEEDS_VERIFICATION",
    "icr": "NEEDS_VERIFICATION",
    "dso": "NEEDS_VERIFICATION",
    "rev": "CONFIRMED",
    "ebitda": "NEEDS_VERIFICATION",
    "ebitdam": "NEEDS_VERIFICATION",
    "da": "CONFIRMED",
    "ebit": "NEEDS_VERIFICATION",
    "int": "CONFIRMED",
    "np": "NEEDS_VERIFICATION",
    "ta": "NEEDS_VERIFICATION",
    "ca": "CONFIRMED",
    "ar": "CONFIRMED",
    "inv": "CONFIRMED",
    "cl": "CONFIRMED",
    "debt": "NEEDS_VERIFICATION",
    "eq": "NEEDS_VERIFICATION",
    "cfo": "NEEDS_VERIFICATION",
    "cfi": "CONFIRMED",
    "prin": "AI_PROPOSED",
}

ANCHOR_SQL = """
SELECT max(day)::date
FROM generate_series(
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 14,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
    INTERVAL '1 day'
) AS day
WHERE credit.is_workday(day::date)
"""


async def _anchor(db: asyncpg.Connection) -> date:
    return await db.fetchval(ANCHOR_SQL)


# ---------------------------------------------------------------------------
# Chinh sach, danh muc, ngay nghi
# ---------------------------------------------------------------------------
async def test_sme_policy_clauses_and_dscr(db: asyncpg.Connection) -> None:
    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    code = await db.fetchval(
        "SELECT p.policy_code::text FROM policy.policy_version v"
        " JOIN policy.policy p ON p.id = v.policy_id WHERE v.id = $1",
        SME_POLICY_VERSION,
    )
    assert code == "CS-TD-SME/2025"
    clauses = await db.fetch(
        "SELECT clause_number, metadata FROM policy.policy_clause WHERE policy_version_id = $1",
        SME_POLICY_VERSION,
    )
    numbers = {row["clause_number"] for row in clauses}
    assert numbers == {
        "1.2",
        "2.3",
        "3.1",
        "3.4",
        "4.1",
        "4.2",
        "4.4",
        "5.2",
        "6.1",
        "6.3",
        "6.4",
        "7.1",
    }
    dscr = await db.fetchval(
        "SELECT (metadata->>'dscr_min')::numeric FROM policy.policy_clause"
        " WHERE policy_version_id = $1 AND clause_number = '4.2'",
        SME_POLICY_VERSION,
    )
    assert dscr == Decimal("1.25")


async def test_sme_checklist_rule_has_16_items_in_fdoc_order(db: asyncpg.Connection) -> None:
    await act_as(db, DOCUMENT_REVIEWER, BRANCH_HN)
    rows = await db.fetch(
        "SELECT requirement_code::text AS code, document_type FROM policy.checklist_rule_requirement"
        " WHERE checklist_rule_id = $1 ORDER BY requirement_code",
        SME_CHECKLIST_RULE,
    )
    assert [(r["code"], r["document_type"]) for r in rows] == CHECKLIST_CODES


async def test_vietnam_holidays_2026_2027(db: asyncpg.Connection) -> None:
    await act_as(db, DOCUMENT_REVIEWER, BRANCH_HN)
    days = {row["day"] for row in await db.fetch("SELECT day FROM credit.holiday")}
    expected = {
        date(2026, 1, 1),
        *(date(2026, 2, d) for d in (16, 17, 18, 19, 20)),
        date(2026, 4, 27),
        date(2026, 4, 30),
        date(2026, 5, 1),
        date(2026, 9, 1),
        date(2026, 9, 2),
        date(2026, 11, 24),
        date(2027, 1, 1),
        *(date(2027, 2, d) for d in (4, 5, 8, 9, 10)),
        date(2027, 4, 16),
        date(2027, 4, 30),
        date(2027, 5, 3),
        date(2027, 9, 2),
        date(2027, 9, 3),
        date(2027, 11, 24),
    }
    assert expected <= days
    assert all(day.isoweekday() < 6 for day in expected)


# ---------------------------------------------------------------------------
# VinaNova HSV-2026-00187
# ---------------------------------------------------------------------------
async def test_vinanova_case_and_appraisal_step(db: asyncpg.Connection) -> None:
    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    loan = await db.fetchrow(
        "SELECT application_number::text AS no, requested_amount, status FROM credit.loan_application WHERE id = $1",
        LOAN_VINANOVA,
    )
    assert loan is not None
    assert (loan["no"], loan["requested_amount"], loan["status"]) == (
        "HSV-2026-00187",
        80 * BILLION,
        "APPRAISAL",
    )
    step = await db.fetchrow(
        "SELECT assignee_employee_id, received_at, due_at,"
        " credit.workdays_between((received_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,"
        "   (due_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS span,"
        " credit.add_workdays(received_at, 5) AS expected_due"
        " FROM credit.case_step WHERE loan_application_id = $1 AND completed_at IS NULL",
        LOAN_VINANOVA,
    )
    assert step["assignee_employee_id"] == CREDIT_APPRAISER
    assert step["span"] == 5
    assert step["due_at"] == step["expected_due"]
    anchor = await _anchor(db)
    left = await db.fetchval(
        "SELECT credit.workdays_between($1, ($2 AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)",
        anchor,
        step["due_at"],
    )
    assert left == 1  # "con 1 ngay LV"
    assert await db.fetchval("SELECT credit.required_tier($1)", LOAN_VINANOVA) == 2
    assert await db.fetchval("SELECT credit.total_credit_exposure($1)", LOAN_VINANOVA) == 80 * BILLION


async def test_vinanova_documents_16_plus_3_plus_customer_cic(db: asyncpg.Connection) -> None:
    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    items = await db.fetch(
        """
        SELECT item.requirement_code::text AS code, item.requirement_status,
               count(doc.id) FILTER (WHERE doc.counts_for_checklist) AS docs
        FROM credit.loan_checklist_item AS item
        LEFT JOIN credit.checklist_item_document AS link ON link.checklist_item_id = item.id
        LEFT JOIN document.document AS doc ON doc.id = link.document_id
        WHERE item.loan_application_id = $1
        GROUP BY item.requirement_code, item.requirement_status
        ORDER BY item.requirement_code
        """,
        LOAN_VINANOVA,
    )
    assert [r["code"] for r in items] == [code for code, _ in CHECKLIST_CODES]
    assert all(r["docs"] >= 1 and r["requirement_status"] == "VALID" for r in items)

    loan_docs = await db.fetch(
        """
        SELECT doc.id, doc.document_type, doc.document_subtype, doc.counts_for_checklist,
               EXISTS (
                   SELECT 1 FROM credit.checklist_item_document AS link
                   JOIN credit.loan_checklist_item AS item ON item.id = link.checklist_item_id
                   WHERE link.document_id = doc.id AND item.loan_application_id = $1
               ) AS in_checklist
        FROM document.document AS doc
        JOIN document.document_link AS dl
          ON dl.document_id = doc.id AND dl.entity_type = 'LOAN_APPLICATION' AND dl.entity_id = $1
        """,
        LOAN_VINANOVA,
    )
    extra = [d for d in loan_docs if d["counts_for_checklist"] and not d["in_checklist"]]
    not_counted = [d for d in loan_docs if not d["counts_for_checklist"]]
    assert len(extra) == 3
    assert len(not_counted) == 1
    assert not_counted[0]["document_type"] == "CIC_REPORT"
    assert not_counted[0]["document_subtype"] == "CUSTOMER_SUBMITTED"
    assert len(loan_docs) == 20  # 16 muc + 3 bo sung + 1 ban CIC khach nop
    audited = [
        d for d in loan_docs if d["document_type"] == "FINANCIAL_STATEMENT" and d["document_subtype"] == "AUDITED"
    ]
    assert len(audited) == 1


async def test_vinanova_flags_and_conflicts(db: asyncpg.Connection) -> None:
    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    flags = await db.fetch(
        "SELECT code, severity, blocks_submission, status FROM credit.case_flag WHERE loan_application_id = $1",
        LOAN_VINANOVA,
    )
    assert len(flags) == 8
    assert sum(1 for f in flags if f["severity"] == "HIGH") == 4
    by_code = {f["code"]: f for f in flags}
    assert by_code["cickh"]["severity"] == "HIGH"
    assert by_code["cickh"]["blocks_submission"] is False
    assert sum(1 for f in flags if f["blocks_submission"]) == 7
    assert all(f["status"] == "OPEN" for f in flags)
    conflicts = await db.fetch(
        "SELECT code, cardinality(field_ids) AS n, chosen_field_id FROM document.field_conflict"
        " WHERE loan_application_id = $1",
        LOAN_VINANOVA,
    )
    assert sorted(c["code"] for c in conflicts) == ["cfo", "debt"]
    assert all(c["n"] >= 2 and c["chosen_field_id"] is None for c in conflicts)


async def test_vinanova_figure_statuses_and_cic_fields(db: asyncpg.Connection) -> None:
    await act_as(db, CREDIT_APPRAISER, BRANCH_HO)
    rows = await db.fetch(
        """
        SELECT field.field_name::text AS name, field.verification_status, field.source_type
        FROM document.extracted_field AS field
        JOIN document.document_version AS version ON version.id = field.document_version_id
        JOIN document.document_link AS dl
          ON dl.document_id = version.document_id
         AND dl.entity_type = 'LOAN_APPLICATION' AND dl.entity_id = $1
        """,
        LOAN_VINANOVA,
    )
    figures = {r["name"]: r["verification_status"] for r in rows if r["name"] in METRIC_STATUS}
    assert figures == METRIC_STATUS
    counts = {s: list(figures.values()).count(s) for s in set(figures.values())}
    assert counts == {"AI_PROPOSED": 1, "NEEDS_VERIFICATION": 15, "CONFIRMED": 9}
    cic = [r for r in rows if r["source_type"] == "SYSTEM_CIC"]
    assert cic and all(r["verification_status"] == "CONFIRMED" for r in cic)


async def test_vinanova_cic_lookup_and_facilities(db: asyncpg.Connection) -> None:
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    report = await db.fetchrow(
        "SELECT id, source, looked_up_by, consent_id, valid_until,"
        " (requested_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS looked_up_on"
        " FROM banking.credit_report WHERE customer_id = $1 ORDER BY requested_at DESC LIMIT 1",
        CUSTOMER_VINANOVA,
    )
    assert report["source"] == "SIMULATED"
    assert report["looked_up_by"] == CREDIT_OFFICER
    assert report["consent_id"] is not None
    assert (report["valid_until"] - report["looked_up_on"]).days == 29
    assert report["valid_until"] >= await _anchor(db)
    balances = sorted(
        r["outstanding_balance"]
        for r in await db.fetch(
            "SELECT outstanding_balance FROM banking.credit_facility WHERE credit_report_id = $1",
            report["id"],
        )
    )
    assert balances == [42 * BILLION, 56 * BILLION]
    consent = await db.fetchrow("SELECT confirmed_by FROM banking.cic_consent WHERE id = $1", report["consent_id"])
    assert consent["confirmed_by"] == CREDIT_OFFICER


# ---------------------------------------------------------------------------
# Mekong Flex DX-2026-00412
# ---------------------------------------------------------------------------
async def test_mekong_flex_draft_and_related_party_exposure(db: asyncpg.Connection) -> None:
    await act_as(db, CREDIT_OFFICER, BRANCH_HN)
    loan = await db.fetchrow(
        "SELECT application_number::text AS no, requested_amount, status FROM credit.loan_application WHERE id = $1",
        LOAN_MEKONG_FLEX,
    )
    assert (loan["no"], loan["requested_amount"], loan["status"]) == (
        "DX-2026-00412",
        80 * BILLION,
        "DRAFT",
    )
    related = await db.fetchrow(
        "SELECT p.display_name, r.status FROM credit.case_related_party r"
        " JOIN customer.party p ON p.id = r.party_id WHERE r.loan_application_id = $1",
        LOAN_MEKONG_FLEX,
    )
    assert related["display_name"] == "Công ty CP Đầu tư Mekong"
    assert related["status"] == "PROPOSED"
    assert await db.fetchval("SELECT credit.total_credit_exposure($1)", LOAN_MEKONG_FLEX) == 80 * BILLION
    # QHKH xac nhan nhom lien quan (rollback cuoi test): tong = 80 + 15,2.
    updated = await db.execute(
        "UPDATE credit.case_related_party SET status = 'CONFIRMED', decided_by = $2,"
        " decided_at = CURRENT_TIMESTAMP WHERE loan_application_id = $1 AND party_id = $3",
        LOAN_MEKONG_FLEX,
        CREDIT_OFFICER,
        PARTY_MEKONG_INVEST,
    )
    assert updated == "UPDATE 1"
    total = await db.fetchval("SELECT credit.total_credit_exposure($1)", LOAN_MEKONG_FLEX)
    assert total == Decimal("95200000000")
    assert await db.fetchval("SELECT credit.required_tier($1)", LOAN_MEKONG_FLEX) == 2


# ---------------------------------------------------------------------------
# Hang cho theo vai tro (BANK.BADGES)
# ---------------------------------------------------------------------------
# "Cho ban" = buoc chinh dang mo giao cho minh va khong tam dung SLA, cong buoc cho bo
# sung (PENDING_INFO / RISK_PENDING_INFO) tinh cho QHKH cua khach (nguoi phai tai len).
BADGE_SQL = """
SELECT count(*)
FROM credit.case_step AS step
JOIN credit.loan_application AS loan ON loan.id = step.loan_application_id
WHERE step.loan_application_id = ANY($2::uuid[])
  AND step.completed_at IS NULL
  AND (
      (
          step.step_code NOT IN ('PENDING_INFO', 'RISK_PENDING_INFO')
          AND step.assignee_employee_id = $1
          AND (step.paused_at IS NULL OR step.resumed_at IS NOT NULL)
      )
      OR (
          step.step_code IN ('PENDING_INFO', 'RISK_PENDING_INFO')
          AND EXISTS (
              SELECT 1 FROM customer.customer AS c
              WHERE c.id = loan.primary_customer_id AND c.relationship_manager_id = $1
          )
      )
  )
"""

# common.js BADGES: qhkh 4, httd 3, tdinh 3, ruiro 2, pheduyet 3. rules.md thang mockup:
# Q-P - phien Hoi dong (Hau Giang Xanh) "khong tinh vao viec cua ai"; E8 - Bac Ha bi loai
# voi nguoi phe duyet cap 2 duy nhat nen len Hoi dong. Pheduyet con 2.
EXPECTED_BADGES = [
    ("qhkh", CREDIT_OFFICER, BRANCH_HN, 4),
    ("httd", DOCUMENT_REVIEWER, BRANCH_HN, 3),
    ("tdinh", CREDIT_APPRAISER, BRANCH_HO, 3),
    ("ruiro", RISK_HO, BRANCH_HO, 2),
    ("pheduyet", APPROVER_HO, BRANCH_HO, 2),
]


async def test_role_badges_match_queue(db: asyncpg.Connection) -> None:
    loans = list(SME_LOANS.values())
    for role, employee, branch, expected in EXPECTED_BADGES:
        await act_as(db, employee, branch)
        assert await db.fetchval(BADGE_SQL, employee, loans) == expected, role


async def test_open_steps_due_matches_sla(db: asyncpg.Connection) -> None:
    # Kiem toan doc toan bo ho so (Q-M) nen thay moi buoc dang mo.
    await act_as(db, AUDITOR_HO, BRANCH_HO)
    rows = await db.fetch(
        """
        SELECT step.step_code, step.due_at,
               credit.add_workdays(step.received_at, parameter.workdays) AS expected
        FROM credit.case_step AS step
        JOIN credit.sla_parameter AS parameter
          ON parameter.step_code = CASE step.step_code
                 WHEN 'RM_REWORK' THEN 'CUSTOMER_SUPPLEMENT'
                 WHEN 'PENDING_INFO' THEN 'CUSTOMER_SUPPLEMENT'
                 WHEN 'RISK_PENDING_INFO' THEN 'CUSTOMER_SUPPLEMENT'
                 ELSE step.step_code END
        WHERE step.loan_application_id = ANY($1::uuid[]) AND step.completed_at IS NULL
        """,
        list(SME_LOANS.values()),
    )
    assert len(rows) >= 13
    assert all(r["due_at"] == r["expected"] for r in rows)


async def test_compliance_reads_risk_review_case_only(db: asyncpg.Connection) -> None:
    await act_as(db, COMPLIANCE_HO, BRANCH_HO)
    visible = await db.fetchval("SELECT count(*) FROM credit.loan_application WHERE id = $1", LOAN_DAI_THANH)
    assert visible == 1
    assert await db.fetchval("SELECT count(*) FROM credit.loan_application WHERE id = $1", LOAN_VINANOVA) == 0


async def test_bac_ha_former_rm_excluded(db: asyncpg.Connection) -> None:
    await act_as(db, APPROVER_HO, BRANCH_HO)
    assert await db.fetchval("SELECT credit.is_excluded($1, $2)", APPROVER_HO, LOAN_BAC_HA) is True
