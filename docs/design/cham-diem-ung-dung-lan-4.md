# Chấm thẩm mỹ và UX ứng dụng thật, lần 4

Giám khảo độc lập `gu4`, ngày 12/11/2026. Chấm ứng dụng chạy thật ở `http://localhost:3000` và Keycloak `:8080`, HEAD `import/duskdash` `abe86da`. Đích so sánh: `docs/design/redesign-v2.md` và `docs/design/mockups-v2/*.html`. Cùng thang và ngưỡng với lần 3 (`docs/design/cham-diem-ung-dung-lan-3.md`).

## Kết luận

**Điểm trung bình 10 tiêu chí: 7,65 / 10. Kết luận: KHÔNG ĐẠT** (ngưỡng ĐẠT: trung bình từ 8,5 và không tiêu chí nào dưới 7).

- Không tiêu chí nào dưới 7. Tiêu chí thấp nhất là 10 (độ hoàn thiện) 7,0. Tiếp theo là các tiêu chí 2, 3, 5, 7, 9, cùng 7,5.
- Trung bình 32 trang tính điểm là 7,88. Lần 3 là 7,58.
- Lịch sử điểm tiêu chí: lần 1 6,20; lần 2 7,00; lần 3 7,25; lần 4 **7,65** (tăng 0,40).
- Kiểm lại 13 việc lần 3:
  - Đã sửa: 7 việc (1, 2, 6, 8, 9, 10, 11).
  - Sửa một phần: 5 việc (4, 5, 7, 12, 13).
  - Chưa sửa trên màn hình thật: việc 3, màn Phê duyệt kể kết luận AI.
  - Hồi quy mới: cách tách gạch đầu dòng trong văn bản AI cắt đôi câu thành mảnh viết thường.
- Lỗi lớn nhất lần 3 đã hết. Chữ nút "Xác nhận từ chối" nay đạt 7,03:1 và focus mặc định ở "Quay lại". Tiêu chí 8 vì vậy lên từ 6,0 thành 8,0.
- Còn chặn mốc 8,5 là phần **nội dung**, không phải khung:
  - màn Phê duyệt 00163 và 00167 vẫn không có câu kết luận AI, TodoPanel vẫn xanh "Không còn điều kiện nào…" trong khi AI nói "Cần bổ sung";
  - văn bản AI bị cắt mảnh, còn "vs" và "0 đồng";
  - mã `LA-…` vẫn in ở Việc của tôi, danh sách đối chiếu, chi tiết hồ sơ;
  - vai Kiểm toán thấy nút "Sửa đề xuất" và hai KPI trùng số;
  - mã loại tài liệu "DENGHI ·", "DKKD ·" ở OCR;
  - 1920 có lưới lệch giữa ô tìm kiếm và nội dung.

## Cách chấm

- **Công cụ:** Playwright Chromium, mỗi lần một trình duyệt, đóng ngay khi xong. Script và ảnh ở `/tmp/gu4/` (`lib.cjs`, `run.cjs`, `run.sh`, `st-*.cjs`, `summ.py`). Đăng nhập Keycloak thật bằng tài khoản trong `frontend/e2e/helpers.ts`, mật khẩu đọc từ file, không in ra.
- **Vai:** QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ, Phê duyệt, Trưởng phòng, Kiểm toán, Quản trị.
- **Cỡ màn hình:** 1366×768 và 1920×1080 cho mọi trang. Thêm 1280×800 và 1440×900 cho đăng nhập, Việc của tôi, chi tiết hồ sơ, dashboard. Có 209 ảnh.
- **Đo trên DOM thật cho mỗi ảnh:**
  - tràn ngang;
  - cỡ chữ nhỏ nhất;
  - tương phản chữ trên màu nền thực, có trộn alpha qua các lớp cha;
  - tương phản chữ của từng nút trên nền của chính nút, kể cả trong `[role=dialog]` (bẫy lần 3);
  - nút và ô nhập thiếu tên truy cập;
  - số `h1` và `main`;
  - quét mã thô (`snake_case`, UUID, `LA-`, `null`, mã trạng thái tiếng Anh, "(dữ liệu mẫu)").
- **Vòng focus:** đo màu `outline` hoặc `box-shadow` so với nền cha khi Tab. Antd Select, DatePicker và Segmented đặt vòng trên khung bọc, nên số đo trên phần tử bên trong cho kết quả âm tính giả. Đã cắt ảnh để xem tận mắt (`qhkh-seg-focus-clip.png`, `kiemtoan-auditfocus*-clip.png`).
- **Lượt chạy AI:** chạy một lần dưới `flock /tmp/do-an-e2e.lock` lúc 22:31–22:38: `reset-demo.sh --warm`, rồi chụp trạng thái đang chạy, 00187, 00163 và dashboard.
  - Đã dùng 2/4 lượt đội agent (do `--warm` chạy) và 1/10 câu hỏi chat.
  - Không gặp 402, không gặp lỗi "Failed to fetch dynamically imported module", không có `pageerror`.
- **Nguyên tắc:** chỉ xem. Modal quyết định chỉ mở tới bước xác nhận rồi bấm "Quay lại" hoặc Esc. Không ghi gì trên hồ sơ seed.
- **Kết quả đo chung:**
  - 0 tràn ngang ở mọi ảnh;
  - cỡ chữ nhỏ nhất 12px;
  - 0 chữ dưới AA, 0 nút có chữ dưới 4,5:1;
  - mỗi trang đúng một `h1` và một `main`.
- **Bộ đo báo "không tên" nhưng là âm tính giả** (đã dò từng phần tử):
  - `TEXTAREA` là bản sao đo chiều cao của Antd autosize (`aria-hidden=true`, `visibility:hidden`, `position:absolute`). Ô thật có `aria-label="Câu hỏi cho trợ lý"`, ô tờ trình có `label for="memo-n"`.
  - `ant-tabs-nav-more` ẩn.
  - `ant-input-clear-icon-hidden` ẩn.
- **Thiếu tên thật duy nhất:** nút xóa (×) ở ô tìm chính sách khi đã gõ chữ (`httd-policy-dscr-*`). Nút này có `tabindex=-1`, chỉ dùng được bằng chuột.

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 3 | Lần 4 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán giữa các trang | 8,0 | 8,0 | Navy, vàng đồng, tiêu đề serif, số mono đều từ Keycloak tới chat, dashboard, OCR, 403/404. Tiêu đề cột bảng nay sans, ô số mono (`qhkh-dash-y700`, `qhkh-home`). Còn lệch: khung tải mất cả thanh trên và mục menu (`pheduyet-loading-loan`); "Nháp chưa đánh số" ở Nhật ký đặt mono, giãn chữ, màu như liên kết; KPI soạn đề xuất "80" (to) cạnh "12" (nhỏ) cùng kiểu thẻ (`qhkh-compose`). |
| 2 | Phân cấp thông tin, hành động chính ở màn đầu | 7,5 | 7,5 | Tốt: Việc của tôi (KPI, nút chính), 00187 có câu kết luận serif "Đề xuất phê duyệt với điều kiện tiên quyết…" ngay đầu khối AI, nút "Trình Rủi ro" khóa kèm hộp vàng "Chưa đủ điều kiện để trình". Chưa: 00163 (Phê duyệt) mở đầu "Chỉ xem" và "Phát hiện của từng chuyên gia (3 cần chú ý)", không có câu kết luận; 00167 vẫn "Hồ sơ này trình trước khi có đội agent nên chưa có kết luận AI"; Kiểm toán có hai KPI cùng 67 ("Hồ sơ đang mở", "Trong phạm vi kiểm toán"); 00176 (Rủi ro) màn đầu toàn câu rỗng ("Chưa chạy đội agent", "Chưa có chỉ số nào có tài liệu nguồn"). |
| 3 | Chữ và khả năng đọc tiếng Việt | 7,5 | 7,5 | Dấu đúng, serif tiêu đề đẹp, đoạn Planner nay cắt 3 dòng kèm "Xem đầy đủ". Hồi quy: `parseAiText` tách theo ";" nên một câu thành hai mảnh viết thường: "Đã soạn nội dung bản nháp khoản vay để người có thẩm quyền xem" / "chưa ghi vào hệ thống" (00187, 00163, ngăn kéo); "…do chưa có kết quả CIC" / "hoàn tất tra cứu trước khi tiếp tục thẩm định"; "cần bổ sung trước khi quyết định cấp tín dụng". Còn "vs" ("93,2 vs 81,0 tỷ"), "— " trong trích nguồn KYC/AML. |
| 4 | Màu và ngữ nghĩa trạng thái | 7,0 | 8,0 | Đã sửa: hạn 13/11 đều vàng "còn 1 ngày LV", quá hạn đỏ, tạm dừng xám (`httd-recon-list`, `*-home`); nút từ chối đỏ, chữ trắng 7,03:1; "Đội agent tốt hơn" xanh, "Ngang nhau" xám. Còn sai nghĩa: TodoPanel xanh "Không còn điều kiện nào đang chặn ở bước này" khi AI "Cần bổ sung" (00163, Kiểm toán xem hồ sơ); chip "Đạt" xanh cho Operations trong khi nội dung nêu điều kiện bổ sung; "Mức rủi ro: Chưa xếp hạng" xám ở mọi dòng khách hàng. |
| 5 | Mật độ, lưới, khoảng cách ở 1366 và 1920 | 7,5 | 7,5 | 0 tràn ngang ở 1280/1366/1440/1920. Panel AI phủ dưới 1440. Còn: ở 1920 nội dung căn giữa bắt đầu x=460 nhưng ô tìm kiếm bắt đầu x=248 (`tdinh-loan187-1920x1080`), hai lưới lệch nhau; chi tiết khách hàng trống nửa dưới; OCR cột giữa trống dưới thẻ "Chưa có ảnh trang", khoảng 40px thừa trên banner; bảng tài sản cắt tiêu đề cột phải ở 1366; "Tải PDF" khóa dính sát câu lý do, không có khoảng cách. |
| 6 | Thành phần và trạng thái | 7,5 | 8,0 | Đủ: lỗi có biểu tượng, `h1` "Không tải được hồ sơ", "Thử lại" (`pheduyet-error-loan`); đang chạy "Đã chạy 00:23… 1/4 chuyên gia đã xong", nút "Đội agent đang chạy…" khóa; chat đang chờ; rỗng có trích từ khóa; modal hai bước cho mọi loại quyết định, kể cả trả về; ngăn kéo trace Esc trả focus về đúng dòng. Còn: khung tải không có khung menu và thanh trên, nhảy bố cục khi xong; Tổng quan dashboard còn khung xương sau 1,5 giây; thẻ "Hành động" ở nháp chỉ có câu chung, không có nút. |
| 7 | AI đề xuất và người quyết định; hiểu đội agent trong 30 giây | 7,5 | 7,5 | Dashboard Tổng quan có sơ đồ Planner → Credit, Compliance, Operations, Document → Validation → "Cấp phê duyệt: Người quyết định, ngoài khung AI". Ngăn kéo trace có sơ đồ từng chuyên gia, thời gian, "Người quyết định: Ngoài khung AI, quyết định cuối cùng", luồng "Bộ chạy tác vụ → Credit · giao việc". So sánh có "Nhận xét", "Cách đo", bảng chênh lệch. Khối AI ở hồ sơ ghi "AI đề xuất, chưa xác nhận" và "Việc của bạn". Điểm không lên vì màn người quyết định (Phê duyệt 00163, 00167), đúng nơi giám khảo cuộc thi xem, vẫn không nói AI đề xuất gì. Bảng "Theo từng agent": Document "0 lượt tham gia, 74 lỗi", Planner "0 lượt", "Hệ thống 0 0 0" làm người xem nghĩ đội agent hỏng. |
| 8 | Tiếp cận WCAG AA | 6,0 | 8,0 | Đã sửa: chữ "Xác nhận từ chối" trắng trên đỏ 7,03:1; "Trả lại bổ sung" 5,70:1; focus mặc định "Quay lại", Tab vòng trong modal ("Xác nhận từ chối" → "Đóng" 8,48:1); Keycloak focus 3px navy; Esc ngăn kéo trả focus về dòng (3px, 8,48:1); "Xem đầy đủ" vòng 7,81:1; ô chat có tên; combobox tìm kiếm vòng 7,82:1; Esc panel AI trả focus "Hỏi trợ lý". 0 chữ dưới AA. Còn: nút xóa ô tìm chính sách không tên; xác nhận phê duyệt mở bằng chuột focus "Quay lại" không có vòng nhìn thấy (đúng `:focus-visible`, chấp nhận); chưa thử trình đọc màn hình thật. |
| 9 | Văn phong UX | 7,5 | 7,5 | Đã sửa: "Hạn mức phê duyệt, đồng (bắt buộc)", "= 55 tỷ đồng. Đề nghị 55 tỷ đồng.", "Kỳ hạn, tháng (bắt buộc)", "Nháp chưa đánh số", câu trả lời chat có nguồn và "Chỉ để tham khảo. Quyết định thuộc người có thẩm quyền." Còn: mảnh câu AI (tiêu chí 3); "Hạn mức bảo đảm đủ điều kiện hiện tính được: 0 đồng"; Validation "Cần bổ sung thiếu dữ liệu chặn:"; thông báo "Hồ sơ bị trả lại:" không có mã sau dấu hai chấm; "Một số thông báo thuộc hồ sơ dữ liệu mẫu; không ảnh hưởng hồ sơ thật."; "Thiếu Ý kiến Rủi ro, ý kiến Tuân thủ"; tiêu đề mục checklist OCR kết thúc bằng "."; "Chưa chạy đội agent: nên chạy để có đề xuất tham khảo". |
| 10 | Độ hoàn thiện sản phẩm thật | 6,5 | 7,0 | Tiến: không lỗi vite, không `pageerror`, không mã vai thô, không "(dữ liệu mẫu)" trong lý do trả về, tiêu đề cột đúng kiểu. Còn: `LA-20261112-…` ở Việc của tôi (QHKH, HTTD, Thẩm định, Kiểm toán), danh sách đối chiếu, breadcrumb và "Mã hồ sơ" chi tiết; mã loại tài liệu "DENGHI ·", "DKKD ·", "DIEULE ·", "CIC ·" ở OCR; Kiểm toán (chỉ đọc) thấy nút "Sửa đề xuất" và thẻ "Việc của bạn"; Rủi ro thấy "Chạy đội agent" bật; mảnh câu AI; 1920 lệch lưới. |
| | **Trung bình** | **7,25** | **7,65** | Không tiêu chí nào dưới 7. Chưa tới 8,5: **KHÔNG ĐẠT**. |

## Bảng từng trang

Trung bình 32 trang tính điểm: **7,88**. Quản trị và Phiên Hội đồng không tính.

| # | Trang hoặc trạng thái (vai) | Lần 3 | Lần 4 | Phải sửa (ảnh · phần tử · file nghi ngờ trong `frontend/src`) |
| --- | --- | --- | --- | --- |
| 1 | Đăng nhập Keycloak | 8,0 | 8,5 | Không còn việc lớn. Focus 3px navy, nút con mắt không gạch chân (`none-kc-focus`). |
| 2 | Khung: thanh bên, thanh trên, dải demo | 8,0 | 8,0 | 1) `tdinh-loan187-1920x1080`: ô tìm kiếm x=248, nội dung x=460; đặt ô tìm trong cùng cột max-width với nội dung · `app/shell/Topbar*` hoặc `AppShell`. 2) `pheduyet-loading-*`: khung tải mất thanh trên và mục menu · `app/AppShell`/`RequireAuth`. |
| 3 | Việc của tôi (QHKH) | 8,5 | 8,5 | 1) `qhkh-home-*`: dòng nháp in `LA-20261112-…` mono; hiện "Nháp chưa đánh số" như Nhật ký · `features/my-work/MyWorkPage.tsx`. |
| 4 | Việc của tôi (Trưởng phòng) | 8,0 | 8,5 | "3 cờ · 2 cao" nay một dòng. Không còn việc lớn. |
| 5 | Việc của tôi (Kiểm toán) | 7,5 | 7,5 | 1) `kiemtoan-home-*`: hai KPI 67 trùng ("Hồ sơ đang mở", "Trong phạm vi kiểm toán") · `MyWorkPage.tsx:97,102`. 2) Dòng "Đã rút" có nút "Sửa đề xuất" với vai chỉ đọc; đổi thành "Xem" · `MyWorkPage.tsx`. |
| 6 | Tìm kiếm (combobox) | 8,5 | 8,5 | Không có việc lớn. |
| 7 | Chi tiết hồ sơ HSV-00201 (QHKH, trả về) | 7,5 | 8,0 | 1) `qhkh-loanA-y1400`: "Tải PDF" khóa dính sát "Chưa xuất được: Tờ trình chưa được chốt khi trình."; xuống dòng hoặc cách 8px, chữ phụ · `features/loan-detail/MemoPanel.tsx:63-66`. |
| 8 | Chi tiết hồ sơ HSV-00187 (Thẩm định, kết quả AI) | 7,5 | 8,0 | 1) `tdinh-loan187-*`: Operations "Điều kiện vận hành đạt. Đã soạn…" / "chưa ghi vào hệ thống" mảnh viết thường · `features/dashboard/agentTrace.ts:385-398` (`parseAiText`). 2) "Hạn mức bảo đảm đủ điều kiện hiện tính được: 0 đồng" là điều kiện vô nghĩa; lọc ở `dedupeConditions` hoặc ẩn khi bằng 0 · `AgentTeamPanel.tsx`. 3) "Đi tới" lệch dòng ở thẻ Việc cần làm (mục 1 không có, mục 4 là "Mở") · `TodoPanel.tsx`. |
| 9 | Chi tiết hồ sơ HSV-00176 (Rủi ro) | 7,5 | 7,5 | 1) `ruiro-loanA-*`: "Thiếu Ý kiến Rủi ro, ý kiến Tuân thủ", viết hoa không đều · `ActionsPanel.tsx`. 2) Màn đầu toàn câu rỗng ("Chưa chạy đội agent", "Chưa có chỉ số nào có tài liệu nguồn"); gộp thành một hộp "Hồ sơ chưa có dữ liệu AI" · `AgentTeamPanel.tsx`, `LoanDetailPage.tsx`. 3) Vai Rủi ro thấy "Chạy đội agent" bật. |
| 10 | Chi tiết hồ sơ (Tuân thủ) | 7,5 | 7,5 | 1) `tuanthu-loanA-*`: cùng lỗi viết hoa "Thiếu Ý kiến…" và câu rỗng như #9. |
| 11 | Chi tiết hồ sơ (HTTD) | 7,5 | 7,5 | 1) `httd-loanA-*`: `LA-…` trong breadcrumb và "Mã hồ sơ" khi mở nháp · `LoanDetailPage.tsx`. 2) Mảnh câu AI như #8. |
| 12 | Chi tiết hồ sơ HSV-00163 (Phê duyệt, có lượt AI) | 6,5 | **6,5** | 1) `pheduyet-loan163-1366x768`: không có câu kết luận serif vì `AgentTeamPanel.tsx:228` chỉ hiện khi có `pkg.recommendation`; khi lượt dừng ở "Cần bổ sung" cần một câu từ trạng thái lượt, ví dụ "AI đề xuất: cần bổ sung CIC, BCTC và sàng lọc AML trước khi quyết định". 2) TodoPanel xanh "Không còn điều kiện nào đang chặn ở bước này" khi AI "Cần bổ sung" · `TodoPanel.tsx:38` (điều kiện `aiConditions === 0` bỏ qua cờ và phát hiện "cần thêm thông tin"). |
| 13 | Chi tiết hồ sơ HSV-00167 (Phê duyệt, không AI) | 6,5 | **6,5** | 1) `pheduyet-loanA-*`: "Hồ sơ này trình trước khi có đội agent nên chưa có kết luận AI" ở đúng màn giám khảo xem · `AgentTeamPanel.tsx:98`; cần seed lượt AI cho mọi hồ sơ đang chờ phê duyệt (`infra/scripts/reset-demo.sh --warm`) hoặc đưa 00187 lên hàng đầu "Chờ phê duyệt". 2) TodoPanel xanh như #12. |
| 14 | Modal quyết định, bước chọn | 7,5 | 8,5 | Nhãn đã đúng. Không còn việc lớn. |
| 15 | Modal quyết định, bước xác nhận (từ chối, trả về) | 4,0 | 8,5 | Chữ 7,03:1, focus "Quay lại", Tab vòng trong modal. Không còn việc lớn. |
| 16 | Đội agent đang chạy (00187) | 8,0 | 8,0 | 1) `tdinh-running1-*`: phát hiện từng chuyên gia còn mảnh câu (#8). |
| 17 | Tạo và soạn đề xuất (nháp DX-2026-00412) | 8,0 | 8,0 | 1) `qhkh-compose-1366x768`: KPI "80" to, "12" nhỏ trong hai thẻ cùng kiểu · `LoanDetailPage.tsx` (ô KPI). 2) Thẻ "Hành động" chỉ có câu chung; thêm nút "Sửa đề xuất" hoặc bỏ thẻ ở trạng thái nháp · `ActionsPanel.tsx`. |
| 18 | Danh sách đối chiếu (HTTD) | 7,5 | 8,0 | 1) `httd-recon-list-*`: `LA-…` ở cột mã · `ReconciliationIndexPage.tsx`. |
| 19 | Chi tiết đối chiếu và OCR | 7,0 | 7,5 | 1) `httd-ocr187-*`: "DENGHI ·", "DKKD ·", "DIEULE ·", "CIC ·" trước tên tài liệu; bỏ mã hoặc đổi sang tên loại tiếng Việt · `ChecklistPanel.tsx:24`, `DocumentViewer.tsx:82`, `fieldLabels.ts`. 2) Cột giữa trống dưới thẻ "Chưa có ảnh trang"; khoảng 40px thừa trên banner · `reconciliation.module.css`. 3) Tiêu đề mục checklist kết thúc bằng "." và chip "Đạt" khi cùng dòng khi xuống dòng · `ChecklistPanel.tsx`. |
| 20 | Khách hàng | 7,5 | 7,5 | 1) `qhkh-customers-*`: "Mức rủi ro: Chưa xếp hạng" mọi dòng; ẩn cột khi cả trang không có dữ liệu · `CustomerListPage.tsx`. |
| 21 | Chi tiết khách hàng | 7,0 | 7,5 | Số tiền đã "20 tỷ". 1) `qhkh-customer-detail-*`: nửa dưới trống ở 1366 và 1920 · `CustomerDetailPage.tsx`. |
| 22 | Thông báo | 8,5 | 8,0 | 1) `qhkh-notif-1366x768`: "Hồ sơ bị trả lại:" không có mã hồ sơ sau dấu hai chấm · `NotificationsPage.tsx`. 2) Câu cuối "Một số thông báo thuộc hồ sơ dữ liệu mẫu; không ảnh hưởng hồ sơ thật." thừa và gây nghi ngờ · `NotificationsPage.tsx:89`. |
| 23 | Dashboard Tổng quan | 8,0 | 8,0 | 1) `qhkh-dash-y700-*`: dòng "Hệ thống 0 0 0" thừa; Document "0 lượt, 74 lỗi" và Planner "0 lượt" làm người xem tưởng hỏng; ghi chú cột "Lỗi" hoặc gộp · `features/dashboard/components/OverviewTab.tsx`. 2) Khung xương sau 1,5 giây ở lần mở đầu (`*-dash-*` các vai). |
| 24 | Dashboard Dấu vết | 8,0 | 8,0 | 1) `qhkh-trace-*`: hai ô lọc còn hai dòng · `TracesTab.tsx`. |
| 25 | Ngăn kéo trace | 7,5 | 7,5 | 1) `qhkh-drawer-*`: mảnh câu "hoàn tất tra cứu trước khi tiếp tục thẩm định", "cần bổ sung trước khi quyết định cấp tín dụng" · `agentTrace.ts:385`. 2) Validation "Cần bổ sung thiếu dữ liệu chặn:" thiếu dấu câu · `agentTrace.ts`. |
| 26 | Dashboard So sánh | 8,5 | 8,5 | 1) `qhkh-compare-1366x768`: "Mã kỹ thuật" lửng cuối đoạn "Cách đo" · `ComparisonTab.tsx`. |
| 27 | Trợ lý AI (chat) | 8,0 | 8,5 | Câu trả lời mới (13,5 giây) có nguồn, chip "AI đề xuất", câu miễn trừ. Không còn việc lớn. |
| 28 | Panel AI trong hồ sơ | 7,5 | 8,0 | Ô nhập có tên (âm tính giả của bộ đo đã dò). 1) `qhkh-aipanel-*`: hội thoại cũ còn "VND". |
| 29 | Nhật ký kiểm toán | 7,0 | 7,5 | 1) `kiemtoan-audit-*`: "Nháp chưa đánh số" đặt mono, giãn chữ, màu như liên kết; đổi sang chữ thường xám nghiêng · `AuditLogPage.tsx`. |
| 30 | Tra cứu chính sách | 8,0 | 8,0 | 1) `httd-policy-dscr-*`: nút xóa (×) không tên. 2) "RETAIL-CREDIT-DEMO Chính sách tín dụng bán lẻ mẫu" lẫn vào danh sách SME · `features/policy/`. |
| 31 | 403 và 404 | 8,0 | 8,0 | 1) `qhkh-403-audit-*`: `h1` nhỏ ở góc, tách khỏi khối báo lỗi (chưa đổi). |
| 32 | Đang tải và lỗi | 8,0 | 7,5 | 1) `pheduyet-loading-*`: khung tải không có thanh trên và mục menu, nhảy bố cục khi tải xong (lần 3 đã nêu, chưa sửa). |
| — | Quản trị (không tính trung bình) | 7,0 | 7,0 | 1) `quantri-home-*`: vẫn vào "/viec-cua-toi", `h1` "Việc của tôi" và "Không có quyền xem nội dung nghiệp vụ". 2) "Pham Thu Ha" không dấu, mã `EMP-DEMO`. 3) Tab ở trang chủ rơi về `BODY` hai lần. Phân trang đã có tên. |
| — | Phiên Hội đồng | không chấm | — | Ngoài phạm vi; mục "Phiên Hội đồng tín dụng" ở thanh bên vai Phê duyệt. |

## Kiểm lại 13 việc lần 3

| # | Việc lần 3 | Kết quả | Bằng chứng lần 4 |
| --- | --- | --- | --- |
| 1 | Chữ nút "Xác nhận từ chối" vô hình | **Đã sửa** | `pheduyet-decision-confirm-reject-1366x768`: đo màu chữ nút trong `[role=dialog]`, chữ `rgb(255,255,255)` trên `rgb(168,40,29)`, 7,03:1. `btnLow` 0 ở mọi ảnh modal. |
| 2 | Focus ở bước xác nhận | **Đã sửa** | `activeElement` là "Quay lại" khi vào bước xác nhận; Tab vòng "Xác nhận từ chối" → "Đóng" (outline 2px navy, 8,48:1) không rời modal. Trả về có bước xác nhận "Xác nhận trả về …", nút vàng chữ `rgb(27,20,5)` trên `rgb(176,138,62)` 5,70:1. |
| 3 | Màn Phê duyệt kể được kết luận AI | **Chưa sửa** (trên màn thật) | Phần sửa trong `AgentTeamPanel.tsx:228` và `TodoPanel` chỉ chạy khi có `pkg.recommendation` hoặc `conditions.length > 0`; 00163 sau lượt thật dừng ở "Cần bổ sung" nên không có cả hai. `pheduyet-loan163-1366x768`: không câu kết luận, TodoPanel xanh "Không còn điều kiện nào…". `pheduyet-loanA` (00167): vẫn "trình trước khi có đội agent". Phần đã sửa: chữ khóa đổi thành tooltip "Chỉ xem". |
| 4 | Làm sạch văn bản AI | **Sửa một phần, có hồi quy** | Nhãn chữ hoa thành chip ("Cần bổ sung"), có gạch đầu dòng, 00187 còn 7 điều kiện (lần 3 là 9). Hồi quy: tách ";" cắt câu thành mảnh viết thường (xem tiêu chí 3). Còn "vs", "0 đồng", "— " trong trích nguồn, "Cần bổ sung thiếu dữ liệu chặn:". |
| 5 | Mã nháp `LA-…` ở Nhật ký kiểm toán | **Sửa một phần** | Nhật ký: "Nháp chưa đánh số" (nhưng mono, giãn chữ, màu liên kết). Mã `LA-20261112-E6055323`, `LA-20261112-59F60DC0` vẫn hiện ở Việc của tôi (QHKH, HTTD, Thẩm định, Kiểm toán), danh sách đối chiếu, breadcrumb và "Mã hồ sơ" (`kiemtoan-loanA`). Dữ liệu do `g7` tạo, nhưng giao diện in mã thô. |
| 6 | Nhãn form modal quyết định | **Đã sửa** | "Hạn mức phê duyệt, đồng (bắt buộc)", "= 55 tỷ đồng. Đề nghị 55 tỷ đồng.", "Kỳ hạn, tháng (bắt buộc)" (`pheduyet-decision-filled`). |
| 7 | KPI Kiểm toán mâu thuẫn | **Sửa một phần** | "2 Đã quá hạn" khớp tab "Quá hạn 2". Còn hai KPI cùng 67; nút "Sửa đề xuất" ở dòng "Đã rút"; trang hồ sơ của Kiểm toán có "Việc của bạn" và TodoPanel xanh. |
| 8 | Khung xem OCR là ô xám | **Đã sửa** (phần chính) | Thẻ gọn "Chưa có ảnh trang…" kèm chip trường (Nhóm nợ, Dư nợ TCTD (a)…), "4 trường khác trên trang này". Còn cột giữa trống, mã "DENGHI ·". |
| 9 | Màu hạn thống nhất | **Đã sửa** | 13/11 đều vàng "còn 1 ngày LV"; 11/11 đỏ "quá hạn 1 ngày LV"; 12/11 "hạn hôm nay"; 00196 xám "tạm dừng". |
| 10 | Kiểu số và tiêu đề cột | **Đã sửa** | Tiêu đề cột sans ở Việc của tôi, Theo từng agent, Công cụ MCP, Chênh lệch chi tiết; ô số mono. Ô KPI soạn đề xuất khác cỡ (việc mới, nhỏ). |
| 11 | Keycloak focus và nút con mắt | **Đã sửa** | `none-kc-focus-1366x768`: vòng 3px navy ở ô tên đăng nhập; nút con mắt không gạch chân. |
| 12 | Quản trị (không tính) | **Sửa một phần** | Phân trang có tên (bộ đo không còn nút không tên); không còn `authority_tier`. Vẫn vào "/viec-cua-toi" với `h1` "Việc của tôi"; tên không dấu "Pham Thu Ha"; Tab rơi về `BODY`. |
| 13 | Phần nhỏ | **Sửa một phần** | Đã sửa: số tiền khách hàng "20 tỷ"; "Hiệu lực từ" 12px; ô nhập chat và panel AI có tên (`aria-label="Câu hỏi cho trợ lý"`); Esc ngăn kéo trả focus về dòng (`TR` outline 3px, 8,48:1); "(dữ liệu mẫu)" hết ở lý do trả về 00201. Chưa sửa: "Mức rủi ro: Chưa xếp hạng" mọi dòng. |

## Danh sách việc phải sửa, theo mức ảnh hưởng tới điểm

1. **Màn Phê duyệt kể được AI đề xuất gì** (tiêu chí 2, 4, 7; trang 12, 13). Ảnh hưởng lớn nhất vì đây là màn giám khảo cuộc thi xem.
   - `AgentTeamPanel.tsx:228`: khi không có `pkg.recommendation`, dựng câu kết luận từ trạng thái lượt. Ví dụ với 00163: "AI đề xuất: cần bổ sung trước khi quyết định: kết quả CIC, BCTC kiểm toán, sàng lọc AML." Lấy từ danh sách "Cần thêm thông tin" của từng chuyên gia, tối đa 3 ý. Cùng kiểu serif `styles.concl` như 00187.
   - `TodoPanel.tsx:38`: chỉ hiện dòng xanh khi không có điều kiện, không có cờ mở và không có chuyên gia nào ở "Cần thêm thông tin". Nếu lượt AI "Cần bổ sung", hiện dòng vàng "AI nêu 3 điểm cần bổ sung; xem khối Đội agent".
   - Dữ liệu: mọi hồ sơ trong hàng "Chờ phê duyệt" của vai Phê duyệt cần có một lượt AI. Hoặc xếp 00187 lên đầu để màn đầu tiên giám khảo mở không phải 00167 "trình trước khi có đội agent". Đây là việc seed và `reset-demo.sh --warm`, cần Mate quyết định.
2. **Sửa cách tách gạch đầu dòng văn bản AI** (tiêu chí 3, 9, 10; trang 8, 11, 12, 16, 25). `agentTrace.ts:385-398` (`parseAiText`):
   - chỉ tách theo ";" khi mỗi mảnh từ 6 từ trở lên và mảnh sau không bắt đầu bằng chữ thường nối tiếp ("chưa", "hoàn tất", "cần", "phải");
   - ngược lại giữ nguyên câu và viết hoa chữ đầu mỗi mục;
   - thêm thay "vs" bằng "so với";
   - bỏ điều kiện "… hiện tính được: 0 đồng";
   - "Cần bổ sung thiếu dữ liệu chặn:" thành chip "Cần bổ sung" kèm câu "Thiếu dữ liệu chặn trình:";
   - đổi "— " trong trích nguồn thành ", ".
   - Kiểm bằng ảnh 00187, 00163 và ngăn kéo trace sau một lượt chạy.
3. **Bỏ mã `LA-…` khỏi mọi màn** (tiêu chí 1, 10; trang 3, 5, 11, 18).
   - Dùng chung một hàm hiển thị mã: có `HSV-`/`DX-` thì in mã, còn `LA-` thì in "Nháp chưa đánh số" chữ thường xám.
   - Áp ở `MyWorkPage.tsx`, `ReconciliationIndexPage.tsx`, `LoanDetailPage.tsx` (breadcrumb, "Mã hồ sơ"), `AuditLogPage.tsx` (bỏ mono và màu liên kết).
4. **Vai chỉ đọc không thấy nút ghi, không thấy "Việc của bạn"** (tiêu chí 2, 10; trang 5, 9).
   - `MyWorkPage.tsx`: với `readOnly`, nút dòng là "Xem", bỏ một trong hai KPI 67 (`MyWorkPage.tsx:97,102`; đề xuất: "Hồ sơ trong phạm vi", "Đã quá hạn", "Có cờ cao").
   - Chi tiết hồ sơ: bỏ thẻ "Việc của bạn" và TodoPanel cho Kiểm toán; Rủi ro và Tuân thủ không thấy "Chạy đội agent" bật nếu không có quyền.
5. **Mã loại tài liệu và khoảng trống OCR** (tiêu chí 5, 10; trang 19).
   - Bỏ tiền tố "DENGHI ·", "DKKD ·", "DIEULE ·", "CIC ·" (`ChecklistPanel.tsx:24`, `DocumentViewer.tsx:82`; nếu tiền tố nằm trong `title` của seed thì cắt ở giao diện bằng bảng tên loại trong `fieldLabels.ts`).
   - Cột giữa: khi chưa có ảnh trang, cho thẻ trường giãn hết chiều cao hoặc thu cột về 2 cột.
   - Bỏ 40px thừa trên banner.
6. **Lưới 1920** (tiêu chí 5; trang 2). Ô tìm kiếm thanh trên nằm trong cùng container max-width với nội dung: hiện ô tìm x=248, nội dung x=460 ở 1920. Sửa ở shell (`app/` hoặc `components/shell`).
7. **Khung tải giữ thanh trên và mục menu** (tiêu chí 1, 6; trang 2, 32). `pheduyet-loading-*` chỉ có logo, không menu, không thanh trên. Render shell trước, chỉ khung xương ở vùng nội dung. Dashboard Tổng quan cần khung xương có kích thước giống thẻ KPI để không nhảy.
8. **Bảng "Theo từng agent"** (tiêu chí 7; trang 23). `OverviewTab.tsx`:
   - bỏ dòng "Hệ thống 0 0 0";
   - Planner "0 lượt" thay bằng "điều phối" (ghi chú đã có, đặt vào ô);
   - Document "0 / 74 lỗi": ghi chú "lỗi đọc tài liệu khi hồ sơ không có tệp", hoặc tách cột "Bỏ qua".
9. **Văn phong nhỏ** (tiêu chí 9):
   - `NotificationsPage.tsx`: "Hồ sơ bị trả lại:" phải có mã hoặc tên khách; bỏ câu "Một số thông báo thuộc hồ sơ dữ liệu mẫu…" (dòng 89).
   - `ActionsPanel.tsx`: "Thiếu ý kiến Rủi ro và ý kiến Tuân thủ".
   - `ChecklistPanel.tsx`: bỏ "." cuối tiêu đề.
   - TodoPanel: "Chưa chạy đội agent: nên chạy để có đề xuất tham khảo" thành "Chưa có đề xuất AI. Chạy đội agent để có ý kiến tham khảo."
10. **Chi tiết trình bày** (tiêu chí 5, 6):
    - `MemoPanel.tsx:63-66`: lý do "Tải PDF" xuống dòng dưới nút, chữ phụ 13px;
    - KPI soạn đề xuất cùng cỡ số;
    - `TodoPanel.tsx`: liên kết "Đi tới"/"Mở" thẳng cột phải, mục nào cũng có;
    - bảng tài sản không cắt tiêu đề cột phải ở 1366;
    - `CustomerListPage.tsx`: ẩn "Mức rủi ro" khi cả trang "Chưa xếp hạng";
    - chi tiết khách hàng lấp nửa dưới (hồ sơ gần đây, tài sản) hoặc thu chiều cao;
    - 403: dùng tiêu đề khối báo lỗi làm `h1`;
    - nút xóa ô tìm chính sách có `aria-label="Xóa từ khóa"`.

## Để lên 8,5 còn thiếu gì

Danh sách đầy đủ theo tiêu chí. Làm hết một lượt là đủ căn cứ để chấm lại từ 8,5. Số trong ngoặc là việc ở danh sách trên.

- **Tiêu chí 1 (8,0 → 8,5):**
  - khung tải có shell đầy đủ (7);
  - "Nháp chưa đánh số" một kiểu ở mọi trang, chữ thường xám, không mono (3);
  - KPI cùng cỡ số trong `LoanDetailPage.tsx` (10).
- **Tiêu chí 2 (7,5 → 8,5):**
  - câu kết luận AI trên 00163 và mọi hồ sơ Chờ phê duyệt (1);
  - Kiểm toán một bộ KPI không trùng, không nút ghi (4);
  - 00176 và 00167 không mở đầu bằng 2–3 câu "chưa có…" liên tiếp; gộp thành một hộp trạng thái (`AgentTeamPanel.tsx:98`, `LoanDetailPage.tsx`).
- **Tiêu chí 3 (7,5 → 8,5):**
  - `parseAiText` không cắt câu, viết hoa đầu mục (2);
  - không còn "vs", "— " trong văn bản AI ở 00187, 00163, ngăn kéo;
  - đo: quét DOM không còn mục `li` bắt đầu bằng chữ thường trong `[data-testid=agent-recommendation]` và ngăn kéo.
- **Tiêu chí 4 (8,0 → 8,5):**
  - TodoPanel không xanh khi AI "Cần bổ sung" (1);
  - chip "Đạt" của Operations chỉ khi không có "Điều kiện bổ sung", ngược lại dùng vàng "Đạt, có điều kiện" (`AgentTeamPanel.tsx`);
  - cột "Mức rủi ro" ẩn khi rỗng (10).
- **Tiêu chí 5 (7,5 → 8,5):**
  - lưới 1920 thẳng (6);
  - OCR không cột trống, bỏ 40px (5);
  - chi tiết khách hàng không trống nửa dưới;
  - "Tải PDF" và lý do tách dòng;
  - bảng tài sản không cắt ở 1366 (10).
- **Tiêu chí 6 (8,0 → 8,5):**
  - khung tải shell (7);
  - Tổng quan dashboard có khung xương đúng hình thẻ KPI, không trống sau 1,5 giây;
  - thẻ "Hành động" ở nháp có nút hoặc không hiện (`ActionsPanel.tsx`).
- **Tiêu chí 7 (7,5 → 8,5):**
  - việc 1 (màn Phê duyệt);
  - việc 8 (bảng Theo từng agent không gợi ý "hỏng");
  - giữ nguyên sơ đồ và ngăn kéo hiện tại (đã tốt).
- **Tiêu chí 8 (8,0 → 8,5):**
  - nút xóa ô tìm chính sách có tên;
  - Quản trị Tab không rơi về `BODY` (không tính điểm nhưng cùng shell);
  - thử một lượt bằng trình đọc màn hình (NVDA hoặc Orca) trên modal quyết định và ngăn kéo trace, ghi kết quả. Giám khảo chưa có căn cứ trình đọc thật nên không cho quá 8,0.
- **Tiêu chí 9 (7,5 → 8,5):**
  - việc 2 và 9;
  - soát toàn bộ chuỗi tĩnh còn dấu ":" lửng và viết hoa giữa câu (`ActionsPanel.tsx`, `NotificationsPage.tsx`, `ChecklistPanel.tsx`, `TodoPanel.tsx`).
- **Tiêu chí 10 (7,0 → 8,5):**
  - việc 2, 3, 4, 5 cùng lúc;
  - quét `rawScan` trên mọi trang không còn `LA-\d{8}`, mã loại tài liệu chữ hoa không dấu (`\b[A-Z]{3,6} ·`), "vs", "0 đồng".

## Nếu chỉ còn một ngày: 5 việc đáng làm nhất

1. **Việc 1, màn Phê duyệt:** câu kết luận từ trạng thái lượt, TodoPanel không xanh sai, hàng đợi Phê duyệt có hồ sơ có lượt AI ở đầu. Nâng tiêu chí 2, 4, 7 và trang 12, 13.
2. **Việc 2, `parseAiText`:** sửa một hàm, ăn vào 6 trang và 3 tiêu chí.
3. **Việc 3, hàm hiển thị mã chung bỏ `LA-`:** khoảng một giờ, 4 trang.
4. **Việc 4, vai chỉ đọc:** bỏ nút "Sửa đề xuất", bỏ KPI trùng, bỏ "Việc của bạn" cho Kiểm toán.
5. **Việc 5 và 6:** mã loại tài liệu OCR và lưới 1920.

Ước tính: làm đủ 5 việc thì tiêu chí 2, 3, 7, 10 lên khoảng 8,0–8,5, trung bình khoảng 8,1–8,2. Muốn chắc 8,5 cần thêm việc 7–10.

## Chưa kiểm chứng và chỗ brief sai

- **Brief nói "Chưa có: trang Quản trị".** Trang có và chạy; đã chấm, không tính trung bình.
- **Brief gọi giám khảo chức năng song song là `g6` ở một chỗ và `g7` ở chỗ khác.**
  - Lúc chạy pha B phải chờ khóa `/tmp/do-an-e2e.lock` (bên kia đang giữ).
  - Mã `LA-20261112-…` và "CIF-DEMO-091 CTCP Thực phẩm Sạch Việt Tiến" là dữ liệu e2e của giám khảo chức năng. Vẫn tính là lỗi giao diện vì trang in mã thô cho mọi nháp.
- **00163 chỉ có lượt AI sau khi giám khảo chạy `reset-demo.sh --warm`.** Màn Phê duyệt mà người dùng gặp mặc định phụ thuộc lệnh đó.
- **Chưa kiểm chứng:**
  - trình đọc màn hình thật (chỉ kiểm tên truy cập qua DOM);
  - hover ngoài nút và dòng bảng;
  - 1280×800 và 1440×900 của các vai ngoài QHKH và Thẩm định (chỉ đo số, 0 tràn ngang, không xem từng ảnh);
  - vòng focus ở xác nhận phê duyệt khi vào bằng bàn phím (chỉ thử bằng chuột: không có vòng, đúng `:focus-visible`).
- **Số lượt dùng:** 2/4 lượt đội agent, 1/10 câu hỏi chat. Không gặp 402, không gặp lỗi bộ đệm vite.
