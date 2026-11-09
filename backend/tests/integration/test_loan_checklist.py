"""L01: ho so moi phai co danh muc tai lieu bat buoc (credit.generate_loan_checklist, V043)."""

from __future__ import annotations

import os

import asyncpg
import pytest


@pytest.mark.asyncio
async def test_generate_loan_checklist_builds_the_sme_catalogue_once() -> None:
    dsn = os.environ.get("TEST_MIGRATOR_DSN")
    if not dsn:
        pytest.skip("TEST_MIGRATOR_DSN chua dat")
    conn = await asyncpg.connect(dsn)
    tx = conn.transaction()
    await tx.start()
    try:
        loan_id = await conn.fetchval(
            "SELECT loan_application_id FROM credit.loan_checklist_item "
            "WHERE requirement_code::text LIKE 'SME-%' LIMIT 1"
        )
        assert loan_id is not None
        await conn.execute(
            "DELETE FROM credit.checklist_item_document WHERE checklist_item_id IN "
            "(SELECT id FROM credit.loan_checklist_item WHERE loan_application_id = $1)", loan_id)
        await conn.execute("UPDATE credit.loan_checklist_item SET linked_document_id = NULL "
                           "WHERE loan_application_id = $1", loan_id)
        await conn.execute("DELETE FROM credit.loan_checklist_item WHERE loan_application_id = $1", loan_id)
        assert await conn.fetchval("SELECT credit.generate_loan_checklist($1)", loan_id) == 16
        rows = await conn.fetch(
            "SELECT requirement_status, mandatory_level FROM credit.loan_checklist_item "
            "WHERE loan_application_id = $1", loan_id)
        assert len(rows) == 16
        assert {r["requirement_status"] for r in rows} == {"REQUIRED"}
        assert sum(r["mandatory_level"] == "MANDATORY" for r in rows) == 14
        assert await conn.fetchval("SELECT credit.generate_loan_checklist($1)", loan_id) == 0
    finally:
        await tx.rollback()
        await conn.close()
