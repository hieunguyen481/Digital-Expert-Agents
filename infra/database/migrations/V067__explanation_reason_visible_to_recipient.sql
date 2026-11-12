-- V067 (P01): lý do "Yêu cầu giải trình" (bước RISK_PENDING_INFO) gửi tới Hỗ trợ tín dụng để họ xử lý,
-- nên không còn che như lý do bước AML/gian lận (Q-M). Lý do bước FRAUD_HOLD và kết quả FRAUD_HOLD/RELEASED vẫn che.
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'credit' AND p.proname = 'step_reason_restricted';
    v_new := replace(v_def,
        'step.step_code IN (''FRAUD_HOLD'', ''RISK_PENDING_INFO'')',
        'step.step_code = ''FRAUD_HOLD''');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'step_reason_restricted: khong tim thay doan de va';
    END IF;
    EXECUTE v_new;
END
$patch$;
