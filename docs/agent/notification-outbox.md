# Thông báo và outbox gửi ra kênh ngoài

- Thông báo trong ứng dụng: bảng `integration.notification` (V045 sinh khi giao việc, trả lại, yêu cầu bổ sung, quyết định; V047 khi trưởng phòng chuyển người). API `GET /notifications`, `PATCH /notifications/{id}/read`; chuông ở `frontend/src/features/shell/NotificationBell.tsx`.
- Outbox kênh ngoài (V048): mỗi dòng `notification` sinh trong cùng giao dịch một dòng `integration.notification_delivery` (`channel='EMAIL'`, `PENDING`) có người nhận, loại, tiêu đề, nội dung, `link_path` (`/ho-so-vay/{id}`, chưa gồm địa chỉ gốc).
- Worker gửi email (chưa viết, đợt sau) chỉ cần: `NotificationDeliveryRepository.claim('EMAIL', worker_id)` → gửi Gmail qua SMTP với `recipient_email` + `BASE_URL + link_path` → `finish(id, ok=…, error=…)`. Lỗi lùi hạn `5 × lần thử` phút, quá 5 lần thì `FAILED`; lô `PROCESSING` treo quá 5 phút được lấy lại. Hai hàm SQL cấp quyền cho `bank_worker`; không gửi trong giao dịch nghiệp vụ.
- Thêm kênh mới: mở rộng `ck_notification_delivery_channel` và trigger `integration.enqueue_notification_delivery`.
- Chưa có worker nên bảng tích lũy dòng `PENDING`; worker đầu tiên phải xử lý hoặc dọn bản ghi cũ.
