"""Chạy đội agent trên hồ sơ: phân quyền theo vai trò + đang giữ hồ sơ, chặn gọi trùng, chạy lại giữ lượt cũ."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest

from app.exceptions import AuthorizationError, ConflictError, NotFoundError
from app.services.agent_engine_client import AgentEngineError
from app.services.loan_agent_run_service import LoanAgentRunService, denial_reason

LOAN = uuid4()
CUSTOMER = uuid4()
COLLATERAL = str(uuid4())


@dataclass
class P:
    roles: tuple[str, ...]
    is_admin: bool = False
    employee_id: UUID = field(default_factory=uuid4)


class FakeRepo:
    def __init__(self, status: str = "DRAFT", holds: bool = True, loan: bool = True) -> None:
        self.status, self._holds, self._loan = status, holds, loan
        self.runs: list[dict[str, Any]] = []
        self.locked = 0

    async def loan(self, loan_id: UUID) -> dict[str, Any] | None:
        return {"id": loan_id, "status": self.status, "primary_customer_id": CUSTOMER,
                "requested_amount": 5_000_000_000, "requested_term_months": 36,
                "loan_purpose": "WORKING_CAPITAL"} if self._loan else None

    async def holds(self, loan_id: UUID) -> bool:
        return self._holds

    async def first_collateral_id(self, loan_id: UUID) -> str | None:
        return COLLATERAL

    async def lock(self, loan_id: UUID) -> None:
        self.locked += 1

    async def list(self, loan_id: UUID) -> list[dict[str, Any]]:
        return list(reversed(self.runs))

    async def insert(self, loan_id: UUID, case_id: str, started_by: UUID) -> UUID:
        self.runs.append({"id": uuid4(), "case_id": case_id, "created_at": datetime.now(UTC),
                          "started_by": started_by, "started_by_name": "X"})
        return self.runs[-1]["id"]


class FakeEngine:
    def __init__(self) -> None:
        self.state = "Completed"
        self.updated_at = time.time()
        self.created: list[dict[str, Any]] = []
        self.ran: list[str] = []
        self.missing = False

    async def create_case(self, request: dict[str, Any]) -> str:
        self.created.append(request)
        return f"case_{len(self.created)}"

    async def run(self, case_id: str) -> None:
        self.ran.append(case_id)
        self.state = "Planning"

    async def get_case(self, case_id: str) -> dict[str, Any]:
        if self.missing:
            raise AgentEngineError(404, "x")
        return {"state": self.state, "updated_at": self.updated_at}


def svc(repo: FakeRepo, engine: FakeEngine | None) -> LoanAgentRunService:
    return LoanAgentRunService(repo, engine)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("roles", "admin", "status", "holds", "ok"),
    [
        (("credit_officer",), False, "DRAFT", True, True),
        (("credit_officer",), False, "RETURNED_TO_RM", True, True),
        (("credit_officer",), False, "APPRAISAL_PENDING_INFO", True, True),
        (("credit_appraiser",), False, "APPRAISAL", True, True),
        (("credit_officer",), False, "DRAFT", False, False),  # không giữ hồ sơ
        (("credit_officer",), False, "APPRAISAL", True, False),  # sai bước với vai trò
        (("credit_appraiser",), False, "DRAFT", True, False),
        (("risk_officer",), False, "RISK_REVIEW", True, False),
        (("loan_approver",), False, "APPROVAL", True, False),
        (("auditor",), False, "APPRAISAL", True, False),
        (("credit_officer",), True, "DRAFT", True, False),  # quản trị không chạy
    ],
)
def test_denial_reason(roles: tuple[str, ...], admin: bool, status: str, holds: bool, ok: bool) -> None:
    reason = denial_reason(P(roles, admin), status, holds)  # type: ignore[arg-type]
    assert (reason is None) is ok
    if not ok:
        assert reason


async def test_forbidden_is_403_with_reason_and_creates_nothing() -> None:
    engine = FakeEngine()
    with pytest.raises(AuthorizationError) as exc:
        await svc(FakeRepo("RISK_REVIEW"), engine).start(P(("risk_officer",)), LOAN)  # type: ignore[arg-type]
    assert exc.value.status_code == 403 and exc.value.code == "AGENT_RUN_NOT_ALLOWED" and exc.value.message
    assert engine.created == []


async def test_not_found_outside_scope() -> None:
    with pytest.raises(NotFoundError):
        await svc(FakeRepo(loan=False), FakeEngine()).overview(P(("credit_officer",)), LOAN)  # type: ignore[arg-type]


async def test_overview_denied_has_reason_and_no_run_right() -> None:
    out = await svc(FakeRepo(holds=False), FakeEngine()).overview(P(("credit_officer",)), LOAN)  # type: ignore[arg-type]
    assert out["can_run"] is False and out["deny_reason"] and out["latest"] is None and out["runs"] == []


async def test_request_built_from_real_loan_data() -> None:
    engine = FakeEngine()
    out = await svc(FakeRepo(), engine).start(P(("credit_officer",)), LOAN)  # type: ignore[arg-type]
    assert engine.created == [{"business_id": str(CUSTOMER), "amount": 5_000_000_000.0, "term_months": 36,
                               "purpose": "WORKING_CAPITAL", "has_collateral": True,
                               "collateral_id": COLLATERAL}]
    assert out["latest"]["case_id"] == "case_1" and engine.ran == ["case_1"]


async def test_rerun_creates_new_run_and_keeps_old() -> None:
    repo, engine = FakeRepo(), FakeEngine()
    me = P(("credit_officer",))
    await svc(repo, engine).start(me, LOAN)  # type: ignore[arg-type]
    engine.state = "Pending Approval"  # lượt 1 đã xong
    out = await svc(repo, engine).start(me, LOAN)  # type: ignore[arg-type]
    assert [r["case_id"] for r in out["runs"]] == ["case_2", "case_1"]
    assert out["latest"]["case_id"] == "case_2" and repo.locked == 2


async def test_duplicate_while_running_is_409_and_creates_no_second_case() -> None:
    repo, engine = FakeRepo(), FakeEngine()
    me = P(("credit_officer",))
    await svc(repo, engine).start(me, LOAN)  # type: ignore[arg-type]  # engine.state = Planning
    with pytest.raises(ConflictError) as exc:
        await svc(repo, engine).start(me, LOAN)  # type: ignore[arg-type]
    assert exc.value.code == "AGENT_RUN_IN_PROGRESS"
    assert len(engine.created) == 1 and len(repo.runs) == 1


async def test_stale_or_missing_run_does_not_block_forever() -> None:
    repo, engine = FakeRepo(), FakeEngine()
    me = P(("credit_officer",))
    await svc(repo, engine).start(me, LOAN)  # type: ignore[arg-type]
    engine.updated_at = time.time() - 3600
    await svc(repo, engine).start(me, LOAN)  # type: ignore[arg-type]
    engine.missing = True
    await svc(repo, engine).start(me, LOAN)  # type: ignore[arg-type]
    assert len(repo.runs) == 3


class NotifyEngine:
    def __init__(self, fail: set[str] | None = None) -> None:
        self.calls: list[tuple[str, str, str | None]] = []
        self.fail = fail or set()

    async def loan_decided(self, case_id: str, loan_id: str, jwt: str | None = None) -> dict[str, Any]:
        self.calls.append((case_id, loan_id, jwt))
        if case_id in self.fail:
            raise AgentEngineError(502, "x")
        return {"status": "closed"}


async def test_notify_decided_tells_engine_each_case_and_survives_failure() -> None:
    repo, engine = FakeRepo(), NotifyEngine(fail={"c1"})
    repo.runs = [{"case_id": "c1"}, {"case_id": "c2"}]
    service = LoanAgentRunService(repo, engine)  # type: ignore[arg-type]
    ids = await service.open_case_ids(LOAN)
    await service.notify_decided("jwt-x", LOAN, ids)
    assert sorted(c[0] for c in engine.calls) == ["c1", "c2"]  # c1 lỗi không chặn c2
    assert all(c[1:] == (str(LOAN), "jwt-x") for c in engine.calls)


async def test_notify_decided_noop_without_engine() -> None:
    service = LoanAgentRunService(FakeRepo(), None)
    assert await service.open_case_ids(LOAN) == []
    await service.notify_decided("jwt", LOAN, ["c1"])
