# Chấm điểm ứng dụng thật, lần 7: thẩm mỹ và UX theo thiết kế "Sổ Tín Dụng"

Giám khảo độc lập (Opus). Ngày 13/11/2026. Mã chấm: `import/duskdash` tại `de64f54`, cùng mã đang chạy ở web 3000.
Đích: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Lần 6: `docs/design/cham-diem-ung-dung-lan-6.md`.

## Kết luận

**Trung bình 10 tiêu chí: 8,45. KHÔNG ĐẠT.** Ngưỡng là trung bình từ 8,5 và không tiêu chí nào dưới 7.

- Không tiêu chí nào dưới 7. Thấp nhất là (9) văn phong và (10) độ hoàn thiện, cùng 8,0. Lần 6 hai tiêu chí này được 7,5.
- Trung bình 33 trang: 8,47. Phiên Hội đồng không chấm, không tính.
- Đã tiến bộ thật so với lần 6:
  - hồ sơ trình diễn hết chữ e2e;
  - hết `AI_OCR`, `dscr` và "(hư cấu)";
  - chip "Đạt" không còn giãn;
  - Việc của tôi đếm một nguồn;
  - bước xác nhận ghi số một kiểu;
  - ngăn kéo ghi "Planner (điều phối)" ở cả hai chiều;
  - Keycloak có panel navy.
- Phần còn thiếu nằm gần như trọn ở **chữ do AI sinh khi hiện ra màn hình**:
  - ngăn kéo dấu vết in nguyên chuỗi cổng "CẦN BỔ SUNG: thiếu dữ liệu chặn — …" ba lần trên 00163 và 00167;
  - trích nguồn lặp nhãn;
  - danh sách "Yêu cầu khách bổ sung" có mục mở bằng chữ thường, mục trùng nhau và mục không phải yêu cầu;
  - tên agent viết thường giữa câu ("Credit và compliance").
- Sửa dứt điểm phần này (việc 1 và 2 ở dưới) thì (9) và (10) lên 8,5 và trung bình đạt khoảng 8,55.

| Tiêu chí | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | TB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lần 6 | 8,5 | 8,5 | 8,5 | 8,5 | 8,5 | 8,5 | 8,5 | 8,5 | 7,5 | 7,5 | 8,30 |
| **Lần 7** | 8,5 | 8,5 | 8,5 | 8,5 | 8,5 | **9,0** | 8,5 | 8,5 | **8,0** | **8,0** | **8,45** |

## Cách chấm

**Ảnh chụp**
- 279 ảnh Playwright, đăng nhập Keycloak thật bằng 10 vai: không vai, QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị.
- Cỡ màn 1366×768 và 1920×1080. Thêm 1280×800 và 1440×900 cho đăng nhập, Việc của tôi, chi tiết hồ sơ, dashboard.
- Bộ đo, log và ảnh ở `/tmp/gu7/`, dùng lại bộ của lần 6 (`lib.cjs`, `run.cjs`, `scale.cjs`, các bước `st-*.cjs`).
- Bước mới:
  - `st-full.cjs` ghi toàn văn vùng `main` ra `full-<vai>-<hồ sơ>.txt`;
  - `st-drw.cjs` ghi toàn văn ngăn kéo dấu vết ra `drawer-<hồ sơ>.txt`.

**Lượt chạy AI**
- Khối AI chụp trong một khóa: `flock /tmp/do-an-e2e.lock bash /tmp/gu7/ai7.sh`. Script này chạy `reset-demo.sh --warm`, rồi chụp ngay. Giữ khóa 10:01–10:14.
- Warm dùng 3 lượt đội agent, kết thúc warm 10:06:
  - 00187: Chờ phê duyệt;
  - 00163 và 00167: Cần thông tin.
- Trạng thái đang chạy chụp được một mốc: "Đã chạy 00:17 … 1/4 chuyên gia đã xong".
- Chat dùng 2/10 câu.
- Không gặp 402, lỗi vite hay `pageerror`.
- Chụp bổ sung ngoài khóa lúc 10:16–10:21 và sau đó, chỉ cho các trang không cần lượt agent mới.

**Bộ đo DOM trên màu thật**
- Đo: tràn ngang, cỡ chữ nhỏ nhất, tương phản có pha alpha qua lớp cha, điều khiển không tên, số `h1` và `main`, chữ thô, chip, vòng focus.
- Kết quả trên mọi trang đo:
  - 0 tràn ngang;
  - 0 chữ dưới AA, 0 nút tương phản thấp;
  - cỡ nhỏ nhất 12px;
  - đúng 1 `h1` và 1 `main`.
- Dương tính giả đã biết, giống lần 6:
  - **Không tên:** `ant-tabs-nav-more`, `ant-input-clear-icon-hidden`, bản sao TEXTAREA autosize.
  - **"Không vòng" ở INPUT bên trong Select, DatePicker, InputNumber:** vòng 3px navy `rgb(42,74,128)` nằm trên khung bọc `.ant-select`/`.ant-picker` (`auditf.log`).
  - **Segmented "1,67":** bộ đo lấy nhầm nền navy.

**Phạm vi**
- Chỉ xem. Modal quyết định mở tới bước xác nhận rồi "Quay lại".
- Các mục đã chốt không tính lỗi:
  - "Nháp chưa đánh số";
  - mã `EMP-DEMO-…`, `CIF-DEMO-…`;
  - không có trình đọc màn hình thật;
  - dòng giới hạn và ca không hơn ở tab So sánh.
- Dữ liệu do `gA` tạo trong lúc chấm (`LA-20261113-…` trong nhật ký kiểm toán và Việc của tôi) không phải dữ liệu trình diễn, không tính lỗi.

**Bẫy đã gặp**
- Trang chi tiết hồ sơ không dùng `role=tab` cho dải mục, nên duyệt theo tab không thu được gì. Dùng toàn văn `main` thay thế.
- "Credit và compliance" viết thường **không** do commit `139f997`. Commit đó chỉ hạ chữ cho Chưa/Không/Thiếu/Cần/Đã/Còn/Chỉ sau dấu phẩy (`agentTrace.ts`). Chữ này là chữ LLM chưa được làm sạch.
- Ở Dấu vết, "45.000.000.000 đồng, 12 tháng" là của 00167 (đúng 45 tỷ), không phải số lệch. Lỗi ở đây chỉ là cách ghi số khác các nơi khác.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 6 | Lần 7 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 8,5 | **8,5** | **Được:** <ul><li>Cả 10 vai cùng một khung: thanh bên navy, logo "S", tiêu đề serif, nền giấy kem, nút chính vàng đồng, khối AI tím viền đứt.</li><li>Rủi ro, Tuân thủ, Trưởng phòng, Kiểm toán, Quản trị cùng một ngữ pháp trang (`v-roles1.jpg`, `v-roles2.jpg`).</li><li>Chip "Đạt" ở tab Chỉ số nay là nhãn nhỏ như mọi nơi (49/449px).</li><li>Keycloak đã có panel navy.</li></ul>**Trừ:** <ul><li>Bố cục Keycloak vẫn khác trang đăng nhập của ứng dụng: logo nằm ở cột phải, tiêu đề dính mép trên, đoạn văn trôi giữa panel với khoảng trống lớn, không có đường kẻ sổ hay sơ đồ "AI đề xuất, người quyết định" như `none-login-1366x768`. Hai bước liền nhau vẫn trông như hai bản dựng.</li><li>Trang đối chiếu: cột giữa là hộp xám "Chưa có ảnh trang", lệch tinh thần "sổ" của các trang khác.</li></ul> |
| 2 | Phân cấp, hành động chính ở màn đầu | 8,5 | **8,5** | **Được:** <ul><li>Việc của tôi QHKH khớp số ở mọi chỗ: phụ đề "2 bị trả lại · 1 chờ bổ sung", Segmented "Quá hạn 0 · Bị trả lại 2 · Chờ bổ sung 1", KPI "0 hồ sơ quá hạn". HTTD khớp "1 quá hạn".</li><li>Rủi ro và Tuân thủ thấy ngay nút vàng "Ghi ý kiến rủi ro" hoặc "Ghi ý kiến tuân thủ" ở góc phải, kèm "Việc cần làm 5" hoặc "4".</li><li>Trưởng phòng có "Hồ sơ của phòng" với bốn KPI và bộ lọc có số.</li><li>Phê duyệt 00163 thấy ngay khuyến nghị và nút "Quyết định".</li></ul>**Trừ:** <ul><li>Thẻ đề xuất 00187 dài: kết luận, rồi "Yêu cầu khách bổ sung 7 mục" có mục trùng, rồi điều kiện. Phần người duyệt cần đọc trước bị kéo dài thêm vì chữ chưa gọt (tiêu chí 9).</li><li>Vai Tuân thủ thấy khối "Kết luận của đội agent" chiếm nửa màn đầu chỉ để báo "Chỉ xem".</li></ul> |
| 3 | Chữ và khả năng đọc tiếng Việt | 8,5 | **8,5** | **Được:** <ul><li>Hết "..." (dùng "…"), hết ngoặc lồng ("NH TMCP Phương Bắc", "GPT-6 Luna, OpenAI").</li><li>Chữ "chưa có tác vụ hoàn tất" sans xám.</li><li>Serif và sans hiển thị dấu đúng; số tabular; mã mono thống nhất.</li></ul>**Trừ:** <ul><li>Tên agent viết thường giữa câu: "Credit và compliance thẩm định song song, trong đó compliance tập trung…" (`drawer-00163.txt`).</li><li>Mục danh sách mở bằng chữ thường: "đối chiếu nguồn tiền vào với doanh thu BCTC" (thẻ đề xuất 00187).</li><li>"0,0 tỷ" và "0 tỷ đồng" trong câu tính tổng cấp tín dụng (`drawer-00163/00167/00187.txt`).</li></ul> |
| 4 | Màu và ngữ nghĩa trạng thái | 8,5 | **8,5** | **Được:** <ul><li>Chip trạng thái về đúng cỡ nhãn.</li><li>Validation trên chi tiết hồ sơ một nhãn: "Cần bổ sung · Thiếu dữ liệu bắt buộc".</li><li>Chip hạn đỏ, vàng, xám; cờ "3 cờ · 2 cao" đỏ; "Mâu thuẫn chưa chốt" cam; nguồn "Người" navy ở nhật ký kiểm toán.</li></ul>**Trừ:** <ul><li>Cùng một trạng thái Validation còn ba cách ghi: "Cần bổ sung · Thiếu dữ liệu bắt buộc" (thẻ agent), "Thiếu dữ liệu chặn: Chưa có kết quả tra cứu CIC…" (danh sách việc 00163, 00167: `full-tdinh-13.txt`, `full-tdinh-18.txt`) và "CẦN BỔ SUNG: thiếu dữ liệu chặn" (ngăn kéo).</li><li>"Rà soát nhóm khách hàng liên quan: Không có dư nợ" đứng gần cờ "Dư nợ vay: CIC 98 tỷ" ở 00187. Trông như mâu thuẫn, vì không ghi rõ "tại ngân hàng".</li></ul> |
| 5 | Mật độ, lưới, khoảng cách 1366 và 1920 | 8,5 | **8,5** | **Được:** <ul><li>0 tràn ngang ở bốn cỡ.</li><li>Nhật ký chốt nguồn có phân trang 10 dòng (`LogPanel.tsx`).</li><li>Chi tiết khách hàng có "Hoạt động gần đây", hết nửa dưới trống.</li><li>Chi tiết hồ sơ 1920 cân hai cột; bảng Trưởng phòng đặc mà vẫn đọc được.</li></ul>**Trừ:** <ul><li>Tab Chỉ số của vai Kiểm toán vẫn để trống cột phải, khoảng 1/3 màn (`kiemtoan-loan187-metrics-1366x768`). Lần 6 đã nêu.</li><li>Đối chiếu 00187: khi cuộn, cột giữa chỉ còn hộp xám, hai cột bên dài, để lại một dải trống lớn.</li><li>Danh sách khách hàng: cột "Mức rủi ro" hiện vì có xếp hạng ở trang sau, nhưng trang 1 toàn "—" (`CustomerListPage.tsx:54,70`).</li></ul> |
| 6 | Thành phần và trạng thái | 8,5 | **9,0** | **Được:** <ul><li>Đủ các trạng thái và đều sạch:<ul><li>tải: khung xương có ô tìm;</li><li>lỗi: "Không tải được hồ sơ / Hệ thống đang bận… / Thử lại";</li><li>404 với "Về Việc của tôi";</li><li>403;</li><li>đang chạy: "Đã chạy 00:17. Thường mất vài phút…" và "1/4 chuyên gia đã xong";</li><li>khóa có lý do: "Chỉ xem. Hồ sơ đang ở trạng thái…" (`v-states.jpg`, `v-roles1.jpg`).</li></ul></li><li>Modal quyết định: "Ghi quyết định" khóa kèm "Cần nhập: lý do quyết định."; bước xác nhận "55 tỷ đồng (55.000.000.000 đồng), bằng mức đề nghị"; Esc trả focus về "Quyết định" (7,82:1).</li><li>Lịch sử chat có dòng "Cập nhật HH:MM dd/mm" phân biệt các tiêu đề trùng.</li><li>Thông báo có chip "Mới", giờ mono, nội dung cần bổ sung.</li></ul>**Trừ:** <ul><li>Trình xem tài liệu không có trạng thái thay thế khi thiếu ảnh trang: chỉ là hộp xám. Nên hiện trích văn bản OCR của trang.</li><li>Thẻ "Bạn cần hỗ trợ thêm? Liên hệ chuyên viên…" ở chat là thành phần của sản phẩm khách lẻ (`ConversationSidebar.tsx:301`).</li></ul> |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 8,5 | **8,5** | **Được:** <ul><li>Sơ đồ "Planner → Credit · Compliance · Operations · Document → Validation → Cấp phê duyệt: người quyết định, ngoài khung AI" có ở đăng nhập, dashboard, chi tiết hồ sơ (cả vai chỉ xem) và khối đang chạy.</li><li>Ngăn kéo: "Planner (điều phối) → … · giao việc" và "Operations → Planner (điều phối) · trả kết quả", nhất quán hai chiều.</li><li>Thẻ đề xuất có nhãn "Credit và Compliance cùng nêu".</li><li>Chip "AI đề xuất – chưa xác nhận" có trên mọi màn.</li><li>Khung "Việc của bạn · Hành động": "AI chỉ đề xuất; người có thẩm quyền quyết định."</li></ul>**Trừ:** <ul><li>Ngăn kéo 00163 in nguyên chuỗi cổng "CẦN BỔ SUNG: thiếu dữ liệu chặn — Chưa có kết quả tra cứu CIC — …" ba lần: ở dòng Validation → Planner, ở "Diễn giải cho người duyệt" và ở "Đội agent đề nghị bổ sung hồ sơ". 00167 cũng vậy. Giám khảo đọc ngăn kéo sẽ thấy một chuỗi máy viết hoa lặp ba lần đúng ở chỗ phải chứng minh "AI đề xuất, người quyết định". Mã có `humanizeGate` (`agentTrace.ts:303`) nhưng `CaseTrace.tsx:214` (dòng trao đổi) và `:302` (`validation.narrative`) không gọi.</li><li>Mô tả nhiệm vụ Validation có "điều phối challenge nếu có mâu thuẫn" (tiếng Anh trộn).</li></ul> |
| 8 | Tiếp cận WCAG AA | 8,5 | **8,5** | **Được:** <ul><li>0 chữ dưới AA; 0 nút tương phản thấp.</li><li>Vòng focus 3px navy: 8,48:1 trên giấy, 7,81:1 trong ngăn kéo.</li><li>Keycloak: viền ô 19,03:1, nút hiện mật khẩu 14,64:1, lỗi gắn vào ô có biểu tượng và chữ.</li><li>Select, DatePicker, InputNumber, Segmented có vòng trên khung bọc.</li><li>Tab không thoát modal; Esc trả focus.</li></ul>**Trừ:** <ul><li>Bước xác nhận: nút "Quay lại" nhận focus mà không thấy vòng (giống lần 6).</li></ul>**Trần:** không có trình đọc màn hình thật; dựa trên đo máy, bàn phím và cây tiếp cận theo `docs/agent/review-ux.md`. |
| 9 | Văn phong UX | 7,5 | **8,0** | **Đã sửa:** <ul><li>"Gia hạn bổ sung thêm 5 ngày LV".</li><li>Validation ở thẻ agent "Thiếu dữ liệu bắt buộc".</li><li>So sánh không còn mã commit; "Chi phí LLM".</li><li>Hết dòng "hiện tại: 0 đồng" trong danh sách yêu cầu.</li><li>Hết "Kiểm chứng của Validation" (`drawer-*.txt`: 0).</li><li>Bước xác nhận ghi số tự nhiên.</li></ul>**Trừ:** <ul><li>Ngăn kéo: "CẦN BỔ SUNG: thiếu dữ liệu chặn" ×3 (00163, 00167); "hạn mức có bảo đảm hiện tại là 0 đồng" (Compliance → Planner, 00163); "điều phối challenge".</li><li>Danh sách việc 00163 và 00167: "Thiếu dữ liệu chặn: Chưa có kết quả tra cứu CIC…". Biệt ngữ đã được thay ở thẻ agent nhưng còn ở đây.</li><li>Thẻ đề xuất 00187:<ul><li>trích nguồn lặp nhãn "CS-TD-SME/2025 §3.1 – Thẩm quyền phê duyệt: CS-TD-SME/2025 §3.1, Thẩm quyền phê duyệt Theo…";</li><li>"Yêu cầu khách bổ sung 7 mục" có một mục là nửa câu bị tách ("đối chiếu nguồn tiền vào…"), một mục không phải yêu cầu với khách ("DSCR cần xác minh và chưa đối chiếu được LTV"), hai mục gần trùng ("Hoàn tất xác minh chứng thư định giá…" và "Cần hoàn thiện xác minh định giá…");</li><li>câu lặp "Điều kiện tiên quyết trước khi trình cấp phê duyệt: Phải có BCTC kiểm toán trước khi trình cấp phê duyệt".</li></ul></li><li>Chat: thẻ "Bạn cần hỗ trợ thêm? Liên hệ chuyên viên qua kênh chính thức…" là giọng chăm sóc khách lẻ, sai người đọc (cán bộ ngân hàng).</li></ul> |
| 10 | Độ hoàn thiện sản phẩm thật | 7,5 | **8,0** | **Đã sửa:** <ul><li>Sau `reset-demo.sh --warm`, tờ trình 00187 không còn chữ e2e ("4/7 mục đã điền", mục trống ghi "Chưa điền"); nhật ký chốt nguồn rỗng.</li><li>Hết `AI_OCR` (nay "AI trích xuất"), hết `dscr`, hết "(hư cấu)".</li><li>Không vỡ bố cục, không `pageerror`.</li></ul>**Trừ:** <ul><li>Chuỗi máy viết hoa "CẦN BỔ SUNG:" lộ nguyên văn trong ngăn kéo của 2/3 hồ sơ trình diễn (việc 1).</li><li>Chữ AI chưa gọt ở thẻ đề xuất 00187 (tiêu chí 9).</li><li>Trình xem tài liệu ở trang đối chiếu, màn trung tâm của sản phẩm OCR, chỉ là hộp xám.</li><li>Keycloak lệch bố cục với trang đăng nhập (tiêu chí 1).</li><li>Dấu vết ghi số "45.000.000.000 đồng, 12 tháng" trong khi mọi nơi khác ghi "45 tỷ đồng".</li></ul> |

**Trung bình:** (8,5 × 7 + 9,0 + 8,0 × 2) / 10 = **8,45**.

## Bảng từng trang

Ảnh ở `/tmp/gu7/`, đặt tên theo mẫu `<vai>-<trang>-<cỡ>.png`.

| # | Trang (vai) | Lần 6 | Lần 7 | Điểm phải sửa (ảnh · phần tử · `file`) |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập và Keycloak (không vai) | 8,5 | 8,5 | `none-kc-1366x768`: panel navy của Keycloak để logo ở cột phải, tiêu đề dính mép trên, đoạn văn trôi giữa. Nên dựng lại theo `none-login-1366x768`: logo và tiêu đề cùng cột trái, đường kẻ sổ, sơ đồ "AI đề xuất, người quyết định" (theme Keycloak, ngoài `frontend/src`). |
| 2 | Khung: thanh bên, thanh trên, dải demo | 9,0 | 9,0 | Vai Phê duyệt và Kiểm toán có mục "Phiên Hội đồng tín dụng" chưa làm (ngoài phạm vi, không trừ). |
| 3 | Việc của tôi (QHKH) | 8,0 | 8,5 | `qhkh-home-1366x768`: số đếm đã khớp ở phụ đề, Segmented và KPI. Không có lỗi mới. |
| 4 | Hồ sơ của phòng (Trưởng phòng) | 8,5 | 8,5 | `truongphong-home-1366x768`: dòng 00176 "quá hạn 1 ngày LV" có chip đỏ mà cột Cờ cũng đỏ "3 cờ · 2 cao". Hai điểm đỏ cạnh nhau làm mắt nhảy; giữ cờ đỏ, đổi chip hạn sang viền đỏ không nền (`features/my-work/DeadlineChip.tsx`). |
| 5 | Hồ sơ vay chỉ đọc (Kiểm toán) | 8,5 | 8,5 | Không có lỗi mới. |
| 6 | Tìm kiếm | 8,5 | 8,5 | Không có lỗi mới. |
| 7 | 00201 (QHKH, bị trả lại) | 8,0 | 8,5 | `qhkh-loanA`: nút "Gia hạn bổ sung thêm 5 ngày LV" đã đúng. Không có lỗi mới. |
| 8 | 00187 (Thẩm định) | 7,5 | 8,0 | <ol><li>Thẻ đề xuất: trích nguồn lặp nhãn §3.1 (`features/loan-detail/` thẻ đề xuất, bộ làm sạch `agentTrace.ts`).</li><li>"Yêu cầu khách bổ sung 7 mục": mục chữ thường bị tách câu, mục không phải yêu cầu, hai mục trùng.</li><li>Câu "Điều kiện tiên quyết… trước khi trình cấp phê duyệt" lặp hai lần cùng cụm.</li></ol> |
| 9 | Chi tiết hồ sơ (Rủi ro) | 8,0 | 8,5 | `ruiro-loanA-1366x768`: tốt. "Chưa chạy đội agent trên hồ sơ này" nằm trong khung tím lớn. Có thể thu gọn khi chưa chạy (`features/loan-detail/` khối kết luận). |
| 10 | Chi tiết hồ sơ (Tuân thủ) | 8,0 | 8,5 | `tuanthu-loanA-1366x768`: thông báo "Chỉ xem…" chiếm khung AI lớn. Thu gọn thành một dòng khi vai không được chạy. |
| 11 | Việc của tôi và kiểm tra (HTTD) | 8,5 | 8,5 | Không có lỗi mới. |
| 12 | 00163 (Phê duyệt) | 8,5 | 8,5 | `full-tdinh-13.txt`: "Thiếu dữ liệu chặn: Chưa có kết quả tra cứu CIC…" ở danh sách việc. Đổi thành "Thiếu dữ liệu bắt buộc: …" như thẻ agent. |
| 13 | 00167 (Phê duyệt) | 8,5 | 8,5 | Như trang 12 (`full-tdinh-18.txt`). |
| 14 | Modal quyết định, bước chọn | 9,0 | 9,0 | Không có lỗi mới. |
| 15 | Modal quyết định, bước xác nhận | 8,5 | 9,0 | Số đã ghi một kiểu. Nút "Quay lại" chưa có vòng focus thấy được (`features/loan-detail/DecisionModal.tsx`). |
| 16 | Đội agent đang chạy | 8,5 | 8,5 | `tdinh-running1-1366x768`: tốt. Chỉ chụp được một mốc (1/4), không xác nhận lại chuyển 2/4. |
| 17 | Tạo và soạn đề xuất | 8,5 | 8,5 | Không có lỗi mới. |
| 18 | Danh sách đối chiếu (HTTD) | 8,5 | 8,5 | Không có lỗi mới. |
| 19 | Chi tiết đối chiếu 00187 | 7,5 | 8,0 | <ol><li>Cột giữa "Chưa có ảnh trang" là hộp xám suốt chiều cao. Nên hiện văn bản OCR của trang với vùng tô sáng của trường đang chọn (`features/reconciliation/`, trình xem tài liệu).</li><li>Bảng hậu kiểm vẫn render cột "Mục" bằng `requirement_code` thô (`LogPanel.tsx`). Lần này không có dòng nên không thấy, là rủi ro lộ mã.</li></ol> |
| 20 | Danh sách khách hàng | 7,5 | 8,0 | `qhkh-customers-1366x768`: cột "Mức rủi ro" toàn "—" ở trang 1. Sắp khách có xếp hạng lên đầu, hoặc chỉ hiện cột khi trang hiện tại có giá trị (`features/customers/CustomerListPage.tsx:54,70`). |
| 21 | Chi tiết khách hàng | 8,0 | 8,5 | `qhkh-customer-detail-1366x768`: "Hoạt động gần đây" đã lấp nửa dưới. Không có lỗi mới. |
| 22 | Thông báo | 8,5 | 8,5 | `qhkh-notif-1366x768`: tiêu đề "Hồ sơ bị trả lại" lúc có mã, lúc không ("Hồ sơ bị trả lại: HSV-2026-00201" và "Hồ sơ bị trả lại"). Nên luôn ghi mã (`features/notifications/`). |
| 23 | Dashboard, Tổng quan | 8,5 | 8,5 | Không có lỗi mới. |
| 24 | Dashboard, Dấu vết | 8,0 | 8,0 | `dash.log`: cột Yêu cầu "45.000.000.000 đồng, 12 tháng"; nên ghi "45 tỷ đồng · 12 tháng" như mọi nơi (`features/dashboard/components/`). |
| 25 | Ngăn kéo dấu vết | 8,5 | 8,0 | `drawer-00163.txt` dòng 83, 117, 120: "CẦN BỔ SUNG: thiếu dữ liệu chặn — …" ×3. "Credit và compliance" viết thường. "điều phối challenge". Gọi `humanizeGate`/`parseAiText` ở `CaseTrace.tsx:214` và `:302` và cho phần khuyến nghị; viết hoa tên agent. |
| 26 | Dashboard, So sánh | 8,0 | 8,5 | Không còn mã commit; "GPT-6 Luna, OpenAI"; "Chi phí LLM". Không có lỗi mới. |
| 27 | Chat | 8,5 | 8,5 | <ol><li>Thẻ "Bạn cần hỗ trợ thêm? Liên hệ chuyên viên…" sai giọng (`features/chat/components/ConversationSidebar.tsx:301`): bỏ, hoặc thay bằng "Câu trả lời là tham khảo; số liệu chính thức xem ở hồ sơ".</li><li>Câu trả lời ghi "dư nợ hiện hữu tại SHB" trong khi mọi màn khác ghi "tại ngân hàng" (prompt `backend/app/services/llm_conversation_responder.py:48`). Cần chốt có hiện tên ngân hàng hay không.</li></ol> |
| 28 | Panel AI và trích nguồn | 8,0 | 8,0 | Trích nguồn lặp nhãn khi đoạn trích bắt đầu bằng chính nhãn (đã nêu ở lần 6, chưa sửa). "0,0 tỷ" trong câu tính. |
| 29 | Nhật ký kiểm toán | 8,5 | 8,5 | `kiemtoan-audit-1366x768`: tốt. Cột Hồ sơ gãy mã `LA-…` thành hai dòng. Đặt `white-space: nowrap` cho mã (`features/audit/`). |
| 30 | Tra cứu chính sách | 8,5 | 8,5 | Không có lỗi mới. |
| 31 | 403 và 404 | 9,0 | 9,0 | Không có lỗi. |
| 32 | Đang tải và lỗi | 8,5 | 8,5 | `qhkh-error-loan-1366x768`: tốt. Không có lỗi mới. |
| 33 | Quản trị | 8,5 | 8,5 | `quantri-admin-1366x768`: khoảng trống giữa tiêu đề và thẻ bảng lớn hơn các trang khác. Không có lỗi khác. |
| — | Phiên Hội đồng | — | không chấm | Chưa làm hoặc ngoài phạm vi. Mục vẫn hiện ở thanh bên vai Phê duyệt và Kiểm toán. |

**Trung bình 33 trang: 279,5 / 33 = 8,47.**

## Kiểm lại lần 6

Tự đo lại, không dựa vào handback của crew `un`.

### 9 việc phải sửa

| # | Việc lần 6 | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
| 1 | Dọn dữ liệu e2e khỏi hồ sơ trình diễn | **Đã sửa** | Chụp trong khóa ngay sau `--warm`: tờ trình 00187 không còn "e2e" hay "(dữ liệu mẫu)", ghi "4/7 mục đã điền", mục trống ghi "Chưa điền". Nhật ký chốt nguồn đối chiếu 00187: `LOGROWS 0`, panel ẩn. |
| 2 | Mã thô và chip ở LogPanel, tab Chỉ số | **Đã sửa** | Tab Chỉ số ghi "AI trích xuất", 0 lần `AI_OCR`. Chip "Đạt" 49/449px (`kiemtoan-loan187-metrics`). `LogPanel.tsx` có `fieldLabelOr(conflict_code)` và phân trang 10 dòng. Cột "Mục" của bảng hậu kiểm vẫn dùng `requirement_code`; không có dòng nên chưa thấy. |
| 3 | Làm sạch chữ AI | **Sửa một phần** | **Đã sửa:** hết "hiện tại: 0 đồng" trong danh sách yêu cầu; có "Credit và Compliance cùng nêu"; "…"; hết "Kiểm chứng của Validation"; hết "(hư cấu)".<br>**Chưa sửa:** <ul><li>trích nguồn lặp nhãn §3.1;</li><li>mục yêu cầu chữ thường, trùng, không phải yêu cầu;</li><li>câu lặp điều kiện tiên quyết;</li><li>ngăn kéo "hạn mức có bảo đảm hiện tại là 0 đồng" (00163) và "CẦN BỔ SUNG: thiếu dữ liệu chặn" ×3;</li><li>"Credit và compliance".</li></ul> |
| 4 | Một nguồn đếm Việc của tôi | **Đã sửa** | QHKH: "2 bị trả lại · 1 chờ bổ sung" = Segmented "Bị trả lại 2 · Chờ bổ sung 1"; "Quá hạn 0" = KPI "0 hồ sơ quá hạn". |
| 5 | Văn phong nhỏ | **Đã sửa** | "Gia hạn bổ sung thêm 5 ngày LV" (`ActionsPanel.tsx:106`, thấy trên 00201). Thẻ Validation "Cần bổ sung · Thiếu dữ liệu bắt buộc" (20 lần trong log). So sánh: không mã commit, "GPT-6 Luna, OpenAI", "Chi phí LLM". Riêng "Thiếu dữ liệu chặn" còn ở danh sách việc 00163, 00167 (6 lần). |
| 6 | Ngăn kéo: chiều trả kết quả ghi Planner | **Đã sửa** | `drawer-00163.txt:81-82`: "Planner (điều phối) · trả kết quả". |
| 7 | Trang khách hàng | **Sửa một phần** | Chi tiết có "Hoạt động gần đây". Danh sách vẫn hiện cột "Mức rủi ro" toàn "—" ở trang 1. Điều kiện ẩn xét cả tập, không xét trang đang xem. |
| 8 | Số ở bước xác nhận | **Đã sửa** | "55 tỷ đồng (55.000.000.000 đồng), bằng mức đề nghị". |
| 9 | Chi tiết nhỏ | **Đã sửa (Keycloak: một phần)** | Bảng agent: "chưa có tác vụ hoàn tất" sans xám. Chat: dòng "Cập nhật HH:MM dd/mm". Keycloak có panel navy nhưng bố cục khác trang đăng nhập ứng dụng (xem tiêu chí 1). |

### Các gạch đầu dòng "Để lên 8,5 còn thiếu gì" của lần 6

| Tiêu chí | Điều kiện lần 6 | Kết quả |
| --- | --- | --- |
| (1) Bản sắc | Sửa chip; Keycloak có panel navy thì có thể lên 9 | Chip đã sửa. Panel navy có nhưng lệch bố cục, nên giữ 8,5, chưa lên 9. |
| (2) Phân cấp | Số đếm thống nhất | Đã sửa; giữ 8,5. |
| (3) Chữ | Dấu câu trích nguồn, "…", ngoặc lồng | "…" và ngoặc lồng đã sửa. Không thấy ")., trang" trong lượt này. Lặp nhãn trích nguồn chưa sửa. Mới thấy: tên agent viết thường. Giữ 8,5. |
| (4) Màu | Chip giãn; một nhãn Validation | Chip đã sửa. Nhãn Validation đã sửa ở thẻ agent nhưng còn hai cách ghi khác (danh sách việc, ngăn kéo). Giữ 8,5. |
| (5) Mật độ | Phân trang nhật ký; trang khách hàng | Phân trang đã sửa. Chi tiết khách hàng đã sửa. Danh sách khách hàng sửa một phần. Cột phải tab Chỉ số của vai Kiểm toán chưa sửa. Giữ 8,5. |
| (6) Thành phần | Chip; số ở bước xác nhận | Cả hai đã sửa. Lên 9,0. |
| (7) AI và người | Planner chiều trả; gộp phát hiện trùng | Cả hai đã sửa. Ngăn kéo lộ chuỗi cổng thô, nên giữ 8,5. |
| (8) WCAG | Trần khi không có trình đọc thật | Không đổi, 8,5. |
| (9) Văn phong | Cần cả việc 3 và việc 5 | Việc 5 đã sửa, việc 3 sửa một phần: 8,0, đúng như lần 6 dự báo khi chỉ làm một việc. |
| (10) Hoàn thiện | Cần cả việc 1 và việc 2 | Cả hai đã sửa. Còn chuỗi máy "CẦN BỔ SUNG:" trong ngăn kéo, hộp xám ở trình xem tài liệu và Keycloak lệch bố cục: 8,0, chưa tới 8,5. |
| Ước tính lần 6 | Làm xong 1–5 thì trung bình khoảng 8,5 | Việc 3 mới sửa một phần, nên trung bình 8,45, sát ngưỡng nhưng chưa qua. |

Không thấy hồi quy nào do commit sửa gây ra. "Credit và compliance" là chữ LLM chưa được làm sạch, không do `139f997` (commit này chỉ hạ chữ cho bảy từ mở mệnh đề).

## Danh sách việc phải sửa

Xếp theo mức ảnh hưởng tới điểm.

1. **Ngăn kéo dấu vết không in chuỗi cổng thô.** Ảnh hưởng tiêu chí 10, 9, 7, 4; trang 25.
   - **Chỗ:** `frontend/src/features/dashboard/components/CaseTrace.tsx`:
     - `:214`: chữ dòng trao đổi `f.text`, lấy từ `v.summary` ở `agentTrace.ts:156`;
     - `:302`: `validation.narrative`;
     - phần "Đội agent đề nghị bổ sung hồ sơ" trong `trace-decisions`.
   - **Vì sao:** cả ba chỗ in nguyên "CẦN BỔ SUNG: thiếu dữ liệu chặn — Chưa có kết quả tra cứu CIC — …" trên 00163 và 00167, trong khi `humanizeGate`/`parseAiText` (`agentTrace.ts:300-303`) đã có nhưng không được gọi ở đây.
   - **Sửa thành:**
     - cả ba chỗ đi qua `parseAiText`, ra danh sách "Cần bổ sung · Thiếu dữ liệu bắt buộc" với các gạch đầu dòng "Chưa có kết quả tra cứu CIC…", "Chưa có kết quả sàng lọc AML…";
     - "Diễn giải cho người duyệt" không lặp nguyên văn dòng Validation → Planner;
     - ở `humanizeGate`, thay "thiếu dữ liệu chặn" bằng "thiếu dữ liệu bắt buộc".
   - **Kiểm:** `drawer-00163.txt` không còn "CẦN BỔ SUNG" và "chặn".
2. **Gọt chữ AI trên thẻ đề xuất và danh sách việc.** Ảnh hưởng tiêu chí 9, 3, 10; trang 8, 12, 13, 28.
   - **Trích nguồn:** khi đoạn trích bắt đầu bằng chính nhãn nguồn (cả khi phân cách bằng ", " thay vì " – "), bỏ phần lặp. Ví dụ "CS-TD-SME/2025 §3.1 – Thẩm quyền phê duyệt: Theo…".
   - **"Yêu cầu khách bổ sung":**
     - ghép mục bị tách tại dấu ";" nếu mục sau mở bằng chữ thường;
     - bỏ mục không phải yêu cầu với khách (mục chỉ nêu tình trạng chỉ số, như "DSCR cần xác minh…");
     - gộp hai mục gần trùng về chứng thư định giá;
     - số mục trong tiêu đề đếm lại sau khi gộp.
   - **Câu "Điều kiện tiên quyết":** khi nội dung đã chứa cụm "trước khi trình cấp phê duyệt", bỏ cụm ở nhãn.
   - **Danh sách việc 00163 và 00167:** "Thiếu dữ liệu chặn:" thành "Thiếu dữ liệu bắt buộc:".
   - **Tên agent:** viết hoa Credit, Compliance, Operations, Document, Validation, Planner ở mọi vị trí trong chữ AI.
   - **Số:** "0,0 tỷ" và "0 tỷ đồng" thành "0 đồng" hoặc "chưa có dư nợ".
   - **Chỗ:** bộ làm sạch `frontend/src/features/dashboard/agentTrace.ts` (dùng chung cho thẻ đề xuất ở `features/loan-detail/`).
3. **Keycloak cùng bố cục với trang đăng nhập ứng dụng.** Ảnh hưởng tiêu chí 1, 10; trang 1.
   - Panel navy:
     - logo "S" và "Sổ Tín Dụng" ở góc trên trái;
     - tiêu đề serif cách mép trên như `none-login`;
     - đoạn giới thiệu ngay dưới tiêu đề;
     - sơ đồ nhỏ "AI đề xuất → người quyết định";
     - đường kẻ sổ.
   - Cột phải chỉ còn form.
   - **Chỗ:** theme Keycloak ở `infra/` (ngoài `frontend/src`).
4. **Trình xem tài liệu ở trang đối chiếu có nội dung khi thiếu ảnh trang.** Ảnh hưởng tiêu chí 10, 5, 1; trang 19.
   - Thay hộp xám "Chưa có ảnh trang" bằng văn bản OCR của trang, theo dòng, tô sáng dòng chứa giá trị của trường đang chọn. Kèm nhãn "Bản văn bản trích xuất, không phải ảnh gốc".
   - Cột giữa dính (`position: sticky`) khi cuộn để không để lại dải trống.
   - **Chỗ:** `frontend/src/features/reconciliation/` (trình xem tài liệu).
5. **Chat đúng giọng nội bộ.** Ảnh hưởng tiêu chí 9; trang 27.
   - Bỏ thẻ "Bạn cần hỗ trợ thêm? Liên hệ chuyên viên…" (`features/chat/components/ConversationSidebar.tsx:301`). Nếu cần một thẻ, ghi "Câu trả lời là tham khảo. Số liệu chính thức xem ở hồ sơ."
   - Chốt cách gọi ngân hàng nhà trong câu trả lời: "SHB" theo prompt `llm_conversation_responder.py:48`, hay "tại ngân hàng" như mọi màn khác. Đây là quyết định sản phẩm; hiện hai cách cùng tồn tại.
6. **Tab Chỉ số vai Kiểm toán dùng hết bề ngang.** Ảnh hưởng tiêu chí 5; trang 5, 8.
   - Khi không có cột phải (vai chỉ đọc), bảng chỉ số giãn đủ chiều rộng hoặc cột phải hiện "Nguồn và lịch sử xác nhận".
   - **Chỗ:** `features/loan-detail/` (bố cục tab Chỉ số).
7. **Danh sách khách hàng.** Ảnh hưởng tiêu chí 5; trang 20.
   - Xét điều kiện hiện cột "Mức rủi ro" theo trang đang xem, hoặc sắp khách có xếp hạng lên đầu (`CustomerListPage.tsx:54,70`).
8. **Ghi số và mã nhất quán.** Ảnh hưởng tiêu chí 3, 10; trang 22, 24, 29.
   - Dấu vết: "45 tỷ đồng · 12 tháng" thay vì "45.000.000.000 đồng, 12 tháng".
   - Thông báo: tiêu đề luôn kèm mã hồ sơ.
   - Nhật ký kiểm toán: mã hồ sơ `nowrap`.
9. **Chi tiết nhỏ.**
   - Bước xác nhận: "Quay lại" có vòng focus thấy được (`DecisionModal.tsx`).
   - Vai không được chạy agent: khối "Kết luận của đội agent" thu gọn thành một dòng "Chỉ xem…".
   - "Rà soát nhóm khách hàng liên quan: Không có dư nợ" thành "Không có dư nợ tại ngân hàng", để không mâu thuẫn với cờ CIC 98 tỷ.
   - "điều phối challenge" thành "điều phối phản biện".

## Để lên 8,5 còn thiếu gì

Theo từng tiêu chí, so với điểm lần 7:

- **(1) Bản sắc, 8,5:** đạt. Việc 3 (Keycloak cùng bố cục) và việc 4 (trình xem tài liệu) thì lên 9.
- **(2) Phân cấp, 8,5:** đạt. Việc 9 (thu gọn khối AI cho vai chỉ xem) và rút gọn thẻ đề xuất (việc 2) để chắc.
- **(3) Chữ, 8,5:** đạt. Việc 2 (tên agent viết hoa, "0,0 tỷ", mục chữ thường) để giữ.
- **(4) Màu, 8,5:** đạt. Việc 1 và 2 đưa Validation về một cách ghi ở mọi nơi.
- **(5) Mật độ, 8,5:** đạt. Việc 4, 6, 7 thì lên 9.
- **(6) Thành phần, 9,0:** đạt.
- **(7) AI và người, 8,5:** đạt. Việc 1 là điều kiện để giữ: ngăn kéo là chỗ giám khảo cuộc thi đọc kỹ nhất.
- **(8) WCAG AA, 8,5:** mức trần khi không có trình đọc thật. Lên cao hơn cần kiểm bằng NVDA hoặc Orca.
- **(9) Văn phong, 8,0 → 8,5:** cần việc 1 và việc 2. Việc 5 (chat) làm cho chắc.
- **(10) Hoàn thiện, 8,0 → 8,5:** cần việc 1, cộng việc 3 hoặc việc 4. Chỉ làm việc 1 thì khoảng 8,25.

**Ước tính:**
- Làm xong việc 1 và 2: (9) và (10) lên 8,5, trung bình 8,55, ĐẠT.
- Thêm việc 3 và 4: (1) và (5) có thể lên 9, trung bình khoảng 8,65.

## Nếu chỉ còn một ngày: 5 việc đáng làm nhất

1. **Việc 1:** `CaseTrace.tsx` gọi `parseAiText`/`humanizeGate` cho dòng trao đổi, `validation.narrative` và phần đề nghị bổ sung. Khoảng 10 dòng; gỡ chuỗi thô ở chỗ giám khảo đọc kỹ nhất.
2. **Việc 2:** bộ làm sạch chữ AI:
   - bỏ lặp nhãn trích nguồn;
   - ghép mục bị tách, gộp mục trùng, bỏ mục không phải yêu cầu;
   - viết hoa tên agent;
   - "Thiếu dữ liệu bắt buộc";
   - "0 đồng".
3. **Việc 5:** bỏ thẻ "Bạn cần hỗ trợ thêm?" ở chat; xin chốt cách gọi ngân hàng nhà.
4. **Việc 3:** theme Keycloak dựng lại panel trái theo trang đăng nhập ứng dụng.
5. **Việc 4:** trình xem tài liệu hiện văn bản OCR khi thiếu ảnh trang, cột giữa dính khi cuộn.

## Chưa kiểm chứng và chỗ brief sai

**Brief đúng**
- `reset-demo.sh --warm` chạy sẵn 00187, 00163, 00167 và nay đã dọn tờ trình cùng nhật ký chốt nguồn e2e.
- Crew `un` làm đủ 9 việc như báo. Việc 3 và việc 7 chỉ đạt một phần; việc 9 phần Keycloak chỉ đạt một phần.

**Brief chưa nói**
- Chuỗi "CẦN BỔ SUNG: thiếu dữ liệu chặn" vẫn hiện nguyên trong ngăn kéo. Lần 6 ghi "hết CẦN BỔ SUNG" vì khi ấy chỉ kiểm thẻ trên chi tiết hồ sơ.
- Prompt chat (`llm_conversation_responder.py:48`) gọi ngân hàng nhà là "SHB", nên câu trả lời có "tại SHB". Các màn khác dùng "ngân hàng". Cần quyết định sản phẩm, không tự sửa.

**Không kiểm chứng được**
- **Chữ AI:** do LLM sinh nên có thể khác ở lượt sau. Các lỗi chữ ở trên thấy trong lượt warm 10:01–10:06.
- **Đang chạy:** chỉ chụp một mốc (1/4); không kiểm lại chuyển 2/4.
- **Chat:** 2/10 câu. Chưa kiểm câu trả lời có bảng hay rất dài.
- **Bảng hậu kiểm ở đối chiếu:** không có dòng, nên không thấy cột "Mục" thô hay đã dịch.
- **Trình đọc màn hình:** không có trình đọc thật.
- **Phiên Hội đồng:** không chấm.
