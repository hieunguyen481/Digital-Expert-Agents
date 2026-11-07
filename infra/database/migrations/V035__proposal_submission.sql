-- V035: trang 04 lat 7 - rut de xuat ngoai le va bang so lieu cap tin dung theo tung ben.
-- 1. case_exception.withdrawn_at: QHKH rut de xuat (khong xoa, giu dau vet). Cong gui bo qua dong da rut.
ALTER TABLE credit.case_exception ADD COLUMN withdrawn_at TIMESTAMPTZ NULL;
COMMENT ON COLUMN credit.case_exception.withdrawn_at IS
    'Thoi diem nguoi de xuat rut ngoai le truoc khi duoc quyet; dong da rut khong con mien chan Gui.';

-- 2. Tung dong cap tin dung (khach chinh + ben lien quan) de hien thi bang tinh cap phe duyet.
-- SECURITY DEFINER nhu credit.total_credit_exposure vi du no cua ben lien quan nam ngoai pham vi QHKH.
CREATE FUNCTION credit.case_exposure_lines(loan_id UUID)
RETURNS TABLE (
    line_party_id UUID,
    line_customer_id UUID,
    line_name TEXT,
    line_relation TEXT,
    line_status TEXT,
    line_outstanding NUMERIC,
    line_off_balance NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
    IF NOT identity.can_read_loan(
        identity.current_employee_id(), case_exposure_lines.loan_id
    ) THEN
        RAISE EXCEPTION 'not allowed to read loan application %', case_exposure_lines.loan_id
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH members AS (
        SELECT customer_record.party_id AS party_id, customer_record.id AS customer_id,
               'PRIMARY'::text AS relation, NULL::text AS status
        FROM credit.loan_application AS application
        JOIN customer.customer AS customer_record ON customer_record.id = application.primary_customer_id
        WHERE application.id = case_exposure_lines.loan_id
        UNION ALL
        SELECT related.party_id, customer_record.id, 'RELATED'::text, related.status::text
        FROM credit.case_related_party AS related
        LEFT JOIN customer.customer AS customer_record ON customer_record.party_id = related.party_id
        WHERE related.loan_application_id = case_exposure_lines.loan_id
    )
    SELECT member.party_id, member.customer_id, party.display_name::text, member.relation, member.status,
           COALESCE((
               SELECT SUM(account.outstanding_principal)
               FROM credit.loan_account AS account
               JOIN credit.loan_application AS other ON other.id = account.loan_application_id
               WHERE other.primary_customer_id = member.customer_id
                 AND other.id <> case_exposure_lines.loan_id
                 AND account.status NOT IN ('CLOSED', 'SETTLED', 'PAID_OFF', 'CANCELLED')
           ), 0),
           COALESCE((
               SELECT SUM(exposure.amount) FROM credit.customer_exposure AS exposure
               WHERE exposure.customer_id = member.customer_id
           ), 0)
    FROM members AS member
    JOIN customer.party AS party ON party.id = member.party_id;
END;
$function$;

REVOKE ALL ON FUNCTION credit.case_exposure_lines(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.case_exposure_lines(UUID) TO bank_app;
COMMENT ON FUNCTION credit.case_exposure_lines(UUID) IS
    'Per-party breakdown behind credit.total_credit_exposure: outstanding principal and off-balance exposure of the primary customer and every related party of the case (any status).';
