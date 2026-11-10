# Chấm điểm thiết kế v2 "Sổ Tín Dụng" – lần 1

Giám khảo độc lập, ngày 11/11/2026. Đối tượng chấm: `docs/design/redesign-v2.md`, `docs/design/mockups-v2/*.html`, `tokens.css`, `app.css` (commit `7e19d91`). Chỉ chấm, không sửa thiết kế.

**Kết luận: KHÔNG ĐẠT.** Điểm trung bình 10 tiêu chí **6,55/10** (ngưỡng 8,5); 6 tiêu chí dưới 7 (2, 6, 7, 8, 9, 10).

## Cách chấm

- Chuẩn: skill frontend-design, design-critique, accessibility-review (WCAG 2.1 AA), design-system, ux-copy; nghiệp vụ `docs/business/rules.md`; route thật trong `frontend/src/app`.
- Nhìn ảnh thật: 12 mockup × 1366×768 và 1920×1080 (`/tmp/ds1-keep/after/`), cộng ảnh toàn trang chụp lại bằng Playwright từ `file://` (`/tmp/g1/full-*.png`).
- Đo bằng script Playwright (`/tmp/g1/shoot.js`, `/tmp/g1/m.js`): tràn ngang, tương phản của **mọi** nút chữ đang hiển thị (màu chữ tính toán so với nền đặc gần nhất), cỡ chữ < 12px, ô nhập không có nhãn gắn mã, nút cao < 30px, thứ tự Tab và focus, độ rộng ô nhập.
- Tương phản tính bằng công thức WCAG từ giá trị hex trong `tokens.css`/`app.css`.
- Không có axe-core trong máy và không có trình đọc màn hình: phần a11y là đo thủ công, có thể còn lỗi chưa thấy.

## Bảng 10 tiêu chí

| # | Tiêu chí | Điểm | Căn cứ chính |
| --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán thẩm mỹ | 7,0 | Có ý tưởng rõ (sổ cái, gạch kép đầu bảng, lề đồng, AI tím nét đứt) và một file token 68 biến dùng chung cho 12 trang. Nhưng nền `#F5F4EF` + serif tương phản cao gần đúng dấu hiệu "mặc định kiểu AI" số 1 mà skill frontend-design nêu (`#F4F1EA` + serif); chuỗi meta nối dấu chấm giữa (`HSV-… · Hạn mức… · Cán bộ…`, `Credit · Compliance · Operations`, `Dấu vết · HSV…`) và phông mono cho nhãn nhỏ là dấu hiệu số 5. Tự phá nguyên tắc "một nút đồng mỗi màn đầu": 02 có 2 nút đồng cùng lúc; 03 dùng chấm đồng cho sự kiện AI ở dòng thời gian. Nhãn AI không thống nhất: "AI đề xuất", "AI đề xuất, chưa xác nhận", "AI", "Đề xuất", "Trợ lý AI"; 05 dùng banner xanh info thay vì màu AI. |
| 2 | Phân cấp và hành động chính màn đầu | 6,5 | 02 và 06 có thứ tự đọc tốt (khối quyết định → 4 thẻ → bảng; thẻ chính 34px vạch đồng). 03 mâu thuẫn: hộp "Việc cần làm" viết "Chạy đội agent để có đề xuất tham khảo, rồi sửa tờ trình" nhưng nút chốt là "Sửa đề xuất" và đội agent đã chạy xong; stepper đang ở "Kiểm tra" trong khi badge là "Trả về cán bộ tín dụng". `rules.md` D4 yêu cầu nút chính chuyển bước ở header phải, tối đa 1 nút; 03 và 05 đặt nút chính trong thân trang. 05: hai nút "Xác nhận…/Giữ…" nằm dưới bảng, không gắn với hàng lệch nào. |
| 3 | Chữ và khả năng đọc tiếng Việt | 7,5 | Ba phông có subset `vietnamese` tự lưu woff2, dấu chồng hiển thị đúng ở ảnh 1366/1920; số tiền Plex Mono tabular, căn phải, thẳng cột. Trừ điểm: 6 loại chữ 11px (nhãn nhóm nav, mô tả logo, bộ đếm, phím tắt `/`, thẻ AI/người, giờ ở dòng thời gian); tiêu đề cột tiếng Việt bị đặt phông mono ("Số tiền (đồng)", "Thời gian (ms)", "Đội agent", "Thay đổi") vì `th.num` thừa hưởng `.num`; ngày giờ thiếu năm (`10/11 14:32`, `tải 09/11`) trái quy tắc `dd/MM/yyyy` của chính tài liệu mục 8.7. |
| 4 | Màu và ngữ nghĩa trạng thái | 7,0 | Bảng ngữ nghĩa trạng thái rõ (mục 5.1), badge có chấm + chữ, cờ có hình khác nhau, AI tím tách navy người. Lệch: thẻ "Sắp quá hạn" ở 02 tô `--danger-700` trong khi tài liệu định nghĩa sắp quá hạn = warn; 08 cột "Chênh lệch" chỉ dựa vào màu đỏ/xanh vì dấu +/− không nói tốt hay xấu (−8,7 là tốt, +26,5 là xấu); thẻ "Mô hình đơn lẻ" dùng viền nét đứt, mà nét đứt được dành riêng cho AI; bảng "Theo từng agent" (số liệu vận hành) gắn thẻ "AI". |
| 5 | Mật độ, lưới, khoảng cách 1366 và 1920 | 7,5 | Không tràn ngang ở cả hai cỡ (đo `scrollWidth`); 1366 màn đầu đạt tiêu chí riêng (02 thấy 3 hàng; 03 thấy stepper, 4 thẻ, khối đội agent, nút chốt; khoảng cách khối 24px). Trừ điểm: 1920 ở 02 kéo bảng 1640px, cột "Hạn xử lý" và cột nút cách nhau ~270px trống, khối "Cần bạn quyết định" một dòng chữ trải hết bề ngang; 09 cuộn dọc cả trang 31px ở 1366 (`scrollHeight` 799) nên "ô nhập cố định đáy" không đúng; `rules.md` D5 bắt buộc kiểm 1280×800 và 1440×900, thiết kế chỉ nói 1366/1920. |
| 6 | Thành phần và trạng thái | 5,5 | Có rỗng, 403, 404, lỗi tải, skeleton, toast, ô lỗi inline, đội agent đang chạy (03b). Thiếu hẳn trên mockup: hover/focus/active (chỉ có trong CSS), nút disabled và nút đang tải (spinner), **nút khóa kèm lý do** (mẫu nghiệp vụ bắt buộc ở `rules.md` D4 và đã có e2e "khối đề xuất agent khóa kèm lý do"), hộp xác nhận nêu hậu quả, drawer, đội agent "chưa chạy" và "chạy lỗi/hết giờ", bảng rỗng sau lọc, chat đang trả lời/lỗi. 403 dùng ổ khóa trong khi `rules.md` D3 quy định biểu tượng khiên. |
| 7 | AI đề xuất vs người quyết định; giám khảo hiểu đội agent trong 30 giây | 6,0 | Điểm mạnh thật: hai thế giới thị giác (tím nét đứt vs navy viền liền 5px), câu "AI chỉ đề xuất, không tự phê duyệt", dải demo. Điểm yếu nặng: sơ đồ gộp "Credit · Compliance · Operations" thành một nút nên không thấy Planner **giao việc** cho từng agent (chỉ có chữ "Chia 3 nhánh"); đội agent không nhất quán (03 nói "4 agent", code có 6 gồm Document; 06 bảng theo agent có Document nhưng thiếu Planner và Validation); thẻ "Người quyết định" trong sơ đồ chỉ đạt 2,50:1 (lỗi CSS, xem mục a11y) nên chính nhãn quan trọng nhất bị mờ; **không có mockup màn cấp phê duyệt ra quyết định** (Phê duyệt / có điều kiện / Từ chối / Trả lại kèm lý do, phiếu HĐTD) – đúng khoảnh khắc "người có thẩm quyền quyết định" giám khảo cần thấy; Tổng quan dashboard không có hình đội agent; Dấu vết không có bước người quyết định và không thấy nội dung bàn giao giữa agent. |
| 8 | Tiếp cận WCAG 2.1 AA | 6,0 | Lỗi đo được: (a) 1.4.3 – `.node span{color:var(--ink-3)}` đè `.tag-hm{color:#fff}` do độ ưu tiên selector, chữ "Người quyết định" `#5E6573` trên `#14284B` = **2,50:1** ở 03 và 03b; (b) 1.4.3 – nút đồng khi hover chữ trắng trên `#9C7830` = **4,08:1**; (c) 1.3.1/3.3.1 – ô lỗi có `aria-invalid` nhưng không có `aria-describedby` nối với câu lỗi; (d) 1.3.1/4.1.2 – ô nhập không có nhãn gắn mã: ô chat (09), 4 ô lọc ở Nhật ký (10) có chữ nhãn nhưng không `for`/`id`; (e) 4.1.2 – tab ở 07, 08 là `<a aria-selected>` không có `role=tab`/`tablist`; (f) 2.4.1 – không có liên kết "Bỏ qua điều hướng", Tab phải qua 8 mục nav mới vào nội dung; (g) 09 không có `h1`, 01 không có `main`; (h) 1.4.1 – cột chênh lệch 08 chỉ dựa màu. Tài liệu mục 10.2 khẳng định "mọi cặp ≥ 4,86:1" là sai; cặp "control / surface 3,96" thực ra là control/paper (control/surface = 4,25). Điểm tốt: focus 2px+2px navy 8,57:1 có trên mọi mục nav (đo Tab), `prefers-reduced-motion`, `lang="vi"`, biểu đồ có `role=img` + mô tả. |
| 9 | Văn phong UX | 6,5 | Tốt: nút là động từ, lỗi nêu nguyên nhân + cách xử lý, rỗng có hành động, đang tải nói thời gian, xưng "bạn", không chấm than. Lỗi nội dung: **số liệu tự mâu thuẫn** – 06 "263 trên 762 lượt" nhưng 5 trạng thái cộng lại 1.020; 08 "91,3%" và "78,6%" trên 40 hồ sơ không ra số nguyên (36,5 và 31,4 hồ sơ); 02 "Tất cả 14" nhưng 5 hàng, không phân trang; 05 "2 trường lệch" nhưng bảng chỉ 1; 07 tổng 38,2 giây nhưng bước cuối kết thúc ở giây ~31. Thuật ngữ: 04 nút "Gửi thẩm định" trái luồng nghiệp vụ (QHKH gửi **Hỗ trợ tín dụng**, `rules.md` D4; code hiện có "Gửi Hỗ trợ tín dụng"); 02 "Cần bạn quyết định" cho việc sửa đề xuất làm loãng thuật ngữ "Người quyết định"; trục "T1…T12" đọc như tháng trong khi tiêu đề nói tuần và bộ lọc là 30 ngày; "Ghi chú" không rõ hành động; trộn "Phản biện của Validation". |
| 10 | Khả thi React + Ant Design, độ đủ của bàn giao | 6,0 | Có map `ConfigProvider` (màu, viền, bo, phông), thứ tự áp 5 bước, rủi ro gạch kép Table, nghiệm thu C1–C6. Thiếu: bảng map từng thành phần sang component AntD (Steps, Segmented, Tabs, Table, Drawer, Modal, Form.Item) hoặc tự dựng; component token cho Badge/Tag/Input/Segmented/Steps; map sang file thật cần thay (`AgentTeamPanel`, `ActionsPanel`, `ActionProposals`, `PreDisbursementPanel`, `CaseTrace`, `LoanApprovalCard`); không đối chiếu `rules.md` (D3 403 khiên, D4 nút chính header phải + khóa kèm lý do, D5 1280/1440); trạng thái dữ liệu thật vs mẫu (quy tắc dự án: không dựng số giả) không được nói cách hiển thị khi chưa có số; ảnh chụp chỉ nằm ở `/tmp` không commit. |
| | **Trung bình** | **6,55** | 6 tiêu chí < 7 (2, 6, 7, 8, 9, 10); tiêu chí 1 và 4 vừa chạm 7,0 |

## Tương phản đã đo (WCAG)

| Cặp | Tỉ lệ | Yêu cầu | Kết quả |
| --- | --- | --- | --- |
| ink / paper | 14,21 | 4,5 | Đạt |
| ink-2 / surface | 8,46 | 4,5 | Đạt |
| ink-3 / surface · paper · paper-2 | 5,71 · 5,32 · 4,86 | 4,5 | Đạt |
| ink-3 / warn-100 (hàng lệch ở 05) | 4,84 | 4,5 | Đạt (sát) |
| ink-3 / ai-50 | 5,20 | 4,5 | Đạt |
| trắng / navy-700 | 14,64 | 4,5 | Đạt |
| `#1B1405` / bronze-500 (nút đồng) | 5,70 | 4,5 | Đạt |
| **trắng / `#9C7830` (nút đồng hover)** | **4,08** | 4,5 | **Trượt** |
| **ink-3 / navy-700 (thẻ "Người quyết định" trong sơ đồ, do CSS đè)** | **2,50** | 4,5 | **Trượt** |
| trắng / ai-700 | 9,36 | 4,5 | Đạt |
| ai-700 / ai-100 · ai-50 | 7,48 · 8,31 | 4,5 | Đạt |
| ok · warn · danger · info 700 / 100 | 5,52 · 5,05 · 5,46 · 6,51 | 4,5 | Đạt |
| `#9DB0D1` / navy-700 (nhãn nhóm nav 11px) | 6,67 | 4,5 | Đạt |
| `#5A4210` / bronze-100 (dải demo) | 7,62 | 4,5 | Đạt |
| control / surface · paper (viền ô nhập) | 4,25 · 3,96 | 3 | Đạt |
| ai-500 / ai-50 (viền nét đứt AI) | 5,43 | 3 | Đạt |
| navy-500 / surface (vòng focus) | 8,57 | 3 | Đạt |
| bronze-500 / paper (gạch dưới tab chọn, vạch nav) | 2,91 | 3 | Trượt nhẹ (tab chọn còn có chữ đậm navy nên không phải tín hiệu duy nhất) |
| rule-strong / surface (gạch kép đầu bảng) | 2,04 | trang trí | Không bắt buộc |

## Bảng từng trang

| Trang | Điểm | Việc phải sửa (1–3) |
| --- | --- | --- |
| 01 Đăng nhập | 8,0 | 1) Thêm `<main>`; chú giải "AI đề xuất / Người quyết định" 12px nằm sát đáy, xa câu giá trị – đưa lên ngay dưới đoạn mô tả. 2) Thiếu trạng thái lỗi xác thực / phiên hết hạn và mockup theme Keycloak (tài liệu tự đặt tiêu chí "theme Keycloak dùng cùng token" nhưng không có hình). |
| 02 Việc của tôi | 7,0 | 1) Hai nút đồng trên màn đầu (khối quyết định và hàng 1) – giữ đồng ở khối trên, nút trong hàng dùng navy. 2) "Sắp quá hạn" tô danger → warn; khớp số với bộ lọc ("Quá hạn 1", hàng "Quá hạn 1 ngày"). 3) "Tất cả 14" mà chỉ 5 hàng: thêm phân trang hoặc sửa số; đổi nhãn "Cần bạn quyết định" thành "Việc gấp hôm nay" (QHKH không phải người quyết định). |
| 03 Hồ sơ vay | 6,5 | 1) Sửa lỗi CSS thẻ "Người quyết định" (2,50:1) – ví dụ `.node .tag-hm{color:#fff}`. 2) Sơ đồ đội agent: Planner tỏa ra từng nút Credit, Compliance, Operations, Document (song song) → Validation → Người quyết định; số agent khớp với code. 3) Đồng bộ stepper/badge/hộp Việc cần làm: hồ sơ bị trả về thì bước hiện tại là "Soạn đề xuất (trả lại)", câu trong hộp nói "Sửa đề xuất theo lý do trả lại", nút chính ở header phải theo D4. |
| 03b Đang chạy | 6,5 | 1) Hộp Việc cần làm và dòng thời gian vẫn ghi "Chạy đội agent…"/"Đội agent trả kết quả" khi đang chạy – đổi theo trạng thái. 2) Thêm trạng thái chạy lỗi / quá thời gian và "chưa chạy" mà mục 6 tự liệt kê. 3) Cùng lỗi thẻ "Người quyết định" 2,50:1. |
| 04 Soạn đề xuất | 7,0 | 1) "Gửi thẩm định" → "Gửi Hỗ trợ tín dụng", khóa kèm lý do khi còn lỗi (đang bật dù ô Kỳ hạn lỗi). 2) `aria-describedby` nối ô lỗi với câu lỗi; thêm tóm tắt lỗi đầu form. 3) Nav đang sáng "Tạo đề xuất vay" trong khi đây là sửa hồ sơ HSV-2026-00201 – sáng "Việc của tôi". |
| 05 Đối chiếu | 7,0 | 1) Đưa "Xác nhận giá trị đọc từ tài liệu / Giữ giá trị trong hồ sơ" vào chính hàng lệch (mỗi hàng một cặp), vì có 2 trường lệch. 2) Banner AI dùng màu/viền AI (tím nét đứt) thay info xanh. 3) Sửa "2 trường lệch" cho khớp bảng; "Ghi chú" → "Thêm ghi chú cho trường này". |
| 06 Dashboard Tổng quan | 6,0 | 1) Tổng trạng thái (1.020) phải bằng tổng lượt (762) – đúng tiêu chí riêng tài liệu tự đặt. 2) Trục T1–T12 vs "30 ngày": đổi thành "Tuần 1…" hoặc đổi biểu đồ theo ngày khớp bộ lọc. 3) Bảng theo agent đủ 6 agent (thêm Planner, Validation), thêm sơ đồ đội agent thu nhỏ ở màn đầu để giám khảo thấy ngay. |
| 07 Dấu vết | 6,5 | 1) Sơ đồ tỏa nhánh thật (Planner → 3–4 agent song song → Validation → Người quyết định), không gộp nút. 2) Mỗi bước mở được để xem việc Planner giao, đầu vào/đầu ra, kết luận Validation; thêm hàng "Người quyết định" ở cuối. 3) Tab dùng `role=tablist/tab` hoặc `aria-current="page"`; sửa tổng thời gian cho khớp. |
| 08 So sánh | 6,5 | 1) Số phải khả thi với 40 hồ sơ (ví dụ 37/40 = 92,5%) và nêu cách đo, bộ dữ liệu, ngày chạy; ghi rõ khi chưa có số thật thì hiện "Chưa có lượt đánh giá". 2) Cột chênh lệch thêm chữ "tốt hơn/kém hơn" hoặc biểu tượng, không chỉ màu. 3) Thẻ "Mô hình đơn lẻ" đổi viền liền xám (nét đứt dành cho AI). |
| 09 Chat | 7,5 | 1) Ô nhập thiếu nhãn (`aria-label` hoặc `label`), thiếu `h1`. 2) Trang cuộn 31px ở 1366: khung chat phải vừa `100vh`. 3) Thêm trạng thái đang trả lời, lỗi, nguồn bấm được. |
| 10 Nhật ký | 7,5 | 1) Gắn `label for` cho 4 ô lọc. 2) Thời điểm đủ năm `10/11/2026 14:32:41`. 3) Thêm điều khiển phân trang và dòng mẫu cho quyết định của cấp phê duyệt (người) để thấy chuỗi AI → người. |
| 11 Trạng thái | 7,0 | 1) 403 dùng biểu tượng khiên, không tên khách hàng (D3). 2) Bổ sung: nút khóa kèm lý do, nút disabled/đang tải, hộp xác nhận, drawer, rỗng sau lọc. 3) Toast trong mockup đè tiêu đề thẻ lỗi – đặt vị trí minh họa không che nội dung. |

## Trang còn thiếu mockup

Đối chiếu route trong `frontend/src/app` và tính năng hiện có:

1. **Màn quyết định của cấp phê duyệt** (Hồ sơ vay theo vai phê duyệt: Phê duyệt / Phê duyệt có điều kiện / Từ chối / Trả lại, bắt buộc lý do; phiếu HĐTD 4 loại) – `ActionsPanel`, `LoanApprovalCard`. Thiếu nặng nhất vì đây là bằng chứng "người có thẩm quyền quyết định".
2. Hồ sơ vay theo vai Hỗ trợ tín dụng (nút "Chuyển Thẩm định" khóa kèm lý do), Thẩm định (Yêu cầu bổ sung vs Trả lại QHKH), Ý kiến Rủi ro/Tuân thủ, Đề xuất ngoại lệ.
3. Khối đề xuất hành động của agent (`ActionProposals`, trạng thái khóa kèm lý do) và giải ngân (`PreDisbursementPanel`).
4. Tạo đề xuất vay (`/de-xuat-vay`, wizard 5 bước, nút "Tiếp: …"), Khách hàng (`/customer/:id`), Đối chiếu – danh sách (`/doi-chieu`), Tra cứu chính sách (`/tra-cuu-chinh-sach`), Foundation (`/foundation`).
5. Thành phần: drawer, modal xác nhận, theme Keycloak.

## Việc phải sửa, xếp theo mức ảnh hưởng

| # | Chỗ nào | Vì sao | Sửa thành gì |
| --- | --- | --- | --- |
| 1 | Thiếu mockup màn cấp phê duyệt quyết định (và vai HTTD/Thẩm định) | Bài thi chấm "người có thẩm quyền quyết định"; hiện chỉ có nút "Người quyết định" tĩnh trong sơ đồ | Mockup Hồ sơ vay vai phê duyệt: khối AI (kết luận, cờ) bên trái, khối người quyết định bên phải với 4 lựa chọn, ô lý do bắt buộc, hộp xác nhận nêu hậu quả; ghi vào nhật ký |
| 2 | Sơ đồ đội agent ở 03, 03b, 07 | Gộp 3 agent vào một nút, không thấy Planner giao việc; số agent lệch nhau (4 / 6 / bảng thiếu Planner, Validation) | Sơ đồ tỏa nhánh: Planner → Credit, Compliance, Operations, Document (mỗi nút một agent, có trạng thái, thời gian) → Validation → Người quyết định; một danh sách agent dùng chung mọi trang, khớp code |
| 3 | Số liệu mẫu tự mâu thuẫn ở 02, 05, 06, 07, 08 | Giám khảo cộng nhẩm là thấy; vi phạm tiêu chí "tổng = tổng các trạng thái" do chính tài liệu đặt; dự án cấm số giả | Sửa cho khớp từng chỗ (mục 9 bảng tiêu chí); tài liệu thêm quy tắc "khi chưa có số thật hiện trạng thái chưa có dữ liệu" |
| 4 | Lỗi CSS thẻ "Người quyết định" (2,50:1) và nút đồng hover (4,08:1) | Trượt WCAG 1.4.3 ở đúng nhãn quan trọng nhất | `.node .tag-hm{color:#fff}` (hoặc bỏ màu ở `.node span`); hover đồng dùng chữ `#1B1405` trên `#C49A4A` hoặc nền `#7A5C22` chữ trắng (đo lại ≥ 4,5) |
| 5 | Mâu thuẫn nghiệp vụ: 04 "Gửi thẩm định", 03 vị trí nút chính, 403 ổ khóa | Trái `rules.md` D3, D4 và nhãn code hiện có | "Gửi Hỗ trợ tín dụng" khóa kèm lý do; nút chính chuyển bước ở header phải, tối đa 1; 403 biểu tượng khiên, không tên khách |
| 6 | Trạng thái thành phần còn thiếu | Bàn giao không đủ để dev làm hover/disabled/loading/khóa kèm lý do/drawer/modal | Thêm một trang mockup "Thành phần" thể hiện từng trạng thái (mặc định, hover, focus, active, disabled, loading, khóa kèm lý do) cho nút, ô nhập, tab, hàng bảng, khối đội agent (chưa chạy, đang chạy, lỗi, có kết quả) |
| 7 | 03 mâu thuẫn trạng thái: stepper "Kiểm tra" + badge "Trả về" + hộp "Chạy đội agent" + nút "Sửa đề xuất" | Màn đầu nói 3 điều khác nhau về việc phải làm | Một câu, một nút: "Sửa đề xuất theo lý do trả lại" – nút "Sửa đề xuất"; stepper hiện bước Soạn đề xuất có dấu trả lại |
| 8 | A11y cấu trúc: `aria-describedby` ô lỗi, nhãn ô chat và bộ lọc Nhật ký, tab 07/08, skip link, `h1` ở 09, `main` ở 01 | WCAG 1.3.1, 2.4.1, 3.3.1, 4.1.2 | Sửa trong mockup và thêm vào mục 6 như quy cách bắt buộc |
| 9 | Nhãn AI không thống nhất và màu AI lẫn sang chỗ khác | Làm yếu "một màu nhận diện riêng nhất quán" mà Mate yêu cầu | Một nhãn duy nhất "AI đề xuất"; banner AI ở 05 dùng khối AI; bỏ thẻ "AI" ở bảng số liệu vận hành 06; thẻ mô hình đơn lẻ viền liền |
| 10 | Dấu hiệu "mặc định kiểu AI": chuỗi meta chấm giữa, tiêu đề cột mono, 02 hai nút đồng | Skill frontend-design nêu đích danh | Meta tách thành nhãn–giá trị; `th.num` dùng phông thân; giữ đúng một nút đồng mỗi màn |
| 11 | Ngày giờ thiếu năm (03, 05, 10), "Sắp quá hạn" màu danger, chênh lệch 08 chỉ dựa màu | Trái quy tắc văn phong và ngữ nghĩa màu do chính tài liệu đặt | `dd/MM/yyyy HH:mm`; sắp quá hạn = warn; thêm chữ "tốt hơn/kém hơn" |
| 12 | Bàn giao cho React + AntD | Dev phải tự đoán component và file cần sửa | Bảng: thành phần → component AntD / tự dựng → component token → file trong `frontend/src` sẽ thay; thêm kiểm 1280×800 và 1440×900 theo D5; sửa mục 10.2 (khẳng định "mọi cặp ≥ 4,86" sai) |
| 13 | 1920: 02 bảng và khối quyết định trải quá rộng; 09 cuộn 31px ở 1366 | Mắt đi xa giữa cột, không gian chết | Giới hạn bảng Việc của tôi ~1280px hoặc thêm cột phụ (Người phụ trách, Cờ); khung chat `height:100vh` trừ thanh trên |

## Điều tài liệu thiết kế tự chấm khác với kết quả đo

- Mục 10.1 tự chấm Nhất quán 5/5, Chữ 5/5, "mức nặng còn lại: không": không khớp các lỗi 1–5 ở trên.
- Mục 10.2 "1.4.3 Đạt, mọi cặp ≥ 4,86": sai, có 2 cặp trượt (2,50 và 4,08).
- Mục 5.8 ghi "control / surface 3,96": số 3,96 là control/paper; control/surface là 4,25.
