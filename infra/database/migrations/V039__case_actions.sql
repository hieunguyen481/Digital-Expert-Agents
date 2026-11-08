-- Lat 11: hanh dong tren ho so 02b. Y kien Rui ro/Tuan thu (Q-N), nhat ky cap phe duyet (Q4, F10), bao som Tuan thu (F8).
-- Bang moi co RLS ngay tu dau; chi duoc them, khong sua (bank_app khong co UPDATE/DELETE).

-- 1. Y kien Rui ro: 2 y kien con (RISK, COMPLIANCE), moi loai 1 y kien cho moi ban To trinh da chot.
CREATE TABLE credit.risk_opinion (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    kind VARCHAR(10) NOT NULL,
    -- Ban To trinh da chot ma y kien nay danh gia; tra ve Tham dinh roi trinh lai thi can y kien moi.
    memo_revision INTEGER NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES identity.employee(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_risk_opinion_kind CHECK (kind IN ('RISK', 'COMPLIANCE')),
    CONSTRAINT ck_risk_opinion_content CHECK (length(btrim(content)) > 0),
    CONSTRAINT uq_risk_opinion_round UNIQUE (loan_application_id, kind, memo_revision)
);

-- 2. Nhat ky cap phe duyet theo hoc so: cap luc gui (SUBMIT) va cac lan Nang cap phe duyet (UPGRADE).
CREATE TABLE credit.approval_tier_event (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    tier SMALLINT NOT NULL,
    kind VARCHAR(10) NOT NULL,
    reason TEXT NULL,
    created_by UUID NOT NULL REFERENCES identity.employee(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_approval_tier_event_tier CHECK (tier IN (1, 2, 3)),
    CONSTRAINT ck_approval_tier_event_kind CHECK (kind IN ('SUBMIT', 'UPGRADE')),
    CONSTRAINT ck_approval_tier_event_reason CHECK (
        kind = 'SUBMIT' OR (reason IS NOT NULL AND length(btrim(reason)) > 0)
    )
);
CREATE INDEX idx_approval_tier_event_loan ON credit.approval_tier_event(loan_application_id, created_at);

GRANT SELECT, INSERT ON credit.risk_opinion, credit.approval_tier_event TO bank_app;
REVOKE UPDATE, DELETE, TRUNCATE ON credit.risk_opinion, credit.approval_tier_event FROM bank_app;

ALTER TABLE credit.risk_opinion ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.approval_tier_event ENABLE ROW LEVEL SECURITY;

-- Q-M: noi dung y kien Tuan thu (AML/gian lan) chi nhom Rui ro, Tham dinh, Phe duyet va Kiem toan doc; QHKH, HTTD thi khong.
CREATE POLICY risk_opinion_select_policy ON credit.risk_opinion
FOR SELECT TO bank_app
USING (
    identity.can_read_loan(identity.current_employee_id(), loan_application_id)
    AND (
        kind = 'RISK'
        OR identity.current_has_role('compliance_officer'::public.citext)
        OR identity.current_has_role('risk_officer'::public.citext)
        OR identity.current_has_role('credit_appraiser'::public.citext)
        OR identity.current_has_role('loan_approver'::public.citext)
        OR identity.current_has_role('auditor'::public.citext)
    )
);
CREATE POLICY risk_opinion_insert_policy ON credit.risk_opinion
FOR INSERT TO bank_app
WITH CHECK (
    author_id = identity.current_employee_id()
    AND identity.can_access_loan(identity.current_employee_id(), loan_application_id)
    AND EXISTS (
        SELECT 1 FROM credit.loan_application AS loan
        WHERE loan.id = loan_application_id AND loan.status = 'RISK_REVIEW'
    )
    AND (
        (kind = 'RISK' AND identity.current_has_role('risk_officer'::public.citext))
        OR (kind = 'COMPLIANCE' AND identity.current_has_role('compliance_officer'::public.citext))
    )
);

CREATE POLICY approval_tier_event_select_policy ON credit.approval_tier_event
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY approval_tier_event_insert_policy ON credit.approval_tier_event
FOR INSERT TO bank_app
WITH CHECK (
    created_by = identity.current_employee_id()
    AND identity.can_read_loan(identity.current_employee_id(), loan_application_id)
);

-- 3. Bao som Tuan thu (F8): chi la thong bao, khong doi buoc va khong doi trang thai co.
ALTER TABLE credit.case_flag
    ADD COLUMN early_warned_by UUID NULL REFERENCES identity.employee(id),
    ADD COLUMN early_warned_at TIMESTAMPTZ NULL,
    ADD COLUMN early_warning_note TEXT NULL;

-- Tham dinh (nguoi giu buoc APPRAISAL) bao co cickh cho mot Tuan thu: it viec nhat, khong bi tach bach (E8).
-- SECURITY DEFINER vi thong bao thuoc ve nguoi nhan, Tham dinh khong ghi duoc thong bao cua nguoi khac.
CREATE FUNCTION credit.early_warn_compliance(p_loan_id UUID, p_flag_id UUID, p_caller UUID, p_note TEXT)
RETURNS UUID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_recipient UUID;
    v_title TEXT;
    v_number TEXT;
BEGIN
    IF p_caller IS DISTINCT FROM identity.current_employee_id()
       OR NOT credit.has_active_role(p_caller, 'credit_appraiser')
       OR NOT identity.can_write_loan(p_caller, p_loan_id) THEN
        RAISE EXCEPTION 'Only the appraiser holding the case may send an early warning'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    SELECT flag.title, loan.application_number INTO v_title, v_number
    FROM credit.case_flag AS flag
    JOIN credit.loan_application AS loan ON loan.id = flag.loan_application_id
    WHERE flag.id = p_flag_id AND flag.loan_application_id = p_loan_id
      AND flag.code = 'cickh' AND flag.status = 'OPEN' AND loan.status = 'APPRAISAL';
    IF v_title IS NULL THEN
        RAISE EXCEPTION 'The flag is not an open cickh flag of a case in appraisal'
            USING ERRCODE = 'check_violation';
    END IF;
    SELECT candidate.id INTO v_recipient
    FROM (
        SELECT employee.id,
               (SELECT count(*) FROM credit.case_step AS open_step
                 WHERE open_step.assignee_employee_id = employee.id AND open_step.completed_at IS NULL) AS workload
        FROM identity.employee AS employee
        WHERE credit.has_active_role(employee.id, 'compliance_officer')
          AND NOT credit.is_excluded(employee.id, p_loan_id)
    ) AS candidate
    ORDER BY candidate.workload, candidate.id
    LIMIT 1;
    IF v_recipient IS NULL THEN
        RAISE EXCEPTION 'No eligible compliance officer' USING ERRCODE = '55000';
    END IF;
    INSERT INTO integration.notification (
        id, employee_id, notification_type, title, message, resource_type, resource_id, status, created_at
    )
    VALUES (
        gen_random_uuid(), v_recipient, 'EARLY_WARNING_COMPLIANCE',
        'Báo sớm Tuân thủ: ' || v_number,
        COALESCE(NULLIF(btrim(p_note), ''), 'Thẩm định báo sớm cờ bản CIC khách tự nộp.') || ' (' || v_title || ')',
        'LOAN_APPLICATION', p_loan_id, 'UNREAD', CURRENT_TIMESTAMP
    );
    UPDATE credit.case_flag
    SET early_warned_by = p_caller, early_warned_at = CURRENT_TIMESTAMP, early_warning_note = NULLIF(btrim(p_note), '')
    WHERE id = p_flag_id;
    RETURN v_recipient;
END
$function$;

REVOKE ALL ON FUNCTION credit.early_warn_compliance(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.early_warn_compliance(UUID, UUID, UUID, TEXT) TO bank_app;

-- Tuan thu ket luan co cickh (F8). SECURITY DEFINER vi Tuan thu chi co quyen doc ho so o buoc Y kien Rui ro,
-- khong co quyen ghi bang co; ham tu kiem vai tro, buoc va ma co.
CREATE FUNCTION credit.conclude_case_flag(
    p_loan_id UUID, p_flag_id UUID, p_caller UUID, p_conclusion TEXT, p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
    IF p_caller IS DISTINCT FROM identity.current_employee_id()
       OR NOT credit.has_active_role(p_caller, 'compliance_officer')
       OR NOT identity.can_read_loan(p_caller, p_loan_id) THEN
        RAISE EXCEPTION 'Only compliance with access to the case may conclude its flag'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_conclusion NOT IN ('SUSPECTED_FRAUD', 'INSUFFICIENT_BASIS', 'NO_ISSUE') OR btrim(COALESCE(p_reason, '')) = '' THEN
        RAISE EXCEPTION 'A conclusion and a reason are required' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE credit.case_flag AS flag
    SET status = 'CONCLUDED', compliance_conclusion = p_conclusion, compliance_reason = btrim(p_reason),
        updated_at = CURRENT_TIMESTAMP
    FROM credit.loan_application AS loan
    WHERE flag.id = p_flag_id AND flag.loan_application_id = p_loan_id AND flag.code = 'cickh'
      AND flag.status <> 'CONCLUDED' AND loan.id = flag.loan_application_id AND loan.status = 'RISK_REVIEW';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'The flag cannot be concluded' USING ERRCODE = 'check_violation';
    END IF;
END
$function$;

REVOKE ALL ON FUNCTION credit.conclude_case_flag(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.conclude_case_flag(UUID, UUID, UUID, TEXT, TEXT) TO bank_app;

COMMENT ON TABLE credit.risk_opinion IS 'Y kien Rui ro va Tuan thu theo ban To trinh da chot (Q-N); chi them.';
COMMENT ON TABLE credit.approval_tier_event IS 'Cap phe duyet luc gui va cac lan Nang cap phe duyet (Q4, F10); chi them.';
COMMENT ON FUNCTION credit.early_warn_compliance(UUID, UUID, UUID, TEXT) IS
    'Bao som Tuan thu cho co cickh (F8): gui thong bao, khong doi buoc.';
