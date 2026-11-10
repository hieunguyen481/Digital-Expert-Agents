-- L02: buoc moi (cho bo sung, tra lai QHKH) mang ly do cua nguoi yeu cau/tra lai, de QHKH
-- doc duoc tren ho so va trong thong bao. Truoc day ly do chi nam o buoc da dong hoac o nhat ky.
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'credit' AND p.proname = 'apply_transition';
    v_new := replace(v_def,
        'due_at, resumed_at, created_by, created_at
        )
        VALUES (
            gen_random_uuid(), p_loan_id, v_new_code, p_new_assignee, v_now,
            v_expected_due, CASE WHEN p_action = ''fraud_release'' THEN v_now END, v_caller, v_now
        );',
        'due_at, resumed_at, created_by, created_at, reason
        )
        VALUES (
            gen_random_uuid(), p_loan_id, v_new_code, p_new_assignee, v_now,
            v_expected_due, CASE WHEN p_action = ''fraud_release'' THEN v_now END, v_caller, v_now,
            CASE WHEN v_new_code IN (''PENDING_INFO'', ''RM_REWORK'') THEN NULLIF(btrim(p_reason), '''') END
        );');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'apply_transition: khong tim thay doan INSERT case_step de vá';
    END IF;
    EXECUTE v_new;
END
$patch$;

CREATE OR REPLACE FUNCTION integration.notify_case_step() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_number TEXT;
    v_rm UUID;
    v_type TEXT;
    v_title TEXT;
    v_message TEXT;
BEGIN
    SELECT loan.application_number, customer_record.relationship_manager_id INTO v_number, v_rm
    FROM credit.loan_application AS loan
    LEFT JOIN customer.customer AS customer_record ON customer_record.id = loan.primary_customer_id
    WHERE loan.id = NEW.loan_application_id;

    IF NEW.step_code = 'RM_REWORK' AND v_rm IS NOT NULL THEN
        INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        VALUES (gen_random_uuid(), v_rm, 'CASE_RETURNED', 'Hồ sơ bị trả lại: ' || v_number,
                COALESCE('Lý do: ' || NEW.reason || '. ', '') || 'Hồ sơ cần chỉnh sửa và bổ sung trước hạn.',
                'LOAN_APPLICATION', NEW.loan_application_id, 'UNREAD', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    IF NEW.step_code = 'PENDING_INFO' AND v_rm IS NOT NULL THEN
        INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        VALUES (gen_random_uuid(), v_rm, 'SUPPLEMENT_REQUESTED', 'Yêu cầu bổ sung: ' || v_number,
                COALESCE('Nội dung cần bổ sung: ' || NEW.reason, 'Thẩm định yêu cầu bổ sung hồ sơ; xem nội dung yêu cầu trên hồ sơ.'),
                'LOAN_APPLICATION', NEW.loan_application_id, 'UNREAD', CURRENT_TIMESTAMP);
    END IF;
    IF NEW.assignee_employee_id IS NOT NULL AND NEW.step_code <> 'RM_DRAFT'
       AND NEW.assignee_employee_id IS DISTINCT FROM identity.current_employee_id() THEN
        v_type := CASE WHEN NEW.step_code = 'PENDING_INFO' THEN 'CASE_WAITING_INFO' ELSE 'CASE_ASSIGNED' END;
        v_title := 'Hồ sơ giao cho bạn: ' || v_number;
        v_message := 'Bước ' || CASE NEW.step_code
            WHEN 'CHECKING' THEN 'Kiểm tra hồ sơ'
            WHEN 'APPRAISAL' THEN 'Thẩm định'
            WHEN 'RISK_REVIEW' THEN 'Ý kiến Rủi ro'
            WHEN 'RISK_PENDING_INFO' THEN 'Chờ giải trình'
            WHEN 'PENDING_INFO' THEN 'Chờ khách bổ sung'
            WHEN 'APPROVAL' THEN 'Phê duyệt'
            WHEN 'COUNCIL_SESSION' THEN 'Phiên Hội đồng'
            ELSE NEW.step_code END
            || CASE WHEN NEW.due_at IS NOT NULL
                    THEN ', hạn ' || to_char(NEW.due_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
                    ELSE '' END || '.';
        INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        VALUES (gen_random_uuid(), NEW.assignee_employee_id, v_type, v_title, v_message,
                'LOAN_APPLICATION', NEW.loan_application_id, 'UNREAD', CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END
$function$;

-- L12: thong bao giao ho so phai co ma ho so.
DO $patch$
DECLARE
    v_def TEXT;
    v_new TEXT;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc AS p JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'credit' AND p.proname = 'reassign_case_step';
    v_new := replace(v_def,
        '''Được giao hồ sơ'',
           ''Trưởng phòng chuyển hồ sơ cho bạn: '' || btrim(p_reason), ''LOAN_APPLICATION'', p_loan_id, ''UNREAD'', now();',
        '''Được giao hồ sơ: '' || loan.application_number,
           ''Trưởng phòng chuyển hồ sơ cho bạn: '' || btrim(p_reason), ''LOAN_APPLICATION'', p_loan_id, ''UNREAD'', now()
    FROM credit.loan_application AS loan WHERE loan.id = p_loan_id;');
    IF v_new = v_def THEN
        RAISE EXCEPTION 'reassign_case_step: khong tim thay doan INSERT notification de va';
    END IF;
    EXECUTE v_new;
END
$patch$;
