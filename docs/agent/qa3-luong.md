# QA đợt 3: kiểm thử luồng nghiệp vụ trên web (bản V052, HEAD b7df7de)

Phương pháp: Playwright thao tác giao diện thật trên http://localhost:3000, đăng nhập Keycloak thật, chỉ dùng hồ sơ tự tạo hoặc chỉ đọc; không reseed, không sửa DB (chỉ SELECT). Hồ sơ benchmark (không chọn được ở ô khách) được tạo bằng API với token QHKH. Ảnh và log ở `/tmp/q3/` (không commit). Chạy làm hai phiên; phiên 2 bổ sung các mục "chưa kiểm tra" của phiên 1. Stack dùng chung với crew khác (d1 nạp lại seed) nên có một số dữ liệu đổi giữa chừng, đã ghi ở từng mục.

## Tổng số lỗi theo mức
Chặn demo: 0 · Cao: 2 · Vừa: 0 · Nhẹ: 5 · Cần xác nhận: 8

## Lỗi đã tái hiện

### QA3-01 · Cao · Cấp phê duyệt (Giám đốc chi nhánh / Phê duyệt)
- Bước: đăng nhập `director.hn@example.local`, mở `/ho-so-vay/75000000-0000-4000-8000-000000000013` (HSV-2026-00163, 55 tỷ, bước APPROVAL do `approver@` giữ) → thấy nút "Quyết định"; ghi quyết định APPROVED. Phiên 2 xác nhận lại: cả `approver@` và `director.hn@` đều thấy "Quyết định" ở hồ sơ này.
- Mong đợi: nút khóa kèm lý do, hoặc API trả 4xx rõ ràng (ma-tran-phan-quyen §2 `decide`, rules Q4 cấp theo tổng cấp tín dụng).
- Thực tế: `POST /loan-applications/…/transitions` trả **500** (log backend-api: `new row violates row-level security policy for table "loan_decision"`, người ghi `director.hn`). Giao diện hiện nút theo vai không theo người giữ bước/cấp (ảnh `/tmp/q3/shots/loan13-giamdoc.png`). Phiên 2 gặp lại 500 ở hồ sơ tự tạo `7f73c4d3-…` khi `director.hn` bấm Ghi quyết định (hồ sơ APPROVAL, `list_case_steps` rỗng, xem X6).
- Nghi ngờ: `ActionsPanel.tsx:107-109` chỉ kiểm `has('loan_approver')` và `state.excluded`, không kiểm cấp/người giữ; tầng service không kiểm quyền ghi trước khi INSERT `loan_decision` (RLS `can_write_loan`) nên lỗi RLS thành 500.

### QA3-05 · Cao · QHKH (hồ sơ có tổng cấp tín dụng > 20 tỷ)
- Bước: QHKH tạo đề xuất 55, 100, 101 và 150 tỷ cho "Mekong Flex"; ở "Hồ sơ tài liệu" tải một PDF vào mục `SME-08-AUDITED-FS` (mục "Có điều kiện", không có nút Đề xuất ngoại lệ), ngoại lệ hết các mục còn lại, tra CIC mới → "Tóm tắt và gửi".
- Mong đợi: mục BCTC kiểm toán đã tải thì đạt điều kiện E5 và nút "Gửi Hỗ trợ tín dụng" bật (rules E5, gates.py "AUDITED_FS_REQUIRED").
- Thực tế: nút vẫn khóa, lý do "Chưa đủ điều kiện: Có BCTC kiểm toán khi tổng cấp tín dụng trên 20 tỷ" (4/4 lần). Tài liệu tải lên có `document_type=FINANCIAL_STATEMENT`, `document_subtype` rỗng. Hệ quả: qua giao diện không thể gửi hồ sơ > 20 tỷ, nên cấp 2, cấp 3 và cảnh báo không kiểm thử được bằng luồng đi trọn (xem Chưa kiểm tra).
- Nghi ngờ: `workflow_repository.py:629-631` đòi `document_subtype = 'AUDITED'`; chỉ seed (`R__seed_sme_batch1.sql:799,820`) đặt giá trị này, luồng tải lên theo mục checklist không gán subtype. Chưa xác định chỗ gán đúng.

### QA3-02 · Nhẹ · Mọi vai (404)
- Bước: mở `/customer/<id ngoài phạm vi>` hoặc `/ho-so-vay/<id không có>` → tiêu đề trang chứa chữ tiếng Anh "No Found" thô cạnh "Không tìm thấy…". Nguồn: `CustomerDetailPage.tsx:71-80` dùng antd `Result status="404"`. Mong đợi: không mã/chữ thô (brief nhóm 6).

### QA3-03 · Nhẹ · Thẩm định, `/chat`
- Tin trả lời hiện mã thô `NEEDS_VERIFICATION` (3 lần, 1920). Số liệu `/tmp/q3/perm.json`.

### QA3-04 · Nhẹ · Kiểm toán, `/nhat-ky-kiem-toan`
- Bảng hiện mã thô `WORKFLOW_PASS_TO_APPRAISAL`, `LOAN_APPLICATION`, `WORKFLOW_SUBMIT_TO_CHECKING`; bộ lọc "Hành động" cũng nhận mã. Có thể chủ đích cho kiểm toán; nếu không, cần nhãn tiếng Việt.

### QA3-06 · Nhẹ · QHKH, "Tóm tắt và gửi"
- Bước: tạo bản nháp, mở "Tóm tắt và gửi" (1366×768). Dòng "Còn thiếu hoặc hết hạn:" liệt kê mã thô `SME-01-CREDIT-REQUEST, SME-02-BUSINESS-REGISTRATION, …` thay vì tên tài liệu (tên có sẵn ở tab Hồ sơ tài liệu). Mong đợi: chữ tiếng Việt, không mã thô (nhóm 6).
- Nghi ngờ: nhãn điều kiện lấy `unmet`/chi tiết từ `backend/app/workflow/conditions.py` (mã checklist) không map sang tên.

### QA3-07 · Nhẹ · QHKH, cảnh báo doanh thu
- Bước: hồ sơ benchmark CIF-SME-058: cảnh báo "Doanh thu năm 2025 của khách là **1,500** tỷ đồng, vượt 1.000 tỷ…" dùng dấu phẩy kiểu Anh, trong cùng câu lại viết "1.000" kiểu Việt và "1.000 tỷ" ở chỗ khác. Mong đợi: một kiểu định dạng số (dấu chấm ngăn nghìn). Nguồn: `submission_service.py:123` f-string `{revenue[1] / 10**9:,.0f}`; cảnh báo 500 tỷ ở `:112` cũng dùng `{warn_billion:,}` (hiện "500", chưa lộ lỗi vì dưới 1.000).

## Cần xác nhận
- **X1 (Q10 CIC):** rules.md Q10: hiệu lực đến ngày tra + 29. `agent_engine/common/facts.py:14` `CIC_VALID_DAYS = 30` và `:78` `(today - d).days > CIC_VALID_DAYS` → ngày tra +30 vẫn còn hiệu lực: lệch 1 ngày so với rules. Xác nhận bên nào đúng.
- **X2 Luồng 2 (Cần bổ sung):** `full-flow` luồng 2 (khách Logistics Cảng Xanh) chạy đội agent, kẹt "In Analysis" quá 300 s. Gặp 1/1 lần, chưa lặp lại.
- **X3 Trưởng phòng không đọc được hồ sơ nào:** `credit.manager@example.local` có 0 phạm vi (`identity.employee_scope`), 0 khách, 0 hồ sơ được giao; `/viec-cua-toi` trống; `GET /loan-applications` trả 405 (không có danh sách); mở hồ sơ mới tạo ở CHECKING và hồ sơ seed đều thấy "ngoài phạm vi". `reassign-candidates` và `reassign` (V047) đòi `identity.can_read_loan` nên "Chuyển người xử lý" không dùng được trên giao diện (testid `reassign` không bao giờ hiện). Có thể đúng theo Q-M (chỉ đọc hồ sơ được phân công) nhưng khi đó chức năng không có đường dùng: cần quyết định cấp phạm vi cho trưởng phòng hay đổi nghiệp vụ.
- **X4 PDF scan ở bước Thẩm định:** hồ sơ `8efbaab3-…` (PDF scan) quá thời gian lúc Thẩm định điền Tờ trình (phiên 1); chưa lặp lại, không rõ do giao diện hay mạng.
- **X5 Quản trị `/tra-cuu-chinh-sach`:** hiện "Chỉ đọc" rồi "Không tải được danh sách chính sách" (Quản trị không có `policy:read`, đúng ma trận) nhưng khác các trang khác (báo "Không có quyền xem").
- **X6 Mất bước xử lý của hồ sơ giữa chừng:** hồ sơ tự tạo `7f73c4d3-…` đi đến APPROVAL, 4 thông báo CASE_ASSIGNED có đủ; ~1 phút sau, khi Giám đốc ghi quyết định: POST transitions 500, `credit.list_case_steps` của hồ sơ = 0 dòng, các thông báo của hồ sơ biến mất (bảng `integration.notification` chỉ còn bản ghi từ 15:39). Trùng lúc stack chung nạp lại/làm sạch dữ liệu (crew d1), nên không rõ lỗi sản phẩm hay do dọn dữ liệu; hồ sơ tự tạo trước đó (2 tỷ, `2bfc3225-…`, APPROVED) cũng không còn thông báo nào.
- **X7 Ô khách QHKH loại khách benchmark:** `proposalService.ts:46` lọc `/benchmark/i` nên gõ "Thep Hoa Binh" hay "CIF-SME-068" đều ra "Không có khách hàng trong phạm vi của bạn" dù API `/customers` trả khách (do chính QHKH phụ trách). Có thể chủ đích (khách đo benchmark) nhưng cảnh báo 500/1.000 tỷ chỉ kiểm được bằng API; xác nhận có cần khách demo cho tình huống này không.
- **X8 Bấm hai lần "Tôi đã đối chiếu, xác nhận giá trị":** `dblclick` gửi 2 POST, cả hai 200 (không nhân đôi giá trị nhìn thấy). Chưa kiểm số dòng nhật ký; cần xác nhận có idempotent không.

## Đã kiểm tra đạt
- **Luồng đi trọn:** spec có sẵn trên stack thật: 12/13 đạt (`full-flow`, `decision-branches`, `business-gaps`): QHKH tạo đề xuất, chọn checklist, ngoại lệ, tra CIC, gửi; HTTD kiểm tra; Thẩm định chạy agent; Tờ trình 7 mục; Rủi ro và Tuân thủ; phê duyệt, có điều kiện, từ chối, trả về, từ chối ngoại lệ (R-05), Rủi ro trả lại; điều kiện trước giải ngân; PDF Tờ trình; trace sau quyết định. Hồ sơ 2 tỷ tự tạo đi HTTD → Thẩm định → Rủi ro → Tuân thủ → Phê duyệt, Giám đốc ghi quyết định APPROVED POST 200 (phiên 1).
- **Cảnh báo (nhóm 2):** hồ sơ benchmark tạo bằng API: 600 tỷ (CIF-SME-068) hiện đúng "Số tiền đề xuất từ 500 tỷ đồng trở lên là bất thường…"; 499 tỷ không hiện; CIF-SME-058 (doanh thu 1.500 tỷ) và -068 (1.400 tỷ) hiện đúng cảnh báo vượt 1.000 tỷ (Q8). Cảnh báo không chặn nút (chỉ nhắc). Lỗi định dạng số: QA3-07.
- **Gia hạn và rút:** R-01 gia hạn đúng 1 lần ("Đã gia hạn 1 lần" khóa), khách rút → "Đã rút". Rút quá hạn: hồ sơ seed HSV-2026-00201 (hạn bổ sung 10:00 UTC đã qua) nút "Rút hồ sơ quá hạn" bật; HSV-2026-00196 (hạn 13/11) nút khóa kèm lý do. Chỉ xem, không bấm vào hồ sơ seed.
- **OCR PDF scan (nhóm 2):** QHKH tải `scan-ho-so-lat-tam.pdf` vào mục SME-02, HTTD mở `/doi-chieu/<hồ sơ>`: tài liệu đọc xong không lỗi, 4 vùng tô; bấm vùng đầu → thẻ "Vốn điều lệ 5.000.000.000 dong, AI đề xuất, độ tin cậy 80%"; bấm "Tôi đã đối chiếu, xác nhận giá trị" → "Đã xác nhận bởi Chuyên viên Hồ sơ Mẫu" (POST 200). Ghi chú: ở phiên 1 tôi báo "không có nút xác nhận": sai, do chưa chọn tài liệu và vùng tô. `document-pipeline.spec` ca scan không chạy lại được vì hồ sơ seed cố định HSV-2026-00196 đã chuyển Thẩm định ("Hồ sơ đã chuyển Thẩm định", dữ liệu do crew khác đổi), ca PDF có chữ đạt.
- **Đề xuất hành động của agent:** `agent-actions.spec` 3/3 đạt (vai sai bị từ chối, QHKH thấy khối khóa kèm lý do, Thẩm định xác nhận, bấm hai lần không nhân đôi).
- **Thông báo (nhóm 3):** sau QHKH gửi → CASE_ASSIGNED cho `document.reviewer@`; sau HTTD chuyển → `appraiser@`; sau trình Rủi ro → `risk@`; sau Rủi ro trình phê duyệt → `director.hn@`; mỗi thông báo có 1 bản ghi `notification_delivery` kênh EMAIL, `link_path` đúng `/ho-so-vay/<id>`, mỗi người chỉ một thông báo cho bước của mình. Hồ sơ của crew khác (AF9D9303) có CASE_DECIDED cho QHKH, AGENT_ACTION_PROPOSED cho Thẩm định. R-02: Thẩm định trả lại → chuông QHKH hiện "Hồ sơ bị trả lại", bấm mở đúng hồ sơ, chuyển đã đọc. Hàng đợi email: SENT 112, FAILED 229 (`demo-reset: khong gui`, bản ghi cũ), PENDING/PROCESSING chuyển thành SENT dần; worker email đang chạy với SMTP thật và chuyển thư demo về một địa chỉ cố định (ghi trong log khởi động; bảng `notification_delivery` không lưu địa chỉ nhận nên không đối chiếu từng bản ghi; không ghi địa chỉ vào báo cáo). Brief nói worker chưa chạy: sai ở thời điểm kiểm tra.
- **Phân quyền (nhóm 4):** URL trực tiếp, 10 tài khoản × 9 URL × 1366/1920: `/de-xuat-vay`, `/nhat-ky-kiem-toan` chặn đúng vai ("Không có quyền xem trang này"); Kiểm toán thấy nhật ký chỉ đọc; Quản trị bị chặn nội dung nghiệp vụ; không cuộn ngang. R-04: Kiểm toán lọc nhật ký theo hành động; Tra cứu chính sách tìm điều khoản; hồ sơ 55 tỷ: Kiểm toán chỉ có "Tới phần hành động" và "Tải PDF" (không Quyết định); Quản trị bị chặn đúng. Lỗi còn: QA3-01 (Giám đốc/Phê duyệt cùng thấy Quyết định ở hồ sơ một người giữ).
- **Đổi tài khoản demo (nhóm 5):** `demo-switch.spec` đạt (Quản trị đổi qua từng vai, dải báo, quay về, nhật ký); 9 vai không phải Quản trị gọi `GET /demo/accounts` và `POST /demo/switch` đều 403, không thấy danh sách thả xuống; Quản trị GET 200.
- **Độ bền và giao diện (nhóm 6):** `token-expiry.spec` 2/2 đạt (401 → tự làm mới rồi gửi lại; mất phiên Keycloak → `/login` giữ returnTo); `layout.spec` 5/5 (không cuộn ngang, không lỗi console); bấm đúp "Tạo bản nháp" chỉ gửi 1 POST và chỉ tạo 1 hồ sơ; tải lại trang đề xuất giữ nguyên, quay lại về `/de-xuat-vay`; `loan-detail.spec` 5/5 (DSCR có nguồn, Tờ trình tự lưu và còn sau tải lại, VinaNova đi tới quyết định); `dashboard.spec` 3/3. Chặn gửi khi tổng cấp tín dụng > 20 tỷ thiếu BCTC kiểm toán hiện lý do đúng (nhưng xem QA3-05).
- `my-work.spec` 2/8 ca lệch: kỳ vọng badge cố định ("4", "3") nhưng thực tế "5", "4" cho `qhkh`, `tdinh`: do hồ sơ tạo thêm khi chạy song song, không phải lỗi sản phẩm.

## Chưa kiểm tra
- Cấp phê duyệt cấp 2 và cấp 3 (tổng 20–100 và > 100 tỷ): chặn bởi QA3-05 (không gửi được hồ sơ > 20 tỷ qua giao diện); chỉ xem hồ sơ seed 55 tỷ (HSV-2026-00163) ở chế độ đọc. Cần hồ sơ seed ở APPROVAL có người giữ khác nhau để thử từng nhánh, hoặc sửa QA3-05.
- "Nâng cấp phê duyệt": nút chỉ hiện ở Thẩm định khi cấp bắt buộc tăng sau khi gửi (`ActionsPanel.tsx:94`, `case_action_service.py:103`). Nhóm liên quan chỉ sửa được lúc nháp (`submission_service.py:58`, `editable_loan`), nên không có thao tác giao diện làm tăng cấp sau khi gửi; chưa thử được.
- Rút quá hạn thật (bấm) và gia hạn ở hồ sơ seed: không bấm vì sẽ đổi trạng thái hồ sơ seed; quá hạn chỉ tạo được khi đợi hết hạn hoặc sửa DB (cấm).
- Chuyển người của trưởng phòng: chặn bởi X3.
- Thông báo từng nhánh còn lại (CASE_DECIDED cho từng quyết định có điều kiện/từ chối/trả về, rút hồ sơ): thông báo của hồ sơ tự tạo bị xóa (X6), chỉ thấy CASE_DECIDED ở hồ sơ crew khác; chưa đối chiếu từng loại quyết định và chưa kiểm "đã đọc" từng người ngoài QHKH.
- Hết phiên ở các nút quyết định, bấm hai lần ở các nút quyết định (chỉ thử Tạo bản nháp và xác nhận trường OCR), Nhật ký kiểm toán theo từng vai ngoài Kiểm toán/Quản trị, rà chữ tiếng Việt toàn bộ ứng dụng (chỉ quét các trang đã mở).
