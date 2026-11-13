-- Chat gắn hồ sơ/khách: người XEM được hồ sơ/khách (Kiểm toán, Trưởng phòng của phòng) mở được hội thoại gắn ngữ cảnh đó.
-- Policy INSERT của ai.conversation trước đây dùng can_access_* (quyền xử lý) nên chặn họ ở tầng RLS (42501 -> 403)
-- dù lớp ứng dụng đã dùng luật đọc. Đổi sang đúng luật đọc có sẵn (can_read_customer / can_read_loan): không viết luật mới,
-- không nới quyền ghi vào hồ sơ; hội thoại vẫn chỉ của chính người tạo (employee_id = người hiện tại).
DROP POLICY conversation_insert_policy ON ai.conversation;
CREATE POLICY conversation_insert_policy
ON ai.conversation
FOR INSERT
TO bank_app
WITH CHECK (
    employee_id = identity.current_employee_id()
    AND (
        active_customer_id IS NULL
        OR identity.can_read_customer(identity.current_employee_id(), active_customer_id)
    )
    AND (
        active_loan_application_id IS NULL
        OR identity.can_read_loan(identity.current_employee_id(), active_loan_application_id)
    )
);
