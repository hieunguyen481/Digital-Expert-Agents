# QA luồng nghiệp vụ theo vai trò (kiểm thử tay bằng Playwright)

Ngày chạy: 09/11/2026 (đồng hồ hệ thống). Commit gốc `9384951`. Web :3000, API :8000, Keycloak :8080.
Cách làm: đăng nhập Keycloak thật bằng 10 tài khoản seed, thao tác giao diện, đối chiếu `docs/business/rules.md` và `user-flows.md`.
Hồ sơ thử nghiệm do QA tạo: `LA-20261109-3FE1701D` (CTCP Logistics Cảng Xanh, 10 tỷ, id `3fe1701d-77ef-49bc-acdf-d4655a745eb9`, đã đi hết đường tới "Đã phê duyệt") và hai nháp `LA-20261109-90FFC037`, cùng một nháp 999999 tỷ tạo ở lượt thử trước. Hồ sơ seed chỉ đọc.
Ảnh và script nằm ở `/tmp/qa1-qa/` (không commit). Chỗ nào dùng API thì chỉ để đọc đối chiếu hoặc kiểm tra quyền.

## Tổng số lỗi theo mức

| Mức | Số lỗi |
| --- | --- |
| Nghiêm trọng | 1 (L01) |
| Cao | 2 (L02, L03) |
| Vừa | 7 (L04 – L10) |
| Nhẹ | 6 (L11 – L16) |

## Lỗi đã tái hiện

### L01 · Nghiêm trọng · QHKH, HTTD (hệ thống) — Hồ sơ không có tài liệu nào vẫn "đủ điều kiện" gửi và đi hết quy trình
- Bước: QHKH tạo đề xuất 10 tỷ / 12 tháng cho khách bất kỳ, không tải gì → tab "Hồ sơ tài liệu" ghi "Đủ các mục bắt buộc"; tab "Tóm tắt và gửi" mọi điều kiện "Đạt", nút Gửi bật → gửi. HTTD mở `/doi-chieu/<id>` thấy "Hồ sơ chưa có tài liệu." nhưng "Chuyển Thẩm định" bật và chuyển được. Sau đó Thẩm định (có thêm xác nhận 4 trường của một PDF khác) → Rủi ro → Tuân thủ → Giám đốc phê duyệt thành công.
- Mong đợi: thiếu tài liệu thì chặn QHKH gửi và chặn HTTD chuyển (rules.md Q1, E1; user-flows bảng "Điều kiện từng cổng"; mục F-DOC yêu cầu đủ 16 mục §6.1).
- Thực tế: API `GET .../checklist` trả `[]`, `GET .../submit-conditions` trả `can_submit: true` với `DOCS met: true`. Danh sách rỗng bị coi là "đủ".
- Ảnh: `/tmp/qa1-qa/after-submit.png`, `/tmp/qa1-qa/ed-Hồ s.png`. Cùng nguyên nhân với nháp seed DX-2026-00405 (tab hiện "Đủ các mục bắt buộc" khi không liệt kê mục nào).
- Nghi ngờ: kiểm tra "tất cả mục bắt buộc đạt" chạy trên danh sách rỗng (all([]) = true); backend chỗ tính `DOCS` trong `submit-conditions` và cổng HTTD `transitions`. Chưa tra `file:dòng`.

### L02 · Cao · Cấp phê duyệt (Giám đốc CN) — Phê duyệt với số tiền duyệt 0 được chấp nhận, lưu thành 1 VND
- Bước: Giám đốc mở hồ sơ ở bước Phê duyệt → "Quyết định" → Phê duyệt, số tiền duyệt `0`, kỳ hạn 12, lý do "Đủ điều kiện" → "Ghi quyết định".
- Mong đợi: số tiền duyệt phải dương và không vượt đề xuất; số 0 bị chặn (cùng tinh thần `billionToVnd` ở form tạo đề xuất không chấp nhận ≤ 0).
- Thực tế: `POST /transitions` trả 200, hồ sơ thành "Đã phê duyệt". SELECT `credit.loan_decision`: `approved_amount = 1.0000`, `decision_type = APPROVED` cho khoản vay 10 tỷ. Giao diện không hiện số tiền được duyệt ở đâu cả.
- Ảnh: `/tmp/qa1-qa/decision-modal.png`.
- Nghi ngờ: validate số tiền duyệt ở backend chỉ kiểm "không vượt đề xuất"; giao diện nhập VND thô, không có bước kiểm tối thiểu.

### L03 · Cao · Kiểm toán nội bộ — Danh sách hồ sơ gần như trống
- Bước: đăng nhập `auditor`, mở "Hồ sơ vay – chỉ đọc".
- Mong đợi: "Kiểm toán đọc toàn hệ thống" (rules.md Q-M); đây là màn duy nhất của vai trò.
- Thực tế: lúc đầu ghi "Không có việc đang chờ bạn"; sau khi QA tạo hồ sơ mới thì chỉ hiện đúng hồ sơ đó ("Hồ sơ & quyết định gần đây"), không hiện 20+ hồ sơ seed. `GET /work-items` của kiểm toán trả 0 mục; trong khi `GET /loan-applications/<id>/overview` của cùng tài khoản đọc được mọi hồ sơ (200). "Nhật ký kiểm toán" trên thanh trái bị vô hiệu.
- Ảnh: `/tmp/qa1-qa/mywork-kiemtoan.png`, `/tmp/qa1-qa/auditor.png`.
- Nghi ngờ: work-items của kiểm toán lọc theo hoạt động gần đây thay vì phạm vi đọc.

### L04 · Vừa · Mọi vai trò — Thông báo lỗi tiếng Anh thô
Mong đợi: lỗi hiển thị bằng tiếng Việt, không mã thô. Thực tế:
- Tải lên file sai loại (`ghi-chu.txt`), file rỗng, file 60 MB: chỉ hiện "The request is invalid." (lý do chi tiết `Unsupported document MIME type`, `Document size is outside the permitted range` bị bỏ).
- QHKH mở `/de-xuat-vay/<id không tồn tại>`: "The requested resource was not found". Mở `/ho-so-vay/KHONG-TON-TAI` (id sai định dạng): "The request is invalid." (trong khi id đúng định dạng nhưng không có thì báo tiếng Việt "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.").
- Giám đốc ghi phê duyệt vượt số đề xuất: "The approved amount must not exceed the requested amount."
- Ảnh: `/tmp/qa1-qa/blank-hsv.png`. Nghi ngờ: `getErrorMessage` trong `frontend/src/services/apiClient` hiển thị `error.message` của backend khi không có bản dịch theo `code`.

### L05 · Vừa · Mọi vai trò — Mã trạng thái / mã lỗi thô trên giao diện
- Sau khi gửi, tiêu đề đề xuất ghi `LA-… · CHECKING`; ở trạng thái chờ bổ sung ghi `APPRAISAL_PENDING_INFO`.
- Dòng thời gian ở trang hồ sơ ghi kết quả bước là `(ACCEPTED)`, `(APPROVED)` (các bước khác dùng "đạt", "đã trình").
- Tài liệu OCR lỗi: "Xử lý tài liệu thất bại ở bước OCR (O_C_R_NO_TEXT_LAYER_ERROR / PDFIUM_ERROR). Tải lại tệp hoặc báo quản trị." — mã thô và lời khuyên "báo quản trị" (Quản trị không có quyền nghiệp vụ). Với PDF scan nên nói thẳng "PDF không có lớp chữ".
- Ảnh: `/tmp/qa1-qa/after-submit.png`.

### L06 · Vừa · HTTD, Thẩm định — Màn đối chiếu hiện khóa trường bằng tên tiếng Anh, đè lên chữ nguồn, nhãn không bấm được
- Bước: tải `ho-so-lat-tam.pdf` → mở tài liệu → Trang 2.
- Thực tế: nhãn vùng tô là `charter_capital`, `company_name`, `legal_representative`, `tax_code` (cả danh sách bên dưới). Nhãn chồng lên dòng chữ của chính PDF; ảnh trang chặn con trỏ nên bấm vào nhãn không chọn trường (Playwright báo `<img … _pageImage> intercepts pointer events`); chỉ bấm được khung viền. Bấm khung hoạt động đúng (hiện giá trị, "AI đề xuất", nút xác nhận).
- Ảnh: `/tmp/qa1-qa/rc-doc.png`, `/tmp/qa1-qa/rc-sel.png`.
- Nghi ngờ: `_regionText` trong CSS module của `frontend/src/features/reconciliation/` vượt khỏi nút vùng và nằm dưới `_pageImage`; nhãn lấy `field_name` thay vì tên Việt.

### L07 · Vừa · QHKH — Hồ sơ "Thẩm định – chờ bổ sung": không thấy yêu cầu và không có đường vào để tải
- Bước: Thẩm định bấm "Yêu cầu bổ sung" (lý do "Thiếu BCTC 2025 và sao kê 12 tháng"). QHKH vào "Hồ sơ của tôi" → hồ sơ có nhãn "Chờ bổ sung · còn 5 ngày LV".
- Mong đợi: QHKH thấy nội dung cần bổ sung và nơi tải (rules.md E2, user-flows "chỉ tải lên").
- Thực tế: trang hồ sơ của QHKH ghi "Không có hành động nào cho vai trò của bạn ở bước này" và không hiện lý do yêu cầu. Nav của QHKH không có "Đối chiếu tài liệu"; tab "Hồ sơ tài liệu" chỉ nhắc "Tài liệu bổ sung được tải ở trang Đối chiếu tài liệu" nhưng không có liên kết. QHKH chỉ tải được nếu tự gõ `/doi-chieu/<id>` (trang này cho phép).
- Ảnh: `/tmp/qa1-qa/mywork-qhkh.png` (danh sách). Nghi ngờ: `frontend/src/features/proposal/DocumentsSection.tsx:143` (chỉ có chữ, không có link) và hành động QHKH ở `LoanDetail`.

### L08 · Vừa · HTTD/Thẩm định — Tài liệu không đọc được vẫn nằm trong danh sách; file PNG đội lốt được nhận
- Server nhận `x.png` (khai MIME `application/pdf` từ ô input) và file giả PDF; chỉ sau khi worker OCR mới báo lỗi. Các bản lỗi (scan, giả PDF, PNG, 15 MB toàn số 0) nằm lại vĩnh viễn trong "Tài liệu ngoài checklist" mà không có nút gỡ/bỏ.
- HTTD vẫn "Ghi nhận đã bổ sung" được dù 4/5 tài liệu mới tải đều lỗi (đúng với F7 "HTTD ghi đạt/không đạt", nên chỉ ghi nhận).
- Ảnh: `/tmp/qa1-qa/rc-list.png`.

### L09 · Vừa · Thẩm định — Xác nhận trường không đối chiếu với khách hàng của hồ sơ
- PDF có `company_name = CONG TY TNHH LAT TAM` nhưng hồ sơ thuộc "CTCP Logistics Cảng Xanh"; Thẩm định (và HTTD) xác nhận cả bốn trường, không có cảnh báo lệch tên/MST. Hệ quả: hồ sơ qua cổng "Trình Rủi ro" với tài liệu không thuộc khách. Nhóm này ghi "Vừa" vì chưa rõ có nằm trong phạm vi đợt 1; nếu không thì chuyển sang "Cần xác nhận".

### L10 · Vừa · Mọi vai trò — Thiếu thông báo khi kiểm tra đầu vào, không có cận trên
- Form "Tạo đề xuất vay": nhập `abc`, `-5`, `0`, `1e3`, `10.55555`, kỳ hạn `0`, `-3`, `6.5` → nút "Tạo bản nháp" chỉ bị khóa, không có chữ báo lỗi hay lý do (rules.md D4/D6: nút khóa kèm lý do).
- Chấp nhận `999999` tỷ và kỳ hạn `1200` (và `99999999999`) tháng khi tạo; chỉ ở tab "Nhu cầu vay" mới hiện "Số liệu nằm ngoài giới hạn sản phẩm… vẫn lưu nháp được". Ngưỡng 500 tỷ (F12) là cảnh báo không chặn nên có thể đúng; kỳ hạn 99999999999 tháng thì nên bị chặn.
- Ảnh: `/tmp/qa1-qa/create-huge.png`.

### L11 · Nhẹ · Thẩm định/Rủi ro/Tuân thủ — Lý do khóa hiển thị sai hoặc cũ
- Thẩm định điền đủ 7/7 mục nhưng khối Hành động vẫn ghi "Tờ trình chưa đủ 7 mục" (tải lại mới hết).
- Sau khi Thẩm định trình, chính Thẩm định thấy "Chưa đủ điều kiện để trình – Thiếu Ý kiến Rủi ro…" dù không còn hành động nào của họ.
- Tuân thủ/Rủi ro thấy "CIC hoặc sao kê hết hiệu lực tại ngày trình phê duyệt" trong khi CIC của hồ sơ còn hạn đến 17/11 và server cho phép "Trình phê duyệt" (200).
- Nút "Trình Rủi ro" và "Trình phê duyệt" không khóa dù chưa đủ điều kiện; chỉ báo lỗi sau khi bấm (rules.md D4: khóa kèm lý do).

### L12 · Nhẹ · QHKH — Bấm đúp "Gửi Hỗ trợ tín dụng" gửi hai request
- `POST submissions` ×2: lần 1 200, lần 2 409. Kết quả đúng (không nhân đôi) nhưng nút không khóa lúc đang gửi và sau khi gửi vẫn là nút primary bật cùng dòng "Đề xuất đã gửi." Nút "Lưu nháp" sau gửi bị khóa đúng.

### L13 · Nhẹ · Mọi vai trò — Các mục trên thanh trái bị vô hiệu không có giải thích
- "Khách hàng SME", "Tra cứu chính sách", "Nhật ký kiểm toán", "Phiên Hội đồng tín dụng" là `<button aria-disabled="true">` không `title`, bấm không có phản hồi. Mockup (rules.md D1) yêu cầu toast "Trang <tên> sẽ có ở đợt sau".

### L14 · Nhẹ · Mọi vai trò — Hai thẻ `<main>` lồng nhau
- `#main-content` chứa thêm `<main tabindex="-1">` ở trang đề xuất (Playwright báo strict mode với `locator('main')`). Ảnh hưởng đọc màn hình.

### L15 · Nhẹ · HTTD — Hai tên khác nhau cho cùng một bước
- Trang đối chiếu của HTTD ghi "Đang hậu kiểm"; danh sách việc ghi "Đang kiểm tra" cho bước Kiểm tra hồ sơ.

### L16 · Nhẹ · Mọi vai trò — Định dạng số và ngày không thống nhất
- "999.999.000.000.000 VND" (nhóm liên quan) cạnh "999,999,000,000,000 VND" (điều kiện gửi); ô "Số tiền duyệt" hiện `10000000000` không dấu phân cách; ngày kiểu "9/11/2026" trong dòng thời gian, "09/11/2026" ở tab tài liệu. Số hồ sơ mới là `LA-20261109-xxxx`, khác `HSV-2026-xxxxx` ở seed.

## Cần xác nhận (chưa đủ căn cứ nói là lỗi)

1. Nháp seed DX-2026-00412 (Mekong): bảng điều kiện ghi "Mọi giá trị do AI điền đã được người xác nhận: Đạt" trong khi hai mục `TV`, `SAOKE` đang "AI xếp, chưa xác nhận" (có đề xuất ngoại lệ). Q7 nói chưa xác nhận thì chặn; không rõ ngoại lệ có miễn không.
2. Nháp seed DX-2026-00405 (Hưng Phát): "Tra cứu 09/11/2026 … hiệu lực đến 08/12/2026" nhưng thiếu văn bản đồng ý tra CIC (E9 yêu cầu có văn bản trước khi tra). Có thể là dữ liệu seed benchmark.
3. Giám đốc CN (director.hn) đọc được qua API mọi hồ sơ (overview 200 với 5/5 hồ sơ thử, kể cả hồ sơ ở các bước chưa tới họ); Q-M nói "cùng chi nhánh không tự thấy nhau, trừ GĐ chi nhánh" — cần xác nhận hồ sơ có cùng chi nhánh không. UI chỉ liệt kê đúng hồ sơ chờ.
4. Tài khoản Quản trị vẫn mở được `/chat` và `/dashboard` (các trang trace agent), trong khi trang nghiệp vụ hiện "Không có quyền xem nội dung nghiệp vụ". Cần xác nhận trace/chat có lộ nội dung tín dụng không (Q-K).
5. Trang Quyết định: ngoài ô chọn quyết định còn một nút "Trả lại bổ sung" đã khóa và ô chọn "Trả về Thẩm định" nằm lẻ dưới ô lý do; bố cục không giống ba lựa chọn Phê duyệt / có điều kiện / Từ chối của rules.md. Chưa mở nhánh "Trả lại bổ sung" để kiểm.
6. QHKH không có nút xác nhận trường AI trên màn đối chiếu (chỉ HTTD và Thẩm định thấy), trong khi Q7 và `user-flows` chặn QHKH gửi khi trường AI chưa xác nhận. Không rõ QHKH xác nhận ở đâu.
7. Tải lại trang ngay sau khi gõ (trước 1–2 giây tự lưu) làm mất nội dung đang gõ, không có cảnh báo rời trang.
8. File PDF Tờ trình (`to-trinh-LA-20261109-3FE1701D-lan-1.pdf`, 1 trang, nhúng DejaVu Sans đủ ký tự tiếng Việt) tải được; mình chưa xem hình hiển thị dấu vì máy không có trình xem PDF.
9. Tên người dùng seed không dấu ("Can bo Tin dung Mau", "Chuyen vien Ho so Mau") hiện khắp giao diện; có thể chỉ là dữ liệu seed.

## Đã kiểm tra đạt

- Đăng nhập và menu đúng vai trò cho cả 10 tài khoản; badge trên rail khớp số việc "chờ bạn": QHKH 4, HTTD 3, Thẩm định 3, Rủi ro 2, Phê duyệt 3 / Phê duyệt 2 là 1; Tuân thủ và Kiểm toán không badge.
- Chặn đúng bằng giao diện và URL trực tiếp: `/de-xuat-vay` chỉ QHKH; `/doi-chieu` chỉ HTTD và Thẩm định (QHKH vào được chi tiết `/doi-chieu/<id>` để tải bổ sung); Rủi ro, Tuân thủ, Phê duyệt, Kiểm toán chỉ thấy trang "Không có quyền xem trang này"; Quản trị thấy "Không có quyền xem nội dung nghiệp vụ" kèm đúng 1 nút "Mở Quản trị". `/abc` hiện trang 404 tiếng Việt.
- API: không token 401, token sai 401 (`TOKEN_INVALID`), Quản trị 403 mọi API nghiệp vụ, `audit-events` chỉ Kiểm toán 200, `loan-products` chỉ QHKH, QHKH gọi `decisions` bị 403 `MISSING_PERMISSION`, Phê duyệt cấp 2 không đọc được hồ sơ cấp 1 và ngược lại (404).
- Nháp tự lưu ("Đã tự lưu nháp lúc …"); hai tab cùng sửa: tab thứ hai hiện cảnh báo xung đột và nút "Tải bản mới nhất", không ghi đè.
- Tra cứu CIC: hết hiệu lực hiện cờ "Cần tra cứu lại CIC trước khi trình", điều kiện gửi "Chưa đạt"; thiếu văn bản đồng ý thì nút khóa kèm lý do (DX-2026-00405). Tổng cấp tín dụng 80 tỷ → cấp 2, 999999 tỷ → cấp 3, 10 tỷ → cấp 1; BCTC kiểm toán bắt buộc khi > 20 tỷ chặn đúng.
- Tải PDF có chữ: trích 4 trường, hiện vùng tô, bấm khung vùng chọn đúng trường, xác nhận lưu "Đã xác nhận bởi …"; PDF scan và file hỏng báo thất bại (có lỗi L04, L05); file 60 MB bị server từ chối; vai trò không giữ hồ sơ (Thẩm định ở bước chờ bổ sung, QHKH) không thấy nút xác nhận.
- Workflow thật trên hồ sơ QA: Thẩm định "Yêu cầu bổ sung" (bắt buộc lý do, lý do khoảng trắng bị khóa) → "Thẩm định – chờ bổ sung", SLA hiện "còn 5 ngày LV"; HTTD "Ghi nhận đã bổ sung" trở về Thẩm định, hạn tính tiếp 16/11; "Trả lại QHKH" bắt buộc lý do; tờ trình 7 mục tự lưu, "Trình Rủi ro" bị chặn khi còn trường chưa xác nhận (`FIELDS_UNCONFIRMED`) và khi thiếu tờ trình; sau trình tờ trình khóa "Bản đã chốt lúc trình · lần 1", Rủi ro/Giám đốc đọc đúng bản; PDF tờ trình tải được; Rủi ro và Tuân thủ ghi ý kiến riêng, "Trình phê duyệt" bị chặn (`OPINIONS_MISSING`) tới khi đủ cả hai; hạn: Kiểm tra hồ sơ 11/11 (2 ngày LV), Thẩm định 16/11 (5), Rủi ro 12/11 (3), Phê duyệt 11/11 (2); duyệt vượt số đề xuất bị server chặn (nhưng lỗi tiếng Anh, L04).
- 1366×768: không tràn ngang (`scrollWidth ≤ innerWidth`) ở danh sách việc, tạo đề xuất, soạn đề xuất, đối chiếu, hồ sơ, chat, dashboard cho QHKH, Thẩm định, Phê duyệt, Kiểm toán.
- Hồ sơ không tồn tại ở `/ho-so-vay` và `/doi-chieu` với id hợp lệ báo "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem." kèm "Thử lại".

## Chưa kiểm tra

- Hết hạn phiên giữa chừng và đăng nhập lại (đã có `token-expiry.spec.ts`), nút Quay lại của trình duyệt sau khi gửi/chuyển bước, tải lại giữa chừng ở các bước ngoài tờ trình.
- Nhánh Từ chối, Phê duyệt có điều kiện, "Trả lại bổ sung" và "Trả về Thẩm định" của cấp phê duyệt; Rủi ro "Trả lại Thẩm định"; nâng cấp phê duyệt theo tổng cấp tín dụng khi Thẩm định cộng thêm; ngoại lệ (đề xuất / chấp thuận / từ chối); kết luận cờ `cickh` của Tuân thủ; gia hạn / rút hồ sơ; E8 tách biệt người lập và người duyệt (chỉ mới quan sát được người duyệt khác người lập).
- Chốt mâu thuẫn và khóa khi không giữ hồ sơ trên dữ liệu seed (cần ghi vào hồ sơ seed, mà QA không được đổi). Chỉ thử trên hồ sơ QA, chưa có mâu thuẫn để chốt.
- Tra cứu CIC mới, đồng ý CIC, khách có tài sản bảo đảm / thuê đất, nhóm liên quan "Không thuộc nhóm" (chỉ đọc trên nháp seed).
- Tờ trình PDF xem bằng mắt; mức 500 tỷ cảnh báo F12; chất lượng nội dung agent, dashboard, benchmark, Hội đồng (ngoài phạm vi).
