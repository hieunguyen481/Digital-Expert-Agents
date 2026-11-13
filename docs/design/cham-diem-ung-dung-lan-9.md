# Chấm điểm ứng dụng thật, lần 9: thẩm mỹ và UX theo thiết kế "Sổ Tín Dụng"

Giám khảo độc lập (Opus). Ngày 13/11/2026. Mã chấm: `import/duskdash` tại `a2fe669`, cùng mã đang chạy ở web 3000.
Đích: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Lần 8: `docs/design/cham-diem-ung-dung-lan-8.md` (8,55, ĐẠT sát ngưỡng).

## Kết luận

**Trung bình 10 tiêu chí: 8,45. KHÔNG ĐẠT.** Ngưỡng: trung bình từ 8,5 và không tiêu chí nào dưới 7.

- Không tiêu chí nào dưới 8. Trượt vì trung bình, thiếu 0,05.
- Trung bình 33 trang: 8,56. Phiên Hội đồng không chấm, không tính.
- Crew `up` làm thật gần hết 9 việc của lần 8. Đo lại xác nhận:
  - ngăn kéo hết lặp nhãn, mục đánh số 1., 2., 3.;
  - có "Căn cứ chung";
  - cổng lặp ở 00163 giảm từ khoảng 6 lần xuống 3;
  - panel AI hết `_…_` và mở trống;
  - các cụm "Q4", "checkpoint", "SLA", "1,000 tỷ", "cấp Cấp" về 0;
  - chip Quá hạn, chip vai theo nhóm, nhật ký tách theo vai.
- Điểm vẫn tụt vì có hồi quy và lỗi mới, rơi đúng vào màn hình giám khảo cuộc thi nhìn đầu tiên:
  1. **"ĐỀ xuất phê duyệt…"**:
     - nằm ở tiêu đề serif của thẻ "Kết luận của đội agent", chi tiết hồ sơ 00187, mọi vai, và ở ngăn kéo;
     - do hàm hạ chữ in hoa mới thêm, `lowerShouting` (`agentTrace.ts:341`, commit `10c1952`).
  2. **Màn đầu của QHKH đếm sai:**
     - 00201 có chip viền đỏ ghi "hạn hôm nay";
     - nhưng hồ sơ này lại được đếm trong "2 quá hạn" và KPI "2 Hồ sơ quá hạn", còn KPI "Hạn hôm nay" ghi 0.
  3. **Số mục lệch giữa hai màn:** ngăn kéo 00187 ghi "Yêu cầu khách bổ sung 5 mục", thẻ đề xuất cùng hồ sơ ghi "4 mục".
  4. **Chữ AI mới lộ chỗ vụng:**
     - "Giá trị bảo đảm … 0 đồng" xếp dưới tiêu đề "Điều kiện trước giải ngân";
     - ".;";
     - "Dữ kiện inflow";
     - panel ghi "56,0 tỷ VND".
- Sửa việc 1 đến 3 là đủ quay lại ngưỡng: ước tính (9) và (10) lên 8,5, trung bình 8,55. Các việc này nhỏ, khoanh vùng rõ, có file và dòng ở dưới.

## Cách chấm

- Đăng nhập Keycloak thật bằng 9 vai và không vai:
  - QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị;
  - bộ đo Playwright ở `/tmp/gu9/` (`run.sh`, `lib.cjs`, `phaseA9.sh`, `ai9.sh`, các `st-*.cjs`).
- Cỡ màn hình:
  - 1366×768 và 1920×1080 cho mọi trang;
  - thêm 1280×800 và 1440×900 cho đăng nhập, Keycloak, Việc của tôi, chi tiết hồ sơ, dashboard.
- Toàn bộ phase A và khối AI chụp trong **một khóa** `flock /tmp/do-an-e2e.lock` cùng `infra/scripts/reset-demo.sh --warm`:
  - khóa từ 17:36:32 tới 17:48:17; warm xong 17:38:36;
  - kết quả warm: 00187 Chờ phê duyệt, 00163 và 00167 Cần bổ sung.
- Lượt đội agent: 3, đều của warm. Trạng thái đang chạy chụp ở hai mốc, 3 giây và 22 giây.
- Chat: 3 câu (2 ở trang chat, 1 ở panel). Không gặp 402. Không gặp lỗi vite, PAGEERROR hay STEPERR.
- Kết quả bộ đo:
  - 297 ảnh, 162 lượt đo trang;
  - 0 trang tràn ngang, 0 chữ dưới AA, chữ nhỏ nhất 12px;
  - vòng focus nút điều hướng 3px, 7,82:1;
  - Keycloak: ô nhập 19,03:1, nút hiện mật khẩu 14,64:1;
  - nút "Quay lại" khi mở modal xác nhận bằng phím: 8,48:1.
- Chữ AI kiểm bằng toàn văn: `grep` trên `drawer-00187.txt`, `drawer-00163.txt`, `drawer-00167.txt` (sau warm) và `full-<vai>-<hồ sơ>.txt`, so với `/tmp/gu8/`.

### Bẫy đã gặp (bổ sung cho lần 8)

- **Lỗi chip hạn phụ thuộc giờ.** `DeadlineChip.tsx:16` lấy chữ theo số ngày, còn màu và bộ đếm lấy theo `sla_level` của backend. Hồ sơ hạn hôm nay mà đã qua giờ SLA thì chip đỏ nhưng ghi "hạn hôm nay". Chụp buổi sáng có thể không thấy.
- **Cột "Mức rủi ro" ở danh sách khách hàng hiện vì 2 dòng cuối trang có xếp hạng.**
  - `anyRated` (`CustomerListPage.tsx:30`) xét cả trang.
  - Ẩn cột khi trống là đúng logic, nhưng 18 trên 20 dòng ghi "—" (`cust9.log`).
- **`grep "ĐỀ xuất"` phải phân biệt hoa thường.** Chuỗi gốc từ engine là "ĐỀ XUẤT PHÊ DUYỆT" (`agent_engine/common/gate.py:31`).
  - `humanizeGate` (`agentTrace.ts:310`) đã đổi chuỗi này đúng thành "Đề xuất phê duyệt".
  - Lỗi ở `lowerShouting`: lookbehind cần có chữ đứng trước, nên "ĐỀ" ở đầu câu được giữ nguyên, còn phần sau bị hạ.
- Dương tính giả của lần 8 vẫn còn, không tính:
  - `ant-tabs-nav-more`, `ant-input-clear-icon(-hidden)`, TEXTAREA autosize;
  - Segmented INPUT 1,67;
  - INPUT bên trong Select/DatePicker ở nhật ký;
  - BODY khi Tab quay vòng;
  - Keycloak "1.12 white … Sổ Tín Dụng".
- Mở panel AI bằng nút: focus vào "Đóng Trợ lý AI" mà không hiện vòng (`NO-RING`), vì panel mở bằng chuột và trình duyệt áp `:focus-visible`. Esc trả focus về nút "Trợ lý AI", vòng 14,64:1. Không tính lỗi.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 8 | Lần 9 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 9,0 | **9,0** | Navy, giấy, serif tiêu đề, chip tím "AI đề xuất", chip navy "Người quyết định" thống nhất trên 33 trang. Keycloak đã rộng bằng trang đăng nhập và có ba thẻ. Ba thẻ chỉ có chữ, chưa có chip tím và navy như trang đăng nhập (`v-1920.jpg`). |
| 2 | Phân cấp, hành động chính ở màn đầu | 8,5 | **8,5** | Chi tiết hồ sơ: nút "Quyết định" vàng ở góc phải, stepper, "Việc của bạn" trước "Người quyết định". Việc của tôi có KPI rồi danh sách. Lỗi đếm ở QHKH tính vào (4) và (10), không trừ hai lần. |
| 3 | Chữ và khả năng đọc tiếng Việt | 8,5 | **8,5** | Be Vietnam Pro và serif tiêu đề hiển thị dấu đúng ở mọi cỡ, chữ nhỏ nhất 12px. "ĐỀ xuất" tính vào (9) và (10). Còn lộ tiếng Anh: "Dữ kiện inflow" ở trích nguồn Credit (`full-tdinh-13/18.txt`, ngăn kéo cả ba hồ sơ); lần 8 grep ra 0. |
| 4 | Màu và ngữ nghĩa trạng thái | 8,5 | **8,0** | Chip "hạn hôm nay" viền đỏ ở 00201 (QHKH): màu nói quá hạn, chữ nói hôm nay; KPI "Hạn hôm nay 0" trong khi chip ghi hôm nay (`DeadlineChip.tsx:15-16`, `MyWorkPage.tsx:93,100`). Vai Tuân thủ ở 00176: chip đầu trang "Chờ ý kiến rủi ro", dòng chỉ xem "Đang cho ý kiến rủi ro", hai tên cho một trạng thái. Chip Quá hạn ở 00176 đã sửa. |
| 5 | Mật độ, lưới ở 1366 và 1920 | 8,5 | **8,5** | 0 tràn ngang trên 162 lượt đo. Ở 1366 chi tiết hồ sơ hai cột đọc tốt. Ở 1920, 404, 403 và trạng thái lỗi để khoảng trống lớn (`v-1920.jpg`, `v-st.jpg`). Danh sách khách hàng có cột rủi ro gần như trống. |
| 6 | Thành phần và trạng thái | 9,0 | **9,0** | Skeleton đúng khung khi đang tải. Lỗi có "Thử lại". 403 nêu tên trang và vai. Nút khóa kèm lý do. Modal xác nhận có số tiền bằng chữ số và "Không hoàn tác được". Ngăn kéo dấu vết có sơ đồ Planner → chuyên gia → Validation → Người quyết định. |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 8,5 | **8,5** | Tiến bộ: đề xuất đánh số, "Căn cứ chung", cổng lặp ở 00163 gom còn 3, trích nguồn "Kiểm chứng độc lập bằng công cụ". Lùi: tiêu đề kết luận 00187 ghi "ĐỀ xuất phê duyệt"; 5 mục ở ngăn kéo, 4 ở thẻ; mục "Diễn giải cho người duyệt" của 00187 không còn hiện (bị `coversAiText` ẩn ở `CaseTrace.tsx:302`), nên mất "Điều kiện chính"; khối Người quyết định 00163 ghi chung chung "người có thẩm quyền theo cấp phê duyệt." dù đã biết là Cấp 2 Hội sở. |
| 8 | WCAG AA | 8,5 | **8,5** | 0 chữ dưới AA. Vòng focus 3px từ 7,82:1 trở lên. Modal và panel bẫy focus, Esc trả focus. Còn nút xóa của antd không có tên ở tra cứu chính sách (lần 8 cũng có). Không có trình đọc màn hình thật; chỉ kiểm cây tiếp cận. |
| 9 | Văn phong UX | 8,0 | **8,0** | Đã sạch: "Q4", "checkpoint", "SLA", "1,000 tỷ", "cấp Cấp", "SME KHDN", "sau cấp TD", nhãn lặp, dòng mồ côi có dấu phẩy. Mới hoặc còn: "ĐỀ xuất" ×3 chỗ; ".;" ("…80 tỷ đồng.; thẩm định pháp lý…", `drawer-00187.txt`); "Dữ kiện inflow"; panel "56,0 tỷ VND", "98,0 tỷ VND" trong khi ứng dụng ghi "tỷ đồng" và bỏ ",0"; "Giá trị bảo đảm đủ điều kiện hiện tại là 0 đồng" dưới tiêu đề "Điều kiện trước giải ngân" (00187, dù tài sản khai 145 tỷ); "cấp xác nhận: Cấp 2 Hội sở" vẫn đứng riêng một dòng, chữ thường đầu dòng. |
| 10 | Độ hoàn thiện sản phẩm thật | 8,5 | **8,0** | Không vỡ bố cục, không lộ mã thô, chuyển trang mượt. Hai hồi quy dễ thấy: chữ hoa nửa vời ở tiêu đề quan trọng nhất của màn trình diễn; chip hạn và KPI tự mâu thuẫn ở màn đầu sau đăng nhập. Thêm số mục lệch 5 và 4 giữa hai màn. Mũi tên luồng ở đăng nhập và Keycloak vẫn rơi cuối dòng. |

Trung bình: (9,0 + 8,5 + 8,5 + 8,0 + 8,5 + 9,0 + 8,5 + 8,5 + 8,0 + 8,0) / 10 = **8,45**.

## Bảng từng trang

| # | Trang (vai) | Lần 8 | Lần 9 | Phải sửa (ảnh · phần tử · file nghi ngờ) |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập và Keycloak | 9,0 | 9,0 | `v-1920.jpg`, Keycloak: ba thẻ thiếu chip tím "AI đề xuất" và navy "Người quyết định" như trang đăng nhập · theme Keycloak `infra/keycloak/theme/so-tin-dung/login/` (CSS và messages). Mũi tên "→" rơi cuối dòng ở cả hai trang · `frontend/src/pages/LoginPage.tsx` (gắn `&nbsp;→` vào từ sau). |
| 2 | Khung (thanh bên, thanh trên, dải demo) | 9,0 | 9,0 | Không có lỗi mới. |
| 3 | Việc của tôi (QHKH) | 9,0 | 8,0 | `qhkh-home-1366x768.png`: 00201 chip đỏ "hạn hôm nay", nhưng phụ đề "2 quá hạn", Segmented "Quá hạn 2", KPI "Hạn hôm nay 0" · `features/my-work/DeadlineChip.tsx:16`, `MyWorkPage.tsx:93,100`. |
| 4 | Việc của tôi (Trưởng phòng) | 9,0 | 9,0 | Không có lỗi mới. |
| 5 | Kiểm toán (hồ sơ chỉ đọc) | 9,0 | 9,0 | Tiêu đề kết luận 00187 có "ĐỀ xuất" (`full-kiemtoan-01.txt`), xem trang 8. |
| 6 | Tìm kiếm | 8,5 | 8,5 | Không có lỗi mới. |
| 7 | Chi tiết 00201 (QHKH) | 8,5 | 8,5 | Chip hạn cùng lỗi với trang 3 · `DeadlineChip.tsx`. |
| 8 | Chi tiết 00187 (Thẩm định) | 8,0 | 7,5 | (a) `full-tdinh-01`: tiêu đề serif thẻ kết luận "ĐỀ xuất phê duyệt…" · `features/dashboard/agentTrace.ts:341` `lowerShouting`. (b) Thẻ đề xuất ghi "4 mục", ngăn kéo ghi "5 mục" · `features/agent-actions/ActionProposals.tsx:152` (`withListHint` với `recountTitle`). (c) Mục "Điều kiện trước giải ngân" chứa câu "Giá trị bảo đảm … 0 đồng"; mất "Diễn giải cho người duyệt" · `agentTrace.ts:521` (bộ lọc câu "hiện tại là 0 đồng" bỏ sót biến thể này), `CaseTrace.tsx:302`. |
| 9 | Chi tiết hồ sơ (Rủi ro) | 8,5 | 8,5 | Cùng "ĐỀ xuất" khi xem 00187. |
| 10 | Chi tiết 00176 (Tuân thủ) | 8,5 | 8,5 | Chip "Chờ ý kiến rủi ro" và dòng "Đang cho ý kiến rủi ro" · `features/my-work/format.ts:58` và chỗ ghi dòng chỉ xem ở `features/loan-detail/`. |
| 11 | HTTD | 8,5 | 8,5 | Không có lỗi mới. |
| 12 | Chi tiết 00163 (Phê duyệt) | 8,5 | 8,5 | `v-trace.jpg` khung 3: khối Người quyết định ghi "người có thẩm quyền theo cấp phê duyệt." thay vì "Cấp 2 Hội sở" · `CaseTrace.tsx`, khối người quyết định. Compliance có "hạn mức có bảo đảm tối đa 0 đồng" · lọc như trang 8c. |
| 13 | Chi tiết 00167 | 8,5 | 8,5 | "Dữ kiện inflow" · `agentTrace.ts` `sourceLabel` (dịch "inflow" thành "dòng tiền vào"). |
| 14 | Modal chọn quyết định | 9,0 | 9,0 | Không có lỗi mới. |
| 15 | Modal xác nhận | 9,0 | 9,0 | Không có lỗi mới. |
| 16 | Đội agent đang chạy | 9,0 | 9,0 | Không có lỗi mới. |
| 17 | Soạn đề xuất | 8,5 | 8,5 | Không có lỗi mới. |
| 18 | Danh sách đối chiếu | 8,5 | 8,5 | Không có lỗi mới. |
| 19 | Chi tiết đối chiếu 00187 | 8,5 | 8,5 | Không có lỗi mới. |
| 20 | Danh sách khách hàng | 8,0 | 8,0 | `cust9.log`: cột "Mức rủi ro" có 18 trên 20 dòng "—", 1 dòng "Chưa rõ"; "—" và "Chưa rõ" là hai cách ghi cho một ý · `features/customers/CustomerListPage.tsx:30,71`. |
| 21 | Chi tiết khách hàng | 8,5 | 8,5 | Không có lỗi mới. |
| 22 | Thông báo | 9,0 | 9,0 | Không có lỗi mới. |
| 23 | Dashboard Tổng quan | 8,5 | 8,5 | Không có lỗi mới. |
| 24 | Dấu vết (danh sách) | 8,5 | 8,5 | Không có lỗi mới. |
| 25 | Ngăn kéo dấu vết | 8,0 | 8,0 | `drawer-00187.txt`: "ĐỀ xuất" ở thẻ Validation và dòng "Validation → Planner"; ".;"; "5 mục"; hai chip nhắc và chuyển cấp do quá hạn; dòng "cấp xác nhận: Cấp 2 Hội sở" đứng riêng · `CaseTrace.tsx:320`, `agentTrace.ts:341`. |
| 26 | So sánh | 8,5 | 8,5 | Có lượt đo v8 (13/11 15:54, 70,7% ± 15,7% so với 54,3% ± 18,2%). Trình bày ổn. |
| 27 | Chat | 9,0 | 9,0 | Không có lỗi mới. |
| 28 | Panel Trợ lý AI | 8,0 | 8,0 | `v-pan.jpg`: "56,0 tỷ VND", "98,0 tỷ VND" · `features/chat/` (bộ định dạng chữ trả lời; áp `decimalVi` và "VND" thành "đồng" như `agentTrace.ts:353`). `_…_` đã sửa. |
| 29 | Nhật ký kiểm toán | 8,5 | 8,5 | Đã tách "Ghi ý kiến tuân thủ" và "Ghi ý kiến rủi ro". |
| 30 | Tra cứu chính sách | 8,5 | 8,5 | Nút xóa của antd không có tên (`httd-policy-dscr`). |
| 31 | 403 và 404 | 9,0 | 9,0 | Ở 1920, khoảng trống lớn (nhỏ). |
| 32 | Đang tải và lỗi | 8,5 | 8,5 | `v-st.jpg`: skeleton và lỗi sạch. |
| 33 | Quản trị | 8,5 | 8,5 | Chip vai đã có màu theo nhóm. |

Trung bình 33 trang: 282,5 / 33 = **8,56**.

## Kiểm lại lần 8

| # | Việc lần 8 | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
| 1 | Bỏ lặp nhãn, đánh số hành động đề xuất | **Đã sửa** | Ngăn kéo đánh số 1., 2., 3., hết "Điều kiện trước giải ngân: Điều kiện trước giải ngân:". |
| 1b | Số mục khớp giữa hai màn | **Lỗi mới** | `drawer-00187.txt` "bổ sung 5 mục"; `full-tdinh-01.txt` "bổ sung 4 mục" và "Việc cần làm 4". |
| 2 | Dòng mồ côi ", cấp xác nhận"; "Chờ kết quả của"; Người quyết định in hai dòng | **Sửa một phần** | Thẻ đã Xong ghi "Dùng kết quả của"; hết lặp. "cấp xác nhận: Cấp 2 Hội sở" hết dấu phẩy đầu dòng nhưng vẫn đứng riêng một dòng (`CaseTrace.tsx:320`). |
| 3 | Panel nhận `_…_` | **Đã sửa** | `v-pan.jpg`: "Dựa trên kết quả phân tích lúc 17:37…" in nghiêng. |
| 4 | Gom cổng lặp ở 00163 | **Đã sửa phần lớn** | Còn 3 lần (thẻ Validation, dòng luồng, "Đội agent đề nghị bổ sung hồ sơ"), lần 8 khoảng 6. |
| 5 | Căn cứ chung | **Đã sửa** | "Căn cứ chung: CS-TD-SME/2025 §3.1 – Thẩm quyền phê duyệt, §4.1 – Chất lượng BCTC, §6.1 – Danh mục hồ sơ". |
| 6 | Chuẩn hóa số và cụm cố định | **Đã sửa** | `grep -E "checkpoint\|SLA\|Q4\|1,000 tỷ\|cấp Cấp\|SME KHDN\|sau cấp TD"` trên ba file ngăn kéo ra 0. |
| 6b | Chữ in hoa nhấn mạnh (thêm sau lần 8) | **Hồi quy** | "ĐỀ xuất phê duyệt" ở `full-tdinh-01.txt`, `full-kiemtoan-01.txt`, `drawer-00187.txt`; nguyên nhân `lowerShouting` (`agentTrace.ts:341`). |
| 6c | Số thập phân trong chat (thêm sau lần 8) | **Sửa một phần** | Panel còn "56,0 tỷ VND", "98,0 tỷ VND" (`v-pan.jpg`). |
| 7 | `reset-demo` xóa cuộc trò chuyện cũ | **Đã sửa** | Panel 00187 sau warm mở "Cuộc trò chuyện này chưa có nội dung", chip HSV-2026-00187. |
| 8 | Ẩn cột rủi ro khi trống | **Sửa một phần** | Logic đúng nhưng trang 1 có 18/20 dòng "—"; "Chưa rõ" và "—" cùng nghĩa (`cust9.log`). |
| 9a | Chip Quá hạn ở 00176 vai Tuân thủ | **Đã sửa** | Có chip "Quá hạn". |
| 9b | Chip vai Quản trị theo nhóm | **Đã sửa** | Cấp phê duyệt navy đặc; Rủi ro, Tuân thủ, Kiểm toán xanh. |
| 9c | Nhật ký tách theo vai | **Đã sửa** | "Ghi ý kiến tuân thủ", "Ghi ý kiến rủi ro". |
| 9d | Nhãn trích nguồn "Kiểm chứng độc lập…" | **Đã sửa** | `full-tdinh-13.txt:84`. |
| 9e | Keycloak rộng, ba thẻ | **Sửa một phần** | Rộng và có ba thẻ; thẻ chỉ có chữ, khác trang đăng nhập. |
| 9f | Mũi tên luồng rơi cuối dòng | **Chưa sửa** | "AI đề xuất → Chuyên viên xem và sửa →" rơi cuối dòng ở đăng nhập và Keycloak. |

## Danh sách việc phải sửa (xếp theo ảnh hưởng tới điểm)

1. **"ĐỀ xuất" (tiêu chí 9, 10, 7).**
   - Chỗ: `frontend/src/features/dashboard/agentTrace.ts:338-342`, hàm `lowerShouting`, được `scrubStyle` gọi ở dòng 344.
   - Vì sao: cụm in hoa đứng đầu chuỗi không khớp lookbehind `(?<=[\p{L}\d,;)]\s)`, nên từ đầu tiên giữ in hoa, các từ sau bị hạ.
   - Sửa thành:
     - gọi `humanizeGate` trước `lowerShouting` trong `scrubStyle`; hoặc
     - cho `lowerShouting` nhận cả đầu chuỗi và đầu câu (`^|[.;:]\s+`), hạ cả cụm, viết hoa chữ đầu.
   - Thêm test `agentTrace.test.ts`: "ĐỀ XUẤT PHÊ DUYỆT với điều kiện" phải thành "Đề xuất phê duyệt với điều kiện".
   - Kiểm: `grep -c "ĐỀ xuất"` trên `full-tdinh-01.txt` và `drawer-00187.txt` ra 0.
2. **Chip hạn và bộ đếm ở Việc của tôi (tiêu chí 4, 10).**
   - Chỗ: `frontend/src/features/my-work/DeadlineChip.tsx:16`, `MyWorkPage.tsx:93,100`.
   - Vì sao: chữ chip lấy theo số ngày (`n === 0` thì "hạn hôm nay"), còn màu và KPI lấy theo `sla_level === 'over'`.
   - Sửa thành: khi `item.sla_level === 'over'` thì chữ là "quá hạn" (hoặc "quá hạn hôm nay" khi `n === 0`). KPI "Hạn hôm nay" chỉ đếm hồ sơ chưa quá hạn, để tổng hai KPI khớp với chip. Thêm test với `sla_level: 'over'` và hạn bằng hôm nay.
3. **Số mục bổ sung lệch giữa ngăn kéo và thẻ (tiêu chí 7, 10).**
   - Chỗ: ngăn kéo dùng tiêu đề gốc của engine ("5 mục"); thẻ ở `features/agent-actions/ActionProposals.tsx:152` dùng `recountTitle` ("4 mục").
   - Sửa thành: ngăn kéo (`CaseTrace.tsx`, chỗ in đề xuất) dùng cùng `recountTitle` với danh sách đã gộp. Hai màn phải ra cùng một số.
4. **Chữ AI còn vụng (tiêu chí 9, 3).**
   - "Giá trị bảo đảm đủ điều kiện hiện tại là 0 đồng" (00187) và "hạn mức có bảo đảm tối đa 0 đồng" (00163):
     - mở rộng bộ lọc `agentTrace.ts:521` và `STATUS_ONLY` (dòng 583) cho biến thể "hiện tại là 0 đồng" đứng sau danh từ và "tối đa 0 đồng";
     - hoặc thay bằng "Chưa có tài sản bảo đảm được thẩm định".
   - ".;" ở mô tả nhiệm vụ Compliance: thêm `.replace(/\.;/g, ';')` trong `scrubStyle`.
   - "Dữ kiện inflow": thêm vào từ điển nhãn trích nguồn ("dòng tiền vào").
   - Panel "56,0 tỷ VND": áp `decimalVi` (bỏ ",0") và đổi "VND" thành "đồng" cho chữ trả lời của panel và chat ở `features/chat/`.
5. **Dòng "cấp xác nhận" đứng riêng (tiêu chí 9).**
   - Chỗ: `CaseTrace.tsx:320`.
   - Sửa thành: gộp vào cùng câu với người quyết định, thành "Người quyết định: Cấp 2 Hội sở xác nhận".
   - Ở 00163, khối Người quyết định ghi đúng cấp đã biết thay cho "người có thẩm quyền theo cấp phê duyệt.".
6. **Mục "Diễn giải cho người duyệt" của 00187 biến mất (tiêu chí 7).**
   - Chỗ: `CaseTrace.tsx:302`, `coversAiText` coi câu tóm tắt đã phủ cả diễn giải.
   - Sửa thành: chỉ ẩn khi diễn giải không có "Điều kiện chính", hoặc giữ phần "Điều kiện chính" riêng.
7. **Hai tên cho một trạng thái (tiêu chí 4).**
   - "Chờ ý kiến rủi ro" (`features/my-work/format.ts:58`) và "Đang cho ý kiến rủi ro" (dòng chỉ xem ở chi tiết hồ sơ).
   - Dùng một tên.
8. **Danh sách khách hàng (tiêu chí 5).**
   - Đổi "Chưa rõ" thành "—", hoặc ngược lại, cho thống nhất.
   - Cân nhắc chuyển xếp hạng thành chip trong cột tên khi ít dòng có dữ liệu (`CustomerListPage.tsx:71`).
9. **Keycloak và mũi tên (tiêu chí 1).**
   - Ba thẻ Keycloak thêm chip tím "AI đề xuất" và chip navy "Người quyết định" như trang đăng nhập.
   - Mũi tên "→" gắn `&nbsp;` với từ đứng sau cho khỏi rơi cuối dòng.
10. **Mục nhỏ.**
    - Nút xóa antd ở tra cứu chính sách thiếu tên: `allowClear={{ clearIcon: <CloseCircleFilled aria-label="Xóa nội dung tìm" /> }}`.
    - Hai chip nhắc và chuyển cấp ở ngăn kéo 00187: gom thành một, bỏ dấu gạch ngang dài.

## Để lên 8,5 còn thiếu gì (theo từng tiêu chí)

| # | Tiêu chí | Lần 9 | Thiếu gì để giữ hoặc lên |
| --- | --- | --- | --- |
| 1 | Bản sắc | 9,0 | Giữ. Lên 9,5: Keycloak có chip như trang đăng nhập (việc 9). |
| 2 | Phân cấp | 8,5 | Giữ. Lên 9,0: 404 và 403 ở 1920 bớt khoảng trống, gợi ý trang hay dùng. |
| 3 | Chữ tiếng Việt | 8,5 | Giữ. Bỏ "inflow" (việc 4). |
| 4 | Màu và trạng thái | 8,0 | Việc 2 và 7: chip hạn khớp màu, chữ và KPI; một tên cho một trạng thái. |
| 5 | Mật độ, lưới | 8,5 | Giữ. Việc 8. |
| 6 | Thành phần | 9,0 | Giữ. |
| 7 | AI và người quyết định | 8,5 | Giữ bằng việc 1, 3, 6. Không sửa 1 và 3 thì có nguy cơ xuống 8,0. |
| 8 | WCAG AA | 8,5 | Giữ. Việc 10 (nút xóa không tên). |
| 9 | Văn phong | 8,0 | Việc 1, 4, 5: không còn "ĐỀ xuất", ".;", "inflow", "VND", "0 đồng" vô nghĩa, dòng "cấp xác nhận" riêng. |
| 10 | Hoàn thiện | 8,0 | Việc 1, 2, 3: không còn hồi quy dễ thấy ở màn đầu và thẻ kết luận. |

Sửa việc 1 đến 3: (4) lên 8,5, (10) lên 8,5, trung bình 8,55. Thêm việc 4 và 5: (9) lên 8,5, trung bình 8,60.

## 5 việc nếu chỉ còn một ngày

1. Sửa `lowerShouting` cho "ĐỀ xuất", kèm test (việc 1).
2. `DeadlineChip` và KPI theo `sla_level` (việc 2).
3. Số mục ngăn kéo khớp thẻ (việc 3).
4. Lọc "0 đồng", ".;", "inflow", "VND" và ",0" trong panel (việc 4).
5. Gộp "cấp xác nhận" vào câu người quyết định; ghi cấp đã biết ở 00163 (việc 5).

Sau khi sửa, chạy lại trong một khóa: `reset-demo.sh --warm`, rồi `ai9.sh` và `grep` toàn văn như mục "Cách chấm".

## Chưa kiểm chứng và chỗ brief sai

- **Brief nói danh sách khách hàng đã sửa.** Thực tế chỉ sửa logic: cột vẫn hiện vì 2 dòng có xếp hạng, 18/20 dòng là "—".
- **Brief nói đã sửa "chữ in hoa nhấn mạnh".** Việc này sinh ra hồi quy "ĐỀ xuất" ở tiêu đề kết luận 00187.
- **Brief nói đã sửa "số thập phân trong chat".** Panel còn "56,0 tỷ VND".
- **Lỗi chip hạn phụ thuộc giờ chụp.** Đã thấy lúc 17:36 ngày 13/11; chưa kiểm vào buổi sáng.
- **Chữ AI do LLM sinh, mỗi lượt warm khác nhau.** "0 đồng" và "inflow" có thể không lặp lại ở lượt sau. Lỗi ở phía hiển thị vẫn đúng: bộ lọc không bắt được các biến thể này.
- **Không có trình đọc màn hình thật.** Chỉ kiểm cây tiếp cận theo `docs/agent/review-ux.md`.
- **Phiên Hội đồng chưa có**, không chấm.
