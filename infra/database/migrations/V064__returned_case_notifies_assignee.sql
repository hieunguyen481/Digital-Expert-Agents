-- V064 (N03): khi Rủi ro "Trả lại Thẩm định" hoặc Cấp phê duyệt "Trả lại bổ sung" mở lại bước Thẩm định,
-- người nhận thấy thông báo "Hồ sơ bị trả lại: … Lý do: …" như QHKH, và mỗi lần trả là một thông báo mới.
--  1. Bước mới mang lý do khi do hành động trả lại (risk_return, return_for_supplement) mở ra.
--  2. Trigger sinh CASE_RETURNED cho người giữ bước Thẩm định có lý do.
--  3. Bộ lọc trùng (V061) không nuốt thông báo CASE_RETURNED: hai lần trả cùng lý do vẫn là hai thông báo.
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'credit' AND p.proname = 'apply_transition';
    v_new := replace(v_def,
        'CASE WHEN v_new_code IN (''PENDING_INFO'', ''RM_REWORK'') THEN NULLIF(btrim(p_reason), '''') END',
        'CASE WHEN v_new_code IN (''PENDING_INFO'', ''RM_REWORK'')
                  OR (v_new_code = ''APPRAISAL'' AND p_action IN (''risk_return'', ''return_for_supplement''))
                 THEN NULLIF(btrim(p_reason), '''') END');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'apply_transition: khong tim thay doan reason de va';
    END IF;
    EXECUTE v_new;
END
$patch$;

DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'integration' AND p.proname = 'notify_case_step';
    v_new := replace(v_def,
        '    IF NEW.assignee_employee_id IS NOT NULL AND NEW.step_code <> ''RM_DRAFT''',
        '    IF NEW.step_code = ''APPRAISAL'' AND NEW.reason IS NOT NULL AND NEW.assignee_employee_id IS NOT NULL
       AND NEW.assignee_employee_id IS DISTINCT FROM identity.current_employee_id() THEN
        INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        VALUES (gen_random_uuid(), NEW.assignee_employee_id, ''CASE_RETURNED'', ''Hồ sơ bị trả lại: '' || v_number,
                ''Lý do: '' || NEW.reason || ''. Hồ sơ trở lại bước Thẩm định, cần xử lý lại.'',
                ''LOAN_APPLICATION'', NEW.loan_application_id, ''UNREAD'', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    IF NEW.assignee_employee_id IS NOT NULL AND NEW.step_code <> ''RM_DRAFT''');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'notify_case_step: khong tim thay doan de va';
    END IF;
    EXECUTE v_new;
END
$patch$;

DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'integration' AND p.proname = 'guard_notification_scope';
    v_new := replace(v_def,
        '        ELSIF EXISTS (',
        '        ELSIF NEW.notification_type <> ''CASE_RETURNED'' AND EXISTS (');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'guard_notification_scope: khong tim thay doan de va';
    END IF;
    EXECUTE v_new;
END
$patch$;
