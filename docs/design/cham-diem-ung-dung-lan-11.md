# Chấm điểm ứng dụng thật, lần 11: thẩm mỹ và UX theo thiết kế "Sổ Tín Dụng"

Giám khảo độc lập (Opus). Ngày 14/11/2026 (thứ Bảy). Mã chấm: `import/duskdash` tại `28ee04d`, cùng mã đang chạy ở web 3000 (repo chính cũng ở `28ee04d`).
Đích: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Lần 10: `docs/design/cham-diem-ung-dung-lan-10.md` (8,55, ĐẠT sát ngưỡng).

## Kết luận

**Trung bình 10 tiêu chí: 8,70. ĐẠT.** Ngưỡng: trung bình từ 8,5 và không tiêu chí nào dưới 7.

- Không tiêu chí nào dưới 8,5. Khoảng an toàn trên ngưỡng là 0,20; lần 10 chỉ có 0,05.
- Trung bình 34 trang: 8,72. Phiên Hội đồng không chấm, không tính.
- Đo lại 10 việc của lần 10:
  - 8 việc đã sửa;
  - việc 3 (panel AI) và việc 10 (mục nhỏ) sửa một phần.
- Không thấy hồi quy giao diện từ 23 commit sau lần 10.
- Có một lỗi chữ mới: "Dữ kiện cIC" ở 00163. Lỗi nằm ở bộ hiển thị và chỉ lộ ra khi LLM sinh nguồn "Dữ kiện cic" (xem việc 1).
- Hai tiêu chí tăng điểm:
  - (2) Phân cấp, từ 8,5 lên 9,0: thẻ rỗng đã gộp thành một dòng, KPI DSCR có chú thích, khối điều kiện có chữ chờ quyết định.
  - (9) Văn phong, từ 8,0 lên 8,5: hết "0 đồng" trong danh sách điều kiện, hết "(không cản trở trình)", "inflow", ",0 tỷ", ".…" và nhãn lặp.
- (9) vẫn là tiêu chí mỏng nhất. Thẻ "Yêu cầu khách bổ sung" nay hiện đúng danh sách sẽ gửi đi, nên lộ ra mục của engine không phải tài liệu khách nộp. Ví dụ ở 00167: "Trình cấp phê duyệt Cấp 2 Hội sở theo kết quả tính lại".

## Cách chấm

- Đăng nhập Keycloak thật bằng 9 vai và không vai: QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị.
- Bộ đo Playwright của lần 10 chép sang `/tmp/gu11/`: `run.sh`, `run.cjs`, `lib.cjs`, `ai11.sh` (= `ai10.sh`), các `st-*.cjs`. Thêm `st-ptxt.cjs` để xuất toàn văn panel AI mà không hỏi thêm câu nào.
- Cỡ màn hình: 1366×768 và 1920×1080 cho mọi trang. Thêm 1280×800 và 1440×900 cho đăng nhập, Keycloak, Việc của tôi, chi tiết hồ sơ, dashboard.
- Mọi ảnh chụp nằm trong **một khóa** `flock /tmp/do-an-e2e.lock` cùng `infra/scripts/reset-demo.sh --warm`:
  - khóa từ 18:11:20 tới 18:22:48; warm xong 18:13:24;
  - kết quả warm: 00187 Chờ phê duyệt (Pending Approval), 00163 và 00167 Cần bổ sung (Needs Info).
  - Ngoài khóa chỉ chạy `st-ptxt.cjs` (đọc panel, không ghi).
- Lượt đội agent: 3, đều của warm; không chạy thêm lượt nào. Trạng thái đang chạy chụp lúc warm chạy 00187 (`tdinh-running1`, "Đã chạy 00:13 · 1/4 chuyên gia đã xong").
- Chat: 3 câu (2 ở trang chat, 1 ở panel). Không gặp 402, lỗi vite, PAGEERROR hay STEPERR (45/45 bước `exit 0`).
- Kết quả bộ đo:
  - 312 ảnh, 202 lượt đo trang;
  - 0 trang tràn ngang, 0 chữ dưới AA (trừ dương tính giả Keycloak), chữ nhỏ nhất 12px (Keycloak 13px);
  - 0 nút có chữ dưới 4,5:1;
  - vòng focus 3px: 7,82:1 trên nền sáng, 8,48:1 ở dòng danh sách và "Quay lại", 14,64:1 trên thanh bên navy.
- Chữ AI kiểm bằng toàn văn sau warm:
  - file: `drawer-00187.txt`, `drawer-00163.txt`, `drawer-00167.txt`, `full-<tdinh|pheduyet|kiemtoan>-<01|13|18>.txt`, `panel-full.txt`, `chat.log`;
  - `grep`: "ĐỀ|XUẤT", "inflow", " 0 đồng", "cản trở trình", ",0 tỷ", ".…", ".;", "VND", "Bổ sung trước giải ngân", "nêu nêu", "TSBĐ", "undefined|null|NaN";
  - quét chữ thường đứng trước chữ in hoa, nhãn lặp "X: X:", "Căn cứ: …:", rồi so với `/tmp/gu10/`.

### Bẫy đã gặp (bổ sung cho lần 10)

- **"Dữ kiện cIC" chỉ hiện khi LLM ghi nguồn là "Dữ kiện cic".**
  - `sourceLabel` (`frontend/src/features/dashboard/agentTrace.ts:226`) hạ chữ đầu của nhãn bảng chung ("CIC" thành "cIC"), rồi mới thay `/ cic$/`. Vì vậy phép thay không bao giờ khớp.
  - Lượt warm lần 10 không sinh nguồn này nên không thấy lỗi.
- **`grep inflow` vẫn ra 3 dòng**, đều là mã công cụ `get_annual_inflow` ở cột kỹ thuật của bảng "Công cụ", đứng cạnh nhãn "Tiền về tài khoản 12 tháng". Lần 10 cũng có. Không tính lỗi.
- **`grep "chặn trình"` ra 16 dòng.** Đó là thẻ nguồn của cờ ("Nguồn: AI kiểm tra tài liệu · chặn trình"), không phải cụm "(không cản trở trình)". Muốn kiểm việc 2 của lần 10 thì `grep "cản trở trình"`; lệnh này chỉ ra câu mẫu "Phần còn thiếu không cản trở việc áp dụng chính sách…", là câu khác.
- **Ảnh `tdinh-panel-answer` chụp lúc câu trả lời còn "Đang kết nối".**
  - Vòng chờ của `st-panel8.cjs` chỉ nhận ra "Đang soạn/trả lời/xử lý", nên dừng sau 13,5 giây.
  - Toàn văn câu trả lời lấy lại bằng `st-ptxt.cjs` (`panel-full.txt`). Ảnh chip dính lấy ở `tdinh-panel-clip-top`.
- **Không có hồ sơ nào có hơn 5 điều kiện trước giải ngân.** Việc gập danh sách chỉ kiểm được ở mã (`PreDisbursementPanel.tsx:43`, `data-testid=pre-disbursement-toggle`) và test của crew, không kiểm được trên giao diện.
- Dương tính giả cũ vẫn còn, không tính:
  - `ant-tabs-nav-more`, `ant-input-clear-icon-hidden`, TEXTAREA autosize;
  - Segmented 1,67; INPUT trong Select/DatePicker ở nhật ký; INPUT trong InputNumber của modal (vòng nằm trên khung bọc);
  - BODY khi Tab quay vòng; Keycloak "1.12 white … Sổ Tín Dụng";
  - "Quay lại" và "Đóng Trợ lý AI" khi mở bằng chuột (`NO-RING` đúng `:focus-visible`; mở bằng phím thì 8,48:1).

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 10 | Lần 11 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 9,0 | **9,0** | Navy, nền giấy, serif tiêu đề, chip tím nét đứt "AI đề xuất", chip navy "Người quyết định" và lề dọc kiểu sổ thống nhất trên mọi trang, gồm đăng nhập, Keycloak, Quản trị, modal và panel. Trang đăng nhập đã bỏ dấu cách thừa ("AI đề xuất → Chuyên viên xem và sửa", `none-login-1366`). Còn: thẻ thứ ba ở Keycloak chỉ có chữ, không có sơ đồ chip như trang đăng nhập (`none-kc-1366`). |
| 2 | Phân cấp, hành động chính ở màn đầu | 8,5 | **9,0** | Hồ sơ 00163 ở vai Phê duyệt (`pheduyet-loan163-1366`):<br>• nút "Quyết định" vàng ở góc phải;<br>• thẻ kết luận AI bên trái, cột "Việc của bạn" và "Người quyết định" bên phải;<br>• các khối rỗng gộp một dòng "Chưa có: chỉ số có nguồn, cờ, điều kiện trước giải ngân, tài sản bảo đảm.".<br>KPI DSCR của 00187 có chú thích "Số tái tính từ tài liệu; khách khai 1,34. Xem Chỉ số tài chính." Còn: thẻ kết luận 00163 và 00167 ghi "cần bổ sung 2 việc", thẻ đề xuất ngay dưới ghi "Yêu cầu khách bổ sung 4 mục". |
| 3 | Chữ và khả năng đọc tiếng Việt | 8,5 | **8,5** | Be Vietnam Pro và serif tiêu đề hiển thị dấu đúng; chữ nhỏ nhất 12px. "inflow" đã hết khỏi thân chữ. Tên chỉ số đã đổi thành "LTV – dư nợ/giá trị xử lý TSĐB". Còn:<br>• lỗi viết hoa mới "Dữ kiện cIC" (`full-pheduyet-13.txt:73,96`);<br>• chữ AI của Compliance ở 00187 ghi "TSBĐ" (`drawer-00187.txt:21,55`) cạnh nhãn "TSĐB";<br>• "Vốn chủ sở hữu: 1.018,5 so với 270 tỷ đồng": số đầu thiếu đơn vị. |
| 4 | Màu và ngữ nghĩa trạng thái | 8,5 | **8,5** | Chip hạn cuối tuần đã đúng: 00201 hạn 13/11, chấm thứ Bảy, chip đỏ ghi "quá hạn từ 13/11". Phụ đề "2 quá hạn" khớp KPI "Hồ sơ quá hạn 2" (`qhkh-home-1366`). Còn: cùng một agent mang hai trạng thái trong cùng hồ sơ. Ở 00187, Credit là "Cần bổ sung" trong sơ đồ và ngăn kéo (`drawer-00187.txt:15`), nhưng "Đồng ý có điều kiện" ở mục đề xuất (`:106`) và ở thẻ "Phát hiện của từng chuyên gia (2 cần chú ý)". Không có chữ nào giải thích "trước và sau phản biện". |
| 5 | Mật độ, lưới ở 1366 và 1920 | 8,5 | **8,5** | 0 tràn ngang trên 202 lượt đo. Ở 1366, hai cột của chi tiết hồ sơ đọc tốt; bảng Quản trị và So sánh gọn. Còn như lần 10:<br>• thân chữ thẻ kết luận ở 1920 dài khoảng 110 ký tự một dòng (`tdinh-loan187-1920`);<br>• ghi chú của tab So sánh ở 1920 cũng dài như vậy (`qhkh-cmp-run0-1920`);<br>• 403 và 404 ở 1920 để khoảng trống lớn;<br>• trang Thông báo chỉ có 2 dòng mà để trống phần lớn màn hình. |
| 6 | Thành phần và trạng thái | 9,0 | **9,0** | Skeleton đúng khung; lỗi có "Thử lại" (`qhkh-error-loan`); nút khóa có lý do ("Chưa xuất được: Tờ trình chưa được chốt khi trình."). Modal quyết định ghi "Cần nhập: lý do quyết định" và khóa "Ghi quyết định". Trạng thái đang chạy có đồng hồ "Đã chạy 00:14" và "1/4 chuyên gia đã xong". Chip ngữ cảnh của panel AI nay nền đặc, có viền dưới và bóng, không đè chữ khi cuộn (`tdinh-panel-clip-top`). |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 8,5 | **8,5** | Đã ổn:<br>• 00187 còn 2 thẻ đề xuất, không còn hai thẻ trùng về người đại diện;<br>• 4 điều kiện ở thẻ kết luận đều là việc phải làm, không còn câu "0 đồng";<br>• "Đối chất giữa các agent 54 lần" ở Tổng quan; dòng "Validation phản biện số liệu 1 lần…" ở Luồng phối hợp;<br>• khối Người quyết định "Cấp 2 Hội sở xác nhận. Đội agent chỉ đề xuất, không tự phê duyệt." ở cả ba hồ sơ.<br>Còn kéo điểm:<br>• thẻ "Yêu cầu khách bổ sung" chứa việc nội bộ: 00167 "Trình cấp phê duyệt Cấp 2 Hội sở theo kết quả tính lại"; 00187 "Cần làm rõ chênh lệch dòng tiền và xác minh DSCR", gần trùng mục 1;<br>• hai trạng thái của Credit (xem 4);<br>• số "2 việc" và "4 mục" lệch nhau (xem 2). |
| 8 | WCAG AA | 8,5 | **8,5** | 0 chữ dưới AA; vòng focus 3px từ 7,82:1; modal và panel bẫy focus; Esc trả focus về "Trợ lý AI" (14,64:1). Nút xóa ở tra cứu chính sách đã có tên: `unnamed: []` ở `httd-policy-dscr`, cả 1366 và 1920. Giữ 8,5 vì không có trình đọc màn hình thật, chỉ kiểm cây tiếp cận. Theo quyết định mở số 1, thiếu căn cứ thì không cho điểm cao. |
| 9 | Văn phong UX | 8,0 | **8,5** | Đã sạch trên 12 file toàn văn: "ĐỀ xuất" 0, "(không cản trở trình)" 0, ",0 tỷ" 0, ".…" 0, "VND" 0, "nêu nêu" 0, "Bổ sung trước giải ngân" 0, "inflow" trong thân chữ 0. Không còn "0 đồng" làm điều kiện. Còn:<br>• "Dữ kiện cIC";<br>• việc nội bộ nằm trong thẻ yêu cầu khách;<br>• "Căn cứ: Điều kiện tiên quyết: phải hoàn tất…" (`full-tdinh-01.txt:89`), hai nhãn nối nhau;<br>• "Điều kiện trước giải ngân" rồi tới "Bổ sung thông tin người đại diện trước giải ngân": lặp "trước giải ngân";<br>• dòng tóm tắt Compliance 00163 vẫn kết thúc bằng "hạn mức có bảo đảm tối đa theo hồ sơ hiện có là 0 đồng" với hồ sơ không có tài sản bảo đảm;<br>• chat ghi "Theo CS-TD-SME/2025 §3.1 (nguồn: CS-TD-SME/2025 §3.1)" và "70% (≤ 70%)";<br>• ngăn kéo 00187 có câu như lời dặn mô hình: "Chỉ dùng số này làm DSCR; các số tính lại ở cảnh báo chỉ để đối chiếu, không coi là DSCR khác". |
| 10 | Độ hoàn thiện sản phẩm thật | 8,5 | **8,5** | Không vỡ bố cục, không lộ mã thô (rawScan chỉ ra nhãn trường, `EMP-DEMO-…` và một mã `LA-…` đã nộp, đều đã chốt). Chuyển trang mượt, không lỗi vite. Dữ liệu trình diễn sạch sau reset: 00187 không còn 3 điều kiện cũ. Còn:<br>• lỗi "cIC" ở bộ hiển thị;<br>• panel AI ghi "LTV chưa xác định", trong khi KPI và ngăn kéo cùng hồ sơ ghi 55,2%;<br>• panel ghi dòng tiền 668,8 tỷ "chưa đủ để kiểm chứng (0 giao dịch)", trong khi trích nguồn ghi "dòng tiền vào xác minh 668,8 tỷ đồng";<br>• lịch sử chat có 10 cuộc trùng tiêu đề "Tỷ lệ cho vay trên giá trị tài sản bảo đảm tối…", do giám khảo và e2e để lại, không tính. |

Trung bình: (9,0 + 9,0 + 8,5 + 8,5 + 8,5 + 9,0 + 8,5 + 8,5 + 8,5 + 8,5) / 10 = **8,70**.

## Bảng từng trang

| # | Trang | Lần 10 | Lần 11 | Việc phải sửa (ảnh · phần tử · file nghi ngờ) |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập và Keycloak | 9,0 | 9,0 | Đã bỏ dấu cách thừa. Còn: thẻ thứ ba ở Keycloak chỉ có chữ (`none-kc-1366`) · `infra/keycloak/theme/so-tin-dung/login/`. |
| 2 | Khung (thanh bên, thanh trên, dải demo) | 9,0 | 9,0 | Không có lỗi mới. |
| 3 | Việc của tôi (QHKH) | 8,5 | 9,0 | `qhkh-home-1366`: 00201 ghi "quá hạn từ 13/11", đúng. Nhỏ: ngay dưới chip là "13/11/2026", lặp ngày; có thể ghi "quá hạn 1 ngày" theo ngày lịch · `features/my-work/format.ts:53`. |
| 4 | Việc của tôi (Trưởng phòng) | 8,5 | 9,0 | Như trang 3. |
| 5 | Kiểm toán (hồ sơ chỉ đọc) | 9,0 | 9,0 | Không có lỗi riêng. Các lỗi chữ AI tính ở trang 8, 12 và 13. |
| 6 | Tìm kiếm | 8,5 | 8,5 | Không có lỗi mới (bộ đo và rawScan sạch). |
| 7 | Chi tiết 00201 (QHKH) | 8,5 | 9,0 | Chip hạn đã đúng. |
| 8 | Chi tiết 00187 (Thẩm định) | 8,5 | 8,5 | `tdinh-loan187-y700`:<br>(a) Thẻ "Yêu cầu khách bổ sung 4 mục" có "Cần làm rõ chênh lệch dòng tiền và xác minh DSCR". Đây là việc của cán bộ, gần trùng mục 1 "Đối soát dòng tiền vào… xác minh DSCR" · engine `agent_engine/gateway/proposals.py:111-137` sinh mục; giao diện `features/agent-actions/ActionProposals.tsx` (`proposalDocs`).<br>(b) "Căn cứ: Điều kiện tiên quyết: phải hoàn tất…": hai nhãn nối nhau · `ActionProposals.tsx`, chỗ ghép "Căn cứ:" với `rationaleText`.<br>(c) Thẻ "Phát hiện của từng chuyên gia (2 cần chú ý)" ghi Credit "Đồng ý có điều kiện", trong khi sơ đồ ghi "Cần bổ sung" · `features/dashboard/agentTrace.ts` (nhãn trạng thái theo kết luận cuối hay kết luận đầu). |
| 9 | Chi tiết hồ sơ (Rủi ro) | 8,5 | 8,5 | Như 8a và 8c khi xem 00187. |
| 10 | Chi tiết 00176 (Tuân thủ) | 9,0 | 9,0 | Không có lỗi mới. |
| 11 | HTTD | 8,5 | 8,5 | Không có lỗi mới. |
| 12 | Chi tiết 00163 (Phê duyệt) | 8,5 | 8,5 | `pheduyet-loan163-1366` và `full-pheduyet-13.txt`:<br>(a) "Compliance · Dữ kiện cIC chưa có kết quả tra cứu CIC" (dòng 73) và "Dữ kiện cIC…" trong Căn cứ của đề xuất (dòng 96) · `agentTrace.ts:226`.<br>(b) Dòng 72 "Compliance · Dữ kiện sàng lọc chưa có đánh giá KYC/AML…" thiếu ": “…”" như các dòng nguồn khác · `features/dashboard/components/CaseTrace.tsx` và trích nguồn ở trang hồ sơ.<br>(c) Thẻ kết luận "cần bổ sung 2 việc", thẻ đề xuất "4 mục" · `agentTrace.ts:735`.<br>Đã sửa: khối rỗng gộp một dòng, "0 đồng" không còn trong danh sách điều kiện. |
| 13 | Chi tiết 00167 | 8,5 | 8,5 | `full-tdinh-18.txt`: thẻ "Yêu cầu khách bổ sung 4 mục" có "Trình cấp phê duyệt Cấp 2 Hội sở theo kết quả tính lại" · `agent_engine/gateway/proposals.py`. Thẻ kết luận "2 việc" lệch thẻ đề xuất "4 mục", như 12c. |
| 14 | Modal chọn quyết định | 9,0 | 9,0 | Không có lỗi mới (`pheduyet-decision-modal`). |
| 15 | Modal xác nhận | 9,0 | 9,0 | Không có lỗi mới. "Quay lại" mở bằng phím có vòng 8,48:1. |
| 16 | Đội agent đang chạy | 9,0 | 9,0 | `tdinh-running1`: "Đã chạy 00:14", "1/4 chuyên gia đã xong", nút khóa "Đội agent đang chạy…". Không có lỗi mới. |
| 17 | Soạn đề xuất | 8,5 | 8,5 | Không có lỗi mới. |
| 18 | Danh sách đối chiếu | 8,5 | 8,5 | Không có lỗi mới. |
| 19 | Chi tiết đối chiếu 00187 | 8,5 | 8,5 | `httd-ocr187B`: ba cột rõ, dải "Tài liệu mẫu là dữ liệu minh họa…" đúng. Không có lỗi mới. |
| 20 | Danh sách khách hàng | 8,5 | 8,5 | Không có lỗi mới. |
| 21 | Chi tiết khách hàng | 8,5 | 8,5 | Không có lỗi mới. |
| 22 | Thông báo | 9,0 | 9,0 | Không có lỗi mới. |
| 23 | Dashboard Tổng quan | 8,5 | 8,5 | `qhkh-dash-1366`: nhãn "Đối chất giữa các agent 54 lần; phản biện số liệu xem ở từng lượt" rõ. Còn: viền trên màu vàng chỉ ở thẻ đầu "Đã có kết luận", ý nghĩa chưa rõ · `features/dashboard/components/OverviewTab.tsx`. |
| 24 | Dấu vết (danh sách) | 8,5 | 8,5 | Không có lỗi mới. |
| 25 | Ngăn kéo dấu vết | 8,5 | 8,5 | Đã hết nhãn lặp "Bổ sung trước giải ngân", "(không cản trở trình)", ",0 tỷ". Còn (`drawer-00187.txt`):<br>(a) Credit có hai trạng thái, dòng 15 "Cần bổ sung" và dòng 106 "Đồng ý có điều kiện", mà không ghi "trước phản biện / sau phản biện" · `CaseTrace.tsx`.<br>(b) Dòng 99 "Chỉ dùng số này làm DSCR; các số tính lại ở cảnh báo chỉ để đối chiếu, không coi là DSCR khác" là lời dặn mô hình · lọc ở `agentTrace.ts` `scrubInternal`, hoặc sửa engine.<br>(c) Dòng 65 "số chuyên gia nêu lệch số hệ thống tính lại" khó đọc; nên viết "Validation phản biện 1 lần: số chuyên gia nêu khác số hệ thống tính lại, kết luận dùng số tính lại". |
| 26 | So sánh | 8,5 | 9,0 | `qhkh-cmp-run0`: bốn lượt chọn được, nhãn "Bộ ca v8 lần 1/2/3/4". Ghi chú gọn: "Mỗi lần đo sau lần 1 đều chạy sau một đợt sửa engine (lần 2, 3, 4)". Còn: ghi chú ở 1920 dòng dài (tiêu chí 5). |
| 27 | Chat | 9,0 | 9,0 | `chat.log`: có nguồn §, có "Chỉ để tham khảo", ghi "tại ngân hàng". Nhỏ: "Theo CS-TD-SME/2025 §3.1 (nguồn: CS-TD-SME/2025 §3.1)" và "70% (≤ 70%)" · prompt chat ở `backend` hoặc `agent_engine` (bỏ "(nguồn: …)" khi câu đã mở bằng "Theo <cùng nguồn>"). |
| 28 | Panel Trợ lý AI | 8,0 | 8,5 | Chip dính đã nền đặc; câu trả lời không còn gạch trùng (`panel-full.txt`). Còn: panel ghi "LTV chưa xác định" và dòng tiền "chưa đủ để kiểm chứng", trong khi trang cùng hồ sơ ghi "LTV 55,2" và "dòng tiền vào xác minh 668,8 tỷ đồng" · ngữ cảnh panel ở `features/ai-panel/` và phần tóm tắt hồ sơ gửi cho LLM (dùng cùng gói số với thẻ kết luận). |
| 29 | Nhật ký kiểm toán | 8,5 | 8,5 | Không có lỗi mới. |
| 30 | Tra cứu chính sách | 8,5 | 9,0 | Nút xóa đã có tên "Xóa từ khóa" (`httd-policy-dscr`, unnamed rỗng). |
| 31 | 403 và 404 | 9,0 | 9,0 | Ở 1920 khoảng trống lớn (nhỏ). |
| 32 | Đang tải và lỗi | 8,5 | 8,5 | Không có lỗi mới. |
| 33 | Quản trị | 8,5 | 8,5 | `quantri-admin-1366`: bảng gọn, chip vai theo nhóm màu. Không có lỗi mới. |
| 34 | Khối "Điều kiện trước giải ngân" | 8,0 | 8,5 | 00187 hiện "Điều kiện sẽ có sau khi cấp phê duyệt quyết định."; điều kiện cũ đã hết sau reset. Ở hồ sơ khác, khối gộp vào dòng "Chưa có". Còn: hồ sơ Nháp (`qhkh-draft-loan`, DX-2026-00412) ghi "Chưa có: …, điều kiện trước giải ngân". Nói "chưa có" điều kiện giải ngân ở bước soạn đề xuất là quá sớm; nên bỏ mục này trước bước Phê duyệt · `features/loan-detail/EmptyBlocksNote.tsx`. Gập khi hơn 5 mục chỉ kiểm ở mã. |

Trung bình 34 trang: (15 × 9,0 + 19 × 8,5) / 34 = 296,5 / 34 = **8,72**.

## Kiểm lại lần 10

| # | Việc lần 10 | Kết quả | Bằng chứng |
| --- | --- | --- | --- |
| 1 | "0 đồng" thành điều kiện | **Đã sửa** | Danh sách điều kiện của 00187 (`full-tdinh-01.txt:41-44`) và 00163 (`full-pheduyet-13.txt:36-37`) không còn "0 đồng". Câu còn ở dòng tóm tắt Compliance (00163 dòng 48; `drawer-00187.txt:21`). Đó là hiện trạng, không phải việc cần làm; ghi ở tiêu chí 9. |
| 2 | Đề xuất trùng, "(không cản trở trình)", nhãn lặp | **Đã sửa** | `grep "cản trở trình"` chỉ ra câu mẫu khác. 00187 còn 2 đề xuất (lần 10 là 4) và hết thẻ trùng về người đại diện. `grep "Bổ sung trước giải ngân"` ra 0. Còn lặp nhẹ "…người đại diện trước giải ngân" dưới nhãn "Điều kiện trước giải ngân". |
| 3 | Panel AI | **Sửa một phần** | Chip nền đặc, viền và bóng (`tdinh-panel-clip-top`); không còn gạch trùng (`panel-full.txt`). Mâu thuẫn số giữa panel và trang vẫn còn (dòng tiền 668,8 tỷ), thêm LTV "chưa xác định" so với 55,2%. |
| 4 | "inflow" và số định dạng | **Đã sửa** | "inflow" chỉ còn trong mã công cụ `get_annual_inflow` ở cột kỹ thuật. ",0 tỷ" ra 0. Số hiện "80 tỷ đồng", "145 tỷ đồng", "55 tỷ đồng". |
| 5 | Chữ hạn cuối tuần | **Đã sửa** | Thứ Bảy 14/11: "quá hạn từ 13/11" (`qhkh.log`, 5 lần; Trưởng phòng cũng vậy). Không còn "quá hạn hôm nay". |
| 6 | Dữ liệu trình diễn sau reset | **Đã sửa** | `pre-kt.log`: 00187 `n=0/0/0`, "Điều kiện sẽ có sau khi cấp phê duyệt quyết định." |
| 7 | Khối điều kiện | **Đã sửa** | Có dấu chấm ở chữ rỗng (`PreDisbursementPanel.tsx:30`). Trước Phê duyệt ghi "Điều kiện sẽ có sau…". Có nút gập (`:43`, chỉ kiểm ở mã). Nhỏ: hồ sơ Nháp vẫn nhắc "điều kiện trước giải ngân" trong dòng "Chưa có". |
| 8 | Thẻ rỗng ở vai Phê duyệt | **Đã sửa** | 00163: "Chưa có: chỉ số có nguồn, cờ, điều kiện trước giải ngân, tài sản bảo đảm." (6 lần trong file toàn văn). |
| 9 | Nút xóa không tên | **Đã sửa** | `httd-policy-dscr-1366x768` và `-1920x1080`: `unnamed: []`. |
| 10 | Mục nhỏ | **Sửa một phần** | Đã sửa:<br>• tên chỉ số "TSĐB";<br>• bỏ ".…";<br>• bỏ dấu cách ở trang đăng nhập;<br>• nhãn "v8 lần 1–4" và ghi chú gọn;<br>• chú thích DSCR ở KPI.<br>Còn: chữ AI vẫn có "TSBĐ" (`drawer-00187.txt:21`); ngăn kéo vẫn coi 1,34 là "DSCR chính thức", còn KPI lớn ghi 1,76. Đã có chú thích nên không trừ. |

Hồi quy: không thấy từ 23 commit `97062e0..28ee04d` trên 202 lượt đo. Lỗi "cIC" không do commit mới gây ra: `agentTrace.ts:226` đã có từ trước. Lần này nó lộ ra vì LLM sinh nguồn khác.

## Danh sách việc phải sửa (xếp theo ảnh hưởng tới điểm)

1. **"Dữ kiện cIC" (tiêu chí 3, 9, 10).**
   - Chỗ: 00163, trích nguồn và Căn cứ của đề xuất, ở mọi vai xem được hồ sơ (`full-pheduyet-13.txt:73,96`).
   - Vì sao: lỗi viết hoa trên hồ sơ trình diễn, cùng loại với "ĐỀ xuất" từng làm lần 9 trượt.
   - Sửa: `frontend/src/features/dashboard/agentTrace.ts:226`. Không hạ chữ đầu khi nhãn bảng chung là viết tắt toàn chữ hoa (`/^[A-ZĐ]{2,}$/.test(b)`), hoặc thay `.replace(/ cic$/, ' CIC')` bằng `/ cIC$/`. Thêm test cho "Dữ kiện cic".
2. **Thẻ "Yêu cầu khách bổ sung" chứa việc nội bộ (tiêu chí 7, 9).**
   - Chỗ:
     - 00167: "Trình cấp phê duyệt Cấp 2 Hội sở theo kết quả tính lại";
     - 00187: "Cần làm rõ chênh lệch dòng tiền và xác minh DSCR", gần trùng mục 1;
     - 00163: "…; trình cấp phê duyệt theo thẩm quyền".
   - Vì sao: thẻ nay hiện đúng danh sách sẽ gửi khách. Mục không phải tài liệu khách nộp sẽ bị gửi thật.
   - Sửa: ở engine (`agent_engine/gateway/proposals.py:111-137`), khi dựng `request_documents` thì loại mục mở đầu bằng "Trình", "Tra cứu", "Hoàn tất thẩm định", "Cần làm rõ", "Xác minh". Chuyển các mục này sang việc của cán bộ (thẻ kết luận). Thêm test cho ba chuỗi trên.
   - Giao diện giữ nguyên nguyên tắc "hiện đúng cái sẽ gửi".
3. **Số việc lệch giữa thẻ kết luận và thẻ đề xuất (tiêu chí 2, 7).**
   - Chỗ: 00163 và 00167, "cần bổ sung 2 việc" so với "Yêu cầu khách bổ sung 4 mục".
   - Sửa: ở `agentTrace.ts:735`, đổi tiêu đề thành "AI đề xuất: cần bổ sung trước khi quyết định", không ghi số. Hoặc ghi rõ "2 việc của cán bộ · 4 tài liệu xin khách". Sau việc 2, hai số này sẽ có nghĩa khác nhau.
4. **Một agent hai trạng thái (tiêu chí 4, 7).**
   - Chỗ: 00187, Credit "Cần bổ sung" ở sơ đồ và ngăn kéo, "Đồng ý có điều kiện" ở mục đề xuất và thẻ "Phát hiện…".
   - Sửa: ở `features/dashboard/components/CaseTrace.tsx` và chỗ dựng thẻ "Phát hiện của từng chuyên gia", ghi "Ban đầu: Cần bổ sung → Sau phản biện: Đồng ý có điều kiện". Hoặc chỉ hiện trạng thái cuối và để trạng thái đầu trong phần chi tiết.
5. **Panel AI dùng số khác trang (tiêu chí 10).**
   - Chỗ: panel 00187 ghi "LTV chưa xác định" và dòng tiền "chưa đủ để kiểm chứng (0 giao dịch)", trong khi trang ghi "LTV 55,2" (tạm tính) và "dòng tiền vào xác minh 668,8 tỷ đồng".
   - Sửa: ngữ cảnh panel (`features/ai-panel/` và phần backend dựng ngữ cảnh hồ sơ cho chat) lấy cùng gói số đã kiểm chứng của Validation. Câu LTV ghi "LTV tạm tính 55,2% theo giá khai, chưa có chứng thư định giá".
6. **Lời dặn mô hình lộ ra (tiêu chí 9).**
   - Chỗ: `drawer-00187.txt:99` "Chỉ dùng số này làm DSCR; các số tính lại ở cảnh báo chỉ để đối chiếu, không coi là DSCR khác".
   - Sửa: `scrubInternal` (`agentTrace.ts`) bỏ đuôi "Chỉ dùng số này…". Hoặc engine viết thành "DSCR chính thức 1,34 (cần xác minh); các số tính lại khác chỉ để đối chiếu."
7. **Định dạng trích nguồn không đều (tiêu chí 9, 10).**
   - Chỗ: 00163 "Compliance · Dữ kiện sàng lọc chưa có đánh giá KYC/AML…" thiếu ": “…”"; ngăn kéo "Dữ kiện thẩm định, DSCR DSCR chính thức…" (nhãn và trích dính nhau trong toàn văn, `drawer-00187.txt:128`).
   - Sửa: khi nguồn không có trích riêng thì tách nhãn ra khỏi câu theo mẫu chung "Nhãn: “câu”". Kiểm cột nhãn trong ngăn kéo có ngăn cách nhìn thấy được.
8. **Chữ nhỏ (tiêu chí 3, 9).**
   - "Căn cứ: Điều kiện tiên quyết: …" thành "Căn cứ: điều kiện tiên quyết, phải hoàn tất…" (`ActionProposals.tsx`).
   - Dưới nhãn "Điều kiện trước giải ngân", bỏ đuôi "trước giải ngân" của tiêu đề (`ActionProposals.tsx`, `KIND_ALIAS`: thêm mẫu đuôi).
   - "TSBĐ" trong chữ AI thành "TSĐB" (`cleanAiLine`).
   - "Vốn chủ sở hữu: 1.018,5 so với 270 tỷ đồng" ghi đơn vị cho cả hai số (tiêu đề cờ ở backend `loan_detail_repository.py`).
   - Chat: bỏ "(nguồn: X)" khi câu đã mở bằng "Theo X"; bỏ "(≤ 70%)" thừa.
9. **Hồ sơ Nháp nhắc "điều kiện trước giải ngân" (tiêu chí 2).** `EmptyBlocksNote.tsx`: bỏ mục này khỏi dòng "Chưa có" trước bước Phê duyệt, như khối điều kiện đã làm.
10. **Mục nhỏ còn từ lần 10.**
    - Thẻ thứ ba ở Keycloak có sơ đồ chip.
    - Viền vàng của thẻ đầu ở Tổng quan cần ý nghĩa, hoặc bỏ đi.
    - Giới hạn độ dài dòng khoảng 80 ký tự cho thẻ kết luận và ghi chú So sánh ở 1920.
    - 403, 404 ở 1920 bớt khoảng trống.

## Để lên 8,5 còn thiếu gì (theo từng tiêu chí)

Trung bình đã 8,70, không tiêu chí nào dưới 8,5. Bảng này nêu cái cần để giữ mỗi tiêu chí, hoặc đưa nó lên 9,0.

| # | Tiêu chí | Lần 11 | Còn thiếu |
| --- | --- | --- | --- |
| 1 | Bản sắc | 9,0 | Đạt. Lên 9,5: thẻ thứ ba ở Keycloak có chip (việc 10). |
| 2 | Phân cấp | 9,0 | Đạt. Giữ bằng việc 3 và 9. |
| 3 | Chữ tiếng Việt | 8,5 | Đạt. Giữ bằng việc 1 ("cIC"). Lên 9,0: việc 8 (TSBĐ, đơn vị số). |
| 4 | Màu và trạng thái | 8,5 | Đạt. Lên 9,0: việc 4 (một agent một trạng thái, hoặc ghi rõ trước và sau phản biện). |
| 5 | Mật độ, lưới | 8,5 | Đạt. Lên 9,0: độ dài dòng ở 1920; 403, 404 và Thông báo ở 1920 bớt trống. |
| 6 | Thành phần | 9,0 | Đạt. |
| 7 | AI và người quyết định | 8,5 | Đạt. Lên 9,0: việc 2, 3 và 4. Thẻ gửi khách chỉ có tài liệu, số việc khớp, trạng thái agent không mâu thuẫn. |
| 8 | WCAG AA | 8,5 | Đạt. Lên 9,0 cần căn cứ mà máy này không có: thử bằng trình đọc màn hình thật (NVDA hoặc VoiceOver) trên Việc của tôi, chi tiết hồ sơ và modal quyết định. |
| 9 | Văn phong | **8,5** | **Đạt, nhưng mỏng nhất.** Nếu lượt warm sau sinh thêm chữ hoa sai hoặc mục nội bộ trong thẻ gửi khách thì có thể xuống 8,0. Cần việc 1, 2, 6, 7 và 8. |
| 10 | Hoàn thiện | 8,5 | Đạt. Lên 9,0: việc 1 và 5 (một bộ số chung cho panel và trang). |

## 5 việc nếu chỉ còn một ngày

1. Sửa "Dữ kiện cIC" ở `agentTrace.ts:226`, kèm test (việc 1).
2. Engine lọc việc nội bộ khỏi `request_documents` ("Trình…", "Tra cứu…", "Cần làm rõ…"), kèm test (việc 2).
3. Thẻ kết luận bỏ số "2 việc" hoặc tách "việc của cán bộ" với "tài liệu xin khách" (việc 3).
4. Ghi trạng thái trước và sau phản biện cho từng agent ở ngăn kéo và thẻ "Phát hiện…" (việc 4).
5. Panel AI dùng cùng gói số với thẻ kết luận: LTV tạm tính, dòng tiền đã xác minh (việc 5).

## Chưa kiểm chứng và chỗ brief sai

- **Brief nói crew `ur` đã sửa các việc của lần 10.** Đo lại: 8 việc đã sửa. Việc 3 (panel AI: mâu thuẫn số với trang) và việc 10 ("TSBĐ" trong chữ AI) mới sửa một phần.
- **Brief nói engine "viết điều kiện thành việc phải làm".** Đúng với thẻ kết luận 00187: 4 mục đều là việc. Nhưng danh sách tài liệu xin khách ở 00163 và 00167 vẫn có việc nội bộ (việc 2).
- **Brief nói "chưa có phiên Hội đồng".** Thanh bên của Phê duyệt và Kiểm toán có mục "Phiên Hội đồng tín dụng". Không mở để chấm, theo brief.
- **Chữ AI do LLM sinh, mỗi lượt warm mỗi khác.** "cIC", "Trình cấp phê duyệt…" trong thẻ gửi khách, và "TSBĐ" có thể không lặp lại ở lượt sau. Chỗ hở ở bộ lọc hiển thị (`agentTrace.ts:226`) và ở engine vẫn đúng.
- **Gập danh sách điều kiện khi hơn 5 mục:** không có dữ liệu để kiểm trên giao diện, chỉ kiểm ở mã.
- **Ảnh `tdinh-panel-answer` chụp lúc còn "Đang kết nối"** (xem Bẫy). Chưa đo câu trả lời panel mất bao lâu. Câu trả lời ở trang chat mất khoảng 13,5 giây.
- **Không có trình đọc màn hình thật.** Chỉ kiểm cây tiếp cận theo `docs/agent/review-ux.md`.
- Trang 6, 17, 18, 20, 21, 22, 29 và 32 chỉ kiểm bằng bộ đo (tràn, tương phản, nhãn, rawScan) và xem lướt ảnh; không thấy lỗi mới.
