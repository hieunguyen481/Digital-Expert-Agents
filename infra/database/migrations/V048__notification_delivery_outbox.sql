-- V048: outbox gửi thông báo ra kênh ngoài (email qua SMTP ở đợt sau).
-- Mỗi thông báo trong ứng dụng (integration.notification) sinh trong CÙNG giao dịch một bản ghi
-- PENDING cho từng kênh; worker gửi thật chạy ngoài giao dịch (claim -> gửi -> finish), nên không
-- bao giờ gửi thẳng trong giao dịch nghiệp vụ. Bản ghi mang người nhận, loại, tiêu đề, nội dung
-- và đường dẫn hồ sơ; worker ghép địa chỉ gốc của ứng dụng và địa chỉ email của người nhận.
CREATE TABLE integration.notification_delivery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES integration.notification(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    recipient_employee_id UUID NOT NULL REFERENCES identity.employee(id),
    notification_type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_path TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ NULL,
    locked_by TEXT NULL,
    sent_at TIMESTAMPTZ NULL,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_notification_delivery_channel CHECK (channel IN ('EMAIL')),
    CONSTRAINT ck_notification_delivery_status CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    CONSTRAINT uq_notification_delivery UNIQUE (notification_id, channel)
);
CREATE INDEX idx_notification_delivery_pending ON integration.notification_delivery(status, available_at);

CREATE FUNCTION integration.enqueue_notification_delivery() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $function$
BEGIN
    INSERT INTO integration.notification_delivery (
        notification_id, channel, recipient_employee_id, notification_type, title, message, link_path
    ) VALUES (
        NEW.id, 'EMAIL', NEW.employee_id, NEW.notification_type, NEW.title, NEW.message,
        CASE WHEN NEW.resource_type = 'LOAN_APPLICATION' AND NEW.resource_id IS NOT NULL
             THEN '/ho-so-vay/' || NEW.resource_id::text END
    );
    RETURN NEW;
END
$function$;

CREATE TRIGGER trg_notification_enqueue_delivery AFTER INSERT ON integration.notification
    FOR EACH ROW EXECUTE FUNCTION integration.enqueue_notification_delivery();

-- Worker lấy lô: PENDING đến hạn hoặc PROCESSING bị treo quá 5 phút; trả kèm email người nhận.
CREATE FUNCTION integration.claim_notification_deliveries(p_channel TEXT, p_worker TEXT, p_batch INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID, recipient_employee_id UUID, recipient_email TEXT, notification_type TEXT,
    title TEXT, message TEXT, link_path TEXT, attempt_count INTEGER
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
           upd.title, upd.message, upd.link_path, upd.attempt_count
    FROM upd JOIN identity.employee AS e ON e.id = upd.recipient_employee_id;
$function$;

-- Kết quả gửi: thành công -> SENT; lỗi -> thử lại sau attempt*5 phút, quá 5 lần -> FAILED.
CREATE FUNCTION integration.finish_notification_delivery(p_id UUID, p_ok BOOLEAN, p_error TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    UPDATE integration.notification_delivery AS d
    SET status = CASE WHEN p_ok THEN 'SENT' WHEN d.attempt_count + 1 >= 5 THEN 'FAILED' ELSE 'PENDING' END,
        attempt_count = d.attempt_count + CASE WHEN p_ok THEN 0 ELSE 1 END,
        sent_at = CASE WHEN p_ok THEN now() END,
        available_at = CASE WHEN p_ok THEN d.available_at ELSE now() + make_interval(mins => 5 * (d.attempt_count + 1)) END,
        last_error = CASE WHEN p_ok THEN NULL ELSE left(p_error, 2000) END,
        locked_at = NULL, locked_by = NULL
    WHERE d.id = p_id;
$function$;

REVOKE ALL ON FUNCTION integration.claim_notification_deliveries(TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION integration.finish_notification_delivery(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION integration.claim_notification_deliveries(TEXT, TEXT, INTEGER) TO bank_worker;
GRANT EXECUTE ON FUNCTION integration.finish_notification_delivery(UUID, BOOLEAN, TEXT) TO bank_worker;
