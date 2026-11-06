"""Own-profile lookup for the current employee (runs inside the RLS session)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import fetch_one


@dataclass(frozen=True)
class EmployeeProfile:
    full_name: str
    email: str | None
    branch_code: str
    branch_name: str
    approval_tier: int | None


class EmployeeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_profile(self, employee_id: UUID) -> EmployeeProfile | None:
        row = await fetch_one(
            self.session,
            """
            SELECT e.full_name, e.email::text AS email,
                   b.branch_code::text AS branch_code, b.branch_name,
                   (
                       SELECT max(a.tier)::int
                       FROM identity.employee_authority AS a
                       WHERE a.employee_id = e.id
                         AND a.valid_from <= CURRENT_DATE
                         AND (a.valid_until IS NULL OR a.valid_until >= CURRENT_DATE)
                   ) AS approval_tier
            FROM identity.employee AS e
            JOIN identity.branch AS b ON b.id = e.branch_id
            WHERE e.id = :employee_id
            """,
            {"employee_id": employee_id},
        )
        if row is None:
            return None
        return EmployeeProfile(
            full_name=str(row["full_name"]),
            email=row["email"],
            branch_code=str(row["branch_code"]),
            branch_name=str(row["branch_name"]),
            approval_tier=row["approval_tier"],
        )
