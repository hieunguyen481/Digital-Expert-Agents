# Chấm điểm ứng dụng thật "Sổ Tín Dụng", lần 1

Giám khảo độc lập (crew `gu1`). Ngày chấm 11/11/2026, trên web http://localhost:3000 chạy từ repo chính, HEAD `import/duskdash` `c414d02`. Lần này chấm sản phẩm thật, không chấm mockup. Đích so sánh là `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Ba lần chấm mockup trước được 6,55; 7,30 và 7,45.

## Phương pháp

- **Đăng nhập theo vai.** Dùng Playwright, đăng nhập Keycloak bằng đúng tài khoản của từng vai: QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị.
- **Khung hình.** Mọi trang chụp ở 1366×768 và 1920×1080. Riêng đăng nhập, Việc của tôi, chi tiết hồ sơ và dashboard chụp thêm 1280×800 và 1440×900. Ảnh và script ở `/tmp/gu1/` (ngoài repo). Tên ảnh theo dạng `<vai>-<trang>-<khung>.png`.
- **Đo trên trang thật.** Mỗi ảnh đi kèm các số đo sau:
  - tràn ngang;
  - cỡ chữ nhỏ nhất;
  - tương phản WCAG, tính trên màu chữ đã trộn với màu nền thực tế, đi ngược cây DOM;
  - nút hoặc ô nhập không có tên truy cập;
  - số `h1` và số `main`;
  - vòng focus của phần tử đang focus.
- **Trạng thái đã xem.**
  - Đang tải: trì hoãn API 7 giây.
  - Lỗi: trả 500 cho API trang nhưng giữ `/me`. Trường hợp chặn cả `/me` cũng đã xem.
  - Rỗng: bộ lọc "Quá hạn", Trưởng phòng không có việc, tra cứu không có kết quả.
  - Không có quyền: Kiểm toán mở "Tạo đề xuất vay", Quản trị mở "Việc của tôi".
  - 404, hover và focus bàn phím.
  - Nút khóa kèm lý do.
  - Modal quyết định: chỉ mở rồi đóng bằng Esc, **không gửi**.
  - Ngăn kéo dấu vết, panel AI mở và đóng.
- **Phạm vi chỉ xem.** Không bấm hành động ghi nào trên hồ sơ seed. Không chạy đội agent: trạng thái "đang chạy" **chưa kiểm chứng**.
- **Chuẩn chấm.** Các skill frontend-design, design-critique, accessibility-review, design-system và ux-copy.

Số đo chung trên mọi trang và mọi khung:

- Tràn ngang bằng 0.
- Chữ nhỏ nhất 12px. Ngoại lệ là chat và panel AI, nhỏ nhất 11,5px.
- Ba font Newsreader, Be Vietnam Pro và IBM Plex Mono đều đã nạp (kiểm bằng `document.fonts`).
- Mỗi trang có 1 `h1` và 1 `main`. Ngoại lệ ghi ở mục 2, tiêu chí 8.

## 1. Bảng 10 tiêu chí

| # | Tiêu chí | Điểm | Căn cứ chính (ảnh trong `/tmp/gu1/`) |
|---|---|---:|---|
| 1 | Bản sắc và nhất quán giữa các trang | **7,0** | Bộ nhận diện đã thành hình ở hầu hết trang: thanh bên navy, nền giấy `#F1F2EE`, tiêu đề serif Newsreader, đường kẻ đôi dưới tiêu đề, khối AI viền đứt tím. Có ở `qhkh-mywork`, `kiemtoan-audit`, `httd-ocr-0001`, `kiemtoan-403`. Trừ điểm vì 4 nơi lệch: (a) trang Keycloak khác hẳn mockup 22; (b) chat còn kiểu cũ, logo "Sổ Tín Dụng" lặp trong cột hội thoại, nhãn chữ hoa "7 NGÀY QUA"; (c) còn kiểu mặc định của Antd: số trang đang chọn chữ navy trên nền navy, thẻ màu cảnh báo Antd trong ngăn kéo dấu vết; (d) nút trong hàng bảng lúc đặc navy ("Sửa đề xuất", "Mở hồ sơ"), lúc viền ("Xem hồ sơ"), và thẻ KPI có ba kiểu khác nhau trên cùng loại trang. |
| 2 | Phân cấp thông tin, hành động chính ở màn đầu | **6,0** | Việc của tôi có KPI, bảng và khoảng 5,5 hàng nhìn thấy ở 1366, đạt. Chi tiết hồ sơ hỏng phân cấp: nút vàng đầu trang luôn là liên kết cuộn "Tới phần hành động" / "Còn N việc · tới phần hành động". Nút này hiện cả khi vai **không có hành động nào** (`qhkh-loan13`: panel ghi "Không có hành động nào cho vai trò của bạn"). Hành động thật như "Quyết định" hay "Sửa đề xuất" lại không nằm trên đầu trang. Mockup 12b đặt "Ghi quyết định" ngay đầu trang. Khối "AI đề xuất" ở màn đầu chỉ ghi "Chưa chạy đội agent trên hồ sơ này" trên **mọi** hồ sơ seed đã mở, nên kết luận AI không bao giờ hiện. `h1` "Hồ sơ của tôi" khác tên mục trên thanh bên "Việc của tôi", và thẻ bảng lặp lại đúng tiêu đề đó. Tạo đề xuất là một thẻ 4 ô rộng khoảng 560px, nửa phải trống. |
| 3 | Chữ và khả năng đọc tiếng Việt | **7,0** | Newsreader hiển thị dấu tiếng Việt chuẩn ("Không có quyền xem trang này", "Đối chiếu tài liệu · CTCP Bao bì VinaNova"). Thân chữ Be Vietnam Pro 14px dễ đọc, cỡ nhỏ nhất 12px. Trừ điểm vì: tên khách hàng seed không dấu ("Cong ty CP Co khi Da Nang (mau benchmark v8)", "Chinh sach Tin dung Ban le Mau"); chuỗi viết hoa thô "ĐỀ XUẤT PHÊ DUYỆT" trong ngăn kéo; "7 NGÀY QUA" chữ hoa 11,5px; chữ trong bong bóng chat 17px, lệch thang chữ; số lúc mono lúc sans (KPI "55", "45", "15" dùng sans, mã hồ sơ ở trang Khách hàng cũng sans); tiêu đề cột "Giá trị khai báo" lại dùng mono. |
| 4 | Màu và ngữ nghĩa trạng thái | **6,5** | Viên trạng thái (StatusPill) có màu và chấm nhất quán. Thẻ "Đạt" xanh, thẻ "Chưa chốt" hổ phách và thẻ "Đã chốt nguồn" xanh ở `httd-ocr-0001` đều đúng nghĩa. Vi phạm quy tắc §4 "vàng chỉ dùng cho mục đang chọn, KPI chính và nút cam kết": vàng đặt trên liên kết cuộn, còn nút cam kết "Quyết định" lại màu navy (`pheduyet-loanA`). Chip "Đã chuyển cấp" trên dashboard dùng đỏ nguy hiểm cho một trạng thái bình thường. Hai băng thông tin xanh dương giống hệt nhau xếp chồng ở tab So sánh. Băng xanh dương ở trang đối chiếu là màu không có trong bảng màu "Sổ Tín Dụng". |
| 5 | Mật độ, lưới, khoảng cách ở 1366 và 1920 | **6,5** | Không trang nào tràn ngang. Ở 1920 nội dung căn giữa có giới hạn bề rộng, đạt. Trừ điểm vì: bảng Dấu vết bị cắt cột bên trong thẻ ở 1366; Tạo đề xuất trống nửa phải; dashboard Tổng quan có cột giữa trống và khoảng 50px thừa trên thanh tab; trang đối chiếu không có tài liệu chỉ còn một thẻ "Checklist tài liệu" trơ tiêu đề cạnh một cột trống; mở panel AI ở Việc của tôi (1366) ép bảng, tên khách xuống dòng; mục "Hồ sơ chờ phê duyệt (3)" trên thanh bên xuống 2 dòng; ở Nhật ký kiểm toán mã "LA-20261111-EAADA6D7" gãy 2 dòng làm hàng cao không đều; thẻ KPI cao 86px thay vì dải 64px như mockup 02. |
| 6 | Thành phần và trạng thái | **6,5** | Trạng thái lỗi rất tốt và đồng bộ: hình, tiêu đề, một câu, nút "Thử lại" (`pheduyet-error2-mywork`, `-loan`, `-dash`). Trang 403 và trang Quản trị không có quyền đều có hình khiên và lời giải thích theo vai. Nút khóa có ô lý do ("Trình phê duyệt", "Tải PDF", "Tạo bản nháp – Chọn khách hàng."). Ngăn kéo dấu vết đóng bằng Esc trả focus về hàng. Trừ điểm vì: rỗng theo bộ lọc chỉ là một dòng chữ, không hình, không nút, cột tiêu đề nhảy; lúc tải đầu là màn khung xám không có khung ứng dụng (`pheduyet-loading-loan`); modal quyết định là form Antd thô, không có thẻ lựa chọn và bước xác nhận như mockup 12b (`pheduyet-decision-modal`), nút "Trả lại bổ sung" xám trôi nổi và ô chọn "Trả về Thẩm định" tách rời không có nhãn; stepper của hồ sơ bị trả về mất lịch sử các bước đã qua. |
| 7 | AI đề xuất và người quyết định; giám khảo hiểu đội agent trong 30 giây | **6,0** | Điểm mạnh là ngăn kéo "Lượt phân tích" ở Dấu vết. Ngăn kéo có khối "AI đề xuất / Planner giao việc", sơ đồ Planner → các agent (Xong) → Validation → "Người quyết định" và mục "Luồng phối hợp", đủ để hiểu trong 30 giây. Ở trang đối chiếu, giá trị AI trích ra nằm trong khung đứt tím, ghi "AI trích xuất", và có câu "Hệ thống không tự chọn số nào". Điểm yếu nằm ở chỗ giám khảo nhìn đầu tiên, trang chi tiết hồ sơ: không hồ sơ seed nào có lượt chạy, nên chỉ thấy chuỗi agent màu xám và "Chưa chạy đội agent". Nhãn "Người quyết định" bị gắn cho panel hành động của **mọi** vai (QHKH, Rủi ro), trái §8, làm mờ thông điệp "chỉ cấp có thẩm quyền quyết định". Cờ rủi ro ghi "Nguồn: AI kiểm tra tài liệu" nhưng không nằm trong khối AI. Tin nhắn trợ lý trong chat không có nhãn AI. Tên gọi trộn "Planner" với "Điều phối". QHKH thấy 0 lượt ở Dấu vết trong khi Tổng quan ghi 829 lượt. |
| 8 | Tiếp cận WCAG AA | **5,0** | **Lỗi nặng:** vòng focus của nút Antd là viền 2px màu `#DCE4F1` (navy-100) trên nền `#FBFBF8`/`#F1F2EE`, tỉ lệ khoảng 1,23:1 (cần ≥3:1 theo 1.4.11), gần như vô hình (`qhkh-mywork-focus14`). Đã kiểm trên nút chính trang đăng nhập và nút trong hàng bảng. Nguyên nhân: kiểu `:focus-visible` mặc định của Antd thắng quy tắc màu đồng trong `styles/accessibility.css`. Các lỗi đo được khác: số trang đang chọn tỉ lệ 1,00:1 (navy `#14284B` trên navy); thẻ "1." 2,76:1 (`#D48806` trên `#FFFBE6`, 12px); textarea panel AI và textarea chat không có nhãn; nút "more" của tab Antd không có tên; trong modal quyết định hai ô nhập không có tên truy cập (đo khi Tab); 404 và trang lỗi chi tiết hồ sơ không có `h1`. Điểm tốt: có skip-link; focus trong ngăn kéo là vòng box-shadow rõ; liên kết hàng ở Việc của tôi có viền đồng 3px, khoảng 3,1:1, vừa đạt. |
| 9 | Văn phong UX | **6,0** | Phần lớn câu chữ tốt và đúng vai, ví dụ "Tài khoản quản trị chỉ quản lý người dùng, phân quyền, ngưỡng và cấu hình AI…", "Trang "Tạo đề xuất vay" không thuộc phạm vi của Kiểm toán nội bộ", "Hệ thống không tự chọn số nào". Trừ nhiều vì lộ mã thô và lỗi chữ: "(APPRAISAL) [nguồn: loan_applications]" và "DỮ LIỆU" trong chat; "Mã kỹ thuật: bộ chấm v3 · chế độ LLM llm · nhãn: f7 sau sửa L05-L18 v7…" ở So sánh; khóa trường "cfo", "debt", "dscr", "SYSTEM_CIC" ở đối chiếu; "Checklist" tiếng Anh; "gom 3 mục" thiếu dấu; "Đang cho ý kiến rủi ro" (nên là "Chờ ý kiến rủi ro"); "đề xuất.." thừa dấu chấm; "Ghi Ý kiến Rủi ro" viết hoa lẫn lộn; "Hỏi AI" lệch với "Trợ lý AI"; "tỷ VND" lệch với quy tắc "tỷ đồng"; thời lượng ghi "ms" và "1,0 phút" trong khi quy tắc là giây; "ai (token)" viết thường; "Chỉ đa agent" mâu thuẫn tiêu đề "So sánh single và multi"; hậu tố "(dữ liệu mẫu)" lặp khắp nơi; lỗi Keycloak "Sai tên đăng nhập hoặc mật khẩu." không chỉ cách xử lý. |
| 10 | Độ hoàn thiện của sản phẩm thật | **5,5** | Không vỡ bố cục và không tràn ngang ở cả 4 khung. Chuyển trang nhanh: Dấu vết lần 2 khoảng 2,3 giây, lần đầu khung xám lâu. Nhưng nhiều dấu chưa trau chuốt mà giám khảo sẽ thấy ngay: lộ mã kỹ thuật như mục 9; panel AI còn hội thoại thử nghiệm cũ (câu hỏi thời tiết, câu "Bỏ qua mọi quy tắc…"); tin nhắn đầu trong chat bị header che; liên kết "Mở" bị cắt ở mép thẻ; bảng Dấu vết bị cắt cột, cột "Hồ sơ vay" hiện "—"; Keycloak lặp tiêu đề "Đăng nhập Sổ Tín Dụng", logo lệch trái so với tiêu đề căn giữa, ô mật khẩu chỉ có viền dưới; thông báo trùng lặp và lộ mã "LA-20261111-EAADA6D7"; bảng theo agent có hàng "system" viết thường, "2537" không có dấu phân cách hàng nghìn trong khi bảng bên cạnh ghi "2.382". |

**Điểm trung bình: 6,20 / 10** (7,0 + 6,0 + 7,0 + 6,5 + 6,5 + 6,5 + 6,0 + 5,0 + 6,0 + 5,5 = 62,0).

## 2. Bảng từng trang

Mỗi trang có 1 đến 3 điểm phải sửa, mỗi điểm theo dạng **ảnh → phần tử → tệp nghi ngờ**. Đường dẫn tệp tính từ `frontend/src/`, trừ Keycloak nằm trong `infra/`.

| Trang (vai) | Điểm | Phải sửa |
|---|---:|---|
| Đăng nhập `/login` (khách) | **8,5** | 1. `none-login-*` → focus nút "Đăng nhập" viền navy-100 khó thấy → `theme/index.ts` (`colorPrimaryBorder`/`controlOutline`), `styles/accessibility.css`. Ngoài lỗi này, trang gần như đúng mockup 01 ở cả 4 khung. |
| Đăng nhập Keycloak :8080 | **6,0** | 1. `none-kc-*`, `none-kc-error-*` → "Đăng nhập Sổ Tín Dụng" xuất hiện 2 lần, logo "S" lệch trái so với tiêu đề căn giữa → `infra/keycloak/theme/so-tin-dung/login/` (template và CSS). 2. Ô mật khẩu chỉ có viền dưới, nút mắt tách ô, nút navy lệch tông → cùng thư mục. 3. Thiếu "(bắt buộc)" và dòng "Dùng tài khoản nội bộ"; lỗi không chỉ cách xử lý → `messages_vi.properties` của theme. |
| Khung: thanh bên, thanh trên, dải demo (mọi vai) | **7,5** | 1. `pheduyet-*` → "Hồ sơ chờ phê duyệt (3)" xuống 2 dòng → `features/shell/navigation.ts` (nhãn ngắn hơn, ví dụ "Chờ phê duyệt") hoặc `shell.module.css`. 2. `quantri-home` → thanh bên chỉ có "Quản trị, Thông báo", trong khi §11.4 yêu cầu mọi vai có Tra cứu chính sách, Đội agent và Trợ lý AI → `features/shell/navigation.ts`. Trang Quản trị chưa có: ngoài phạm vi, không trừ. 3. Tên người dùng là dữ liệu seed ("Cán bộ Tín dụng Mẫu"); mockup dùng tên người thật. Chỉ ghi nhận. |
| Việc của tôi (QHKH, HTTD, Phê duyệt) | **7,0** | 1. `qhkh-mywork-focus14` → vòng focus vô hình trên nút trong hàng → `theme/index.ts`. 2. `qhkh_viec-cua-toi-1366x768` → `h1` "Hồ sơ của tôi" lệch với thanh bên "Việc của tôi"; thẻ bảng lặp tiêu đề; 4 thẻ KPI 86px thay vì dải 64px; tab lọc không có số đếm → `features/shell/PageHead.tsx`, `features/my-work/MyWorkPage.tsx`, `features/my-work/QueueTable.tsx`. 3. `qhkh-mywork-filter-quahan` (lọc "Quá hạn") → rỗng là một dòng chữ, cột nhảy → dùng `StateBlock` (`components/ui`) có hình và nút "Bỏ lọc"; nút hàng thống nhất một kiểu viền, chỉ hàng đầu được đặc → `QueueTable.tsx`. |
| Chi tiết hồ sơ vay (QHKH, Rủi ro, Phê duyệt, Kiểm toán) | **5,5** | 1. `qhkh-loan13`, `pheduyet-loanA` → nút vàng "Tới phần hành động" là liên kết cuộn, hiện cả khi không có hành động → `features/loan-detail/LoanHeader.tsx:66`: thay bằng nút hành động thật của vai (vàng chỉ cho nút cam kết), ẩn khi vai không có hành động. 2. `ruiro-loanA`, `qhkh-loan13` → nhãn "Người quyết định" gắn cho panel của mọi vai; cờ AI nằm ngoài khối AI → `features/loan-detail/ActionsPanel.tsx` (dùng `HumanBlock` với `tag` theo vai, chỉ cấp phê duyệt và Hội đồng giữ "Người quyết định"), `InfoPanels.tsx` (bọc cờ trong `AiBlock`). 3. Stepper hồ sơ trả về mất các bước đã qua (`qhkh-loan06`); KPI lúc 4 thẻ mono, lúc 2 thẻ sans; "tỷ VND"; liên kết "Mở" bị cắt → `LoanDetailPage.tsx`, `MetricsPanel.tsx`, `features/loan-detail/format.ts`. |
| Modal quyết định (Phê duyệt) | **5,5** | 1. `pheduyet-decision-modal-1366x768` → form Antd thô: một ô chọn "Phê duyệt", "Trả lại bổ sung" là nút xám trôi nổi, ô chọn "Trả về Thẩm định" không có nhãn; mockup 12b dùng 4 thẻ lựa chọn có mô tả và một bước xác nhận "Không hoàn tác được" → `features/loan-detail/ActionsPanel.tsx` (component modal quyết định). 2. Nút "Ghi quyết định" phải là vàng (nút cam kết) và nằm cùng hàng với "Hủy"; focus đầu tiên rơi vào nút đóng → cùng tệp. 3. Ô "Số tiền duyệt (VND)" nên ghi "(đồng)", căn phải, dùng mono → cùng tệp. |
| Tạo đề xuất `/de-xuat-vay` (QHKH) | **5,0** | 1. `qhkh-newprop-1366x768` → một thẻ 4 ô khoảng 560px, nửa phải trống, không có stepper như mockup 17 → trang tạo đề xuất trong `features/` (route `/de-xuat-vay`): dùng chung khung stepper với trang Soạn. 2. Ô "Sản phẩm" không có placeholder → cùng tệp. |
| Soạn đề xuất `/de-xuat-vay/:id` (QHKH) | **6,5** | 1. `qhkh-compose-1366x768` → stepper trái và form đúng tinh thần mockup, nhưng thiếu cột trợ lý hoặc kiểm tra bên phải, nên ở 1920 thừa chỗ. 2. `qhkh-compose-y700` → cuối bước 1 không có nút "Tiếp: Hồ sơ tài liệu"; "Lưu nháp" là nút phụ duy nhất → trang soạn đề xuất trong `features/`. 3. Tên sản phẩm có hậu tố "(dữ liệu mẫu)". |
| Đối chiếu, danh sách (HTTD) | **7,5** | 1. Mã hồ sơ mono và viên ngày ổn. Chỉ cần thống nhất kiểu nút và trạng thái rỗng với Việc của tôi → `features/reconciliation/`. |
| Đối chiếu, chi tiết và OCR (HTTD) | **6,0** | 1. `httd-ocr-0001-1366x768` → nhãn trường thô "cfo", "debt", "dscr", "SYSTEM_CIC" → `features/reconciliation/` (ánh xạ sang "Dòng tiền kinh doanh", "Nợ vay", "DSCR" qua `utils/glossary.ts`). 2. "Checklist tài liệu" đổi thành "Danh mục tài liệu"; hồ sơ không có tài liệu chỉ hiện thẻ trơ tiêu đề cạnh cột trống → `features/reconciliation/ChecklistPanel.tsx` (dùng `StateBlock`). 3. Băng thông tin xanh dương không có trong bảng màu → `reconciliation.module.css`. |
| Khách hàng, danh sách (QHKH) | **6,0** | 1. `qhkh-customers-*` → tên seed không dấu "Cong ty CP Co khi Da Nang (mau benchmark v8)" (lỗi dữ liệu, ghi nhận cho đội seed). 2. Số trang đang chọn tỉ lệ 1,00:1, nút trước và sau không có nhãn → `components/tables/DataTable` hoặc token `Pagination` trong `theme/index.ts`. 3. Mã hồ sơ dùng sans → `features/customers/`. |
| Chi tiết khách hàng (QHKH) | **6,5** | 1. Bố cục thưa; chưa có khối hồ sơ vay liên quan nổi bật → `features/customer/components/CustomerRecordGrid*`. 2. Thẻ "Ước tính" màu cam mặc định Antd → `features/customer/components/LoanEstimateCard.tsx:22`. |
| Thông báo (QHKH) | **6,5** | 1. `qhkh-notif-*` → lộ mã "LA-20261111-EAADA6D7", nhiều thông báo trùng → `features/notifications/` (hiện mã HSV hoặc DX, gộp trùng). 2. "đề xuất.." và hậu tố "(dữ liệu mẫu)" → cùng thư mục. |
| Đội agent, Tổng quan (QHKH, Phê duyệt) | **6,5** | 1. `qhkh-dash-1366x768`, `qhkh-dash-y700` → sơ đồ agent là các hộp xám tĩnh, không có thời lượng; thiếu biểu đồ tuần như mockup 25 → `features/dashboard/components/OverviewTab.tsx`. 2. Chip "Đã chuyển cấp" màu đỏ; hàng "system" viết thường; "2537" thiếu dấu chấm hàng nghìn → `OverviewTab.tsx`, `utils/format.ts` (`fmtInt`). 3. Khoảng thừa khoảng 50px trên tab; nút "more" của tab không có tên → `pages/AgentDashboardPage.tsx`. |
| Đội agent, Dấu vết và ngăn kéo (QHKH) | **6,0** (ngăn kéo 7,5) | 1. `qhkh-trace-test-*`, `qhkh-dash-trace-*` → bảng bị cắt cột ở 1366, cột "Hồ sơ vay" hiện "—"; QHKH thấy 0 lượt trong khi Tổng quan ghi 829 → `features/dashboard/components/TracesTab.tsx`. 2. `qhkh-trace-drawer-*` → thẻ "1." 2,76:1 → `features/agent-actions/ActionProposals.tsx:134` (`<Tag color={s.tone}>` → `StatusPill`). 3. "ĐỀ XUẤT PHÊ DUYỆT" chữ hoa thô, "gom", thời lượng "ms" và "1,0 phút", lẫn "Planner" với "Điều phối" → `features/dashboard/components/CaseTrace.tsx`, `utils/glossary.ts`. |
| Đội agent, So sánh (QHKH) | **6,0** | 1. `qhkh-dash-compare-*` → dòng "Mã kỹ thuật: bộ chấm v3 · chế độ LLM llm · nhãn: f7 sau sửa…" → `features/dashboard/components/ComparisonTab.tsx` (ẩn hoặc chuyển vào chú thích có thể mở). 2. Hai băng xanh dương giống nhau xếp chồng; "Chỉ đa agent" mâu thuẫn tiêu đề; "ai (token)" → cùng tệp. |
| Trợ lý AI, chat (QHKH) | **4,5** | 1. `qhkh-chat-*` → tin trợ lý lộ "(APPRAISAL) [nguồn: loan_applications]" và "DỮ LIỆU" → `features/chat/components/AssistantMessage.tsx`, `MessageBlocks.tsx` (nhãn nguồn tiếng Việt). 2. Không có nhãn "AI đề xuất" trên tin trợ lý; logo lặp trong `ConversationSidebar`; "7 NGÀY QUA" 11,5px → `AssistantMessage.tsx`, `ConversationSidebar.tsx/.module.css`. 3. Tin đầu bị header che; chữ bong bóng 17px, đệm dưới thừa; textarea không có nhãn → `MessageList.module.css`, `ChatComposer.tsx`. |
| Panel AI trượt bên phải (QHKH) | **6,0** | 1. `qhkh-mywork-aipanel-*` → còn hội thoại thử nghiệm cũ, textarea không có nhãn, chữ 11,5px → component panel trong `features/chat/` hoặc `features/shell/`. 2. Mở panel ở 1366 ép bảng, tên khách xuống dòng → cho panel phủ lên thay vì đẩy, hoặc thu cột. |
| Nhật ký kiểm toán (Kiểm toán) | **7,0** | 1. `kiemtoan-audit-1366x768` → mã "LA-20261111-EAADA6D7" gãy 2 dòng, hàng cao không đều → trang nhật ký kiểm toán (`white-space: nowrap`, hiện mã HSV). 2. Số trang 1,00:1 như trang Khách hàng. 3. Viên "Người" xám nhạt dễ lẫn; nên phân biệt "Người" và "Agent" rõ hơn. |
| Tra cứu chính sách (QHKH) | **8,0** | 1. Dòng "RETAIL-CREDIT-DEMO / Chinh sach Tin dung Ban le Mau" không dấu (lỗi dữ liệu). Trạng thái rỗng làm đúng chuẩn: hình, tiêu đề, câu, nút "Xóa từ khóa". |
| Không có quyền 403 (Kiểm toán, Quản trị) | **8,5** | 1. `kiemtoan-403` → tiêu đề trang "Tạo đề xuất vay" nhỏ, không phải `h1`; câu giải thích tốt. 2. `quantri-home` → nút "Mở Quản trị" màu xám trông như bị khóa → `features/shell/NoAccess.tsx`. |
| 404 | **8,0** | 1. `qhkh-404` → không có `h1` (h1 = 0), số "404" mono xám nhạt; không có khung ứng dụng nên mất ngữ cảnh → trang 404 trong `pages/` hoặc `routes.tsx`. |
| Trạng thái lỗi và đang tải | **7,5** | 1. `pheduyet-error2-*` tốt và đồng bộ. Cần sửa: lỗi chi tiết hồ sơ không có `h1`; trang Tổng quan dùng câu khác ("Kiểm tra kết nối rồi thử lại") và nút viền, trong khi trang khác dùng nút đặc → thống nhất trong `StateBlock`. 2. `pheduyet-loading-loan` → lúc tải đầu là màn xám không có khung hay thương hiệu → `app/` (AuthGate hoặc bootstrap). |
| Trưởng phòng, "Hồ sơ của phòng" | **7,5** | 1. `truongphong-home` → rỗng đúng chuẩn nhưng không có nút; câu "Không có việc đang chờ bạn" không hợp với trang "Hồ sơ của phòng" (trưởng phòng cần xem toàn phòng) → `MyWorkPage.tsx`. |
| Phiên Hội đồng, Quản trị | — | Chưa có trang: ngoài phạm vi, không tính vào trung bình. |

Trung bình 24 trang là **6,65**. Con số này chỉ để tham khảo; kết luận dựa trên bảng tiêu chí.

## 3. Tương phản đo được (màu thực tế trên trang)

| Phần tử | Chữ hoặc viền / nền | Tỉ lệ | Yêu cầu | Kết quả |
|---|---|---:|---:|---|
| Vòng focus nút Antd | `#DCE4F1` / `#FBFBF8` | khoảng 1,23 | 3,0 | **Trượt** |
| Số trang đang chọn (Khách hàng, Nhật ký) | `#14284B` / `#14284B` | 1,00 | 4,5 | **Trượt** |
| Thẻ "1." ở ProposalChain trong ngăn kéo | `#D48806` / `#FFFBE6`, 12px | 2,76 | 4,5 | **Trượt** |
| Vòng focus đồng (`:focus-visible` chung) | `#B08A3E` / `#FBFBF8` | khoảng 3,1 | 3,0 | Vừa đạt |
| Còn lại (mọi trang, mọi khung) | — | ≥ 4,5 | — | Đạt (công cụ đo không báo dòng nào khác) |

## 4. Kết luận

**KHÔNG ĐẠT.** Trung bình **6,20** (ngưỡng 8,5). Có **8/10 tiêu chí dưới 7**; chỉ tiêu chí 1 và 3 chạm đúng 7,0. Thấp nhất là tiếp cận WCAG (5,0) và độ hoàn thiện (5,5).

So với lần chấm mockup gần nhất (7,45), ứng dụng thật thấp hơn khoảng 1,25 điểm. Phần khung và bộ nhận diện đã chuyển sang code tốt. Phần thua là 4 việc:

- trang quan trọng nhất (chi tiết hồ sơ) không có kết quả agent để trình diễn;
- dùng sai nút vàng và nhãn "Người quyết định";
- lộ mã thô;
- vòng focus vô hình.

## 5. Việc phải sửa, xếp theo ảnh hưởng tới điểm

1. **Vòng focus nhìn thấy được** (tiêu chí 8, 10).
   - Chỗ: `frontend/src/theme/index.ts` dòng 78–80 và `styles/accessibility.css` dòng 39–50.
   - Vì sao: `:focus-visible` của Antd (viền `colorPrimaryBorder` navy-100) đè quy tắc đồng 3px.
   - Sửa: đặt token `colorPrimaryBorder` (hoặc `Button.colorPrimaryBorder`) sang navy-500 `#2A4A80`, hoặc thêm `.ant-btn.ant-btn:focus-visible, .ant-input-affix-wrapper:focus-within { outline: 2px solid var(--navy-500); outline-offset: 2px }`.
   - Kiểm: Tab qua Việc của tôi, viền phải đạt ≥3:1 trên nền giấy.
2. **Đầu trang chi tiết hồ sơ** (tiêu chí 2, 4, 7).
   - Chỗ: `features/loan-detail/LoanHeader.tsx:66` và `ActionsPanel.tsx`.
   - Sửa: bỏ liên kết vàng "Tới phần hành động". Đặt nút hành động chính của vai lên đầu trang: "Quyết định" (vàng, cấp phê duyệt), "Sửa đề xuất" (QHKH, hồ sơ nháp), "Ghi ý kiến rủi ro". Không có hành động thì không có nút. Số việc còn lại hiện bằng viên trung tính.
3. **Nhãn "Người quyết định" chỉ cho Cấp phê duyệt và Hội đồng** (tiêu chí 7, 9).
   - Chỗ: `ActionsPanel.tsx` (truyền `tag` cho `HumanBlock` trong `components/ui/Blocks.tsx:20`).
   - Sửa: vai khác ghi "Việc của bạn" hoặc "Ý kiến Rủi ro". Bọc danh sách cờ "Nguồn: AI kiểm tra tài liệu" trong `AiBlock` (`InfoPanels.tsx`).
4. **Gỡ mọi mã thô khỏi giao diện** (tiêu chí 9, 10).
   - Chat: "(APPRAISAL) [nguồn: loan_applications]" và "DỮ LIỆU" (`features/chat/components/AssistantMessage.tsx`, `MessageBlocks.tsx`).
   - So sánh: dòng "Mã kỹ thuật…" (`ComparisonTab.tsx`).
   - Đối chiếu: "cfo/debt/dscr/SYSTEM_CIC" (`features/reconciliation/`).
   - Ngăn kéo: "ĐỀ XUẤT PHÊ DUYỆT" (`CaseTrace.tsx`).
   - Thông báo và Nhật ký: mã "LA-…" thay bằng mã HSV hoặc DX.
   - Tất cả đi qua `utils/glossary.ts`.
5. **Có ít nhất một hồ sơ trình diễn có lượt chạy đội agent thật** (tiêu chí 2, 7).
   - Hiện mọi hồ sơ seed đã mở đều ghi "Chưa chạy đội agent", nên khối kết luận AI, cờ và Validation không bao giờ hiện ở trang giám khảo xem đầu tiên.
   - Sửa: chạy đội agent thật trên 1–2 hồ sơ trình diễn và lưu kết quả. Không dựng số giả.
   - Đây là việc dữ liệu hoặc vận hành, không phải CSS; cần Mate quyết định ai làm.
6. **Modal quyết định theo mockup 12b** (tiêu chí 6, 4).
   - Chỗ: `ActionsPanel.tsx`.
   - Sửa:
     - 4 thẻ lựa chọn (Phê duyệt, Phê duyệt có điều kiện, Từ chối, Trả lại) có mô tả;
     - ô hạn mức căn phải, mono, ghi "đồng";
     - nút "Ghi quyết định" màu vàng;
     - bước xác nhận "Không hoàn tác được. Quyết định ghi tên bạn vào nhật ký kiểm toán.";
     - mọi ô có nhãn;
     - focus đầu vào lựa chọn đầu tiên.
7. **Chat về đúng bộ nhận diện** (tiêu chí 1, 3, 10).
   - Chỗ: `features/chat/components/*`.
   - Sửa:
     - bỏ logo lặp ở `ConversationSidebar`;
     - nhãn nhóm viết thường 12px;
     - tin trợ lý có `AiTag`;
     - chữ 14–15px;
     - sửa header che tin đầu (`MessageList.module.css`);
     - textarea có `aria-label="Câu hỏi cho trợ lý"`.
   - Panel AI: xóa hội thoại thử nghiệm khỏi dữ liệu trình diễn (việc của Mate hoặc seed) và thêm nhãn cho textarea.
8. **Thành phần Antd còn kiểu cũ** (tiêu chí 1, 8).
   - Chỗ: token `Pagination` trong `theme/index.ts` (mục đang chọn: nền navy và chữ trắng, hoặc nền trắng và chữ navy, không phải navy trên navy) và `aria-label` nút trước/sau trong `components/tables/DataTable`.
   - `ActionProposals.tsx:134` dùng `StatusPill` thay `<Tag color>`.
   - `LoanEstimateCard.tsx:22` bỏ `Tag color="orange"`.
   - Tab dashboard đặt `more={{ icon, 'aria-label': 'Thêm tab' }}` hoặc tắt "more".
9. **Việc của tôi đúng mockup 02** (tiêu chí 2, 5).
   - Chỗ: `MyWorkPage.tsx`, `QueueTable.tsx`, `PageHead.tsx`.
   - Sửa:
     - `h1` "Việc của tôi";
     - bỏ tiêu đề thẻ bảng lặp lại;
     - dải KPI một hàng cao 64px;
     - tab lọc có số đếm;
     - nút hàng thống nhất một kiểu (viền), chỉ "việc kế tiếp" đặc;
     - rỗng theo bộ lọc dùng `StateBlock` có nút "Bỏ lọc";
     - "Hỏi AI" đổi thành "Hỏi trợ lý".
10. **Dấu vết ở 1366** (tiêu chí 5, 7).
    - Chỗ: `TracesTab.tsx`.
    - Sửa:
      - bỏ cột ít giá trị hoặc cho cột mã co lại để bảng không bị cắt;
      - cột "Hồ sơ vay" hiện mã HSV;
      - với vai không có lượt trong phạm vi, ghi rõ "Tổng quan đếm toàn hệ thống; bạn chỉ xem được lượt trên hồ sơ của mình" để không mâu thuẫn với 829 lượt.
    - Ngăn kéo: thời lượng tính bằng giây, "gồm", dùng một tên "Planner (điều phối)".
11. **Tạo đề xuất dùng chung khung stepper với Soạn đề xuất** và thêm cột phải "Kiểm tra trước khi gửi" (tiêu chí 2, 5). Soạn đề xuất có nút "Tiếp: Hồ sơ tài liệu" cuối mỗi bước.
12. **Stepper hồ sơ trả về giữ lịch sử** (tiêu chí 6).
    - Các bước đã qua vẫn đánh dấu xong, bước bị trả có dấu "trả về" như mockup 03.
    - KPI chi tiết hồ sơ dùng một kiểu thẻ, số mono, đơn vị "tỷ đồng" (`MetricsPanel.tsx`, `features/loan-detail/format.ts`).
13. **Keycloak theo mockup 22** (tiêu chí 1, 10).
    - Chỗ: `infra/keycloak/theme/so-tin-dung/login/`.
    - Sửa:
      - một tiêu đề;
      - logo căn cùng trục;
      - hai ô cùng kiểu viền;
      - nút navy-700 `#14284B`;
      - nhãn "(bắt buộc)";
      - lỗi kèm cách xử lý, ví dụ "Sai tên đăng nhập hoặc mật khẩu. Kiểm tra phím Caps Lock hoặc liên hệ quản trị để đặt lại."
14. **Văn phong lặt vặt** (tiêu chí 9):
    - "Đang cho ý kiến rủi ro" → "Chờ ý kiến rủi ro" (`features/my-work/format.ts:58`);
    - "Ghi Ý kiến Rủi ro" → "Ghi ý kiến rủi ro";
    - "đề xuất.." → "đề xuất.";
    - "ai (token)" → "AI (token)";
    - "Checklist" → "Danh mục";
    - bỏ hậu tố "(dữ liệu mẫu)" ở từng dòng, thay bằng một chú thích chung;
    - chip "Đã chuyển cấp" dùng màu trung tính hoặc thông tin;
    - `fmtInt` cho mọi số ở bảng agent;
    - hàng "system" → "Hệ thống".
15. **404 và lỗi chi tiết hồ sơ có `h1`**; lúc tải đầu có khung ứng dụng và logo; "Mở Quản trị" không trông như nút khóa (tiêu chí 6, 8).

## 6. Nếu chỉ còn một ngày: 5 việc đáng làm nhất

1. Sửa vòng focus (việc 1). Khoảng 30 phút, gỡ lỗi WCAG nặng nhất trên mọi trang.
2. Đầu trang chi tiết hồ sơ và nhãn "Người quyết định" (việc 2 và 3). Đây là trang giám khảo xem nhiều nhất, và sửa xong thì thông điệp "AI đề xuất, người có thẩm quyền quyết định" mới đúng.
3. Gỡ mã thô (việc 4). Đây là lỗi dễ thấy nhất với giám khảo.
4. Có ít nhất một hồ sơ trình diễn có lượt chạy agent thật, để khối AI ở chi tiết hồ sơ hiện kết luận, cờ và Validation (việc 5). Cần Mate giao.
5. Modal quyết định theo mockup 12b, nút vàng, có bước xác nhận (việc 6). Đây là khoảnh khắc "người quyết định" trong kịch bản trình diễn.

## 7. Chưa kiểm chứng và điểm lệch với brief

- **Trạng thái "đang chạy" của đội agent** (luồng sự kiện trực tiếp) chưa xem. Tôi không chạy lượt mới. Tiêu chí 7 vì vậy chưa tính phần này; điểm 6,0 dựa trên ngăn kéo dấu vết và trang chi tiết hồ sơ.
- **"Trang đã làm lại"** trong brief gồm cả chi tiết hồ sơ và soạn đề xuất. Thực tế khối AI ở chi tiết hồ sơ chưa từng có dữ liệu trên hồ sơ seed đã mở (013, 001, 006, 007, 167). Thông tin này brief không nêu.
- **Dải demo** chỉ hiện với tài khoản Quản trị (`DemoSwitcher.tsx`). Các vai nghiệp vụ không thấy dải demo như mockup.
- **Tài khoản Trưởng phòng** ở `frontend/e2e/helpers.ts` là `credit.manager@example.local`. Trang của vai này ("Hồ sơ của phòng") rỗng nên không chấm được danh sách hồ sơ toàn phòng.
