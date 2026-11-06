-- Sua V030: mo/cap nhat case phai doc duoc khach hang (truoc day nguoi nop la du).
DROP POLICY case_run_policy ON agent.case_run;
CREATE POLICY case_run_policy ON agent.case_run TO bank_engine
    USING (submitted_by = identity.current_employee_id()
           OR identity.can_read_customer(identity.current_employee_id(), customer_id))
    WITH CHECK (identity.can_read_customer(identity.current_employee_id(), customer_id));
