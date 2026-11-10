-- V049: hanh dong ghi co kiem soat cua doi agent. Agent chi DE XUAT (agent.action_proposal); nguoi co tham quyen
-- xac nhan thi gateway goi API nghiep vu bang JWT cua chinh nguoi bam. Dieu kien truoc giai ngan duoc luu o
-- credit.pre_disbursement_condition (chi them, khong sua).
CREATE TABLE agent.action_proposal (
    id UUID PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES agent.case_run(case_id),
    kind VARCHAR(40) NOT NULL,
    title TEXT NOT NULL,
    rationale TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_agent VARCHAR(40) NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'PROPOSED',
    decided_by UUID NULL,
    decided_reason TEXT NULL,
    decided_at DOUBLE PRECISION NULL,
    result JSONB NULL,
    created_at DOUBLE PRECISION NOT NULL,
    CONSTRAINT ck_action_proposal_kind CHECK (kind IN ('add_risk_flag', 'request_documents', 'add_disbursement_condition')),
    CONSTRAINT ck_action_proposal_status CHECK (status IN ('PROPOSED', 'CONFIRMED', 'DISMISSED')),
    CONSTRAINT ck_action_proposal_decision CHECK (
        status = 'PROPOSED' OR (decided_by IS NOT NULL AND length(btrim(decided_reason)) > 0)
    )
);
CREATE INDEX ix_action_proposal_case ON agent.action_proposal(case_id, created_at);
ALTER TABLE agent.action_proposal ENABLE ROW LEVEL SECURITY;
CREATE POLICY action_proposal_policy ON agent.action_proposal TO bank_engine
    USING (EXISTS (SELECT 1 FROM agent.case_run r WHERE r.case_id = action_proposal.case_id))
    WITH CHECK (EXISTS (SELECT 1 FROM agent.case_run r WHERE r.case_id = action_proposal.case_id));
GRANT SELECT, INSERT, UPDATE ON agent.action_proposal TO bank_engine;
REVOKE DELETE, TRUNCATE ON agent.action_proposal FROM bank_engine;

CREATE TABLE credit.pre_disbursement_condition (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    condition_text TEXT NOT NULL,
    source TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES identity.employee(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_pre_disbursement_condition_text CHECK (length(btrim(condition_text)) > 0),
    CONSTRAINT uq_pre_disbursement_condition_source UNIQUE (loan_application_id, source)
);
GRANT SELECT, INSERT ON credit.pre_disbursement_condition TO bank_app;
REVOKE UPDATE, DELETE, TRUNCATE ON credit.pre_disbursement_condition FROM bank_app;
ALTER TABLE credit.pre_disbursement_condition ENABLE ROW LEVEL SECURITY;
CREATE POLICY pre_disbursement_condition_select_policy ON credit.pre_disbursement_condition
FOR SELECT TO bank_app
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY pre_disbursement_condition_insert_policy ON credit.pre_disbursement_condition
FOR INSERT TO bank_app
WITH CHECK (
    created_by = identity.current_employee_id()
    AND identity.can_write_loan(identity.current_employee_id(), loan_application_id)
);
COMMENT ON TABLE credit.pre_disbursement_condition IS 'Conditions to satisfy before disbursement; added by a person confirming an agent proposal. Append-only, RLS by loan access.';
