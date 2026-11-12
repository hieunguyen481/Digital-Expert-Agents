# Chấm điểm ứng dụng thật, lần 5: thẩm mỹ và UX "Sổ Tín Dụng"

Giám khảo độc lập (crew `gu5`), ngày 13/11/2026, HEAD `import/duskdash` `be97c77`. Đích so sánh: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Thang điểm và ngưỡng giữ như lần 4 (`docs/design/cham-diem-ung-dung-lan-4.md`).

## Kết luận

**Điểm trung bình 10 tiêu chí: 8,10 / 10 (lần 4: 7,65). KHÔNG ĐẠT.**

- Ngưỡng là trung bình từ 8,5 và không tiêu chí nào dưới 7. Không tiêu chí nào dưới 7 (thấp nhất 7,5 ở văn phong và độ hoàn thiện), nhưng trung bình còn thiếu 0,40.
- Trung bình 33 trang (có tính Quản trị, không tính Phiên Hội đồng): **8,09**.
- Bước tiến thật so với lần 4:
  - Lưới 1920 đã thẳng hàng.
  - Khung tải giữ thanh bên và thanh trên.
  - Người Phê duyệt nay thấy kết luận AI "cần bổ sung" kèm TodoPanel vàng.
  - Vai chỉ đọc sạch: không còn nút ghi, KPI trùng hay "Việc của bạn".
  - Tiền tố loại tài liệu OCR đã bỏ.
  - Bảng "Theo từng agent" có dòng Planner và câu giải thích.
  - Câu thông báo, cỡ KPI, lý do khóa "Tải PDF", `h1` trang 403 và tên nút xóa đều đã sửa.
  - Đo máy: 0 tràn ngang, 0 chữ dưới AA, 0 nút tương phản thấp, mỗi trang đúng 1 `h1` và 1 `main`.
- Thứ giữ điểm dưới 8,5 là **phần chữ do AI và seed sinh ra, lộ thẳng lên màn chính**. Nó nằm ngay trên hồ sơ trình diễn 00187, 00163 và 00167, đúng chỗ giám khảo cuộc thi nhìn đầu tiên:
  - "vs";
  - "nếu có hit";
  - "Căn cứ: CẦN BỔ SUNG: … ; compliance_policy Điều 6";
  - markdown "##" trong trích nguồn;
  - "BCTC BCTC";
  - câu cắt giữa chữ "dư n";
  - số "VND" thô;
  - tên tài sản lộ "số minh họa".
- Thêm vào đó là các lỗi ngữ nghĩa màu:
  - chip Operations xanh "Đạt" trong khi câu ngay dưới nêu điều kiện trước giải ngân;
  - chip hạn xử lý ba màu cho cùng một loại thông tin.
- Hai trang khách hàng chưa được động tới từ lần 4.

## Cách chấm

- **Công cụ.** Playwright Chromium đăng nhập Keycloak thật cho từng vai. Bộ đo DOM gồm:
  - tràn ngang;
  - cỡ chữ nhỏ nhất;
  - tương phản chữ, tính trên màu thật có pha alpha qua các lớp cha;
  - tương phản chữ nút;
  - phần tử điều khiển không tên;
  - số `h1` và `main`;
  - quét chữ thô (`LA-`, mã `ABC ·`, `vs`, `0 đồng`, `VND`, dòng kết thúc bằng dấu hai chấm);
  - mục danh sách AI bắt đầu bằng chữ thường.
  - Script và ảnh ở `/tmp/gu5/` (`lib.cjs`, `run.cjs`, `st-*.cjs`, `summ.py`).
- **Vai đã chụp:** QHKH, HTTD (Hỗ trợ tín dụng), Thẩm định, Rủi ro/Tuân thủ, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị.
- **Cỡ màn:** 1366×768 và 1920×1080 cho mọi trang. Đăng nhập, Việc của tôi, chi tiết hồ sơ và dashboard có thêm 1280×800 và 1440×900.
- **Trạng thái đã xem:**
  - đang tải và lỗi tải hồ sơ (chặn API);
  - rỗng (đối chiếu khi hồ sơ không có tài liệu, hồ sơ đã chuyển người khác);
  - 403 và 404;
  - nút khóa kèm lý do;
  - hover hàng bảng;
  - focus bàn phím, Tab qua thanh bên, ô lọc, Segmented, Select, DatePicker, modal và ngăn kéo;
  - modal quyết định, cả bước chọn và bước xác nhận từ chối hoặc trả về;
  - ngăn kéo trace và Esc trả focus;
  - panel AI mở và đóng;
  - đội agent đang chạy;
  - chat có câu trả lời mới.
- **Dữ liệu và khóa:**
  - Pha A (02:35–02:43) chụp chỉ đọc, không giữ khóa. Giám khảo chức năng `g8` đã đổi dữ liệu trong lúc đó: 00187 đã duyệt, 00163 không có tài liệu.
  - Pha B (02:43–02:53) chạy trong `flock /tmp/do-an-e2e.lock`: `reset-demo.sh --warm` thoát 0, rồi chụp lại mọi trang cần lượt AI. Ảnh hậu tố `B` và các log `ai-*.log`, `ocr5.log` là ảnh sau đặt lại.
- **Mức dùng:**
  - 3/4 lượt đội agent, đều qua `--warm`: 00187 xong; 00163 và 00167 "Cần bổ sung".
  - Trạng thái đang chạy chụp ở giây thứ 3 của lượt warm: "Đã chạy 00:22 … 1/4 chuyên gia đã xong".
  - 1/10 câu chat, trả lời trong 13,5 giây.
  - Không gặp 402, không gặp lỗi "Failed to fetch dynamically imported module", không có `pageerror`.
- **Âm tính và dương tính giả đã loại trừ:**
  - Ô "không tên" do Antd tạo:
    - bản sao TEXTAREA autosize;
    - `ant-tabs-nav-more` ẩn;
    - `ant-input-clear-icon-hidden`.
  - Nút xóa ô chính sách có tên qua `span role=img aria-label="Xóa từ khóa"` bên trong.
  - Vòng focus của Select, DatePicker và Segmented nằm trên khung bọc, không nằm trên input bên trong. Đã chụp cắt để xác nhận: vòng navy 3px nhìn rõ.
  - Tab về `BODY` ở cuối trang ngắn là hết tài liệu, không phải lỗi.
- **Trình đọc màn hình:** máy không có trình đọc thật. Theo brief, thay bằng kiểm cây tiếp cận đã ghi. Ghi chú này nằm ở `docs/agent/review-ux.md` (commit `14ad5ec`), không phải `docs/design/` như brief viết.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 4 | Lần 5 | Căn cứ lần 5 |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 8,0 | **8,5** | **Được:** mọi trang dùng chung khung navy, logo "S", tiêu đề serif, nền giấy kem, nút chính vàng đồng, khối AI tím viền đứt (`v-q`, `v-s`, `v-u`, `v-w`). Đăng nhập Keycloak cùng ngôn ngữ. **Trừ:** chip hạn xử lý "còn N ngày LV" vàng hoặc xanh lá ở danh sách đối chiếu nhưng xanh dương ở Việc của tôi. Trang Quản trị vẫn là trang lạ: vào "/viec-cua-toi", nhãn "Việc của tôi", dải demo chỉ hiện cho vai này. |
| 2 | Phân cấp, hành động chính ở màn đầu | 7,5 | **8,0** | **Được:** người Phê duyệt có nút "Quyết định" vàng ở góc phải tiêu đề, kết luận AI serif đầu cột trái, TodoPanel vàng ở cột phải (`pheduyet-loan167-1366x768`). **Trừ:** <ul><li>câu kết luận 00163 dài 5 dòng, 00167 dài 4 dòng, có hai dấu hai chấm liền ("AI đề xuất: cần bổ sung trước khi quyết định: bổ sung BCTC…"); tiêu đề kết luận phải đọc được trong một lần liếc;</li><li>nút "Xử lý cờ: Kỳ thu tiền 150 ngày - vượt ngưỡng…" bị cắt và lặp nguyên tiêu đề cờ ngay trên nó (`tdinh-loan187-1920x1080`);</li><li>thẻ Hành động của nháp DX-2026-00412 chỉ có câu miễn trừ, không có nút hay việc kế tiếp.</li></ul> |
| 3 | Chữ và khả năng đọc tiếng Việt | 7,5 | **8,0** | **Được:** cỡ nhỏ nhất đạt, dấu tiếng Việt hiển thị đúng ở cả serif và sans, số tabular, mã hồ sơ mono thống nhất (`CodeText.tsx`). **Trừ:** <ul><li>tên seed "Pham Thu Ha" không dấu (Trưởng phòng, nhật ký, Quản trị);</li><li>"vs" ở tiêu đề cờ 00187 ("Dòng tiền HĐKD 2025: 93,2 vs 81,0 tỷ");</li><li>đoạn trích nguồn còn ký hiệu markdown "## CS-TD-SME/2025 §3.1";</li><li>câu bị cắt giữa chữ "… dư n" trong thẻ đề xuất 00187.</li></ul> |
| 4 | Màu và ngữ nghĩa trạng thái | 8,0 | **8,0** | **Được:** "Cần bổ sung" cam, "Đồng ý có điều kiện" có dấu hình thoi vàng; TodoPanel nay vàng khi AI nêu điểm cần bổ sung. **Trừ:** <ul><li>chip Operations vẫn xanh "Đạt" trong khi câu bên dưới ghi "Điều kiện bổ sung trước giải ngân: doanh nghiệp chưa có tài khoản thanh toán…" (00163, 00167, cả góc nhìn Kiểm toán, ngăn kéo trace). Quy tắc vàng của `7f2add3` chỉ xét `v.conditions?.length`, còn Operations đưa điều kiện vào câu tóm tắt nên quy tắc không bật (`AgentTeamPanel.tsx`);</li><li>màu chip hạn không thống nhất (tiêu chí 1);</li><li>pha A: hồ sơ đã duyệt vẫn mang chip "còn 2 ngày LV" (dữ liệu `g8`).</li></ul> |
| 5 | Mật độ, lưới, khoảng cách 1366 và 1920 | 7,5 | **8,5** | **Được:** 1920 ô tìm kiếm x=360 khớp `h1` x=360; 1366 ô tìm 282, `h1` 248 (cách hợp lý). 0 tràn ngang ở cả bốn cỡ. Cột giữa OCR đã có nội dung. Chi tiết hồ sơ 1920 cân hai cột. **Trừ:** <ul><li>chi tiết khách hàng còn nửa dưới trống ở 1366;</li><li>đối chiếu khi chưa có tài liệu có thẻ "Danh mục tài liệu" trống, chỉ có tiêu đề (`httd-ocr163B-1366x768`);</li><li>tab Dấu vết: ô "Hiện 7 lượt nháp…" rơi xuống dòng hai.</li></ul> |
| 6 | Thành phần và trạng thái | 8,0 | **8,5** | **Được:** khung tải giữ thanh bên và thanh trên; lỗi tải có "Thử lại"; trạng thái "Hồ sơ đã chuyển cho người khác" có minh họa và nút về Việc của tôi (`ruiro-loan187`); modal quyết định đủ bước, focus vào "Quay lại" ở bước xác nhận; ngăn kéo Esc trả focus; nút khóa có lý do ngay dưới. **Trừ:** <ul><li>lúc tải, ô tìm kiếm mất placeholder và thiếu avatar (nhảy nhẹ khi tải xong);</li><li>InputNumber trong modal có viền focus mảnh hơn các ô khác;</li><li>thẻ Hành động nháp rỗng (tiêu chí 2).</li></ul> |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 7,5 | **8,0** | **Được:** <ul><li>dashboard có sơ đồ "Mỗi lượt chạy theo sơ đồ này": Planner, bốn chuyên gia, Validation, rồi "Cấp phê duyệt: người quyết định, ngoài khung AI";</li><li>chip "AI đề xuất – chưa xác nhận" và "Người quyết định" có mặt trên mọi màn;</li><li>So sánh single với multi có câu nhận xét và cách đo;</li><li>người Phê duyệt có kết luận AI.</li></ul>**Trừ:** <ul><li>ngăn kéo trace gọi người giao việc là "Bộ chạy tác vụ → Operations · giao việc", trong khi sơ đồ ngay trên đó và dashboard gọi là "Planner (điều phối)". Giám khảo cuộc thi sẽ hỏi "Bộ chạy tác vụ là agent nào?" (`agentTrace.ts:11`);</li><li>bảng "Theo từng agent": Document "0 lượt tham gia" nhưng 74 lỗi và 401 lần gọi công cụ, đọc như mâu thuẫn dù có câu chú thích;</li><li>chip Operations xanh có điều kiện (tiêu chí 4).</li></ul> |
| 8 | Tiếp cận WCAG AA | 8,0 | **8,5** | **Được:** <ul><li>đo máy: 0 chữ dưới AA, 0 nút tương phản thấp;</li><li>"Xác nhận từ chối" trắng trên đỏ 7,03:1, "Trả lại bổ sung" 5,70:1;</li><li>vòng focus navy 3px ở mọi điều khiển đã thử, kể cả khung bọc Select/Segmented, đo 8,48:1 và 7,81:1 trong ngăn kéo;</li><li>Tab không thoát khỏi modal, Esc trả focus;</li><li>Keycloak có liên kết "Bỏ qua tới nội dung" và vòng focus trên ô mật khẩu và nút con mắt;</li><li>cây tiếp cận modal và ngăn kéo đã ghi (`docs/agent/review-ux.md`): dialog có tên, `aria-modal`, radiogroup "Loại quyết định" bốn radio có tên.</li></ul>**Trừ:** <ul><li>ngăn kéo trace không có heading cho từng agent, nên người dùng trình đọc không nhảy theo agent được;</li><li>InputNumber focus mảnh;</li><li>không có trình đọc thật nên không cho quá 8,5.</li></ul> |
| 9 | Văn phong UX | 7,5 | **7,5** | **Được:** câu thông báo, "Nháp chưa đánh số", câu TodoPanel ("Chưa có đề xuất AI. Chạy đội agent để có ý kiến tham khảo."), "AI nêu điểm cần bổ sung: xem khối Đội agent." đều tự nhiên. **Trừ** (các chỗ còn sót, phần lớn trên màn trình diễn):<ul><li>"Căn cứ: CẦN BỔ SUNG: thiếu dữ liệu chặn — Chưa có kết quả tra cứu CIC — …; compliance_policy Điều 6" (thẻ đề xuất 00163, 00167);</li><li>"nếu có hit" (00163);</li><li>"vs" (00187);</li><li>"Validation · Kiểm chứng của Validation:" lặp;</li><li>"BCTC BCTC";</li><li>"(trang 3)" đứng riêng;</li><li>"0 đồng" trong phát hiện Tuân thủ (thấy ở pha A);</li><li>"Chưa có Ý kiến Rủi ro" (viết hoa giữa câu);</li><li>"RETAIL-CREDIT-DEMO Chính sách tín dụng bán lẻ mẫu";</li><li>"So sánh single và multi" ở ô Lượt đo;</li><li>"Mã kỹ thuật" lửng cuối đoạn Cách đo;</li><li>TodoPanel trộn "Mở" và "Đi tới" cho cùng loại liên kết;</li><li>ô lọc nhật ký có placeholder "HSV-2026-…" trông như giá trị.</li></ul> |
| 10 | Độ hoàn thiện sản phẩm thật | 7,0 | **7,5** | **Được:** không vỡ bố cục, không `pageerror`, chuyển trang có khung tải giữ khung, `LA-` nháp đã ẩn. **Trừ:** <ul><li>số tiền "VND" thô chưa qua hàm định dạng chung ("Dư nợ 0 VND · ngoài bảng 0 VND", "80.000.000.000 VND" ở khối nhóm liên quan; "50.000.000.000 VND", "145.000.000.000 VND" ở bảng tài sản);</li><li>tên tài sản lộ chữ seed "tách từ dòng 78 tỷ, số minh họa";</li><li>chữ e2e "Chốt nguồn cfo (e2e 11)" trong đối chiếu 00187 (pha A, dữ liệu do e2e ghi);</li><li>mã `EMP-DEMO-…` và tên không dấu ở Quản trị;</li><li>câu cắt giữa chữ "dư n".</li></ul> |
|  | **Trung bình** | **7,65** | **8,10** | |

## Bảng từng trang

Ảnh ở `/tmp/gu5/<vai>-<trang>-<cỡ>.png`. Ảnh hậu tố `B` là ảnh sau đặt lại. Ảnh ghép `v-*.jpg` là ảnh thu nhỏ để xem.

| # | Trang hoặc trạng thái (vai) | Lần 4 | Lần 5 | Phải sửa (ảnh · phần tử · file nghi ngờ trong `frontend/src`) |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập Keycloak | 8,5 | 8,5 | Không còn việc lớn. Bố cục chia đôi navy, chú giải AI/người, có liên kết bỏ qua. |
| 2 | Khung: thanh bên, thanh trên, dải demo | 8,0 | 8,5 | 1) `pheduyet-loading-*`: ô tìm kiếm không có placeholder và thiếu avatar khi đang tải · `features/shell/` (khung tải của AppShell). 2) Dải demo chỉ hiện với Quản trị · `features/shell/`. |
| 3 | Việc của tôi (QHKH) | 8,5 | 8,5 | 1) `qhkh-home-*`: chip hạn "còn N ngày LV" xanh dương, khác danh sách đối chiếu · `features/my-work/QueueTable.tsx`. |
| 4 | Việc của tôi (Trưởng phòng) | 8,5 | 8,5 | 1) `truongphong-home-*`: tên "Pham Thu Ha" không dấu (dữ liệu seed, ngoài phạm vi frontend; ghi để chủ seed sửa). |
| 5 | Việc của tôi (Kiểm toán) | 7,5 | 8,5 | KPI 66 / 1 / 1 / 1 không trùng; nút hàng là "Xem". 1) Pha A: hồ sơ đã duyệt còn chip "còn 2 ngày LV" · `QueueTable.tsx`: ẩn chip hạn khi trạng thái là kết thúc. |
| 6 | Tìm kiếm (combobox) | 8,5 | 8,5 | Không có việc lớn. |
| 7 | Chi tiết hồ sơ HSV-00201 (QHKH, trả về) | 8,0 | 8,5 | 1) `qhkh-loanA-*`: TodoPanel trộn "Mở" và "Đi tới" · `features/loan-detail/TodoPanel.tsx`. |
| 8 | Chi tiết hồ sơ HSV-00187 (Thẩm định, kết quả AI) | 8,0 | **7,5** | 1) `tdinh-loan187-1920x1080`: nút "Xử lý cờ: Kỳ thu tiền 150 ngày - vượt ngưỡng…" cắt ở 35 ký tự và lặp tiêu đề cờ ngay trên nó · `features/loan-detail/ActionsPanel.tsx:157`. 2) Khối nhóm liên quan "Dư nợ 0 VND · ngoài bảng 0 VND", bảng tài sản "50.000.000.000 VND" và tên tài sản "tách từ dòng 78 tỷ, số minh họa" · `features/proposal/RelatedSection.tsx`, tab Tài sản trong `features/loan-detail/`, `features/loan-detail/format.ts`. 3) Cờ "93,2 vs 81,0 tỷ"; mục đề xuất "| Căn cứ cấp phê duyệt: … dư n" cắt giữa chữ; mục bắt đầu chữ thường "bổ sung lịch trả nợ…" · `features/dashboard/components/AiText.tsx` (`parseAiText`). |
| 9 | Chi tiết hồ sơ HSV-00176 (Rủi ro) | 7,5 | 7,5 | 1) `ruiro-loanA-*`: chồng nhiều câu "chưa…" rỗng ở cột phải · `TodoPanel.tsx`. 2) "Chưa có Ý kiến Tuân thủ" viết hoa giữa câu · `TodoPanel.tsx` hoặc `ActionsPanel.tsx`. |
| 10 | Chi tiết hồ sơ (Tuân thủ) | 7,5 | 7,5 | 1) `tuanthu-loanA-*`: cùng lỗi "Chưa có Ý kiến…". 2) Nhãn "Chỉ xem" nhưng không nói vì sao (chưa tới bước Tuân thủ) · `ActionsPanel.tsx`. |
| 11 | Chi tiết hồ sơ (HTTD) | 7,5 | 8,0 | Mã `LA-` nháp đã ẩn. 1) `httd-loanA-*`: TodoPanel "Mở"/"Đi tới" trộn · `TodoPanel.tsx`. |
| 12 | Chi tiết hồ sơ HSV-00163 (Phê duyệt, có lượt AI) | 6,5 | **7,5** | Đã có kết luận và TodoPanel vàng. 1) `pheduyet-loan163-1366x768`: kết luận 5 dòng có hai dấu hai chấm liền · `features/loan-detail/AgentTeamPanel.tsx`. 2) Thẻ đề xuất "Căn cứ: CẦN BỔ SUNG: … ; compliance_policy Điều 6", "nếu có hit" · `ActionsPanel.tsx` (cho đi qua `AiText`). 3) Chip Operations "Đạt" xanh kèm điều kiện · `AgentTeamPanel.tsx`. |
| 13 | Chi tiết hồ sơ HSV-00167 (Phê duyệt) | 6,5 | **7,5** | Nay có lượt AI sau warm. Cùng ba lỗi của dòng 12 (`pheduyet-loan167-1366x768`, kết luận 4 dòng). |
| 14 | Modal quyết định, bước chọn | 8,5 | 8,5 | 1) InputNumber focus viền mảnh · `features/loan-detail/DecisionModal.tsx`. |
| 15 | Modal quyết định, bước xác nhận | 8,5 | 8,5 | Không có việc lớn. |
| 16 | Đội agent đang chạy (00187) | 8,0 | 8,0 | "Đã chạy 00:22 … 1/4 chuyên gia đã xong" rõ. 1) Chỉ chụp được giây thứ 3. Câu phát hiện từng phần chưa kiểm lại đủ nên giữ điểm. |
| 17 | Tạo và soạn đề xuất (nháp DX-2026-00412) | 8,0 | 8,5 | KPI 80 / 12 cùng cỡ. 1) Mở nháp ở chi tiết hồ sơ: thẻ Hành động chỉ có câu miễn trừ · `ActionsPanel.tsx`: thêm "Tiếp tục soạn đề xuất". |
| 18 | Danh sách đối chiếu (HTTD) | 8,0 | 8,0 | 1) `httd-recon-listB-*`: "còn 1 ngày LV" vàng, "còn 2 ngày LV" xanh lá, khác Việc của tôi · `features/reconciliation/ReconciliationIndexPage.tsx`. |
| 19 | Chi tiết đối chiếu và OCR | 7,5 | 8,0 | Tiền tố đã bỏ; cột giữa có nội dung. 1) `httd-ocr163B-1366x768`: thẻ "Danh mục tài liệu" trống khi chưa có tài liệu · `features/reconciliation/ReconciliationPage.tsx`. 2) Danh mục lặp tên yêu cầu và tên tài liệu gần như trùng ("Điều lệ công ty" / "Điều lệ công ty (minh họa)") · cùng file. |
| 20 | Khách hàng | 7,5 | 7,5 | Chưa đổi. 1) `qhkh-customers-*`: "Mức rủi ro: Chưa xếp hạng" ở mọi dòng; ẩn cột khi cả trang chưa xếp hạng · `features/customers/CustomerListPage.tsx`. |
| 21 | Chi tiết khách hàng | 7,5 | 7,5 | Chưa đổi. 1) `qhkh-customer-detail-1366x768`: nửa dưới trống · `features/customers/CustomerDetailPage.tsx`. |
| 22 | Thông báo | 8,0 | 8,5 | Câu đã có mã hồ sơ; câu dữ liệu mẫu đã bỏ. Không có việc lớn. |
| 23 | Dashboard Tổng quan | 8,0 | 8,5 | Dòng Planner và câu chú thích đã có. 1) `qhkh-dash-y700-1366x768`: Document "0 lượt tham gia" mà 74 lỗi và 401 công cụ · `features/dashboard/components/` (bảng Theo từng agent). |
| 24 | Dashboard Dấu vết | 8,0 | 8,0 | 1) `qhkh-trace-1366x768`: ô "Hiện 7 lượt nháp chưa gọi công cụ" xuống dòng hai · `TracesTab.tsx`. |
| 25 | Ngăn kéo trace | 7,5 | 8,0 | 1) `qhkh-drawer-y700-1366x768`: "Bộ chạy tác vụ → Operations · giao việc" thay vì Planner · `features/dashboard/agentTrace.ts:11`. 2) Chip Operations "Xong" kèm "Đạt: … Điều kiện bổ sung trước giải ngân" không có màu điều kiện · `features/dashboard/components/CaseTrace.tsx`. |
| 26 | Dashboard So sánh | 8,5 | 8,5 | 1) `qhkh-compare-1366x768`: "So sánh single và multi" ở ô Lượt đo; "Mã kỹ thuật" lửng cuối đoạn Cách đo · `ComparisonTab.tsx:157`. |
| 27 | Trợ lý AI (chat) | 8,5 | 8,5 | Câu trả lời có nguồn, chip "AI đề xuất", câu miễn trừ. Không có việc lớn. |
| 28 | Panel AI trong hồ sơ | 8,0 | 8,0 | 1) Trích nguồn: "## CS-TD-SME/2025 §3.1", "BCTC BCTC", "(trang 3)", "Validation · Kiểm chứng của Validation:" · `AiText.tsx` và phần trích nguồn trong `features/loan-detail/AgentTeamPanel.tsx`. |
| 29 | Nhật ký kiểm toán | 7,5 | 8,0 | 1) `kiemtoan-audit-*`: placeholder "HSV-2026-…" trông như giá trị; đổi thành "Mã hồ sơ, ví dụ HSV-2026-00187" · `features/audit/AuditLogPage.tsx`. 2) Tên không dấu (seed). |
| 30 | Tra cứu chính sách | 8,0 | 8,0 | Nút xóa đã có tên. 1) "RETAIL-CREDIT-DEMO Chính sách tín dụng bán lẻ mẫu" · trang tra cứu chính sách (ẩn mã kỹ thuật, hoặc ẩn chính sách bán lẻ khỏi workbench doanh nghiệp). |
| 31 | 403 và 404 | 8,0 | 8,5 | `h1` "Không có quyền xem trang này". 1) Nhãn nhỏ "Nhật ký kiểm toán" mồ côi ở góc trên trái · trang 403. |
| 32 | Đang tải và lỗi | 7,5 | 8,0 | Khung giữ thanh bên và thanh trên. 1) Placeholder tìm kiếm và avatar thiếu khi tải (dòng 2). |
| 33 | Quản trị | 7,0 | 7,0 | Chưa đổi. 1) `quantri-home-*`: vào "/viec-cua-toi" với nhãn "Việc của tôi" và `h1` "Không có quyền xem nội dung nghiệp vụ"; cho Quản trị trang chủ riêng (bảng người dùng) · `routes`, `features/my-work/`. 2) `EMP-DEMO-…` và tên không dấu. |
| — | Phiên Hội đồng | — | không chấm | Ngoài phạm vi; mục "Phiên Hội đồng tín dụng" vẫn ở thanh bên vai Phê duyệt và Kiểm toán. |
|  | **Trung bình 33 trang** | 7,88 (32 trang) | **8,09** | |

## Kiểm lại lần 4

### 10 việc phải sửa

| # | Việc lần 4 | Kết quả | Bằng chứng lần 5 |
| --- | --- | --- | --- |
| 1 | Người Phê duyệt thấy kết luận AI; TodoPanel không xanh khi AI "Cần bổ sung"; mọi hồ sơ trong hàng chờ có lượt AI | **Đã sửa** | `pheduyet-loan167-1366x768`: kết luận serif "AI đề xuất: cần bổ sung trước khi quyết định…" và TodoPanel vàng "AI nêu điểm cần bổ sung… Chưa có điều kiện hệ thống nào chặn bước này." Cũng vậy với 00163. Hàng chờ 00167, 00163, 00170. 00167 có lượt AI sau `--warm`. Tồn: câu kết luận 4–5 dòng (việc mới số 3). |
| 2 | `parseAiText`: tách câu, "vs", "0 đồng", "Cần bổ sung thiếu dữ liệu chặn:", "—" | **Sửa một phần** | Đã sửa: chip "Cần bổ sung" kèm danh sách "Thiếu dữ liệu chặn:"; mục danh sách viết hoa đầu câu ở Validation. Còn sót: <ul><li>"vs" ở tiêu đề cờ và nút "Xử lý cờ" 00187;</li><li>"Căn cứ: CẦN BỔ SUNG: … — … ; compliance_policy Điều 6" ở thẻ đề xuất 00163 và 00167;</li><li>"nếu có hit";</li><li>"| Căn cứ cấp phê duyệt: … dư n";</li><li>mục chữ thường "bổ sung lịch trả nợ…";</li><li>"0 đồng" (pha A).</li></ul>Thẻ đề xuất và tiêu đề cờ chưa đi qua `AiText`. |
| 3 | Bỏ `LA-` bằng một hàm hiển thị mã dùng chung | **Đã sửa** | `components/common/CodeText.tsx` (`loanCodeLabel`, `LoanCode`, `CodeText`) dùng ở 9 màn. Nháp hiện "Nháp chưa đánh số" chữ xám thường. `LA-` còn lại đều là hồ sơ đã nộp (đã chốt, không tính lỗi). |
| 4 | Vai chỉ đọc: không nút ghi, không KPI trùng, không "Việc của bạn" | **Đã sửa** | `kiemtoan-loan187-1366x768`: nhãn "Chỉ đọc · Hành động", "Không có hành động nào cho vai trò của bạn ở bước này". KPI Kiểm toán 66/1/1/1. Nút hàng "Xem". |
| 5 | OCR: tiền tố loại tài liệu; cột giữa trống, khe 40px | **Đã sửa** | `httd-ocr187B-*`: danh mục chỉ còn tên tiếng Việt. Cột giữa có hộp "Chưa có ảnh trang…" và hướng dẫn chọn trường. Tồn nhỏ: thẻ danh mục trống khi hồ sơ không có tài liệu (`httd-ocr163B`). |
| 6 | Lưới 1920 | **Đã sửa** | `st-chk`: 1920 ô tìm x=360, `h1` x=360. |
| 7 | Khung tải giữ thanh trên và menu; skeleton dashboard | **Đã sửa** | `pheduyet-loading-*`: thanh bên đủ mục, thanh trên có ô tìm. Tồn nhỏ: ô tìm mất placeholder, thiếu avatar. |
| 8 | Bảng "Theo từng agent" | **Sửa một phần** | `qhkh-dash-y700`: dòng "Planner (điều phối)" ghi "điều phối", câu chú thích dưới bảng. Dòng "Hệ thống 0 0 0" đã bỏ. Còn: Document "0" lượt với 74 lỗi và 401 công cụ. |
| 9 | Văn phong: thông báo, "Thiếu Ý kiến…", dấu "." checklist, câu TodoPanel | **Sửa một phần** | Thông báo "Yêu cầu bổ sung: HSV-2026-00196", "Hồ sơ bị trả lại: HSV-2026-00201". Câu TodoPanel nháp đã đổi. Còn "Chưa có Ý kiến Rủi ro" và "Chưa có Ý kiến Tuân thủ" (vẫn viết hoa giữa câu, chỉ đổi "Thiếu" thành "Chưa có"). |
| 10 | Chi tiết: lý do "Tải PDF", cỡ KPI, liên kết TodoPanel thẳng hàng, tiêu đề bảng tài sản, cột rủi ro khách hàng, nửa trống chi tiết khách hàng, `h1` 403, tên nút xóa chính sách | **Sửa một phần** | <ul><li>Đã sửa: lý do dưới nút; KPI 80/12 cùng cỡ; liên kết thẳng cột; tiêu đề bảng tài sản không cắt; `h1` 403; nút xóa có tên.</li><li>Chưa sửa: cột "Mức rủi ro: Chưa xếp hạng" và nửa dưới trống ở chi tiết khách hàng.</li></ul> |

### Các gạch "Để lên 8,5 còn thiếu gì" của lần 4

| Tiêu chí | Gạch lần 4 | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
| 1 | Quản trị có trang riêng; một kiểu mã hồ sơ | Sửa một phần | Mã hồ sơ đã một kiểu (`CodeText.tsx`). Quản trị vẫn vào Việc của tôi (`quantri-home-*`). |
| 2 | Người Phê duyệt thấy kết luận AI ở màn đầu | Đã sửa | Dòng 1 bảng trên. Tồn: kết luận quá dài. |
| 3 | Câu AI tách sạch, không mảnh câu | Sửa một phần | Dòng 2 bảng trên. |
| 4 | TodoPanel và chip Operations đúng màu | Sửa một phần | TodoPanel vàng. Chip Operations vẫn xanh "Đạt" kèm điều kiện. |
| 5 | Lưới 1920; cột giữa OCR | Đã sửa | Dòng 5 và 6 bảng trên. |
| 6 | Khung tải; trạng thái rỗng có lời | Đã sửa | Dòng 7 bảng trên; "Hồ sơ đã chuyển cho người khác" (`ruiro-loan187`). |
| 7 | Bảng agent rõ; người Phê duyệt thấy AI | Sửa một phần | Planner rõ; còn "Bộ chạy tác vụ" ở ngăn kéo và Document "0 lượt". |
| 8 | Có căn cứ trình đọc màn hình | Đã có thay thế | Kiểm cây tiếp cận ở `docs/agent/review-ux.md` (brief chấp nhận). Không có trình đọc thật nên trần 8,5. |
| 9 | Câu thông báo, chữ hoa giữa câu, sót tiếng Anh | Sửa một phần | Thông báo đã sửa. Còn "Ý kiến", "vs", "hit", "single và multi". |
| 10 | Không lộ mã thô, `LA-`, "0 đồng" | Sửa một phần | `LA-` đã ẩn. Còn "VND" thô, "số minh họa", "e2e 11", `EMP-DEMO-`. |

Không thấy hồi quy nào so với lần 4: không tiêu chí và không trang nào tụt điểm vì lỗi mới do sửa.

## Danh sách việc phải sửa, theo mức ảnh hưởng tới điểm

1. **Cho mọi chữ AI hiển thị trên chi tiết hồ sơ đi qua một bộ làm sạch duy nhất** (tiêu chí 3, 9, 10; trang 8, 12, 13, 28).
   - **Chỗ:**
     - thẻ đề xuất trong `ActionsPanel.tsx` ("Căn cứ: CẦN BỔ SUNG: … ; compliance_policy Điều 6", "nếu có hit", "| Căn cứ cấp phê duyệt: … dư n");
     - tiêu đề cờ và nút "Xử lý cờ" (`ActionsPanel.tsx:157`, "vs");
     - trích nguồn (`AgentTeamPanel.tsx`: "##", "BCTC BCTC", "(trang 3)", "Validation · Kiểm chứng của Validation:").
   - **Vì sao:** đây là màn trình diễn chính; giám khảo đọc thấy ngay.
   - **Sửa thành:** gọi `parseAiText` hoặc `AiText` (`features/dashboard/components/AiText.tsx`) cho cả ba chỗ, rồi thêm quy tắc:
     - "vs" thành "so với";
     - nhãn trạng thái IN HOA ("CẦN BỔ SUNG:") thành chip;
     - khóa kỹ thuật `compliance_policy` thành "Chính sách tuân thủ";
     - "hit" thành "kết quả trùng";
     - bỏ tiền tố "#", gộp từ lặp liền nhau, ghép "(trang N)" vào nguồn đứng trước;
     - không cắt chuỗi giữa chữ: cắt theo câu, hoặc dùng "Xem đầy đủ".
   - **Kiểm:** chạy lại `st-ctx.cjs` với IDS 00187, 00163, 00167, kỳ vọng `vs|hit|compliance_policy|##| dư n$` bằng 0.
2. **Chip Operations "Đạt" có điều kiện phải vàng** (tiêu chí 4, 7; trang 12, 13, 25).
   - **Chỗ:** `AgentTeamPanel.tsx` (quy tắc của `7f2add3` chỉ xét `v.conditions?.length`) và `CaseTrace.tsx`.
   - **Vì sao:** Operations ghi điều kiện trong câu tóm tắt ("Điều kiện bổ sung trước giải ngân: …"), không ghi vào mảng `conditions`, nên chip vẫn xanh.
   - **Sửa thành:** coi là có điều kiện khi `conditions` khác rỗng HOẶC câu tóm tắt có "Điều kiện bổ sung", "trước giải ngân" hay "kèm điều kiện". Chip "Đạt, có điều kiện" vàng ở cả chi tiết hồ sơ lẫn ngăn kéo. Sửa gốc tốt hơn là cho agent Operations điền `conditions`; đó là backend, cần chủ backend đồng ý.
3. **Rút kết luận AI của người Phê duyệt còn tối đa 2 dòng** (tiêu chí 2, 7; trang 12, 13).
   - **Chỗ:** dòng serif đầu khối Đội agent, `AgentTeamPanel.tsx`.
   - **Sửa thành:** tiêu đề "AI đề xuất: cần bổ sung 3 việc trước khi quyết định". Đưa danh sách việc xuống gạch đầu dòng (đã có mẫu "Yêu cầu bổ sung và điều kiện" ở 00187). Bỏ dấu hai chấm thứ hai.
4. **Số tiền qua một hàm định dạng chung** (tiêu chí 10; trang 8).
   - **Chỗ:**
     - `features/proposal/RelatedSection.tsx` ("Dư nợ 0 VND · ngoài bảng 0 VND", "80.000.000.000 VND");
     - bảng tài sản trong tab Tài sản ("50.000.000.000 VND", "145.000.000.000 VND");
     - `CaseTrace.tsx`, `EnginePanel.tsx` (cùng có chuỗi VND).
   - **Sửa thành:** dùng hàm "tỷ đồng" đang dùng ở tiêu đề hồ sơ ("80 tỷ đồng"); 0 thì ghi "không có dư nợ". Tên tài sản lộ "tách từ dòng 78 tỷ, số minh họa" là dữ liệu seed: báo chủ seed, không che ở frontend.
5. **Ngăn kéo trace gọi đúng tên Planner** (tiêu chí 7; trang 25).
   - **Chỗ:** `features/dashboard/agentTrace.ts:11` (`orchestrator: 'Bộ chạy tác vụ'`).
   - **Sửa thành:** "Planner (điều phối)", trùng sơ đồ và bảng dashboard.
   - **Kiểm:** `qhkh-drawer-y700` có "Planner (điều phối) → Operations · giao việc".
6. **Thống nhất màu chip hạn xử lý** (tiêu chí 1, 4; trang 3, 5, 18).
   - **Chỗ:** `QueueTable.tsx` (xanh dương) và `ReconciliationIndexPage.tsx` (vàng hoặc xanh lá).
   - **Sửa thành:** một thành phần `DeadlineChip`: quá hạn đỏ, còn ≤ 1 ngày làm việc vàng, còn lại trung tính xám. Không dùng xanh lá, vì xanh lá nghĩa là "Đạt". Ẩn khi hồ sơ đã kết thúc.
7. **Trang khách hàng** (tiêu chí 5; trang 20, 21).
   - **Chỗ:** `CustomerListPage.tsx` (cột "Mức rủi ro: Chưa xếp hạng" mọi dòng) và `CustomerDetailPage.tsx` (nửa dưới trống ở 1366).
   - **Sửa thành:**
     - ẩn cột rủi ro khi cả trang chưa xếp hạng, hoặc ghi một câu ở đầu bảng;
     - chi tiết đặt "Hồ sơ vay của khách hàng" và "Dư nợ hiện hữu" thành hai cột dưới thẻ thông tin, hoặc đưa danh sách hồ sơ lên ngay dưới tiêu đề.
8. **Quản trị có trang chủ riêng** (tiêu chí 1; trang 33).
   - **Chỗ:** điều hướng sau đăng nhập, `routes` và `features/my-work/`.
   - **Sửa thành:**
     - vai Quản trị vào thẳng trang Quản trị;
     - `h1` "Quản trị người dùng";
     - bỏ nhãn "Việc của tôi";
     - mã `EMP-DEMO-…` đưa vào cột phụ chữ xám.
9. **Văn phong còn sót** (tiêu chí 9).
   - "Chưa có Ý kiến Rủi ro" thành "Chưa có ý kiến Rủi ro" (`TodoPanel.tsx`, `ActionsPanel.tsx`).
   - TodoPanel dùng một động từ "Mở" cho mọi liên kết.
   - Ô Lượt đo: "So sánh đội agent và mô hình đơn lẻ" thay cho "single và multi" (nhãn lượt đo từ backend, hoặc ánh xạ ở `ComparisonTab.tsx`).
   - "Mã kỹ thuật" lửng thành liên kết "Xem mã kỹ thuật" hoặc đặt trong "Chi tiết kỹ thuật (kiểm toán)" sẵn có (`ComparisonTab.tsx:157`).
   - Placeholder nhật ký: "Mã hồ sơ, ví dụ HSV-2026-00187" (`AuditLogPage.tsx`).
   - Ẩn "RETAIL-CREDIT-DEMO" ở tra cứu chính sách.
10. **Chi tiết trau chuốt** (tiêu chí 2, 5, 6).
    - Nút "Xử lý cờ" không lặp tiêu đề cờ: nút ghi "Xử lý cờ này" và đặt `aria-label` đầy đủ (`ActionsPanel.tsx:157`).
    - Thẻ Hành động của nháp có nút "Tiếp tục soạn đề xuất".
    - Thẻ "Danh mục tài liệu" khi chưa có tài liệu ghi "Chưa có tài liệu" (`ReconciliationPage.tsx`).
    - Khung tải giữ placeholder ô tìm và chỗ avatar.
    - InputNumber trong modal có vòng focus 3px như các ô khác.
    - Ngăn kéo trace có heading (h3) cho từng agent.
    - Bảng "Theo từng agent": Document ghi số lượt theo tác vụ đọc tài liệu, hoặc "không giao" kèm chú thích, thay cho "0".

## Để lên 8,5 còn thiếu gì

Theo từng tiêu chí, so với điểm lần 5:

- **(1) Bản sắc, nhất quán, 8,5:** đạt mức. Giữ được khi làm việc 6 (một kiểu chip hạn) và việc 8 (Quản trị có trang riêng); nếu không, lần sau dễ tụt.
- **(2) Phân cấp, 8,0 → 8,5:**
  - việc 3 (kết luận tối đa 2 dòng);
  - nút "Xử lý cờ" không lặp và không cắt;
  - thẻ Hành động nháp có việc kế tiếp.
- **(3) Chữ tiếng Việt, 8,0 → 8,5:**
  - việc 1 (hết "vs", "##", câu cắt giữa chữ);
  - tên seed có dấu (chủ seed).
- **(4) Màu và ngữ nghĩa, 8,0 → 8,5:**
  - việc 2 (chip Operations vàng khi có điều kiện);
  - việc 6 (chip hạn một bộ màu, ẩn khi hồ sơ đã kết thúc).
- **(5) Mật độ, lưới, 8,5:** đạt. Việc 7 (chi tiết khách hàng) và thẻ danh mục trống làm cho chắc.
- **(6) Thành phần, 8,5:** đạt. Placeholder và avatar trong khung tải, focus InputNumber.
- **(7) AI và người, 8,0 → 8,5:**
  - việc 5 ("Planner" thống nhất ở ngăn kéo);
  - việc 2 (chip Operations);
  - việc 3 (kết luận ngắn);
  - Document trong bảng agent không còn "0 lượt".
- **(8) WCAG AA, 8,5:** đạt mức trần khi không có trình đọc thật. Lên cao hơn cần:
  - kiểm bằng NVDA hoặc Orca;
  - heading cho từng agent trong ngăn kéo;
  - focus InputNumber.
- **(9) Văn phong, 7,5 → 8,5:**
  - việc 1 (chữ AI sạch);
  - việc 9 (sót "Ý kiến", "Mở/Đi tới", "single và multi", "Mã kỹ thuật", placeholder, "RETAIL-CREDIT-DEMO").
  - Phải đạt cả hai việc; chỉ một việc chỉ lên khoảng 8,0.
- **(10) Hoàn thiện, 7,5 → 8,5:**
  - việc 4 (VND thô);
  - việc 1 (câu cắt);
  - dữ liệu seed và e2e không lộ lên màn trình diễn: "số minh họa", "Chốt nguồn cfo (e2e 11)", `EMP-DEMO-`. Phần này cần chủ seed, hoặc `reset-demo.sh` dọn ghi chú e2e.

**Ước tính:** làm xong việc 1–6 thì tiêu chí 2, 3, 4, 7 lên 8,5 và 9, 10 lên khoảng 8,0–8,5. Trung bình khi đó vào khoảng 8,4–8,6. Muốn chắc qua ngưỡng cần thêm việc 7–9.

## Nếu chỉ còn một ngày: 5 việc đáng làm nhất

1. Việc 1: một bộ làm sạch chữ AI cho thẻ đề xuất, tiêu đề cờ và trích nguồn. Ảnh hưởng 3 tiêu chí và 4 trang trình diễn.
2. Việc 2: chip Operations "Đạt, có điều kiện" vàng ở chi tiết và ngăn kéo.
3. Việc 3: kết luận AI cho người Phê duyệt tối đa 2 dòng, danh sách việc xuống gạch đầu dòng.
4. Việc 4: số tiền qua hàm định dạng chung, hết "VND" thô.
5. Việc 5 và 6, cùng nhỏ: "Planner (điều phối)" ở ngăn kéo; một `DeadlineChip` dùng chung.

## Chưa kiểm chứng và chỗ brief sai

- **Brief sai một chỗ:** ghi chú kiểm cây tiếp cận nằm ở `docs/agent/review-ux.md`, không phải trong `docs/design/`.
- **Pha A chụp không giữ khóa:** `g8` đặt lại dữ liệu trong lúc chụp (00187 đã duyệt, 00163 không có tài liệu). Mọi kết luận về khối AI lấy từ pha B (sau `--warm`, trong khóa).
- **Chữ ghi theo pha A:** "0 đồng", "Chốt nguồn cfo (e2e 11)" và chip hạn trên hồ sơ đã duyệt là chữ thấy ở pha A. Sau warm chưa thấy lại "0 đồng". Đây là chữ do LLM sinh nên có thể xuất hiện lại ở lượt khác; không chắc chắn.
- **Đang chạy:** trạng thái đang chạy chỉ chụp ở một thời điểm (giây thứ 3). Phát hiện từng phần lúc chạy giữa chừng chưa được kiểm đủ (trang 16 giữ 8,0).
- **Chat:** chỉ hỏi 1/10 câu nên chưa kiểm câu trả lời dài, bảng hay trích nhiều nguồn.
- **Trình đọc màn hình:** không có trình đọc thật. Tiêu chí 8 dựa trên đo máy, kiểm bàn phím và cây tiếp cận đã ghi.
