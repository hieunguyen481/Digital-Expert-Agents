# Chấm điểm ứng dụng thật, lần 6: thẩm mỹ và UX

Giám khảo độc lập (Opus). Chấm ứng dụng chạy ở `http://localhost:3000` và Keycloak `:8080`, mã `import/duskdash` `e342061`, ngày 13/11/2026. Đích là `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Thang điểm và ngưỡng giữ nguyên như lần 5 (`docs/design/cham-diem-ung-dung-lan-5.md`).

## Kết luận

**KHÔNG ĐẠT.**

| Chỉ số | Kết quả |
| --- | --- |
| Trung bình 10 tiêu chí | **8,30** (lần 5: 8,10). Ngưỡng là 8,5. |
| Trung bình 33 trang | 8,38 (lần 5: 8,09). |
| Tiêu chí thấp nhất | 7,5, ở hai tiêu chí (9) văn phong và (10) độ hoàn thiện. Không tiêu chí nào dưới 7. |

**Đã tiến bộ thật.** Tám tiêu chí đã lên 8,5. 7/10 việc của lần 5 đã sửa xong:
- kết luận AI của người Phê duyệt gọn một dòng;
- chip Operations vàng khi có điều kiện;
- một kiểu chip hạn cho mọi danh sách;
- trang Quản trị có trang chủ riêng;
- khung tải giữ đủ khung;
- trang 403 sạch;
- "Planner (điều phối)" ở chiều giao việc trong ngăn kéo.

**Chưa đạt vì hai tiêu chí còn 7,5.** Lý do nằm ở chữ và dữ liệu hiện trên hồ sơ trình diễn 00187, là màn giám khảo cuộc thi sẽ mở đầu tiên:
- **Dữ liệu e2e còn sót trên màn.** Tờ trình có "Nhận định e2e 1794523072173", "Nội dung e2e mục 5", "Nội dung e2e mục 7". Bảng nhật ký chốt nguồn ở trang đối chiếu dài **162 dòng** "Dùng EBITDA đã kiểm toán (e2e …)", cột mâu thuẫn ghi khóa thô "dscr".
- **Mã thô "AI_OCR" hiện 9 lần** ở tab Chỉ số.
- **Chữ AI chưa sạch:**
  - "Hạn mức bảo đảm đủ điều kiện hiện tại: 0 đồng" đứng như một yêu cầu bổ sung;
  - phát hiện của Credit và Compliance lặp gần nguyên văn;
  - "Validation · Kiểm chứng của Validation:";
  - "(hư cấu)" lộ trong tên ngân hàng ở tiêu đề cờ.

Phần lớn là việc nhỏ và cụ thể (mục "Danh sách việc phải sửa"). Ước tính làm xong 5 việc ở mục "Nếu chỉ còn một ngày" thì đạt khoảng 8,5–8,6.

## Cách chấm

**Ảnh chụp**
- 261 ảnh Playwright, đăng nhập Keycloak thật bằng 10 vai: không vai, QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị.
- Cỡ màn 1366×768 và 1920×1080. Thêm 1280×800 và 1440×900 cho đăng nhập, Việc của tôi, chi tiết hồ sơ, dashboard.
- Ảnh và bộ đo ở `/tmp/gu6/`, gồm `lib.cjs`, `run.cjs`, các bước `st-*.cjs`, log `*.log`. Ảnh ghép xem nhanh là `v-*.jpg`.

**Lượt chạy AI**
- Khối AI chụp trong một khóa: `flock /tmp/do-an-e2e.lock bash -c 'infra/scripts/reset-demo.sh --warm && …'`, giữ khóa 07:12–07:19.
- Warm dùng 3 lượt đội agent:
  - 00187: Chờ phê duyệt sau lượt chạy;
  - 00163 và 00167: Cần thông tin.
- Trạng thái đang chạy chụp ở hai thời điểm: "Đã chạy 00:16 … 1/4 chuyên gia đã xong" và "00:36 … 2/4".
- Chat dùng 2/10 câu.
- Không gặp 402, không lỗi vite, không `pageerror`.

**Bộ đo DOM trên màu thật**
- Đo: tràn ngang; cỡ chữ nhỏ nhất; tương phản có pha alpha qua các lớp cha; điều khiển không tên; số `h1` và `main`; quét chữ thô (`rawScan`); màu chip (`pills`); vòng focus (`ring`).
- Kết quả trên mọi lần đo (log `/tmp/gu6/*.log`):
  - 0 tràn ngang;
  - 0 chữ dưới AA, 0 nút tương phản thấp;
  - cỡ nhỏ nhất 12px;
  - mỗi trang đúng 1 `h1` và 1 `main`.
- Phần "không tên" còn lại chỉ là dương tính giả đã biết:
  - `ant-tabs-nav-more`;
  - `ant-input-clear-icon-hidden`;
  - bản sao TEXTAREA autosize của antd. Đã kiểm: ô soạn chat được gắn `aria-label="Câu hỏi cho trợ lý"` ở `ChatComposer.tsx:71`; ô `#action-text` có `id` để gắn nhãn.

**Phạm vi**
- Chỉ xem, không bấm hành động ghi trên hồ sơ seed. Modal quyết định mở tới bước xác nhận rồi "Quay lại".
- Các mục đã chốt không tính lỗi:
  - nháp `LA-…` hiện "Nháp chưa đánh số"; `LA-…` đã nộp hiện nguyên mã;
  - mã `EMP-DEMO-…` và `CIF-DEMO-…`;
  - không có trình đọc màn hình thật;
  - dòng giới hạn ở tab So sánh.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 5 | Lần 6 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 8,5 | **8,5** | **Được:** <ul><li>Mọi vai dùng chung khung: thanh bên navy, logo "S", tiêu đề serif, nền giấy kem, nút chính vàng đồng, khối AI tím viền đứt.</li><li>Quản trị nay vào `/quan-tri` với `h1` "Quản trị người dùng", cùng khung (`quantri-home-1366x768`).</li><li>Chip hạn một bộ màu đỏ/vàng/xám ở Việc của tôi và danh sách đối chiếu (`DeadlineChip.tsx`).</li></ul>**Trừ:** <ul><li>Trang Keycloak là thẻ căn giữa trên nền trơn (`none-kc-1366x768`), trong khi trang đăng nhập của ứng dụng chia đôi có panel navy giới thiệu (`none-login-1366x768`). Cùng bộ màu nhưng hai bước liền nhau trông như hai sản phẩm.</li><li>Tab Chỉ số có chip "Đạt" kéo dài hết cột, trông như thanh tiến độ, lệch với chip ở mọi trang khác (tiêu chí 6).</li></ul> |
| 2 | Phân cấp, hành động chính ở màn đầu | 8,0 | **8,5** | **Được:** <ul><li>Người Phê duyệt thấy ngay "AI đề xuất: cần bổ sung 2 việc trước khi quyết định", hai gạch đầu dòng, nút "Quyết định" vàng ở góc phải (`v-ph163.jpg`).</li><li>Nút "Xử lý cờ này" ngắn, không lặp tiêu đề cờ.</li><li>Nháp có nút vàng "Tiếp tục soạn đề xuất" kèm câu giải thích.</li><li>Kết luận 00187 hai dòng serif.</li></ul>**Trừ:** <ul><li>Việc của tôi (QHKH) có số không khớp nhau. Phụ đề ghi "1 bị trả lại · 1 chờ bổ sung" nhưng Segmented ghi "Bị trả lại 2". Segmented ghi "Quá hạn 1" nhưng KPI ghi "0 · Bạn đang giữ, quá hạn". Nguyên nhân: hai nguồn đếm khác nhau, `facts.overdue` và tag `over` (`MyWorkPage.tsx:47,99`). Số trên màn đầu không khớp thì người dùng mất tin vào cả bảng.</li></ul> |
| 3 | Chữ và khả năng đọc tiếng Việt | 8,0 | **8,5** | **Được:** <ul><li>Hết "vs", "##", "BCTC BCTC", câu cắt giữa chữ.</li><li>Tên seed có dấu (Phạm Thu Hà).</li><li>Serif và sans hiển thị dấu đúng, số tabular, mã hồ sơ mono thống nhất.</li></ul>**Trừ:** <ul><li>Trích nguồn có dấu câu ghép ")., trang 3" và ba dấu chấm "..." (`ai-td.log`, `sup2.log`).</li><li>Ngoặc lồng "(NH TMCP Phương Bắc (hư cấu))" và "(GPT-6 Luna (OpenAI))".</li><li>Chữ "chưa có tác vụ hoàn tất" in font mono trong cột số của bảng Theo từng agent.</li></ul> |
| 4 | Màu và ngữ nghĩa trạng thái | 8,0 | **8,5** | **Được:** <ul><li>Chip Operations "Đạt, có điều kiện" vàng (nền 248,232,200; chữ 143,84,0) ở chi tiết 00163, 00167 và trong ngăn kéo.</li><li>Chip hạn đỏ/vàng/xám, ẩn khi hồ sơ đã kết thúc.</li><li>"Mâu thuẫn chưa chốt" cam.</li></ul>**Trừ:** <ul><li>Validation mang hai nhãn cho cùng một ý: "Cần thêm thông tin" và "Cần bổ sung · Thiếu dữ liệu chặn".</li><li>Chip "Đạt" xanh kéo dài 448px ở tab Chỉ số đọc như thanh đo, không như nhãn trạng thái.</li></ul> |
| 5 | Mật độ, lưới, khoảng cách 1366 và 1920 | 8,5 | **8,5** | **Được:** 0 tràn ngang ở cả bốn cỡ; chi tiết hồ sơ 1920 cân hai cột; danh mục tài liệu trống có câu hướng dẫn.<br>**Trừ:** <ul><li>Chi tiết khách hàng: đã có hàng KPI, nhưng ở 1366 nửa dưới vẫn trống (`qhkh-customer-detail-full-1366x768`).</li><li>Tab Chỉ số của vai Kiểm toán bỏ trống cột phải, khoảng 1/3 màn (`kiemtoan-loan187-metrics-1366x768`).</li><li>Trang đối chiếu 00187 kéo dài vì bảng nhật ký 162 dòng không phân trang (`LogPanel.tsx:20`, `pagination={false}`).</li></ul> |
| 6 | Thành phần và trạng thái | 8,5 | **8,5** | **Được:** <ul><li>Khung tải có ô tìm kèm placeholder và chỗ avatar.</li><li>Modal quyết định: InputNumber có vòng focus 3px trên khung bọc; "Ghi quyết định" khóa kèm lý do "Cần nhập: lý do quyết định."; bước xác nhận nêu rõ "Không hoàn tác được"; Esc trả focus về nút "Quyết định" (7,82:1).</li><li>Trang 403 sạch.</li><li>Đang chạy có đồng hồ và "1/4 → 2/4 chuyên gia đã xong".</li></ul>**Trừ:** <ul><li>Chip trạng thái trong `MetricsPanel` là `display:flex` trong ô grid nên giãn hết chiều ngang (`PILLW Đạt:448/448 disp=flex pdisp=grid`, `sup2.log`).</li><li>Bước xác nhận trộn hai cách ghi số: "55.000.000.000 đồng (đề nghị 55 tỷ đồng)".</li><li>Danh sách cuộc trò chuyện có bốn dòng "Tỷ lệ cho vay trên giá trị tài…" cắt giống hệt nhau, không phân biệt được (`qhkh-chat-answer2-1366x768`).</li></ul> |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 8,0 | **8,5** | **Được:** <ul><li>Sơ đồ "Planner → Credit · Compliance · Operations · Document → Validation → Cấp phê duyệt: người quyết định, ngoài khung AI" có ở trang đăng nhập, dashboard và khối đang chạy.</li><li>Ngăn kéo có "Planner (điều phối) → … · giao việc" và h3 cho từng agent.</li><li>Chip "AI đề xuất – chưa xác nhận" và "Người quyết định" có trên mọi màn.</li><li>Thẻ đề xuất ghi "AI chỉ đề xuất. Chưa xác nhận thì chưa có thay đổi nào được ghi vào hồ sơ."</li><li>Document trong bảng agent ghi "chưa có tác vụ hoàn tất" kèm chú thích.</li></ul>**Trừ:** <ul><li>Chiều trả kết quả trong ngăn kéo vẫn ghi "Operations → Hệ thống điều phối · trả kết quả" (`agentTrace.ts:11`), lệch với "Planner (điều phối)" ở chiều giao việc.</li><li>Phát hiện của Credit và Compliance ở 00187 gần như trùng câu, khiến hai chuyên gia trông như một.</li></ul> |
| 8 | Tiếp cận WCAG AA | 8,5 | **8,5** | **Được:** <ul><li>0 chữ dưới AA; 0 nút tương phản thấp.</li><li>Vòng focus navy 3px: 8,48:1 trên nền giấy, 7,81:1 trong ngăn kéo, 14,12:1 (shadow) ở radio modal.</li><li>Select, DatePicker, Segmented và InputNumber có vòng trên khung bọc.</li><li>Tab không thoát khỏi modal; Esc trả focus.</li><li>Lỗi Keycloak gắn vào ô, có biểu tượng và chữ đỏ, không chỉ dựa vào màu (`none-kc-error-1366x768`).</li></ul>**Trần:** không có trình đọc màn hình thật; dựa trên đo máy, bàn phím và cây tiếp cận ở `docs/agent/review-ux.md`. |
| 9 | Văn phong UX | 7,5 | **7,5** | **Được:** <ul><li>Hết "Ý kiến" viết hoa giữa câu, "Đi tới", "single và multi", "Mã kỹ thuật", "RETAIL-CREDIT-DEMO", "CẦN BỔ SUNG", "hit".</li><li>Placeholder nhật ký là "Mã hồ sơ, ví dụ HSV-2026-00187".</li><li>Thông báo nêu nội dung cần bổ sung.</li><li>Câu chat có nguồn và miễn trừ.</li></ul>**Trừ** (phần lớn trên màn trình diễn 00187): <ul><li>"Hạn mức bảo đảm đủ điều kiện hiện tại: 0 đồng" là một gạch đầu dòng trong "Yêu cầu khách bổ sung 4 mục". Compliance 00163 và 00167 cũng ghi "hạn mức có bảo đảm hiện tại là 0 đồng".</li><li>"Hoàn thiện, đối chiếu trước khi quyết định" là mảnh câu không có chủ thể.</li><li>Credit và Compliance lặp "Phần còn thiếu không chặn việc áp dụng chính sách, được xử lý thành điều kiện…".</li><li>"Validation · Kiểm chứng của Validation:" (nhãn `agentTrace.ts:211` ghép với tên agent).</li><li>Trích nguồn lặp nhãn: "CS-TD-SME/2025 §1.2, Phạm vi SME: "CS-TD-SME/2025 §1.2, Phạm vi SME…"".</li><li>"Thiếu dữ liệu chặn" là biệt ngữ.</li><li>Nút "Gia hạn hạn bổ sung (+5 ngày LV)" có hai chữ "hạn" liền nhau (`ActionsPanel.tsx`).</li><li>So sánh: tiêu đề "Số đo chính: đo mù trên bản đã khóa mã (735f9a7)" lộ mã commit; "chi phí llm" viết thường.</li></ul> |
| 10 | Độ hoàn thiện sản phẩm thật | 7,5 | **7,5** | **Được:** <ul><li>Không vỡ bố cục, không `pageerror`.</li><li>Hết "VND" thô.</li><li>Không còn "số minh họa" ở tên tài sản.</li><li>Khung tải, 403, nháp và Quản trị đều đã xong.</li></ul>**Trừ:** <ul><li>Dữ liệu e2e lộ trên hồ sơ trình diễn sau `reset-demo.sh --warm`: <ul><li>Tờ trình 00187: "Nhận định e2e 1794523072173" (dấu thời gian 05:37, trước lần đặt lại 07:12), "Nội dung e2e mục 5", "Nội dung e2e mục 7", và "(dữ liệu mẫu)" bốn lần.</li><li>Đối chiếu 00187: 162 dòng nhật ký "Dùng EBITDA đã kiểm toán (e2e …)" (`sup3-httd.log`).</li></ul>Lần 5 chỉ thấy một dòng "(e2e 11)". Nay `reset-demo.sh` vẫn không dọn mục tờ trình và nhật ký chốt nguồn, nên chữ e2e còn tích lũy thêm.</li><li>Mã thô trên màn: "AI_OCR" 9 lần ở tab Chỉ số (`format.ts:17`, `SOURCE_TYPE` thiếu khóa; trang đối chiếu đã dịch thành "AI trích xuất"), và "dscr" ở cột Mâu thuẫn (`LogPanel.tsx:24` in `conflict_code` thô dù `fieldLabels.ts:10` đã có nhãn "DSCR").</li><li>"(hư cấu)" trong tên ngân hàng ở tiêu đề cờ 00187 (seed).</li></ul> |
|  | **Trung bình** | **8,10** | **8,30** | |

## Bảng từng trang

Ảnh ở `/tmp/gu6/<vai>-<trang>-<cỡ>.png`. Ảnh hậu tố `B` là ảnh chụp trong khóa, sau warm.

| # | Trang hoặc trạng thái (vai) | Lần 5 | Lần 6 | Phải sửa (ảnh · phần tử · file nghi ngờ trong `frontend/src`) |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập (ứng dụng và Keycloak) | 8,5 | 8,5 | 1) `none-kc-1366x768`: thẻ Keycloak căn giữa trên nền trơn, không có panel navy như trang đăng nhập của ứng dụng (`none-login-1366x768`). Thêm panel trái hoặc một dải navy để hai bước liền mạch. Theme ở `infra/keycloak` (ngoài `frontend/src`). |
| 2 | Khung: thanh bên, thanh trên, dải demo | 8,5 | 9,0 | Không còn việc lớn. Khung tải đủ placeholder và avatar. |
| 3 | Việc của tôi (QHKH) | 8,5 | 8,0 | 1) `qhkh-home-1366x768`: phụ đề "1 bị trả lại", Segmented "Bị trả lại 2"; Segmented "Quá hạn 1", KPI "0 quá hạn". Hai nguồn đếm, `facts.overdue` và tag `over` · `features/my-work/MyWorkPage.tsx:47,99`. Dùng một nguồn, hoặc ghi rõ phạm vi ("Bạn đang giữ" so với "Tất cả"). |
| 4 | Việc của tôi (Trưởng phòng) | 8,5 | 8,5 | Tên đã có dấu. Không còn việc lớn. |
| 5 | Việc của tôi (Kiểm toán) | 8,5 | 8,5 | Không còn việc lớn. |
| 6 | Tìm kiếm (combobox) | 8,5 | 8,5 | Không có việc lớn. |
| 7 | Chi tiết hồ sơ HSV-00201 (QHKH, trả về) | 8,5 | 8,0 | TodoPanel dùng một động từ "Mở". 1) `qhkh-loanA-1366x768`: nút "Gia hạn hạn bổ sung (+5 ngày LV)" · `features/loan-detail/ActionsPanel.tsx`. Đổi thành "Gia hạn bổ sung thêm 5 ngày LV". |
| 8 | Chi tiết hồ sơ HSV-00187 (Thẩm định, kết quả AI) | 7,5 | 7,5 | 1) `tdinh-loan187-y1400-1366x768`: gạch đầu dòng "Hạn mức bảo đảm đủ điều kiện hiện tại: 0 đồng" và "Hoàn thiện, đối chiếu trước khi quyết định" trong "Yêu cầu khách bổ sung 4 mục" · bộ làm sạch chữ AI (`features/dashboard/agentTrace.ts`, `features/loan-detail/ActionsPanel.tsx`, `InfoPanels.tsx`) hoặc prompt agent. 2) `kiemtoan-loan187-metrics-1366x768`: "AI_OCR" và chip "Đạt" kéo dài · `features/loan-detail/format.ts:17`, `MetricsPanel.tsx`. 3) Tab Tờ trình: "Nhận định e2e …", "Nội dung e2e mục 5/7" (dữ liệu, `infra/scripts/reset-demo.sh`). |
| 9 | Chi tiết hồ sơ (Rủi ro) | 7,5 | 8,0 | Đã hết "Chưa có Ý kiến…". 1) Theo lần 5, chưa thấy commit sửa: cột phải còn nhiều câu "chưa…" xếp chồng khi chưa có lượt. Gộp thành một câu hướng dẫn · `features/loan-detail/TodoPanel.tsx`. |
| 10 | Chi tiết hồ sơ (Tuân thủ) | 7,5 | 8,0 | Như dòng 9. 1) Theo lần 5, chưa thấy commit sửa: nhãn "Chỉ xem" và câu chỉ dẫn lặp lại ở hai khối · `features/loan-detail/AgentTeamPanel.tsx`. |
| 11 | Chi tiết hồ sơ (HTTD) | 8,0 | 8,5 | TodoPanel thống nhất "Mở". Không còn việc lớn. |
| 12 | Chi tiết hồ sơ HSV-00163 (Phê duyệt) | 7,5 | 8,5 | Kết luận một dòng, chip Operations vàng (`v-ph163.jpg`). 1) Phát hiện Compliance "hạn mức có bảo đảm hiện tại là 0 đồng" · chữ AI. |
| 13 | Chi tiết hồ sơ HSV-00167 (Phê duyệt) | 7,5 | 8,5 | Như dòng 12. 1) RAW bắt "danh sách đen..." ba dấu chấm · bộ làm sạch chữ AI. |
| 14 | Modal quyết định, bước chọn | 8,5 | 9,0 | Focus InputNumber đã có trên khung bọc (`pheduyet-amt-focus-clip.png`). Không còn việc lớn. |
| 15 | Modal quyết định, bước xác nhận | 8,5 | 8,5 | 1) `pheduyet-decision-confirm-1366x768`: "55.000.000.000 đồng (đề nghị 55 tỷ đồng)" trộn hai cách ghi số. Dùng "55 tỷ đồng (55.000.000.000 đồng), bằng đề nghị" · `features/loan-detail/DecisionModal.tsx`. |
| 16 | Đội agent đang chạy (00187) | 8,0 | 8,5 | Chụp ở 00:16 và 00:36, tiến độ 1/4 → 2/4 rõ (`tdinh-running1/2`). Không còn việc lớn. |
| 17 | Tạo và soạn đề xuất | 8,5 | 8,5 | Không có việc lớn. |
| 18 | Danh sách đối chiếu (HTTD) | 8,0 | 8,5 | Chip hạn đã thống nhất. Không còn việc lớn. |
| 19 | Chi tiết đối chiếu và OCR | 8,0 | 7,5 | 1) `httd-ocr187B-*`: nhật ký chốt nguồn 162 dòng, không phân trang · `features/reconciliation/LogPanel.tsx:20` (đặt `pagination={{ pageSize: 10 }}`). 2) Cột "Mâu thuẫn" in "dscr" · `LogPanel.tsx:24` (render qua `fieldLabel`). 3) Lý do "(e2e …)" là dữ liệu, cần `reset-demo.sh` dọn `conflict log`. |
| 20 | Khách hàng | 7,5 | 7,5 | Chưa sửa. 1) `qhkh-customers-1366x768`: cột "Mức rủi ro" ghi "—" ở mọi dòng. Ẩn cột khi cả trang không có giá trị · `features/customer/`. |
| 21 | Chi tiết khách hàng | 7,5 | 8,0 | Đã có KPI "1 hồ sơ vay · 1 đang xử lý · 80 tỷ". 1) `qhkh-customer-detail-full-1366x768`: nửa dưới trống. Thêm "Hoạt động gần đây" hoặc tài sản bảo đảm · `features/customer/`. |
| 22 | Thông báo | 8,5 | 8,5 | Không có việc lớn. |
| 23 | Dashboard Tổng quan | 8,5 | 8,5 | 1) `qhkh-dash-y700-1366x768`: chữ "chưa có tác vụ hoàn tất" in mono trong cột số. Dùng sans màu phụ · `features/dashboard/components/`. |
| 24 | Dashboard Dấu vết | 8,0 | 8,0 | Lần này không có ảnh kiểm lại ô "Hiện 7 lượt nháp…" rơi xuống dòng hai (chưa kiểm chứng). Giữ điểm. |
| 25 | Ngăn kéo trace | 8,0 | 8,5 | h3 và Planner ở chiều giao việc đã có. 1) `qhkh-drawer-*`: "Operations → Hệ thống điều phối · trả kết quả" · `features/dashboard/agentTrace.ts:11`. Đổi thành "Planner (điều phối)". |
| 26 | Dashboard So sánh | 8,5 | 8,0 | Số đo v8 mới thêm kéo theo chữ thô. 1) `qhkh-compare-1366x768`: tiêu đề có "(735f9a7)"; dòng lượt đo lặp ngay dưới ô chọn · `features/dashboard/components/ComparisonTab.tsx`. 2) "(GPT-6 Luna (OpenAI))" và "chi phí llm". |
| 27 | Trợ lý AI (chat) | 8,5 | 8,5 | Câu trả lời có danh sách, nguồn §, miễn trừ. 1) Lịch sử có bốn tiêu đề cắt giống hệt nhau. Thêm giờ hoặc hồ sơ vào dòng phụ · `features/chat/`. |
| 28 | Panel AI và trích nguồn trong hồ sơ | 8,0 | 8,0 | 1) "Validation · Kiểm chứng của Validation:" · `features/dashboard/agentTrace.ts:211`. 2) Trích nguồn lặp nhãn và có ")., trang" · bộ làm sạch chữ AI. |
| 29 | Nhật ký kiểm toán | 8,0 | 8,5 | Placeholder đã sửa. Không còn việc lớn. |
| 30 | Tra cứu chính sách | 8,0 | 8,5 | Chính sách mẫu bán lẻ đã ẩn. Không còn việc lớn. |
| 31 | 403 và 404 | 8,5 | 9,0 | Sạch. Không còn việc. |
| 32 | Đang tải và lỗi | 8,0 | 8,5 | Khung tải đủ. Không còn việc lớn. |
| 33 | Quản trị | 7,0 | 8,5 | Có `/quan-tri`, `h1` riêng, bảng người dùng và vai, ghi "Chỉ đọc". Không còn việc lớn. |
| — | Phiên Hội đồng | không chấm | không chấm | Ngoài phạm vi. Mục "Phiên Hội đồng tín dụng" vẫn có ở thanh bên vai Phê duyệt và Kiểm toán. |
|  | **Trung bình 33 trang** | **8,09** | **8,38** | |

## Kiểm lại lần 5

### 10 việc phải sửa

| # | Việc lần 5 | Kết quả | Bằng chứng lần 6 |
| --- | --- | --- | --- |
| 1 | Bộ làm sạch chữ AI | **sửa một phần** | Hết "##", "hit", "CẦN BỔ SUNG", "compliance_policy", "BCTC BCTC", "vs", câu cắt (`rawScan` sạch ở `ai-*.log`). Còn sót: "0 đồng" thành yêu cầu, lặp Credit/Compliance, "Kiểm chứng của Validation", nhãn trích nguồn lặp, ")., trang", "...". |
| 2 | Chip Operations vàng khi có điều kiện | **đã sửa** | `PILLS` 00163, 00167: "Đạt, có điều kiện" nền 248,232,200, chữ 143,84,0; ngăn kéo `DPILLS` giống. |
| 3 | Kết luận AI tối đa 2 dòng | **đã sửa** | `CONCL` 00163 và 00167: 1 dòng; 00187: 2 dòng. |
| 4 | Số tiền qua hàm chung | **đã sửa** | Quét log không còn "VND". Bước xác nhận còn trộn cách ghi (trang 15), là việc nhỏ khác. |
| 5 | Ngăn kéo gọi đúng Planner | **sửa một phần** | Chiều giao việc: "Planner (điều phối) → … · giao việc". Chiều trả kết quả còn "Hệ thống điều phối" (`agentTrace.ts:11`). |
| 6 | Một kiểu `DeadlineChip` | **đã sửa** | `features/my-work/DeadlineChip.tsx` dùng ở Việc của tôi và danh sách đối chiếu, đỏ/vàng/xám, ẩn khi hồ sơ đã kết thúc. |
| 7 | Khách hàng: ẩn cột rủi ro; chi tiết trống | **sửa một phần** | Chi tiết có KPI. Danh sách vẫn có cột "Mức rủi ro" toàn "—"; chi tiết nửa dưới vẫn trống. Không thấy commit nào cho danh sách. |
| 8 | Quản trị có trang chủ riêng | **đã sửa** | `routes.tsx:50` → `/quan-tri`, `h1` "Quản trị người dùng" (`quantri-home-1366x768`). |
| 9 | Văn phong (Ý kiến, Mở/Đi tới, single/multi, Mã kỹ thuật, placeholder, RETAIL) | **đã sửa** | `rawScan` không bắt "Chưa có Ý kiến", "single và multi", "RETAIL-CREDIT-DEMO", "Bộ chạy tác vụ". Lượt đo ghi "Bộ ca v8 · So sánh đội agent và mô hình đơn lẻ"; mã kỹ thuật nằm trong "Chi tiết kỹ thuật (kiểm toán)". |
| 10 | Trau chuốt (Xử lý cờ, nháp, danh mục trống, khung tải, focus InputNumber, h3, Document) | **đã sửa** | "Xử lý cờ này"; nháp có "Tiếp tục soạn đề xuất" (`ActionsPanel.tsx:100`); `ocr163`: "Chưa có tài liệu để đối chiếu" kèm câu hướng dẫn; khung tải có ô tìm và avatar; `AMTWRAP` 3px navy; h3 trong ngăn kéo; Document "chưa có tác vụ hoàn tất". |

### Các gạch đầu dòng "Để lên 8,5 còn thiếu gì" của lần 5

| Tiêu chí | Gạch đầu dòng | Kết quả |
| --- | --- | --- |
| 1 | Một kiểu chip hạn; Quản trị có trang riêng | đã sửa |
| 2 | Kết luận ≤ 2 dòng | đã sửa |
| 2 | Nút "Xử lý cờ" không lặp, không cắt | đã sửa |
| 2 | Thẻ Hành động nháp có việc kế tiếp | đã sửa |
| 3 | Hết "vs", "##", câu cắt giữa chữ | đã sửa |
| 3 | Tên seed có dấu | đã sửa (Phạm Thu Hà) |
| 4 | Chip Operations vàng | đã sửa |
| 4 | Chip hạn một bộ màu, ẩn khi kết thúc | đã sửa |
| 5 | Chi tiết khách hàng; thẻ danh mục trống | sửa một phần (danh mục xong; chi tiết khách hàng còn trống nửa dưới) |
| 6 | Placeholder, avatar trong khung tải; focus InputNumber | đã sửa |
| 7 | Planner thống nhất ở ngăn kéo | sửa một phần (chiều trả kết quả) |
| 7 | Chip Operations; kết luận ngắn | đã sửa |
| 7 | Document không còn "0 lượt" | đã sửa |
| 8 | Heading từng agent trong ngăn kéo; focus InputNumber | đã sửa |
| 8 | Kiểm bằng NVDA hoặc Orca | chưa sửa (không có trên máy; ngoài khả năng crew) |
| 9 | Việc 1 (chữ AI sạch) | sửa một phần |
| 9 | Việc 9 (các chỗ sót) | đã sửa |
| 10 | Việc 4 (VND thô) | đã sửa |
| 10 | Việc 1 (câu cắt) | đã sửa |
| 10 | Seed và e2e không lộ lên màn trình diễn | **chưa sửa, nặng hơn**: "số minh họa" đã hết và `EMP-DEMO` đã chốt; nhưng chữ e2e nay hiện ở tờ trình 00187 và 162 dòng nhật ký đối chiếu. |

Không thấy hồi quy giao diện so với lần 5. Phát hiện mới, chưa rõ có từ trước hay không: "AI_OCR" và chip "Đạt" kéo dài ở tab Chỉ số; "dscr" thô và bảng không phân trang ở nhật ký chốt nguồn; số không khớp ở Việc của tôi QHKH; "Gia hạn hạn"; mã commit ở So sánh.

## Danh sách việc phải sửa

Xếp theo mức ảnh hưởng tới điểm.

1. **Dọn dữ liệu e2e khỏi hồ sơ trình diễn.** Ảnh hưởng tiêu chí 10 và 9; trang 8 và 19.
   - **Chỗ:** hồ sơ 00187.
     - Tờ trình: "Nhận định e2e …", "Nội dung e2e mục 5", "Nội dung e2e mục 7", "(dữ liệu mẫu)" ×4.
     - Nhật ký chốt nguồn ở đối chiếu: 162 dòng "(e2e …)".
   - **Vì sao:** `reset-demo.sh` không đặt lại các mục tờ trình và nhật ký chốt nguồn, nên mỗi lượt e2e lại để thêm dòng.
   - **Sửa thành:** `infra/scripts/reset-demo.sh` xóa các mục tờ trình và dòng nhật ký không thuộc seed của hồ sơ seed, hoặc e2e tự dọn sau khi chạy. Mục tờ trình của seed viết bằng chữ thật, không ghi "(dữ liệu mẫu)".
   - **Chủ:** người giữ seed hoặc reset-demo, không phải frontend.
2. **Nhật ký chốt nguồn và tab Chỉ số không in mã thô.** Ảnh hưởng tiêu chí 10, 6, 4, 5.
   - `features/reconciliation/LogPanel.tsx`:
     - dòng 24: render `fieldLabel(r.conflict_code)` thay cho `dataIndex: 'conflict_code'`;
     - dòng 20 và 33: phân trang 10 dòng.
   - `features/loan-detail/format.ts:17`: thêm `AI_OCR: 'AI trích xuất'` (cùng chữ với `features/reconciliation/fieldLabels.ts`), và để giá trị thiếu nhãn rơi về chữ thường như `fieldLabels.ts:26`.
   - `features/loan-detail/MetricsPanel.tsx`: chip trạng thái dùng `justify-self: start` hoặc `display: inline-flex`, để không giãn 448px.
3. **Làm sạch nốt chữ AI (việc 1 lần 5).** Ảnh hưởng tiêu chí 9, 7, 3; trang 8, 12, 13, 28.
   - Bỏ khỏi danh sách yêu cầu các dòng chỉ nêu số hiện trạng ("…hiện tại: 0 đồng") và các mảnh câu không có động từ hành động ("Hoàn thiện, đối chiếu trước khi quyết định").
   - Gộp phát hiện trùng nhau giữa hai agent: giữ một, ghi "Credit và Compliance cùng nêu".
   - Ở `features/dashboard/agentTrace.ts:211`, đổi nhãn `validation` để không ghép thành "Validation · Kiểm chứng của Validation" (ví dụ chỉ ghi "Kiểm chứng").
   - Trong trích nguồn:
     - bỏ phần lặp nhãn khi đoạn trích bắt đầu bằng chính nhãn;
     - thay ")., trang" bằng "), trang";
     - thay "..." bằng "…".
   - Ở seed, đổi "NH TMCP Phương Bắc (hư cấu)" thành tên không có ngoặc.
4. **Số đếm thống nhất ở Việc của tôi.** Ảnh hưởng tiêu chí 2; trang 3.
   - Chỗ: `features/my-work/MyWorkPage.tsx:47` và `:99`.
   - Sửa: phụ đề, Segmented và KPI lấy cùng một nguồn. Nếu cố ý khác phạm vi thì nhãn phải nói rõ ("Bạn đang giữ: 0 quá hạn · Tất cả: 1").
5. **Văn phong nhỏ.** Ảnh hưởng tiêu chí 9.
   - `features/loan-detail/ActionsPanel.tsx`: "Gia hạn hạn bổ sung (+5 ngày LV)" thành "Gia hạn bổ sung thêm 5 ngày LV".
   - Validation chỉ một nhãn trạng thái, "Cần bổ sung"; câu "Thiếu dữ liệu chặn" thành "Thiếu dữ liệu bắt buộc".
   - `features/dashboard/components/ComparisonTab.tsx`:
     - bỏ "(735f9a7)" khỏi tiêu đề, chuyển vào "Chi tiết kỹ thuật";
     - bỏ dòng lượt đo lặp dưới ô chọn;
     - "GPT-6 Luna, OpenAI";
     - "chi phí LLM".
6. **Ngăn kéo: chiều trả kết quả dùng "Planner (điều phối)".** Chỗ: `features/dashboard/agentTrace.ts:11`. Ảnh hưởng tiêu chí 7.
7. **Trang khách hàng.** Ảnh hưởng tiêu chí 5; trang 20, 21. Thư mục `features/customer/`.
   - Ẩn cột "Mức rủi ro" khi không dòng nào có giá trị.
   - Chi tiết thêm khối "Hoạt động gần đây" (từ dòng thời gian hồ sơ) để lấp nửa dưới.
8. **Bước xác nhận quyết định ghi số một kiểu.** Ghi "55 tỷ đồng (55.000.000.000 đồng), bằng mức đề nghị". Chỗ: `features/loan-detail/DecisionModal.tsx`.
9. **Chi tiết nhỏ.**
   - Bảng Theo từng agent: chữ trong cột số dùng sans màu phụ.
   - Lịch sử chat: thêm dòng phụ (giờ hoặc khách hàng) khi tiêu đề trùng.
   - Keycloak có panel navy như trang đăng nhập của ứng dụng (theme ngoài `frontend/src`).

## Để lên 8,5 còn thiếu gì

Theo từng tiêu chí, so với điểm lần 6:

- **(1) Bản sắc, 8,5:** đạt. Giữ được khi sửa chip "Đạt" ở tab Chỉ số (việc 2). Keycloak có panel navy (việc 9) thì có thể lên 9.
- **(2) Phân cấp, 8,5:** đạt. Việc 4 (số đếm thống nhất) là điều kiện để giữ mức; nếu không, lần sau dễ tụt.
- **(3) Chữ, 8,5:** đạt. Việc 3 (dấu câu trích nguồn, "…", ngoặc lồng) làm cho chắc.
- **(4) Màu, 8,5:** đạt. Việc 2 (chip giãn) và việc 5 (một nhãn Validation) để giữ.
- **(5) Mật độ, 8,5:** đạt. Việc 2 (phân trang nhật ký) và việc 7 (khách hàng).
- **(6) Thành phần, 8,5:** đạt. Việc 2 (chip) và việc 8 (số ở bước xác nhận).
- **(7) AI và người, 8,5:** đạt. Việc 6 (Planner chiều trả kết quả) và việc 3 (gộp phát hiện trùng) để chắc.
- **(8) WCAG AA, 8,5:** mức trần khi không có trình đọc thật. Lên cao hơn cần kiểm bằng NVDA hoặc Orca.
- **(9) Văn phong, 7,5 → 8,5:** cần cả việc 3 và việc 5. Chỉ làm một việc thì lên khoảng 8,0.
- **(10) Hoàn thiện, 7,5 → 8,5:** cần cả việc 1 (e2e khỏi màn trình diễn) và việc 2 (AI_OCR, dscr, bảng 162 dòng). Việc 1 nằm ngoài frontend; không có việc 1 thì tiêu chí này giữ 7,5 dù frontend sạch.

**Ước tính:** làm xong việc 1–5 thì tiêu chí 9 và 10 lên 8,5. Trung bình khoảng 8,5. Muốn chắc qua ngưỡng cần thêm việc 6–8, đưa 1–2 tiêu chí lên 9: trung bình khoảng 8,6.

## Nếu chỉ còn một ngày: 5 việc đáng làm nhất

1. **Việc 1:** `reset-demo.sh` (hoặc e2e tự dọn) xóa mục tờ trình e2e và nhật ký chốt nguồn e2e trên hồ sơ seed. Một sửa, gỡ lỗi nặng nhất trên màn trình diễn.
2. **Việc 2:** `LogPanel.tsx` dịch `conflict_code` và phân trang; `format.ts` thêm `AI_OCR`; chip `MetricsPanel` không giãn. Khoảng 10 dòng mã.
3. **Việc 3:** bộ làm sạch chữ AI bỏ dòng "hiện tại: 0 đồng" và mảnh câu, gộp phát hiện trùng, sửa nhãn "Kiểm chứng của Validation" và dấu câu trích nguồn.
4. **Việc 4:** một nguồn đếm cho Việc của tôi.
5. **Việc 5 và 6, cùng nhỏ:** "Gia hạn bổ sung thêm 5 ngày LV"; một nhãn Validation; So sánh bỏ mã commit và dòng lặp; "Planner (điều phối)" ở chiều trả kết quả.

## Chưa kiểm chứng và chỗ brief sai

**Brief đúng**
- Kiểm cây tiếp cận ghi ở `docs/agent/review-ux.md`.
- `reset-demo.sh --warm` chạy sẵn 00187, 00163, 00167.

**Brief chưa nói**
- Sau `--warm` vẫn còn dữ liệu e2e cũ trên 00187: tờ trình và nhật ký chốt nguồn.
- Đây không phải do `g9` chạy song song: khối AI chụp trong khóa ngay sau warm, và chụp bổ sung ngoài khóa vẫn thấy cùng chữ.

**Không kiểm chứng được**
- **Chữ AI:** do LLM sinh nên có thể khác ở lượt sau. "0 đồng" thấy ở cả 00187, 00163 và 00167 trong lượt warm này.
- **Dấu vết (trang 24):** không có ảnh kiểm lại ô "Hiện 7 lượt nháp…"; giữ điểm lần 5.
- **Chat:** dùng 2/10 câu. Chưa kiểm câu trả lời có bảng hay rất dài.
- **Trình đọc màn hình:** không có trình đọc thật.
- **Phiên Hội đồng:** không chấm.
