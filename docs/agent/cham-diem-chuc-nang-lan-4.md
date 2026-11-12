# Chấm điểm chức năng – lần 4

Ngày chấm: 12/11/2026, khoảng 21:50–23:20 giờ Việt Nam. Ứng dụng: web `:3000`, API `:8000`, engine chế độ `llm`, nhánh `import/duskdash` tại `abe86da`, DB V064.

Cách chấm:
- Đăng nhập từng vai bằng Playwright trên giao diện thật. Hành động bị cấm thử cả trên giao diện lẫn API.
- Đối chiếu DB chỉ bằng SELECT. Số của đội agent đối chiếu với `agent.case_event`, các bảng `credit.*` và `agent_engine/rag_corpus/`.
- Chỉ chấm chức năng, luồng, thông báo, phân quyền và độ rõ của thao tác và nội dung. Không chấm thẩm mỹ.
- Cùng thang 0–10 và ngưỡng 8,5 như các lần trước. Không cộng điểm vì đã sửa nhiều.
- Script, log và ảnh ở `/tmp/g7/` (`specs/*.spec.ts`, `*.jsonl`, `*.out`, `shots/`). Tên ảnh trong báo cáo là tên tệp trong `/tmp/g7/shots/`.
- Mỗi luồng nhiều bước chạy trong `flock /tmp/do-an-e2e.lock`.
- Hồ sơ riêng tự tạo:

  | Luồng | Hồ sơ | Số tiền | Nội dung | Thời gian |
  |---|---|---|---|---|
  | A | `LA-20261112-E6055323` | 25 tỷ | thử vai sai từng bước, Trưởng phòng chạy đội agent, Tuân thủ, tới cấp 2 | 480 giây |
  | A4 | `LA-20261112-50711E91` | 25 tỷ | phê duyệt có điều kiện ở cấp 2 (`pheduyet2`) | – |
  | B | `LA-20261112-59F60DC0` | 2 tỷ | HTTD trả lại, gia hạn, gửi lại, yêu cầu bổ sung, Thẩm định trả lại, rút | 92 giây |
  | C | `LA-20261112-0C1905C8` | 3 tỷ | Rủi ro trả lại, giữ nghi gian lận, yêu cầu giải trình, Phê duyệt trả lại, từ chối | 172 giây |
  | D | `LA-20261112-E3D9DABE` | 120 tỷ | Trưởng phòng chuyển người, Hội đồng | 130 giây |
  | E | `LA-20261112-C9133AB7` | 2 tỷ | đội agent, phê duyệt có điều kiện cấp 1 | 136 giây |

- Sau 5 cảnh demo đã chạy `flock /tmp/do-an-e2e.lock bash infra/scripts/reset-demo.sh` (rc=0). Kết quả: "ca agent gan ho so: 0, thong bao: 108, outbox cho gui: 0".
- Ngân sách LLM:
  - Đã tiêu 13/25 lượt chạy đội agent: 7 lượt ở `ag1`, luồng A, luồng E, 3 cảnh demo, và 1 lượt do chat "phân tích lại".
  - Đã hỏi 27/40 câu chat.
  - Không gặp 402.
- Worker email tắt và không được bật. Chỉ kiểm thông báo trong ứng dụng.

## Kết luận

**KHÔNG ĐẠT.**

Lý do không đạt:
1. Có 1 lỗi mức Cao: P03.
   - Nút "Hỏi trợ lý về <hồ sơ>" trong Việc của tôi hiện chip hồ sơ nhưng không gửi ngữ cảnh cho backend.
   - Kết quả: trợ lý trả lời theo khách hàng của hội thoại cũ (hỏi VinaNova, nhận số EBITDA của Sông Hàn), hoặc trả lời "chưa chọn khách hàng".
2. Nhiều điểm dưới 8,5:
   - Vai: QHKH, HTTD, Thẩm định, Rủi ro, Tuân thủ và Kiểm toán cùng 8,0.
   - Sản phẩm: 1 (chuyên gia phối hợp), 3 (công cụ, hành động) và 5 (so sánh) cùng 8,0.

Tiến bộ so với lần 3 (đã tự đo):
- N01 (Trưởng phòng chạy đội agent), N03 (thông báo trả lại có lý do), N10 và N11 đã sửa.
- N02 nay nói cùng một điều ở kết luận, chuyên gia và đề xuất.
- Đã đi được các mục lần 3 để "Chưa kiểm tra" và đều chạy đúng:
  - phê duyệt có điều kiện ở cấp 2;
  - bộ lọc nhật ký kiểm toán;
  - gia hạn bổ sung.
- 5 cảnh demo chạy liền 129 giây, không cảnh nào hỏng.

Còn lại:
- Chat chưa ổn. Chỉ QHKH đang được giao khách mới có ngữ cảnh hồ sơ trong chat; các vai khác không có (P04). Câu hỏi điều khoản của Thẩm định vẫn bị 409 sai bối cảnh (N07).
- Lần này lộ thêm hai lỗi mức Vừa ở luồng người dùng:
  - P01: lý do "Yêu cầu giải trình" không được lưu;
  - P02: nhật ký kiểm toán ghi "Nháp chưa đánh số" cho hồ sơ đã quyết định.

## Kiểm lại lỗi lần 3

| Mã | Mức lần 3 | Trạng thái lần 4 | Bằng chứng tự đo |
|---|---|---|---|
| N01 | Cao | Đã sửa | Luồng A: `credit.manager@` mở hồ sơ A ở Thẩm định. Nút "Chạy đội agent" bật, bấm chạy được. Ca `case_49af19576121` ra `Needs Info` sau 45 giây (`fA.jsonl` truongphong-run-agent). |
| N02 | Cao | Đã sửa, theo cách đã chốt | Cảnh 1 VinaNova (`case_ff0823129f59`) nói cùng một điều ở 3 chỗ. Kết luận chung: "Đề xuất phê duyệt với điều kiện tiên quyết: phải có BCTC kiểm toán trước khi trình cấp phê duyệt (CS-TD-SME/2025 §4.1, §6.1)". Credit và Compliance: "Đồng ý có điều kiện … Điều kiện tiên quyết trước khi trình cấp phê duyệt: Phải có BCTC kiểm toán". Đề xuất `request_documents`: "Điều kiện tiên quyết: phải hoàn tất trước khi trình cấp phê duyệt (khác điều kiện trước giải ngân)" (`d2.jsonl`). |
| N03 | Vừa | Đã sửa | Luồng C. Rủi ro trả lại, `tdinh` nhận "Hồ sơ bị trả lại: LA-20261112-0C1905C8 Lý do: Cần bổ sung phân tích rủi ro tập trung ngành… Hồ sơ trở lại bước Thẩm định". `giamdoc` trả lại, `tdinh` nhận dòng thứ hai "Lý do: Cần Thẩm định làm rõ nguồn trả nợ…" (`fE.out` dòng 3). |
| N04 | Vừa | Sửa một phần | Đúng: EBITDA Đại Thành theo năm 14 / 8 / −22 tỷ khớp `credit.sme_financial_year`; EBITDA Sông Hàn 2025 12 tỷ ở hồ sơ chưa có lượt agent; câu danh sách đen/AML trả lời đúng "chưa có đánh giá KYC". "phân tích lại" chạy thật cả đội nhưng chỉ với QHKH (1 lượt, 47 giây). Còn: "Nợ vay/EBITDA của hồ sơ này" ở Phúc Lâm trả 7,0 lần (nợ hiện hữu 35 / 5). Đội agent và cổng dùng 10,00 lần sau cấp; câu trả lời không nói là số trước khi cấp. Các vai khác không có ngữ cảnh hồ sơ (P04). |
| N05 | Vừa | Chưa kiểm tra | Lần này không chạy hồ sơ có TSĐB pháp lý chưa rõ. |
| N06 | Vừa | Sửa một phần | Không còn "verdict" hay "evidence" trong trích nguồn. Còn mã nguồn thô: `compliance_policy` (mọi vai xem hồ sơ E, Thành Đạt), và "validation … valid" trên thẻ đề xuất đã xác nhận (`c1b.jsonl`). Xem P06. |
| N07 | Vừa | Sửa một phần | Đúng: câu xin CCCD bị từ chối vì bảo mật, route REFUSE, 0,19 giây. Còn: `tdinh` hỏi "Điều 4.1 chính sách tín dụng SME yêu cầu gì?" vẫn bị 409 `CUSTOMER_ALREADY_ASSIGNED`, giao diện hiện "Khách hàng này đang do cán bộ khác phụ trách…". Đã tái hiện 3 lần ở `c5`, `c6`, `c7`. |
| N08 | Vừa | Ghi nhận, không tính lỗi (đã chốt) | `tuanthu` thấy khung đội agent ở chế độ chỉ xem, có lý do "vai trò của bạn không được chạy đội agent ở bước này" (`fE.out` dòng 7). |
| N09 | Nhẹ | Sửa một phần | Compliance còn câu lặp chữ "trùng danh sách danh sách cảnh báo". `POSSIBLE_MATCH` vẫn được tính là trúng (`agent_engine/mcp_core_banking/server.py:281-297`, `hit = sanction_status != 'CLEAR'`). Xem "Cần xác nhận" 3. |
| N10 | Nhẹ | Đã sửa | Operations nay ghi "Đã soạn nội dung bản nháp khoản vay để người có thẩm quyền xem chưa ghi vào hệ thống" (mọi lượt). |
| N11 | Nhẹ | Đã sửa | Chat của `ruiro` ghi "Dựa trên kết quả phân tích lúc 22:41". Giờ này khớp với lượt Đại Thành lúc 22:41 giờ Việt Nam trên trang trace. Không thấy lỗi gõ trong 27 câu. |
| N12 | Nhẹ | Sửa một phần | `aria-label` đã khác nhau, ví dụ "Xử lý cờ: Kỳ thu tiền 150 ngày – vượt ngưỡng 90 ngày" (`s3.jsonl`). Chữ trên nút vẫn giống hệt nhau. Luồng D có 11 nút "Xử lý cờ" (`frontend/src/features/loan-detail/ActionsPanel.tsx:154`). |
| M01 | Cao (lần 2) | Đã sửa | `/quan-tri` chỉ đọc. Tên vai đã là tiếng Việt ("Chuyên viên QHKH", "Hỗ trợ tín dụng", "Cấp phê duyệt"…). Đổi vai demo có 11 lựa chọn và banner "Chế độ demo · Đang demo với vai…"; nút "Quay về Quản trị" chạy được (`s3.jsonl`). |
| M04 | Vừa (lần 2) | Chưa kiểm tra | Nâng cấp phê duyệt do nhóm liên quan: vẫn chưa có cách tạo bằng giao diện mà không INSERT. |
| M07 | Vừa (lần 2) | Chưa kiểm tra | Giống N05. |
| M08 | Vừa (lần 2) | Đã sửa (giữ) | Trace hiện "Validation kiểm chứng · Phản biện: 1 lần, đã xử lý 1" kèm số tính lại (`v1.jsonl`, Hưng Phát `case_df9548b42066`). |
| M10 | Nhẹ (lần 2) | Còn | Luồng D ở Hội đồng. `qhkh`, `tdinh2`, `kiemtoan` gọi API `decide` nhận 403 "Action decide requires one of roles…" (`backend/app/workflow/service.py:230`). |
| L07 | Cao (lần 1) | Sửa một phần | Giống N06. |
| L17 | Vừa (lần 1) | Còn | Cảnh 1 còn hai `add_disbursement_condition` cùng nói về người đại diện. Một thẻ: "Bổ sung thông tin người đại diện và hoàn tất xác minh trước giải ngân". Thẻ kia: "Bổ sung trước giải ngân (không chặn trình): người đại diện pháp luật chưa có trong hồ sơ" (`d2.jsonl`). Commit `4cd415b` (gộp theo ngưỡng 50% từ khóa) chưa gộp được hai câu này. |
| C-N1 | – | Còn (do seed) | Không tính là lỗi ứng dụng. |
| C-N2 | – | Đã làm | QHKH chạy được đội agent ở Trả về QHKH: chat "phân tích lại" ở Phúc Lâm tạo 1 lượt, `agent.case_run` 885 → 886. |
| C-N3 | – | Đã sửa | `giamdoc` thấy khung đội agent và link trace của hồ sơ E; `GET` ca trả 200 (`fE.out` dòng 9). `agent-run-history` chỉ hiện khi có từ 2 lượt (`frontend/src/features/loan-detail/AgentTeamPanel.tsx:112`), nên danh sách rỗng là đúng. |
| C-N4 | – | Đã chốt | `quantri` mở hồ sơ vay nhận "Bạn không có quyền xem nội dung này". |
| C-N5 | – | Đã sửa | Luồng D: người giữ cũ sau khi chuyển người nhận 404 "Không tìm thấy nội dung", trang không vỡ. |
| C-N6 | – | Đã sửa | Lịch sử lượt không in mã thô. |

### Các mục lần 3 ghi "Chưa kiểm tra"

| Mục | Lần 4 |
|---|---|
| Phê duyệt có điều kiện ở cấp 2 | Chạy được. Luồng A4, hồ sơ 25 tỷ, `pheduyet2` giữ bước. Gọi API khi ngoại lệ chưa quyết định nhận 422 `EXCEPTIONS_UNDECIDED` "Mỗi ngoại lệ được đề xuất phải được chấp thuận hoặc từ chối cùng với quyết định". Gửi phiên bản cũ nhận 409. Trên giao diện có bước xác nhận `decision-confirm`; trạng thái ra "Phê duyệt có điều kiện". QHKH nhận "Có quyết định: LA-20261112-50711E91 Hồ sơ được phê duyệt có điều kiện". |
| Bộ lọc nhật ký kiểm toán | Chạy được (`au.jsonl`). Lọc hành động "Quyết định hồ sơ" ra 241 dòng; thêm người thao tác "Pham Thu Ha" ra 70; số hồ sơ `LA-` ra 11; ngày 11/11 ra 3174. Lỗi P02. Lọc người thao tác "agent" ra 0 dòng (Cần xác nhận 5). |
| Gia hạn hạn bổ sung | Chạy được (luồng B). Nút "Gia hạn" khóa khi chưa có lý do. Có lý do thì ra "Đã gia hạn 1 lần" (khóa), hạn mới 27/11/2026, đúng 7 ngày làm việc tính từ hạn cũ. |

## Bảng điểm từng vai

### Điểm

| Vai (tài khoản) | Lần 1 | Lần 2 | Lần 3 | Lần 4 |
|---|---|---|---|---|
| QHKH (`qhkh`) | 6,5 | 8,0 | 8,0 | 8,0 |
| HTTD (`httd`) | 6,5 | 8,0 | 8,5 | 8,0 |
| Thẩm định (`tdinh`, `tdinh2`) | 7,5 | 8,0 | 7,5 | 8,0 |
| Rủi ro (`ruiro`) | 8,0 | 8,5 | 8,0 | 8,0 |
| Tuân thủ (`tuanthu`) | 5,0 | 8,5 | 7,5 | 8,0 |
| Phê duyệt cấp 1 – Giám đốc chi nhánh (`giamdoc`) | 7,5 | 8,5 | 8,5 | 8,5 |
| Phê duyệt cấp 2 Hội sở (`pheduyet`, `pheduyet2`) | 7,5 | 8,5 | 8,0 | 8,5 |
| Trưởng phòng (`credit.manager@`) | 7,0 | 6,5 | 7,5 | 8,5 |
| Kiểm toán (`kiemtoan`) | 8,0 | 8,5 | 8,5 | 8,0 |
| Quản trị (`quantri`) | 7,0 | 5,5 | 8,0 | 8,5 |

### Đã đi qua và lý do điểm

- **QHKH, 8,0.**
  - Làm trọn được:
    - tạo đề xuất;
    - nhận "Hồ sơ bị trả lại … Lý do: …" và "Yêu cầu bổ sung … Nội dung cần bổ sung: …";
    - gia hạn một lần, có khóa khi chưa nhập lý do;
    - gửi lại, tải tài liệu bổ sung;
    - rút hồ sơ: sau khi rút, API gửi lại nhận 403 kèm lý do tiếng Việt;
    - nhận thông báo quyết định và xem "Điều kiện trước giải ngân · Từ quyết định".
  - Chat:
    - Phúc Lâm có ngữ cảnh hồ sơ;
    - "phân tích lại" chạy thật cả đội;
    - câu xin CCCD bị từ chối.
  - Trừ điểm:
    - P03 ("Hỏi trợ lý về <hồ sơ>" không gửi ngữ cảnh);
    - câu "phân tích lại" chỉ trả về một dòng (P07);
    - Nợ vay/EBITDA 7,0 lệch với con số 10,00 của đội agent (N04);
    - chuông từ chối không kèm lý do (P08);
    - QHKH không được báo khi hồ sơ chuyển Hội đồng (Cần xác nhận 6).
- **HTTD, 8,0.**
  - Làm được:
    - trả lại QHKH kèm lý do;
    - chuyển Thẩm định;
    - "Ghi nhận đã bổ sung";
    - "Ghi nhận đã giải trình".
  - Trừ điểm (P01): ở bước Chờ giải trình, khung yêu cầu hiện lý do trả lại CŨ của Rủi ro thay vì nội dung cần giải trình. Lỗi này nằm đúng trong việc chính của HTTD.
- **Thẩm định, 8,0.**
  - Làm được:
    - chạy đội agent;
    - xác nhận đề xuất kèm lý do: nút khóa khi chưa có lý do, và ghi `CASE_DISBURSEMENT_CONDITION_ADD` vào nhật ký;
    - yêu cầu bổ sung, trả lại;
    - nhận hồ sơ được chuyển (`tdinh2`), trình Hội đồng.
  - N03 đã sửa.
  - Trừ điểm:
    - chat không có ngữ cảnh hồ sơ (P04), nên "phân tích lại" chỉ ra văn bản LLM "PHÂN TÍCH LẠI HỒ SƠ…" mà không chạy đội;
    - câu hỏi điều khoản bị 409 (N07);
    - nút cờ giống chữ nhau (N12);
    - P03.
- **Rủi ro, 8,0.**
  - Làm được:
    - trả lại Thẩm định;
    - yêu cầu giải trình;
    - chạy lại đội agent;
    - thấy lý do khóa "Trình phê duyệt".
  - Khi Tuân thủ giữ nghi gian lận, Rủi ro không còn nút nào, và API trình nhận 403 tiếng Việt.
  - Trừ điểm:
    - lý do giải trình của chính Rủi ro bị mất (P01);
    - lý do khóa nối bằng "hoặc", không nói thiếu mục nào (P08);
    - chat chỉ ở mức khách hàng (P04);
    - câu "Điều kiện trước giải ngân" lẫn các điều kiện tiên quyết trước khi trình (BCTC, AML, CIC) vào điều kiện giải ngân.
- **Tuân thủ, 8,0.**
  - Làm được:
    - chuông "Cần ý kiến Tuân thủ…";
    - hồ sơ có trong Việc của tôi;
    - ghi ý kiến;
    - "Giữ hồ sơ nghi gian lận" và "Đóng xử lý". Trạng thái lần lượt ra "Tạm dừng nghi gian lận" rồi "Chờ ý kiến rủi ro".
  - N08 không tính.
  - Trừ điểm: mã `compliance_policy` lộ trên khung đội agent (P06); chat không có ngữ cảnh hồ sơ (P04).
- **Cấp 1 (`giamdoc`), 8,5.**
  - Làm được:
    - thấy khung đội agent và trace;
    - phê duyệt có điều kiện: bước xác nhận liệt kê điều kiện và "Ngoại lệ: 11 chấp thuận, 0 từ chối. Không hoàn tác được";
    - trả lại, với câu xác nhận "quay lại bước Thẩm định… Hồ sơ chưa bị từ chối";
    - từ chối, với câu xác nhận "bị từ chối và kết thúc. Không hoàn tác được".
  - Trừ điểm (Nhẹ): mã `compliance_policy` lộ; câu "trình trước khi có đội agent" sai với hồ sơ mới (P05).
- **Cấp 2 (`pheduyet`, `pheduyet2`), 8,5.**
  - Làm được:
    - phê duyệt có điều kiện ở cấp 2, có chặn bằng 422 và 409;
    - cảnh 5 phê duyệt thẳng xong trong 10 giây;
    - ở Hội đồng chỉ xem, không có nút.
  - Trừ điểm (Nhẹ): P05 ở Bắc Hà; `compliance_policy` lộ ở Thành Đạt.
- **Trưởng phòng, 8,5.**
  - Làm được:
    - "Hồ sơ của phòng" có 19 hồ sơ, bộ lọc và cột Người giữ;
    - chuyển người: danh sách có "Chuyên viên Thẩm định Mẫu 2 · 0 việc đang mở", và người mới nhận "Được giao hồ sơ… Trưởng phòng chuyển hồ sơ cho bạn: Cân đối…";
    - chạy đội agent (N01 đã sửa);
    - ô tìm "Đại Thành" ra cả hồ sơ lẫn khách hàng;
    - hồ sơ ngoài phòng (Đại Thành ở RISK_REVIEW) không có ô chuyển người.
  - Trừ điểm (Nhẹ): nút "Chuyển" khóa nhưng không nói lý do khi chưa chọn người.
- **Kiểm toán, 8,0.**
  - Làm được:
    - đủ bộ lọc;
    - API `decide` nhận 403;
    - chạy đội agent nhận 403 `AGENT_RUN_NOT_ALLOWED` kèm câu tiếng Việt.
  - Trừ điểm:
    - P02: mọi hồ sơ `LA-`, kể cả hồ sơ đã quyết định, hiện "Nháp chưa đánh số". Kiểm toán viên không đọc được số hồ sơ.
    - Ô người thao tác gợi ý "Tên người hoặc agent" nhưng không có dòng nào của agent.
- **Quản trị, 8,5.**
  - Làm được:
    - trang chỉ đọc;
    - tên vai tiếng Việt;
    - ma trận quyền;
    - đổi vai demo và quay về.
  - Trừ điểm (Nhẹ): ma trận quyền hiện mã như `account:read` cạnh tên tiếng Việt. Với vai quản trị thì chấp nhận được.

## Bảng 5 sản phẩm của đề bài

### Đội agent đã chạy

13 lượt trên 10 hồ sơ:

| Hồ sơ | Vai chạy | Kết quả | Thời gian |
|---|---|---|---|
| Hưng Phát (Nháp) | `qhkh` | Needs Info | 37 giây |
| Phúc Lâm (Trả về QHKH) | `qhkh` | Needs Info | 43 giây |
| Phúc Lâm, chạy lại qua chat | `qhkh` | Cần bổ sung hồ sơ | 47 giây |
| Phú Điền | `tdinh` | Rejected | 46 giây |
| Trường An | `tdinh` | Needs Info | 50 giây |
| Đại Thành | `ruiro` | Needs Info | 52 giây |
| Nam Phương | `tdinh` | Needs Info | 55 giây |
| Đông Á | `truongphong` | Needs Info | 58 giây |
| Mekong Flex 25 tỷ (luồng A) | `truongphong` | Needs Info | 45 giây |
| Mekong Flex 2 tỷ (luồng E) | `tdinh` | Needs Info, `request_documents` 4 mục | – |
| VinaNova (cảnh 1) | `tdinh` | Pending Approval | 40 giây |
| Việt Tiến (cảnh 2) | `tdinh` | Needs Info | 39 giây |
| Sông Hàn (cảnh 3) | `tdinh` | Rejected | 41 giây |

Đối chiếu số với DB:
- Doanh thu, EBITDA, nợ vay và CIC trong các lượt `ag1` khớp `credit.sme_financial_year` và các bảng `credit.*`.
- Cấp phê duyệt khớp với mức tổng cấp.
- Trích dẫn CS-TD-SME/2025 §4.1, §4.2, §6.1 và Điều 7 có trong `agent_engine/rag_corpus`.

### Điểm

| # | Sản phẩm (đề bài SHB2) | Lần 1 | Lần 2 | Lần 3 | Lần 4 |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 6,5 | 7,5 | 7,5 | 8,0 |
| 2 | Planner giao việc cho executor | 8,0 | 8,5 | 8,5 | 8,5 |
| 3 | Agent gọi công cụ và hành động thật | 7,0 | 7,5 | 7,5 | 8,0 |
| 4 | Dashboard trace, trạng thái, quyết định | 7,0 | 7,5 | 8,0 | 8,5 |
| 5 | So sánh single và multi | 7,5 | 7,5 | 8,0 | 8,0 |

### Căn cứ và trừ điểm

1. **Chuyên gia phối hợp, 8,0.**
   - Điểm tốt:
     - Credit, Compliance và Operations (thêm Document) cùng ghi lên "Bảng chung của đội agent".
     - Cảnh 1–3 nói cùng một điều ở kết luận, từng chuyên gia và đề xuất.
     - Cảnh 3 từ chối vì CIC nhóm 3, quá hạn 14 tỷ, có trích Điều 7.
   - Trừ điểm:
     - Ở Phúc Lâm, kết luận chung là "Cần bổ sung hồ sơ", Tín dụng "từ chối", Tuân thủ "chấp thuận có điều kiện" (Cần xác nhận 1).
     - Điều kiện bị lặp (L17).
     - Cảnh 1 đề xuất phê duyệt 80 tỷ khi "Hạn mức bảo đảm đủ điều kiện hiện tại: 0 đồng" (Cần xác nhận 2).
     - Có câu cụt: "Đạt các ngưỡng hiện tính được phê duyệt có điều kiện hoàn tất xác minh hồ sơ trước giải ngân" (cảnh 2).
2. **Planner, 8,5.** Trace có "Planner giao việc cho đội agent" kèm lý do, từng việc theo agent và thời gian, và "Luồng phối hợp giữa các agent".
3. **Công cụ và hành động thật, 8,0.**
   - Điểm tốt:
     - Mỗi lượt khoảng 14 lần gọi công cụ, có cột "Agent tự gọi".
     - Đề xuất có xác nhận kèm lý do. Xác nhận ghi điều kiện thật và audit `CASE_DISBURSEMENT_CONDITION_ADD` có `proposal_id`.
   - Trừ điểm:
     - Thẻ đã xác nhận lộ "validation … valid" (P06).
     - "phân tích lại" qua chat chỉ chạy được với QHKH (P04).
     - 9/13 lượt ra Needs Info, nên ít khi thấy được hành động sau Pending Approval.
4. **Dashboard, 8,5.**
   - Tổng quan: 888 lượt, 39,4% có kết luận, 10.837 lần gọi công cụ, 54 lần Validation phản biện, chi phí 3,50 USD.
   - Mỗi lượt có số lần gọi LLM, token và USD.
   - Có "Quyết định của người duyệt và hành động thật".
   - C-N3 đã sửa.
   - Trừ điểm nhẹ: tên công cụ thô (`get_business`, `check_blacklist`) có cột nhãn đi kèm.
5. **So sánh single và multi, 8,0.**
   - Tab So sánh: bộ ca v7, 8 ca × 3 lượt × 2 chế độ, có ± độ lệch chuẩn.

     | Chỉ số | Đội agent | Một mô hình |
     |---|---|---|
     | Độ phủ | 95,2% | 88,3% |
     | Trích dẫn | 100% | 79,9% |
     | Dừng đúng cổng | 100% | 75% |
     | Thời gian | 18,6 giây | 36,2 giây |
     | Token | 5.921 | 14.050 |
     | Chi phí | 0,0017 USD | 0,0023 USD |

   - Trừ điểm:
     - Số đo ngày 09/11, trước nhiều thay đổi của engine.
     - Chấm bằng từ khóa, không có giám khảo LLM.
     - Chỉ 8 ca.

### Câu hỏi khó giám khảo có thể hỏi

| Câu hỏi | Hệ thống trả lời được tới đâu |
|---|---|
| "Agent tự chọn công cụ hay bị code gọi sẵn?" | Trace có cột "Agent tự gọi" và đếm theo agent. Trả lời được. |
| "Khi chuyên gia bất đồng thì ai thắng?" | Có Validation phản biện, có ghi đã xử lý. Nhưng Phúc Lâm cho thấy Tín dụng "từ chối" mà kết luận là "Cần bổ sung", và giao diện không giải thích quy tắc ưu tiên. Trả lời một phần. |
| "Vì sao gần như ca nào cũng Cần bổ sung?" | Do seed thiếu AML/KYC/BCTC. Căn cứ nêu rõ ("Chưa có kết quả sàng lọc AML…"), nhưng danh sách khách hàng lại ghi KYC "Đã xác minh". Dễ bị hỏi vặn. |
| "Multi hơn single bao nhiêu, đo thế nào?" | Có bảng ± std và chi phí. Yếu ở bộ chấm từ khóa, 8 ca, và số đo trước build hiện tại. |
| "Hỏi trợ lý ngay trên hồ sơ này?" | Hỏng: P03 và P04. |
| "Người quyết định ở đâu?" | Trace có "Người quyết định, ngoài khung AI". Modal quyết định có bước xác nhận. Audit ghi tên người. Trả lời được. |
| "Chat có trả lời ai là người quyết định ở mức 20–100 tỷ?" | Chưa: "Dữ liệu không nêu cụ thể cấp phê duyệt tương ứng với mức 20–100 tỷ". |

## 5 cảnh demo

Đi sau `reset-demo.sh`, theo đúng `docs/agent/demo-data.md:25-32`, bấm giờ bằng script `d1-demo.spec.ts`. Tổng 129 giây cho 5 cảnh; xác nhận đề xuất ở cảnh 1 tốn thêm 22 giây (`c1b.spec.ts`).

| # | Cảnh | Thời gian | Kết quả | Chỗ vấp |
|---|---|---|---|---|
| 1 | VinaNova 80 tỷ, `tdinh` chạy đội agent | 40 giây (theo `agent.case_run`) | Ca `case_ff0823129f59` ra `Pending Approval`: "Đề xuất phê duyệt với điều kiện tiên quyết: phải có BCTC kiểm toán…", cấp 2 Hội sở. Có 1 `request_documents` và 2 `add_disbursement_condition` chờ xác nhận. Xác nhận kèm lý do ra "Đã xác nhận và thực hiện"; audit `CASE_DISBURSEMENT_CONDITION_ADD`. | Hai điều kiện trùng ý về người đại diện (L17). "Hạn mức bảo đảm đủ điều kiện hiện tại: 0 đồng" đứng cạnh "Đồng ý có điều kiện". Thẻ đã xác nhận hiện "validation … valid" (P06). Script của giám khảo đọc nhầm trạng thái lượt cũ nên bấm xác nhận sớm. Đây là lỗi script, không phải lỗi ứng dụng. |
| 2 | Việt Tiến 20 tỷ, chưa có BCTC | 39 giây | `Needs Info`; `request_documents` 2 mục "Chưa có BCTC/số liệu tài chính — chưa tính được Nợ vay/EBITDA (CS-TD-SME/2025 §4.2, §6.1)". | Câu cụt của Compliance (xem sản phẩm 1). |
| 3 | Sông Hàn 22 tỷ, CIC nhóm 3 | 41 giây | `Rejected`: "Từ chối CIC nhóm 3: không đủ điều kiện cấp tín dụng"; `add_risk_flag` trích Điều 7. | Không vấp. |
| 4 | Phú Điền OCR | 4 giây tải + 10 giây xem | QHKH tải PDF scan (202). HTTD mở: 4 vùng tô, ghi chú "Nguồn: tệp tải lên, trường do AI trích từ lớp chữ của PDF". Bấm vùng ra thẻ "Vốn điều lệ … AI đề xuất · Độ tin cậy do AI báo: 80% · Tôi đã đối chiếu, xác nhận giá trị". | Giá trị hiện "5.000.000.000 dong tỷ đồng": chữ "dong" của tệp còn sót, rồi lại ghép thêm "tỷ đồng" (P09). |
| 5 | Thành Đạt 55 tỷ, `pheduyet` quyết định | 10 giây | Bước xác nhận ghi "hạn mức 55.000.000.000 đồng (đề nghị 55 tỷ đồng), kỳ hạn 12 tháng. Không hoàn tác được". Hồ sơ ra "Đã phê duyệt", nút Quyết định biến mất. | Không vấp. |

## Chat: 27 câu, 4 vai

Chi tiết ở `/tmp/g7/c5.jsonl` … `c9.jsonl`. Trong các câu không phải "phân tích lại", `agent.case_run` không tăng: chat dùng lại kết quả, không tự chạy lại cả đội.

| Vai · khách | Câu | Thời gian | Kết quả |
|---|---|---|---|
| `tdinh` · Sông Hàn (chưa có lượt) | EBITDA từng năm | 3,8 giây | Đúng: chỉ có 2025, 12 tỷ. |
| `tdinh` · Sông Hàn | Kết luận | 10,4 giây | "không có kết luận nào của đội agent". Đúng với dữ liệu lúc hỏi. |
| `tdinh` · Sông Hàn | Ai quyết định | 9,9 giây | Yếu: "Dữ liệu không nêu cụ thể cấp phê duyệt tương ứng với mức 20–100 tỷ". |
| `tdinh` · Sông Hàn | Điều 4.1 chính sách tín dụng SME yêu cầu gì? | 0,2–0,3 giây | Lỗi 409 `CUSTOMER_ALREADY_ASSIGNED` (3 lần). Giao diện: "Khách hàng này đang do cán bộ khác phụ trách…" (N07). |
| `tdinh` · Sông Hàn | phân tích lại | 12–18 giây | Không chạy đội. Ra văn bản LLM "PHÂN TÍCH LẠI HỒ SƠ…", route DIRECT (P04). |
| `ruiro` · Đại Thành | EBITDA 2023/24/25 | 4,8 giây | Đúng: 14 / 8 / −22 tỷ, kèm "Dựa trên kết quả phân tích lúc 22:41…". |
| `ruiro` · Đại Thành | Danh sách đen/AML | 4,6 giây | Đúng: chưa có đánh giá KYC/AML. |
| `ruiro` · Đại Thành | Cờ | 10,5 giây | Nội dung tốt. Lộ "compliance_policy Điều 6". |
| `ruiro` · Đại Thành | Điều kiện trước giải ngân | 14,7 giây | Yếu: gộp BCTC, AML, CIC (điều kiện trước khi trình) vào điều kiện giải ngân. |
| `ruiro` | Thời tiết | 0,35 giây | Từ chối, kèm gợi ý câu nên hỏi. |
| `qhkh` · Phúc Lâm | Nợ vay/EBITDA của hồ sơ này | 5,5 giây | "7,0 lần: tổng nợ vay 35 tỷ chia EBITDA 5 tỷ". Đội agent dùng 10,00 lần sau cấp (N04). |
| `qhkh` · Phúc Lâm | phân tích lại | 47,1 giây | Chạy thật 1 lượt (`case_run` 885 → 886). Trả lời chỉ một dòng: "**Trạng thái hồ sơ phân tích:** Cần bổ sung hồ sơ" (P07). |
| `qhkh` · Phúc Lâm | Kết luận của đội agent | 14,0 giây | Tốt: lý do, từng bộ phận, căn cứ §4.2. |
| `qhkh` · `/chat` | Cho tôi số CCCD… | 0,19 giây | Từ chối vì bảo mật, route REFUSE. |
| `qhkh`, `pheduyet`, `giamdoc` (khung "Hỏi trợ lý về <hồ sơ>") | Nợ vay/EBITDA; Kết luận; phân tích lại | 2,2–3,4 giây | "Hiện chưa có khách hàng nào được chọn trong hội thoại…" dù chip hiện hồ sơ (P03). |
| `tdinh` (khung "Hỏi trợ lý về HSV-2026-00187", VinaNova) | EBITDA năm 2025 của khách hàng trong hồ sơ này | 3,2 giây | Trả lời "EBITDA năm 2025 của CTCP Xây lắp Điện Sông Hàn là 12 tỷ". Sai khách hàng (P03). |

## Danh sách lỗi

### P03 · Cao · Mọi vai có "Hỏi trợ lý"

- **Tái hiện:**
  1. `tdinh` mở Việc của tôi và bấm biểu tượng "Hỏi trợ lý về HSV-2026-00187" (CTCP Bao bì VinaNova).
  2. Hỏi "EBITDA năm 2025 của khách hàng trong hồ sơ này là bao nhiêu?".
  3. Làm lại với `qhkh` (HSV-2026-00201), `pheduyet` (HSV-2026-00163), `giamdoc`.
- **Mong đợi:** "Hỏi AI về <đối tượng>" tại chỗ hỏi về đúng đối tượng đó (`docs/business/rules.md:120`, F1).
- **Thực tế:**
  - `tdinh`: "EBITDA năm 2025 của CTCP Xây lắp Điện Sông Hàn là 12.000.000.000 VND". Hội thoại có `active_customer_id` của Sông Hàn và không có `active_loan_application_id` (SELECT `ai.message` / `ai.conversation`).
  - Các vai khác nhận "Hiện chưa có khách hàng nào được chọn trong hội thoại".
- **Ảnh:** `c8-tdinh-1.png`, `c7-qhkh-1.png`, `c7-pheduyet-1.png`.
- **Nghi ngờ:**
  - `frontend/src/features/ai-panel/AiPanel.tsx:32` lấy hội thoại đầu danh sách.
  - `AiPanel.tsx:59-71` tạo hội thoại `create.mutateAsync({})` và gửi tin mà không kèm `context` (chip lấy từ `useAiPanel()` ở dòng 20 chỉ để hiển thị, dòng 95-98).

### P04 · Vừa · Chat của Thẩm định, Rủi ro, Tuân thủ, Phê duyệt

- **Tái hiện:**
  1. `tdinh` vào `/chat` và gõ "/Sông Hàn" (hồ sơ HSV-2026-00184 do `tdinh` giữ).
  2. Hỏi "phân tích lại", rồi "Kết luận".
- **Mong đợi:**
  - Vai đang giữ bước chạy lại được đội, theo cùng luật với nút "Chạy đội agent" (`conversation_service.py:366-373`).
  - Chính trợ lý gợi ý "Gõ 'phân tích lại' để chạy lại cả đội agent" (`backend/app/services/engine_conversation_responder.py:338`).
- **Thực tế:**
  - Hội thoại chỉ có khách hàng, không có hồ sơ.
  - "phân tích lại" đi route DIRECT, ra văn bản LLM "PHÂN TÍCH LẠI HỒ SƠ…" và không có lượt mới. Người dùng tưởng đã chạy lại.
  - Thanh bên ghi "Khách hàng chưa có hồ sơ nào" dù HSV-2026-00184 tồn tại.
  - Mỗi lần mở trang, `POST /customers/{id}/assignment/claim` trả 409 (console).
- **Ảnh:** `c6-tdinh-2.png`, `c7-tdinh-2.png`.
- **Nghi ngờ:** `frontend/src/services/customerService.ts:32-36` chỉ gắn hồ sơ khi `loan.assigned_employee_id === me` (chỉ QHKH được giao). `frontend/src/pages/ChatPage.tsx:278-283` dùng lại hội thoại cũ của khách đó.

### P01 · Vừa · HTTD, Rủi ro

- **Tái hiện (luồng C):**
  1. `ruiro` "Trả lại Thẩm định" với lý do "Cần bổ sung phân tích rủi ro tập trung ngành…".
  2. Đi lại tới Rủi ro, rồi bấm "Yêu cầu giải trình" với lý do "Giải trình nguồn tiền trả nợ quý 2.".
  3. `httd` mở hồ sơ.
- **Mong đợi:**
  - `request_explanation` bắt buộc lý do (`docs/business/ma-tran-phan-quyen.md:59`).
  - Người nhận thấy đúng nội dung cần giải trình.
- **Thực tế:**
  - Khung `supplement-request` hiện lý do trả lại CŨ "Cần bổ sung phân tích rủi ro tập trung ngành…".
  - Trong DB, mọi bước `RISK_PENDING_INFO` có `reason` rỗng. Lý do chỉ còn trong `audit.audit_event.metadata` (`WORKFLOW_REQUEST_EXPLANATION`).
- **Ảnh:** `fC-httd-explanation.png`.
- **Nghi ngờ:**
  - `infra/database/migrations/V056__step_reason_on_new_step.sql:23` chỉ lưu lý do cho `PENDING_INFO`, `RM_REWORK`, không có `RISK_PENDING_INFO`.
  - `backend/app/services/loan_detail_service.py:154-161` lùi về lý do của bước đóng gần nhất.

### P02 · Vừa · Kiểm toán

- **Tái hiện:** `kiemtoan` mở Nhật ký kiểm toán, lọc "Quyết định hồ sơ" hoặc nhập số `LA-20261112-…`.
- **Mong đợi:** dòng nhật ký của hồ sơ đã quyết định hiện số hồ sơ (Kiểm toán đọc toàn hệ thống, `ma-tran-phan-quyen.md:19`).
- **Thực tế:** mọi hồ sơ `LA-`, kể cả hồ sơ đã phê duyệt hay từ chối, hiện "Nháp chưa đánh số".
- **Ảnh:** `au-la.png`.
- **Nghi ngờ:** `frontend/src/features/audit/AuditLogPage.tsx:91` dùng `/^HSV-/.test(...) ? số : 'Nháp chưa đánh số'`.

### P07 · Vừa · Chat (QHKH)

- **Tái hiện:** `qhkh` chọn Phúc Lâm và hỏi lần lượt:
  1. "Nợ vay/EBITDA của hồ sơ này bao nhiêu?"
  2. "phân tích lại"
  3. "Kết luận của đội agent là gì?"
- **Mong đợi:**
  - Câu 1 cùng giá trị với khung đội agent (`engine_conversation_responder.py:202-207` "để cùng một giá trị với khung đội agent"), hoặc nói rõ là số trước khi cấp.
  - Câu 2 trả về kết quả của lượt mới.
- **Thực tế:**
  - Câu 1: "7,0 lần" (nợ hiện hữu), trong khi đội agent dùng 10,00 lần sau cấp.
  - Câu 2 chạy 47 giây, chỉ trả một dòng "**Trạng thái hồ sơ phân tích:** Cần bổ sung hồ sơ". Phải hỏi thêm câu 3 mới có nội dung.
- **Ảnh:** `c9-qhkh-1.png`, `c9-qhkh-2.png`.
- **Nghi ngờ:**
  - Câu 1 trả lời bằng LLM khi hồ sơ chưa có lượt.
  - Câu 2 do `compose_engine_reply` (`engine_conversation_responder.py:68`) trả rút gọn.

### N07 (còn) · Vừa · Chat (Thẩm định)

- **Tái hiện:** `tdinh` chọn Sông Hàn, hỏi "Điều 4.1 chính sách tín dụng SME yêu cầu gì?".
- **Mong đợi:** câu điều khoản được trả lời (brief: chat trả lời theo loại câu hỏi, có loại điều khoản).
- **Thực tế:**
  - 409 `CUSTOMER_ALREADY_ASSIGNED` "The customer is assigned to another employee or has changed.".
  - Giao diện ghi "Khách hàng này đang do cán bộ khác phụ trách…". Đã tái hiện 3 lần.
- **Ảnh:** `c7-tdinh-1.png`.
- **Nghi ngờ:**
  - `backend/app/services/conversation_service.py:374-390`: route phân tích gọi `assert_can_process` (giữ khách).
  - `backend/app/services/customer_assignment_service.py:117-120` ném lỗi khi khách đã giao cho QHKH.

### P06 · Nhẹ · Mọi vai xem đội agent

- **Tái hiện:**
  - Mở khung đội agent của hồ sơ E, Thành Đạt hoặc Đại Thành.
  - Xác nhận một đề xuất ở cảnh 1.
- **Mong đợi:** không lộ mã kỹ thuật (L07, M10).
- **Thực tế:**
  - `compliance_policy Điều 6` hiện trên trang và trong chat.
  - Thẻ đã xác nhận ghi "validation Đã xác thực 3 kết luận chuyên gia: đều có trích dẫn nguồn valid".
- **Ảnh:** `c1b.png`, `fE-giamdoc-decide-conditional.png`.
- **Nghi ngờ:**
  - `frontend/src/features/agent-actions/ActionProposals.tsx:67` in `<code>{e.source}</code>`.
  - `agent_engine/common/facts.py:87`.

### P05 · Nhẹ · Cấp phê duyệt

- **Tái hiện:** `giamdoc` mở hồ sơ D hoặc Phương Nam Xanh; `pheduyet2` mở Bắc Hà. Đây là các hồ sơ chưa có lượt agent.
- **Mong đợi:** câu báo đúng sự thật, ví dụ "Hồ sơ chưa có lượt chạy đội agent".
- **Thực tế:** "Hồ sơ này trình trước khi có đội agent nên chưa có kết luận AI", kể cả với hồ sơ `LA-20261112-E3D9DABE` tạo hôm nay.
- **Ảnh:** `fD-qhkh-team-panel.png`, `fD-COUNCIL-giamdoc.png`.
- **Nghi ngờ:** chuỗi trong `frontend/src/features/loan-detail/AgentTeamPanel.tsx`; chưa xác định dòng.

### P08 · Nhẹ · QHKH, Rủi ro, Trưởng phòng

- **Tái hiện:** luồng C và luồng D.
- **Mong đợi:** thông báo và lý do khóa nói rõ.
- **Thực tế:**
  - QHKH nhận "Có quyết định: … Hồ sơ bị từ chối." không kèm lý do.
  - Lý do khóa "Trình phê duyệt" là "Thiếu Ý kiến Rủi ro, ý kiến Tuân thủ hoặc kết luận cờ CIC khách tự nộp", không nói thiếu mục nào.
  - Nút "Chuyển" của Trưởng phòng khóa mà không có lý do.
- **Ảnh:** `fC-qhkh-final.png`, `fC-ruiro-blocked-then-return.png`, `fD-reassign.png`.
- **Nghi ngờ:** chưa xác định dòng.

### P09 · Nhẹ · HTTD (cảnh 4)

- **Tái hiện:** cảnh 4. HTTD mở PDF scan Phú Điền và bấm vùng "Vốn điều lệ".
- **Mong đợi:** giá trị tiền đọc được.
- **Thực tế:** "5.000.000.000 dong tỷ đồng".
- **Ảnh:** `c4b.png`.
- **Nghi ngờ:** `fieldValueText` trong `frontend/src/features/reconciliation/DocumentViewer.tsx` ghép đơn vị vào giá trị thô còn chữ "dong".

### Lỗi cũ còn mở

- **M10 (Nhẹ):** 403 tiếng Anh "Action decide requires one of roles…" (`backend/app/workflow/service.py:230`).
- **L17 (Vừa):** điều kiện trùng ý ở cảnh 1.
- **N09 (Nhẹ):** "trùng danh sách danh sách cảnh báo".
- **N12 (Nhẹ):** chữ trên các nút cờ giống nhau.

## Cần xác nhận

1. Phúc Lâm có kết luận chung "Cần bổ sung hồ sơ", nhưng Tín dụng "từ chối" vì Nợ vay/EBITDA 10 > 3,5, và Tuân thủ "chấp thuận có điều kiện". Thiếu dữ liệu có được xếp trên vi phạm ngưỡng cứng không? `rules.md` không nêu thứ tự ưu tiên.
2. VinaNova 80 tỷ được "Đề xuất phê duyệt…" trong khi "Hạn mức bảo đảm đủ điều kiện hiện tại: 0 đồng". Phê duyệt không TSĐB ở mức này có đúng nghiệp vụ không?
3. `POSSIBLE_MATCH` có phải là trúng danh sách (chặn) không (N09).
4. Mekong Flex có KYC "Đã xác minh" ở danh sách khách hàng, nhưng không có dòng `kyc_assessment`. Vì vậy đội agent báo "Chưa có kết quả sàng lọc AML". Đây là dữ liệu seed hay lỗi hiển thị?
5. Nhật ký kiểm toán gợi ý tìm "agent", nhưng mọi dòng đều `actor_type = EMPLOYEE` (6794 dòng). Agent có nên ghi nhật ký riêng không?
6. QHKH không nhận thông báo khi hồ sơ chuyển "Chờ phiên Hội đồng".

## Chưa kiểm tra

- N05 và M07 (mã TSĐB bị định dạng thành tiền): không chạy hồ sơ có TSĐB pháp lý chưa rõ.
- M04, nâng cấp phê duyệt do nhóm liên quan.
- "Trace thô của chuyên gia còn số đã bị phản biện": lần này không đối chiếu từng sự kiện.
- "phân tích lại" qua chat với vai KHÔNG được phép: không gắn được hồ sơ vào chat cho vai ngoài QHKH (P04), nên không đi tới được bước kiểm quyền.
- Thư email thật (worker tắt có chủ ý), phiên Hội đồng đợt 2, benchmark v8 (ngoài phạm vi).
- Độ ổn định khi chạy nhiều lượt trên cùng hồ sơ: chỉ có Phúc Lâm chạy 2 lượt.

## Brief ghi khác thực tế

- "Chat có lúc chạy lại cả đội": không tái hiện. `agent.case_run` không tăng ở 26 câu. Chỉ câu "phân tích lại" của QHKH chạy 1 lượt, và đó là đúng yêu cầu.
- "Cấp phê duyệt thấy danh sách lượt agent rỗng (C-N3)": `giamdoc` thấy kết quả và trace. Danh sách lịch sử chỉ hiện khi có từ 2 lượt (`AgentTeamPanel.tsx:112`).
- `reset-demo.sh` không có `--warm` thì xóa mọi ca gắn hồ sơ demo. Vì vậy sau lệnh reset ở brief, cảnh 1 không còn "lượt trước" như `demo-data.md:15` mô tả.
