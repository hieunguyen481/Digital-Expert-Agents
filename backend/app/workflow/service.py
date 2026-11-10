"""WorkflowService: mot cua duy nhat cho moi chuyen buoc ho so (Task 9).

Trinh tu: vai tro -> trang thai nguon -> ly do/tham so -> cong dieu kien ->
tach bach (E8) -> tinh han / dinh tuyen -> ``credit.apply_transition`` (doi
trang thai theo phien ban, dong/mo buoc nguyen tu; database kiem lai moi dieu
kien) -> nhat ky ``WORKFLOW_<ACTION>``. Dinh tuyen chay trong ngu canh RLS cua
nhan vien dang thao tac (khong phai worker).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Protocol
from uuid import UUID

from app.exceptions import ConflictError, ValidationError
from app.services.audit_service import AuditService
from app.services.protocols import PrincipalLike
from app.workflow import sla
from app.workflow.gates import CarriedFlag, GateFacts, carried_flag_rows, evaluate
from app.workflow.routing import ApproverCandidate, pick_approver
from app.workflow.transitions import (
    DECISION_STATUSES,
    SUPPLEMENT_TARGETS,
    TRANSITIONS,
    WITHDRAW_KINDS,
    Transition,
)


@dataclass(frozen=True)
class TransitionResult:
    status: str
    step_code: str | None  # None khi ho so rut ma khong con buoc mo
    assignee_employee_id: UUID | None
    due_at: datetime | None
    carried_flags: tuple[str, ...]


class GateBlockedError(ValidationError):
    def __init__(self, blockers: Sequence[str]) -> None:
        super().__init__(
            "GATE_BLOCKED",
            "The case does not meet the conditions for this step.",
            {"blockers": list(blockers)},
        )
        self.blockers = tuple(blockers)


class WorkflowRepositoryLike(Protocol):
    async def db_now(self) -> datetime: ...
    async def holidays(self) -> frozenset[date]: ...
    async def sla_workdays(self, step_code: str) -> int: ...
    async def get_loan(self, loan_id: UUID) -> Mapping[str, Any] | None: ...
    async def finalize_memo(self, loan_id: UUID, employee_id: UUID) -> int: ...
    async def reopen_memo(self, loan_id: UUID, employee_id: UUID) -> int | None: ...
    async def open_steps(self, loan_id: UUID) -> Sequence[Mapping[str, Any]]: ...
    async def extend_deadline(
        self, loan_id: UUID, caller: UUID, reason: str, new_due_at: datetime
    ) -> datetime: ...
    async def list_steps(self, loan_id: UUID) -> Sequence[Mapping[str, Any]]: ...
    async def last_step(
        self, loan_id: UUID, step_code: str, *, result: str | None = None
    ) -> Mapping[str, Any] | None: ...
    async def pick_role_assignee(self, loan_id: UUID, step_code: str, role: str) -> UUID | None: ...
    async def list_approver_candidates(self, tier: int) -> Sequence[ApproverCandidate]: ...
    async def customer_branch_id(self, loan_id: UUID) -> UUID: ...
    async def is_excluded(self, employee_id: UUID, loan_id: UUID) -> bool: ...
    async def required_tier(self, loan_id: UUID) -> int: ...
    async def pending_exceptions(self, loan_id: UUID) -> Sequence[Mapping[str, Any]]: ...
    async def decide_exceptions(
        self, loan_id: UUID, decisions: Mapping[UUID, tuple[str, str]], decided_by: UUID
    ) -> None: ...
    async def record_submit_tier(self, loan_id: UUID, tier: int, created_by: UUID) -> None: ...
    async def gate_facts(self, loan_id: UUID) -> GateFacts: ...
    async def persist_carried_flags(
        self, loan_id: UUID, *, gate: str, flags: Sequence[CarriedFlag], created_by: UUID
    ) -> None: ...
    async def insert_decision(
        self,
        loan_id: UUID,
        *,
        decision_type: str,
        decision_maker_id: UUID,
        rationale: str,
        approved_amount: Decimal | None = None,
        approved_term_months: int | None = None,
        conditions: Sequence[Mapping[str, Any]] = (),
        approval_request_id: UUID | None = None,
        is_override: bool = False,
        override_reason: str | None = None,
    ) -> Mapping[str, Any]: ...
    async def apply_transition(
        self,
        loan_id: UUID,
        *,
        action: str,
        expected_version: int,
        from_status: str,
        to_status: str,
        reason: str | None,
        new_assignee: UUID | None,
        new_due_at: datetime | None,
        remaining_workdays: int | None,
        approval_tier: int | None,
        withdraw_kind: str | None,
    ) -> Mapping[str, Any]: ...


_PENDING_STEPS = frozenset({"PENDING_INFO", "RISK_PENDING_INFO"})
_SUPPLEMENT_STATUSES = frozenset({"RETURNED_TO_RM", "APPRAISAL_PENDING_INFO"})
_SUPPLEMENT_STEPS = frozenset({"RM_REWORK", "PENDING_INFO"})


def _supplement_step(steps: Sequence[Mapping[str, Any]]) -> Mapping[str, Any] | None:
    for step in steps:
        if step["step_code"] in _SUPPLEMENT_STEPS:
            return step
    return None


@dataclass
class _Plan:
    to_status: str
    new_assignee: UUID | None = None
    new_due_at: datetime | None = None
    remaining_workdays: int | None = None
    approval_tier: int | None = None
    withdraw_kind: str | None = None
    decision: dict[str, Any] | None = None


class WorkflowService:
    def __init__(self, repository: WorkflowRepositoryLike, audit: AuditService | None = None) -> None:
        self._repo = repository
        self._audit = audit

    async def steps(self, principal: PrincipalLike, loan_id: UUID) -> Sequence[Mapping[str, Any]]:
        _require_permission(principal, "loan:read")
        if await self._repo.get_loan(loan_id) is None:
            raise LookupError("Loan application was not found or is outside the authorized scope")
        return await self._repo.list_steps(loan_id)

    async def extend_deadline(
        self, principal: PrincipalLike, loan_id: UUID, reason: str | None, *, request_id: UUID | None = None
    ) -> datetime:
        """Q11: QHKH gia han han bo sung 1 lan, co ly do, them SLA ``CUSTOMER_SUPPLEMENT`` ngay lam viec."""
        if "credit_officer" not in set(getattr(principal, "roles", ())) or getattr(principal, "is_admin", False):
            raise PermissionError("Action extend_deadline requires role credit_officer")
        clean = (reason or "").strip()
        if not clean:
            raise ValueError("Action extend_deadline requires a reason")
        loan = await self._repo.get_loan(loan_id)
        if loan is None:
            raise LookupError("Loan application was not found or is outside the authorized scope")
        if str(loan["status"]) not in _SUPPLEMENT_STATUSES:
            raise ConflictError(
                "INVALID_STATE_TRANSITION",
                f"Action extend_deadline is not allowed from status {loan['status']}.",
                {"status": str(loan["status"]), "action": "extend_deadline"},
            )
        step = _supplement_step(await self._repo.open_steps(loan_id))
        if step is None or step.get("due_at") is None:
            raise ValueError("The case has no supplement deadline to extend")
        now = await self._repo.db_now()
        base = max(step["due_at"], now)
        new_due = sla.add_workdays(
            base, await self._repo.sla_workdays("CUSTOMER_SUPPLEMENT"), await self._repo.holidays()
        )
        result = await self._repo.extend_deadline(loan_id, principal.employee_id, clean, new_due)
        if self._audit is not None:
            await self._audit.record(
                principal=principal, action="WORKFLOW_EXTEND_DEADLINE", resource_type="LOAN_APPLICATION",
                resource_id=loan_id, loan_application_id=loan_id, result="SUCCESS",
                request_id=request_id, correlation_id=request_id,
                metadata={"previous_due_at": step["due_at"], "new_due_at": result, "reason": clean},
            )
        return result

    async def transition(
        self,
        principal: PrincipalLike,
        loan_id: UUID,
        action: str,
        *,
        expected_version: int,
        reason: str | None = None,
        params: Mapping[str, Any] | None = None,
        request_id: UUID | None = None,
    ) -> TransitionResult:
        transition = TRANSITIONS.get(action)
        if transition is None:
            raise ValueError(f"Unknown workflow action: {action}")
        # 1. Vai tro (Quan tri khong bao gio chuyen buoc, Q-J).
        roles = set(getattr(principal, "roles", ()))
        if getattr(principal, "is_admin", False) or not roles & transition.roles:
            raise PermissionError(f"Action {action} requires one of roles {sorted(transition.roles)}")
        # 2. Trang thai nguon.
        loan = await self._repo.get_loan(loan_id)
        if loan is None:
            raise LookupError("Loan application was not found or is outside the authorized scope")
        from_status = str(loan["status"])
        if from_status not in transition.from_status:
            raise ConflictError(
                "INVALID_STATE_TRANSITION",
                f"Action {action} is not allowed from status {from_status}.",
                {"status": from_status, "action": action},
            )
        if int(loan["version"]) != expected_version:
            raise ConflictError(
                "VERSION_CONFLICT",
                "The loan application was changed by another request.",
                {"loan_application_id": str(loan_id)},
            )
        # 3. Ly do va tham so.
        clean_reason = (reason or "").strip() or None
        if transition.reason_required and clean_reason is None:
            raise ValueError(f"Action {action} requires a reason")
        plan = _validate_params(transition, params or {}, loan)
        if plan.withdraw_kind == "OVERDUE":
            step = _supplement_step(await self._repo.open_steps(loan_id))
            due = None if step is None else step.get("due_at")
            if due is None or due > await self._repo.db_now():
                raise ValidationError(
                    "WITHDRAW_NOT_OVERDUE",
                    "Chỉ được rút hồ sơ loại \"Quá hạn\" khi hạn bổ sung đã qua.",
                    {"due_at": None if due is None else due.isoformat()},
                )
        # 4. Cong dieu kien.
        carried: tuple[str, ...] = ()
        if transition.gate is not None:
            gate = await evaluate(transition.gate, loan_id, self._repo)
            if not gate.ok:
                raise GateBlockedError(gate.blockers)
            carried = gate.carried_flags
        # 5. Tach bach (E8) truoc khi quyet dinh.
        if action in {"decide", "return_for_supplement"} and await self._repo.is_excluded(
            principal.employee_id, loan_id
        ):
            raise PermissionError("Employee is excluded from deciding this case (E8)")
        exception_decisions: dict[UUID, tuple[str, str]] = {}
        if action in {"decide", "return_for_supplement"}:
            exception_decisions = await self._exception_decisions(loan_id, plan, params or {})
        # 6. Han va nguoi nhan.
        now = await self._repo.db_now()
        holidays = await self._repo.holidays()
        await self._plan_step(transition, plan, loan, principal, now, holidays)
        if transition.gate is not None and carried:
            # Q7/F10: co chuyen kem hien thanh co o buoc sau, khong chan trinh.
            await self._repo.persist_carried_flags(
                loan_id,
                gate=transition.gate,
                flags=carried_flag_rows(carried),
                created_by=principal.employee_id,
            )
        if plan.decision is not None:
            await self._repo.insert_decision(
                loan_id,
                decision_maker_id=principal.employee_id,
                rationale=clean_reason or "",
                **plan.decision,
            )
        if exception_decisions:
            # Cap phe duyet chap thuan/tu choi ngoai le cung luc voi quyet dinh, truoc khi het quyen ghi.
            await self._repo.decide_exceptions(loan_id, exception_decisions, principal.employee_id)
        if action == "submit_to_risk":
            # Q-L: chot ban To trinh trong cung giao dich, truoc khi nguoi trinh het quyen ghi ho so.
            await self._repo.finalize_memo(loan_id, principal.employee_id)
        # 7. Doi trang thai nguyen tu (database kiem lai, sai phien ban -> ConflictError).
        row = await self._repo.apply_transition(
            loan_id,
            action=action,
            expected_version=expected_version,
            from_status=from_status,
            to_status=plan.to_status,
            reason=clean_reason,
            new_assignee=plan.new_assignee,
            new_due_at=plan.new_due_at,
            remaining_workdays=plan.remaining_workdays,
            approval_tier=plan.approval_tier,
            withdraw_kind=plan.withdraw_kind,
        )
        if action == "submit_to_checking":
            # Q4/F10: ghi cap luc gui de "Nang cap phe duyet" so sanh khi tong tang len.
            await self._repo.record_submit_tier(
                loan_id, await self._repo.required_tier(loan_id), principal.employee_id
            )
        result = TransitionResult(
            status=str(row["out_status"]),
            step_code=None if row["out_step_code"] is None else str(row["out_step_code"]),
            assignee_employee_id=row["out_assignee"],
            due_at=row["out_due_at"],
            carried_flags=carried,
        )
        if result.status == "APPRAISAL" and from_status in {"RISK_REVIEW", "APPROVAL"}:
            # Q-L: tra lai ve Tham dinh thi mo ban To trinh moi (revision + 1) tu ban da chot.
            await self._repo.reopen_memo(loan_id, principal.employee_id)
        # 8. Nhat ky.
        if self._audit is not None:
            await self._audit.record(
                principal=principal,
                action=f"WORKFLOW_{action.upper()}",
                resource_type="LOAN_APPLICATION",
                resource_id=loan_id,
                loan_application_id=loan_id,
                result="SUCCESS",
                request_id=request_id,
                correlation_id=request_id,
                metadata={
                    "from_status": from_status,
                    "to_status": result.status,
                    "reason": clean_reason,
                    "step_code": result.step_code,
                    "assignee_employee_id": result.assignee_employee_id,
                    "carried_flags": list(carried),
                },
            )
        return result

    async def _plan_step(
        self,
        transition: Transition,
        plan: _Plan,
        loan: Mapping[str, Any],
        principal: PrincipalLike,
        now: datetime,
        holidays: frozenset[date],
    ) -> None:
        loan_id = UUID(str(loan["id"]))
        action = transition.action

        async def role_step(step_code: str, role: str, sla_key: str | None = None) -> None:
            assignee = await self._repo.pick_role_assignee(loan_id, step_code, role)
            if assignee is None:
                raise ValueError(f"No active employee with role {role} to receive {step_code}")
            plan.new_assignee = assignee
            if sla_key is not None:
                plan.new_due_at = await self._due(now, sla_key, holidays)

        async def rm_step() -> None:
            rm = loan.get("relationship_manager_id")
            if rm is None:
                raise ValueError("Customer has no relationship manager to receive the case")
            plan.new_assignee = UUID(str(rm))
            plan.new_due_at = await self._due(now, "CUSTOMER_SUPPLEMENT", holidays)

        if action == "submit_to_checking":
            await role_step("CHECKING", "document_reviewer", "CHECKING")
        elif action == "pass_to_appraisal" or action == "risk_return":
            await role_step("APPRAISAL", "credit_appraiser", "APPRAISAL")
        elif action == "return_to_rm":
            await rm_step()
        elif action in {"request_info", "request_explanation"}:
            main = await self._main_step(loan_id)
            plan.remaining_workdays = _remaining(main, now, holidays)
            # Buoc cho bo sung do HTTD da kiem tra ho so nhan (uu tien cung nguoi).
            await role_step("CHECKING", "document_reviewer", "CUSTOMER_SUPPLEMENT")
        elif action in {"accept_info", "accept_explanation"}:
            main = await self._main_step(loan_id)
            plan.new_due_at = _resumed_due(main.get("remaining_workdays"), now, holidays)
        elif action == "submit_to_risk":
            await role_step("RISK_REVIEW", "risk_officer", "RISK_REVIEW")
        elif action == "fraud_hold":
            main = await self._main_step(loan_id)
            plan.remaining_workdays = _remaining(main, now, holidays)
            plan.new_assignee = principal.employee_id
        elif action == "fraud_release":
            await role_step("RISK_REVIEW", "risk_officer")
            held = await self._repo.last_step(loan_id, "RISK_REVIEW", result="FRAUD_HOLD")
            plan.new_due_at = _resumed_due(
                held.get("remaining_workdays") if held else None, now, holidays
            )
        elif action == "submit_to_approval":
            tier = await self._repo.required_tier(loan_id)
            plan.approval_tier = tier
            approver = await pick_approver(self._repo, loan_id, tier)
            if approver is None:
                plan.to_status = "COUNCIL_SESSION"
            else:
                plan.to_status = "APPROVAL"
                plan.new_assignee = approver
                plan.new_due_at = await self._due(now, "APPROVAL", holidays)
        elif action == "return_for_supplement":
            if plan.to_status == "APPRAISAL":
                await role_step("APPRAISAL", "credit_appraiser", "APPRAISAL")
            else:
                await rm_step()
        # decide, withdraw: khong mo buoc moi.

    async def _exception_decisions(
        self, loan_id: UUID, plan: _Plan, params: Mapping[str, Any]
    ) -> dict[UUID, tuple[str, str]]:
        """Moi de xuat ngoai le dang cho phai duoc chap thuan hoac tu choi cung luc voi quyet dinh;
        tu choi thi chi duoc Tra lai bo sung (rules.md muc Ngoai le)."""
        pending = {UUID(str(row["id"])) for row in await self._repo.pending_exceptions(loan_id)}
        given: dict[UUID, tuple[str, str]] = {}
        for item in params.get("exceptions") or []:
            decision = item.get("decision")
            if decision not in {"ACCEPTED", "REJECTED"}:
                raise ValueError("Each exception decision must be ACCEPTED or REJECTED")
            reason = str(item.get("reason") or "").strip()
            if not reason:
                raise ValidationError(
                    "EXCEPTION_REASON_REQUIRED",
                    "Mỗi ngoại lệ được chấp thuận hoặc từ chối phải kèm lý do.",
                    {"exception_id": str(item.get("id"))},
                )
            given[UUID(str(item.get("id")))] = (decision, reason)
        if not set(given) <= pending:
            raise ValueError("Unknown exception in the decision")
        missing = pending - set(given)
        if missing:
            raise ValidationError(
                "EXCEPTIONS_UNDECIDED",
                "Every proposed exception must be accepted or rejected together with the decision.",
                {"exception_ids": sorted(str(i) for i in missing)},
            )
        if plan.to_status.startswith("APPROVED") and any(d == "REJECTED" for d, _ in given.values()):
            raise ValidationError(
                "EXCEPTION_REJECTED_REQUIRES_RETURN",
                "A rejected exception means the case must be returned for supplement.",
                {},
            )
        return given

    async def _due(self, now: datetime, sla_key: str, holidays: frozenset[date]) -> datetime:
        return sla.add_workdays(now, await self._repo.sla_workdays(sla_key), holidays)

    async def _main_step(self, loan_id: UUID) -> Mapping[str, Any]:
        for step in await self._repo.open_steps(loan_id):
            if step["step_code"] not in _PENDING_STEPS:
                return step
        raise ValueError("The case has no open main step")


def _remaining(main: Mapping[str, Any], now: datetime, holidays: frozenset[date]) -> int | None:
    due = main.get("due_at")
    if due is None:
        return None
    return sla.pause(due, now, holidays).remaining_workdays


def _resumed_due(remaining: int | None, now: datetime, holidays: frozenset[date]) -> datetime | None:
    if remaining is None:
        return None
    return sla.resume(sla.Pause(int(remaining), now), now, holidays)


def _require_permission(principal: PrincipalLike, permission: str) -> None:
    if permission not in principal.permissions:
        raise PermissionError(f"Missing permission: {permission}")


def _validate_params(
    transition: Transition, params: Mapping[str, Any], loan: Mapping[str, Any]
) -> _Plan:
    action = transition.action
    if action == "decide":
        return _decide_plan(params, loan.get("requested_amount"))
    if action == "return_for_supplement":
        target = params.get("target")
        if target not in SUPPLEMENT_TARGETS:
            raise ValueError(f"target must be one of {sorted(SUPPLEMENT_TARGETS)}")
        return _Plan(to_status=str(target), decision={"decision_type": "RETURN_FOR_SUPPLEMENT"})
    if action == "withdraw":
        kind = params.get("withdraw_kind")
        if kind not in WITHDRAW_KINDS:
            raise ValueError(f"withdraw_kind must be one of {sorted(WITHDRAW_KINDS)}")
        return _Plan(to_status="WITHDRAWN", withdraw_kind=str(kind))
    # submit_to_approval: service quyet dinh to_status sau khi dinh tuyen.
    return _Plan(to_status=transition.to_status or "")


def _decide_plan(params: Mapping[str, Any], requested_amount: Any) -> _Plan:
    decision = _decision_params(params, requested_amount)
    return _Plan(to_status=decision["decision_type"], decision=decision)


def _decision_params(params: Mapping[str, Any], requested_amount: Any) -> dict[str, Any]:
    decision_type = params.get("decision_type")
    if decision_type not in DECISION_STATUSES:
        raise ValueError(f"decision_type must be one of {sorted(DECISION_STATUSES)}")
    amount = _decimal(params.get("approved_amount"))
    term = params.get("approved_term_months")
    term = int(term) if term is not None else None
    conditions = list(params.get("conditions") or [])
    if str(decision_type).startswith("APPROVED") and (amount is None or amount <= 0):
        raise ValidationError(
            "APPROVED_AMOUNT_INVALID",
            "Số tiền duyệt phải lớn hơn 0.",
            {"approved_amount": None if amount is None else str(amount)},
        )
    if str(decision_type).startswith("APPROVED") and (not term or term <= 0):
        raise ValidationError(
            "APPROVED_TERM_INVALID", "Kỳ hạn duyệt phải lớn hơn 0.", {"approved_term_months": term}
        )
    # Cap phe duyet tinh tu so tien de nghi (submit_to_approval): duyet vuot so tien
    # de nghi se vuot tham quyen cua cap da dinh tuyen (database kiem lai, V027).
    requested = _decimal(requested_amount)
    if str(decision_type).startswith("APPROVED") and amount is not None and (
        requested is None or amount > requested
    ):
        raise ValidationError(
            "APPROVED_AMOUNT_EXCEEDS_REQUESTED",
            "Số tiền duyệt không được vượt số tiền đề xuất.",
            {
                "approved_amount": str(amount),
                "requested_amount": None if requested is None else str(requested),
            },
        )
    if decision_type == "APPROVED_WITH_CONDITIONS" and not conditions:
        raise ValueError("APPROVED_WITH_CONDITIONS requires at least one condition")
    is_override = bool(params.get("is_override", False))
    override_reason = params.get("override_reason")
    if is_override and not str(override_reason or "").strip():
        raise ValueError("An override reason is required")
    approval_request_id = params.get("approval_request_id")
    return {
        "decision_type": str(decision_type),
        "approved_amount": amount,
        "approved_term_months": term,
        "conditions": conditions,
        "approval_request_id": UUID(str(approval_request_id)) if approval_request_id else None,
        "is_override": is_override,
        "override_reason": override_reason,
    }


def _decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation as error:
        raise ValueError("approved_amount must be a decimal number") from error
