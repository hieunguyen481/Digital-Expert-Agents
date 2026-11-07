-- V034: banking.credit_report duoc ghi tu trang 04 (tra cuu CIC) nen bat RLS cung muc voi cic_consent.
-- Doc: nguoi doc duoc khach (bank_app, bank_worker, bank_engine nhu cac bang khach khac).
-- Ghi: chi nguoi co quan he voi khach (QHKH phu trach), cung dieu kien cic_consent.
ALTER TABLE banking.credit_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_report_select_policy
ON banking.credit_report
FOR SELECT
TO bank_app, bank_worker, bank_engine
USING (identity.can_read_customer(identity.current_employee_id(), customer_id));

CREATE POLICY credit_report_insert_policy
ON banking.credit_report
FOR INSERT
TO bank_app
WITH CHECK (identity.has_customer_relationship(identity.current_employee_id(), customer_id));

COMMENT ON TABLE banking.credit_report IS
    'Ket qua tra cuu CIC; source=SIMULATED khi chua co nguon CIC that. Doc theo khach, chi QHKH co quan he moi them.';
