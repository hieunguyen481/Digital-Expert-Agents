-- Q-J (docs/business/rules.md): Quan tri he thong khong co quyen nghiep vu, khong co truy cap khan cap.
-- Bo nhanh identity.current_is_admin() khoi hai ham pham vi (giu nguyen dinh danh tham so cua V019)
-- va khoi moi policy nghiep vu cua V015. Cac predicate va danh sach role khac giu nguyen.
-- identity.current_is_admin() van ton tai (GUC app.is_admin) nhung khong con mo du lieu nghiep vu.

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
       AND EXISTS (
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
       AND EXISTS (
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
            );
$function$;

REVOKE ALL ON FUNCTION identity.can_access_customer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.can_access_loan(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION identity.can_access_customer(UUID, UUID) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION identity.can_access_loan(UUID, UUID) TO bank_app, bank_worker;

DROP POLICY customer_insert_policy ON customer.customer;
CREATE POLICY customer_insert_policy
ON customer.customer
FOR INSERT
TO bank_app
WITH CHECK (
    identity.current_employee_id() IS NOT NULL
    AND identity.current_branch_id() = home_branch_id
);

DROP POLICY account_access_policy ON banking.account;
CREATE POLICY account_access_policy
ON banking.account
FOR ALL
TO bank_app, bank_worker
USING (
    (
        identity.current_employee_id() IS NOT NULL
        AND branch_id = identity.current_branch_id()
    )
    OR EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = account.id
          AND identity.can_access_customer(
              identity.current_employee_id(),
              customer_record.id
          )
    )
)
WITH CHECK (
    (
        identity.current_employee_id() IS NOT NULL
        AND branch_id = identity.current_branch_id()
    )
    OR EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = account.id
          AND identity.can_access_customer(
              identity.current_employee_id(),
              customer_record.id
          )
    )
);

DROP POLICY document_access_policy ON document.document;
CREATE POLICY document_access_policy
ON document.document
FOR ALL
TO bank_app, bank_worker
USING (
    created_by = identity.current_employee_id()
    OR EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = document.owner_party_id
          AND identity.can_access_customer(
              identity.current_employee_id(),
              customer_record.id
          )
    )
    OR EXISTS (
        SELECT 1
        FROM document.document_link AS document_link
        WHERE document_link.document_id = document.id
          AND (
              (
                  document_link.entity_type = 'CUSTOMER'
                  AND identity.can_access_customer(
                      identity.current_employee_id(),
                      document_link.entity_id
                  )
              )
              OR (
                  document_link.entity_type = 'LOAN_APPLICATION'
                  AND identity.can_access_loan(
                      identity.current_employee_id(),
                      document_link.entity_id
                  )
              )
          )
    )
)
WITH CHECK (
    created_by = identity.current_employee_id()
    OR EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = document.owner_party_id
          AND identity.can_access_customer(
              identity.current_employee_id(),
              customer_record.id
          )
    )
);

DROP POLICY loan_decision_insert_policy ON credit.loan_decision;
CREATE POLICY loan_decision_insert_policy
ON credit.loan_decision
FOR INSERT
TO bank_app
WITH CHECK (
    decision_maker_id = identity.current_employee_id()
    AND identity.can_access_loan(
        identity.current_employee_id(),
        loan_application_id
    )
    AND identity.current_has_role('loan_approver'::public.citext)
);

DROP POLICY loan_decision_update_policy ON credit.loan_decision;
CREATE POLICY loan_decision_update_policy
ON credit.loan_decision
FOR UPDATE
TO bank_app
USING (
    decision_maker_id = identity.current_employee_id()
    AND identity.can_access_loan(
        identity.current_employee_id(),
        loan_application_id
    )
    AND identity.current_has_role('loan_approver'::public.citext)
)
WITH CHECK (
    decision_maker_id = identity.current_employee_id()
    AND identity.can_access_loan(
        identity.current_employee_id(),
        loan_application_id
    )
    AND identity.current_has_role('loan_approver'::public.citext)
);

DROP POLICY conversation_select_policy ON ai.conversation;
CREATE POLICY conversation_select_policy
ON ai.conversation
FOR SELECT
TO bank_app, bank_worker
USING (employee_id = identity.current_employee_id());

DROP POLICY conversation_update_policy ON ai.conversation;
CREATE POLICY conversation_update_policy
ON ai.conversation
FOR UPDATE
TO bank_app
USING (employee_id = identity.current_employee_id())
WITH CHECK (employee_id = identity.current_employee_id());
