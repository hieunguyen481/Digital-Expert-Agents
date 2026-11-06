-- Du lieu mau co nhan DU_LIEU_MAU cho VinaNova (KYC, tai khoan thanh toan, nghia vu, nguoi xu ly).
-- Chay SAU R__seed_sme_batch1.sql (can khach/ho so VinaNova). Idempotent. KHONG sua so DSCR.
BEGIN;
INSERT INTO customer.kyc_assessment
    (id, customer_id, assessment_date, kyc_status, aml_risk_level, pep_status, sanction_status,
     beneficial_owner_verified, source_system, assessment_payload, created_at)
VALUES ('5b000000-0000-4000-8000-000000000001', '56000000-0000-4000-8000-000000000001', now(),
        'VERIFIED', 'LOW', 'NOT_PEP', 'CLEAR', TRUE, 'DU_LIEU_MAU',
        '{"data_label":"DU_LIEU_MAU","note":"Ket qua minh hoa, chua tra cuu he thong that"}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO banking.account
    (id, account_number_masked, account_number_hash, account_type, currency, branch_id, status,
     opened_at, current_balance, balance_as_of, created_at, updated_at)
SELECT 'ac000000-0000-4000-8000-000000000001', 'DU_LIEU_MAU-****0187',
       encode(sha256('DU_LIEU_MAU-VINANOVA-0187'::bytea), 'hex'), 'PAYMENT', 'VND',
       c.home_branch_id, 'ACTIVE', now() - interval '3 years', 21000000000, now(), now(), now()
  FROM customer.customer c WHERE c.id = '56000000-0000-4000-8000-000000000001'
ON CONFLICT (id) DO NOTHING;

INSERT INTO banking.account_holder (id, account_id, party_id, holder_role, valid_from, created_at)
VALUES ('ad000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000001',
        '55000000-0000-4000-8000-000000000001', 'PRIMARY', (now() - interval '3 years')::date, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO banking.account_monthly_summary
    (account_id, year_month, total_inflow, total_outflow, salary_inflow, loan_payment,
     cash_deposit, average_balance, minimum_balance, maximum_balance, transaction_count, computed_at)
SELECT 'ac000000-0000-4000-8000-000000000001', m::date, 58e9 + n * 0.4e9, 56e9 + n * 0.3e9,
       0, 0, 0, 20e9, 12e9, 30e9, 400 + n, now()
  FROM generate_series(date_trunc('month', now()) - interval '12 months',
                       date_trunc('month', now()) - interval '1 month', interval '1 month')
       WITH ORDINALITY AS g(m, n)
ON CONFLICT (account_id, year_month) DO NOTHING;

INSERT INTO credit.existing_obligation
    (id, loan_application_id, party_id, lender_name, obligation_type, outstanding_balance,
     monthly_payment, credit_limit, currency, verified_status, source_type, as_of_date, created_at)
VALUES
 ('0b000000-0000-4000-8000-000000000001', '75000000-0000-4000-8000-000000000001',
  '55000000-0000-4000-8000-000000000001', 'TCTD A (mau)', 'TERM_LOAN', 56e9, 1.2e9, 56e9,
  'VND', 'VERIFIED', 'CREDIT_REPORT', current_date, now()),
 ('0b000000-0000-4000-8000-000000000002', '75000000-0000-4000-8000-000000000001',
  '55000000-0000-4000-8000-000000000001', 'TCTD B (mau)', 'TERM_LOAN', 42e9, 0.9e9, 42e9,
  'VND', 'VERIFIED', 'CREDIT_REPORT', current_date, now())
ON CONFLICT (id) DO NOTHING;

-- Hoso HSV-2026-00187 o buoc APPRAISAL: nguoi xu ly la tham dinh vien (appraiser), khong phai QHKH,
-- neu khong quy tac "dang do nhan vien khac xu ly" chan phan tich sau.
UPDATE credit.loan_application
   SET assigned_employee_id = '10000000-0000-4000-8000-000000000008'
 WHERE id = '75000000-0000-4000-8000-000000000001' AND status = 'APPRAISAL';

-- Khach VinaNova chua gan nguoi phu trach de appraiser nhan xu ly qua claim.
UPDATE customer.customer
   SET relationship_manager_id = NULL, version = version + 1, updated_at = CURRENT_TIMESTAMP
 WHERE id = '56000000-0000-4000-8000-000000000001'
   AND relationship_manager_id = '10000000-0000-4000-8000-000000000001';

COMMIT;
