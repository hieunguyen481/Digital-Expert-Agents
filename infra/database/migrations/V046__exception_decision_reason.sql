-- R-05 / E1: cap phe duyet chap thuan hoac tu choi tung ngoai le kem ly do.
-- Dong da quyet truoc V046 khong co ly do nen rang buoc chi ap cho dong moi (NOT VALID).
ALTER TABLE credit.case_exception ADD COLUMN decision_reason TEXT NULL;
ALTER TABLE credit.case_exception ADD CONSTRAINT ck_case_exception_decision_reason CHECK (
    decision IS NULL OR (decision_reason IS NOT NULL AND length(btrim(decision_reason)) > 0)
) NOT VALID;
COMMENT ON COLUMN credit.case_exception.decision_reason IS 'Ly do cua cap phe duyet khi chap thuan/tu choi ngoai le (E1).';
