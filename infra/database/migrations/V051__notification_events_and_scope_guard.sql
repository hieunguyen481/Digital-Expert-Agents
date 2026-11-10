-- V051: bổ sung sự kiện thông báo còn thiếu và chốt chặn phạm vi đọc.
--  1. Gia hạn hạn bổ sung (credit.deadline_extension) -> báo người đã yêu cầu bổ sung hoặc trả hồ sơ.
--  2. Đề xuất hành động mới của đội agent (agent.action_proposal) -> báo người đang giữ bước nếu họ có vai trò
--     được xác nhận loại đề xuất đó (cùng bảng vai trò với agent_engine/gateway/actions.py PROPOSAL_ROLES).
--  3. Mọi thông báo gắn hồ sơ chỉ được ghi cho người đọc được hồ sơ (Q-M); người ngoài phạm vi bị bỏ qua.
-- Báo sớm Tuân thủ (V039) đã chọn người nhận không thuộc diện loại trừ; chốt chặn mục 3 áp dụng cho cả bảng.

CREATE FUNCTION integration.notify_deadline_extension() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $function$
DECLARE
    v_number TEXT;
    v_step_assignee UUID;
    v_requester UUID;
BEGIN
    SELECT application_number INTO v_number FROM credit.loan_application WHERE id = NEW.loan_application_id;
    SELECT assignee_employee_id INTO v_step_assignee FROM credit.case_step WHERE id = NEW.case_step_id;
    IF v_step_assignee IS NOT NULL AND v_step_assignee IS DISTINCT FROM NEW.extended_by THEN
        v_requester := v_step_assignee;
    ELSE
        SELECT prev.assignee_employee_id INTO v_requester
        FROM credit.case_step AS prev
        WHERE prev.loan_application_id = NEW.loan_application_id
          AND prev.id <> NEW.case_step_id AND prev.completed_at IS NOT NULL
          AND prev.assignee_employee_id IS NOT NULL
          AND prev.assignee_employee_id IS DISTINCT FROM NEW.extended_by
        ORDER BY prev.completed_at DESC LIMIT 1;
    END IF;
    IF v_requester IS NOT NULL THEN
        INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        VALUES (gen_random_uuid(), v_requester, 'DEADLINE_EXTENDED', 'QHKH gia hạn bổ sung: ' || v_number,
                'Hạn bổ sung được gia hạn đến '
                || to_char(NEW.new_due_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI')
                || '. Lý do: ' || NEW.reason, 'LOAN_APPLICATION', NEW.loan_application_id, 'UNREAD', CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END
$function$;
CREATE TRIGGER trg_deadline_extension_notify AFTER INSERT ON credit.deadline_extension
FOR EACH ROW EXECUTE FUNCTION integration.notify_deadline_extension();

CREATE FUNCTION integration.notify_action_proposal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $function$
DECLARE
    v_loan UUID;
    v_number TEXT;
    v_holder UUID;
    v_roles TEXT[];
BEGIN
    BEGIN
        SELECT (payload -> 'request' ->> 'loan_application_id')::uuid INTO v_loan
        FROM agent.case_run WHERE case_id = NEW.case_id;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN NEW;
    END;
    IF v_loan IS NULL THEN
        RETURN NEW;
    END IF;
    v_roles := CASE NEW.kind
        WHEN 'add_risk_flag' THEN ARRAY['credit_appraiser', 'risk_officer', 'document_reviewer']
        WHEN 'request_documents' THEN ARRAY['credit_appraiser']
        WHEN 'add_disbursement_condition' THEN ARRAY['credit_appraiser', 'loan_approver']
        ELSE ARRAY[]::TEXT[] END;
    SELECT loan.application_number INTO v_number FROM credit.loan_application AS loan WHERE loan.id = v_loan;
    SELECT step.assignee_employee_id INTO v_holder
    FROM credit.case_step AS step
    WHERE step.loan_application_id = v_loan AND step.completed_at IS NULL AND step.assignee_employee_id IS NOT NULL
    ORDER BY step.received_at DESC LIMIT 1;
    IF v_holder IS NOT NULL AND EXISTS (
        SELECT 1 FROM unnest(v_roles) AS r WHERE credit.has_active_role(v_holder, r)
    ) THEN
        INSERT INTO integration.notification (id, employee_id, notification_type, title, message,
                                              resource_type, resource_id, status, created_at)
        VALUES (gen_random_uuid(), v_holder, 'AGENT_ACTION_PROPOSED', 'Đề xuất mới của đội agent: ' || v_number,
                NEW.title || ' — cần bạn xác nhận hoặc bỏ kèm lý do.', 'LOAN_APPLICATION', v_loan, 'UNREAD',
                CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END
$function$;
CREATE TRIGGER trg_action_proposal_notify AFTER INSERT ON agent.action_proposal
FOR EACH ROW EXECUTE FUNCTION integration.notify_action_proposal();

-- identity.can_read_loan chỉ đánh giá cho người đang đăng nhập, nên không dùng được cho người nhận khác.
-- Hàm này lặp lại điều kiện đọc (người giữ bước, người được giao, QHKH của khách, phạm vi hồ sơ, kiểm toán)
-- theo tham số; chặt hơn hoặc bằng can_read_loan (không tính phạm vi theo chi nhánh).
CREATE FUNCTION integration.employee_can_read_loan(p_employee UUID, p_loan UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $function$
    SELECT p_employee IS NOT NULL AND p_loan IS NOT NULL AND (
        credit.has_active_role(p_employee, 'auditor')
        OR EXISTS (
            SELECT 1 FROM credit.loan_application AS loan
            LEFT JOIN customer.customer AS customer_record ON customer_record.id = loan.primary_customer_id
            WHERE loan.id = p_loan
              AND (loan.assigned_employee_id = p_employee OR customer_record.relationship_manager_id = p_employee)
        )
        OR EXISTS (SELECT 1 FROM credit.case_step AS step
                   WHERE step.loan_application_id = p_loan AND step.assignee_employee_id = p_employee)
        OR EXISTS (SELECT 1 FROM identity.employee_scope AS scope
                   WHERE scope.employee_id = p_employee AND scope.scope_type = 'LOAN_APPLICATION'
                     AND scope.scope_id = p_loan AND scope.valid_from <= CURRENT_TIMESTAMP
                     AND (scope.valid_until IS NULL OR scope.valid_until > CURRENT_TIMESTAMP)
                     AND scope.permission_code IN ('loan:read', 'loan:update', 'loan:analyze', 'loan:submit', 'loan:approve'))
    );
$function$;

CREATE FUNCTION integration.guard_notification_scope() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $function$
BEGIN
    -- Ngoại lệ có chủ đích: báo sớm Tuân thủ (F8) gửi cho người chưa được giao hồ sơ; nội dung chỉ gồm số hồ sơ,
    -- tên cờ và ghi chú của Thẩm định. Người nhận chưa mở được hồ sơ cho tới khi được giao bước Ý kiến Rủi ro.
    IF NEW.notification_type <> 'EARLY_WARNING_COMPLIANCE'
       AND NEW.resource_type = 'LOAN_APPLICATION' AND NEW.resource_id IS NOT NULL
       AND NOT integration.employee_can_read_loan(NEW.employee_id, NEW.resource_id) THEN
        RETURN NULL;  -- người nhận ngoài phạm vi đọc: không ghi thông báo
    END IF;
    RETURN NEW;
END
$function$;
CREATE TRIGGER trg_notification_scope_guard BEFORE INSERT ON integration.notification
FOR EACH ROW EXECUTE FUNCTION integration.guard_notification_scope();
