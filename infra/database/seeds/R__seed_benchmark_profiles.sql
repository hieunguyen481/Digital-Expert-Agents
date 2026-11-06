-- R__seed_benchmark_profiles: DU LIEU MAU co nhan cho bo ca benchmark v2 (agent_engine/scripts/
-- benchmark/cases_v2.json), gan vao 5 khach SME san co (...0003..0007) chua co so lieu tai chinh,
-- no, CIC, KYC, TSBD. Chay SAU R__seed_sme_batch1.sql. Idempotent. Ten, so lieu deu hu cau.
BEGIN;
INSERT INTO credit.sme_financial_year
    (customer_id, fiscal_year, revenue, ebitda, total_debt, equity, current_assets,
     current_liabilities, source_ref, missing_fields) VALUES
 ('56000000-0000-4000-8000-000000000003', 2025, 300e9, 45e9, 30e9, 160e9, 120e9, 70e9, 'DU_LIEU_MAU benchmark v2', '{}'),
 ('56000000-0000-4000-8000-000000000004', 2025, 150e9, 12e9, 25e9, 40e9, 60e9, 45e9, 'DU_LIEU_MAU benchmark v2', '{}'),
 ('56000000-0000-4000-8000-000000000005', 2025, 200e9, 20e9, 30e9, 90e9, 80e9, 50e9, 'DU_LIEU_MAU benchmark v2', '{}'),
 ('56000000-0000-4000-8000-000000000006', 2025, 120e9, 5e9, 35e9, 20e9, 40e9, 38e9, 'DU_LIEU_MAU benchmark v2', '{}'),
 ('56000000-0000-4000-8000-000000000007', 2025, 260e9, 40e9, 20e9, 150e9, 110e9, 60e9, 'DU_LIEU_MAU benchmark v2', '{}')
ON CONFLICT (customer_id, fiscal_year) DO UPDATE SET revenue = EXCLUDED.revenue, ebitda = EXCLUDED.ebitda,
    total_debt = EXCLUDED.total_debt, equity = EXCLUDED.equity, current_assets = EXCLUDED.current_assets,
    current_liabilities = EXCLUDED.current_liabilities, source_ref = EXCLUDED.source_ref, missing_fields = '{}';

-- KYC/AML: ...0005 co ket qua trung danh sach trung phat (POSSIBLE_MATCH); con lai sach.
INSERT INTO customer.kyc_assessment
    (id, customer_id, assessment_date, kyc_status, aml_risk_level, pep_status, sanction_status,
     beneficial_owner_verified, source_system, assessment_payload, created_at)
SELECT ('5b100000-0000-4000-8000-00000000000' || n)::uuid, ('56000000-0000-4000-8000-00000000000' || n)::uuid,
       now(), 'VERIFIED', CASE WHEN n = 5 THEN 'HIGH' ELSE 'LOW' END, 'NOT_PEP',
       CASE WHEN n = 5 THEN 'POSSIBLE_MATCH' ELSE 'CLEAR' END, TRUE, 'DU_LIEU_MAU',
       '{"data_label":"DU_LIEU_MAU","note":"benchmark v2, chua tra cuu he thong that"}'::jsonb, now()
FROM generate_series(3, 7) AS n
ON CONFLICT (id) DO UPDATE SET sanction_status = EXCLUDED.sanction_status, aml_risk_level = EXCLUDED.aml_risk_level;

-- Du no hien huu tai ngan hang: ...0003 5 ty, ...0004 14 ty, ...0006 10 ty.
INSERT INTO credit.existing_obligation
    (id, loan_application_id, party_id, lender_name, obligation_type, outstanding_balance,
     monthly_payment, credit_limit, currency, verified_status, source_type, as_of_date, created_at)
VALUES
 ('0b100000-0000-4000-8000-000000000003', '75000000-0000-4000-8000-000000000003', '55000000-0000-4000-8000-000000000003',
  'Ngan hang (mau)', 'TERM_LOAN', 5e9, 0.15e9, 5e9, 'VND', 'VERIFIED', 'CREDIT_REPORT', current_date, now()),
 ('0b100000-0000-4000-8000-000000000004', '75000000-0000-4000-8000-000000000004', '55000000-0000-4000-8000-000000000004',
  'Ngan hang (mau)', 'TERM_LOAN', 14e9, 0.30e9, 14e9, 'VND', 'VERIFIED', 'CREDIT_REPORT', current_date, now()),
 ('0b100000-0000-4000-8000-000000000006', '75000000-0000-4000-8000-000000000006', '55000000-0000-4000-8000-000000000006',
  'Ngan hang (mau)', 'TERM_LOAN', 10e9, 0.40e9, 10e9, 'VND', 'VERIFIED', 'CREDIT_REPORT', current_date, now())
ON CONFLICT (id) DO UPDATE SET outstanding_balance = EXCLUDED.outstanding_balance, monthly_payment = EXCLUDED.monthly_payment;

-- CIC: ...0004 co khoan qua han 120 ngay (nhom 3); con lai nhom 1.
INSERT INTO banking.credit_report
    (id, customer_id, provider, report_reference, requested_at, report_as_of_date, risk_summary,
     storage_object_id, created_at, looked_up_by, consent_id, valid_until, source)
SELECT ('58100000-0000-4000-8000-00000000000' || n)::uuid, ('56000000-0000-4000-8000-00000000000' || n)::uuid,
       'CIC', 'CIC-SIM-BM2-' || n, now(), current_date,
       jsonb_build_object('debt_group', CASE WHEN n = 4 THEN '3' ELSE '1' END,
                          'source_label', 'He thong CIC (gia lap) · du lieu mau benchmark v2'),
       NULL, now(), '10000000-0000-4000-8000-000000000001', NULL, current_date + 29, 'SIMULATED'
FROM generate_series(3, 7) AS n
ON CONFLICT (id) DO UPDATE SET risk_summary = EXCLUDED.risk_summary, requested_at = EXCLUDED.requested_at;

INSERT INTO banking.credit_facility
    (id, credit_report_id, lender_name, facility_type, credit_limit, outstanding_balance,
     monthly_obligation, overdue_days, debt_group, currency, as_of_date, created_at)
VALUES
 ('58200000-0000-4000-8000-000000000041', '58100000-0000-4000-8000-000000000004', 'Ngan hang (mau)', 'TERM_LOAN',
  NULL, 14e9, NULL, 120, '3', 'VND', current_date, now())
ON CONFLICT (id) DO UPDATE SET overdue_days = EXCLUDED.overdue_days, debt_group = EXCLUDED.debt_group;

-- TSBD: ...0003 BDS 30 ty khai bao / 28 ty tham dinh da xac minh; ...0007 BDS 30 ty (vay 25 ty -> LTV 83%).
INSERT INTO credit.collateral
    (id, loan_application_id, owner_party_id, collateral_type, description, declared_value,
     appraised_value, eligible_value, currency, valuation_date, valuation_status,
     ownership_verification_status, created_at, updated_at, version, on_leased_land)
VALUES
 ('77100000-0000-4000-8000-000003000001', '75000000-0000-4000-8000-000000000003', '55000000-0000-4000-8000-000000000003',
  'REAL_ESTATE', 'Nha xuong va QSDD (du lieu mau benchmark v2)', 30e9, 28e9, 28e9, 'VND', current_date,
  'APPRAISED', 'VERIFIED', now(), now(), 1, FALSE),
 ('77100000-0000-4000-8000-000007000001', '75000000-0000-4000-8000-000000000007', '55000000-0000-4000-8000-000000000007',
  'REAL_ESTATE', 'Kho van va QSDD (du lieu mau benchmark v2)', 30e9, 30e9, 30e9, 'VND', current_date,
  'APPRAISED', 'VERIFIED', now(), now(), 1, FALSE)
ON CONFLICT (id) DO UPDATE SET declared_value = EXCLUDED.declared_value, appraised_value = EXCLUDED.appraised_value,
    eligible_value = EXCLUDED.eligible_value;
COMMIT;
