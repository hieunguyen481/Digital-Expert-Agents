# Chấm điểm ứng dụng thật, lần 8: thẩm mỹ và UX theo thiết kế "Sổ Tín Dụng"

Giám khảo độc lập (Opus). Ngày 13/11/2026. Mã chấm: `import/duskdash` tại `2b0abad`, cùng mã đang chạy ở web 3000.
Đích: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Lần 7: `docs/design/cham-diem-ung-dung-lan-7.md` (8,45, KHÔNG ĐẠT).

## Kết luận

**Trung bình 10 tiêu chí: 8,55. ĐẠT.** Ngưỡng: trung bình từ 8,5 và không tiêu chí nào dưới 7.

- Không tiêu chí nào dưới 8. Thấp nhất là (9) văn phong, 8,0.
- Trung bình 33 trang: 8,61. Phiên Hội đồng không chấm, không tính.
- Đạt sát ngưỡng. Phần lớn điểm nhích lên nhờ ba việc của lần 7:
  - ngăn kéo hết chuỗi cổng thô;
  - Keycloak cùng bố cục với trang đăng nhập;
  - trình xem tài liệu có khung văn bản trích xuất, tô vùng giá trị, cột giữa dính khi cuộn.
- Phần còn yếu vẫn là **chữ do AI sinh khi hiện ra màn hình**, ở đúng hai chỗ giám khảo cuộc thi đọc kỹ nhất:
  - ngăn kéo dấu vết 00187: nhãn lặp "Điều kiện trước giải ngân: Điều kiện trước giải ngân:" ×3, dòng mồ côi ", cấp xác nhận: Cấp 2 Hội sở", mọi mục đánh số "1.", "giữ checkpoint";
  - thẻ đề xuất ở chi tiết hồ sơ 00187.
- Một lỗi mới lộ cú pháp thô: panel Trợ lý AI in nguyên dấu gạch dưới markdown "_Dựa trên kết quả phân tích lúc …_".
- Biên rất mỏng. Một hồi quy ở (9) hoặc (10) xuống 8,0 là trung bình về 8,5; xuống 7,5 là trượt. Nên làm việc 1–3 dưới đây trước khi trình diễn.

## Cách chấm

- Đăng nhập Keycloak thật bằng 9 vai (QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị) và không vai. Bộ đo Playwright ở `/tmp/gu8/` (`run.sh`, `lib.cjs`, `st-*.cjs`, `ai8.sh`, `phaseA8.sh`). Ảnh đặt tên `<vai>-<trang>-<cỡ>.png`; ảnh ghép xem nhanh `v-*.jpg`.
- Cỡ: 1366×768 và 1920×1080 cho mọi trang. Thêm 1280×800 và 1440×900 cho đăng nhập, Keycloak, Việc của tôi, chi tiết hồ sơ, dashboard.
- Khối AI chụp trong **một khóa** `flock /tmp/do-an-e2e.lock` cùng `infra/scripts/reset-demo.sh --warm`:
  - khóa từ 13:13:21 tới 13:26:14; warm xong 13:15:45;
  - kết quả warm: 00187 Chờ phê duyệt, 00163 và 00167 Cần bổ sung.
- Lượt đội agent: 3, của warm. Không chạy thêm lượt nào. Trạng thái đang chạy chụp trong lúc warm, ở 2 mốc: 3 giây và 22 giây.
- Chat: 3 câu (2 ở trang chat, 1 ở panel). Không gặp 402.
- Không gặp lỗi vite "Failed to fetch dynamically imported module". Không có `PAGEERROR`.
- Bộ đo DOM trên mọi trang:
  - tương phản tính trên màu thật, có pha alpha qua lớp cha;
  - tràn ngang;
  - cỡ chữ nhỏ nhất;
  - điều khiển không tên;
  - vòng focus của từng điểm dừng Tab.
- Ngăn kéo dấu vết kiểm bằng toàn văn: `grep` trên `drawer-00163.txt`, `drawer-00167.txt`, `drawer-00187.txt`.
- Không bấm hành động ghi nào trên hồ sơ seed. Modal quyết định chỉ mở, đi tới bước xác nhận rồi "Quay lại" và Esc.

### Bẫy đã gặp (bổ sung cho lần 7)

- Keycloak báo "1.12 white on 241,242,238 'Sổ Tín Dụng'". Đây là dương tính giả: nền navy của panel nằm trên phần tử anh em, bộ đo không thấy. Nhìn ảnh thì chữ trắng trên navy, khoảng 14:1.
- Vòng focus của nút "Quay lại" ở bước xác nhận:
  - mở modal bằng chuột: `NO-RING`, đúng `:focus-visible`, không phải lỗi;
  - mở bằng phím Enter: 3px, 8,48:1 (`st-back.cjs`).
  - Muốn kiểm vòng focus thì phải mở bằng bàn phím.
- `grep -i "0,0 tỷ"` khớp nhầm với "80,0 tỷ". Phải tìm " 0,0 tỷ" (có dấu cách đứng trước) và phân biệt hoa thường.
- Panel AI mở cuộc trò chuyện mới nhất của hồ sơ. Trên 00187, cuộc đó còn câu thử "Thời tiết Hà Nội hôm nay thế nào?" và một tin cũ dạng "80,000,000,000 VND · Pending Approval". Mã hiện tại không sinh câu đó: `grep` "Kết luận của hội đồng agent" trong `backend/app` và `agent_engine` ra 0 dòng. `reset-demo.sh --warm` cũng không xóa nó. Đây là dữ liệu thử cũ nên không trừ điểm giao diện; xem việc 7.
- Các dương tính giả của lần 7 vẫn còn: `ant-tabs-nav-more`, `ant-input-clear-icon-hidden`, TEXTAREA autosize, Segmented "1,67", INPUT bên trong Select/DatePicker có vòng trên khung bọc 3px.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 7 | Lần 8 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 8,5 | **9,0** | **Được:** <ul><li>Keycloak nay cùng bố cục với trang đăng nhập (`none-kc-1366x768`): logo "S" góc trên trái, tiêu đề serif "Mỗi hồ sơ vay có một người chịu trách nhiệm.", đường kẻ sổ, lề đỏ, luồng "AI đề xuất → Chuyên viên xem và sửa → Người có thẩm quyền quyết định", hộp tím viền đứt.</li><li>Trình xem tài liệu có khung "Bản văn bản trích xuất, không phải ảnh gốc" và vùng tô vàng đồng, đúng ngôn ngữ của mockup (`v-ocr.jpg`).</li><li>9 vai cùng một khung.</li></ul>**Trừ:** <ul><li>Panel Keycloak rộng 574px, trang ứng dụng 716px.</li><li>Keycloak thiếu ba thẻ "AI đề xuất / Người quyết định / sơ đồ đội agent".</li><li>Ở cả hai trang, mũi tên luồng rơi xuống cuối dòng.</li></ul> |
| 2 | Phân cấp, hành động chính ở màn đầu | 8,5 | **8,5** | **Được:** <ul><li>Việc của tôi QHKH khớp số ở ba chỗ: phụ đề "1 quá hạn · 2 bị trả lại · 1 chờ bổ sung", Segmented và KPI "1 Hồ sơ quá hạn".</li><li>Vai chỉ xem thấy một dòng "Chỉ xem. …" thay cho khung AI lớn.</li><li>Nút "Quyết định" vàng đồng ở góc trên phải, cả ở 1280.</li></ul>**Trừ:** <ul><li>Thẻ đề xuất 00187: mỗi thẻ lặp cùng ba trích nguồn §3.1, §4.1, §6.1, tổng khoảng 12 dòng nhiễu đẩy nút hành động xuống dưới.</li><li>Danh sách "Yêu cầu khách bổ sung 3 mục" lẫn việc nội bộ: "Đối chiếu lịch trả nợ và xác nhận DSCR".</li></ul> |
| 3 | Chữ và khả năng đọc tiếng Việt | 8,5 | **8,5** | **Được:** <ul><li>Số thập phân kiểu Việt trong chữ AI ("80,0 tỷ", "≈ 1,76", "55,2").</li><li>Mã `LA-…` và `HSV-…` không xuống dòng.</li><li>Serif và sans hiển thị dấu đúng.</li></ul>**Trừ:** <ul><li>Ngăn kéo `drawer-00163.txt:157` ghi "doanh thu năm ≤ 1,000 tỷ đồng": dấu phẩy nghìn kiểu Anh, người Việt đọc thành "1 tỷ"; cùng dòng có "SME KHDN SME".</li><li>Ghi nhiều kiểu trong cùng một màn: "Cấp 2 Hội sở" và "cấp 2 Hội sở", "cấp Cấp 2 Hội sở", "80,0 tỷ" và "80 tỷ".</li><li>"Thiếu dữ liệu bắt buộc, Chưa có kết quả…" viết hoa sau dấu phẩy.</li></ul> |
| 4 | Màu và ngữ nghĩa trạng thái | 8,5 | **8,5** | **Được:** <ul><li>Chip quá hạn đổi sang viền đỏ không nền, hết hai khối đỏ cạnh nhau ở Trưởng phòng.</li><li>Chip đội agent đang chạy phân biệt rõ: "Credit: Đang chạy" tím, "Compliance: Xong" xanh, "Validation: Chờ" xám (`v-run.jpg`).</li><li>Validation ghi một kiểu "Cần bổ sung · Thiếu dữ liệu bắt buộc".</li></ul>**Trừ:** <ul><li>Quản trị: mọi chip vai cùng màu xám, cả "Cấp phê duyệt" và "Kiểm toán nội bộ".</li><li>Chi tiết 00176 của vai Tuân thủ ghi "Ý kiến rủi ro · hạn 12/11/2026" không có dấu quá hạn, trong khi Việc của tôi ghi "quá hạn 1 ngày LV".</li></ul> |
| 5 | Mật độ, lưới, khoảng cách 1366 và 1920 | 8,5 | **8,5** | **Được:** <ul><li>0 tràn ngang và 0 chữ dưới AA ở bốn cỡ, trên mọi trang đã đo.</li><li>Tab Chỉ số vai Kiểm toán dùng hết bề ngang.</li><li>Trình xem tài liệu ba cột cân, cột giữa dính khi cuộn (`httd-ocr187B-y700`).</li></ul>**Trừ:** <ul><li>Khách hàng trang 1: cột "Mức rủi ro" toàn "—" mà vẫn chiếm chỗ.</li><li>Thẻ đề xuất 00187 dài gấp đôi cần thiết vì trích nguồn lặp.</li><li>Tra cứu chính sách ở 1366: nửa dưới trống khi chỉ có một kết quả. Chấp nhận được.</li></ul> |
| 6 | Thành phần và trạng thái | 9,0 | **9,0** | **Được:** <ul><li>Đủ trạng thái và đều sạch: tải (khung xương), lỗi có "Thử lại", 404, 403, rỗng, đang chạy 2 mốc.</li><li>Modal hai bước; bước xác nhận ghi "55 tỷ đồng (55.000.000.000 đồng), bằng mức đề nghị"; Esc trả focus về nút "Quyết định" (7,82:1).</li><li>Panel AI có chip hồ sơ "HSV-2026-00187"; Esc trả focus về nút "Trợ lý AI" (14,64:1).</li></ul>**Trừ:** <ul><li>Ngăn kéo ghi "Chờ kết quả của: Credit, Compliance, Operations" trên thẻ Validation đã "Xong".</li></ul> |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 8,5 | **8,5** | **Được:** <ul><li>Sơ đồ "Planner → Credit · Compliance · Operations · Document → Validation → Cấp phê duyệt, người quyết định, ngoài khung AI" có ở đăng nhập, Keycloak, dashboard, chi tiết hồ sơ.</li><li>Panel ghi "Kết quả đội agent · Chờ người quyết định · agent không tự phê duyệt".</li><li>Ngăn kéo hết chuỗi cổng thô: `grep -cE "CẦN BỔ SUNG\|dữ liệu chặn\|challenge\| 0,0 tỷ\|[Cc]redit và compliance"` ra 0 ở cả ba file.</li><li>So sánh: thẻ tím "Đội agent (6 agent) 70,7% ± 15,7%" cạnh thẻ trắng "Mô hình đơn lẻ"; dòng nhận xét rõ.</li></ul>**Trừ:** <ul><li>Ngăn kéo 00163 lặp cùng nội dung cổng khoảng 6 lần: dòng trao đổi, "Diễn giải cho người duyệt", "Đội agent đề nghị bổ sung", thẻ Validation, mục hành động 1, trích nguồn.</li><li>"Người quyết định" in hai dòng liền nhau (`drawer-00163.txt:145–146`).</li><li>Dòng mồ côi ", cấp xác nhận: Cấp 2 Hội sở" (`drawer-00187.txt:123`).</li></ul> |
| 8 | Tiếp cận WCAG AA | 8,5 | **8,5** | **Được:** <ul><li>0 chữ dưới AA.</li><li>Vòng focus 3px navy: 8,48:1 trên giấy, 7,82:1 trên nền xám.</li><li>Nút "Quay lại" ở bước xác nhận có vòng khi mở bằng bàn phím (8,48:1).</li><li>Keycloak: viền ô 19,03:1, nút hiện mật khẩu 14,64:1.</li><li>Panel AI: nút đóng có tên "Đóng Trợ lý AI".</li></ul>**Trần:** <ul><li>Không có trình đọc màn hình thật; chỉ kiểm cây tiếp cận (đã chốt).</li><li>Dải mục chi tiết hồ sơ không dùng `role=tab` (đã biết từ lần 7).</li></ul> |
| 9 | Văn phong UX | 8,0 | **8,0** | **Đã sửa:** <ul><li>Hết "CẦN BỔ SUNG", "dữ liệu chặn", "challenge", "Credit và compliance", " 0,0 tỷ".</li><li>"Thiếu dữ liệu bắt buộc" ở mọi nơi.</li><li>Trích nguồn thẻ đề xuất hết lặp nhãn ("§3.1 – Thẩm quyền phê duyệt: Theo…").</li><li>Chat: thẻ "Câu trả lời là tham khảo. Số liệu chính thức xem ở hồ sơ.", "dư nợ hiện hữu tại ngân hàng".</li><li>Thông báo luôn kèm mã; Dấu vết "45 tỷ đồng · 12 tháng".</li></ul>**Còn:** <ul><li>Ngăn kéo 00187: "Điều kiện trước giải ngân: Điều kiện trước giải ngân: …" ×3 (`grep -c` = 3); thẻ đề xuất ở chi tiết hồ sơ lặp nhãn tương tự.</li><li>"Quá SLA phê duyệt — đã nhắc người duyệt, giữ checkpoint"; "Tính lại Nợ vay/EBITDA sau cấp TD".</li><li>"Yêu cầu bổ sung tài liệu: Yêu cầu khách bổ sung 5 mục" nhưng chỉ có một dòng căn cứ.</li><li>Trích nguồn 00163/00167 "Validation · Kiểm chứng: “độc lập bằng công cụ: …”": nhãn cắt giữa cụm.</li><li>Nhật ký: hành động vai Tuân thủ ghi chung "Ghi ý kiến rủi ro, tuân thủ".</li></ul> |
| 10 | Độ hoàn thiện sản phẩm thật | 8,0 | **8,5** | **Đã sửa:** <ul><li>Ngăn kéo hết chuỗi thô.</li><li>Keycloak dựng lại.</li><li>Trình xem tài liệu có văn bản trích xuất.</li><li>Mã không gãy dòng.</li><li>Bố cục ổn ở bốn cỡ.</li><li>Đang chạy chuyển mốc mượt.</li></ul>**Còn:** <ul><li>Panel AI in nguyên "_Dựa trên kết quả phân tích lúc 13:14 13/11/2026. Gõ “phân tích lại” …_" (`v-pan.jpg`): `parseMarkdown.ts:46` chỉ nhận `*…*`, không nhận `_…_`.</li><li>Dòng mồ côi bắt đầu bằng dấu phẩy trong ngăn kéo.</li><li>Mọi mục hành động đánh số "1.".</li></ul> |

**Trung bình:** (9,0 + 8,5 × 7 + 9,0 + 8,0) / 10 = 85,5 / 10 = **8,55**.

## Bảng từng trang

Ảnh ở `/tmp/gu8/`.

| # | Trang (vai) | Lần 7 | Lần 8 | Điểm phải sửa (ảnh · phần tử · `file`) |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập và Keycloak (không vai) | 8,5 | 9,0 | `none-kc-1366x768`: panel 574px so với 716px ở `none-login`; thiếu ba thẻ AI/người/sơ đồ. Mũi tên luồng rơi cuối dòng ở cả hai trang (`infra/keycloak/theme/so-tin-dung/login/resources/css/so-tin-dung.css`; `frontend/src/pages/LoginPage.tsx`). |
| 2 | Khung: thanh bên, thanh trên, dải demo | 9,0 | 9,0 | Mục "Phiên Hội đồng tín dụng" ở vai Phê duyệt và Kiểm toán chưa làm (ngoài phạm vi, không trừ). |
| 3 | Việc của tôi (QHKH) | 8,5 | 9,0 | `qhkh-home-1366x768`: số khớp ba chỗ; chip quá hạn dạng viền. Không có lỗi. |
| 4 | Hồ sơ của phòng (Trưởng phòng) | 8,5 | 9,0 | `truongphong-home-1366x768`: chip hạn đã đổi sang viền. Tên người giữ "Phạm Thu Hà" lẫn giữa các tên "…Mẫu" là dữ liệu seed, không trừ. |
| 5 | Hồ sơ vay chỉ đọc (Kiểm toán) | 8,5 | 9,0 | Tab Chỉ số đã dùng hết bề ngang. Không có lỗi. |
| 6 | Tìm kiếm | 8,5 | 8,5 | `qhkh-search-*`: không có lỗi mới. |
| 7 | 00201 (QHKH, bị trả lại) | 8,5 | 8,5 | Không có lỗi mới. |
| 8 | 00187 (Thẩm định) | 8,0 | 8,0 | <ol><li>`v-l187.jpg` thẻ "Điều kiện trước giải ngân": tiêu đề lặp nhãn. Bỏ `<b>{KIND_LABEL}</b>:` khi `title` đã bắt đầu bằng nhãn (`features/agent-actions/ActionProposals.tsx:136`).</li><li>Mỗi thẻ đề xuất lặp ba trích nguồn §3.1, §4.1, §6.1. Gom trích nguồn chung một lần ở cuối khối, mỗi thẻ chỉ giữ nguồn riêng (`ActionProposals.tsx`).</li><li>"Yêu cầu khách bổ sung 3 mục": mục 3 ghép hai ý; "Đối chiếu lịch trả nợ và xác nhận DSCR" là việc nội bộ. Lọc việc nội bộ ra khỏi danh sách gửi khách (bộ làm sạch `features/dashboard/agentTrace.ts`).</li></ol> |
| 9 | Chi tiết hồ sơ (Rủi ro) | 8,5 | 8,5 | Không có lỗi mới. |
| 10 | Chi tiết hồ sơ (Tuân thủ) | 8,5 | 8,5 | `tuanthu-loanA-1366x768`: dòng "Ý kiến rủi ro · hạn 12/11/2026" thiếu dấu quá hạn mà Việc của tôi có. Dùng chung `Deadline` chip (`features/my-work/` thành phần hạn; `features/loan-detail/` dòng bước). |
| 11 | Việc của tôi và kiểm tra (HTTD) | 8,5 | 8,5 | Không có lỗi mới. |
| 12 | 00163 (Phê duyệt) | 8,5 | 8,5 | `full-tdinh-13.txt`: trích nguồn "Validation · Kiểm chứng: “độc lập bằng công cụ: …”" cắt nhãn giữa cụm. Lấy nhãn tới dấu ":" đầu tiên sau cụm danh từ, hoặc ghi "Validation · Kiểm chứng độc lập bằng công cụ: …" (`agentTrace.ts` hàm tách nhãn trích nguồn). |
| 13 | 00167 (Phê duyệt) | 8,5 | 8,5 | Như trang 12. |
| 14 | Modal quyết định, bước chọn | 9,0 | 9,0 | Không có lỗi. |
| 15 | Modal quyết định, bước xác nhận | 9,0 | 9,0 | "Quay lại" có vòng focus khi mở bằng bàn phím (`back.log`). Không có lỗi. |
| 16 | Đội agent đang chạy | 8,5 | 9,0 | `tdinh-running1/2-y500`: hai mốc, chip chuyển "Compliance: Đang chạy → Xong", số sự kiện 28 → 30. Không có lỗi. |
| 17 | Tạo và soạn đề xuất | 8,5 | 8,5 | `qhkh-compose-1366x768`: không có lỗi mới. |
| 18 | Danh sách đối chiếu (HTTD) | 8,5 | 8,5 | `httd-recon-list-1366x768`: không có lỗi mới. |
| 19 | Chi tiết đối chiếu 00187 | 8,0 | 8,5 | `httd-ocr187B-1366x768`: khung văn bản trích xuất chỉ có 4 dòng của trang CIC, tô vàng đồng, cột giữa dính. Còn thiếu: chọn một trường ở cột phải không cuộn khung giữa tới vùng tô tương ứng (`features/reconciliation/`). |
| 20 | Danh sách khách hàng | 8,0 | 8,0 | `qhkh-customers-1366x768`: cột "Mức rủi ro" toàn "—" ở trang 1; ghi chú ở `CustomerListPage.tsx:55` không đủ. Ẩn cột khi cả trang không có giá trị, hoặc sắp khách có xếp hạng lên đầu (phần sắp này đã bị gỡ ở `0c2949c`) (`features/customers/CustomerListPage.tsx:55,70`). |
| 21 | Chi tiết khách hàng | 8,5 | 8,5 | Không có lỗi mới. |
| 22 | Thông báo | 8,5 | 9,0 | Tiêu đề luôn kèm mã ("Hồ sơ bị trả lại: HSV-2026-00201"). Không có lỗi. |
| 23 | Dashboard, Tổng quan | 8,5 | 8,5 | `qhkh-dash-1366x768`: không có lỗi mới. |
| 24 | Dashboard, Dấu vết | 8,0 | 8,5 | Cột Yêu cầu "45 tỷ đồng · 12 tháng". Không có lỗi mới. |
| 25 | Ngăn kéo dấu vết | 8,0 | 8,0 | <ol><li>`drawer-00187.txt:123` dòng mồ côi ", cấp xác nhận: Cấp 2 Hội sở": đặt cùng dòng với cấp phê duyệt, bỏ dấu phẩy đầu (`features/dashboard/components/CaseTrace.tsx:316`).</li><li>Nhãn "Điều kiện trước giải ngân:" lặp ×3, mọi mục đánh số "1.": dùng chung hàm bỏ nhãn trùng với `ActionProposals.tsx` và đánh số theo chỉ mục (`ActionProposals.tsx:118,136`).</li><li>"Chờ kết quả của: …" trên thẻ đã "Xong" (`CaseTrace.tsx:180`): đổi thành "Sau: …" hoặc chỉ hiện khi đang chờ. Kèm: "Người quyết định" hai dòng (`:145–146`), "1,000 tỷ", "giữ checkpoint".</li></ol> |
| 26 | Dashboard, So sánh | 8,5 | 8,5 | `qhkh-compare-1366x768`: không có lỗi mới. Dòng giới hạn và câu về cổng tất định đã chốt. |
| 27 | Chat | 8,5 | 9,0 | `qhkh-chat-answer2-1366x768`: thẻ đúng giọng, "tại ngân hàng", trích nguồn §. Không có lỗi. |
| 28 | Panel AI và trích nguồn | 8,0 | 8,0 | <ol><li>`v-pan.jpg`: "_Dựa trên kết quả phân tích lúc …_" in nguyên dấu gạch dưới. Cho `INLINE_PATTERN` nhận `_…_` (`features/chat/utils/parseMarkdown.ts:46`), hoặc backend đổi sang `*…*` (`backend/app/services/engine_conversation_responder.py:411`).</li><li>Câu trả lời ghi "cấp 2 Hội sở" chữ thường; khối kết quả ghi "Cấp 2 Hội sở".</li><li>Mở panel trên 00187 thì hiện cuộc trò chuyện cũ có câu thử (xem việc 7).</li></ol> |
| 29 | Nhật ký kiểm toán | 8,5 | 8,5 | `kiemtoan-audit-1366x768`: mã `LA-` đã nowrap. Hành động vai Tuân thủ "Ghi ý kiến rủi ro, tuân thủ" mơ hồ; tách theo vai: "Ghi ý kiến tuân thủ" (`features/audit/` bảng nhãn hành động). |
| 30 | Tra cứu chính sách | 8,5 | 8,5 | Không có lỗi mới. |
| 31 | 403 và 404 | 9,0 | 9,0 | Không có lỗi. |
| 32 | Đang tải và lỗi | 8,5 | 8,5 | Không có lỗi mới. |
| 33 | Quản trị | 8,5 | 8,5 | `quantri-admin-1366x768`: chip vai cùng một màu xám. Cho chip "Cấp phê duyệt" và "Kiểm toán nội bộ" màu riêng theo nhóm vai, hoặc bỏ chấm xám và để chữ thường (`features/admin/`). |
| — | Phiên Hội đồng | — | không chấm | Chưa làm hoặc ngoài phạm vi. |

**Trung bình 33 trang: 284,0 / 33 = 8,61.**

## Kiểm lại lần 7

### 9 việc phải sửa

| # | Việc lần 7 | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
| 1 | Ngăn kéo không in chuỗi cổng thô | **Sửa một phần** | `grep -cE "CẦN BỔ SUNG\|dữ liệu chặn\|challenge\| 0,0 tỷ\|[Cc]redit và compliance"` ra 0 ở cả ba `drawer-*.txt`; có "điều phối phản biện". Còn: nội dung cổng 00163 lặp khoảng 6 lần; dòng mồ côi ", cấp xác nhận" (`drawer-00187.txt:123`). |
| 2 | Gọt chữ AI | **Sửa một phần** | Đã sửa: trích nguồn hết lặp nhãn; hết mục chữ thường và mục trùng; câu điều kiện tiên quyết không lặp tiêu đề; "Thiếu dữ liệu bắt buộc"; tên agent viết hoa; hết " 0,0 tỷ". Còn: lặp nhãn kiểu mới "Điều kiện trước giải ngân: Điều kiện trước giải ngân:" (×3 trong ngăn kéo, ×1 ở thẻ đề xuất); "1,000 tỷ"; "checkpoint". |
| 3 | Keycloak cùng bố cục | **Đã sửa** | `none-kc-1366x768`, `none-kc-1280x800`, `none-kc-1440x900`: logo, tiêu đề serif, kẻ sổ, luồng ba bước. Còn khác biệt nhỏ về độ rộng panel và ba thẻ. |
| 4 | Trình xem tài liệu có văn bản OCR, cột giữa dính | **Đã sửa** | `httd-ocr187B-1366x768` và `-y700`: khung "Bản văn bản trích xuất, không phải ảnh gốc" có tô; cột giữa vẫn hiện khi cuộn. |
| 5 | Chat đúng giọng nội bộ | **Đã sửa** | `chat.log`: "Câu trả lời là tham khảo. Số liệu chính thức xem ở hồ sơ."; "dư nợ hiện hữu tại ngân hàng". |
| 6 | Tab Chỉ số vai Kiểm toán dùng hết bề ngang | **Đã sửa** | `kiemtoan-loan163-1366x768`: bảng chỉ số trải hết cột. |
| 7 | Danh sách khách hàng | **Sửa một phần** | Có ghi chú "Chưa khách hàng nào trên trang này có xếp hạng rủi ro." (`CustomerListPage.tsx:55`), nhưng cột "—" vẫn chiếm chỗ. Phần sắp khách có xếp hạng lên trước đã bị gỡ ở `0c2949c`. |
| 8 | Số và mã | **Đã sửa** | Dấu vết "45 tỷ đồng · 12 tháng"; thông báo "Yêu cầu bổ sung: HSV-2026-00196"; mã `LA-` không gãy dòng trong nhật ký. |
| 9 | Chi tiết nhỏ | **Đã sửa** | "Quay lại" có vòng 8,48:1 (`back.log`); vai Tuân thủ thấy một dòng "Chỉ xem."; chip quá hạn dạng viền; "Không có dư nợ tại ngân hàng"; "điều phối phản biện". |

Thêm theo báo cáo của crew `uo`, đã kiểm:
- Trợ lý AI mở từ trang hồ sơ gắn hồ sơ đang xem: **có**. `panel.log` ghi `CHIP HSV-2026-00187`.
- Số thập phân kiểu Việt trong chữ AI: **có** ("80,0 tỷ", "98,0 tỷ").
- Nhãn cổng: commit `0c2949c` ghi "nhãn cổng chữ hoa", không phải "viết thường" như brief. Trên màn hình hiện "Cần bổ sung" (chữ thường sau chữ đầu).

### Các gạch đầu dòng "Để lên 8,5 còn thiếu gì" của lần 7

| Tiêu chí | Lần 7 yêu cầu | Kết quả |
| --- | --- | --- |
| (1) Bản sắc | Việc 3 và 4 thì lên 9 | **Đã sửa**. Lên 9,0. |
| (2) Phân cấp | Việc 9 và rút gọn thẻ đề xuất | **Sửa một phần**. Việc 9 xong; thẻ đề xuất vẫn dài vì trích nguồn lặp. |
| (3) Chữ | Tên agent viết hoa, "0,0 tỷ", mục chữ thường | **Đã sửa**. Lỗi mới "1,000 tỷ" giữ ở 8,5. |
| (4) Màu | Validation một cách ghi ở mọi nơi | **Đã sửa**. |
| (5) Mật độ | Việc 4, 6, 7 thì lên 9 | **Sửa một phần**. Việc 4 và 6 xong, việc 7 một phần; giữ 8,5. |
| (6) Thành phần | giữ | Giữ 9,0. |
| (7) AI và người | Việc 1 là điều kiện để giữ | **Giữ**. Hết chuỗi thô; còn lặp. |
| (8) WCAG | Trần khi không có trình đọc thật | Không đổi. |
| (9) Văn phong 8,0 → 8,5 | Việc 1, 2; việc 5 cho chắc | **Sửa một phần**. Việc 5 xong; việc 1 và 2 một phần, còn lặp nhãn và biệt ngữ. Giữ 8,0. |
| (10) Hoàn thiện 8,0 → 8,5 | Việc 1 cộng việc 3 hoặc 4 | **Đã sửa**. Việc 1, 3, 4 đều xong. Lên 8,5 dù có lỗi mới "_…_". |

Không thấy hồi quy ở các mục đã sửa của lần 7.

## Danh sách việc phải sửa

Xếp theo mức ảnh hưởng tới điểm.

1. **Bỏ lặp nhãn và đánh số đúng trong hành động đề xuất.** Ảnh hưởng (9), (10), (7).
   - Chỗ:
     - ngăn kéo 00187 mục "Hành động đề xuất" (`drawer-00187.txt`, ×3);
     - thẻ đề xuất ở chi tiết hồ sơ 00187 (`v-l187.jpg`).
   - Vì sao: "Điều kiện trước giải ngân: Điều kiện trước giải ngân: …". Mọi mục đều là "1. Agent đề xuất".
   - Sửa:
     - trong `features/agent-actions/ActionProposals.tsx:136`, nếu `cleanAiLine(c.title)` đã bắt đầu bằng `KIND_LABEL[c.kind]` (so không phân biệt hoa thường, bỏ dấu ":") thì chỉ in tiêu đề;
     - đánh số theo chỉ mục trong danh sách, không lấy số bước (`:118`);
     - "Yêu cầu khách bổ sung 5 mục" phải liệt kê đủ 5 mục, hoặc ghi "5 mục, xem danh sách ở Việc cần làm".
2. **Sửa dòng mồ côi và nhãn chờ sai trong ngăn kéo.** Ảnh hưởng (10), (7).
   - `CaseTrace.tsx:316`: ghép "cấp xác nhận: Cấp 2 Hội sở" vào cùng phần tử với dòng cấp phê duyệt phía trên, bỏ dấu phẩy đầu dòng.
   - `CaseTrace.tsx:180`: khi `st?.state === 'done'` thì không hiện "Chờ kết quả của: …"; đổi thành "Dùng kết quả của: …".
   - "Người quyết định" hai dòng liền nhau (`drawer-00163.txt:145–146`): bỏ tiêu đề trùng.
3. **Panel AI: không in cú pháp markdown thô.** Ảnh hưởng (10), (3).
   - Chỗ: `v-pan.jpg`, dòng cuối mỗi câu trả lời dựa trên kết quả đội agent.
   - Sửa: thêm `(_[^_\n]+_)` vào `INLINE_PATTERN` ở `features/chat/utils/parseMarkdown.ts:46`, kèm test; hoặc đổi `_…_` thành `*…*` ở `backend/app/services/engine_conversation_responder.py:411`.
4. **Gom lặp nội dung cổng trong ngăn kéo 00163.** Ảnh hưởng (7), (9).
   - Vì sao: cùng câu "Thiếu dữ liệu bắt buộc: Chưa có kết quả tra cứu CIC…" xuất hiện khoảng 6 lần.
   - Sửa:
     - "Diễn giải cho người duyệt" so khớp sau khi chuẩn hóa (bỏ dấu câu, hạ chữ thường) chứ không so nguyên văn (`CaseTrace.tsx` gần dòng 300, `sameAiText`);
     - mục hành động và trích nguồn "Kiểm chứng Cổng xác định" chỉ giữ một lần;
     - viết thường chữ đầu sau dấu phẩy ("…bắt buộc, chưa có kết quả…").
5. **Gom trích nguồn chung của thẻ đề xuất.** Ảnh hưởng (2), (5).
   - Chỗ: thẻ đề xuất 00187. Mỗi thẻ lặp §3.1, §4.1, §6.1, khoảng 12 dòng.
   - Sửa: trong `ActionProposals.tsx`, tách nguồn trùng giữa các thẻ thành một dòng "Căn cứ chung: §3.1, §4.1, §6.1" ở đầu khối; mỗi thẻ chỉ giữ nguồn riêng. Đổi "Căn cứ: Điều kiện nêu trong báo cáo cuối…" thành tên mục cụ thể.
6. **Chuẩn hóa số và cụm cố định trong chữ AI.** Ảnh hưởng (3), (9).
   - "≤ 1,000 tỷ" → "≤ 1.000 tỷ" (dấu nghìn kiểu Việt): bộ làm sạch số ở `features/dashboard/agentTrace.ts`, chỉ đổi khi có đơn vị "tỷ" hoặc "đồng" theo sau.
   - "cấp Cấp 2 Hội sở" → "Cấp 2 Hội sở"; luôn viết hoa "Cấp 2 Hội sở".
   - Bỏ lặp "SME KHDN SME".
   - Từ điển thay thế:
     - "Quá SLA phê duyệt — … giữ checkpoint" → "Quá hạn phê duyệt: đã nhắc người duyệt, giữ nguyên bước hiện tại";
     - "sau cấp TD" → "sau khi cấp tín dụng".
7. **Dữ liệu trình diễn của panel AI.**
   - Chỗ: `tdinh-panel-open-1366x768`. Panel mở trên 00187 hiện cuộc trò chuyện cũ có "Thời tiết Hà Nội hôm nay thế nào?" và tin cũ "80,000,000,000 VND · Pending Approval".
   - Sửa (ngoài frontend; người có quyền quyết định): `reset-demo.sh` xóa các cuộc trò chuyện tạo sau seed trên ba hồ sơ trình diễn, hoặc panel mở cuộc mới khi cuộc gần nhất cũ hơn lượt agent gần nhất.
8. **Danh sách khách hàng.** Ảnh hưởng (5).
   - Khi cả trang không có xếp hạng thì ẩn cột "Mức rủi ro" và giữ ghi chú dòng 55; hoặc khôi phục phần sắp khách có xếp hạng lên trước (`features/customers/CustomerListPage.tsx:55,70`).
9. **Mục nhỏ:**
   - chi tiết 00176 vai Tuân thủ: hạn bước có dấu quá hạn như Việc của tôi;
   - Quản trị: chip vai có màu theo nhóm;
   - nhật ký: tách "Ghi ý kiến rủi ro, tuân thủ" theo vai;
   - trích nguồn "Validation · Kiểm chứng: “độc lập bằng công cụ: …”" cắt nhãn đúng chỗ;
   - Keycloak: panel rộng như trang đăng nhập và có ba thẻ;
   - mũi tên luồng không rơi cuối dòng.

## Để lên 8,5 còn thiếu gì

Đã đạt 8,55. Phần này nêu cái cần để giữ mức và để lên cao hơn, theo từng tiêu chí:

- **(1) Bản sắc, 9,0:** đạt. Việc 9 phần Keycloak (độ rộng panel, ba thẻ) để giữ.
- **(2) Phân cấp, 8,5:** đạt. Việc 5 thì lên 9.
- **(3) Chữ, 8,5:** đạt. Việc 3 và 6 để giữ.
- **(4) Màu, 8,5:** đạt. Việc 9 (hạn quá ở chi tiết Tuân thủ, chip Quản trị) thì lên 9.
- **(5) Mật độ, 8,5:** đạt. Việc 5 và 8 thì lên 9.
- **(6) Thành phần, 9,0:** đạt. Việc 2 phần "Chờ kết quả của" để giữ.
- **(7) AI và người, 8,5:** đạt. Việc 2 và 4 là điều kiện để lên 9; ngăn kéo là chỗ giám khảo cuộc thi đọc kỹ nhất.
- **(8) WCAG AA, 8,5:** mức trần khi không có trình đọc thật. Lên cao hơn cần kiểm bằng NVDA hoặc Orca và đưa dải mục chi tiết hồ sơ về `role=tablist`.
- **(9) Văn phong, 8,0 → 8,5:** cần việc 1 và 6; việc 4 cho chắc.
- **(10) Hoàn thiện, 8,5:** đạt, nhưng mỏng. Việc 2 và 3 để giữ; việc 7 trước buổi trình diễn.

**Ước tính:**
- Làm việc 1 và 6: (9) lên 8,5, trung bình 8,60.
- Thêm việc 2, 4, 5: (2) và (7) có thể lên 9, trung bình khoảng 8,70.

## Nếu chỉ còn một ngày: 5 việc đáng làm nhất

1. Việc 1: bỏ lặp nhãn và đánh số đúng hành động đề xuất (`ActionProposals.tsx:118,136`).
2. Việc 2: dòng mồ côi ", cấp xác nhận" và "Chờ kết quả của" trên thẻ đã xong (`CaseTrace.tsx:180,316`).
3. Việc 3: panel AI nhận `_…_` (`parseMarkdown.ts:46`).
4. Việc 4: gom nội dung cổng lặp trong ngăn kéo 00163 (`CaseTrace.tsx`, `sameAiText`).
5. Việc 7: làm sạch cuộc trò chuyện của ba hồ sơ trình diễn trong `reset-demo.sh`, để panel không mở ra câu thử.

## Chưa kiểm chứng và chỗ brief sai

- **Chưa kiểm chứng:**
  - không có trình đọc màn hình thật (đã chốt);
  - không bấm "Xác nhận phê duyệt" trên hồ sơ seed, nên không xem màn sau quyết định;
  - không chụp lại 00187 vai Rủi ro sau warm (hồ sơ đang ở Phê duyệt);
  - trang 6, 17, 18, 21, 30, 32 chỉ xem lướt ảnh cùng bộ đo DOM (0 tràn, 0 chữ dưới AA), không có căn cứ mới nên giữ điểm lần 7;
  - nguồn gốc cuộc trò chuyện cũ trong panel 00187 (tạo lúc 01:06 13/11, trước phiên chấm) chưa rõ do e2e hay do crew trước.
- **Chỗ brief sai:** brief ghi crew `uo` làm "nhãn cổng viết thường"; commit `0c2949c` ghi "nhãn cổng chữ hoa". Màn hình hiện "Cần bổ sung".
- **Dữ liệu chạy song song:** `gb` tạo thêm lượt nháp sau khi nhả khóa ("Hiện 7 lượt nháp" trong `drw187`). Dashboard Tổng quan đếm cả lượt của e2e (978 lượt). Không tính điểm.
