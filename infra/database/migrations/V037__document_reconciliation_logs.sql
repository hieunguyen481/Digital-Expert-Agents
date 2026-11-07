-- Trang 05 "Doi chieu tai lieu" (lat 9): nhat ky chot nguon mau thuan va nhat ky kiem tra danh muc.
-- Hai bang chi duoc them, khong sua, khong xoa (trigger + khong cap UPDATE/DELETE cho bank_app).
-- Cot *_id tro toi field_conflict / loan_checklist_item KHONG co khoa ngoai: seed nap lai co the
-- xoa hang goc, con nhat ky thi phai giu nguyen.

CREATE TABLE document.field_conflict_log (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    conflict_id UUID NOT NULL,
    conflict_code TEXT NOT NULL,
    actor_id UUID NOT NULL REFERENCES identity.employee(id),
    old_field_id UUID NULL,
    old_value_text TEXT NULL,
    new_field_id UUID NOT NULL,
    new_value_text TEXT NULL,
    candidates JSONB NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_field_conflict_log_reason CHECK (char_length(btrim(reason)) >= 5)
);
CREATE INDEX idx_field_conflict_log_loan ON document.field_conflict_log(loan_application_id, created_at);

CREATE TABLE credit.checklist_check_log (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    checklist_item_id UUID NOT NULL,
    requirement_code CITEXT NOT NULL,
    actor_id UUID NOT NULL REFERENCES identity.employee(id),
    result VARCHAR(10) NOT NULL,
    old_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_checklist_check_log_result CHECK (result IN ('PASS', 'FAIL')),
    CONSTRAINT ck_checklist_check_log_note CHECK (
        result = 'PASS' OR (note IS NOT NULL AND char_length(btrim(note)) >= 5)
    )
);
CREATE INDEX idx_checklist_check_log_item ON credit.checklist_check_log(checklist_item_id, created_at);
CREATE INDEX idx_checklist_check_log_loan ON credit.checklist_check_log(loan_application_id, created_at);

CREATE FUNCTION audit.reject_log_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION 'Bang % chi duoc them, khong sua hoac xoa', TG_TABLE_NAME
        USING ERRCODE = 'insufficient_privilege';
END;
$function$;

CREATE TRIGGER trg_field_conflict_log_append_only
    BEFORE UPDATE OR DELETE ON document.field_conflict_log
    FOR EACH ROW EXECUTE FUNCTION audit.reject_log_change();
CREATE TRIGGER trg_field_conflict_log_no_truncate
    BEFORE TRUNCATE ON document.field_conflict_log
    FOR EACH STATEMENT EXECUTE FUNCTION audit.reject_log_change();
CREATE TRIGGER trg_checklist_check_log_append_only
    BEFORE UPDATE OR DELETE ON credit.checklist_check_log
    FOR EACH ROW EXECUTE FUNCTION audit.reject_log_change();
CREATE TRIGGER trg_checklist_check_log_no_truncate
    BEFORE TRUNCATE ON credit.checklist_check_log
    FOR EACH STATEMENT EXECUTE FUNCTION audit.reject_log_change();

GRANT SELECT, INSERT ON document.field_conflict_log TO bank_app;
GRANT SELECT, INSERT ON credit.checklist_check_log TO bank_app;
REVOKE UPDATE, DELETE, TRUNCATE ON document.field_conflict_log FROM bank_app;
REVOKE UPDATE, DELETE, TRUNCATE ON credit.checklist_check_log FROM bank_app;

ALTER TABLE document.field_conflict_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.checklist_check_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY field_conflict_log_select_policy ON document.field_conflict_log
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY field_conflict_log_insert_policy ON document.field_conflict_log
FOR INSERT TO bank_app
WITH CHECK (
    actor_id = identity.current_employee_id()
    AND identity.can_write_loan(identity.current_employee_id(), loan_application_id)
);

CREATE POLICY checklist_check_log_select_policy ON credit.checklist_check_log
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY checklist_check_log_insert_policy ON credit.checklist_check_log
FOR INSERT TO bank_app
WITH CHECK (
    actor_id = identity.current_employee_id()
    AND identity.can_write_loan(identity.current_employee_id(), loan_application_id)
);

COMMENT ON TABLE document.field_conflict_log IS
    'Append-only log of every source choice for a field conflict (page 05): who, when, old and new value, reason.';
COMMENT ON TABLE credit.checklist_check_log IS
    'Append-only log of document checklist results recorded by Document Review (page 05).';
