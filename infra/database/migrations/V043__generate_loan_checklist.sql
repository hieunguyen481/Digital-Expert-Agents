-- V043: sinh danh muc tai lieu bat buoc cho ho so moi (L01).
-- Truoc day ho so tao moi khong co dong credit.loan_checklist_item nao nen cong "du tai lieu"
-- chay tren danh sach rong. Ham doc quy tac checklist ACTIVE (SME-6.1, rules.md F-DOC) va chen
-- tung muc o trang thai REQUIRED. SECURITY DEFINER vi bang chi co policy SELECT/UPDATE (V041).
CREATE OR REPLACE FUNCTION credit.generate_loan_checklist(loan_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    inserted INTEGER;
BEGIN
    INSERT INTO credit.loan_checklist_item (
        id, loan_application_id, requirement_code, document_type, requirement_status,
        mandatory_level, created_at, updated_at
    )
    SELECT gen_random_uuid(), generate_loan_checklist.loan_id, req.requirement_code,
           req.document_type, 'REQUIRED', req.mandatory_level,
           CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM policy.checklist_rule AS rule
    JOIN policy.checklist_rule_requirement AS req ON req.checklist_rule_id = rule.id
    WHERE rule.rule_code = 'SME-6.1' AND rule.status = 'ACTIVE'
      AND NOT EXISTS (
          SELECT 1 FROM credit.loan_checklist_item AS existing
          WHERE existing.loan_application_id = generate_loan_checklist.loan_id
            AND existing.requirement_code = req.requirement_code)
    ORDER BY req.requirement_code;
    GET DIAGNOSTICS inserted = ROW_COUNT;
    RETURN inserted;
END;
$function$;

REVOKE ALL ON FUNCTION credit.generate_loan_checklist(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.generate_loan_checklist(UUID) TO bank_app;
