-- L03: ho so vao Y kien Rui ro thi Tuan thu (nguoi vua duoc cap quyen doc) nhan thong bao "Can y kien Tuan thu".
-- Viec "cua toi" cua Tuan thu duoc suy ra o truy van (work_item_repository): dong khi da ghi y kien Tuan thu.
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'credit' AND p.proname = 'apply_transition';
    v_new := replace(v_def,
        'PERFORM credit.ensure_compliance_reader(p_loan_id, v_caller, p_action);',
        'INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        SELECT gen_random_uuid(), reader.id, ''COMPLIANCE_OPINION_NEEDED'',
               ''Cần ý kiến Tuân thủ: '' || loan.application_number,
               ''Hồ sơ đã vào bước Ý kiến Rủi ro; cần ghi ý kiến Tuân thủ để Rủi ro trình phê duyệt.'',
               ''LOAN_APPLICATION'', p_loan_id, ''UNREAD'', now()
        FROM (SELECT credit.ensure_compliance_reader(p_loan_id, v_caller, p_action) AS id) AS reader
        JOIN credit.loan_application AS loan ON loan.id = p_loan_id
        WHERE reader.id IS DISTINCT FROM v_caller;');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'apply_transition: khong tim thay loi goi ensure_compliance_reader de va';
    END IF;
    EXECUTE v_new;
END
$patch$;
