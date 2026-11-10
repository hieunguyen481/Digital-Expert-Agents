-- Q-M: người được phân công đọc hồ sơ thì đọc được lượt chạy đội agent và đề xuất của hồ sơ đó.
-- Trước đây case_run chỉ hiện với người nộp hoặc người đọc được khách hàng (QHKH/chi nhánh/phạm vi),
-- nên Rủi ro, Thẩm định ở chi nhánh khác không thấy khối đề xuất hành động.
CREATE OR REPLACE FUNCTION identity.can_read_customer_case(p_employee UUID, p_customer UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT p_employee IS NOT NULL
       AND p_customer IS NOT NULL
       AND p_employee = identity.current_employee_id()
       AND EXISTS (
            SELECT 1 FROM credit.loan_application AS l
            WHERE l.primary_customer_id = p_customer
              AND identity.can_read_loan(p_employee, l.id)
       );
$function$;

REVOKE ALL ON FUNCTION identity.can_read_customer_case(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.can_read_customer_case(UUID, UUID) TO bank_engine;

DROP POLICY case_run_policy ON agent.case_run;
CREATE POLICY case_run_policy ON agent.case_run TO bank_engine
    USING (submitted_by = identity.current_employee_id()
           OR identity.can_read_customer(identity.current_employee_id(), customer_id)
           OR identity.can_read_customer_case(identity.current_employee_id(), customer_id))
    WITH CHECK (identity.can_read_customer(identity.current_employee_id(), customer_id));
