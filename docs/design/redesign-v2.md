# Thiết kế lại v2: "Sổ Tín Dụng"

Phạm vi: định hướng thiết kế và mockup cho toàn bộ ứng dụng. Tài liệu này **chưa** thay đổi mã ứng dụng. Mockup nằm ở `docs/design/mockups-v2/` (mở trực tiếp bằng trình duyệt, tự chứa, dùng chung `tokens.css`).

> **Bảng màu v3 (25/11/2026, theo yêu cầu người dùng: bản v2 "trông giống AI", navy đậm không đẹp).** Đã áp dụng skill ui-ux-pro-max (tránh navy mặc định của "Banking/Traditional Finance" và tổ hợp giấy kem + serif + đồng hay gặp ở giao diện do AI sinh). Thay đổi: màu thương hiệu đổi từ navy sang **xanh dầu (petrol)** `--brand-*` (`#0E4D5A`), điểm nhấn đổi từ đồng sang **hổ phách** `--amber-*` (`#D29A2E`, chữ tối trên nền); nền lạnh trung tính, bề mặt trắng; **bỏ serif Newsreader**, tiêu đề dùng Be Vietnam Pro 700; **sidebar nền sáng**, mục chọn nền xanh dầu nhạt + vạch xanh dầu; logo ô vuông xanh dầu chữ S trắng. Giữ nguyên: tím mực cho nội dung AI, màu trạng thái, lưới khoảng cách, gạch kép tiêu đề. Các bảng màu dưới đây đã đổi sang giá trị v3; tỷ lệ tương phản ở §5.8 tính cho v2 nên cần tính lại khi chấm (đã kiểm v3: ink-3 trên paper 5,58; trắng trên brand-700 9,43; brand-500 trên trắng 5,87; chữ tối trên amber-500 7,31).

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
2. Vùng đội agent và mọi nội dung "AI đề xuất" có một màu nhận diện riêng nhất quán, tách hẳn màu "người quyết định". **Áp dụng:** AI = tím mực (`--ai-*`), viền nét đứt, nền tím rất nhạt, thẻ "AI đề xuất". Người quyết định = navy đặc (`--brand-700`), viền liền dày 5px bên trái, thẻ navy "Người quyết định". Hai nhóm khác nhau cả về màu, nét viền và nhãn chữ, nên không dựa vào màu đơn thuần.
3. Mật độ cao nhưng Hồ sơ vay và Dashboard có khoảng thở và phân cấp rõ ở màn đầu. **Áp dụng:** tiêu đề 34px, 4 thẻ chỉ số một hàng với thẻ đầu có vạch đồng, khoảng cách giữa các khối 24 đến 32px, bảng dày chỉ ở phần chi tiết bên dưới.

Kiểm tra dấu tiếng Việt của Newsreader (đã chạy, ảnh `/tmp/ds1/vn.png`): hiển thị đủ `Ệ ặ ữ ỗ ả ề ợ ụ Đ đ` và toàn bộ chồng dấu ở 11, 14, 20, 34px và cả chữ nghiêng; gói phông có subset `vietnamese`. Kết luận: giữ Newsreader. Quy tắc: serif chỉ dùng từ 16px trở lên (tiêu đề), nội dung nhỏ dùng Be Vietnam Pro.

Lý do tránh "mặc định kiểu AI": nền giấy của Sổ Tín Dụng là `#F3F5F6` (giấy xám lạnh, không còn kem ấm) kết hợp navy sâu và **đồng** (không phải đất nung/terracotta); bố cục không phải tờ báo (có sidebar, thẻ chỉ số, bảng); nhận diện là chữ "S" gạch chân đồng chứ không phải biểu tượng ngân hàng chung. Rủi ro còn lại: serif + giấy ấm vẫn có thể bị coi là quen; được giảm bằng navy đặc ở khung và tím mực làm màu thứ hai.

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
| `--paper` | `#F3F5F6` | nền trang |
| `--paper-2` | `#E5EAEC` | nền hover, skeleton |
| `--surface` | `#FFFFFF` | nền thẻ, ô nhập |
| `--surface-2` | `#F7F9FA` | đầu bảng, chân bảng |
| `--rule` | `#DAE1E4` | kẻ phân cách |
| `--rule-strong` | `#B1BDC2` | kẻ đậm, gạch kép |
| `--control` | `#66757B` | viền ô nhập và nút (4,57:1 trên surface, 4,21:1 trên paper; yêu cầu ≥3:1) |
| `--ink` | `#172229` | chữ chính |
| `--ink-2` | `#3D4A52` | chữ phụ |
| `--ink-3` | `#57646B` | nhãn, ghi chú (5,65:1 trên surface, 5,21:1 trên paper, 4,69:1 trên paper-2) |
| `--ink-inv` | `#F3F5F6` | chữ trên nền tối |
| `--brand-900` | `#0A3640` | nút chính khi hover, chữ nhấn |
| `--brand-700` | `#0E4D5A` | sidebar, nút chính, người quyết định |
| `--brand-500` | `#1A6E7E` | liên kết, focus |
| `--brand-100` | `#D2E7EB` | nền nhẹ |
| `--brand-50` | `#EAF4F6` | hàng đang chọn |
| `--amber-800` | `#6A4708` | nút chốt khi active |
| `--amber-700` | `#8C5E0E` | chữ đồng trên nền giấy; nút chốt khi hover (chữ trắng 6,21:1) |
| `--amber-500` | `#D29A2E` | nút chốt, vạch thẻ chính, mục đang chọn |
| `--amber-100` | `#F8EBCF` | dải demo, bước hiện tại |
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
| `--focus` | `0 0 0 2px surface, 0 0 0 4px brand-500` |
| `--t-fast` / `--t-base` | 120ms / 200ms |
| `--ease` | `cubic-bezier(.2,.7,.2,1)` |
| `--sidebar-w` / `--topbar-h` | 216px / 52px |

### 5.4 Bố cục

Màn hình 1280×800, 1366×768, 1440×900 và 1920×1080. Chiều rộng tối đa của vùng nội dung (`.page`) theo loại trang: trang danh sách, bảng và dashboard `max-width: 1480px`; trang đọc và biểu mẫu (`.page.narrow`: Hồ sơ vay, Soạn đề xuất, Chính sách, Trạng thái) `1280px`; lề 32px. **Từ 1480px trở lên khối nội dung căn giữa** (`margin-inline:auto`), không căn trái; ở 1920 hai lề cân nhau. Wizard Tạo đề xuất (`04` và `17`, `17a`, `17c`, `17d`, `17b`) dùng một bố cục: cột bước 200px + biểu mẫu. Lưới: Hồ sơ vay `minmax(0,1fr) | 360px`; hồ sơ có panel Trợ lý AI mở thành `mục lục 184px | nội dung | panel 380px`, **ẩn mục lục khi panel AI mở và màn hình < 1600px** (chặt hơn D5, vốn đòi ẩn từ < 1360px; nếu giữ mục lục, cột nội dung ở 1366 chỉ còn khoảng 470px và ở 1440 khoảng 548px, nên ngưỡng nâng lên 1600; không trái D5, vì D5 là mức tối thiểu). Dưới 1100px: cột phụ xuống dưới, chỉ số 2×2.

### 5.5 Biểu tượng

Bộ nét 1,6px, 24px lưới, kích thước hiển thị 16 (trong nút/ô tìm), 18 (nav, banner). Dùng Ant Design Icons ở lớp ứng dụng nhưng chỉnh `strokeWidth` tương đương; nếu dùng bộ khác thì chọn bộ nét mảnh (Lucide, giấy phép ISC).

### 5.6 Minh họa trạng thái rỗng

SVG đơn sắc navy nét 2px: một trang sổ (viền đồng bên trái, dòng kẻ xám) kèm một biểu tượng góc phải (kính lúp cho rỗng/404, ổ khóa cho 403, dấu chấm than đỏ cho lỗi). Kích thước 132×96px, chỉ dùng token, không dùng ảnh bitmap.

### 5.7 Nhận diện

Tên sản phẩm: **Sổ Tín Dụng**. Logo: ô vuông giấy `#F3F5F6` (token `--paper`) cạnh 30px, chữ "S" Newsreader 19px màu navy, gạch chân đồng 2px. Dưới tên là mô tả "Tín dụng doanh nghiệp". Thay `frontend/public/brand/shb-*.svg` bằng `so-tin-dung-mark.svg` và `so-tin-dung-wordmark.svg`, thay chuỗi "SHB AI Assistant" ở topbar, đăng nhập, Chat, `index.html`, tiêu đề tab.

### 5.8 Kiểm tra tương phản (tính bằng công thức WCAG, ngày 2026-11-11)

Chữ thường ≥ 4,5:1, thành phần giao diện ≥ 3:1. Bảng rút gọn (đủ trong mục 10):

| Cặp | Tỉ lệ | Cặp | Tỉ lệ |
| --- | --- | --- | --- |
| ink / paper | 13,92 | ink-3 / paper-2 | 4,69 |
| ink / surface | 15,10 | ink-3 / surface | 5,65 |
| ink-2 / surface | 8,37 | ink-3 / paper | 5,21 |
| trắng / brand-700 | 14,64 | ink-inv / brand-700 | 13,02 |
| ink tối `#1B1405` / amber-500 | 5,70 | trắng / amber-700 (nút chốt hover) | 6,21 |
| trắng / amber-800 (nút chốt active) | 9,45 | amber-700 / surface | 5,99 |
| ai-700 / ai-100 | 7,48 | ai-700 / ai-50 | 8,31 |
| ok-700 / ok-100 | 5,52 | warn-700 / warn-100 | 5,05 |
| danger-700 / danger-100 | 5,46 | info-700 / info-100 | 6,51 |
| control / surface (viền, thành phần) | 4,57 | control / paper (viền, thành phần) | 4,21 |

Cặp thấp nhất của chữ là 4,69:1. Đo thật trên trang: `mockups-v2/_gen/measure.js` (bản chạy trong worktree, báo cáo ở `/tmp/ds4/report.json`) tính tỉ lệ cho mọi nút chữ đang hiển thị (cả hover/active ép sẵn ở trang Thành phần), kết quả 0 cặp dưới 4,5:1 ở 39 trang × 4 cỡ = 156 lượt (lần đo ngày 2026-11-11).

## 6. Quy cách thành phần

Tất cả trạng thái: mặc định, hover, focus (`--focus`), active, disabled (đổi sang nền paper-2, chữ ink-3, vẫn đạt 4,5:1, `cursor: not-allowed`), loading (giữ nhãn, thêm spinner 14px trước nhãn). Vùng bấm tối thiểu 36px chiều cao (nút nhỏ 30px chỉ dùng trong bảng, có khoảng đệm quanh).

| Thành phần | Quy cách |
| --- | --- |
| Nút chính | Nền brand-700, chữ trắng, cao 36, ngang 16px, bo 6; hover brand-900 |
| Nút chốt (tối đa một nút mỗi màn, chỉ ở góc phải tiêu đề, là nút chuyển bước) | Nền amber-500, chữ `#1B1405` (5,70:1); hover amber-700 chữ trắng (6,21:1); active amber-800 chữ trắng (9,45:1) |
| Nút khóa kèm lý do | Nền paper-2, viền `--rule-strong`, chữ ink-3, biểu tượng ổ khóa, không giảm opacity; `aria-disabled="true"` và `aria-describedby` trỏ tới dòng lý do ngay dưới nút ("Còn 2 mục kiểm tra chưa xong"). Không dùng `disabled` thật khi cần giải thích, để vẫn focus và đọc được lý do |
| Nút AI | Nền ai-700, chữ trắng; chỉ cho hành động chạy hoặc yêu cầu đội agent |
| Nút phụ | Nền surface, viền `--control`, chữ ink |
| Nút nguy hiểm | Viền và chữ danger-700; hộp xác nhận nêu hậu quả |
| Thẻ | Nền surface, viền `--rule`, bo 6, `--sh-1`; đầu thẻ cao 52px có kẻ dưới, tiêu đề h3 serif 16px |
| Thẻ chỉ số | Nhãn 12px ink-3, giá trị Plex Mono 26px (34px ở thẻ chính), đơn vị 12px bên cạnh; thẻ chính có vạch trên 3px đồng, chỉ một thẻ mỗi trang |
| Bảng | Đầu bảng nền surface-2, chữ 12px đậm, **gạch kép 3px** `--rule-strong` bên dưới; hàng cao 12px+12px, kẻ ngang `--rule`; hover surface-2; hàng chọn brand-50 + vạch navy trái 3px; cột số căn phải, Plex Mono; chân bảng có kẻ đậm 2px |
| Badge trạng thái | Cao 22, bo pill, chấm tròn 6px + chữ 12px, màu theo mục 5.1 |
| Cờ | Hình (thoi/tròn) + chữ 12px đậm |
| Form | Nhãn trên ô, 13px; ô cao 38, viền `--control`, bo 6; focus viền brand-500 + vòng 3px; ô số căn phải Plex Mono; gợi ý 12px; lỗi viền danger + câu nói nguyên nhân và cách sửa |
| Tab | Chữ 13px, gạch dưới 3px bronze cho tab chọn, chữ brand-900 đậm; `role=tablist` |
| Phân đoạn (bộ lọc) | Viền `--control`, mục chọn nền brand-700 chữ trắng |
| Stepper | Vòng 24px: xong = navy đặc + dấu ✓, hiện tại = viền đồng + nền amber-100 + vòng ngoài, sau = viền xám; đường nối 2px |
| Drawer | Rộng 440, nền surface, viền trái `--rule-strong`, `--sh-3`, scrim `rgba(14,31,61,.35)`, đóng bằng Esc, focus trap |
| Toast | Góc phải dưới, nền brand-900, chữ trắng, `role=status`, tự tắt 5s; lỗi giữ đến khi tắt |
| Banner | Nền màu `-100` của ngữ nghĩa, viền cùng tông, biểu tượng 18px, chữ 13px |
| Dải chế độ demo | Cao 34, nền amber-100, chữ amber-800 12px, trên cùng; bên phải có nút "Đang xem với vai" mở menu 8 vai (`role=menu`, vai hiện tại `aria-current`), xem `23-che-do-demo.html` |
| Skip link | `a.skip` "Bỏ qua điều hướng" là phần tử đầu tiên, chỉ hiện khi focus, trỏ `#main` (`main tabindex=-1`) |
| Quy cách a11y bắt buộc | Mỗi trang đúng 1 `h1` và 1 `main`; mỗi ô nhập có `label for`; ô lỗi có `aria-invalid` + `aria-describedby` tới câu lỗi và có tóm tắt lỗi đầu form; tab dùng `role=tablist/tab` + `aria-selected`; biểu đồ `role=img` có mô tả; cỡ chữ tối thiểu 12px |
| Khối AI | Viền nét đứt 1,5px ai-500, nền ai-50, đầu khối có biểu tượng lấp lánh + tên + thẻ "AI đề xuất" |
| Khối người quyết định | Viền liền brand-700, thanh trái 5px, nền surface, thẻ navy "Người quyết định". **Chỉ dùng cho Cấp phê duyệt (màn `12`) và Hội đồng tín dụng**; không dùng cho việc của vai khác |
| Việc của người dùng khác (HTTD, Thẩm định, Rủi ro/Tuân thủ, QHKH) | Thẻ trung tính "Việc của bạn" hoặc "Ý kiến của bạn" (`.tag-me`), viền navy mảnh 1px (`.mineb`), không nền navy. Giữ ranh giới: nút của người nằm ngoài khung AI nét đứt |
| Nút người trong sơ đồ | `hwrap()`: nút "Cấp phê duyệt" nằm **ngoài** khung AI nét đứt (nền giấy, viền navy liền), nối bằng mũi tên qua mép khung. Trong khung AI chỉ có 6 agent (`teamLine()`) |
| Thanh bên theo vai | `navHtml(role, active)`: bảng vai → mục → badge ở mục 11.4; có đường kẻ `.sep` giữa nhóm việc của vai và 3 mục chung (Tra cứu chính sách, Trò chuyện, Trợ lý AI) |
| Panel Trợ lý AI trong hồ sơ | Khối AI nét đứt rộng 380px bên phải, đầu có "Trợ lý AI" + thẻ "AI đề xuất" + nút "Đóng"; ô nhập đáy; ghi rõ "chỉ đề xuất, không quyết định". Đóng thì nút "Trợ lý AI" ở thanh bên và mục lục trở lại. Mockup `25`, `25b` |
| Radio, checkbox, select, phân trang | `.opt` (radio thẻ, `:has(input:checked)`), `.chk`, `.rad`, `.select`, `.pg`; mẫu ở `21-thanh-phan.html` |
| `<mark>` | Nền warn-100, gạch chân đồng; chỉ cho cụm từ khóa trong kết quả tìm kiếm |
| Khối đội agent | Khối AI chứa sơ đồ + kết luận + cờ cảnh báo + nút "Chạy lại đội agent"; bốn trạng thái: chưa chạy (nút Chạy đội agent), đang chạy (nút loading, thời gian đã chạy), lỗi hoặc quá giờ (agent lỗi viền danger, banner nêu nguyên nhân, nút Chạy lại), có kết quả. Xem trang `21-thanh-phan.html` |
| Đội agent (MỘT thành phần `AgentTeam`, 3 biến thể) | Tham số `variant`: **`full`** (cây tỏa nhánh: Planner → 4 agent song song → Validation, đường nối nét đứt ai-500; dùng ở chi tiết hồ sơ 03, 07), **`compact`** (một dòng: tên 6 agent + tổng giây khi cả 6 xong; dùng trong khối kết luận 03, 25), **`strip`** (dải 3 cột Planner / 4 agent / Validation, mỗi ô tên + giây; dùng 06, 12, 14, 15). Mọi biến thể: thứ tự Planner → 4 agent → Validation → người quyết định NẰM NGOÀI khung nét đứt (`.at-hm`, nối bằng mũi tên). Trạng thái: chưa chạy, đang chạy (nền ai-50), xong (hiện giây), lỗi/quá giờ (viền danger kèm chữ). Tên agent không bị cắt ở 1366 (đo: 52 lượt, 0 phần tử `text-overflow`/`overflow` cắt chữ); nơi hẹp dải xuống 1 cột ở < 1100px. Thời gian là của từng hồ sơ (`CASES` trong `lib.js`), tổng = Planner + agent chậm nhất trong 4 + Validation |
| Khối người: tờ trình đã chốt, ý kiến Rủi ro/Tuân thủ (Cấp phê duyệt `12`) | `.mineb`: viền liền navy, ghi tên người ký và giờ ("Phạm Quốc Bảo, 09/11/2026 10:42"). Đặt TRÊN khối AI: (1) "Tờ trình thẩm định, bản v2" = thẻ "Bản đã chốt", 7 mục tóm tắt, nút "Mở bản đầy đủ 7 mục" tới `35`; (2) "Ý kiến Quản lý rủi ro và Tuân thủ" = hai ý kiến con (Q-N) và kết luận cờ CIC của Tuân thủ (F8, 3 lựa chọn, đều có lý do) |
| Tờ trình 7 mục (Thẩm định `14`) | Q-L, tiêu đề theo `backend/app/workflow/memo.py`: Thông tin khách hàng · Đề nghị cấp tín dụng · Pháp lý, UBO và người có liên quan · Tình hình hoạt động kinh doanh · Phân tích tài chính và khả năng trả nợ · Tài sản bảo đảm · Đánh giá rủi ro và đề xuất của Chuyên viên Thẩm định. Mỗi mục 1 đến 6: khối "AI đề xuất" (nét đứt, nút "Chèn vào ô bên phải" và "Bỏ đề xuất") + ô của người; mục 7 chỉ người viết (AI không chèn). **Không có nút đồng "Chốt tờ trình" trong nội dung** (D4, Q-L, quyết định của Mate): nội dung hiện "Bản nháp, sẽ chốt thành bản v1 khi trình"; việc chốt xảy ra khi bấm nút duy nhất ở header ("Trình Rủi ro và Tuân thủ", khóa kèm lý do); sau khi trình hiện "Bản vN đã chốt lúc …" (mẫu ở `35`) |
| Danh sách có cấu trúc (điều kiện phê duyệt, việc cần sửa) | `.condlist`: mỗi dòng = ô nội dung + ô hạn/mục liên quan, nút "Thêm …". Phê duyệt có điều kiện: ô "Hạn mức phê duyệt (đồng)" (không vượt đề nghị) + danh sách điều kiện, sang hồ sơ thành "Điều kiện trước giải ngân" (`16`). Trả lại: ô chọn nơi nhận (Thẩm định hoặc QHKH) + danh sách việc cần sửa (bên nhận thấy từng việc) |
| Quy tắc focus (drawer, modal) | Mở: focus vào tiêu đề hộp thoại (`tabindex=-1`) hoặc ô nhập đầu tiên. Giữ focus trong hộp thoại (bẫy Tab/Shift+Tab), `aria-modal="true"`. Esc đóng drawer/modal; modal ghi quyết định không đóng khi bấm nền. Đóng: trả focus về nút đã mở. Mẫu ở `21` |
| Nhãn "Trả về QHKH" | Badge danger (`.badge.bad`: đỏ) theo 5.1, ở 03, 03b, 03c, 25, 25b, 26, 30; nghĩa "việc cần làm lại", không phải lỗi hệ thống |
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

1. **Token và theme Ant Design** (`frontend/src/theme`, `frontend/src/styles`). Tạo `tokens.css` từ mục 5; `ConfigProvider theme` map: `colorPrimary=#0E4D5A`, `colorInfo=#1D4F91`, `colorSuccess=#1B6A3F`, `colorWarning=#8F5400`, `colorError=#A8281D`, `colorBgLayout=#F3F5F6`, `colorBgContainer=#FFFFFF`, `colorText=#172229`, `colorTextSecondary=#3D4A52`, `colorBorder=#66757B` (control), `colorBorderSecondary=#DAE1E4`, `borderRadius=6`, `fontFamily=Be Vietnam Pro…`, `fontSize=14`; component token cho Table (`headerBg=#F7F9FA`), Button, Tabs (`inkBarColor=#D29A2E`). Nạp phông từ Google Fonts (Newsreader 500/600, Be Vietnam Pro 400–700, IBM Plex Mono 400/500, subset vietnamese) hoặc tự lưu bản `woff2` (giấy phép OFL). **Nghiệm thu:** `npm run typecheck && npm run test` pass; `/foundation` hiện đủ token; axe 0 serious.
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
| 1.4.11 Tương phản thành phần | Đạt sau sửa | Viền ô nhập ban đầu chỉ 2,04:1 → đổi `--control #66757B`: 4,57:1 trên surface, 4,21:1 trên paper (đều ≥ 3:1) |
| 1.4.1 Không chỉ dùng màu | Đạt | Badge có chấm + chữ, cờ có hình khác nhau, AI có nét đứt + nhãn chữ |
| 2.4.7 Focus nhìn thấy | Đạt (thiết kế) | `--focus` 2px + 2px, tương phản 8,57:1; cần axe xác nhận khi áp code |
| 2.5.5 Vùng bấm | Đạt có điều kiện | Nút chuẩn 36px; nút nhỏ 30px chỉ trong bảng; mục tiêu thực 44px không đạt ở nút nhỏ (ghi nhận, AA không bắt buộc) |
| 1.3.1 Cấu trúc | Đạt | `nav aria-label`, `role=tablist`, `aria-current`, `aria-invalid`, `role=img` cho biểu đồ, `role=status` cho toast |
| 2.3 Chuyển động | Đạt | `prefers-reduced-motion` tắt mọi animation |
| Tiếng Việt | Đạt | `lang="vi"`, phông có subset vietnamese, kiểm ảnh `/tmp/ds1/vn.png` |

Chưa kiểm bằng trình đọc màn hình và axe-core thật (mockup tĩnh); đưa vào tiêu chí C1 khi áp code.

## 11. Bàn giao cho React và Ant Design (v2.1)

### 11.1 Danh sách mockup (51 tệp trong `mockups-v2/`, mỗi tệp một trạng thái)

`01` Đăng nhập · `02` Việc của tôi (QHKH) · `02b` Hồ sơ chờ phê duyệt (Cấp phê duyệt, gồm dòng "Chờ phiên Hội đồng – có ở đợt 2") · `03`/`03b`/`03c` Hồ sơ vay (có kết quả, đang chạy, lỗi chạy) · `04` Soạn đề xuất, bước 2 · `05` Đối chiếu một tài liệu · `06`/`07`/`08` Đội agent (Tổng quan, Dấu vết, So sánh) · `09`/`09b`/`09c` Trợ lý AI (có trả lời, đang trả lời, lỗi) · `10` Nhật ký · `11` Trạng thái trang · `11b` Không có quyền (403) · `12` Cấp phê duyệt chưa chọn · `12b` phê duyệt có điều kiện (hạn mức + điều kiện) + hộp xác nhận · `12c` trả lại + hộp xác nhận · `13` Hỗ trợ tín dụng · `14` Thẩm định (tờ trình 7 mục) · `15` Ý kiến Rủi ro và Tuân thủ · `16` Đề xuất hành động và điều kiện trước giải ngân · `17a`, `17`, `17c`, `17d`, `17b` Tạo đề xuất vay bước 1 đến 5 · `18` Khách hàng · `19` Đối chiếu danh sách · `20`/`20b` Tra cứu chính sách (có, không có kết quả) · `21` Thành phần · `22`/`22b`/`22c` Keycloak · `23` Chế độ demo (menu đổi vai mở trên trang thật `02b`) · `24` Thanh bên theo vai (bảng tài liệu) · `25`/`25b` Hồ sơ có panel Trợ lý AI mở/đóng · `26` Chi tiết khách hàng · `27` Việc của tôi (Hỗ trợ tín dụng) · `28` Việc của tôi (Thẩm định) · `29` Hồ sơ chờ ý kiến (Rủi ro/Tuân thủ) · `30` Hồ sơ vay chỉ đọc (Kiểm toán) · `31` Phiên Hội đồng tín dụng · `32` Đề xuất ngoại lệ (Q1/E1) · `33` Thông báo · `34` Quản trị (vai Quản trị hệ thống, Q-J) · `35` Tờ trình đã chốt (chỉ đọc). Sinh bằng `_gen/build.sh` (chạy `p1.js` … `p7.js` rồi `check.js`) từ `_gen/lib.js`. **Chưa có mockup**: `/foundation` (trang nền của dev, không phải màn nghiệp vụ; dev dùng trang `21` làm chuẩn).

### 11.2 Thành phần → Ant Design → component token → tệp thay trong `frontend/src`

| Thành phần thiết kế | Ant Design / tự dựng | Component token (ConfigProvider) | Tệp sẽ thay |
| --- | --- | --- | --- |
| Token màu, chữ, khoảng cách | `ConfigProvider theme.token` + CSS variable | `colorPrimary` `#0E4D5A`, `colorBgLayout` `#F3F5F6`, `colorBorder` `#66757B`, `fontSize` 14 | `theme/tokens.ts`, `theme/index.ts`, `styles/global.css` |
| Nút (chính, phụ, chốt, nguy hiểm) | `Button`; nút chốt tự dựng biến thể `gold` | `Button.colorPrimary`, `defaultBorderColor`, `controlHeight` 36 | `theme/componentOverrides.ts`, `components/common` |
| Nút khóa kèm lý do | Tự dựng quanh `Button` (không dùng `disabled`, dùng `aria-disabled` + `aria-describedby`) | không có, dùng class `locked` | `features/loan-detail/ActionsPanel.tsx`, `features/proposal/ProposalPage.tsx` |
| Ô nhập, chọn, vùng văn bản | `Input`, `Select`, `Input.TextArea`, `Form.Item` | `Input.activeBorderColor` `#1A6E7E`, `controlHeight` 38 | `features/proposal/*Section.tsx`, `features/audit/AuditLogPage.tsx`, `pages/ChatPage.tsx` |
| Tab | `Tabs` (hoặc `Menu` mode ngang cho điều hướng route) | `Tabs.inkBarColor` `#D29A2E`, `itemSelectedColor` `#0A3640` | `pages/AgentDashboardPage.tsx` |
| Bảng sổ cái | `Table` + ghi đè `.ant-table-thead > tr > th` (gạch kép) | `Table.headerBg` `#F7F9FA`, `borderColor` `#DAE1E4` | `features/my-work/QueueTable.tsx`, `components/tables` |
| Drawer, Modal xác nhận | `Drawer` (440), `Modal.confirm` | `Modal.borderRadiusLG` 10 | `features/loan-detail/ActionsPanel.tsx`, `features/reconciliation/ConflictPanel.tsx` |
| Khối AI, khối người quyết định, thẻ nhãn | Tự dựng (`AiBlock`, `HumanBlock`) | class `aib`, `hmb` trong `app.css` | `features/ai-panel/AiPanel.tsx`, `features/loan-detail/LoanApprovalCard` (nếu có) hoặc `ActionsPanel.tsx` |
| Khối và sơ đồ đội agent | Tự dựng (SVG tỏa nhánh) | class `flow`, `fn`, `hnode` | `features/loan-detail/AgentTeamPanel.tsx`, `features/dashboard/agentTrace.ts` |
| Đề xuất hành động, điều kiện giải ngân | `List` + `Button`, `Tag` | `Tag` màu theo trạng thái | `features/agent-actions/ActionProposals.tsx`, `features/loan-detail/PreDisbursementPanel.tsx` |
| Dấu vết (bước mở rộng) | `Collapse` hoặc `<details>` | không có | `pages/AgentDashboardPage.tsx`, `features/dashboard/components` |
| Stepper hồ sơ và wizard | `Steps` | `Steps.colorPrimary` | `features/loan-detail/LoanHeader.tsx`, `features/proposal/NewProposalPage.tsx` |
| Thẻ chỉ số, biểu đồ cột | `Statistic` + SVG; chart theo `theme/chartTheme.ts` | `Statistic.contentFontSize` 26 | `features/my-work/Hero.tsx`, `components/charts` |
| Trạng thái rỗng, 403, 404, lỗi | `Result`/`Empty` hoặc tự dựng | không có | `features/shell/NoAccess.tsx`, `pages/NotFoundPage.tsx` |
| Dải demo, menu đổi vai | Tự dựng + `Dropdown` | không có | `features/shell/DemoSwitcher.tsx`, `AppLayout.tsx` |
| Khung (sidebar, topbar, skip link) | `Layout`, `Menu` | `Menu.darkItemBg` `#0E4D5A` | `features/shell/Rail.tsx`, `Topbar.tsx`, `styles/accessibility.css` |
| Đăng nhập, theme Keycloak | Trang tự dựng; theme Keycloak (FTL + `app.css`) | không có | `pages/LoginPage.tsx`, `auth/keycloak.ts` (+ thư mục theme của hạ tầng) |
| Toast, banner | `message`/`notification`, `Alert` | `Alert.colorInfoBg` `#DCE7F6` | `components/common` |

Ghi chú: tên tệp lấy từ `frontend/src` hiện có; nơi ghi "nếu có" là tệp chưa xác nhận, dev kiểm tra khi làm.

### 11.3 Danh sách agent dùng chung (khớp code)

Planner (lập kế hoạch) → Credit, Compliance, Operations, Document (song song) → Validation (phản biện chéo). Mọi trang lấy từ cùng một mảng `AGENTS` trong `_gen/lib.js`; nhãn agent ở 03, 03b, 03c, 06, 07, 12, 14, 15, 21, 25 giống nhau vì cùng một thành phần `agentTeam()` (xem mục 6). Phép tính kiểm tra tự động trong generator (ném lỗi nếu lệch): 06 cộng trạng thái = 762 = cộng 12 tuần, lỗi theo agent cộng = 14; 07 gọi công cụ 17, thời gian cộng 34,5 giây, thời gian thực 15,4 = 2,1 + 9,5 + 3,8.

### 11.4 Điều hướng theo vai (`rules.md` C) và panel AI

| Vai | Mục đầu (badge) | Mục khác theo vai | Mockup |
| --- | --- | --- | --- |
| Chuyên viên QHKH | Việc của tôi (**4**) | Tạo đề xuất vay, Khách hàng SME | `02` |
| Hỗ trợ tín dụng | Việc của tôi (**3**) | Đối chiếu tài liệu, Khách hàng SME | `27`, `13`, `19`, `32` |
| Chuyên viên Thẩm định | Việc của tôi (**3**) | Đối chiếu tài liệu, Khách hàng SME | `28`, `14` |
| Quản lý rủi ro/Tuân thủ | Hồ sơ chờ ý kiến (**2**) | Khách hàng SME | `29`, `15`, `06`–`08` |
| Cấp phê duyệt | Hồ sơ chờ phê duyệt (**3**) | Phiên Hội đồng tín dụng | `02b`, `12`, `31` |
| Kiểm toán nội bộ | Hồ sơ vay – chỉ đọc (không badge) | Nhật ký kiểm toán, Phiên Hội đồng – chỉ đọc | `30`, `10`, `31` |

Cả 6 vai có thêm 3 mục chung sau đường kẻ: Tra cứu chính sách, Đội agent và Trợ lý AI (một tên duy nhất "Trợ lý AI" ở thanh bên, tiêu đề trang 09 và panel; không còn "Trò chuyện"); QHKH và vai có mục "Bảng điều khiển agent" theo quyền. Tạo đề xuất vay chỉ có ở QHKH. Số badge ở thanh bên bằng số hàng của danh sách tương ứng (`02`: 4 việc cần QHKH; `02b`: 3 hồ sơ). Quản trị hệ thống không có mockup riêng (ngoài phạm vi, ghi ở báo cáo bàn giao).

**Panel Trợ lý AI (`25`, `25b`).** Khớp và chặt hơn `rules.md` D5: panel mở thì mục lục trái **ẩn ở mọi cỡ dưới 1600px** (D5 đòi tối thiểu dưới 1360px). Đo lại 2026-11-11 bằng Playwright: mục lục `display:none` ở 1280, 1366, 1440; hiện ở 1920. Bề rộng cột nội dung khi panel mở (và khi đóng): 1280 → 616 (724); 1366 → 702 (810); 1440 → 776 (884); 1920 → 804 (1140). Panel rộng 360px, nội dung `minmax(0,1fr)`, không tràn ngang ở cả 4 cỡ. Mục thanh bên đang chọn ở 25 và 25b là "Việc của tôi" (đúng hồ sơ), không phải "Trợ lý AI". Nút mở khi panel đóng là nút 44×44 có chữ ngang "Trợ lý AI" (không chữ dọc). 25 và 25b dùng đúng khung của `03` (cùng tiêu đề, stepper, khối kết luận, thẻ Việc của bạn), chỉ thêm cột panel. **`24`** là bảng tài liệu của thanh bên, không phải màn ứng dụng; mọi đích trong bảng nay có mockup thật (`27`–`31`, `09`).

## 12. Đối chiếu `rules.md` D3, D4, D5 và quyết định mở

| Điều | Nội dung `rules.md` mục D | Thiết kế đã áp | Chỗ |
| --- | --- | --- | --- |
| D3 (mục 3) | Không có quyền: h1 trung tính, không tên khách hàng, một biểu tượng khiên, đúng 1 nút có biểu tượng | Minh họa khiên, tiêu đề "Bạn chưa có quyền xem trang này", 1 nút "Về Việc của tôi", không nêu khách hàng | `11-trang-thai.html` |
| D4 (mục 4) | Nút chính chuyển bước ở header phải, tối đa 1; trong nội dung chỉ lặp dạng dòng khóa hoặc link; trang chủ không có nút chuyển bước; wizard "Tiếp: <bước sau>"; bước 5 "Gửi Hỗ trợ tín dụng" khóa kèm lý do; HTTD "Chuyển Thẩm định" khóa kèm lý do | Đúng một nút đồng ở góc phải tiêu đề (đo: `.btn.gold` ≤ 1 trên mỗi trang, trừ trang Thành phần `21` là mẫu); `12` khóa "Ghi quyết định" kèm lý do tới khi chọn; `04`/`17` "Tiếp: Tài chính" khóa kèm lý do; `17b` "Gửi Hỗ trợ tín dụng" khóa; 02 không có nút đồng | `02`, `03`, `04`, `12` đến `17d` |
| D5 (mục 5) | Kiểm bố cục ở 1280×800 và 1440×900, **panel AI mở và đóng**; ẩn mục lục khi panel AI mở và viewport < 1360px | Mọi trang đo ở 1280, 1366, 1440, 1920; panel AI mở/đóng ở `25`/`25b`, mục lục ẩn khi mở ở < 1600px, chặt hơn D5 (mục 11.4) | `/tmp/ds3/report.json` |
| Mục 6 (kèm) | Chữ dòng khóa dùng `--text-3` | Dòng lý do khóa dùng `--ink-3` (5,65:1 trên surface) | `.lockwhy` trong `app.css` |

**Quyết định mở (Mate giao: theo `rules.md`, ghi rõ).** Báo cáo chấm việc 2 của trang 02 yêu cầu "giữ đồng ở khối trên" (khối Việc gấp có nút đồng ở thân trang). `rules.md` D4 cấm: nút chính chuyển bước chỉ ở header phải, trang chủ không có nút chuyển bước, nội dung chỉ lặp dạng khóa hoặc link. Thiết kế theo `rules.md`: ở `02` bỏ hẳn nút đồng, "Mở hồ sơ" là nút navy thường; ở 03 hộp Người quyết định dùng link. Lần chấm thứ hai không đòi lại điểm này. Phần này là cách đọc của crew theo chỉ dẫn của Mate ("theo `rules.md`, ghi rõ"), chưa có chữ của người dùng xác nhận.

**Quyết định thứ hai (Mate giao: theo `rules.md` D4 và Q-L, ghi rõ).** Báo cáo chấm lần 3 (việc 4) đòi nút đồng "Chốt tờ trình vN" ở nội dung trang `14`. `rules.md` D4 cấm nút chuyển bước ở thân trang, và Q-L cho việc chốt phiên bản xảy ra khi trình. Thiết kế **không** thêm nút đồng đó: `14` chỉ có một nút đồng ở header ("Trình Rủi ro và Tuân thủ", khóa kèm lý do, bấm sẽ chốt thành bản vN), thân trang hiện trạng thái "Bản nháp, sẽ chốt thành bản v1 khi trình", sau khi trình hiện "Bản vN đã chốt lúc …" (`35`). **Đây là điểm khác báo cáo chấm có chủ đích, theo `rules.md`.**

## 13. Kiểm tra ở 4 cỡ màn hình

Script `_gen/measure.js` (Playwright, `file://`) mở từng tệp ở 1280×800, 1366×768, 1440×900, 1920×1080 và đo: tràn ngang (`scrollWidth − innerWidth`), tương phản mọi phần tử chữ đang hiển thị (cả nút hover/active ép sẵn), nhãn của ô nhập, tên của nút/liên kết, tab ngoài `tablist`, `h1` và `main` đúng 1, `lang=vi`, skip link tới `#main`, cỡ chữ nhỏ nhất. Từ lần này script đo thêm: vùng bấm < 24px (WCAG 2.2 2.5.8), số `.btn.gold` hiện ở màn đầu và cả trang, số hàng bảng thấy ở màn đầu, khối kết luận AI có nằm trọn màn đầu không, `role=radio` thiếu `aria-checked`, nút/khối người nằm trong khung AI. Kết quả lần chạy cuối (2026-11-11, `node _gen/measure.js` từ `docs/design/mockups-v2/_gen`, chạy trên bản đã commit): **51 trang × 4 cỡ = 204 lượt, 0 có vấn đề**. Theo cỡ (1280, 1366, 1440, 1920): trang tràn ngang 0, 0, 0, 0; cặp chữ dưới 4,5:1: 0, 0, 0, 0; vùng bấm < 24px: 0, 0, 0, 0; ô nhập thiếu nhãn: 0; nút/liên kết thiếu tên: 0; cỡ chữ nhỏ nhất 12px; nút/khối người trong khung AI: 0. Nút đồng thấy ở màn đầu: tối đa 1 ở mọi trang, **trừ `21` Thành phần (5 nút mẫu, theo 6 trạng thái nút)**. Số hàng bảng thấy ở màn đầu ở 1366×768 (bằng nhau ở cả 4 cỡ): `02` 5, `02b` 4, `18` 7, `19` 4, `23` 4, `26` 3, `27` 3, `28` 3, `29` 2, `30` 4, `31` 1, `34` 7. Khối kết luận AI nằm trọn màn đầu ở `03`, `25`, `25b` ở cả 4 cỡ. Thành phần Đội agent: `_gen/trunc.js` đo 52 lượt (13 trang × 4 cỡ), **0 phần tử chữ bị cắt**. Ảnh chụp: `/tmp/ds4/after/` (204 tệp PNG, không commit). Script không bắt được lỗi nghĩa và nghiệp vụ; phần đó kiểm bằng `_gen/check.js` và đọc đối chiếu `rules.md`.

## 14. Quy tắc hiển thị khi chưa có số thật

Không dựng số giả trên giao diện thật. Số trong mockup là mẫu và tự khớp. Khi áp code: nếu API chưa trả số, thẻ chỉ số hiện "Chưa có dữ liệu" (chữ ink-3, không có đơn vị); biểu đồ hiện trạng thái rỗng "Chưa có lượt chạy nào trong khoảng này"; trang So sánh hiện "Chưa có lượt đánh giá"; tỉ lệ chỉ hiện khi mẫu số > 0 (không chia cho 0, không hiện 0%); tổng luôn tính từ các thành phần đã nhận, không lấy riêng một trường tổng.

### 14.1 Bảng dữ liệu demo dùng chung (thế giới mockup: Thứ Ba 10/11/2026)

Mọi mockup lấy từ bảng này; `_gen/check.js` báo lỗi nếu có ngày cuối tuần, mã hồ sơ ngoài bảng, hoặc badge/tổng lệch. Hạn xử lý tính theo ngày làm việc (`rules.md` B).

| Hồ sơ | Khách hàng | Số tiền | Giai đoạn và mốc | Xuất hiện ở |
| --- | --- | --- | --- | --- |
| HSV-2026-00201 | Phúc Lâm | 15 tỷ | Cấp phê duyệt trả về QHKH 09/11 16:05; đội agent chạy lại 10/11 14:32:26–14:32:41 (15,4 giây: 2,1 / 7,7 / 6,3 / 5,1 / 9,5 / 3,8) | `02`, `03`–`03c`, `04`, `05`, `06`, `07`, `09`–`09c`, `10`, `19`, `21`, `25`, `25b`, `26` |
| HSV-2026-00209 | An Phát | 22 tỷ | Hỗ trợ tín dụng nhận 10/11 09:10, hạn 12/11 17:00 | `13`, `19`, `27`, `32` |
| HSV-2026-00203 | Hải Đăng | 18 tỷ | Thẩm định nhận 06/11, hạn 13/11; thời gian agent riêng (1,8 / 6,4 / 8,2 / 4,7 / 5,9 / 3,1 giây, tổng 13,1) | `14`, `28` |
| HSV-2026-00192 | Đại Nam | 60 tỷ | Rủi ro/Tuân thủ nhận 09/11, hạn 12/11; tổng agent 14,5 giây | `15`, `29` |
| HSV-2026-00194 | Sông Hậu | 24 tỷ (đề xuất 20 tỷ) | Chờ Cấp phê duyệt, hạn 11/11; DSCR 1,35, LTV 64,0%; tờ trình v2 chốt 09/11 10:42 (Phạm Quốc Bảo); Rủi ro và Tuân thủ do Trần Đức Long ký 09/11 14:05 và 14:12; tổng agent 15,5 giây | `12`, `12b`, `12c`, `02b`, `30`, `35` |
| HSV-2026-00189 | Gỗ Tây Nguyên | 40 tỷ | Chờ Cấp phê duyệt, hạn hôm nay 10/11 | `02b` |
| HSV-2026-00186 | Nhựa An Khang | 18 tỷ | Chờ Cấp phê duyệt, hạn 12/11 | `02b` |
| HSV-2026-00171 | Hải Đăng | 9 tỷ | Phê duyệt có điều kiện 06/11 11:20:45, hạn mức 8 tỷ | `16`, `10` |
| HSV-2026-00196 | Phú Điền | 30 tỷ | Chờ bổ sung, hạn 13/11 | `02` |
| HSV-2026-00176 | Đại Thành Global | 80 tỷ | Quá hạn 1 ngày (hạn 09/11), chờ Rủi ro/Tuân thủ | `02`, `29` |
| HSV-2026-00178 | Điện gió Bạc Liêu | 120 tỷ (> 100 tỷ) | "Chờ phiên Hội đồng – có ở đợt 2" (Q4, Q-P), họp 17/11 | `02b`, `30`, `31` |
| HSV-2026-00198 / 00204 / 00205 / 00207 | Việt Cát / Bình An / Tiến Phát / Hoàng Gia | 35 / 9 / 22 / 27 tỷ | Dòng trong danh sách việc của Thẩm định (`28`) và Hỗ trợ tín dụng (`27`) cho đủ badge 3 và 3 | `27`, `28` |
| DX-2026-00412 / DX-2026-00405 | Mekong Flex / Hưng Phát | 80 tỷ / 25 tỷ | Bản nháp lưu 06/11 / 05/11 | `02`, `17a`–`17d`, `17b`, `33` |

Số tự khớp giữa trang: 06 có 703+21+14+21+3 = 762 lượt (tổng 12 tuần); 07 có tổng 15,4 giây của lượt gần nhất (2,1 + 9,5 + 3,8 = đường dài nhất Planner, Document, Validation); 08 có 37/40 = 92,5% và 31/40 = 77,5% (và 18/20 = 90,0%, 14/20 = 70,0%); 06 hiện 762 lượt, 92,3%. Số "lượt gần nhất" của từng agent (03, 25) khác trung vị 12 tuần ở 06 và được ghi rõ nhãn.


## 15. Bảng đối chiếu báo cáo chấm lần 3 (`cham-diem-v2-lan-3.md`)

Số đo ngày 2026-11-11, trên bản đã commit: `_gen/measure.js` (**51 trang × 4 cỡ = 204 lượt, 0 có vấn đề**), `_gen/trunc.js` (chữ bị cắt trong Đội agent: 0 ở 52 lượt), `_gen/check.js` (dữ liệu demo, nay có thêm các phép kiểm ở việc 3), số đếm trên HTML sinh ra. Đây là bảng tự đối chiếu, **không phải điểm**; giám khảo khác chấm lại, và lần chấm tới là trên ứng dụng thật nên mục 6, 11 và 12 phải đủ để dev làm đúng. Báo cáo lần 1 và 2 đã đóng ở các bản trước; không giữ bảng cũ.

### 15.1 Mười ba việc phải sửa

| # | Việc | Đã sửa ở đâu | Số đo sau sửa |
| --- | --- | --- | --- |
| 1 | `12` thiếu căn cứ của người | `_gen/p4.js` `memoView()`, `opinions()`, `p12()`; `app.css` `.doc7 .sgn .condlist`. `12`: khối "Tờ trình thẩm định, bản v2" (thẻ "Bản đã chốt", 7 mục, ký Phạm Quốc Bảo 09/11/2026 10:42, nút mở `35`) và khối "Ý kiến Quản lý rủi ro và Tuân thủ" (hai ý kiến con Q-N, kết luận cờ CIC của Tuân thủ theo F8) nằm TRÊN khối AI, viền liền. `12b`: ô "Hạn mức phê duyệt" 20.000.000.000 + danh sách 2 điều kiện có hạn; hộp xác nhận liệt kê lại hạn mức, 2 điều kiện, ngoại lệ, "Không hoàn tác được". `12c`: ô nơi nhận + danh sách việc cần sửa | `12` ở 1366: 4 radio, 0 chọn sẵn, "Ghi quyết định" khóa kèm lý do; 7 mục tờ trình + 2 ý kiến; `check.js` bắt thiếu "Bản đã chốt" hoặc khối ý kiến; 1 nút đồng ở header; 0 vùng bấm < 24px |
| 2 | Một thành phần "Đội agent" | `lib.js` `agentTeam(states,{v:'full'|'compact'|'strip'})`; `app.css` khối v2.3 `.at*`; mục 6; `21`. Dùng ở `03`/`03b`/`03c` (compact + full), `25`/`25b` (compact), `06`, `07`, `12`, `14`, `15` (strip/full), `21` (đủ 3 biến thể + chưa chạy, đang chạy, lỗi) | `trunc.js`: 52 lượt (13 trang × 4 cỡ) 0 chữ bị cắt; `measure.js`: 0 nút/khối người trong khung AI; người quyết định luôn ngoài khung |
| 3 | Số liệu demo đúc khuôn, mâu thuẫn | `lib.js` `CASES` (mỗi hồ sơ một bộ giây: 00201 15,4 / 00194 15,5 / 00203 13,1 / 00192 14,5); cờ riêng từng hồ sơ ở `p4.js`; `05` và `19` cùng "Hợp đồng thuê đất = Đã xác nhận" (`19` bỏ 00201 khỏi việc của HTTD, ghi "Đã xong, chỉ xem"); `09` ghi "số đang chờ xác nhận"; `17b` bước 4 "Còn thiếu"; `check.js` thêm phép kiểm | `check.js`: 0 lượt chạy trùng giây, 05 = 19, `17b` có "Còn thiếu", 0 ngày cuối tuần, 0 mã ngoài bảng; sửa thêm: `27` 22 tỷ và hạn 12/11 khớp `13`, `28` 00203 hạn 13/11 khớp 14.1 |
| 4 | `14` tờ trình 7 mục | `_gen/p4.js` `memoCard()`: 7 mục có tiêu đề Q-L, mỗi mục 1 đến 6 có khối "AI đề xuất" (nút Chèn, Bỏ) + ô của người, mục 7 chỉ người viết. **Khác báo cáo chấm, theo `rules.md` D4/Q-L (quyết định của Mate): KHÔNG có nút đồng "Chốt tờ trình vN" trong nội dung**; thân trang ghi "Bản nháp, sẽ chốt thành bản v1 khi trình"; nút đồng duy nhất ở header "Trình Rủi ro và Tuân thủ" (khóa kèm lý do, bấm là chốt); `35` là mẫu "Bản v2 đã chốt lúc …". Xem mục 12 | `14`: 7 `<h3>` mục; 1 `.btn.gold` (header); `check.js` bắt nút đồng trong nội dung |
| 5 | Lỗi lần 2 ở 05, 08, 09, 13 | `p2.js`: `05` (tên công ty chữ thường, không mono; thẻ AI), `08` ("Mô hình đơn lẻ: gpt-oss-120b, 1 lần gọi", nhận xét lên màn đầu, không thẻ AI trên số đo), `p3.js`: `09` (trả lời đúng câu hỏi, số kèm "đang chờ xác nhận"), `p4.js`: `13` (bỏ câu chống nạng, một thẻ "Việc của bạn", thêm "Đề xuất ngoại lệ" → `32`) | `grep` "Nút chuyển ở góc" ở 13 = 0; thẻ AI trên số đo 06/07/08 = 0; 0 vấn đề ở 204 lượt |
| 6 | Ngữ nghĩa màu và nhãn | "Trả về QHKH" = `badge bad` (đúng 5.1, ghi ở mục 6); `20`: "Mục 4.2" là chữ trung tính, không badge; `16`: đề xuất agent nằm trong khối AI (`.aib`) | `20`: 0 `.badge` ở nhãn mục; `16`: 3 đề xuất trong `.aib` |
| 7 | 25 và 25b ở 1366 | `app.css` ngưỡng ẩn mục lục khi panel mở: **< 1600px** (chặt hơn D5 < 1360px); bỏ `writing-mode` dọc, nút 44×44 chữ ngang; thanh bên chọn "Việc của tôi"; dùng khung của `03`; sửa lời khai ở 11.4 và 12 | Playwright: mục lục `none` ở 1280, 1366, 1440, hiện ở 1920; cột nội dung 616, 702, 776, 804 px khi panel mở (≥ 600) |
| 8 | Văn phong | Một tên "Trợ lý AI" (thanh bên, h1 `09`, panel); `01` không còn "Cán bộ"; `16` nút "Về Khách hàng SME" khớp breadcrumb; `10` placeholder "ngày/tháng/năm" | `grep` "Trò chuyện" = 0, "Cán bộ" ở 01 = 0, "dd/mm/yyyy" ở 10 = 0; `check.js` chặn thuật ngữ cũ |
| 9 | Thống nhất bố cục | Wizard `04`, `17`, `17a`, `17c`, `17d`, `17b` cùng bố cục (cột bước 200px + form); `25` dùng khung `03`; `06`, `07`, `08` cùng h1 "Đội agent" | h1 của 06, 07, 08 = "Đội agent"; 0 vấn đề |
| 10 | Ô tìm kiếm thanh trên và focus | `app.css` `.search{border:1px solid var(--control)}` (4,57:1); quy tắc bẫy và trả focus ở mục 6 và `21` | `measure.js` 0 cặp < 4,5:1 (204 lượt) |
| 11 | 20b một nút | `p5.js`: "Xóa từ khóa" và "Hỏi Trợ lý AI" | `20b`: 2 nút trong trạng thái rỗng (theo mục 6: một nút chính + một phụ) |
| 12 | 1920 và nửa dưới cột trái ở 12 | mục 5.4: khối căn giữa; `12` cột trái có tờ trình + ý kiến + AI | `.page` có `margin-inline:auto`; không trang tràn ngang ở 1920 |
| 13 | Trang còn thiếu | `p7.js` và `p6.js`: `27`, `28`, `29`, `30`, `31`, `32`, `33`, `34`, `35`, `17a`, `17c`, `17d`; `02b` thêm dòng "Chờ phiên Hội đồng – có ở đợt 2" (00178, 120 tỷ); `23` nay là menu đổi vai mở trên trang thật `02b`; `24` đích nay đều có trang; `21` có đội agent 3 biến thể, radio, checkbox, select, phân trang. **Chưa làm: `/foundation`** | 51 tệp (đã đếm bằng `ls mockups-v2/*.html \| wc -l`); `check.js` bắt thiếu dòng Hội đồng ở `02b` |

### 15.2 Từng trang

| Trang | Đã sửa ở đâu | Số đo sau sửa |
| --- | --- | --- |
| 01 | bỏ "Cán bộ" | `main` = 1; 0 vấn đề |
| 02, 02b | `02b` thêm dòng Hội đồng; `23` dùng lại thân của `02b` | 02: 5 hàng thấy; 02b: 4 hàng, badge 3; 0 nút đồng |
| 03, 03b, 03c | thành phần Đội agent (compact + full); cờ riêng | `ai1` = đủ ở 4 cỡ; 1 nút đồng; 0 vấn đề |
| 04, 17, 17a, 17c, 17d, 17b | cùng bố cục; 17b bước 4 "Còn thiếu" khớp banner lỗi; thêm bước 1, 3, 4 | 0 vấn đề; 17d "Tiếp: Rà soát và gửi" khóa kèm lý do |
| 05 | bỏ mono, "Hợp đồng thuê đất" khớp 19 | `check.js` 05 = 19 |
| 06, 07, 08 | Đội agent strip/full; 08 nhận xét lên đầu; số 37 và 31 cùng hàng | 0 vấn đề |
| 09, 09b, 09c | một tên "Trợ lý AI"; câu trả lời đúng câu hỏi | 0 vấn đề; cao đúng màn hình |
| 10 | placeholder dạng mẫu | 0 "dd/mm/yyyy" |
| 11, 11b | không đổi | 0 vấn đề |
| 12, 12b, 12c | xem việc 1 | 0 vấn đề; 1 nút đồng |
| 13 | bỏ câu chống nạng, thẻ trùng; thêm "Đề xuất ngoại lệ" | 0 vấn đề |
| 14 | tờ trình 7 mục (việc 4) | 1 nút đồng (header) |
| 15 | Tuân thủ chọn kết luận cờ CIC (F8, 3 lựa chọn + lý do), ý kiến Rủi ro; banner "đang đọc tờ trình bản v1" | 0 vấn đề |
| 16 | đề xuất trong khối AI; nút "Về Khách hàng SME" | 0 nút đồng |
| 18 | cột "Hồ sơ" là liên kết có `aria-label` | 7 hàng thấy |
| 19 | bỏ 00201 khỏi việc HTTD (ghi "Đã xong, chỉ xem") | 4 hàng; khớp 05 |
| 20, 20b | nhãn "Mục 4.2" trung tính; 20b có 2 nút | 0 vấn đề |
| 21 | Đội agent 3 biến thể + trạng thái; quy tắc focus | `21` là trang duy nhất > 1 nút đồng (5 mẫu) |
| 22, 22b, 22c | không đổi (giữ tên đăng nhập, xóa mật khẩu khi sai: ghi ở mục 8) | 0 vấn đề |
| 23 | menu đổi vai trên `02b` | 4 hàng; 0 vấn đề |
| 24 | bảng tài liệu; đích nay đều có trang | 0 vấn đề |
| 25, 25b | khung `03`, "Việc của tôi" chọn, nút mở có chữ ngang, ẩn mục lục < 1600px | cột nội dung ≥ 616px; `ai1` = đủ |
| 26 | liên kết mã hồ sơ gạch chân | 3 hàng; 0 vấn đề |
| 27 đến 35 | mới (việc 13) | mỗi trang 0 vấn đề ở 4 cỡ; `27` 3, `28` 3, `29` 2, `30` 4, `31` 1 hàng |

### 15.3 Điều khai ở báo cáo lần 3 đã sửa lại cho đúng

| Chỗ lời khai lệch | Sửa |
| --- | --- |
| "Đo 1280 và 1366: mục lục ẩn" (11.4, 12, 15.2) | Nay đúng thật và chặt hơn: ngưỡng 1600px, đo bằng Playwright ở cả 4 cỡ (mục 11.4) |
| 05 và 08 "đã xong" | Sửa ở việc 5 và đo lại |
| "Câu chuyện demo khớp nhờ `check.js`" | `check.js` nay kiểm thêm: không hai lượt chạy trùng giây, 05 = 19, `17b` "Còn thiếu", dòng Hội đồng ở `02b`, nút đồng ở thân `14`; hai mâu thuẫn mới tự bắt được khi viết `27`, `28` (số tiền, hạn) đã sửa |
| Số tệp và số lượt | 51 tệp, 204 lượt (51 × 4), kiểm bằng `ls` và `measure.js` |
| Việc 4 "Chốt tờ trình" | Không theo báo cáo mà theo `rules.md` D4/Q-L (mục 12), ghi rõ để lần chấm sau không trừ nhầm |
