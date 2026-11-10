-- R__seed_demo_scenes: ho so DEMO them cho canh "Can bo sung" (docs/agent/demo-data.md).
-- Khach SME moi, o buoc APPRAISAL, CHUA CO BCTC nao (thieu du lieu chan that) nen doi agent dung "Can bo sung".
-- Cac canh khac dung ho so co san (00192, 00184, 00187, 00213). Ten, so lieu hu cau; moi dong la DU LIEU MAU.
-- Idempotent: dua ho so ve dung buoc APPRAISAL moi lan chay (xoa hep chi tren ho so nay). Chay SAU R__seed_sme_batch1.sql.
BEGIN;

CREATE FUNCTION pg_temp.u(prefix TEXT, k INT DEFAULT 0) RETURNS UUID LANGUAGE sql IMMUTABLE AS $$
  SELECT (prefix || '-0000-4000-8000-' || lpad('91', 6, '0') || lpad(k::TEXT, 6, '0'))::UUID $$;

-- Don dau ra cua lan demo truoc (quyet dinh, buoc, tai lieu bo sung phat sinh) cua dung ho so nay.
DELETE FROM credit.loan_decision WHERE loan_application_id = pg_temp.u('75000000');
DELETE FROM credit.case_step WHERE loan_application_id = pg_temp.u('75000000');
DELETE FROM credit.case_flag WHERE loan_application_id = pg_temp.u('75000000');
DELETE FROM credit.pre_disbursement_condition WHERE loan_application_id = pg_temp.u('75000000');

INSERT INTO customer.party (id, party_type, display_name, status, created_at, created_by, updated_at, updated_by, version)
VALUES (pg_temp.u('55000000'), 'ORGANIZATION', 'CTCP Thực phẩm Sạch Việt Tiến', 'ACTIVE', now(),
        '10000000-0000-4000-8000-000000000001', now(), '10000000-0000-4000-8000-000000000001', 1)
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO customer.organization_profile (party_id, legal_name, trading_name, business_type, registration_number_hash,
    tax_code_hash, incorporation_date, industry_code, legal_representative_party_id, updated_at)
VALUES (pg_temp.u('55000000'), 'CTCP Thực phẩm Sạch Việt Tiến', 'CTCP Thực phẩm Sạch Việt Tiến', 'JSC',
        encode(sha256(convert_to('REG-0319009091', 'UTF8')), 'hex'), encode(sha256(convert_to('0319009091', 'UTF8')), 'hex'),
        DATE '2016-03-01', '2599', NULL, now())
ON CONFLICT (party_id) DO UPDATE SET legal_name = EXCLUDED.legal_name, updated_at = now();

INSERT INTO customer.customer (id, party_id, customer_number, customer_segment, home_branch_id, relationship_manager_id,
    onboarding_date, kyc_status, risk_rating, risk_rating_as_of, status, created_at, updated_at, version)
VALUES (pg_temp.u('56000000'), pg_temp.u('55000000'), 'CIF-DEMO-091', 'SME', '30000000-0000-4000-8000-000000000002',
        NULL, DATE '2023-05-10', 'VERIFIED', NULL, NULL, 'ACTIVE', now(), now(), 1)
ON CONFLICT (id) DO UPDATE SET customer_number = EXCLUDED.customer_number, relationship_manager_id = NULL, updated_at = now();

INSERT INTO credit.loan_application (id, application_number, primary_customer_id, product_id, requested_amount, currency,
    requested_term_months, loan_purpose, interest_rate_assumption, repayment_method, status, assigned_employee_id,
    submitted_at, created_at, created_by, updated_at, updated_by, version, approval_tier, withdraw_reason)
VALUES (pg_temp.u('75000000'), 'HSV-2026-00223', pg_temp.u('56000000'), '45900000-0000-4000-8000-000000000001',
        20e9, 'VND', 24, 'WORKING_CAPITAL', 0.09500000, 'INTEREST_MONTHLY_PRINCIPAL_AT_MATURITY',
        'APPRAISAL', '10000000-0000-4000-8000-000000000008', NULL, now(), '10000000-0000-4000-8000-000000000001', now(),
        '10000000-0000-4000-8000-000000000001', 1, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET status = 'APPRAISAL', assigned_employee_id = '10000000-0000-4000-8000-000000000008',
    requested_amount = EXCLUDED.requested_amount, approval_tier = NULL, withdraw_reason = NULL, updated_at = now();

INSERT INTO credit.loan_party (id, loan_application_id, party_id, party_role, created_at)
VALUES (pg_temp.u('75100000'), pg_temp.u('75000000'), pg_temp.u('55000000'), 'PRIMARY_BORROWER', now())
ON CONFLICT (id) DO NOTHING;

-- Buoc: QHKH soan -> Kiem tra (dat) -> Tham dinh dang mo.
INSERT INTO credit.case_step (id, loan_application_id, step_code, assignee_employee_id, received_at, due_at, completed_at, result, created_by, created_at)
VALUES
 (pg_temp.u('76000000', 1), pg_temp.u('75000000'), 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', now() - interval '3 days', NULL,
  now() - interval '2 days', 'SUBMITTED', '10000000-0000-4000-8000-000000000001', now() - interval '3 days'),
 (pg_temp.u('76000000', 2), pg_temp.u('75000000'), 'CHECKING', '10000000-0000-4000-8000-000000000003', now() - interval '2 days',
  credit.add_workdays(now() - interval '2 days', 2), now() - interval '1 day', 'PASSED', '10000000-0000-4000-8000-000000000001', now() - interval '2 days'),
 (pg_temp.u('76000000', 3), pg_temp.u('75000000'), 'APPRAISAL', '10000000-0000-4000-8000-000000000008', now() - interval '1 day',
  credit.add_workdays(now() - interval '1 day', 5), NULL, NULL, '10000000-0000-4000-8000-000000000003', now() - interval '1 day');

-- KYC sach, CIC nhom 1, TSBD da xac minh, tai khoan thanh toan: chi thieu BCTC (khong chen sme_financial_year).
INSERT INTO customer.kyc_assessment (id, customer_id, assessment_date, kyc_status, aml_risk_level, pep_status,
    sanction_status, beneficial_owner_verified, source_system, assessment_payload, created_at)
VALUES (pg_temp.u('5b000000'), pg_temp.u('56000000'), now(), 'VERIFIED', 'LOW', 'NOT_PEP', 'CLEAR', TRUE, 'DU_LIEU_MAU',
        '{"data_label":"DU_LIEU_MAU","note":"Ket qua minh hoa, chua tra cuu he thong that"}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO banking.credit_report (id, customer_id, provider, report_reference, requested_at, report_as_of_date,
    risk_summary, storage_object_id, created_at, looked_up_by, consent_id, valid_until, source)
VALUES (pg_temp.u('58100000'), pg_temp.u('56000000'), 'CIC', 'CIC-SIM-DEMO-91', now(), current_date,
        '{"debt_group":"1","source_label":"He thong CIC (gia lap) · du lieu mau demo"}'::jsonb, NULL, now(),
        '10000000-0000-4000-8000-000000000001', NULL, current_date + 29, 'SIMULATED')
ON CONFLICT (id) DO UPDATE SET requested_at = now(), report_as_of_date = current_date, valid_until = current_date + 29;

INSERT INTO credit.collateral (id, loan_application_id, owner_party_id, collateral_type, description, declared_value,
    appraised_value, eligible_value, currency, valuation_date, valuation_status, ownership_verification_status,
    created_at, updated_at, version, on_leased_land)
VALUES (pg_temp.u('77100000'), pg_temp.u('75000000'), pg_temp.u('55000000'), 'REAL_ESTATE',
        'Nhà xưởng và QSDĐ (dữ liệu mẫu demo)', 30e9, 30e9, 30e9, 'VND', current_date, 'APPRAISED', 'VERIFIED', now(), now(), 1, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO banking.account (id, account_number_masked, account_number_hash, account_type, currency, branch_id, status,
    opened_at, closed_at, current_balance, balance_as_of, created_at, updated_at, version)
VALUES (pg_temp.u('75200000'), '******0091', encode(sha256(convert_to('DEMO-ACC-91', 'UTF8')), 'hex'), 'PAYMENT', 'VND',
        '30000000-0000-4000-8000-000000000002', 'ACTIVE', now() - interval '3 years', NULL, 3e9, now(), now(), now(), 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO banking.account_holder (id, account_id, party_id, holder_role, valid_from, valid_until, created_at)
VALUES (pg_temp.u('75300000'), pg_temp.u('75200000'), pg_temp.u('55000000'), 'PRIMARY', current_date - 1000, NULL, now())
ON CONFLICT (id) DO NOTHING;
COMMIT;
