"""Dinh tuyen cap phe duyet (rules.md Q-M, E8) voi kho du lieu gia."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from uuid import UUID, uuid4

from app.workflow.routing import ApproverCandidate, pick_approver

BRANCH_HN = UUID("30000000-0000-4000-8000-000000000002")
BRANCH_HCM = UUID("30000000-0000-4000-8000-000000000003")
LOAN = UUID("70000000-0000-4000-8000-000000000001")


@dataclass
class FakeApproverDirectory:
    candidates: list[ApproverCandidate]
    excluded: set[UUID] = field(default_factory=set)
    branch: UUID = BRANCH_HN
    asked_tiers: list[int] = field(default_factory=list)

    async def list_approver_candidates(self, tier: int) -> Sequence[ApproverCandidate]:
        self.asked_tiers.append(tier)
        return [c for c in self.candidates if c.tier == tier]

    async def customer_branch_id(self, loan_id: UUID) -> UUID:
        assert loan_id == LOAN
        return self.branch

    async def is_excluded(self, employee_id: UUID, loan_id: UUID) -> bool:
        assert loan_id == LOAN
        return employee_id in self.excluded


def branch_approver(open_steps: int, branch: UUID = BRANCH_HN) -> ApproverCandidate:
    return ApproverCandidate(
        employee_id=uuid4(),
        tier=1,
        unit_scope="BRANCH",
        branch_id=branch,
        open_step_count=open_steps,
    )


def ho_approver(tier: int, open_steps: int) -> ApproverCandidate:
    return ApproverCandidate(
        employee_id=uuid4(),
        tier=tier,
        unit_scope="HO",
        branch_id=None,
        open_step_count=open_steps,
    )


async def test_picks_least_loaded_same_tier() -> None:
    busy = ho_approver(2, 4)
    idle = ho_approver(2, 1)
    middle = ho_approver(2, 2)
    repo = FakeApproverDirectory([busy, idle, middle])

    assert await pick_approver(repo, LOAN, 2) == idle.employee_id


async def test_excluded_only_approver_escalates() -> None:
    only_tier1 = branch_approver(0)
    tier2 = ho_approver(2, 7)
    repo = FakeApproverDirectory([only_tier1, tier2], excluded={only_tier1.employee_id})

    assert await pick_approver(repo, LOAN, 1) == tier2.employee_id
    assert repo.asked_tiers == [1, 2]


async def test_excluded_prefers_same_tier_before_escalating() -> None:
    excluded = ho_approver(2, 0)
    other = ho_approver(2, 9)
    repo = FakeApproverDirectory([excluded, other], excluded={excluded.employee_id})

    assert await pick_approver(repo, LOAN, 2) == other.employee_id
    assert repo.asked_tiers == [2]


async def test_tier1_only_same_branch_as_customer() -> None:
    other_branch = branch_approver(0, BRANCH_HCM)
    same_branch = branch_approver(5, BRANCH_HN)
    repo = FakeApproverDirectory([other_branch, same_branch])

    assert await pick_approver(repo, LOAN, 1) == same_branch.employee_id


async def test_tier1_other_branch_only_escalates_to_tier2() -> None:
    other_branch = branch_approver(0, BRANCH_HCM)
    tier2 = ho_approver(2, 3)
    repo = FakeApproverDirectory([other_branch, tier2])

    assert await pick_approver(repo, LOAN, 1) == tier2.employee_id


async def test_tier3_returns_none() -> None:
    repo = FakeApproverDirectory([ho_approver(3, 0)])

    assert await pick_approver(repo, LOAN, 3) is None
    assert repo.asked_tiers == []


async def test_no_tier2_left_goes_to_council() -> None:
    excluded = ho_approver(2, 0)
    repo = FakeApproverDirectory([excluded], excluded={excluded.employee_id})

    assert await pick_approver(repo, LOAN, 2) is None
    assert repo.asked_tiers == [2]


async def test_tie_broken_deterministically_by_employee_id() -> None:
    a = ApproverCandidate(UUID(int=2), 2, "HO", None, 1)
    b = ApproverCandidate(UUID(int=1), 2, "HO", None, 1)
    repo = FakeApproverDirectory([a, b])

    assert await pick_approver(repo, LOAN, 2) == UUID(int=1)
