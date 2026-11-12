-- V065 (P01): bước RISK_PENDING_INFO (Rủi ro "Yêu cầu giải trình") lưu lý do của chính yêu cầu,
-- để người nhận thấy đúng nội dung cần giải trình thay vì lý do trả lại cũ của bước trước.
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'credit' AND p.proname = 'apply_transition';
    v_new := replace(v_def,
        'v_new_code IN (''PENDING_INFO'', ''RM_REWORK'')
                  OR',
        'v_new_code IN (''PENDING_INFO'', ''RM_REWORK'', ''RISK_PENDING_INFO'')
                  OR');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'apply_transition: khong tim thay doan reason de va';
    END IF;
    EXECUTE v_new;
END
$patch$;
