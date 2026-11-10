-- V050: worker email cần tên và vai trò người nhận để ghi vào tiêu đề thư khi chuyển thư demo.
-- Chỉ thêm cột trả về của hàm claim; hành vi lấy lô giữ nguyên.
DROP FUNCTION integration.claim_notification_deliveries(TEXT, TEXT, INTEGER);
CREATE FUNCTION integration.claim_notification_deliveries(p_channel TEXT, p_worker TEXT, p_batch INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID, recipient_employee_id UUID, recipient_email TEXT, notification_type TEXT,
    title TEXT, message TEXT, link_path TEXT, attempt_count INTEGER,
    recipient_name TEXT, recipient_roles TEXT
)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    WITH picked AS (
        SELECT d.id FROM integration.notification_delivery AS d
        WHERE d.channel = p_channel
          AND ((d.status = 'PENDING' AND d.available_at <= now())
               OR (d.status = 'PROCESSING' AND d.locked_at < now() - interval '5 minutes'))
        ORDER BY d.available_at, d.created_at, d.id
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(1, LEAST(p_batch, 500))
    ), upd AS (
        UPDATE integration.notification_delivery AS d
        SET status = 'PROCESSING', locked_at = now(), locked_by = p_worker
        FROM picked WHERE d.id = picked.id
        RETURNING d.*
    )
    SELECT upd.id, upd.recipient_employee_id, e.email::text, upd.notification_type::text,
           upd.title, upd.message, upd.link_path, upd.attempt_count,
           e.full_name,
           COALESCE((SELECT string_agg(r.role_code::text, ', ' ORDER BY r.role_code)
                     FROM identity.employee_role AS er
                     JOIN identity.role AS r ON r.id = er.role_id
                     WHERE er.employee_id = e.id
                       AND (er.valid_until IS NULL OR er.valid_until > now())), '')
    FROM upd JOIN identity.employee AS e ON e.id = upd.recipient_employee_id;
$function$;
REVOKE ALL ON FUNCTION integration.claim_notification_deliveries(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION integration.claim_notification_deliveries(TEXT, TEXT, INTEGER) TO bank_worker;
