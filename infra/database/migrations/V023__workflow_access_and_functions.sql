-- V023: quyen theo buoc xu ly (rules.md Q-M) va ham ngay lam viec.
--   * Khong con quy tac "cung chi nhanh thi thay nhau": quyen chi nhanh chi qua
--     employee_scope BRANCH (GD chi nhanh). Ap dung cho ca customer.customer va
--     banking.account (vá account_access_policy cua V015/V020).
--   * Nguoi nhan bat ky buoc nao cua ho so (ke ca da xong) doc duoc ho so do va
--     khach hang chinh cua no; chi nguoi nhan buoc DANG MO (hoac QHKH khi ho so o
--     DRAFT / RETURNED_TO_RM / APPRAISAL_PENDING_INFO) duoc ghi.
--   * Kiem toan doc toan bo ho so, khong ghi.
--   * Khong co nhanh quan tri (Q-J, V020). Moi tham so viet day du ten ham (V019).
-- Thay toan bo policy TAM cua V021 tren case_step / case_exception / case_flag.

-- ---------------------------------------------------------------------------
-- 1. Ham pham vi
-- ---------------------------------------------------------------------------

-- Quan he truc tiep voi khach hang: QHKH hoac employee_scope (CUSTOMER / BRANCH).
-- Noi bo: chi goi tu cac ham SECURITY DEFINER khac, khong cap EXECUTE cho runtime.
CREATE FUNCTION identity.has_customer_relationship(employee_id UUID, customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT has_customer_relationship.employee_id IS NOT NULL
       AND has_customer_relationship.customer_id IS NOT NULL
       AND has_customer_relationship.employee_id = identity.current_employee_id()
       AND EXISTS (
                SELECT 1
                FROM customer.customer AS customer_record
                JOIN identity.employee AS employee
                  ON employee.id = has_customer_relationship.employee_id
                WHERE customer_record.id = has_customer_relationship.customer_id
                  AND (
                       customer_record.relationship_manager_id = has_customer_relationship.employee_id
                       OR EXISTS (
                           SELECT 1
                           FROM identity.employee_scope AS employee_scope
                           WHERE employee_scope.employee_id = has_customer_relationship.employee_id
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
                                     AND employee_scope.scope_id = has_customer_relationship.customer_id
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

-- Khach hang: quan he truc tiep, hoac la nguoi nhan mot buoc cua ho so ma khach
-- la nguoi vay chinh (Hoi so doc khach cua ho so duoc phan cong).
-- Bo nhanh customer_record.home_branch_id = identity.current_branch_id().
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
            identity.has_customer_relationship(
                can_access_customer.employee_id,
                can_access_customer.customer_id
            )
            OR EXISTS (
                SELECT 1
                FROM credit.case_step AS case_step
                JOIN credit.loan_application AS loan
                  ON loan.id = case_step.loan_application_id
                WHERE loan.primary_customer_id = can_access_customer.customer_id
                  AND case_step.assignee_employee_id = can_access_customer.employee_id
            )
       );
$function$;

-- Ho so: nguoi duoc giao ho so, quan he truc tiep voi khach chinh, nguoi nhan
-- BAT KY buoc nao cua chinh ho so nay, hoac scope LOAN_APPLICATION.
-- Dung has_customer_relationship (khong phai can_access_customer) de nguoi nhan
-- buoc o ho so X khong lan sang ho so khac cua cung khach.
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
                      OR identity.has_customer_relationship(
                          can_access_loan.employee_id,
                          loan.primary_customer_id
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM credit.case_step AS case_step
                          WHERE case_step.loan_application_id = can_access_loan.loan_application_id
                            AND case_step.assignee_employee_id = can_access_loan.employee_id
                      )
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

-- Doc ho so: can_access_loan hoac vai tro auditor (Q-M: Kiem toan doc toan he thong).
CREATE FUNCTION identity.can_read_loan(employee_id UUID, loan_application_id UUID)
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
            identity.can_access_loan(
                can_read_loan.employee_id,
                can_read_loan.loan_application_id
            )
            OR (
                identity.current_has_role('auditor'::public.citext)
                AND EXISTS (
                    SELECT 1
                    FROM credit.loan_application AS loan
                    WHERE loan.id = can_read_loan.loan_application_id
                )
            )
       );
$function$;

-- Ghi ho so: nguoi nhan mot buoc dang mo (completed_at IS NULL), hoac QHKH cua
-- khach chinh khi ho so o DRAFT / RETURNED_TO_RM / APPRAISAL_PENDING_INFO.
-- Ham STABLE nen trong WITH CHECK cua UPDATE no doc trang thai TRUOC lenh (snapshot
-- cua cau lenh): QHKH chuyen DRAFT -> CHECKING duoc, sau do het quyen ghi.
CREATE FUNCTION identity.can_write_loan(employee_id UUID, loan_application_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT can_write_loan.employee_id IS NOT NULL
       AND can_write_loan.loan_application_id IS NOT NULL
       AND can_write_loan.employee_id = identity.current_employee_id()
       AND EXISTS (
                SELECT 1
                FROM credit.loan_application AS loan
                WHERE loan.id = can_write_loan.loan_application_id
                  AND (
                      EXISTS (
                          SELECT 1
                          FROM credit.case_step AS case_step
                          WHERE case_step.loan_application_id = can_write_loan.loan_application_id
                            AND case_step.assignee_employee_id = can_write_loan.employee_id
                            AND case_step.completed_at IS NULL
                      )
                      OR (
                          loan.status IN ('DRAFT', 'RETURNED_TO_RM', 'APPRAISAL_PENDING_INFO')
                          AND EXISTS (
                              SELECT 1
                              FROM customer.customer AS customer_record
                              WHERE customer_record.id = loan.primary_customer_id
                                AND customer_record.relationship_manager_id = can_write_loan.employee_id
                          )
                      )
                  )
            );
$function$;

REVOKE ALL ON FUNCTION identity.has_customer_relationship(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.can_access_customer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.can_access_loan(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.can_read_loan(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION identity.can_write_loan(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION identity.can_access_customer(UUID, UUID) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION identity.can_access_loan(UUID, UUID) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION identity.can_read_loan(UUID, UUID) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION identity.can_write_loan(UUID, UUID) TO bank_app, bank_worker;

-- ---------------------------------------------------------------------------
-- 2. Ngay lam viec (SLA): bo Thu Bay, Chu Nhat va credit.holiday
-- ---------------------------------------------------------------------------
CREATE FUNCTION credit.is_workday(day DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT EXTRACT(ISODOW FROM is_workday.day) < 6
       AND NOT EXISTS (
            SELECT 1
            FROM credit.holiday AS holiday
            WHERE holiday.day = is_workday.day
       );
$function$;

-- Han = 17:00 (Asia/Ho_Chi_Minh) cua ngay lam viec thu n tinh tu ngay bat dau
-- (theo gio VN). Ngay bat dau khong phai ngay lam viec thi coi nhu bat dau tu
-- ngay lam viec ke tiep; n = 0 tra ve 17:00 cua chinh ngay do.
CREATE FUNCTION credit.add_workdays(start TIMESTAMPTZ, n INT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    cursor_day DATE;
    remaining INTEGER;
BEGIN
    IF add_workdays.start IS NULL OR add_workdays.n IS NULL THEN
        RETURN NULL;
    END IF;
    IF add_workdays.n < 0 THEN
        RAISE EXCEPTION 'credit.add_workdays: n must be >= 0, got %', add_workdays.n
            USING ERRCODE = '22023';
    END IF;

    cursor_day := (add_workdays.start AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
    WHILE NOT credit.is_workday(cursor_day) LOOP
        cursor_day := cursor_day + 1;
    END LOOP;

    remaining := add_workdays.n;
    WHILE remaining > 0 LOOP
        cursor_day := cursor_day + 1;
        IF credit.is_workday(cursor_day) THEN
            remaining := remaining - 1;
        END IF;
    END LOOP;

    RETURN (cursor_day + TIME '17:00') AT TIME ZONE 'Asia/Ho_Chi_Minh';
END
$function$;

-- So ngay lam viec trong (a, b]; am neu b < a.
CREATE FUNCTION credit.workdays_between(a DATE, b DATE)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT CASE
               WHEN workdays_between.a IS NULL OR workdays_between.b IS NULL THEN NULL
               ELSE sign(workdays_between.b - workdays_between.a)::INT * (
                   SELECT count(*)::INT
                   FROM generate_series(
                       1,
                       abs(workdays_between.b - workdays_between.a)
                   ) AS offset_day(n)
                   WHERE credit.is_workday(
                       LEAST(workdays_between.a, workdays_between.b) + offset_day.n
                   )
               )
           END;
$function$;

REVOKE ALL ON FUNCTION credit.is_workday(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.add_workdays(TIMESTAMPTZ, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.workdays_between(DATE, DATE) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION credit.is_workday(DATE) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION credit.add_workdays(TIMESTAMPTZ, INT) TO bank_app, bank_worker;
GRANT EXECUTE ON FUNCTION credit.workdays_between(DATE, DATE) TO bank_app, bank_worker;

-- ---------------------------------------------------------------------------
-- 3. Ho so vay va quyet dinh
-- ---------------------------------------------------------------------------
DROP POLICY loan_application_select_policy ON credit.loan_application;
CREATE POLICY loan_application_select_policy
ON credit.loan_application
FOR SELECT
TO bank_app, bank_worker
USING (identity.can_read_loan(identity.current_employee_id(), id));

DROP POLICY loan_application_update_policy ON credit.loan_application;
CREATE POLICY loan_application_update_policy
ON credit.loan_application
FOR UPDATE
TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), id));

DROP POLICY loan_decision_select_policy ON credit.loan_decision;
CREATE POLICY loan_decision_select_policy
ON credit.loan_decision
FOR SELECT
TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));

DROP POLICY loan_decision_insert_policy ON credit.loan_decision;
CREATE POLICY loan_decision_insert_policy
ON credit.loan_decision
FOR INSERT
TO bank_app
WITH CHECK (
    decision_maker_id = identity.current_employee_id()
    AND identity.can_write_loan(identity.current_employee_id(), loan_application_id)
    AND identity.current_has_role('loan_approver'::public.citext)
);

-- ---------------------------------------------------------------------------
-- 4. Bang quy trinh V021: bo policy TAM, thay bang doc/ghi theo buoc
-- ---------------------------------------------------------------------------
DROP POLICY case_step_select_policy ON credit.case_step;
DROP POLICY case_step_insert_policy ON credit.case_step;
DROP POLICY case_step_update_policy ON credit.case_step;
DROP POLICY case_exception_select_policy ON credit.case_exception;
DROP POLICY case_exception_insert_policy ON credit.case_exception;
DROP POLICY case_exception_update_policy ON credit.case_exception;
DROP POLICY case_flag_select_policy ON credit.case_flag;
DROP POLICY case_flag_insert_policy ON credit.case_flag;
DROP POLICY case_flag_update_policy ON credit.case_flag;

CREATE POLICY case_step_select_policy ON credit.case_step
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_step_insert_policy ON credit.case_step
FOR INSERT TO bank_app
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_step_update_policy ON credit.case_step
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));

CREATE POLICY case_exception_select_policy ON credit.case_exception
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_exception_insert_policy ON credit.case_exception
FOR INSERT TO bank_app
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_exception_update_policy ON credit.case_exception
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));

CREATE POLICY case_flag_select_policy ON credit.case_flag
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_flag_insert_policy ON credit.case_flag
FOR INSERT TO bank_app
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_flag_update_policy ON credit.case_flag
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));

-- ---------------------------------------------------------------------------
-- 5. Bang moi cua V022
-- ---------------------------------------------------------------------------
CREATE POLICY field_conflict_select_policy ON document.field_conflict
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY field_conflict_insert_policy ON document.field_conflict
FOR INSERT TO bank_app
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY field_conflict_update_policy ON document.field_conflict
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));

CREATE POLICY case_related_party_select_policy ON credit.case_related_party
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_related_party_insert_policy ON credit.case_related_party
FOR INSERT TO bank_app
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_related_party_update_policy ON credit.case_related_party
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));

-- credit.loan_checklist_item khong bat RLS; ho so lay qua muc danh muc.
CREATE POLICY checklist_item_document_select_policy ON credit.checklist_item_document
FOR SELECT TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM credit.loan_checklist_item AS checklist_item
        WHERE checklist_item.id = checklist_item_document.checklist_item_id
          AND identity.can_read_loan(
              identity.current_employee_id(),
              checklist_item.loan_application_id
          )
    )
);
CREATE POLICY checklist_item_document_insert_policy ON credit.checklist_item_document
FOR INSERT TO bank_app
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM credit.loan_checklist_item AS checklist_item
        WHERE checklist_item.id = checklist_item_document.checklist_item_id
          AND identity.can_write_loan(
              identity.current_employee_id(),
              checklist_item.loan_application_id
          )
    )
);
CREATE POLICY checklist_item_document_update_policy ON credit.checklist_item_document
FOR UPDATE TO bank_app
USING (
    EXISTS (
        SELECT 1
        FROM credit.loan_checklist_item AS checklist_item
        WHERE checklist_item.id = checklist_item_document.checklist_item_id
          AND identity.can_write_loan(
              identity.current_employee_id(),
              checklist_item.loan_application_id
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM credit.loan_checklist_item AS checklist_item
        WHERE checklist_item.id = checklist_item_document.checklist_item_id
          AND identity.can_write_loan(
              identity.current_employee_id(),
              checklist_item.loan_application_id
          )
    )
);

-- Van ban dong y CIC va du no gan voi khach hang.
CREATE POLICY cic_consent_select_policy ON banking.cic_consent
FOR SELECT TO bank_app
USING (identity.can_access_customer(identity.current_employee_id(), customer_id));
CREATE POLICY cic_consent_insert_policy ON banking.cic_consent
FOR INSERT TO bank_app
WITH CHECK (identity.can_access_customer(identity.current_employee_id(), customer_id));
CREATE POLICY cic_consent_update_policy ON banking.cic_consent
FOR UPDATE TO bank_app
USING (identity.can_access_customer(identity.current_employee_id(), customer_id))
WITH CHECK (identity.can_access_customer(identity.current_employee_id(), customer_id));

CREATE POLICY customer_exposure_select_policy ON credit.customer_exposure
FOR SELECT TO bank_app
USING (identity.can_access_customer(identity.current_employee_id(), customer_id));

-- ---------------------------------------------------------------------------
-- 6. Tai khoan: theo quyen khach hang cua chu tai khoan, bo quy tac cung chi nhanh
-- ---------------------------------------------------------------------------
-- Ban V020 cho moi nhan vien (ke ca quan tri o Hoi so) thay tai khoan co
-- branch_id = chi nhanh cua minh. Tai khoan den tu core banking (seed/tich hop),
-- runtime khong tao moi; WITH CHECK giu cung dieu kien.
DROP POLICY account_access_policy ON banking.account;
CREATE POLICY account_access_policy
ON banking.account
FOR ALL
TO bank_app, bank_worker
USING (
    EXISTS (
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
    EXISTS (
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

COMMENT ON FUNCTION identity.can_read_loan(UUID, UUID) IS
    'Read access to a case: can_access_loan or the auditor role (Q-M).';
COMMENT ON FUNCTION identity.can_write_loan(UUID, UUID) IS
    'Write access to a case: assignee of an open step, or the RM while DRAFT/RETURNED_TO_RM/APPRAISAL_PENDING_INFO.';
COMMENT ON FUNCTION credit.add_workdays(TIMESTAMPTZ, INT) IS
    'Deadline at 17:00 Asia/Ho_Chi_Minh after n workdays, skipping weekends and credit.holiday.';
COMMENT ON FUNCTION credit.workdays_between(DATE, DATE) IS
    'Number of workdays in (a, b]; negative when b < a.';
