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

Lý do tránh "mặc định kiểu AI": nền giấy của Sổ Tín Dụng là `#F5F4EF` kết hợp navy sâu và **đồng** (không phải đất nung/terracotta); bố cục không phải tờ báo (có sidebar, thẻ chỉ số, bảng); nhận diện là chữ "S" gạch chân đồng chứ không phải biểu tượng ngân hàng chung. Rủi ro còn lại: serif + giấy ấm vẫn có thể bị coi là quen; được giảm bằng navy đặc ở khung và tím mực làm màu thứ hai.

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
| `--paper` | `#F5F4EF` | nền trang |
| `--paper-2` | `#ECEAE2` | nền hover, skeleton |
| `--surface` | `#FDFCF9` | nền thẻ, ô nhập |
| `--surface-2` | `#F8F7F2` | đầu bảng, chân bảng |
| `--rule` | `#D9D5C8` | kẻ phân cách |
| `--rule-strong` | `#B9B3A0` | kẻ đậm, gạch kép |
| `--control` | `#7F7964` | viền ô nhập và nút (≥3:1) |
| `--ink` | `#1B2430` | chữ chính |
| `--ink-2` | `#434C5A` | chữ phụ |
| `--ink-3` | `#5E6573` | nhãn, ghi chú (≥4,8:1) |
| `--ink-inv` | `#F5F4EF` | chữ trên nền tối |
| `--navy-900` | `#0E1F3D` | nút chính khi hover, chữ nhấn |
| `--navy-700` | `#14284B` | sidebar, nút chính, người quyết định |
| `--navy-500` | `#2A4A80` | liên kết, focus |
| `--navy-100` | `#DCE4F1` | nền nhẹ |
| `--navy-50` | `#EDF1F8` | hàng đang chọn |
| `--bronze-700` | `#7A5C22` | chữ đồng trên nền giấy |
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
| `--neutral-100` | `#E7E5DC` | nháp, chưa có |

Ngữ nghĩa trạng thái hồ sơ: Nháp = trung tính; Đang xử lý (Kiểm tra, Thẩm định, Rủi ro) = info; Chờ bổ sung / sắp quá hạn = warn; Trả lại / từ chối / quá hạn = danger; Phê duyệt, hoàn tất = ok. Mức cờ: Xanh = ok (hình thoi), Vàng = warn (hình thoi), Đỏ = danger (hình tròn).

### 5.2 Chữ

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--font-display` | Newsreader 600 (tối thiểu 16px), dự phòng Times New Roman | tiêu đề trang, tiêu đề thẻ |
| `--font-body` | Be Vietnam Pro 400/500/600/700, dự phòng system-ui | chữ thường, nút, nhãn |
| `--font-num` | IBM Plex Mono 400/500, tabular | số tiền, tỉ lệ, mã hồ sơ, thời gian, chỉ số |
| `--fs-11` | 11px | chú thích nhỏ nhất, thẻ AI/người (chỉ Be Vietnam Pro) |
| `--fs-12` | 12px | nhãn bảng, ghi chú |
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

Màn hình 1366×768 và 1920×1080. Nội dung `max-width: 1640px`, lề 32px. Lưới trang: 4 cột chỉ số; Hồ sơ vay chia `1fr | 360px`. Dưới 1100px: cột phụ xuống dưới, chỉ số 2×2.

### 5.5 Biểu tượng

Bộ nét 1,6px, 24px lưới, kích thước hiển thị 16 (trong nút/ô tìm), 18 (nav, banner). Dùng Ant Design Icons ở lớp ứng dụng nhưng chỉnh `strokeWidth` tương đương; nếu dùng bộ khác thì chọn bộ nét mảnh (Lucide, giấy phép ISC).

### 5.6 Minh họa trạng thái rỗng

SVG đơn sắc navy nét 2px: một trang sổ (viền đồng bên trái, dòng kẻ xám) kèm một biểu tượng góc phải (kính lúp cho rỗng/404, ổ khóa cho 403, dấu chấm than đỏ cho lỗi). Kích thước 132×96px, chỉ dùng token, không dùng ảnh bitmap.

### 5.7 Nhận diện

Tên sản phẩm: **Sổ Tín Dụng**. Logo: ô vuông giấy `#F5F4EF` cạnh 30px, chữ "S" Newsreader 19px màu navy, gạch chân đồng 2px. Dưới tên là mô tả "Tín dụng doanh nghiệp". Thay `frontend/public/brand/shb-*.svg` bằng `so-tin-dung-mark.svg` và `so-tin-dung-wordmark.svg`, thay chuỗi "SHB AI Assistant" ở topbar, đăng nhập, Chat, `index.html`, tiêu đề tab.

### 5.8 Kiểm tra tương phản (tính bằng công thức WCAG, ngày 2026-11-11)

Chữ thường ≥ 4,5:1, thành phần giao diện ≥ 3:1. Bảng rút gọn (đủ trong mục 10):

| Cặp | Tỉ lệ |
| --- | --- |
| ink / paper | 14,21 |
| ink-3 / surface | 5,71 |
| ink-3 / paper-2 | 4,86 |
| trắng / navy-700 | 14,64 |
| ink tối / bronze-500 | 5,70 |
| trắng / ai-700 | 9,36 |
| ai-700 / ai-50 | 8,31 |
| ok-700 / ok-100 | 5,52 |
| warn-700 / warn-100 | 5,05 |
| danger-700 / danger-100 | 5,46 |
| 9DB0D1 (nhãn nhóm nav) / navy-700 | 6,67 |
| control / surface (viền ô nhập) | 3,96 |

## 6. Quy cách thành phần

Tất cả trạng thái: mặc định, hover, focus (`--focus`), active, disabled (giảm 50% độ đậm, `cursor: not-allowed`), loading (giữ nhãn, thêm spinner 14px trước nhãn). Vùng bấm tối thiểu 36px chiều cao (nút nhỏ 30px chỉ dùng trong bảng, có khoảng đệm quanh).

| Thành phần | Quy cách |
| --- | --- |
| Nút chính | Nền navy-700, chữ trắng, cao 36, ngang 16px, bo 6; hover navy-900 |
| Nút chốt (một nút trên mỗi màn đầu) | Nền bronze-500, chữ `#1B1405`, hover `#9C7830` chữ trắng |
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
| Dải chế độ demo | Cao 25, nền bronze-100, chữ `#5A4210` 12px, cố định trên cùng |
| Khối AI | Viền nét đứt 1,5px ai-500, nền ai-50, đầu khối có biểu tượng lấp lánh + tên + thẻ "AI đề xuất" |
| Khối người quyết định | Viền liền navy-700, thanh trái 5px, nền surface, thẻ navy "Người quyết định" |
| Khối đội agent | Khối AI chứa sơ đồ + kết luận + cờ cảnh báo + nút "Chạy lại đội agent"; ba trạng thái: chưa chạy (nút Chạy đội agent), đang chạy (nút nhấp nháy, thời gian đã chạy), có kết quả |
| Sơ đồ đội agent | Nút (node) nét đứt ai-500, nối bằng đường nét đứt; node đã xong nét liền; node đang chạy nền ai-50 + vòng nhấp nháy; node cuối "Người quyết định" viền navy liền, tách hẳn |
| Dòng thời gian | Đường dọc 2px; chấm 16px: người = viền navy liền, AI = viền ai-500 nét đứt, hiện tại = nền đồng; giờ Plex Mono 11px |
| Chat | Tin người dùng nền navy bo trên-trái-phải; tin trợ lý khối AI (nét đứt) kèm thẻ nguồn Plex Mono; cuối tin có câu giới hạn trách nhiệm |
| Skeleton | Thanh `--paper-2` ↔ `--surface-2` lướt 1,4s, hình dạng giống nội dung thật; kèm chữ "Đang tải…" cho trình đọc màn hình |
| Trạng thái rỗng | Minh họa mục 5.6 + tiêu đề h2 + một câu nói điều gì xảy ra + một nút hành động |

## 7. Quy cách từng trang và tiêu chí nghiệm thu

Mỗi mockup: 1366×768 và 1920×1080 (ảnh `/tmp/ds1/after/<tên>-<rộng>.png`). Tiêu chí chung cho mọi trang (kiểm bằng axe-core trong Playwright và đo bằng DevTools): (C1) 0 lỗi axe mức serious/critical; (C2) không cuộn ngang ở 1366; (C3) mọi số tiền và tỉ lệ là Plex Mono, cột số căn phải; (C4) mọi nội dung do AI sinh nằm trong khối AI có thẻ "AI đề xuất" và không có khối người quyết định nào dùng màu tím; (C5) Tab đi hết trang theo thứ tự đọc và thấy focus; (C6) không còn chuỗi "SHB".

| Trang (mockup) | Quy cách | Tiêu chí riêng, đo được |
| --- | --- | --- |
| Đăng nhập (`01-dang-nhap.html`) | Hai nửa: trái navy kẻ dòng sổ + lề đồng, câu giá trị serif 40px và chú giải hai nét (AI nét đứt, người nét liền); phải: tiêu đề, một nút "Đăng nhập bằng tài khoản nội bộ" cao 44, banner nói sẽ chuyển trang xác thực, dòng hỗ trợ. Trang Keycloak dùng theme cùng token | Nút cao ≥ 44px, chiều rộng nội dung phải ≤ 380px; giải thích chuyển hướng hiện trước khi bấm; theme Keycloak dùng cùng nền, nút, phông |
| Việc của tôi (`02`) | Tiêu đề + 2 nút; khối "Cần bạn quyết định" (người) cho việc hạn hôm nay; 4 thẻ chỉ số; bảng có bộ lọc phân đoạn; bỏ cột lặp "Việc của tôi", thay bằng nút hành động theo bước | Màn đầu 1366×768 thấy khối quyết định + 4 thẻ + ít nhất 3 hàng bảng; mỗi hàng có đúng một nút hành động; hàng quá hạn có badge danger |
| Hồ sơ vay (`03`, `03b`) | Tiêu đề 34px, stepper, 4 thẻ chỉ số (thẻ số tiền là thẻ chính), khối Đội agent (AI) trước, bảng chỉ số tài chính sau; cột phải: Việc cần làm (người, nút chốt) và dòng thời gian. `03b` là trạng thái đang chạy | Màn đầu 1366×768 thấy tiêu đề, stepper, 4 thẻ chỉ số, khối đội agent và nút chốt; khoảng cách giữa các khối ≥ 24px; ở `03b` có thời gian đã chạy và node đang chạy; khối quyết định không dùng tím |
| Soạn đề xuất (`04`) | 3 cột: mục lục phần (200px), form (tối đa 640px), gợi ý trợ lý (AI, 340px); lỗi ô inline nêu nguyên nhân | Độ rộng ô nhập ≤ 640px; ô lỗi có `aria-invalid` + gợi ý đỏ; có nút Lưu nháp và Gửi thẩm định cùng hàng tiêu đề |
| Đối chiếu tài liệu (`05`) | Banner nói trường đọc là AI đề xuất; trái: danh mục tài liệu + badge; giữa: bảng so Hồ sơ và Tài liệu, hàng lệch nền warn-100 + nút xác nhận; dưới: giải thích lệch (AI) | Trường lệch nổi ở hàng riêng (nền warn); giá trị lệch in đậm; nút "Xác nhận giá trị đọc từ tài liệu" và "Giữ giá trị trong hồ sơ" luôn đi cùng |
| Dashboard Tổng quan (`06`) | 4 thẻ chỉ số, thẻ chính 34px có vạch đồng; biểu đồ cột theo tuần (cột cuối màu đồng); trạng thái các lượt; bảng theo agent | Chỉ số chính ≥ 1,3 lần các thẻ khác; biểu đồ có `role=img` + mô tả; tổng = tổng các trạng thái |
| Dấu vết một ca (`07`) | Sơ đồ chạy (AI) + bảng các bước, hàng Validation nền ai-50 | Mỗi bước hiện thời điểm Plex Mono, công cụ, kết quả, thời gian ms; có nút tải JSON |
| So sánh hiệu năng (`08`) | Hai thẻ: đội agent (khối AI) và mô hình đơn lẻ (nét đứt xám), bảng chênh lệch có màu và dấu + / −; một câu kết luận trung thực | Chênh lệch dương xấu tô danger (thời gian, chi phí), dương tốt tô ok; có câu nêu cả ưu và nhược |
| Chat (`09`) | Cột lịch sử 260px; khung chat: tin người navy, tin trợ lý khối AI có thẻ nguồn; ô nhập cố định đáy | Mỗi tin trợ lý có thẻ "AI đề xuất"; khi thiếu dữ liệu nói rõ chưa có; ô nhập cao 38 |
| Nhật ký kiểm toán (`10`) | Bộ lọc một hàng; bảng chỉ đọc, cột Nguồn phân biệt "AI đề xuất" và "Người"; chân bảng có số dòng và trang | Cột thời điểm Plex Mono; không có nút sửa/xóa; lọc 4 trường trong một hàng ở 1366 |
| Trạng thái (`11`) | Rỗng, 403, 404, lỗi, đang tải, toast | Mỗi trạng thái có minh họa + tiêu đề + 1 câu + 1 hành động; lỗi nói dữ liệu không mất |
| Khách hàng, Tạo đề xuất, Tra cứu chính sách (chưa có mockup riêng) | Dùng lại khung Việc của tôi (bảng) hoặc Soạn đề xuất (form); Chính sách dùng bảng + khối AI cho câu trả lời tra cứu | Đạt C1 đến C6 |

## 8. Văn phong UX (skill ux-copy)

1. **Nút bắt đầu bằng động từ và nêu kết quả:** "Sửa đề xuất", "Gửi thẩm định", "Chạy đội agent"; không dùng "OK", "Submit".
2. **AI nói rõ vai trò:** luôn dùng "AI đề xuất", "chưa xác nhận"; không viết "AI quyết định" hay "AI phê duyệt". Câu mẫu: "AI chỉ đề xuất, không tự phê duyệt".
3. **Lỗi = nguyên nhân + cách xử lý:** "Kỳ hạn phải từ 1 đến 36 tháng." "Không tải được danh sách hồ sơ. Dữ liệu của bạn không bị mất. Thử tải lại."
4. **Rỗng = chuyện gì + làm gì:** "Chưa có hồ sơ nào. Khi bạn tạo đề xuất vay, hồ sơ sẽ xuất hiện ở đây."
5. **Xác nhận nêu hậu quả:** "Trả lại hồ sơ HSV-2026-00201 cho cán bộ tín dụng?" / nút "Trả lại hồ sơ", "Giữ nguyên".
6. **Đang tải nói thời gian:** "Đã mất 00:38. Thường mất khoảng 1 phút. Bạn có thể rời trang."
7. **Số liệu:** dấu chấm ngăn hàng nghìn, dấu phẩy thập phân, kèm đơn vị "đồng", "tỷ đồng", "tháng"; ngày `dd/MM/yyyy`; giờ 24h.
8. **Ngôi và giọng:** xưng "bạn", ngắn, chính xác, không dùng ngôn ngữ marketing, không dùng dấu chấm than.
9. **Thuật ngữ nhất quán:** "Hồ sơ vay", "Đề xuất", "Đội agent", "Dấu vết", "Người quyết định"; không trộn "case", "proposal" khi tiếng Việt đã đủ.

## 9. Kế hoạch áp vào code

Thứ tự bắt buộc, mỗi bước một nhánh và có kiểm tra đo được:

1. **Token và theme Ant Design** (`frontend/src/theme`, `frontend/src/styles`). Tạo `tokens.css` từ mục 5; `ConfigProvider theme` map: `colorPrimary=#14284B`, `colorInfo=#1D4F91`, `colorSuccess=#1B6A3F`, `colorWarning=#8F5400`, `colorError=#A8281D`, `colorBgLayout=#F5F4EF`, `colorBgContainer=#FDFCF9`, `colorText=#1B2430`, `colorTextSecondary=#434C5A`, `colorBorder=#7F7964` (control), `colorBorderSecondary=#D9D5C8`, `borderRadius=6`, `fontFamily=Be Vietnam Pro…`, `fontSize=14`; component token cho Table (`headerBg=#F8F7F2`), Button, Tabs (`inkBarColor=#B08A3E`). Nạp phông từ Google Fonts (Newsreader 500/600, Be Vietnam Pro 400–700, IBM Plex Mono 400/500, subset vietnamese) hoặc tự lưu bản `woff2` (giấy phép OFL). **Nghiệm thu:** `npm run typecheck && npm run test` pass; `/foundation` hiện đủ token; axe 0 serious.
2. **Khung ứng dụng và đăng nhập** (`app/`, `components/`, `LoginPage`, theme Keycloak): sidebar navy, topbar, dải demo, logo trung tính, thay `SHB`. **Nghiệm thu:** `grep -ri shb frontend/src frontend/public frontend/index.html` rỗng; đăng nhập e2e pass; C1–C6.
3. **Thành phần dùng chung**: thẻ chỉ số, khối AI, khối người quyết định, badge, cờ, bảng sổ cái (`.tbl` gạch kép), sơ đồ đội agent, dòng thời gian, trạng thái rỗng. **Nghiệm thu:** từng thành phần có story/trang `/foundation`, snapshot test.
4. **Từng trang theo thứ tự ưu tiên demo:** Việc của tôi → Hồ sơ vay → Soạn đề xuất → Đối chiếu → Dashboard (3 tab) → Chat → Nhật ký → Chính sách → Khách hàng → trạng thái 403/404/lỗi/rỗng. Mỗi trang đạt tiêu chí mục 7 và `npx playwright test` của trang đó pass, giữ nguyên `data-testid` và luồng nghiệp vụ.
5. **Rà cuối**: axe toàn bộ, chụp lại 1366/1920 so với mockup, đo tương phản các cặp mục 5.8.

Rủi ro: Ant Design Table không có gạch kép sẵn, cần ghi đè CSS module cho `.ant-table-thead > tr > th`; Plex Mono rộng hơn chữ thường nên cột số cần rộng tối thiểu 140px cho số tiền 14 chữ số.

## 10. Bảng tự chấm

### 10.1 design-critique (bản mới)

| Trục | Điểm /5 | Nhận xét | Việc đã sửa trong lúc làm |
| --- | --- | --- | --- |
| Ấn tượng đầu | 4 | Đăng nhập có câu giá trị và lề đồng, nhận ra ngay hai thế giới AI/người ở chú giải; còn thiếu hình minh họa sản phẩm | Nới độ rộng tiêu đề để không xuống dòng từng chữ |
| Phân cấp | 4 | Hồ sơ vay và Dashboard có thẻ chính, màn đầu có thứ tự; Hồ sơ vay 1366 khối đội agent hơi chật | Giảm padding node và độ rộng đường nối |
| Nhất quán | 5 | Một file token, một bộ thành phần cho 12 trang | Thêm kích thước biểu tượng bị thiếu ở thẻ AI và toast |
| Nhịp khoảng cách | 4 | Lưới 4px, 24–32px giữa khối | Đối chiếu bỏ cột thứ ba (bảng bị bóp) |
| Chữ | 5 | Phông Việt đủ dấu ở mọi cỡ, số thẳng cột | Quy tắc serif tối thiểu 16px |
| Màu | 4 | AI tách khỏi người cả bằng nét viền và nhãn; còn phụ thuộc vào người nhìn phân biệt tím và navy ở mức đậm nhạt | Thêm nhãn chữ trong mọi khối |
| Trạng thái | 4 | Có rỗng, 403, 404, lỗi, tải, toast; chưa có mockup trạng thái drawer | |

Mức nặng còn lại: **không**. Còn nhẹ: chưa có mockup riêng cho Khách hàng, Tạo đề xuất, Chính sách (dùng lại khung, đã nêu ở mục 7).

### 10.2 accessibility-review (WCAG 2.1 AA)

| Tiêu chí | Kết quả | Bằng chứng |
| --- | --- | --- |
| 1.4.3 Tương phản chữ | Đạt | Mọi cặp mục 5.8 ≥ 4,86:1 (nhỏ nhất ink-3 / paper-2) |
| 1.4.11 Tương phản thành phần | Đạt sau sửa | Viền ô nhập ban đầu `#B9B3A0` chỉ 2,04:1 → đổi `--control #7F7964` 3,96:1 |
| 1.4.1 Không chỉ dùng màu | Đạt | Badge có chấm + chữ, cờ có hình khác nhau, AI có nét đứt + nhãn chữ |
| 2.4.7 Focus nhìn thấy | Đạt (thiết kế) | `--focus` 2px + 2px, tương phản 8,57:1; cần axe xác nhận khi áp code |
| 2.5.5 Vùng bấm | Đạt có điều kiện | Nút chuẩn 36px; nút nhỏ 30px chỉ trong bảng; mục tiêu thực 44px không đạt ở nút nhỏ (ghi nhận, AA không bắt buộc) |
| 1.3.1 Cấu trúc | Đạt | `nav aria-label`, `role=tablist`, `aria-current`, `aria-invalid`, `role=img` cho biểu đồ, `role=status` cho toast |
| 2.3 Chuyển động | Đạt | `prefers-reduced-motion` tắt mọi animation |
| Tiếng Việt | Đạt | `lang="vi"`, phông có subset vietnamese, kiểm ảnh `/tmp/ds1/vn.png` |

Mức nặng còn lại: **không**. Chưa kiểm bằng trình đọc màn hình và axe-core thật (mockup tĩnh); đưa vào tiêu chí C1 khi áp code.
