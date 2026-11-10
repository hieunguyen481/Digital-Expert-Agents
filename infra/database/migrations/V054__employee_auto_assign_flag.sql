-- V054: nhân viên dự phòng chỉ nhận hồ sơ khi trưởng phòng chuyển (Q-D2), không nằm trong vòng tự phân công
-- "người ít việc nhất". Mặc định TRUE: mọi nhân viên hiện có vẫn được tự phân công như trước.
ALTER TABLE identity.employee ADD COLUMN accepts_auto_assignment BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION credit.pick_role_assignee(p_loan_id UUID, p_step_code TEXT, p_role TEXT)
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
          AND employee.accepts_auto_assignment
    ) AS candidate
    WHERE identity.can_read_loan(identity.current_employee_id(), p_loan_id)
    ORDER BY candidate.handled_before DESC, candidate.open_count, candidate.id
    LIMIT 1;
$function$;
