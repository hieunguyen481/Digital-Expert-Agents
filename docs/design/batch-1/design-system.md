# SHB AI Assistant – Bộ quy tắc thiết kế dùng chung

Khuôn gốc: `content/02b-ho-so-vay-task.html` (hướng B, "Task-led workspace"). Điểm xuất phát để sao chép: `shell.html`.
Mọi trang mới phải trông như cùng một sản phẩm với 02b. Khi file này và 02b khác nhau, **02b đúng**. Báo lại để sửa file này.
Ngoại lệ: các quy tắc chốt ở đợt sửa 1 (mục 10–19, nguồn `docs/business/rules.md`, F mới nhất) **đứng trên 02b**. Số đo và CSS lấy từ `shell.html` bản hiện tại, không lấy từ bản chép cũ trong trang. Dữ liệu dùng chung lấy từ `content/common.js`.

---

## 0. Ba câu màn hình đầu phải trả lời được

Mọi trang, ở 1440×900 và **chưa cuộn**, phải trả lời được:
1. **Tôi đang ở đâu?** Đối tượng nào, ở bước/trạng thái nào, hạn khi nào.
2. **Tôi cần làm gì tiếp?** Một khối việc nổi bật, mỗi việc bấm vào là tới đúng chỗ làm.
3. **Điều gì đáng lo nhất?** Tối đa 3 mục, xếp theo mức độ.

Mọi thứ còn lại nằm ở mục khác trong mục lục, trong dòng mở rộng hoặc trong tooltip.

**Trang công cụ** (trang không có khối việc `.hero`: đối chiếu tài liệu, tra cứu chính sách, nhật ký, khách hàng, quản trị) trả lời câu 2 bằng **đúng một dòng chữ** `.next-line` ở đầu vùng nội dung:
- Dạng: `Còn <số việc> · <cảnh báo nặng nhất> · Bắt đầu: <việc đầu tiên> ›`, phần "Bắt đầu" là `.link` tới đúng chỗ làm. Ví dụ 05: "Còn 2 mâu thuẫn · 4 cờ Cao · Bắt đầu: Dư nợ vay ›".
- Mọi số tính từ dữ liệu, không gõ tay.
- 14px, không viền, không thẻ, không icon trang trí. **Một dòng** ở 1280 AI mở (`white-space:nowrap`), câu dài thì rút câu.
- Vai trò không có việc: vẫn một dòng, nêu trạng thái, ví dụ "Chế độ chỉ đọc · đủ 16/16 mục bắt buộc".

---

## 1. Tokens

### 1.1 CSS variables (chép nguyên, không thêm màu mới)

```css
:root{
  /* Thương hiệu – cam SHB tiết chế, indigo là màu chủ đạo cho chữ tiêu đề */
  --orange-50:#FFF7F0; --orange-100:#FEEBDD; --orange-200:#FDD3B5; --orange-500:#F37021; --orange-600:#DD5A12; --orange-700:#B9450C;
  --cta:#C44D0E; --cta-hover:#A9410B;           /* nút chính: cam tối để chữ trắng đạt AA. #F37021 chỉ dùng cho điểm nhấn không chứa chữ */
  --navy-50:#F3F3FA; --navy-100:#E1E1F3; --navy-200:#C0BFE7; --navy-500:#4F4DB0; --navy-600:#3C3A96; --navy-700:#2F2E79; --navy-800:#23224F; --navy-900:#1B1A46;
  /* Nền & viền (trung tính ấm) */
  --canvas:#F6F4F0;   /* nền app, cột mục lục */
  --surface:#FFFFFF;  /* header, vùng nội dung, panel AI */
  --soft:#FAF8F5;     /* nhóm nhẹ: thẻ chỉ số, dòng hover, dòng mở rộng */
  --soft-2:#F3F0EB;   /* track thanh tiến độ, nền segmented, nút khóa */
  --border:#EAE3DA; --border-strong:#D9D0C5; --divider:#F0EBE4;
  /* Chữ */
  --text:#18212B; --text-2:#475467; --text-3:#5F6B7A; --text-disabled:#98A2B3;
  /* Trạng thái (chữ trên nền nhạt ≥ 4.5:1) */
  --success:#11734F; --success-bg:#ECFAF4;
  --warning:#94560A; --warning-bg:#FFF6E5;
  --error:#B42318;   --error-bg:#FEF3F2;
  --info:#226189;    --info-bg:#EFF8FC;
  /* AI – màu riêng, không dùng cho việc khác */
  --ai:#5B3FA8; --ai-strong:#4A3191; --ai-bg:#F4F1FC; --ai-border:#CFC3EE;
  /* Hình khối */
  --r:6px; --r-md:8px; --r-lg:12px;
  --shadow-sm:0 1px 2px rgba(35,34,79,.06),0 1px 1px rgba(35,34,79,.03);
  --shadow-md:0 8px 30px rgba(35,34,79,.10);
  --shadow-lg:0 16px 48px rgba(35,34,79,.18);
  /* Khung */
  --rail-w:64px; --toc-w:256px; --ai-w:408px; --topbar-h:56px;
  --sticky-foot-h:0px; /* trang có chân dính đặt bằng chiều cao chân */
  --font:"Be Vietnam Pro", Inter, "Segoe UI", system-ui, sans-serif;
}
```

**Ý nghĩa màu:**
- Navy là màu của tiêu đề và link.
- Cam dùng cho CTA, bước hiện tại, vùng tô sáng và việc cần làm.
- Tím chỉ dùng cho AI.
- Xanh/vàng/đỏ chỉ dùng cho trạng thái.

Không dùng màu để mang nghĩa một mình: luôn kèm icon hoặc chữ.

### 1.2 Chữ

- **Font:** Be Vietnam Pro 400/500/600/700, nạp từ Google Fonts, `line-height:1.55`, `-webkit-font-smoothing:antialiased`. Số liệu dùng `font-variant-numeric:tabular-nums` (class `.num`).
- **Tối đa 3 cấp chữ:**

| Cấp | Cỡ / đậm | Dùng cho |
|---|---|---|
| 1 | 20px / 600, `--navy-800` | Tên đối tượng trên header (h1), tiêu đề khối việc cần làm, giá trị trong thẻ chỉ số |
| 2 | 16px / 600, `--navy-800` | Tiêu đề mục (h2), tiêu đề khối (h3 "Điểm đáng lo nhất") |
| 3 | 14px / 400–600, `--text` | Mọi nội dung. Tiêu đề phụ trong mục dùng 14/600 |

- **Cỡ phụ** không tính là một cấp:
  - 13px `--text-3`: mô tả, số đếm, nhãn bảng, meta.
  - 12px: nhãn nhóm mục lục, nhãn trường trong dòng mở rộng, tooltip, disclaimer.
  - 15px/600 chỉ dùng cho tiêu đề từng việc trong khối việc cần làm và câu kết luận đầu của AI.
- **Cấm:** chữ dưới 12px, chữ VIẾT HOA nhãn nhóm, `letter-spacing` trang trí.
  - **Ngoại lệ duy nhất:** chữ 11px chỉ có ở **2 chỗ**: badge rail (18px) và chấm stepper `.sd` (20px). `.cite` là **12px**. Mọi chỗ khác tối thiểu 12px.
  - `<small>` mặc định của trình duyệt ≈ 11,7px → shell đặt `small{font-size:12px}`. Không dùng `font-size` 10/11px ngoài 2 chỗ trên.

### 1.3 Khoảng cách và mật độ

- Thang 4px: **4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 40**.
- Padding vùng nội dung: 24px trên, 40px hai bên (28px khi panel AI mở), **40px dưới**. Không có rãnh phải, không có `--fab-gutter`, không đệm đáy cho nút nổi (F1). Trang có chân dính (sticky footer) đặt `--sticky-foot-h` = chiều cao chân: đệm đáy và toast tự đẩy lên trên chân (mục 13).
- Khoảng giữa các khối lớn 24–28px. Giữa các mục trong danh sách là 10–14px padding cùng 1 đường `--divider`.
- Dòng bảng: padding 12px. Nút cao 36px, nút nhỏ 30px.
- **Vùng bấm tối thiểu 28px (G7), đo được bằng `getBoundingClientRect` (cả cao và rộng)** cho mọi thứ bấm được: `.askai`, `.link`, `.src`, `.back`, nút `.filters`, nút `.seg`, `#suggest button`, ✕ chip ngữ cảnh, `details.srcs summary` và nút trong đó, `.demo select`, `.chev`.
  - **Cách làm trong dòng chữ:** `min-height:28px` + margin âm để không giãn dòng: `.link,.src,.back{min-height:28px;margin-block:-3px}`, `.askai{padding:4px 8px;margin:-4px -8px}`.
  - **Phần tử nhìn nhỏ hơn 28px:** hộp thật vẫn 28px, phần nhìn thấy thu bằng padding: ✕ chip là `width:28px;height:28px;padding:4px;margin:-4px -4px -4px -2px;background-clip:content-box` (nền hover chỉ tô 20px giữa). **Không dùng `::after` cho ✕ chip**, vì không đo được.
  - **Ngoại lệ duy nhất:** `.cite` nhìn 18px, nới bằng `.cite::after{inset:-5px}`, đo bằng `elementFromPoint` (mục 4.4).
- **Nhóm bằng khoảng trắng và nền nhạt, không dùng viền.** Chỉ có 3 loại đường kẻ: `--divider` giữa các dòng/mục, `--border` dưới thead, `--divider` dưới header và topbar.
  - **Ngoại lệ viền nét đứt, chỉ các chỗ sau:** vùng kéo thả tải tệp `.drop` (`1.5px dashed --border-strong`, bo 12px, nền `--soft`); hộp "Xem thử vai trò" trên topbar (chỉ có trong mockup); gạch chân giá trị chưa xác nhận/cần xác minh (mục 4.2); khối `.ai-block` (mục 4.6).
- Độ rộng chuẩn **1440×900**, `min-width:1280px`, không có cuộn ngang. Nội dung mục có `max-width:1080px`.

---

## 2. App shell

```
┌──────┬──────────────────────────── topbar 56px ───────────────────────────────┐
│ rail │ header trang (1–2 dòng)                                               │
│ 64px ├──────────────┬──────────────────────────────────────┬─────────────────┤
│      │ mục lục 256  │ nội dung (surface, cuộn riêng)       │ AI 0 ↔ 408px     │
│      │ (canvas)     │                                      │ (đẩy, không phủ) │
└──────┴──────────────┴──────────────────────────────────────┴─────────────────┘
```

- `.app` = grid `var(--rail-w) minmax(0,1fr)`.
- `.main` = flex dọc `topbar (56px) · header · banner vai trò · workspace (flex:1)`. Dùng flex, không dùng grid rows, để khối "Không có quyền" chèn vào không làm lệch hàng.
- `.ws` = grid `toc · content · ai`. Khi panel AI mở:
  - viewport ≥ 1360px: cột mục lục thu còn 212px và số đếm trong mục lục bị ẩn;
  - viewport < 1360px: **ẩn hẳn mục lục** (cột 0px, `.toc{display:none}`), mọi trang. Đi giữa các mục bằng khối việc, link và deep link `#sec=` (mục 13);
  - trang có trình xem tài liệu (`.ws.has-viewer`): ẩn hẳn mục lục ở **mọi** viewport (mục 13.1).
- Mọi cột dùng `minmax(0,…)` / `min-width:0`, nếu thiếu sẽ tràn ngang (lỗi đã gặp).
- Trang không cần mục lục (2, 6, 8, 9, 10): bỏ cột toc, nội dung chiếm cả vùng.

### 2.1 Rail trái (64px, nền `--navy-900`)

- Trên cùng là logo "SHB" 36px nền `--orange-500`.
- Các mục là icon 20px trong ô 44×44, có `title` và `aria-label`, cùng tên trang.
- Mục đang chọn: nền trắng 13% kèm vạch cam 3px bên trái.
- **Badge số: một số đo cho mọi trang.** `.rail a .badge{position:absolute;top:4px;right:3px;min-width:18px;height:18px;border-radius:9px;background:rgba(255,255,255,.2);color:#fff;font-size:11px;line-height:1;font-weight:600;display:grid;place-items:center;padding:0 4px}`. Không dùng nền đỏ, không dùng số đo 16px cũ.
- **Trợ lý AI (trang 10)** luôn nằm cuối rail và tách khỏi nhóm trên. Đây là điều hướng sang trang 10; khi trang 10 chưa có file thì mở panel AI ngay trên trang đang xem (C-8), không toast.
- **Trang 1 (Chi tiết hồ sơ vay)** không có mục riêng: mở từ trang 2, 4 hoặc 6. Khi đang ở trang 1, rail tô sáng mục đã dẫn tới đó (mặc định "Việc của tôi").

**Menu theo vai trò.** Số trong ngoặc là số trang. Badge chỉ có ở mục đầu tiên.

| Vai trò | Mục rail (thứ tự) |
|---|---|
| Chuyên viên QHKH | Việc của tôi (2) · Tạo đề xuất vay (3) · Khách hàng SME (4) · Tra cứu chính sách (7) · ⟂ Trợ lý AI (10) |
| Hỗ trợ tín dụng | Việc của tôi (2) · Đối chiếu tài liệu (5) · Khách hàng SME (4) · Tra cứu chính sách (7) · ⟂ Trợ lý AI (10) |
| Chuyên viên Thẩm định | Việc của tôi (2) · Đối chiếu tài liệu (5) · Khách hàng SME (4) · Tra cứu chính sách (7) · ⟂ Trợ lý AI (10) |
| Quản lý rủi ro/Tuân thủ | Hồ sơ chờ ý kiến (2) · Khách hàng SME (4) · Tra cứu chính sách (7) · ⟂ Trợ lý AI (10) |
| Cấp phê duyệt (gồm thành viên HĐTD) | Hồ sơ chờ phê duyệt (2) · Phiên Hội đồng tín dụng (6) · Tra cứu chính sách (7) · ⟂ Trợ lý AI (10) |
| Kiểm toán nội bộ | Hồ sơ vay – chỉ đọc (2) · Nhật ký kiểm toán (8) · Phiên Hội đồng tín dụng – chỉ đọc (6) · Tra cứu chính sách (7) · ⟂ Trợ lý AI (10) |
| Quản trị hệ thống | Quản trị (9) · Nhật ký kiểm toán (8, chỉ phần nhật ký hệ thống) |

- **Icon:** inbox (2), plus (3), building (4), file-check (5), users (6), book (7), clock (8), gear (9), spark (10).
- Quản trị hệ thống **không có** Trợ lý AI và **không thấy** nội dung nghiệp vụ (RLS). Nếu vào trang nghiệp vụ, hiển thị trạng thái "Không có quyền" (mục 4.10).

### 2.2 Topbar (56px, surface, viền dưới `--divider`)

Thứ tự từ trái sang phải:
1. Tên "SHB AI Assistant" (600, navy-800).
2. Ô tìm kiếm: nền `--soft-2`, không viền, cao 36px, rộng tối đa 300px, placeholder "Tìm hồ sơ, khách hàng, MST, điều khoản…". **Viền focus đạt tương phản ≥ 3:1:** `.search:focus-within{outline:2px solid var(--navy-600);outline-offset:0}` (input bỏ outline nên vòng focus nằm trên cả ô). Áp dụng cho mọi ô `.search`, kể cả ô tìm trong `.toolbar`. Không dùng quầng 15% cũ.
3. Khoảng trống.
4. **Hộp "Xem thử vai trò"**, chỉ có trong mockup, `flex:none`: viền nét đứt `--border-strong`, gồm `Vai trò: <select 7 vai trò>` (select **rộng đúng 200px**: `flex:none;width:200px;min-height:28px`, ellipsis, để đổi vai trò không làm topbar nhảy; không có dòng CSS nào khác ghi đè độ rộng này), vạch ngăn, `Trợ lý AI:` cùng segmented đúng 2 nhãn **`Đóng | Mở`** (không dùng Tắt/Bật, Ẩn/Hiện). Quản trị và trạng thái không có quyền: ẩn phần Trợ lý AI.
5. Chuông có chấm đỏ 8px, không ghi số.
6. Avatar 32px kèm tên (13/600) và vai trò (12, text-3), không xuống dòng.

### 2.3 Header trang (tối đa 2 dòng, surface, padding 12px 32px)

- **Dòng 1:** h1 20px (tên đối tượng, tối đa 55% dòng, ellipsis) · meta 14px `--text-3`, `flex:1; min-width:0`, cắt bằng ellipsis, chỉ 3–5 dữ kiện nối bằng " · " và in đậm số tiền chính · cụm nút bên phải `flex:none` (không bao giờ bị ép; meta co trước). Cụm phải: `[Hỏi AI] [nút phụ/ghost] [≤ 1 primary, đứng cuối]` (mục 11). **"Hỏi AI" bắt buộc và đứng đầu cụm với mọi vai trò có AI, mọi trang, kể cả Kiểm toán** (F1, mục 4.7).
- **Dòng 2 (nếu có quy trình):**
  - Stepper ngang chỉ ghi tên bước. Chấm 20px: xong thì nền success-bg kèm dấu ✓; hiện tại thì nền cam, chữ trắng, quầng 4px; chưa tới thì nền soft-2.
  - Bước hiện tại thêm "· tên người phụ trách".
  - Người, ngày, SLA của từng bước để trong `title`/tooltip.
  - Bên phải (`flex:none`): SLA màu `--warning` kèm icon đồng hồ ("Hạn 06/11 17:00 · còn 1 ngày LV", tính bằng `BANK.addWorkdays` + `BANK.dueText`, mục 10.3) và link "Chi tiết ›".
- **Banner vai trò** (chỉ khi người xem không phải người làm chính): một dòng `--info-bg`, chữ `--info`, 13px, ngay dưới header.

---

## 3. Mẫu bố cục trang

### 3.1 Mục lục dọc (thay tab ngang)

- Nhóm 2–3 nhóm, nhãn nhóm 12/600 `--text-3`, không viết hoa. Nhóm đầu luôn là "Việc của bạn".
- Mỗi mục: padding 8×12, bo 8px, không xuống dòng. Mục đang chọn có nền trắng, `--shadow-sm`, chữ 600 navy-800, `aria-current="page"`.
- **Mỗi lúc đúng 1 mục được chọn:** đúng 1 phần tử `aria-current` trong `#toc`, chỉ phần tử đó được tô. Không có kiểu "đang mở" thứ hai (nền, viền, chữ đậm). Một đối tượng (ví dụ một tài liệu) chỉ có **1 dòng** trong mục lục, không lặp ở hai nhóm.
- **Số đếm phải cộng ra được:** số ghi ở mục lục bằng đúng số dòng người dùng đếm được trong phần thân của mục đó (kể cả nhóm đang thu gọn, có ghi "(n)"). Tính từ cùng một dữ liệu, không gõ tay.
- **Số đếm** là chữ 12.5–13px canh phải, **không dùng pill**, viết thường, **luôn có số** (thuật ngữ ở mục 15):
  - mặc định `--text-3`;
  - `--ai` cho "n chưa xác nhận" (bản ngắn "n chưa XN" phải có `title` đầy đủ); `--warning` cho "n cần xác minh" ("n cần XM" + `title`);
  - `--error`/600 cho "n cao · m";
  - ✓ xanh khi xong;
  - icon khóa `--text-disabled` cho mục của bước chưa tới.
  - Icon đứng một mình (✓, khóa, chấm đỏ) luôn có `role="img"` + `aria-label` + `title` (shell `renderToc` đã làm).
- Chấm đỏ 7px sau tên mục khi trong mục có chỉ số "Không đạt".
- Tối đa khoảng 11 mục. Trang có ít hơn 3 mục thì không dùng mục lục.
- Mục mặc định khi vào trang là **"Việc cần làm"** (hoặc tương đương: "Tổng quan việc" ở trang danh sách).
- **Wizard trong mục lục** (trang 04 và mọi wizard sau này): mục `{id, n, wz:<số bước>, done:1}` trong `SECS`.
  - Số bước là **chữ** 13/500 `--text-3` (`.wz-n`) đứng trước tên bước, **không chấm màu/vòng tròn** (tránh hai stepper chồng số với stepper header).
  - Bước đã xong: thay số bằng ✓ xanh (có `aria-label`/`title` "Đã xong").
  - **"Hiện tại" thắng "đã xong":** mục đang mở (`aria-current`) luôn hiện số, chữ navy-800/600, kể cả khi bước đó đã xong.
  - Không dùng thanh tiến độ mini trong mục lục. Thay bằng dòng `.wz-left` màu `--error`: "Còn n mục bắt buộc trước khi gửi" + link tới nhóm cần bổ sung.
  - Tiêu đề bước trong nội dung dùng cấp 1 (20px).

### 3.2 Khối "Việc còn lại" (hero)

- Component chung `.hero` trong `shell.html` (chép nguyên CSS, không tự đo lại): nền `--navy-50`, bo 12px, **padding 20px 24px 12px**; biến thể `.hero.ready` nền `--success-bg`. Bố cục từ trên xuống:
  1. Tiêu đề 20px "Còn N việc trước khi <mốc>" kèm hạn (14, text-3).
  2. **Một** thanh tiến độ 8px (nền trắng, phần đã xong navy-600) kèm "**40%** sẵn sàng · 16/40 hạng mục".
  3. Danh sách việc `.tasks` (≤ 4, cách nhau 6px). Mỗi việc `.task` là `<button>` (hoặc `<a>` khi sang trang khác) nền trắng, bo 10px, padding 10×14, gap 14, grid `32px minmax(0,1fr) auto 20px`:
     - số thứ tự trong vòng tròn 28px nền orange-50 (xong thì ✓ success);
     - tiêu đề 15/600 kèm 1 dòng giải thích 13px;
     - thanh mini 72px cùng "x/y";
     - chevron.
     - Hover đổ `--shadow-md`. Bấm vào thì `go(sec,{filter})` mở đúng mục, lọc sẵn (shell: `data-go` + `data-filter-go`).
  4. Chân khối `.hero-foot` 13px `--text-3`: icon khóa kèm điều kiện mở nút chính.
- Vai trò không có việc thì vẫn hiện khối với tiêu đề "Chưa tới lượt bạn" / "Không có việc đang chờ bạn" / "Chế độ chỉ đọc", một câu giải thích và thanh tiến độ của người đang làm.
- Dưới hero là lưới `1.55fr 1fr` (một cột khi AI mở): **Điểm đáng lo nhất** (≤ 3 mục mức Cao) và **Chỉ số chính** (4 thẻ).

### 3.3 Danh sách cờ theo mức độ

- Gom **mọi** cờ (mâu thuẫn số liệu, Không đạt, tuân thủ, tài liệu quá hạn) về **một** mục "Cờ cảnh báo". Không rải ở nơi khác, nơi khác chỉ link tới đây.
- **Nhóm:**
  - **Cao** – "Xử lý trước khi trình";
  - **Trung bình** – "Cần giải trình";
  - **Thấp** – "Lưu ý, không chặn".
- Đầu nhóm: pill mức độ kèm "còn x/y".
- **Mỗi cờ:** tiêu đề 14/600 · mô tả 1–2 dòng `--text-2` · dòng hành động 13px (link nguồn có icon file, "Xem chỉ số"/"Xem dòng BCTC", "Hỏi AI") · nút phải "Đã xử lý" (`.btn.sm.ok`, có thể hoàn tác "Mở lại").
- Cờ đã xử lý: chữ `--text-3` và gạch ngang tiêu đề.
- Đầu trang có ghi chú tím: "AI chỉ gắn cờ, không kết luận · bạn quyết định cách xử lý".

### 3.4 Bảng ≤ 5 cột kèm dòng mở rộng

- **Tối đa 5 cột dữ liệu** cùng 1 cột tiện ích (không tính). Chuẩn cho chỉ số: **Chỉ số · Giá trị · Ngưỡng · Kết quả · Trạng thái**.
- Bảng chuỗi thời gian (BCTC) được phép có 4 cột năm cùng Trạng thái.
- **Component chung `table.t`** trong `shell.html` (02b, 03, 04 đã dùng; `.tbl` cũ bỏ). `thead`: 13px/500 `--text-3`, padding 8×12, chỉ có viền dưới `--border`. **Ô: padding 12px, `vertical-align:middle` (canh giữa)**, phân cách `--divider`, không viền dọc, không zebra. Lớp có sẵn: `tr.row` (bấm được, hover/mở nền `--soft`), `tr.exp` (dòng mở rộng), `tr.grp` (nhóm dòng), `td.util` (120px), `.nm` (cột tên), `.sub` (dòng phụ 13px), `.val`/`.u` (giá trị/đơn vị), `.chev` (28px), `tr.target`.
- **Không `table-layout:fixed`** cho bảng có cột tên. Cột tên `.nm` `min-width:200px` (tên + dòng phụ 13px `--text-3`). Số canh phải, `.num`, giá trị 600 kèm đơn vị 13px `--text-3`.
- **Cột phụ** (người phụ trách, ngày nhận, mã phụ…) gắn `class="col-aux"`: ẩn khi AI mở; giá trị đó lặp lại trong `<span class="aux-sub">` ở dòng phụ cột tên (chỉ hiện khi AI mở). Mẫu trong `shell.html` (`table.t`).
- Bộ lọc/tìm/sắp xếp phía trên bảng nằm trong `.toolbar` (`flex-wrap`, `min-width:0`), được xuống dòng, không đẩy tràn ngang.
- **Cột tiện ích (120px):** "Hỏi AI" hiện khi hover/focus/mở dòng, kèm chevron 28px xoay 180° khi mở.
- **Dòng mở rộng** (nền `--soft`): lưới 3 cột với nhãn 12px, gồm Công thức · Biên/Δ · Nguồn & chính sách, cùng các dòng rộng (độ nhạy, ghi chú mâu thuẫn, trạng thái đầy đủ "Đã xác nhận bởi …"). Dưới cùng là hàng nút: Xác nhận (hoặc khóa có lý do) và "Hỏi AI về …".
- Trên bảng có bộ lọc segmented "Tất cả n · Chưa xác nhận n · Không đạt n" và chú giải 3 trạng thái (chỉ một lần).
- **Bộ lọc chung `.filters`** (`role="group"`, `data-filters`): nền `--soft-2`, bo 8, padding 3; nút `min-height:28px`, padding 0 12, 13px; nút chọn `aria-pressed="true"` nền trắng, navy-800/600, `--shadow-sm`; số đếm trong `<span class="n">` `--text-3`. Giá trị bộ lọc ghi vào hash `#filter=` (mục 16); giá trị sai → "Tất cả".
- Grid nhóm dòng ("Kết quả kinh doanh") là chữ 13/600 navy, không tô nền.
- Bảng rỗng sau lọc: một dòng 13px `--text-3` "Không còn … trong bộ lọc này."
- **Biến thể bảng wizard** (bảng nhập liệu trong trang 04 và mọi wizard sau này). Vẫn là `table.t`, cùng số đo ô (padding 12px, canh giữa dọc), không tạo class bảng riêng và không ghi đè padding/`vertical-align`. Khác bảng chuẩn ở 3 điểm:
  1. **Tối đa 3 cột hiển thị khi AI mở:** cột tên · giá trị · trạng thái. Cột khác gắn `.col-aux` + `.aux-sub` như bảng chuẩn.
  2. **Không đặt `select`, ô nhập dài, cảnh báo nhiều chữ trong dòng chính:** chuyển xuống `tr.exp` ngay dưới dòng, nhãn 12px. Dòng chính chỉ có chữ, số và trạng thái ngắn.
  3. **Không có cột tiện ích 120px:** nút thao tác (Xác nhận, Hỏi AI về …) đặt trong `tr.exp`. Dòng còn thiếu thao tác bắt buộc thì mở sẵn `tr.exp`.

### 3.5 Thẻ chỉ số (KPI)

- Lưới 2×2, khoảng cách 4px.
- Thẻ là `<button>` nền `--soft`, bo 10px, padding 12×14, bấm vào thì `gotoMetric`.
- Trong thẻ: tên 13 `--text-3` · giá trị 20/600 kèm đơn vị 13 · dòng kết luận 13px ("**Đạt**" xanh / "**Không đạt**" đỏ / "**Đạt, biên mỏng**" warning, kèm "· ngưỡng").
- Thẻ Không đạt thì giá trị màu `--error`.
- Không có sparkline, không có viền.

---

## 4. Thành phần

### 4.1 Nút

| Loại | Class | Khi nào |
|---|---|---|
| Chính | `.btn.primary` (nền `--cta`) | **Chỉ ở header phải, tối đa 1 nút**, là hành động chuyển bước (Trình, Ghi ý kiến, Quyết định). Xem mục 11 |
| Phụ | `.btn` (viền border-strong) | Hành động thường |
| Ghost | `.btn.ghost` (chữ navy) | Hành động phụ trên header (Trả lại QHKH) |
| AI | `.btn.ai` (nền ai-bg, chữ ai) | "Hỏi AI" trên header và trong dòng mở rộng |
| Xác nhận | `.btn.sm.ok` (nền success-bg) | Xác nhận số liệu, Đã xử lý, Xác nhận đưa vào |
| Khóa | `aria-disabled="true"` cùng icon khóa cùng `data-lock="<lý do>"` | Nền soft-2, **chữ `--text-3`** (không dùng `--text-disabled`: không đủ tương phản), `cursor:not-allowed`, hover không đổi màu (kể cả `.primary`) |

- **Nút khóa luôn có lý do.** Lý do hiện bằng tooltip khi rê chuột và **toast khi bấm**. Nút chính đang khóa thì bấm vào dẫn về "Việc cần làm".
- Không dùng `disabled` thật (nếu dùng sẽ mất tooltip và mất focus).
- Trong khu nội dung, thay nút bằng dòng chữ khóa 13px: "🔒 Chỉ Chuyên viên Thẩm định được xác nhận số liệu."

### 4.2 Nhãn trạng thái số liệu

Đây là quy ước toàn hệ thống: chữ 13px, có icon, **không phải pill**.

| Trạng thái | Icon | Màu | Gạch chân giá trị |
|---|---|---|---|
| AI đề xuất (chưa xác nhận) | spark | `--ai` | nét đứt `--ai-border` |
| Đã xác nhận | check-circle | `--success` | không; "bởi <người> · <ngày>" trong `title` và dòng mở rộng |
| Cần xác minh (nguồn mâu thuẫn) | alert | `--warning` | nét đứt `#E8B566` |

- Ô số mâu thuẫn trong bảng: `.cflag`, icon alert kèm số màu warning, `title` ghi nguồn lệch.

### 4.3 Pill

Chỉ được dùng 2 loại pill:
- **"Không đạt"** (`.res.fail`: error-bg, chữ error 600, bo 4px).
- **Mức độ cờ** (`.sev.high|med|low`: Cao / TB / Thấp).

"Đạt" là chữ xanh có ✓, không phải pill. Trạng thái tờ trình ("Hoàn tất", "Đang soạn", "Chưa bắt đầu") là chữ có icon.

### 4.4 Trích dẫn [n]

- `<button class="cite" data-cite="n">`: cao 18px, nền ai-bg, chữ ai **12/600**; hover thì nền ai, chữ trắng. Vùng bấm nới bằng `.cite::after{inset:-5px}` → 28px (mục 1.3).
- **Mọi số AI đưa ra phải có [n] (G15)** trỏ tới nguồn bấm được: tài liệu/trang/trường (`05#doc=…&page=…&field=…`) hoặc § chính sách (`openPolicy`). Số không có nguồn thì không hiển thị.
- Mỗi con số AI đưa ra đều có ít nhất một trích dẫn.
- Danh sách nguồn ở cuối câu trả lời là `<details>` "n nguồn trích dẫn", **mặc định đóng**.

### 4.5 Chip ngữ cảnh

- Chỉ **1 chip** trong thanh "Đang hỏi về": nền orange-50, chữ orange-700, có nút ✕ bỏ ngữ cảnh, tối đa 280px kèm ellipsis.
- Khi đổi ngữ cảnh chip nháy quầng cam (`.pulse`).
- Không có chip thì hiện chip xám "Toàn bộ hồ sơ <mã>".

### 4.6 Thẻ hành động AI

- `.action-card`: nền orange-50, bo 10px, icon 30px nền trắng, tiêu đề 14/600, phụ đề 12px, mũi tên.
- Hành động ghi dữ liệu luôn ghi "– cần xác nhận" / "Chèn ở trạng thái chờ – bạn phải xác nhận".
- Kết quả khi chèn: khối `.ai-block` viền nét đứt tím ("AI đề xuất – chưa xác nhận · từ hội thoại … · n nguồn") kèm [Xác nhận đưa vào] [Sửa] [Loại bỏ]. Sau khi xác nhận, khối chuyển viền liền màu xanh: "Đã xác nhận bởi <người> · <thời điểm> · nguồn giữ nguyên".

### 4.7 "Hỏi AI" tại chỗ

- `.askai`: chữ tím 13/500, icon spark, nền ai-bg khi hover.
- Trong bảng, nút chỉ hiện khi hover/focus-within/dòng mở. Trong danh sách cờ và thẻ thì luôn hiện.
- Mọi "Hỏi AI" mang `data-ask="<loại>|<nhãn ngữ cảnh>"`. Loại **chỉ** gồm: `case`, `metric`, `flag`, `doc`, `policy`, `customer`, `session` (không tự đặt loại mới như `field`: trường số liệu dùng `metric`).
- **Quy ước nhãn (G5):**
  - Nút trên **header** luôn ghi đúng **"Hỏi AI"** (`.btn.ai`).
  - Tại chỗ (dòng mở rộng, cờ, thẻ, trình xem tài liệu) ghi **"Hỏi AI về <đối tượng>"**, ví dụ "Hỏi AI về DSCR", "Hỏi AI về cờ này". Trong cột tiện ích hẹp của bảng được rút còn "Hỏi AI" nhưng `data-ask` vẫn mang nhãn đối tượng.
  - **Mỗi khối tối đa 1 lối vào AI** (một dòng mở rộng, một cờ, một thẻ = 1 nút).
  - **Không có nút AI nổi (F1).** Cấm `.ai-fab`, `#aiFab`, `--fab-gutter`, rãnh phải và mọi nút `position:fixed` mở AI.
  - **Bốn lối vào AI (F1), không tính segmented trên topbar vì chỉ có trong mockup:** nút "Hỏi AI" ở header · mục Trợ lý AI trên rail · `Ctrl J` · "Hỏi AI về <đối tượng>" tại chỗ.
  - **Nút header chép nguyên hằng `AI_BTN` của shell:** `.btn.ai`, nằm trong `#headActions`, `title="Mở Trợ lý AI (Ctrl J)"`, `aria-keyshortcuts="Control+J"`. Trang chỉ được đổi `data-ask`. Selector `#headActions .btn.ai` là đích trả focus (mục 17) nên không đổi class, không bọc vào menu.

### 4.8 Trợ lý AI

- **Đóng:** không hiện gì thêm trên màn hình. Lối vào theo mục 4.7. Tiêu đề panel luôn là **"Trợ lý AI"**, mọi trang, không thêm tên agent hay tên trang.
- **Mở:** panel **408px đẩy nội dung** (cột grid, transition 0.3s), **không có mask, không phủ** lên nội dung đang hỏi. Thứ tự trong panel:
  1. Header: logo tím, "Trợ lý AI" và "Chỉ đề xuất · không ra quyết định", các nút lịch sử / mới / đóng.
  2. "Đang hỏi về" kèm chip.
  3. Tin nhắn.
  4. Gợi ý: 1 hàng, cuộn ngang, nút cao 28px; **mép phải mờ dần 24px** bằng `mask-image:linear-gradient(to right,#000 calc(100% - 24px),transparent)` để người dùng biết còn gợi ý (G6).
  5. Ô nhập, Enter để gửi. **Placeholder ≤ 40 ký tự** (ví dụ "Hỏi về hồ sơ này… (@ để gắn tài liệu)").
  6. Disclaimer 12px, **đúng 1 dòng, câu cố định cho mọi trang:** "AI có thể sai. Chỉ đưa vào hồ sơ sau khi bạn xác nhận." (`white-space:nowrap`).
- **Câu trả lời AI:**
  1. Dòng meta: tên agent · giờ · "AI đề xuất – chưa xác nhận" (tím).
  2. **Câu kết luận 15/600** (≤ 2 dòng).
  3. Một dòng cách tính có [n].
  4. Tối đa 1 bảng nhỏ ≤ 4 dòng (`.sgrid`).
  5. Giả định cần xác nhận (warning, gạch chân nét đứt).
  6. Nguồn (`<details>` đóng).
  7. Thẻ hành động.
  8. Phản hồi.
- **Mở bằng:** "Hỏi AI" ở header, "Hỏi AI về <đối tượng>" tại chỗ, `Ctrl J`, nút segmented trên topbar (chỉ có trong mockup).
- **Đóng bằng:** nút ✕, `Ctrl J`, `Esc` (khi không còn drawer/form nào mở – thứ tự ở mục 17).
- **Panel đóng không nhận focus (G2):** `setAI(false)` đặt `#ai.inert = true` + `aria-hidden="true"`; HTML khởi tạo có sẵn `inert`. Mở thì bỏ `inert`, focus ô nhập. Trả focus khi đóng: mục 17.
- Vai trò không có AI (Quản trị) hoặc trang "Không có quyền": `Ctrl J`/nút nào cũng không mở panel, chỉ toast.
- **Trang 10 (Trợ lý AI toàn màn hình)** dùng cùng thành phần tin nhắn. Bên trái là danh sách hội thoại theo hồ sơ (thay mục lục), bên phải là khung chat rộng tối đa 760px.

### 4.9 Drawer, tooltip, toast

- **Drawer** (điều khoản chính sách, chi tiết phụ): bên phải, rộng 480px, có mask navy 28%, Esc để đóng. **Focus (G2):** drawer đóng có `inert` (+ `visibility:hidden` sau khi trượt ra); mở thì focus nút đóng (`#drawerClose` hoặc `[data-close]`); đóng thì trả focus về nút đã mở nó. **Drawer có mask mở thì `.app` đặt `inert`, đóng hết drawer thì bỏ** (mục 17). Không đặt "Hỏi AI" trong drawer có mask, vì panel AI nằm trong `.app`. Dùng `openDrawer(el)` / `closeDrawer(el)` của shell cho mọi drawer (trình xem tài liệu, lịch sử…), không tự viết lại. Điều khoản được trích dẫn thì tô nền cam 12% kèm vạch cam 3px bên trái. Drawer là **thứ duy nhất được phủ** lên nội dung.
- **Tooltip:** dùng `title` native trong mockup, `<Tooltip>` trong app. Nội dung: người/ngày/SLA, công thức, lý do khóa.
- **Toast:** đáy giữa, nền navy-900, chữ trắng 14px, icon ✓, hiện 2.8s, tối đa 620px.
  - Mọi thao tác ghi dữ liệu đều có toast, nêu rằng thao tác đã được ghi nhật ký với tên người làm.
  - Bấm nút khóa thì toast ghi lý do.

### 4.10 Trạng thái trang và khối

| Trạng thái | Hiển thị |
|---|---|
| Rỗng | Component chung `.state` (shell): icon 40px `--text-3`, tiêu đề h2 16/600 (margin 12/0/4), 1 câu giải thích (margin dưới 16), tối đa 1 nút (icon trong nút 16px). Căn giữa, margin 48px auto, rộng tối đa 520px |
| Đang tải | Skeleton đúng hình khối (thanh xám `--soft-2` có shimmer). Không dùng spinner toàn trang. Riêng AI dùng "đang phân tích…" trong tin nhắn |
| Lỗi | Khối `--error-bg` 1 dòng: chuyện gì xảy ra · nút "Thử lại". Không xóa dữ liệu đang có |
| Không có quyền | Component dùng chung `#noAccess`, spec đầy đủ ở mục 12 (h1 trung tính, không meta, khiên, tiêu đề, lý do, đúng 1 nút có icon, nền `--canvas`) |
| Chưa tới bước | Mục lục có icon khóa. Trong mục là `.note` có icon khóa: "Hồ sơ chưa được trình …, ý kiến sẽ do <người> ghi tại đây" |

---

## 5. Quy tắc phân quyền trên UI

1. **Ẩn những gì không có quyền xem, khóa những gì có quyền xem nhưng chưa được làm.**
   - Menu và trang ngoài vai trò: không hiện.
   - Nút hành động thấy được nhưng chưa được làm: khóa kèm lý do.
2. Mỗi màn có **đúng 1 người làm chính** theo bước. Người khác thấy:
   - banner vai trò;
   - khối việc ghi "Chưa tới lượt bạn" hoặc tương đương;
   - nút Xác nhận/Đã xử lý thay bằng dòng khóa kèm lý do.
3. **Tách bạch thẩm định – quyết định.** Người đã tham gia các bước trước bị khóa phê duyệt/biểu quyết, có ghi lý do. Trang phê duyệt và phiên HĐTD liệt kê "Bị loại trừ: …".
4. **Kiểm toán nội bộ:** chỉ đọc toàn bộ, header là `[Hỏi AI] [🔒 Chỉ đọc]` (không có nút hành động), banner ghi "Mọi thao tác xem được ghi vào nhật ký kiểm toán".
5. **Quản trị hệ thống:** không thấy dữ liệu nghiệp vụ, không có Trợ lý AI. Header nghiệp vụ, mục lục, nút "Hỏi AI" và phần Trợ lý AI của hộp xem thử đều ẩn.
6. **AI không có quyền cao hơn người dùng.** Ngữ cảnh và trích dẫn chỉ gồm những gì người đó xem được. AI không bao giờ có nút Duyệt/Từ chối hay soạn kết luận phê duyệt.
7. Đổi vai trò (`applyRole`) phải cập nhật cùng lúc: rail, tên/avatar, nút header, banner, khối việc, khóa trong nội dung.

## 6. Liên kết 2 chiều trang ↔ chat

1. **Trang → chat:** mọi "Hỏi AI" gọi `askAI(type,label)`. Hàm này đặt chip ngữ cảnh (nháy), mở panel và đổi gợi ý theo loại. Nội dung đang hỏi vẫn nằm nguyên trong vùng nội dung bên cạnh.
2. **Chat → trang:**
   - [n] và các dòng trong "n nguồn" gọi hàm mở đúng nơi: `gotoDoc(id,key)` mở tài liệu và tô viền cam dòng trích; `gotoMetric(id)` mở bảng, mở dòng, gắn `.target` (nền orange-50, vạch cam trái) và nháy `.flash` 2.4s; `openPolicy(§)` mở drawer và tô điều khoản.
   - Panel AI vẫn mở trong lúc đó.
3. **Thẻ hành động** ghi vào trang luôn ở trạng thái chờ ("AI đề xuất – chưa xác nhận") cho tới khi người có quyền xác nhận.
4. **Deep link** dạng hash, mọi trang phải hỗ trợ:
   - `#sec=<mục>` **chỉ áp dụng cho trang có mục** (có `SECS` và `.sec`). Trang không có mục (`.ws.no-toc`) đặt `S.sec = null`, không gọi `go()`, bỏ qua khóa `sec` và không ghi khóa này vào hash;
   - `#metric=<id>`, `#row=<id>`, `#flag=<id>`, `#doc=<id>`, `#page=<n>`, `#field=<khóa>`, `#cite=<n>`, `#from=hsv`; nhiều khóa nối bằng `&` (định dạng chuẩn 02b ↔ 05 ở mục 10.4);
   - `#role=<vai trò>`, `#ai=open|off`;
   - riêng từng trang thì thêm khóa riêng (ví dụ `#report=1`, `#draft=DX-2026-00412`).
   - Trang nghe `hashchange` (đổi hash trong cùng file không tải lại trang).
   - Mã vai trò: `qhkh, httd, tdinh, ruiro, pheduyet, kiemtoan, quantri`.
5. Hội thoại AI được lưu vào nhật ký đối tượng: nhật ký hiển thị "X hỏi Trợ lý AI: …" kèm link "Mở hội thoại".

## 7. Ánh xạ Ant Design 6

| Thành phần | AntD 6 |
|---|---|
| Tokens | `ConfigProvider theme.token`: `colorPrimary:#C44D0E`, `colorLink:#2F2E79`, `colorSuccess/Warning/Error/Info` như trên, `colorBgLayout:#F6F4F0`, `colorBorderSecondary:#F0EBE4`, `borderRadius:8`, `fontFamily:'Be Vietnam Pro'`, `fontSize:14`, `fontSizeHeading4:20`, `fontSizeHeading5:16`, `controlHeight:36`, `controlHeightSM:30` |
| Rail | `Layout.Sider collapsed collapsedWidth={64} theme="dark"` cùng `Menu inlineCollapsed`, `Badge` |
| Topbar | `Layout.Header` cùng `Input` (variant="filled"), `Select` (variant="borderless"), `Segmented`, `Badge dot`, `Avatar` |
| Header trang | `Flex` cùng `Typography.Title level={4}`, `Typography.Text type="secondary" ellipsis`, `Steps size="small" type="inline"` |
| Mục lục | `Menu mode="inline" items=[{type:'group'}]` (label phụ là số đếm, `extra`) |
| Khối việc | `Progress showInfo={false} size={[,8]}` cùng `List` (item là `Button type="text" block`) |
| Bảng | `Table size="middle" bordered={false} pagination={false} expandable={{expandedRowRender, expandRowByClick:true}}`, lọc bằng `Segmented` |
| Cờ | `List` nhóm theo mức độ, pill là `Tag bordered={false} color="error|warning|default"` |
| Trạng thái số liệu | Component riêng `<DataStatus status="ai|ok|verify" by at/>` (Text có icon, không dùng Tag) |
| Trợ lý AI panel | `Splitter` panel phải `collapsible defaultSize={408}`, hoặc `Drawer mask={false} push getContainer={workspace}` |
| "Hỏi AI" ở header | `Button` (không dùng `FloatButton`, F1), phím tắt `Ctrl J` |
| Drawer chính sách | `Drawer placement="right" width={480}` |
| Nút khóa | `Button disabled` bọc trong `Tooltip title={lý do}` (bọc `span` để tooltip vẫn chạy), `onClick` trên span gọi `message.info(lý do)` |
| Toast | `message.success()` / `message.info()` |
| Rỗng/tải/lỗi | `Empty`, `Skeleton`, `Alert type="error" action={<Button>Thử lại</Button>}`, `Result status="403"` cho không có quyền |
| Chip | `Tag closable bordered={false}` |
| Nguồn AI | `Collapse ghost size="small"` hoặc `<details>` |

## 8. KHÔNG làm (nguyên nhân bản 01 quá dày)

- ✗ Viền/thẻ/pill bao quanh mọi thứ, mọi khối cùng trọng lượng thị giác. Hãy nhóm bằng khoảng trắng và nền nhạt.
- ✗ Header 8 trường dạng lưới Descriptions. Tối đa 3–5 dữ kiện trên 1 dòng meta.
- ✗ Stepper ghi tên, người, ngày, SLA ở mọi bước. Chỉ ghi tên, chi tiết để trong tooltip và mục Quy trình.
- ✗ Tab ngang (≥ 6 tab sẽ tràn). Dùng mục lục dọc có số đếm.
- ✗ Bảng 7 cột có công thức, chip nguồn và 2 nút trên mỗi dòng. ≤ 5 cột, phần còn lại để trong dòng mở rộng.
- ✗ Panel AI luôn mở chiếm cột cố định. Mặc định đóng, mở theo yêu cầu, đẩy nội dung.
- ✗ Nhiều chip ngữ cảnh. Chỉ 1 chip.
- ✗ Câu trả lời AI dài có bảng lớn và danh sách nguồn mở sẵn.
- ✗ Cờ cảnh báo rải ở nhiều tab, nhiều thẻ.
- ✗ Font 12.5–13px cho nội dung. Nội dung 14px.
- ✗ Hơn 3 cấp chữ, chữ VIẾT HOA nhãn nhóm.
- ✗ Hơn 1 nút primary trên một màn, hoặc primary nằm trong nội dung / chân trang thay vì header phải. Dùng màu cam cho thứ không phải hành động hoặc điểm nhấn.
- ✗ Nút AI nổi, rãnh phải, đệm đáy dư (F1).
- ✗ Viết tay badge, SLA, hạn, ngưỡng phê duyệt, bảng trang → file trong trang. Luôn lấy từ `common.js`.
- ✗ Hạn rơi vào thứ Bảy/Chủ nhật. Ngày gõ tay không qua `BANK.addWorkdays`.
- ✗ Trang "không có quyền" vẫn lộ tên khách hàng, meta, stepper hoặc nút hành động.
- ✗ Màu tím cho thứ không phải AI. Đỏ cho thứ không phải lỗi hoặc Không đạt.
- ✗ Emoji làm icon. Chỉ dùng SVG stroke 1.8 (bộ icon trong `shell.html`).
- ✗ `disabled` không lý do. Nút biến mất không giải thích (trừ khi vai trò không được xem).
- ✗ AI kết luận Duyệt/Từ chối, hoặc ghi số vào hồ sơ mà không có bước xác nhận.

## 9. Checklist trước khi nộp một trang

- [ ] Ảnh 1440×900, chưa cuộn, trả lời được 3 câu ở mục 0. Không có cuộn ngang. Trang công cụ có đúng một dòng `.next-line`.
- [ ] **≤ 30 phần tử bấm được ở màn đầu.** Đo ở 1440×900, AI đóng, chưa cuộn, vai trò làm chính: `a, button, select, input, textarea, summary` nhìn thấy, nằm trong viewport, thuộc `.page-head`, `.toc` hoặc `.content` (không tính rail, topbar, panel AI). Báo số đo.
- [ ] **Số đếm trong mục lục cộng ra được từ phần thân** (mục 3.1). Mỗi lúc đúng 1 `aria-current` trong `#toc`.
- [ ] Không có `.ai-fab`, `#aiFab`, `--fab-gutter`; đệm đáy 40px; mọi vai trò có AI có "Hỏi AI" đứng đầu header (mục 4.7).
- [ ] **1280 + AI mở (mục 13):** đo ở 1280×800 và 1440×900, AI mở và đóng: `document.documentElement.scrollWidth <= innerWidth`, không chữ đè chữ, không chữ bị cắt (trừ ellipsis có chủ đích ở meta/chip). Mục lục ẩn hẳn khi AI mở ở 1280.
- [ ] Header ≤ 2 dòng. ≤ 1 nút primary, nằm ở header phải (mục 11).
- [ ] Nạp `common.js`; không có hằng nào trùng `BANK` trong trang; rail badge = `BANK.BADGES`; mọi hạn qua `BANK.addWorkdays`, không có hạn thứ Bảy/CN (mục 10).
- [ ] Mọi `[data-page]` đi qua `BANK.navigate`; trang chưa có file → toast "Trang <tên> sẽ có ở đợt sau".
- [ ] Vai trò không được xem trang → component "Không có quyền" đúng mục 12.
- [ ] Câu chữ nghiệp vụ không trái Q1–Q12, E1–E9, F1–F12 (mục 14).
- [ ] Mỗi bảng ≤ 5 cột dữ liệu, có dòng mở rộng.
- [ ] Mọi số do AI đưa ra đều có trạng thái và nguồn bấm được.
- [ ] Thử đủ 7 vai trò bằng "Xem thử vai trò": menu đúng bảng ở mục 2.1, nút khóa có lý do.
- [ ] Panel AI mở vẫn thấy nội dung đang hỏi. [n] nhảy tới đúng chỗ và tô sáng.
- [ ] Có trạng thái rỗng/tải/lỗi/không quyền cho khối dữ liệu chính.
- [ ] Deep link `#sec` (nếu trang có mục), `#role`, `#ai=open` hoạt động. Đổi vai trò/bộ lọc/mục/AI/tài liệu → hash cập nhật bằng `history.replaceState`; **tải lại giữ nguyên** (mục 16).
- [ ] Bàn phím (mục 17): Tab không vào panel AI/drawer đang đóng; Esc đóng drawer → form → panel AI; drawer mở focus nút đóng và `.app` inert, đóng thì bỏ inert và trả focus; đóng AI bằng ✕ trả focus đúng nút đã mở.
- [ ] Không chữ < 12px (trừ badge rail và `.sd`; `.cite` 12px); vùng bấm ≥ 28px đo bằng `getBoundingClientRect` (trừ `.cite`); viền focus ô tìm kiếm ≥ 3:1; nút khóa nào cũng có `title`.
- [ ] Thuật ngữ đúng bảng mục 15; mã/§ chính sách đúng mục 18; tên doanh nghiệp/ngân hàng hư cấu.

---

# Quy tắc chốt ở đợt sửa 1 (bắt buộc cho đợt 2, 3)

Nguồn duy nhất: `docs/business/rules.md`. Mâu thuẫn giữa file đó và mục dưới → file đó đúng. Điều chưa được trả lời → không tự bịa nghiệp vụ, ghi vào "Câu hỏi mở".

## 10. Dữ liệu dùng chung (`content/common.js`)

### 10.1 Nạp

- Mọi trang (file nằm trong `content/`) nạp `<script src="common.js"></script>` **trước** script của trang. Dùng qua `window.BANK`.
- `shell.html` nằm ngoài `content/` nên có khối tự chọn đường dẫn; khi sao chép sang `content/` được thay bằng dòng trên.

### 10.2 Không định nghĩa lại

Trong trang **cấm** khai báo lại hoặc gõ tay giá trị của:

| Dữ liệu | Dùng |
|---|---|
| Badge "Việc của tôi" | `BANK.BADGES[vai trò]` (qhkh 4 · httd 3 · tdinh 3 · ruiro 2 · pheduyet 3). Rail, header "n hồ sơ chờ bạn" và số dòng "chờ bạn" ở 03 phải bằng số này |
| SLA từng bước | `BANK.SLA` (kiemtra 2 · thamdinh 5 · ruiro 3 · pheduyet 2 · bosung_khach 5 ngày LV) |
| Trang → file | `BANK.PAGE_FILE`, `BANK.hrefFor`, `BANK.navigate` |
| Cấp phê duyệt | `BANK.TIERS`, `BANK.tierOf(tổng cấp tín dụng)` |
| Lịch, hôm nay | `BANK.TODAY` (Thứ Năm 05/11/2026), `BANK.HOLIDAYS`, `BANK.isWorkday` |
| Hiệu lực CIC | `BANK.cicValidUntil(ngày tra cứu)` (30 ngày, tính cả ngày tra cứu) |

Cần thêm hằng dùng chung → đề xuất sửa `common.js`, không tự thêm vào trang.

### 10.3 Ngày và hạn

- Hạn = `BANK.addWorkdays(ngày nhận, BANK.SLA.<bước>)`, lúc **17:00**. **Không hạn nào rơi vào thứ Bảy/Chủ nhật.**
- "còn n ngày LV" = `BANK.dueText(hạn)` (0 → "hạn hôm nay", âm → "quá hạn n ngày LV"). Ngày hiển thị: `BANK.fmtDate`.
- Mọi ngày "Nhận", "Gửi", "Xong" cũng phải là ngày làm việc. Cuối tuần gần: 31/10, 01/11, 07/11, 08/11.
- Shell có mẫu: `data-due="YYYY-MM-DD|<khóa SLA>"` → `renderDue()` điền "dd/mm 17:00 · còn n ngày LV".

### 10.4 Liên kết 2 chiều 02b ↔ 05 (định dạng hash)

Khóa hash chuẩn: `role, doc, page, field, cite, from, sec, metric`. Tạo URL bằng `BANK.hrefFor(trang, {…}, S.role)`, không ghép chuỗi tay.

| Chiều | Từ | URL |
|---|---|---|
| 02b → 05 | mọi nút nguồn số liệu: dòng chỉ số mở rộng, cờ, [n] trong panel AI | `05-doi-chieu-tai-lieu.html#role=<r>&doc=<id>&page=<p>&field=<f>&cite=<n>&from=hsv&sec=<mục 02b>` |
| 05 → 02b | link "Hồ sơ vay ›"; nút "Về <mục> trong hồ sơ" (chỉ khi có `from=hsv`) | `02b-ho-so-vay-task.html#role=<r>&sec=<mục>&metric=<id>` |

- 05 giữ nguyên id tài liệu và khóa trường hiện có (chỉ thêm `CIC-KH`). Trích dẫn số liệu CIC trỏ tới `CIC`, không trỏ `CIC-KH`.
- Trang nhận phải xử lý các khóa này lúc tải và khi `hashchange`.

### 10.5 Điều hướng

- Mọi `[data-page]` (rail, nút, link) gọi `BANK.navigate(page, params, S.role)`, tham số đặt ở `data-params="doc=CIC&page=1"`.
- `navigate` trả `false` (trang chưa có file) → toast **"Trang <tên> sẽ có ở đợt sau"**. Không dùng toast "Mockup: chuyển tới…".

## 11. Nút chính (primary) – D4

- **Primary = hành động chuyển bước, luôn ở header phải, mọi trang, tối đa 1 nút, đứng cuối cụm.**
- Trong nội dung chỉ lặp lại dưới dạng **dòng khóa** (`.lock-line`) hoặc **link**, không lặp nút primary. Chân trang/chân wizard không có primary.
- Chưa đủ điều kiện → **giữ nút**, khóa: `aria-disabled="true"` + icon khóa + `data-lock="<lý do>"` (tooltip và toast).
- Không có hành động chuyển bước → **không có primary** (không "mượn" primary cho hành động thường).
- **"Hỏi AI" không phải primary**, nhưng có ở cụm phải của mọi vai trò có AI, ở mọi trang kể cả dòng 03 và "trang công cụ" trong bảng dưới. Thứ tự: `[Hỏi AI] [nút phụ/ghost…] [primary]`. Thay thế câu "nút AI nổi" của D4 (F1).

| Trang | Primary ở header phải |
|---|---|
| 02b Chi tiết hồ sơ | Giữ như hiện tại (theo vai trò của bước). "Trả lại QHKH" (F6) là nút `.btn.ghost` hoặc mục menu rõ ràng, không phải primary |
| 03 Việc của tôi (trang chủ) | **Không có** primary chuyển bước. QHKH có "Tạo đề xuất vay" ở header (giữ nguyên), đứng sau "Hỏi AI" |
| 04 Tạo đề xuất vay (wizard) | Bước 1–4: **"Tiếp: <bước sau>"**. Bước 5: **"Gửi Hỗ trợ tín dụng"**, khóa kèm lý do tới khi đủ điều kiện. Chân wizard chỉ còn "Quay lại" |
| 05 Đối chiếu tài liệu | HTTD: **"Chuyển Thẩm định"**, khóa kèm lý do tới khi mọi mục đạt hoặc đã có **"Đề xuất ngoại lệ" kèm lý do** (E1, F5; cấp phê duyệt chấp thuận hoặc từ chối cùng lúc với quyết định). Sau khi đã chuyển: thay nút bằng dòng trạng thái "Đã chuyển Thẩm định <ngày giờ>". Vai trò khác: không primary; nút về hồ sơ là link |
| Trang công cụ (tra cứu chính sách, nhật ký, khách hàng, quản trị, trợ lý AI) | Không có primary chuyển bước. Hành động thường dùng `.btn`/`.btn.ghost` |

- **Nút khóa:** chữ `--text-3`, nền `--soft-2`, không đổi màu khi hover (mục 4.1).

## 12. Trạng thái "Không có quyền" – D3

Một component dùng chung cho mọi trang (`#noAccess` + `renderNoAccess()` trong `shell.html`). Không tự vẽ bản khác.

- **h1** = tên trang trung tính (`PAGES[PAGE_ID].n`, ví dụ "Chi tiết hồ sơ vay"). **Không meta, không stepper, không tên khách hàng, không nút header, không banner vai trò, không Trợ lý AI** (cả "Hỏi AI" và segmented đều ẩn).
- Thân: nền `--canvas`, căn giữa, rộng tối đa 520px: icon **khiên** 40px `--text-3` · tiêu đề 16/600 · lý do 1–2 câu · **đúng 1 nút, có icon**.

| Vai trò | Tiêu đề | Nút |
|---|---|---|
| Quản trị hệ thống | "Không có quyền xem nội dung nghiệp vụ" (lý do: chỉ quản lý người dùng, phân quyền, ngưỡng, cấu hình AI; nội dung tín dụng ẩn theo RLS) | **"Mở Quản trị"** + icon bánh răng → trang 9 |
| Vai trò nghiệp vụ không thuộc phạm vi trang | "Không có quyền xem trang này" (lý do nêu tên trang và vai trò) | "Về Việc của tôi" + icon inbox → trang 2 |

**Mọi trang dùng đúng markup, CSS và câu chữ này (C-2), không có biến thể:** `.noaccess#noAccess` + `NO_ACCESS` + `renderNoAccess()` chép nguyên từ shell. Trang chỉ được ghi đè `reason`, không đổi tiêu đề, nhãn nút hay icon. Không thêm dòng phụ, link phụ hay thẻ bao.

## 13. Bố cục ở 1280px và khi AI mở – D5

Quy tắc chuẩn (đã có sẵn trong `shell.html`):

1. **Mục lục:** AI mở và viewport < 1360px → ẩn hẳn (không thu 212px). ≥ 1360px → 212px, ẩn số đếm.
   **Ngoại lệ, trang có trình xem tài liệu (05 và trang tương tự):** trình xem cần chiều ngang nên AI mở thì ẩn hẳn mục lục ở **mọi** viewport, kể cả ≥ 1360px. Cách làm: thêm class `has-viewer` vào `.ws`, shell lo phần còn lại. Chỉ ẩn khi AI mở; AI đóng thì mục lục hiện lại.
2. **Bảng:** không `table-layout:fixed` cho cột tên; `table.t .nm{min-width:200px}`; cột phụ `.col-aux` ẩn khi AI mở, giá trị gộp vào `.aux-sub` ở dòng phụ cột tên.
3. **Thanh công cụ:** `.toolbar` `flex-wrap:wrap; min-width:0`, con `min-width:0`.
4. **Header:** cụm phải `flex:none`; meta `min-width:0` + ellipsis; h1 tối đa 55% + ellipsis; `.h2row .right` `flex:none`.
5. **Topbar:** hộp xem thử vai trò, chuông, người dùng `flex:none`; ô tìm kiếm co từ 300 xuống 160px.
6. **Không có nút AI nổi (F1):** không rãnh phải, không `--fab-gutter`, không đệm đáy dư. `.sec` có đệm đáy 40px. Trang có chân dính đặt `--sticky-foot-h` để đệm đáy và toast nằm trên chân. Được đặt nút/link ở góc phải dưới vùng nội dung.
7. Mọi cột grid/flex chứa nội dung: `minmax(0,…)` / `min-width:0`.

**Kiểm tra bắt buộc (đo được)** ở **1280×800** và **1440×900**, mỗi cỡ với **AI mở và AI đóng**, ít nhất với vai trò làm chính, vai trò chỉ xem và Quản trị:
- `document.documentElement.scrollWidth <= innerWidth`;
- không chữ đè chữ (hộp các con của topbar, dòng h1, dòng stepper không giao nhau);
- không chữ bị cắt (`scrollWidth <= clientWidth` với phần tử chữ, trừ ellipsis có chủ đích);
- không lỗi JS / không lỗi tải tài nguyên;
- không có nút AI nổi; vùng bấm ≥ 28px (mục 1.3).

## 14. Quy tắc nghiệp vụ đã chốt (tóm tắt)

Nguồn: **`docs/business/rules.md` mục A, E, F** (đọc bản đầy đủ trước khi viết câu chữ nghiệp vụ). Thứ tự ưu tiên **F > E > Q**: Q1 và Q5 đã được E1, E5 sửa; E1 được F5 siết; E2 được F7 làm rõ.

| # | Quy tắc |
|---|---|
| Q1 | Thiếu/hết hiệu lực → **chặn** ở "QHKH gửi" và "HTTD chuyển Thẩm định". Chỉ **cấp phê duyệt** chấp thuận ngoại lệ; HTTD/QHKH chỉ "Đề xuất ngoại lệ" (thành cờ ở Thẩm định, Rủi ro, Phê duyệt) |
| Q2 | **CIC do QHKH tra cứu** trên hệ thống CIC (có văn bản đồng ý của khách). HTTD chỉ kiểm hiệu lực; Thẩm định được "Yêu cầu tra cứu lại". Khách không nộp CIC; bản khách tự nộp không dùng để thẩm định |
| Q3 | AML/PEP/UBO/sanction do **Tuân thủ** kết luận (bước Ý kiến Rủi ro). HTTD chỉ kiểm có tài liệu, đúng mẫu, còn hiệu lực |
| Q4 | Cấp phê duyệt theo **tổng cấp tín dụng** (dư nợ hiện hữu tại ngân hàng + đề xuất mới, gồm người liên quan): ≤20 / 20–100 / >100 tỷ (`BANK.TIERS`). Tăng vượt cấp sau Thẩm định → "Nâng cấp phê duyệt" |
| Q5 | BCTC **kiểm toán** bắt buộc khi đề xuất >20 tỷ; ≤20 tỷ chấp nhận BCTC đã nộp cơ quan thuế |
| Q6 | Thẩm định "Yêu cầu bổ sung" **không trả hồ sơ**: trạng thái "Thẩm định – chờ bổ sung", SLA tạm dừng, QHKH chỉ tải tài liệu, HTTD kiểm tài liệu mới; bộ lọc "Chờ bổ sung" tách khỏi "Bị trả lại" |
| Q7 | Tài liệu AI phân loại/đọc **chưa có người xác nhận → chặn Gửi**. "Cần xác minh" không chặn nhưng bắt buộc chuyển kèm, thành cờ ở Thẩm định |
| Q8 | SME = doanh thu năm ≤ 1.000 tỷ (chính sách §1.2) |
| Q9 | Đổi ngưỡng phê duyệt cần **2 người**: Quản trị nhập kèm văn bản ủy quyền, người có thẩm quyền nghiệp vụ duyệt, ghi nhật ký |
| Q10 | CIC hiệu lực **30 ngày** (đến hết ngày tra cứu + 29), tính tới **ngày trình phê duyệt**; sắp hết trước hạn Thẩm định/Rủi ro → cờ "Cần tra cứu lại trước khi trình". Sao kê, xác nhận dư nợ: 30 ngày, cùng mốc |
| Q11 | Hạn bổ sung khi bị trả: **5 ngày LV** (`BANK.SLA.bosung_khach`), QHKH gia hạn **1 lần**, có lý do |
| Q12 | Phiên HĐTD đang mở chỉ hiện **"n/m đã bỏ phiếu"**; không hiện tên người hay nội dung phiếu tới khi đóng phiên |

### 14.1 Quyết định bổ sung E1–E9 (chốt 05/11/2026, thắng Q nếu khác)

| # | Quy tắc |
|---|---|
| E1 | **Ngoại lệ (sửa Q1).** Thiếu/hết hiệu lực → chặn chuyển bước, **trừ khi** đã có "Đề xuất ngoại lệ" kèm lý do (QHKH hoặc HTTD lập). Có đề xuất thì được chuyển; **cờ ngoại lệ** đi theo hồ sơ qua Thẩm định, Rủi ro, Phê duyệt. Cấp phê duyệt **chấp thuận/từ chối ngoại lệ cùng lúc với quyết định**; từ chối → "Trả lại bổ sung". Chưa có đề xuất → vẫn chặn (§6.4) |
| E2 | **Thẩm định – chờ bổ sung (Q6):** QHKH có 5 ngày LV (`BANK.SLA.bosung_khach`). Có tài liệu rồi thì SLA Thẩm định **tính tiếp** số ngày còn lại, không tính lại từ đầu |
| E3 | **Rủi ro trả về Thẩm định:** SLA Thẩm định tính lại đủ 5 ngày LV từ ngày trả |
| E4 | **Nhóm khách hàng liên quan:** QHKH xác nhận trước khi gửi (chưa xác nhận → chặn Gửi, như Q7). Thẩm định rà lại |
| E5 | **BCTC kiểm toán (sửa Q5):** bắt buộc khi **tổng cấp tín dụng** > 20 tỷ (cùng cách tính Q4) |
| E6 | **Hiệu lực 30 ngày** của sao kê và xác nhận dư nợ tính từ **ngày ngân hàng cấp** (như CIC tính từ ngày tra cứu), §6.3 |
| E7 | **Số liệu lấy thẳng từ hệ thống CIC** (máy-máy) **không** cần người xác nhận từng trường; nhãn nguồn "Hệ thống CIC", không có nút xác nhận. Chỉ số liệu AI/OCR đọc mới cần xác nhận |
| E8 | **Tách bạch (§3.4):** không phê duyệt/bỏ phiếu nếu đã tham gia bất kỳ bước nào của hồ sơ **hoặc** từng là QHKH quản lý khách hàng này trong 2 năm gần nhất |
| E9 | **Văn bản đồng ý tra cứu CIC** của khách là bắt buộc, thuộc danh mục §6.1. Thiếu → nút "Tra cứu CIC" khóa kèm lý do |

Quyết định nhỏ đã chốt: HTTD sau khi chuyển thay nút bằng dòng "Đã chuyển Thẩm định <ngày giờ>"; "Cần xác minh" chuyển kèm là **cờ, không phải ngoại lệ**; Tuân thủ có nút kết luận riêng cho cờ bản CIC khách tự nộp.

### 14.2 Quyết định vòng 3 F1–F12 (chốt 05/11/2026, thắng E và Q nếu khác)

| # | Quy tắc |
|---|---|
| F1 | **Bỏ hẳn nút "Hỏi AI" nổi.** Lối vào AI: "Hỏi AI" ở header, mục Trợ lý AI trên rail, `Ctrl J`, "Hỏi AI về <đối tượng>" tại chỗ. Bỏ rãnh phải và phần bù. Thay thế G3 và câu "nút AI nổi" ở D4 |
| F2 | **VinaNova đủ 16/16 mục §6.1** (bảng F-DOC). Mục mới là dòng "Đã đủ", ghi "minh họa", không có bản xem |
| F3 | **Giấy tờ TSBĐ của VinaNova đã có**, bỏ mọi chữ "Chờ…". LTV là **"Cần xác minh"**: giá trị đang lấy từ Phiếu TTKH (tài liệu bị cờ), chưa đối chiếu với chứng thư định giá |
| F4 | **Vẫn 8 cờ, `audit` lên Cao → 4 cờ Cao.** Lệch EBITDA vào `audit`: 62,2 lúc là LNST (KQKD tr.1), lúc là LNTT (LCTT tr.3); 62,2 + 17,8 + 48 = 128 khác EBITDA 98; DSCR 1,34 dùng 98, nếu dùng 128 thì ≈ 1,76. Thêm trường "Cần xác minh" ở 05: tiền cuối kỳ LCTT 123,0 và 77,6 khác BCĐKT 81 và 59; "doanh thu chuyển về NH ≈ 74%" không khớp 742/705. "Checklist đủ" không đổi (Q7). Không sửa lịch sử HTTD; ghi "Thẩm định phát hiện 04/11" |
| F5 | **CIC hết hiệu lực KHÔNG được "Đề xuất ngoại lệ"** (siết E1), vì QHKH tự tra lại được. Ngoại lệ duy nhất: hệ thống CIC gián đoạn, và vẫn phải tra lại trước khi trình phê duyệt |
| F6 | **Giữ "Trả lại QHKH" ở Thẩm định**, bắt buộc lý do. "Yêu cầu bổ sung" = thiếu tài liệu, hồ sơ ở lại, SLA tạm dừng. "Trả lại" = phải sửa đề xuất; nhận lại thì SLA Thẩm định tính lại đủ 5 ngày LV. Ghi rõ khác biệt ngay trên nút |
| F7 | **SLA "tính tiếp" (E2) bắt đầu từ lúc HTTD ghi tài liệu mới đạt.** Hạn bổ sung tính từ ngày yêu cầu. Hiện "còn n ngày LV khi tính tiếp" |
| F8 | **Tuân thủ kết luận cờ `cickh`** ở bước Ý kiến Rủi ro, 3 lựa chọn, đều bắt buộc lý do: "Có dấu hiệu không xác thực: xử lý theo quy trình gian lận/AML" · "Chưa đủ căn cứ: yêu cầu giải trình" · "Không phát hiện vấn đề". Kết quả hiện cho cấp phê duyệt, AI không gợi ý. Thẩm định có "Báo sớm Tuân thủ" (chỉ thông báo, không đổi bước) và ghi "Đã ghi nhận, chuyển Tuân thủ"; cờ vẫn mở nhưng không chặn "Trình Rủi ro" |
| F9 | **Hình thức trả tiền thuê đất:** chưa chọn thì chặn Gửi. "Hằng năm" thì gắn cờ, Thẩm định tách phần giá trị, chỉ tính tài sản gắn liền với đất; không tự giảm giá trị ở bước QHKH. "Một lần" vẫn cần chứng từ. Tách dòng 78 tỷ thành 2 dòng (nhà xưởng / quyền thuê). Câu chữ pháp lý ghi "Pháp chế cần xác nhận", không khẳng định |
| F10 | **Nhóm liên quan:** thêm nút "Không thuộc nhóm", bắt buộc lý do và căn cứ. Tổng và cấp tính lại theo kết quả, chuyển kèm cờ cho Thẩm định rà lại. Thẩm định cộng lại mà vượt cấp thì "Nâng cấp phê duyệt" |
| F11 | **Văn bản đồng ý tra cứu CIC** có giá trị suốt quá trình xử lý hồ sơ, kể cả các lần tra lại, trừ khi văn bản ghi khác. Bản AI phân loại chưa xác nhận thì chưa đủ để tra cứu |
| F12 | **Cảnh báo số tiền bất thường từ 500 tỷ** (`BANK.AMOUNT_WARN_BILLION`), cấu hình được, không chặn |

**Cách ghi bộ tài liệu VinaNova (F-DOC), dùng nguyên văn mọi nơi, số lấy từ `BANK.VINANOVA.docs`:** "đủ 16/16 mục bắt buộc · 3 tài liệu bổ sung · 1 bản CIC khách nộp (không tính)". Nhật ký 28/10: "tải lên 19 tài liệu". Bảng 16 mục và id: `docs/business/rules.md` mục F-DOC.

Quyết định nhỏ vòng 3: một tên chi nhánh "CN Sài Gòn"; "Hệ thống phân công 30/10 16:00" thay "Trưởng phòng Thẩm định phân công 16:05"; Bắc Hà ghi "từng là QHKH quản lý khách hàng này đến 12/2024".

**Phiếu HĐTD:** đúng 4 loại **Đồng ý · Đồng ý có điều kiện · Không đồng ý · Trả lại bổ sung**. **Mọi phiếu bắt buộc lý do** (ô lý do trống → nút gửi phiếu khóa kèm lý do). Không bỏ phiếu thay.

## 15. Thuật ngữ cố định (G4)

| Ngữ cảnh | Dùng | Không dùng |
|---|---|---|
| Trạng thái số liệu trong bảng/dòng | **"AI đề xuất"** · **"Đã xác nhận"** · **"Cần xác minh"** (nhãn ngắn, chữ + icon, mục 4.2) | "Chờ xác nhận", "Chưa duyệt", "Nghi vấn" |
| Meta câu trả lời AI và khối `.ai-block` | **"AI đề xuất – chưa xác nhận"** (bản dài, chỉ ở 2 chỗ này) | bản dài trong bảng |
| Số đếm mục lục | **"n chưa xác nhận"** / **"n cần xác minh"**, viết thường, luôn có số; bản ngắn "n chưa XN" / "n cần XM" phải có `title` đầy đủ | "Chưa XN" không số, "3 CHƯA XN" |
| Trạng thái tài liệu | **"Thiếu"** · **"Hết hiệu lực"** · **"Đã đủ"** (bằng chữ) | "Quá hạn", "Thiếu sót", "OK", chỉ icon |
| Nguồn số liệu CIC máy-máy | **"Hệ thống CIC"** (E7) | "CIC (AI đọc)" |
| Chỉ số nợ sau khi cộng khoản vay mới | **"Nợ vay/EBITDA sau cấp TD"** kèm công thức (G14) | "DTI" (không dùng trên UI), "Nợ/EBITDA" khi đã cộng khoản mới |
| Sao kê tài khoản | **"Sao kê 12 tháng"** (G12) | "6 tháng" |
| Ngân hàng khác, doanh nghiệp mẫu | Tên **hư cấu**, ví dụ "NH TMCP Phương Bắc (hư cấu)", "CTCP Cơ khí Trường An" (G13) | tên/thương hiệu thật hoặc gần giống |
| Nút AI | Header: **"Hỏi AI"**; tại chỗ: **"Hỏi AI về <đối tượng>"** (mục 4.7) | "Chat AI", "Trợ lý", "Hỏi Trợ lý AI" |
| Tiêu đề panel AI | **"Trợ lý AI"**, mọi trang | "Chat", tên agent, tên trang |
| Cờ gắn với tài liệu, đối tượng | **"n cờ"**, **"n cờ Cao"**, luôn có số (F4: "4 cờ Cao"). Trong câu văn được viết "đây là cờ Cao" | nhãn trạng thái "Có cờ", "Cờ Cao" không số |
| Số việc còn lại của wizard ở mục lục | "n còn lại", kèm `title` đầy đủ | |
| Nhóm liên quan bị QHKH bác | "Không thuộc nhóm" (F10) | |
| Cờ HTTD chuyển sang Thẩm định | "Cờ đã chuyển kèm Thẩm định", "n cờ chuyển kèm" | |
| Việc đang chờ Tuân thủ | **"Chờ Tuân thủ kết luận"**; ô hẹp được rút "Chờ Tuân thủ" kèm `title` đầy đủ (F8) | "Chờ TT", "Chờ AML" |
| Thẩm định đã nhận cờ `cickh` | **"Đã ghi nhận, chuyển Tuân thủ"** · nút **"Báo sớm Tuân thủ"** (F8) | "Đã xử lý" cho cờ này |
| Thẩm định thiếu tài liệu, hồ sơ ở lại | Nút **"Yêu cầu bổ sung"**; trạng thái **"Thẩm định – chờ bổ sung"**; bộ lọc **"Chờ bổ sung"** (Q6, F6) | "Bị trả lại" cho trường hợp này |
| Thẩm định trả để sửa đề xuất | Nút **"Trả lại QHKH"**, bắt buộc lý do; bộ lọc **"Bị trả lại"** (F6) | "Trả hồ sơ" |
| Vượt cấp sau khi cộng lại | **"Nâng cấp phê duyệt"** (Q4, F10) | "Chuyển cấp" |
| Nhóm tài liệu đã đủ | **"Đã đủ (n)"**, mở được (F2) | "Hoàn tất" |
| Tài liệu minh họa, không có bản xem | Dòng ghi **"minh họa"**; trình xem ghi **"Bản minh họa – tài liệu này chưa có ảnh trong mockup"** (F2) | "Không tìm thấy", "Lỗi" |
| Câu chữ pháp lý chưa chắc chắn | **"Pháp chế cần xác nhận"** (F9) | câu khẳng định |

- **Icon trạng thái đứng một mình** (không kèm chữ) phải có `aria-label` và `title` cùng nội dung chữ ở bảng trên. Ở bước có hành động xác nhận (ví dụ 04 bước 1) trạng thái "Đã xác nhận" phải có **chữ**, không chỉ icon.

## 16. Trạng thái ghi vào hash (G10)

- Shell có `syncHash()`: mỗi lần **đổi vai trò, mục (`go`), bộ lọc (`setFilter`), mở/đóng AI, mở/đóng drawer chính sách** thì ghi hash bằng `history.replaceState` (không thêm mục lịch sử, không bắn `hashchange`). **Tải lại trang giữ nguyên trạng thái.**
- Khóa shell quản lý: `role`, `sec` (chỉ trang có mục, mục 6.4), `ai` (`open`, đóng thì bỏ khóa), `filter` (bỏ khi "Tất cả"), `pol` (§ đang mở, ví dụ `4-2`).
- Khóa riêng của trang: ghi đè `PAGE_HASH = () => ({doc:S.doc, page:S.page, field:S.field})` (giá trị `null` = xóa khóa). Ví dụ 05 ghi `doc/page/field` khi mở tài liệu, 04 ghi `sec`/`draft`.
- Khóa không quản lý (`from`, `cite`, `metric`…) được **giữ nguyên**.
- Khởi tạo: dựng mặc định → `applyHash()` → `HASH_READY = true` → `syncHash()` một lần. **Không ghi hash trước `applyHash`**, nếu không deep link bị ghi đè.
- Giá trị sai (vai trò lạ, mục không có, bộ lọc lạ) → bỏ qua / về mặc định ("Tất cả") rồi ghi lại hash đúng.
- Dữ liệu nháp (form 04) lưu `sessionStorage` (bọc try/catch), không nhét vào hash.

## 17. Bàn phím và focus (G2)

- **Panel AI và mọi drawer khi đóng đều `inert`** (Tab không vào được) và `aria-hidden="true"`. HTML khởi tạo có sẵn thuộc tính `inert`.
- **Thứ tự Esc** (mỗi lần Esc đóng đúng **một** lớp, hàm `onEsc()` của shell):
  1. drawer đang mở (trên cùng);
  2. form/màn phụ của trang đang mở (sửa trường, màn so sánh, ô nhập lý do…): trang đăng ký `ESC_HANDLERS.push(() => { if(đangMở){ đóng(); return true; } return false; })` theo thứ tự ưu tiên;
  3. panel AI.
- Mở drawer → focus nút đóng (`[data-close]` hoặc `#drawerClose`, nút này phải có handler đóng). Đóng drawer → trả focus về nút đã mở nó (nút đó biến mất thì về `#content`, có `tabindex="-1"`).
- **Drawer có mask mở thì `.app` đặt `inert`; đóng hết drawer thì bỏ** (`syncMask()` của shell). Thứ tự khi đóng: **bỏ inert trước, trả focus sau**, nếu không focus không vào được. Mask và drawer phải nằm **ngoài** `.app`. Hai drawer chồng nhau: còn một cái mở thì `.app` vẫn inert. Khi drawer mở, `Ctrl J` không làm gì.
- **Đóng panel AI** (✕, Esc, `Ctrl J`) khi focus đang trong panel hoặc đã rơi về `body`: trả về **nút đã mở panel**, không còn thì về **`#headActions .btn.ai`**, không có nữa thì về `#content`. Mở từ `Ctrl J` hay deep link `#ai=open` không có nút đã mở nên về `#headActions .btn.ai`.
- **Kiểm tra "còn focus được" dùng `canFocus()` của shell:** còn trong DOM, không có cha `[inert]`, `getComputedStyle(n).display !== 'none'` trên cả chuỗi cha, `visibility` khác `hidden`. **Không dùng `offsetParent`** (null với `position:fixed`) và **không xét `opacity`** ("Hỏi AI" trong bảng mờ tới khi có focus, vẫn phải nhận lại focus).
- Bấm mask = Esc. `Ctrl J` = mở/đóng AI.
- Không tự viết `keydown` Escape riêng trong trang: dùng `ESC_HANDLERS`.

## 18. Mã và đánh số chính sách (G11)

Mọi trang dùng **một** mã văn bản và **một** cách đánh số. Drawer chính sách trong shell đã có đủ các điều dưới đây (`id="pol-<chương>-<mục>"`, mở bằng `data-policy="4-2"` / `openPolicy('4-2')`).

**Mã văn bản:** "CS-TD-SME/2025 – Quy trình và chính sách cấp tín dụng KHDN SME"

| § | Tên | Dùng cho |
|---|---|---|
| §1.2 | Phạm vi SME | Doanh thu ≤ 1.000 tỷ (Q8) |
| §2.3 | SLA | `BANK.SLA` |
| §3.1 | Thẩm quyền phê duyệt | `BANK.TIERS` theo tổng cấp tín dụng (Q4) |
| §3.4 | Tách bạch | E8 |
| §4.1 | Chất lượng BCTC | Ý kiến chấp nhận toàn phần khi thuộc diện bắt buộc kiểm toán (§6.1) |
| §4.2 | Khả năng trả nợ | DSCR, Nợ vay/EBITDA sau cấp TD, EBIT/lãi vay |
| §4.4 | Chỉ số vận hành | Kỳ thu tiền, hàng tồn kho |
| §5.2 | Tập trung ngành | Cảnh báo giới hạn ngành (Rủi ro) |
| §6.1 | Danh mục hồ sơ | Danh mục tài liệu, văn bản đồng ý CIC (E9), BCTC kiểm toán (E5) |
| §6.3 | Hiệu lực tài liệu | CIC/sao kê/xác nhận dư nợ 30 ngày (Q10, E6) |
| §6.4 | Ngoại lệ | Đề xuất và chấp thuận ngoại lệ (E1); CIC hết hiệu lực không được đề xuất, trừ khi hệ thống CIC gián đoạn (F5) |
| §7.1 | LTV và TSBĐ | Tỷ lệ cho vay trên TSBĐ |

- Không dùng số § khác cho cùng nội dung (ví dụ "§4.4 Vốn lưu động" cũ: bỏ). Cần điều mới → đề xuất bổ sung bảng này trước.
- Giới hạn cấp tín dụng theo Điều 136 Luật TCTD 2024 ghi là **tham số cấu hình**, không khẳng định con số.

## 19. Component chung trong shell (chép nguyên, không đo lại)

| Component | Class | Số đo chuẩn |
|---|---|---|
| Khối việc còn lại | `.hero` (+ `.hero.ready`), `.hero-top`, `.prog`/`.bar`, `.hero-foot` | padding **20/24/12**, bo 12, nền `--navy-50`; tiêu đề 20/600; thanh 8px |
| Việc trong khối | `.tasks` > `.task` (+ `.done`), `.tn`, `.ts`, `.tp`, `.mbar`, `.go` | grid `32px minmax(0,1fr) auto 20px`, gap 14, padding 10×14, bo 10; số 28px; tiêu đề 15/600 |
| Bảng | `table.t`, `.nm`, `.sub`, `.col-aux`/`.aux-sub`, `tr.row/.exp/.grp`, `td.util`, `.chev` | th 13/500 padding 8×12; **ô padding 12px, canh giữa dọc**; cột tên ≥ 200px; util 120px |
| Bộ lọc | `.filters[data-filters]` > `button[data-filter][aria-pressed]` + `.n` | nút ≥ 28px, 13px; ghi `#filter=` |
| Thanh công cụ | `.toolbar` (+ `.grow`) | `flex-wrap`, `min-width:0`, gap 8×12 |
| Trạng thái rỗng / không quyền | `.state` | icon 40 · h2 16/600 · 1 câu · ≤ 1 nút; rộng ≤ 520 |
| Chân wizard | `.wz-foot` (+ `.right`, `.hint`), `.wz-left` | margin-top 40; chỉ "Quay lại" (`.btn.ghost`); dòng "Còn n mục bắt buộc…" `--error` 13px |
| Wizard trong mục lục | `SECS` mục `{wz, done}` → `.wz-n` | số dạng chữ 13/500 `--text-3`; "hiện tại" thắng "đã xong" |
| Drawer | `.drawer` + `openDrawer`/`closeDrawer`/`syncMask` | 480px; inert khi đóng; `.app` inert khi có mask; focus vào/ra (mục 17) |
| Nút "Hỏi AI" header | hằng `AI_BTN` trong `#headActions` | `.btn.ai`, đứng đầu cụm; có `title` và `aria-keyshortcuts` (mục 4.7) |
| Không có quyền | `.noaccess#noAccess`, `NO_ACCESS`, `renderNoAccess()` | nền `--canvas`, padding 72/24; đúng 1 nút có icon (mục 12) |
| Badge rail | `.rail a .badge` | 18×18, bo 9, top 4, right 3, chữ 11/600 (mục 2.1) |
| Trích dẫn | `.cite` | cao 18, chữ 12/600; `::after` inset -5px |
| ✕ chip ngữ cảnh | `.chip button` | hộp 28×28, padding 4, margin -4 -4 -4 -2, `background-clip:content-box` |
| Link trong dòng | `.link`, `.src`, `.back` | `min-height:28px;margin-block:-3px`; `.src` thêm `min-width:28px` |
| Dòng việc đầu tiên | `.next-line` | 14px, không viền, `nowrap`, margin dưới 12 (mục 0) |
| Mục lục khi có trình xem | `.ws.has-viewer` | AI mở: cột mục lục 0px, `.toc{display:none}` ở mọi viewport (mục 13.1) |
| Ô tìm kiếm | `.search` | cao 36; `:focus-within` outline 2px `--navy-600` (≥ 3:1) |
| Xem thử vai trò | `.demo select` | đúng 200px, `flex:none`, `min-height:28px` |
| Nút khóa | `[aria-disabled="true"][data-lock]` | `title` = lý do do `syncLockTitles` tự gắn (theo dõi cả khi `data-lock` đổi) |

Trang chỉ được thêm biến thể (ví dụ `.hero-top .right`), không được đổi số đo ở bảng trên. Muốn đổi → sửa shell + mục này trước.
