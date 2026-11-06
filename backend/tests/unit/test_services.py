from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

import pytest

from app.services.audit_service import sanitize_audit_metadata
from app.services.idempotency_service import (
    IdempotencyConflictError,
    IdempotencyService,
    StoredResponse,
    canonical_request_hash,
)
from app.services.loan_service import LoanService
from app.exceptions import ValidationError
from app.services.state_machine import UPLOAD_TRANSITIONS, can_transition, require_transition
from app.services.upload_service import validate_upload_request


@dataclass(slots=True)
class Principal:
    employee_id: UUID
    branch_id: UUID
    roles: set[str]
    permissions: set[str]
    is_admin: bool = False


class FakeIdempotencyRepository:
    def __init__(self) -> None:
        self.row: dict[str, Any] | None = None

    async def get(self, **_: Any) -> dict[str, Any] | None:
        return self.row

    async def create(self, **values: Any) -> dict[str, Any]:
        self.row = dict(values)
        return self.row


class FakeLoanRepository:
    def __init__(self) -> None:
        self.current = {
            "id": uuid4(),
            "status": "APPROVAL",
            "version": 2,
        }
        self.decision: dict[str, Any] | None = None

    async def get(self, _loan_id: UUID) -> dict[str, Any]:
        return self.current

    async def latest_decision(self, _loan_id: UUID) -> dict[str, Any] | None:
        return self.decision


class FakeWorkflow:
    """Ghi lai loi goi; WorkflowService that ghi quyet dinh qua credit.apply_transition."""

    def __init__(self, repository: FakeLoanRepository) -> None:
        self.repository = repository
        self.calls: list[dict[str, Any]] = []

    async def transition(self, principal: Any, loan_id: UUID, action: str, **kw: Any) -> None:
        self.calls.append({"loan_id": loan_id, "action": action, **kw})
        self.repository.decision = {
            "id": uuid4(),
            "decision_maker_id": principal.employee_id,
            "decision_type": kw["params"]["decision_type"],
        }


def test_upload_state_machine_is_explicit() -> None:
    assert can_transition("UPLOADED", "VERIFYING", UPLOAD_TRANSITIONS)
    with pytest.raises(ValueError, match="not allowed"):
        require_transition("CREATED", "COMPLETED", UPLOAD_TRANSITIONS)


def test_request_hash_is_canonical() -> None:
    assert canonical_request_hash({"b": 2, "a": 1}) == canonical_request_hash({"a": 1, "b": 2})


@pytest.mark.asyncio
async def test_idempotency_replays_same_request_and_rejects_changed_request() -> None:
    repository = FakeIdempotencyRepository()
    service = IdempotencyService(repository)
    actor_id = uuid4()
    key = uuid4()
    request = {"amount": "700000000.0000", "currency": "VND"}
    await service.remember(
        actor_id=actor_id,
        operation_name="loan.create",
        idempotency_key=key,
        request_payload=request,
        response=StoredResponse(201, {"id": str(uuid4())}, "LOAN_APPLICATION", uuid4()),
    )
    replay = await service.replay(
        actor_id=actor_id,
        operation_name="loan.create",
        idempotency_key=key,
        request_payload=request,
    )
    assert replay is not None
    assert replay.status_code == 201
    with pytest.raises(IdempotencyConflictError):
        await service.replay(
            actor_id=actor_id,
            operation_name="loan.create",
            idempotency_key=key,
            request_payload={"amount": "1.0000", "currency": "VND"},
        )


def test_audit_metadata_redacts_credentials_recursively() -> None:
    cleaned = sanitize_audit_metadata(
        {
            "status": "SUCCESS",
            "authorization": "Bearer secret-token",
            "nested": {"api_key": "real-key", "safe": "value"},
        }
    )
    assert cleaned["authorization"] == "[REDACTED]"
    assert cleaned["nested"]["api_key"] == "[REDACTED]"
    assert cleaned["nested"]["safe"] == "value"


@pytest.mark.parametrize(
    ("filename", "mime", "size", "sha"),
    [
        ("../loan.pdf", "application/pdf", 10, "a" * 64),
        ("loan.exe", "application/octet-stream", 10, "a" * 64),
        ("loan.pdf", "application/pdf", 0, "a" * 64),
        ("loan.pdf", "application/pdf", 10, "not-a-checksum"),
    ],
)
def test_upload_validation_rejects_unsafe_input(
    filename: str, mime: str, size: int, sha: str
) -> None:
    with pytest.raises(ValueError):
        validate_upload_request(
            filename=filename,
            mime_type=mime,
            size_bytes=size,
            sha256=sha,
            max_size_bytes=100,
        )


@pytest.mark.asyncio
async def test_only_authorized_human_approver_can_create_decision() -> None:
    repository = FakeLoanRepository()
    workflow = FakeWorkflow(repository)
    service = LoanService(repository, workflow=workflow)  # type: ignore[arg-type]
    principal = Principal(
        employee_id=uuid4(),
        branch_id=uuid4(),
        roles={"loan_approver"},
        permissions={"loan:read", "loan:approve"},
    )
    result = await service.decide(
        principal,
        repository.current["id"],
        decision_type="APPROVED",
        approved_amount=Decimal("650000000.0000"),
        approved_term_months=60,
        conditions=[],
        rationale="Authorized human review completed.",
        approval_request_id=None,
        is_override=False,
        override_reason=None,
    )
    assert result["decision_maker_id"] == principal.employee_id
    assert result["decision_type"] == "APPROVED"
    # decide di qua WorkflowService voi phien ban vua doc va ly do = rationale.
    assert workflow.calls[0]["action"] == "decide"
    assert workflow.calls[0]["expected_version"] == 2
    assert workflow.calls[0]["reason"] == "Authorized human review completed."


@pytest.mark.asyncio
async def test_patch_status_is_read_only() -> None:
    repository = FakeLoanRepository()
    service = LoanService(repository)  # type: ignore[arg-type]
    principal = Principal(
        employee_id=uuid4(), branch_id=uuid4(), roles={"credit_officer"},
        permissions={"loan:read", "loan:update"},
    )
    with pytest.raises(ValidationError) as error:
        await service.update(principal, repository.current["id"], {"status": "APPROVED"}, expected_version=2)
    assert error.value.code == "STATUS_READ_ONLY"
    assert error.value.status == 422


@pytest.mark.asyncio
async def test_service_account_without_human_role_cannot_decide() -> None:
    repository = FakeLoanRepository()
    service = LoanService(repository)  # type: ignore[arg-type]
    principal = Principal(
        employee_id=uuid4(),
        branch_id=uuid4(),
        roles=set(),
        permissions={"loan:read", "loan:approve"},
    )
    with pytest.raises(PermissionError, match="role"):
        await service.decide(
            principal,
            repository.current["id"],
            decision_type="REJECTED",
            approved_amount=None,
            approved_term_months=None,
            conditions=[],
            rationale="Human review required.",
            approval_request_id=None,
            is_override=False,
            override_reason=None,
        )
