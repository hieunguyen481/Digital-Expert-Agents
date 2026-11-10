-- R-02: thong bao khi giao viec, tra lai, yeu cau bo sung va co quyet dinh.
-- Sinh bang trigger de moi duong chuyen buoc (apply_transition, ham SQL khac) deu co thong bao;
-- SECURITY DEFINER vi thong bao thuoc ve nguoi nhan, nguoi thao tac khong ghi duoc thong bao cua nguoi khac.
-- Noi dung khong gom ly do cua buoc gian lan / AML (Q-M).
CREATE FUNCTION integration.notify_case_step() RETURNS trigger
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
                'Hồ sơ cần chỉnh sửa và bổ sung trước hạn.', 'LOAN_APPLICATION', NEW.loan_application_id,
                'UNREAD', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    IF NEW.step_code = 'PENDING_INFO' AND v_rm IS NOT NULL THEN
        INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        VALUES (gen_random_uuid(), v_rm, 'SUPPLEMENT_REQUESTED', 'Yêu cầu bổ sung: ' || v_number,
                'Thẩm định yêu cầu bổ sung hồ sơ; xem nội dung yêu cầu trên hồ sơ.', 'LOAN_APPLICATION',
                NEW.loan_application_id, 'UNREAD', CURRENT_TIMESTAMP);
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

CREATE TRIGGER trg_case_step_notify AFTER INSERT ON credit.case_step
FOR EACH ROW EXECUTE FUNCTION integration.notify_case_step();

CREATE FUNCTION integration.notify_loan_decision() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_rm UUID;
BEGIN
    SELECT relationship_manager_id INTO v_rm FROM customer.customer WHERE id = NEW.primary_customer_id;
    IF v_rm IS NOT NULL THEN
        INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        VALUES (gen_random_uuid(), v_rm, 'CASE_DECIDED', 'Có quyết định: ' || NEW.application_number,
                CASE NEW.status
                    WHEN 'APPROVED' THEN 'Hồ sơ đã được phê duyệt.'
                    WHEN 'APPROVED_WITH_CONDITIONS' THEN 'Hồ sơ được phê duyệt có điều kiện.'
                    ELSE 'Hồ sơ bị từ chối.' END,
                'LOAN_APPLICATION', NEW.id, 'UNREAD', CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END
$function$;

CREATE TRIGGER trg_loan_decision_notify
AFTER UPDATE OF status ON credit.loan_application
FOR EACH ROW
WHEN (NEW.status IN ('APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED')
      AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION integration.notify_loan_decision();
