"""Đọc các bảng máy-đọc-được trong docs/business/ma-tran-phan-quyen.md (đánh dấu `<!-- matrix:tên -->`)."""

from __future__ import annotations

from pathlib import Path

DOC = Path(__file__).resolve().parents[2] / "docs" / "business" / "ma-tran-phan-quyen.md"
TICK = "✔"


def table(name: str) -> tuple[list[str], list[list[str]]]:
    lines = DOC.read_text(encoding="utf-8").splitlines()
    start = lines.index(f"<!-- matrix:{name} -->") + 1
    rows: list[list[str]] = []
    for line in lines[start:]:
        if not line.startswith("|"):
            break
        rows.append([c.strip() for c in line.strip().strip("|").split("|")])
    header, body = rows[0], [r for r in rows[2:]]
    return header, body


def cells(name: str, first_cols: int = 1) -> dict[tuple[str, ...], bool]:
    """(khóa..., vai trò) -> được phép, cho bảng có cột vai trò theo sau `first_cols` cột khóa."""
    header, body = table(name)
    roles = [h for h in header[first_cols:] if h and h != "Căn cứ `rules.md`"]
    out: dict[tuple[str, ...], bool] = {}
    for row in body:
        for i, role in enumerate(roles):
            out[(*row[:first_cols], role)] = row[first_cols + i] == TICK
    return out
