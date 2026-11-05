-- V023.1: tach quyen DOC va GHI tren cac bang theo khach hang / tai lieu / AI
-- (vong sua Task 6, rules.md Q-M).
--   * V023 cho moi nguoi nhan buoc (ke ca da xong) doc khach hang chinh qua
--     can_access_customer. Nhieu policy V015 la FOR ALL hoac UPDATE dung chinh ham
--     doc do, nen nguoi da xong buoc van GHI duoc khach, tai lieu, tai khoan, AI...
--     Nay: policy SELECT dung ham doc; INSERT/UPDATE cua bank_app dung ham ghi.
--   * Kiem toan doc toan bo du lieu nghiep vu cua ho so (khach, tai lieu, truong
--     trich xuat, tai khoan, giao dich, AI), chi doc.
--   * bank_worker giu nguyen hanh vi ghi cu tren extracted_field va ai.* (tien
--     trinh he thong, khong co quyen nghiep vu theo buoc); chi dung policy rieng.
--   * Khong co nhanh quan tri (Q-J); moi tham so viet day du ten ham (V019).
-- loan_decision_update_policy da bi V021 xoa (va thu quyen UPDATE) nen khong tao lai.

-- ---------------------------------------------------------------------------
-- 1. Ham doc / ghi
-- ---------------------------------------------------------------------------

-- Doc khach hang: can_access_customer hoac vai tro auditor.
CREATE FUNCTION identity.can_read_customer(employee_id UUID, customer_id UUID)
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
       );
$function$;

-- Ghi du lieu khach hang: quan he truc tiep (QHKH / scope), hoac dang co quyen
-- ghi mot ho so ma khach la nguoi vay chinh (nguoi nhan buoc dang mo).
CREATE FUNCTION identity.can_write_customer(employee_id UUID, customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT can_write_customer.employee_id IS NOT NULL
       AND can_write_customer.customer_id IS NOT NULL
       AND can_write_customer.employee_id = identity.current_employee_id()
       AND (
            identity.has_customer_relationship(
                can_write_customer.employee_id,
                can_write_customer.customer_id
            )
            OR EXISTS (
                SELECT 1
                FROM credit.loan_application AS loan
                WHERE loan.primary_customer_id = can_write_customer.customer_id
                  AND identity.can_write_loan(can_write_customer.employee_id, loan.id)
            )
       );
$function$;

-- Ghi tai lieu: khach so huu ghi duoc, hoac lien ket toi khach / ho so ghi duoc,
-- hoac tai lieu chua gan khach/ho so nao va do chinh minh tao.
CREATE FUNCTION identity.can_write_document(employee_id UUID, document_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT can_write_document.employee_id IS NOT NULL
       AND can_write_document.document_id IS NOT NULL
       AND can_write_document.employee_id = identity.current_employee_id()
       AND EXISTS (
                SELECT 1
                FROM document.document AS document_record
                WHERE document_record.id = can_write_document.document_id
                  AND (
                      EXISTS (
                          SELECT 1
                          FROM customer.customer AS customer_record
                          WHERE customer_record.party_id = document_record.owner_party_id
                            AND identity.can_write_customer(
                                can_write_document.employee_id,
                                customer_record.id
                            )
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM document.document_link AS document_link
                          WHERE document_link.document_id = document_record.id
                            AND (
                                (
                                    document_link.entity_type = 'CUSTOMER'
                                    AND identity.can_write_customer(
                                        can_write_document.employee_id,
                                        document_link.entity_id
                                    )
                                )
                                OR (
                                    document_link.entity_type = 'LOAN_APPLICATION'
                                    AND identity.can_write_loan(
                                        can_write_document.employee_id,
                                        document_link.entity_id
                                    )
                                )
                            )
                      )
                      OR (
                          document_record.owner_party_id IS NULL
                          AND document_record.created_by = can_write_document.employee_id
                          AND NOT EXISTS (
                              SELECT 1
                              FROM document.document_link AS document_link
                              WHERE document_link.document_id = document_record.id
                          )
                      )
                  )
            );
$function$;

REVOKE ALL ON FUNCTION identity.can_read_customer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.can_write_customer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.can_write_document(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION identity.can_read_customer(UUID, UUID) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION identity.can_write_customer(UUID, UUID) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION identity.can_write_document(UUID, UUID) TO bank_app, bank_worker;
-- Dung truc tiep trong policy loan_application_insert va cic_consent.
GRANT EXECUTE ON FUNCTION identity.has_customer_relationship(UUID, UUID) TO bank_app, bank_worker;

-- ---------------------------------------------------------------------------
-- 2. Khach hang va dinh danh / lien he
-- ---------------------------------------------------------------------------
DROP POLICY customer_select_policy ON customer.customer;
CREATE POLICY customer_select_policy
ON customer.customer
FOR SELECT
TO bank_app, bank_worker
USING (identity.can_read_customer(identity.current_employee_id(), id));

DROP POLICY customer_update_policy ON customer.customer;
CREATE POLICY customer_update_policy
ON customer.customer
FOR UPDATE
TO bank_app
USING (identity.can_write_customer(identity.current_employee_id(), id))
WITH CHECK (identity.can_write_customer(identity.current_employee_id(), id));

DROP POLICY party_identifier_access_policy ON customer.party_identifier;
CREATE POLICY party_identifier_select_policy
ON customer.party_identifier
FOR SELECT
TO bank_app, bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = party_identifier.party_id
          AND identity.can_read_customer(identity.current_employee_id(), customer_record.id)
    )
);
CREATE POLICY party_identifier_insert_policy
ON customer.party_identifier
FOR INSERT
TO bank_app
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = party_identifier.party_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
);
CREATE POLICY party_identifier_update_policy
ON customer.party_identifier
FOR UPDATE
TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = party_identifier.party_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = party_identifier.party_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
);

DROP POLICY party_contact_access_policy ON customer.party_contact;
CREATE POLICY party_contact_select_policy
ON customer.party_contact
FOR SELECT
TO bank_app, bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = party_contact.party_id
          AND identity.can_read_customer(identity.current_employee_id(), customer_record.id)
    )
);
CREATE POLICY party_contact_insert_policy
ON customer.party_contact
FOR INSERT
TO bank_app
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = party_contact.party_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
);
CREATE POLICY party_contact_update_policy
ON customer.party_contact
FOR UPDATE
TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = party_contact.party_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = party_contact.party_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
);

DROP POLICY relationship_manager_history_select_policy ON customer.relationship_manager_history;
CREATE POLICY relationship_manager_history_select_policy
ON customer.relationship_manager_history
FOR SELECT
TO bank_app
USING (identity.can_read_customer(identity.current_employee_id(), customer_id));

-- ---------------------------------------------------------------------------
-- 3. Tai khoan va giao dich
-- ---------------------------------------------------------------------------
DROP POLICY account_access_policy ON banking.account;
CREATE POLICY account_select_policy
ON banking.account
FOR SELECT
TO bank_app, bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = account.id
          AND identity.can_read_customer(identity.current_employee_id(), customer_record.id)
    )
);
CREATE POLICY account_insert_policy
ON banking.account
FOR INSERT
TO bank_app
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = account.id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
);
CREATE POLICY account_update_policy
ON banking.account
FOR UPDATE
TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = account.id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = account.id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
);

DROP POLICY transaction_access_policy ON banking."transaction";
CREATE POLICY transaction_select_policy
ON banking."transaction"
FOR SELECT
TO bank_app, bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM banking.account
        WHERE account.id = "transaction".account_id
    )
);
CREATE POLICY transaction_insert_policy
ON banking."transaction"
FOR INSERT
TO bank_app
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = "transaction".account_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
);
CREATE POLICY transaction_update_policy
ON banking."transaction"
FOR UPDATE
TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = "transaction".account_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM banking.account_holder AS holder
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = holder.party_id
        WHERE holder.account_id = "transaction".account_id
          AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
    )
);

-- ---------------------------------------------------------------------------
-- 4. Tai lieu, phien ban, truong trich xuat
-- ---------------------------------------------------------------------------
DROP POLICY document_access_policy ON document.document;
CREATE POLICY document_select_policy
ON document.document
FOR SELECT
TO bank_app, bank_worker
USING (
    created_by = identity.current_employee_id()
    OR EXISTS (
        SELECT 1
        FROM customer.customer AS customer_record
        WHERE customer_record.party_id = document.owner_party_id
          AND identity.can_read_customer(identity.current_employee_id(), customer_record.id)
    )
    OR EXISTS (
        SELECT 1
        FROM document.document_link AS document_link
        WHERE document_link.document_id = document.id
          AND (
              (
                  document_link.entity_type = 'CUSTOMER'
                  AND identity.can_read_customer(
                      identity.current_employee_id(),
                      document_link.entity_id
                  )
              )
              OR (
                  document_link.entity_type = 'LOAN_APPLICATION'
                  AND identity.can_read_loan(
                      identity.current_employee_id(),
                      document_link.entity_id
                  )
              )
          )
    )
);
-- Tai lieu moi chua co lien ket: nguoi tao phai ghi duoc khach so huu (neu co).
CREATE POLICY document_insert_policy
ON document.document
FOR INSERT
TO bank_app
WITH CHECK (
    created_by = identity.current_employee_id()
    AND (
        owner_party_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM customer.customer AS customer_record
            WHERE customer_record.party_id = document.owner_party_id
              AND identity.can_write_customer(identity.current_employee_id(), customer_record.id)
        )
    )
);
CREATE POLICY document_update_policy
ON document.document
FOR UPDATE
TO bank_app
USING (identity.can_write_document(identity.current_employee_id(), id))
WITH CHECK (identity.can_write_document(identity.current_employee_id(), id));

DROP POLICY document_version_access_policy ON document.document_version;
CREATE POLICY document_version_select_policy
ON document.document_version
FOR SELECT
TO bank_app, bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM document.document
        WHERE document.id = document_version.document_id
    )
);
CREATE POLICY document_version_insert_policy
ON document.document_version
FOR INSERT
TO bank_app
WITH CHECK (identity.can_write_document(identity.current_employee_id(), document_id));
CREATE POLICY document_version_update_policy
ON document.document_version
FOR UPDATE
TO bank_app
USING (identity.can_write_document(identity.current_employee_id(), document_id))
WITH CHECK (identity.can_write_document(identity.current_employee_id(), document_id));

DROP POLICY extracted_field_access_policy ON document.extracted_field;
CREATE POLICY extracted_field_select_policy
ON document.extracted_field
FOR SELECT
TO bank_app, bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM document.document_version
        WHERE document_version.id = extracted_field.document_version_id
    )
);
CREATE POLICY extracted_field_insert_policy
ON document.extracted_field
FOR INSERT
TO bank_app
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM document.document_version AS version_record
        WHERE version_record.id = extracted_field.document_version_id
          AND identity.can_write_document(
              identity.current_employee_id(),
              version_record.document_id
          )
    )
);
CREATE POLICY extracted_field_update_policy
ON document.extracted_field
FOR UPDATE
TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM document.document_version AS version_record
        WHERE version_record.id = extracted_field.document_version_id
          AND identity.can_write_document(
              identity.current_employee_id(),
              version_record.document_id
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM document.document_version AS version_record
        WHERE version_record.id = extracted_field.document_version_id
          AND identity.can_write_document(
              identity.current_employee_id(),
              version_record.document_id
          )
    )
);
-- Tien trinh xu ly tai lieu (bank_worker): giu dieu kien V015.
CREATE POLICY extracted_field_worker_write_policy
ON document.extracted_field
FOR ALL
TO bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM document.document_version
        WHERE document_version.id = extracted_field.document_version_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM document.document_version
        WHERE document_version.id = extracted_field.document_version_id
    )
);

-- ---------------------------------------------------------------------------
-- 5. Phan tich AI
-- ---------------------------------------------------------------------------
DROP POLICY analysis_case_access_policy ON ai.analysis_case;
CREATE POLICY analysis_case_select_policy
ON ai.analysis_case
FOR SELECT
TO bank_app, bank_worker
USING (
    (
        identity.can_access_customer(identity.current_employee_id(), customer_id)
        AND (
            loan_application_id IS NULL
            OR identity.can_access_loan(identity.current_employee_id(), loan_application_id)
        )
    )
    OR identity.current_has_role('auditor'::public.citext)
);
CREATE POLICY analysis_case_insert_policy
ON ai.analysis_case
FOR INSERT
TO bank_app
WITH CHECK (
    created_by = identity.current_employee_id()
    AND identity.can_write_customer(identity.current_employee_id(), customer_id)
    AND (
        loan_application_id IS NULL
        OR identity.can_write_loan(identity.current_employee_id(), loan_application_id)
    )
);
CREATE POLICY analysis_case_update_policy
ON ai.analysis_case
FOR UPDATE
TO bank_app
USING (
    identity.can_write_customer(identity.current_employee_id(), customer_id)
    AND (
        loan_application_id IS NULL
        OR identity.can_write_loan(identity.current_employee_id(), loan_application_id)
    )
)
WITH CHECK (
    created_by = identity.current_employee_id()
    AND identity.can_write_customer(identity.current_employee_id(), customer_id)
    AND (
        loan_application_id IS NULL
        OR identity.can_write_loan(identity.current_employee_id(), loan_application_id)
    )
);
-- Tien trinh phan tich (bank_worker): giu dieu kien V015.
CREATE POLICY analysis_case_worker_write_policy
ON ai.analysis_case
FOR ALL
TO bank_worker
USING (
    identity.can_access_customer(identity.current_employee_id(), customer_id)
    AND (
        loan_application_id IS NULL
        OR identity.can_access_loan(identity.current_employee_id(), loan_application_id)
    )
)
WITH CHECK (
    created_by = identity.current_employee_id()
    AND identity.can_access_customer(identity.current_employee_id(), customer_id)
    AND (
        loan_application_id IS NULL
        OR identity.can_access_loan(identity.current_employee_id(), loan_application_id)
    )
);

DROP POLICY finding_access_policy ON ai.finding;
CREATE POLICY finding_select_policy
ON ai.finding
FOR SELECT
TO bank_app, bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case
        WHERE analysis_case.id = finding.analysis_case_id
    )
);
CREATE POLICY finding_insert_policy
ON ai.finding
FOR INSERT
TO bank_app
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case AS case_record
        WHERE case_record.id = finding.analysis_case_id
          AND identity.can_write_customer(identity.current_employee_id(), case_record.customer_id)
          AND (
              case_record.loan_application_id IS NULL
              OR identity.can_write_loan(
                  identity.current_employee_id(),
                  case_record.loan_application_id
              )
          )
    )
);
CREATE POLICY finding_update_policy
ON ai.finding
FOR UPDATE
TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case AS case_record
        WHERE case_record.id = finding.analysis_case_id
          AND identity.can_write_customer(identity.current_employee_id(), case_record.customer_id)
          AND (
              case_record.loan_application_id IS NULL
              OR identity.can_write_loan(
                  identity.current_employee_id(),
                  case_record.loan_application_id
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case AS case_record
        WHERE case_record.id = finding.analysis_case_id
          AND identity.can_write_customer(identity.current_employee_id(), case_record.customer_id)
          AND (
              case_record.loan_application_id IS NULL
              OR identity.can_write_loan(
                  identity.current_employee_id(),
                  case_record.loan_application_id
              )
          )
    )
);
CREATE POLICY finding_worker_write_policy
ON ai.finding
FOR ALL
TO bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case
        WHERE analysis_case.id = finding.analysis_case_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case
        WHERE analysis_case.id = finding.analysis_case_id
    )
);

DROP POLICY report_access_policy ON ai.report;
CREATE POLICY report_select_policy
ON ai.report
FOR SELECT
TO bank_app, bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case
        WHERE analysis_case.id = report.analysis_case_id
    )
);
CREATE POLICY report_insert_policy
ON ai.report
FOR INSERT
TO bank_app
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case AS case_record
        WHERE case_record.id = report.analysis_case_id
          AND identity.can_write_customer(identity.current_employee_id(), case_record.customer_id)
          AND (
              case_record.loan_application_id IS NULL
              OR identity.can_write_loan(
                  identity.current_employee_id(),
                  case_record.loan_application_id
              )
          )
    )
);
CREATE POLICY report_update_policy
ON ai.report
FOR UPDATE
TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case AS case_record
        WHERE case_record.id = report.analysis_case_id
          AND identity.can_write_customer(identity.current_employee_id(), case_record.customer_id)
          AND (
              case_record.loan_application_id IS NULL
              OR identity.can_write_loan(
                  identity.current_employee_id(),
                  case_record.loan_application_id
              )
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case AS case_record
        WHERE case_record.id = report.analysis_case_id
          AND identity.can_write_customer(identity.current_employee_id(), case_record.customer_id)
          AND (
              case_record.loan_application_id IS NULL
              OR identity.can_write_loan(
                  identity.current_employee_id(),
                  case_record.loan_application_id
              )
          )
    )
);
CREATE POLICY report_worker_write_policy
ON ai.report
FOR ALL
TO bank_worker
USING (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case
        WHERE analysis_case.id = report.analysis_case_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM ai.analysis_case
        WHERE analysis_case.id = report.analysis_case_id
    )
);

-- ---------------------------------------------------------------------------
-- 6. Ho so moi, van ban dong y CIC, du no khach
-- ---------------------------------------------------------------------------
-- Lap ho so moi: chi QHKH / scope cua khach, khong phai nguoi nhan buoc.
DROP POLICY loan_application_insert_policy ON credit.loan_application;
CREATE POLICY loan_application_insert_policy
ON credit.loan_application
FOR INSERT
TO bank_app
WITH CHECK (
    created_by = identity.current_employee_id()
    AND identity.has_customer_relationship(
        identity.current_employee_id(),
        primary_customer_id
    )
);

DROP POLICY cic_consent_select_policy ON banking.cic_consent;
DROP POLICY cic_consent_insert_policy ON banking.cic_consent;
DROP POLICY cic_consent_update_policy ON banking.cic_consent;
CREATE POLICY cic_consent_select_policy ON banking.cic_consent
FOR SELECT TO bank_app
USING (identity.can_read_customer(identity.current_employee_id(), customer_id));
CREATE POLICY cic_consent_insert_policy ON banking.cic_consent
FOR INSERT TO bank_app
WITH CHECK (identity.has_customer_relationship(identity.current_employee_id(), customer_id));
CREATE POLICY cic_consent_update_policy ON banking.cic_consent
FOR UPDATE TO bank_app
USING (identity.has_customer_relationship(identity.current_employee_id(), customer_id))
WITH CHECK (identity.has_customer_relationship(identity.current_employee_id(), customer_id));

DROP POLICY customer_exposure_select_policy ON credit.customer_exposure;
CREATE POLICY customer_exposure_select_policy ON credit.customer_exposure
FOR SELECT TO bank_app
USING (identity.can_read_customer(identity.current_employee_id(), customer_id));

COMMENT ON FUNCTION identity.can_read_customer(UUID, UUID) IS
    'Read access to a customer: can_access_customer or the auditor role (Q-M).';
COMMENT ON FUNCTION identity.can_write_customer(UUID, UUID) IS
    'Write access to customer data: RM/scope, or write access to a case of that customer.';
COMMENT ON FUNCTION identity.can_write_document(UUID, UUID) IS
    'Write access to a document via its owner customer, its links, or as creator of an unlinked document.';
