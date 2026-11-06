# Sửa đợt 1 – Quyết định chuẩn (nguồn duy nhất)

Ngày chốt: 05/11/2026. Người dùng đã đồng ý cả 12 đề xuất nghiệp vụ (Q1–Q12) và yêu cầu sửa **các lỗi mức Cao trước**.
Mọi agent sửa phải tuân theo file này. Có mâu thuẫn giữa file này và mockup → file này đúng.
Có điều chưa được file này trả lời → KHÔNG tự bịa nghiệp vụ, ghi vào mục "Câu hỏi mở" trong báo cáo.

Dữ liệu dùng chung và hàm lịch/điều hướng: `content/common.js` (đối tượng `window.BANK`). Đọc nó trước.

---

## A. Quyết định nghiệp vụ đã chốt (Q1–Q12)

- **Q1. Thiếu hoặc hết hiệu lực thì chặn chuyển bước.** Chặn ở "QHKH gửi" và ở "HTTD chuyển Thẩm định". Chỉ **cấp phê duyệt** được chấp thuận ngoại lệ. HTTD và QHKH chỉ được **"Đề xuất ngoại lệ"**; đề xuất này hiện thành cờ ở Thẩm định, Rủi ro và Phê duyệt.
- **Q2. CIC do QHKH tra cứu** trên hệ thống CIC, sau khi có văn bản đồng ý của khách. HTTD chỉ kiểm tra hiệu lực. Thẩm định được "Yêu cầu tra cứu lại" (gửi QHKH). **Khách không nộp CIC.** Bản CIC khách tự nộp (nếu có) không được dùng để thẩm định.
- **Q3. AML/PEP/UBO/sanction do Tuân thủ kết luận** (vai trò Quản lý rủi ro/Tuân thủ, ở bước Ý kiến Rủi ro). HTTD chỉ kiểm tra có tài liệu, đúng mẫu, còn hiệu lực.
- **Q4. Cấp phê duyệt tính theo TỔNG cấp tín dụng** = dư nợ hiện hữu tại ngân hàng + đề xuất mới, của khách và người có liên quan. Ngưỡng: ≤20 / 20–100 / >100 tỷ (cấu hình được), xem `BANK.TIERS`. Nếu sau Thẩm định tổng tăng vượt cấp thì chuyển trạng thái "Nâng cấp phê duyệt".
- **Q5. BCTC kiểm toán bắt buộc khi đề xuất >20 tỷ.** Từ 20 tỷ trở xuống chấp nhận BCTC đã nộp cơ quan thuế.
- **Q6. Thẩm định được "Yêu cầu bổ sung" mà không trả hồ sơ.** Trạng thái riêng "Thẩm định – chờ bổ sung", SLA tạm dừng. QHKH chỉ tải tài liệu lên, không sửa đề xuất. HTTD kiểm tra tài liệu mới. Có bộ lọc riêng "Chờ bổ sung", tách khỏi "Bị trả lại".
- **Q7. Tài liệu AI phân loại hoặc đọc mà chưa có người xác nhận thì chặn nút Gửi.** Riêng lưu ý "Cần xác minh" (ví dụ lệch MST) không chặn, nhưng bắt buộc chuyển kèm và hiện thành cờ ở Thẩm định.
- **Q8. SME theo phân khúc nội bộ:** doanh thu năm ≤ 1.000 tỷ. Ghi trong chính sách §1.2 "Phạm vi KHDN SME".
- **Q9. Đổi ngưỡng phê duyệt cần 2 người:** Quản trị nhập kèm văn bản ủy quyền, người có thẩm quyền nghiệp vụ duyệt, ghi nhật ký. (Áp dụng ở trang Quản trị, đợt 3. Đợt 1 chỉ sửa câu chữ ở 03 nếu có nhắc tới.)
- **Q10. CIC hiệu lực 30 ngày** (đến hết ngày tra cứu + 29), tính đến **ngày trình phê duyệt**. Nếu sẽ hết hạn trước hạn Thẩm định hoặc Rủi ro thì tự gắn cờ "Cần tra cứu lại trước khi trình". Sao kê và xác nhận dư nợ: hiệu lực 30 ngày, tính cùng mốc.
- **Q11. Hạn bổ sung khi bị trả hồ sơ:** 5 ngày LV mặc định (`BANK.SLA.bosung_khach`). QHKH được gia hạn 1 lần, có lý do.
- **Q12. Phiên HĐTD đang mở chỉ hiện số đếm** "n/m đã bỏ phiếu", không hiện tên người hay nội dung phiếu cho đến khi đóng phiên.
- **Phiếu HĐTD:** 4 loại là Đồng ý / Đồng ý có điều kiện / Không đồng ý / Trả lại bổ sung. **Mọi phiếu bắt buộc lý do.** Không bỏ phiếu thay.

## B. Lịch, SLA, cách ghi hạn

- Hôm nay: **Thứ Năm 05/11/2026**. 31/10, 01/11, 07/11, 08/11 là cuối tuần.
- SLA theo policy §2.3 (`BANK.SLA`): Kiểm tra hồ sơ 2 ngày LV · Thẩm định 5 · Ý kiến Rủi ro 3 · Phê duyệt 2.
- Hạn = `BANK.addWorkdays(ngày nhận, SLA)`, lúc 17:00. **Không có hạn nào rơi vào thứ Bảy hoặc Chủ nhật.**
- Hiển thị "còn n ngày LV" bằng `BANK.dueText(hạn)` (0 thì ghi "hạn hôm nay").
- Mọi ngày "Nhận", "Gửi", "Xong" cũng phải là ngày làm việc.

## C. Kịch bản dữ liệu chuẩn

### VinaNova – HSV-2026-00187 (CTCP Bao bì VinaNova, MST 0318888888)
- 80 tỷ, khách mới tại ngân hàng (dư nợ hiện hữu tại ngân hàng = 0; dư nợ ở TCTD khác theo CIC 56 + 42 tỷ). Tổng cấp tín dụng 80 → **Cấp 2 · Phê duyệt Hội sở**.
- Dòng thời gian:
  - QHKH Nguyễn Thảo Vy tra cứu CIC trên hệ thống: **27/10/2026** (Thứ Ba), còn hiệu lực đến 25/11/2026.
  - QHKH gửi: **28/10/2026** (Thứ Tư).
  - HTTD Võ Văn Tâm kiểm tra xong: **30/10/2026** (Thứ Sáu) 16:00, checklist đủ. Không có ngoại lệ.
  - Thẩm định Lê Quang Huy nhận 30/10, **hạn 06/11/2026 17:00** (Thứ Sáu), hôm nay hiển thị "còn 1 ngày LV".
  - Sau đó: Rủi ro 3 ngày LV, Phê duyệt 2 ngày LV.
- **Hồ sơ đủ tài liệu.** Sao kê 12 tháng (11/2025–10/2026) đã có và đạt. Bỏ "thiếu sao kê" và mọi chữ "Cần bổ sung" hay "Bị trả lại" gắn với VinaNova.
- **CIC có 2 tài liệu tách biệt:**
  - `CIC` = **Kết quả tra cứu CIC do ngân hàng thực hiện** ngày 27/10/2026, người tra cứu Nguyễn Thảo Vy. Còn hiệu lực. Số liệu: nhóm nợ 1, dư nợ 56 tỷ ở TCTD A và 42 tỷ ở TCTD B (giữ đúng số liệu hiện tại của mockup). Không có ảnh scan; trình xem hiện trang HTML dạng "phiếu kết quả tra cứu" (có nguồn "Hệ thống CIC · tra cứu 27/10/2026 · Nguyễn Thảo Vy").
  - `CIC-KH` = **"Bản CIC khách tự nộp kèm (không dùng để thẩm định)"**, chính là ảnh `vinanova-cic-cr103.jpg`. Trạng thái **Cần xác minh – dấu hiệu không xác thực**, lý do:
    - dấu "Sở KH&ĐT / Phòng ĐKKD" không phải cơ quan phát hành CIC;
    - CIC không đưa ra kết luận tín dụng, nhưng bản này ghi "KHÁCH HÀNG KHỎE · đề nghị cấp tín dụng";
    - người ký "Trần Quốc Bảo" trùng tên thành viên HĐQT VinaNova (NQ 03/2024).
    Đây là **cờ Cao** chuyển cho Thẩm định và Tuân thủ.
  - Các liên kết trích dẫn số liệu CIC (nhóm nợ, dư nợ) trỏ tới `CIC`, không trỏ tới `CIC-KH`.
- **Phạm Đức Lâm** (thành viên HĐQT VinaNova) đã xác nhận Phiếu TTKH với tư cách cán bộ của **ngân hàng khác**. Sửa tên ngân hàng trên mọi chữ thành "NH TMCP Phương Bắc (hư cấu)". Lý do cờ: "Phiếu do cán bộ ngân hàng khác xác nhận; người này là thành viên HĐQT của khách → độ tin cậy của Phiếu thấp". (Ảnh scan giữ nguyên, chỉ sửa chữ trong UI.)

### Mekong Flex – chỉ còn ở trang 04 (nháp)
- Trang 04: nháp **DX-2026-00412**, 80 tỷ (khớp dữ liệu gốc CR-B02), QHKH Nguyễn Thảo Vy, chưa gửi.
  - CIC cũ tra cứu 02/10/2026, hết hiệu lực từ 01/11/2026.
  - QHKH bấm "Tra cứu CIC mới" ngày 05/11/2026 → còn hiệu lực đến 04/12/2026.
- Trang 03: **bỏ Mekong khỏi hàng chờ Thẩm định.** Thay bằng doanh nghiệp hư cấu **"CTCP Cơ khí Trường An"** (không dùng tên gần thương hiệu thật), HSV-2026-00192, 60 tỷ, đang ở Thẩm định, nhận 05/11 09:10 → hạn 12/11 17:00. Cảnh báo giới hạn ngành của Rủi ro: tính lại với khách này nếu cùng ngành, nếu khác ngành thì bỏ khỏi phép tính và sửa phần trăm cho khớp.
- Trang 03, hàng chờ QHKH: thêm 1 dòng **"Nháp DX-2026-00412 · Mekong Flex · 80 tỷ · đang soạn"** dẫn sang trang 04 (`BANK.hrefFor(3,{draft:'DX-2026-00412'},role)`). Số dòng "chờ bạn" của QHKH vẫn phải bằng `BANK.BADGES.qhkh` (= 4); nháp được tính là 1 việc.

### Các hồ sơ khác ở trang 03
- **Đông Á:** HTTD nhận 05/11 09:10 → hạn 09/11 17:00.
- **Cảng Xanh:** HTTD nhận 04/11 14:20 → hạn 06/11 17:00.
- Mọi hồ sơ khác: tính lại hạn theo mục B. Không còn hạn nào là 07/11.
- Ví dụ minh họa Q6 "Thẩm định – chờ bổ sung": chọn 1 hồ sơ **không phải VinaNova** trong hàng chờ Thẩm định hoặc QHKH, gắn trạng thái này và bộ lọc "Chờ bổ sung", SLA "tạm dừng".
- Lý do loại trừ Bùi Thanh Sơn ở hồ sơ Bắc Hà: đổi thành "từng là QHKH quản lý khách hàng này (2023–2024)".

### Badge
- `BANK.BADGES`: qhkh 4 · httd 3 · tdinh 3 · ruiro 2 · pheduyet 3. Rail ở mọi trang đọc từ đây. Header "n hồ sơ chờ bạn" và số dòng "chờ bạn" ở 03 phải khớp.

## D. Quy tắc UI đã chốt (mức Cao)

1. **Liên kết thật giữa các trang.** Mọi `[data-page]` gọi `BANK.navigate(page, params, S.role)`. Nếu trang chưa có file thì toast "Trang <tên> sẽ có ở đợt sau". Mọi trang nạp `common.js`.
2. **Liên kết 2 chiều 02b ↔ 05.**
   - 02b → 05: mọi nút nguồn của số liệu (dòng chỉ số mở rộng, cờ, [n] trong panel AI) mở `05#role=<r>&doc=<id>&page=<p>&field=<f>&cite=<n>&from=hsv&sec=<mục 02b>`.
   - 05 → 02b: link "Hồ sơ vay ›" và nút "Về <mục> trong hồ sơ" (khi có `from=hsv`) mở `02b#role=<r>&sec=<mục>&metric=<id>`.
   - 05 phải giữ nguyên các id tài liệu và khóa trường hiện có, trừ việc thêm `CIC-KH`.
3. **Trạng thái không có quyền** (một component cho mọi trang): h1 là tên trang trung tính, không có meta, **không tên khách hàng**; một icon khiên, tiêu đề, lý do, **đúng 1 nút có icon** (với Quản trị là "Mở Quản trị", icon bánh răng); nền `--canvas`.
4. **Nút chính (primary) chuyển bước luôn ở header phải**, mọi trang, tối đa 1 nút. Trong nội dung chỉ lặp lại dưới dạng dòng khóa hoặc link.
   - 02b: giữ như hiện tại.
   - 03 (trang chủ): **không có primary chuyển bước**; QHKH có "Tạo đề xuất vay" ở header, giữ nguyên.
   - 04 wizard: header phải là "Tiếp: <bước sau>" (primary). Bước 5 thì primary là "Gửi Hỗ trợ tín dụng" (khóa kèm lý do cho tới khi đủ điều kiện). Chân wizard chỉ còn "Quay lại".
   - 05: HTTD có primary "Chuyển Thẩm định" (khóa kèm lý do tới khi mọi mục kiểm tra đạt hoặc có ngoại lệ đã được cấp phê duyệt chấp thuận). Các vai trò khác: không có primary; nút về hồ sơ là link.
   - Nút AI nổi không được che nội dung hay nút nào.
5. **Bố cục ở 1280px:**
   - Khi panel AI mở và viewport < 1360px thì **ẩn hẳn mục lục** (mọi trang).
   - Bảng: bỏ `table-layout:fixed` cho cột tên, cột tên `min-width:200px`; khi AI mở thì ẩn cột phụ (gộp vào dòng phụ của cột tên).
   - Thanh công cụ: `flex-wrap`, `min-width:0`. Cụm phải header: `flex:none`, meta co lại bằng ellipsis.
   - Kiểm tra bắt buộc ở 1280×800 và 1440×900, AI mở và đóng: **không chữ đè chữ, không bị cắt, `document.documentElement.scrollWidth <= innerWidth`.**
6. **Chữ trên nút khóa** dùng `--text-3`, không dùng `--text-disabled`.

---

## E. Quyết định bổ sung (người dùng chốt 05/11/2026, sau đợt sửa mức Cao)

- **E1. Ngoại lệ (sửa Q1).** Tài liệu thiếu hoặc hết hiệu lực thì chặn chuyển bước, **trừ khi** đã có "Đề xuất ngoại lệ" kèm lý do (QHKH hoặc HTTD lập). Có đề xuất thì được chuyển bước; cờ ngoại lệ đi theo hồ sơ qua Thẩm định, Rủi ro và Phê duyệt. Cấp phê duyệt **chấp thuận hoặc từ chối ngoại lệ cùng lúc với quyết định**. Từ chối ngoại lệ thì hồ sơ bị "Trả lại bổ sung". Chưa có đề xuất thì vẫn chặn.
- **E2. Thẩm định – chờ bổ sung (Q6).** QHKH có 5 ngày LV để bổ sung (`BANK.SLA.bosung_khach`). Khi đã có tài liệu, SLA Thẩm định **tính tiếp** số ngày còn lại, không tính lại từ đầu.
- **E3. Rủi ro trả về Thẩm định:** SLA Thẩm định tính lại đủ 5 ngày LV từ ngày trả.
- **E4. Nhóm khách hàng liên quan:** QHKH xác nhận trước khi gửi (chưa xác nhận thì chặn Gửi, như Q7). Thẩm định rà lại.
- **E5. BCTC kiểm toán (sửa Q5):** bắt buộc khi **tổng cấp tín dụng** > 20 tỷ (cùng cách tính với Q4).
- **E6. Hiệu lực 30 ngày** của sao kê và xác nhận dư nợ tính từ **ngày ngân hàng cấp**, giống CIC tính từ ngày tra cứu.
- **E7. Số liệu lấy thẳng từ hệ thống CIC** (dữ liệu máy-máy) **không** cần người xác nhận từng trường; nhãn nguồn ghi "Hệ thống CIC". Chỉ số liệu do AI hoặc OCR đọc mới cần xác nhận.
- **E8. Tách bạch (§3.4):** không được phê duyệt hoặc bỏ phiếu nếu đã tham gia bất kỳ bước nào của hồ sơ **hoặc** từng là QHKH quản lý khách hàng này trong 2 năm gần nhất.
- **E9. Văn bản đồng ý tra cứu CIC của khách là bắt buộc.** Thiếu văn bản này thì nút "Tra cứu CIC" bị khóa kèm lý do. Văn bản thuộc danh mục hồ sơ §6.1.

**Các quyết định nhỏ (của trợ lý, người dùng đã xem):**
- HTTD sau khi đã chuyển: thay nút "Chuyển Thẩm định" bằng dòng trạng thái "Đã chuyển Thẩm định 30/10/2026 16:00".
- Ngân hàng phát hành sao kê VinaNova đổi thành "NH TMCP Phương Bắc (hư cấu)". Kỳ sao kê 01/11/2025–27/10/2026, cấp 27/10/2026.
- Cờ "Dư nợ CIC 98 tỷ vs BCĐKT 56 tỷ" hạ xuống **Trung bình**, kèm ghi chú "hai thời điểm khác nhau: CIC 27/10/2026, BCĐKT 31/12/2025".
- Tuân thủ có nút kết luận riêng cho cờ bản CIC khách tự nộp (ở mục Ý kiến rủi ro).
- Nút "Hỏi AI" nổi: thống nhất một kiểu cho mọi trang theo shell (nổi, không che nội dung; nội dung chừa padding đáy).
- 03: dòng nháp không có dữ liệu mockup thì không gắn link, hiện toast "Nháp này chưa có trong mockup".

---

## F. Quyết định vòng 3 (người dùng đồng ý cả 12 đề xuất, 05/11/2026)

- **F1. Bỏ hẳn nút "Hỏi AI" nổi** ở mọi trang và shell. Lối vào AI: nút "Hỏi AI" ở header, mục Trợ lý AI trên rail, Ctrl+J, và "Hỏi AI về <đối tượng>" tại chỗ. Bỏ rãnh phải và các phần bù cho nút nổi. Thay thế F1 cho G3 và câu "nút AI nổi" ở D4.
- **F2. VinaNova đủ 16/16 mục §6.1** (bảng ở mục F-DOC). Mục mới là dòng "Đã đủ", ghi "minh họa", không có bản xem.
- **F3. Giấy tờ TSBĐ của VinaNova đã có,** bỏ mọi chữ "Chờ…". LTV chuyển sang **"Cần xác minh"**, lý do: giá trị đang lấy từ Phiếu TTKH (tài liệu bị cờ), chưa đối chiếu với chứng thư định giá.
- **F4. Vẫn 8 cờ, nâng cờ `audit` lên Cao → 4 cờ Cao.** Gộp: (a),(b) vào `eq` và `cr`; (c),(e),(f) vào `audit`; (d) vào `cickh` kèm một dòng cho BCTC. Lệch EBITDA vào `audit`: cùng số 62,2 lúc là LNST (KQKD tr.1) lúc là LNTT (LCTT tr.3); 62,2 + 17,8 + 48 = 128 khác EBITDA 98; DSCR 1,34 dùng 98, nếu dùng 128 thì ≈ 1,76. Thêm trường "Cần xác minh" ở 05: tiền cuối kỳ LCTT 123,0 và 77,6 khác BCĐKT 81 và 59; "doanh thu chuyển về NH ≈ 74%" không khớp 742/705. "Checklist đủ" không đổi (Q7). Không sửa lịch sử HTTD; ghi "Thẩm định phát hiện 04/11".
- **F5. CIC hết hiệu lực KHÔNG được "Đề xuất ngoại lệ"** (siết E1), vì QHKH tự tra lại được. Ngoại lệ duy nhất: hệ thống CIC gián đoạn, và vẫn phải tra lại trước khi trình phê duyệt.
- **F6. Giữ "Trả lại QHKH" ở Thẩm định,** bắt buộc lý do. "Yêu cầu bổ sung" = thiếu tài liệu, hồ sơ ở lại, SLA tạm dừng. "Trả lại" = phải sửa đề xuất. Nhận lại thì SLA Thẩm định tính lại đủ 5 ngày LV. Ghi rõ khác biệt ngay trên nút.
- **F7. SLA "tính tiếp" (E2) bắt đầu từ lúc HTTD ghi tài liệu mới đạt.** Hạn bổ sung tính từ ngày yêu cầu. Hiện "còn n ngày LV khi tính tiếp".
- **F8. Tuân thủ kết luận cờ `cickh`:** 3 lựa chọn, đều bắt buộc lý do: "Có dấu hiệu không xác thực: xử lý theo quy trình gian lận/AML" · "Chưa đủ căn cứ: yêu cầu giải trình" · "Không phát hiện vấn đề". Kết luận ở bước Ý kiến Rủi ro, kết quả hiện cho cấp phê duyệt, AI không gợi ý. Thẩm định có nút "Báo sớm Tuân thủ" (chỉ thông báo, không đổi bước) và ghi "Đã ghi nhận, chuyển Tuân thủ"; cờ vẫn mở nhưng không chặn "Trình Rủi ro".
- **F9. Hình thức trả tiền thuê đất:** chưa chọn thì chặn Gửi. "Hằng năm" thì gắn cờ, Thẩm định tách phần giá trị, chỉ tính tài sản gắn liền với đất; không tự giảm giá trị ở bước QHKH. "Một lần" vẫn cần chứng từ. Tách dòng 78 tỷ thành 2 dòng (nhà xưởng / quyền thuê). Câu chữ pháp lý ghi "Pháp chế cần xác nhận", không khẳng định.
- **F10. Nhóm liên quan:** thêm nút "Không thuộc nhóm", bắt buộc lý do và căn cứ. Tổng và cấp tính lại theo kết quả, chuyển kèm cờ cho Thẩm định rà lại. Thẩm định cộng lại mà vượt cấp thì "Nâng cấp phê duyệt".
- **F11. Văn bản đồng ý tra cứu CIC** có giá trị suốt quá trình xử lý hồ sơ, kể cả các lần tra lại, trừ khi văn bản ghi khác. Bản AI phân loại chưa xác nhận thì chưa đủ để tra cứu.
- **F12. Cảnh báo số tiền bất thường từ 500 tỷ** (`BANK.AMOUNT_WARN_BILLION`), cấu hình được, không chặn.

### F-DOC. Bộ tài liệu VinaNova (nguồn duy nhất cho mọi số đếm)

| # §6.1 | Mục | id trên 05 | Ghi chú |
|---|---|---|---|
| 1 | Giấy đề nghị cấp tín dụng | `DENGHI` | mới, minh họa |
| 2 | Giấy ĐKDN | `DKKD` | |
| 3 | Điều lệ | `DIEULE` | mới, minh họa |
| 4 | DS thành viên/cổ đông & bên liên quan | `A01-02` | |
| 5 | Giấy tờ tùy thân người đại diện | `CCCD` | mới, minh họa |
| 6 | Nghị quyết về vay và thế chấp | `NQ` | |
| 7 | Văn bản đồng ý tra cứu CIC | `DONGY-CIC` | mới, minh họa, ký 26/10/2026 |
| 8 | BCTC 2025 đã kiểm toán | `A01-04` | 02b không tách thành 3 |
| 9 | BCTC quý 3/2026 | `BCTC-Q3` | mới, minh họa |
| 10 | Bảng kê công nợ & tồn kho | `CONGNO` | mới, minh họa |
| 11 | Sao kê 12 tháng | `A01-07` | ngân hàng đổi thành "NH TMCP Sông Hậu (hư cấu)" để không trùng ngân hàng của Phạm Đức Lâm |
| 12 | Tờ khai GTGT Q2 và Q3/2026 | `GTGT-2Q` | mới, minh họa |
| 13 | Kết quả tra cứu CIC | `CIC` | hệ thống, QHKH không tải lên |
| 14 | Phương án kinh doanh | `PA` | mới, minh họa |
| 15 | Hợp đồng đầu ra (2) | `HD` | mới, minh họa |
| 16 | Hồ sơ TSBĐ | `TSBD` | mới, minh họa: GCN QSDĐ, hóa đơn gốc, chứng thư định giá |

- **Tài liệu bổ sung, không tính vào 16:** `A01-01` Phiếu thông tin khách hàng, `A01-05` BCTC quản trị 6T/2026, `A01-06` VAT & đối chiếu doanh thu 2025.
- **Không tính:** `CIC-KH`.
- **Cách ghi mọi nơi:** "đủ 16/16 mục bắt buộc · 3 tài liệu bổ sung · 1 bản CIC khách nộp (không tính)". Nhật ký 28/10: "tải lên 19 tài liệu" (15 mục + 3 bổ sung + 1 bản CIC khách nộp).
- Ngày các mục mới ≤ 27/10/2026, là ngày làm việc. Giá trị lấy từ `BANK.VINANOVA.docs`.

### Các quyết định nhỏ của trợ lý (sẽ báo người dùng)
- Chi nhánh dùng một tên "CN Sài Gòn" ở mọi trang.
- Bỏ "Trưởng phòng Thẩm định phân công 16:05", thay bằng "Hệ thống phân công 30/10 16:00".
- E8 ở Bắc Hà: ghi "từng là QHKH quản lý khách hàng này đến 12/2024" để nằm trong cửa sổ 2 năm.
- §4.1 ở 02b khôi phục "ý kiến chấp nhận toàn phần", chỉ đổi điều kiện bắt buộc kiểm toán theo E5.
- Viền focus ô tìm kiếm đậm lên, đạt tương phản ≥ 3:1.
- `.cite` chốt 12px; ngoại lệ chữ 11px chỉ còn cho badge rail và chấm stepper.

### Chốt thêm sau khi sửa 02b (quyết định của trợ lý)
- `cickh` vẫn mở (8 cờ, 4 Cao) nhưng không chặn trình: cờ Thẩm định phải xử lý là 7.
- EBITDA và LNST chuyển "Cần xác minh" vì đang nằm trong cờ Cao `audit`: 5 AI đề xuất · 11 cần xác minh · 9 đã xác nhận; tiến độ 13/39. Số lấy từ `BANK.VINANOVA.counts`.
- Ngày tài liệu minh họa: `DENGHI`, `CCCD`, `DONGY-CIC`, `CONGNO`, `PA` 26/10/2026 · `DIEULE` 15/06/2022 · `BCTC-Q3`, `GTGT-2Q` 20/10/2026 · `HD` 15/09/2026 · `TSBD` 23/10/2026.
- Giữ §4.1 (chất lượng BCTC) và §4.4 (chỉ số vận hành), bổ sung vào bảng § chính sách.

### Luật Hội đồng tín dụng đã chốt trước đó (ghi lại để dùng khi thiết kế database)
Tự chuyển khi vượt cấp 2, phiên tự mở; Chủ tịch (hoặc Phó nếu Chủ tịch bị loại trừ) đặt hạn; 4 loại phiếu, bắt buộc lý do, không bỏ phiếu thay. Túc số: hơn một nửa thành viên đủ điều kiện. Thông qua: đa số phiếu đã bỏ; hòa thì người chủ trì quyết định. Hết hạn mà không đủ túc số thì mở lại phiên. Hỏi đáp công khai; phiếu ẩn tới khi đóng phiên. Biên bản tự sinh, người chủ trì xác nhận và chốt điều kiện; nhật ký bất biến.

### Chốt thêm sau vòng 3 (quyết định của trợ lý, sẽ báo người dùng)
- Thiếu văn bản đồng ý tra cứu CIC: không được đề xuất ngoại lệ, vì đây là căn cứ pháp lý để tra cứu.
- Sao kê hết hiệu lực: được đề xuất ngoại lệ (F5 chỉ cấm CIC).
- Trả tiền thuê đất "một lần" mà chưa có chứng từ: không chặn Gửi, chuyển kèm cờ.
- Trên hệ thống thật, sau khi đã gửi, "Tạo đề xuất vay" mở đề xuất mới. Mockup chỉ có một nháp nên mở lại ở chế độ chỉ xem.
- Tỷ lệ tiền về tài khoản ghi rõ hai kỳ khác nhau: sao kê 11/2025–10/2026, doanh thu năm 2025.

### Chốt thêm sau review vòng 3 (quyết định của trợ lý, sẽ báo người dùng)
- Chỉ số suy ra nhận trạng thái thấp nhất của đầu vào: DSCR, Nợ vay/EBITDA, biên EBITDA, EBIT thành "Cần xác minh". Số đếm 1 AI đề xuất · 15 cần xác minh · 9 đã xác nhận; tiến độ vẫn 13/39. Tạm dùng EBITDA 98 để thận trọng.
- Cờ Cao chỉ đóng được khi ghi cách xử lý.
- Tiền về tài khoản: "Chưa kiểm chứng được", không kết luận "không khớp".
- Số liệu sao kê VinaNova là số minh họa, không có ảnh gốc, ghi rõ trên trang.


---

## Q-A đến Q-U: các quyết định bổ sung (đã duyệt 06/11/2026)

Nguồn: mục 15 của đặc tả đợt 1. Các mã Q-A…Q-U dưới đây đã được người dùng duyệt ngày 06/11/2026.

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q-A | Chuyển luật và mockup vào repo? | Có: luật vào `docs/business/`, mockup vào `docs/design/batch-1/` |
| Q-B | Role Thẩm định? | Thêm `credit_appraiser`; `credit_manager` để phân công lại. Lưu ý: trưởng phòng là tác nhân thứ 8, ngoài 7 vai trò đã chốt, chỉ phân công chứ không có trang riêng |
| Q-C | Rủi ro và Tuân thủ? | 2 role, 1 mã UI; kết luận F8, AML chỉ Tuân thủ |
| Q-D | Hệ thống phân công hồ sơ thế nào? | Mỗi bước một nhóm, chọn người ít việc nhất, trưởng phòng được chuyển kèm lý do |
| Q-E | Tính SLA khi tạm dừng giữa ngày? | Còn lại = số ngày LV từ ngày tạm dừng đến hạn; hạn mới = ngày HTTD ghi đạt + số còn lại, 17:00 |
| Q-F | Ngày nghỉ lấy từ đâu? | Bảng do Quản trị nhập, seed lễ Việt Nam 2026–2027 |
| Q-G | OCR, LLM, CIC thật hay giả? | CIC giả lập có nhãn; OCR, LLM thật cấu hình được, có che PII; dữ liệu seed làm dự phòng |
| Q-H | `agent_engine` trong đợt này? | Không nối vào 4 trang; tắt `AGENT_ENGINE_URL` |
| Q-I | Kiểm toán thấy phiếu khi phiên đang mở? | Không, kể cả trong nhật ký |
| Q-J | Quản trị có truy cập khẩn cấp? | Không |
| Q-K | Giữ `/chat`, `/dashboard`? | Giữ `/chat` cho Trợ lý AI; ẩn `/dashboard`, `/foundation`; simulation chỉ dùng khi dev |
| Q-L | Tờ trình thẩm định làm đến đâu? Mockup 02b coi đây là điều kiện để trình Rủi ro và mở nút quyết định, nhưng tài liệu này chưa có bảng, API, lát nào cho nó | Có trong đợt 1: 7 mục, tự lưu, AI chèn nội dung phải xác nhận. Lúc trình chốt một phiên bản không sửa được, Rủi ro và cấp phê duyệt đọc đúng bản đó; trả lại thì tạo bản mới. Xuất PDF để cuối. Thêm 1 lát cỡ L |
| Q-M | Sau khi vá RLS, ai đọc được hồ sơ nào? | Người được phân công đọc và ghi đúng bước của mình; người đã làm xong một bước vẫn đọc được, không ghi. Cùng chi nhánh không tự thấy nhau, trừ GĐ chi nhánh. Hội sở đọc hồ sơ được phân công. Kiểm toán đọc toàn hệ thống. Cấp phê duyệt gắn theo thuộc tính nhân viên (cấp + đơn vị). Bị E8 loại thì chuyển người cùng cấp trước, hết người mới lên cấp cao hơn. QHKH và HTTD không đọc được nội dung kết luận AML/gian lận |
| Q-N | Bước Ý kiến Rủi ro xong khi nào? Tuân thủ kết luận bất lợi thì sao? | Một bước, 2 ý kiến con (Rủi ro, Tuân thủ), chung SLA 3 ngày, có thể một người giữ cả hai ở dữ liệu mẫu. "Có dấu hiệu không xác thực": **tạm dừng** chờ xử lý, không tự kết thúc và không cho rút hồ sơ; đóng xử lý thì hồ sơ vẫn tới cấp phê duyệt kèm kết luận, cấp đó quyết định. "Chưa đủ căn cứ": dùng cơ chế chờ bổ sung (5 ngày LV, HTTD kiểm tra). "Không phát hiện vấn đề": đi tiếp |
| Q-O | Các đường đi còn thiếu của quy trình? | Cấp phê duyệt "Trả lại bổ sung" về Thẩm định, hoặc về QHKH nếu phải sửa đề xuất; người đã trả lại vẫn được duyệt khi hồ sơ quay lại. QHKH nộp lại thì qua HTTD 2 ngày, chỉ kiểm phần đổi. Quá hạn bổ sung sau khi gia hạn: QHKH hoặc trưởng phòng "Rút hồ sơ", bắt buộc lý do, phân biệt khách rút và quá hạn, chặn khi đang xử lý dấu hiệu gian lận (thêm trạng thái kết thúc "Đã rút"). CIC hoặc sao kê hết hiệu lực giữa chừng: gắn cờ, QHKH tra lại, không đổi bước, không dừng SLA, chưa trình phê duyệt được, trừ sao kê có ngoại lệ. CIC thì luôn phải tra lại trước khi trình phê duyệt, kể cả khi hệ thống CIC từng gián đoạn (F5; người dùng chốt 06/11/2026). "Ngày trình phê duyệt" là lúc Rủi ro chuyển sang Phê duyệt; với Cấp 3 là ngày mở phiên |
| Q-P | Hồ sơ vượt 100 tỷ khi chưa có trang Hội đồng? | Vẫn đi tới bước Hội đồng theo luật, hiện "Chờ phiên Hội đồng – có ở đợt 2", không tính vào việc của ai. Không có đường duyệt tạm |
| Q-Q | Tới lúc nghiệm thu, các mốc 05/11 đã qua thì sao? | Nạp lại seed trước mỗi lần nghiệm thu, dịch mọi ngày theo ngày chạy (giữ đúng khoảng ngày làm việc). Unit test dùng ngày cố định. Không dùng đồng hồ giả trong hệ thống |
| Q-R | Chính sách nào là chuẩn? Chỉ số không đạt thì sao? Dư nợ lấy từ đâu? | `CS-TD-SME/2025` là chuẩn (DSCR ≥ 1,25), RAG nạp từ văn bản này, bỏ `agent_engine/rag_corpus/credit_policy.md` (ghi 1,2). Dữ liệu dư nợ là seed có nhãn |
| Q-S | Chỉ số không đạt chính sách thì sao? | Ghi nhận là **ngoại lệ chính sách**, tách khỏi ngoại lệ tài liệu. Không chặn trình, Thẩm định nêu lý do, cấp phê duyệt quyết định rõ. Không tự nâng cấp phê duyệt |
| Q-U | Mở tài liệu từ mục lục ở trang 05: hiện đủ danh sách trường hay chỉ một thẻ? Màn này hiện 43 phần tử bấm được, vượt mức 30; mở từ Hồ sơ vay hay trích dẫn AI đã còn 21–25 | Dùng màn một thẻ cho cả trường hợp này, kèm link "n trường khác trên trang này" |
| Q-T | "Tổng cấp tín dụng" (Q4, E5) gồm những gì? | Dư nợ + hạn mức đã cấp chưa rút + bảo lãnh, L/C + đề xuất mới, của khách và người liên quan. Cách này chặt hơn chỉ tính dư nợ; Pháp chế cần xác nhận |
