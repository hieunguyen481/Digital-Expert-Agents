-- Q4/Q-T: cấp phê duyệt tính trên dư nợ TẠI NGÂN HÀNG (credit.loan_account + credit.customer_exposure, cả bên liên quan đã
-- xác nhận) cộng khoản mới; dư nợ ở TCTD khác (credit.existing_obligation) không tính. Đội agent dùng đúng cách tính của
-- credit.total_credit_exposure (backend), trừ phần khoản đang đề nghị: không bao giờ lệch nhau.
CREATE OR REPLACE FUNCTION credit.existing_bank_exposure(p_customer UUID, p_loan UUID DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    result NUMERIC;
BEGIN
    IF p_customer IS NULL OR NOT identity.can_read_customer(identity.current_employee_id(), p_customer) THEN
        RAISE EXCEPTION 'not allowed to read customer %', p_customer USING ERRCODE = '42501';
    END IF;
    WITH exposed_customer AS (
        SELECT p_customer AS customer_id
        UNION
        SELECT customer_record.id
        FROM credit.case_related_party AS related
        JOIN customer.customer AS customer_record ON customer_record.party_id = related.party_id
        WHERE related.loan_application_id = p_loan AND related.status = 'CONFIRMED'
    ),
    outstanding AS (
        SELECT COALESCE(SUM(account.outstanding_principal), 0) AS amount
        FROM credit.loan_account AS account
        JOIN credit.loan_application AS application ON application.id = account.loan_application_id
        WHERE application.primary_customer_id IN (SELECT customer_id FROM exposed_customer)
          AND application.id IS DISTINCT FROM p_loan
          AND account.status NOT IN ('CLOSED', 'SETTLED', 'PAID_OFF', 'CANCELLED')
    ),
    off_balance AS (
        SELECT COALESCE(SUM(exposure.amount), 0) AS amount
        FROM credit.customer_exposure AS exposure
        WHERE exposure.customer_id IN (SELECT customer_id FROM exposed_customer)
          AND exposure.as_of_date = (
              SELECT MAX(latest.as_of_date) FROM credit.customer_exposure AS latest
              WHERE latest.customer_id = exposure.customer_id AND latest.exposure_type = exposure.exposure_type)
    )
    SELECT outstanding.amount + off_balance.amount INTO result FROM outstanding, off_balance;
    RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION credit.existing_bank_exposure(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.existing_bank_exposure(UUID, UUID) TO bank_engine;
