-- V025.2: sua vong 2 Task 9 (Q-N). Khi ho so vao RISK_REVIEW (submit_to_risk,
-- fraud_release, accept_explanation) ma chua co Tuan thu doc duoc ho so,
-- apply_transition chon mot compliance_officer (it viec nhat, khong bi tach bach
-- E8, hoa theo id) va cap identity.employee_scope LOAN_APPLICATION / loan:read de
-- nguoi do doc ho so va thao tac y kien con (V025_1). Khong mo rong can_read_loan.
-- Idempotent: da co Tuan thu con hieu luc tren ho so thi khong them dong.

-- Noi bo (khong cap EXECUTE cho runtime); chi goi tu apply_transition.
CREATE FUNCTION credit.ensure_compliance_reader(p_loan_id UUID, p_caller UUID, p_action TEXT)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_reader UUID;
BEGIN
    SELECT scope.employee_id INTO v_reader
    FROM identity.employee_scope AS scope
    WHERE scope.scope_type = 'LOAN_APPLICATION'
      AND scope.scope_id = p_loan_id
      AND scope.permission_code = 'loan:read'::public.citext
      AND scope.valid_from <= CURRENT_TIMESTAMP
      AND (scope.valid_until IS NULL OR scope.valid_until > CURRENT_TIMESTAMP)
      AND credit.has_active_role(scope.employee_id, 'compliance_officer')
    ORDER BY scope.created_at, scope.employee_id
    LIMIT 1;
    IF v_reader IS NOT NULL THEN
        RETURN v_reader;
    END IF;

    -- It viec nhat: buoc dang mo + ho so dang o Y kien Rui ro ma nguoi do doc qua scope.
    SELECT candidate.id INTO v_reader
    FROM (
        SELECT employee.id,
               (
                   SELECT count(*)
                   FROM credit.case_step AS open_step
                   WHERE open_step.assignee_employee_id = employee.id
                     AND open_step.completed_at IS NULL
               ) + (
                   SELECT count(*)
                   FROM identity.employee_scope AS held
                   JOIN credit.loan_application AS held_loan ON held_loan.id = held.scope_id
                   WHERE held.employee_id = employee.id
                     AND held.scope_type = 'LOAN_APPLICATION'
                     AND (held.valid_until IS NULL OR held.valid_until > CURRENT_TIMESTAMP)
                     AND held_loan.status IN ('RISK_REVIEW', 'RISK_PENDING_INFO', 'RISK_HOLD_FRAUD')
               ) AS workload
        FROM identity.employee AS employee
        WHERE credit.has_active_role(employee.id, 'compliance_officer')
          AND NOT credit.is_excluded(employee.id, p_loan_id)
    ) AS candidate
    ORDER BY candidate.workload, candidate.id
    LIMIT 1;
    IF v_reader IS NULL THEN
        RAISE EXCEPTION 'no eligible compliance officer for loan application %', p_loan_id
            USING ERRCODE = '55000';
    END IF;

    INSERT INTO identity.employee_scope (
        id, employee_id, scope_type, scope_id, permission_code, valid_from,
        valid_until, assigned_by, reason, created_at
    )
    VALUES (
        gen_random_uuid(), v_reader, 'LOAN_APPLICATION', p_loan_id, 'loan:read',
        CURRENT_TIMESTAMP, NULL, p_caller,
        'Tuan thu - y kien con buoc Y kien Rui ro (' || p_action || ')', CURRENT_TIMESTAMP
    );
    RETURN v_reader;
END
$function$;

REVOKE ALL ON FUNCTION credit.ensure_compliance_reader(UUID, UUID, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION credit.apply_transition(
    p_loan_id UUID,
    p_action TEXT,
    p_expected_version INT,
    p_from_status TEXT,
    p_to_status TEXT,
    p_reason TEXT,
    p_new_assignee UUID,
    p_new_due_at TIMESTAMPTZ,
    p_remaining_workdays INT,
    p_approval_tier SMALLINT,
    p_withdraw_kind TEXT
)
RETURNS TABLE (
    out_status TEXT,
    out_version INT,
    out_step_code TEXT,
    out_assignee UUID,
    out_due_at TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_caller UUID := identity.current_employee_id();
    v_now TIMESTAMPTZ := CURRENT_TIMESTAMP;
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
    v_froms TEXT[];
    v_tos TEXT[];
    v_roles TEXT[];
    v_reason_required BOOLEAN := TRUE;
    v_status TEXT;
    v_version INT;
    v_customer UUID;
    v_rm UUID;
    v_home_branch UUID;
    v_main credit.case_step%ROWTYPE;
    v_side credit.case_step%ROWTYPE;
    v_has_main BOOLEAN;
    v_has_side BOOLEAN;
    v_expected_main TEXT;
    v_close_result TEXT;
    v_new_code TEXT;
    v_new_role TEXT;
    v_new_must_be UUID;
    v_sla_key TEXT;
    v_expected_due TIMESTAMPTZ;
    v_expected_remaining INT;
    v_required_tier SMALLINT;
    v_held_remaining INT;
    v_result_step TEXT;
    v_result_assignee UUID;
    v_result_due TIMESTAMPTZ;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'apply_transition requires an employee context' USING ERRCODE = '42501';
    END IF;
    IF p_loan_id IS NULL OR p_action IS NULL OR p_expected_version IS NULL
       OR p_from_status IS NULL OR p_to_status IS NULL THEN
        RAISE EXCEPTION 'apply_transition: missing required argument' USING ERRCODE = '22023';
    END IF;

    -- Bang action (lap lai app/workflow/transitions.py).
    CASE p_action
        WHEN 'submit_to_checking' THEN
            v_froms := ARRAY['DRAFT', 'RETURNED_TO_RM']; v_tos := ARRAY['CHECKING'];
            v_roles := ARRAY['credit_officer']; v_reason_required := FALSE;
        WHEN 'return_to_rm' THEN
            v_froms := ARRAY['CHECKING', 'APPRAISAL']; v_tos := ARRAY['RETURNED_TO_RM'];
            v_roles := ARRAY['document_reviewer', 'credit_appraiser'];
        WHEN 'pass_to_appraisal' THEN
            v_froms := ARRAY['CHECKING']; v_tos := ARRAY['APPRAISAL'];
            v_roles := ARRAY['document_reviewer']; v_reason_required := FALSE;
        WHEN 'request_info' THEN
            v_froms := ARRAY['APPRAISAL']; v_tos := ARRAY['APPRAISAL_PENDING_INFO'];
            v_roles := ARRAY['credit_appraiser'];
        WHEN 'accept_info' THEN
            v_froms := ARRAY['APPRAISAL_PENDING_INFO']; v_tos := ARRAY['APPRAISAL'];
            v_roles := ARRAY['document_reviewer']; v_reason_required := FALSE;
        WHEN 'submit_to_risk' THEN
            v_froms := ARRAY['APPRAISAL']; v_tos := ARRAY['RISK_REVIEW'];
            v_roles := ARRAY['credit_appraiser']; v_reason_required := FALSE;
        WHEN 'risk_return' THEN
            v_froms := ARRAY['RISK_REVIEW']; v_tos := ARRAY['APPRAISAL'];
            v_roles := ARRAY['risk_officer', 'compliance_officer'];
        WHEN 'request_explanation' THEN
            v_froms := ARRAY['RISK_REVIEW']; v_tos := ARRAY['RISK_PENDING_INFO'];
            v_roles := ARRAY['compliance_officer'];
        WHEN 'accept_explanation' THEN
            v_froms := ARRAY['RISK_PENDING_INFO']; v_tos := ARRAY['RISK_REVIEW'];
            v_roles := ARRAY['document_reviewer']; v_reason_required := FALSE;
        WHEN 'fraud_hold' THEN
            v_froms := ARRAY['RISK_REVIEW']; v_tos := ARRAY['RISK_HOLD_FRAUD'];
            v_roles := ARRAY['compliance_officer'];
        WHEN 'fraud_release' THEN
            v_froms := ARRAY['RISK_HOLD_FRAUD']; v_tos := ARRAY['RISK_REVIEW'];
            v_roles := ARRAY['compliance_officer'];
        WHEN 'submit_to_approval' THEN
            v_froms := ARRAY['RISK_REVIEW']; v_tos := ARRAY['APPROVAL', 'COUNCIL_SESSION'];
            v_roles := ARRAY['risk_officer']; v_reason_required := FALSE;
        WHEN 'decide' THEN
            v_froms := ARRAY['APPROVAL'];
            v_tos := ARRAY['APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED'];
            v_roles := ARRAY['loan_approver'];
        WHEN 'return_for_supplement' THEN
            v_froms := ARRAY['APPROVAL']; v_tos := ARRAY['APPRAISAL', 'RETURNED_TO_RM'];
            v_roles := ARRAY['loan_approver'];
        WHEN 'withdraw' THEN
            v_froms := ARRAY['RETURNED_TO_RM', 'APPRAISAL_PENDING_INFO']; v_tos := ARRAY['WITHDRAWN'];
            v_roles := ARRAY['credit_officer', 'credit_manager'];
        ELSE
            RAISE EXCEPTION 'unknown workflow action %', p_action USING ERRCODE = '22023';
    END CASE;

    IF NOT (p_from_status = ANY (v_froms)) OR NOT (p_to_status = ANY (v_tos)) THEN
        RAISE EXCEPTION 'action % does not move % to %', p_action, p_from_status, p_to_status
            USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM unnest(v_roles) AS allowed(code)
        WHERE identity.current_has_role(allowed.code::public.citext)
    ) THEN
        RAISE EXCEPTION 'caller lacks a role for action %', p_action USING ERRCODE = '42501';
    END IF;
    IF v_reason_required AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
        RAISE EXCEPTION 'action % requires a reason', p_action USING ERRCODE = '22023';
    END IF;
    IF p_action = 'withdraw' AND (p_withdraw_kind IS NULL OR p_withdraw_kind NOT IN ('CUSTOMER', 'OVERDUE')) THEN
        RAISE EXCEPTION 'withdraw requires withdraw_kind CUSTOMER or OVERDUE' USING ERRCODE = '22023';
    END IF;
    -- Ghi ho so: nguoi nhan buoc dang mo / QHKH theo trang thai; truong phong
    -- (credit_manager) duoc rut ho so ma minh doc duoc (Q-O); Tuan thu
    -- (compliance_officer) doc duoc ho so thi duoc thao tac y kien con cua minh o
    -- buoc Y kien Rui ro du khong giu buoc (Q-N). Trang thai nguon van kiem duoi.
    IF NOT (
        identity.can_write_loan(v_caller, p_loan_id)
        OR (
            p_action = 'withdraw'
            AND identity.current_has_role('credit_manager'::public.citext)
            AND identity.can_read_loan(v_caller, p_loan_id)
        )
        OR (
            p_action IN ('request_explanation', 'fraud_hold', 'fraud_release', 'risk_return')
            AND identity.current_has_role('compliance_officer'::public.citext)
            AND identity.can_read_loan(v_caller, p_loan_id)
        )
    ) THEN
        RAISE EXCEPTION 'caller may not change loan application %', p_loan_id USING ERRCODE = '42501';
    END IF;
    -- E8: kiem ca o database.
    IF p_action IN ('decide', 'return_for_supplement') AND credit.is_excluded(v_caller, p_loan_id) THEN
        RAISE EXCEPTION 'caller is excluded from deciding loan application %', p_loan_id
            USING ERRCODE = '42501';
    END IF;

    -- Khoa ho so; lenh dong thoi thu hai cho o day va thay phien ban moi.
    SELECT loan.status, loan.version, loan.primary_customer_id
    INTO v_status, v_version, v_customer
    FROM credit.loan_application AS loan
    WHERE loan.id = p_loan_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'loan application % not found', p_loan_id USING ERRCODE = '42501';
    END IF;
    IF v_version <> p_expected_version THEN
        RAISE EXCEPTION 'loan application % version is %, expected %', p_loan_id, v_version, p_expected_version
            USING ERRCODE = 'WF409';
    END IF;
    IF v_status <> p_from_status THEN
        RAISE EXCEPTION 'loan application % is %, not %', p_loan_id, v_status, p_from_status
            USING ERRCODE = '22023';
    END IF;

    SELECT customer_record.relationship_manager_id, customer_record.home_branch_id
    INTO v_rm, v_home_branch
    FROM customer.customer AS customer_record
    WHERE customer_record.id = v_customer;

    SELECT * INTO v_main
    FROM credit.case_step AS step
    WHERE step.loan_application_id = p_loan_id
      AND step.completed_at IS NULL
      AND step.step_code NOT IN ('PENDING_INFO', 'RISK_PENDING_INFO')
    FOR UPDATE;
    v_has_main := FOUND;
    SELECT * INTO v_side
    FROM credit.case_step AS step
    WHERE step.loan_application_id = p_loan_id
      AND step.completed_at IS NULL
      AND step.step_code IN ('PENDING_INFO', 'RISK_PENDING_INFO')
    ORDER BY step.received_at DESC
    LIMIT 1
    FOR UPDATE;
    v_has_side := FOUND;

    v_expected_main := CASE p_from_status
        WHEN 'DRAFT' THEN 'RM_DRAFT'
        WHEN 'RETURNED_TO_RM' THEN 'RM_REWORK'
        WHEN 'CHECKING' THEN 'CHECKING'
        WHEN 'APPRAISAL' THEN 'APPRAISAL'
        WHEN 'APPRAISAL_PENDING_INFO' THEN 'APPRAISAL'
        WHEN 'RISK_REVIEW' THEN 'RISK_REVIEW'
        WHEN 'RISK_PENDING_INFO' THEN 'RISK_REVIEW'
        WHEN 'RISK_HOLD_FRAUD' THEN 'FRAUD_HOLD'
        WHEN 'APPROVAL' THEN 'APPROVAL'
    END;
    IF v_has_main AND v_main.step_code <> v_expected_main THEN
        RAISE EXCEPTION 'open step % does not match status %', v_main.step_code, p_from_status
            USING ERRCODE = '55000';
    END IF;
    IF NOT v_has_main AND p_from_status NOT IN ('DRAFT', 'RETURNED_TO_RM') THEN
        RAISE EXCEPTION 'loan application % has no open % step', p_loan_id, v_expected_main
            USING ERRCODE = '55000';
    END IF;

    -- Buoc moi theo action.
    CASE p_action
        WHEN 'submit_to_checking' THEN
            v_close_result := 'SUBMITTED'; v_new_code := 'CHECKING';
            v_new_role := 'document_reviewer'; v_sla_key := 'CHECKING';
        WHEN 'pass_to_appraisal' THEN
            v_close_result := 'PASSED'; v_new_code := 'APPRAISAL';
            v_new_role := 'credit_appraiser'; v_sla_key := 'APPRAISAL';
        WHEN 'return_to_rm' THEN
            v_close_result := 'RETURNED'; v_new_code := 'RM_REWORK';
            v_new_must_be := v_rm; v_sla_key := 'CUSTOMER_SUPPLEMENT';
        WHEN 'request_info' THEN
            v_new_code := 'PENDING_INFO'; v_new_role := 'document_reviewer';
            v_sla_key := 'CUSTOMER_SUPPLEMENT';
        WHEN 'request_explanation' THEN
            v_new_code := 'RISK_PENDING_INFO'; v_new_role := 'document_reviewer';
            v_sla_key := 'CUSTOMER_SUPPLEMENT';
        WHEN 'accept_info', 'accept_explanation' THEN
            NULL;
        WHEN 'submit_to_risk' THEN
            v_close_result := 'SUBMITTED'; v_new_code := 'RISK_REVIEW';
            v_new_role := 'risk_officer'; v_sla_key := 'RISK_REVIEW';
        WHEN 'risk_return' THEN
            v_close_result := 'RETURNED'; v_new_code := 'APPRAISAL';
            v_new_role := 'credit_appraiser'; v_sla_key := 'APPRAISAL';
        WHEN 'fraud_hold' THEN
            v_close_result := 'FRAUD_HOLD'; v_new_code := 'FRAUD_HOLD'; v_new_must_be := v_caller;
        WHEN 'fraud_release' THEN
            v_close_result := 'RELEASED'; v_new_code := 'RISK_REVIEW'; v_new_role := 'risk_officer';
        WHEN 'submit_to_approval' THEN
            v_close_result := 'SUBMITTED'; v_new_code := p_to_status;
            IF p_to_status = 'APPROVAL' THEN
                v_sla_key := 'APPROVAL';
            END IF;
        WHEN 'decide' THEN
            v_close_result := p_to_status;
        WHEN 'return_for_supplement' THEN
            v_close_result := 'RETURN_FOR_SUPPLEMENT';
            IF p_to_status = 'APPRAISAL' THEN
                v_new_code := 'APPRAISAL'; v_new_role := 'credit_appraiser'; v_sla_key := 'APPRAISAL';
            ELSE
                v_new_code := 'RM_REWORK'; v_new_must_be := v_rm; v_sla_key := 'CUSTOMER_SUPPLEMENT';
            END IF;
        WHEN 'withdraw' THEN
            v_close_result := 'WITHDRAWN';
    END CASE;

    -- Quyet dinh phai da duoc ghi (credit.loan_decision, chi them) trong buoc nay.
    IF p_action IN ('decide', 'return_for_supplement') AND NOT EXISTS (
        SELECT 1
        FROM credit.loan_decision AS decision
        WHERE decision.loan_application_id = p_loan_id
          AND decision.decision_maker_id = v_caller
          AND decision.decision_type = CASE WHEN p_action = 'decide' THEN p_to_status
                                            ELSE 'RETURN_FOR_SUPPLEMENT' END
          AND decision.decision_at >= v_main.received_at
    ) THEN
        RAISE EXCEPTION 'no recorded decision for action %', p_action USING ERRCODE = '55000';
    END IF;

    -- Tam dung SLA buoc chinh (chờ bo sung) hoac luu so ngay con lai khi giu gian lan.
    IF p_action IN ('request_info', 'request_explanation', 'fraud_hold') THEN
        v_expected_remaining := CASE
            WHEN v_main.due_at IS NULL THEN NULL
            ELSE credit.workdays_between(v_today, (v_main.due_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE)
        END;
        IF p_remaining_workdays IS DISTINCT FROM v_expected_remaining THEN
            RAISE EXCEPTION 'remaining workdays % do not match %', p_remaining_workdays, v_expected_remaining
                USING ERRCODE = '22023';
        END IF;
        UPDATE credit.case_step AS step
        SET paused_at = v_now, remaining_workdays = v_expected_remaining, resumed_at = NULL
        WHERE step.id = v_main.id;
    ELSIF p_remaining_workdays IS NOT NULL THEN
        RAISE EXCEPTION 'remaining workdays only apply when pausing' USING ERRCODE = '22023';
    END IF;

    -- Tinh tiep SLA (E2, F7): tu luc HTTD ghi dat, con lai remaining_workdays.
    IF p_action IN ('accept_info', 'accept_explanation') THEN
        IF NOT v_has_side THEN
            RAISE EXCEPTION 'loan application % has no pending supplement step', p_loan_id
                USING ERRCODE = '55000';
        END IF;
        UPDATE credit.case_step AS step
        SET completed_at = v_now, result = 'ACCEPTED'
        WHERE step.id = v_side.id;
        v_expected_due := CASE
            WHEN v_main.remaining_workdays IS NULL THEN NULL
            ELSE credit.add_workdays(v_now, GREATEST(v_main.remaining_workdays, 0))
        END;
        IF p_new_due_at IS DISTINCT FROM v_expected_due THEN
            RAISE EXCEPTION 'resumed due % does not match %', p_new_due_at, v_expected_due
                USING ERRCODE = '22023';
        END IF;
        UPDATE credit.case_step AS step
        SET due_at = v_expected_due, resumed_at = v_now
        WHERE step.id = v_main.id;
        v_result_step := v_main.step_code;
        v_result_assignee := v_main.assignee_employee_id;
        v_result_due := v_expected_due;
    END IF;

    -- Dong buoc chinh.
    IF v_close_result IS NOT NULL AND v_has_main THEN
        UPDATE credit.case_step AS step
        SET completed_at = v_now, result = v_close_result, reason = p_reason
        WHERE step.id = v_main.id;
    END IF;
    IF p_action = 'withdraw' AND v_has_side THEN
        UPDATE credit.case_step AS step
        SET completed_at = v_now, result = 'WITHDRAWN', reason = p_reason
        WHERE step.loan_application_id = p_loan_id
          AND step.completed_at IS NULL;
    END IF;

    -- Mo buoc moi.
    IF v_new_code IS NOT NULL THEN
        IF v_new_code = 'APPROVAL' OR v_new_code = 'COUNCIL_SESSION' THEN
            v_required_tier := credit.required_tier(p_loan_id);
            IF p_approval_tier IS DISTINCT FROM v_required_tier THEN
                RAISE EXCEPTION 'approval tier % does not match required tier %', p_approval_tier, v_required_tier
                    USING ERRCODE = '22023';
            END IF;
            IF v_new_code = 'APPROVAL' THEN
                IF NOT credit.is_eligible_approver(p_new_assignee, p_loan_id, v_required_tier, v_home_branch) THEN
                    RAISE EXCEPTION 'assignee is not an eligible approver' USING ERRCODE = '22023';
                END IF;
            ELSIF p_new_assignee IS NOT NULL OR (
                v_required_tier < 3 AND EXISTS (
                    SELECT 1
                    FROM identity.employee_authority AS authority
                    WHERE credit.is_eligible_approver(
                        authority.employee_id, p_loan_id, v_required_tier, v_home_branch
                    )
                )
            ) THEN
                RAISE EXCEPTION 'council session only when no individual approver is eligible'
                    USING ERRCODE = '22023';
            END IF;
        ELSIF p_approval_tier IS NOT NULL THEN
            RAISE EXCEPTION 'approval tier only applies when submitting to approval' USING ERRCODE = '22023';
        ELSIF v_new_role IS NOT NULL THEN
            IF NOT credit.has_active_role(p_new_assignee, v_new_role) THEN
                RAISE EXCEPTION 'assignee lacks role %', v_new_role USING ERRCODE = '22023';
            END IF;
        ELSIF p_new_assignee IS NULL OR p_new_assignee IS DISTINCT FROM v_new_must_be THEN
            RAISE EXCEPTION 'assignee for % must be %', v_new_code, v_new_must_be USING ERRCODE = '22023';
        END IF;

        IF p_action = 'fraud_release' THEN
            -- Q-N: dong xu ly gian lan thi Y kien Rui ro tinh tiep so ngay con lai.
            SELECT held.remaining_workdays INTO v_held_remaining
            FROM credit.case_step AS held
            WHERE held.loan_application_id = p_loan_id
              AND held.step_code = 'RISK_REVIEW'
              AND held.result = 'FRAUD_HOLD'
            ORDER BY held.completed_at DESC
            LIMIT 1;
            v_expected_due := CASE
                WHEN v_held_remaining IS NULL THEN NULL
                ELSE credit.add_workdays(v_now, GREATEST(v_held_remaining, 0))
            END;
        ELSIF v_sla_key IS NOT NULL THEN
            v_expected_due := credit.add_workdays(
                v_now,
                (SELECT parameter.workdays FROM credit.sla_parameter AS parameter
                 WHERE parameter.step_code = v_sla_key)
            );
        ELSE
            v_expected_due := NULL;
        END IF;
        IF p_new_due_at IS DISTINCT FROM v_expected_due THEN
            RAISE EXCEPTION 'due % does not match %', p_new_due_at, v_expected_due USING ERRCODE = '22023';
        END IF;

        INSERT INTO credit.case_step (
            id, loan_application_id, step_code, assignee_employee_id, received_at,
            due_at, resumed_at, created_by, created_at
        )
        VALUES (
            gen_random_uuid(), p_loan_id, v_new_code, p_new_assignee, v_now,
            v_expected_due, CASE WHEN p_action = 'fraud_release' THEN v_now END, v_caller, v_now
        );
        IF p_action IN ('request_info', 'request_explanation') THEN
            -- Buoc chinh van la buoc cua ho so; buoc cho bo sung chay song song.
            v_result_step := v_main.step_code;
            v_result_assignee := v_main.assignee_employee_id;
            v_result_due := NULL;
        ELSE
            v_result_step := v_new_code;
            v_result_assignee := p_new_assignee;
            v_result_due := v_expected_due;
        END IF;
    ELSIF p_action NOT IN ('accept_info', 'accept_explanation') THEN
        IF p_new_assignee IS NOT NULL OR p_new_due_at IS NOT NULL OR p_approval_tier IS NOT NULL THEN
            RAISE EXCEPTION 'action % opens no step', p_action USING ERRCODE = '22023';
        END IF;
        v_result_step := v_main.step_code;
    END IF;

    -- Q-N: ho so vao Y kien Rui ro thi Tuan thu (y kien con thu hai) phai doc duoc.
    IF p_to_status = 'RISK_REVIEW' THEN
        PERFORM credit.ensure_compliance_reader(p_loan_id, v_caller, p_action);
    END IF;

    UPDATE credit.loan_application AS loan
    SET status = p_to_status,
        version = loan.version + 1,
        updated_at = v_now,
        updated_by = v_caller,
        submitted_at = CASE WHEN p_action = 'submit_to_approval' THEN v_now ELSE loan.submitted_at END,
        approval_tier = CASE WHEN p_action = 'submit_to_approval' THEN v_required_tier ELSE loan.approval_tier END,
        withdraw_reason = CASE WHEN p_action = 'withdraw' THEN p_withdraw_kind || ': ' || p_reason
                               ELSE loan.withdraw_reason END
    WHERE loan.id = p_loan_id
    RETURNING loan.version INTO v_version;

    RETURN QUERY SELECT p_to_status, v_version, v_result_step, v_result_assignee, v_result_due;
END
$function$;

REVOKE ALL ON FUNCTION credit.apply_transition(
    UUID, TEXT, INT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, INT, SMALLINT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.apply_transition(
    UUID, TEXT, INT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, INT, SMALLINT, TEXT
) TO bank_app;

COMMENT ON FUNCTION credit.ensure_compliance_reader(UUID, UUID, TEXT) IS
    'Q-N: grant one compliance officer LOAN_APPLICATION loan:read when a case enters RISK_REVIEW (idempotent).';
