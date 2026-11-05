-- V021.1: lịch sử QHKH chỉ đọc với vai trò runtime (E8, tách bạch).
-- customer.relationship_manager_history là đầu vào của credit.is_excluded
-- (cựu QHKH bị loại khỏi phê duyệt 2 năm). Nếu bank_app được INSERT/UPDATE
-- theo can_access_customer thì chính QHKH cần bị loại có thể sửa
-- valid_from/valid_until để thoát loại trừ. Lịch sử chỉ do migration/seed
-- (hoặc một luồng chuyên biệt sau này) ghi.
DROP POLICY relationship_manager_history_insert_policy
    ON customer.relationship_manager_history;
DROP POLICY relationship_manager_history_update_policy
    ON customer.relationship_manager_history;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON customer.relationship_manager_history
FROM bank_app, bank_worker, bank_readonly;
