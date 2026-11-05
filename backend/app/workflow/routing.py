"""Dinh tuyen ho so toi cap phe duyet (rules.md Q4, Q-M, E8).

Cap can thiet lay tu SQL ``credit.required_tier``. ``pick_approver`` chon nguoi
trong cap do: tham quyen con hieu luc, cap 1 phai cung chi nhanh voi khach,
khong bi tach bach (``credit.is_excluded``), it buoc dang mo nhat. Het nguoi cung
cap moi len cap tren; toi cap 3 thi khong co ca nhan nao, ho so vao
``COUNCIL_SESSION`` (tra ``None``).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

COUNCIL_TIER = 3


@dataclass(frozen=True)
class ApproverCandidate:
    """Mot dong identity.employee_authority con hieu luc hom nay."""

    employee_id: UUID
    tier: int
    unit_scope: str  # 'BRANCH' | 'HO'
    branch_id: UUID | None  # bat buoc khi unit_scope = 'BRANCH'
    open_step_count: int  # so case_step dang mo (completed_at IS NULL) ma nguoi nay nhan


class ApproverDirectory(Protocol):
    """Phan kho du lieu ma pick_approver can; WorkflowRepository (Task 9) cai dat."""

    async def list_approver_candidates(self, tier: int) -> Sequence[ApproverCandidate]:
        """Nhan vien co employee_authority.tier == tier, valid_from <= hom nay va
        (valid_until NULL hoac >= hom nay), kem so buoc dang mo."""
        ...

    async def customer_branch_id(self, loan_id: UUID) -> UUID:
        """home_branch_id cua khach chinh cua ho so."""
        ...

    async def is_excluded(self, employee_id: UUID, loan_id: UUID) -> bool:
        """SELECT credit.is_excluded(employee_id, loan_id)."""
        ...


async def pick_approver(repo: ApproverDirectory, loan_id: UUID, tier: int) -> UUID | None:
    """Nguoi phe duyet cho ho so o ``tier`` (hoac cap tren neu het nguoi); None = Hoi dong."""
    if tier < 1:
        raise ValueError(f"tier must be >= 1, got {tier}")
    branch_id: UUID | None = None
    current = tier
    while current < COUNCIL_TIER:
        candidates = list(await repo.list_approver_candidates(current))
        if current == 1:
            if branch_id is None:
                branch_id = await repo.customer_branch_id(loan_id)
            candidates = [c for c in candidates if c.branch_id == branch_id]
        candidates.sort(key=lambda c: (c.open_step_count, c.employee_id))
        for candidate in candidates:
            if not await repo.is_excluded(candidate.employee_id, loan_id):
                return candidate.employee_id
        current += 1
    return None
