-- V025: mot ham chuyen buoc nguyen tu (Task 9, rules.md Q-M, Q-N, Q-O, E8).
--   * credit.apply_transition: doi trang thai ho so, dong/tam dung/tinh tiep buoc
--     cu va mo buoc moi trong MOT lenh goi. Can SECURITY DEFINER vi nguoi nhan
--     buoc mat quyen ghi (identity.can_write_loan) ngay khi dong buoc cua minh,
--     nen khong tu INSERT buoc tiep theo cho nguoi khac duoc.
--   * Ham tu kiem tra lai moi dieu kien, khong tin nguoi goi: nguoi goi la
--     identity.current_employee_id(), co vai tro cua action, dang ghi duoc ho so,
--     trang thai nguon va phien ban khop (sai phien ban -> SQLSTATE WF409), ly do,
--     nguoi nhan buoc moi dung vai tro / tham quyen / khong bi tach bach, va han
--     (due_at, so ngay con lai) dung bang credit.add_workdays / workdays_between.
--     Bang action duoi day lap lai app/workflow/transitions.py.
--   * Dinh tuyen chay trong ngu canh nhan vien: pick_role_assignee va
--     approver_candidates dem buoc dang mo tren MOI ho so (RLS chi cho thay ho so
--     cua minh) nen cung la SECURITY DEFINER.
--   * F9: cot hinh thuc tra tien thue dat tren tai san bao dam.
-- Quy uoc SECURITY DEFINER: search_path = pg_catalog, tham so ten p_, khong co
-- nhanh quan tri (Q-J), REVOKE FROM PUBLIC, chi cap EXECUTE cho bank_app.

-- ---------------------------------------------------------------------------
-- 1. F9: hinh thuc tra tien thue dat cua tai san tren dat thue
-- ---------------------------------------------------------------------------
ALTER TABLE credit.collateral
    ADD COLUMN on_leased_land BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN land_lease_payment VARCHAR(20) NULL,
    ADD COLUMN land_lease_proof_document_id UUID NULL REFERENCES document.document(id),
    ADD CONSTRAINT ck_collateral_land_lease_payment CHECK (
        land_lease_payment IS NULL OR land_lease_payment IN ('ANNUAL', 'ONE_TIME')
    );

COMMENT ON COLUMN credit.collateral.on_leased_land IS
    'Asset sits on leased land; the RM must choose land_lease_payment before submitting (F9).';
COMMENT ON COLUMN credit.collateral.land_lease_payment IS
    'ANNUAL (flagged, appraisal values only assets attached to land) or ONE_TIME (needs proof).';

-- ---------------------------------------------------------------------------
-- 2. Ham noi bo (khong cap EXECUTE cho runtime)
-- ---------------------------------------------------------------------------
CREATE FUNCTION credit.has_active_role(p_employee_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT p_employee_id IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM identity.employee AS employee
            JOIN identity.employee_role AS employee_role
              ON employee_role.employee_id = employee.id
            JOIN identity.role AS role
              ON role.id = employee_role.role_id
            WHERE employee.id = p_employee_id
              AND employee.employment_status = 'ACTIVE'
              AND role.role_code = p_role::public.citext
              AND employee_role.valid_from <= CURRENT_TIMESTAMP
              AND (employee_role.valid_until IS NULL OR employee_role.valid_until > CURRENT_TIMESTAMP)
       );
$function$;

-- Nguoi phe duyet hop le cho ho so (khop routing.pick_approver): vai tro
-- loan_approver, tham quyen con hieu luc voi cap >= p_min_tier (cap 3 la Hoi
-- dong, khong ca nhan), cap 1 phai cung chi nhanh voi khach, khong bi tach bach.
CREATE FUNCTION credit.is_eligible_approver(
    p_employee_id UUID, p_loan_id UUID, p_min_tier SMALLINT, p_branch_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT credit.has_active_role(p_employee_id, 'loan_approver')
       AND EXISTS (
            SELECT 1
            FROM identity.employee_authority AS authority
            WHERE authority.employee_id = p_employee_id
              AND authority.valid_from <= CURRENT_DATE
              AND (authority.valid_until IS NULL OR authority.valid_until >= CURRENT_DATE)
              AND authority.tier >= p_min_tier
              AND authority.tier < 3
              AND (authority.tier > 1 OR authority.branch_id = p_branch_id)
       )
       AND NOT credit.is_excluded(p_employee_id, p_loan_id);
$function$;

-- ---------------------------------------------------------------------------
-- 3. Dinh tuyen (goi trong ngu canh nhan vien dang chuyen buoc)
-- ---------------------------------------------------------------------------
-- Nguoi nhan buoc theo vai tro: uu tien nguoi da nhan cung buoc nay cua ho so
-- (vd. Rui ro tra ve Tham dinh -> cung tham dinh vien), sau do it buoc dang mo
-- nhat, hoa thi theo id. NULL neu nguoi goi khong doc duoc ho so.
CREATE FUNCTION credit.pick_role_assignee(p_loan_id UUID, p_step_code TEXT, p_role TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT candidate.id
    FROM (
        SELECT employee.id,
               EXISTS (
                   SELECT 1
                   FROM credit.case_step AS previous_step
                   WHERE previous_step.loan_application_id = p_loan_id
                     AND previous_step.step_code = p_step_code
                     AND previous_step.assignee_employee_id = employee.id
               ) AS handled_before,
               (
                   SELECT count(*)
                   FROM credit.case_step AS open_step
                   WHERE open_step.assignee_employee_id = employee.id
                     AND open_step.completed_at IS NULL
               ) AS open_count
        FROM identity.employee AS employee
        WHERE credit.has_active_role(employee.id, p_role)
    ) AS candidate
    WHERE identity.can_read_loan(identity.current_employee_id(), p_loan_id)
    ORDER BY candidate.handled_before DESC, candidate.open_count, candidate.id
    LIMIT 1;
$function$;

-- Ung vien phe duyet o mot cap (routing.ApproverDirectory.list_approver_candidates).
CREATE FUNCTION credit.approver_candidates(p_tier SMALLINT)
RETURNS TABLE (
    employee_id UUID,
    tier SMALLINT,
    unit_scope VARCHAR,
    branch_id UUID,
    open_step_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT authority.employee_id,
           authority.tier,
           authority.unit_scope,
           authority.branch_id,
           (
               SELECT count(*)
               FROM credit.case_step AS open_step
               WHERE open_step.assignee_employee_id = authority.employee_id
                 AND open_step.completed_at IS NULL
           )
    FROM identity.employee_authority AS authority
    WHERE identity.current_employee_id() IS NOT NULL
      AND authority.tier = p_tier
      AND authority.valid_from <= CURRENT_DATE
      AND (authority.valid_until IS NULL OR authority.valid_until >= CURRENT_DATE)
      AND credit.has_active_role(authority.employee_id, 'loan_approver');
$function$;

-- ---------------------------------------------------------------------------
-- 4. Chuyen buoc nguyen tu
-- ---------------------------------------------------------------------------
-- SQLSTATE: 42501 khong co quyen (vai tro, ghi ho so, tach bach); 22023 tham so
-- sai (action, trang thai, ly do, nguoi nhan, han); 55000 buoc hien tai khong
-- khop trang thai; WF409 phien ban da doi (nguoi khac vua chuyen buoc).
CREATE FUNCTION credit.apply_transition(
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
    -- (credit_manager) duoc rut ho so ma minh doc duoc (Q-O).
    IF NOT (
        identity.can_write_loan(v_caller, p_loan_id)
        OR (
            p_action = 'withdraw'
            AND identity.current_has_role('credit_manager'::public.citext)
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

-- ---------------------------------------------------------------------------
-- 5. Quyen
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION credit.has_active_role(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.is_eligible_approver(UUID, UUID, SMALLINT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.pick_role_assignee(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.approver_candidates(SMALLINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.apply_transition(
    UUID, TEXT, INT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, INT, SMALLINT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION credit.pick_role_assignee(UUID, TEXT, TEXT) TO bank_app;
GRANT EXECUTE ON FUNCTION credit.approver_candidates(SMALLINT) TO bank_app;
GRANT EXECUTE ON FUNCTION credit.apply_transition(
    UUID, TEXT, INT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, INT, SMALLINT, TEXT
) TO bank_app;

COMMENT ON FUNCTION credit.apply_transition(
    UUID, TEXT, INT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, INT, SMALLINT, TEXT
) IS
    'Atomic workflow transition: re-checks caller role, write access, status, version (WF409), reason, assignee and SLA dates, then closes/pauses/resumes and opens case steps.';
COMMENT ON FUNCTION credit.pick_role_assignee(UUID, TEXT, TEXT) IS
    'Assignee for a role step: previous handler of the same step on the case, else least open steps.';
COMMENT ON FUNCTION credit.approver_candidates(SMALLINT) IS
    'Active approvers of a tier with their open step counts (routing.ApproverDirectory).';
