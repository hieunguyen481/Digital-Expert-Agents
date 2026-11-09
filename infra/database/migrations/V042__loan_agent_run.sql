-- Lien ket ho so vay voi cac luot chay doi agent (agent.case_run). Moi luot chay lai them mot dong, khong sua/xoa.
-- Doc theo quyen doc ho so; chi nguoi dang giu ho so (identity.can_write_loan) moi them duoc luot moi.
-- Khong co khoa ngoai toi agent.case_run vi bank_app khong doc duoc schema agent; case_id do engine cap.
CREATE TABLE credit.loan_agent_run (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    case_id TEXT NOT NULL UNIQUE,
    started_by UUID NOT NULL REFERENCES identity.employee(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_loan_agent_run_case_id CHECK (length(btrim(case_id)) > 0)
);
CREATE INDEX idx_loan_agent_run_loan ON credit.loan_agent_run(loan_application_id, created_at DESC);

GRANT SELECT, INSERT ON credit.loan_agent_run TO bank_app;
REVOKE UPDATE, DELETE, TRUNCATE ON credit.loan_agent_run FROM bank_app;

ALTER TABLE credit.loan_agent_run ENABLE ROW LEVEL SECURITY;
CREATE POLICY loan_agent_run_select_policy ON credit.loan_agent_run
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY loan_agent_run_insert_policy ON credit.loan_agent_run
FOR INSERT TO bank_app
WITH CHECK (
    started_by = identity.current_employee_id()
    AND identity.can_write_loan(identity.current_employee_id(), loan_application_id)
);
COMMENT ON TABLE credit.loan_agent_run IS 'Agent team runs started from a loan application; append-only, RLS by loan access.';
