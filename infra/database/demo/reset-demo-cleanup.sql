-- Don dau ra phat sinh khi demo/e2e, KHONG dung agent.benchmark_run (bang chung do benchmark).
-- Chay truoc khi nap lai seed (infra/scripts/reset-demo.sh). Idempotent. Chay luc khong co ca agent dang chay.
BEGIN;
-- Pham vi: CHI ho so demo (cac canh trong docs/agent/demo-data.md) va ho so LA- do e2e tao. Ca/thong bao cua ho so khac
-- (vd. crew QA doi chieu) khong bi dung toi.
CREATE TEMP TABLE reset_app ON COMMIT DROP AS
  SELECT id FROM credit.loan_application
   WHERE application_number LIKE 'LA-%'
      OR application_number IN ('HSV-2026-00187', 'HSV-2026-00184', 'HSV-2026-00196', 'HSV-2026-00223', 'HSV-2026-00163');
CREATE TEMP TABLE reset_case ON COMMIT DROP AS
  SELECT DISTINCT case_id FROM credit.loan_agent_run WHERE loan_application_id IN (SELECT id FROM reset_app);
DELETE FROM agent.action_log      WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.approval_token  WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.action_proposal WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_event      WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_plan       WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM credit.loan_agent_run WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_run        WHERE case_id IN (SELECT case_id FROM reset_case);
-- Co va dieu kien truoc giai ngan do thao tac tu de xuat cua agent (source 'AGENT:<proposal_id>') ghi len ho so, khi ca agent nguon
-- da bi xoa o tren (de xuat bi xoa theo). Dong khong mang nguon AGENT: (seed, nguoi dung nhap) khong bi dung toi.
-- Hai bang chi-them voi bank_app nhung script chay bang quyen chu so huu nen xoa duoc.
DELETE FROM credit.pre_disbursement_condition
 WHERE source LIKE 'AGENT:%' AND substr(source, 7) NOT IN (SELECT id::text FROM agent.action_proposal);
DELETE FROM credit.case_flag
 WHERE source LIKE 'AGENT:%' AND substr(source, 7) NOT IN (SELECT id::text FROM agent.action_proposal);
-- Thong bao (outbox email xoa theo, ON DELETE CASCADE) cua dung cac ho so tren; seed sinh lai phan thuoc ho so mau qua trigger.
DELETE FROM integration.notification
 WHERE resource_type = 'LOAN_APPLICATION' AND resource_id IN (SELECT id FROM reset_app);
-- L15: tai lieu e2e/demo da tai len cac ho so tren (id khong theo dang seed '...-4000-8000-...'): xoa ban ghi.
-- Tai lieu seed (id co dinh) va tai lieu con duoc tham chieu boi tai san/dinh gia/CIC/chinh sach duoc giu lai.
-- File trong MinIO khong xoa o day (chi xoa metadata khi khong con ban ghi nao tro toi); object mo coi vo hai.
CREATE TEMP TABLE reset_doc ON COMMIT DROP AS
  SELECT DISTINCT d.id FROM document.document AS d
    JOIN document.document_link AS l ON l.document_id = d.id
   WHERE l.entity_type = 'LOAN_APPLICATION' AND l.entity_id IN (SELECT id FROM reset_app)
     AND d.id::text NOT LIKE '%-4000-8000-%'
     AND NOT EXISTS (SELECT 1 FROM credit.collateral_valuation WHERE source_document_id = d.id)
     AND NOT EXISTS (SELECT 1 FROM policy.policy_version WHERE source_document_id = d.id)
     AND NOT EXISTS (SELECT 1 FROM banking.cic_consent WHERE document_id = d.id)
     AND NOT EXISTS (SELECT 1 FROM credit.collateral WHERE land_lease_proof_document_id = d.id);
CREATE TEMP TABLE reset_ver ON COMMIT DROP AS
  SELECT id, original_object_id FROM document.document_version WHERE document_id IN (SELECT id FROM reset_doc);
DELETE FROM credit.checklist_item_document WHERE document_id IN (SELECT id FROM reset_doc);
UPDATE credit.loan_checklist_item SET linked_document_id = NULL WHERE linked_document_id IN (SELECT id FROM reset_doc);
DELETE FROM document.document_chunk     WHERE document_version_id IN (SELECT id FROM reset_ver);
DELETE FROM document.document_issue     WHERE document_version_id IN (SELECT id FROM reset_ver);
DELETE FROM document.extracted_field    WHERE document_version_id IN (SELECT id FROM reset_ver);
DELETE FROM document.processing_job     WHERE document_version_id IN (SELECT id FROM reset_ver);
DELETE FROM document.document_page      WHERE document_version_id IN (SELECT id FROM reset_ver);
DELETE FROM document.document_link      WHERE document_id IN (SELECT id FROM reset_doc);
DELETE FROM document.document_version  WHERE document_id IN (SELECT id FROM reset_doc);
DELETE FROM document.document           WHERE id IN (SELECT id FROM reset_doc);
DELETE FROM storage.object_metadata AS om
 WHERE om.id IN (SELECT original_object_id FROM reset_ver)
   AND NOT EXISTS (SELECT 1 FROM document.document_version dv WHERE dv.original_object_id = om.id)
   AND NOT EXISTS (SELECT 1 FROM document.document_page dp WHERE dp.page_image_object_id = om.id)
   AND NOT EXISTS (SELECT 1 FROM ai.report r WHERE r.pdf_object_id = om.id);
-- Ho so NHAP LA- do e2e tao va chua co nguoi vay (hien "Chua co ten khach" o man Kiem toan): xoa cung cac dong phu thuoc thong dung;
-- ho so con dong phu thuoc khac (FK) thi giu nguyen. Khong dung ho so khong co ma LA-, khong dung seed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT a.id FROM credit.loan_application a
            WHERE a.application_number LIKE 'LA-%' AND a.status = 'DRAFT'
              AND NOT EXISTS (SELECT 1 FROM credit.loan_party p WHERE p.loan_application_id = a.id) LOOP
    BEGIN
      DELETE FROM credit.checklist_item_document WHERE checklist_item_id IN (SELECT id FROM credit.loan_checklist_item WHERE loan_application_id = r.id);
      DELETE FROM credit.checklist_check_log WHERE loan_application_id = r.id;
      DELETE FROM credit.loan_checklist_item WHERE loan_application_id = r.id;
      DELETE FROM credit.loan_draft WHERE loan_application_id = r.id;
      DELETE FROM credit.case_step WHERE loan_application_id = r.id;
      DELETE FROM credit.case_exception WHERE loan_application_id = r.id;
      DELETE FROM credit.loan_application WHERE id = r.id;
    EXCEPTION WHEN foreign_key_violation THEN NULL;  -- con ban ghi phu thuoc khac: giu lai
    END;
  END LOOP;
END $$;
-- Dau ra do e2e/demo ghi len HO SO SEED (khong LA-): nhat ky chot nguon, nhat ky kiem tra danh muc va cac ban chot to trinh.
-- Seed khong ghi cac bang nay (to trinh nhap duoc seed dat lai rieng), nen moi dong tren ho so seed deu la dau ra phat sinh.
-- Ba bang chi-them (trigger chan UPDATE/DELETE): tat trigger trong dung giao dich nay roi bat lai.
ALTER TABLE document.field_conflict_log DISABLE TRIGGER trg_field_conflict_log_append_only;
ALTER TABLE credit.checklist_check_log DISABLE TRIGGER trg_checklist_check_log_append_only;
ALTER TABLE credit.appraisal_memo_version DISABLE TRIGGER trg_appraisal_memo_version_append_only;
DELETE FROM document.field_conflict_log WHERE loan_application_id IN (SELECT id FROM credit.loan_application WHERE application_number NOT LIKE 'LA-%');
DELETE FROM credit.checklist_check_log WHERE loan_application_id IN (SELECT id FROM credit.loan_application WHERE application_number NOT LIKE 'LA-%');
DELETE FROM credit.appraisal_memo_version WHERE loan_application_id IN (SELECT id FROM credit.loan_application WHERE application_number NOT LIKE 'LA-%');
ALTER TABLE document.field_conflict_log ENABLE TRIGGER trg_field_conflict_log_append_only;
ALTER TABLE credit.checklist_check_log ENABLE TRIGGER trg_checklist_check_log_append_only;
ALTER TABLE credit.appraisal_memo_version ENABLE TRIGGER trg_appraisal_memo_version_append_only;
-- Cuoc tro chuyen cua panel Tro ly AI gan voi ho so (seed va LA-) cung tin nhan cua chung: la dau ra phat sinh khi thu/e2e.
-- De lai thi panel mo ra cau thu cu ("Thoi tiet Ha Noi...") thay vi cuoc moi. Cuoc khong gan ho so nao (cua nguoi dung that) khong bi dung toi;
-- ca phan tich gan cuoc tro chuyen (ai.analysis_case) giu nguyen, chi go lien ket.
CREATE TEMP TABLE reset_conv ON COMMIT DROP AS
  SELECT id FROM ai.conversation
   WHERE active_loan_application_id IN (SELECT id FROM credit.loan_application WHERE application_number NOT LIKE 'LA-%')
      OR active_loan_application_id IN (SELECT id FROM reset_app);
UPDATE ai.analysis_case SET conversation_id = NULL WHERE conversation_id IN (SELECT id FROM reset_conv);
DELETE FROM ai.message WHERE conversation_id IN (SELECT id FROM reset_conv);
DELETE FROM ai.conversation WHERE id IN (SELECT id FROM reset_conv);
COMMIT;
