-- V062 (C-N3): phạm vi đọc lượt chạy đội agent theo Q-M.
--  1. Người chạy luôn thấy lượt của chính mình trong danh sách lượt của hồ sơ.
--  2. Ca engine của hồ sơ còn NHÁP chỉ người nộp hoặc người đọc được hồ sơ thấy; Thẩm định/Rủi ro cùng chi nhánh
--     đọc được khách hàng nhưng không còn đọc được trace của lượt chạy trên nháp (Q-M: cùng chi nhánh không tự thấy nhau).
DROP POLICY loan_agent_run_select_policy ON credit.loan_agent_run;
CREATE POLICY loan_agent_run_select_policy ON credit.loan_agent_run
FOR SELECT TO bank_app
USING (started_by = identity.current_employee_id()
       OR identity.can_read_loan(identity.current_employee_id(), loan_application_id));

CREATE FUNCTION identity.case_on_unreadable_draft(p_employee UUID, p_payload JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $function$
DECLARE
    v_loan UUID;
BEGIN
    BEGIN
        v_loan := (p_payload -> 'request' ->> 'loan_application_id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN FALSE;
    END;
    IF v_loan IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (SELECT 1 FROM credit.loan_application AS loan WHERE loan.id = v_loan AND loan.status = 'DRAFT')
       AND NOT identity.can_read_loan(p_employee, v_loan);
END
$function$;
REVOKE ALL ON FUNCTION identity.case_on_unreadable_draft(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.case_on_unreadable_draft(UUID, JSONB) TO bank_engine;

DROP POLICY case_run_policy ON agent.case_run;
CREATE POLICY case_run_policy ON agent.case_run TO bank_engine
    USING (submitted_by = identity.current_employee_id()
           OR (identity.can_read_customer(identity.current_employee_id(), customer_id)
               AND NOT identity.case_on_unreadable_draft(identity.current_employee_id(), payload))
           OR identity.can_read_customer_case(identity.current_employee_id(), customer_id))
    WITH CHECK (identity.can_read_customer(identity.current_employee_id(), customer_id));
