-- Trang 04, lat 5: noi dung nhap de xuat vay ma loan_application khong co cot (muc dich, nguon tra no, co TSBD).
-- Version nhap dung chung credit.loan_application.version (phat hien xung dot 2 tab).
CREATE TABLE credit.loan_draft (
    loan_application_id UUID PRIMARY KEY REFERENCES credit.loan_application(id),
    purpose_text TEXT NULL,
    repayment_source_text TEXT NULL,
    secured BOOLEAN NOT NULL DEFAULT TRUE,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    saved_by UUID NOT NULL REFERENCES identity.employee(id)
);

GRANT SELECT, INSERT, UPDATE ON credit.loan_draft TO bank_app;
ALTER TABLE credit.loan_draft ENABLE ROW LEVEL SECURITY;

CREATE POLICY loan_draft_select_policy ON credit.loan_draft
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY loan_draft_insert_policy ON credit.loan_draft
FOR INSERT TO bank_app
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY loan_draft_update_policy ON credit.loan_draft
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));

COMMENT ON TABLE credit.loan_draft IS
    'Free-text part of a loan proposal draft (page 04); typed fields live on credit.loan_application.';
