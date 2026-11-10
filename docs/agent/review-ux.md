# Rà soát giao diện và trải nghiệm (V043, `e6e5f24`)

Phạm vi: chỉ rà, không sửa. Chụp bằng Playwright trên web :3000 thật (engine `llm`), vai trò QHKH, Hỗ trợ tín dụng, Thẩm định, Rủi ro, Phê duyệt, Giám đốc, Kiểm toán, Quản trị. Cỡ 1366×768 (đủ vai) và 1920×1080 (Phê duyệt). Ảnh ở `/tmp/r1/*.png` (không commit). Đã biết, không báo lại: L08–L16 và mục 6 của `qa-doi-agent.md`.
Giới hạn trung thực: độ tương phản đánh giá bằng mắt, chưa đo tỉ lệ; chưa chạy đội agent trên hồ sơ mới (tránh tốn LLM và đổi trạng thái); chưa rà mobile.

## 0. Trang đã rà
| Trang | Vai trò | Cỡ | Ảnh |
| --- | --- | --- | --- |
| /login + Keycloak | chưa đăng nhập | 1366 | login.png |
| /viec-cua-toi (Hồ sơ của tôi / Hồ sơ chờ phê duyệt) | QHKH, Thẩm định, Rủi ro, Phê duyệt, Giám đốc, Kiểm toán, Quản trị, HTTD | 1366, 1920 | *-_viec_cua_toi.png |
| /de-xuat-vay | QHKH | 1366 | qhkh-1366-_de_xuat_vay.png |
| /de-xuat-vay/:id | QHKH | 1366 | …0006.png |
| /ho-so-vay/:id | QHKH, Thẩm định, Rủi ro, Phê duyệt (cuộn 4 đoạn) | 1366, 1920 | …0001-s*.png, …0011.png, 1920 …0018.png |
| /doi-chieu, /doi-chieu/:id | QHKH (bị chặn), HTTD, Kiểm toán | 1366 | httd-…_doi_chieu*.png |
| /chat | QHKH | 1366 | qhkh-1366-_chat.png |
| /dashboard: Tổng quan, Agent traces (+ngăn chi tiết case), So sánh hiệu năng | QHKH, Giám đốc, Quản trị | 1366 | dash-*.png, trace*.png |
| /customer/:id (trạng thái không tìm thấy), 404, Bảng AI (Trợ lý AI) | QHKH, Phê duyệt | 1366 | …customer…, aipanel.png |
Mockup đối chiếu: 02b (hồ sơ), 03 (việc của tôi), 04 (tạo đề xuất), 05 (đối chiếu).

## 1. Danh sách phát hiện
Tổng 18: Chặn demo 1, Cao 4, Vừa 9, Nhẹ 4. Công: S <1h, M 1–3h, L >3h.

| Mã | Mức | Trang · vai | Mô tả | Căn cứ | Đề xuất | Công |
| --- | --- | --- | --- | --- | --- | --- |
| UX-01 | Chặn demo | /ho-so-vay/:id · mọi vai | Khung hồ sơ khác hẳn 02b: không stepper bước, không mục lục trái, không khối "Còn N việc", không thẻ chỉ số chính, không nút hành động trên header. Trang dài ~4000px (Thẩm định hồ sơ 00187): bảng chỉ số 8 hàng chữ dày, rồi cờ, dòng thời gian, tờ trình 7 ô nhập, và danh sách cờ lặp lại ở khối Hành động. Nút chính ("Quyết định") nằm ở cuối trang; người xem lần đầu không biết việc tiếp theo. Tiêu đề "Chi tiết hồ sơ vay · …" dài. | Mockup 02b; design-system §0 (3 câu màn hình đầu), §1.2 | Thêm header dính: tên, bước, hạn, nút chính; mục lục trái hoặc tab (Chỉ số / Cờ / Tờ trình / Tài sản / Đội agent / Nhật ký); khối "việc cần làm" lấy từ dữ liệu; bỏ lặp cờ trong Hành động. Xem X1. | L |
| UX-02 | Cao | Hồ sơ · Thẩm định, QHKH | Khối "Đội agent thẩm định" (AI đề xuất – chưa xác nhận, nút Chạy đội agent) nằm dưới cờ, tài sản, trước tờ trình, ngoài màn hình đầu. Chưa chạy: chỉ một dòng "Chưa chạy đội agent". Không có sơ đồ ngắn "Planner → Credit/Compliance/Operations → Validation → người quyết định". Vai Phê duyệt chỉ thấy khóa + chữ. | Yêu cầu phần 4 của brief; AI chỉ đề xuất (rules.md) | Đưa khối lên đầu tab/khối riêng; khi trống hiện sơ đồ 5 bước mô tả vai từng agent, nhãn tím "AI đề xuất" và nhãn "Người quyết định: <vai>" ở bước cuối; nút chạy thành hành động chính. | M |
| UX-03 | Cao | /dashboard Agent traces, Tổng quan · mọi vai | Danh sách 200 case: cột Yêu cầu chỉ có "80.000.000.000 VND · 12 tháng", không tên khách/mã hồ sơ; hàng trùng nhau; mã `case_…` băm; nhiều dòng Nháp 0 công cụ, mục đích viết thường không dấu ("von luu dong"). Tổng quan: 727 case, "Cần bổ sung 435", "Từ chối 52", "Hoàn thành 8" – do chạy kiểm thử, người xem hiểu sai quy mô thật. Lượt đo benchmark mang nhãn kiểm thử ("kiểm thoái lui sửa QA lần 2"). | Nguyên tắc: dữ liệu demo phải đọc được; design-system §0 | Cột "Khách hàng · mã hồ sơ" lấy từ loan; lọc case Nháp 0 công cụ; ẩn hoặc gắn nhãn lượt đo kiểm thử, chọn lượt đo chính làm mặc định; dọn dữ liệu trước khi demo (việc của người vận hành, không đổi code). | M |
| UX-04 | Cao | /dashboard, /chat, /customer/:id · mọi vai | Ba trang dùng khung riêng (logo "SH-AI – Hệ chuyên gia số nội bộ", nút "Về giao diện trò chuyện") đặt dưới topbar "SHB AI Assistant": hai thanh đầu trang chồng nhau, hai thương hiệu, nền be khác nền trắng 02b; chat lặp avatar người dùng ở cuối sidebar. Trang khách hàng lỗi dùng minh họa xám khác bộ trạng thái rỗng. | design-system §1, "mọi trang như cùng một sản phẩm" | Bỏ header riêng, dùng `PageHead` và token chung; dashboard dùng tiêu đề "Giám sát đội agent" ngay dưới topbar. | M |
| UX-05 | Cao | /ho-so-vay/:id (ngoài phạm vi), /customer/:id · Thẩm định, QHKH | Lỗi 403/404 hiển thị "Không tải được hồ sơ" kèm nút chính "Thử lại" (vô ích). Khách hàng không tìm thấy chỉ có "Quay lại". `/doi-chieu` bị chặn thì đúng (NoAccess) nhưng hai kiểu lỗi khác nhau. | Nguyên tắc: thông báo lỗi nói nguyên nhân và lối thoát | Phân biệt 403/404/5xx; 403/404 dùng `NoAccess` với nút "Về Việc của tôi"; chỉ 5xx có "Thử lại". | S |
| UX-06 | Vừa | /ho-so-vay/:id · 1920 | Không giới hạn bề rộng nội dung: bảng chỉ số kéo 1800px, cột chữ cách xa nhau; thẻ "Cờ cảnh báo" trống lệch hai cột. Hồ sơ không có chỉ số vẫn hiện khung bảng tiêu đề trống. | design-system §1.3 mật độ | `max-width` ~1280 canh giữa; trạng thái rỗng bỏ tiêu đề cột; gộp hai thẻ rỗng. | S |
| UX-07 | Vừa | Mọi trang | Tên người và vai không dấu ở dữ liệu seed ("Can bo Tin dung Mau", "Giam doc Chi nhanh Ha Noi Mau"), hiện ở topbar, nhật ký, đội. | Nhất quán ngôn ngữ | Sửa seed (việc ngoài quy trình rà); giữ ghi chú. | S |
| UX-08 | Vừa | Hồ sơ · Thẩm định | Badge "Đã điền", "Đạt" chữ xanh trên nền xám-xanh đục, nhìn mắt thấy tương phản thấp (chưa đo); "Chưa điền" cam trên nền cam nhạt. Badge "Mâu thuẫn chưa chốt ở trang 05" tham chiếu số trang trong mockup, chưa link rõ. | design-system §1.1 trạng thái ≥4.5:1 | Dùng cặp `--success/--success-bg`; đo lại bằng axe. Chuyển "trang 05" thành link "Đối chiếu tài liệu". | S |
| UX-09 | Vừa | Dashboard, trace, benchmark | Anh–Việt lẫn: "Agent traces", "Challenge của Validation", "Planner giao việc", "Credit/Compliance/Validation", "case", "Agent tự gọi" lặp 12 hàng. Số không nhất quán: "8741 lần" (không phân cách), "13.099 token", "2.8689 USD", "$0.0032", "40.6 giây" (chấm thập phân) so với "1,34 lần" ở hồ sơ. Ngày "01:18 10/11/2026" so với "10/11/2026". | Nhất quán thuật ngữ, số, ngày | Một bảng thuật ngữ: "Dấu vết agent", "Phản biện của Kiểm chứng"; format số/tiền/giờ dùng chung `vi-VN`; gộp cột "Agent tự gọi" thành chú giải. | S |
| UX-10 | Vừa | Mọi trang | Không có breadcrumb; từ hồ sơ/đối chiếu/đề xuất không có đường quay lại danh sách ngoài rail; rail 64px chỉ có icon (chưa kiểm tooltip bằng bàn phím); tiêu đề trang đổi kiểu giữa "Chi tiết hồ sơ vay · X" và "Đối chiếu tài liệu · X". | Điều hướng; 02b có đường dẫn | Thêm breadcrumb "Việc của tôi › Hồ sơ HSV-… › Đối chiếu"; kiểm `aria-label`/tooltip cho rail. | M |
| UX-11 | Vừa | Dashboard So sánh hiệu năng | Hộp lượt đo lặp cùng một chuỗi hai lần, kèm mã thời gian thô `20261109T162746Z-…` và id model thô ("openai/gpt-6-luna"); không có câu kết luận một dòng ("Đa agent hơn đơn agent X điểm"). | Phần 4 của brief: giám khảo hiểu ngay | Dòng kết luận trên cùng, tên model đọc được, ẩn mã thô sau "Chi tiết". | S |
| UX-12 | Vừa | Ngăn trace case | Văn bản Planner rò rỉ tên trường nội bộ và UUID (`industry_risk`, `collateral_id 77100000-…`); câu bị cắt ("điều kiện hiện tín…"); ngăn trượt không rõ nền mờ; không nhãn "người quyết định" ở cuối. | Phần 4; hiển thị dữ liệu thô | Rút gọn/che id, mở rộng "xem đầy đủ"; thêm dòng "Quyết định cuối: do <vai> (AI chỉ đề xuất)". | S |
| UX-13 | Vừa | /doi-chieu/:id · HTTD | Hồ sơ chưa có tài liệu: hai khung rỗng nhỏ, 70% màn hình trống, không có nút/vùng tải lên nổi bật; ghi chú xanh dùng "worker", "seed" (thuật ngữ kỹ thuật). Danh sách chọn hồ sơ lẫn mã `LA-20261110-…` và `HSV-…`, không sắp theo việc cần làm. | 05; §0 trang công cụ cần dòng `.next-line` | Thêm `.next-line` và vùng tải lên; đổi chữ "worker/seed"; sắp theo hạn. | S |
| UX-14 | Vừa | /de-xuat-vay · QHKH | Trang tạo mới: biểu mẫu 4 trường chiếm nửa trái, nửa phải trống; nút "Tạo bản nháp" xám disabled không nói thiếu gì; hậu tố "tỷ đồng" lặp với nhãn. Trang sửa có mục lục trái nhưng trang tạo thì không (hai kiểu). | 04; nguyên tắc disabled có lý do | Hiện lý do dưới nút ("Chọn khách hàng, sản phẩm…"); đặt tooltip; chia bố cục giống trang sửa. | S |
| UX-15 | Nhẹ | Cả app | Không có liên kết "Bỏ qua tới nội dung"; `input[type=file]` trong chat không có nhãn; ngoài ra có `lang=vi`, một `h1`, một `main`, viền focus 3px thấy được (đã kiểm). | WCAG 2.4.1, 4.1.2 | Thêm skip link và `aria-label`. | S |
| UX-16 | Nhẹ | /viec-cua-toi · QHKH | Thẻ hero chỉ nói "Việc ở bước Sửa đề xuất" (không nội dung cụ thể, không lý do trả về); hai nút "Hỏi AI" cạnh nhau; nhãn "Theo dõi" cam trên nền cam nhạt nhỏ. | 03 | Hiện lý do trả về (có trong nhật ký) và một nút chính "Sửa đề xuất ›". | S |
| UX-17 | Nhẹ | Hồ sơ · Thẩm định | "Tải PDF bản đã chốt lần 32" lộ số phiên bản do kiểm thử; "hạn — · xong" ở dòng thời gian khó đọc. | Dữ liệu demo sạch | Hiển thị "bản chốt mới nhất · ngày"; thay "hạn —" bằng "không đặt hạn". | S |
| UX-18 | Nhẹ | /viec-cua-toi · Giám đốc, Kiểm toán | Trạng thái rỗng "Không có việc đang chờ bạn" đúng nhưng không giải thích hồ sơ nào đã quyết hay link xem toàn bộ (Giám đốc không thấy hồ sơ nào để demo); nút "Hỏi AI" lơ lửng. | §0 vai không có việc: nêu trạng thái | Một dòng `.next-line` ("0 chờ · N đã xử lý hôm nay · Xem lịch sử ›"). | S |

## 2. Trải nghiệm tổng hợp
- Phân cấp: Việc của tôi (03) và Tạo đề xuất đạt tương đối; hồ sơ (UX-01) là lỗ hổng chính vì mọi vai đi qua trang này.
- Trạng thái tải/rỗng/lỗi: có đủ ba kiểu ở trang chính; thống nhất chưa (UX-05, UX-13, UX-18).
- Xác nhận thao tác không đảo ngược: nút "Quyết định" mở luồng riêng; chưa thao tác thử trên hồ sơ seed nên chưa đánh giá hộp xác nhận (chưa rà).
- Thông báo thành công, hover/disabled: chưa kiểm thử đầy đủ do không đổi trạng thái hồ sơ seed (chưa rà).

## 3. Khả năng tiếp cận
`lang=vi`, một `h1`/`main`, focus ring 3px thấy rõ. Thiếu skip link, input file không nhãn (UX-15). Tương phản badge (UX-08) và chữ phụ xám trên nền be chưa đo bằng công cụ. Màu trạng thái luôn kèm chữ (đạt). Đọc màn hình: chưa thử.

## 4. Đội agent cho giám khảo
Hiểu được AI đề xuất hay không: có (nhãn tím "AI đề xuất – chưa xác nhận", câu "AI chỉ đề xuất; người có thẩm quyền quyết định" ở Hành động). Chưa hiểu agent nào làm gì: trang hồ sơ không có sơ đồ vai (UX-02); trong trace có thẻ Credit/Compliance/Validation nhưng Anh–Việt lẫn (UX-09, UX-12). Dashboard bị nhiễu bởi dữ liệu kiểm thử (UX-03). Chat từ chối đúng câu ngoài phạm vi và câu bẻ khóa, hai lần trả lời giống hệt nhau (chủ ý bảo vệ, chấp nhận được). Benchmark có biểu đồ hai cột rõ nhưng thiếu kết luận (UX-11). Chưa rà trang hồ sơ khi đang chạy và sau khi chạy (cần hồ sơ mới + LLM).

## 5. Cần xác nhận (cho Mate)
- X1: Trang hồ sơ thiếu stepper, mục lục và khối việc cần làm của 02b là chủ ý đơn giản hóa hay còn phải làm? UX-01 tính là Chặn demo theo mockup, nhưng nếu đã chốt bỏ thì hạ xuống Cao.
- X2: Giữ hay dọn 727 case kiểm thử trên dashboard trước demo (UX-03).

## 6. Bảng 10 việc nên làm nhất
| # | Việc | Mã | Công |
| --- | --- | --- | --- |
| 1 | Dựng lại khung hồ sơ: header dính + nút chính + mục lục/tab | UX-01 | L |
| 2 | Khối Đội agent lên đầu, sơ đồ vai agent + "người quyết định" | UX-02 | M |
| 3 | Dọn/lọc dữ liệu kiểm thử ở dashboard, thêm tên khách vào danh sách trace | UX-03 | M |
| 4 | Thống nhất khung dashboard/chat/khách hàng với topbar chung | UX-04 | M |
| 5 | Phân biệt lỗi 403/404/5xx, bỏ "Thử lại" vô nghĩa | UX-05 | S |
| 6 | Một bảng thuật ngữ và format số/ngày vi-VN cho dashboard | UX-09 | S |
| 7 | Dòng kết luận và tên model đọc được ở So sánh hiệu năng | UX-11 | S |
| 8 | Che id/trường nội bộ trong trace, thêm dòng người quyết định | UX-12 | S |
| 9 | Breadcrumb + giới hạn bề rộng 1920 | UX-10, UX-06 | M |
| 10 | Tương phản badge, skip link, nhãn file, lý do nút disabled | UX-08, UX-15, UX-14 | S |
Tổng ước tính: khoảng 14–18 giờ.

## 7. Chưa rà
Hộp xác nhận Quyết định/Trả về, tải lên tài liệu thật, trang hồ sơ sau khi chạy đội agent, ảnh Kiểm toán/Quản trị chụp nhưng chỉ nhìn danh sách việc, mobile, đo tương phản bằng công cụ, đọc màn hình.
