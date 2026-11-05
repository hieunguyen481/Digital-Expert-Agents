-- V024_1: customer_exposure la anh chup theo ngay (as_of_date, index
-- (customer_id, as_of_date DESC)), khong phai lich su can cong don. Tong cap tin
-- dung (Q-T) chi lay anh chup MOI NHAT cua tung (khach, loai): moi dong co
-- as_of_date bang ngay lon nhat cua (customer_id, exposure_type) duoc cong (nhieu
-- bao lanh cung ngay van cong du), anh chup cu hon bi bo.
-- Giu nguyen chu ky, SECURITY DEFINER, search_path, cong doc ho so (42501).
-- CREATE OR REPLACE giu nguyen quyen EXECUTE da cap o V024.

CREATE OR REPLACE FUNCTION credit.total_credit_exposure(loan_id UUID)
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
          AND exposure.as_of_date = (
              SELECT MAX(latest.as_of_date)
              FROM credit.customer_exposure AS latest
              WHERE latest.customer_id = exposure.customer_id
                AND latest.exposure_type = exposure.exposure_type
          )
    )
    SELECT loan.requested_amount + outstanding.amount + off_balance.amount
    INTO total
    FROM loan, outstanding, off_balance;

    RETURN total;
END;
$function$;

REVOKE ALL ON FUNCTION credit.total_credit_exposure(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.total_credit_exposure(UUID) TO bank_app;

COMMENT ON FUNCTION credit.total_credit_exposure(UUID) IS
    'Q4/Q-T total credit: requested amount + active outstanding + latest off-balance snapshot per (customer, exposure_type) of the primary customer and CONFIRMED related parties. Caller must be able to read the case.';
