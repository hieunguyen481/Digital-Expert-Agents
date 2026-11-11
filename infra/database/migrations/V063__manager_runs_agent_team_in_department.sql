-- V063 (N01): Trưởng phòng chạy đội agent trên hồ sơ thuộc phòng mình mà không cần giữ bước
-- (docs/business/ma-tran-phan-quyen.md: "Trưởng phòng trên hồ sơ của phòng").
-- Vẫn bắt buộc started_by = người đang đăng nhập; các vai khác giữ điều kiện cũ (đang giữ hồ sơ).
-- Các bảng engine ghi tiếp (case_run, case_event, action_proposal...) đã cho phép qua can_read_customer (V060).
DROP POLICY loan_agent_run_insert_policy ON credit.loan_agent_run;
CREATE POLICY loan_agent_run_insert_policy ON credit.loan_agent_run
FOR INSERT TO bank_app
WITH CHECK (
    started_by = identity.current_employee_id()
    AND (
        identity.can_write_loan(identity.current_employee_id(), loan_application_id)
        OR identity.loan_in_manager_department(identity.current_employee_id(), loan_application_id)
    )
);
