-- V029: so lieu tai chinh nhieu nam cho KHDN (chua co nguon that trong Postgres).
-- DU LIEU MAU co nhan: doanh thu, EBITDA lay tu bo ho so (ground truth eval_ocr.py);
-- 2025 VinaNova lay tu cac truong da seed (document.extracted_field). Cot khong co so
-- de NULL va ghi vao missing_fields. KHONG co debt_service: khong ep so cho khop DSCR.
CREATE TABLE credit.sme_financial_year (
    customer_id UUID NOT NULL,
    fiscal_year INTEGER NOT NULL,
    revenue NUMERIC(24,4) NULL,
    ebitda NUMERIC(24,4) NULL,
    total_debt NUMERIC(24,4) NULL,
    equity NUMERIC(24,4) NULL,
    current_assets NUMERIC(24,4) NULL,
    current_liabilities NUMERIC(24,4) NULL,
    data_label VARCHAR(30) NOT NULL DEFAULT 'DU_LIEU_MAU',
    source_ref TEXT NOT NULL,
    missing_fields TEXT[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (customer_id, fiscal_year),
    CONSTRAINT ck_sme_financial_year_label CHECK (data_label IN ('DU_LIEU_MAU'))
);
ALTER TABLE credit.sme_financial_year ENABLE ROW LEVEL SECURITY;
CREATE POLICY sme_financial_year_select_policy ON credit.sme_financial_year
    FOR SELECT USING (identity.can_read_customer(identity.current_employee_id(), customer_id));
GRANT SELECT ON credit.sme_financial_year TO bank_engine;
COMMENT ON TABLE credit.sme_financial_year IS 'Sample multi-year SME financials (labelled DU_LIEU_MAU); NULL = missing figure.';

INSERT INTO credit.sme_financial_year
    (customer_id, fiscal_year, revenue, ebitda, total_debt, equity, current_assets,
     current_liabilities, source_ref, missing_fields) VALUES
 ('56000000-0000-4000-8000-000000000001', 2023, 520e9, 62e9, NULL, NULL, NULL, NULL,
  'GT eval_ocr.py CR-A01 (doanh thu, EBITDA)', '{total_debt,equity,current_assets,current_liabilities}'),
 ('56000000-0000-4000-8000-000000000001', 2024, 610e9, 78e9, NULL, NULL, NULL, NULL,
  'GT eval_ocr.py CR-A01 (doanh thu, EBITDA)', '{total_debt,equity,current_assets,current_liabilities}'),
 ('56000000-0000-4000-8000-000000000001', 2025, 705e9, 98e9, 56e9, 1018.5e9, 864.5e9, 308.5e9,
  'GT eval_ocr.py CR-A01 + truong seed document.extracted_field (rev, ebitda, debt, eq, ca, cl)', '{}'),
 ('56000000-0000-4000-8000-000000000002', 2023, 420e9, 42e9, NULL, NULL, NULL, NULL,
  'GT eval_ocr.py CR-B02 (doanh thu, EBITDA)', '{total_debt,equity,current_assets,current_liabilities}'),
 ('56000000-0000-4000-8000-000000000002', 2024, 485e9, 43e9, NULL, NULL, NULL, NULL,
  'GT eval_ocr.py CR-B02 (doanh thu, EBITDA)', '{total_debt,equity,current_assets,current_liabilities}'),
 ('56000000-0000-4000-8000-000000000002', 2025, 530e9, 38e9, NULL, NULL, NULL, NULL,
  'GT eval_ocr.py CR-B02 (doanh thu, EBITDA)', '{total_debt,equity,current_assets,current_liabilities}'),
 ('56000000-0000-4000-8000-000000000011', 2023, 360e9, 14e9, NULL, NULL, NULL, NULL,
  'GT eval_ocr.py CR-C03 (doanh thu, EBITDA)', '{total_debt,equity,current_assets,current_liabilities}'),
 ('56000000-0000-4000-8000-000000000011', 2024, 410e9, 8e9, NULL, NULL, NULL, NULL,
  'GT eval_ocr.py CR-C03 (doanh thu, EBITDA)', '{total_debt,equity,current_assets,current_liabilities}'),
 ('56000000-0000-4000-8000-000000000011', 2025, 395e9, -22e9, NULL, NULL, NULL, NULL,
  'GT eval_ocr.py CR-C03 (doanh thu, EBITDA)', '{total_debt,equity,current_assets,current_liabilities}');
