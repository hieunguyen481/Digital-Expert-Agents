-- Lat 10b: To trinh tham dinh (Q-L). 7 muc, tu luu co version, noi dung AI chen phai duoc nguoi xac nhan.
-- appraisal_memo: ban nhap lam viec (1 dong / ho so). appraisal_memo_version: ban da chot khi trinh Rui ro,
-- chi duoc them (trigger + khong cap UPDATE/DELETE cho bank_app).

CREATE TABLE credit.appraisal_memo (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL UNIQUE REFERENCES credit.loan_application(id),
    -- So hieu ban to trinh dang soan (tang khi tra lai tao ban moi).
    revision INTEGER NOT NULL DEFAULT 1,
    state VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
    -- {"1": {"body": "...", "ai_blocks": [{id,text,state,source,created_by,created_at,decided_by,decided_at}]}, ...}
    sections JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Khoa lac quan cho tu luu.
    version INTEGER NOT NULL DEFAULT 1,
    updated_by UUID NOT NULL REFERENCES identity.employee(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_appraisal_memo_state CHECK (state IN ('DRAFT', 'FINALIZED')),
    CONSTRAINT ck_appraisal_memo_revision CHECK (revision > 0),
    CONSTRAINT ck_appraisal_memo_version CHECK (version > 0)
);

CREATE TABLE credit.appraisal_memo_version (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    revision INTEGER NOT NULL,
    -- Chi gom noi dung nguoi viet va khoi AI da xac nhan.
    content JSONB NOT NULL,
    finalized_by UUID NOT NULL REFERENCES identity.employee(id),
    finalized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_appraisal_memo_version UNIQUE (loan_application_id, revision)
);

CREATE TRIGGER trg_appraisal_memo_version_append_only
    BEFORE UPDATE OR DELETE ON credit.appraisal_memo_version
    FOR EACH ROW EXECUTE FUNCTION audit.reject_log_change();
CREATE TRIGGER trg_appraisal_memo_version_no_truncate
    BEFORE TRUNCATE ON credit.appraisal_memo_version
    FOR EACH STATEMENT EXECUTE FUNCTION audit.reject_log_change();

GRANT SELECT, INSERT, UPDATE ON credit.appraisal_memo TO bank_app;
GRANT SELECT, INSERT ON credit.appraisal_memo_version TO bank_app;
REVOKE DELETE, TRUNCATE ON credit.appraisal_memo FROM bank_app;
REVOKE UPDATE, DELETE, TRUNCATE ON credit.appraisal_memo_version FROM bank_app;

ALTER TABLE credit.appraisal_memo ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.appraisal_memo_version ENABLE ROW LEVEL SECURITY;

-- Ban nhap: chi nguoi dang giu buoc (ghi duoc ho so) moi doc va sua. Ban da chot moi la thu nguoi khac doc.
CREATE POLICY appraisal_memo_select_policy ON credit.appraisal_memo
FOR SELECT TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY appraisal_memo_insert_policy ON credit.appraisal_memo
FOR INSERT TO bank_app
WITH CHECK (
    updated_by = identity.current_employee_id()
    AND identity.can_write_loan(identity.current_employee_id(), loan_application_id)
);
CREATE POLICY appraisal_memo_update_policy ON credit.appraisal_memo
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (
    updated_by = identity.current_employee_id()
    AND identity.can_write_loan(identity.current_employee_id(), loan_application_id)
);

CREATE POLICY appraisal_memo_version_select_policy ON credit.appraisal_memo_version
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY appraisal_memo_version_insert_policy ON credit.appraisal_memo_version
FOR INSERT TO bank_app
WITH CHECK (
    finalized_by = identity.current_employee_id()
    AND identity.can_write_loan(identity.current_employee_id(), loan_application_id)
);

-- Tra lai ve Tham dinh: mo ban nhap moi (revision + 1) tu ban da chot gan nhat. Nguoi tra lai (Rui ro, cap phe duyet)
-- khong ghi duoc ban nhap nen can SECURITY DEFINER; chi hoat dong khi ho so da that su ve APPRAISAL.
CREATE FUNCTION credit.reopen_appraisal_memo(p_loan_id UUID, p_actor UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_revision INTEGER;
BEGIN
    IF p_actor IS DISTINCT FROM identity.current_employee_id() THEN
        RAISE EXCEPTION 'Actor khong khop nguoi dang nhap' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM credit.loan_application AS loan
        WHERE loan.id = p_loan_id AND loan.status = 'APPRAISAL'
    ) THEN
        RAISE EXCEPTION 'Ho so khong o buoc Tham dinh' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE credit.appraisal_memo AS memo
    SET revision = memo.revision + 1,
        state = 'DRAFT',
        sections = COALESCE((
            SELECT snap.content
            FROM credit.appraisal_memo_version AS snap
            WHERE snap.loan_application_id = memo.loan_application_id
            ORDER BY snap.revision DESC LIMIT 1
        ), memo.sections),
        version = memo.version + 1,
        updated_by = p_actor,
        updated_at = CURRENT_TIMESTAMP
    WHERE memo.loan_application_id = p_loan_id AND memo.state = 'FINALIZED'
    RETURNING memo.revision INTO v_revision;
    RETURN v_revision;
END;
$function$;
REVOKE ALL ON FUNCTION credit.reopen_appraisal_memo(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.reopen_appraisal_memo(UUID, UUID) TO bank_app;

COMMENT ON TABLE credit.appraisal_memo IS
    'Working draft of the appraisal memo (7 sections) with optimistic-lock version; AI blocks stay PENDING until a person confirms.';
COMMENT ON TABLE credit.appraisal_memo_version IS
    'Append-only memo versions frozen when the case is submitted to Risk; Risk and approvers read exactly this.';
