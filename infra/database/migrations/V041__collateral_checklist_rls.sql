-- V041: bat RLS cho credit.collateral va credit.loan_checklist_item (truoc day chi co GRANT).
-- Doc: theo ho so (cung dieu kien credit.loan_draft: can_read_loan). Ghi (UPDATE): can_write_loan.
-- Khong co policy INSERT/DELETE: chi seed (chu so huu bang, bo qua RLS) moi them dong.
ALTER TABLE credit.collateral ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.loan_checklist_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY collateral_select_policy ON credit.collateral
FOR SELECT TO bank_app, bank_worker, bank_engine
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY collateral_update_policy ON credit.collateral
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));

CREATE POLICY loan_checklist_item_select_policy ON credit.loan_checklist_item
FOR SELECT TO bank_app, bank_worker, bank_engine
USING (identity.can_read_loan(identity.current_employee_id(), loan_application_id));
CREATE POLICY loan_checklist_item_update_policy ON credit.loan_checklist_item
FOR UPDATE TO bank_app
USING (identity.can_write_loan(identity.current_employee_id(), loan_application_id))
WITH CHECK (identity.can_write_loan(identity.current_employee_id(), loan_application_id));
