-- V060 (M02, Q-D2): Trưởng phòng mở được khách hàng thuộc phòng mình (chỉ đọc).
-- Khách "thuộc phòng" = QHKH cùng phòng với trưởng phòng, hoặc khách có hồ sơ mà trưởng phòng đọc được.
-- Chỉ mở rộng quyền ĐỌC (can_read_customer); quyền ghi (can_write_customer) giữ nguyên.

CREATE OR REPLACE FUNCTION identity.can_read_customer(employee_id UUID, customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT can_read_customer.employee_id IS NOT NULL
       AND can_read_customer.customer_id IS NOT NULL
       AND can_read_customer.employee_id = identity.current_employee_id()
       AND (
            identity.can_access_customer(
                can_read_customer.employee_id,
                can_read_customer.customer_id
            )
            OR (
                identity.current_has_role('auditor'::public.citext)
                AND EXISTS (
                    SELECT 1
                    FROM customer.customer AS customer_record
                    WHERE customer_record.id = can_read_customer.customer_id
                )
            )
            OR (
                credit.has_active_role(can_read_customer.employee_id, 'credit_manager')
                AND (
                    EXISTS (
                        SELECT 1
                        FROM customer.customer AS customer_record
                        JOIN identity.employee AS rm ON rm.id = customer_record.relationship_manager_id
                        JOIN identity.employee AS manager ON manager.id = can_read_customer.employee_id
                        WHERE customer_record.id = can_read_customer.customer_id
                          AND rm.department_id = manager.department_id
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM credit.loan_application AS loan
                        WHERE loan.primary_customer_id = can_read_customer.customer_id
                          AND identity.loan_in_manager_department(can_read_customer.employee_id, loan.id)
                    )
                )
            )
       );
$function$;
