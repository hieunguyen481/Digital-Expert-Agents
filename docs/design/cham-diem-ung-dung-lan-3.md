# Chấm thẩm mỹ và UX ứng dụng thật, lần 3

Giám khảo độc lập `gu3`, HEAD `import/duskdash` `b599dbf`, ngày 12/11/2026. Chỉ chấm, không sửa code.
Đích so sánh: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`.
Mốc trước:
- lần 1: `docs/design/cham-diem-ung-dung-lan-1.md`, 6,20;
- lần 2: `docs/design/cham-diem-ung-dung-lan-2.md`, 7,00, KHÔNG ĐẠT.

## Kết luận

**Điểm trung bình 10 tiêu chí: 7,25 (lần 2: 7,00). Kết luận: KHÔNG ĐẠT.**

Ngưỡng ĐẠT là trung bình từ 8,5 và không tiêu chí nào dưới 7. Lần này vẫn hỏng ở cả hai điều kiện:
- trung bình 7,25, còn thiếu 1,25 điểm;
- hai tiêu chí dưới 7: (8) tiếp cận WCAG AA 6,0 và (10) độ hoàn thiện 6,5.

Trung bình 32 trang và trạng thái là 7,58 (lần 2: 7,28). Trang Quản trị không tính vào trung bình theo brief.

Các vòng sửa có tác dụng thật:
- 5 trong 12 việc của lần 2 đã sửa hẳn: nút "Sửa đề xuất", panel AI dạng phủ dưới 1440, ô tìm kiếm combobox, khung tải, mã HSV dạng mono;
- vòng focus của ô form đã sửa gần hết;
- 5 việc sửa một phần;
- 1 việc **hồi quy**.

Có ba lý do chưa thể đạt 8,5:

1. **Hồi quy nghiêm trọng ở bước xác nhận từ chối.**
   - Nút "Xác nhận từ chối" có chữ cùng màu nền `rgb(168,40,29)` trên `rgb(168,40,29)`, tương phản 1:1. Chữ biến mất trên đúng nút không hoàn tác được.
   - Focus mặc định nằm ở nút cam kết, không ở "Quay lại", dù mã có ý định ngược lại.
   - Nhấn Tab từ nút cam kết thì focus rơi ra `BODY`, ra ngoài modal.
   - Nguyên nhân gốc: `frontend/src/theme/componentOverrides.ts:36` `dangerColor: colors.danger700` (sửa ở commit 665876a).
2. **Màn của người quyết định vẫn chưa kể được câu chuyện AI.**
   - HSV-2026-00163 ở bước Phê duyệt đã có kết quả từng chuyên gia, nhưng không có câu kết luận đầu trang.
   - Dòng đầu là lời khóa không liên quan tới người phê duyệt.
   - Validation viết hoa "CẦN BỔ SUNG: thiếu dữ liệu chặn —…" và lộ `compliance policy`.
   - Panel bên phải lại báo xanh "Không còn điều kiện nào đang chặn ở bước này": hai bên mâu thuẫn.
   - HSV-00167 và 00170 vẫn hiện "Hồ sơ này trình trước khi có đội agent".
3. **Lỗi trau chuốt rải rác:**
   - mã nháp `LA-20261112-…` ở Nhật ký kiểm toán;
   - `authority_tier` ở Quản trị và `AI_OCR` trong dòng nguồn;
   - danh sách 9 điều kiện lặp ý BCTC ba lần;
   - phát hiện mở đầu bằng "— ";
   - nhãn "(đồng) (bắt buộc)" hai ngoặc;
   - KPI Kiểm toán "0 Đã quá hạn" mâu thuẫn với tab "Quá hạn 2";
   - khung xem tài liệu OCR chỉ là ô xám.

## Cách chấm

- **Phạm vi chụp:**
  - Playwright Chromium đăng nhập thật qua Keycloak bằng 9 vai: QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị;
  - mọi trang chụp ở 1366×768 và 1920×1080;
  - đăng nhập, Việc của tôi, chi tiết hồ sơ và dashboard chụp thêm ở 1280×800 và 1440×900;
  - ảnh và script ở `/tmp/gu3/`.
- **Trạng thái đã xem:**
  - đang tải (chặn API), lỗi (API trả 503), 403, 404;
  - rỗng: tìm kiếm không kết quả, tra cứu chính sách rỗng;
  - nút khóa kèm lý do, hover, focus bàn phím;
  - modal quyết định hai bước, ngăn kéo trace, panel AI mở và đóng;
  - đội agent đang chạy, chat có câu trả lời.
- **Số đo trên DOM thật, mỗi khung hình:**
  - tràn ngang, cỡ chữ nhỏ nhất;
  - tương phản chữ trên nền đã trộn alpha;
  - điều khiển không tên, số `h1` và `main`;
  - tương phản vòng focus so với nền thật;
  - quét mã thô bằng regex: snake_case, UUID, ENUM, `LA-\d{8}`, "..", "(dữ liệu mẫu)".
- **Số lượt dùng:**
  - đội agent: 2 trên 4 lượt, qua `flock /tmp/do-an-e2e.lock bash -c 'infra/scripts/reset-demo.sh --warm && …'`, làm ấm HSV-00187 và HSV-00163 lúc 19:18–19:20;
  - chat: 1 trên 10 câu hỏi;
  - không gặp 402;
  - không gặp lỗi "Failed to fetch dynamically imported module".
- **Chỉ xem:**
  - không bấm hành động ghi trên hồ sơ seed;
  - modal quyết định chỉ mở tới bước xác nhận rồi bấm "Quay lại" hoặc Esc.
- **Thang chấm:** cùng thang và cùng ngưỡng với lần 2; không cộng điểm vì đã sửa nhiều.
- **Kết quả đo chung:**
  - 0 tràn ngang ở mọi khung hình;
  - cỡ chữ nhỏ nhất 12px (Keycloak 13px; tra cứu chính sách 11,67px ở "Hiệu lực từ");
  - mỗi trang đúng một `h1` và một `main`;
  - vòng focus của nút và liên kết 7,8–14,6:1.
- **Giới hạn của công cụ đo:**
  - Chỉ số "lowContrast" của script bằng 0 nhưng bỏ sót nút chữ trùng màu nền. Lỗi đó chỉ thấy khi đọc màu từng nút trong modal.
  - Hai báo "không có vòng" đầu tiên là báo nhầm, đã kiểm lại bằng ảnh cắt và thấy vòng 3px xanh navy: radio dạng segmented, Select và DatePicker ở Nhật ký kiểm toán.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 2 | Lần 3 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 7,5 | 8,0 | Navy, vàng đồng, tiêu đề serif, số mono giữ đều từ Keycloak tới 403/404, chat, dashboard, OCR. Còn lệch: KPI chi tiết hồ sơ trộn sans "80", "12" với mono "≈ 1,76", "55,2"; tiêu đề cột số ở dashboard ("Lượt tham gia", "Lỗi") dùng mono như ô số; Keycloak còn gạch chân xanh PatternFly ở nút con mắt. |
| 2 | Phân cấp thông tin, hành động chính ở màn đầu | 7,0 | 7,5 | Việc của tôi (QHKH, Trưởng phòng) rõ: KPI "Bạn đang giữ, quá hạn", nút chính ở đầu. Hồ sơ 00187 có câu kết luận serif. Màn Phê duyệt 00163 không có câu kết luận, dòng đầu là lời khóa chạy đội agent; 00167/00170 không có nội dung AI. Kiểm toán thấy KPI "65 Đang chờ người khác" vô nghĩa với vai chỉ đọc. |
| 3 | Chữ và khả năng đọc tiếng Việt | 7,5 | 7,5 | Dấu tiếng Việt đúng, serif tiêu đề đẹp, mã HSV mono. Còn khối chữ dày ở ngăn kéo trace (đoạn Planner 5 dòng, Validation 8 dòng có "—" nối nhau), chữ hoa "CẦN BỔ SUNG", phát hiện mở đầu "— ", tiêu đề cột số đặt mono, "Hiệu lực từ" 11,67px. |
| 4 | Màu và ngữ nghĩa trạng thái | 7,0 | 7,0 | Đúng: nút từ chối đã dùng màu nguy hiểm, chip trạng thái có chấm màu kèm chữ, "Đội agent tốt hơn" xanh. Còn sai nghĩa: hạn 13/11 vàng ở 00187 nhưng xanh ở 00196 trên cùng danh sách đối chiếu; panel xanh "Không còn điều kiện chặn" cạnh kết luận AI "Cần bổ sung"; KPI "0 Đã quá hạn" cạnh tab "Quá hạn 2". |
| 5 | Mật độ, lưới, khoảng cách ở 1366 và 1920 | 7,0 | 7,5 | 0 tràn ngang. Panel AI dưới 1440 thành lớp phủ, không bóp nội dung. Còn: ma trận quyền Quản trị bị cắt ngang ở 1366; nửa dưới chi tiết khách hàng trống; khoảng trống thừa trên bảng đối chiếu và ở tra cứu chính sách; ở 1920 ô tìm kiếm thanh trên căn trái trong khi nội dung căn giữa; "3 cờ · 2 cao" xuống hai dòng ở 1366 (Trưởng phòng). |
| 6 | Thành phần và trạng thái | 7,0 | 7,5 | Đủ khung tải (thanh bên tối đủ cao), lỗi có "Thử lại", 403 nêu đúng vai, 404, rỗng có trích từ khóa, đang chạy đội agent "1/4 chuyên gia đã xong", modal hai bước. Trừ: bước xác nhận từ chối hỏng (chữ vô hình, focus thoát modal); khung xem tài liệu OCR chỉ là ô xám; nút "Tải PDF" khóa nằm sát dòng lý do. |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 7,0 | 7,5 | Dashboard có sơ đồ Planner → Credit/Compliance/Operations/Document → Validation → "Cấp phê duyệt: Người quyết định, ngoài khung AI". So sánh có "Nhận xét" một câu và cách đo rõ. Ngăn kéo trace vẽ luồng và nhãn "AI đề xuất". Chat ghi "Chỉ để tham khảo. Quyết định thuộc người có thẩm quyền". Trừ: người phê duyệt, vai giám khảo nhìn để thấy "người quyết định", không có kết luận AI một dòng và gặp mâu thuẫn AI với panel. |
| 8 | Tiếp cận WCAG AA | 6,5 | **6,0** | Đã sửa: vòng focus thẻ quyết định, Select, DatePicker, segmented, phân trang; combobox tìm kiếm đủ ARIA; "Đóng" có tên. Hồi quy: "Xác nhận từ chối" 1:1, trượt 1.4.3 trên nút nguy hiểm nhất; focus mặc định ở nút cam kết, Tab thoát ra `BODY` (2.4.3). Còn: ô nhập Keycloak focus 1px `rgb(16,16,16)`; nút trước/sau phân trang Quản trị không tên; textarea chat ở 1920 không tên. |
| 9 | Văn phong UX | 7,0 | 7,5 | Đã sửa: "tỷ đồng", "Số tiền đề nghị, tỷ đồng (bắt buộc)", "Ghi ý kiến tuân thủ", lỗi Keycloak, "Hiện mật khẩu". Còn: "Hạn mức phê duyệt (đồng) (bắt buộc)", "Kỳ hạn (tháng) (bắt buộc)"; "Thiếu Ý kiến Rủi ro" viết hoa giữa câu; "Ghi ý kiến Rủi ro/ Tuân thủ"; "(dữ liệu mẫu)" trong lý do trả về; "vs" trong cờ; "Hạn mức bảo đảm … 0 đồng". |
| 10 | Độ hoàn thiện sản phẩm thật | 6,5 | 6,5 | Tiến: không còn 412 hồ sơ rác ở trang chủ Kiểm toán, không còn mã vai và mã quyền thô, không lỗi vite. Lùi và còn: nút từ chối vô hình; `LA-20261112-130AF82B` ở cột Hồ sơ Nhật ký kiểm toán; `authority_tier` ở Quản trị; `AI_OCR` và `compliance policy` trong văn bản AI; 9 điều kiện lặp ý; ô xám ở khung xem tài liệu. |

Trung bình: (8,0 + 7,5 + 7,5 + 7,0 + 7,5 + 7,5 + 7,5 + 6,0 + 7,5 + 6,5) / 10 = **7,25**.

## Bảng từng trang

Ảnh ở `/tmp/gu3/`, tên dạng `<vai>-<trang>-<WxH>.png`.

| # | Trang hoặc trạng thái (vai) | Điểm | Phải sửa (ảnh · phần tử · file nghi ngờ) |
| --- | --- | --- | --- |
| 1 | Đăng nhập Keycloak | 8,0 | 1) `none-kc-*`: vòng focus ô nhập 1px đen, đổi thành 3px navy như ứng dụng · theme Keycloak `infra/keycloak/themes/…/login.css`. 2) Gạch chân xanh ở nút "Hiện mật khẩu". |
| 2 | Khung: thanh bên, thanh trên, dải demo | 8,0 | 1) `*-1920x1080`: ô tìm kiếm căn trái lệch so với nội dung căn giữa · `features/shell/Topbar.tsx`. 2) Dải demo chỉ hiện với Quản trị: thống nhất có hoặc không · `features/shell/`. |
| 3 | Việc của tôi (QHKH) | 8,5 | 1) `qhkh-home-*`: tiêu đề cột "Số tiền" đặt mono, đổi về sans, chỉ ô số là mono · `features/my-work/MyWorkPage.tsx`. |
| 4 | Việc của tôi (Trưởng phòng) | 8,0 | 1) `truongphong-home-1366x768`: "3 cờ · 2 cao" xuống hai dòng, cho cột rộng hơn hoặc `white-space: nowrap` · `features/my-work/MyWorkPage.tsx`. |
| 5 | Việc của tôi (Kiểm toán) | 7,5 | 1) `kiemtoan-home-*`: KPI "0 Đã quá hạn" trong khi tab "Quá hạn 2" · `MyWorkPage.tsx` (nhãn "Đã quá hạn"). 2) KPI "65 Đang chờ người khác" vô nghĩa với vai chỉ đọc, đổi thành "65 hồ sơ trong phạm vi kiểm toán". |
| 6 | Tìm kiếm (combobox) | 8,5 | Không có việc lớn. |
| 7 | Chi tiết hồ sơ HSV-00201 (QHKH, trả về) | 7,5 | 1) `qhkh-loanA-*` (HSV-00201): "(dữ liệu mẫu)" trong lý do trả về ở banner và dòng thời gian (dữ liệu seed). 2) KPI "15", "12" sans cạnh ô mono ở hồ sơ khác: thống nhất một kiểu số · `features/loan-detail/`. 3) "Tải PDF" khóa sát dòng lý do. |
| 8 | Chi tiết hồ sơ HSV-00187 (Thẩm định, kết quả AI) | 7,5 | 1) `tdinh-loan187-*`: 9 điều kiện, BCTC lặp ba lần, gộp trùng · `features/loan-detail/AgentTeamPanel.tsx`. 2) Phát hiện mở đầu "— Phần còn thiếu…", bỏ "— " đầu dòng · cùng file. 3) Dòng nguồn có `AI_OCR` · `features/dashboard/agentTrace.ts`, `AgentTeamPanel.tsx` (nhãn nguồn). |
| 9 | Chi tiết hồ sơ HSV-00176 (Rủi ro) | 7,5 | 1) `ruiro-loanA-*` (HSV-00176): "Thiếu Ý kiến Rủi ro", viết thường "ý kiến rủi ro" · `features/loan-detail/ActionsPanel.tsx`. |
| 10 | Chi tiết hồ sơ (Tuân thủ) | 7,5 | 1) `tuanthu-loanA-*`: cùng lỗi viết hoa và "— " như #8, #9. |
| 11 | Chi tiết hồ sơ (HTTD) | 7,5 | 1) `httd-loanA-*`: cùng lỗi văn bản AI như #8. |
| 12 | Chi tiết hồ sơ HSV-00163 (Phê duyệt, có lượt AI) | 6,5 | 1) `pheduyet-loan163-*`: thiếu câu kết luận serif đầu khối AI như 00187 · `AgentTeamPanel.tsx`. 2) Dòng đầu "Chỉ Quan hệ khách hàng… mới được chạy đội agent": ẩn với vai không chạy được, hoặc đưa vào tooltip nút khóa. 3) Panel xanh "Không còn điều kiện nào đang chặn" mâu thuẫn AI "Cần bổ sung" · `features/loan-detail/TodoPanel.tsx`. |
| 13 | Chi tiết hồ sơ HSV-00167/00170 (Phê duyệt, không AI) | 6,5 | 1) `pheduyet-loanA-*`, `pheduyet-loan14-*`: "Hồ sơ này trình trước khi có đội agent…" ở đúng màn giám khảo xem; seed cần một lượt thật hoặc ẩn khối · `AgentTeamPanel.tsx`, seed. 2) "Tờ trình chưa được trình" ở bước phê duyệt là câu tự mâu thuẫn. |
| 14 | Modal quyết định, bước chọn | 7,5 | 1) `pheduyet-decision-*`: "Hạn mức phê duyệt (đồng) (bắt buộc)", "Kỳ hạn (tháng) (bắt buộc)" thành "Hạn mức phê duyệt, đồng (bắt buộc)" như form đề xuất · `features/loan-detail/DecisionModal.tsx`. 2) Hiện kèm "= 55 tỷ đồng" dưới ô 55.000.000.000. |
| 15 | Modal quyết định, bước xác nhận từ chối | **4,0** | 1) `pheduyet-decision-confirm-reject-1366x768`, `pheduyet-reject-confirm2-*`: chữ "Xác nhận từ chối" 1:1, vô hình · `theme/componentOverrides.ts:36`. 2) Focus mặc định ở nút cam kết, Tab thoát ra `BODY` · `DecisionModal.tsx:42-44,68-69`. 3) Đường "Trả lại bổ sung" không có bước xác nhận như từ chối và phê duyệt (`pheduyet-return-confirm-*`). |
| 16 | Đội agent đang chạy (00187) | 8,0 | 1) `tdinh-running1/2-*`: phát hiện từng chuyên gia mở đầu "— " · `AgentTeamPanel.tsx`. |
| 17 | Tạo và soạn đề xuất | 8,0 | Không có việc lớn; stepper và cột kiểm đúng đích mockup. |
| 18 | Danh sách đối chiếu (HTTD) | 7,5 | 1) `httd-recon-list-*`: cùng hạn 13/11 khi vàng khi xanh · `features/reconciliation/ReconciliationIndexPage.tsx`. 2) Khoảng trống thừa trên bảng; chưa có lọc. |
| 19 | Chi tiết đối chiếu và OCR | 7,0 | 1) `httd-ocr187-doc-1366x768`: khung xem tài liệu là ô xám "chưa có ảnh trang thật"; hiện nội dung chữ của trang hoặc ẩn khung · `features/reconciliation/DocumentViewer.tsx`. 2) Chip "Đạt" khi cùng dòng tiêu đề, khi xuống dòng riêng · `ChecklistPanel.tsx`. |
| 20 | Khách hàng | 7,5 | 1) `qhkh-customers-*`: "Mức rủi ro: Chưa xếp hạng" ở mọi dòng, cột không mang tin · `features/customers/CustomerListPage.tsx`. |
| 21 | Chi tiết khách hàng | 7,0 | 1) `qhkh-customer-detail-*`: "20.000.000.000" trong bảng cạnh KPI "20 tỷ", chọn một cách · `features/customers/CustomerDetailPage.tsx`. 2) Nửa dưới trống ở 1920. |
| 22 | Thông báo | 8,5 | Không có việc lớn. |
| 23 | Dashboard Tổng quan | 8,0 | 1) `qhkh-dash-y700-*`: tiêu đề cột số mono ("Lượt tham gia", "Lỗi", "Công cụ gọi") · `features/dashboard/`. 2) Dòng "Hệ thống 0 0 0" thừa. 3) Nút `ant-tabs-nav-more` ẩn không tên (ẩn nên không trừ nhiều). |
| 24 | Dashboard Dấu vết | 8,0 | 1) `qhkh-trace-*`: hai ô lọc "Hiện ca kiểm thử (198)" và "Hiện 9 lượt nháp…" xuống hai dòng; gộp vào một hàng · `features/dashboard/components/CaseTrace.tsx`. |
| 25 | Ngăn kéo trace | 7,5 | 1) `qhkh-drawer-*`: Validation "CẦN BỔ SUNG: thiếu dữ liệu chặn — …" chữ hoa và chuỗi "—"; tách thành gạch đầu dòng · `features/dashboard/agentTrace.ts`. 2) Lộ "compliance policy Điều 6". 3) Esc đóng ngăn kéo, focus về `BODY` thay vì dòng đã mở. |
| 26 | Dashboard So sánh | 8,5 | 1) `qhkh-compare-*`: "Chi tiết kỹ thuật (kiểm toán)" đặt mono, đổi về sans. |
| 27 | Trợ lý AI (chat) | 8,0 | 1) `qhkh-chat-*`: lịch sử còn "10.000.000.000 VND", "Đây là dữ liệu mẫu" (câu cũ; câu mới đã sạch). 2) Thanh bên chat lặp "Cuộc trò chuyện mới" nhiều lần · `features/chat/`. |
| 28 | Panel AI trong hồ sơ | 7,5 | 1) `*-aipanel-*`: textarea không tên ở 1920 · `features/chat/components/`. 2) Hiện hội thoại cũ có "VND". |
| 29 | Nhật ký kiểm toán | 7,0 | 1) `kiemtoan-audit-*`: cột Hồ sơ hiện `LA-20261112-130AF82B` cho hồ sơ nháp; đổi thành "Nháp chưa đánh số" kèm tên khách · `features/audit/AuditLogPage.tsx`. 2) "Ghi ý kiến Rủi ro/ Tuân thủ" thành "Ghi ý kiến rủi ro, tuân thủ". |
| 30 | Tra cứu chính sách | 8,0 | 1) `httd-policy-*`: "Hiệu lực từ" 11,67px, nâng lên 12px; khoảng trống thừa khoảng 40px trên kết quả · `features/policy/`. |
| 31 | 403 và 404 | 8,0 | 1) `qhkh-403-audit-*`: `h1` "Nhật ký kiểm toán" nhỏ ở góc trên, tách khỏi khối báo lỗi; dùng tiêu đề khối làm `h1`. |
| 32 | Đang tải và lỗi | 8,0 | 1) `pheduyet-loading-*`: thanh bên lúc tải không có khung mục menu, nhảy khi tải xong. |
| — | Quản trị (không tính trung bình) | 7,0 | 1) `quantri-admin-1366x768`: ma trận quyền bị cắt ngang. 2) Lộ `authority_tier` · `features/admin/AdminPage.tsx`. 3) Nút trước/sau phân trang không tên. Thêm: "Pham Thu Ha" không dấu (seed); Quản trị vào `/viec-cua-toi` thấy `h1` "Việc của tôi". |
| — | Phiên Hội đồng | không chấm | Chưa có trong phạm vi; trang Phê duyệt có mục "Phiên Hội đồng tín dụng" ở thanh bên. |

Tổng 32 dòng: 242,5 / 32 = **7,58**.

## Kiểm lại 12 việc lần 2

| # | Việc lần 2 | Kết quả | Bằng chứng lần 3 |
| --- | --- | --- | --- |
| 1 | Vòng focus ô form: thẻ quyết định, Select và DatePicker kiểm toán, segmented, phân trang; "Tìm" ở kính lúp trace; "Đóng" ở modal | Đã sửa phần lớn | Thẻ quyết định có vòng chọn; Select, DatePicker, segmented có vòng 3px navy (ảnh cắt); phân trang có vòng; kính lúp trace có tên (không nằm trong danh sách điều khiển không tên); "Đóng" ở ngăn kéo 8,48:1. Còn: nút trước/sau phân trang Quản trị không tên; Keycloak focus 1px. |
| 2 | Nút "Sửa đề xuất" mất khung | Đã sửa | `qhkh-loanA-*` (HSV-00201): nút có khung và nền đúng. |
| 3 | Mã thô ở Quản trị và Tổng quan | Sửa một phần | Vai và quyền là tiếng Việt kèm mã mono nhỏ; công cụ MCP tiếng Việt ("Hồ sơ doanh nghiệp (KYB)", "Tra cứu CIC"); "3,46 USD". Còn `authority_tier` ở Quản trị. |
| 4 | Kết luận AI đọc được trong 5 giây | Sửa một phần | 00187 có câu kết luận serif. Còn: 9 điều kiện lặp ý BCTC; "— " đầu phát hiện; `AI_OCR`; Validation chữ hoa có "—" nối và `compliance policy` trong ngăn kéo. |
| 5 | Màn người quyết định có nội dung AI | Sửa một phần | 00163 có kết quả từng chuyên gia (sau khi giám khảo làm ấm), nhưng không có câu kết luận, dòng đầu là lời khóa, mâu thuẫn với TodoPanel. 00167/00170 vẫn là câu thay thế. |
| 6 | Dữ liệu rác ở Kiểm toán | Sửa một phần | Trang chủ 65 hồ sơ, không còn tên "—", bỏ nút "Chỉ đọc". Nhật ký kiểm toán vẫn hiện `LA-20261112-130AF82B` (nháp e2e mới; giao diện vẫn in mã thô khi chưa có số HSV). |
| 7 | Xác nhận từ chối: màu nguy hiểm, focus "Quay lại", in đậm "Không hoàn tác được" | **Hồi quy** | In đậm đã có; nút đã `danger`. Nhưng chữ `rgb(168,40,29)` trên nền `rgb(168,40,29)`, 1:1; `focus=true` ở "Xác nhận từ chối"; Tab → `BODY` (`/tmp/gu3/rej.log`). Tệ hơn lần 2: lần 2 nút đọc được. |
| 8 | Panel AI phủ dưới 1440 | Đã sửa | 1366: panel phủ lên nội dung, không bóp cột. |
| 9 | Combobox tìm kiếm: ARIA, mũi tên, nhãn nhóm thường, mã mono | Đã sửa | `role=combobox`, `aria-activedescendant` đổi theo mũi tên, `listbox`; nhóm viết thường; mã mono; rỗng "Không có kết quả cho “zzqxv”." |
| 10 | Khung tải và `h1` ở trang lỗi hồ sơ | Đã sửa | `pheduyet-loading-loan`: thanh bên đủ cao; `pheduyet-error-loan`: `h1` "Không tải được hồ sơ", nút "Thử lại". |
| 11 | Câu chữ: "tỷ đồng", "(bắt buộc)", "Ghi ý kiến Tuân thủ", tên chat, đơn vị OCR, "Validation 0,0 giây" | Sửa một phần | "Số tiền đề nghị, tỷ đồng (bắt buộc)", "Ghi ý kiến tuân thủ", thời gian Validation hợp lý ("19,6 giây") đã đúng. Còn: "(đồng) (bắt buộc)" ở modal quyết định; "Ghi ý kiến Rủi ro/ Tuân thủ" ở Nhật ký; "VND" trong lịch sử chat; tên chat lặp "Cuộc trò chuyện mới". |
| 12 | Mã HSV luôn mono | Đã sửa | Tìm kiếm, thông báo, chi tiết khách hàng, mã chính sách, dấu vết đều mono. |

Tổng: 5 đã sửa, 1 đã sửa phần lớn, 5 sửa một phần, 1 hồi quy.

## Danh sách việc phải sửa, theo mức ảnh hưởng tới điểm

1. **Chữ nút "Xác nhận từ chối" vô hình** (tiêu chí 4, 8, 10; trang 15).
   - Chỗ: `frontend/src/theme/componentOverrides.ts:36` `dangerColor: colors.danger700` trong override Button.
   - Antd dùng `dangerColor` làm màu chữ cả cho nút `type="primary" danger`, nên chữ trùng nền.
   - Sửa: bỏ `dangerColor` khỏi override, để nút viền nguy hiểm dùng `colorError`. Hoặc tách bằng `className` riêng cho nút nguy hiểm đặc, chữ `#FFFFFF` trên `danger700` (khoảng 7:1).
   - Kiểm: đọc `getComputedStyle` của nút trong modal và tính tương phản ≥ 4,5. Thêm kiểm tra này vào e2e tiếp cận, vì quét hiện tại bỏ sót chữ trùng nền.
2. **Focus ở bước xác nhận** (tiêu chí 8; trang 15).
   - Chỗ: `features/loan-detail/DecisionModal.tsx:42-44` (effect focus `backRef`) và `:68-69`.
   - Đo thực tế: focus vẫn ở nút cam kết, có thể do Antd Modal hoặc nút vừa bấm giữ focus sau khi render lại. Tab từ nút cuối rơi ra `BODY`.
   - Sửa:
     - focus "Quay lại" sau khi footer mới gắn, ví dụ `requestAnimationFrame` hoặc `autoFocus` trên nút "Quay lại";
     - bật lại bẫy focus của Modal (`focusable`/`focusTrap`), không render footer ngoài vùng bẫy.
   - Kiểm: `document.activeElement` là "Quay lại"; Tab từ nút cuối quay về nút "Đóng" của modal.
3. **Màn Phê duyệt kể được kết luận AI** (tiêu chí 2, 7; trang 12, 13).
   - Chỗ: `features/loan-detail/AgentTeamPanel.tsx`, `features/loan-detail/TodoPanel.tsx`.
   - Sửa:
     - luôn hiện câu kết luận serif một dòng đầu khối AI như 00187, ví dụ "AI đề xuất: Cần bổ sung CIC và sàng lọc AML trước khi quyết định";
     - ẩn lời "Chỉ Quan hệ khách hàng… mới được chạy đội agent" với vai không chạy được, đưa vào tooltip của nút khóa;
     - khi AI có điều kiện chặn, TodoPanel không hiện xanh "Không còn điều kiện nào đang chặn" mà hiện "AI ghi nhận 2 điều kiện cần bổ sung, người quyết định xem xét".
   - Cho 00167/00170: seed một lượt thật, hoặc chọn hồ sơ demo khác cho vai Phê duyệt.
4. **Làm sạch văn bản AI** (tiêu chí 3, 9, 10; trang 8–11, 16, 25).
   - Chỗ: `AgentTeamPanel.tsx` (khoảng dòng 120–130 có hàm chuẩn hóa chữ hoa), `features/dashboard/agentTrace.ts`.
   - Sửa:
     - bỏ "— " đầu phát hiện;
     - tách chuỗi "A — B — C" thành gạch đầu dòng;
     - hạ "CẦN BỔ SUNG:" thành nhãn chip, phần sau viết thường;
     - thay `compliance_policy`/`compliance policy` bằng "Chính sách tuân thủ", `AI_OCR` bằng "AI trích xuất";
     - gộp điều kiện trùng (so khớp chuỗi sau chuẩn hóa) để 9 điều kiện còn khoảng 5.
5. **Mã nháp `LA-…` ở Nhật ký kiểm toán** (tiêu chí 10; trang 29).
   - Chỗ: `features/audit/AuditLogPage.tsx`.
   - Sửa: khi hồ sơ chưa có số HSV, hiện "Nháp chưa đánh số" kèm tên khách; không in mã nội bộ.
   - Cũng sửa "Ghi ý kiến Rủi ro/ Tuân thủ" thành "Ghi ý kiến rủi ro, tuân thủ".
6. **Nhãn form modal quyết định** (tiêu chí 9; trang 14).
   - Chỗ: `DecisionModal.tsx`.
   - Sửa: "Hạn mức phê duyệt, đồng (bắt buộc)" và "Kỳ hạn, tháng (bắt buộc)", cùng kiểu với form đề xuất; thêm dòng phụ "= 55 tỷ đồng".
   - Thêm bước xác nhận cho "Trả lại bổ sung" cho cùng mẫu với từ chối và phê duyệt.
7. **KPI Kiểm toán mâu thuẫn** (tiêu chí 2, 4; trang 5).
   - Chỗ: `features/my-work/MyWorkPage.tsx`.
   - Sửa: KPI "Đã quá hạn" dùng cùng nguồn đếm với tab "Quá hạn". Với vai Kiểm toán, thay "Đang chờ người khác" bằng "Trong phạm vi kiểm toán".
8. **Khung xem tài liệu OCR là ô xám** (tiêu chí 6, 10; trang 19).
   - Chỗ: `features/reconciliation/DocumentViewer.tsx`.
   - Sửa: hiện nội dung chữ của trang mẫu với vùng tô đánh dấu, hoặc thu khung lại thành thẻ "Chưa có ảnh trang" cao một dòng để danh mục và mâu thuẫn chiếm chỗ.
9. **Màu hạn thống nhất** (tiêu chí 4; trang 18).
   - Chỗ: `features/reconciliation/ReconciliationIndexPage.tsx`.
   - Sửa: màu chip tính từ số ngày còn lại so với hôm nay theo một ngưỡng chung, không theo SLA riêng từng hồ sơ; nếu theo SLA thì ghi rõ "còn 1 ngày".
10. **Kiểu số và tiêu đề cột** (tiêu chí 1, 3; trang 3, 7, 23).
    - Sửa: tiêu đề cột luôn sans, chỉ ô số mono; ô KPI chi tiết hồ sơ cùng một kiểu số. Thành phần bảng chung trong `components/` và `features/dashboard/`.
11. **Keycloak**: focus ô nhập 3px navy; bỏ gạch chân xanh ở nút con mắt (tiêu chí 1, 8; trang 1).
12. **Quản trị** (không tính trung bình):
    - bỏ `authority_tier` (`features/admin/AdminPage.tsx`);
    - ma trận quyền cuộn ngang trong khung có bóng mép, hoặc cột đầu cố định ở 1366;
    - đặt `aria-label` "Trang trước"/"Trang sau";
    - Quản trị vào trang chủ riêng thay vì "Việc của tôi".
13. **Phần nhỏ:**
    - "Mức rủi ro: Chưa xếp hạng" ở mọi dòng khách hàng, ẩn cột khi không có dữ liệu (`CustomerListPage.tsx`);
    - số tiền chi tiết khách hàng một cách viết;
    - "Hiệu lực từ" 11,67px nâng lên 12px;
    - textarea panel AI có `aria-label`;
    - Esc đóng ngăn kéo trace trả focus về dòng đã mở;
    - "(dữ liệu mẫu)" trong lý do trả về HSV-00201 (seed).

## Nếu chỉ còn một ngày: 5 việc đáng làm nhất

1. Việc 1: bỏ `dangerColor` để chữ nút từ chối hiện lại. Khoảng 15 phút, gỡ một lỗi chặn ĐẠT ở tiêu chí 8 và 10.
2. Việc 2: focus "Quay lại" và bẫy focus ở bước xác nhận.
3. Việc 3: câu kết luận AI và bỏ mâu thuẫn TodoPanel trên màn Phê duyệt 00163. Đây là màn giám khảo cuộc thi xem để thấy "người quyết định".
4. Việc 4: làm sạch văn bản AI ("— ", chữ hoa, `AI_OCR`, `compliance policy`, điều kiện trùng).
5. Việc 5 và 6 gộp: mã `LA-` ở Nhật ký và nhãn "(đồng) (bắt buộc)" ở modal quyết định.

Ước tính: làm đủ 5 việc trên thì tiêu chí 8 lên khoảng 7,0–7,5 và tiêu chí 10 lên khoảng 7,0–7,5, trung bình khoảng 7,6–7,8. Vẫn chưa tới 8,5. Muốn tới 8,5 cần thêm việc 7–10 và một lượt soát toàn bộ văn bản AI trên mọi hồ sơ demo.

## Chưa kiểm chứng và chỗ brief sai

- **Brief nói HSV-2026-00163 đã có lượt đội agent thật (crew `fc`).**
  - Lúc giám khảo mở (trước 19:18), 00163 chưa có lượt nào. Thay đổi của `fc` ở `reset-demo.sh` nằm trong commit WIP `b599dbf`.
  - Giám khảo phải tự chạy `reset-demo.sh --warm` (2 lượt agent) mới có dữ liệu để chấm màn Phê duyệt.
- **Brief nói "Chưa có: trang Quản trị".** Trang Quản trị có và chạy; đã chấm, nhưng không tính vào trung bình theo brief.
- **Dữ liệu demo có thể bị đặt lại giữa chừng** (crew `ff`, giám khảo `g6`). Mã `LA-20261112-…` ở Nhật ký kiểm toán là nháp e2e trong ngày; vẫn tính là lỗi giao diện vì trang in mã thô cho mọi nháp chưa có số.
- **Chưa kiểm chứng:**
  - hover từng thành phần ngoài nút và dòng bảng;
  - đọc màn hình bằng trình đọc thật (chỉ kiểm tên truy cập qua DOM);
  - trang 1280×800 và 1440×900 của từng vai ngoài QHKH (chỉ đo số, không xem từng ảnh);
  - textarea "không tên" ở 1920 có thể là bản sao ẩn của Antd autosize. Ghi là nghi vấn, không trừ thêm.
- **Nguyên nhân focus ở bước xác nhận chưa rõ.** Mã `DecisionModal.tsx:43-44` có ý định focus "Quay lại", nhưng số đo thực tế cho thấy focus ở nút cam kết. Crew sửa cần tái hiện bằng bàn phím trước khi đổi.
