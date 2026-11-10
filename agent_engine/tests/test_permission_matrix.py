"""Bảng đề xuất hành động của docs/business/ma-tran-phan-quyen.md khớp PROPOSAL_ROLES (mọi ô loại × vai trò)."""
from pathlib import Path

from gateway.actions import PROPOSAL_ROLES

DOC = Path(__file__).resolve().parents[2] / "docs" / "business" / "ma-tran-phan-quyen.md"


def _proposal_table() -> tuple[list[str], list[list[str]]]:
    lines = DOC.read_text(encoding="utf-8").splitlines()
    rows = []
    for line in lines[lines.index("<!-- matrix:proposal -->") + 1:]:
        if not line.startswith("|"):
            break
        rows.append([c.strip() for c in line.strip().strip("|").split("|")])
    return rows[0], rows[2:]


def test_proposal_roles_match_the_matrix():
    header, body = _proposal_table()
    roles = header[1:-1]
    assert len(roles) == 9 and {r[0] for r in body} == set(PROPOSAL_ROLES)
    for row in body:
        allowed = {role for role, cell in zip(roles, row[1:-1], strict=True) if cell == "✔"}
        assert allowed == set(PROPOSAL_ROLES[row[0]]), row[0]
