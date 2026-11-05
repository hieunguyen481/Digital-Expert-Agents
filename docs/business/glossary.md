# Thuật ngữ cố định

Bảng thuật ngữ cố định của giao diện (G4), nguồn: mục 15 của hệ thống thiết kế đợt 1.

| Ngữ cảnh | Dùng | Không dùng |
|---|---|---|
| Trạng thái số liệu trong bảng/dòng | **"AI đề xuất"** · **"Đã xác nhận"** · **"Cần xác minh"** (nhãn ngắn, chữ + icon, mục 4.2) | "Chờ xác nhận", "Chưa duyệt", "Nghi vấn" |
| Meta câu trả lời AI và khối `.ai-block` | **"AI đề xuất – chưa xác nhận"** (bản dài, chỉ ở 2 chỗ này) | bản dài trong bảng |
| Số đếm mục lục | **"n chưa xác nhận"** / **"n cần xác minh"**, viết thường, luôn có số; bản ngắn "n chưa XN" / "n cần XM" phải có `title` đầy đủ | "Chưa XN" không số, "3 CHƯA XN" |
| Trạng thái tài liệu | **"Thiếu"** · **"Hết hiệu lực"** · **"Đã đủ"** (bằng chữ) | "Quá hạn", "Thiếu sót", "OK", chỉ icon |
| Nguồn số liệu CIC máy-máy | **"Hệ thống CIC"** (E7) | "CIC (AI đọc)" |
| Chỉ số nợ sau khi cộng khoản vay mới | **"Nợ vay/EBITDA sau cấp TD"** kèm công thức (G14) | "DTI" (không dùng trên UI), "Nợ/EBITDA" khi đã cộng khoản mới |
| Sao kê tài khoản | **"Sao kê 12 tháng"** (G12) | "6 tháng" |
| Ngân hàng khác, doanh nghiệp mẫu | Tên **hư cấu**, ví dụ "NH TMCP Phương Bắc (hư cấu)", "CTCP Cơ khí Trường An" (G13) | tên/thương hiệu thật hoặc gần giống |
| Nút AI | Header: **"Hỏi AI"**; tại chỗ: **"Hỏi AI về <đối tượng>"** (mục 4.7) | "Chat AI", "Trợ lý", "Hỏi Trợ lý AI" |
| Tiêu đề panel AI | **"Trợ lý AI"**, mọi trang | "Chat", tên agent, tên trang |
| Cờ gắn với tài liệu, đối tượng | **"n cờ"**, **"n cờ Cao"**, luôn có số (F4: "4 cờ Cao"). Trong câu văn được viết "đây là cờ Cao" | nhãn trạng thái "Có cờ", "Cờ Cao" không số |
| Số việc còn lại của wizard ở mục lục | "n còn lại", kèm `title` đầy đủ | |
| Nhóm liên quan bị QHKH bác | "Không thuộc nhóm" (F10) | |
| Cờ HTTD chuyển sang Thẩm định | "Cờ đã chuyển kèm Thẩm định", "n cờ chuyển kèm" | |
| Việc đang chờ Tuân thủ | **"Chờ Tuân thủ kết luận"**; ô hẹp được rút "Chờ Tuân thủ" kèm `title` đầy đủ (F8) | "Chờ TT", "Chờ AML" |
| Thẩm định đã nhận cờ `cickh` | **"Đã ghi nhận, chuyển Tuân thủ"** · nút **"Báo sớm Tuân thủ"** (F8) | "Đã xử lý" cho cờ này |
| Thẩm định thiếu tài liệu, hồ sơ ở lại | Nút **"Yêu cầu bổ sung"**; trạng thái **"Thẩm định – chờ bổ sung"**; bộ lọc **"Chờ bổ sung"** (Q6, F6) | "Bị trả lại" cho trường hợp này |
| Thẩm định trả để sửa đề xuất | Nút **"Trả lại QHKH"**, bắt buộc lý do; bộ lọc **"Bị trả lại"** (F6) | "Trả hồ sơ" |
| Vượt cấp sau khi cộng lại | **"Nâng cấp phê duyệt"** (Q4, F10) | "Chuyển cấp" |
| Nhóm tài liệu đã đủ | **"Đã đủ (n)"**, mở được (F2) | "Hoàn tất" |
| Tài liệu minh họa, không có bản xem | Dòng ghi **"minh họa"**; trình xem ghi **"Bản minh họa – tài liệu này chưa có ảnh trong mockup"** (F2) | "Không tìm thấy", "Lỗi" |
| Câu chữ pháp lý chưa chắc chắn | **"Pháp chế cần xác nhận"** (F9) | câu khẳng định |

- **Icon trạng thái đứng một mình** (không kèm chữ) phải có `aria-label` và `title` cùng nội dung chữ ở bảng trên. Ở bước có hành động xác nhận (ví dụ 04 bước 1) trạng thái "Đã xác nhận" phải có **chữ**, không chỉ icon.

