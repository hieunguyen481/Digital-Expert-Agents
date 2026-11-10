# Thông báo và outbox gửi ra kênh ngoài

- Thông báo trong ứng dụng: bảng `integration.notification` (V045 sinh khi giao việc, trả lại, yêu cầu bổ sung, quyết định; V047 khi trưởng phòng chuyển người). API `GET /notifications`, `PATCH /notifications/{id}/read`; chuông ở `frontend/src/features/shell/NotificationBell.tsx`.
- Outbox kênh ngoài (V048): mỗi dòng `notification` sinh trong cùng giao dịch một dòng `integration.notification_delivery` (`channel='EMAIL'`, `PENDING`) có người nhận, loại, tiêu đề, nội dung, `link_path` (`/ho-so-vay/{id}`, chưa gồm địa chỉ gốc).
- Worker email: `backend/app/workers/email_worker.py` (dịch vụ `backend-email-worker`, profile `backend-workers`). Vòng `claim('EMAIL')` → SMTP → `finish`. V050 thêm tên và vai trò người nhận vào hàm claim. Gmail `smtp.gmail.com:587` STARTTLS, người gửi `lamdanh100@gmail.com`; mật khẩu ứng dụng ở biến `SMTP_APP_PASSWORD` trong `infra/.env.local` (người dùng tự điền; thiếu thì worker ghi log rồi thoát, hệ thống vẫn chạy).
- Chế độ chuyển thư demo: `EMAIL_DEMO_REDIRECT_TO` (mặc định `lamdanh100@gmail.com`; rỗng = gửi tới người nhận thật). Tiêu đề `[Demo → <email gốc> · <vai trò>] …`, thân thư có link `APP_BASE_URL + link_path`.
- Thử lại do hàm SQL (lùi `5 × lần thử` phút, tối đa 5 lần); `Message-ID` cố định theo id bản ghi. Giới hạn: tiến trình chết giữa lúc gửi xong và ghi SENT thì thư có thể tới hai lần.
- Thêm kênh mới: mở rộng `ck_notification_delivery_channel` và trigger `integration.enqueue_notification_delivery`.
- Test: `backend/tests/unit/test_email_worker.py` (SMTP giả lập cục bộ, không gửi thật).
