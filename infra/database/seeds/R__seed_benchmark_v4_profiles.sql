-- R__seed_benchmark_v4_profiles: DU LIEU MAU co nhan cho bo ca benchmark v4 (agent_engine/scripts/
-- benchmark/cases_v4.json, ca E1-E6 lien phong ban). 6 khach SME MOI (...0031..0036), khong dung lai
-- khach cua v1-v3. Ten, so lieu deu hu cau. Idempotent. Chay SAU R__seed_sme_batch1.sql.
BEGIN;

CREATE TEMP TABLE v4_case (n INT PRIMARY KEY, app_no TEXT, legal_name TEXT, tax_code TEXT, amount_billion INT,
  revenue NUMERIC, ebitda NUMERIC, total_debt NUMERIC, equity NUMERIC, cur_assets NUMERIC, cur_liab NUMERIC,
  cic_group TEXT, sanction TEXT) ON COMMIT DROP;
INSERT INTO v4_case VALUES
 (31, 'HSV-2026-09031', 'Cong ty CP Che bien Go Tan Phat (mau benchmark v4)', '0319009031', 18, 320e9, 30e9, 50e9, 180e9, 120e9, 70e9, '1', 'CLEAR'),
 (32, 'HSV-2026-09032', 'Cong ty TNHH Duoc pham Hai Au (mau benchmark v4)', '0319009032', 12, 260e9, 15e9, 40e9, 110e9, 90e9, 60e9, '1', 'CLEAR'),
 (33, 'HSV-2026-09033', 'Cong ty CP Cao su Phuoc Hoa (mau benchmark v4)', '0319009033', 25, 450e9, 40e9, 60e9, 200e9, 160e9, 90e9, '1', 'CLEAR'),
 (34, 'HSV-2026-09034', 'Cong ty CP Xi mang Dong Nam (mau benchmark v4)', '0319009034', 40, 800e9, 60e9, 150e9, 400e9, 300e9, 170e9, '1', 'CLEAR'),
 (35, 'HSV-2026-09035', 'Cong ty TNHH Dien tu Minh Quang (mau benchmark v4)', '0319009035', 6, 130e9, 11e9, 20e9, 45e9, 50e9, 30e9, '1', 'CLEAR'),
 (36, 'HSV-2026-09036', 'Cong ty CP Thuy san Ca Mau Xanh (mau benchmark v4)', '0319009036', 20, 240e9, 28e9, 30e9, 100e9, 90e9, 50e9, '1', 'CLEAR');

CREATE FUNCTION pg_temp.u(prefix TEXT, n INT, k INT DEFAULT 0) RETURNS UUID LANGUAGE sql IMMUTABLE AS $$
  SELECT (prefix || '-0000-4000-8000-' || lpad(n::TEXT, 6, '0') || lpad(k::TEXT, 6, '0'))::UUID $$;

INSERT INTO customer.party (id, party_type, display_name, status, created_at, created_by, updated_at, updated_by, version)
SELECT pg_temp.u('55000000', n, 0), 'ORGANIZATION', legal_name, 'ACTIVE', now(),
       '10000000-0000-4000-8000-000000000001', now(), '10000000-0000-4000-8000-000000000001', 1
FROM v4_case
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO customer.organization_profile (party_id, legal_name, trading_name, business_type, registration_number_hash,
    tax_code_hash, incorporation_date, industry_code, legal_representative_party_id, updated_at)
SELECT pg_temp.u('55000000', n, 0), legal_name, legal_name, 'JSC',
       encode(sha256(convert_to('REG-' || tax_code, 'UTF8')), 'hex'), encode(sha256(convert_to(tax_code, 'UTF8')), 'hex'),
       DATE '2014-01-01' + ((n % 40) * 97), '2599', NULL, now()
FROM v4_case
ON CONFLICT (party_id) DO UPDATE SET legal_name = EXCLUDED.legal_name, updated_at = now();

INSERT INTO customer.customer (id, party_id, customer_number, customer_segment, home_branch_id, relationship_manager_id,
    onboarding_date, kyc_status, risk_rating, risk_rating_as_of, status, created_at, updated_at, version)
SELECT pg_temp.u('56000000', n, 0), pg_temp.u('55000000', n, 0), 'CIF-SME-' || lpad(n::TEXT, 3, '0'), 'SME',
       '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
       DATE '2020-01-01' + (n * 37), 'VERIFIED', NULL, NULL, 'ACTIVE', now(), now(), 1
FROM v4_case
ON CONFLICT (id) DO UPDATE SET customer_number = EXCLUDED.customer_number, updated_at = now();

INSERT INTO credit.loan_application (id, application_number, primary_customer_id, product_id, requested_amount, currency,
    requested_term_months, loan_purpose, interest_rate_assumption, repayment_method, status, assigned_employee_id,
    submitted_at, created_at, created_by, updated_at, updated_by, version, approval_tier, withdraw_reason)
SELECT pg_temp.u('75000000', n, 0), app_no, pg_temp.u('56000000', n, 0), '45900000-0000-4000-8000-000000000001',
       amount_billion::numeric * 1e9, 'VND', 24, 'WORKING_CAPITAL', 0.09500000, 'INTEREST_MONTHLY_PRINCIPAL_AT_MATURITY',
       'CHECKING', '10000000-0000-4000-8000-000000000001', NULL, now(), '10000000-0000-4000-8000-000000000001', now(),
       '10000000-0000-4000-8000-000000000001', 1, 2, NULL
FROM v4_case
ON CONFLICT (id) DO UPDATE SET requested_amount = EXCLUDED.requested_amount;

INSERT INTO credit.loan_party (id, loan_application_id, party_id, party_role, created_at)
SELECT pg_temp.u('75100000', n, 0), pg_temp.u('75000000', n, 0), pg_temp.u('55000000', n, 0), 'PRIMARY_BORROWER', now()
FROM v4_case
ON CONFLICT (id) DO NOTHING;

INSERT INTO credit.sme_financial_year (customer_id, fiscal_year, revenue, ebitda, total_debt, equity, current_assets,
    current_liabilities, source_ref, missing_fields)
SELECT pg_temp.u('56000000', n, 0), 2025, revenue, ebitda, total_debt, equity, cur_assets, cur_liab,
       'DU_LIEU_MAU benchmark v4', '{}'
FROM v4_case
ON CONFLICT (customer_id, fiscal_year) DO UPDATE SET revenue = EXCLUDED.revenue, ebitda = EXCLUDED.ebitda,
    total_debt = EXCLUDED.total_debt, equity = EXCLUDED.equity, current_assets = EXCLUDED.current_assets,
    current_liabilities = EXCLUDED.current_liabilities, source_ref = EXCLUDED.source_ref, missing_fields = '{}';

-- KYC/AML: ca nao cung sach (CLEAR).
INSERT INTO customer.kyc_assessment (id, customer_id, assessment_date, kyc_status, aml_risk_level, pep_status,
    sanction_status, beneficial_owner_verified, source_system, assessment_payload, created_at)
SELECT pg_temp.u('5b100000', n, 0), pg_temp.u('56000000', n, 0), now(), 'VERIFIED',
       CASE WHEN sanction = 'CLEAR' THEN 'LOW' ELSE 'HIGH' END, 'NOT_PEP', sanction, TRUE, 'DU_LIEU_MAU',
       '{"data_label":"DU_LIEU_MAU","note":"benchmark v4, chua tra cuu he thong that"}'::jsonb, now()
FROM v4_case
ON CONFLICT (id) DO UPDATE SET sanction_status = EXCLUDED.sanction_status, aml_risk_level = EXCLUDED.aml_risk_level;

-- Du no hien huu tai ngan hang (dong = khoan vay; k = so khoan).
INSERT INTO credit.existing_obligation (id, loan_application_id, party_id, lender_name, obligation_type,
    outstanding_balance, monthly_payment, credit_limit, currency, verified_status, source_type, as_of_date, created_at)
SELECT pg_temp.u('0b100000', v.n, v.k), pg_temp.u('75000000', v.n, 0), pg_temp.u('55000000', v.n, 0),
       'Ngan hang (mau)', 'TERM_LOAN', v.bal * 1e9, v.pay * 1e9, v.bal * 1e9, 'VND', 'VERIFIED', 'CREDIT_REPORT',
       current_date, now()
FROM (VALUES (31, 1, 4, 0.10), (31, 2, 2, 0.05), (32, 1, 3, 0.08), (32, 2, 2, 0.05), (34, 1, 40, 1.00), (34, 2, 20, 0.50)) AS v(n, k, bal, pay)
ON CONFLICT (id) DO UPDATE SET outstanding_balance = EXCLUDED.outstanding_balance, monthly_payment = EXCLUDED.monthly_payment;

-- CIC: nhom no theo v4_case.cic_group (tat ca nhom 1); ...0035 co du no 36 ty o 2 TCTD khac (khac BCTC 20 ty).
INSERT INTO banking.credit_report (id, customer_id, provider, report_reference, requested_at, report_as_of_date,
    risk_summary, storage_object_id, created_at, looked_up_by, consent_id, valid_until, source)
SELECT pg_temp.u('58100000', n, 0), pg_temp.u('56000000', n, 0), 'CIC', 'CIC-SIM-BM4-' || n, now(), current_date,
       jsonb_build_object('debt_group', cic_group, 'source_label', 'He thong CIC (gia lap) · du lieu mau benchmark v4'),
       NULL, now(), '10000000-0000-4000-8000-000000000001', NULL, current_date + 29, 'SIMULATED'
FROM v4_case
ON CONFLICT (id) DO UPDATE SET risk_summary = EXCLUDED.risk_summary, requested_at = EXCLUDED.requested_at;

INSERT INTO banking.credit_facility (id, credit_report_id, lender_name, facility_type, credit_limit, outstanding_balance,
    monthly_obligation, overdue_days, debt_group, currency, as_of_date, created_at)
SELECT pg_temp.u('58200000', v.n, v.k), pg_temp.u('58100000', v.n, 0), v.lender, 'TERM_LOAN', NULL, v.bal * 1e9, NULL,
       v.overdue, v.grp, 'VND', current_date, now()
FROM (VALUES (35, 1, 'TCTD A (mau)', 16, 0, '1'), (35, 2, 'TCTD B (mau)', 20, 0, '1')) AS v(n, k, lender, bal, overdue, grp)
ON CONFLICT (id) DO UPDATE SET outstanding_balance = EXCLUDED.outstanding_balance, overdue_days = EXCLUDED.overdue_days,
    debt_group = EXCLUDED.debt_group;

-- TSBD: nhieu tai san / chua xac minh phap ly / khai bao khac tham dinh.
INSERT INTO credit.collateral (id, loan_application_id, owner_party_id, collateral_type, description, declared_value,
    appraised_value, eligible_value, currency, valuation_date, valuation_status, ownership_verification_status,
    created_at, updated_at, version, on_leased_land)
SELECT pg_temp.u('77100000', v.n, v.k), pg_temp.u('75000000', v.n, 0), pg_temp.u('55000000', v.n, 0), v.typ,
       v.descr || ' (du lieu mau benchmark v4)', v.decl * 1e9, v.appr * 1e9, v.appr * 1e9, 'VND', current_date,
       'APPRAISED', v.own, now(), now(), 1, FALSE
FROM (VALUES
  (31, 1, 'REAL_ESTATE', 'Nha xuong va QSDD', 30, 30, 'VERIFIED'),
  (31, 2, 'VEHICLE', 'Doi xe tai', 8, 8, 'VERIFIED'),
  (31, 3, 'MACHINERY', 'May moc che bien', 12, 12, 'PENDING'),
  (32, 1, 'REAL_ESTATE', 'Nha xuong va QSDD', 30, 30, 'VERIFIED'),
  (33, 1, 'REAL_ESTATE', 'Dat nong nghiep va QSDD', 25, 25, 'PENDING'),
  (33, 2, 'MACHINERY', 'Day chuyen so che', 15, 15, 'PENDING'),
  (34, 1, 'REAL_ESTATE', 'Nha may va QSDD', 75, 70, 'VERIFIED'),
  (34, 2, 'REAL_ESTATE', 'Kho bai va QSDD', 60, 60, 'VERIFIED'),
  (36, 1, 'REAL_ESTATE', 'Nha xuong lanh va QSDD', 36, 24, 'VERIFIED')) AS v(n, k, typ, descr, decl, appr, own)
ON CONFLICT (id) DO UPDATE SET declared_value = EXCLUDED.declared_value, appraised_value = EXCLUDED.appraised_value,
    eligible_value = EXCLUDED.eligible_value, ownership_verification_status = EXCLUDED.ownership_verification_status;

-- Tai khoan thanh toan: moi khach deu co.
-- ...0036: tien ve 12 thang 72 ty (6 ty/thang) so voi doanh thu BCTC 240 ty.
INSERT INTO banking.account (id, account_number_masked, account_number_hash, account_type, currency, branch_id, status,
    opened_at, closed_at, current_balance, balance_as_of, created_at, updated_at, version)
SELECT pg_temp.u('75200000', n, 0), '******' || lpad(n::TEXT, 4, '0'), encode(sha256(convert_to('BM4-ACC-' || n, 'UTF8')), 'hex'),
       'PAYMENT', 'VND', '30000000-0000-4000-8000-000000000002', 'ACTIVE', now() - interval '3 years', NULL,
       5e9, now(), now(), now(), 1
FROM v4_case
ON CONFLICT (id) DO NOTHING;
INSERT INTO banking.account_holder (id, account_id, party_id, holder_role, valid_from, valid_until, created_at)
SELECT pg_temp.u('75300000', n, 0), pg_temp.u('75200000', n, 0), pg_temp.u('55000000', n, 0), 'PRIMARY',
       current_date - 1000, NULL, now()
FROM v4_case
ON CONFLICT (id) DO NOTHING;
INSERT INTO banking.account_monthly_summary (account_id, year_month, total_inflow, total_outflow, salary_inflow,
    loan_payment, cash_deposit, average_balance, minimum_balance, maximum_balance, transaction_count, computed_at)
SELECT pg_temp.u('75200000', c.n, 0), (date_trunc('month', current_date) - m * interval '1 month')::date,
       CASE WHEN c.n = 36 THEN 6e9 ELSE c.revenue / 12 * 0.9 END, c.revenue / 12 * 0.85, 0, 0, 0,
       5e9, 3e9, 8e9, 120, now()
FROM v4_case c, generate_series(0, 11) AS m
ON CONFLICT (account_id, year_month) DO UPDATE SET total_inflow = EXCLUDED.total_inflow;
COMMIT;
