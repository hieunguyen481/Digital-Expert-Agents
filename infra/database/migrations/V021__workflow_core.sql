-- V021: lõi quy trình thẩm định SME đợt 1 (thiết kế §5–7, rules.md).
-- Trạng thái hồ sơ mới, lịch sử từng bước, tham số SLA, ngày nghỉ, cấp phê
-- duyệt có phiên bản, thẩm quyền nhân viên, ngoại lệ, cờ, lịch sử QHKH,
-- quyết định chỉ được thêm và cờ "nhạy cảm tới khi đóng phiên" cho nhật ký.
-- RLS của các bảng hồ sơ ở đây là TẠM: dùng identity.can_access_loan; Task 6
-- (V023) thay bằng can_read_loan/can_write_loan theo bước. Không có nhánh
-- quản trị (Q-J, V020).

-- ---------------------------------------------------------------------------
-- 1. Trạng thái hồ sơ
-- ---------------------------------------------------------------------------
ALTER TABLE credit.loan_application
    DROP CONSTRAINT ck_loan_application_status;

UPDATE credit.loan_application
SET status = CASE status
        WHEN 'DOCUMENT_COLLECTION' THEN 'CHECKING'
        WHEN 'UNDER_ANALYSIS' THEN 'APPRAISAL'
        WHEN 'NEEDS_INFORMATION' THEN 'APPRAISAL_PENDING_INFO'
        WHEN 'READY_FOR_REVIEW' THEN 'APPRAISAL'
        WHEN 'SUBMITTED_FOR_APPROVAL' THEN 'APPROVAL'
    END
WHERE status IN (
    'DOCUMENT_COLLECTION', 'UNDER_ANALYSIS', 'NEEDS_INFORMATION',
    'READY_FOR_REVIEW', 'SUBMITTED_FOR_APPROVAL'
);

ALTER TABLE credit.loan_application
    ADD CONSTRAINT ck_loan_application_status CHECK (
        status IN (
            'DRAFT', 'CHECKING', 'RETURNED_TO_RM', 'APPRAISAL',
            'APPRAISAL_PENDING_INFO', 'RISK_REVIEW', 'RISK_PENDING_INFO',
            'RISK_HOLD_FRAUD', 'APPROVAL', 'COUNCIL_SESSION', 'APPROVED',
            'APPROVED_WITH_CONDITIONS', 'REJECTED', 'WITHDRAWN'
        )
    ),
    ADD COLUMN approval_tier SMALLINT NULL,
    ADD COLUMN withdraw_reason TEXT NULL,
    ADD CONSTRAINT ck_loan_application_approval_tier CHECK (
        approval_tier IS NULL OR approval_tier IN (1, 2, 3)
    );

-- ---------------------------------------------------------------------------
-- 2. Bước xử lý (case_step)
-- ---------------------------------------------------------------------------
CREATE TABLE credit.case_step (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    step_code VARCHAR(30) NOT NULL,
    assignee_employee_id UUID NULL REFERENCES identity.employee(id),
    received_at TIMESTAMPTZ NOT NULL,
    due_at TIMESTAMPTZ NULL,
    paused_at TIMESTAMPTZ NULL,
    remaining_workdays INTEGER NULL,
    resumed_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    result VARCHAR(30) NULL,
    reason TEXT NULL,
    created_by UUID NOT NULL REFERENCES identity.employee(id),
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_case_step_code CHECK (
        step_code IN (
            'RM_DRAFT', 'CHECKING', 'RM_REWORK', 'APPRAISAL', 'PENDING_INFO',
            'RISK_REVIEW', 'RISK_PENDING_INFO', 'FRAUD_HOLD', 'APPROVAL',
            'COUNCIL_SESSION'
        )
    )
);

CREATE INDEX idx_case_step_application
    ON credit.case_step(loan_application_id, completed_at);

-- Mỗi hồ sơ chỉ một bước chính đang mở. Bước chờ bổ sung (PENDING_INFO,
-- RISK_PENDING_INFO) chạy song song với bước chính đang tạm dừng SLA.
CREATE UNIQUE INDEX uq_case_step_one_open
    ON credit.case_step(loan_application_id)
    WHERE completed_at IS NULL
      AND step_code NOT IN ('PENDING_INFO', 'RISK_PENDING_INFO');

CREATE INDEX idx_case_step_assignee_open
    ON credit.case_step(assignee_employee_id)
    WHERE completed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Tham số SLA, ngày nghỉ, cấp phê duyệt, thẩm quyền nhân viên
-- ---------------------------------------------------------------------------
CREATE TABLE credit.sla_parameter (
    step_code VARCHAR(30) PRIMARY KEY,
    workdays INTEGER NOT NULL,
    CONSTRAINT ck_sla_parameter_workdays CHECK (workdays > 0)
);

-- Policy §2.3 (BANK.SLA) và Q11 (BANK.SLA.bosung_khach).
INSERT INTO credit.sla_parameter (step_code, workdays)
VALUES
    ('CHECKING', 2),
    ('APPRAISAL', 5),
    ('RISK_REVIEW', 3),
    ('APPROVAL', 2),
    ('CUSTOMER_SUPPLEMENT', 5);

CREATE TABLE credit.holiday (
    day DATE PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE credit.authority_tier (
    version INTEGER NOT NULL,
    tier SMALLINT NOT NULL,
    max_total_vnd NUMERIC(24,4) NULL,
    valid_from DATE NOT NULL,
    PRIMARY KEY (version, tier),
    CONSTRAINT ck_authority_tier_version CHECK (version > 0),
    CONSTRAINT ck_authority_tier_tier CHECK (tier IN (1, 2, 3)),
    CONSTRAINT ck_authority_tier_max CHECK (max_total_vnd IS NULL OR max_total_vnd > 0)
);

-- Q4: ≤ 20 tỷ / 20–100 tỷ / > 100 tỷ (NULL = không giới hạn trên).
INSERT INTO credit.authority_tier (version, tier, max_total_vnd, valid_from)
VALUES
    (1, 1, 20000000000.0000, DATE '2026-01-01'),
    (1, 2, 100000000000.0000, DATE '2026-01-01'),
    (1, 3, NULL, DATE '2026-01-01');

-- Seed thẩm quyền ở Task 4 (R__seed_roles_permissions / reference data).
CREATE TABLE identity.employee_authority (
    employee_id UUID NOT NULL REFERENCES identity.employee(id),
    tier SMALLINT NOT NULL,
    unit_scope VARCHAR(10) NOT NULL,
    branch_id UUID NULL REFERENCES identity.branch(id),
    valid_from DATE NOT NULL,
    valid_until DATE NULL,
    PRIMARY KEY (employee_id, valid_from),
    CONSTRAINT ck_employee_authority_tier CHECK (tier IN (1, 2, 3)),
    CONSTRAINT ck_employee_authority_scope CHECK (unit_scope IN ('BRANCH', 'HO')),
    CONSTRAINT ck_employee_authority_branch CHECK (
        unit_scope <> 'BRANCH' OR branch_id IS NOT NULL
    ),
    CONSTRAINT ck_employee_authority_period CHECK (
        valid_until IS NULL OR valid_until >= valid_from
    )
);

-- ---------------------------------------------------------------------------
-- 4. Ngoại lệ và cờ theo hồ sơ
-- ---------------------------------------------------------------------------
CREATE TABLE credit.case_exception (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    checklist_code TEXT NULL,
    kind VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    proposed_by UUID NOT NULL REFERENCES identity.employee(id),
    proposed_at TIMESTAMPTZ NOT NULL,
    decision VARCHAR(10) NULL,
    decided_by UUID NULL REFERENCES identity.employee(id),
    decided_at TIMESTAMPTZ NULL,
    CONSTRAINT ck_case_exception_kind CHECK (kind IN ('DOCUMENT', 'POLICY')),
    CONSTRAINT ck_case_exception_decision CHECK (
        decision IS NULL OR decision IN ('ACCEPTED', 'REJECTED')
    ),
    CONSTRAINT ck_case_exception_decided CHECK (
        decision IS NULL OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)
    )
);

CREATE INDEX idx_case_exception_application
    ON credit.case_exception(loan_application_id);

CREATE TABLE credit.case_flag (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    code TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL,
    title TEXT NOT NULL,
    blocks_submission BOOLEAN NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    handling_note TEXT NULL,
    compliance_conclusion VARCHAR(30) NULL,
    compliance_reason TEXT NULL,
    source TEXT NOT NULL,
    -- NULL khi cờ do hệ thống/AI tạo (nguồn ghi ở cột source).
    created_by UUID NULL REFERENCES identity.employee(id),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_case_flag_severity CHECK (severity IN ('HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT ck_case_flag_status CHECK (
        status IN ('OPEN', 'HANDLED', 'FORWARDED_COMPLIANCE', 'CONCLUDED')
    ),
    CONSTRAINT ck_case_flag_compliance_conclusion CHECK (
        compliance_conclusion IS NULL
        OR compliance_conclusion IN ('SUSPECTED_FRAUD', 'INSUFFICIENT_BASIS', 'NO_ISSUE')
    ),
    CONSTRAINT ck_case_flag_high_handled_note CHECK (
        severity <> 'HIGH' OR status <> 'HANDLED' OR handling_note IS NOT NULL
    ),
    CONSTRAINT ck_case_flag_compliance_reason CHECK (
        compliance_conclusion IS NULL OR compliance_reason IS NOT NULL
    )
);

CREATE INDEX idx_case_flag_application
    ON credit.case_flag(loan_application_id, status);

-- ---------------------------------------------------------------------------
-- 5. Lịch sử QHKH (E8: cựu QHKH trong 2 năm bị loại khỏi phê duyệt)
-- ---------------------------------------------------------------------------
CREATE TABLE customer.relationship_manager_history (
    customer_id UUID NOT NULL REFERENCES customer.customer(id),
    employee_id UUID NOT NULL REFERENCES identity.employee(id),
    valid_from DATE NOT NULL,
    valid_until DATE NULL,
    PRIMARY KEY (customer_id, employee_id, valid_from),
    CONSTRAINT ck_relationship_manager_history_period CHECK (
        valid_until IS NULL OR valid_until >= valid_from
    )
);

CREATE INDEX idx_relationship_manager_history_employee
    ON customer.relationship_manager_history(employee_id);

-- ---------------------------------------------------------------------------
-- 6. Quyết định: nguồn (cá nhân / Hội đồng), loại mới, chỉ được thêm
-- ---------------------------------------------------------------------------
ALTER TABLE credit.loan_decision
    ADD COLUMN decision_source VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    ADD COLUMN council_session_id UUID NULL,
    ALTER COLUMN decision_maker_id DROP NOT NULL,
    ADD CONSTRAINT ck_loan_decision_source CHECK (
        decision_source IN ('INDIVIDUAL', 'COUNCIL')
    ),
    ADD CONSTRAINT ck_loan_decision_type CHECK (
        decision_type IN (
            'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED',
            'RETURN_FOR_SUPPLEMENT'
        )
    ),
    ADD CONSTRAINT ck_loan_decision_maker CHECK (
        decision_source = 'COUNCIL' OR decision_maker_id IS NOT NULL
    );

DROP POLICY loan_decision_update_policy ON credit.loan_decision;
REVOKE UPDATE, DELETE, TRUNCATE ON credit.loan_decision FROM bank_app;

CREATE FUNCTION credit.reject_loan_decision_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
    RAISE EXCEPTION 'credit.loan_decision is append-only; % is not permitted', TG_OP
        USING ERRCODE = '42501';
END
$function$;

REVOKE ALL ON FUNCTION credit.reject_loan_decision_mutation() FROM PUBLIC;

CREATE TRIGGER trg_loan_decision_append_only
BEFORE UPDATE OR DELETE ON credit.loan_decision
FOR EACH ROW
EXECUTE FUNCTION credit.reject_loan_decision_mutation();

-- ---------------------------------------------------------------------------
-- 7. Nhật ký: nhạy cảm tới khi đóng phiên Hội đồng (chuẩn bị Q-I)
-- ---------------------------------------------------------------------------
ALTER TABLE audit.audit_event
    ADD COLUMN sensitive_until_closed BOOLEAN NOT NULL DEFAULT FALSE;

-- GIỮ quyền UPDATE trên audit.audit_event mà V018 cấp cho bank_app/bank_worker.
-- audit_repository.append vẫn chạy "SELECT event_hash ... LIMIT 1 FOR UPDATE"
-- để đọc mắt xích cuối (ngoài pg_advisory_xact_lock); PostgreSQL bắt buộc quyền
-- UPDATE cho mọi mệnh đề FOR UPDATE, nên thu lại sẽ làm mọi lần ghi nhật ký lỗi
-- 42501. Nội dung vẫn không sửa được nhờ trg_audit_event_append_only (V012).

-- ---------------------------------------------------------------------------
-- 8. Quyền và RLS cho bảng mới
-- ---------------------------------------------------------------------------
-- Theo mẫu V017: không vai trò runtime nào được DELETE; bank_readonly chỉ đọc view.
GRANT SELECT, INSERT, UPDATE ON credit.case_step, credit.case_exception,
    credit.case_flag
TO bank_app;
GRANT SELECT, INSERT, UPDATE ON customer.relationship_manager_history TO bank_app;
GRANT SELECT ON credit.sla_parameter, credit.holiday, credit.authority_tier,
    identity.employee_authority
TO bank_app;
GRANT SELECT ON credit.sla_parameter, credit.holiday, credit.authority_tier,
    identity.employee_authority
TO bank_worker;

ALTER TABLE credit.case_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.case_exception ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.case_flag ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.sla_parameter ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.holiday ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.authority_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.employee_authority ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer.relationship_manager_history ENABLE ROW LEVEL SECURITY;

-- Bảng tham chiếu: mọi nhân viên runtime đọc được (tính hạn, định tuyến cấp
-- phê duyệt); không có policy ghi, chỉ migration/seed thay đổi.
CREATE POLICY sla_parameter_select_policy ON credit.sla_parameter
FOR SELECT TO bank_app, bank_worker USING (TRUE);
CREATE POLICY holiday_select_policy ON credit.holiday
FOR SELECT TO bank_app, bank_worker USING (TRUE);
CREATE POLICY authority_tier_select_policy ON credit.authority_tier
FOR SELECT TO bank_app, bank_worker USING (TRUE);
CREATE POLICY employee_authority_select_policy ON identity.employee_authority
FOR SELECT TO bank_app, bank_worker USING (TRUE);

-- Bảng theo hồ sơ: TẠM dùng can_access_loan (V023 thay bằng hàm theo bước).
CREATE POLICY case_step_select_policy ON credit.case_step
FOR SELECT TO bank_app
USING (identity.can_access_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_step_insert_policy ON credit.case_step
FOR INSERT TO bank_app
WITH CHECK (identity.can_access_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_step_update_policy ON credit.case_step
FOR UPDATE TO bank_app
USING (identity.can_access_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_access_loan(identity.current_employee_id(), loan_application_id));

CREATE POLICY case_exception_select_policy ON credit.case_exception
FOR SELECT TO bank_app
USING (identity.can_access_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_exception_insert_policy ON credit.case_exception
FOR INSERT TO bank_app
WITH CHECK (identity.can_access_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_exception_update_policy ON credit.case_exception
FOR UPDATE TO bank_app
USING (identity.can_access_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_access_loan(identity.current_employee_id(), loan_application_id));

CREATE POLICY case_flag_select_policy ON credit.case_flag
FOR SELECT TO bank_app
USING (identity.can_access_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_flag_insert_policy ON credit.case_flag
FOR INSERT TO bank_app
WITH CHECK (identity.can_access_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY case_flag_update_policy ON credit.case_flag
FOR UPDATE TO bank_app
USING (identity.can_access_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_access_loan(identity.current_employee_id(), loan_application_id));

CREATE POLICY relationship_manager_history_select_policy
ON customer.relationship_manager_history
FOR SELECT TO bank_app
USING (identity.can_access_customer(identity.current_employee_id(), customer_id));
CREATE POLICY relationship_manager_history_insert_policy
ON customer.relationship_manager_history
FOR INSERT TO bank_app
WITH CHECK (identity.can_access_customer(identity.current_employee_id(), customer_id));
CREATE POLICY relationship_manager_history_update_policy
ON customer.relationship_manager_history
FOR UPDATE TO bank_app
USING (identity.can_access_customer(identity.current_employee_id(), customer_id))
WITH CHECK (identity.can_access_customer(identity.current_employee_id(), customer_id));

COMMENT ON TABLE credit.case_step IS
    'Per-step workflow history: assignee, received/due, SLA pause/resume, result and reason.';
COMMENT ON TABLE credit.sla_parameter IS 'SLA workdays per workflow step (policy §2.3).';
COMMENT ON TABLE credit.holiday IS 'Non-working days excluded from SLA workday counting.';
COMMENT ON TABLE credit.authority_tier IS
    'Versioned approval tiers by total credit exposure in VND; NULL max = unbounded.';
COMMENT ON TABLE identity.employee_authority IS
    'Approval authority tier of an employee, scoped to a branch or head office.';
COMMENT ON TABLE credit.case_exception IS 'Proposed document/policy exceptions and their decision.';
COMMENT ON TABLE credit.case_flag IS 'Case flags with lifecycle and compliance conclusion.';
COMMENT ON TABLE customer.relationship_manager_history IS
    'Relationship manager assignment history used for separation of duties (E8).';
COMMENT ON COLUMN audit.audit_event.sensitive_until_closed IS
    'Hidden from non-members until the related council session is closed (Q-I).';
