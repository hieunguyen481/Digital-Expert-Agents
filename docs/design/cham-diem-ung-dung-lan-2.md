# Chấm thẩm mỹ và UX ứng dụng thật, lần 2

Giám khảo độc lập `gu2`, HEAD `import/duskdash` `00732a8`, ngày 11/11/2026. Chỉ chấm, không sửa code.
Đích so sánh: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Mốc lần 1: `docs/design/cham-diem-ung-dung-lan-1.md` (6,20, KHÔNG ĐẠT).

## Kết luận

**Điểm trung bình 10 tiêu chí: 7,00 (lần 1: 6,20). Kết luận: KHÔNG ĐẠT.**

Ngưỡng ĐẠT là trung bình từ 8,5 và không tiêu chí nào dưới 7. Lần này hỏng ở cả hai điều kiện:
- trung bình 7,00 còn thiếu 1,5 điểm;
- hai tiêu chí dưới 7: (8) tiếp cận WCAG AA 6,5 và (10) độ hoàn thiện 6,5.

Trung bình 27 trang là 7,28 (lần 1: 6,65 trên 24 trang). Bỏ trang Quản trị ra thì là 7,33. Kết luận không đổi.

Ứng dụng đã tiến rõ ở những màn giám khảo nhìn đầu tiên:
- Việc của tôi;
- modal quyết định có bước xác nhận;
- chat đã về đúng bộ nhận diện;
- Keycloak;
- vòng focus của nút và liên kết.

Điểm chưa lên 8,5 vì ba nhóm lỗi:
- **Mã thô và dữ liệu rác còn lộ ở màn của vai phụ:**
  - Quản trị hiện `credit_officer` và `account:read`;
  - Kiểm toán thấy 412 hồ sơ, đa số tên "—" và mã `LA-20261111-…`;
  - Dashboard hiện tên công cụ `get_business…`.
- **Lỗi trau chuốt trên chính hồ sơ demo:**
  - nút vàng "Sửa đề xuất" mất khung nút;
  - kết luận AI là một đoạn in đậm 5 dòng có ".." và ".;";
  - thanh bên của khung đang tải bị cụt.
- **Focus còn vô hình ở các điều khiển form:** thẻ lựa chọn trong modal quyết định, ô chọn và ô ngày ở Nhật ký, đoạn đang chọn của bộ lọc.

## Cách chấm

Mọi ảnh ở `/tmp/gu2/`, đặt tên `<vai>-<trang>-<khung>.png`.

**Đăng nhập và vai.** Script Playwright tự đăng nhập Keycloak bằng tài khoản ở `frontend/e2e/helpers.ts`. Mật khẩu đọc từ file và không in ra. Đã đăng nhập đủ 9 vai: QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị.

**Khung hình.**
- Mọi trang chụp ở 1366×768 và 1920×1080.
- Đăng nhập, Việc của tôi, chi tiết hồ sơ và dashboard chụp thêm ở 1280×800 và 1440×900.

**Đo trên DOM thật ở mỗi ảnh:**
- tràn ngang;
- cỡ chữ nhỏ nhất;
- tương phản chữ, tính trên màu đã trộn qua các lớp nền;
- điều khiển không có tên;
- số `h1` và `main`;
- mã thô, quét bằng regex: snake_case, UUID, ENUM viết hoa, `LA-\d{8}`, `..`, "(dữ liệu mẫu)".

**Đo vòng focus.**
- Bấm Tab 14–22 lần trên mỗi trang.
- Lấy tỷ lệ tương phản lớn nhất giữa màu outline và màu box-shadow so với nền cha.
- Nếu phần tử có vỏ `[data-focus-ring]` thì đo trên vỏ đó.

**Trạng thái đã xem:**
- **đang tải:** trả API chậm 7 giây;
- **lỗi:** API trả 500;
- **rỗng:** bộ lọc rỗng, chính sách không có kết quả, đối chiếu chưa có tài liệu;
- **không có quyền:** 403, và Quản trị bị chặn ở Việc của tôi;
- **nút khóa kèm lý do;**
- **hover và focus;**
- **modal quyết định:** 4 lựa chọn, bước xác nhận phê duyệt và từ chối. Chỉ bấm "Quay lại", không bấm nút xác nhận;
- **ngăn kéo dấu vết;**
- **panel AI** mở và đóng;
- **tìm kiếm ở thanh trên:** có kết quả, không có kết quả, phím mũi tên.

**Lượt chạy và câu hỏi chat.**
- Không tốn lượt chạy đội agent nào:
  - trạng thái "đang chạy" chụp được khi `g6` đang chạy trên HSV-2026-00201;
  - kết luận đã chạy xong có sẵn trên HSV-2026-00187.
- Chat dùng 1/10 câu hỏi, không gặp 402.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 1 | Lần 2 | Căn cứ lần 2 (ảnh ở `/tmp/gu2/`) |
|---|---|---:|---:|---|
| 1 | Bản sắc và nhất quán giữa các trang | 7,0 | **7,5** | **Tốt:** chat nay cùng bộ nhận diện: logo "S", Newsreader, khung AI viền tím đứt (`qhkh-chat-answer`). Mọi trang của 9 vai dùng chung thanh bên navy, nền giấy, h1 Newsreader và đường kẻ đôi dưới tiêu đề. **Còn lệch:** mã hồ sơ chỗ mono (bảng, đối chiếu), chỗ sans đậm (ô tìm kiếm, Thông báo, Chi tiết khách hàng). Cột "Mã" của Tra cứu chính sách dùng sans. Tiêu đề cột "Số tiền" dùng mono trong khi các cột khác dùng sans (`qhkh-home`). Quản trị dùng tên vai tiếng Anh và mã thô, lạc khỏi giọng của cả ứng dụng (`quantri-admin-full`). |
| 2 | Phân cấp thông tin, hành động chính ở màn đầu | 6,0 | **7,0** | **Tốt:** Việc của tôi có h1, dải KPI 1 hàng, tab có số đếm, chỉ nút đầu tiên được tô (`qhkh-home`). Đầu hồ sơ có nút hành động thật theo vai: "Quyết định", "Trình Rủi ro", "Ghi ý kiến rủi ro". **Chưa tốt:** kết luận AI ở đầu khối là đoạn in đậm 15px dài 5 dòng, lặp nguyên văn danh sách điều kiện ngay bên dưới (`tdinh-loanA`). "Trình Rủi ro" xám ở đầu trang mà không có lý do cạnh nút; lý do nằm ở cột phải, dưới màn đầu. Hồ sơ Phê duyệt mở ra với "Chưa chạy đội agent trên hồ sơ này" và "Chưa có chỉ số nào có tài liệu nguồn" (`pheduyet-loanA`), nên người quyết định không có gì để đọc. |
| 3 | Chữ và khả năng đọc tiếng Việt | 7,0 | **7,5** | Dấu tiếng Việt chuẩn ở mọi cỡ. Cỡ nhỏ nhất 12px ở mọi trang đã đo. Không có chữ tương phản thấp. Câu trả lời chat 15px, dòng 1,6, dễ đọc. **Trừ điểm:** đoạn kết luận in đậm dài; nhóm "HỒ SƠ VAY / KHÁCH HÀNG" viết hoa trong ô tìm kiếm; chú thích So sánh viết toàn mono; "Chinh sach Tin dung Ban le Mau" không dấu (dữ liệu seed, nhưng hiện ở bảng chính sách). |
| 4 | Màu và ngữ nghĩa trạng thái | 6,5 | **7,0** | **Đã sửa:** "Đã chuyển cấp" chuyển sang xanh. Chip trạng thái agent theo màu: Đang chạy tím, Xong xanh, Chờ xám (`qhkh-loan187-y700`). Hạn xử lý: đỏ khi quá hạn, xanh khi còn hạn. **Sai ngữ nghĩa:** bước xác nhận **từ chối** dùng cùng nút vàng "cam kết" với phê duyệt, không có sắc nguy hiểm (`pheduyet-decision-confirm-reject`). Vàng của "Sửa đề xuất" mất khung nên trông như chữ được tô sáng, không ra nút. Ô "Dòng tiền kinh doanh 93,2" và "Tổng cộng 98" không có đơn vị. |
| 5 | Mật độ, lưới, khoảng cách ở 1366 và 1920 | 6,5 | **7,0** | 0 trang tràn ngang trong 4 khung. Ở 1920 nội dung căn giữa, rộng tối đa khoảng 1216px. **Chưa tốt:** panel AI mở ở 1366 vẫn ép bảng Việc của tôi xuống 2–3 dòng mỗi ô, cắt "3 cờ, 2" và cắt chữ gợi ý của ô tìm kiếm (`qhkh-aipanel`). Ma trận quyền ở Quản trị bị cắt cột "Loan Ap…" và phải cuộn trong khung (`quantri-admin-full`). Khung xem tài liệu OCR là một khối xám trống cao khoảng 560px (`httd-ocrdoc`). Chi tiết khách hàng và Tra cứu chính sách bỏ trống nửa dưới màn. |
| 6 | Thành phần và trạng thái | 6,5 | **7,0** | **Tốt:** trạng thái lỗi đồng bộ: hình, tiêu đề, một câu, "Thử lại". Trạng thái rỗng có câu chỉ bước tiếp theo, ví dụ "Bước tiếp theo: chờ QHKH tải tài liệu lên" (`httd-ocr0`). Nút khóa có lý do, ví dụ "Chọn khách hàng." và "Chưa xuất được: Tờ trình chưa được chốt khi trình." Modal quyết định dùng thẻ lựa chọn có mô tả. **Lỗi:** khung đang tải có thanh bên navy chỉ cao khoảng 284px, phần dưới trắng (`pheduyet-loading-loan`). "Sửa đề xuất" là `<Link className="ant-btn …">` thiếu lớp hash của Antd nên mất padding và chiều cao (`qhkh-loan187-1366x768`, `-1920x1080`). Ô tìm kiếm không đi bằng phím mũi tên được (`qhkh-search-arrow`). |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 6,0 | **7,0** | **Tốt:** khối AI có nhãn "AI đề xuất – chưa xác nhận" và câu "Đề xuất của đội agent chưa có hiệu lực". Sơ đồ Planner → Credit · Compliance · Operations · Document → Validation → "Cấp phê duyệt – Người quyết định, ngoài khung AI". Trạng thái đang chạy hiện từng agent và đồng hồ "Đã chạy 00:13" (`qhkh-loan187`). Ngăn kéo dấu vết có "Planner giao việc" và "Người quyết định". So sánh single và multi có thẻ "Đội agent tốt hơn". **Trừ điểm:** bảng "Theo từng agent" ở Tổng quan ghi Planner 0 việc, Document 0 việc / 74 lỗi; giám khảo đọc thành "Planner không làm gì, Document hỏng". Ngăn kéo vẫn in "ĐỀ XUẤT PHÊ DUYỆT" viết hoa. Màn của người quyết định (Phê duyệt) không có kết luận AI nào. Hai ý "Đồng ý có điều kiện" của Credit và Compliance mở đầu bằng "— Phần còn thiếu không chặn…", khó hiểu. |
| 8 | Tiếp cận WCAG AA | 5,0 | **6,5** | **Đã sửa:** vòng focus của nút và liên kết là navy 3px, tương phản 7,82–8,48. Thanh bên có viền trắng ngoài, 14,64. Esc trả focus về nút mở modal hoặc ngăn kéo. Mỗi trang có 1 `h1` và 1 `main`. **Còn trượt 2.4.7 (Focus Visible):** thẻ lựa chọn trong modal quyết định không có vòng focus riêng (NO-RING). Ô chọn "Hành động" và hai ô ngày ở Nhật ký kiểm toán: NO-RING. Đoạn đang chọn của bộ lọc tab: viền navy trên nền navy, 1,67. Phân trang Quản trị: NO-RING. **Còn trượt 4.1.2 (Name, Role, Value):** nút kính lúp chỉ có biểu tượng ở Dấu vết không có tên. Ô tìm kiếm thiếu `role=combobox`, `listbox` và `aria-activedescendant`. **Khác:** Keycloak có nút mắt "Show password" tiếng Anh, viền focus ô nhập chỉ 1px. Modal có nút đóng "Close" tiếng Anh. |
| 9 | Văn phong UX | 6,0 | **7,0** | **Tốt:** "Chờ phê duyệt", "Chờ ý kiến", "Hỏi trợ lý". Lỗi Keycloak chỉ cách sửa. Chat từ chối ngoài phạm vi lịch sự. Bước xác nhận "Không hoàn tác được. Quyết định ghi tên bạn vào nhật ký kiểm toán." **Còn:** ".." và ".;" trong kết luận (`tdinh-loanA`). Lẫn "tỷ VND" (đầu hồ sơ, KPI) với "tỷ đồng" (modal). Hai cặp ngoặc "(tỷ đồng) (bắt buộc)". "Ghi ý kiến Tuân thủ" viết hoa chữ T, khác "Ghi ý kiến rủi ro". "(dữ liệu mẫu)" chen trong lý do trả hồ sơ. Lịch sử chat có 4–5 mục cùng tên "Cuộc trò chuyện mới". Đối chiếu có tiền tố mã loại tài liệu "DONGY ·", "DENGHI ·". "điểm %" ở So sánh. |
| 10 | Độ hoàn thiện của sản phẩm thật | 5,5 | **6,5** | Không vỡ bố cục, chuyển trang nhanh, không gặp lỗi vite. **Còn lộ ở sản phẩm thật:** `credit_officer` … `loan_approver` và `account:read` … ở Quản trị. Tên công cụ MCP snake_case `get_business`, `get_cic_status`… ở Tổng quan. `case_bb0ef152a2d9` ở Dấu vết. 412 hồ sơ với tên "—" và mã `LA-20261111-…` ở màn Kiểm toán: rác từ e2e, nhưng giao diện không có cách hiển thị khác. Số không có dấu nghìn (2698, 3459). "3,4476 USD". Nút vàng mất khung và thanh bên cụt khi tải (xem tiêu chí 6). |
| | **Trung bình** | **6,20** | **7,00** | **KHÔNG ĐẠT.** Tiêu chí 8 và 10 dưới 7. |

## Đo lại các chỉ số lần 1

| Chỉ số | Lần 1 | Lần 2 (tự đo) | Ảnh hoặc log |
|---|---|---|---|
| Tràn ngang ở 1366 | 0 trang | 0 trang. Cũng 0 ở 1280, 1440 và 1920. | mọi dòng `overflowX` trong `/tmp/gu2/*.log` |
| Cỡ chữ nhỏ nhất | 12px | 12px ("Tín dụng doanh nghiệp", "Chế độ demo") | như trên |
| Chữ tương phản dưới 4,5:1 | 0 | 0 phần tử | như trên |
| Vòng focus nút và liên kết | `#DCE4F1` 2px, khoảng 1,2:1 | navy 3px: 7,82 (đăng nhập, ô tìm kiếm, nút "Quyết định"); 8,48 (nút trong hàng bảng); 14,64 (thanh bên) | `qhkh-home-focus16`, `none-login-focus`, `pheduyet-decision-modal-tab` |
| Focus của thẻ lựa chọn trong modal | không đo | không có vòng (NO-RING) | `pheduyet-decision-modal-tab` |
| Focus của ô chọn và ô ngày ở Nhật ký | không đo | NO-RING ×3 | `r-kiemtoan.log` |
| Focus của đoạn đang chọn ở bộ lọc | không đo | 1,67 (navy trên navy) | `r-kiemtoan.log` |
| Focus của ô nhập Keycloak | không đo | viền 1px, 19:1. Đủ tương phản nhưng mảnh. | `none-kc-focus` |
| Số `h1` | thiếu ở 404 và trang lỗi hồ sơ | 1 ở mọi trang. Riêng trang lỗi hồ sơ: **0** | `pheduyet-error-loan` |
| Điều khiển không có tên | nhiều | 1 thật: nút kính lúp ở Dấu vết. Còn lại là phần tử ẩn của Antd. | `kiemtoan-trace`, `qhkh-trace` |
| Mã thô | chat, So sánh, Đối chiếu, ngăn kéo, `LA-` | chat sạch; So sánh đã gom; Đối chiếu sạch khóa trường. Còn: ngăn kéo viết hoa, `..`, `LA-` (Kiểm toán), MCP snake_case, mã vai và quyền ở Quản trị, `case_…` | `RAW` trong `r-*.log` và `ocr*.log` |

## Bảng từng trang

| Trang (vai) | Lần 1 | Lần 2 | Phải sửa (ảnh · phần tử · `file` nghi ngờ trong `frontend/src`) |
|---|---:|---:|---|
| Đăng nhập `/login` | 8,5 | 8,5 | (1) `none-login` · chú giải lặp "Người quyết định Người quyết định, ngoài khung AI" · `features/shell/LoginPage*` hoặc `components/ui/AgentTeam.tsx` |
| Keycloak :8080 | 6,0 | 7,5 | (1) `none-kc` · nút mắt `aria-label="Show password"` → "Hiện mật khẩu" · `infra/keycloak/themes/*/login/` (ngoài `frontend/src`). (2) `none-kc-focus` · viền focus ô nhập 1px → 3px navy như ứng dụng. (3) Nhãn chưa có "(bắt buộc)". |
| Khung: thanh bên, thanh trên, dải demo | 7,5 | 8,0 | (1) `pheduyet-loading-loan` · thanh bên cụt khoảng 284px khi tải · `features/shell/AppLayout.tsx`, `app/routes.tsx` (Suspense fallback): cho khung tải `min-height:100vh`. |
| Ô tìm kiếm thanh trên (mới) | – | 6,5 | (1) `qhkh-search-arrow` · ArrowDown không đi vào kết quả; thiếu `role=combobox/listbox/option`, `aria-activedescendant` · `features/shell/SearchBox.tsx`. (2) `qhkh-search-vina` · nhóm viết hoa "HỒ SƠ VAY" → chữ thường nhỏ màu ink-2; mã hồ sơ sans đậm → mono như bảng. |
| Việc của tôi (QHKH) | 7,0 | 8,0 | (1) `qhkh-filter-chobosung` · KPI "1 Đã quá hạn" mà tab ghi "Quá hạn 2": hai con số khác nghĩa đặt cạnh nhau · `features/my-work/MyWorkPage.tsx`: thống nhất phạm vi hoặc đổi nhãn KPI thành "Bạn đang giữ, quá hạn". (2) `qhkh-home` · chip "Theo dõi" dính sát tên khách, thiếu khoảng cách · `features/my-work/QueueTable.tsx`. |
| Hồ sơ của phòng (Trưởng phòng) | 7,5 | 7,5 | (1) `truongphong-home` · "3 cờ, 2 Cao" xuống 2 dòng; nên viết gọn "3 cờ · 2 cao" · `features/my-work/QueueTable.tsx`. (2) Tiêu đề phụ "5 đến hạn trong 1 ngày LV" trong khi KPI "0 Hạn hôm nay": thêm KPI "Đến hạn 1 ngày LV" hoặc bỏ khỏi dòng phụ. |
| Hồ sơ vay chỉ đọc (Kiểm toán) | (7,0) | 5,5 | (1) `kiemtoan-home` · 412 hồ sơ, đa số tên "—" và mã `LA-20261111-…` (nháp do e2e tạo) · dữ liệu: dọn bằng reset demo; giao diện `QueueTable.tsx`: thay "—" bằng "Chưa có tên khách" và ẩn hồ sơ nháp khỏi Kiểm toán, hoặc thêm bộ lọc "Nháp". (2) Nút xám "Chỉ đọc" ở đầu trang trông như nút hỏng; đã có dải thông báo chỉ đọc nên bỏ nút này · `features/my-work/MyWorkPage.tsx`. |
| Chi tiết hồ sơ (mọi vai) | 5,5 | 7,0 | (1) `qhkh-loan187-1366x768` · "Sửa đề xuất" mất padding và chiều cao · `features/loan-detail/ActionsPanel.tsx:94` dùng `<Link className="ant-btn ant-btn-default">` thiếu lớp hash của Antd: đổi sang `<Button type="primary" className={styles.goldLink} onClick={navigate}>`. (2) `tdinh-loanA` · kết luận AI là đoạn đậm 5 dòng có ".:", ".;", ".." và lặp danh sách bên dưới · `features/loan-detail/AgentTeamPanel.tsx`: chỉ hiện câu đầu (đến dấu ":"), font thường 16px; điều kiện chỉ ở danh sách; chuẩn hóa dấu câu. (3) `pheduyet-loanA` · "Đề nghị, tỷ VND" và "45 tỷ VND" → "tỷ đồng"; số KPI dùng mono · `features/loan-detail/LoanHeader.tsx`. |
| Khối đội agent đang chạy | (6,0) | 7,5 | (1) `qhkh-loan187-y700` · "Phát hiện của từng chuyên gia (0 cần chú ý)" hiện khi mới xong 1 agent: đổi thành "1/4 chuyên gia đã xong" · `features/loan-detail/AgentTeamPanel.tsx`. |
| Modal quyết định và bước xác nhận (Phê duyệt) | 5,5 | 7,5 | (1) `pheduyet-decision-confirm-reject` · xác nhận từ chối dùng nút vàng: đổi sang `danger`; câu "Không hoàn tác được" in đậm như bên phê duyệt · `features/loan-detail/DecisionModal.tsx`. (2) Focus mặc định ở bước xác nhận đang nằm trên nút cam kết: đặt vào "Quay lại". (3) `pheduyet-decision-modal-tab` · thẻ lựa chọn không có vòng focus: thêm `:focus-within` 3px navy cho thẻ. Ô hạn mức căn phải, dùng mono. Nút đóng `aria-label="Đóng"`. |
| Tạo đề xuất (QHKH) | 5,0 | 7,0 | (1) `qhkh-newprop` · "(tỷ đồng) (bắt buộc)": gộp thành "Số tiền đề nghị, tỷ đồng (bắt buộc)". Chữ gợi ý sát nhãn tiếp theo: thêm 16px · `features/proposal/*`. |
| Soạn đề xuất | 6,5 | không chụp | Không có bản nháp DX trong danh sách nên không mở được. Không chấm, không tính vào trung bình. |
| Đối chiếu, danh sách (HTTD) | 7,5 | 7,5 | (1) `httd-recon-list` · không có ô lọc và không có số đếm; hạn chưa tới dùng chip xám, nhìn giống "không có hạn" · `features/reconciliation/*`. |
| Đối chiếu, chi tiết và OCR | 6,0 | 7,0 | (1) `httd-ocrdoc` · khung xem là khối xám trống: thêm ảnh trang mẫu, hoặc thu khung về khoảng 240px kèm câu giải thích · `features/reconciliation/*`, `components/*DocViewer*`. (2) `httd-ocrdocB-y700` · giá trị "93,2", "56,0", "98" không có đơn vị: thêm "tỷ đồng". Tiền tố "DONGY ·", "DENGHI ·", "A01-04 ·" chuyển thành nhãn phụ mono nhỏ. |
| Khách hàng (QHKH) | 6,0 | 7,5 | (1) `qhkh-customers` · mọi hàng đều "Chưa xếp hạng", cột này không mang thông tin: gộp thành chú thích hoặc ẩn khi cả trang trống · `features/customers/*`. |
| Chi tiết khách hàng | 6,5 | 7,0 | (1) `qhkh-customer-detail` · mã hồ sơ trong bảng dùng sans → mono; nửa dưới trống · `features/customer/*`. |
| Thông báo | 6,5 | 7,5 | (1) `qhkh-notif`, `truongphong-notif` · mã hồ sơ trong tiêu đề dùng sans đậm → mono · `features/notifications/*`. |
| Đội agent, Tổng quan | 6,5 | 6,5 | (1) `qhkh-dash` · bảng "Theo từng agent" không có dấu nghìn (2698 → 2.698); Planner và Document "0 việc" · `features/dashboard/components/OverviewTab.tsx`: dùng `fmtInt`; đổi cột thành "Lượt tham gia" hoặc ghi chú "Planner điều phối, không nhận việc". (2) Tên công cụ MCP snake_case → nhãn tiếng Việt ("Hồ sơ doanh nghiệp", "Tra CIC"…), mã để trong tooltip. (3) "3,4476 USD" → "3,45 USD". Nhãn KPI "Thời gian trung bình" bị xuống dòng. |
| Đội agent, Dấu vết | 6,0 | 7,0 | (1) `qhkh-trace` · dòng phụ `case_bb0ef152a2d9`: bỏ, hoặc chỉ hiện trong ngăn kéo phần kỹ thuật · `features/dashboard/components/TracesTab.tsx`. (2) Nút kính lúp không có tên: `aria-label="Tìm"`. (3) Lẫn "giây" và "1,1 phút": thống nhất "1 phút 6 giây". |
| Ngăn kéo dấu vết | 7,5 | 7,5 | (1) `qhkh-drawer` · "Đồng ý: ĐỀ XUẤT PHÊ DUYỆT kèm điều kiện" → "Đề xuất phê duyệt kèm điều kiện"; "Validation 0,0 giây" → "dưới 0,1 giây" · `features/dashboard/components/CaseTrace.tsx`. |
| Đội agent, So sánh | 6,0 | 7,0 | (1) `qhkh-compare` · chú thích lượt chạy toàn mono, lặp dưới ô chọn: chỉ để mã trong mono nhỏ · `features/dashboard/components/*Compare*`. (2) Đoạn "Vì sao độ phủ…" nhắc "mục 14 của tài liệu nghiên cứu benchmark": rút còn 1 câu. "điểm %" → "điểm phần trăm". |
| Trợ lý AI (chat) | 4,5 | 7,5 | (1) `qhkh-chat` · lịch sử có nhiều mục "Cuộc trò chuyện mới": đặt tên theo câu hỏi đầu, không lưu cuộc rỗng · `features/chat/*`. (2) Ô nhập dùng ngoặc vuông focus navy dày bên trong khung bo tròn: dùng một vòng duy nhất trên khung ngoài. |
| Panel AI | 6,0 | 6,5 | (1) `qhkh-aipanel` · ở 1366 panel đẩy nội dung, bảng xuống 2–3 dòng và cắt "3 cờ, 2": dưới 1440 cho panel phủ lên nội dung (overlay) thay vì đẩy · `features/ai-panel/*`, `features/shell/AppLayout.tsx`. |
| Nhật ký kiểm toán (Kiểm toán) | 7,0 | 7,5 | (1) `kiemtoan-audit` · ô chọn "Hành động" và ô ngày không có vòng focus · `features/audit/*`. Chữ gợi ý "LA-…" trong khi mã thật là "HSV-…": đổi thành "HSV-2026-…". |
| Tra cứu chính sách | 8,0 | 7,5 | (1) `qhkh-policy` · cột "Mã" dùng sans → mono; dòng "Chinh sach Tin dung Ban le Mau" không dấu (seed) · `features/policy/*` và seed. Nửa dưới trống: gợi ý 3 từ khóa hay dùng. |
| 403 | 8,5 | 8,5 | Không có việc lớn. |
| 404 | 8,0 | 8,5 | Đã có khung và h1. |
| Lỗi và đang tải | 7,5 | 7,0 | (1) `pheduyet-error-loan` · trang lỗi hồ sơ không có `h1`. (2) `pheduyet-loading-loan` · thanh bên cụt (xem dòng Khung). |
| Quản trị `/quan-tri` (mới) | – | 6,0 | (1) `quantri-admin` · cột Vai hiện `credit_officer`, `loan_approver`… → "Chuyên viên QHKH", "Phê duyệt"… · `features/admin/AdminPage.tsx`. (2) `quantri-admin-full` · ma trận quyền tiêu đề tiếng Anh ("Credit Appraiser") và khóa `account:read`; bị cắt cột ở 1366: nhãn tiếng Việt, mã để mono nhỏ dưới nhãn, cố định cột đầu và cho bảng cuộn có bóng mép. (3) Phân trang không có vòng focus. |
| **Trung bình** | **6,65** (24 trang) | **7,28** (27 trang) | Hai dòng trong ngoặc ở cột lần 1 là điểm của phần tương ứng lần 1, không tính vào trung bình. |

Phiên Hội đồng: chưa làm, chỉ có mục ở thanh bên của Phê duyệt và Kiểm toán. Có nêu nhưng không trừ điểm.

## Kiểm lại 15 việc lần 1

Ảnh trước ở `/tmp/gu1/`, ảnh sau ở `/tmp/gu2/`.

| # | Việc lần 1 | Kết quả | Trước → Sau | Ghi chú |
|---|---|---|---|---|
| 1 | Vòng focus | **Một phần** | `qhkh-mywork-focus14` → `qhkh-home-focus16`, `pheduyet-decision-modal-tab` | Nút và liên kết đạt 7,82–14,64. Còn NO-RING: thẻ lựa chọn trong modal, ô chọn và ô ngày ở Nhật ký, phân trang Quản trị. Đoạn đang chọn của bộ lọc: 1,67. |
| 2 | Đầu hồ sơ có nút hành động thật | **Một phần** | `qhkh-loan06` → `pheduyet-loanA`, `qhkh-loan187` | Đã có "Quyết định", "Trình Rủi ro", "Ghi ý kiến…". "Sửa đề xuất" mất khung nút. "Trình Rủi ro" khóa mà đầu trang không ghi lý do. |
| 3 | Nhãn "Người quyết định" đúng vai; cờ AI trong khối AI | **Đã sửa** | `pheduyet-loanA-y700` → `tdinh-loanA-y700` | "Việc của bạn" và "Người quyết định" đúng chỗ. |
| 4 | Bỏ mã thô | **Một phần** | `qhkh-chat`, `qhkh-dash-compare`, `httd-ocr-0001` → `qhkh-chat-answer`, `qhkh-compare`, `httd-ocrdocB` | Chat sạch. "Mã kỹ thuật" đã gom. Khóa trường cfo/debt đã thành nhãn tiếng Việt. Còn: "ĐỀ XUẤT PHÊ DUYỆT", "..", `LA-` (Kiểm toán), MCP snake_case, `case_…`. Thêm mới: mã vai và quyền ở Quản trị. |
| 5 | Hồ sơ demo có lượt chạy thật | **Đã sửa** | `qhkh-loan06` → `tdinh-loanA`, `qhkh-loan187` | HSV-2026-00187 có kết luận và 44 sự kiện; trạng thái đang chạy hiện đủ. Hồ sơ của Phê duyệt vẫn chưa có lượt nào (xem tiêu chí 7). |
| 6 | Modal quyết định theo mockup 12b | **Đã sửa** | `pheduyet-decision-modal` → `pheduyet-decision-modal`, `pheduyet-decision-confirm`, `-confirm-reject` | Có thẻ lựa chọn và bước xác nhận. Còn 3 chi tiết: nút từ chối màu vàng, focus mặc định trên nút cam kết, thẻ không có vòng focus. |
| 7 | Chat về bộ nhận diện, bỏ hội thoại thử ở panel | **Đã sửa** | `qhkh-chat` → `qhkh-chat`, `qhkh-chat-answer`, `qhkh-aipanel` | Logo, nhãn "AI đề xuất", khung tím, câu "Chỉ để tham khảo…". Panel AI rỗng sạch. |
| 8 | Sót kiểu Antd | **Một phần** | `qhkh-mywork-aipanel` → `qhkh-loan187` | Tab "more" đã ẩn, phân trang theo màu navy. Mới phát sinh: Link mang lớp `ant-btn` nhưng thiếu hash. Không kiểm lại được Tag trong ActionProposals vì hồ sơ đã xem không có đề xuất hành động. |
| 9 | Việc của tôi theo mockup 02 | **Đã sửa** | `qhkh_viec-cua-toi` → `qhkh-home` (4 khung) | h1, KPI 1 hàng, tab có số, nút trong hàng, "Hỏi trợ lý", bộ lọc rỗng có câu. |
| 10 | Dấu vết ở 1366 | **Một phần** | `qhkh-dash-trace` → `qhkh-trace` | Vừa khung, có mã HSV, có chú thích phạm vi, có "Planner (điều phối)". Còn `case_…`, lẫn giây và phút, nút không có tên. |
| 11 | Tạo đề xuất: stepper, cột kiểm tra, nút "Tiếp" | **Đã sửa** | `qhkh-newprop` → `qhkh-newprop` | Stepper 4 bước, cột "Kiểm tra trước khi gửi", nút khóa có lý do. |
| 12 | Stepper giữ lịch sử; KPI một kiểu; số mono; "tỷ đồng" | **Một phần** | `qhkh-loan06` → `qhkh-loan187`, `pheduyet-loanA` | Stepper giữ lịch sử ("Kiểm tra (trả về QHKH)"). Vẫn "tỷ VND" và số KPI sans ở chi tiết hồ sơ. |
| 13 | Keycloak theo mockup 22 | **Một phần** | `none-kc` → `none-kc`, `none-kc-error` | Một tiêu đề, nút navy, lỗi có cách sửa. Còn "Show password", focus 1px, chưa có "(bắt buộc)". |
| 14 | Sửa câu chữ | **Một phần** | `ruiro-home`, `qhkh-dash` → `ruiro-home`, `qhkh-dash` | Đã sửa: "Chờ ý kiến", "Đã chuyển cấp" chuyển xanh, "Hệ thống". Còn: ".." trong kết luận, "(dữ liệu mẫu)" trong lý do trả, chưa dùng `fmtInt` ở bảng agent. |
| 15 | h1 ở 404 và lỗi hồ sơ; khung khi tải; "Mở Quản trị" | **Một phần** | `qhkh-404`, `pheduyet-loading-loan` → cùng tên | 404 có h1 và khung. Trang lỗi hồ sơ vẫn 0 h1. Khung khi tải có nhưng thanh bên cụt. Quản trị có trang riêng. |

Tổng: 6 việc Đã sửa, 9 việc Một phần, 0 việc Còn nguyên.

## Danh sách việc phải sửa, theo mức ảnh hưởng tới điểm

1. **Vòng focus của điều khiển form** (tiêu chí 8, nâng khoảng 1 điểm).
   - Chỗ cần thêm `:focus-visible`/`:focus-within` 3px navy, offset 2px:
     - thẻ lựa chọn trong `features/loan-detail/DecisionModal.tsx`, đặt `:focus-within` trên thẻ;
     - `Select` và `DatePicker` ở `features/audit/*`, đặt trên `.ant-select-focused` và `.ant-picker-focused`;
     - đoạn bộ lọc trong `features/my-work/*`: đoạn đang chọn dùng vòng trắng ngoài như thanh bên;
     - phân trang ở `features/admin/AdminPage.tsx`.
   - Nên đặt trong token toàn cục: `styles/*` hoặc theme Antd.
   - Thêm `aria-label="Tìm"` cho nút kính lúp ở `TracesTab.tsx`.
   - Đổi `aria-label` nút đóng modal thành "Đóng".
2. **Nút "Sửa đề xuất" mất khung** (tiêu chí 6, 10; màn demo chính của QHKH).
   - Sửa `features/loan-detail/ActionsPanel.tsx:94`: dùng `<Button>` của Antd với `onClick={() => navigate(...)}` và giữ `styles.goldLink`.
   - Rà các `className="ant-btn …"` khác: `grep -rn '"ant-btn' frontend/src`.
3. **Mã thô ở Quản trị và Tổng quan** (tiêu chí 1, 9, 10).
   - `AdminPage.tsx`: tra bảng nhãn vai tiếng Việt (đã có ở thanh bên: "Chuyên viên QHKH"…). Ma trận quyền dùng tiêu đề tiếng Việt, mã quyền để mono 12px dưới nhãn, cố định cột đầu.
   - `OverviewTab.tsx`: tên công cụ MCP thành nhãn tiếng Việt; số dùng `fmtInt`; chi phí làm tròn 2 chữ số.
4. **Kết luận AI đọc được trong 5 giây** (tiêu chí 2, 3, 7, 9).
   - `AgentTeamPanel.tsx`: tiêu đề kết luận chỉ là nhãn đề xuất ("Đề xuất phê duyệt kèm điều kiện"), 18px Newsreader.
   - Điều kiện chỉ nằm ở danh sách bên dưới, không lặp.
   - Chuẩn hóa dấu câu: bỏ ".:", ".;", "..".
   - Ở ngăn kéo `CaseTrace.tsx`, đổi nhãn khuyến nghị viết hoa sang câu thường.
5. **Màn của người quyết định có nội dung AI** (tiêu chí 7).
   - Seed hoặc warm một hồ sơ ở bước Phê duyệt (ví dụ HSV-2026-00167) có lượt chạy xong và chỉ số có nguồn.
   - Nếu không được, khối AI nên ghi rõ "Hồ sơ này trình trước khi có đội agent", không dùng câu khóa quyền.
   - Đây là màn giám khảo xem "người có thẩm quyền quyết định".
6. **Dữ liệu rác ở màn Kiểm toán** (tiêu chí 10).
   - Dọn 400 hồ sơ nháp e2e tên "—" và mã `LA-…`, hoặc lọc nháp khỏi danh sách Kiểm toán mặc định.
   - Thay "—" bằng "Chưa có tên khách".
   - Bỏ nút "Chỉ đọc" xám ở đầu trang.
   - Nơi sửa: `features/my-work/*`, script dọn dữ liệu e2e.
7. **Bước xác nhận từ chối** (tiêu chí 4).
   - Trong `DecisionModal.tsx`, cho "Xác nhận từ chối" và "Xác nhận trả về" dùng `danger` hoặc navy, không dùng vàng.
   - Focus mặc định đặt vào "Quay lại".
   - "Không hoàn tác được" in đậm ở mọi lựa chọn.
8. **Panel AI ở 1366** (tiêu chí 5).
   - Dưới 1440px, panel phủ lên nội dung thay vì đẩy.
   - Nơi sửa: `features/shell/AppLayout.tsx`, `features/ai-panel/*`.
9. **Ô tìm kiếm theo mẫu combobox ARIA** (tiêu chí 6, 8).
   - Trong `SearchBox.tsx`: thêm `role` và `aria-*`, hỗ trợ ArrowUp/Down và Enter.
   - Nhãn nhóm viết thường; mã hồ sơ dùng mono.
10. **Khung khi tải và trang lỗi hồ sơ** (tiêu chí 6, 8).
    - Thanh bên khi tải `min-height: 100vh`.
    - Trang lỗi hồ sơ có `<h1>`.
11. **Câu chữ còn sót** (tiêu chí 9).
    - "tỷ VND" → "tỷ đồng" ở `LoanHeader.tsx` và KPI.
    - "(tỷ đồng) (bắt buộc)" → "…, tỷ đồng (bắt buộc)".
    - "Ghi ý kiến Tuân thủ" → "Ghi ý kiến tuân thủ".
    - Đặt tên cuộc chat theo câu hỏi đầu.
    - Đơn vị cho giá trị ở Đối chiếu.
    - "Validation 0,0 giây".
12. **Một kiểu mã hồ sơ** (tiêu chí 1). `HSV-…` luôn mono ở ô tìm kiếm, Thông báo, Chi tiết khách hàng; cột "Mã" của chính sách cũng mono.

## Nếu chỉ còn một ngày: 5 việc đáng làm nhất

1. Việc 1: vòng focus của điều khiển form. Đây là điều kiện để tiêu chí 8 lên khỏi 7.
2. Việc 2: nút "Sửa đề xuất". Sửa 1 dòng, nhưng lỗi nằm ngay đầu hồ sơ demo của QHKH.
3. Việc 3: mã thô ở Quản trị và Tổng quan, để tiêu chí 10 lên khỏi 7.
4. Việc 4: kết luận AI gọn, không lặp, đúng dấu câu.
5. Việc 5 và 6: hồ sơ Phê duyệt có kết luận AI; dọn hồ sơ rác e2e trước buổi chấm, chạy `infra/scripts/reset-demo.sh --warm`.

Làm đủ 5 việc này, ước tính trung bình lên khoảng 7,6–7,8. Để đạt 8,5 còn cần mật độ ở 1366 (panel AI), ô tìm kiếm ARIA và trau chuốt so với mockup (KPI mono, "tỷ đồng", khung xem tài liệu có ảnh trang).

## Chưa kiểm chứng và chỗ brief sai

- **Soạn đề xuất:** không chụp được vì danh sách đề xuất DX trống. Không chấm.
- **Chưa kiểm lại:** Tag Antd trong ActionProposals và nhãn cảnh báo cam trong LoanEstimateCard. Hồ sơ đã xem không có các phần này.
- **Ô `TEXTAREA` không tên ở 1920 (chat, panel AI):** nhiều khả năng là bản sao đo chiều cao của Antd autosize; ô thật có `aria-label`. Chưa xác minh bằng cây truy cập.
- **Hai ảnh `qhkh-loan187-*` thực ra là HSV-2026-00201:** script lấy liên kết đầu tiên ở Dấu vết. Hồ sơ HSV-2026-00187 nằm ở `tdinh-loanA-*`.
- **Brief nói "Chưa có: trang Quản trị":** trang `/quan-tri` đã có (`features/admin/AdminPage.tsx`) và đã được chấm. Phiên Hội đồng vẫn chưa có.
- **Mã `LA-…` ở Kiểm toán:** là hồ sơ nháp do e2e tạo trong ngày (`LA-20261111-…`), không phải do giao diện sinh ra. Giao diện vẫn bị trừ vì hiện "—" và không lọc nháp.
- Không gặp lỗi "Failed to fetch dynamically imported module" và không gặp 402.
