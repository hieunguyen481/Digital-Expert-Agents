# Chấm lần 3: định hướng thiết kế v2 (bản v2.2)

Người chấm: giám khảo độc lập (Opus). Ngày 11/11/2026. Đối tượng chấm: `docs/design/redesign-v2.md` (v2.2), `docs/design/mockups-v2/*.html` (39 tệp), `tokens.css`, `app.css`.
Chuẩn chấm: skill frontend-design, design-critique, accessibility-review, design-system, ux-copy; nghiệp vụ theo `docs/business/rules.md`.

## Kết luận

**Điểm trung bình 10 tiêu chí: 7,45 / 10. KHÔNG ĐẠT.** Ngưỡng đạt là trung bình từ 8,5 và không tiêu chí nào dưới 7. Lần này không tiêu chí nào dưới 7, nhưng trung bình còn thiếu 1,05 điểm.

So với lần 2 (7,30), bản v2.2 đã sửa thật phần lớn 13 việc: màn Cấp phê duyệt không còn chọn sẵn, thẻ "Người quyết định" đã thu hẹp, thanh bên đổi theo vai, mỗi tệp chỉ một trạng thái, ô tìm kiếm đủ cao, 22b tô lỗi cả hai ô. Điểm vẫn chỉ tăng ít vì ba lẽ:

1. Màn quan trọng nhất cho giám khảo (12, Cấp phê duyệt) có lỗi nghiệp vụ: người quyết định không thấy tờ trình thẩm định, cũng không thấy ý kiến Rủi ro và Tuân thủ (trái F8 và Q-L). "Phê duyệt có điều kiện" không có chỗ nhập điều kiện.
2. Bốn đề nghị theo trang của lần 2 chưa sửa: 05 vẫn dùng mono cho tên công ty; 09 trả lời câu không ai hỏi; 08 hai số chính vẫn lệch hàng, thẻ AI vẫn gắn lên số đo, chưa ghi tên mô hình đơn lẻ; 13 còn câu chống nạng. Thêm mâu thuẫn mới: 17b đánh "Xong" cho bước chưa làm; 05 mâu thuẫn với 19.
3. Cùng một "đội agent" được vẽ theo bốn kiểu khác nhau: 03 một dòng kèm `<details>`; 12 và 14 dải ngang; 06 và 21 dạng cây; 25 dạng lưới. Số giây của từng agent ở ba hồ sơ khác nhau lại giống hệt nhau. Giám khảo khó nhận ra đây là cùng một đội, và số liệu trông như dựng.

Câu hỏi của brief, thiết kế có đủ tốt để áp vào code chưa: **chưa áp toàn bộ.** Nền tảng (token, `app.css`, thanh bên theo vai, bảng thành phần ở 21, trạng thái ở 11, 11b, 22*) đủ chắc để bắt đầu dựng khung và thành phần dùng chung. Các màn 12, 13, 14, 05, 08, 09, 16, 17b phải sửa xong mới dựng.

## Cách chấm

- Chụp ảnh 39 trang ở 4 cỡ 1280×800, 1366×768, 1440×900, 1920×1080 bằng Playwright mở `file://`: 156 ảnh màn đầu, cộng ảnh toàn trang ở 1366. Mình nhìn ảnh thật ở 1366 cho cả 39 trang. Ở 1920 xem 02, 03, 12, 22. Ở 1280 và 1440 xem 25, 25b, 03 (ảnh ở `/tmp/g3/shots/`).
- Script đo tự động, 156 lượt (`/tmp/g3/m.js`, kết quả ở `/tmp/g3/rep.json`). Nội dung đo: tràn ngang, tương phản chữ thật (có ghép nền tổ tiên), cỡ chữ nhỏ nhất, ô chưa nhãn, nút chưa tên, trùng id, `aria-*` trỏ sai, số `h1` và `main`, skip link, số nút chốt đồng ở cả trang và ở màn đầu, vùng bấm nhỏ hơn 24px, số hàng bảng thấy ở màn đầu.
- Đọc `innerText` của từng trang (`/tmp/g3/t.js`) để soát văn phong và đối chiếu số liệu giữa các trang.
- Tương phản tính theo công thức độ chói WCAG 2.x, từ giá trị trong `tokens.css`.
- Giới hạn: máy không có axe-core, không có trình đọc màn hình, không kiểm với người mù màu. Vì vậy tiêu chí 8 không cho trên 8.

### Kết quả đo tự động (156 lượt)

| Phép đo | Kết quả |
| --- | --- |
| Tràn ngang | 0 ở cả 4 cỡ |
| Chữ dưới ngưỡng tương phản AA | 0 |
| Cỡ chữ nhỏ nhất | 12px |
| Ô chưa nhãn, nút chưa tên, trùng id, `aria` trỏ sai | 0 |
| `h1` = 1, `main` = 1, có skip link | đúng ở 39/39 trang |
| Vùng bấm < 24px | 0 |
| Nút chốt đồng `.btn.gold` | 1 nút ở 03, 03b, 03c, 04, 12, 12b, 12c, 13, 14, 15, 17, 17b, 25, 25b. 0 nút ở các trang còn lại. 7 nút ở 21 (danh mục, hợp lệ) |
| Hàng bảng thấy ở 02, 1366×768 | 5 |

Đo tự động sạch. Lỗi còn lại nằm ở nghĩa, nghiệp vụ và tính nhất quán; script không bắt được loại lỗi này.

### Tương phản các cặp màu chính

| Chữ hoặc viền | Nền | Tỉ lệ | Đánh giá |
| --- | --- | --- | --- |
| ink `#1B2430` | paper `#F1F2EE` | 13,92 | đạt AAA |
| ink-2 `#434C5A` | surface `#FBFBF8` | 8,37 | đạt AAA |
| ink-3 `#5E6573` | surface `#FBFBF8` | 5,65 | đạt AA |
| ink-3 `#5E6573` | paper-2 `#E4E7E0` | 4,69 | đạt AA, sát ngưỡng |
| ink-3 `#5E6573` | ai-50 `#F3F0FA` | 5,20 | đạt AA |
| ink-inv `#F1F2EE` | navy-700 `#14284B` | 13,02 | đạt AAA |
| navy-100 `#DCE4F1` (chữ thanh bên) | navy-700 | 11,44 | đạt AAA |
| `#1B1405` (chữ nút đồng) | bronze-500 `#B08A3E` | 5,70 | đạt AA |
| ai-700 `#4F3590` | ai-100 `#E9E3F6` | 7,48 | đạt AAA |
| ai-500 `#6B4FB8` (viền nét đứt khối AI) | ai-50 | 5,43 | đạt 1.4.11 |
| ok-700 / ok-100 | | 5,52 | đạt AA |
| warn-700 / warn-100 | | 5,05 | đạt AA |
| danger-700 / danger-100 | | 5,46 | đạt AA |
| info-700 / info-100 | | 6,51 | đạt AA |
| control `#6F7660` (viền ô nhập) | surface | 4,57 | đạt 1.4.11 |
| navy-500 `#2A4A80` (viền khi focus) | surface | 8,48 | đạt |
| **rule `#D3D7CC` (viền `.search` ở thanh trên)** | surface | **1,41** | **không đạt 1.4.11**: ô tìm kiếm là thành phần tương tác mà viền gần như không thấy |
| rule-strong `#AEB3A1` | surface | 2,07 | chỉ dùng để kẻ, không dùng cho thành phần tương tác |
| bronze-500 (vạch mục đang chọn) | paper | 2,85 | chấp nhận được vì đi kèm nền nổi và chữ đậm |

## Bảng 10 tiêu chí

| # | Tiêu chí | Lần 2 | Lần 3 | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán thẩm mỹ | 7,5 | **7,5** | **Được:** "Sổ Tín Dụng" có chất riêng và hợp ngân hàng: tiêu đề serif, giấy ngà `#F1F2EE`, navy với vạch đồng, khối AI tím nét đứt. Bản sắc này giữ đều ở 39 trang, kể cả 22/22b/22c. **Trừ điểm:** (a) đội agent vẽ theo 4 kiểu: 03 một dòng kèm `<details>`; 12 và 14 dải ngang; 06 và 21 dạng cây có đường nối; 25 và 25b lưới 1-2-2-1. (b) Cùng hồ sơ 00201 mà 03 và 25 có hai bố cục khác nhau: 25 không có stepper, không có dải chỉ số, không có cờ. (c) Wizard có hai bố cục: 04 ba cột với panel AI bên cạnh, 17 thẻ có khối AI bên trong. (d) Ba tab đội agent có ba kiểu h1: "Đội agent", "Dấu vết một lượt chạy", "Đội agent: So sánh". |
| 2 | Phân cấp và hành động chính ở màn đầu | 7,0 | **7,5** | **Được:** 02 thấy 5 hàng kèm dải chỉ số và một nút chính. 03 đưa kết luận AI và cờ lên trên. 12 có 4 lựa chọn ngang hàng, nút "Ghi quyết định" khóa kèm lý do. Không trang nào có quá một nút đồng. **Trừ điểm:** 12 thiếu tờ trình và ý kiến của người, là căn cứ để quyết. 13 trống nửa dưới ở 1366. Ở 08, khối "Nhận xét" nằm dưới nếp gấp. Ở 25, khung 1366 mở panel AI vẫn hiện mục lục, cột nội dung chỉ còn khoảng 470px, chữ kết luận xuống nhiều dòng. Ở 1920, nội dung căn trái với max-width 1480 nên bên phải trống khoảng 440px; ở 12, nửa dưới cột trái trống. |
| 3 | Chữ và khả năng đọc tiếng Việt | 8,0 | **7,5** | **Được:** dấu tiếng Việt hiển thị đủ, cỡ nhỏ nhất 12px, số căn phải, dùng mono cho số. **Trừ điểm:** 05 vẫn đặt tên công ty trong ô `num` (mono); lần 2 đã nêu mà chưa sửa. Ở 12 và 14 khung 1366, dải agent cắt chữ thành "Complianc", "Operation", và "6,3 giây" xuống dòng. Nhãn dải chỉ số ở 03, 03b, 03c gãy 3 dòng ("Số tiền đề / nghị / tỷ đồng"). Đơn vị lẫn trên cùng màn: kết luận ghi "12.000.000.000 đồng", dải ghi "15,0 tỷ". Tab đóng panel ở 25b dùng chữ dọc "Trợ lý AI", khó đọc với tiếng Việt có dấu. |
| 4 | Màu và ngữ nghĩa trạng thái | 7,0 | **7,5** | **Được:** mọi cặp chữ trên nền đạt AA. Cột cuối biểu đồ ở 06 đã đổi sang navy. `mark` ở 20 dùng warn-100 kèm gạch chân. Cờ Vàng/Đỏ có cả chữ lẫn hình, không chỉ dựa vào màu. **Trừ điểm:** badge "Trả về QHKH" ở 03, 03b, 03c, 25, 26 dùng màu warn, trong khi §5.1 tự quy định trả lại là danger. 08 vẫn gắn "AI đề xuất" lên thẻ số đo; quy tắc này đã sửa ở 06 và 07 nhưng chưa sửa ở 08. 05 dùng thẻ "AI đọc" chứ không phải "AI đề xuất". 20 dùng badge trạng thái có chấm để làm nhãn "Mục 4.2". Viền `.search` 1,41:1. |
| 5 | Mật độ, lưới, khoảng cách ở 1366 và 1920 | 7,0 | **7,5** | **Được:** 0 tràn ngang ở 4 cỡ. 02 đạt mật độ tốt. 09 vừa khít 768. Ở 1280, panel AI đẩy mục lục đi đúng D5. **Trừ điểm:** ở 1366 dải agent của 12 và 14 bị cắt chữ. Ở 1366 trang 25 dồn ba cột, vì ngưỡng 1360 sát 1366. 13 trống nửa dưới. Ở 1920 trang 12 trống nửa dưới cột trái; mọi trang danh sách để trống mép phải khoảng 440px mà không có lý do bố cục. |
| 6 | Thành phần và trạng thái | 7,5 | **8,0** | **Được:** 21 là bảng thành phần thật: nút 4 loại × 6 trạng thái, nút khóa kèm lý do, ô nhập 5 trạng thái, tab, hàng bảng, drawer, modal, khối đội agent 4 trạng thái, radio dạng thẻ, select lỗi, phân trang. 11 có rỗng sau lọc, 404, lỗi, đang tải (skeleton thấy rõ) và toast. 11b đúng D3. 03b và 03c, 09b và 09c tách riêng. 22b báo lỗi ở cả hai ô kèm `aria-describedby`. **Trừ điểm:** 20b trạng thái rỗng không có nút hành động, trái quy tắc của chính §6 ("minh họa, h2, một câu, một nút"). 17b mâu thuẫn trạng thái: danh sách bước ghi "✓ 4. Tài sản bảo đảm, Xong", trong khi bảng rà soát và banner lỗi nói chưa nhập tài sản. 16 có thẻ đề xuất của agent mà không dùng thành phần khối AI. |
| 7 | AI đề xuất và người quyết định; giám khảo hiểu đội agent trong 30 giây | 6,5 | **7,0** | **Được:** 12 không chọn sẵn; modal ở 12b đúng với lựa chọn và có câu "Không hoàn tác được"; 12c chọn được đích trả lại. "Người quyết định" chỉ còn ở Cấp phê duyệt, các vai khác dùng "Việc của bạn". Hàng "Con người" ở 07 cho thấy người nằm trong dấu vết. Dải demo ghi "Quyết định cuối cùng luôn do người có thẩm quyền xác nhận". **Trừ điểm:** (a) người quyết định ở 12 chỉ thấy kết quả AI: không có tờ trình thẩm định đã chốt, không có ý kiến Rủi ro và Tuân thủ (grep "tờ trình", "ý kiến", "Tuân thủ" trong text trang 12 ra 0), trái F8 và Q-L. Vì thế màn hình ngầm nói "AI là căn cứ duy nhất", ngược thông điệp của bài thi. (b) Số giây của từng agent ở Sông Hậu (09/11 15:12) và Hải Đăng (06/11 15:40) trùng y lượt Phúc Lâm: 2,1 / 7,7 / 6,3 / 5,1 / 9,5 / 3,8. Cờ cảnh báo cũng lặp nguyên văn ở 03, 12, 15. Giám khảo tinh ý sẽ thấy số liệu như đúc khuôn. (c) Bốn kiểu sơ đồ đội agent nói ở tiêu chí 1. (d) 16 không gắn thẻ "AI đề xuất" cho đề xuất của agent; 08 gắn thẻ AI lên số đo. (e) "Planner giao việc" chỉ đọc được ở 07 và trong sơ đồ cây, còn sơ đồ một dòng và dạng lưới không thể hiện việc giao. |
| 8 | Khả năng tiếp cận WCAG AA | 8,0 | **7,5** | **Được:** đo tự động 0 lỗi ở 156 lượt. Có skip link, `main`, `h1`, nhãn ô, tên nút, `aria-describedby` ở 22b, focus thấy được qua `*:focus-visible`, vùng bấm ≥ 24px. **Trừ điểm:** viền ô tìm kiếm ở thanh trên 1,41:1 (1.4.11), lại là ô dùng ở mọi trang. Mình chưa thấy quy định thứ tự đọc cho drawer và modal (bẫy focus, trả focus) trong tài liệu. Chữ dọc ở 25b. Không đủ căn cứ để cho cao hơn: không có axe-core, chưa thử bàn phím từ đầu đến cuối và trình đọc màn hình (tự đánh giá cũng thừa nhận chưa kiểm người mù màu thật). |
| 9 | Văn phong UX | 7,0 | **7,0** | **Được:** dùng "Bước 2 trên 5", giây, "lượt chạy". Lý do khóa nút viết cụ thể ("Còn thiếu ý kiến Tuân thủ"). Modal xác nhận nói rõ hậu quả. **Trừ điểm:** 13 có thẻ "Việc của bạn" đứng cạnh tiêu đề cũng là "Việc của bạn", và còn câu chống nạng "Nút chuyển ở góc trên bên phải mở khi đủ mục"; lần 2 đã nêu. 01 dùng "Cán bộ xem và sửa", trái §8 điều 9. Cùng một tính năng có ba tên: "Trò chuyện" ở thanh bên, h1 "Trợ lý", và mục riêng "Trợ lý AI". 16 có breadcrumb "Việc của tôi / …" mà nút lại là "Về danh sách khách hàng". 10 dùng placeholder giống giá trị thật (10/11/2026, HSV-2026-00201), làm người xem tưởng bộ lọc đang áp. 09 trả lời câu không được hỏi ("chưa có dữ liệu về mức ưu đãi theo ngành"). |
| 10 | Khả thi React + AntD và độ đầy đủ của bàn giao | 7,5 | **7,5** | **Được:** token đủ. Có bảng thành phần → AntD (§11.2), điều hướng theo vai (§11.4), đối chiếu D3, D4, D5 (§12), bảng dữ liệu demo (§14.1), generator `_gen/` kèm `check.js`. Đã kiểm: số tệp khai 39 là đúng (39 HTML, 156 lượt). **Trừ điểm:** lời khai lệch thực tế: §11.4/§12 nói "đo 1280 và 1366: mục lục ẩn" khi panel AI mở, nhưng ảnh 25 ở 1366 vẫn hiện mục lục; §15.2 nói 05 và 08 đã xong, nhưng lỗi lần 2 vẫn còn. Chưa có mockup cho tờ trình 7 mục (Q-L), đề xuất ngoại lệ (Q1/E1), "Chờ phiên Hội đồng" (Q-P), danh sách việc cho HTTD, Thẩm định, Rủi ro/Tuân thủ, Kiểm toán (ở 24 các mục này trỏ về chính trang 24), bước 1, 3, 4 của wizard, bảng thông báo, `/foundation`, Quản trị. Chưa có quy định nào nói phải dựng đội agent thành một thành phần duy nhất có các biến thể. |

Trung bình: (7,5 + 7,5 + 7,5 + 7,5 + 7,5 + 8,0 + 7,0 + 7,5 + 7,0 + 7,5) / 10 = **7,45**.

## Đối chiếu 13 việc của lần 2

Mỗi việc dưới đây mình tự kiểm trên ảnh và text, không dựa vào §15.

| # | Việc lần 2 | Kết quả kiểm | Ghi chú |
| --- | --- | --- | --- |
| 1 | 12: không chọn sẵn, modal theo lựa chọn, một nút, trả lại có hai đích | **Đã sửa** | 12: 4 radio đều trống, nút khóa kèm lý do. 12b: modal "Xác nhận phê duyệt có điều kiện?". 12c: chọn Thẩm định hoặc QHKH. Còn lỗi mới về nghiệp vụ: thiếu tờ trình và ý kiến; điều kiện không có cấu trúc. |
| 2 | Thẻ "Người quyết định" dùng tràn lan | **Đã sửa** | Chỉ còn ở 01 (chú giải), 02b, 12*, 21, 23, 24. Các vai khác dùng "Việc của bạn". |
| 3 | Nút người nằm trong khung AI | **Đã sửa** | Ở 21, `hwrap` đặt ngoài khung AI. Tuy vậy, trên các trang nghiệp vụ không còn nút người nào gắn với sơ đồ đội agent (06 bỏ hẳn), nên phần "người ở cuối chuỗi" chỉ còn thấy ở 07 và 12. |
| 4 | Câu chuyện demo mâu thuẫn | **Sửa một phần** | Ngày, mã hồ sơ, badge và tổng 762 đã khớp. Còn mâu thuẫn: "Hợp đồng thuê đất" ở 05 là "Đang đọc", ở 19 là "Đã xác nhận, 0 lệch, đọc 14:32". 05 ghi "giấy đăng ký ghi 45.000" trong khi Giấy ĐKKD có badge "Khớp". 09 dùng doanh thu 214.750, chính là số đang bị đánh dấu lệch ở 05. Số giây agent trùng nhau giữa ba hồ sơ. 17b đánh "Xong" cho bước chưa làm. |
| 5 | Thanh bên không đổi theo vai | **Đã sửa** | 6 vai, badge 4/3/3/2/3/không. Ở 24, 5 mục của HTTD, Thẩm định, Rủi ro/Tuân thủ và Kiểm toán trỏ về chính trang 24 vì chưa có trang đích. |
| 6 | Văn phong và thuật ngữ | **Sửa một phần** | "Bước x trên 5", giây, "lượt chạy" đều đã đúng. Còn: "Cán bộ" ở 01, câu chống nạng và thẻ trùng ở 13, ba tên cho trợ lý, 16 breadcrumb lệch nút. |
| 7 | Màn đầu 02 và 03 ở 1366 | **Đã sửa** | 02 thấy 5 hàng. 03 thấy kết luận và cờ ở màn đầu. Nhãn dải chỉ số ở 03 gãy 3 dòng. |
| 8 | 09 và 20 hiện nhiều trạng thái cùng lúc | **Đã sửa** | 09, 09b, 09c và 20, 20b đã tách tệp. Còn: 20b thiếu nút. |
| 9 | Ngữ nghĩa màu phụ | **Sửa một phần** | 06, 07 và `mark` đã đúng. Còn: 08 gắn thẻ AI lên số đo; badge "Trả về QHKH" màu warn trái §5.1; "Mục 4.2" ở 20 dùng badge trạng thái. |
| 10 | Bàn giao | **Sửa một phần** | Đã có max-width, bảng thành phần, §11.4, D5. Còn: lời khai về mục lục ở 1366 sai; chưa có đặc tả thành phần đội agent thống nhất; còn thiếu trang (xem dưới). |
| 11 | Ô tìm kiếm cao 22px | **Đã sửa** | Ô cao 34px, ô nhập 32px, vùng bấm đạt. Viền vẫn 1,41:1. |
| 12 | 22b tô lỗi riêng một ô | **Đã sửa** | Cả hai ô viền lỗi, có banner chung. |
| 13 | Trang còn thiếu | **Sửa một phần** | Đã thêm 02b, 17b, 24, 25, 25b, 26. Vẫn thiếu tờ trình 7 mục, đề xuất ngoại lệ, Hội đồng, bốn danh sách việc theo vai, bảng thông báo, `/foundation`, Quản trị. |

Tổng: 7 việc đã sửa, 6 việc sửa một phần, 0 việc chưa đụng tới.

Đề nghị theo trang của lần 2 mà vẫn chưa sửa:
- 05: tên công ty dùng mono.
- 08: hai số chính 37 và 31 lệch hàng khoảng 6px; chưa ghi tên mô hình đơn lẻ (chỉ ghi "cùng mô hình nền").
- 09: câu trả lời lạc đề.
- 13: câu chống nạng.
- 06, 07, 08: header ba tab chưa thống nhất.

## Chấm từng trang

| Trang | Điểm | Phải sửa |
| --- | --- | --- |
| 01 Đăng nhập (chọn vai demo) | 7,5 | Đổi "Cán bộ xem và sửa" theo `UI_ROLE_LABEL`. Lấp nửa dưới panel trái hoặc rút chiều cao panel. |
| 02 Việc của tôi (QHKH) | 8,5 | Ở 1920 nên căn giữa khối 1480 hoặc cho bảng giãn tới 1600, để không trống 440px bên phải. Nhãn "Quá hạn, chờ người khác" nên ghi tên người đang chờ. |
| 02b Hồ sơ chờ phê duyệt | 8,0 | Thêm một dòng hồ sơ > 100 tỷ ở trạng thái "Chờ phiên Hội đồng – có ở đợt 2" (Q-P), để thể hiện ngưỡng Q4. |
| 03 Hồ sơ vay | 7,5 | Nhãn dải chỉ số giữ trên 1 dòng (rút gọn "Đề xuất, tỷ đồng" hoặc nới cột). Badge "Trả về QHKH" đổi sang danger theo §5.1, hoặc sửa §5.1. Thống nhất đơn vị (kết luận AI cũng ghi "12 tỷ"). |
| 03b Đang chạy | 7,5 | Cùng các lỗi dải chỉ số và badge như 03. |
| 03c Lỗi chạy | 7,5 | Cùng các lỗi như 03. Banner lỗi nên nói agent nào lỗi và dữ liệu còn dùng được không. |
| 04 Soạn đề xuất, bước 2 | 7,5 | Thống nhất bố cục với 17 (chọn một: ba cột có panel AI, hoặc thẻ có khối AI). Danh sách bước có dòng phụ như 17. |
| 05 Đối chiếu một tài liệu | 6,5 | Bỏ mono cho tên công ty. Đổi thẻ "AI đọc" thành "AI đề xuất" (hoặc định nghĩa "AI đọc" trong §6). Sửa mâu thuẫn "giấy đăng ký ghi 45.000" với badge "Khớp", và trạng thái "Hợp đồng thuê đất" với 19. |
| 06 Đội agent: Tổng quan | 8,0 | Đặt lại ở cuối sơ đồ một nút người "Cấp phê duyệt" ngoài khung AI (như `hwrap` ở 21). Thống nhất h1 với 07 và 08. |
| 07 Dấu vết một lượt chạy | 8,0 | Thống nhất header với 06 và 08 (cùng h1 "Đội agent", tab là cấp con). |
| 08 So sánh | 6,5 | Bỏ thẻ "AI đề xuất" khỏi thẻ số đo. Căn hai số chính cùng đường chuẩn. Ghi tên mô hình đơn lẻ và kỳ đo. Đưa "Nhận xét" lên màn đầu. |
| 09 Trợ lý (có trả lời) | 6,5 | Câu trả lời đầu phải đúng câu hỏi. Không dùng doanh thu 214.750 đang bị đánh dấu lệch, hoặc có ghi chú "số đang chờ xác nhận". Thống nhất một tên "Trợ lý AI" ở thanh bên, h1 và panel. |
| 09b Đang trả lời | 7,5 | Cùng lỗi tên gọi như 09. |
| 09c Lỗi | 7,5 | Cùng lỗi tên gọi như 09. |
| 10 Nhật ký | 7,0 | Placeholder dạng mẫu ("dd/mm/yyyy", "Mã hồ sơ") chứ không dùng giá trị thật. Thống nhất nhãn nguồn ("Planner" hay "Đội agent (Planner)"). |
| 11 Trạng thái trang | 8,0 | Toast cần ghi thời gian tự tắt và nút đóng có tên. |
| 11b Không có quyền | 8,5 | Ổn. Có thể thêm dòng "Liên hệ ai để xin quyền". |
| 12 Cấp phê duyệt | 6,0 | Thêm khối "Tờ trình thẩm định (bản đã chốt, v…)" và "Ý kiến Rủi ro / Tuân thủ" (khối người, không phải khối AI) phía trên khối AI (F8, Q-L). "Phê duyệt có điều kiện" phải mở ô hạn mức và danh sách điều kiện có cấu trúc, để nối sang 16. Dải agent không được cắt chữ ở 1366; thời gian agent khác nhau giữa các hồ sơ. |
| 12b Xác nhận phê duyệt | 7,5 | Modal phải liệt kê điều kiện và hạn mức đã nhập (sau khi 12 có ô cấu trúc), không chỉ lý do. |
| 12c Trả lại | 8,0 | Ổn. Thêm ô "việc cần sửa" có cấu trúc để bên nhận biết sửa gì. |
| 13 Hỗ trợ tín dụng | 6,5 | Bỏ thẻ "Việc của bạn" trùng tiêu đề. Bỏ câu "Nút chuyển ở góc trên bên phải…". Thêm hành động "Đề xuất ngoại lệ" (Q1/E1). Lấp nửa dưới ở 1366. |
| 14 Thẩm định | 6,5 | Tờ trình phải có 7 mục theo Q-L, kèm nút "Chốt phiên bản", không phải một ô văn bản. Bỏ tiền tố "Việc của bạn:" trong tiêu đề. Dải agent không cắt chữ ở 1366. |
| 15 Ý kiến Rủi ro / Tuân thủ | 7,5 | Cờ không lặp nguyên văn với 03 và 12. Hiện bản tờ trình đang đọc (số phiên bản), đúng Q-L. |
| 16 Đề xuất hành động | 6,5 | Đặt các thẻ đề xuất của agent trong khối AI nét đứt có thẻ "AI đề xuất" (C4). Sửa nút "Về danh sách khách hàng" cho khớp breadcrumb. Điều kiện giải ngân nối với điều kiện nhập ở 12. |
| 17 Tạo đề xuất vay, bước 2 | 7,5 | Thống nhất với 04 (xem 04). |
| 17b Bước 5 rà soát | 6,5 | Bước 4 không được ghi "✓ Xong" khi chưa nhập tài sản. Danh sách bước phải đúng với banner lỗi. |
| 18 Khách hàng | 8,0 | Ổn. Cột "Hồ sơ đang mở" nên bấm được để mở hồ sơ. |
| 19 Đối chiếu danh sách (HTTD) | 7,5 | Bỏ 00201 khỏi danh sách của HTTD khi bước của HTTD đã xong (hoặc ghi "đã xong, chỉ xem"). Trạng thái "Hợp đồng thuê đất" phải khớp với 05. |
| 20 Tra cứu chính sách | 7,5 | "Mục 4.2" dùng nhãn trung tính, không dùng badge trạng thái có chấm. |
| 20b Không có kết quả | 7,0 | Thêm một nút hành động (ví dụ "Xóa bộ lọc" hoặc "Hỏi Trợ lý AI") theo §6. |
| 21 Thành phần | 8,0 | Thêm một thành phần "Đội agent" duy nhất với biến thể (đầy đủ / thu gọn / dải), rồi dùng lại cho 03, 06, 12, 14, 25. Ghi quy tắc focus cho drawer và modal. |
| 22 Keycloak đăng nhập | 8,5 | Ổn. |
| 22b Keycloak lỗi | 8,5 | Ổn. Có thể giữ tên đăng nhập và xóa mật khẩu là đúng; ghi điều này vào tài liệu. |
| 22c Hết phiên | 8,5 | Ổn. |
| 23 Chế độ demo | 8,0 | Trang nền gần trống. Nên đặt menu đổi vai trên một trang thật (ví dụ 02b) để người xem hiểu ngữ cảnh. |
| 24 Thanh bên theo vai | 7,5 | Các đích đang trỏ về chính 24 cần có mockup thật, hoặc ghi rõ "chưa có trang". Đây là bảng tài liệu, nên chuyển vào §11.4 thay vì để thành một trang ứng dụng. |
| 25 Panel Trợ lý AI mở | 7,0 | Ở 1366, ẩn mục lục khi panel mở (đổi ngưỡng D5 lên khoảng 1440, hoặc báo lại để quyết). Mục thanh bên đang chọn phải là "Việc của tôi", không phải "Trợ lý AI". Dùng đúng bố cục 03 cho cùng hồ sơ. |
| 25b Panel đóng | 7,0 | Bỏ chữ dọc ở tab đóng: dùng nút biểu tượng kèm nhãn ngang hoặc tooltip. Sửa mục thanh bên đang chọn như 25. |
| 26 Chi tiết khách hàng | 8,0 | Badge "Trả về QHKH" theo §5.1. Mã hồ sơ bấm được thì cần dấu hiệu là liên kết (gạch chân khi hover). |

Trung bình các trang (39 trang): 7,47.

## Trang còn thiếu mockup

1. **Tờ trình thẩm định 7 mục, có chốt phiên bản** (Q-L). Đây là căn cứ cho 12, 15 và cho Kiểm toán.
2. **Đề xuất ngoại lệ** của HTTD và QHKH (Q1/E1), và cách Cấp phê duyệt thấy ngoại lệ đó ở 12.
3. **Hồ sơ > 100 tỷ: "Chờ phiên Hội đồng – có ở đợt 2"** (Q-P, Q4), kèm trang "Phiên Hội đồng tín dụng" mà thanh bên của Cấp phê duyệt và Kiểm toán đang có.
4. **Danh sách việc cho HTTD, Thẩm định, Rủi ro/Tuân thủ** và **"Hồ sơ vay – chỉ đọc" của Kiểm toán**. Ở 24 các mục này đang trỏ về chính trang 24.
5. **Wizard bước 1, 3, 4.**
6. **Bảng thông báo** (chuông trên thanh trên có chấm đỏ nhưng chưa có trang).
7. **`/foundation`** và **vai Quản trị hệ thống**.

## Việc phải sửa, xếp theo mức ảnh hưởng

1. **12, Cấp phê duyệt thiếu căn cứ của người (nghiệp vụ, tiêu chí 7, 2).**
   - Chỗ: `12-ho-so-phe-duyet.html`, `12b`.
   - Vì sao: người có thẩm quyền quyết định chỉ dựa trên kết quả AI. Trái F8 (kết quả Tuân thủ phải hiện cho cấp phê duyệt) và Q-L (cấp phê duyệt đọc đúng tờ trình đã chốt). Điều này cũng đi ngược thông điệp chính của bài thi.
   - Sửa thành:
     - Phía trên khối AI, đặt khối "Tờ trình thẩm định, bản vN đã chốt" (tóm tắt 7 mục, liên kết mở đầy đủ) và khối "Ý kiến Quản lý rủi ro / Tuân thủ" (hai ý kiến con theo Q-N). Hai khối này là khối người, viền liền, ghi tên người ký.
     - "Phê duyệt có điều kiện" mở ô hạn mức và danh sách điều kiện có cấu trúc.
     - 12b liệt kê lại các điều kiện đó.
2. **Một thành phần "Đội agent" duy nhất (tiêu chí 1, 7, 10).**
   - Chỗ: 03, 06, 12, 14, 21, 25, 25b.
   - Vì sao: bốn kiểu vẽ khiến giám khảo không nhận ra đó là cùng một đội trong 30 giây. Ở 1366 dải ngang của 12 và 14 cắt chữ.
   - Sửa thành:
     - Định nghĩa trong §6 và 21 một thành phần với ba biến thể: đầy đủ dạng cây có đường giao việc từ Planner; thu gọn một dòng; dải. Mọi biến thể giữ thứ tự Planner → 4 agent → Validation → nút người ngoài khung.
     - Dải không được cắt tên agent ở 1366: tên rút gọn có `title`, hoặc xuống 2 hàng.
3. **Số liệu demo như đúc khuôn và mâu thuẫn (tiêu chí 7, 9).**
   - Chỗ:
     - thời gian agent ở 12, 14 (Sông Hậu, Hải Đăng) trùng với 03 (Phúc Lâm);
     - cờ lặp nguyên văn ở 03, 12, 15;
     - 05 với 19 ("Hợp đồng thuê đất");
     - 05 "45.000" với badge "Khớp";
     - 09 dùng số 214.750 đang bị đánh dấu lệch;
     - 17b bước 4 "Xong".
   - Vì sao: giám khảo sẽ nghi số dựng. Luật dự án cấm dựng số giả trên giao diện.
   - Sửa thành:
     - mỗi hồ sơ trong §14.1 có một bộ thời gian agent riêng;
     - `check.js` thêm phép kiểm "không hai lượt chạy nào trùng toàn bộ thời gian", và kiểm trạng thái tài liệu giống nhau giữa 05 và 19;
     - 17b đánh bước 4 là "Còn thiếu".
4. **14, Tờ trình 7 mục (nghiệp vụ Q-L).**
   - Chỗ: `14-ho-so-tham-dinh.html`.
   - Vì sao: hiện chỉ là một ô văn bản, không chốt được phiên bản.
   - Sửa thành: 7 mục có tiêu đề theo Q-L (mỗi mục có khối "AI đề xuất" để chép vào và ô của người), kèm nút đồng "Chốt tờ trình vN".
5. **Lỗi lần 2 chưa sửa ở 05, 08, 09, 13 (tiêu chí 3, 4, 9).**
   - 05: bỏ mono cho tên công ty; đổi "AI đọc" thành "AI đề xuất".
   - 08: bỏ thẻ AI trên số đo; căn hai số 37 và 31 cùng hàng; ghi tên mô hình đơn lẻ và kỳ đo; đưa "Nhận xét" lên màn đầu.
   - 09: câu trả lời đúng câu hỏi.
   - 13: bỏ câu chống nạng và thẻ trùng; thêm "Đề xuất ngoại lệ".
6. **Ngữ nghĩa màu và nhãn (tiêu chí 4).**
   - Badge "Trả về QHKH" (03*, 25*, 26) phải theo §5.1 (danger), hoặc §5.1 sửa thành warn và ghi lý do.
   - "Mục 4.2" ở 20 dùng nhãn trung tính.
   - 16 đặt đề xuất agent trong khối AI.
7. **25/25b ở 1366 (tiêu chí 5, 10).**
   - Vì sao: ngưỡng D5 1360 khiến khung 1366 dồn ba cột, cột nội dung còn khoảng 470px. Tài liệu lại khai sai rằng mục lục ẩn ở 1366.
   - Sửa thành:
     - Ẩn mục lục khi panel mở ở mọi cỡ dưới 1440. Đây là mức chặt hơn D5, không trái D5.
     - Sửa lời khai ở §11.4/§12.
     - Bỏ chữ dọc ở 25b.
     - Mục thanh bên đang chọn là "Việc của tôi".
8. **Văn phong (tiêu chí 9).**
   - Một tên duy nhất cho trợ lý: "Trợ lý AI".
   - 01 bỏ "Cán bộ".
   - 16 nút khớp breadcrumb.
   - 10 placeholder dạng mẫu.
9. **Thống nhất bố cục cùng loại (tiêu chí 1).**
   - Wizard 04 và 17 dùng một bố cục.
   - 03 và 25 cùng hồ sơ thì cùng khung (25 chỉ thêm panel).
   - 06, 07, 08 cùng h1 "Đội agent", tab là cấp con.
10. **Ô tìm kiếm thanh trên (tiêu chí 8).**
    - Chỗ: `app.css` `.search`.
    - Sửa thành: viền `--control` (4,57:1) thay `--rule` (1,41:1).
    - Kèm: ghi quy tắc bẫy và trả focus cho drawer và modal trong §6.
11. **20b trạng thái rỗng thêm một nút** theo §6.
12. **1920 (tiêu chí 5).**
    - Quyết định căn giữa hay căn trái khối 1480 và ghi vào §5.4.
    - Ở 12, lấp nửa dưới cột trái bằng tờ trình và ý kiến (việc 1).
13. **Bổ sung các trang còn thiếu** (mục trên). Ưu tiên tờ trình 7 mục, đề xuất ngoại lệ và "Chờ phiên Hội đồng", vì giám khảo nghiệp vụ sẽ hỏi.

## Chỗ lời khai trong `redesign-v2.md` lệch với thực tế

- §11.4 / §12 / §15.2 (dòng 25): nói "đo 1280 và 1366: mục lục ẩn". Ảnh `25-panel-ai-mo` ở 1366 vẫn hiện mục lục. Hành vi này đúng với ngưỡng 1360, nhưng lời khai sai.
- §15.2 dòng 05 và 06/07/08: ngầm báo đã xong, nhưng đề nghị lần 2 cho 05 (mono) và 08 (căn số, thẻ AI, tên mô hình) chưa làm.
- §15.1 việc 4: nói "câu chuyện demo" đã khớp nhờ `check.js`. Script chỉ bắt ngày, mã và badge; không bắt được các mâu thuẫn ở việc 3 trên.
- Số tệp 39 và 156 lượt: **đúng**, mình đã kiểm lại.
