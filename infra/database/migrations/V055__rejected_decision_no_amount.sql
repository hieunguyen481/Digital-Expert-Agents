-- L04: quyet dinh Tu choi khong co so tien/ky han duoc duyet. Sua du lieu cu bi luu sai.
-- credit.loan_decision la append-only (V021); chi migration (chu so huu) tam tat trigger de sua.
ALTER TABLE credit.loan_decision DISABLE TRIGGER trg_loan_decision_append_only;
UPDATE credit.loan_decision
   SET approved_amount = NULL, approved_term_months = NULL
 WHERE decision_type = 'REJECTED'
   AND (approved_amount IS NOT NULL OR approved_term_months IS NOT NULL);
ALTER TABLE credit.loan_decision ENABLE TRIGGER trg_loan_decision_append_only;
