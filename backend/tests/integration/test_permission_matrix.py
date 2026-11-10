"""Bảng "Quyền chức năng" của ma-tran-phan-quyen.md khớp dữ liệu seed trong Postgres (mọi ô vai trò × quyền)."""

from __future__ import annotations

from tests.matrix_doc import cells


async def test_permission_cells_match_seed(db):
    doc = cells("permission")
    rows = await db.fetch(
        "SELECT r.role_code, p.permission_code FROM identity.role_permission rp "
        "JOIN identity.role r ON r.id = rp.role_id JOIN identity.permission p ON p.id = rp.permission_id"
    )
    granted = {(r["permission_code"], r["role_code"]) for r in rows}
    roles = {role for _, role in doc}
    perms = {perm for perm, _ in doc}
    assert {r["role_code"] for r in await db.fetch("SELECT role_code FROM identity.role")} == roles
    assert {r["permission_code"] for r in await db.fetch("SELECT permission_code FROM identity.permission")} == perms
    wrong = [f"{perm}/{role}: doc={allowed}" for (perm, role), allowed in doc.items() if allowed != ((perm, role) in granted)]
    assert len(doc) == len(roles) * len(perms) == 9 * 21
    assert not wrong, wrong[:10]
