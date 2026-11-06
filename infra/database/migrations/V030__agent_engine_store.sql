-- V030: luu tru ben vung cua gateway agent engine (thay SQLite): hoso phan tich, trace/su kien,
-- ke hoach planner, approval token, nhat ky hanh dong da thuc thi. RLS: chi nguoi nop hoac nguoi
-- doc duoc khach hang (identity.can_read_customer) moi thay; bang con di theo hoso cha.
CREATE SCHEMA IF NOT EXISTS agent;
GRANT USAGE ON SCHEMA agent TO bank_engine;

CREATE TABLE agent.case_run (
    case_id TEXT PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customer.customer(id),
    submitted_by UUID NOT NULL,
    state VARCHAR(30) NOT NULL DEFAULT 'Draft',
    payload JSONB NOT NULL,
    package JSONB NULL,
    approver UUID NULL,
    replan_count INTEGER NOT NULL DEFAULT 0,
    sla_deadline DOUBLE PRECISION NULL,
    created_at DOUBLE PRECISION NOT NULL,
    updated_at DOUBLE PRECISION NOT NULL
);
CREATE INDEX ix_case_run_customer ON agent.case_run(customer_id);

CREATE TABLE agent.case_event (
    id BIGSERIAL PRIMARY KEY,
    ts DOUBLE PRECISION NOT NULL,
    case_id TEXT NOT NULL REFERENCES agent.case_run(case_id),
    agent VARCHAR(40) NOT NULL,
    type VARCHAR(60) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_case_event_case ON agent.case_event(case_id, id);

CREATE TABLE agent.case_plan (
    case_id TEXT NOT NULL REFERENCES agent.case_run(case_id),
    version INTEGER NOT NULL,
    plan JSONB NOT NULL,
    ts DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (case_id, version)
);

CREATE TABLE agent.approval_token (
    token TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES agent.case_run(case_id),
    package_hash CHAR(64) NOT NULL,
    policy_version VARCHAR(40) NOT NULL,
    approver UUID NOT NULL,
    expires_at DOUBLE PRECISION NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE
);

-- Hanh dong that da thuc thi sau xac nhan cua nguoi co tham quyen (khong bao gio do agent tu chay).
CREATE TABLE agent.action_log (
    id BIGSERIAL PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES agent.case_run(case_id),
    action VARCHAR(40) NOT NULL,
    loan_application_id UUID NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    executed_by UUID NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at DOUBLE PRECISION NOT NULL
);

ALTER TABLE agent.case_run ENABLE ROW LEVEL SECURITY;
CREATE POLICY case_run_policy ON agent.case_run TO bank_engine
    USING (submitted_by = identity.current_employee_id()
           OR identity.can_read_customer(identity.current_employee_id(), customer_id))
    WITH CHECK (submitted_by = identity.current_employee_id()
           OR identity.can_read_customer(identity.current_employee_id(), customer_id));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['case_event','case_plan','approval_token','action_log'] LOOP
    EXECUTE format('ALTER TABLE agent.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I ON agent.%I TO bank_engine
        USING (EXISTS (SELECT 1 FROM agent.case_run r WHERE r.case_id = %I.case_id))
        WITH CHECK (EXISTS (SELECT 1 FROM agent.case_run r WHERE r.case_id = %I.case_id))$p$,
        t || '_policy', t, t, t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON agent.case_run, agent.case_plan, agent.approval_token TO bank_engine;
GRANT SELECT, INSERT ON agent.case_event, agent.action_log TO bank_engine;
GRANT USAGE ON SEQUENCE agent.case_event_id_seq, agent.action_log_id_seq TO bank_engine;

-- Bo canh SLA khong co nguoi dung: chi doc han phe duyet va ghi su kien he thong (khong doc noi dung).
CREATE FUNCTION agent.pending_approvals() RETURNS TABLE(case_id TEXT, sla_deadline DOUBLE PRECISION)
LANGUAGE sql SECURITY DEFINER SET search_path = agent, pg_temp AS
$$ SELECT case_id, sla_deadline FROM agent.case_run WHERE state = 'Pending Approval' $$;
CREATE FUNCTION agent.add_system_event(p_case_id TEXT, p_type TEXT, p_payload JSONB) RETURNS BIGINT
LANGUAGE sql SECURITY DEFINER SET search_path = agent, pg_temp AS
$$ INSERT INTO agent.case_event(ts, case_id, agent, type, payload)
   VALUES (extract(epoch FROM clock_timestamp()), p_case_id, 'sla', p_type, p_payload) RETURNING id $$;
REVOKE ALL ON FUNCTION agent.pending_approvals(), agent.add_system_event(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agent.pending_approvals(), agent.add_system_event(TEXT, TEXT, JSONB) TO bank_engine;

COMMENT ON SCHEMA agent IS 'Agent engine store: cases, trace events, plans, approval tokens, executed actions (RLS).';
