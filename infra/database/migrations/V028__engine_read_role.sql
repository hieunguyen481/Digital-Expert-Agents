-- V028: vai tro doc rieng cho agent engine (MCP core-banking) + audit MCP ben vung.
-- Chi them, khong sua du lieu. bank_engine KHONG co BYPASSRLS, khong dang nhap truc tiep:
-- engine ket noi bang bank_app (la thanh vien) roi SET LOCAL ROLE bank_engine trong tung giao dich.
-- Vai tro bank_engine duoc tao boi infra/database/bootstrap/create-roles.sh (superuser).

GRANT USAGE ON SCHEMA identity, customer, credit, banking, document, audit TO bank_engine;
GRANT SELECT ON
    customer.customer, customer.party, customer.organization_profile, customer.person_profile, customer.kyc_assessment,
    credit.collateral, credit.collateral_valuation, credit.existing_obligation,
    banking.credit_report, banking.credit_facility,
    banking.account, banking.account_holder, banking.account_monthly_summary,
    document.document, document.document_version, document.extracted_field, document.document_link
TO bank_engine;
GRANT EXECUTE ON FUNCTION
    identity.current_employee_id(), identity.can_read_customer(UUID, UUID),
    identity.can_read_loan(UUID, UUID)
TO bank_engine;

-- Policy RLS hien gioi han theo vai tro (bank_app, bank_worker): them bank_engine vao cac
-- policy SELECT can thiet; dieu kien (can_read_customer ...) giu nguyen.
ALTER POLICY customer_select_policy ON customer.customer TO bank_app, bank_worker, bank_engine;
ALTER POLICY account_select_policy ON banking.account TO bank_app, bank_worker, bank_engine;
ALTER POLICY document_select_policy ON document.document TO bank_app, bank_worker, bank_engine;
ALTER POLICY document_version_select_policy ON document.document_version TO bank_app, bank_worker, bank_engine;
ALTER POLICY extracted_field_select_policy ON document.extracted_field TO bank_app, bank_worker, bank_engine;
ALTER POLICY document_link_select_policy ON document.document_link TO bank_app, bank_engine;

-- Audit MCP: moi loi goi tool. Khong luu PII hay key: chi ten tool, ma nhan vien,
-- khoa tham so (khong luu gia tri), ket qua. Chi INSERT/SELECT, khong UPDATE/DELETE.
CREATE TABLE audit.engine_mcp_call (
    id BIGSERIAL PRIMARY KEY,
    called_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tool VARCHAR(60) NOT NULL,
    employee_id UUID NULL,
    customer_id UUID NULL,
    arg_keys TEXT[] NOT NULL DEFAULT '{}',
    outcome VARCHAR(20) NOT NULL,
    detail TEXT NULL
);
GRANT SELECT, INSERT ON audit.engine_mcp_call TO bank_engine;
GRANT USAGE ON SEQUENCE audit.engine_mcp_call_id_seq TO bank_engine;
COMMENT ON TABLE audit.engine_mcp_call IS 'Append-only MCP tool-call audit of agent engine; no PII, no arguments values.';
