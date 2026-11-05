-- Va loi che ten tham so trong ham RLS cua V014.
-- Trong ham LANGUAGE sql, ten khong dinh danh trung ten cot se duoc hieu la cot, nen
-- "employee_scope.employee_id = employee_id" hay "customer_record.id = customer_id" tu so cot voi chinh no
-- => nguoi khong co scope van thay khach hang chi nhanh khac. Moi tham chieu tham so nay viet day du ten ham.
-- Giu nguyen chu ky (policy V015 phu thuoc) va hanh vi con lai; chi them dinh danh.

CREATE OR REPLACE FUNCTION identity.can_access_customer(employee_id UUID, customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT can_access_customer.employee_id IS NOT NULL
       AND can_access_customer.customer_id IS NOT NULL
       AND can_access_customer.employee_id = identity.current_employee_id()
       AND (
            identity.current_is_admin()
            OR EXISTS (
                SELECT 1
                FROM customer.customer AS customer_record
                JOIN identity.employee AS employee
                  ON employee.id = can_access_customer.employee_id
                WHERE customer_record.id = can_access_customer.customer_id
                  AND (
                       customer_record.relationship_manager_id = can_access_customer.employee_id
                       OR customer_record.home_branch_id = identity.current_branch_id()
                       OR EXISTS (
                           SELECT 1
                           FROM identity.employee_scope AS employee_scope
                           WHERE employee_scope.employee_id = can_access_customer.employee_id
                             AND employee_scope.valid_from <= CURRENT_TIMESTAMP
                             AND (
                                 employee_scope.valid_until IS NULL
                                 OR employee_scope.valid_until > CURRENT_TIMESTAMP
                             )
                             AND employee_scope.permission_code IN (
                                 'customer:read'::public.citext,
                                 'customer:search'::public.citext
                             )
                             AND (
                                 (
                                     employee_scope.scope_type = 'CUSTOMER'
                                     AND employee_scope.scope_id = can_access_customer.customer_id
                                 )
                                 OR (
                                     employee_scope.scope_type = 'BRANCH'
                                     AND employee_scope.scope_id = customer_record.home_branch_id
                                 )
                             )
                       )
                  )
            )
       );
$function$;

CREATE OR REPLACE FUNCTION identity.can_access_loan(employee_id UUID, loan_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT can_access_loan.employee_id IS NOT NULL
       AND can_access_loan.loan_application_id IS NOT NULL
       AND can_access_loan.employee_id = identity.current_employee_id()
       AND (
            identity.current_is_admin()
            OR EXISTS (
                SELECT 1
                FROM credit.loan_application AS loan
                WHERE loan.id = can_access_loan.loan_application_id
                  AND (
                      loan.assigned_employee_id = can_access_loan.employee_id
                      OR identity.can_access_customer(can_access_loan.employee_id, loan.primary_customer_id)
                      OR EXISTS (
                          SELECT 1
                          FROM identity.employee_scope AS employee_scope
                          WHERE employee_scope.employee_id = can_access_loan.employee_id
                            AND employee_scope.scope_type = 'LOAN_APPLICATION'
                            AND employee_scope.scope_id = can_access_loan.loan_application_id
                            AND employee_scope.valid_from <= CURRENT_TIMESTAMP
                            AND (
                                employee_scope.valid_until IS NULL
                                OR employee_scope.valid_until > CURRENT_TIMESTAMP
                            )
                            AND employee_scope.permission_code IN (
                                'loan:read'::public.citext,
                                'loan:update'::public.citext,
                                'loan:analyze'::public.citext,
                                'loan:submit'::public.citext,
                                'loan:approve'::public.citext
                            )
                      )
                  )
            )
       );
$function$;

REVOKE ALL ON FUNCTION identity.can_access_customer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.can_access_loan(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION identity.can_access_customer(UUID, UUID) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION identity.can_access_loan(UUID, UUID) TO bank_app, bank_worker;
