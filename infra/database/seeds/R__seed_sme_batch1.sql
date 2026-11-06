-- R__seed_sme_batch1: du lieu mau SME dot 1 (docs/business/rules.md muc C, F-DOC, F2-F4,
-- "Chot them"; mockup docs/design/batch-1/content). Moi dong la DU LIEU MAU (source 'SEED' /
-- ghi chu "du lieu mau"); ten doanh nghiep, ngan hang deu hu cau (G13).
--
-- Ngay neo (rules.md Q-Q): anchor = ngay lam viec gan nhat <= hom nay (gio Viet Nam).
-- Mockup neo Thu Nam 05/11/2026; moi ngay trong kich ban ghi bang so ngay lam viec lech so voi
-- 05/11 (vd. 30/10 = -4, 04/11 = -1) va dich theo anchor bang pg_temp.wd(n), nen cac khoang
-- "con n ngay LV" giu dung o moi ngay chay. Ngay lich su xa (BCTC 2025, dieu le 2022...) giu
-- nguyen; vai moc lich cu the (lich su QHKH, hop dong dau ra) dich theo so ngay lich.
-- due_at moi buoc = credit.add_workdays(received_at, sla_parameter) nhu credit.apply_transition.
--
-- Tai lieu chi o muc metadata: document_version tro storage.object_metadata khong co file tren
-- MinIO (khoa 'seed/sme-batch1/...'); khong tai file nao len.
-- Idempotent: ON CONFLICT (id) DO UPDATE; xoa hep (chi dong la tren cac ho so mau nay) de
-- dua ho so ve dung trang thai kich ban khi chay lai truoc moi lan nghiem thu.
SET client_encoding = 'UTF8';

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Ham tro giup (chi trong phien seed)
-- ---------------------------------------------------------------------------
CREATE FUNCTION pg_temp.id(prefix TEXT, n INT) RETURNS UUID
LANGUAGE sql IMMUTABLE AS $$
    SELECT (prefix || '-0000-4000-8000-' || lpad(n::TEXT, 12, '0'))::UUID
$$;

CREATE FUNCTION pg_temp.sid(prefix TEXT, a INT, b INT) RETURNS UUID
LANGUAGE sql IMMUTABLE AS $$
    SELECT (prefix || '-0000-4000-8000-' || lpad(a::TEXT, 6, '0') || lpad(b::TEXT, 6, '0'))::UUID
$$;

CREATE FUNCTION pg_temp.anchor() RETURNS DATE
LANGUAGE sql STABLE AS $$
    SELECT max(day)::DATE
    FROM generate_series(
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE - 14,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE,
        INTERVAL '1 day'
    ) AS day
    WHERE credit.is_workday(day::DATE)
$$;

-- Ngay lam viec thu n tinh tu anchor (n am = ve truoc).
CREATE FUNCTION pg_temp.wd(n INT) RETURNS DATE
LANGUAGE plpgsql STABLE AS $$
DECLARE
    d DATE := pg_temp.anchor();
    k INT := abs(n);
BEGIN
    WHILE k > 0 LOOP
        d := d + sign(n)::INT;
        IF credit.is_workday(d) THEN
            k := k - 1;
        END IF;
    END LOOP;
    RETURN d;
END
$$;

CREATE FUNCTION pg_temp.at(n INT, t TIME) RETURNS TIMESTAMPTZ
LANGUAGE sql STABLE AS $$
    SELECT (pg_temp.wd(n) + t) AT TIME ZONE 'Asia/Ho_Chi_Minh'
$$;

-- Dich mot ngay lich cua mockup theo so ngay lich giua anchor va 05/11/2026.
CREATE FUNCTION pg_temp.shift(d DATE) RETURNS DATE
LANGUAGE sql STABLE AS $$
    SELECT d + (pg_temp.anchor() - DATE '2026-11-05')
$$;

-- ---------------------------------------------------------------------------
-- 1. Ngay nghi le Viet Nam 2026-2027 (rules.md Q-F)
-- ---------------------------------------------------------------------------
-- Can cu: Bo luat Lao dong 2019 Dieu 112 (Tet Duong lich, 5 ngay Tet Am lich, Gio To 10/3 AL,
-- 30/4, 1/5, Quoc khanh 2/9 + 1 ngay lien ke); Dieu 111/112: le trung ngay nghi hang tuan thi
-- nghi bu ngay lam viec ke tiep. Ngay Van hoa Viet Nam 24/11: Nghi quyet 28/2026/QH16
-- (24/4/2026, hieu luc 1/7/2026). Chi ghi ngay thu Hai-thu Sau (thu Bay, Chu nhat da la ngay
-- nghi trong credit.is_workday). Ngay hoan doi cho cong chuc (lam bu thu Bay) KHONG dua vao.
--   2026 Tet Binh Ngo: VPCP 9859/VPCP-KGVX (13/10/2025), nghi 14-22/02/2026.
--   2026 Quoc khanh: Bo Noi vu thong bao nghi 01/9 va 02/9/2026.
--   2027 Tet Dinh Mui, Quoc khanh, Ngay Van hoa 2026: VPCP 10065/VPCP-KGVX (02/10/2026):
--        Tet 04-10/02/2027; Quoc khanh 02-03/9/2027; 24/11/2026 nghi 1 ngay, khong hoan doi.
INSERT INTO credit.holiday (day, name)
VALUES
    (DATE '2026-01-01', 'Tết Dương lịch 2026'),
    (DATE '2026-02-16', 'Tết Nguyên đán Bính Ngọ (28 tháng Chạp)'),
    (DATE '2026-02-17', 'Tết Nguyên đán Bính Ngọ (mùng 1)'),
    (DATE '2026-02-18', 'Tết Nguyên đán Bính Ngọ (mùng 2)'),
    (DATE '2026-02-19', 'Tết Nguyên đán Bính Ngọ (mùng 3)'),
    (DATE '2026-02-20', 'Tết Nguyên đán Bính Ngọ (mùng 4)'),
    -- Gio To 10/3 AL = CN 26/4/2026, nghi bu thu Hai (BLLD 2019 Dieu 111).
    (DATE '2026-04-27', 'Nghỉ bù Giỗ Tổ Hùng Vương 2026'),
    (DATE '2026-04-30', 'Ngày Chiến thắng 30/4/2026'),
    (DATE '2026-05-01', 'Ngày Quốc tế Lao động 1/5/2026'),
    (DATE '2026-09-01', 'Quốc khánh 2026 (ngày liền kề)'),
    (DATE '2026-09-02', 'Quốc khánh 2/9/2026'),
    (DATE '2026-11-24', 'Ngày Văn hóa Việt Nam 2026'),
    (DATE '2027-01-01', 'Tết Dương lịch 2027'),
    (DATE '2027-02-04', 'Tết Nguyên đán Đinh Mùi (28 tháng Chạp)'),
    (DATE '2027-02-05', 'Tết Nguyên đán Đinh Mùi (29 tháng Chạp)'),
    (DATE '2027-02-08', 'Tết Nguyên đán Đinh Mùi (mùng 3)'),
    (DATE '2027-02-09', 'Tết Nguyên đán Đinh Mùi (mùng 4)'),
    (DATE '2027-02-10', 'Tết Nguyên đán Đinh Mùi (mùng 5)'),
    -- dự kiến: Gio To 10/3 AL Dinh Mui = thu Sau 16/4/2027 (quy doi am lich, chua co van ban rieng).
    (DATE '2027-04-16', 'Giỗ Tổ Hùng Vương 2027'),
    (DATE '2027-04-30', 'Ngày Chiến thắng 30/4/2027'),
    -- dự kiến: 1/5/2027 la thu Bay, nghi bu thu Hai 3/5 theo BLLD 2019 (chua co thong bao).
    (DATE '2027-05-03', 'Nghỉ bù Quốc tế Lao động 2027'),
    (DATE '2027-09-02', 'Quốc khánh 2/9/2027'),
    (DATE '2027-09-03', 'Quốc khánh 2027 (ngày liền kề)'),
    -- dự kiến: 24/11/2027 (thu Tu) theo NQ 28/2026/QH16; chua co thong bao lich nghi 2027.
    (DATE '2027-11-24', 'Ngày Văn hóa Việt Nam 2027')
ON CONFLICT (day) DO UPDATE
SET name = EXCLUDED.name;

-- ---------------------------------------------------------------------------
-- 2. San pham va chinh sach CS-TD-SME/2025 (Q-R), danh muc §6.1 (F-DOC)
-- ---------------------------------------------------------------------------
INSERT INTO credit.loan_product (
    id, product_code, product_name, customer_type, loan_purpose, min_amount, max_amount,
    min_term_months, max_term_months, status, effective_from, effective_until, created_at,
    updated_at
)
VALUES (
    '45900000-0000-4000-8000-000000000001', 'SME-VLD', 'Hạn mức vốn lưu động KHDN SME (dữ liệu mẫu)',
    'ORGANIZATION', 'WORKING_CAPITAL', 1000000000.0000, 500000000000.0000, 3, 60, 'ACTIVE',
    DATE '2025-01-01', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET product_code = EXCLUDED.product_code,
    product_name = EXCLUDED.product_name,
    customer_type = EXCLUDED.customer_type,
    loan_purpose = EXCLUDED.loan_purpose,
    min_amount = EXCLUDED.min_amount,
    max_amount = EXCLUDED.max_amount,
    min_term_months = EXCLUDED.min_term_months,
    max_term_months = EXCLUDED.max_term_months,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO storage.object_metadata (
    id, bucket_name, object_key, object_version_id, etag, sha256, size_bytes, mime_type,
    storage_class, encryption_type, retention_until, legal_hold, created_by, created_at, deleted_at
)
VALUES (
    '45600000-0000-4000-8000-000000000001', 'policy-documents',
    'seed/sme-batch1/policies/CS-TD-SME-2025/original.pdf', NULL, NULL, repeat('0', 64), 0,
    'application/pdf', 'STANDARD', 'SSE-S3', NULL, FALSE,
    '10000000-0000-4000-8000-000000000007', CURRENT_TIMESTAMP, NULL
)
ON CONFLICT (id) DO UPDATE
SET bucket_name = EXCLUDED.bucket_name,
    object_key = EXCLUDED.object_key,
    mime_type = EXCLUDED.mime_type,
    deleted_at = NULL;

INSERT INTO document.document (
    id, document_type, document_subtype, title, owner_party_id, classification, document_date,
    valid_from, valid_until, verification_status, processing_status, created_by, created_at,
    updated_at, version
)
VALUES (
    '45500000-0000-4000-8000-000000000001', 'CREDIT_POLICY', 'SME',
    'CS-TD-SME/2025 – Quy trình và chính sách cấp tín dụng KHDN SME (dữ liệu mẫu)', NULL,
    'INTERNAL', DATE '2025-01-01', DATE '2025-01-01', NULL, 'VERIFIED', 'COMPLETED',
    '10000000-0000-4000-8000-000000000007', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    verification_status = EXCLUDED.verification_status,
    processing_status = EXCLUDED.processing_status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO document.document_version (
    id, document_id, version_number, original_object_id, original_filename, mime_type, file_size,
    sha256, uploaded_by, uploaded_at, scan_status, is_current, created_at
)
VALUES (
    '45700000-0000-4000-8000-000000000001', '45500000-0000-4000-8000-000000000001', 1,
    '45600000-0000-4000-8000-000000000001', 'CS-TD-SME-2025.pdf', 'application/pdf', 0,
    repeat('0', 64), '10000000-0000-4000-8000-000000000007', CURRENT_TIMESTAMP, 'CLEAN', TRUE,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET original_object_id = EXCLUDED.original_object_id,
    original_filename = EXCLUDED.original_filename,
    is_current = TRUE;

INSERT INTO policy.policy (
    id, policy_code, policy_name, policy_type, owner_department_id, status, created_at, updated_at
)
VALUES (
    '45000000-0000-4000-8000-000000000001', 'CS-TD-SME/2025',
    'Quy trình và chính sách cấp tín dụng KHDN SME', 'CREDIT',
    '31000000-0000-4000-8000-000000000004', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET policy_code = EXCLUDED.policy_code,
    policy_name = EXCLUDED.policy_name,
    policy_type = EXCLUDED.policy_type,
    owner_department_id = EXCLUDED.owner_department_id,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO policy.policy_version (
    id, policy_id, version_number, effective_from, effective_until, approved_by, approved_at,
    source_document_id, status, created_at
)
VALUES (
    '45100000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', '2025',
    DATE '2025-01-01', NULL, '10000000-0000-4000-8000-000000000005',
    TIMESTAMPTZ '2025-01-01 00:00:00+07', '45500000-0000-4000-8000-000000000001', 'ACTIVE',
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET policy_id = EXCLUDED.policy_id,
    version_number = EXCLUDED.version_number,
    effective_from = EXCLUDED.effective_from,
    effective_until = EXCLUDED.effective_until,
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at,
    source_document_id = EXCLUDED.source_document_id,
    status = EXCLUDED.status;

-- Noi dung theo drawer chinh sach cua shell mockup (design-system.md muc 18).
INSERT INTO policy.policy_clause (
    id, policy_version_id, clause_number, title, content, page_number, embedding, metadata,
    created_at
)
VALUES
    ('45200000-0000-4000-8000-000000000001', '45100000-0000-4000-8000-000000000001', '1.2', 'Phạm vi SME',
     'KHDN SME theo phân khúc nội bộ: doanh thu năm ≤ 1.000 tỷ đồng.', 1, NULL,
     '{"category":"scope","revenue_max_vnd":1000000000000}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000002', '45100000-0000-4000-8000-000000000001', '2.3', 'SLA',
     'Kiểm tra hồ sơ 2 ngày LV · Thẩm định 5 · Ý kiến Rủi ro 3 · Phê duyệt 2. Thẩm định yêu cầu bổ sung: SLA tạm dừng, QHKH có 5 ngày LV; từ lúc HTTD ghi tài liệu mới đạt, SLA Thẩm định tính tiếp số ngày còn lại. Rủi ro trả về Thẩm định, hoặc Thẩm định nhận lại hồ sơ đã trả QHKH: SLA Thẩm định tính lại đủ 5 ngày LV từ ngày trả hoặc ngày nhận lại.', 2, NULL,
     '{"category":"sla","workdays":{"CHECKING":2,"APPRAISAL":5,"RISK_REVIEW":3,"APPROVAL":2,"CUSTOMER_SUPPLEMENT":5}}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000003', '45100000-0000-4000-8000-000000000001', '3.1', 'Thẩm quyền phê duyệt',
     'Theo tổng cấp tín dụng của khách và người có liên quan: ≤ 20 / 20–100 / > 100 tỷ (cấu hình được).', 3, NULL,
     '{"category":"authority","tiers_vnd":[20000000000,100000000000,null]}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000004', '45100000-0000-4000-8000-000000000001', '3.4', 'Tách bạch',
     'Không phê duyệt hoặc bỏ phiếu nếu đã tham gia bất kỳ bước nào của hồ sơ hoặc từng là QHKH quản lý khách hàng trong 2 năm gần nhất.', 3, NULL,
     '{"category":"separation","former_rm_years":2}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000005', '45100000-0000-4000-8000-000000000001', '4.1', 'Chất lượng BCTC',
     'BCTC phải có ý kiến chấp nhận toàn phần khi thuộc diện bắt buộc kiểm toán (tổng cấp tín dụng > 20 tỷ, §6.1).', 4, NULL,
     '{"category":"financial_statement","audited_above_vnd":20000000000}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000006', '45100000-0000-4000-8000-000000000001', '4.2', 'Khả năng trả nợ',
     'DSCR dự phóng ≥ 1,25 lần; Nợ vay/EBITDA sau cấp TD ≤ 3,5 lần; EBIT/chi phí lãi vay ≥ 2,0 lần.', 4, NULL,
     '{"category":"repayment","dscr_min":1.25,"debt_to_ebitda_max":3.5,"ebit_interest_min":2.0}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000007', '45100000-0000-4000-8000-000000000001', '4.4', 'Chỉ số vận hành',
     'Kỳ thu tiền bình quân và vòng quay hàng tồn kho theo ngưỡng của chính sách (kỳ thu tiền ≤ 90 ngày).', 5, NULL,
     '{"category":"operations","dso_max_days":90}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000008', '45100000-0000-4000-8000-000000000001', '5.2', 'Tập trung ngành',
     'Dư nợ một ngành không vượt hạn mức tỷ trọng do Rủi ro cấu hình.', 6, NULL,
     '{"category":"concentration"}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000009', '45100000-0000-4000-8000-000000000001', '6.1', 'Danh mục hồ sơ',
     'Gồm giấy đề nghị cấp tín dụng, văn bản đồng ý tra cứu CIC, BCTC (kiểm toán khi tổng cấp tín dụng > 20 tỷ), sao kê 12 tháng… (16 mục).', 7, NULL,
     '{"category":"checklist","items":16}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000010', '45100000-0000-4000-8000-000000000001', '6.3', 'Hiệu lực tài liệu',
     'CIC, sao kê, xác nhận dư nợ: 30 ngày từ ngày tra cứu/ngày ngân hàng cấp, tính tới ngày trình phê duyệt.', 7, NULL,
     '{"category":"validity","validity_days":30}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000011', '45100000-0000-4000-8000-000000000001', '6.4', 'Ngoại lệ',
     'QHKH/HTTD lập "Đề xuất ngoại lệ" kèm lý do; cấp phê duyệt chấp thuận hoặc từ chối cùng lúc với quyết định. CIC hết hiệu lực không được đề xuất ngoại lệ, trừ khi hệ thống CIC gián đoạn, và vẫn phải tra lại trước khi trình phê duyệt.', 8, NULL,
     '{"category":"exception"}'::jsonb, CURRENT_TIMESTAMP),
    ('45200000-0000-4000-8000-000000000012', '45100000-0000-4000-8000-000000000001', '7.1', 'LTV và TSBĐ',
     'Tỷ lệ cho vay trên giá trị TSBĐ theo loại tài sản (≤ 70%).', 9, NULL,
     '{"category":"collateral","ltv_max":0.70}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE
SET policy_version_id = EXCLUDED.policy_version_id,
    clause_number = EXCLUDED.clause_number,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    page_number = EXCLUDED.page_number,
    metadata = EXCLUDED.metadata;

INSERT INTO policy.checklist_rule (
    id, policy_version_id, rule_code, rule_name, conditions, status, created_at
)
VALUES (
    '45300000-0000-4000-8000-000000000001', '45100000-0000-4000-8000-000000000001', 'SME-6.1',
    'Danh mục hồ sơ KHDN SME (§6.1)',
    '{"customer_type":"ORGANIZATION","segment":"SME","clause":"6.1"}'::jsonb, 'ACTIVE',
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET policy_version_id = EXCLUDED.policy_version_id,
    rule_code = EXCLUDED.rule_code,
    rule_name = EXCLUDED.rule_name,
    conditions = EXCLUDED.conditions,
    status = EXCLUDED.status;

-- 16 muc theo thu tu F-DOC; requirement_code sap xep dung thu tu. document_type dung ma
-- cong chuyen buoc doc (app/workflow/gates.py, workflow_repository.py): CIC_CONSENT,
-- CIC_REPORT (khong ngoai le), FINANCIAL_STATEMENT + subtype AUDITED (E5),
-- BANK_STATEMENT (hieu luc 30 ngay, E6).
CREATE TEMP TABLE sme_requirement (
    k INT PRIMARY KEY,
    code TEXT NOT NULL,
    document_type TEXT NOT NULL,
    mandatory_level TEXT NOT NULL,
    description TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO sme_requirement VALUES
    (1, 'SME-01-CREDIT-REQUEST', 'CREDIT_APPLICATION_FORM', 'MANDATORY', 'Giấy đề nghị cấp tín dụng có chữ ký người đại diện.'),
    (2, 'SME-02-BUSINESS-REGISTRATION', 'BUSINESS_REGISTRATION', 'MANDATORY', 'Giấy chứng nhận đăng ký doanh nghiệp.'),
    (3, 'SME-03-CHARTER', 'COMPANY_CHARTER', 'MANDATORY', 'Điều lệ công ty.'),
    (4, 'SME-04-SHAREHOLDERS-RELATED', 'SHAREHOLDER_LIST', 'MANDATORY', 'Danh sách thành viên/cổ đông và bên liên quan.'),
    (5, 'SME-05-REPRESENTATIVE-ID', 'IDENTITY_DOCUMENT', 'MANDATORY', 'Giấy tờ tùy thân người đại diện theo pháp luật.'),
    (6, 'SME-06-BOARD-RESOLUTION', 'BOARD_RESOLUTION', 'MANDATORY', 'Nghị quyết/Quyết định về vay vốn và thế chấp.'),
    (7, 'SME-07-CIC-CONSENT', 'CIC_CONSENT', 'MANDATORY', 'Văn bản đồng ý tra cứu thông tin tín dụng CIC (E9; không được ngoại lệ).'),
    (8, 'SME-08-AUDITED-FS', 'FINANCIAL_STATEMENT', 'CONDITIONAL', 'BCTC năm gần nhất đã kiểm toán khi tổng cấp tín dụng > 20 tỷ (E5); từ 20 tỷ trở xuống chấp nhận BCTC đã nộp cơ quan thuế.'),
    (9, 'SME-09-QUARTERLY-FS', 'FINANCIAL_STATEMENT', 'MANDATORY', 'BCTC quý gần nhất (không quá 3 tháng).'),
    (10, 'SME-10-RECEIVABLES-INVENTORY', 'RECEIVABLES_INVENTORY_LIST', 'MANDATORY', 'Bảng kê công nợ phải thu, phải trả và hàng tồn kho.'),
    (11, 'SME-11-BANK-STATEMENT-12M', 'BANK_STATEMENT', 'MANDATORY', 'Sao kê tài khoản 12 tháng; hiệu lực 30 ngày từ ngày ngân hàng cấp (E6).'),
    (12, 'SME-12-VAT-RETURNS', 'TAX_RETURN', 'MANDATORY', 'Tờ khai thuế GTGT 2 quý gần nhất.'),
    (13, 'SME-13-CIC-REPORT', 'CIC_REPORT', 'MANDATORY', 'Kết quả tra cứu CIC do ngân hàng thực hiện (Q2; hiệu lực 30 ngày, Q10).'),
    (14, 'SME-14-BUSINESS-PLAN', 'BUSINESS_PLAN', 'MANDATORY', 'Phương án kinh doanh và sử dụng vốn.'),
    (15, 'SME-15-SALES-CONTRACTS', 'SALES_CONTRACT', 'MANDATORY', 'Hợp đồng đầu ra (tối thiểu 2).'),
    (16, 'SME-16-COLLATERAL', 'COLLATERAL_DOCUMENT', 'CONDITIONAL', 'Hồ sơ pháp lý và chứng thư định giá TSBĐ (khi có TSBĐ).');

DELETE FROM policy.checklist_rule_requirement
WHERE checklist_rule_id = '45300000-0000-4000-8000-000000000001'
  AND id NOT IN (SELECT pg_temp.id('45400000', k) FROM sme_requirement);

INSERT INTO policy.checklist_rule_requirement (
    id, checklist_rule_id, requirement_code, document_type, mandatory_level,
    requirement_description, created_at
)
SELECT pg_temp.id('45400000', k), '45300000-0000-4000-8000-000000000001', code, document_type,
       mandatory_level, description, CURRENT_TIMESTAMP
FROM sme_requirement
ON CONFLICT (id) DO UPDATE
SET checklist_rule_id = EXCLUDED.checklist_rule_id,
    requirement_code = EXCLUDED.requirement_code,
    document_type = EXCLUDED.document_type,
    mandatory_level = EXCLUDED.mandatory_level,
    requirement_description = EXCLUDED.requirement_description;

-- ---------------------------------------------------------------------------
-- 3. Khach hang SME va ho so (hang cho mockup 03, rules.md muc C)
-- ---------------------------------------------------------------------------
-- n: so thu tu chung cho party (55..), customer (56..), loan (75..). Khach thuoc chi nhanh
-- HN-DEMO, QHKH = ...0001 (nhan vien mau duy nhat co vai tro QHKH; mockup ghi "CN Sai Gon").
CREATE TEMP TABLE sme_case (
    n INT PRIMARY KEY,
    app_no TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    tax_code TEXT NOT NULL,
    industry TEXT NOT NULL,
    amount_billion NUMERIC NOT NULL,
    status TEXT NOT NULL,
    approval_tier SMALLINT NULL,
    risk_rating TEXT NULL
) ON COMMIT DROP;

INSERT INTO sme_case VALUES
    (1, 'HSV-2026-00187', 'Công ty Cổ phần Bao bì VinaNova', 'CTCP Bao bì VinaNova', 'JSC', '0318888888', '1702', 80, 'APPRAISAL', NULL, NULL),
    (2, 'DX-2026-00412', 'Công ty TNHH Bao bì Mekong Flex', 'TNHH Bao bì Mekong Flex', 'LLC', '0317891234', '1702', 80, 'DRAFT', NULL, NULL),
    (3, 'HSV-2026-00192', 'Công ty Cổ phần Cơ khí Trường An', 'CTCP Cơ khí Trường An', 'JSC', '0319000003', '2592', 60, 'APPRAISAL', NULL, NULL),
    (4, 'HSV-2026-00184', 'Công ty Cổ phần Xây lắp Điện Sông Hàn', 'CTCP Xây lắp Điện Sông Hàn', 'JSC', '0319000004', '4321', 22, 'APPRAISAL', NULL, NULL),
    (5, 'HSV-2026-00196', 'Công ty Cổ phần Vật liệu Xây dựng Phú Điền', 'CTCP Vật liệu Xây dựng Phú Điền', 'JSC', '0319000005', '2395', 30, 'APPRAISAL_PENDING_INFO', NULL, NULL),
    (6, 'HSV-2026-00201', 'Công ty TNHH Dệt may Phúc Lâm', 'TNHH Dệt may Phúc Lâm', 'LLC', '0319000006', '1410', 15, 'RETURNED_TO_RM', NULL, NULL),
    (7, 'DX-2026-00405', 'Công ty Cổ phần Gỗ Nội thất Hưng Phát', 'CTCP Gỗ Nội thất Hưng Phát', 'JSC', '0319000007', '3100', 25, 'DRAFT', NULL, NULL),
    (8, 'HSV-2026-00211', 'Công ty Cổ phần Logistics Cảng Xanh Hải Phòng', 'CTCP Logistics Cảng Xanh Hải Phòng', 'JSC', '0319000008', '5224', 35, 'CHECKING', NULL, NULL),
    (9, 'HSV-2026-00213', 'Công ty TNHH Cơ khí Chính xác Đông Á', 'TNHH Cơ khí Chính xác Đông Á', 'LLC', '0319000009', '2592', 18, 'CHECKING', NULL, NULL),
    (10, 'HSV-2026-00215', 'Công ty Cổ phần Nông sản Tây Nguyên Xanh', 'CTCP Nông sản Tây Nguyên Xanh', 'JSC', '0319000010', '4620', 12, 'CHECKING', NULL, NULL),
    (11, 'HSV-2026-00176', 'Công ty Cổ phần Bao bì Đại Thành Global', 'CTCP Bao bì Đại Thành Global', 'JSC', '0319000011', '1702', 80, 'RISK_REVIEW', NULL, NULL),
    (12, 'HSV-2026-00181', 'Công ty TNHH Vận tải Biển Nam Phương', 'TNHH Vận tải Biển Nam Phương', 'LLC', '0319000012', '5012', 28, 'RISK_REVIEW', NULL, NULL),
    (13, 'HSV-2026-00163', 'Công ty Cổ phần Nhựa Kỹ thuật Thành Đạt', 'CTCP Nhựa Kỹ thuật Thành Đạt', 'JSC', '0319000013', '2220', 55, 'APPROVAL', 2, NULL),
    (14, 'HSV-2026-00170', 'Công ty Cổ phần Phân phối Dược Minh Tâm', 'CTCP Phân phối Dược Minh Tâm', 'JSC', '0319000014', '4649', 38, 'APPROVAL', 2, NULL),
    -- E8: nguoi phe duyet cap 2 duy nhat (...0005) tung la QHKH cua Bac Ha -> khong con ai cung
    -- cap -> len Hoi dong (Q-M, apply_transition), thay cho "chuyen Pham Thu Ha" cua mockup.
    (15, 'HSV-2026-00172', 'Công ty TNHH Thép Kết cấu Bắc Hà', 'TNHH Thép Kết cấu Bắc Hà', 'LLC', '0319000015', '2511', 70, 'COUNCIL_SESSION', 2, NULL),
    -- Q-P: > 100 ty -> buoc Hoi dong, "Chờ phiên Hội đồng – có ở đợt 2", khong tinh vao viec cua ai.
    (16, 'HSV-2026-00158', 'Công ty Cổ phần Thủy sản Hậu Giang Xanh', 'CTCP Thủy sản Hậu Giang Xanh', 'JSC', '0319000016', '1020', 150, 'COUNCIL_SESSION', 3, NULL),
    -- Ben lien quan cua Mekong Flex (gop 60% von): khach hien huu, du no 15,2 ty (khoan vay 17).
    (17, 'HSV-2025-00090', 'Công ty CP Đầu tư Mekong', 'Công ty CP Đầu tư Mekong', 'JSC', '0301234567', '6420', 20, 'APPROVED', NULL, 'A');

INSERT INTO customer.party (
    id, party_type, display_name, status, created_at, created_by, updated_at, updated_by, version
)
SELECT pg_temp.id('55000000', n), 'ORGANIZATION', short_name, 'ACTIVE', CURRENT_TIMESTAMP,
       '10000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP,
       '10000000-0000-4000-8000-000000000001', 1
FROM sme_case
ON CONFLICT (id) DO UPDATE
SET party_type = EXCLUDED.party_type,
    display_name = EXCLUDED.display_name,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = EXCLUDED.updated_by,
    version = customer.party.version + 1;

INSERT INTO customer.organization_profile (
    party_id, legal_name, trading_name, business_type, registration_number_hash, tax_code_hash,
    incorporation_date, industry_code, legal_representative_party_id, updated_at
)
SELECT pg_temp.id('55000000', n), legal_name, short_name, business_type,
       encode(sha256(convert_to('REG-' || tax_code, 'UTF8')), 'hex'),
       encode(sha256(convert_to(tax_code, 'UTF8')), 'hex'),
       DATE '2012-01-01' + (n * 211), industry, NULL, CURRENT_TIMESTAMP
FROM sme_case
ON CONFLICT (party_id) DO UPDATE
SET legal_name = EXCLUDED.legal_name,
    trading_name = EXCLUDED.trading_name,
    business_type = EXCLUDED.business_type,
    registration_number_hash = EXCLUDED.registration_number_hash,
    tax_code_hash = EXCLUDED.tax_code_hash,
    incorporation_date = EXCLUDED.incorporation_date,
    industry_code = EXCLUDED.industry_code,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO customer.customer (
    id, party_id, customer_number, customer_segment, home_branch_id, relationship_manager_id,
    onboarding_date, kyc_status, risk_rating, risk_rating_as_of, status, created_at, updated_at,
    version
)
SELECT pg_temp.id('56000000', n), pg_temp.id('55000000', n), 'CIF-SME-' || lpad(n::TEXT, 3, '0'),
       'SME', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
       -- VinaNova, Mekong Flex: khach moi (ngay mo = ngay lap de xuat).
       CASE n WHEN 1 THEN pg_temp.wd(-8) WHEN 2 THEN pg_temp.wd(-2)
              ELSE DATE '2020-01-01' + (n * 37) END,
       'VERIFIED', risk_rating, CASE WHEN risk_rating IS NULL THEN NULL ELSE pg_temp.anchor() END,
       'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1
FROM sme_case
ON CONFLICT (id) DO UPDATE
SET party_id = EXCLUDED.party_id,
    customer_number = EXCLUDED.customer_number,
    customer_segment = EXCLUDED.customer_segment,
    home_branch_id = EXCLUDED.home_branch_id,
    relationship_manager_id = EXCLUDED.relationship_manager_id,
    onboarding_date = EXCLUDED.onboarding_date,
    kyc_status = EXCLUDED.kyc_status,
    risk_rating = EXCLUDED.risk_rating,
    risk_rating_as_of = EXCLUDED.risk_rating_as_of,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP,
    version = customer.customer.version + 1;

-- E8 (rules.md C, Chot them): Bac Ha - nguoi phe duyet ...0005 "tung la QHKH quan ly khach
-- hang nay den 12/2024" (moc lich dich theo anchor de luon nam trong cua so 2 nam).
DELETE FROM customer.relationship_manager_history
WHERE customer_id IN (SELECT pg_temp.id('56000000', n) FROM sme_case);

INSERT INTO customer.relationship_manager_history (customer_id, employee_id, valid_from, valid_until)
VALUES
    (pg_temp.id('56000000', 15), '10000000-0000-4000-8000-000000000005',
     pg_temp.shift(DATE '2023-01-01'), pg_temp.shift(DATE '2024-12-31')),
    (pg_temp.id('56000000', 15), '10000000-0000-4000-8000-000000000001',
     pg_temp.shift(DATE '2025-01-01'), NULL);

INSERT INTO credit.loan_application (
    id, application_number, primary_customer_id, product_id, requested_amount, currency,
    requested_term_months, loan_purpose, interest_rate_assumption, repayment_method, status,
    assigned_employee_id, submitted_at, created_at, created_by, updated_at, updated_by, version,
    approval_tier, withdraw_reason
)
SELECT pg_temp.id('75000000', n), app_no, pg_temp.id('56000000', n),
       '45900000-0000-4000-8000-000000000001', amount_billion * 1000000000, 'VND', 12,
       'WORKING_CAPITAL', 0.09500000, 'INTEREST_MONTHLY_PRINCIPAL_AT_MATURITY', status,
       '10000000-0000-4000-8000-000000000001', NULL, CURRENT_TIMESTAMP,
       '10000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP,
       '10000000-0000-4000-8000-000000000001', 1, approval_tier, NULL
FROM sme_case
ON CONFLICT (id) DO UPDATE
SET application_number = EXCLUDED.application_number,
    primary_customer_id = EXCLUDED.primary_customer_id,
    product_id = EXCLUDED.product_id,
    requested_amount = EXCLUDED.requested_amount,
    currency = EXCLUDED.currency,
    requested_term_months = EXCLUDED.requested_term_months,
    loan_purpose = EXCLUDED.loan_purpose,
    interest_rate_assumption = EXCLUDED.interest_rate_assumption,
    repayment_method = EXCLUDED.repayment_method,
    status = EXCLUDED.status,
    assigned_employee_id = EXCLUDED.assigned_employee_id,
    approval_tier = EXCLUDED.approval_tier,
    submitted_at = NULL,
    withdraw_reason = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = EXCLUDED.updated_by,
    version = credit.loan_application.version + 1;

INSERT INTO credit.loan_party (id, loan_application_id, party_id, party_role, created_at)
SELECT pg_temp.id('75100000', n), pg_temp.id('75000000', n), pg_temp.id('55000000', n),
       'PRIMARY_BORROWER', CURRENT_TIMESTAMP
FROM sme_case
ON CONFLICT (id) DO UPDATE
SET loan_application_id = EXCLUDED.loan_application_id,
    party_id = EXCLUDED.party_id,
    party_role = EXCLUDED.party_role;

-- Khoan vay hien huu cua Cong ty CP Dau tu Mekong: du no 15,2 ty (mockup 04, "hạn mức VLĐ,
-- nhóm nợ 1"). total_credit_exposure cong khi QHKH xac nhan nhom lien quan.
INSERT INTO credit.loan_account (
    id, loan_application_id, account_number_masked, account_number_hash, principal_amount,
    outstanding_principal, interest_rate, disbursement_date, maturity_date, status, created_at,
    updated_at
)
VALUES (
    pg_temp.id('75200000', 17), pg_temp.id('75000000', 17), '******0090', repeat('9', 64),
    20000000000.0000, 15200000000.0000, 0.09000000, pg_temp.shift(DATE '2026-03-16'),
    pg_temp.shift(DATE '2027-03-15'), 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET loan_application_id = EXCLUDED.loan_application_id,
    principal_amount = EXCLUDED.principal_amount,
    outstanding_principal = EXCLUDED.outstanding_principal,
    disbursement_date = EXCLUDED.disbursement_date,
    maturity_date = EXCLUDED.maturity_date,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 4. Don du lieu phat sinh tren ho so mau (chay lai truoc nghiem thu, Q-Q)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE sme_loan ON COMMIT DROP AS
SELECT pg_temp.id('75000000', n) AS id FROM sme_case;

-- loan_decision chi them (trigger V021): chi tat trigger trong giao dich seed, chi xoa dong
-- cua ho so mau.
ALTER TABLE credit.loan_decision DISABLE TRIGGER trg_loan_decision_append_only;
DELETE FROM credit.loan_decision WHERE loan_application_id IN (SELECT id FROM sme_loan);
ALTER TABLE credit.loan_decision ENABLE TRIGGER trg_loan_decision_append_only;

DELETE FROM credit.case_exception WHERE loan_application_id IN (SELECT id FROM sme_loan);
DELETE FROM document.field_conflict
WHERE loan_application_id IN (SELECT id FROM sme_loan)
  AND id NOT IN (SELECT pg_temp.id('78100000', k) FROM generate_series(1, 2) AS k);
DELETE FROM credit.case_flag
WHERE loan_application_id IN (SELECT id FROM sme_loan)
  AND id NOT IN (SELECT pg_temp.sid('78000000', a, b)
                 FROM generate_series(1, 17) AS a, generate_series(1, 20) AS b);
DELETE FROM credit.case_related_party WHERE loan_application_id IN (SELECT id FROM sme_loan);
DELETE FROM identity.employee_scope
WHERE scope_type = 'LOAN_APPLICATION'
  AND scope_id IN (SELECT id FROM sme_loan);
DELETE FROM credit.case_step WHERE loan_application_id IN (SELECT id FROM sme_loan);

-- ---------------------------------------------------------------------------
-- 5. Buoc xu ly (case_step). Offset = ngay lam viec so voi anchor (mockup 05/11 = 0).
-- ---------------------------------------------------------------------------
-- QHKH ...01, HTTD ...03, Tham dinh ...08, Rui ro ...09, Phe duyet cap 2 ...05.
CREATE TEMP TABLE sme_step (
    n INT NOT NULL,
    seq INT NOT NULL,
    step_code TEXT NOT NULL,
    assignee UUID NULL,
    recv_off INT NOT NULL,
    recv_t TIME NOT NULL,
    done_off INT NULL,
    done_t TIME NULL,
    result TEXT NULL,
    reason TEXT NULL,
    paused_off INT NULL,
    paused_t TIME NULL,
    PRIMARY KEY (n, seq)
) ON COMMIT DROP;

INSERT INTO sme_step VALUES
    -- 1 VinaNova: QHKH gui 28/10 (-6); HTTD xong 30/10 16:00 (-4); Tham dinh nhan 30/10 16:00,
    --   han 06/11 17:00 (+1, "con 1 ngay LV").
    (1, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -8, '08:30', -6, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (1, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -6, '09:00', -4, '16:00', 'PASSED', NULL, NULL, NULL),
    (1, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -4, '16:00', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 2 Mekong Flex: nhap lap 03/11 (-2), chua gui, chua tinh SLA.
    (2, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -2, '10:00', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 3 Truong An: Tham dinh nhan 05/11 09:10 (0) -> han 12/11 (+5).
    (3, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -4, '09:00', -2, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (3, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -2, '09:00', 0, '09:10', 'PASSED', NULL, NULL, NULL),
    (3, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', 0, '09:10', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 4 Song Han: Rui ro tra lai 04/11 (-1) -> Tham dinh tinh lai du 5 ngay LV (E3) -> 11/11.
    (4, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -13, '09:00', -11, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (4, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -11, '09:00', -9, '10:00', 'PASSED', NULL, NULL, NULL),
    (4, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -9, '10:00', -4, '10:00', 'SUBMITTED', NULL, NULL, NULL),
    (4, 4, 'RISK_REVIEW', '10000000-0000-4000-8000-000000000009', -4, '10:00', -1, '10:00', 'RETURNED', 'Đề nghị Thẩm định giải trình dòng tiền trả nợ (dữ liệu mẫu).', NULL, NULL),
    (4, 5, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -1, '10:00', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 5 Phu Dien (vi du Q6): Tham dinh nhan 30/10 (-4, han goc 06/11), yeu cau bo sung 03/11 (-2):
    --   SLA tam dung, con 3 ngay LV; HTTD giu buoc cho bo sung, QHKH tai len den 10/11 (+3).
    (5, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -8, '09:00', -6, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (5, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -6, '09:00', -4, '10:00', 'PASSED', NULL, NULL, NULL),
    (5, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -4, '10:00', NULL, NULL, NULL, NULL, -2, '14:00'),
    (5, 4, 'PENDING_INFO', '10000000-0000-4000-8000-000000000003', -2, '14:00', NULL, NULL, NULL, 'Bổ sung bảng kê công nợ và hợp đồng đầu ra còn hiệu lực (dữ liệu mẫu).', NULL, NULL),
    -- 6 Phuc Lam: HTTD tra lai 29/10 16:40 (-5) -> han bo sung 05/11 (0, "hôm nay", Q11).
    (6, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -9, '09:00', -7, '10:00', 'SUBMITTED', NULL, NULL, NULL),
    (6, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -7, '10:00', -5, '16:40', 'RETURNED', 'Thiếu BCTC 2025 bản đã nộp cơ quan thuế và sao kê 12 tháng gần nhất; giải trình tồn kho tăng 38% (dữ liệu mẫu).', NULL, NULL),
    (6, 3, 'RM_REWORK', '10000000-0000-4000-8000-000000000001', -5, '16:40', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 7 Hung Phat: nhap, chua gui.
    (7, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -5, '14:00', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 8 Cang Xanh: HTTD nhan 04/11 14:20 (-1) -> han 06/11 (+1).
    (8, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -3, '09:00', -1, '14:20', 'SUBMITTED', NULL, NULL, NULL),
    (8, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -1, '14:20', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 9 Dong A: HTTD nhan 05/11 09:10 (0) -> han 09/11 (+2).
    (9, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -2, '09:00', 0, '09:10', 'SUBMITTED', NULL, NULL, NULL),
    (9, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', 0, '09:10', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 10 Tay Nguyen Xanh: HTTD nhan 05/11 10:25 (0) -> han 09/11 (+2).
    (10, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -3, '09:00', 0, '10:25', 'SUBMITTED', NULL, NULL, NULL),
    (10, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', 0, '10:25', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 11 Dai Thanh Global: trinh Rui ro 30/10 (-4) -> han 04/11 (-1), qua han 1 ngay LV.
    (11, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -13, '09:00', -11, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (11, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -11, '09:00', -9, '09:00', 'PASSED', NULL, NULL, NULL),
    (11, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -9, '09:00', -4, '15:00', 'SUBMITTED', NULL, NULL, NULL),
    (11, 4, 'RISK_REVIEW', '10000000-0000-4000-8000-000000000009', -4, '15:00', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 12 Nam Phuong: trinh Rui ro 04/11 (-1) -> han 09/11 (+2).
    (12, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -10, '09:00', -8, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (12, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -8, '09:00', -6, '09:00', 'PASSED', NULL, NULL, NULL),
    (12, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -6, '09:00', -1, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (12, 4, 'RISK_REVIEW', '10000000-0000-4000-8000-000000000009', -1, '09:00', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 13 Thanh Dat: Phe duyet nhan 04/11 (-1) -> han 06/11 (+1).
    (13, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -13, '09:00', -11, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (13, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -11, '09:00', -9, '09:00', 'PASSED', NULL, NULL, NULL),
    (13, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -9, '09:00', -4, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (13, 4, 'RISK_REVIEW', '10000000-0000-4000-8000-000000000009', -4, '09:00', -1, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (13, 5, 'APPROVAL', '10000000-0000-4000-8000-000000000005', -1, '09:00', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 14 Minh Tam: trinh Phe duyet 05/11 08:30 (0) -> han 09/11 (+2).
    (14, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -12, '09:00', -10, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (14, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -10, '09:00', -8, '09:00', 'PASSED', NULL, NULL, NULL),
    (14, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -8, '09:00', -3, '08:30', 'SUBMITTED', NULL, NULL, NULL),
    (14, 4, 'RISK_REVIEW', '10000000-0000-4000-8000-000000000009', -3, '08:30', 0, '08:30', 'SUBMITTED', NULL, NULL, NULL),
    (14, 5, 'APPROVAL', '10000000-0000-4000-8000-000000000005', 0, '08:30', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 15 Bac Ha: Rui ro trinh 04/11 (-1); ...0005 bi loai (E8) -> Hoi dong, khong nguoi nhan.
    (15, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -13, '09:00', -11, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (15, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -11, '09:00', -9, '09:00', 'PASSED', NULL, NULL, NULL),
    (15, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -9, '09:00', -4, '10:00', 'SUBMITTED', NULL, NULL, NULL),
    (15, 4, 'RISK_REVIEW', '10000000-0000-4000-8000-000000000009', -4, '10:00', -1, '10:00', 'SUBMITTED', NULL, NULL, NULL),
    (15, 5, 'COUNCIL_SESSION', NULL, -1, '10:00', NULL, NULL, NULL, NULL, NULL, NULL),
    -- 16 Hau Giang Xanh: 150 ty -> Hoi dong tu 02/11 (-3).
    (16, 1, 'RM_DRAFT', '10000000-0000-4000-8000-000000000001', -15, '09:00', -13, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (16, 2, 'CHECKING', '10000000-0000-4000-8000-000000000003', -13, '09:00', -11, '09:00', 'PASSED', NULL, NULL, NULL),
    (16, 3, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -11, '09:00', -6, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (16, 4, 'RISK_REVIEW', '10000000-0000-4000-8000-000000000009', -6, '09:00', -3, '09:00', 'SUBMITTED', NULL, NULL, NULL),
    (16, 5, 'COUNCIL_SESSION', NULL, -3, '09:00', NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO credit.case_step (
    id, loan_application_id, step_code, assignee_employee_id, received_at, due_at, paused_at,
    remaining_workdays, resumed_at, completed_at, result, reason, created_by, created_at
)
SELECT pg_temp.sid('76000000', s.n, s.seq),
       pg_temp.id('75000000', s.n),
       s.step_code,
       s.assignee,
       timed.received_at,
       timed.due_at,
       CASE WHEN s.paused_off IS NULL THEN NULL ELSE pg_temp.at(s.paused_off, s.paused_t) END,
       CASE WHEN s.paused_off IS NULL THEN NULL
            ELSE credit.workdays_between(
                pg_temp.wd(s.paused_off), (timed.due_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE
            ) END,
       NULL,
       CASE WHEN s.done_off IS NULL THEN NULL ELSE pg_temp.at(s.done_off, s.done_t) END,
       s.result,
       s.reason,
       COALESCE(
           lag(s.assignee) OVER (PARTITION BY s.n ORDER BY s.seq),
           '10000000-0000-4000-8000-000000000001'
       ),
       timed.received_at
FROM sme_step AS s
CROSS JOIN LATERAL (
    SELECT pg_temp.at(s.recv_off, s.recv_t) AS received_at,
           credit.add_workdays(
               pg_temp.at(s.recv_off, s.recv_t),
               (SELECT p.workdays FROM credit.sla_parameter AS p
                WHERE p.step_code = CASE
                    WHEN s.step_code IN ('RM_REWORK', 'PENDING_INFO', 'RISK_PENDING_INFO')
                        THEN 'CUSTOMER_SUPPLEMENT'
                    ELSE s.step_code END)
           ) AS due_at
) AS timed;

UPDATE credit.loan_application AS loan
SET submitted_at = step.received_at
FROM credit.case_step AS step
WHERE step.loan_application_id = loan.id
  AND loan.id IN (SELECT id FROM sme_loan)
  AND step.step_code IN ('APPROVAL', 'COUNCIL_SESSION')
  AND step.completed_at IS NULL;

-- Q-N (V025_2 credit.ensure_compliance_reader): ho so da vao Y kien Rui ro thi Tuan thu
-- (...0004) doc duoc qua scope LOAN_APPLICATION / loan:read. Seed ghi buoc truc tiep nen tu tao.
INSERT INTO identity.employee_scope (
    id, employee_id, scope_type, scope_id, permission_code, valid_from, valid_until, assigned_by,
    reason, created_at
)
SELECT pg_temp.id('33100000', step.n), '10000000-0000-4000-8000-000000000004', 'LOAN_APPLICATION',
       pg_temp.id('75000000', step.n), 'loan:read', pg_temp.at(step.recv_off, step.recv_t), NULL,
       '10000000-0000-4000-8000-000000000008',
       'Tuan thu - y kien con buoc Y kien Rui ro (submit_to_risk) - du lieu mau',
       pg_temp.at(step.recv_off, step.recv_t)
FROM (
    SELECT DISTINCT ON (n) n, recv_off, recv_t
    FROM sme_step
    WHERE step_code = 'RISK_REVIEW'
    ORDER BY n, seq
) AS step
ON CONFLICT (id) DO UPDATE
SET employee_id = EXCLUDED.employee_id,
    scope_type = EXCLUDED.scope_type,
    scope_id = EXCLUDED.scope_id,
    permission_code = EXCLUDED.permission_code,
    valid_from = EXCLUDED.valid_from,
    valid_until = NULL,
    assigned_by = EXCLUDED.assigned_by,
    reason = EXCLUDED.reason;

-- ---------------------------------------------------------------------------
-- 6. Tai lieu (metadata). VinaNova theo F-DOC: 16 muc + 3 bo sung + 1 ban CIC khach nop.
-- ---------------------------------------------------------------------------
-- issued_off / doc_off: offset ngay lam viec; doc_date: ngay co dinh (tai lieu lich su).
CREATE TEMP TABLE sme_doc (
    n INT NOT NULL,
    k INT NOT NULL,
    code TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_subtype TEXT NULL,
    title TEXT NOT NULL,
    doc_off INT NULL,
    doc_date DATE NULL,
    issued BOOLEAN NOT NULL DEFAULT FALSE,
    counts BOOLEAN NOT NULL DEFAULT TRUE,
    item INT NULL,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
    uploaded_off INT NOT NULL,
    PRIMARY KEY (n, k)
) ON COMMIT DROP;

INSERT INTO sme_doc VALUES
    -- VinaNova: QHKH tai 19 tai lieu ngay 28/10 (-6); CIC do he thong tra cuu 27/10 (-7).
    (1, 1, 'DENGHI', 'CREDIT_APPLICATION_FORM', NULL, 'Giấy đề nghị cấp tín dụng (minh họa)', -8, NULL, FALSE, TRUE, 1, 'VERIFIED', -6),
    (1, 2, 'DKKD', 'BUSINESS_REGISTRATION', NULL, 'Giấy chứng nhận đăng ký doanh nghiệp', NULL, DATE '2024-05-10', FALSE, TRUE, 2, 'VERIFIED', -6),
    (1, 3, 'DIEULE', 'COMPANY_CHARTER', NULL, 'Điều lệ công ty (minh họa)', NULL, DATE '2022-06-15', FALSE, TRUE, 3, 'VERIFIED', -6),
    (1, 4, 'A01-02', 'SHAREHOLDER_LIST', NULL, 'Danh sách cổ đông và bên liên quan', -8, NULL, FALSE, TRUE, 4, 'VERIFIED', -6),
    (1, 5, 'CCCD', 'IDENTITY_DOCUMENT', NULL, 'Giấy tờ tùy thân người đại diện (minh họa)', -8, NULL, FALSE, TRUE, 5, 'VERIFIED', -6),
    (1, 6, 'NQ', 'BOARD_RESOLUTION', NULL, 'Nghị quyết HĐQT 03/2024 về vay vốn và thế chấp', NULL, DATE '2024-03-15', FALSE, TRUE, 6, 'VERIFIED', -6),
    (1, 7, 'DONGY-CIC', 'CIC_CONSENT', NULL, 'Văn bản đồng ý tra cứu CIC (minh họa, ký 26/10/2026)', -8, NULL, FALSE, TRUE, 7, 'VERIFIED', -6),
    (1, 8, 'A01-04', 'FINANCIAL_STATEMENT', 'AUDITED', 'BCTC năm 2025 đã kiểm toán', NULL, DATE '2026-03-28', FALSE, TRUE, 8, 'VERIFIED', -6),
    (1, 9, 'BCTC-Q3', 'FINANCIAL_STATEMENT', 'QUARTERLY', 'BCTC quý 3/2026 (minh họa)', -12, NULL, FALSE, TRUE, 9, 'VERIFIED', -6),
    (1, 10, 'CONGNO', 'RECEIVABLES_INVENTORY_LIST', NULL, 'Bảng kê công nợ và tồn kho (minh họa)', -8, NULL, FALSE, TRUE, 10, 'VERIFIED', -6),
    (1, 11, 'A01-07', 'BANK_STATEMENT', NULL, 'Sao kê 12 tháng 01/11/2025–27/10/2026 · NH TMCP Sông Hậu (hư cấu)', -7, NULL, TRUE, TRUE, 11, 'VERIFIED', -6),
    (1, 12, 'GTGT-2Q', 'TAX_RETURN', 'VAT', 'Tờ khai GTGT quý 2 và quý 3/2026 (minh họa)', -12, NULL, FALSE, TRUE, 12, 'VERIFIED', -6),
    (1, 13, 'CIC', 'CIC_REPORT', 'BANK_LOOKUP', 'Kết quả tra cứu CIC do ngân hàng thực hiện · Hệ thống CIC (giả lập)', -7, NULL, TRUE, TRUE, 13, 'VERIFIED', -7),
    (1, 14, 'PA', 'BUSINESS_PLAN', NULL, 'Phương án kinh doanh (minh họa)', -8, NULL, FALSE, TRUE, 14, 'VERIFIED', -6),
    (1, 15, 'HD', 'SALES_CONTRACT', NULL, 'Hợp đồng đầu ra (2) (minh họa)', NULL, DATE '2026-09-15', FALSE, TRUE, 15, 'VERIFIED', -6),
    (1, 16, 'TSBD', 'COLLATERAL_DOCUMENT', NULL, 'Hồ sơ TSBĐ: GCN QSDĐ, hóa đơn gốc, chứng thư định giá (minh họa)', -9, NULL, FALSE, TRUE, 16, 'VERIFIED', -6),
    (1, 17, 'A01-01', 'CUSTOMER_INFORMATION_FORM', NULL, 'Phiếu thông tin khách hàng doanh nghiệp (bổ sung)', -8, NULL, FALSE, TRUE, NULL, 'VERIFIED', -6),
    (1, 18, 'A01-05', 'FINANCIAL_STATEMENT', 'MANAGEMENT', 'BCTC quản trị 6T/2026 (bổ sung)', NULL, DATE '2026-07-20', FALSE, TRUE, NULL, 'VERIFIED', -6),
    (1, 19, 'A01-06', 'TAX_RETURN', 'VAT_RECONCILIATION', 'VAT và đối chiếu doanh thu 2025 (bổ sung)', NULL, DATE '2026-01-20', FALSE, TRUE, NULL, 'VERIFIED', -6),
    (1, 20, 'CIC-KH', 'CIC_REPORT', 'CUSTOMER_SUBMITTED', 'Bản CIC khách tự nộp kèm (không dùng để thẩm định)', -8, NULL, FALSE, FALSE, NULL, 'NEEDS_VERIFICATION', -6),
    -- Mekong Flex (mockup 04): thieu BCTC quy 3 va hop dong dau ra thu 2; CIC cu het hieu luc.
    (2, 1, 'DENGHI', 'CREDIT_APPLICATION_FORM', NULL, 'De_nghi_cap_TD_MekongFlex.pdf', -2, NULL, FALSE, TRUE, 1, 'VERIFIED', -2),
    (2, 2, 'DKKD', 'BUSINESS_REGISTRATION', NULL, 'DKDN_MekongFlex_2023.pdf', NULL, DATE '2023-03-20', FALSE, TRUE, 2, 'VERIFIED', -2),
    (2, 3, 'DIEULE', 'COMPANY_CHARTER', NULL, 'Dieu_le_2023.pdf', NULL, DATE '2023-03-20', FALSE, TRUE, 3, 'VERIFIED', -2),
    (2, 4, 'TV', 'SHAREHOLDER_LIST', NULL, 'Ho_so_thanh_vien_BLQ.pdf', -2, NULL, FALSE, TRUE, 4, 'AI_PROPOSED', -2),
    (2, 5, 'CCCD', 'IDENTITY_DOCUMENT', NULL, 'CCCD_PhamNgocMai.jpg', -2, NULL, FALSE, TRUE, 5, 'VERIFIED', -2),
    (2, 6, 'NQ', 'BOARD_RESOLUTION', NULL, 'NQ_HDTV_vay_the_chap_2026.pdf', -3, NULL, FALSE, TRUE, 6, 'VERIFIED', -2),
    (2, 7, 'DONGY', 'CIC_CONSENT', NULL, 'Dong_y_tra_cuu_CIC.pdf', -25, NULL, FALSE, TRUE, 7, 'VERIFIED', -2),
    (2, 8, 'BCTC25', 'FINANCIAL_STATEMENT', 'AUDITED', 'BCTC_2025_kiemtoan.pdf', NULL, DATE '2026-03-30', FALSE, TRUE, 8, 'VERIFIED', -2),
    (2, 10, 'CONGNO', 'RECEIVABLES_INVENTORY_LIST', NULL, 'Bang_ke_cong_no_ton_kho_30-09-2026.xlsx', NULL, DATE '2026-09-30', FALSE, TRUE, 10, 'VERIFIED', -2),
    (2, 11, 'SAOKE', 'BANK_STATEMENT', NULL, 'Saoke_SongTien_11-2025_10-2026.pdf · NH TMCP Sông Tiền (hư cấu)', -2, NULL, TRUE, TRUE, 11, 'AI_PROPOSED', -2),
    (2, 12, 'THUE', 'TAX_RETURN', 'VAT', 'To_khai_GTGT_Q2_Q3.pdf', -12, NULL, FALSE, TRUE, 12, 'VERIFIED', -2),
    (2, 14, 'PA', 'BUSINESS_PLAN', NULL, 'Phuong_an_VLD_2027.docx', -2, NULL, FALSE, TRUE, 14, 'VERIFIED', -2),
    (2, 15, 'HD', 'SALES_CONTRACT', NULL, 'HĐ với CTCP Thực phẩm Đồng Xanh (hư cấu) – 1/2', -5, NULL, FALSE, TRUE, 15, 'VERIFIED', -2),
    (2, 16, 'TSBD', 'COLLATERAL_DOCUMENT', NULL, 'Chung_thu_dinh_gia_CT-2026-118.pdf', -4, NULL, FALSE, TRUE, 16, 'VERIFIED', -2),
    -- Van ban dong y CIC cua cac ho so co ngay tra cuu tren mockup 03.
    (3, 1, 'DONGY', 'CIC_CONSENT', NULL, 'Văn bản đồng ý tra cứu CIC', -16, NULL, FALSE, TRUE, NULL, 'VERIFIED', -4),
    (8, 1, 'DONGY', 'CIC_CONSENT', NULL, 'Văn bản đồng ý tra cứu CIC', -19, NULL, FALSE, TRUE, NULL, 'VERIFIED', -3),
    (10, 1, 'DONGY', 'CIC_CONSENT', NULL, 'Văn bản đồng ý tra cứu CIC', -13, NULL, FALSE, TRUE, NULL, 'VERIFIED', -3);

DELETE FROM credit.checklist_item_document
WHERE checklist_item_id IN (
    SELECT item.id FROM credit.loan_checklist_item AS item
    WHERE item.loan_application_id IN (SELECT id FROM sme_loan)
);

INSERT INTO document.document (
    id, document_type, document_subtype, title, owner_party_id, classification, document_date,
    valid_from, valid_until, verification_status, processing_status, created_by, created_at,
    updated_at, version, issued_date, counts_for_checklist
)
SELECT pg_temp.sid('57000000', d.n, d.k), d.document_type, d.document_subtype,
       d.code || ' · ' || d.title, pg_temp.id('55000000', d.n), 'CONFIDENTIAL',
       COALESCE(d.doc_date, pg_temp.wd(d.doc_off)), NULL, NULL, d.verification_status,
       'COMPLETED', '10000000-0000-4000-8000-000000000001', pg_temp.at(d.uploaded_off, '09:30'),
       pg_temp.at(d.uploaded_off, '09:30'), 1,
       CASE WHEN d.issued THEN pg_temp.wd(d.doc_off) END, d.counts
FROM sme_doc AS d
ON CONFLICT (id) DO UPDATE
SET document_type = EXCLUDED.document_type,
    document_subtype = EXCLUDED.document_subtype,
    title = EXCLUDED.title,
    owner_party_id = EXCLUDED.owner_party_id,
    classification = EXCLUDED.classification,
    document_date = EXCLUDED.document_date,
    valid_from = NULL,
    valid_until = NULL,
    verification_status = EXCLUDED.verification_status,
    processing_status = EXCLUDED.processing_status,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    issued_date = EXCLUDED.issued_date,
    counts_for_checklist = EXCLUDED.counts_for_checklist,
    version = document.document.version + 1;

INSERT INTO document.document_link (
    id, document_id, entity_type, entity_id, relationship_type, created_at
)
SELECT pg_temp.sid('57400000', d.n, d.k), pg_temp.sid('57000000', d.n, d.k), 'LOAN_APPLICATION',
       pg_temp.id('75000000', d.n),
       CASE WHEN d.item IS NULL AND d.counts THEN 'SUPPLEMENTARY'
            WHEN NOT d.counts THEN 'CUSTOMER_SUBMITTED_NOT_COUNTED'
            ELSE 'CHECKLIST_EVIDENCE' END,
       pg_temp.at(d.uploaded_off, '09:30')
FROM sme_doc AS d
ON CONFLICT (id) DO UPDATE
SET document_id = EXCLUDED.document_id,
    entity_type = EXCLUDED.entity_type,
    entity_id = EXCLUDED.entity_id,
    relationship_type = EXCLUDED.relationship_type;

-- Danh muc ho so theo ho so: VinaNova du 16/16 (HTTD kiem tra 30/10, Q7 "Checklist đủ");
-- Mekong Flex dang nhap (RECEIVED / REQUIRED; CIC het hieu luc).
CREATE TEMP TABLE sme_item ON COMMIT DROP AS
SELECT case_no.n, r.k, r.code, r.document_type,
       CASE
           WHEN case_no.n = 1 THEN 'VALID'
           WHEN r.k = 13 THEN 'EXPIRED'
           WHEN r.k = 15 THEN 'INCOMPLETE'  -- moi co 1/2 hop dong dau ra
           WHEN EXISTS (SELECT 1 FROM sme_doc AS d WHERE d.n = 2 AND d.item = r.k) THEN 'RECEIVED'
           ELSE 'REQUIRED'
       END AS requirement_status
FROM (VALUES (1), (2)) AS case_no(n)
CROSS JOIN sme_requirement AS r;

DELETE FROM credit.loan_checklist_item
WHERE loan_application_id IN (SELECT id FROM sme_loan)
  AND id NOT IN (SELECT pg_temp.sid('77000000', n, k) FROM sme_item);

INSERT INTO credit.loan_checklist_item (
    id, loan_application_id, requirement_code, document_type, requirement_status,
    mandatory_level, source_policy_clause_id, linked_document_id, waived_by, waiver_reason,
    created_at, updated_at
)
SELECT pg_temp.sid('77000000', i.n, i.k), pg_temp.id('75000000', i.n), i.code, i.document_type,
       i.requirement_status, 'MANDATORY', '45200000-0000-4000-8000-000000000009',
       (SELECT pg_temp.sid('57000000', d.n, d.k) FROM sme_doc AS d
        WHERE d.n = i.n AND d.item = i.k ORDER BY d.k LIMIT 1),
       NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM sme_item AS i
ON CONFLICT (id) DO UPDATE
SET loan_application_id = EXCLUDED.loan_application_id,
    requirement_code = EXCLUDED.requirement_code,
    document_type = EXCLUDED.document_type,
    requirement_status = EXCLUDED.requirement_status,
    mandatory_level = EXCLUDED.mandatory_level,
    source_policy_clause_id = EXCLUDED.source_policy_clause_id,
    linked_document_id = EXCLUDED.linked_document_id,
    waived_by = NULL,
    waiver_reason = NULL,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO credit.checklist_item_document (checklist_item_id, document_id)
SELECT pg_temp.sid('77000000', d.n, d.item), pg_temp.sid('57000000', d.n, d.k)
FROM sme_doc AS d
WHERE d.item IS NOT NULL AND d.n IN (1, 2)
ON CONFLICT DO NOTHING;

-- Phien ban tai lieu (chi cho tai lieu mang so lieu trich xuat): object chua co tren MinIO.
CREATE TEMP TABLE sme_version (n INT, k INT, filename TEXT, mime TEXT, uploaded_off INT) ON COMMIT DROP;
INSERT INTO sme_version VALUES
    (1, 8, 'A01-04_BCTC_2025_kiem_toan.pdf', 'application/pdf', -6),
    (1, 13, 'CIC_tra_cuu_he_thong.html', 'text/html', -7),
    (1, 17, 'A01-01_Phieu_thong_tin_KH.pdf', 'application/pdf', -6);

INSERT INTO storage.object_metadata (
    id, bucket_name, object_key, object_version_id, etag, sha256, size_bytes, mime_type,
    storage_class, encryption_type, retention_until, legal_hold, created_by, created_at, deleted_at
)
SELECT pg_temp.sid('57200000', v.n, v.k), 'customer-doc-original',
       'seed/sme-batch1/' || pg_temp.sid('57000000', v.n, v.k) || '/v1/original', NULL, NULL,
       repeat('0', 64), 0, v.mime, 'STANDARD', 'SSE-S3', NULL, FALSE,
       '10000000-0000-4000-8000-000000000001', pg_temp.at(v.uploaded_off, '09:30'), NULL
FROM sme_version AS v
ON CONFLICT (id) DO UPDATE
SET bucket_name = EXCLUDED.bucket_name,
    object_key = EXCLUDED.object_key,
    mime_type = EXCLUDED.mime_type,
    created_at = EXCLUDED.created_at,
    deleted_at = NULL;

INSERT INTO document.document_version (
    id, document_id, version_number, original_object_id, original_filename, mime_type, file_size,
    sha256, uploaded_by, uploaded_at, scan_status, is_current, created_at
)
SELECT pg_temp.sid('57100000', v.n, v.k), pg_temp.sid('57000000', v.n, v.k), 1,
       pg_temp.sid('57200000', v.n, v.k), v.filename, v.mime, 0, repeat('0', 64),
       '10000000-0000-4000-8000-000000000001', pg_temp.at(v.uploaded_off, '09:30'), 'CLEAN',
       TRUE, pg_temp.at(v.uploaded_off, '09:30')
FROM sme_version AS v
ON CONFLICT (id) DO UPDATE
SET document_id = EXCLUDED.document_id,
    original_object_id = EXCLUDED.original_object_id,
    original_filename = EXCLUDED.original_filename,
    mime_type = EXCLUDED.mime_type,
    uploaded_at = EXCLUDED.uploaded_at,
    is_current = TRUE;

-- ---------------------------------------------------------------------------
-- 7. So lieu trich xuat VinaNova: 25 so lieu cua 02b theo BANK.VINANOVA.metricStatus
--    (1 AI_PROPOSED · 15 NEEDS_VERIFICATION · 9 CONFIRMED) + truong CIC he thong (E7).
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE sme_field (
    k INT PRIMARY KEY,
    doc_k INT NOT NULL,
    field_name TEXT NOT NULL,
    value_type TEXT NOT NULL,
    shown TEXT NOT NULL,
    value_number NUMERIC NULL,
    page INT NULL,
    status TEXT NOT NULL,
    source_type TEXT NOT NULL,
    reason TEXT NULL
) ON COMMIT DROP;

INSERT INTO sme_field VALUES
    (1, 8, 'dscr', 'RATIO', '1,34', 1.34, 3, 'NEEDS_VERIFICATION', 'AI_OCR', 'Dùng EBITDA 98; nếu dùng 128 (cờ BCTC 2025) thì ≈ 1,76'),
    (2, 8, 'dti', 'RATIO', '1,82', 1.82, 1, 'NEEDS_VERIFICATION', 'AI_OCR', 'Dùng dư nợ CIC 98 tỷ (tra cứu 27/10/2026), BCĐKT chỉ ghi 56 tỷ'),
    (3, 17, 'ltv', 'PERCENT', '55,2', 55.2, 1, 'NEEDS_VERIFICATION', 'AI_OCR', 'Giá trị đang lấy từ Phiếu TTKH (tài liệu bị cờ), chưa đối chiếu với chứng thư định giá'),
    (4, 8, 'de', 'RATIO', '0,36', 0.36, 2, 'CONFIRMED', 'AI_OCR', NULL),
    (5, 8, 'cr', 'RATIO', '2,80', 2.80, 2, 'NEEDS_VERIFICATION', 'AI_OCR', 'BCTC ghi 2,04, tính lại 2,80: nguồn mâu thuẫn'),
    (6, 8, 'qr', 'RATIO', '1,76', 1.76, 2, 'NEEDS_VERIFICATION', 'AI_OCR', 'BCTC ghi 1,50, tính lại 1,76: nguồn mâu thuẫn'),
    (7, 8, 'icr', 'RATIO', '2,81', 2.81, 3, 'NEEDS_VERIFICATION', 'AI_OCR', 'BCTC ghi 14,9, tính lại 2,81: nguồn mâu thuẫn'),
    (8, 8, 'dso', 'DAYS', '150', 150, 3, 'NEEDS_VERIFICATION', 'AI_OCR', 'Thuyết minh BCTC ghi 48 ngày, tính lại 150 ngày'),
    (9, 8, 'rev', 'MONEY', '705,0', 705000000000, 1, 'CONFIRMED', 'AI_OCR', NULL),
    (10, 8, 'ebitda', 'MONEY', '98,0', 98000000000, 1, 'NEEDS_VERIFICATION', 'AI_OCR', 'Cờ Cao: số này lệch giữa các phần của BCTC, xem cờ "BCTC 2025 không nhất quán"'),
    (11, 8, 'ebitdam', 'PERCENT', '13,9%', 13.9, 1, 'NEEDS_VERIFICATION', 'AI_OCR', 'Tính từ EBITDA đang cần xác minh (cờ "BCTC 2025 không nhất quán"); tạm dùng 98 để thận trọng'),
    (12, 8, 'da', 'MONEY', '48,0', 48000000000, 3, 'CONFIRMED', 'AI_OCR', NULL),
    (13, 8, 'ebit', 'MONEY', '50,0', 50000000000, 3, 'NEEDS_VERIFICATION', 'AI_OCR', 'Tính từ EBITDA đang cần xác minh (cờ "BCTC 2025 không nhất quán"); tạm dùng 98 để thận trọng'),
    (14, 8, 'int', 'MONEY', '17,8', 17800000000, 3, 'CONFIRMED', 'AI_OCR', NULL),
    (15, 8, 'np', 'MONEY', '62,2', 62200000000, 1, 'NEEDS_VERIFICATION', 'AI_OCR', 'Cờ Cao: số này lệch giữa các phần của BCTC, xem cờ "BCTC 2025 không nhất quán"'),
    (16, 8, 'ta', 'MONEY', '1.383,0', 1383000000000, 2, 'NEEDS_VERIFICATION', 'AI_OCR', 'BCQT 6T/2026 ghi 368 tỷ, lệch 1.015 tỷ so với 31/12/2025'),
    (17, 8, 'ca', 'MONEY', '864,5', 864500000000, 2, 'CONFIRMED', 'AI_OCR', NULL),
    (18, 8, 'ar', 'MONEY', '312,0', 312000000000, 2, 'CONFIRMED', 'AI_OCR', NULL),
    (19, 8, 'inv', 'MONEY', '320,0', 320000000000, 2, 'CONFIRMED', 'AI_OCR', NULL),
    (20, 8, 'cl', 'MONEY', '308,5', 308500000000, 2, 'CONFIRMED', 'AI_OCR', NULL),
    (21, 8, 'debt', 'MONEY', '56,0', 56000000000, 2, 'NEEDS_VERIFICATION', 'AI_OCR', 'CIC tra cứu 27/10/2026 ghi 98 tỷ, BCĐKT 31/12/2025 ghi 56 tỷ'),
    (22, 8, 'eq', 'MONEY', '1.018,5', 1018500000000, 2, 'NEEDS_VERIFICATION', 'AI_OCR', '6T/2026 ghi 270 tỷ, trùng "Vốn góp CSH", không phải tổng VCSH'),
    (23, 8, 'cfo', 'MONEY', '93,2', 93200000000, 3, 'NEEDS_VERIFICATION', 'AI_OCR', 'Phiếu TT KH ghi 81,0, chênh 12,2 tỷ'),
    (24, 8, 'cfi', 'MONEY', '(48,8)', -48800000000, 3, 'CONFIRMED', 'AI_OCR', NULL),
    (25, 8, 'prin', 'MONEY', '(50,0)', -50000000000, 3, 'AI_PROPOSED', 'AI_OCR', NULL),
    -- Ngoai 25 so lieu: truong doi chieu cua mau thuan cfo (Phieu TT KH) va so lieu CIC he thong.
    (26, 17, 'cfo_ph', 'MONEY', '81,0', 81000000000, 1, 'NEEDS_VERIFICATION', 'AI_OCR', 'Phiếu TT KH ghi 81,0, chênh 12,2 tỷ so với LCTT kiểm toán 93,2'),
    (27, 13, 'debt_group', 'TEXT', '1', 1, 1, 'CONFIRMED', 'SYSTEM_CIC', NULL),
    (28, 13, 'outstanding_tctd_a', 'MONEY', '56', 56000000000, 1, 'CONFIRMED', 'SYSTEM_CIC', NULL),
    (29, 13, 'outstanding_tctd_b', 'MONEY', '42', 42000000000, 1, 'CONFIRMED', 'SYSTEM_CIC', NULL),
    (30, 13, 'total', 'MONEY', '98', 98000000000, 1, 'CONFIRMED', 'SYSTEM_CIC', NULL);

DELETE FROM document.extracted_field
WHERE document_version_id IN (SELECT pg_temp.sid('57100000', n, k) FROM sme_version)
  AND id NOT IN (SELECT pg_temp.sid('57300000', 1, k) FROM sme_field);

INSERT INTO document.extracted_field (
    id, document_version_id, field_name, value_type, ocr_value_text, normalized_value_text,
    corrected_value_text, value_number, value_date, page_number, bounding_box, source_text,
    confidence, verification_status, verified_by, verified_at, verification_reason, created_at,
    updated_at, source_type
)
SELECT pg_temp.sid('57300000', 1, f.k), pg_temp.sid('57100000', 1, f.doc_k), f.field_name,
       f.value_type, f.shown, f.value_number::TEXT, NULL, f.value_number, NULL, f.page, NULL,
       CASE f.source_type WHEN 'SYSTEM_CIC' THEN 'Hệ thống CIC · tra cứu (giả lập)'
                          ELSE 'Dữ liệu mẫu · ' || f.field_name END,
       CASE f.source_type WHEN 'SYSTEM_CIC' THEN NULL ELSE 0.93000 END,
       f.status,
       -- Tham dinh vien (...0008) xac nhan / danh dau can xac minh ngay 04/11 (-1); CIC: he thong.
       CASE WHEN f.source_type = 'AI_OCR' AND f.status <> 'AI_PROPOSED'
            THEN '10000000-0000-4000-8000-000000000008'::UUID END,
       CASE WHEN f.source_type = 'SYSTEM_CIC' THEN pg_temp.at(-7, '10:00')
            WHEN f.status <> 'AI_PROPOSED' THEN pg_temp.at(-1, '11:00') END,
       f.reason,
       pg_temp.at(-6, '10:00'), CURRENT_TIMESTAMP, f.source_type
FROM sme_field AS f
ON CONFLICT (id) DO UPDATE
SET document_version_id = EXCLUDED.document_version_id,
    field_name = EXCLUDED.field_name,
    value_type = EXCLUDED.value_type,
    ocr_value_text = EXCLUDED.ocr_value_text,
    normalized_value_text = EXCLUDED.normalized_value_text,
    corrected_value_text = NULL,
    value_number = EXCLUDED.value_number,
    page_number = EXCLUDED.page_number,
    source_text = EXCLUDED.source_text,
    confidence = EXCLUDED.confidence,
    verification_status = EXCLUDED.verification_status,
    verified_by = EXCLUDED.verified_by,
    verified_at = EXCLUDED.verified_at,
    verification_reason = EXCLUDED.verification_reason,
    updated_at = CURRENT_TIMESTAMP,
    source_type = EXCLUDED.source_type;

-- 2 mau thuan chua giai quyet (02b/05): debt (BCDKT 56 vs CIC 98), cfo (LCTT 93,2 vs Phieu 81).
INSERT INTO document.field_conflict (
    id, loan_application_id, code, field_ids, chosen_field_id, resolution_reason, resolved_by,
    resolved_at, created_at
)
VALUES
    (pg_temp.id('78100000', 1), pg_temp.id('75000000', 1), 'debt',
     ARRAY[pg_temp.sid('57300000', 1, 21), pg_temp.sid('57300000', 1, 30)], NULL, NULL, NULL, NULL,
     pg_temp.at(-4, '16:00')),
    (pg_temp.id('78100000', 2), pg_temp.id('75000000', 1), 'cfo',
     ARRAY[pg_temp.sid('57300000', 1, 23), pg_temp.sid('57300000', 1, 26)], NULL, NULL, NULL, NULL,
     pg_temp.at(-4, '16:00'))
ON CONFLICT (id) DO UPDATE
SET loan_application_id = EXCLUDED.loan_application_id,
    code = EXCLUDED.code,
    field_ids = EXCLUDED.field_ids,
    chosen_field_id = NULL,
    resolution_reason = NULL,
    resolved_by = NULL,
    resolved_at = NULL,
    created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- 8. Van ban dong y va ket qua tra cuu CIC (Q2, E7, E9, Q10). source = 'SIMULATED'.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE sme_cic (n INT PRIMARY KEY, consent_k INT, signed_off INT, lookup_off INT) ON COMMIT DROP;
INSERT INTO sme_cic VALUES
    (1, 7, -8, -7),     -- VinaNova: ky 26/10, tra cuu 27/10 -> hieu luc den 25/11
    (2, 7, -25, -24),   -- Mekong Flex: ky 01/10, tra cuu 02/10 -> het hieu luc tu 01/11
    (3, 1, -16, -15),   -- Truong An: tra cuu 15/10
    (8, 1, -19, -18),   -- Cang Xanh: tra cuu 12/10
    (10, 1, -13, -12);  -- Tay Nguyen Xanh: tra cuu 20/10

INSERT INTO banking.cic_consent (
    id, customer_id, document_id, signed_on, valid_until, confirmed_by, confirmed_at, created_at
)
SELECT pg_temp.id('58000000', c.n), pg_temp.id('56000000', c.n),
       pg_temp.sid('57000000', c.n, c.consent_k), pg_temp.wd(c.signed_off), NULL,
       '10000000-0000-4000-8000-000000000001', pg_temp.at(c.signed_off, '15:00'),
       pg_temp.at(c.signed_off, '15:00')
FROM sme_cic AS c
ON CONFLICT (id) DO UPDATE
SET customer_id = EXCLUDED.customer_id,
    document_id = EXCLUDED.document_id,
    signed_on = EXCLUDED.signed_on,
    valid_until = NULL,
    confirmed_by = EXCLUDED.confirmed_by,
    confirmed_at = EXCLUDED.confirmed_at;

DELETE FROM banking.credit_facility
WHERE credit_report_id IN (
    SELECT report.id FROM banking.credit_report AS report
    WHERE report.customer_id IN (SELECT pg_temp.id('56000000', n) FROM sme_case)
      AND report.id NOT IN (SELECT pg_temp.id('58100000', n) FROM sme_cic)
);
DELETE FROM banking.credit_report
WHERE customer_id IN (SELECT pg_temp.id('56000000', n) FROM sme_case)
  AND id NOT IN (SELECT pg_temp.id('58100000', n) FROM sme_cic);

INSERT INTO banking.credit_report (
    id, customer_id, provider, report_reference, requested_at, report_as_of_date, risk_summary,
    storage_object_id, created_at, looked_up_by, consent_id, valid_until, source
)
SELECT pg_temp.id('58100000', c.n), pg_temp.id('56000000', c.n), 'CIC',
       'CIC-SIM-' || lpad(c.n::TEXT, 3, '0'), pg_temp.at(c.lookup_off, '10:00'),
       pg_temp.wd(c.lookup_off),
       jsonb_build_object(
           'debt_group', '1',
           'source_label', 'Hệ thống CIC (giả lập) · dữ liệu mẫu',
           'total_outstanding', CASE c.n WHEN 1 THEN 98000000000 ELSE NULL END
       ),
       NULL, pg_temp.at(c.lookup_off, '10:00'), '10000000-0000-4000-8000-000000000001',
       pg_temp.id('58000000', c.n), pg_temp.wd(c.lookup_off) + 29, 'SIMULATED'
FROM sme_cic AS c
ON CONFLICT (id) DO UPDATE
SET customer_id = EXCLUDED.customer_id,
    provider = EXCLUDED.provider,
    report_reference = EXCLUDED.report_reference,
    requested_at = EXCLUDED.requested_at,
    report_as_of_date = EXCLUDED.report_as_of_date,
    risk_summary = EXCLUDED.risk_summary,
    created_at = EXCLUDED.created_at,
    looked_up_by = EXCLUDED.looked_up_by,
    consent_id = EXCLUDED.consent_id,
    valid_until = EXCLUDED.valid_until,
    source = EXCLUDED.source;

-- VinaNova: nhom no 1, du no 56 ty o TCTD A va 42 ty o TCTD B (rules.md C).
INSERT INTO banking.credit_facility (
    id, credit_report_id, lender_name, facility_type, credit_limit, outstanding_balance,
    monthly_obligation, overdue_days, debt_group, currency, as_of_date, created_at
)
VALUES
    (pg_temp.sid('58200000', 1, 1), pg_temp.id('58100000', 1), 'TCTD A (hư cấu)', 'TERM_LOAN',
     NULL, 56000000000.0000, NULL, 0, '1', 'VND', pg_temp.wd(-7), pg_temp.at(-7, '10:00')),
    (pg_temp.sid('58200000', 1, 2), pg_temp.id('58100000', 1), 'TCTD B (hư cấu)', 'SHORT_TERM_LOAN',
     NULL, 42000000000.0000, NULL, 0, '1', 'VND', pg_temp.wd(-7), pg_temp.at(-7, '10:00'))
ON CONFLICT (id) DO UPDATE
SET credit_report_id = EXCLUDED.credit_report_id,
    lender_name = EXCLUDED.lender_name,
    facility_type = EXCLUDED.facility_type,
    outstanding_balance = EXCLUDED.outstanding_balance,
    overdue_days = EXCLUDED.overdue_days,
    debt_group = EXCLUDED.debt_group,
    as_of_date = EXCLUDED.as_of_date,
    created_at = EXCLUDED.created_at;

-- ---------------------------------------------------------------------------
-- 9. Co canh bao (F4: VinaNova 8 co, 4 Cao; cickh mo nhung khong chan trinh, F8)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE sme_flag (
    n INT, k INT, code TEXT, severity TEXT, title TEXT, blocks BOOLEAN, source TEXT,
    created_by UUID, created_off INT, created_t TIME
) ON COMMIT DROP;
INSERT INTO sme_flag VALUES
    (1, 1, 'dso', 'HIGH', 'Kỳ thu tiền 150 ngày – vượt ngưỡng 90 ngày', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '16:00'),
    (1, 2, 'audit', 'HIGH', 'BCTC 2025 không nhất quán: lệch EBITDA, ngày ký, đơn vị kiểm toán', TRUE, 'APPRAISAL', '10000000-0000-4000-8000-000000000008', -1, '11:00'),
    (1, 3, 'cickh', 'HIGH', 'Bản CIC khách tự nộp có dấu hiệu không xác thực', FALSE, 'CHECKING', '10000000-0000-4000-8000-000000000003', -4, '16:00'),
    (1, 4, 'coi', 'HIGH', 'Phiếu TTKH do cán bộ ngân hàng khác xác nhận (NH TMCP Phương Bắc (hư cấu)); người này là thành viên HĐQT của khách', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '16:00'),
    (1, 5, 'debt', 'MEDIUM', 'Dư nợ vay: CIC 98 tỷ vs BCĐKT 56 tỷ (hai thời điểm khác nhau: CIC 27/10/2026, BCĐKT 31/12/2025)', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '16:00'),
    (1, 6, 'eq', 'MEDIUM', 'Vốn chủ sở hữu: 1.018,5 vs 270 tỷ', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '16:00'),
    (1, 7, 'cfo', 'MEDIUM', 'Dòng tiền HĐKD 2025: 93,2 vs 81,0 tỷ', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '16:00'),
    (1, 8, 'cr', 'LOW', 'Hệ số thanh toán ghi trên BCTC không khớp BCĐKT', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '16:00'),
    (3, 1, 'CIC_RELOOKUP', 'MEDIUM', 'Cần tra cứu lại CIC trước khi trình', FALSE, 'SYSTEM', NULL, 0, '09:10'),
    (11, 1, 'kyc', 'HIGH', 'KYC không đạt: người đại diện không khớp', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '15:00'),
    (11, 2, 'aml', 'HIGH', 'AML cần Tuân thủ kết luận', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '15:00'),
    (11, 3, 'related_group', 'MEDIUM', 'Nhóm khách hàng liên quan chưa được xác định đủ', TRUE, 'AI_DOCUMENT_CHECK', NULL, -4, '15:00');

INSERT INTO credit.case_flag (
    id, loan_application_id, code, severity, title, blocks_submission, status, handling_note,
    compliance_conclusion, compliance_reason, source, created_by, created_at, updated_at
)
SELECT pg_temp.sid('78000000', f.n, f.k), pg_temp.id('75000000', f.n), f.code, f.severity,
       f.title, f.blocks, 'OPEN', NULL, NULL, NULL, f.source, f.created_by,
       pg_temp.at(f.created_off, f.created_t), pg_temp.at(f.created_off, f.created_t)
FROM sme_flag AS f
ON CONFLICT (id) DO UPDATE
SET loan_application_id = EXCLUDED.loan_application_id,
    code = EXCLUDED.code,
    severity = EXCLUDED.severity,
    title = EXCLUDED.title,
    blocks_submission = EXCLUDED.blocks_submission,
    status = 'OPEN',
    handling_note = NULL,
    compliance_conclusion = NULL,
    compliance_reason = NULL,
    source = EXCLUDED.source,
    created_by = EXCLUDED.created_by,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

-- ---------------------------------------------------------------------------
-- 10. Nhom lien quan (E4, F10) va TSBD (F3, F9)
-- ---------------------------------------------------------------------------
INSERT INTO credit.case_related_party (
    loan_application_id, party_id, proposed_by_ai, status, basis, decided_by, decided_at, created_at
)
VALUES (
    pg_temp.id('75000000', 2), pg_temp.id('55000000', 17), TRUE, 'PROPOSED',
    'Góp 60 tỷ đồng · 60% vốn điều lệ Mekong Flex (danh sách thành viên góp vốn)', NULL, NULL,
    pg_temp.at(-2, '10:30')
)
ON CONFLICT (loan_application_id, party_id) DO UPDATE
SET proposed_by_ai = EXCLUDED.proposed_by_ai,
    status = EXCLUDED.status,
    basis = EXCLUDED.basis,
    decided_by = NULL,
    decided_at = NULL,
    created_at = EXCLUDED.created_at;

DELETE FROM credit.collateral
WHERE loan_application_id IN (SELECT id FROM sme_loan)
  AND id NOT IN (SELECT pg_temp.sid('77100000', a, b)
                 FROM generate_series(1, 2) AS a, generate_series(1, 3) AS b);

INSERT INTO credit.collateral (
    id, loan_application_id, owner_party_id, collateral_type, description, declared_value,
    appraised_value, eligible_value, currency, valuation_date, valuation_status,
    ownership_verification_status, created_at, updated_at, version, on_leased_land,
    land_lease_payment, land_lease_proof_document_id
)
VALUES
    -- VinaNova: LTV 80 / 145 "Cần xác minh" (F3): gia tri lay tu Phieu TTKH, chua doi chieu chung thu.
    (pg_temp.sid('77100000', 1, 1), pg_temp.id('75000000', 1), pg_temp.id('55000000', 1),
     'REAL_ESTATE', 'Nhà xưởng và quyền sử dụng đất (GCN QSDĐ, chứng thư định giá) – giá trị xử lý thận trọng',
     145000000000.0000, NULL, NULL, 'VND', pg_temp.wd(-9), 'NEEDS_VERIFICATION', 'VERIFIED',
     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, FALSE, NULL, NULL),
    -- Mekong Flex (mockup 04, F9): dong 78 ty tach 2 dong (so minh hoa); quyen thue dat chua chon
    -- hinh thuc tra tien -> chan Gui (LEASE_PAYMENT_UNSET).
    (pg_temp.sid('77100000', 2, 1), pg_temp.id('75000000', 2), pg_temp.id('55000000', 2),
     'REAL_ESTATE', 'Nhà xưởng KCN Tân Tạo · tách từ dòng 78 tỷ, số minh họa', 50000000000.0000,
     NULL, NULL, 'VND', NULL, 'DECLARED', 'VERIFIED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1,
     FALSE, NULL, NULL),
    (pg_temp.sid('77100000', 2, 2), pg_temp.id('75000000', 2), pg_temp.id('55000000', 2),
     'LAND_LEASE_RIGHT', 'Quyền thuê đất KCN Tân Tạo 6.200 m² · tách từ dòng 78 tỷ, số minh họa',
     28000000000.0000, NULL, NULL, 'VND', NULL, 'DECLARED', 'VERIFIED', CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP, 1, TRUE, NULL, NULL),
    (pg_temp.sid('77100000', 2, 3), pg_temp.id('75000000', 2), pg_temp.id('55000000', 2),
     'MACHINERY', 'Dây chuyền in flexo 8 màu & máy ghép màng · 3 máy', 28000000000.0000, NULL,
     NULL, 'VND', NULL, 'DECLARED', 'AI_PROPOSED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1,
     FALSE, NULL, NULL)
ON CONFLICT (id) DO UPDATE
SET loan_application_id = EXCLUDED.loan_application_id,
    owner_party_id = EXCLUDED.owner_party_id,
    collateral_type = EXCLUDED.collateral_type,
    description = EXCLUDED.description,
    declared_value = EXCLUDED.declared_value,
    appraised_value = EXCLUDED.appraised_value,
    eligible_value = EXCLUDED.eligible_value,
    valuation_date = EXCLUDED.valuation_date,
    valuation_status = EXCLUDED.valuation_status,
    ownership_verification_status = EXCLUDED.ownership_verification_status,
    on_leased_land = EXCLUDED.on_leased_land,
    land_lease_payment = NULL,
    land_lease_proof_document_id = NULL,
    updated_at = CURRENT_TIMESTAMP,
    version = credit.collateral.version + 1;

COMMIT;
