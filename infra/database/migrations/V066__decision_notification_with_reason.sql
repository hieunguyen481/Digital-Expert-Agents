-- V066 (P08): thông báo "Có quyết định" gửi QHKH kèm lý do của quyết định (loan_decision.rationale),
-- ghi trong cùng giao dịch ngay trước khi hồ sơ đổi trạng thái.
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'integration' AND p.proname = 'notify_loan_decision';
    v_new := replace(v_def,
        '                    WHEN ''APPROVED'' THEN ''Hồ sơ đã được phê duyệt.''
                    WHEN ''APPROVED_WITH_CONDITIONS'' THEN ''Hồ sơ được phê duyệt có điều kiện.''
                    ELSE ''Hồ sơ bị từ chối.'' END,',
        '                    WHEN ''APPROVED'' THEN ''Hồ sơ đã được phê duyệt.''
                    WHEN ''APPROVED_WITH_CONDITIONS'' THEN ''Hồ sơ được phê duyệt có điều kiện.''
                    ELSE ''Hồ sơ bị từ chối.'' END
                || COALESCE((SELECT '' Lý do: '' || btrim(d.rationale)
                             FROM credit.loan_decision AS d
                             WHERE d.loan_application_id = NEW.id AND NULLIF(btrim(d.rationale), '''') IS NOT NULL
                             ORDER BY d.decision_at DESC LIMIT 1), ''''),');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'notify_loan_decision: khong tim thay doan message de va';
    END IF;
    EXECUTE v_new;
END
$patch$;
