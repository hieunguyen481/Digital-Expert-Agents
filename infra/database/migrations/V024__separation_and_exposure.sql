-- V024: tach bach (rules.md E8, Q-O), tong cap tin dung (Q4, Q-T) va cap phe
-- duyet can thiet (Q-M).
--   * Moi ham STABLE SECURITY DEFINER, search_path = pg_catalog, moi tham so
--     viet day du ten ham (bai hoc V019). Khong co nhanh quan tri (Q-J, V020).
--   * total_credit_exposure / required_tier tra so lieu tin dung (R2): nguoi goi
--     phai doc duoc ho so (identity.can_read_loan), neu khong bao loi 42501.
--   * is_excluded chi tra TRUE/FALSE cho mot ung vien bat ky (dinh tuyen can hoi
--     ve nguoi khac), khong gioi han theo nguoi goi.

-- ---------------------------------------------------------------------------
-- 1. Tach bach (E8)
-- ---------------------------------------------------------------------------
-- TRUE khi nhan vien:
--   (a) la nguoi nhan hoac nguoi tao bat ky buoc nao cua ho so, TRU buoc APPROVAL
--       cua chinh ho dang mo hoac da "Tra lai bo sung" (Q-O: nguoi da tra lai
--       van duoc duyet khi ho so quay lai), va tru cac buoc ho tao ra tu luc da
--       la cap phe duyet cua ho so (vd. buoc APPRAISAL moi sinh ra khi tra lai);
--   (b) la QHKH hien tai cua khach chinh;
--   (c) tung la QHKH cua khach chinh trong 2 nam gan nhat (valid_until NULL
--       hoac >= CURRENT_DATE - 2 nam).
CREATE FUNCTION credit.is_excluded(employee_id UUID, loan_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT is_excluded.employee_id IS NULL
        OR is_excluded.loan_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM credit.case_step AS step
            WHERE step.loan_application_id = is_excluded.loan_id
              AND (
                  (
                      step.assignee_employee_id = is_excluded.employee_id
                      AND NOT (
                          step.step_code = 'APPROVAL'
                          AND (
                              step.result = 'RETURN_FOR_SUPPLEMENT'
                              OR (step.completed_at IS NULL AND step.result IS NULL)
                          )
                      )
                  )
                  OR (
                      step.created_by = is_excluded.employee_id
                      AND NOT EXISTS (
                          SELECT 1
                          FROM credit.case_step AS own_approval
                          WHERE own_approval.loan_application_id = is_excluded.loan_id
                            AND own_approval.step_code = 'APPROVAL'
                            AND own_approval.assignee_employee_id = is_excluded.employee_id
                            AND own_approval.received_at <= step.created_at
                      )
                  )
              )
        )
        OR EXISTS (
            SELECT 1
            FROM credit.loan_application AS loan
            JOIN customer.customer AS customer_record
              ON customer_record.id = loan.primary_customer_id
            WHERE loan.id = is_excluded.loan_id
              AND (
                  customer_record.relationship_manager_id = is_excluded.employee_id
                  OR EXISTS (
                      SELECT 1
                      FROM customer.relationship_manager_history AS history
                      WHERE history.customer_id = customer_record.id
                        AND history.employee_id = is_excluded.employee_id
                        AND (
                            history.valid_until IS NULL
                            OR history.valid_until >= (CURRENT_DATE - INTERVAL '2 years')::date
                        )
                  )
              )
        );
$function$;

-- ---------------------------------------------------------------------------
-- 2. Tong cap tin dung (Q4, Q-T)
-- ---------------------------------------------------------------------------
-- = de xuat moi cua ho so
--   + du no goc cac khoan vay dang hieu luc (loan_account cua cac ho so khac)
--   + du no ngoai bang / han muc chua rut (customer_exposure: UNDRAWN_LIMIT,
--     GUARANTEE, LC)
-- cua khach chinh va cac ben lien quan da xac nhan (case_related_party.status =
-- 'CONFIRMED'); PROPOSED va NOT_IN_GROUP khong cong. Moi khach chi tinh mot lan.
CREATE FUNCTION credit.total_credit_exposure(loan_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    total NUMERIC;
BEGIN
    IF total_credit_exposure.loan_id IS NULL THEN
        RETURN NULL;
    END IF;
    IF NOT identity.can_read_loan(
        identity.current_employee_id(),
        total_credit_exposure.loan_id
    ) THEN
        RAISE EXCEPTION 'not allowed to read loan application %', total_credit_exposure.loan_id
            USING ERRCODE = '42501';
    END IF;

    WITH loan AS (
        SELECT application.id, application.requested_amount, application.primary_customer_id
        FROM credit.loan_application AS application
        WHERE application.id = total_credit_exposure.loan_id
    ),
    exposed_customer AS (
        SELECT loan.primary_customer_id AS customer_id
        FROM loan
        UNION
        SELECT customer_record.id
        FROM credit.case_related_party AS related
        JOIN customer.customer AS customer_record
          ON customer_record.party_id = related.party_id
        WHERE related.loan_application_id = total_credit_exposure.loan_id
          AND related.status = 'CONFIRMED'
    ),
    outstanding AS (
        SELECT COALESCE(SUM(account.outstanding_principal), 0) AS amount
        FROM credit.loan_account AS account
        JOIN credit.loan_application AS application
          ON application.id = account.loan_application_id
        WHERE application.primary_customer_id IN (SELECT customer_id FROM exposed_customer)
          AND application.id <> total_credit_exposure.loan_id
          AND account.status NOT IN ('CLOSED', 'SETTLED', 'PAID_OFF', 'CANCELLED')
    ),
    off_balance AS (
        SELECT COALESCE(SUM(exposure.amount), 0) AS amount
        FROM credit.customer_exposure AS exposure
        WHERE exposure.customer_id IN (SELECT customer_id FROM exposed_customer)
    )
    SELECT loan.requested_amount + outstanding.amount + off_balance.amount
    INTO total
    FROM loan, outstanding, off_balance;

    RETURN total;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Cap phe duyet can thiet (Q4, Q-M)
-- ---------------------------------------------------------------------------
-- Cap nho nhat co max_total_vnd >= tong (NULL = khong gioi han) trong phien ban
-- authority_tier moi nhat da co hieu luc. Dung bang nguong la thuoc cap duoi
-- (vd. dung 20 ty la cap 1).
CREATE FUNCTION credit.required_tier(loan_id UUID)
RETURNS SMALLINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    total NUMERIC;
    result_tier SMALLINT;
BEGIN
    total := credit.total_credit_exposure(required_tier.loan_id);
    IF total IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT MIN(authority.tier)
    INTO result_tier
    FROM credit.authority_tier AS authority
    WHERE authority.version = (
              SELECT MAX(latest.version)
              FROM credit.authority_tier AS latest
              WHERE latest.valid_from <= CURRENT_DATE
          )
      AND (authority.max_total_vnd IS NULL OR total <= authority.max_total_vnd);

    RETURN result_tier;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Quyen
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION credit.is_excluded(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.total_credit_exposure(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION credit.required_tier(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION credit.is_excluded(UUID, UUID) TO bank_app;
GRANT EXECUTE ON FUNCTION credit.total_credit_exposure(UUID) TO bank_app;
GRANT EXECUTE ON FUNCTION credit.required_tier(UUID) TO bank_app;

COMMENT ON FUNCTION credit.is_excluded(UUID, UUID) IS
    'E8 separation of duties: TRUE if the employee took part in any step of the case (except their own open or returned APPROVAL step, Q-O) or is/was the customer''s RM within 2 years.';
COMMENT ON FUNCTION credit.total_credit_exposure(UUID) IS
    'Q4/Q-T total credit: requested amount + active outstanding + off-balance exposure of the primary customer and CONFIRMED related parties. Caller must be able to read the case.';
COMMENT ON FUNCTION credit.required_tier(UUID) IS
    'Approval tier (1..3) for the case total credit under the latest effective credit.authority_tier version.';
