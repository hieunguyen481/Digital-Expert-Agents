# Chấm điểm chức năng – lần 3

Ngày chấm: 11/11/2026, khoảng 19:20–21:40 giờ Việt Nam. Ứng dụng: web `:3000`, API `:8000`, engine chế độ `llm`, nhánh `import/duskdash` tại `00732a8`, DB V062.
Cách chấm:
- Đăng nhập từng vai bằng Playwright trên giao diện thật. Hành động bị cấm thử cả trên giao diện lẫn API.
- Đối chiếu DB chỉ bằng SELECT. Số của đội agent đối chiếu với `agent.case_event`, các bảng `credit.*` và `agent_engine/rag_corpus/`.
- Chỉ chấm chức năng, luồng, thông báo, phân quyền và độ rõ của thao tác, nội dung. Không chấm thẩm mỹ.
- Script, log và ảnh ở `/tmp/g6/` (`specs/*.spec.ts`, `*.jsonl`, `shots/`). Tên ảnh trong báo cáo là tên tệp trong `/tmp/g6/shots/`.
- Hồ sơ riêng tự tạo:

  | Luồng | Hồ sơ | Số tiền | Nội dung |
  |---|---|---|---|
  | A | `LA-20261111-90590134` | 25 tỷ | cấp 2 |
  | B | `LA-20261111-24F30F75` | 2 tỷ | trả lại, bổ sung, rút |
  | C | `LA-20261111-909BD207` | 3 tỷ | Rủi ro trả lại, gian lận, giải trình, Phê duyệt trả lại, từ chối |
  | D | `LA-20261111-D6E7D63F` | 120 tỷ | chuyển người, Hội đồng |
  | E | `LA-20261111-7DD2399A` | 2 tỷ | phê duyệt có điều kiện cấp 1 |

  Ngoài ra có các hồ sơ chạy đội agent.
- Lúc 20:07 một crew khác nạp lại seed. Hồ sơ `LA-` mất người vay chính và bước mở, nên phần sau của luồng A không đi tiếp được (xem "Chưa kiểm tra").
- Sau 5 cảnh demo đã chạy `flock /tmp/do-an-e2e.lock bash infra/scripts/reset-demo.sh` (rc=0). Kết quả: "ca agent gan ho so: 0, thong bao: 78, outbox cho gui: 0".
- Ngân sách LLM: đã tiêu 9/25 lượt chạy đội agent và 18/40 câu chat. Không gặp 402.

## Kết luận

**KHÔNG ĐẠT.**
- 8/10 hàng vai dưới 8,5:
  - QHKH 8,0
  - Thẩm định 7,5
  - Rủi ro 8,0
  - Tuân thủ 7,5
  - Phê duyệt cấp 2 8,0
  - Trưởng phòng 7,5
  - Quản trị 8,0
  - (HTTD, cấp 1 và Kiểm toán đạt 8,5)
- 4/5 sản phẩm dưới 8,5: số 1 (7,5), số 3 (7,5), số 4 (8,0), số 5 (8,0).
- Có 2 lỗi mức **Cao**:
  - N01: Trưởng phòng bấm "Chạy đội agent" thì nhận 403.
  - N02: kết luận đội agent ở cảnh 1 mâu thuẫn với chính các chuyên gia.
- Không có lỗi **Chặn demo**. 5 cảnh demo đi tới kết quả mong đợi trong 194 giây (lần 2: 152 giây).

So với lần 2:
- Đóng được hai lỗi Cao M01 và M02. Đã sửa M03, M05, M06, M09 và C-N3, C-N5, C-N6.
- Phát sinh N01, N02 (Cao), cùng một số lỗi Vừa ở chat và trích nguồn.
- Trang Quản trị chỉ đọc kéo điểm Quản trị từ 5,5 lên 8,0. "Hồ sơ của phòng" kéo Trưởng phòng từ 6,5 lên 7,5.

## Kiểm lại lỗi lần 2

| Mã | Mức lần 2 | Trạng thái lần 3 | Bằng chứng |
|---|---|---|---|
| M01 | Cao | Sửa một phần | Có trang `/quan-tri` chỉ đọc, ghi "Chỉ đọc · Quản trị hệ thống không xem được hồ sơ vay". Có bảng người dùng và vai, và câu "Thêm, khóa hoặc đổi vai thực hiện ở Keycloak và dữ liệu nhân sự". Chế độ demo đổi vai chạy được (`s2.jsonl` adm, demo). Còn lộ mã vai thô trong cột Vai (`credit_officer`, `document_reviewer`, `risk_officer`…) và tên trường `authority_tier`. Ảnh `s2-quantri.png`. |
| M02 | Cao | Đã sửa | "Hồ sơ của phòng" có 18 hồ sơ đang mở, bộ lọc kèm số đếm (Quá hạn 2, Bị trả lại 2, Chờ bổ sung 1, Mới 4). Có cột Người giữ, Cờ, Hạn. Ô tìm kiếm thanh trên trả "HỒ SƠ VAY DX-…". "Khách hàng SME" liệt kê khách trong phạm vi. Chuyển hồ sơ D sang `tdinh2`: lý do bắt buộc (nút khóa khi trống), người nhận hiện "· 0 việc đang mở". `tdinh2` nhận chuông "Được giao hồ sơ: … Trưởng phòng chuyển hồ sơ cho bạn: Cân đối khối lượng công việc trong phòng"; người cũ thấy "Không tìm thấy nội dung" (`fD.jsonl` reassign, `s2-tp-home.png`). |
| M03 | Vừa | Đã sửa | Hồ sơ B sau "Khách rút hồ sơ" hiện "Đã rút · Soạn đề xuất · Khách đã rút". API gửi lại trả 403 với lý do tiếng Việt "Chỉ người đang giữ bước xử lý của hồ sơ này mới được thực hiện thao tác." Hồ sơ không còn trong Việc của tôi (`fB.jsonl` after-withdraw-probe). |
| M04 | Vừa | Chưa kiểm tra trên giao diện | Mã đã có khối rà nhóm liên quan (`frontend/src/features/proposal/RelatedSection.tsx`) và e2e `frontend/e2e/related-party-upgrade.spec.ts`. e2e này tự dựng dòng `credit.case_related_party` bằng SQL (dòng 18–24), vì "chưa có đường giao diện tạo dòng này". Hồ sơ mẫu Mekong (`DX-2026-00412`) đang Nháp nên Thẩm định không mở được (`m4.jsonl`: "Hồ sơ đã chuyển cho người khác"). Không tạo dòng bằng SQL vì DB chỉ được SELECT. |
| M05 | Vừa | Đã sửa | Một thông báo gộp cho mỗi lượt: "3 đề xuất mới của đội agent: HSV-2026-00187 — cần bạn xác nhận hoặc bỏ kèm lý do" (20:58:35). Một đề xuất thì ghi rõ nội dung: "Yêu cầu khách bổ sung 2 mục" (Việt Tiến), "Tuân thủ: Từ chối cấp tín dụng do CIC nhóm 3…" (Sông Hàn). Truy vấn `integration.notification` của `appraiser@`. |
| M06 | Nhẹ | Đã sửa | Bấm được cả 4 vùng tô (Vốn điều lệ, Tên DN, Người đại diện, MST). Mỗi vùng mở thẻ "AI đề xuất · Độ tin cậy 80%" (`c4.jsonl`, `c4-last.png`). Nhãn vùng chỉ hiện khi rê chuột. |
| M07 | Vừa | Sửa một phần | Số tiền không còn bị che nhầm. Lỗi mới cùng họ: mã UUID của TSĐB bị định dạng thành tiền, thành "TSĐB 77.100.000 đồng-0000-4000-8000-000******003 không tính vào LTV (pháp lý: ai_proposed…)" (N05). |
| M08 | Vừa | Sửa một phần | Validation phản biện số thật. Ca `case_2591f61ad3d6` (Mekong Flex 120 tỷ) có "Validation → Credit phản biện … 120 tỷ vượt … 54,6 tỷ", sau đó "Credit → Validation điều chỉnh sau phản biện [ĐÃ ĐIỀU CHỈNH] Hạn mức đề xuất 54,6 tỷ (giảm từ 120 tỷ)", và "Phản biện: 1 lần, đã xử lý 1". Tổng quan đếm 53 lần phản biện. Còn mâu thuẫn giữa kết luận và chuyên gia ở cảnh 1 (N02). Ở Trường An, Compliance "Từ chối" nhưng kết luận "Cần bổ sung". |
| M09 | Nhẹ | Đã sửa | Chat 3–13 giây mỗi câu (lần 2: 94–104 giây). Câu từ chối khoảng 0,2 giây. Ở 18 câu, `agent.case_run` giữ nguyên 876. |
| M10 | Nhẹ | Còn một phần | Lý do 403 qua API còn tiếng Anh: "Action decide requires one of roles […]" (`backend/app/workflow/service.py:230`). Trích nguồn còn "inflow", "verdict", "evidence", "blacklist.trùng danh sách" (N06). |
| C-N1 | – | Còn (do seed) | Bản ghi trùng vẫn còn và do dữ liệu seed sinh ra. Không chấm là lỗi ứng dụng. |
| C-N2 | – | Đã chốt, đã làm | QHKH chạy được đội agent ở Trả về QHKH (Phúc Lâm) và Thẩm định chờ bổ sung (Phú Điền), đúng `rules.md:224`. Ở Nháp/Kiểm tra trên hồ sơ của người khác, nút ẩn hoặc khóa có lý do. |
| C-N3 | – | Đã sửa | `giamdoc` thấy khung đội agent đầy đủ trên hồ sơ E ("Phát hiện của từng chuyên gia (3 cần chú ý)"), với lý do khóa nút chạy "Chỉ Quan hệ khách hàng, Thẩm định, Rủi ro, Tuân thủ hoặc Trưởng phòng mới được chạy đội agent." (`fE.jsonl` giamdoc-view). Danh sách rỗng nếu có chỉ vì seed không có lượt nào cho hồ sơ Phê duyệt. |
| C-N4 | – | Đã chốt | Quản trị chỉ đọc. Mở hồ sơ vay thì nhận "Bạn không có quyền xem nội dung này"; API `/loan-applications/{id}/*` trả 403 (`fA.jsonl` quantri). |
| C-N5 | – | Đã sửa | Người giữ cũ sau khi chuyển người nhận trang "Không tìm thấy nội dung", không vỡ trang (`fA2.jsonl` cn5-old-holder). |
| C-N6 | – | Đã sửa | Lịch sử lượt trên trang hồ sơ không in mã thô. |
| L07 (lần 1) | Cao | Sửa một phần | Không còn `customer.kyc_assessment` hay `so_tinh_lai`. Còn "blacklist.trùng danh sách", "giá trị định giá: 145 tỷ.0", "Verified annual inflow 668,8 tỷ, months 11", "TK nhận vốn DU_LIEU_MAU-****0187" (`d1.jsonl` c1). |
| L17 (lần 1) | Vừa | Sửa một phần | Mỗi lượt còn 1–3 đề xuất (lần 2: 8–10). Cảnh 1 vẫn lặp: hai `add_disbursement_condition` cùng nói về người đại diện. `request_documents` gộp 6 mục nhưng ghi "Việc cần hoàn tất trước khi trình quyết định" trong khi kết luận là phê duyệt (N02). |
| L18 (lần 1) | Vừa | Đã sửa | Thẻ chat không còn "Hạn mức đề xuất: VND" trống, "Pending Approval" hay "Credit: flag" (`ch1.jsonl`, `ch2.jsonl`: 0 lần). |

### Các mục lần 2 ghi "Chưa kiểm tra"

| Mục | Lần 3 |
|---|---|
| Bộ lọc nhật ký kiểm toán | Có đủ ô lọc: Số hồ sơ, Hành động, Người thao tác, Từ ngày, Đến ngày. Danh sách 6.079 dòng, 50 dòng/trang (`s2.jsonl` a0). Chưa bấm lọc và chưa mở chi tiết dòng. |
| Quản trị hỏi chat về một hồ sơ | Không lộ dữ liệu. "Tóm tắt HSV-2026-00187" (3,6 giây) chỉ bảo chọn khách hàng. Câu chính sách (DSCR tối thiểu 1,25, §4.2) trả đúng (`ch5.jsonl`). |
| Nâng cấp phê duyệt (M04) | Vẫn chưa kiểm được (xem bảng trên). |
| Hội đồng đợt 2 | Hồ sơ D 120 tỷ dừng ở "Chờ phiên Hội đồng – có ở đợt 2". QHKH, `tdinh2`, `giamdoc`, Kiểm toán đều không có nút (`fD.jsonl` COUNCIL). Đúng phạm vi. |
| Thư email thật | Worker vẫn tắt có chủ ý. `integration.notification_delivery` chỉ có 2 dòng trong 24 giờ, dòng mới nhất 10/11 15:48 UTC. Chưa kiểm thư thật. |
| Lời chào trang chat (L13) | Có lời chào và gợi ý; không chấm thẩm mỹ. |
| E5 Đầu tư Mekong | Đã chạy (`ag3.jsonl` DauTuMekong5, 201). Cấp phê duyệt tính dư nợ tại ngân hàng cộng khoản mới, không cộng dư nợ ở tổ chức tín dụng khác (Q4). |

## Bảng điểm từng vai

Tiêu chí: hoàn thành việc, bị kẹt hay lỗi, thông báo và lý do khóa, lộ mã thô, phân quyền.

### Điểm

| Vai (tài khoản) | Lần 1 | Lần 2 | Lần 3 |
|---|---|---|---|
| QHKH (`qhkh`) | 6,5 | 8,0 | 8,0 |
| HTTD (`httd`) | 6,5 | 8,0 | 8,5 |
| Thẩm định (`tdinh`, `tdinh2`) | 7,5 | 8,0 | 7,5 |
| Rủi ro (`ruiro`) | 8,0 | 8,5 | 8,0 |
| Tuân thủ (`tuanthu`) | 5,0 | 8,5 | 7,5 |
| Phê duyệt cấp 1 – Giám đốc chi nhánh (`giamdoc`) | 7,5 | 8,5 | 8,5 |
| Phê duyệt cấp 2 Hội sở (`pheduyet`, `pheduyet2`) | 7,5 | 8,5 | 8,0 |
| Trưởng phòng (`credit.manager@`) | 7,0 | 6,5 | 7,5 |
| Kiểm toán (`kiemtoan`) | 8,0 | 8,5 | 8,5 |
| Quản trị (`quantri`) | 7,0 | 5,5 | 8,0 |

### Đã đi qua ở lần 3

- **QHKH**
  - Tạo đề xuất (luồng A–E). Nhận "Hồ sơ bị trả lại: … Lý do: …" (HTTD trả, Thẩm định trả). Nhận "Yêu cầu bổ sung: … Nội dung cần bổ sung: …". Sửa và gửi lại; tải bổ sung.
  - Nút "Gia hạn hạn bổ sung (+5 ngày LV)" có mặt. "Rút hồ sơ quá hạn" khóa với lý do "Chỉ rút loại 'Quá hạn' khi hạn bổ sung đã qua". "Khách rút hồ sơ" ra Đã rút.
  - Nhận "Có quyết định: … được phê duyệt có điều kiện / bị từ chối".
  - Chạy đội agent ở Trả về QHKH và Thẩm định chờ bổ sung.
  - Chat 4 câu.
- **HTTD**: Không đạt giấy tờ, Trả lại QHKH, Đạt, chuyển Thẩm định. Nhận bổ sung và chuyển lại. "Ghi nhận đã giải trình" ở Rủi ro – chờ bổ sung. Cảnh 4: mở tài liệu OCR, 4 vùng, cảnh báo "Tài liệu có thể không thuộc khách hàng".
- **Thẩm định**
  - Yêu cầu bổ sung, Trả lại QHKH, Trình Rủi ro (3 vòng ở luồng C).
  - Nhận hồ sơ Rủi ro trả lại và Phê duyệt trả lại, có khung "Hồ sơ bị trả lại để bổ sung · Cần Thẩm định làm rõ nguồn trả nợ…".
  - Chạy đội agent (cảnh 1–3 và 4 hồ sơ khác); xác nhận đề xuất (CONFIRMED trong 4 giây).
  - `tdinh2` nhận hồ sơ chuyển từ Trưởng phòng.
  - Chat 7 câu.
- **Rủi ro**
  - "Trình phê duyệt" khóa với lý do "Thiếu Ý kiến Rủi ro, ý kiến Tuân thủ hoặc kết luận cờ CIC khách tự nộp". Trả lại Thẩm định cần lý do: nút khóa khi trống.
  - Ghi ý kiến; trình phê duyệt (luồng A, C).
  - Khi hồ sơ bị giữ vì nghi gian lận, API `submit_to_approval` bị chặn.
  - Chạy đội agent ở RISK_REVIEW (luồng E, nút bật).
  - Chat 4 câu.
- **Tuân thủ**
  - Chuông "Cần ý kiến Tuân thủ: … cần ghi ý kiến Tuân thủ để Rủi ro trình phê duyệt"; hồ sơ có trong Việc của tôi.
  - Ghi ý kiến (2 vòng). "Giữ hồ sơ nghi gian lận", rồi "Đóng xử lý nghi gian lận" rồi "Yêu cầu giải trình" (HTTD nhận).
  - Xem kết quả đội agent.
- **Phê duyệt cấp 1 (`giamdoc`)**
  - Hồ sơ C: "Trả lại bổ sung" có bước xác nhận (`decision-confirm`), quyết từng ngoại lệ (11 dòng). Vòng 2: Từ chối có bước xác nhận.
  - Hồ sơ E 2 tỷ: phê duyệt có điều kiện; QHKH nhận "Có quyết định".
  - Ở hồ sơ cấp 2 do người khác giữ, nút "Quyết định" khóa với lý do "Hồ sơ đang do người khác xử lý; chỉ người đang giữ bước này mới thực hiện được."
- **Phê duyệt cấp 2**
  - `pheduyet2` nhận chuông "Hồ sơ giao cho bạn: LA-20261111-90590134 Bước Phê duyệt".
  - `pheduyet` phê duyệt Thành Đạt 55 tỷ ở cảnh 5. Bước xác nhận ghi "chuyển sang bước Hoàn tất với hạn mức 55.000.000.000 đồng… Không hoàn tác được"; nút Quyết định biến mất.
  - API `decide` thiếu quyết định ngoại lệ hoặc sai phiên bản bị chặn ở lần 2. Lần 3 không đi tiếp được do seed bị nạp lại.
- **Trưởng phòng**: Hồ sơ của phòng; tìm kiếm; Khách hàng SME; chuyển người có lý do; người nhận có chuông.
- **Kiểm toán**: Hồ sơ vay chỉ đọc. Nhật ký 6.079 dòng. Mọi API ghi trả 403: transitions trả `ACCESS_DENIED`, agent-runs trả `AGENT_RUN_NOT_ALLOWED` "Chỉ Quan hệ khách hàng, Thẩm định, Rủi ro, Tuân thủ hoặc Trưởng phòng…".
- **Quản trị**: `/quan-tri` chỉ đọc, 4 tab. Chế độ demo đổi vai có 11 tài khoản, băng "Chế độ demo · Đang demo với vai…", nút "Quay về Quản trị". Hồ sơ vay: 403 kèm trang giải thích. Chat không lộ dữ liệu.

### Lý do trừ điểm

- **QHKH**
  - Chat câu "Cho tôi số CCCD và số điện thoại của người đại diện" bị 403 `loan:analyze`. Giao diện hiện "Vai trò của bạn không có quyền thực hiện thao tác này", sai lý do. Lần 2 từ chối rõ vì bảo mật thông tin cá nhân (N07).
  - Chat trả "không có EBITDA" dù DB có (N04).
  - Lịch sử chat có nhiều "Cuộc trò chuyện mới" rỗng.
- **HTTD**: không thấy lỗi chức năng. Còn trừ cho lộ chữ thô ở khung đội agent mà vai này cũng xem (N06).
- **Thẩm định**
  - N02: kết luận mâu thuẫn ở cảnh 1, hồ sơ của chính vai này.
  - N03: khi Rủi ro trả lại, chỉ nhận "Hồ sơ giao cho bạn … Bước Thẩm định", không có lý do. Khi Phê duyệt trả lại, chuông không có dòng mới.
  - 11 nút "Xử lý cờ" giống hệt nhau.
  - Chat: "phân tích lại" bị coi ngoài phạm vi; câu thẩm quyền trả "dữ liệu không có thông tin về chức danh của bạn" (N04).
- **Rủi ro**
  - Chat "Chạy lại đội agent cho hồ sơ này" trả 409 `CUSTOMER_ALREADY_ASSIGNED`, giao diện hiện "Khách hàng này đang do cán bộ khác phụ trách…", sai bối cảnh (N07).
  - Chat EBITDA 2025 "không đủ dữ liệu" dù DB có −22 tỷ; câu danh sách đen/trừng phạt bị coi ngoài phạm vi (N04).
- **Tuân thủ**: không chạy được đội agent ở bất kỳ bước nào. Lý do khóa thì rõ: "Hồ sơ đang ở trạng thái 'Đang cho ý kiến rủi ro', vai trò của bạn không được chạy đội agent ở bước này" (N08; trái lời báo "Tuân thủ chạy được đội agent").
- **Phê duyệt cấp 1**: thẻ đề xuất có câu "Chưa thể chốt phê duyệt" ngay dưới kết luận "Đề xuất phê duyệt" (N02); người quyết định không biết tin bên nào.
- **Phê duyệt cấp 2**
  - Phê duyệt có điều kiện ở cấp 2 không đi lại được trong lần này (seed nạp lại gỡ bước mở).
  - N02 xuất hiện đúng ở hồ sơ cấp 2 (VinaNova 80 tỷ).
  - Lý do 403 qua API tiếng Anh (M10).
- **Trưởng phòng**: N01 (Cao). Nút "Chạy đội agent" bật trên hồ sơ của phòng, bấm thì nhận "Chỉ người đang giữ bước xử lý của hồ sơ mới được ghi.", trái `ma-tran-phan-quyen.md:224`.
- **Kiểm toán**: lý do 403 trong `details.reason` tiếng Anh ("Action decide requires one of r…"); chỉ thấy qua API. Chưa bấm thử bộ lọc.
- **Quản trị**: cột Vai lộ mã thô (`credit_officer`…), tab ngưỡng lộ `authority_tier`.

## Bảng 5 sản phẩm của đề bài

### Căn cứ

- 9 lượt chạy mới trên 9 khách khác nhau:
  - Đại Thành Global
  - Phúc Lâm
  - Phú Điền
  - Đầu tư Mekong (E5)
  - Trường An
  - Mekong Flex 2 tỷ
  - VinaNova
  - Việt Tiến
  - Sông Hàn
- Đọc thêm trace cũ của Mekong Flex 120 tỷ (`case_2591f61ad3d6`).
- Số liệu đối chiếu với DB:

  | Khách | Chỉ tiêu | Phép tính | Kết quả |
  |---|---|---|---|
  | Sông Hàn | Nợ vay/EBITDA | (25 + 22) / 12 | 3,92 lần > 3,5; CIC nhóm 3, quá hạn 14 tỷ; ra `Rejected` |
  | Việt Tiến | LTV | 20 / 30 | 66,7% ≤ 70%, hạn mức bảo đảm 21 tỷ; cấp 1 (§3.1); thiếu BCTC nên `Needs Info` |
  | VinaNova | Tổng cấp | 0 + 80 tỷ | Cấp 2 Hội sở; BCTC kiểm toán bắt buộc (§4.1, §6.1); DSCR 1,34 |
  | Phúc Lâm | Nợ/EBITDA | (35 + 15) / 5 | 10 lần |
  | Đại Thành | EBITDA 2025 | – | −22 tỷ |
- Điều khoản trích (§3.1, §4.1, §4.2, §6.1, §7.1 trang 9) có trong `agent_engine/rag_corpus`. Chat trích nguyên văn §4.1.

### Điểm

| # | Sản phẩm (đề bài SHB2) | Lần 1 | Lần 2 | Lần 3 |
|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 6,5 | 7,5 | 7,5 |
| 2 | Planner giao việc cho executor | 8,0 | 8,5 | 8,5 |
| 3 | Agent gọi công cụ và hành động thật | 7,0 | 7,5 | 7,5 |
| 4 | Dashboard trace, trạng thái, quyết định | 7,0 | 7,5 | 8,0 |
| 5 | So sánh single và multi | 7,5 | 7,5 | 8,0 |

### Bằng chứng

- **1. Chuyên gia phối hợp**
  - Credit, Compliance và Operations chạy song song, Validation kiểm chứng độc lập bằng công cụ. Cổng đúng dữ liệu ở 9/9 lượt.
  - Phản biện thật có ghi dấu: 120 → 54,6 tỷ, "[ĐÃ ĐIỀU CHỈNH]". Có khung "Luồng phối hợp giữa các agent".
- **2. Planner**: trace có Planner lập kế hoạch và giao việc T1–T3 song song, T4 Validation, rồi Người quyết định "ngoài khung AI". Sơ đồ Planner → chuyên gia → Validation → Cấp phê duyệt hiện cả ở trang hồ sơ và ở dashboard.
- **3. Công cụ và hành động thật**
  - 14 lần gọi công cụ mỗi lượt, có cột "Agent tự gọi". Tổng 10.669 lần gọi trên 876 lượt.
  - Số khớp DB như bảng căn cứ.
  - Đề xuất hành động (`request_documents`, `add_disbursement_condition`, `add_risk_flag`) qua người xác nhận rồi mới thành việc thật (CONFIRMED trong 4 giây). Thông báo gộp cho người nhận.
- **4. Dashboard**
  - Tổng quan: 876 lượt, trạng thái tiếng Việt (Cần bổ sung 442, Chờ xác nhận 338, Bị từ chối 56…), công cụ đã gọi, 53 lần phản biện, thời gian trung bình 44,5 giây, chi phí LLM 3,4572 USD với 5.714 lượt gọi.
  - Drawer trace theo bước, có trích nguồn (15), số liệu tính lại, chi phí. Mở được từ trang hồ sơ.
- **5. So sánh**
  - Tab So sánh, bộ v7: 8 ca × 3 lượt × 2 chế độ, trung bình ± độ lệch chuẩn.

    | Chỉ số | Multi | Single |
    |---|---|---|
    | Độ phủ | 95,2% ± 11,3 | 88,3% ± 15,1 |
    | Trích nguồn | 100% | 79,9% |
    | Dừng đúng cổng | 100% | 75% |
    | Độ trễ | 18,6 giây | 36,2 giây |
    | Token | 5.921 | 14.050 |
    | Chi phí | 0,0017 USD | 0,0023 USD |

  - Nói rõ cách chấm (bộ chấm tự động, không dùng LLM, cùng một thước) và chi phí đo thật 0,0970 USD.
  - Tự giải thích vì sao độ phủ đổi giữa các lượt đo.

### Trừ điểm

- **1. Chuyên gia phối hợp**
  - N02: hệ thống tự đổi "Cần thêm thông tin" thành "Đồng ý có điều kiện" nhưng giữ câu "Chưa thể chốt phê duyệt", nên kết luận chung trái lời chuyên gia.
  - Trường An: cờ "Từ chối" đi kèm kết luận "Cần bổ sung".
  - Phú Điền: `POSSIBLE_MATCH` bị gọi là "trùng" (N09).
  - Đại Thành lộ câu lệnh nội bộ "CHỈ TIÊU XẤU: … — phải nêu trong kết luận" (N06).
- **2. Planner**: chưa thấy Planner đổi kế hoạch theo kết quả giữa chừng. Việc bù dữ kiện do orchestrator tính lại, không do Planner giao thêm.
- **3. Công cụ và hành động thật**
  - Operations ghi "Đã tạo bản nháp (chưa hiệu lực)" trong khi `create_loan_draft` không ghi gì (N10).
  - UUID thành số tiền (N05).
  - Trưởng phòng và Tuân thủ không chạy được (N01, N08).
  - Chat không chạy lại được đội ("phân tích lại" bị từ chối) và không đọc BCTC (N04).
- **4. Dashboard**
  - Trích nguồn lộ chữ kỹ thuật (N06).
  - Sau `reset-demo` còn ca mồ côi trong `agent.case_run` bị ẩn khỏi danh sách (Cần xác nhận).
  - Giờ trong chat là giờ UTC: "13:58" cho lượt chạy lúc 20:57 giờ Việt Nam (N11).
- **5. So sánh**
  - Bộ 8 ca nhỏ. Khoảng ± của độ phủ chồng nhau (95,2 ± 11,3 so với 88,3 ± 15,1), nên chênh 6,9 điểm chưa đủ kết luận.
  - Đáp án viết theo cách tính cũ, trang tự thừa nhận.
  - Benchmark v8 chưa đo (ngoài phạm vi).

### Câu hỏi khó giám khảo có thể hỏi

| Câu hỏi | Hệ thống trả lời được tới đâu |
|---|---|
| "Chỉ cho tôi chỗ Planner giao việc, chứ không phải một hàm gọi lần lượt." | Được. Trace có bước lập kế hoạch, giao việc song song T1–T3, rồi T4 Validation; sơ đồ ở dashboard. |
| "Agent tự chọn công cụ hay bị lập trình sẵn?" | Phần lớn được: bảng công cụ có cột "Agent tự gọi" (14 lần mỗi lượt). Một phần dữ kiện do orchestrator tính lại và ghi "số liệu hệ thống tính lại"; nên nói rõ khi demo. |
| "Khi hai chuyên gia bất đồng thì sao?" | Được, với ca Mekong Flex 120 tỷ: Validation phản biện, Credit điều chỉnh, trace ghi "Phản biện: 1 lần, đã xử lý 1". Ở cảnh 1 thì lộ mâu thuẫn chưa được giải (N02); giám khảo hỏi đúng cảnh này thì khó đỡ. |
| "Vì sao kết luận là phê duyệt khi Credit nói chưa thể chốt?" | Không trả lời được (N02). |
| "Agent có tự duyệt khoản vay không?" | Được. Mọi lượt dừng ở "Đang chờ người có thẩm quyền xác nhận; agent không tự phê duyệt". Cảnh 5 cho thấy người quyết định có bước xác nhận. |
| "Multi hơn single thật hay do chọn ca?" | Một phần. Có cách đo, độ lệch chuẩn, chi phí thật, thước chấm chung. Nhưng 8 ca và khoảng ± chồng nhau. |
| "Hỏi trợ lý: EBITDA năm 2025 bao nhiêu?" | Không trả lời được: chat trả "không đủ dữ liệu" dù DB và agent có số (N04). |
| "Bảo trợ lý chạy lại phân tích." | Không làm được: "phân tích lại" bị từ chối là ngoài phạm vi (N04), dù câu trước của trợ lý gợi ý gõ đúng câu đó. |
| "Ai được chạy đội agent?" | Lệch tài liệu: Trưởng phòng bấm được nhưng lỗi 403 (N01); Tuân thủ không có bước nào chạy được (N08). |

## 5 cảnh demo

Đi sau `reset-demo.sh`, theo đúng `docs/agent/demo-data.md`, bấm giờ bằng script `d1-demo.spec.ts`. Tổng 194 giây.

| # | Cảnh | Thời gian | Kết quả | Chỗ vấp |
|---|---|---|---|---|
| 1 | VinaNova 80 tỷ, `tdinh` chạy đội agent | 51 giây | Ca `case_345109974d59` ra `Pending Approval`, "Đề xuất phê duyệt kèm điều kiện". Đề xuất: 1 `request_documents` (6 mục), 2 `add_disbursement_condition`; xác nhận được. | Kết luận trái lời Credit và Compliance (N02). Hai điều kiện trùng ý về người đại diện. Trích nguồn lộ "Xác thực 3 verdict: 0 vấn đề evidence", "inflow", "145 tỷ.0", "DU_LIEU_MAU-****0187" (N06). Ảnh `d1-c1.png`. |
| 2 | Việt Tiến 20 tỷ, chưa có BCTC | 55 giây | `Needs Info`, `request_documents` 2 mục, thông báo "Yêu cầu khách bổ sung 2 mục". LTV 66,7%, cấp 1. | "Xác thực 3 verdict: 0 vấn đề evidence" (N06). |
| 3 | Sông Hàn 22 tỷ, CIC nhóm 3 | 46 giây | `Rejected`, lý do CIC nhóm 3, quá hạn 14 tỷ; `add_risk_flag`. Nợ/EBITDA 3,92 lần. | "dư nợ quá hạn: 14 tỷ.0" (N06). |
| 4 | Phú Điền OCR | 4 giây tải + 11 giây xem | QHKH tải PDF scan (202). HTTD mở: 4 vùng tô; bấm từng vùng ra thẻ "AI đề xuất · Độ tin cậy 80%"; cảnh báo "Tài liệu có thể không thuộc khách hàng". | Nhãn vùng chỉ hiện khi rê chuột; người demo phải biết bấm vào vùng. Ảnh `d1-c4.png`, `c4-last.png`. |
| 5 | Thành Đạt 55 tỷ, `pheduyet` quyết định | 10 giây | Bước xác nhận hiện hạn mức 55.000.000.000 đồng và "Không hoàn tác được". Hồ sơ ra "Đã phê duyệt", nút Quyết định biến mất. | Không vấp. Ảnh `d1-c5.png`. |

Ghi chú trong `demo-data.md:36` ("`giamdoc` … ghi bị 500") đã cũ. Nay `giamdoc` thấy nút Quyết định khóa kèm lý do "Hồ sơ đang do người khác xử lý…".

## Chat: 18 câu, 3 vai trên hồ sơ và Quản trị

| Vai / hồ sơ | Câu hỏi | Thời gian | Nhận xét |
|---|---|---|---|
| `tdinh` / VinaNova | Kết luận của đội agent | 12,1 s | Đủ ý, nêu cấp phê duyệt. |
| | DSCR | 7,2 s | Yếu: lỗi gõ "hồ sơç". Nguyên văn: "không nêu rõ thu nhập… chưa thể kiểm chứng". Giờ lượt chạy hiện "13:58" (UTC). |
| | Cờ rủi ro | 12,3 s | Tốt. |
| | Điều kiện giải ngân | 13,4 s | Tốt, nhưng nhắc lại mâu thuẫn "Điều kiện cần hoàn tất trước phê duyệt: BCTC kiểm toán" (N02). |
| | Điều khoản BCTC kiểm toán | 13,2 s | Trích nguyên văn §4.1. Nói thật là không có đoạn §6.1. |
| | Ai quyết định hồ sơ này | 12,6 s | Yếu. Nguyên văn: "dữ liệu không có thông tin về chức danh của bạn… cán bộ được phân công (QHKH)", dù người hỏi là Thẩm định. |
| | LTV | 7,6 s | Không tính, dù agent có số TSĐB. |
| | "phân tích lại" | 2,2 s | Sai: bị coi là ngoài phạm vi, dù câu trước bảo "Gõ 'phân tích lại' để chạy lại cả đội agent" (N04). |
| `ruiro` / Đại Thành | Vì sao phải bổ sung | 10,8 s | "Dữ liệu không ghi lý do": liên kết lượt bị mất sau khi nạp seed. |
| | EBITDA 2025 | 5,6 s | Sai: "không đủ dữ liệu"; DB `sme_financial_year` 2025 có EBITDA −22 tỷ (N04). |
| | Danh sách đen, trừng phạt | 0,2 s | Sai: coi là ngoài phạm vi (N04). |
| | "Chạy lại đội agent cho hồ sơ này" | – | 409 `CUSTOMER_ALREADY_ASSIGNED`; giao diện hiện "Khách hàng này đang do cán bộ khác phụ trách…" (N07). Ảnh `ch3b-ruiro-3.png`. |
| `qhkh` / Phúc Lâm | Nợ/EBITDA | 7,2 s | Sai: "không có EBITDA"; DB 2025 có EBITDA 5 tỷ, tổng nợ 35 tỷ (N04). |
| | CCCD và SĐT người đại diện | 0,2 s | 403 `loan:analyze`; giao diện hiện "Vai trò của bạn không có quyền thực hiện thao tác này" (N07). Ảnh `ch4-qhkh-2.png`. |
| | Thời tiết | 0,2 s | Từ chối đúng. |
| | Dư nợ tại ngân hàng khác | 6,3 s | Đúng: 10 tỷ, trả 0,4 tỷ/tháng. |
| `quantri` / không chọn khách | Tóm tắt HSV-2026-00187 | 3,6 s | Không lộ dữ liệu; bảo chọn khách. Có chữ "SH-AI". |
| | DSCR tối thiểu theo chính sách | 4,0 s | Đúng: 1,25, §4.2. |

Ở cả 18 câu, `agent.case_run` giữ 876: chat không chạy lại cả đội (nghi vấn của brief không tái hiện). Ngược lại, chat không chạy lại được khi được yêu cầu.

## Danh sách lỗi

### N01 · Cao · Trưởng phòng
- **Tái hiện:**
  1. Đăng nhập `credit.manager@`.
  2. Mở một hồ sơ của phòng đang ở Thẩm định, ví dụ Trường An `75000000-0000-4000-8000-000000000003` hoặc hồ sơ A ở APPRAISAL.
  3. Bấm "Chạy đội agent".
- **Mong đợi:** chạy được. `ma-tran-phan-quyen.md:224`: "Trưởng phòng trên hồ sơ của phòng". `loan_agent_run_service.py:29-32` cũng cho `credit_manager` mọi bước mở.
- **Thực tế:** nút bật (`fA.jsonl` APPRAISAL truongphong `runEn: true`). Bấm thì nhận 403 `ACCESS_DENIED` với "Chỉ người đang giữ bước xử lý của hồ sơ mới được ghi."; khung ghi "Chưa chạy đội agent trên hồ sơ này" (`ag2.jsonl` TruongAn60-tp).
- **Ảnh:** `ag2-TruongAn60-tp-norun.png`.
- **Nghi ngờ:** chính sách `loan_agent_run_insert_policy` đòi `identity.can_write_loan(...)`, tức người giữ bước (`infra/database/migrations/V042__loan_agent_run.sql:21-26`). Lỗi 42501 được đổi thành 403 ở `backend/app/middleware/error_handler.py:80-88`. Service cho phép nhưng RLS chặn.

### N02 · Cao · Thẩm định, Cấp phê duyệt (đội agent, cảnh demo 1)
- **Tái hiện:** `tdinh` mở VinaNova `75000000-0000-4000-8000-000000000001` và bấm "Chạy đội agent" (cảnh 1).
- **Mong đợi:** kết luận chung khớp với chuyên gia và với đề xuất. BCTC kiểm toán bắt buộc khi tổng cấp trên 20 tỷ (`rules.md:17` Q5, `rules.md:102` E5). Chỉ phần thiếu không chặn mới được coi là điều kiện sau quyết định (Q7).
- **Thực tế:**
  - Kết luận: "Đề xuất phê duyệt kèm điều kiện".
  - Credit: "Đồng ý có điều kiện — Phần còn thiếu không chặn… Chưa thể chốt phê duyệt: chưa chứng minh BCTC kiểm toán bắt buộc…".
  - Compliance: "Chưa thể chấp thuận… Hạn mức bảo đảm đủ điều kiện 0 đồng".
  - Đề xuất `request_documents` ghi "Việc cần hoàn tất trước khi trình quyết định".
  - Chat cũng nhắc "Điều kiện cần hoàn tất trước phê duyệt: BCTC kiểm toán".
- **Ảnh:** `d1-c1.png`.
- **Nghi ngờ:** `agent_engine/common/gate.py:29-46` (`reconcile_experts`). Khi cổng ra APPROVE, hàm đổi `NEED_MORE_INFO` thành FLAG "Đồng ý có điều kiện" và thêm tiền tố `NON_BLOCKING` (dòng 12), nhưng giữ nguyên câu của LLM. Cổng coi BCTC kiểm toán là không chặn, trái Q5/E5 (xem Cần xác nhận 1).

### N03 · Vừa · Thẩm định
- **Tái hiện:** luồng C.
  1. Rủi ro bấm "Trả lại Thẩm định" kèm lý do. `tdinh` mở chuông.
  2. Sau đó `giamdoc` "Trả lại bổ sung" kèm lý do. `tdinh` mở chuông lần nữa.
- **Mong đợi:** người nhận hồ sơ bị trả lại biết là bị trả lại và vì sao. QHKH nhận được dạng này: "Hồ sơ bị trả lại: … Lý do: …".
- **Thực tế:**
  - Lần 1 chỉ có "Hồ sơ giao cho bạn: LA-20261111-909BD207 Bước Thẩm định, hạn 18/11/2026" (19:56:14), không có chữ trả lại, không có lý do.
  - Lần 2 chuông không có dòng mới cho hồ sơ này (`fC.jsonl` tdinh-back, tdinh-after-approval-return).
  - Lý do chỉ thấy khi mở hồ sơ (khung "Hồ sơ bị trả lại để bổ sung").
- **Nghi ngờ:**
  - Trigger `integration.notify_case_step` chỉ sinh `CASE_RETURNED` có lý do cho `RM_REWORK` (`infra/database/migrations/V056__step_reason_on_new_step.sql:49-56`). Bước Thẩm định mở lại chỉ ra `CASE_ASSIGNED` chung (dòng 64-70).
  - Lần thứ hai có thể bị gộp với thông báo cùng hồ sơ (Cần xác nhận 3).

### N04 · Vừa · Chat (Thẩm định, Rủi ro, QHKH)
- **Tái hiện:**
  - `ruiro` chọn Đại Thành, hỏi "EBITDA năm 2025 bao nhiêu?".
  - `qhkh` chọn Phúc Lâm, hỏi "Nợ vay/EBITDA bao nhiêu?".
  - `tdinh` chọn VinaNova, gõ "phân tích lại".
  - `ruiro` hỏi về danh sách đen/trừng phạt.
- **Mong đợi:** brief: chat trả lời theo loại câu hỏi (chỉ số, điều khoản…) và chỉ từ chối câu ngoài phạm vi. Chính trợ lý gợi ý "Gõ 'phân tích lại' để chạy lại cả đội agent".
- **Thực tế:**

  | Câu | Trả lời | Dữ liệu thật |
  |---|---|---|
  | EBITDA Đại Thành | "không đủ dữ liệu" | DB −22 tỷ |
  | Nợ/EBITDA Phúc Lâm | "không có EBITDA" | DB 5 tỷ; agent tính 10 lần |
  | "phân tích lại" | Ngoài phạm vi (2,2 giây) | – |
  | Danh sách đen | Ngoài phạm vi (0,2 giây) | – |

- **Ảnh:** `ch1-tdinh-*.png`, `ch3-ruiro-1.png`, `ch4-qhkh-1.png`.
- **Nghi ngờ:**
  - Bộ định tuyến `backend/app/agents/context_router.py:219-221` từ chối mọi câu không chứa từ khóa miền. "phân tích lại" có trong `_RERUN_TERMS` (dòng 113) nhưng không có từ khóa miền nên rơi vào `_refusal`. "danh sách đen" có lẽ không có trong `_COMPLIANCE_TERMS`.
  - Ngữ cảnh chat không nạp `sme_financial_year` (chưa xác định file).

### N05 · Vừa · Mọi vai xem đội agent
- **Tái hiện:** mở trace hoặc khung đội agent của hồ sơ có TSĐB pháp lý chưa rõ (Mekong Flex 120 tỷ, `case_2591f61ad3d6`).
- **Mong đợi:** mã TSĐB không bị coi là tiền (M07 lần 2).
- **Thực tế:** "TSĐB 77.100.000 đồng-0000-4000-8000-000******003 không tính vào LTV (pháp lý: ai_proposed…)". UUID thành số tiền và lộ giá trị enum `ai_proposed`.
- **Ảnh:** `v4-ChallengeMekong-trace.png`.
- **Nghi ngờ:** `agent_engine/common/recompute.py:106` chèn `collateral_id` (UUID) và `legal_status` thô vào câu. Sau đó `_MONEY` ở `agent_engine/common/labels.py:90` bắt "77100000" của UUID.

### N06 · Vừa · Mọi vai xem đội agent
- **Tái hiện:** chạy cảnh 1–3, đọc khối "Trích nguồn".
- **Mong đợi:** không lộ mã kỹ thuật (L07, M10).
- **Thực tế:** "Validation · Kiểm chứng của Validation: 'Xác thực 3 verdict: 0 vấn đề evidence'" xuất hiện ở cả 3 cảnh. Ngoài ra:
  - "Verified annual inflow 668,8 tỷ, months 11"
  - "blacklist.trùng danh sách: không"
  - "giá trị định giá: 145 tỷ.0", "dư nợ quá hạn: 14 tỷ.0"
  - "TK nhận vốn DU_LIEU_MAU-****0187"
  - Đại Thành: "CHỈ TIÊU XẤU: … — phải nêu trong kết luận", tức câu lệnh cho LLM lọt ra giao diện.
- **Ảnh:** `d1-c1.png`, `v3-DaiThanh-trace.png`.
- **Nghi ngờ:** `agent_engine/agents/validation_agent.py:119` ghi câu trace tiếng Anh, sau đó câu này bị dùng làm trích dẫn. Việc định dạng tiền nối ".0" của số thực vào sau chữ "tỷ" (`labels.py`).

### N07 · Vừa · Chat (Rủi ro, QHKH)
- **Tái hiện:**
  - `ruiro` chọn Đại Thành, gõ "Chạy lại đội agent cho hồ sơ này".
  - `qhkh` chọn Phúc Lâm, hỏi "Cho tôi số CCCD và số điện thoại của người đại diện pháp luật công ty".
- **Mong đợi:**
  - Rủi ro đang giữ bước được chạy lại, hoặc được báo đúng lý do.
  - Câu hỏi dữ liệu cá nhân bị từ chối vì bảo mật, như lần 2.
- **Thực tế:**
  - 409 `CUSTOMER_ALREADY_ASSIGNED`; giao diện hiện "Khách hàng này đang do cán bộ khác phụ trách hoặc vừa thay đổi. Hãy chọn khách hàng khác…", sai bối cảnh.
  - 403 `ACCESS_DENIED` "Missing permission: loan:analyze"; giao diện hiện "Vai trò của bạn không có quyền thực hiện thao tác này". Đây là hồi quy so với lần 2.
- **Ảnh:** `ch3b-ruiro-3.png`, `ch4-qhkh-2.png`.
- **Nghi ngờ:**
  - Lệnh chạy lại qua chat đi qua `backend/app/services/customer_assignment_service.py:120`.
  - Câu CCCD bị định tuyến thành yêu cầu phân tích nên cần `loan:analyze` (`context_router.py`), mà QHKH không có quyền đó.

### N08 · Vừa · Tuân thủ
- **Tái hiện:** `tuanthu` mở hồ sơ đang ở "Đang cho ý kiến rủi ro" (luồng E).
- **Mong đợi:** brief nói Tuân thủ chạy được đội agent. `ma-tran-phan-quyen.md:224` ghi "Tuân thủ khi đang giữ bước".
- **Thực tế:** nút chạy không có. Lý do hiện rõ: "Hồ sơ đang ở trạng thái 'Đang cho ý kiến rủi ro', vai trò của bạn không được chạy đội agent ở bước này." (`fE.jsonl` tuanthu-sees-agent).
- **Ảnh:** `fE-tuanthu-sees-agent.png`.
- **Nghi ngờ:**
  - `backend/app/services/loan_agent_run_service.py:28` chỉ cho `compliance_officer` ở `COMPLIANCE_REVIEW`. DB không có trạng thái này: các trạng thái hiện có là APPRAISAL, APPRAISAL_PENDING_INFO, APPROVAL, APPROVED, APPROVED_WITH_CONDITIONS, CHECKING, COUNCIL_SESSION, DRAFT, REJECTED, RETURNED_TO_RM, RISK_REVIEW, WITHDRAWN.
  - RLS insert (`V042…:21-26`) cũng đòi người giữ bước, mà Tuân thủ không giữ bước nào.
  - Mức có thể đổi (Cần xác nhận 2).

### N09 · Nhẹ · Đội agent (Phú Điền)
- **Tái hiện:** chạy đội agent ở Phú Điền (QHKH ở Thẩm định chờ bổ sung).
- **Mong đợi:** `POSSIBLE_MATCH` là "có thể trùng, cần rà", không phải "trùng".
- **Thực tế:** kết luận Compliance coi là trùng danh sách.
- **Nghi ngờ:** nhãn trong `agent_engine/common/labels.py`, chưa xác định dòng.

### N10 · Nhẹ · Đội agent (Operations)
- **Tái hiện:** mọi lượt.
- **Mong đợi:** chỉ ghi "đã tạo" khi có bản ghi thật.
- **Thực tế:** "Đã tạo bản nháp (chưa hiệu lực)", trong khi `create_loan_draft` không ghi bản ghi nào.
- **Nghi ngờ:** câu tóm tắt của Operations (chưa xác định dòng).

### N11 · Nhẹ · Chat
- **Tái hiện:** `tdinh` hỏi DSCR của VinaNova.
- **Thực tế:**
  - Giờ lượt chạy hiện "13:58" cho lượt lúc 20:57 giờ Việt Nam (UTC).
  - Lỗi gõ "hồ sơç".
  - Lịch sử chat QHKH có nhiều "Cuộc trò chuyện mới" rỗng.

### N12 · Nhẹ · Thẩm định
- **Tái hiện:** `tdinh` mở hồ sơ C sau khi Phê duyệt trả lại.
- **Thực tế:** 11 nút "Xử lý cờ" cùng tên, không nói cờ nào (`fC.jsonl` tdinh-after-approval-return).

## Cần xác nhận

1. Thiếu BCTC kiểm toán ở hồ sơ trên 20 tỷ (VinaNova) là điều kiện chặn hay điều kiện sau quyết định. Q5/E5 nói "bắt buộc", còn cổng engine coi là không chặn. Câu trả lời quyết định N02 là lỗi cổng hay chỉ lỗi câu chữ. Người quyết: Mate hoặc chủ dự án.
2. Tuân thủ có cần chạy đội agent không. Ma trận ghi "khi đang giữ bước", nhưng luồng hiện tại Tuân thủ không giữ bước nào. Brief thì nói đã chạy được. Mức N08 phụ thuộc câu trả lời.
3. Lần Phê duyệt trả lại không có dòng chuông mới cho Thẩm định: do gộp thông báo cùng hồ sơ hay không sinh thông báo. Seed nạp lại đã xóa thông báo của hồ sơ `LA-`, nên không SELECT lại được.
4. `reset-demo.sh` để lại ca mồ côi trong `agent.case_run` (876 lượt vẫn đếm ở Tổng quan) nhưng xóa `credit.loan_agent_run`. Danh sách trace ẩn chúng vì `isTestCase` (`frontend/src/features/dashboard/agentTrace.ts:34-37`). Chưa rõ là chủ ý hay không.
5. Tổng quan đếm "Chờ xác nhận 338" trên 876 lượt, phần lớn là lượt e2e. Chưa rõ con số này có nên lọc ca kiểm thử không.

## Chưa kiểm tra

- M04 "Nâng cấp phê duyệt": chỉ tạo được điều kiện bằng SQL INSERT, không được phép.
- Phê duyệt có điều kiện ở cấp 2 bằng hồ sơ riêng (`pheduyet2`): seed nạp lại lúc 20:07 gỡ bước mở của hồ sơ A. Đã kiểm ở cấp 1 (hồ sơ E) và phê duyệt thẳng ở cấp 2 (cảnh 5).
- Bấm "Gia hạn hạn bổ sung": nút có mặt, lần này không bấm (lần 2 đã kiểm).
- Bấm bộ lọc và mở chi tiết dòng trong nhật ký kiểm toán.
- Thư email thật (worker tắt có chủ ý). Phiên Hội đồng đợt 2. Benchmark v8 (ngoài phạm vi).
- Độ ổn định khi chạy nhiều lượt cùng hồ sơ: mỗi cảnh chỉ chạy 1 lượt vì giới hạn LLM.

## Brief ghi khác thực tế

- "Rủi ro/Tuân thủ/Trưởng phòng chạy được đội agent": chỉ Rủi ro chạy được. Trưởng phòng bị 403 (N01). Tuân thủ không có bước nào chạy được (N08).
- "Cấp phê duyệt thấy danh sách lượt agent rỗng (C-N3)": `giamdoc` thấy kết quả đội agent trên hồ sơ của mình. Rỗng chỉ khi hồ sơ chưa có lượt, mà seed không có lượt nào cho hồ sơ Phê duyệt.
- "Chat có lúc chạy lại cả đội": không tái hiện (`agent.case_run` giữ 876 qua 18 câu). Ngược lại, chat không chạy lại được khi được yêu cầu (N04, N07).
- "Trace thô còn số đã bị phản biện": trace có hiện số cũ (120 tỷ) nhưng đánh dấu "[ĐÃ ĐIỀU CHỈNH]", và kết luận dùng số mới (54,6 tỷ). Chấp nhận được.
- `demo-data.md:36` về `giamdoc` gặp lỗi 500 đã cũ.
