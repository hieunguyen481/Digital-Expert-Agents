-- V068 (Q05): thông báo giao hồ sơ ở bước RISK_PENDING_INFO (Chờ giải trình) nêu nội dung cần giải trình,
-- như thông báo "Yêu cầu bổ sung" của luồng PENDING_INFO. Lý do bước này không còn che (V067).
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'integration' AND p.proname = 'notify_case_step';
    v_new := replace(v_def,
        '                    ELSE '''' END || ''.'';',
        '                    ELSE '''' END || ''.''
            || CASE WHEN NEW.step_code = ''RISK_PENDING_INFO'' AND NULLIF(btrim(NEW.reason), '''') IS NOT NULL
                    THEN '' Nội dung cần giải trình: '' || btrim(NEW.reason) || ''.'' ELSE '''' END;');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'notify_case_step: khong tim thay doan de va (V068)';
    END IF;
    EXECUTE v_new;
END
$patch$;
