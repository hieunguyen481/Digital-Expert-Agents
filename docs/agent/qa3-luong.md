# QA đợt 3: kiểm thử luồng nghiệp vụ trên web (bản V052, HEAD b7df7de)

Phương pháp: Playwright thao tác giao diện thật trên http://localhost:3000, đăng nhập Keycloak thật, chỉ dùng hồ sơ tự tạo hoặc chỉ đọc; không reseed, không sửa DB (chỉ SELECT). Ảnh và log ở `/tmp/q3/` (không commit). Báo cáo **chưa đủ phạm vi**: dừng sớm vì giới hạn token, xem mục "Chưa kiểm tra".

## Tổng số lỗi theo mức
Chặn demo: 0 · Cao: 1 · Vừa: 0 · Nhẹ: 3 · Cần xác nhận: 5

## Lỗi đã tái hiện

### QA3-01 · Cao · Cấp phê duyệt (Giám đốc chi nhánh / Phê duyệt)
- Bước: đăng nhập `director.hn@example.local`, mở `/ho-so-vay/75000000-0000-4000-8000-000000000013` (HSV-2026-00163, 55 tỷ, bước APPROVAL do `approver@` giữ) → thấy nút "Quyết định"; ghi quyết định APPROVED.
- Mong đợi: nút khóa kèm lý do, hoặc API trả 4xx rõ ràng (ma-tran-phan-quyen §2 `decide`, rules Q4 cấp theo tổng cấp tín dụng).
- Thực tế: `POST /loan-applications/…/transitions` trả **500** (log backend-api: `new row violates row-level security policy for table "loan_decision"`, 3 lần trong 45 phút; người ghi `director.hn`). Chính sách RLS `loan_decision_insert_policy` đòi `can_write_loan`. Giao diện chỉ đọc lại: Giám đốc thấy nút "Quyết định" (ảnh `/tmp/q3/shots/loan13-giamdoc.png`).
- Nghi ngờ: tầng service không kiểm quyền ghi theo người giữ bước trước khi INSERT; frontend `ActionsPanel.tsx` hiện nút theo vai không theo người giữ bước. Chưa xác định file:dòng chính xác của service.
- Lưu ý: lần 500 trong log có thể do crew khác; phần nút hiển thị tôi tự đọc được.

### QA3-02 · Nhẹ · Mọi vai (404)
- Bước: mở `/customer/<id ngoài phạm vi>` hoặc `/ho-so-vay/<id không có>` → tiêu đề trang chứa chữ tiếng Anh "No Found" thô cạnh "Không tìm thấy…". Nguồn: `CustomerDetailPage.tsx:71-80` dùng antd `Result status="404"`. Mong đợi: không mã/chữ thô (brief nhóm 6).

### QA3-03 · Nhẹ · Thẩm định, `/chat`
- Tin trả lời hiện mã thô `NEEDS_VERIFICATION` (3 lần, 1920). Ảnh: không chụp; số liệu `/tmp/q3/perm.json`.

### QA3-04 · Nhẹ · Kiểm toán, `/nhat-ky-kiem-toan`
- Bảng hiện mã thô `WORKFLOW_PASS_TO_APPRAISAL`, `LOAN_APPLICATION`, `WORKFLOW_SUBMIT_TO_CHECKING`; bộ lọc "Hành động" cũng nhận mã. Có thể chủ đích cho kiểm toán; nếu không, cần nhãn tiếng Việt.

## Cần xác nhận
- **X1 (Q10 CIC):** rules.md Q10: hiệu lực đến ngày tra + 29. `agent_engine/common/facts.py:14` `CIC_VALID_DAYS = 30` và `:78` `(today - d).days > CIC_VALID_DAYS` → ngày tra +30 vẫn còn hiệu lực: lệch 1 ngày so với rules (backend UI tính đúng "hiệu lực đến hết" theo thao tác đã thấy). Xác nhận bên nào đúng.
- **X2 Luồng 2 (Cần bổ sung):** `full-flow` luồng 2 (khách Logistics Cảng Xanh) chạy đội agent, trạng thái kẹt "In Analysis" quá 300 s. Gặp 1/1 lần, chưa lặp lại; luồng 1 và các nhánh quyết định chạy đội agent đều xong.
- **X3 Trưởng phòng:** `credit.manager@example.local` mở hồ sơ mới tạo đang ở CHECKING thì thấy "không tìm thấy/ngoài phạm vi", nên không có nút "Chuyển người xử lý". Có thể đúng (RLS theo phạm vi, Q-M); chưa thử ở hồ sơ seed trong phòng.
- **X4 Hồ sơ kẹt APPRAISAL:** test phụ (hồ sơ `8efbaab3-1e15-4653-9ec2-995e2709f751`, PDF scan) quá thời gian ở bước Thẩm định điền Tờ trình, không rõ do giao diện hay mạng.
- **X5 Quản trị `/tra-cuu-chinh-sach`:** hiện "Chỉ đọc" rồi "Không tải được danh sách chính sách" (Quản trị không có `policy:read`, đúng ma trận) nhưng khác các trang khác (các trang kia báo "Không có quyền xem").
- Email: ban đầu 44 bản ghi `notification_delivery` đều FAILED (`demo-reset: khong gui`); sau đó có SENT 30, PENDING 24, PROCESSING 20, FAILED 140 (đã có worker chạy hoặc seed lại, không phải việc của tôi). Chưa đối chiếu địa chỉ chuyển demo.

## Đã kiểm tra đạt
- Chạy lại bằng spec có sẵn trên stack thật: 12/13 đạt (`full-flow`, `decision-branches`, `business-gaps`): QHKH tạo đề xuất, chọn checklist, ngoại lệ, tra CIC, gửi; HTTD kiểm tra; Thẩm định chạy agent; Tờ trình 7 mục; Rủi ro và Tuân thủ; phê duyệt, có điều kiện, từ chối, trả về, từ chối ngoại lệ (R-05), Rủi ro trả lại; điều kiện trước giải ngân; PDF Tờ trình; trace sau quyết định; R-02 chuông và link mở đúng hồ sơ; R-01 gia hạn đúng 1 lần và khách rút; R-04 nhật ký lọc, tra cứu chính sách, Quản trị không thấy Nhật ký.
- Phân quyền URL trực tiếp, 10 tài khoản × 9 URL × 1366/1920: `/de-xuat-vay`, `/nhat-ky-kiem-toan` chặn đúng vai (trang "Không có quyền xem trang này"); Kiểm toán thấy nhật ký chỉ đọc; Quản trị bị chặn nội dung nghiệp vụ; không cuộn ngang ở cả hai độ rộng.
- Đổi tài khoản demo: 9 vai không phải Quản trị gọi `GET /demo/accounts` và `POST /demo/switch` đều 403, không thấy danh sách thả xuống; Quản trị GET 200 và thấy danh sách. Spec `demo-switch` (đổi qua từng vai, dải báo, quay về, nhật ký) đạt trong đợt đầu của e2e có sẵn không chạy lại; tôi chưa chạy riêng.
- Bấm đúp "Tạo bản nháp", tải lại/quay lại: chưa chứng minh (test dừng trước), xem dưới.
- Chặn nút gửi khi tổng cấp tín dụng >20 tỷ thiếu BCTC kiểm toán hiện đúng lý do (rules Q4).

## Chưa kiểm tra
- Cảnh báo 500 tỷ và doanh thu >1.000 tỷ (khách benchmark "Thep Hoa Binh" không chọn được trong ô khách của QHKH; mã nguồn có sẵn tại `submission_service.py:112-128`).
- Cấp phê duyệt cấp 2 và nâng cấp phê duyệt; rút hồ sơ quá hạn; trưởng phòng chuyển người; xác nhận trường OCR trên giao diện (trang đối chiếu của HTTD không có nút xác nhận trong thử nghiệm, chưa kết luận); đề xuất hành động của agent và xác nhận (có e2e riêng, không chạy lại).
- Thông báo từng sự kiện theo từng người (chỉ đối chiếu DB nhóm CASE_ASSIGNED/RETURNED/WAITING_INFO/SUPPLEMENT), đã đọc, địa chỉ chuyển demo.
- Hết phiên, bấm hai lần ở các nút quyết định, Nhật ký kiểm toán theo từng vai chi tiết, chữ tiếng Việt toàn bộ.
