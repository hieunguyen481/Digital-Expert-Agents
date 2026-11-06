-- Dữ liệu mẫu có nhãn [VinaNova-demo]: hồ sơ HSV-2026-00187 đang ở bước APPRAISAL
-- nên người xử lý phải là cán bộ thẩm định (appraiser), không phải QHKH.
-- Nếu không, quy tắc "đang do nhân viên khác xử lý" (loan_service) chặn phân tích sâu.
UPDATE credit.loan_application
   SET assigned_employee_id = '10000000-0000-4000-8000-000000000008'
 WHERE id = '75000000-0000-4000-8000-000000000001'
   AND status = 'APPRAISAL';
