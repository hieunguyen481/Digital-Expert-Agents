# Chấm điểm định hướng thiết kế v2, lần 2

Giám khảo độc lập (Opus). Chấm lại từ đầu thiết kế hiện tại: `docs/design/redesign-v2.md` (bản v2.1, 390 dòng) và 27 mockup trong `docs/design/mockups-v2/` (`tokens.css`, `app.css`, generator `_gen/`). Chỉ chấm, không sửa thiết kế.

**Kết luận: KHÔNG ĐẠT. Trung bình 7,30/10. Tiêu chí 7 được 6,5, dưới ngưỡng 7.** Lần 1 được 6,55. Bản này tiến rõ: đủ trang theo vai, sơ đồ đội agent đúng, hết lỗi tương phản. Nhưng khoảnh khắc quan trọng nhất của bài thi, tức người có thẩm quyền ra quyết định, vẫn mâu thuẫn trên mockup 12. Nhãn "Người quyết định" bị dùng cho mọi việc của người nên mất nghĩa. Câu chuyện demo cũng không khớp giữa các trang.

## Cách chấm

- **Chuẩn:** skill frontend-design, design-critique, accessibility-review, design-system, ux-copy; nghiệp vụ theo `docs/business/rules.md` (B, C, D3, D4, D5, Q-O, Q-P, phiếu HĐTD).
- **Đo bằng Playwright** mở `file://`, script riêng của giám khảo (không dùng số tự đo của bộ sửa).
  - 27 trang × 4 cỡ (1280×800, 1366×768, 1440×900, 1920×1080), tổng 108 lượt.
  - Mục đo: tràn ngang; tương phản mọi phần tử chữ đang hiển thị (ghép màu nền tổ tiên); cỡ chữ nhỏ nhất; ô nhập chưa nhãn; nút/liên kết chưa tên; trùng `id`; `aria-*` trỏ sai; tab ngoài `tablist`; số `h1`/`main`; skip link; số nút đồng hiển thị; vùng bấm < 24px; đi Tab 14 bước xem focus.
- **Xem ảnh thật:**
  - Cả 27 trang ở 1366 (cả ảnh toàn trang).
  - Ở 1920: 02, 03 và các trang có nhiều khoảng trống.
  - Ở 1280: 02, 03, 09.
  - Modal 12 chụp riêng.
- **Đọc nội dung:** `innerText` của `main` từng trang để soát văn phong và số liệu.
- **Đối chiếu từng việc** trong 13 việc lần 1 với mockup và số đo, không dựa vào bảng §15 của bộ sửa.
- **Chưa làm:** không chạy axe-core (không có trong `node_modules`) và không thử trình đọc màn hình. Tiêu chí 8 vì vậy không chấm trên 8.

### Kết quả đo tự động (108 lượt)

| Mục | Kết quả |
| --- | --- |
| Tràn ngang (`scrollWidth > innerWidth`) | 0 |
| Chữ dưới 4,5:1 (thường) / 3:1 (lớn) | 0 |
| Cỡ chữ nhỏ nhất | 12px |
| Ô nhập chưa nhãn, nút chưa tên, trùng `id`, `aria-*` trỏ sai, tab ngoài `tablist` | 0 / 0 / 0 / 0 / 0 |
| `h1` = 1, `main` = 1, có skip link | 27/27 trang |
| Focus thấy được qua 14 bước Tab | Có ở mọi trang |
| Nút đồng hiển thị | Đúng 1 ở đầu trang: 03, 03b, 03c, 04, 12, 13, 14, 15, 17. Không có ở 02, 16, 18, 19, 20. Trang 21 có 7 (danh mục thành phần, hợp lệ) |
| Vùng bấm < 24px | Ô tìm kiếm thanh trên `#gs` cao 22px ở mọi trang ứng dụng. Radio 13px ở 12 và 15 nằm trong nhãn dạng viên nên vẫn bấm được qua nhãn |
| Trang 09 cuộn trang | Không cuộn ở 1280 và 1366 |
| Trang 02 ở 1366 | Chỉ thấy 2 hàng bảng trong màn đầu, trượt tiêu chí "≥ 3 hàng" do chính §7 đặt |

## Bảng 10 tiêu chí

| # | Tiêu chí | Điểm | Căn cứ chính |
| --- | --- | --- | --- |
| 1 | Bản sắc và nhất quán thẩm mỹ | 7,5 | **Được:** ý tưởng sổ cái giữ vững (gạch kép đầu trang và đầu bảng, lề đồng, logo "S" gạch đồng); nền xám lạnh `#F1F2EE` thay kem, hết dấu hiệu "AI mặc định"; một bộ token 36 màu dùng chung cho 27 trang; AI tím nét đứt tách khỏi người navy viền liền. **Lệch:** (a) `h1` hồ sơ không thống nhất: 03 là tên khách hàng, còn 12–15 là chuỗi chấm giữa "HSV-2026-00201 · TNHH Dệt may Phúc Lâm", đúng mẫu skill frontend-design cấm và lặp lại ngay ở dòng meta; (b) ba tab Đội agent mỗi tab một kiểu đầu trang (06 "Đội agent" có bộ chọn kỳ, 07 "Dấu vết một ca", 08 "Đội agent: So sánh"); (c) 20 dùng `<mark>` vàng chói mặc định của trình duyệt, ngoài bảng màu; (d) §5.7 vẫn ghi logo `#F5F4EF` (kem cũ) trong khi token là `#F1F2EE`. |
| 2 | Phân cấp và hành động chính màn đầu | 7,0 | **Được:** đúng một nút đồng ở góc phải đầu trang ở mọi trang chuyển bước; nút khóa kèm lý do ở 04, 13, 15 rõ ràng. **Trượt:** (a) 02 ở 1366 chỉ thấy 2 hàng, thấp hơn tiêu chí ≥ 3 của §7; (b) 03 ở 1366: sơ đồ đội agent chiếm màn đầu, kết luận và cờ cảnh báo của AI nằm dưới nếp gấp; (c) 12 có hai nút cho một việc: "Ghi quyết định" (khóa, đầu trang) và "Xem lại và xác nhận" (thân trang); (d) 03c: lỗi của Document nằm sát nếp gấp, banner lỗi ở dưới nếp gấp. |
| 3 | Chữ và khả năng đọc tiếng Việt | 8,0 | Dấu chồng hiển thị đúng ở cả 4 cỡ; nhỏ nhất 12px; số tiền mono căn phải; Newsreader cho tiêu đề, phông thân dễ đọc. **Lệch:** tên công ty đặt mono ở 05; mã hồ sơ ở 10 xuống hai dòng ("HSV-2026-" / "00201"); placeholder "dd/MM/yyyy" ở 10 là mã định dạng, không phải tiếng Việt. |
| 4 | Màu và ngữ nghĩa trạng thái | 7,0 | **Được:** mọi cặp chữ đạt AA (bảng dưới); sắp quá hạn là warn, quá hạn là danger; cờ có hình khác nhau; 08 có chữ "Tốt hơn/Kém hơn". **Trượt về ngữ nghĩa:** (a) thẻ navy "Người quyết định" gắn cho mọi việc của người: QHKH sửa đề xuất (03), hộp mô tả lượt chạy agent (03b, 03c), HTTD làm checklist (13), Thẩm định viên soạn tờ trình (14), hai ý kiến Rủi ro và Tuân thủ đặt cạnh nhau (15), checklist giải ngân (16). Thẻ quan trọng nhất của hệ màu vì vậy mất nghĩa. (b) Thẻ "AI đề xuất" gắn lên sơ đồ vận hành và dấu vết (06, 07), là số đo chứ không phải đề xuất. (c) Khối "Kết luận" ở 08 dùng kiểu quyết định của người (vạch navy 5px). (d) Cột cuối biểu đồ 06 tô đồng, mà đồng được dành cho hành động chính. (e) Chú giải "Người quyết định" ở 01 là chữ trắng trên nền navy đặt trên panel navy, nên không thấy hình thẻ. |
| 5 | Mật độ, lưới, khoảng cách 1366 và 1920 | 7,0 | 0 tràn ngang ở 108 lượt; 09 vừa khít 100vh. **Lệch:** (a) 1366: 02 chỉ 2 hàng; 13, 15, 18, 19 để trống 30–45% nửa dưới, trong khi 03 lại dồn nội dung xuống dưới nếp gấp; (b) 1920: 02 giới hạn khoảng 1216px để trống khoảng 456px bên phải, 03 để trống khoảng 256px. Chấp nhận được nhưng lưới không có quy tắc chung (chiều rộng tối đa khác nhau theo trang, §5 không ghi); (c) 06 có khoảng trống lớn dưới biểu đồ. |
| 6 | Thành phần và trạng thái | 7,5 | **Được:** 21 thể hiện nút 4 loại × 6 trạng thái và khóa kèm lý do, ô nhập 5 trạng thái, tab, hàng bảng, drawer, modal, khối đội agent 4 trạng thái. Có trạng thái đang chạy (03b), lỗi chạy (03c), Keycloak lỗi (22b), hết phiên (22c), 403/404/rỗng/đang tải/toast (11). **Thiếu hoặc sai:** (a) khiên 403 ở 11 có dấu tích, nghĩa là "được phép", ngược nghĩa; (b) 09 hiện cùng lúc câu trả lời, chấm "đang trả lời" và lỗi, nên dev không biết trạng thái nào là thật; 20 cũng hiện kết quả cùng hình rỗng; (c) 21 thiếu radio, checkbox, select, badge, phân trang, ô tìm kiếm; skeleton ở 11 gần như không thấy. |
| 7 | AI đề xuất vs người quyết định; giám khảo hiểu đội agent trong 30 giây | **6,5** | **Được (thật):** sơ đồ tỏa nhánh Planner → Credit, Compliance, Operations, Document → Validation, 6 agent khớp danh sách code; thời gian từng agent; câu "AI chỉ đề xuất, không tự phê duyệt"; 07 mở từng bước và có hàng người; 08 so sánh đơn/đa agent có cách đo. Giám khảo nhìn sơ đồ là hiểu trong 30 giây. **Trượt, ảnh hưởng đúng điểm chấm của bài thi:** (a) **12, màn quyết định:** radio "Phê duyệt" chọn sẵn, trong khi AI đề xuất "có điều kiện" và ngoại lệ chọn "Chấp nhận kèm điều kiện"; modal lại hỏi "Xác nhận phê duyệt có điều kiện?". Người xem không biết người duyệt đã chọn gì. Hệ thống chọn sẵn quyết định cũng ngược nguyên tắc "người quyết định". (b) Nút "Người quyết định" nằm bên trong khối AI nét đứt ở 03, 06, 07, 12, 14, trái câu "Người quyết định ngoài khối AI" ở §15 việc 2. (c) Thẻ "Người quyết định" dùng tràn lan (tiêu chí 4a), nên giám khảo không biết ai thật sự quyết. (d) Câu chuyện demo vỡ: cùng hồ sơ HSV-2026-00201, cùng ngày 10/11/2026, nhưng 03 "trả về", 14 "Thẩm định", 15 "Rủi ro", 12 "Phê duyệt", 16 "Phê duyệt xong". Đi theo vai trên dải demo sẽ thấy mâu thuẫn. |
| 8 | Tiếp cận WCAG 2.1/2.2 AA | 8,0 | 0 lỗi tương phản; 0 ô chưa nhãn; skip link, `h1`, `main` đủ; focus thấy ở mọi bước; lỗi có `aria-invalid` và `aria-describedby`; tab có `tablist`. **Còn lại:** ô tìm kiếm `#gs` cao 22px, dưới 24px (2.5.8 của 2.2 AA); khiên 403 mang tích gây hiểu sai (1.1.1 về nghĩa). Chưa có axe và trình đọc màn hình nên không chấm cao hơn. |
| 9 | Văn phong UX | 7,0 | **Được:** nút là động từ; lỗi nêu nguyên nhân và cách sửa ("Nhập lãi suất, ví dụ 9,5."; 22b nêu số lần còn lại); lý do khóa cụ thể ("Còn thiếu ý kiến của Tuân thủ"); không chấm than. **Lỗi:** (a) câu chống nạng "Hành động chính nằm ở góc phải trên: Sửa đề xuất" (03), "Nút chính duy nhất ở góc trên bên phải" (14); (b) thuật ngữ vai lẫn trong chính thiết kế: 03 "Trả về cán bộ tín dụng", 14 "Trả lại QHKH", code là "Trả về QHKH"; (c) 03b "Thường mất khoảng 1 phút" trong khi lượt mẫu là 15,4 giây; (d) 07 trộn "2.100 ms" với "2,1 giây", dùng chữ "ca" là thuật ngữ nội bộ; (e) 04 "Bước 5 trong 5" còn 17 "Bước 2 trên 5"; (f) 02 ghi "4 hồ sơ cần bạn xử lý … và 1 đã quá hạn", nhưng hồ sơ quá hạn đang chờ người khác (nút "Theo dõi"); (g) 22b báo chung "Sai tên đăng nhập hoặc mật khẩu" nhưng lại tô lỗi riêng ô tên đăng nhập, vừa mâu thuẫn vừa lộ ô nào sai. |
| 10 | Khả thi React + Ant Design, độ đủ của bàn giao | 7,5 | **Được:** §11 có bảng thành phần → AntD → component token → tệp trong `frontend/src` (18 dòng), danh sách agent dùng chung, map `ConfigProvider`, thứ tự áp 5 bước, §13 cách đo, §14 quy tắc khi chưa có số thật; generator `_gen/` dựng lại được mockup. **Thiếu:** (a) không có đặc tả điều hướng theo vai: thanh bên giống hệt cho mọi vai (badge 4, "Tạo đề xuất vay" hiện cả với Giám đốc và Kiểm toán), trái `rules.md` C (badge qhkh 4, httd 3, tdinh 3, ruiro 2, pheduyet 3); (b) §12 tóm D5 thành "Kiểm bố cục ở 1280", bỏ mất "AI mở và đóng", "ẩn mục lục khi panel AI mở và < 1360px"; thiết kế không có panel AI trong hồ sơ mà `rules.md` dòng 77 dẫn tới; (c) chưa có mockup cho mấy route và màn còn thiếu (mục dưới). |
| | **Trung bình** | **7,30** | Tiêu chí 7 (6,5) dưới 7; tiêu chí 2, 4, 5, 9 vừa chạm 7,0 |

## Tương phản đã đo (WCAG 1.4.3 và 1.4.11)

Tính theo công thức độ chói tương đối WCAG từ giá trị trong `tokens.css`. Script quét DOM cho kết quả 0 cặp chữ trượt.

| Cặp | Tỉ lệ | Kết quả |
| --- | --- | --- |
| ink `#1B2430` / paper `#F1F2EE` | 13,92 | Đạt |
| ink-2 `#434C5A` / surface `#FBFBF8` | 8,37 | Đạt |
| ink-3 `#5E6573` / surface | 5,65 | Đạt |
| ink-3 / paper | 5,21 | Đạt |
| ink-3 / paper-2 `#E4E7E0` (chữ nút khóa) | 4,69 | Đạt, cặp chữ thấp nhất |
| Trắng / navy-700 `#14284B` (thẻ "Người quyết định", nút navy) | 14,64 | Đạt (lần 1: 2,50) |
| ink-inv / navy-700 (thanh bên) | 13,02 | Đạt |
| `#1B1405` / bronze-500 `#B08A3E` (nút đồng) | 5,70 | Đạt |
| Trắng / bronze-700 `#7A5C22` (nút đồng hover) | 6,21 | Đạt (lần 1: 4,08) |
| ai-700 `#4F3590` / ai-50 `#F3F0FA` | 8,31 | Đạt |
| ai-700 / ai-100 `#E9E3F6` (thẻ "AI đề xuất") | 7,48 | Đạt |
| Trắng / ai-700 (nút "Chạy lại đội agent") | 9,36 | Đạt |
| ok-700 / ok-100 | 5,52 | Đạt |
| warn-700 / warn-100 | 5,05 | Đạt |
| danger-700 / danger-100 | 5,46 | Đạt |
| danger-700 / surface (chữ lỗi dưới ô) | 6,78 | Đạt |
| info-700 / info-100 | 6,51 | Đạt |
| navy-500 `#2A4A80` / surface (liên kết) | 8,48 | Đạt |
| control `#6F7660` / surface (viền ô nhập) | 4,57 | Đạt 3:1 |
| control / paper | 4,21 | Đạt 3:1 |
| ai-500 nét đứt / surface (viền khối AI) | 5,90 | Đạt 3:1 |
| bronze-700 / surface (gạch chân tab chọn) | 5,99 | Đạt 3:1 |
| bronze-500 / surface (vạch đồng, cột biểu đồ) | 3,09 | Đạt 3:1, sát ngưỡng |
| rule `#D3D7CC` / surface (đường kẻ bảng) | 1,41 | Trang trí, không bắt buộc. Không được dùng làm viền thành phần tương tác |

## Bảng từng trang

| Trang | Điểm | Phải sửa (1–3 điểm) |
| --- | --- | --- |
| 01 Đăng nhập | 7,5 | Chú giải "Người quyết định" trắng trên navy đặt trên panel navy nên không thấy thẻ: thêm viền sáng hoặc đặt mẫu thẻ trên nền giấy, và minh họa nét đứt AI / viền liền người. Góc dưới trái panel trống lớn: đưa chú giải 3 bước "AI đề xuất → người xem → người quyết định" xuống lấp. |
| 02 Việc của tôi | 7,0 | 1366 chỉ thấy 2 hàng: thu thẻ "Việc gấp hôm nay" thành một dòng hoặc gộp 4 thẻ chỉ số vào một dải cao ≤ 72px để thấy ≥ 3 hàng. Câu phụ đề: tách "1 hồ sơ quá hạn đang chờ Quản lý rủi ro" khỏi "cần bạn xử lý". Hàng 1 "Hạn hôm nay" thêm ngày 10/11/2026 như các hàng khác. |
| 03 Hồ sơ vay (QHKH, trả lại) | 7,0 | Đưa "Kết luận của đội agent" và cờ cảnh báo lên trên sơ đồ, hoặc thu sơ đồ thành một dải ngang 120px ở 1366. Hộp việc của QHKH đổi thẻ thành "Việc của bạn"; bỏ câu "Hành động chính nằm ở góc phải trên". Dòng thời gian 07/11 (thứ Bảy), 08/11 (Chủ nhật) đổi sang ngày làm việc (rules B); stepper khi bị trả lại phải giữ các bước đã qua là "đã xong" và ghi bước trả lại. |
| 03b Đang chạy | 7,5 | "Thường mất khoảng 1 phút" sửa theo số thật của mẫu ("khoảng 15 giây"). Hộp bên phải bỏ thẻ "Người quyết định" (đang mô tả lượt chạy AI). |
| 03c Lỗi chạy | 7,5 | Đưa banner lỗi lên đầu vùng nội dung, trên sơ đồ; nút "Chạy lại" đặt trong banner. Bỏ thẻ "Người quyết định" ở hộp mô tả lỗi. |
| 04 Sửa đề xuất | 7,0 | Tiêu đề "Bước 5 trong 5: Rà soát và gửi" nhưng nội dung là các ô sửa: hoặc đổi thành bước sửa đúng tên, hoặc vẽ đúng màn rà soát (tóm tắt chỉ đọc + mục còn thiếu). Thống nhất cách viết bước với 17 ("Bước x trên 5"). |
| 05 Đối chiếu tài liệu | 7,0 | Banner AI và cột giá trị AI đọc phải mang thẻ "AI đề xuất" và kiểu AI (nền ai-50). Tên công ty bỏ mono. Ngày tải BCTC 2025 (09/11) mâu thuẫn với 10 (Document agent đọc lúc 08/11 10:20:30): sửa một chỗ. |
| 06 Đội agent: Tổng quan | 7,0 | Số trên sơ đồ (Credit 7,7; Operations 5,1) khác bảng trung vị cùng trang (7,6; 5,2): ghi rõ "lượt gần nhất" và "trung vị" hoặc dùng một số. Bỏ thẻ "AI đề xuất" khỏi sơ đồ vận hành. Cột biểu đồ cuối dùng navy hoặc ai, không dùng đồng. |
| 07 Dấu vết | 7,5 | Một đơn vị: "2,1 giây" (bỏ "2.100 ms"). Thay "ca" bằng "lượt chạy". Bỏ thẻ "AI đề xuất" trên sơ đồ dấu vết. |
| 08 So sánh | 7,5 | Căn hai số chính của hai thẻ thẳng hàng (lệch khoảng 13px). Khối "Kết luận" bỏ kiểu quyết định của người (vạch navy 5px), dùng kiểu thông tin. Ghi tên mô hình đơn lẻ và kỳ đo. |
| 09 Trợ lý | 6,5 | Tách 3 trạng thái (có câu trả lời, đang trả lời, lỗi) thành 3 khung hoặc 3 mockup; mockup chính chỉ hiện một trạng thái. Câu trả lời phải trả lời đúng câu hỏi đang hiện (hiện đang nói "ưu đãi theo ngành" không ai hỏi). |
| 10 Nhật ký kiểm toán | 7,5 | Mã hồ sơ không được xuống dòng (`white-space:nowrap`, nới cột). "Phê duyệt có điều kiện" ngày 08/11 là Chủ nhật: đổi ngày làm việc. Placeholder "dd/MM/yyyy" đổi thành ví dụ "10/11/2026". |
| 11 Trạng thái | 7,0 | Khiên 403 bỏ dấu tích (dùng khiên trơn hoặc khiên có gạch). "Rỗng sau lọc" lấy bộ lọc khác "Quá hạn" (02 đang có Quá hạn 1). Skeleton tăng tương phản lên ≥ 1,5:1 so với nền để thấy. |
| 12 Hồ sơ vay (Cấp phê duyệt) | 6,0 | Không chọn sẵn quyết định; tiêu đề modal lấy theo radio đang chọn. Một nút: header "Ghi quyết định" mở modal, bỏ "Xem lại và xác nhận" ở thân trang (hoặc biến nó thành dòng khóa/liên kết theo D4). "Trả lại" phải có hai đích Thẩm định và QHKH (rules Q-O, code `ActionsPanel`). `h1` theo mẫu 03 (tên khách hàng), bỏ chuỗi chấm giữa. |
| 13 Hồ sơ vay (HTTD) | 7,5 | Thẻ hộp HTTD đổi thành "Việc của bạn". Ở 1366 nửa dưới trống: đưa danh sách checklist cùng cột với khối AI hoặc giảm khoảng. |
| 14 Hồ sơ vay (Thẩm định) | 7,0 | Thẻ "Người quyết định: Thẩm định viên" sai vai (thẩm định không quyết định): đổi "Việc của bạn". "Trả lại QHKH" vs 03 "Trả về cán bộ tín dụng": chọn một tên vai cho toàn bộ. Bỏ câu "Nút chính duy nhất ở góc trên bên phải". |
| 15 Ý kiến Rủi ro và Tuân thủ | 7,5 | Hai thẻ "Người quyết định" cho hai ý kiến: đổi "Ý kiến của bạn" / "Ý kiến Tuân thủ". Nửa dưới trống ở 1366. |
| 16 Đề xuất hành động | 7,5 | Hồ sơ ở "Phê duyệt xong" cùng ngày với 03/12/14/15: dùng một hồ sơ khác hoặc ghi rõ đây là bước sau. Thẻ "Người quyết định" ở checklist giải ngân đổi "Điều kiện giải ngân". |
| 17 Tạo đề xuất vay | 8,0 | Chỉ có bước 2: thêm ít nhất bước 5 "Rà soát và gửi" với "Gửi Hỗ trợ tín dụng" khóa kèm lý do (D4). Danh sách bước bên trái cần dấu trạng thái (tích, đang, chưa) ngoài chữ. |
| 18 Khách hàng | 8,0 | Thiếu trang chi tiết `/customer/:id`. Nửa dưới trống: thêm cột hoặc phân trang mẫu. |
| 19 Đối chiếu: danh sách | 8,0 | Ngày 07/11/2026 là thứ Bảy: đổi ngày làm việc. Thêm cột hành động hoặc ghi rõ cả hàng bấm được. |
| 20 Tra cứu chính sách | 7,0 | `<mark>` đang vàng chói mặc định: định nghĩa `mark` bằng token (ví dụ nền warn-100, chữ ink). Không hiện kết quả và hình rỗng cùng lúc. |
| 21 Thành phần | 8,5 | Thêm radio, checkbox, select, badge, phân trang, ô tìm kiếm thanh trên (≥ 24px). |
| 22 Keycloak: đăng nhập | 8,5 | Không có điểm nặng. Cân nhắc gom về một màn đăng nhập với 01 để giám khảo không thấy hai trang đăng nhập khác nhau. |
| 22b Keycloak: lỗi | 7,5 | Bỏ lỗi riêng dưới ô tên đăng nhập; chỉ để banner chung (không lộ ô nào sai, không mâu thuẫn câu banner). |
| 22c Hết phiên | 8,5 | Không có điểm nặng. "Bản nháp của bạn đã được lưu" chỉ được hiện khi có bản nháp: ghi điều kiện trong tài liệu. |
| 23 Chế độ demo | 8,0 | Đổi vai phải đổi cả thanh bên (badge, mục điều hướng). Hiện thanh bên giống hệt mọi vai. Cần mockup ít nhất một vai khác QHKH. |

Trung bình 27 trang: 7,44.

## Đối chiếu 13 việc lần 1 (giám khảo tự kiểm, không dựa §15)

| # | Việc lần 1 | Kết quả | Căn cứ |
| --- | --- | --- | --- |
| 1 | Thiếu mockup cấp phê duyệt, HTTD, Thẩm định | **Một phần** | Có 12, 13, 14, 15, 16. Nhưng 12 chọn sẵn "Phê duyệt" và modal lệch radio; "Trả lại" chỉ một đích; chưa có phiếu HĐTD (rules cho dời đợt 2 theo Q-P nên ảnh hưởng thấp) |
| 2 | Sơ đồ đội agent gộp nút, số agent lệch | **Đã sửa, còn lệch** | Tỏa nhánh đúng, 6 agent khớp code. "Người quyết định ngoài khối AI" (§15) sai: nút người vẫn nằm trong khối nét đứt ở 03, 06, 07, 12, 14 |
| 3 | Số liệu tự mâu thuẫn | **Một phần** | Đã khớp: 06 tổng 762, 07 chuỗi 15,4 giây, 08 37/40 và 31/40, 10 128 hàng / 22 trang. Còn: sơ đồ 06 lệch bảng trung vị; 05 lệch 10 về ngày đọc BCTC; ngày thứ Bảy, Chủ nhật ở 03, 10, 19; cùng hồ sơ ở 5 giai đoạn cùng ngày |
| 4 | Lỗi CSS thẻ người 2,50:1, đồng hover 4,08:1 | **Đã sửa** | 14,64:1 và 6,21:1; quét 108 lượt 0 cặp trượt |
| 5 | Mâu thuẫn D3, D4 | **Phần lớn** | D4 đúng: 1 nút đồng ở đầu trang, 04 và 13 khóa kèm lý do, 17 "Tiếp: Tài chính". D3: có khiên, không tên khách, 1 nút, nhưng khiên có dấu tích ngược nghĩa |
| 6 | Trạng thái thành phần còn thiếu | **Đã sửa, còn thiếu nhỏ** | 21 đủ nút/ô nhập/tab/hàng/drawer/modal/đội agent; thiếu radio, checkbox, select, phân trang |
| 7 | 03 nói ba điều khác nhau | **Phần lớn** | Còn một câu, một nút. Còn câu chống nạng; stepper khi bị trả lại vẫn khó hiểu |
| 8 | A11y cấu trúc | **Đã sửa** | Đo: 0 ô chưa nhãn, 0 tab ngoài tablist, `h1`/`main`/skip link đủ 27 trang |
| 9 | Nhãn AI không thống nhất | **Một phần** | Một chữ "AI đề xuất" đã thống nhất. Nhưng 05 cột giá trị AI đọc chưa mang kiểu AI; thẻ AI lại gắn lên sơ đồ vận hành 06, 07 |
| 10 | Dấu hiệu "mặc định kiểu AI" | **Một phần** | Nền kem, tiêu đề cột mono, hai nút đồng đã bỏ. `h1` chuỗi chấm giữa xuất hiện mới ở 12–15 |
| 11 | Ngày thiếu năm, quá hạn tô danger, chênh lệch chỉ màu | **Đã sửa** | Ngày đủ năm, sắp quá hạn = warn, 08 có chữ. Lỗi mới cùng nhóm: ngày cuối tuần, "Hạn hôm nay" không ngày |
| 12 | Bàn giao React + AntD | **Phần lớn** | §11 có bảng 18 dòng, agent dùng chung, thứ tự áp. Thiếu đặc tả điều hướng theo vai; §12 tóm sai D5 (bỏ "AI mở và đóng"); §5.7 còn màu logo cũ |
| 13 | 1920 trải rộng; 09 cuộn 31px | **Đã sửa** | 02 giới hạn bề rộng, 09 vừa 100vh ở 1280 và 1366. Lỗi mới: 09 hiện ba trạng thái cùng lúc |

Tổng: 4 việc đã sửa (4, 8, 11, 13); 2 việc đã sửa nhưng còn lệch hoặc thiếu nhỏ (2, 6); 3 việc phần lớn (5, 7, 12); 4 việc một phần (1, 3, 9, 10). Không việc nào bị bỏ qua.

## Trang còn thiếu mockup

Đối chiếu route trong `frontend/src/app` và `rules.md`:

1. **Thanh bên và Việc của tôi theo từng vai** (HTTD, Thẩm định, Rủi ro, Tuân thủ, Cấp phê duyệt, Giám đốc, Kiểm toán): badge theo rules C, ẩn "Tạo đề xuất vay" với vai không tạo. Đây là thiếu nặng nhất vì dải demo mời giám khảo đổi vai.
2. **Panel AI trong hồ sơ** (rules dòng 77 và D5: mở/đóng, ẩn mục lục khi < 1360px) ở 1280 và 1440.
3. **Chi tiết khách hàng** `/customer/:id`.
4. **Wizard Tạo đề xuất vay** bước 1, 3, 4, 5 (`/de-xuat-vay`); ít nhất bước 5 với nút khóa kèm lý do.
5. **Đề xuất ngoại lệ** do QHKH lập (12 chỉ có phần quyết định ngoại lệ).
6. **Phiếu HĐTD** (4 loại, bắt buộc lý do; Q12 phiên mở chỉ hiện "n/m đã bỏ phiếu"). Được dời đợt 2 theo Q-P, nhưng cần ít nhất màn "Chờ phiên Hội đồng – có ở đợt 2".
7. `/foundation`, nếu route này còn giữ.
8. Bảng thông báo khi bấm chuông.

## Việc phải sửa, xếp theo mức ảnh hưởng

| # | Chỗ nào | Vì sao | Sửa thành gì |
| --- | --- | --- | --- |
| 1 | 12 Hồ sơ vay, vai Cấp phê duyệt | Đây là khoảnh khắc "người có thẩm quyền quyết định" mà bài thi chấm. Radio "Phê duyệt" chọn sẵn ngược AI "có điều kiện", modal hỏi "phê duyệt có điều kiện?", hai nút cho một việc, "Trả lại" thiếu đích Thẩm định | Không chọn sẵn; nút đầu trang "Ghi quyết định" khóa với lý do "Chọn quyết định và nhập lý do"; modal lấy tiêu đề và hậu quả theo lựa chọn; "Trả lại" có hai lựa chọn "về Thẩm định" và "về QHKH (sửa đề xuất)" như `ActionsPanel`; bỏ "Xem lại và xác nhận" ở thân trang |
| 2 | Thẻ "Người quyết định" ở 03, 03b, 03c, 13, 14, 15, 16 | Nhãn quan trọng nhất của hệ màu bị dùng cho mọi việc của người nên giám khảo không còn thấy ai quyết | Chỉ dùng "Người quyết định" cho Cấp phê duyệt (và HĐTD). Việc khác dùng thẻ trung tính "Việc của bạn" / "Ý kiến" (viền navy mảnh, không nền navy). Ghi quy tắc này vào §6 |
| 3 | Nút "Người quyết định: Cấp phê duyệt" trong sơ đồ (03, 06, 07, 12, 14, 21) | Nằm bên trong khung AI nét đứt, trái chính §15; làm mờ ranh giới AI/người | Kéo nút người ra ngoài khung nét đứt, nối bằng mũi tên qua mép khung, nền giấy, viền navy liền |
| 4 | Câu chuyện demo xuyên trang | Cùng HSV-2026-00201, cùng ngày, ở 5 giai đoạn khác nhau; ngày thứ Bảy, Chủ nhật (03, 10, 19); 05 và 10 lệch ngày đọc BCTC; sơ đồ 06 lệch bảng 06 | Lập một bảng dữ liệu demo trong §14: mỗi giai đoạn một hồ sơ (hoặc ngày khác nhau theo trình tự), mọi ngày là ngày làm việc; generator kiểm chéo ngày và giai đoạn như đã kiểm tổng 762 |
| 5 | Thanh bên mọi trang và 23 | Dải demo mời đổi vai nhưng điều hướng không đổi; trái rules C | Đặc tả bảng vai → mục điều hướng → badge; mockup ít nhất thanh bên của Cấp phê duyệt và Kiểm toán |
| 6 | Văn phong và thuật ngữ vai | "cán bộ tín dụng" vs "QHKH" lẫn ngay trong thiết kế; câu chống nạng; "1 phút" vs 15,4 giây; "ms" vs "giây"; "ca"; "trong 5" vs "trên 5" | Chọn một tên vai (theo code: QHKH, kèm tên đầy đủ ở tooltip lần đầu) và ghi vào §8; xóa các câu chỉ đường tới nút; sửa từng chỗ nêu ở bảng trang |
| 7 | 02 và 03 màn đầu ở 1366 | 02 thấy 2 hàng (trượt §7); 03 kết luận AI dưới nếp gấp | 02: gộp 4 thẻ chỉ số thành dải ≤ 72px. 03: kết luận + cờ lên trên, sơ đồ thu gọn mở rộng được |
| 8 | 09 và 20 hiện nhiều trạng thái cùng lúc | Dev và giám khảo không biết màn thật trông thế nào | Mỗi mockup một trạng thái; trạng thái khác để ở 21 hoặc tệp riêng |
| 9 | Ngữ nghĩa màu phụ | Thẻ AI trên số đo 06/07; kết luận 08 kiểu người; cột đồng ở 06; khiên 403 có tích; `<mark>` vàng chói ở 20; chú giải 01 không thấy | Sửa từng chỗ như bảng trang; thêm `mark` vào token |
| 10 | Bàn giao | §12 tóm sai D5; thiếu panel AI; §5.7 màu logo cũ; thiếu chiều rộng tối đa vùng nội dung trong §5; 21 thiếu radio/checkbox/select/phân trang | Chép đủ D5 và thiết kế panel AI; sửa `#F5F4EF` → token paper; ghi `max-width` vùng nội dung theo loại trang; bổ sung 21 |
| 11 | Ô tìm kiếm thanh trên `#gs` | Cao 22px < 24px (WCAG 2.2 2.5.8) | Cho ô nhập cao bằng khung 32px |
| 12 | 22b | Banner chung nhưng tô lỗi riêng ô tên đăng nhập: mâu thuẫn và lộ thông tin | Chỉ để banner; tô viền cả hai ô hoặc không ô nào |
| 13 | Trang còn thiếu (mục trên) | Bàn giao chưa đủ để dev làm luồng theo vai | Ưu tiên: thanh bên theo vai, panel AI, chi tiết khách hàng, wizard bước 5 |

Để ĐẠT, ít nhất phải xong việc 1–4 (đưa tiêu chí 7 lên ≥ 8 và tiêu chí 4 lên ≥ 8) và việc 5–7 (đưa tiêu chí 2, 9, 10 lên khoảng 8).

## Điều tài liệu thiết kế tự khai khác với kết quả đo

- §15 việc 2 "Người quyết định ngoài khối AI": sai. Nút người nằm trong khung nét đứt.
- §15 việc 3 "Số liệu tự mâu thuẫn" đã sửa: chỉ đúng với các tổng được generator kiểm; ngày tháng, giai đoạn và số giữa sơ đồ với bảng vẫn lệch.
- §15 việc 9 "Một nhãn AI": chữ đã thống nhất nhưng chỗ gắn thì chưa (05 thiếu, 06/07 thừa).
- §15 việc 13 và §7: 02 ở 1366 tự đặt tiêu chí ≥ 3 hàng nhưng chỉ có 2 hàng.
- §12 D5: tóm thiếu phần "panel AI mở và đóng" của `rules.md`.
- §5.7: logo `#F5F4EF` không còn khớp token.
- §15 "0 vấn đề ở 108 lượt": đúng với các phép đo máy (giám khảo đo lại cũng ra 0 về tương phản, nhãn, tràn). Nhưng các lỗi nặng còn lại là lỗi nghĩa và nghiệp vụ, script không bắt được.
