-- V047: trưởng phòng chuyển người xử lý kèm lý do (Q-D) và đọc doanh thu để cảnh báo phân khúc SME (Q8).
-- Người nhận phải cùng vai trò của bước đang mở và không bị loại theo tách bạch (credit.is_excluded).

CREATE TABLE credit.case_reassignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    case_step_id UUID NOT NULL REFERENCES credit.case_step(id),
    from_employee_id UUID NULL REFERENCES identity.employee(id),
    to_employee_id UUID NOT NULL REFERENCES identity.employee(id),
    reassigned_by UUID NOT NULL REFERENCES identity.employee(id),
    reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE credit.case_reassignment ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_reassignment_select_policy ON credit.case_reassignment
    FOR SELECT USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
GRANT SELECT ON credit.case_reassignment TO bank_app;

CREATE FUNCTION credit.step_role(p_step_code TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $function$
    SELECT CASE p_step_code
        WHEN 'CHECKING' THEN 'document_reviewer'
        WHEN 'APPRAISAL' THEN 'credit_appraiser'
        WHEN 'RISK_REVIEW' THEN 'risk_officer'
    END;
$function$;

-- Ứng viên nhận hồ sơ: cùng vai trò bước đang mở, không bị loại, không phải người đang giữ.
CREATE FUNCTION credit.reassign_candidates(p_loan_id UUID)
RETURNS TABLE (employee_id UUID, full_name TEXT, open_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    SELECT employee.id, employee.full_name::text,
           (SELECT count(*) FROM credit.case_step AS open_step
             WHERE open_step.assignee_employee_id = employee.id AND open_step.completed_at IS NULL)
    FROM credit.case_step AS step
    JOIN identity.employee AS employee ON credit.has_active_role(employee.id, credit.step_role(step.step_code))
    WHERE step.loan_application_id = p_loan_id AND step.completed_at IS NULL
      AND credit.step_role(step.step_code) IS NOT NULL
      AND employee.id IS DISTINCT FROM step.assignee_employee_id
      AND NOT credit.is_excluded(employee.id, p_loan_id)
      AND credit.has_active_role(identity.current_employee_id(), 'credit_manager')
      AND identity.can_read_loan(identity.current_employee_id(), p_loan_id)
    ORDER BY 3, employee.full_name;
$function$;

CREATE FUNCTION credit.reassign_case_step(p_loan_id UUID, p_caller UUID, p_new_assignee UUID, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $function$
DECLARE
    v_step credit.case_step%ROWTYPE;
BEGIN
    IF p_caller IS DISTINCT FROM identity.current_employee_id()
       OR NOT credit.has_active_role(p_caller, 'credit_manager')
       OR NOT identity.can_read_loan(p_caller, p_loan_id) THEN
        RAISE EXCEPTION 'Only a credit manager who can read the case may reassign it'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'A reassignment reason is required' USING ERRCODE = '22023';
    END IF;
    SELECT step.* INTO v_step FROM credit.case_step AS step
    WHERE step.loan_application_id = p_loan_id AND step.completed_at IS NULL
      AND credit.step_role(step.step_code) IS NOT NULL
    ORDER BY step.received_at DESC LIMIT 1;
    IF v_step.id IS NULL THEN
        RAISE EXCEPTION 'The case has no open step that can be reassigned' USING ERRCODE = '55000';
    END IF;
    IF p_new_assignee IS NOT DISTINCT FROM v_step.assignee_employee_id
       OR NOT credit.has_active_role(p_new_assignee, credit.step_role(v_step.step_code))
       OR credit.is_excluded(p_new_assignee, p_loan_id) THEN
        RAISE EXCEPTION 'The new assignee is not eligible for this step' USING ERRCODE = '23514';
    END IF;
    INSERT INTO credit.case_reassignment (loan_application_id, case_step_id, from_employee_id, to_employee_id, reassigned_by, reason)
    VALUES (p_loan_id, v_step.id, v_step.assignee_employee_id, p_new_assignee, p_caller, btrim(p_reason));
    UPDATE credit.case_step SET assignee_employee_id = p_new_assignee WHERE id = v_step.id;
    UPDATE credit.loan_application SET assigned_employee_id = p_new_assignee WHERE id = p_loan_id;
    INSERT INTO integration.notification (id, employee_id, notification_type, title, message, resource_type, resource_id, status, created_at)
    SELECT gen_random_uuid(), p_new_assignee, 'CASE_ASSIGNED', 'Được giao hồ sơ',
           'Trưởng phòng chuyển hồ sơ cho bạn: ' || btrim(p_reason), 'LOAN_APPLICATION', p_loan_id, 'UNREAD', now();
    RETURN v_step.id;
END
$function$;

REVOKE ALL ON FUNCTION credit.reassign_candidates(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.reassign_case_step(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.reassign_candidates(UUID) TO bank_app;
GRANT EXECUTE ON FUNCTION credit.reassign_case_step(UUID, UUID, UUID, TEXT) TO bank_app;

-- Q8: bank_app đọc doanh thu (RLS can_read_customer vẫn áp dụng) để cảnh báo khách trên 1.000 tỷ.
GRANT SELECT ON credit.sme_financial_year TO bank_app;
