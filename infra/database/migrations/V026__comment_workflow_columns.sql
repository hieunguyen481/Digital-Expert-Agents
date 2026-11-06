-- Bo sung COMMENT cho cot/bang cua cac migration V018-V025 (verify-stack yeu cau moi cot co mo ta).

COMMENT ON COLUMN banking.cic_consent.id IS 'Khoa chinh.';
COMMENT ON COLUMN banking.cic_consent.customer_id IS 'Khach hang da ky dong y.';
COMMENT ON COLUMN banking.cic_consent.document_id IS 'Tai lieu dong y da ky.';
COMMENT ON COLUMN banking.cic_consent.signed_on IS 'Ngay khach ky dong y.';
COMMENT ON COLUMN banking.cic_consent.valid_until IS 'Ngay het hieu luc cua dong y.';
COMMENT ON COLUMN banking.cic_consent.confirmed_by IS 'Nhan vien xac nhan dong y.';
COMMENT ON COLUMN banking.cic_consent.confirmed_at IS 'Thoi diem xac nhan.';
COMMENT ON COLUMN banking.cic_consent.created_at IS 'Thoi diem tao.';

COMMENT ON COLUMN banking.credit_report.looked_up_by IS 'Nhan vien thuc hien tra cuu.';
COMMENT ON COLUMN banking.credit_report.consent_id IS 'Dong y CIC lam can cu tra cuu.';
COMMENT ON COLUMN banking.credit_report.valid_until IS 'Han hieu luc cua ket qua tra cuu.';
COMMENT ON COLUMN banking.credit_report.source IS 'Nguon bao cao tin dung.';

COMMENT ON COLUMN credit.authority_tier.version IS 'Phien ban bang phan cap tham quyen.';
COMMENT ON COLUMN credit.authority_tier.tier IS 'Cap tham quyen phe duyet.';
COMMENT ON COLUMN credit.authority_tier.max_total_vnd IS 'Tong muc toi da (VND) cap nay duoc phe duyet.';
COMMENT ON COLUMN credit.authority_tier.valid_from IS 'Ngay bat dau hieu luc.';

COMMENT ON COLUMN credit.case_exception.id IS 'Khoa chinh.';
COMMENT ON COLUMN credit.case_exception.loan_application_id IS 'Ho so vay.';
COMMENT ON COLUMN credit.case_exception.checklist_code IS 'Ma muc checklist bi ngoai le.';
COMMENT ON COLUMN credit.case_exception.kind IS 'Loai ngoai le.';
COMMENT ON COLUMN credit.case_exception.reason IS 'Ly do de xuat.';
COMMENT ON COLUMN credit.case_exception.proposed_by IS 'Nhan vien de xuat.';
COMMENT ON COLUMN credit.case_exception.proposed_at IS 'Thoi diem de xuat.';
COMMENT ON COLUMN credit.case_exception.decision IS 'Quyet dinh xu ly ngoai le.';
COMMENT ON COLUMN credit.case_exception.decided_by IS 'Nhan vien quyet dinh.';
COMMENT ON COLUMN credit.case_exception.decided_at IS 'Thoi diem quyet dinh.';

COMMENT ON COLUMN credit.case_flag.id IS 'Khoa chinh.';
COMMENT ON COLUMN credit.case_flag.loan_application_id IS 'Ho so vay.';
COMMENT ON COLUMN credit.case_flag.code IS 'Ma co canh bao.';
COMMENT ON COLUMN credit.case_flag.severity IS 'Muc do nghiem trong.';
COMMENT ON COLUMN credit.case_flag.title IS 'Tieu de ngan.';
COMMENT ON COLUMN credit.case_flag.blocks_submission IS 'Co chan chuyen buoc hay khong.';
COMMENT ON COLUMN credit.case_flag.status IS 'Trang thai xu ly co.';
COMMENT ON COLUMN credit.case_flag.handling_note IS 'Ghi chu xu ly.';
COMMENT ON COLUMN credit.case_flag.compliance_conclusion IS 'Ket luan cua Tuan thu.';
COMMENT ON COLUMN credit.case_flag.compliance_reason IS 'Ly do ket luan cua Tuan thu.';
COMMENT ON COLUMN credit.case_flag.source IS 'Nguon phat sinh co.';
COMMENT ON COLUMN credit.case_flag.created_by IS 'Nguoi/he thong tao.';
COMMENT ON COLUMN credit.case_flag.created_at IS 'Thoi diem tao.';
COMMENT ON COLUMN credit.case_flag.updated_at IS 'Thoi diem cap nhat cuoi.';

COMMENT ON COLUMN credit.case_related_party.loan_application_id IS 'Ho so vay.';
COMMENT ON COLUMN credit.case_related_party.party_id IS 'Ben lien quan.';
COMMENT ON COLUMN credit.case_related_party.proposed_by_ai IS 'AI de xuat hay nhap tay.';
COMMENT ON COLUMN credit.case_related_party.status IS 'Trang thai xac nhan.';
COMMENT ON COLUMN credit.case_related_party.basis IS 'Can cu xac dinh ben lien quan.';
COMMENT ON COLUMN credit.case_related_party.decided_by IS 'Nhan vien xac nhan.';
COMMENT ON COLUMN credit.case_related_party.decided_at IS 'Thoi diem xac nhan.';
COMMENT ON COLUMN credit.case_related_party.created_at IS 'Thoi diem tao.';

COMMENT ON COLUMN credit.case_step.id IS 'Khoa chinh.';
COMMENT ON COLUMN credit.case_step.loan_application_id IS 'Ho so vay.';
COMMENT ON COLUMN credit.case_step.step_code IS 'Ma buoc quy trinh.';
COMMENT ON COLUMN credit.case_step.assignee_employee_id IS 'Nhan vien duoc giao.';
COMMENT ON COLUMN credit.case_step.received_at IS 'Thoi diem nhan buoc.';
COMMENT ON COLUMN credit.case_step.due_at IS 'Han xu ly theo SLA.';
COMMENT ON COLUMN credit.case_step.paused_at IS 'Thoi diem tam dung dong ho SLA.';
COMMENT ON COLUMN credit.case_step.remaining_workdays IS 'So ngay lam viec con lai khi tam dung.';
COMMENT ON COLUMN credit.case_step.resumed_at IS 'Thoi diem tiep tuc.';
COMMENT ON COLUMN credit.case_step.completed_at IS 'Thoi diem hoan thanh.';
COMMENT ON COLUMN credit.case_step.result IS 'Ket qua buoc.';
COMMENT ON COLUMN credit.case_step.reason IS 'Ly do/ghi chu.';
COMMENT ON COLUMN credit.case_step.created_by IS 'Nguoi tao.';
COMMENT ON COLUMN credit.case_step.created_at IS 'Thoi diem tao.';

COMMENT ON COLUMN credit.checklist_item_document.checklist_item_id IS 'Muc checklist.';
COMMENT ON COLUMN credit.checklist_item_document.document_id IS 'Tai lieu dinh kem.';

COMMENT ON COLUMN credit.collateral.land_lease_proof_document_id IS 'Tai lieu chung minh thue dat.';

COMMENT ON COLUMN credit.customer_exposure.id IS 'Khoa chinh.';
COMMENT ON COLUMN credit.customer_exposure.customer_id IS 'Khach hang.';
COMMENT ON COLUMN credit.customer_exposure.exposure_type IS 'Loai du no.';
COMMENT ON COLUMN credit.customer_exposure.amount IS 'So tien (VND).';
COMMENT ON COLUMN credit.customer_exposure.as_of_date IS 'Ngay chot so lieu.';
COMMENT ON COLUMN credit.customer_exposure.source IS 'Nguon so lieu.';

COMMENT ON COLUMN credit.holiday.day IS 'Ngay nghi.';
COMMENT ON COLUMN credit.holiday.name IS 'Ten ngay nghi.';

COMMENT ON COLUMN credit.loan_application.approval_tier IS 'Cap tham quyen phe duyet duoc xac dinh.';
COMMENT ON COLUMN credit.loan_application.withdraw_reason IS 'Ly do rut ho so.';

COMMENT ON COLUMN credit.loan_decision.decision_source IS 'Nguon quyet dinh (ca nhan/hoi dong).';
COMMENT ON COLUMN credit.loan_decision.council_session_id IS 'Phien hoi dong tin dung ra quyet dinh.';

COMMENT ON COLUMN credit.sla_parameter.step_code IS 'Ma buoc quy trinh.';
COMMENT ON COLUMN credit.sla_parameter.workdays IS 'So ngay lam viec cho phep.';

COMMENT ON COLUMN customer.relationship_manager_history.customer_id IS 'Khach hang.';
COMMENT ON COLUMN customer.relationship_manager_history.employee_id IS 'RM phu trach.';
COMMENT ON COLUMN customer.relationship_manager_history.valid_from IS 'Bat dau phu trach.';
COMMENT ON COLUMN customer.relationship_manager_history.valid_until IS 'Ket thuc phu trach.';

COMMENT ON COLUMN document.field_conflict.id IS 'Khoa chinh.';
COMMENT ON COLUMN document.field_conflict.loan_application_id IS 'Ho so vay.';
COMMENT ON COLUMN document.field_conflict.code IS 'Ma loai mau thuan.';
COMMENT ON COLUMN document.field_conflict.field_ids IS 'Cac truong trich xuat mau thuan.';
COMMENT ON COLUMN document.field_conflict.chosen_field_id IS 'Truong duoc chon.';
COMMENT ON COLUMN document.field_conflict.resolution_reason IS 'Ly do chon.';
COMMENT ON COLUMN document.field_conflict.resolved_by IS 'Nhan vien giai quyet.';
COMMENT ON COLUMN document.field_conflict.resolved_at IS 'Thoi diem giai quyet.';
COMMENT ON COLUMN document.field_conflict.created_at IS 'Thoi diem tao.';

COMMENT ON COLUMN identity.employee_authority.employee_id IS 'Nhan vien.';
COMMENT ON COLUMN identity.employee_authority.tier IS 'Cap tham quyen.';
COMMENT ON COLUMN identity.employee_authority.unit_scope IS 'Pham vi don vi.';
COMMENT ON COLUMN identity.employee_authority.branch_id IS 'Chi nhanh.';
COMMENT ON COLUMN identity.employee_authority.valid_from IS 'Bat dau hieu luc.';
COMMENT ON COLUMN identity.employee_authority.valid_until IS 'Het hieu luc.';

