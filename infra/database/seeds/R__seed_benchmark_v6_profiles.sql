-- R__seed_benchmark_v6_profiles: DU LIEU MAU co nhan cho bo ca benchmark v6 (agent_engine/scripts/
-- benchmark/cases_v6.json, ca G1-G8 lien phong ban, bo KIEM TRA MU, dang ky truoc khi sua engine bench6). 8 khach SME MOI (...0051..0058), khong dung lai
-- khach cua v1-v4. Ten, so lieu deu hu cau. Idempotent. Chay SAU R__seed_sme_batch1.sql.
BEGIN;

CREATE TEMP TABLE v6_case (n INT PRIMARY KEY, app_no TEXT, legal_name TEXT, tax_code TEXT, amount_billion INT,
  revenue NUMERIC, ebitda NUMERIC, total_debt NUMERIC, equity NUMERIC, cur_assets NUMERIC, cur_liab NUMERIC,
  cic_group TEXT, sanction TEXT) ON COMMIT DROP;
INSERT INTO v6_case VALUES
 (51, 'HSV-2026-09051', 'Cong ty CP Che bien Go Tra Vinh (mau benchmark v6)', '0319009051', 10, 400e9, 30e9, 50e9, 160e9, 120e9, 70e9, '1', 'CLEAR'),
 (52, 'HSV-2026-09052', 'Cong ty TNHH Gach men Hoang Gia (mau benchmark v6)', '0319009052', 15, 600e9, 45e9, 70e9, 250e9, 180e9, 100e9, '1', 'CLEAR'),
 (53, 'HSV-2026-09053', 'Cong ty CP Thuy san Cuu Long (mau benchmark v6)', '0319009053', 9, 300e9, 24e9, 30e9, 120e9, 90e9, 60e9, '1', 'CLEAR'),
 (54, 'HSV-2026-09054', 'Cong ty TNHH Noi that An Phu (mau benchmark v6)', '0319009054', 12, 280e9, 22e9, 0, 0, 0, 0, '1', 'CLEAR'),
 (55, 'HSV-2026-09055', 'Cong ty CP Cao su Dong Phuong (mau benchmark v6)', '0319009055', 15, 700e9, 22e9, 45e9, 180e9, 140e9, 90e9, '1', 'CLEAR'),
 (56, 'HSV-2026-09056', 'Cong ty CP Xuat nhap khau Hai Van (mau benchmark v6)', '0319009056', 10, 350e9, 28e9, 40e9, 140e9, 100e9, 60e9, '1', 'CLEAR'),
 (57, 'HSV-2026-09057', 'Cong ty TNHH Co khi Tan Thanh (mau benchmark v6)', '0319009057', 14, 450e9, 20e9, 40e9, 150e9, 110e9, 65e9, '1', 'CLEAR'),
 (58, 'HSV-2026-09058', 'Cong ty CP Dien lanh Viet Tien (mau benchmark v6)', '0319009058', 60, 1500e9, 80e9, 180e9, 700e9, 500e9, 280e9, '1', 'CLEAR');

CREATE FUNCTION pg_temp.u(prefix TEXT, n INT, k INT DEFAULT 0) RETURNS UUID LANGUAGE sql IMMUTABLE AS $$
  SELECT (prefix || '-0000-4000-8000-' || lpad(n::TEXT, 6, '0') || lpad(k::TEXT, 6, '0'))::UUID $$;

INSERT INTO customer.party (id, party_type, display_name, status, created_at, created_by, updated_at, updated_by, version)
SELECT pg_temp.u('55000000', n, 0), 'ORGANIZATION', legal_name, 'ACTIVE', now(),
       '10000000-0000-4000-8000-000000000001', now(), '10000000-0000-4000-8000-000000000001', 1
FROM v6_case
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO customer.organization_profile (party_id, legal_name, trading_name, business_type, registration_number_hash,
    tax_code_hash, incorporation_date, industry_code, legal_representative_party_id, updated_at)
SELECT pg_temp.u('55000000', n, 0), legal_name, legal_name, 'JSC',
       encode(sha256(convert_to('REG-' || tax_code, 'UTF8')), 'hex'), encode(sha256(convert_to(tax_code, 'UTF8')), 'hex'),
       DATE '2014-01-01' + ((n % 40) * 97), '2599', NULL, now()
FROM v6_case
ON CONFLICT (party_id) DO UPDATE SET legal_name = EXCLUDED.legal_name, updated_at = now();

INSERT INTO customer.customer (id, party_id, customer_number, customer_segment, home_branch_id, relationship_manager_id,
    onboarding_date, kyc_status, risk_rating, risk_rating_as_of, status, created_at, updated_at, version)
SELECT pg_temp.u('56000000', n, 0), pg_temp.u('55000000', n, 0), 'CIF-SME-' || lpad(n::TEXT, 3, '0'), 'SME',
       '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
       DATE '2020-01-01' + (n * 37), 'VERIFIED', NULL, NULL, 'ACTIVE', now(), now(), 1
FROM v6_case
ON CONFLICT (id) DO UPDATE SET customer_number = EXCLUDED.customer_number, updated_at = now();

INSERT INTO credit.loan_application (id, application_number, primary_customer_id, product_id, requested_amount, currency,
    requested_term_months, loan_purpose, interest_rate_assumption, repayment_method, status, assigned_employee_id,
    submitted_at, created_at, created_by, updated_at, updated_by, version, approval_tier, withdraw_reason)
SELECT pg_temp.u('75000000', n, 0), app_no, pg_temp.u('56000000', n, 0), '45900000-0000-4000-8000-000000000001',
       amount_billion::numeric * 1e9, 'VND', 24, 'WORKING_CAPITAL', 0.09500000, 'INTEREST_MONTHLY_PRINCIPAL_AT_MATURITY',
       'CHECKING', '10000000-0000-4000-8000-000000000001', NULL, now(), '10000000-0000-4000-8000-000000000001', now(),
       '10000000-0000-4000-8000-000000000001', 1, 2, NULL
FROM v6_case
ON CONFLICT (id) DO UPDATE SET requested_amount = EXCLUDED.requested_amount;

INSERT INTO credit.loan_party (id, loan_application_id, party_id, party_role, created_at)
SELECT pg_temp.u('75100000', n, 0), pg_temp.u('75000000', n, 0), pg_temp.u('55000000', n, 0), 'PRIMARY_BORROWER', now()
FROM v6_case
ON CONFLICT (id) DO NOTHING;

INSERT INTO credit.sme_financial_year (customer_id, fiscal_year, revenue, ebitda, total_debt, equity, current_assets,
    current_liabilities, source_ref, missing_fields)
SELECT pg_temp.u('56000000', n, 0), 2025, revenue, ebitda, total_debt, equity, cur_assets, cur_liab,
       'DU_LIEU_MAU benchmark v6',
       CASE WHEN n IN (51, 52, 55, 57, 58) THEN ARRAY['dscr', 'legal_representative'] ELSE '{}'::text[] END
FROM v6_case WHERE n <> 54  -- 54: khong co BCTC nao (thieu du lieu chan that)
ON CONFLICT (customer_id, fiscal_year) DO UPDATE SET revenue = EXCLUDED.revenue, ebitda = EXCLUDED.ebitda,
    total_debt = EXCLUDED.total_debt, equity = EXCLUDED.equity, current_assets = EXCLUDED.current_assets,
    current_liabilities = EXCLUDED.current_liabilities, source_ref = EXCLUDED.source_ref,
    missing_fields = EXCLUDED.missing_fields;

-- KYC/AML: ca nao cung sach (CLEAR).
INSERT INTO customer.kyc_assessment (id, customer_id, assessment_date, kyc_status, aml_risk_level, pep_status,
    sanction_status, beneficial_owner_verified, source_system, assessment_payload, created_at)
SELECT pg_temp.u('5b100000', n, 0), pg_temp.u('56000000', n, 0), now(), 'VERIFIED',
       CASE WHEN sanction = 'CLEAR' THEN 'LOW' ELSE 'HIGH' END, 'NOT_PEP', sanction, TRUE, 'DU_LIEU_MAU',
       '{"data_label":"DU_LIEU_MAU","note":"benchmark v6, chua tra cuu he thong that"}'::jsonb, now()
FROM v6_case
ON CONFLICT (id) DO UPDATE SET sanction_status = EXCLUDED.sanction_status, aml_risk_level = EXCLUDED.aml_risk_level;

-- Du no hien huu tai ngan hang (dong = khoan vay; k = so khoan).
INSERT INTO credit.existing_obligation (id, loan_application_id, party_id, lender_name, obligation_type,
    outstanding_balance, monthly_payment, credit_limit, currency, verified_status, source_type, as_of_date, created_at)
SELECT pg_temp.u('0b100000', v.n, v.k), pg_temp.u('75000000', v.n, 0), pg_temp.u('55000000', v.n, 0),
       'Ngan hang (mau)', 'TERM_LOAN', v.bal * 1e9, v.pay * 1e9, v.bal * 1e9, 'VND', 'VERIFIED', 'CREDIT_REPORT',
       current_date, now()
FROM (VALUES (51, 1, 4, 0.08), (52, 1, 7, 0.14), (53, 1, 3, 0.06), (54, 1, 5, 0.10), (55, 1, 5.5, 0.11), (56, 1, 4, 0.08), (57, 1, 5, 0.10), (58, 1, 25, 0.50), (58, 2, 15, 0.30)) AS v(n, k, bal, pay)
ON CONFLICT (id) DO UPDATE SET outstanding_balance = EXCLUDED.outstanding_balance, monthly_payment = EXCLUDED.monthly_payment;

-- CIC: nhom 1; 53 khong co ban CIC; 56 co ban CIC tra cuu cach day 45 ngay (qua han hieu luc 30 ngay, CS-TD-SME/2025 §6.3).
INSERT INTO banking.credit_report (id, customer_id, provider, report_reference, requested_at, report_as_of_date,
    risk_summary, storage_object_id, created_at, looked_up_by, consent_id, valid_until, source)
SELECT pg_temp.u('58100000', n, 0), pg_temp.u('56000000', n, 0), 'CIC', 'CIC-SIM-BM6-' || n,
       CASE WHEN n = 56 THEN now() - interval '45 days' ELSE now() END,
       CASE WHEN n = 56 THEN current_date - 45 ELSE current_date END,
       jsonb_build_object('debt_group', cic_group, 'source_label', 'He thong CIC (gia lap) · du lieu mau benchmark v6'),
       NULL, now(), '10000000-0000-4000-8000-000000000001', NULL, CASE WHEN n = 56 THEN current_date - 15 ELSE current_date + 29 END, 'SIMULATED'
FROM v6_case WHERE n <> 53  -- 53: chua co ket qua tra cuu CIC (thieu du lieu chan that)
ON CONFLICT (id) DO UPDATE SET risk_summary = EXCLUDED.risk_summary, requested_at = EXCLUDED.requested_at,
    report_as_of_date = EXCLUDED.report_as_of_date, report_reference = EXCLUDED.report_reference;

-- TSBD: chi 52, 57 (LTV dung tran 70%), 58 (hai TSBD, tong 150 ty).
INSERT INTO credit.collateral (id, loan_application_id, owner_party_id, collateral_type, description, declared_value,
    appraised_value, eligible_value, currency, valuation_date, valuation_status, ownership_verification_status,
    created_at, updated_at, version, on_leased_land)
SELECT pg_temp.u('77100000', v.n, v.k), pg_temp.u('75000000', v.n, 0), pg_temp.u('55000000', v.n, 0), v.typ,
       v.descr || ' (du lieu mau benchmark v6)', v.decl * 1e9, v.appr * 1e9, v.appr * 1e9, 'VND', current_date,
       'APPRAISED', v.own, now(), now(), 1, FALSE
FROM (VALUES
  (52, 1, 'REAL_ESTATE', 'Nha xuong va QSDD', 30, 30, 'VERIFIED'),
  (57, 1, 'REAL_ESTATE', 'Nha xuong va QSDD', 20, 20, 'VERIFIED'),
  (58, 1, 'REAL_ESTATE', 'Nha may va QSDD', 100, 100, 'VERIFIED'),
  (58, 2, 'REAL_ESTATE', 'Kho bai va QSDD', 50, 50, 'VERIFIED')) AS v(n, k, typ, descr, decl, appr, own)
ON CONFLICT (id) DO UPDATE SET declared_value = EXCLUDED.declared_value, appraised_value = EXCLUDED.appraised_value,
    eligible_value = EXCLUDED.eligible_value, ownership_verification_status = EXCLUDED.ownership_verification_status;

-- Tai khoan thanh toan: moi khach deu co.
-- Tien ve 12 thang khop doanh thu (khong ca nao co lech dong tien).
INSERT INTO banking.account (id, account_number_masked, account_number_hash, account_type, currency, branch_id, status,
    opened_at, closed_at, current_balance, balance_as_of, created_at, updated_at, version)
SELECT pg_temp.u('75200000', n, 0), '******' || lpad(n::TEXT, 4, '0'), encode(sha256(convert_to('BM6-ACC-' || n, 'UTF8')), 'hex'),
       'PAYMENT', 'VND', '30000000-0000-4000-8000-000000000002', 'ACTIVE', now() - interval '3 years', NULL,
       5e9, now(), now(), now(), 1
FROM v6_case
ON CONFLICT (id) DO NOTHING;
INSERT INTO banking.account_holder (id, account_id, party_id, holder_role, valid_from, valid_until, created_at)
SELECT pg_temp.u('75300000', n, 0), pg_temp.u('75200000', n, 0), pg_temp.u('55000000', n, 0), 'PRIMARY',
       current_date - 1000, NULL, now()
FROM v6_case
ON CONFLICT (id) DO NOTHING;
INSERT INTO banking.account_monthly_summary (account_id, year_month, total_inflow, total_outflow, salary_inflow,
    loan_payment, cash_deposit, average_balance, minimum_balance, maximum_balance, transaction_count, computed_at)
SELECT pg_temp.u('75200000', c.n, 0), (date_trunc('month', current_date) - m * interval '1 month')::date,
       c.revenue / 12 * 0.9, c.revenue / 12 * 0.85, 0, 0, 0,
       5e9, 3e9, 8e9, 120, now()
FROM v6_case c, generate_series(0, 11) AS m
ON CONFLICT (account_id, year_month) DO UPDATE SET total_inflow = EXCLUDED.total_inflow;
COMMIT;
