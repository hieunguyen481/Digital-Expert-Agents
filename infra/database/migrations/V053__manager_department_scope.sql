-- V053: phạm vi của trưởng phòng (Q-D, Q-M): đọc hồ sơ thuộc phòng mình, chuyển người chỉ trong phòng.
-- Hồ sơ "thuộc phòng" = người được giao, người giữ/đã giữ bước, hoặc QHKH của khách chính thuộc cùng phòng với trưởng phòng.

CREATE FUNCTION identity.loan_in_manager_department(p_employee UUID, p_loan UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    SELECT p_employee IS NOT NULL AND p_loan IS NOT NULL
       AND credit.has_active_role(p_employee, 'credit_manager')
       AND EXISTS (
            SELECT 1
            FROM identity.employee AS manager
            JOIN credit.loan_application AS loan ON loan.id = p_loan
            LEFT JOIN customer.customer AS customer_record ON customer_record.id = loan.primary_customer_id
            WHERE manager.id = p_employee
              AND (
                  EXISTS (SELECT 1 FROM identity.employee AS member
                          WHERE member.department_id = manager.department_id
                            AND member.id = loan.assigned_employee_id)
                  OR EXISTS (SELECT 1 FROM identity.employee AS member
                             WHERE member.department_id = manager.department_id
                               AND member.id = customer_record.relationship_manager_id)
                  OR EXISTS (SELECT 1 FROM credit.case_step AS step
                             JOIN identity.employee AS member ON member.id = step.assignee_employee_id
                             WHERE step.loan_application_id = p_loan
                               AND member.department_id = manager.department_id)
              )
       );
$function$;
REVOKE ALL ON FUNCTION identity.loan_in_manager_department(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.loan_in_manager_department(UUID, UUID) TO bank_app, bank_worker;

CREATE OR REPLACE FUNCTION identity.can_read_loan(employee_id UUID, loan_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT can_read_loan.employee_id IS NOT NULL
       AND can_read_loan.loan_application_id IS NOT NULL
       AND can_read_loan.employee_id = identity.current_employee_id()
       AND (
            identity.can_access_loan(can_read_loan.employee_id, can_read_loan.loan_application_id)
            OR (
                identity.current_has_role('auditor'::public.citext)
                AND EXISTS (
                    SELECT 1 FROM credit.loan_application AS loan
                    WHERE loan.id = can_read_loan.loan_application_id
                )
            )
            OR identity.loan_in_manager_department(can_read_loan.employee_id, can_read_loan.loan_application_id)
       );
$function$;

-- Ứng viên nhận hồ sơ: cùng vai trò bước đang mở, cùng phòng với trưởng phòng, không bị loại E8, không phải người đang giữ.
CREATE OR REPLACE FUNCTION credit.reassign_candidates(p_loan_id UUID)
RETURNS TABLE (employee_id UUID, full_name TEXT, open_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    SELECT employee.id, employee.full_name::text,
           (SELECT count(*) FROM credit.case_step AS open_step
             WHERE open_step.assignee_employee_id = employee.id AND open_step.completed_at IS NULL)
    FROM credit.case_step AS step
    JOIN identity.employee AS employee ON credit.has_active_role(employee.id, credit.step_role(step.step_code))
    JOIN identity.employee AS manager ON manager.id = identity.current_employee_id()
    WHERE step.loan_application_id = p_loan_id AND step.completed_at IS NULL
      AND credit.step_role(step.step_code) IS NOT NULL
      AND employee.id IS DISTINCT FROM step.assignee_employee_id
      AND employee.department_id = manager.department_id
      AND NOT credit.is_excluded(employee.id, p_loan_id)
      AND credit.has_active_role(manager.id, 'credit_manager')
      AND identity.can_read_loan(manager.id, p_loan_id)
    ORDER BY 3, employee.full_name;
$function$;

CREATE OR REPLACE FUNCTION credit.reassign_case_step(p_loan_id UUID, p_caller UUID, p_new_assignee UUID, p_reason TEXT)
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
       OR credit.is_excluded(p_new_assignee, p_loan_id)
       OR (SELECT department_id FROM identity.employee WHERE id = p_new_assignee)
          IS DISTINCT FROM (SELECT department_id FROM identity.employee WHERE id = p_caller) THEN
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
