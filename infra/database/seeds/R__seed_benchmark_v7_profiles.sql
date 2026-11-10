-- R__seed_benchmark_v7_profiles: DU LIEU MAU co nhan cho bo ca benchmark v7 (agent_engine/scripts/
-- benchmark/cases_v7.json, ca H1-H8 lien phong ban, bo DO DOC LAP bench7, dang ky truoc khi do). 8 khach SME MOI (...0061..0068), khong dung lai
-- khach cua v1-v4. Ten, so lieu deu hu cau. Idempotent. Chay SAU R__seed_sme_batch1.sql.
BEGIN;

CREATE TEMP TABLE v7_case (n INT PRIMARY KEY, app_no TEXT, legal_name TEXT, tax_code TEXT, amount_billion INT,
  revenue NUMERIC, ebitda NUMERIC, total_debt NUMERIC, equity NUMERIC, cur_assets NUMERIC, cur_liab NUMERIC,
  cic_group TEXT, sanction TEXT) ON COMMIT DROP;
INSERT INTO v7_case VALUES
 (61, 'HSV-2026-09061', 'Cong ty CP Dien may Hai Phong (mau benchmark v7)', '0319009061', 18, 520e9, 35e9, 50e9, 200e9, 150e9, 80e9, '1', 'CLEAR'),
 (62, 'HSV-2026-09062', 'Cong ty TNHH Ca phe Buon Ma Thuot (mau benchmark v7)', '0319009062', 9, 380e9, 28e9, 40e9, 150e9, 110e9, 65e9, '4', 'CLEAR'),
 (63, 'HSV-2026-09063', 'Cong ty CP Nhua Tan Tien (mau benchmark v7)', '0319009063', 22, 600e9, 24e9, 70e9, 150e9, 140e9, 90e9, '1', 'CLEAR'),
 (64, 'HSV-2026-09064', 'Cong ty TNHH Gach Dong Tam (mau benchmark v7)', '0319009064', 10, 360e9, 20e9, 30e9, 130e9, 100e9, 60e9, '1', 'CLEAR'),
 (65, 'HSV-2026-09065', 'Cong ty CP Thuc pham Mien Tay (mau benchmark v7)', '0319009065', 16, 700e9, 40e9, 60e9, 260e9, 190e9, 100e9, '1', 'CLEAR'),
 (66, 'HSV-2026-09066', 'Cong ty TNHH Logistics Cat Lai (mau benchmark v7)', '0319009066', 14, 450e9, 30e9, 0e9, 0e9, 0e9, 0e9, '1', 'CLEAR'),
 (67, 'HSV-2026-09067', 'Cong ty CP Che bien Hat dieu Binh Phuoc (mau benchmark v7)', '0319009067', 10, 400e9, 18e9, 35e9, 150e9, 110e9, 70e9, '2', 'CLEAR'),
 (68, 'HSV-2026-09068', 'Cong ty CP Thep Hoa Binh (mau benchmark v7)', '0319009068', 45, 1400e9, 140e9, 200e9, 700e9, 480e9, 260e9, '1', 'CLEAR');

CREATE FUNCTION pg_temp.u(prefix TEXT, n INT, k INT DEFAULT 0) RETURNS UUID LANGUAGE sql IMMUTABLE AS $$
  SELECT (prefix || '-0000-4000-8000-' || lpad(n::TEXT, 6, '0') || lpad(k::TEXT, 6, '0'))::UUID $$;

INSERT INTO customer.party (id, party_type, display_name, status, created_at, created_by, updated_at, updated_by, version)
SELECT pg_temp.u('55000000', n, 0), 'ORGANIZATION', legal_name, 'ACTIVE', now(),
       '10000000-0000-4000-8000-000000000001', now(), '10000000-0000-4000-8000-000000000001', 1
FROM v7_case
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO customer.organization_profile (party_id, legal_name, trading_name, business_type, registration_number_hash,
    tax_code_hash, incorporation_date, industry_code, legal_representative_party_id, updated_at)
SELECT pg_temp.u('55000000', n, 0), legal_name, legal_name, 'JSC',
       encode(sha256(convert_to('REG-' || tax_code, 'UTF8')), 'hex'), encode(sha256(convert_to(tax_code, 'UTF8')), 'hex'),
       DATE '2014-01-01' + ((n % 40) * 97), '2599', NULL, now()
FROM v7_case
ON CONFLICT (party_id) DO UPDATE SET legal_name = EXCLUDED.legal_name, updated_at = now();

INSERT INTO customer.customer (id, party_id, customer_number, customer_segment, home_branch_id, relationship_manager_id,
    onboarding_date, kyc_status, risk_rating, risk_rating_as_of, status, created_at, updated_at, version)
SELECT pg_temp.u('56000000', n, 0), pg_temp.u('55000000', n, 0), 'CIF-SME-' || lpad(n::TEXT, 3, '0'), 'SME',
       '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
       DATE '2020-01-01' + (n * 37), 'VERIFIED', NULL, NULL, 'ACTIVE', now(), now(), 1
FROM v7_case
ON CONFLICT (id) DO UPDATE SET customer_number = EXCLUDED.customer_number, updated_at = now();

INSERT INTO credit.loan_application (id, application_number, primary_customer_id, product_id, requested_amount, currency,
    requested_term_months, loan_purpose, interest_rate_assumption, repayment_method, status, assigned_employee_id,
    submitted_at, created_at, created_by, updated_at, updated_by, version, approval_tier, withdraw_reason)
SELECT pg_temp.u('75000000', n, 0), app_no, pg_temp.u('56000000', n, 0), '45900000-0000-4000-8000-000000000001',
       amount_billion::numeric * 1e9, 'VND', 24, 'WORKING_CAPITAL', 0.09500000, 'INTEREST_MONTHLY_PRINCIPAL_AT_MATURITY',
       'CHECKING', '10000000-0000-4000-8000-000000000001', NULL, now(), '10000000-0000-4000-8000-000000000001', now(),
       '10000000-0000-4000-8000-000000000001', 1, 2, NULL
FROM v7_case
ON CONFLICT (id) DO UPDATE SET requested_amount = EXCLUDED.requested_amount;

INSERT INTO credit.loan_party (id, loan_application_id, party_id, party_role, created_at)
SELECT pg_temp.u('75100000', n, 0), pg_temp.u('75000000', n, 0), pg_temp.u('55000000', n, 0), 'PRIMARY_BORROWER', now()
FROM v7_case
ON CONFLICT (id) DO NOTHING;

INSERT INTO credit.sme_financial_year (customer_id, fiscal_year, revenue, ebitda, total_debt, equity, current_assets,
    current_liabilities, source_ref, missing_fields)
SELECT pg_temp.u('56000000', n, 0), 2025, revenue, ebitda, total_debt, equity, cur_assets, cur_liab,
       'DU_LIEU_MAU benchmark v7', '{}'
FROM v7_case WHERE n <> 66  -- 66: khong co BCTC nao (thieu du lieu chan that)
ON CONFLICT (customer_id, fiscal_year) DO UPDATE SET revenue = EXCLUDED.revenue, ebitda = EXCLUDED.ebitda,
    total_debt = EXCLUDED.total_debt, equity = EXCLUDED.equity, current_assets = EXCLUDED.current_assets,
    current_liabilities = EXCLUDED.current_liabilities, source_ref = EXCLUDED.source_ref, missing_fields = '{}';

-- KYC/AML: ca nao cung sach (CLEAR).
INSERT INTO customer.kyc_assessment (id, customer_id, assessment_date, kyc_status, aml_risk_level, pep_status,
    sanction_status, beneficial_owner_verified, source_system, assessment_payload, created_at)
SELECT pg_temp.u('5b100000', n, 0), pg_temp.u('56000000', n, 0), now(), 'VERIFIED',
       CASE WHEN sanction = 'CLEAR' THEN 'LOW' ELSE 'HIGH' END, 'NOT_PEP', sanction, TRUE, 'DU_LIEU_MAU',
       '{"data_label":"DU_LIEU_MAU","note":"benchmark v7, chua tra cuu he thong that"}'::jsonb, now()
FROM v7_case
ON CONFLICT (id) DO UPDATE SET sanction_status = EXCLUDED.sanction_status, aml_risk_level = EXCLUDED.aml_risk_level;

-- Du no hien huu tai ngan hang (dong = khoan vay; k = so khoan).
INSERT INTO credit.existing_obligation (id, loan_application_id, party_id, lender_name, obligation_type,
    outstanding_balance, monthly_payment, credit_limit, currency, verified_status, source_type, as_of_date, created_at)
SELECT pg_temp.u('0b100000', v.n, v.k), pg_temp.u('75000000', v.n, 0), pg_temp.u('55000000', v.n, 0),
       'Ngan hang (mau)', 'TERM_LOAN', v.bal * 1e9, v.pay * 1e9, v.bal * 1e9, 'VND', 'VERIFIED', 'CREDIT_REPORT',
       current_date, now()
FROM (VALUES (61, 1, 6, 0.12), (61, 2, 4, 0.08), (62, 1, 8, 0.16), (63, 1, 9, 0.18), (63, 2, 5, 0.10), (64, 1, 6, 0.12), (65, 1, 10, 0.20), (66, 1, 7, 0.14), (67, 1, 5, 0.10), (68, 1, 35, 0.70), (68, 2, 25, 0.50)) AS v(n, k, bal, pay)
ON CONFLICT (id) DO UPDATE SET outstanding_balance = EXCLUDED.outstanding_balance, monthly_payment = EXCLUDED.monthly_payment;

-- CIC: nhom no theo v7_case.cic_group (62 nhom 4, 67 nhom 2); 65 co ban CIC tra cuu cach day 50 ngay (qua han hieu luc 30 ngay, CS-TD-SME/2025 §6.3); 64 co du no CIC 48 ty o 2 TCTD (CAO hon BCTC 30 ty).
INSERT INTO banking.credit_report (id, customer_id, provider, report_reference, requested_at, report_as_of_date,
    risk_summary, storage_object_id, created_at, looked_up_by, consent_id, valid_until, source)
SELECT pg_temp.u('58100000', n, 0), pg_temp.u('56000000', n, 0), 'CIC', 'CIC-SIM-BM7-' || n,
       CASE WHEN n = 65 THEN now() - interval '50 days' ELSE now() END,
       CASE WHEN n = 65 THEN current_date - 50 ELSE current_date END,
       jsonb_build_object('debt_group', cic_group, 'source_label', 'He thong CIC (gia lap) · du lieu mau benchmark v7'),
       NULL, now(), '10000000-0000-4000-8000-000000000001', NULL, CASE WHEN n = 65 THEN current_date - 20 ELSE current_date + 29 END, 'SIMULATED'
FROM v7_case
ON CONFLICT (id) DO UPDATE SET risk_summary = EXCLUDED.risk_summary, requested_at = EXCLUDED.requested_at;

INSERT INTO banking.credit_facility (id, credit_report_id, lender_name, facility_type, credit_limit, outstanding_balance,
    monthly_obligation, overdue_days, debt_group, currency, as_of_date, created_at)
SELECT pg_temp.u('58200000', v.n, v.k), pg_temp.u('58100000', v.n, 0), v.lender, 'TERM_LOAN', NULL, v.bal * 1e9, NULL,
       v.overdue, v.grp, 'VND', current_date, now()
FROM (VALUES (62, 1, 'TCTD A (mau)', 8, 200, '4'), (64, 1, 'TCTD A (mau)', 20, 0, '1'), (64, 2, 'TCTD B (mau)', 28, 0, '1'), (67, 1, 'TCTD A (mau)', 6, 45, '2')) AS v(n, k, lender, bal, overdue, grp)
ON CONFLICT (id) DO UPDATE SET outstanding_balance = EXCLUDED.outstanding_balance, overdue_days = EXCLUDED.overdue_days,
    debt_group = EXCLUDED.debt_group;

-- TSBD: moi ca mot hoac hai TSBD, deu da xac minh phap ly.
INSERT INTO credit.collateral (id, loan_application_id, owner_party_id, collateral_type, description, declared_value,
    appraised_value, eligible_value, currency, valuation_date, valuation_status, ownership_verification_status,
    created_at, updated_at, version, on_leased_land)
SELECT pg_temp.u('77100000', v.n, v.k), pg_temp.u('75000000', v.n, 0), pg_temp.u('55000000', v.n, 0), v.typ,
       v.descr || ' (du lieu mau benchmark v7)', v.decl * 1e9, v.appr * 1e9, v.appr * 1e9, 'VND', current_date,
       'APPRAISED', v.own, now(), now(), 1, FALSE
FROM (VALUES
  (61, 1, 'REAL_ESTATE', 'Nha xuong va QSDD', 30, 30, 'VERIFIED'),
  (61, 2, 'MACHINERY', 'Kho lanh', 10, 10, 'VERIFIED'),
  (62, 1, 'REAL_ESTATE', 'Nha xuong va QSDD', 30, 30, 'VERIFIED'),
  (63, 1, 'REAL_ESTATE', 'Nha may va QSDD', 40, 40, 'VERIFIED'),
  (64, 1, 'REAL_ESTATE', 'Kho bai va QSDD', 25, 25, 'VERIFIED'),
  (65, 1, 'REAL_ESTATE', 'Nha xuong va QSDD', 30, 30, 'VERIFIED'),
  (66, 1, 'REAL_ESTATE', 'Nha xuong va QSDD', 28, 28, 'VERIFIED'),
  (67, 1, 'REAL_ESTATE', 'Kho bai va QSDD', 25, 25, 'VERIFIED'),
  (68, 1, 'REAL_ESTATE', 'Nha may va QSDD', 50, 50, 'VERIFIED'),
  (68, 2, 'REAL_ESTATE', 'Kho bai va QSDD', 30, 30, 'VERIFIED')) AS v(n, k, typ, descr, decl, appr, own)
ON CONFLICT (id) DO UPDATE SET declared_value = EXCLUDED.declared_value, appraised_value = EXCLUDED.appraised_value,
    eligible_value = EXCLUDED.eligible_value, ownership_verification_status = EXCLUDED.ownership_verification_status;

-- Tai khoan thanh toan: moi khach deu co.
-- Tien ve 12 thang khop doanh thu (khong ca nao co lech dong tien).
INSERT INTO banking.account (id, account_number_masked, account_number_hash, account_type, currency, branch_id, status,
    opened_at, closed_at, current_balance, balance_as_of, created_at, updated_at, version)
SELECT pg_temp.u('75200000', n, 0), '******' || lpad(n::TEXT, 4, '0'), encode(sha256(convert_to('BM7-ACC-' || n, 'UTF8')), 'hex'),
       'PAYMENT', 'VND', '30000000-0000-4000-8000-000000000002', 'ACTIVE', now() - interval '3 years', NULL,
       5e9, now(), now(), now(), 1
FROM v7_case
ON CONFLICT (id) DO NOTHING;
INSERT INTO banking.account_holder (id, account_id, party_id, holder_role, valid_from, valid_until, created_at)
SELECT pg_temp.u('75300000', n, 0), pg_temp.u('75200000', n, 0), pg_temp.u('55000000', n, 0), 'PRIMARY',
       current_date - 1000, NULL, now()
FROM v7_case
ON CONFLICT (id) DO NOTHING;
INSERT INTO banking.account_monthly_summary (account_id, year_month, total_inflow, total_outflow, salary_inflow,
    loan_payment, cash_deposit, average_balance, minimum_balance, maximum_balance, transaction_count, computed_at)
SELECT pg_temp.u('75200000', c.n, 0), (date_trunc('month', current_date) - m * interval '1 month')::date,
       c.revenue / 12 * 0.9, c.revenue / 12 * 0.85, 0, 0, 0,
       5e9, 3e9, 8e9, 120, now()
FROM v7_case c, generate_series(0, 11) AS m
ON CONFLICT (account_id, year_month) DO UPDATE SET total_inflow = EXCLUDED.total_inflow;
COMMIT;
