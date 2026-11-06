-- Dữ liệu mẫu có nhãn [VinaNova-demo]: khách VinaNova chưa gán người phụ trách để
-- cán bộ có quyền (appraiser) nhận xử lý qua assignment/claim; quy tắc claim chỉ cho
-- phép khi khách chưa gán hoặc đã gán cho chính người đó.
UPDATE customer.customer
   SET relationship_manager_id = NULL, version = version + 1, updated_at = CURRENT_TIMESTAMP
 WHERE id = '56000000-0000-4000-8000-000000000001'
   AND relationship_manager_id = '10000000-0000-4000-8000-000000000001';
