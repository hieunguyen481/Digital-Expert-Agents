# Thiết kế lại v2: "Sổ Tín Dụng"

Phạm vi: định hướng thiết kế và mockup cho toàn bộ ứng dụng. Tài liệu này **chưa** thay đổi mã ứng dụng. Mockup nằm ở `docs/design/mockups-v2/` (mở trực tiếp bằng trình duyệt, tự chứa, dùng chung `tokens.css`).

## Mục lục

1. Skill đã áp dụng
2. Hiện trạng và phê bình (design-critique)
3. Hướng thẩm mỹ: A "Sổ cái ngân hàng" (đã chọn) và phương án B
4. Nguyên tắc thiết kế
5. Token (bảng giá trị)
6. Quy cách thành phần
7. Quy cách từng trang và tiêu chí nghiệm thu
8. Văn phong UX
9. Kế hoạch áp vào code
10. Bảng tự chấm (design-critique, accessibility-review)
11. Bàn giao cho React và Ant Design (v2.1)
12. Đối chiếu `rules.md` D3, D4, D5 và quyết định mở
13. Kiểm tra ở 4 cỡ màn hình
14. Quy tắc hiển thị khi chưa có số thật
15. Bảng "đã sửa" đối chiếu báo cáo chấm lần 1

## 1. Skill đã áp dụng

| Skill | Dùng ở đâu |
| --- | --- |
| frontend-design | Mục 3 và 4: chọn một hướng có chủ đích; tránh các dấu hiệu "mặc định kiểu AI" (kem + terracotta, thẻ SaaS giống hệt nhau, nhãn VIẾT HOA); kế hoạch hai bước (kế hoạch rồi dựng), một điểm nhấn đồng, phông tiếng Việt, chuyển động tiết chế |
| design-system | Mục 5 và 6: token màu/chữ/khoảng cách/bo góc/đổ bóng/chuyển động, quy cách thành phần có biến thể, trạng thái, kích cỡ, ARIA |
| design-critique | Mục 2 (phê bình hiện trạng theo 5 trục: ấn tượng đầu, dùng được, phân cấp, nhất quán, truy cập) và mục 10 (tự chấm bản mới) |
| accessibility-review | Mục 5.8, 6, 10: tỉ lệ tương phản tính bằng số, vùng bấm, focus, không chỉ dựa vào màu, `prefers-reduced-motion` |
| ux-copy | Mục 8: nút bắt đầu bằng động từ, thông báo lỗi nói nguyên nhân và cách xử lý, trạng thái rỗng, hộp xác nhận nêu hậu quả |
| design-handoff | Mục 7 và 9: kích thước, token tham chiếu, trạng thái, ca biên, thứ tự áp vào code, tiêu chí nghiệm thu đo được |

## 2. Hiện trạng và phê bình

Ảnh chụp hiện trạng: `/tmp/ds1/before/` (16 trang × 1366 và 1920; không commit). Vai dùng: QHKH (Việc của tôi, Tạo đề xuất, Soạn đề xuất, Hồ sơ vay, Đối chiếu, Chat, Chính sách, Khách hàng, 404, 403 Dashboard), Giám đốc (Dashboard 3 tab), Kiểm toán (Nhật ký).

| Trục | Phát hiện | Mức |
| --- | --- | --- |
| Ấn tượng đầu | Trang đăng nhập là một thẻ trắng nhỏ giữa nền trắng, logo và tên "SHB" gắn một ngân hàng cụ thể; không nói gì về giá trị sản phẩm. Các trang trong đều cùng một độ nhẹ, mắt không biết nhìn đâu trước | Nặng |
| Phân cấp | Hồ sơ vay: tiêu đề, trạng thái, tiến trình, tab và khối "Việc cần làm" cùng cỡ và cùng nền, màn đầu bị nén; số liệu chính (số tiền, DSCR, LTV) không nổi hơn nhãn | Nặng |
| Phân cấp | Dashboard: 5 thẻ chỉ số cùng kích thước và nền, chỉ số quan trọng nhất (số lượt có kết luận) không nổi lên | Trung bình |
| Nhịp khoảng cách | Khoảng cách không theo lưới: thẻ sát nhau 8 đến 12px, tiêu đề thẻ và nội dung cách nhau không đều; Soạn đề xuất có cột trái hẹp, ô nhập kéo dài hết bề ngang | Trung bình |
| Chữ | Một họ Be Vietnam Pro cho mọi thứ; số tiền không thẳng cột, khó so sánh giữa các hàng; nhiều chữ 11 đến 12px màu xám nhạt | Nặng |
| Màu | Cam SHB làm màu nhấn cho cả nút chính lẫn trạng thái; không có màu riêng cho nội dung AI so với quyết định người; nền trắng và xám lạnh phẳng | Nặng |
| Mật độ | Bảng Việc của tôi dùng tốt chiều ngang nhưng cột "Việc của tôi" lặp một giá trị "Cần xử lý" cho mọi dòng, tốn chỗ không mang tin; Đối chiếu để trống nửa màn khi chưa có tài liệu | Trung bình |
| Trạng thái | Đang tải là các thanh xám trơn không nói gì; rỗng chỉ có một dòng chữ nhỏ; 403 và lỗi chưa có minh họa hay hướng xử lý | Trung bình |
| Truy cập | Chữ xám nhạt cỡ nhỏ có nguy cơ dưới 4,5:1; viền ô nhập sáng; focus không đồng nhất | Trung bình |
| Nhất quán | Sidebar tối chen màu tím đậm và cam; Chat dùng bố cục và logo riêng khác phần còn lại | Nhẹ |

## 3. Hướng thẩm mỹ

### A. "Sổ cái ngân hàng" (đã chọn)

Ý tưởng: mỗi hồ sơ vay là một trang sổ có người chịu trách nhiệm. Giao diện mượn vocabulary của sổ kế toán: nền giấy, dòng kẻ mảnh, **gạch kép dưới tiêu đề bảng** (dấu hiệu của sổ cái), lề dọc đồng ở trang đăng nhập, số đặt thẳng cột bằng phông đơn cách. Một điểm nhấn duy nhất: **đồng (bronze)** dùng cho mục đang chọn, thẻ chỉ số chính và nút hành động chốt.

Quyết định của Mate (giữ nguyên lời): chọn A "Sổ cái ngân hàng", kèm ba điều chỉnh:
1. Mọi số liệu, số tiền, tỉ lệ dùng chữ số bảng (tabular) hoặc IBM Plex Mono để bảng thẳng cột. **Áp dụng:** `.num`/`.tnum` dùng IBM Plex Mono kèm `font-variant-numeric: tabular-nums`; cột số căn phải.
2. Vùng đội agent và mọi nội dung "AI đề xuất" có một màu nhận diện riêng nhất quán, tách hẳn màu "người quyết định". **Áp dụng:** AI = tím mực (`--ai-*`), viền nét đứt, nền tím rất nhạt, thẻ "AI đề xuất". Người quyết định = navy đặc (`--navy-700`), viền liền dày 5px bên trái, thẻ navy "Người quyết định". Hai nhóm khác nhau cả về màu, nét viền và nhãn chữ, nên không dựa vào màu đơn thuần.
3. Mật độ cao nhưng Hồ sơ vay và Dashboard có khoảng thở và phân cấp rõ ở màn đầu. **Áp dụng:** tiêu đề 34px, 4 thẻ chỉ số một hàng với thẻ đầu có vạch đồng, khoảng cách giữa các khối 24 đến 32px, bảng dày chỉ ở phần chi tiết bên dưới.

Kiểm tra dấu tiếng Việt của Newsreader (đã chạy, ảnh `/tmp/ds1/vn.png`): hiển thị đủ `Ệ ặ ữ ỗ ả ề ợ ụ Đ đ` và toàn bộ chồng dấu ở 11, 14, 20, 34px và cả chữ nghiêng; gói phông có subset `vietnamese`. Kết luận: giữ Newsreader. Quy tắc: serif chỉ dùng từ 16px trở lên (tiêu đề), nội dung nhỏ dùng Be Vietnam Pro.

Lý do tránh "mặc định kiểu AI": nền giấy của Sổ Tín Dụng là `#F1F2EE` (giấy xám lạnh, không còn kem ấm) kết hợp navy sâu và **đồng** (không phải đất nung/terracotta); bố cục không phải tờ báo (có sidebar, thẻ chỉ số, bảng); nhận diện là chữ "S" gạch chân đồng chứ không phải biểu tượng ngân hàng chung. Rủi ro còn lại: serif + giấy ấm vẫn có thể bị coi là quen; được giảm bằng navy đặc ở khung và tím mực làm màu thứ hai.

### B. "Bảng điều khiển phân tích" (phương án thay thế, không chọn)

Nền lạnh trắng xám `#F3F5F7`, Be Vietnam Pro cho chữ và IBM Plex Mono cho số, nhấn teal `#0E7C86`, sidebar tối, thẻ phẳng viền mảnh, bo góc 8px, biểu đồ làm trung tâm. Ưu: hiện đại, hợp màn hình demo agent, ít rủi ro đọc. Nhược: gần các mẫu SaaS dashboard phổ biến nên kém đặc trưng, teal dễ trùng màu trạng thái thành công. Lý do không chọn: Mate chọn A vì khác biệt và hợp tính "hồ sơ có người chịu trách nhiệm". Nếu cần đổi sang B, chỉ đổi lớp token màu mục 5.1 và phông tiêu đề; cấu trúc thành phần và trang giữ nguyên.

## 4. Nguyên tắc thiết kế

1. **AI đề xuất, người quyết định.** Hai thế giới thị giác riêng (mục 3A.2) xuất hiện nhất quán ở khối đội agent, Tờ trình, Chat, nhật ký, dấu vết.
2. **Số là dữ liệu chính.** Số tiền, DSCR, LTV, thời gian đều dùng Plex Mono tabular, căn phải trong bảng, đơn vị viết bên cạnh bằng chữ nhỏ.
3. **Sổ cái đọc từ trên xuống.** Gạch kép dưới đầu bảng, dòng kẻ mảnh, tổng ở chân bảng có kẻ đậm.
4. **Một điểm nhấn.** Đồng chỉ cho: mục đang chọn, thẻ chỉ số chính, nút chốt hành động. Không dùng đồng làm màu trạng thái.
5. **Màn đầu có thứ tự đọc.** Mỗi trang có đúng một việc chính ở màn đầu (nút chốt màu đồng hoặc thẻ chỉ số chính).
6. **Mật độ có nhịp.** Khung thở 24 đến 32px giữa các khối; bên trong bảng 12px dọc. Không chia nội dung thành các thẻ giống hệt: thẻ có vai trò (chỉ số, AI, người, bảng).
7. **Không dựa vào màu.** Trạng thái có chấm + chữ, cờ có hình (hình thoi xanh/vàng, tròn đỏ), AI có nét đứt.
8. **Chuyển động có nghĩa.** Chỉ 3 loại: nút/hàng đổi nền 120ms, nút đội agent đang chạy nhấp nháy viền (1,8s), skeleton lướt. Có `prefers-reduced-motion`.
9. **Nhận diện trung tính.** Tên "Sổ Tín Dụng", logo chữ S trên nền giấy với gạch chân đồng. Bỏ hoàn toàn SHB.

## 5. Token

Nguồn chân lý: `docs/design/mockups-v2/tokens.css` (68 biến CSS). Bảng dưới là bản đọc được.

### 5.1 Màu

| Token | Giá trị | Vai trò |
| --- | --- | --- |
| `--paper` | `#F1F2EE` | nền trang |
| `--paper-2` | `#E4E7E0` | nền hover, skeleton |
| `--surface` | `#FBFBF8` | nền thẻ, ô nhập |
| `--surface-2` | `#F5F6F2` | đầu bảng, chân bảng |
| `--rule` | `#D3D7CC` | kẻ phân cách |
| `--rule-strong` | `#AEB3A1` | kẻ đậm, gạch kép |
| `--control` | `#6F7660` | viền ô nhập và nút (4,57:1 trên surface, 4,21:1 trên paper; yêu cầu ≥3:1) |
| `--ink` | `#1B2430` | chữ chính |
| `--ink-2` | `#434C5A` | chữ phụ |
| `--ink-3` | `#5E6573` | nhãn, ghi chú (5,65:1 trên surface, 5,21:1 trên paper, 4,69:1 trên paper-2) |
| `--ink-inv` | `#F1F2EE` | chữ trên nền tối |
| `--navy-900` | `#0E1F3D` | nút chính khi hover, chữ nhấn |
| `--navy-700` | `#14284B` | sidebar, nút chính, người quyết định |
| `--navy-500` | `#2A4A80` | liên kết, focus |
| `--navy-100` | `#DCE4F1` | nền nhẹ |
| `--navy-50` | `#EDF1F8` | hàng đang chọn |
| `--bronze-800` | `#5A4210` | nút chốt khi active |
| `--bronze-700` | `#7A5C22` | chữ đồng trên nền giấy; nút chốt khi hover (chữ trắng 6,21:1) |
| `--bronze-500` | `#B08A3E` | nút chốt, vạch thẻ chính, mục đang chọn |
| `--bronze-100` | `#F0E6CF` | dải demo, bước hiện tại |
| `--ai-700` | `#4F3590` | chữ và nút AI |
| `--ai-500` | `#6B4FB8` | viền nét đứt AI, đường nối agent |
| `--ai-100` | `#E9E3F6` | thẻ "AI đề xuất" |
| `--ai-50` | `#F3F0FA` | nền khối AI |
| `--ok-700` / `--ok-100` | `#1B6A3F` / `#DDEFE4` | thành công, khớp, cờ xanh |
| `--warn-700` / `--warn-100` | `#8F5400` / `#F8E8C8` | cần chú ý, cờ vàng, sắp hạn |
| `--danger-700` / `--danger-100` | `#A8281D` / `#F7DDD9` | lỗi, từ chối, cờ đỏ, quá hạn |
| `--info-700` / `--info-100` | `#1D4F91` / `#DCE7F6` | thông tin, chờ |
| `--neutral-100` | `#E2E5DC` | nháp, chưa có |

Ngữ nghĩa trạng thái hồ sơ: Nháp = trung tính; Đang xử lý (Kiểm tra, Thẩm định, Rủi ro) = info; Chờ bổ sung / sắp quá hạn = warn; Trả lại / từ chối / quá hạn = danger; Phê duyệt, hoàn tất = ok. Mức cờ: Xanh = ok (hình thoi), Vàng = warn (hình thoi), Đỏ = danger (hình tròn).

### 5.2 Chữ

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--font-display` | Newsreader 600 (tối thiểu 16px), dự phòng Times New Roman | tiêu đề trang, tiêu đề thẻ |
| `--font-body` | Be Vietnam Pro 400/500/600/700, dự phòng system-ui | chữ thường, nút, nhãn |
| `--font-num` | IBM Plex Mono 400/500, tabular | số tiền, tỉ lệ, mã hồ sơ, thời gian, chỉ số |
| `--fs-12` | 12px | cỡ nhỏ nhất của cả hệ thống: nhãn bảng, ghi chú, thẻ AI/người. Không có cỡ 11px |
| `--fs-13` | 13px | bảng, nút, nhãn form |
| `--fs-14` | 14px | chữ thân |
| `--fs-16` | 16px | tiêu đề thẻ (h3, serif) |
| `--fs-20` | 20px | tiêu đề phần (h2) |
| `--fs-26` | 26px | tiêu đề trang, chỉ số lớn |
| `--fs-34` | 34px | tên khách hàng ở Hồ sơ vay, chỉ số chính Dashboard, tiêu đề đăng nhập 40px |
| `--lh-tight/body/serif` | 1,25 / 1,5 / 1,3 | dòng cao |

Độ dài dòng chữ thân ≤ 72 ký tự (`max-width: 72ch` ở Chat và đoạn mô tả). Không dùng chữ viết hoa toàn bộ cho nhãn.

### 5.3 Khoảng cách, bo góc, đổ bóng, chuyển động

| Token | Giá trị |
| --- | --- |
| `--s1`…`--s12` | 4, 8, 12, 16, 20, 24, 32, 40, 48 (px) cho `s1,s2,s3,s4,s5,s6,s8,s10,s12` |
| `--r-sm` / `--r-md` / `--r-lg` / `--r-pill` | 3 / 6 / 10 / 999 px |
| `--sh-1` | `0 1px 0 rgba(27,36,48,.06)` thẻ |
| `--sh-2` | `0 4px 14px rgba(27,36,48,.10)` popover |
| `--sh-3` | `0 12px 32px rgba(14,31,61,.18)` drawer, toast, modal |
| `--focus` | `0 0 0 2px surface, 0 0 0 4px navy-500` |
| `--t-fast` / `--t-base` | 120ms / 200ms |
| `--ease` | `cubic-bezier(.2,.7,.2,1)` |
| `--sidebar-w` / `--topbar-h` | 216px / 52px |

### 5.4 Bố cục

Màn hình 1280×800, 1366×768, 1440×900 và 1920×1080. Chiều rộng tối đa của vùng nội dung (`.page`) theo loại trang: trang danh sách, bảng và dashboard `max-width: 1480px`; trang đọc và biểu mẫu (`.page.narrow`: Hồ sơ vay, Soạn đề xuất, Chính sách, Trạng thái) `1280px`; lề 32px. Lưới: Hồ sơ vay `minmax(0,1fr) | 360px`; hồ sơ có panel Trợ lý AI mở thành `mục lục 184px | nội dung | panel 380px`, **ẩn mục lục khi panel AI mở và màn hình < 1360px** (D5). Dưới 1100px: cột phụ xuống dưới, chỉ số 2×2.

### 5.5 Biểu tượng

Bộ nét 1,6px, 24px lưới, kích thước hiển thị 16 (trong nút/ô tìm), 18 (nav, banner). Dùng Ant Design Icons ở lớp ứng dụng nhưng chỉnh `strokeWidth` tương đương; nếu dùng bộ khác thì chọn bộ nét mảnh (Lucide, giấy phép ISC).

### 5.6 Minh họa trạng thái rỗng

SVG đơn sắc navy nét 2px: một trang sổ (viền đồng bên trái, dòng kẻ xám) kèm một biểu tượng góc phải (kính lúp cho rỗng/404, ổ khóa cho 403, dấu chấm than đỏ cho lỗi). Kích thước 132×96px, chỉ dùng token, không dùng ảnh bitmap.

### 5.7 Nhận diện

Tên sản phẩm: **Sổ Tín Dụng**. Logo: ô vuông giấy `#F1F2EE` (token `--paper`) cạnh 30px, chữ "S" Newsreader 19px màu navy, gạch chân đồng 2px. Dưới tên là mô tả "Tín dụng doanh nghiệp". Thay `frontend/public/brand/shb-*.svg` bằng `so-tin-dung-mark.svg` và `so-tin-dung-wordmark.svg`, thay chuỗi "SHB AI Assistant" ở topbar, đăng nhập, Chat, `index.html`, tiêu đề tab.

### 5.8 Kiểm tra tương phản (tính bằng công thức WCAG, ngày 2026-11-11)

Chữ thường ≥ 4,5:1, thành phần giao diện ≥ 3:1. Bảng rút gọn (đủ trong mục 10):

| Cặp | Tỉ lệ | Cặp | Tỉ lệ |
| --- | --- | --- | --- |
| ink / paper | 13,92 | ink-3 / paper-2 | 4,69 |
| ink / surface | 15,10 | ink-3 / surface | 5,65 |
| ink-2 / surface | 8,37 | ink-3 / paper | 5,21 |
| trắng / navy-700 | 14,64 | ink-inv / navy-700 | 13,02 |
| ink tối `#1B1405` / bronze-500 | 5,70 | trắng / bronze-700 (nút chốt hover) | 6,21 |
| trắng / bronze-800 (nút chốt active) | 9,45 | bronze-700 / surface | 5,99 |
| ai-700 / ai-100 | 7,48 | ai-700 / ai-50 | 8,31 |
| ok-700 / ok-100 | 5,52 | warn-700 / warn-100 | 5,05 |
| danger-700 / danger-100 | 5,46 | info-700 / info-100 | 6,51 |
| control / surface (viền, thành phần) | 4,57 | control / paper (viền, thành phần) | 4,21 |

Cặp thấp nhất của chữ là 4,69:1. Đo thật trên trang: `mockups-v2/_gen/measure.js` (bản chạy trong worktree, báo cáo ở `/tmp/ds3/report.json`) tính tỉ lệ cho mọi nút chữ đang hiển thị (cả hover/active ép sẵn ở trang Thành phần), kết quả 0 cặp dưới 4,5:1 ở 39 trang × 4 cỡ = 156 lượt (lần đo ngày 2026-11-11).

## 6. Quy cách thành phần

Tất cả trạng thái: mặc định, hover, focus (`--focus`), active, disabled (đổi sang nền paper-2, chữ ink-3, vẫn đạt 4,5:1, `cursor: not-allowed`), loading (giữ nhãn, thêm spinner 14px trước nhãn). Vùng bấm tối thiểu 36px chiều cao (nút nhỏ 30px chỉ dùng trong bảng, có khoảng đệm quanh).

| Thành phần | Quy cách |
| --- | --- |
| Nút chính | Nền navy-700, chữ trắng, cao 36, ngang 16px, bo 6; hover navy-900 |
| Nút chốt (tối đa một nút mỗi màn, chỉ ở góc phải tiêu đề, là nút chuyển bước) | Nền bronze-500, chữ `#1B1405` (5,70:1); hover bronze-700 chữ trắng (6,21:1); active bronze-800 chữ trắng (9,45:1) |
| Nút khóa kèm lý do | Nền paper-2, viền `--rule-strong`, chữ ink-3, biểu tượng ổ khóa, không giảm opacity; `aria-disabled="true"` và `aria-describedby` trỏ tới dòng lý do ngay dưới nút ("Còn 2 mục kiểm tra chưa xong"). Không dùng `disabled` thật khi cần giải thích, để vẫn focus và đọc được lý do |
| Nút AI | Nền ai-700, chữ trắng; chỉ cho hành động chạy hoặc yêu cầu đội agent |
| Nút phụ | Nền surface, viền `--control`, chữ ink |
| Nút nguy hiểm | Viền và chữ danger-700; hộp xác nhận nêu hậu quả |
| Thẻ | Nền surface, viền `--rule`, bo 6, `--sh-1`; đầu thẻ cao 52px có kẻ dưới, tiêu đề h3 serif 16px |
| Thẻ chỉ số | Nhãn 12px ink-3, giá trị Plex Mono 26px (34px ở thẻ chính), đơn vị 12px bên cạnh; thẻ chính có vạch trên 3px đồng, chỉ một thẻ mỗi trang |
| Bảng | Đầu bảng nền surface-2, chữ 12px đậm, **gạch kép 3px** `--rule-strong` bên dưới; hàng cao 12px+12px, kẻ ngang `--rule`; hover surface-2; hàng chọn navy-50 + vạch navy trái 3px; cột số căn phải, Plex Mono; chân bảng có kẻ đậm 2px |
| Badge trạng thái | Cao 22, bo pill, chấm tròn 6px + chữ 12px, màu theo mục 5.1 |
| Cờ | Hình (thoi/tròn) + chữ 12px đậm |
| Form | Nhãn trên ô, 13px; ô cao 38, viền `--control`, bo 6; focus viền navy-500 + vòng 3px; ô số căn phải Plex Mono; gợi ý 12px; lỗi viền danger + câu nói nguyên nhân và cách sửa |
| Tab | Chữ 13px, gạch dưới 3px bronze cho tab chọn, chữ navy-900 đậm; `role=tablist` |
| Phân đoạn (bộ lọc) | Viền `--control`, mục chọn nền navy-700 chữ trắng |
| Stepper | Vòng 24px: xong = navy đặc + dấu ✓, hiện tại = viền đồng + nền bronze-100 + vòng ngoài, sau = viền xám; đường nối 2px |
| Drawer | Rộng 440, nền surface, viền trái `--rule-strong`, `--sh-3`, scrim `rgba(14,31,61,.35)`, đóng bằng Esc, focus trap |
| Toast | Góc phải dưới, nền navy-900, chữ trắng, `role=status`, tự tắt 5s; lỗi giữ đến khi tắt |
| Banner | Nền màu `-100` của ngữ nghĩa, viền cùng tông, biểu tượng 18px, chữ 13px |
| Dải chế độ demo | Cao 34, nền bronze-100, chữ bronze-800 12px, trên cùng; bên phải có nút "Đang xem với vai" mở menu 8 vai (`role=menu`, vai hiện tại `aria-current`), xem `23-che-do-demo.html` |
| Skip link | `a.skip` "Bỏ qua điều hướng" là phần tử đầu tiên, chỉ hiện khi focus, trỏ `#main` (`main tabindex=-1`) |
| Quy cách a11y bắt buộc | Mỗi trang đúng 1 `h1` và 1 `main`; mỗi ô nhập có `label for`; ô lỗi có `aria-invalid` + `aria-describedby` tới câu lỗi và có tóm tắt lỗi đầu form; tab dùng `role=tablist/tab` + `aria-selected`; biểu đồ `role=img` có mô tả; cỡ chữ tối thiểu 12px |
| Khối AI | Viền nét đứt 1,5px ai-500, nền ai-50, đầu khối có biểu tượng lấp lánh + tên + thẻ "AI đề xuất" |
| Khối người quyết định | Viền liền navy-700, thanh trái 5px, nền surface, thẻ navy "Người quyết định". **Chỉ dùng cho Cấp phê duyệt (màn `12`) và Hội đồng tín dụng**; không dùng cho việc của vai khác |
| Việc của người dùng khác (HTTD, Thẩm định, Rủi ro/Tuân thủ, QHKH) | Thẻ trung tính "Việc của bạn" hoặc "Ý kiến của bạn" (`.tag-me`), viền navy mảnh 1px (`.mineb`), không nền navy. Giữ ranh giới: nút của người nằm ngoài khung AI nét đứt |
| Nút người trong sơ đồ | `hwrap()`: nút "Cấp phê duyệt" nằm **ngoài** khung AI nét đứt (nền giấy, viền navy liền), nối bằng mũi tên qua mép khung. Trong khung AI chỉ có 6 agent (`teamLine()`) |
| Thanh bên theo vai | `navHtml(role, active)`: bảng vai → mục → badge ở mục 11.4; có đường kẻ `.sep` giữa nhóm việc của vai và 3 mục chung (Tra cứu chính sách, Trò chuyện, Trợ lý AI) |
| Panel Trợ lý AI trong hồ sơ | Khối AI nét đứt rộng 380px bên phải, đầu có "Trợ lý AI" + thẻ "AI đề xuất" + nút "Đóng"; ô nhập đáy; ghi rõ "chỉ đề xuất, không quyết định". Đóng thì nút "Trợ lý AI" ở thanh bên và mục lục trở lại. Mockup `25`, `25b` |
| Radio, checkbox, select, phân trang | `.opt` (radio thẻ, `:has(input:checked)`), `.chk`, `.rad`, `.select`, `.pg`; mẫu ở `21-thanh-phan.html` |
| `<mark>` | Nền warn-100, gạch chân đồng; chỉ cho cụm từ khóa trong kết quả tìm kiếm |
| Khối đội agent | Khối AI chứa sơ đồ + kết luận + cờ cảnh báo + nút "Chạy lại đội agent"; bốn trạng thái: chưa chạy (nút Chạy đội agent), đang chạy (nút loading, thời gian đã chạy), lỗi hoặc quá giờ (agent lỗi viền danger, banner nêu nguyên nhân, nút Chạy lại), có kết quả. Xem trang `21-thanh-phan.html` |
| Sơ đồ đội agent | Tỏa nhánh thật theo code: Planner → 4 agent song song (Credit, Compliance, Operations, Document) → Validation; đường nối cong SVG nét đứt ai-500. Node nét đứt, xong nét liền, đang chạy nền ai-50, quá giờ/lỗi viền danger kèm chữ. "Người quyết định" nằm NGOÀI khối AI, nối bằng mũi tên liền navy. Một danh sách agent duy nhất cho mọi trang (mục 11.3) |
| Dòng thời gian | Đường dọc 2px; chấm 16px: người = viền navy liền, AI = viền ai-500 nét đứt, hiện tại = nền đồng; giờ Plex Mono 12px |
| Chat | Tin người dùng nền navy bo trên-trái-phải; tin trợ lý khối AI (nét đứt) kèm thẻ nguồn Plex Mono; cuối tin có câu giới hạn trách nhiệm |
| Skeleton | Thanh `--paper-2` ↔ `--surface-2` lướt 1,4s, hình dạng giống nội dung thật; kèm chữ "Đang tải…" cho trình đọc màn hình |
| Trạng thái rỗng | Minh họa mục 5.6 + tiêu đề h2 + một câu nói điều gì xảy ra + một nút hành động |

## 7. Quy cách từng trang và tiêu chí nghiệm thu

Mỗi mockup kiểm ở 4 cỡ 1280×800, 1366×768, 1440×900, 1920×1080 (ảnh `/tmp/ds3/after/<tên>-<rộng>x<cao>.png`, không commit). Tiêu chí chung cho mọi trang (kiểm bằng axe-core trong Playwright và đo bằng DevTools): (C1) 0 lỗi axe mức serious/critical; (C2) không cuộn ngang ở 1366; (C3) mọi số tiền và tỉ lệ là Plex Mono, cột số căn phải; (C4) mọi nội dung do AI sinh nằm trong khối AI có thẻ "AI đề xuất" và không có khối người quyết định nào dùng màu tím; (C5) Tab đi hết trang theo thứ tự đọc và thấy focus; (C6) không còn chuỗi "SHB".

| Trang (mockup) | Quy cách | Tiêu chí riêng, đo được |
| --- | --- | --- |
| Đăng nhập (`01-dang-nhap.html`) | Hai nửa: trái navy kẻ dòng sổ + lề đồng, câu giá trị serif 40px và chú giải hai nét (AI nét đứt, người nét liền); phải: tiêu đề, một nút "Đăng nhập bằng tài khoản nội bộ" cao 44, banner nói sẽ chuyển trang xác thực, dòng hỗ trợ. Trang Keycloak dùng theme cùng token | Nút cao ≥ 44px, chiều rộng nội dung phải ≤ 380px; giải thích chuyển hướng hiện trước khi bấm; theme Keycloak dùng cùng nền, nút, phông |
| Việc của tôi (`02`, `02b`) | Tiêu đề + 2 nút (không có nút đồng, theo D4); dải 4 chỉ số cao 64px (`.strip`); bảng có bộ lọc phân đoạn, cột Cờ, Hạn xử lý theo ngày làm việc; phân trang `.pg`; `02b` là bản Cấp phê duyệt (3 hồ sơ) | ≥ 3 hàng thấy ở màn đầu 1366×768: đo **5 hàng**; 0 nút đồng ở thân trang; mỗi vai một thanh bên (mục 11.4) |
| Hồ sơ vay (`03`, `03b`, `03c`) | Tiêu đề = tên khách hàng; stepper có bước trả lại; **kết luận + cờ cảnh báo của đội agent lên trên**, sơ đồ thu gọn một dòng (`teamLine`) và `<details>` mở sơ đồ đầy đủ; dải chỉ số; thẻ "Việc của bạn" (`.mineb`); dòng thời gian ngày làm việc | Màn đầu 1366×768 thấy trọn khối kết luận AI (script: `ai1` = đủ); đúng 1 nút đồng ở header; 03c banner lỗi ở đầu trang kèm "Chạy lại" |
| Soạn đề xuất (`04`) | 3 cột: mục lục phần (200px), form (tối đa 640px), gợi ý trợ lý (AI, 340px); lỗi ô inline nêu nguyên nhân | Độ rộng ô nhập ≤ 640px; ô lỗi có `aria-invalid` + gợi ý đỏ; có nút Lưu nháp và Gửi thẩm định cùng hàng tiêu đề |
| Đối chiếu tài liệu (`05`) | Banner nói trường đọc là AI đề xuất; trái: danh mục tài liệu + badge; giữa: bảng so Hồ sơ và Tài liệu, hàng lệch nền warn-100 + nút xác nhận; dưới: giải thích lệch (AI) | Trường lệch nổi ở hàng riêng (nền warn); giá trị lệch in đậm; nút "Xác nhận giá trị đọc từ tài liệu" và "Giữ giá trị trong hồ sơ" luôn đi cùng |
| Dashboard Tổng quan (`06`) | 4 thẻ chỉ số, thẻ chính 34px có vạch đồng; biểu đồ cột theo tuần (cột cuối màu đồng); trạng thái các lượt; bảng theo agent | Chỉ số chính ≥ 1,3 lần các thẻ khác; biểu đồ có `role=img` + mô tả; tổng = tổng các trạng thái |
| Dấu vết một ca (`07`) | Sơ đồ chạy (AI) + bảng các bước, hàng Validation nền ai-50 | Mỗi bước hiện thời điểm Plex Mono, công cụ, kết quả, thời gian giây (có 1 chữ số thập phân); có nút tải JSON |
| So sánh hiệu năng (`08`) | Hai thẻ: đội agent (khối AI) và mô hình đơn lẻ (nét đứt xám), bảng chênh lệch có màu và dấu + / −; một câu kết luận trung thực | Chênh lệch dương xấu tô danger (thời gian, chi phí), dương tốt tô ok; có câu nêu cả ưu và nhược |
| Chat (`09`) | Cột lịch sử 260px; khung chat: tin người navy, tin trợ lý khối AI có thẻ nguồn; ô nhập cố định đáy | Mỗi tin trợ lý có thẻ "AI đề xuất"; khi thiếu dữ liệu nói rõ chưa có; ô nhập cao 38 |
| Nhật ký kiểm toán (`10`) | Bộ lọc một hàng; bảng chỉ đọc, cột Nguồn phân biệt "AI đề xuất" và "Người"; chân bảng có số dòng và trang | Cột thời điểm Plex Mono; không có nút sửa/xóa; lọc 4 trường trong một hàng ở 1366 |
| Trạng thái (`11`) | Rỗng, 403, 404, lỗi, đang tải, toast | Mỗi trạng thái có minh họa + tiêu đề + 1 câu + 1 hành động; lỗi nói dữ liệu không mất |
| Mockup bổ sung `12` đến `26` | Xem mục 11.1 | Đạt C1 đến C6 |

## 8. Văn phong UX (skill ux-copy)

1. **Nút bắt đầu bằng động từ và nêu kết quả:** "Sửa đề xuất", "Gửi thẩm định", "Chạy đội agent"; không dùng "OK", "Submit".
2. **AI nói rõ vai trò:** luôn dùng "AI đề xuất", "chưa xác nhận"; không viết "AI quyết định" hay "AI phê duyệt". Câu mẫu: "AI chỉ đề xuất, không tự phê duyệt".
3. **Lỗi = nguyên nhân + cách xử lý:** "Kỳ hạn phải từ 1 đến 36 tháng." "Không tải được danh sách hồ sơ. Dữ liệu của bạn không bị mất. Thử tải lại."
4. **Rỗng = chuyện gì + làm gì:** "Chưa có hồ sơ nào. Khi bạn tạo đề xuất vay, hồ sơ sẽ xuất hiện ở đây."
5. **Xác nhận nêu hậu quả:** "Xác nhận trả về QHKH?" (câu mô tả nêu hồ sơ, người nhận và hậu quả) / nút "Trả lại hồ sơ", "Giữ nguyên".
6. **Đang tải nói thời gian:** "Đã mất 00:12. Thường mất khoảng 15 giây. Bạn có thể rời trang."
7. **Số liệu:** dấu chấm ngăn hàng nghìn, dấu phẩy thập phân, kèm đơn vị "đồng", "tỷ đồng", "tháng"; ngày `dd/MM/yyyy`; giờ 24h.
8. **Ngôi và giọng:** xưng "bạn", ngắn, chính xác, không dùng ngôn ngữ marketing, không dùng dấu chấm than.
9. **Thuật ngữ nhất quán:** "Hồ sơ vay", "Đề xuất", "Đội agent", "Dấu vết"; "Người quyết định" chỉ cho Cấp phê duyệt và Hội đồng. **Tên vai theo code (`UI_ROLE_LABEL`)**: Chuyên viên QHKH (viết tắt QHKH), Hỗ trợ tín dụng, Chuyên viên Thẩm định, Quản lý rủi ro/Tuân thủ, Cấp phê duyệt, Kiểm toán nội bộ; không dùng "Giám đốc" hay "cán bộ tín dụng" (không có trong code). Bước viết "Bước x trên 5". Thời gian chạy viết bằng giây ("15,4 giây"), không viết ms. Một lần chạy của đội agent gọi là "lượt chạy", không gọi "ca"; thời gian một agent là của lượt gần nhất, số trung vị 12 tuần ghi riêng; không trộn "case", "proposal" khi tiếng Việt đã đủ.

## 9. Kế hoạch áp vào code

Thứ tự bắt buộc, mỗi bước một nhánh và có kiểm tra đo được:

1. **Token và theme Ant Design** (`frontend/src/theme`, `frontend/src/styles`). Tạo `tokens.css` từ mục 5; `ConfigProvider theme` map: `colorPrimary=#14284B`, `colorInfo=#1D4F91`, `colorSuccess=#1B6A3F`, `colorWarning=#8F5400`, `colorError=#A8281D`, `colorBgLayout=#F1F2EE`, `colorBgContainer=#FBFBF8`, `colorText=#1B2430`, `colorTextSecondary=#434C5A`, `colorBorder=#6F7660` (control), `colorBorderSecondary=#D3D7CC`, `borderRadius=6`, `fontFamily=Be Vietnam Pro…`, `fontSize=14`; component token cho Table (`headerBg=#F5F6F2`), Button, Tabs (`inkBarColor=#B08A3E`). Nạp phông từ Google Fonts (Newsreader 500/600, Be Vietnam Pro 400–700, IBM Plex Mono 400/500, subset vietnamese) hoặc tự lưu bản `woff2` (giấy phép OFL). **Nghiệm thu:** `npm run typecheck && npm run test` pass; `/foundation` hiện đủ token; axe 0 serious.
2. **Khung ứng dụng và đăng nhập** (`app/`, `components/`, `LoginPage`, theme Keycloak): sidebar navy, topbar, dải demo, logo trung tính, thay `SHB`. **Nghiệm thu:** `grep -ri shb frontend/src frontend/public frontend/index.html` rỗng; đăng nhập e2e pass; C1–C6.
3. **Thành phần dùng chung**: thẻ chỉ số, khối AI, khối người quyết định, badge, cờ, bảng sổ cái (`.tbl` gạch kép), sơ đồ đội agent, dòng thời gian, trạng thái rỗng. **Nghiệm thu:** từng thành phần có story/trang `/foundation`, snapshot test.
4. **Từng trang theo thứ tự ưu tiên demo:** Việc của tôi → Hồ sơ vay → Soạn đề xuất → Đối chiếu → Dashboard (3 tab) → Chat → Nhật ký → Chính sách → Khách hàng → trạng thái 403/404/lỗi/rỗng. Mỗi trang đạt tiêu chí mục 7 và `npx playwright test` của trang đó pass, giữ nguyên `data-testid` và luồng nghiệp vụ.
5. **Rà cuối**: axe toàn bộ, chụp lại 1366/1920 so với mockup, đo tương phản các cặp mục 5.8.

Rủi ro: Ant Design Table không có gạch kép sẵn, cần ghi đè CSS module cho `.ant-table-thead > tr > th`; Plex Mono rộng hơn chữ thường nên cột số cần rộng tối thiểu 140px cho số tiền 14 chữ số.

## 10. Bảng tự chấm

### 10.1 design-critique (tự soát, không phải điểm chấm; lần chấm độc lập ở `cham-diem-v2-lan-2.md`)

| Trục | Điểm /5 | Nhận xét | Việc đã sửa trong lúc làm |
| --- | --- | --- | --- |
| Ấn tượng đầu | 4 | Đăng nhập có câu giá trị và lề đồng, nhận ra ngay hai thế giới AI/người ở chú giải; còn thiếu hình minh họa sản phẩm | Nới độ rộng tiêu đề để không xuống dòng từng chữ |
| Phân cấp | 4 | Hồ sơ vay và Dashboard có thẻ chính, màn đầu có thứ tự; Hồ sơ vay 1366 khối đội agent hơi chật | Giảm padding node và độ rộng đường nối |
| Nhất quán | 5 | Một file token, một bộ thành phần cho 12 trang | Thêm kích thước biểu tượng bị thiếu ở thẻ AI và toast |
| Nhịp khoảng cách | 4 | Lưới 4px, 24–32px giữa khối | Đối chiếu bỏ cột thứ ba (bảng bị bóp) |
| Chữ | 5 | Phông Việt đủ dấu ở mọi cỡ, số thẳng cột | Quy tắc serif tối thiểu 16px |
| Màu | 4 | AI tách khỏi người cả bằng nét viền và nhãn; còn phụ thuộc vào người nhìn phân biệt tím và navy ở mức đậm nhạt | Thêm nhãn chữ trong mọi khối |
| Trạng thái | 4 | Có rỗng, 403, 404, lỗi, tải, toast; chưa có mockup trạng thái drawer | |

Còn lại: chưa có mockup cho đề xuất ngoại lệ, phiếu Hội đồng tín dụng ("Chờ phiên Hội đồng"), `/foundation`, bảng thông báo và vai Quản trị hệ thống; việc "nhìn" phân biệt tím/navy chưa được kiểm với người mù màu thật.

### 10.2 accessibility-review (WCAG 2.1 AA)

| Tiêu chí | Kết quả | Bằng chứng |
| --- | --- | --- |
| 1.4.3 Tương phản chữ | Đạt (đo lại bằng script ở 27 trang × 4 cỡ, 0 cặp dưới 4,5:1) | Nhỏ nhất trong bảng 5.8 là ink-3 / paper-2 = 4,69:1. Hai lỗi đã sửa: nhãn "Người quyết định" trong sơ đồ (2,50:1 → 13,02:1) và nút chốt hover (4,08:1 → 6,21:1). Câu "mọi cặp ≥ 4,86" ở bản trước sai và đã bỏ. |
| 1.4.11 Tương phản thành phần | Đạt sau sửa | Viền ô nhập ban đầu chỉ 2,04:1 → đổi `--control #6F7660`: 4,57:1 trên surface, 4,21:1 trên paper (đều ≥ 3:1) |
| 1.4.1 Không chỉ dùng màu | Đạt | Badge có chấm + chữ, cờ có hình khác nhau, AI có nét đứt + nhãn chữ |
| 2.4.7 Focus nhìn thấy | Đạt (thiết kế) | `--focus` 2px + 2px, tương phản 8,57:1; cần axe xác nhận khi áp code |
| 2.5.5 Vùng bấm | Đạt có điều kiện | Nút chuẩn 36px; nút nhỏ 30px chỉ trong bảng; mục tiêu thực 44px không đạt ở nút nhỏ (ghi nhận, AA không bắt buộc) |
| 1.3.1 Cấu trúc | Đạt | `nav aria-label`, `role=tablist`, `aria-current`, `aria-invalid`, `role=img` cho biểu đồ, `role=status` cho toast |
| 2.3 Chuyển động | Đạt | `prefers-reduced-motion` tắt mọi animation |
| Tiếng Việt | Đạt | `lang="vi"`, phông có subset vietnamese, kiểm ảnh `/tmp/ds1/vn.png` |

Chưa kiểm bằng trình đọc màn hình và axe-core thật (mockup tĩnh); đưa vào tiêu chí C1 khi áp code.

## 11. Bàn giao cho React và Ant Design (v2.1)

### 11.1 Danh sách mockup (39 tệp trong `mockups-v2/`, mỗi tệp một trạng thái)

`01` Đăng nhập · `02` Việc của tôi (QHKH) · `02b` Hồ sơ chờ phê duyệt (Cấp phê duyệt) · `03`/`03b`/`03c` Hồ sơ vay (có kết quả, đang chạy, lỗi chạy) · `04` Soạn đề xuất, bước 2 · `05` Đối chiếu một tài liệu · `06`/`07`/`08` Đội agent (Tổng quan, Dấu vết, So sánh; vai Quản lý rủi ro/Tuân thủ) · `09`/`09b`/`09c` Trợ lý (có trả lời, đang trả lời, lỗi) · `10` Nhật ký · `11` Trạng thái trang (rỗng sau lọc, 404, lỗi, tải, toast) · `11b` Không có quyền (403, khiên, 1 nút) · `12` Cấp phê duyệt, chưa chọn quyết định · `12b` đã chọn "Phê duyệt có điều kiện" + hộp xác nhận · `12c` đã chọn "Trả lại" (đích Thẩm định hoặc QHKH) + hộp xác nhận · `13` Hỗ trợ tín dụng · `14` Thẩm định · `15` Ý kiến Rủi ro và Tuân thủ · `16` Đề xuất hành động và điều kiện trước giải ngân · `17` Tạo đề xuất vay bước 2 · `17b` bước 5 Rà soát và gửi · `18` Khách hàng · `19` Đối chiếu danh sách · `20` Tra cứu chính sách có kết quả · `20b` không có kết quả · `21` Thành phần (thêm thẻ nhãn, radio, checkbox, select, ô tìm, phân trang) · `22`/`22b`/`22c` Keycloak đăng nhập, lỗi, hết phiên · `23` Chế độ demo đổi tài khoản · `24` Thanh bên theo vai · `25`/`25b` Hồ sơ có panel Trợ lý AI mở/đóng · `26` Chi tiết khách hàng. Sinh bằng `_gen/build.sh` (chạy `p1.js` … `p6.js` rồi `check.js`: ngày làm việc, mã hồ sơ thuộc bảng demo, badge, 15,4 giây) từ `_gen/lib.js`.

### 11.2 Thành phần → Ant Design → component token → tệp thay trong `frontend/src`

| Thành phần thiết kế | Ant Design / tự dựng | Component token (ConfigProvider) | Tệp sẽ thay |
| --- | --- | --- | --- |
| Token màu, chữ, khoảng cách | `ConfigProvider theme.token` + CSS variable | `colorPrimary` `#14284B`, `colorBgLayout` `#F1F2EE`, `colorBorder` `#6F7660`, `fontSize` 14 | `theme/tokens.ts`, `theme/index.ts`, `styles/global.css` |
| Nút (chính, phụ, chốt, nguy hiểm) | `Button`; nút chốt tự dựng biến thể `gold` | `Button.colorPrimary`, `defaultBorderColor`, `controlHeight` 36 | `theme/componentOverrides.ts`, `components/common` |
| Nút khóa kèm lý do | Tự dựng quanh `Button` (không dùng `disabled`, dùng `aria-disabled` + `aria-describedby`) | không có, dùng class `locked` | `features/loan-detail/ActionsPanel.tsx`, `features/proposal/ProposalPage.tsx` |
| Ô nhập, chọn, vùng văn bản | `Input`, `Select`, `Input.TextArea`, `Form.Item` | `Input.activeBorderColor` `#2A4A80`, `controlHeight` 38 | `features/proposal/*Section.tsx`, `features/audit/AuditLogPage.tsx`, `pages/ChatPage.tsx` |
| Tab | `Tabs` (hoặc `Menu` mode ngang cho điều hướng route) | `Tabs.inkBarColor` `#B08A3E`, `itemSelectedColor` `#0E1F3D` | `pages/AgentDashboardPage.tsx` |
| Bảng sổ cái | `Table` + ghi đè `.ant-table-thead > tr > th` (gạch kép) | `Table.headerBg` `#F5F6F2`, `borderColor` `#D3D7CC` | `features/my-work/QueueTable.tsx`, `components/tables` |
| Drawer, Modal xác nhận | `Drawer` (440), `Modal.confirm` | `Modal.borderRadiusLG` 10 | `features/loan-detail/ActionsPanel.tsx`, `features/reconciliation/ConflictPanel.tsx` |
| Khối AI, khối người quyết định, thẻ nhãn | Tự dựng (`AiBlock`, `HumanBlock`) | class `aib`, `hmb` trong `app.css` | `features/ai-panel/AiPanel.tsx`, `features/loan-detail/LoanApprovalCard` (nếu có) hoặc `ActionsPanel.tsx` |
| Khối và sơ đồ đội agent | Tự dựng (SVG tỏa nhánh) | class `flow`, `fn`, `hnode` | `features/loan-detail/AgentTeamPanel.tsx`, `features/dashboard/agentTrace.ts` |
| Đề xuất hành động, điều kiện giải ngân | `List` + `Button`, `Tag` | `Tag` màu theo trạng thái | `features/agent-actions/ActionProposals.tsx`, `features/loan-detail/PreDisbursementPanel.tsx` |
| Dấu vết (bước mở rộng) | `Collapse` hoặc `<details>` | không có | `pages/AgentDashboardPage.tsx`, `features/dashboard/components` |
| Stepper hồ sơ và wizard | `Steps` | `Steps.colorPrimary` | `features/loan-detail/LoanHeader.tsx`, `features/proposal/NewProposalPage.tsx` |
| Thẻ chỉ số, biểu đồ cột | `Statistic` + SVG; chart theo `theme/chartTheme.ts` | `Statistic.contentFontSize` 26 | `features/my-work/Hero.tsx`, `components/charts` |
| Trạng thái rỗng, 403, 404, lỗi | `Result`/`Empty` hoặc tự dựng | không có | `features/shell/NoAccess.tsx`, `pages/NotFoundPage.tsx` |
| Dải demo, menu đổi vai | Tự dựng + `Dropdown` | không có | `features/shell/DemoSwitcher.tsx`, `AppLayout.tsx` |
| Khung (sidebar, topbar, skip link) | `Layout`, `Menu` | `Menu.darkItemBg` `#14284B` | `features/shell/Rail.tsx`, `Topbar.tsx`, `styles/accessibility.css` |
| Đăng nhập, theme Keycloak | Trang tự dựng; theme Keycloak (FTL + `app.css`) | không có | `pages/LoginPage.tsx`, `auth/keycloak.ts` (+ thư mục theme của hạ tầng) |
| Toast, banner | `message`/`notification`, `Alert` | `Alert.colorInfoBg` `#DCE7F6` | `components/common` |

Ghi chú: tên tệp lấy từ `frontend/src` hiện có; nơi ghi "nếu có" là tệp chưa xác nhận, dev kiểm tra khi làm.

### 11.3 Danh sách agent dùng chung (khớp code)

Planner (lập kế hoạch) → Credit, Compliance, Operations, Document (song song) → Validation (phản biện chéo). Mọi trang lấy từ cùng một mảng `AGENTS` trong `_gen/lib.js`; nhãn agent ở 03, 03b, 03c, 06, 07, 12, 14, 21 giống nhau. Phép tính kiểm tra tự động trong generator (ném lỗi nếu lệch): 06 cộng trạng thái = 762 = cộng 12 tuần, lỗi theo agent cộng = 14; 07 gọi công cụ 17, thời gian cộng 34,5 giây, thời gian thực 15,4 = 2,1 + 9,5 + 3,8.

### 11.4 Điều hướng theo vai (`rules.md` C) và panel AI

| Vai | Mục đầu (badge) | Mục khác theo vai | Mockup |
| --- | --- | --- | --- |
| Chuyên viên QHKH | Việc của tôi (**4**) | Tạo đề xuất vay, Khách hàng SME | `02` |
| Hỗ trợ tín dụng | Việc của tôi (**3**) | Đối chiếu tài liệu, Khách hàng SME | `13`, `19` |
| Chuyên viên Thẩm định | Việc của tôi (**3**) | Đối chiếu tài liệu, Khách hàng SME | `14` |
| Quản lý rủi ro/Tuân thủ | Hồ sơ chờ ý kiến (**2**) | Khách hàng SME | `15`, `06`–`08` |
| Cấp phê duyệt | Hồ sơ chờ phê duyệt (**3**) | Phiên Hội đồng tín dụng | `02b`, `12` |
| Kiểm toán nội bộ | Hồ sơ vay – chỉ đọc (không badge) | Nhật ký kiểm toán, Phiên Hội đồng – chỉ đọc | `10`, `24` |

Cả 6 vai có thêm 3 mục chung sau đường kẻ: Tra cứu chính sách, Trò chuyện, Trợ lý AI; QHKH và vai có mục "Bảng điều khiển agent" theo quyền. Tạo đề xuất vay chỉ có ở QHKH. Số badge ở thanh bên bằng số hàng của danh sách tương ứng (`02`: 4 việc cần QHKH; `02b`: 3 hồ sơ). Quản trị hệ thống không có mockup riêng (ngoài phạm vi, ghi ở báo cáo bàn giao).

**Panel Trợ lý AI (`25`, `25b`).** Khớp `rules.md` D5: panel mở thì mục lục trái ẩn khi màn hình < 1360px (đo 1280 và 1366: mục lục ẩn; 1440: hiện). Panel rộng 380px, nội dung `minmax(0,1fr)` không tràn ngang ở cả 4 cỡ.

## 12. Đối chiếu `rules.md` D3, D4, D5 và quyết định mở

| Điều | Nội dung `rules.md` mục D | Thiết kế đã áp | Chỗ |
| --- | --- | --- | --- |
| D3 (mục 3) | Không có quyền: h1 trung tính, không tên khách hàng, một biểu tượng khiên, đúng 1 nút có biểu tượng | Minh họa khiên, tiêu đề "Bạn chưa có quyền xem trang này", 1 nút "Về Việc của tôi", không nêu khách hàng | `11-trang-thai.html` |
| D4 (mục 4) | Nút chính chuyển bước ở header phải, tối đa 1; trong nội dung chỉ lặp dạng dòng khóa hoặc link; trang chủ không có nút chuyển bước; wizard "Tiếp: <bước sau>"; bước 5 "Gửi Hỗ trợ tín dụng" khóa kèm lý do; HTTD "Chuyển Thẩm định" khóa kèm lý do | Đúng một nút đồng ở góc phải tiêu đề (đo: `.btn.gold` ≤ 1 trên mỗi trang, trừ trang Thành phần `21` là mẫu); `12` khóa "Ghi quyết định" kèm lý do tới khi chọn; `04`/`17` "Tiếp: Tài chính" khóa kèm lý do; `17b` "Gửi Hỗ trợ tín dụng" khóa; 02 không có nút đồng | `02`, `03`, `04`, `12` đến `17b` |
| D5 (mục 5) | Kiểm bố cục ở 1280×800 và 1440×900, **panel AI mở và đóng**; ẩn mục lục khi panel AI mở và viewport < 1360px | Mọi trang đo ở 1280, 1366, 1440, 1920; panel AI mở/đóng ở `25`/`25b`, mục lục ẩn khi mở < 1360px (mục 11.4) | `/tmp/ds3/report.json` |
| Mục 6 (kèm) | Chữ dòng khóa dùng `--text-3` | Dòng lý do khóa dùng `--ink-3` (5,65:1 trên surface) | `.lockwhy` trong `app.css` |

**Quyết định mở (Mate giao: theo `rules.md`, ghi rõ).** Báo cáo chấm việc 2 của trang 02 yêu cầu "giữ đồng ở khối trên" (khối Việc gấp có nút đồng ở thân trang). `rules.md` D4 cấm: nút chính chuyển bước chỉ ở header phải, trang chủ không có nút chuyển bước, nội dung chỉ lặp dạng khóa hoặc link. Thiết kế theo `rules.md`: ở `02` bỏ hẳn nút đồng, "Mở hồ sơ" là nút navy thường; ở 03 hộp Người quyết định dùng link. Lần chấm thứ hai không đòi lại điểm này. Phần này là cách đọc của crew theo chỉ dẫn của Mate ("theo `rules.md`, ghi rõ"), chưa có chữ của người dùng xác nhận.

## 13. Kiểm tra ở 4 cỡ màn hình

Script `_gen/measure.js` (Playwright, `file://`) mở từng tệp ở 1280×800, 1366×768, 1440×900, 1920×1080 và đo: tràn ngang (`scrollWidth − innerWidth`), tương phản mọi phần tử chữ đang hiển thị (cả nút hover/active ép sẵn), nhãn của ô nhập, tên của nút/liên kết, tab ngoài `tablist`, `h1` và `main` đúng 1, `lang=vi`, skip link tới `#main`, cỡ chữ nhỏ nhất. Từ lần này script đo thêm: vùng bấm < 24px (WCAG 2.2 2.5.8), số `.btn.gold` hiện ở màn đầu và cả trang, số hàng bảng thấy ở màn đầu, khối kết luận AI có nằm trọn màn đầu không, `role=radio` thiếu `aria-checked`, nút/khối người nằm trong khung AI. Kết quả lần chạy cuối (2026-11-11): **39 trang × 4 cỡ = 156 lượt, 0 có vấn đề**; tràn ngang 0; cặp chữ dưới 4,5:1: 0; vùng bấm < 24px: 0; cỡ chữ nhỏ nhất 12px; không nút người trong khung AI. Ảnh chụp: `/tmp/ds3/after/` (156 tệp PNG, không commit). Script không bắt được lỗi nghĩa và nghiệp vụ; phần đó kiểm bằng `_gen/check.js` và đọc đối chiếu `rules.md`.

## 14. Quy tắc hiển thị khi chưa có số thật

Không dựng số giả trên giao diện thật. Số trong mockup là mẫu và tự khớp. Khi áp code: nếu API chưa trả số, thẻ chỉ số hiện "Chưa có dữ liệu" (chữ ink-3, không có đơn vị); biểu đồ hiện trạng thái rỗng "Chưa có lượt chạy nào trong khoảng này"; trang So sánh hiện "Chưa có lượt đánh giá"; tỉ lệ chỉ hiện khi mẫu số > 0 (không chia cho 0, không hiện 0%); tổng luôn tính từ các thành phần đã nhận, không lấy riêng một trường tổng.

### 14.1 Bảng dữ liệu demo dùng chung (thế giới mockup: Thứ Ba 10/11/2026)

Mọi mockup lấy từ bảng này; `_gen/check.js` báo lỗi nếu có ngày cuối tuần, mã hồ sơ ngoài bảng, hoặc badge/tổng lệch. Hạn xử lý tính theo ngày làm việc (`rules.md` B).

| Hồ sơ | Khách hàng | Số tiền | Giai đoạn và mốc | Xuất hiện ở |
| --- | --- | --- | --- | --- |
| HSV-2026-00201 | Phúc Lâm | 15 tỷ | Cấp phê duyệt trả về QHKH 09/11 16:05; đội agent chạy lại 10/11 14:32:26–14:32:41 (15,4 giây) | `02`, `03`–`03c`, `04`, `05`, `06`, `07`, `09`–`09c`, `10`, `19`, `21`, `25`, `25b`, `26` |
| HSV-2026-00209 | An Phát | 22 tỷ | Hỗ trợ tín dụng nhận 10/11 09:10, hạn 12/11 17:00 | `13`, `19` |
| HSV-2026-00203 | Hải Đăng | 18 tỷ | Thẩm định nhận 06/11, hạn 13/11 | `14` |
| HSV-2026-00192 | Đại Nam | 60 tỷ | Rủi ro/Tuân thủ nhận 09/11, hạn 12/11 | `15` |
| HSV-2026-00194 | Sông Hậu | 24 tỷ (đề xuất 20 tỷ) | Chờ Cấp phê duyệt, hạn 11/11; DSCR 1,35, LTV 64,0% | `12`, `12b`, `12c`, `02b` |
| HSV-2026-00189 | Gỗ Tây Nguyên | 40 tỷ | Chờ Cấp phê duyệt, hạn hôm nay 10/11 | `02b` |
| HSV-2026-00186 | Nhựa An Khang | 18 tỷ | Chờ Cấp phê duyệt, hạn 12/11 | `02b` |
| HSV-2026-00171 | Hải Đăng | 9 tỷ | Phê duyệt có điều kiện 06/11 11:20:45, hạn mức 8 tỷ | `16`, `10` |
| HSV-2026-00196 | Phú Điền | 30 tỷ | Chờ bổ sung, hạn 13/11 | `02` |
| HSV-2026-00176 | Đại Thành Global | 80 tỷ | Quá hạn 1 ngày (hạn 09/11), chờ Rủi ro/Tuân thủ | `02` |
| DX-2026-00412 / DX-2026-00405 | Mekong Flex / Hưng Phát | 80 tỷ / 25 tỷ | Bản nháp lưu 06/11 / 05/11 | `02`, `17`, `17b` |

Số tự khớp giữa trang: 06 có 703+21+14+21+3 = 762 lượt (tổng 12 tuần); 07 có tổng 15,4 giây của lượt gần nhất (2,1 + 9,5 + 3,8 = đường dài nhất Planner, Document, Validation); 08 có 37/40 = 92,5% và 31/40 = 77,5% (và 18/20 = 90,0%, 14/20 = 70,0%); 06 hiện 762 lượt, 92,3%. Số "lượt gần nhất" của từng agent (03, 25) khác trung vị 12 tuần ở 06 và được ghi rõ nhãn.

## 15. Bảng "đã sửa" đối chiếu báo cáo chấm lần 2 (`cham-diem-v2-lan-2.md`)

Số đo: `_gen/measure.js` (mục 13: **156 lượt, 0 có vấn đề**, ngày 2026-11-11), `_gen/check.js` (dữ liệu demo) và số đếm bằng `grep` trên HTML sinh ra. Giám khảo khác sẽ chấm lại; bảng này không phải điểm. Báo cáo lần 1 đã đóng ở bản v2.1; không giữ lại bảng cũ vì mọi dòng của nó đã được thay bằng bảng này.

### 15.1 Mười ba việc phải sửa

| # | Việc | Đã sửa ở đâu | Số đo sau sửa |
| --- | --- | --- | --- |
| 1 | Màn Cấp phê duyệt | `_gen/p4.js` `p12()`: `12` (4 radio thật, **0 chọn sẵn**, "Ghi quyết định" khóa kèm lý do), `12b` (chọn "Phê duyệt có điều kiện", hộp "Xác nhận phê duyệt có điều kiện?" đúng lựa chọn, một nút xác nhận), `12c` (chọn "Trả lại", ô "Trả lại cho" chọn Thẩm định hoặc QHKH theo rules Q-O, hộp "Xác nhận trả về QHKH?") | `checked`: 12 = 0, 12b = 1, 12c = 1; `.btn.gold` = 1 mỗi trang; 3 trang × 4 cỡ: 0 vấn đề |
| 2 | "Người quyết định" dùng quá rộng | `lib.js` `tagMe()` và `.tag-me`/`.mineb`; `03`, `03b`, `03c`, `13`, `14`, `15`, `16` | `.tag-hm` ở 03, 13, 14, 15, 16 = 0; `tag-me`: 03 = 1, 13 = 1, 14 = 1, 15 = 2; "Người quyết định" chỉ còn ở `01` (chú giải), `02b`, `12*`, `21`, `23`, `24` |
| 3 | Nút người trong khung AI nét đứt | `lib.js` `team()` chỉ còn 6 agent; `hwrap()`/`humanOut()` đưa nút người ra ngoài (`.hwrap`, `.hdown`); `teamLine()` thu gọn | script `hmIn` (`.aib .tag-hm` + `.hnode` trong khung AI) = 0 ở 156 lượt |
| 4 | Câu chuyện demo xuyên trang | Mục 14.1 + `p1.js`…`p6.js` viết lại theo một bảng; `_gen/check.js` | `check.js`: 0 ngày cuối tuần, 0 mã ngoài bảng, badge 4 và 3 khớp, "15,4 giây" ở 03 và 07; 05 đọc báo cáo tài chính ngày 28/10 khớp dòng thời gian 03; 06 703+21+14+21+3 = 762 |
| 5 | Thanh bên và badge theo vai | `lib.js` `navHtml()`, `NAVR`, `BADGE`; `24-thanh-ben-theo-vai.html`; `02b`; mục 11.4 | 6 vai, badge 4/3/3/2/3/không; "Tạo đề xuất vay" chỉ ở QHKH; 24 gồm bảng cả 6 vai |
| 6 | Văn phong và thuật ngữ vai | mục 8 (điều 5 và 9); `p1`…`p6` | `check.js` chặn "Giám đốc", "cán bộ tín dụng", "ms", "Hỏi ca": 0 chỗ; "Bước x trên 5" ở 04 và 17/17b; thời gian bằng giây |
| 7 | 02 và 03 màn đầu 1366 | `02`: `.strip` cao 64px; `03`: kết luận + cờ lên trên, `<details>` sơ đồ | 02 ở 1366×768: **5 hàng thấy** (tiêu chí ≥ 3); 03: kết luận AI trọn màn đầu (`ai1` = đủ ở 1280, 1366, 1440, 1920) |
| 8 | 09 và 20 nhiều trạng thái | `09`/`09b`/`09c`, `20`/`20b` tách tệp; `11` bỏ 403 sang `11b` | mỗi tệp một trạng thái; `11b` có khiên (không dấu tích), 1 nút |
| 9 | Ngữ nghĩa màu phụ | `05`, `06`, `07`, `08`, `11b`, `20`, `app.css` (`mark`, `.bars .last`) | thẻ AI trên số đo 06/07: 0; 08 khối "Nhận xét" kiểu info; cột cuối 06 màu navy (không đồng); `mark` nền warn-100 + gạch chân |
| 10 | Bàn giao | mục 5.4 (max-width), 5.7 (`#F1F2EE`), 6, 11.1, 11.4, 12 (D5 đủ), `21` (radio, checkbox, select, phân trang, tìm kiếm) | Bảng thành phần mục 6 thêm 6 dòng; `21` thêm mục thẻ nhãn/badge, form và phân trang |
| 11 | Ô tìm cao 22px | `app.css` `.search input{height:32px}` | script vùng bấm: 0 phần tử < 24px ở 156 lượt |
| 12 | 22b | `p5.js`: banner chung, **cả hai ô** viền lỗi, `aria-describedby` tới `#kc-err` | `invalid` = 0; không còn ô nào tô riêng |
| 13 | Trang còn thiếu | `24`, `25`, `25b`, `26`, `17b`, `02b` | 39 tệp; xem 15.2 |

### 15.2 Từng trang

| Trang | Đã sửa ở đâu | Số đo sau sửa |
| --- | --- | --- |
| 01 | chú giải: dải 3 bước + mẫu thẻ AI / Người quyết định | `main` = 1; 0 vấn đề |
| 02, 02b | 7 hồ sơ theo bảng 14.1, `.strip`, bộ lọc, `.pg`, hạn theo ngày làm việc | 02: 5 hàng thấy ở 1366×768; 0 nút đồng; 02b: 3 hồ sơ, badge 3 |
| 03, 03b, 03c | kết luận lên trên, `stepBack()`, thẻ "Việc của bạn", 03c banner lỗi đầu trang | 1 nút đồng; `ai1` = đủ; 0 vấn đề |
| 04, 17, 17b | "Bước 2 trên 5", `toc` có ✓/●/○, nút "Tiếp: …" khóa kèm lý do; 17b là bước 5 + checkbox | 17b "Gửi Hỗ trợ tín dụng" khóa; 0 vấn đề |
| 05 | role QHKH, mục "Việc của tôi" active, cột AI đọc có thẻ AI | tải 28/10; vùng bấm 0 lỗi; mục "Việc của tôi" active (QHKH không có "Đối chiếu tài liệu") |
| 06, 07, 08 | role Quản lý rủi ro/Tuân thủ; bỏ node người và thẻ AI ở sơ đồ vận hành; giây | 762 = 762; 15,4 giây; 08: 37/40 |
| 09, 09b, 09c | tách 3 trạng thái | `scrollHeight` = `innerHeight`: 800/800 ở 1280, 768/768 ở 1366, cả 3 tệp |
| 10 | dữ liệu 00201 và 00171, nhãn "Người" trung tính, `.pg` | 0 vấn đề |
| 11, 11b | 403 tách riêng; "rỗng sau lọc" là nhật ký lọc | `11b`: 1 khiên, 1 nút, h1 trung tính |
| 12, 12b, 12c | xem việc 1 | xem việc 1 |
| 13, 14, 15, 16 | `mineCard`, h1 = tên khách, meta có Nhận ngày / Hạn xử lý | 13: nút "Mở" 18×18 → 28×28; 0 vấn đề |
| 18, 19, 26 | 18: 7 khách; 19: role HTTD; 26: chi tiết Phúc Lâm (00201, 00158, 00121) | 0 vấn đề |
| 20, 20b | tách có và không có kết quả; `mark` | 0 vấn đề |
| 21 | thêm thẻ nhãn, radio, checkbox, select, tìm, phân trang, `hwrap` | tràn ngang 11px ở 1440 đã sửa → 0 |
| 22, 22b, 22c | 22b xem việc 12; 22c điều kiện "bản nháp đã lưu tự động" | `invalid` = 0 |
| 23 | role Cấp phê duyệt | 0 vấn đề |
| 24, 25, 25b | thanh bên 6 vai; panel Trợ lý AI mở/đóng | 25b tràn 178px ở 1280 đã sửa (thẻ đóng `</section>`) → 0; mục lục ẩn khi panel mở < 1360px |

### 15.3 Điều khai ở báo cáo lần 2 đã sửa lại cho đúng

| Chỗ tự khai sai | Sửa |
| --- | --- |
| "Người quyết định ngoài khối AI" (§15 cũ, việc 2) | Nay đúng thật: script `hmIn` = 0 |
| "Số liệu tự mâu thuẫn đã sửa" | Nay có bảng 14.1 + `check.js` bắt ngày cuối tuần và mã lệch |
| "Một nhãn AI" | Thẻ AI không còn ở số đo 06/07; có ở mọi khối AI của 03, 05, 25 |
| Tiêu chí ≥ 3 hàng ở 02 | Đo 5 hàng |
| §12 D5 tóm thiếu | Đã chép đủ (panel AI mở/đóng, ẩn mục lục < 1360px) |
| §5.7 logo `#F5F4EF` | `#F1F2EE` |
| "0 vấn đề ở 108 lượt" | 156 lượt, thêm phép đo vùng bấm, nút đồng, hàng, `hmIn`; lỗi nghĩa vẫn cần người đọc |
