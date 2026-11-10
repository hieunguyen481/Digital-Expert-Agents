-- R-01 / Q11: QHKH gia han han bo sung dung 1 lan (co ly do) cho moi buoc cho khach bo sung.
-- Han moi do ung dung tinh (lich lam viec + ngay le) va truyen vao; ham chi kiem quyen, trang thai,
-- so lan va ghi nhan. SECURITY DEFINER vi bank_app khong co quyen UPDATE credit.case_step.
CREATE TABLE credit.deadline_extension (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    case_step_id UUID NOT NULL UNIQUE REFERENCES credit.case_step(id),
    extended_by UUID NOT NULL REFERENCES identity.employee(id),
    reason TEXT NOT NULL,
    previous_due_at TIMESTAMPTZ NOT NULL,
    new_due_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_deadline_extension_reason CHECK (length(btrim(reason)) > 0),
    CONSTRAINT ck_deadline_extension_due CHECK (new_due_at > previous_due_at)
);
CREATE INDEX idx_deadline_extension_loan ON credit.deadline_extension(loan_application_id);

GRANT SELECT ON credit.deadline_extension TO bank_app;
ALTER TABLE credit.deadline_extension ENABLE ROW LEVEL SECURITY;
CREATE POLICY deadline_extension_select_policy ON credit.deadline_extension
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));

CREATE FUNCTION credit.extend_case_deadline(
    p_loan_id UUID, p_caller UUID, p_reason TEXT, p_new_due_at TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_step credit.case_step%ROWTYPE;
    v_status TEXT;
    v_rm UUID;
BEGIN
    IF p_caller IS DISTINCT FROM identity.current_employee_id()
       OR NOT credit.has_active_role(p_caller, 'credit_officer') THEN
        RAISE EXCEPTION 'Only the relationship manager may extend the supplement deadline'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'An extension reason is required' USING ERRCODE = '22023';
    END IF;
    SELECT loan.status, customer_record.relationship_manager_id INTO v_status, v_rm
    FROM credit.loan_application AS loan
    JOIN customer.customer AS customer_record ON customer_record.id = loan.primary_customer_id
    WHERE loan.id = p_loan_id;
    IF v_status IS NULL OR v_rm IS DISTINCT FROM p_caller THEN
        RAISE EXCEPTION 'Only the relationship manager of the customer may extend the deadline'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT step.* INTO v_step
    FROM credit.case_step AS step
    WHERE step.loan_application_id = p_loan_id AND step.completed_at IS NULL
      AND ((v_status = 'RETURNED_TO_RM' AND step.step_code = 'RM_REWORK')
        OR (v_status = 'APPRAISAL_PENDING_INFO' AND step.step_code = 'PENDING_INFO'))
    ORDER BY step.received_at DESC LIMIT 1;
    IF v_step.id IS NULL OR v_step.due_at IS NULL THEN
        RAISE EXCEPTION 'The case has no supplement deadline to extend' USING ERRCODE = '55000';
    END IF;
    IF EXISTS (SELECT 1 FROM credit.deadline_extension WHERE case_step_id = v_step.id) THEN
        RAISE EXCEPTION 'The supplement deadline was already extended once' USING ERRCODE = '23505';
    END IF;
    INSERT INTO credit.deadline_extension (
        loan_application_id, case_step_id, extended_by, reason, previous_due_at, new_due_at
    ) VALUES (p_loan_id, v_step.id, p_caller, btrim(p_reason), v_step.due_at, p_new_due_at);
    UPDATE credit.case_step SET due_at = p_new_due_at WHERE id = v_step.id;
    RETURN p_new_due_at;
END
$function$;

REVOKE ALL ON FUNCTION credit.extend_case_deadline(UUID, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.extend_case_deadline(UUID, UUID, TEXT, TIMESTAMPTZ) TO bank_app;
