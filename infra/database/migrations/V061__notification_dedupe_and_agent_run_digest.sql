-- V061: thông báo gọn hơn (M05, C-N1, M10).
--  1. Một lượt đội agent sinh nhiều đề xuất -> chỉ một thông báo gộp ("N đề xuất mới"), không một thông báo mỗi đề xuất.
--  2. Thông báo chưa đọc trùng hệt (người nhận, loại, hồ sơ, tiêu đề, nội dung) không ghi thêm: nạp lại seed
--     hay đặt lại demo không nhân bản thông báo.
--  3. Lý do kết thúc bằng dấu chấm không còn thành hai dấu chấm trong nội dung.
-- Hàm bảo vệ phạm vi (V051) giữ nguyên điều kiện cũ, chỉ thêm ba bước trên.
CREATE OR REPLACE FUNCTION integration.guard_notification_scope() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $function$
DECLARE
    v_existing RECORD;
    v_count INT;
BEGIN
    IF NEW.notification_type <> 'EARLY_WARNING_COMPLIANCE'
       AND NEW.resource_type = 'LOAN_APPLICATION' AND NEW.resource_id IS NOT NULL
       AND NOT integration.employee_can_read_loan(NEW.employee_id, NEW.resource_id) THEN
        RETURN NULL;
    END IF;
    NEW.message := regexp_replace(NEW.message, '\.\.(\s)', '.\1', 'g');
    IF NEW.resource_type = 'LOAN_APPLICATION' AND NEW.resource_id IS NOT NULL THEN
        IF NEW.notification_type = 'AGENT_ACTION_PROPOSED' THEN
            SELECT id, title INTO v_existing FROM integration.notification
            WHERE employee_id = NEW.employee_id AND notification_type = NEW.notification_type
              AND resource_type = NEW.resource_type AND resource_id = NEW.resource_id
              AND status = 'UNREAD' AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
            ORDER BY created_at DESC LIMIT 1;
            IF FOUND THEN
                v_count := COALESCE(substring(v_existing.title FROM '^(\d+) đề xuất')::INT, 1) + 1;
                UPDATE integration.notification
                SET title = v_count || ' đề xuất mới của đội agent: '
                            || regexp_replace(v_existing.title, '^.*?: ', ''),
                    message = 'Đội agent vừa đề xuất ' || v_count
                              || ' hành động cho hồ sơ này — cần bạn xác nhận hoặc bỏ kèm lý do.',
                    created_at = CURRENT_TIMESTAMP
                WHERE id = v_existing.id;
                RETURN NULL;
            END IF;
        ELSIF EXISTS (
            SELECT 1 FROM integration.notification AS o
            WHERE o.employee_id = NEW.employee_id AND o.notification_type = NEW.notification_type
              AND o.resource_type = NEW.resource_type AND o.resource_id = NEW.resource_id
              AND o.title = NEW.title AND o.message = NEW.message AND o.status = 'UNREAD'
        ) THEN
            RETURN NULL;
        END IF;
    END IF;
    RETURN NEW;
END
$function$;

UPDATE integration.notification SET message = regexp_replace(message, '\.\.(\s)', '.\1', 'g')
WHERE message ~ '\.\.\s';
