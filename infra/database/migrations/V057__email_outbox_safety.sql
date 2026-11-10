-- Email an toan: mac dinh KHONG ghi hang gui thu. Bat bang `UPDATE integration.email_outbox_setting SET enabled = true`
-- (script infra/scripts/email-outbox.sh on). e2e, seed va reset-demo tat lai nen thu sinh ra o do khong vao hang gui.
CREATE TABLE integration.email_outbox_setting (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO integration.email_outbox_setting (singleton, enabled) VALUES (TRUE, FALSE);

CREATE OR REPLACE FUNCTION integration.enqueue_notification_delivery() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $function$
BEGIN
    IF NOT COALESCE((SELECT s.enabled FROM integration.email_outbox_setting AS s), FALSE) THEN
        RETURN NEW;
    END IF;
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

-- Hang cho cu sinh luc chua co cong tat: khong gui.
UPDATE integration.notification_delivery
   SET status = 'FAILED', attempt_count = 5, locked_at = NULL, locked_by = NULL,
       last_error = 'email-outbox: tat mac dinh (V057), khong gui'
 WHERE status IN ('PENDING', 'PROCESSING');

-- Nha lai dong PROCESSING bi ket (worker chet giua chung) ve PENDING, khong tinh la lan thu.
CREATE FUNCTION integration.release_stale_deliveries(p_channel TEXT, p_older INTERVAL DEFAULT interval '5 minutes')
RETURNS INTEGER
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    WITH r AS (
        UPDATE integration.notification_delivery AS d
        SET status = 'PENDING', locked_at = NULL, locked_by = NULL
        WHERE d.channel = p_channel AND d.status = 'PROCESSING' AND d.locked_at < now() - p_older
        RETURNING 1
    )
    SELECT count(*)::integer FROM r;
$function$;

-- So thu da gui trong cua so gan day (tran so thu moi gio).
CREATE FUNCTION integration.deliveries_sent_since(p_channel TEXT, p_window INTERVAL)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    SELECT count(*)::integer FROM integration.notification_delivery AS d
    WHERE d.channel = p_channel AND d.status = 'SENT' AND d.sent_at >= now() - p_window;
$function$;

-- Hoan thu den khi p_until (loi vuot han muc nha cung cap): khong tinh la lan thu, khong goi SMTP lai som.
CREATE FUNCTION integration.defer_notification_delivery(p_id UUID, p_until TIMESTAMPTZ, p_error TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    UPDATE integration.notification_delivery AS d
    SET status = 'PENDING', available_at = p_until, last_error = left(p_error, 2000),
        locked_at = NULL, locked_by = NULL
    WHERE d.id = p_id;
$function$;

REVOKE ALL ON FUNCTION integration.release_stale_deliveries(TEXT, INTERVAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION integration.deliveries_sent_since(TEXT, INTERVAL) FROM PUBLIC;
REVOKE ALL ON FUNCTION integration.defer_notification_delivery(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION integration.release_stale_deliveries(TEXT, INTERVAL) TO bank_worker;
GRANT EXECUTE ON FUNCTION integration.deliveries_sent_since(TEXT, INTERVAL) TO bank_worker;
GRANT EXECUTE ON FUNCTION integration.defer_notification_delivery(UUID, TIMESTAMPTZ, TEXT) TO bank_worker;
