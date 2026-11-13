# Chấm điểm ứng dụng thật, lần 10: thẩm mỹ và UX theo thiết kế "Sổ Tín Dụng"

Giám khảo độc lập (Opus). Ngày 14/11/2026 (thứ Bảy). Mã chấm: `import/duskdash` tại `6ae6990`, cùng mã đang chạy ở web 3000 (repo chính cũng ở `6ae6990`).
Đích: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Lần 9: `docs/design/cham-diem-ung-dung-lan-9.md` (8,45, KHÔNG ĐẠT).

## Kết luận

**Trung bình 10 tiêu chí: 8,55. ĐẠT.** Ngưỡng: trung bình từ 8,5 và không tiêu chí nào dưới 7.

- Không tiêu chí nào dưới 8. Qua ngưỡng 0,05, sát như lần 8: một hồi quy dễ thấy ở màn đầu là đủ trượt lại.
- Trung bình 34 trang (33 trang cũ cộng khối mới "Điều kiện trước giải ngân"): 8,62. Phiên Hội đồng không chấm, không tính.
- Ba hồi quy làm lần 9 trượt đều đã hết khi đo lại:
  1. Không còn "ĐỀ xuất": `grep -c "ĐỀ\|XUẤT"` trên 12 file toàn văn (3 ngăn kéo, 9 trang hồ sơ) ra 0. Tiêu đề thẻ kết luận 00187 là "Đề xuất phê duyệt với điều kiện tiên quyết…".
  2. Chip hạn, phụ đề, KPI và Segmented ở Việc của tôi (QHKH) khớp nhau: 00201 chip đỏ "quá hạn hôm nay", phụ đề "2 quá hạn", KPI "Hạn hôm nay 0 · Hồ sơ quá hạn 2", Segmented "Quá hạn 2".
  3. Số mục ngăn kéo khớp thẻ: 00187 4/4, 00163 3/3, 00167 3/3.
- Tăng điểm ở (4) và (10), đều từ 8,0 lên 8,5. (9) Văn phong giữ 8,0: chữ AI vẫn còn chỗ vụng ngay trong thẻ kết luận của hồ sơ trình diễn 00187. Cụ thể là câu "0 đồng" (còn nằm trong danh sách điều kiện), hai thẻ trùng ý về người đại diện, "(không cản trở trình)" và "inflow".
- Nếu muốn có khoảng an toàn trên ngưỡng, làm việc 1 đến 3 ở danh sách dưới. Cả ba là lọc chữ ở phía hiển thị, có file và dòng.

## Cách chấm

- Đăng nhập Keycloak thật bằng 9 vai và không vai: QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị. Bộ đo Playwright ở `/tmp/gu10/` (`run.sh`, `run.cjs`, `lib.cjs`, `ai10.sh`, các `st-*.cjs`; thêm mới `st-pre.cjs`, `st-cmp.cjs`, `st-mw.cjs`).
- Cỡ màn hình: 1366×768 và 1920×1080 cho mọi trang. Thêm 1280×800 và 1440×900 cho đăng nhập, Keycloak, Việc của tôi, chi tiết hồ sơ, dashboard.
- Mọi ảnh chụp trong **một khóa** `flock /tmp/do-an-e2e.lock` cùng `infra/scripts/reset-demo.sh --warm`:
  - khóa từ 02:17:06 tới 02:28:42; warm xong 02:19:20;
  - kết quả warm: 00187 Chờ phê duyệt (Pending Approval), 00163 và 00167 Cần bổ sung (Needs Info).
- Lượt đội agent: 3, đều của warm. Không chạy thêm lượt nào. Trạng thái đang chạy chụp trong lúc warm chạy 00187 (`tdinh-running1`, "Đã chạy 00:13 · 1/4 chuyên gia đã xong").
- Chat: 3 câu (2 ở trang chat, mỗi câu khoảng 13 giây; 1 ở panel). Không gặp 402. Không gặp lỗi vite, PAGEERROR hay STEPERR.
- Kết quả bộ đo:
  - 316 ảnh, 202 lượt đo trang;
  - 0 trang tràn ngang, 0 chữ dưới AA, chữ nhỏ nhất 12px (Keycloak 13px);
  - vòng focus nút điều hướng 3px, 7,82:1 trên nền sáng và 14,64:1 trên thanh bên navy;
  - "Bỏ qua điều hướng" 7,82:1, dòng danh sách 8,48:1, 18/18 liên kết hồ sơ có vòng;
  - modal xác nhận mở bằng phím: nút "Quay lại" 8,48:1; Esc trả focus về "Quyết định" (7,82:1) và "Trợ lý AI" (14,64:1).
- Chữ AI kiểm bằng toàn văn sau warm: `drawer-00187.txt`, `drawer-00163.txt`, `drawer-00167.txt` và `full-<vai>-<01|13|18>.txt` (Thẩm định, Phê duyệt, Kiểm toán). `grep` chữ in hoa lạ, ".;", ".…", nhãn lặp "X: X:", "VND", ",0", "inflow", "0 đồng", rồi so với `/tmp/gu9/`.

### Bẫy đã gặp (bổ sung cho lần 9)

- **Chấm vào cuối tuần thì chip hạn đổi chữ.**
  - `format.ts:53` tính `n` theo ngày làm việc. Thứ Bảy 14/11, hồ sơ hạn thứ Sáu 13/11 có `n = 0`, nên ghi "quá hạn hôm nay" cạnh ngày "13/11/2026".
  - Màu và bộ đếm vẫn đúng. Nhưng chữ "hôm nay" mâu thuẫn với ngày in ngay bên cạnh.
  - Chấm ngày thường sẽ không thấy lỗi này.
- **`reset-demo.sh --warm` không xóa điều kiện trước giải ngân đã xác nhận.**
  - `infra/database/demo/reset-demo-cleanup.sql:22-23` chỉ xóa điều kiện khi đề xuất nguồn `AGENT:<id>` không còn.
  - Hậu quả: 00187 hiện 3 điều kiện "Đã được người xác nhận" ghi ngày 10–11/11, do các lượt e2e hoặc giám khảo trước để lại.
  - Đây là dữ liệu, không phải thiết kế. Nhưng giám khảo cuộc thi vẫn thấy chúng, kể cả chữ "inflow" (`kiemtoan-pre-01-1366x768.png`).
- **Người Phê duyệt (`approver@`) không mở được 00187.** Trang báo "ngoài phạm vi được xem", vì hồ sơ đang ở bước Thẩm định, Cấp 2 Hội sở. Đây là phân quyền, không chấm ở đây. Muốn chấm thẻ kết luận 00187 thì dùng Thẩm định hoặc Kiểm toán.
- **Chuỗi "không cản trở trình" không có trong mã nguồn.** Do LLM sinh ra; `scrubInternal` chỉ bắt "(không chặn trình hồ sơ)" (`ui7.test.ts:16`).
- Dương tính giả cũ vẫn còn, không tính:
  - `ant-tabs-nav-more`, `ant-input-clear-icon-hidden`, TEXTAREA autosize;
  - Segmented INPUT 1,67;
  - INPUT trong Select/DatePicker ở nhật ký;
  - BODY khi Tab quay vòng;
  - Keycloak "1.12 white … Sổ Tín Dụng";
  - panel mở bằng chuột, focus vào "Đóng Trợ lý AI" mà không hiện vòng.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 9 | Lần 10 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 9,0 | **9,0** | Navy, nền giấy, serif tiêu đề, chip tím nét đứt "AI đề xuất", chip navy "Người quyết định" thống nhất trên mọi trang, kể cả Quản trị và khối mới "Điều kiện trước giải ngân". Keycloak đã có chip tím và navy, mũi tên đứng đầu dòng ("→ Người có thẩm quyền quyết định", `none-kc-1366`). Còn nhỏ: thẻ thứ ba ở Keycloak chỉ có chữ; trang đăng nhập có hai dấu cách trong "AI đề xuất  → Chuyên viên". |
| 2 | Phân cấp, hành động chính ở màn đầu | 8,5 | **8,5** | Chi tiết hồ sơ: stepper, hạn bước, tab, thẻ kết luận AI bên trái, "Việc của bạn" bên phải, nút chính ở góc phải (`tdinh-loan187-1920`). Còn: hồ sơ 00163 ở vai Phê duyệt là một dãy thẻ rỗng (Chỉ số, Cờ, Điều kiện, Tờ trình "Tờ trình chưa được trình.", Tài sản) ngay khi hồ sơ đang chờ phê duyệt. Khối điều kiện mới thêm một thẻ rỗng nữa (`pheduyet-pre-13`). 00187 hiện hai DSCR ở hai chỗ: KPI "≈ 1,76", ngăn kéo "chính thức = 1,34". Bảng chỉ số có giải thích ("Khai báo/Tính lại · Mâu thuẫn chưa chốt"), nhưng màn đầu thì không. |
| 3 | Chữ và khả năng đọc tiếng Việt | 8,5 | **8,5** | Be Vietnam Pro và serif tiêu đề hiển thị dấu đúng ở mọi cỡ; chữ nhỏ nhất 12px. Nhãn "Dữ kiện inflow" đã hết. "inflow" còn trong thân chữ: thẻ đề xuất 00163 và 00167 có "đối chiếu inflow với doanh thu BCTC" (`full-tdinh-13.txt`, `full-tdinh-18.txt`); điều kiện đã xác nhận ở 00187 có "Đối chiếu inflow theo đúng kỳ…". Cùng trang mà chỗ viết TSĐB, chỗ viết TSBĐ: chỉ số "LTV – dư nợ/giá trị xử lý TSBĐ" (`backend/app/services/loan_detail_service.py:24`), còn chữ AI ghi "TSĐB". |
| 4 | Màu và ngữ nghĩa trạng thái | 8,0 | **8,5** | Chip hạn, KPI, phụ đề và Segmented khớp nhau (QHKH, Trưởng phòng). Vai Tuân thủ ở 00176 dùng một tên: chip "Chờ ý kiến rủi ro", dòng chỉ xem "Hồ sơ đang ở trạng thái 'Chờ ý kiến rủi ro'" (`role-tuanthu.log`). Danh sách khách hàng đã ẩn cột rủi ro trống. Còn: lỗi chữ hạn khi chấm cuối tuần (xem Bẫy). |
| 5 | Mật độ, lưới ở 1366 và 1920 | 8,5 | **8,5** | 0 tràn ngang trên 202 lượt đo. Ở 1366, chi tiết hồ sơ hai cột đọc tốt; ở 1920, chữ thân trong thẻ kết luận dài tới khoảng 110 ký tự một dòng (`tdinh-loan187-1920`), hơi dài nhưng chưa vỡ. Bảng Quản trị và So sánh gọn. 404 và 403 ở 1920 vẫn để khoảng trống lớn. |
| 6 | Thành phần và trạng thái | 9,0 | **9,0** | Skeleton đúng khung khi tải; lỗi có "Thử lại"; 403 nêu tên trang và vai; nút khóa kèm lý do ("Chưa xuất được: Tờ trình chưa được chốt khi trình."). Modal xác nhận ghi số tiền và "Không hoàn tác được". Trạng thái đang chạy có đồng hồ và "1/4 chuyên gia đã xong". Khối mới "Điều kiện trước giải ngân": mỗi điều kiện có chip "AI đề xuất", chip xanh "Đã được người xác nhận", tên người và giờ; có trạng thái rỗng; không bị thanh trên che khi cuộn tới (thanh trên nằm ngoài vùng cuộn, `secTop = 52`). Còn: ở panel AI, chip "HSV-2026-00187" dính đầu đè lên chữ đang cuộn (`tdinh-panel-clip-top`, đã có từ lần 9). |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 8,5 | **8,5** | Đã hết "ĐỀ xuất"; số mục khớp; "Điều kiện chính" đã quay lại ở 00163 và 00167. Khối Người quyết định ghi "Cấp phê duyệt / Cấp 2 Hội sở xác nhận. Đội agent chỉ đề xuất, không tự phê duyệt." ở cả ba hồ sơ. Sơ đồ Planner → Credit/Compliance/Operations/Document → Validation → Cấp phê duyệt có ở dashboard, thẻ kết luận và ngăn kéo. Còn kéo điểm: 00187 có hai thẻ xác nhận cùng ý ("Bổ sung thông tin người đại diện và lịch trả nợ trước giải ngân", "Bổ sung trước giải ngân (không cản trở trình): người đại diện pháp luật chưa có trong hồ sơ"); câu nhận xét "Giá trị TSĐB … bằng 0 đồng do định giá chưa xác minh" vẫn nằm trong danh sách "Yêu cầu bổ sung và điều kiện" và "Điều kiện bổ sung" của Compliance. Panel AI cùng hồ sơ có 7 gạch đầu dòng (2 trùng), thẻ có 5. |
| 8 | WCAG AA | 8,5 | **8,5** | 0 chữ dưới AA; vòng focus 3px từ 7,82:1; modal và panel bẫy focus, Esc trả focus đúng chỗ. Còn nút xóa của antd không có tên ở tra cứu chính sách (`httd-policy-dscr`, 1366 và 1920; lần 8, lần 9 cũng có). Không có trình đọc màn hình thật, chỉ kiểm cây tiếp cận. |
| 9 | Văn phong UX | 8,0 | **8,0** | Đã sạch: "ĐỀ xuất", ".;", "VND" và ",0" trong panel, dòng "cấp xác nhận" đứng riêng, nhãn "Dữ kiện inflow". Còn: "(không cản trở trình)" 7 lần trong 3 ngăn kéo (bằng lần 9); "Điều kiện trước giải ngân: Bổ sung trước giải ngân" (`drawer-00187.txt:121`); "0 đồng" ở 00187 (đã có lý do nhưng vẫn là mục cần làm) và ở 00163 ("hạn mức có bảo đảm đủ điều kiện là 0 đồng" với hồ sơ không có tài sản bảo đảm); "inflow" trong thân chữ; số khi "80,0 tỷ", "145,0 tỷ", "45,0 tỷ đồng", khi "80 tỷ đồng"; tóm tắt Planner 00163 kết thúc bằng ".…"; "Chưa có điều kiện nào được ghi" thiếu dấu chấm, trong khi "Không có cờ." có. Brief nói engine đã "không còn biến câu nhận xét thành điều kiện": với "0 đồng" thì chưa đúng. |
| 10 | Độ hoàn thiện sản phẩm thật | 8,0 | **8,5** | Không vỡ bố cục, không lộ mã thô (rawScan chỉ ra nhãn trường và mã `EMP-DEMO-…` đã chốt), chuyển trang mượt, không lỗi vite. Hai hồi quy ở màn đầu của lần 9 đã hết. Còn: chip dính trong panel đè chữ; 3 điều kiện cũ sót lại sau reset trên hồ sơ trình diễn; số định dạng không đều; chữ hạn sai khi chấm cuối tuần. |

Trung bình: (9,0 + 8,5 + 8,5 + 8,5 + 8,5 + 9,0 + 8,5 + 8,5 + 8,0 + 8,5) / 10 = **8,55**.

## Bảng từng trang

| # | Trang | Lần 9 | Lần 10 | Việc phải sửa (ảnh · phần tử · file nghi ngờ) |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập và Keycloak | 9,0 | 9,0 | Keycloak đã có chip. Còn: (a) hai dấu cách trong "AI đề xuất  → Chuyên viên" · `frontend/src/pages/LoginPage.tsx`; (b) thẻ thứ ba ở Keycloak chỉ có chữ · `infra/keycloak/theme/so-tin-dung/login/`. |
| 2 | Khung (thanh bên, thanh trên, dải demo) | 9,0 | 9,0 | Không có lỗi mới. |
| 3 | Việc của tôi (QHKH) | 8,0 | 8,5 | `qhkh-home-1366x768.png`: 00201 hạn 13/11, chip ghi "quá hạn hôm nay" vì hôm nay thứ Bảy · `features/my-work/format.ts:53`. Khi `n = 0` mà ngày hạn khác ngày hôm nay thì ghi "quá hạn 1 ngày" (ngày lịch) hoặc "quá hạn từ 13/11". |
| 4 | Việc của tôi (Trưởng phòng) | 9,0 | 8,5 | Cùng dòng 00201 và cùng lỗi chữ như trang 3. |
| 5 | Kiểm toán (hồ sơ chỉ đọc) | 9,0 | 9,0 | Không có lỗi riêng; khối điều kiện tính ở trang 34. |
| 6 | Tìm kiếm | 8,5 | 8,5 | Không có lỗi mới (bộ đo và rawScan sạch). |
| 7 | Chi tiết 00201 (QHKH) | 8,5 | 8,5 | Chip hạn như trang 3. |
| 8 | Chi tiết 00187 (Thẩm định) | 7,5 | 8,5 | `tdinh-loan187-1920`: (a) mục cuối "Giá trị TSĐB đủ điều kiện hiện tại bằng 0 đồng do định giá chưa xác minh" là nhận xét, không phải việc cần làm · `features/dashboard/agentTrace.ts:524` (`ZERO_TAIL` chưa bắt "bằng 0 đồng" và đuôi "do …") và `:651` `STATUS_ONLY`. (b) Hai thẻ cùng ý về người đại diện · `features/agent-actions/ActionProposals.tsx` (gộp đề xuất trùng đối tượng). (c) KPI "DSCR dự phóng ≈ 1,76" cạnh "DSCR chính thức = 1,34" mà không có chú thích ở màn đầu. |
| 9 | Chi tiết hồ sơ (Rủi ro) | 8,5 | 8,5 | Như 8a khi xem 00187. |
| 10 | Chi tiết 00176 (Tuân thủ) | 8,5 | 9,0 | Đã một tên trạng thái. Không có lỗi mới. |
| 11 | HTTD | 8,5 | 8,5 | Không có lỗi mới. |
| 12 | Chi tiết 00163 (Phê duyệt) | 8,5 | 8,5 | (a) Compliance "hạn mức có bảo đảm đủ điều kiện là 0 đồng" với hồ sơ không có tài sản bảo đảm (`drawer-00163.txt:21,61,119`) · `agentTrace.ts:524`. (b) "đối chiếu inflow" trong thẻ · `agentTrace.ts` `cleanAiLine`, dùng lại bảng dịch ở `:237`. (c) Dãy thẻ rỗng khi chờ phê duyệt (`pheduyet-pre-13`) · `features/loan-detail/LoanDetailPage.tsx:61`: gộp các thẻ rỗng thành một dòng tóm tắt. |
| 13 | Chi tiết 00167 | 8,5 | 8,5 | "đối chiếu inflow" như 12b. |
| 14 | Modal chọn quyết định | 9,0 | 9,0 | Không có lỗi mới. |
| 15 | Modal xác nhận | 9,0 | 9,0 | Không có lỗi mới. |
| 16 | Đội agent đang chạy | 9,0 | 9,0 | `tdinh-running1`: đồng hồ, "1/4 chuyên gia đã xong", nút khóa "Đội agent đang chạy…". Không có lỗi mới. |
| 17 | Soạn đề xuất | 8,5 | 8,5 | Không có lỗi mới. |
| 18 | Danh sách đối chiếu | 8,5 | 8,5 | Không có lỗi mới. |
| 19 | Chi tiết đối chiếu 00187 | 8,5 | 8,5 | `httd-ocr187B-doc`: khung giữa chỉ một câu "Trang này chưa có trường trích xuất" (đã chốt, không trừ). Không có lỗi mới. |
| 20 | Danh sách khách hàng | 8,0 | 8,5 | `cust.log`: cột rủi ro trống đã ẩn; hàng 5 cột gọn. |
| 21 | Chi tiết khách hàng | 8,5 | 8,5 | Không có lỗi mới. |
| 22 | Thông báo | 9,0 | 9,0 | Không có lỗi mới. |
| 23 | Dashboard Tổng quan | 8,5 | 8,5 | `qhkh-dash-1366`: KPI và sơ đồ rõ. Viền trên màu vàng chỉ có ở thẻ đầu, ý nghĩa chưa rõ. |
| 24 | Dấu vết (danh sách) | 8,5 | 8,5 | Không có lỗi mới. |
| 25 | Ngăn kéo dấu vết | 8,0 | 8,5 | (a) `drawer-00187.txt:121` "Điều kiện trước giải ngân: Bổ sung trước giải ngân" · `features/dashboard/CaseTrace.tsx`, chỗ ghép nhãn loại đề xuất với tiêu đề: bỏ phần lặp đầu tiêu đề. (b) "(không cản trở trình)" ×7 · `agentTrace.ts:320` `scrubInternal`: bắt cả "không cản trở trình". (c) "80,0 tỷ = 80,0 tỷ", "145,0 tỷ" · `agentTrace.ts:345` `decimalVi`: bỏ ",0" khi phần thập phân bằng 0, như panel đã làm. |
| 26 | So sánh | 8,5 | 8,5 | `qhkh-cmp-run0`: ba lượt v8 chọn được (14/11 00:51, 71,3% ± 16,6% so với 57,0% ± 19,9%; 13/11 15:54; 13/11 05:08). Nhãn ba lượt chỉ khác giờ; nên thêm "lần 1/2/3" vào nhãn. Câu ghi chú "Với lượt đo thứ ba, đây là lần đo sau hai lần sửa engine (sau lượt 1 và sau lượt 2)…" nên viết gọn lại · `features/dashboard/ComparisonTab.tsx`. |
| 27 | Chat | 9,0 | 9,0 | `qhkh-chat-answer2`: có nguồn §, có câu "Chỉ để tham khảo"; không VND, không ",0". Không có lỗi mới. |
| 28 | Panel Trợ lý AI | 8,0 | 8,0 | (a) `tdinh-panel-clip-top`: chip "HSV-2026-00187" dính đầu đè chữ khi cuộn · `features/ai-panel/` (CSS vùng tin nhắn: thêm nền đặc và `z-index` cho chip, hoặc bỏ dính). (b) Danh sách điều kiện 7 gạch, 2 gạch trùng; dấu chấm cuối gạch khi có khi không. (c) Panel ghi 668,8 tỷ "chưa xác thực (0 giao dịch)", còn ngăn kéo ghi "Dòng tiền xác thực 668,8 tỷ đồng". |
| 29 | Nhật ký kiểm toán | 8,5 | 8,5 | Không có lỗi mới. |
| 30 | Tra cứu chính sách | 8,5 | 8,5 | Nút xóa của antd không có tên (`httd-policy-dscr`) · `features/policy/` (`allowClear={{ clearIcon: <span aria-label="Xóa nội dung tìm">…</span> }}`). |
| 31 | 403 và 404 | 9,0 | 9,0 | Ở 1920 khoảng trống lớn (nhỏ). |
| 32 | Đang tải và lỗi | 8,5 | 8,5 | Không có lỗi mới. |
| 33 | Quản trị | 8,5 | 8,5 | `quantri-admin-1366`: bảng gọn, chip vai theo nhóm màu, câu "Chỉ đọc · Quản trị hệ thống không xem được hồ sơ vay" rõ. Không có lỗi mới. |
| 34 | Khối "Điều kiện trước giải ngân" (mới) | — | 8,0 | (a) `kiemtoan-pre-01`: 3 điều kiện cũ sau reset, nội dung là việc trước khi trình ("…để hoàn tất kiểm tra", "Bổ sung BCTC kiểm toán…"), không phải điều kiện giải ngân; một mục có "inflow" · dữ liệu: `infra/database/demo/reset-demo-cleanup.sql:22`; hiển thị: `features/loan-detail/PreDisbursementPanel.tsx` chưa qua bộ dịch "inflow". (b) Chữ rỗng "Chưa có điều kiện nào được ghi" thiếu dấu chấm, lệch "Không có cờ." · `PreDisbursementPanel.tsx:26`. (c) Hiện cả ở hồ sơ Nháp (02, 07). Nên ẩn trước bước Phê duyệt, hoặc ghi "Điều kiện sẽ có sau khi cấp phê duyệt quyết định." Danh sách chưa gập; 3 mục cao 313px thì vẫn ổn, nhưng từ khoảng 6 mục nên gập. |

Trung bình 34 trang: 293,0 / 34 = **8,62**.

## Kiểm lại lần 9

| # | Việc lần 9 | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
| 1 | "ĐỀ xuất" | **Đã sửa** | `grep -c "ĐỀ\|XUẤT"` trên 12 file toàn văn ra 0. Tiêu đề 00187 "Đề xuất phê duyệt với điều kiện tiên quyết…" (`tdinh-loan187-1920`). Quét chữ in hoa đầu câu ngoài danh sách viết tắt ra 0. |
| 2 | Chip hạn và bộ đếm | **Đã sửa** (có lỗi mới do ngày cuối tuần) | `qhkh-home-1366`: chip đỏ "quá hạn hôm nay", phụ đề "2 quá hạn", KPI "Hạn hôm nay 0 · Hồ sơ quá hạn 2", Segmented "Quá hạn 2". Chữ "hôm nay" cạnh ngày 13/11 khi chấm thứ Bảy (`format.ts:53`). |
| 3 | Số mục ngăn kéo và thẻ | **Đã sửa** | 00187 4/4 ("Việc cần làm 4"), 00163 3/3, 00167 3/3. |
| 4 | Chữ AI vụng | **Sửa một phần** | Hết ".;" (0 kết quả); hết "VND" và ",0" trong panel; hết nhãn "Dữ kiện inflow". Còn "inflow" trong thân chữ (thẻ 00163 và 00167, điều kiện 00187). "0 đồng": 00187 có lý do nhưng vẫn là mục cần làm; 00163 chưa sửa. |
| 5 | Dòng "cấp xác nhận" đứng riêng | **Đã sửa** | Cả ba ngăn kéo: "Người quyết định / Cấp phê duyệt / Cấp 2 Hội sở xác nhận. Đội agent chỉ đề xuất, không tự phê duyệt." |
| 6 | Mất "Diễn giải cho người duyệt" | **Đã sửa** | Ngăn kéo 00163 và 00167 có "Điều kiện chính · AI đề xuất …". |
| 7 | Hai tên một trạng thái (00176) | **Đã sửa** | `role-tuanthu.log`: chip "Chờ ý kiến rủi ro"; dòng chỉ xem "Hồ sơ đang ở trạng thái 'Chờ ý kiến rủi ro'". |
| 8 | Danh sách khách hàng | **Đã sửa** | `cust.log`: 20 dòng, 5 cột (tên, CIF, phân khúc, KYC, ngày), không còn cột rủi ro gần như trống. |
| 9 | Keycloak và mũi tên | **Đã sửa phần lớn** | `none-kc-1366`: có chip tím và navy; mũi tên đứng đầu dòng. Thẻ thứ ba vẫn chỉ có chữ; đăng nhập app có hai dấu cách. |
| 10 | Mục nhỏ: nút xóa không tên; gom chip nhắc và chuyển cấp | **Sửa một phần** | Chip đã gom: "Nhắc/chuyển cấp do quá hạn: Quá hạn phê duyệt: đã nhắc người duyệt, giữ nguyên bước hiện tại". Nút `ant-input-clear-icon` không tên vẫn còn ở `httd-policy-dscr` (1366 và 1920). |

Không thấy hồi quy nào từ các commit sau lần 9 (`uq`, `fo`, `bo`, `6ae6990`) trên 202 lượt đo.

## Danh sách việc phải sửa (xếp theo ảnh hưởng tới điểm)

1. **Câu "0 đồng" vẫn thành điều kiện (tiêu chí 7, 9).**
   - Chỗ: thẻ kết luận 00187 (mục cuối) và Compliance "Điều kiện bổ sung: Giá trị TSĐB đủ điều kiện hiện tại bằng 0 đồng do định giá chưa xác minh"; 00163 Compliance "hạn mức có bảo đảm đủ điều kiện là 0 đồng".
   - Vì sao: đây là nhận xét, không phải việc cần làm. Ở 00163, hồ sơ không có tài sản bảo đảm nên câu này vô nghĩa. Nó nằm ở màn đầu của hồ sơ trình diễn.
   - Sửa: ở `frontend/src/features/dashboard/agentTrace.ts:524`, mở rộng `ZERO_TAIL` cho "(là|bằng) 0 đồng" và cho đuôi lý do "do …"; ở `STATUS_ONLY` (`:651`), coi các ý này là hiện trạng. Nếu ý có lý do thì chuyển lý do thành việc ("Xác minh chứng thư định giá TSĐB"). Thêm test với hai chuỗi trên.
2. **Gộp đề xuất trùng ý và bỏ "(không cản trở trình)" (tiêu chí 7, 9).**
   - Chỗ: 00187 có hai thẻ xác nhận về người đại diện; ngăn kéo `drawer-00187.txt:121` ghi "Điều kiện trước giải ngân: Bổ sung trước giải ngân"; "(không cản trở trình)" 7 lần ở cả ba ngăn kéo.
   - Sửa: ở `agentTrace.ts:320` `scrubInternal`, bỏ cụm "(không cản trở trình)" như đã làm với "(không chặn trình hồ sơ)". Ở `ActionProposals.tsx` và `CaseTrace.tsx`, bỏ tiền tố tiêu đề khi nó lặp nhãn loại ("Bổ sung trước giải ngân" dưới nhãn "Điều kiện trước giải ngân"). Gộp hai đề xuất cùng loại khi cùng nói về một đối tượng (cùng từ khóa "người đại diện"), hoặc báo engine (`agent_engine/`) không sinh hai đề xuất cho một khoảng trống.
3. **Panel AI (tiêu chí 6, 10).**
   - Chỗ: `tdinh-panel-clip-top`: chip "HSV-2026-00187" dính đầu đè lên chữ đang cuộn. Câu trả lời 00187 có 7 gạch, 2 gạch trùng.
   - Sửa: ở `frontend/src/features/ai-panel/`, cho chip nền đặc, `z-index` và bóng dưới, hoặc cho chip chạy theo nội dung. Gạch đầu dòng bỏ trùng bằng cùng hàm chuẩn hóa mà ngăn kéo dùng (`recountTitle` và lọc trùng ở `agentTrace.ts`), và thống nhất dấu chấm cuối gạch.
4. **"inflow" và số định dạng (tiêu chí 3, 9).**
   - Chỗ: thẻ đề xuất 00163/00167 "đối chiếu inflow với doanh thu BCTC"; điều kiện đã xác nhận 00187; "80,0 tỷ", "145,0 tỷ", "45,0 tỷ đồng" trong ngăn kéo và Trích nguồn.
   - Sửa: `cleanAiLine` thay "inflow" trong thân chữ bằng "tiền về tài khoản" (bảng `agentTrace.ts:237`); `PreDisbursementPanel.tsx` cũng gọi qua đó. `decimalVi` (`:345`) bỏ ",0" ở số tròn, rồi thêm "đồng" sau "tỷ" khi thiếu.
5. **Chữ hạn ở cuối tuần (tiêu chí 4).**
   - Chỗ: `qhkh-home-1366`, Trưởng phòng; 00201 hạn 13/11 ghi "quá hạn hôm nay".
   - Sửa: `features/my-work/format.ts:53`: khi `n = 0` mà ngày hạn khác hôm nay thì ghi "quá hạn từ 13/11" (hoặc theo ngày lịch "quá hạn 1 ngày"). Thêm test với ngày thứ Bảy.
6. **Dữ liệu trình diễn sau reset (tiêu chí 10, không phải mã giao diện).**
   - Chỗ: 00187 còn 3 điều kiện "Đã được người xác nhận" ngày 10–11/11.
   - Sửa: `infra/database/demo/reset-demo-cleanup.sql:22-23` xóa mọi `pre_disbursement_condition` nguồn `AGENT:` của ba hồ sơ warm, không chỉ những điều kiện có đề xuất nguồn đã mất.
7. **Khối "Điều kiện trước giải ngân" (tiêu chí 2, 9).**
   - Thêm dấu chấm vào "Chưa có điều kiện nào được ghi." (`PreDisbursementPanel.tsx:26`).
   - Trước bước Phê duyệt, ẩn khối hoặc đổi chữ thành "Điều kiện sẽ có sau khi cấp phê duyệt quyết định."
   - Gập danh sách khi có trên 5 mục.
8. **Thẻ rỗng ở vai Phê duyệt (tiêu chí 2).**
   - Chỗ: 00163 `pheduyet-pre-13`.
   - Sửa: gộp các thẻ rỗng (Chỉ số, Cờ, Điều kiện, Tài sản) thành một dòng "Chưa có: chỉ số có nguồn, cờ, tài sản bảo đảm" (`features/loan-detail/LoanDetailPage.tsx`).
9. **Nút xóa không tên ở tra cứu chính sách (tiêu chí 8).** Đặt `aria-label` cho biểu tượng xóa của ô tìm (`features/policy/`).
10. **Mục nhỏ.**
    - Thống nhất "TSĐB" ở `backend/app/services/loan_detail_service.py:24`.
    - Bỏ ".…" ở tóm tắt Planner (`agentTrace.ts`, chỗ cắt câu `:520`).
    - Đăng nhập: bỏ một dấu cách trước "→".
    - So sánh: nhãn "v8 lần 1/2/3", rút gọn câu ghi chú.
    - Chú thích DSCR ≈1,76 và 1,34 ở màn đầu 00187.

## Để lên 8,5 còn thiếu gì (theo từng tiêu chí)

Trung bình đã 8,55. Bảng này nêu cái cần để giữ mỗi tiêu chí, hoặc đưa nó lên ít nhất 8,5.

| # | Tiêu chí | Lần 10 | Còn thiếu |
| --- | --- | --- | --- |
| 1 | Bản sắc | 9,0 | Đạt. Lên 9,5: thẻ thứ ba ở Keycloak có chip; bỏ hai dấu cách ở trang đăng nhập (việc 10). |
| 2 | Phân cấp | 8,5 | Đạt. Lên 9,0: việc 7 và 8 (bớt thẻ rỗng), chú thích hai DSCR. |
| 3 | Chữ tiếng Việt | 8,5 | Đạt. Giữ bằng việc 4 (hết "inflow"), thống nhất TSĐB. |
| 4 | Màu và trạng thái | 8,5 | Đạt. Việc 5 để không lộ lỗi khi trình diễn cuối tuần. |
| 5 | Mật độ, lưới | 8,5 | Đạt. Lên 9,0: 404 và 403 ở 1920 bớt khoảng trống; giới hạn độ dài dòng thẻ kết luận ở 1920 (khoảng 80 ký tự). |
| 6 | Thành phần | 9,0 | Đạt. Giữ bằng việc 3 (chip dính trong panel). |
| 7 | AI và người quyết định | 8,5 | Đạt, nhưng mỏng. Việc 1 và 2: nếu lượt warm sau sinh thêm câu nhận xét làm điều kiện hoặc thẻ trùng, có nguy cơ xuống 8,0. |
| 8 | WCAG AA | 8,5 | Đạt. Việc 9. |
| 9 | Văn phong | **8,0** | **Chưa tới 8,5.** Cần việc 1, 2, 4 và dấu chấm ở việc 7: không còn "0 đồng" làm điều kiện, "(không cản trở trình)", nhãn lặp "Bổ sung trước giải ngân", "inflow", "80,0 tỷ", ".…". |
| 10 | Hoàn thiện | 8,5 | Đạt. Giữ bằng việc 3 và 6. |

## 5 việc nếu chỉ còn một ngày

1. Lọc "0 đồng" theo biến thể "bằng/là 0 đồng … do …", kèm test (việc 1).
2. `scrubInternal` bỏ "(không cản trở trình)"; bỏ tiền tố lặp "Bổ sung trước giải ngân"; gộp hai thẻ người đại diện (việc 2).
3. Chip dính trong panel AI có nền đặc; bỏ gạch trùng (việc 3).
4. "inflow" trong thân chữ và ",0" trong ngăn kéo và Trích nguồn (việc 4).
5. `reset-demo-cleanup.sql` xóa điều kiện cũ của ba hồ sơ warm; sửa chữ hạn cuối tuần (việc 6 và 5).

## Chưa kiểm chứng và chỗ brief sai

- **Brief nói engine đã "không biến câu nhận xét thành điều kiện".** Với "0 đồng" thì chưa đúng: 00187 "Điều kiện bổ sung: Giá trị TSĐB đủ điều kiện hiện tại bằng 0 đồng…", 00163 "hạn mức có bảo đảm đủ điều kiện là 0 đồng".
- **Brief nói crew `uq` đã sửa mọi việc của lần 9.** Đo lại: 8 việc đã sửa; việc 4 (chữ AI) và việc 10 (nút xóa không tên) mới sửa một phần.
- **Brief nói "số đòn bẩy lệch bị loại khỏi gói cuối".** Không kiểm riêng. Màn đầu 00187 vẫn có hai DSCR (≈1,76 và 1,34), có giải thích ở bảng chỉ số.
- **Chữ AI do LLM sinh, mỗi lượt warm khác nhau.** Hai thẻ người đại diện và "inflow" có thể không lặp lại ở lượt sau. Chỗ hở ở bộ lọc hiển thị vẫn đúng.
- **Lỗi chữ hạn chỉ thấy khi chấm cuối tuần.** Chưa kiểm vào ngày thường ở lần này.
- **Người Phê duyệt không mở được 00187** vì phân quyền; thuộc giám khảo chức năng.
- **Không có trình đọc màn hình thật.** Chỉ kiểm cây tiếp cận theo `docs/agent/review-ux.md`.
- **Phiên Hội đồng chưa có**, không chấm. Thanh bên của Kiểm toán có mục "Phiên Hội đồng tín dụng – chỉ đọc".
- Trang 6, 17, 21, 22, 29 chỉ kiểm bằng bộ đo (tràn, tương phản, nhãn, rawScan) và xem lướt ảnh; không thấy lỗi mới.
