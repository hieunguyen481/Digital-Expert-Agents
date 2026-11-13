-- V070 (S06): thông báo giao hồ sơ ở bước RISK_PENDING_INFO không nối thêm "." khi lý do đã kết thúc bằng dấu câu
-- (V068 luôn thêm "." nên lý do "...quý 2." thành "quý 2..").
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'integration' AND p.proname = 'notify_case_step';
    v_new := replace(v_def,
        ' Nội dung cần giải trình: '' || btrim(NEW.reason) || ''.''',
        ' Nội dung cần giải trình: '' || btrim(NEW.reason)
                    || CASE WHEN btrim(NEW.reason) ~ ''[.!?…;:]$'' THEN '''' ELSE ''.'' END');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'notify_case_step: khong tim thay doan de va (V070)';
    END IF;
    EXECUTE v_new;
END
$patch$;
