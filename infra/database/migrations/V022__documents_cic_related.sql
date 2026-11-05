-- V022: tai lieu, CIC va van ban dong y, nhom lien quan, mau thuan truong.
-- rules.md E6 (hieu luc tinh tu ngay ngan hang cap), E7 (so lieu tu he thong
-- CIC khong can xac nhan tung truong), E9/F11 (van ban dong y tra cuu CIC),
-- F10 (nhom lien quan: "Khong thuoc nhom" bat buoc can cu).
-- Bang moi bat RLS ngay tai day nhung CHUA co policy (mac dinh tu choi);
-- V023 tao policy sau khi co identity.can_read_loan / can_write_loan.

-- ---------------------------------------------------------------------------
-- 1. Truong trich xuat: nguon gia tri va trang thai xac nhan moi
-- ---------------------------------------------------------------------------
-- Anh xa gia tri cu (doc du lieu that 06/11/2026: chi co 1 dong 'VERIFIED' tu
-- seed; ma backend cu ghi VERIFIED / CORRECTED / REJECTED / NEEDS_REVIEW qua
-- document_service.verify_field, pipeline mac dinh 'UNVERIFIED', mock dung
-- 'PENDING_REVIEW'):
--   VERIFIED                  -> CONFIRMED          (nguoi da xac nhan gia tri AI/OCR)
--   CORRECTED                 -> CONFIRMED, source_type = HUMAN
--                                (gia tri dung la corrected_value_text do nguoi nhap)
--   UNVERIFIED, PENDING_REVIEW-> AI_PROPOSED        (AI/OCR de xuat, chua ai xem)
--   NEEDS_REVIEW, REJECTED, khac -> NEEDS_VERIFICATION (nguoi da xem va thay can xac minh)
-- Moi dong cu deu tu pipeline OCR nen source_type mac dinh AI_OCR.
ALTER TABLE document.extracted_field
    ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'AI_OCR',
    ADD CONSTRAINT ck_extracted_field_source_type CHECK (
        source_type IN ('AI_OCR', 'HUMAN', 'SYSTEM_CIC')
    );

UPDATE document.extracted_field
SET source_type = 'HUMAN'
WHERE verification_status = 'CORRECTED';

UPDATE document.extracted_field
SET verification_status = CASE
        WHEN verification_status IN ('VERIFIED', 'CORRECTED') THEN 'CONFIRMED'
        WHEN verification_status IN ('UNVERIFIED', 'PENDING_REVIEW') THEN 'AI_PROPOSED'
        ELSE 'NEEDS_VERIFICATION'
    END
WHERE verification_status NOT IN ('AI_PROPOSED', 'CONFIRMED', 'NEEDS_VERIFICATION');

ALTER TABLE document.extracted_field
    ADD CONSTRAINT ck_extracted_field_verification_status CHECK (
        verification_status IN ('AI_PROPOSED', 'CONFIRMED', 'NEEDS_VERIFICATION')
    );

-- ---------------------------------------------------------------------------
-- 2. Tai lieu: ngay cap (E6) va co tinh vao danh muc hay khong
-- ---------------------------------------------------------------------------
-- Ban CIC khach tu nop: counts_for_checklist = FALSE (khong thay ket qua tra cuu CIC).
ALTER TABLE document.document
    ADD COLUMN issued_date DATE NULL,
    ADD COLUMN counts_for_checklist BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------------
-- 3. Mau thuan gia tri giua cac truong trich xuat
-- ---------------------------------------------------------------------------
CREATE TABLE document.field_conflict (
    id UUID PRIMARY KEY,
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    code TEXT NOT NULL,
    field_ids UUID[] NOT NULL,
    chosen_field_id UUID NULL REFERENCES document.extracted_field(id),
    resolution_reason TEXT NULL,
    resolved_by UUID NULL REFERENCES identity.employee(id),
    resolved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_field_conflict_fields CHECK (cardinality(field_ids) >= 2),
    CONSTRAINT ck_field_conflict_chosen_in_fields CHECK (
        chosen_field_id IS NULL OR chosen_field_id = ANY (field_ids)
    ),
    CONSTRAINT ck_field_conflict_reason CHECK (
        chosen_field_id IS NULL
        OR (
            resolution_reason IS NOT NULL
            AND btrim(resolution_reason) <> ''
            AND resolved_by IS NOT NULL
            AND resolved_at IS NOT NULL
        )
    )
);

CREATE INDEX idx_field_conflict_application
    ON document.field_conflict(loan_application_id);

-- ---------------------------------------------------------------------------
-- 4. Mot muc danh muc ho so co the gom nhieu tai lieu
-- ---------------------------------------------------------------------------
CREATE TABLE credit.checklist_item_document (
    checklist_item_id UUID NOT NULL REFERENCES credit.loan_checklist_item(id),
    document_id UUID NOT NULL REFERENCES document.document(id),
    PRIMARY KEY (checklist_item_id, document_id)
);

CREATE INDEX idx_checklist_item_document_document
    ON credit.checklist_item_document(document_id);

-- ---------------------------------------------------------------------------
-- 5. Van ban dong y tra cuu CIC (E9, F11) va ket qua tra cuu
-- ---------------------------------------------------------------------------
-- F11: valid_until NULL = hieu luc suot qua trinh xu ly ho so. Ban AI phan loai
-- chua xac nhan (confirmed_by NULL) chua du de tra cuu.
CREATE TABLE banking.cic_consent (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customer.customer(id),
    document_id UUID NOT NULL REFERENCES document.document(id),
    signed_on DATE NOT NULL,
    valid_until DATE NULL,
    confirmed_by UUID NULL REFERENCES identity.employee(id),
    confirmed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_cic_consent_validity CHECK (
        valid_until IS NULL OR valid_until >= signed_on
    ),
    CONSTRAINT ck_cic_consent_confirmed CHECK (
        (confirmed_by IS NULL) = (confirmed_at IS NULL)
    )
);

CREATE INDEX idx_cic_consent_customer ON banking.cic_consent(customer_id);

ALTER TABLE banking.credit_report
    ADD COLUMN looked_up_by UUID NULL REFERENCES identity.employee(id),
    ADD COLUMN consent_id UUID NULL REFERENCES banking.cic_consent(id),
    ADD COLUMN valid_until DATE NULL,
    ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'SIMULATED';

-- ---------------------------------------------------------------------------
-- 6. Nhom khach hang lien quan theo ho so (E4, F10)
-- ---------------------------------------------------------------------------
CREATE TABLE credit.case_related_party (
    loan_application_id UUID NOT NULL REFERENCES credit.loan_application(id),
    party_id UUID NOT NULL REFERENCES customer.party(id),
    proposed_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    basis TEXT NULL,
    decided_by UUID NULL REFERENCES identity.employee(id),
    decided_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (loan_application_id, party_id),
    CONSTRAINT ck_case_related_party_status CHECK (
        status IN ('PROPOSED', 'CONFIRMED', 'NOT_IN_GROUP')
    ),
    CONSTRAINT ck_case_related_party_basis CHECK (
        status <> 'NOT_IN_GROUP' OR basis IS NOT NULL
    ),
    CONSTRAINT ck_case_related_party_decided CHECK (
        status = 'PROPOSED' OR (decided_by IS NOT NULL AND decided_at IS NOT NULL)
    )
);

CREATE INDEX idx_case_related_party_party ON credit.case_related_party(party_id);

-- ---------------------------------------------------------------------------
-- 7. Du no ngoai bang / han muc chua giai ngan cua khach (tong cap tin dung Q4/E5)
-- ---------------------------------------------------------------------------
CREATE TABLE credit.customer_exposure (
    id UUID PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customer.customer(id),
    exposure_type VARCHAR(20) NOT NULL,
    amount NUMERIC(24,4) NOT NULL,
    as_of_date DATE NOT NULL,
    source VARCHAR(20) NOT NULL DEFAULT 'SEED',
    CONSTRAINT ck_customer_exposure_type CHECK (
        exposure_type IN ('UNDRAWN_LIMIT', 'GUARANTEE', 'LC')
    ),
    CONSTRAINT ck_customer_exposure_amount CHECK (amount >= 0)
);

CREATE INDEX idx_customer_exposure_customer
    ON credit.customer_exposure(customer_id, as_of_date DESC);

-- ---------------------------------------------------------------------------
-- 8. Quyen va RLS (policy o V023)
-- ---------------------------------------------------------------------------
-- Theo mau V017/V021: khong vai tro runtime nao duoc DELETE.
GRANT SELECT, INSERT, UPDATE ON document.field_conflict,
    credit.checklist_item_document, banking.cic_consent,
    credit.case_related_party
TO bank_app;
-- Du no khach den tu he thong nguon/seed, runtime chi doc.
GRANT SELECT ON credit.customer_exposure TO bank_app;

ALTER TABLE document.field_conflict ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.checklist_item_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking.cic_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.case_related_party ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.customer_exposure ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN document.extracted_field.source_type IS
    'Origin of the value: AI_OCR (needs confirmation), HUMAN, SYSTEM_CIC (machine-to-machine, E7).';
COMMENT ON COLUMN document.document.issued_date IS
    'Date the issuing bank/authority issued the document; 30-day validity counts from here (E6).';
COMMENT ON COLUMN document.document.counts_for_checklist IS
    'FALSE for documents that must not satisfy a checklist item, e.g. a CIC report submitted by the customer.';
COMMENT ON TABLE document.field_conflict IS
    'Conflicting extracted values for one case; resolution requires a chosen field and a reason.';
COMMENT ON TABLE credit.checklist_item_document IS 'Documents satisfying a loan checklist item.';
COMMENT ON TABLE banking.cic_consent IS
    'Customer consent to CIC lookup (E9); NULL valid_until = valid for the whole case (F11).';
COMMENT ON TABLE credit.case_related_party IS
    'Related-party group membership per case: AI proposal, RM confirmation or NOT_IN_GROUP with basis (F10).';
COMMENT ON TABLE credit.customer_exposure IS
    'Off-balance or undrawn credit exposure of a customer used for total exposure (Q4/E5).';
