# Chấm điểm chức năng lần 6 (13/11/2026)

Giám khảo độc lập (crew `g9`, Opus). Chỉ chấm CHỨC NĂNG, luồng, thông báo, phân quyền, độ rõ của thao tác và nội dung. Không chấm thẩm mỹ. Không sửa code.

**Bản được chấm:**
- HEAD `import/duskdash` `e342061`; container chạy code `735f9a7`.
- DB V068, engine chế độ `llm`.
- Web :3000, API :8000, Keycloak :8080.

**Cách chấm:**
- Playwright trên giao diện thật, đăng nhập từng vai bằng tài khoản ở `frontend/e2e/helpers.ts`. Mỗi luồng chạy trong `flock /tmp/do-an-e2e.lock`.
- Thử API trực tiếp cho các việc không được làm.
- Số liệu đối chiếu bằng SELECT trên `credit.*`, `agent.case_run`, `integration.notification_delivery`.
- Trích dẫn đối chiếu với `agent_engine/rag_corpus`.
- Script và ảnh ở `/tmp/g9/` (ảnh ở `/tmp/g9/shots/`).

**Hồ sơ tự tạo (không đụng hồ sơ seed, ngoài 5 hồ sơ demo):**

| Luồng | Hồ sơ | Số tiền | Nhánh đã đi |
|---|---|---|---|
| A | LA-20261113-E623C9A8 | 25 tỷ | Trưởng phòng chạy đội agent ở Thẩm định; Rủi ro bị khóa "Trình phê duyệt" có lý do; Tuân thủ; cấp 2 |
| A4 | LA-20261113-AB42ACDF | 25 tỷ | Cấp 2 duyệt có điều kiện; 422 ngoại lệ chưa xử lý; 409 xung đột phiên bản |
| B | LA-…-636D3A8A | 2 tỷ | HTTD trả lại, gia hạn, gửi lại, yêu cầu bổ sung, nhận; Thẩm định trả lại; QHKH rút |
| C | LA-…-DAF7C90D | 3 tỷ | Rủi ro trả lại, giữ gian lận, yêu cầu giải trình, Cấp phê duyệt trả lại, Từ chối |
| D | LA-…-5E4C5BE3 | 120 tỷ | Trưởng phòng chuyển người; chờ Hội đồng |
| E | LA-20261113-430C369A | 2 tỷ | Thẩm định chạy đội agent; Giám đốc chi nhánh duyệt có điều kiện cấp 1 |

**Ngân sách LLM:**
- 11/12 lượt đội agent: luồng A 1, E 1, 5 hồ sơ seed, 1 "phân tích lại" trong chat, 3 cảnh demo.
- 15/25 câu chat. Hai câu bị 403 nên không tới LLM.
- Không gặp 402. Chi phí mỗi lượt khoảng 0,0038 USD (7 lần gọi, 14.730 token).

**Email:** worker email tắt có chủ ý. `integration.notification_delivery` chỉ có 2 dòng SENT/EMAIL từ 10/11, không có dòng mới. Thông báo kiểm trong ứng dụng.

**Nhiễu môi trường:**
- Crew khác nạp lại seed hai lần trong lúc chấm (khoảng 07:12 và 07:54). Lần đó xóa liên kết `loan_agent_run` của 5 lượt đội agent trên hồ sơ seed; `agent.case_run` giảm từ 955 xuống 953.
- Vì vậy chat của `ruiro` ở Đại Thành và một câu của `qhkh` trả lời "chưa có số từ đội agent". Không tính là lỗi ứng dụng; ghi ở "Chưa kiểm tra".
- Không gặp lỗi bộ đệm vite "Failed to fetch dynamically imported module".

## Kết luận

**KHÔNG ĐẠT.**

- Không có lỗi Chặn demo hay Cao.
- Ba mục dưới 8,5:
  - Trưởng phòng 8,0;
  - Kiểm toán 8,0;
  - sản phẩm 5 (so sánh single và multi) 8,0.
- Hai vai bị kéo xuống vì cùng một lỗi Vừa (R01): nút "Hỏi trợ lý về HSV-…" có trên danh sách nhưng bấm vào thì API trả 403, không gửi được câu nào.
- Sản phẩm 5 đã trung thực hơn nhiều (đo mù, đăng ký trước, số tự tính lại khớp từng chữ số). Còn ba điểm trừ:
  - nhãn giới hạn sai ở các lượt cũ (R02);
  - chưa nêu rằng lợi thế "đúng cổng" phần lớn đến từ cổng tất định `gate.py`, phần mà single không có;
  - đáp án vẫn lệch luật tổng cấp tín dụng hiện hành.
- 5 cảnh demo chạy hết trong 176 giây, không lỗi.

## Kiểm lại lỗi lần 5

Tự đo lại, không dựa vào báo cáo của crew `fi`, `ul`, `um`, `bm`.

| Mã | Trạng thái | Bằng chứng tự đo |
|---|---|---|
| P06 | **Đã sửa** | Không còn chữ `compliance_policy`. Câu chặn ghi "(tra cứu danh sách đen/trừng phạt; chính sách tuân thủ Điều 6)" (`agent_engine/common/facts.py:86-87`). Điều 6 là điều có thật: `agent_engine/rag_corpus/compliance_policy.md:6` "## Điều 6. Phòng chống rửa tiền (AML)". Thấy trên khung đội agent ở Đại Thành và MekongDX, và trong chat của `pheduyet`. |
| Q01 | **Đã sửa** | MekongDX: "LTV tạm tính 102,6% trên giá khai 78 tỷ; chưa có chứng thư định giá" (80/78 đúng). VinaNova (chat `tdinh`): "giá khai 145 tỷ chưa được xác minh… trần tạm tính 101,5 tỷ", không còn tính LTV trên giá khai như là số chính thức. Cảnh 1 đề xuất "Bổ sung hồ sơ pháp lý và định giá TSĐB để xác định LTV". |
| Q02 | **Đã sửa** | `pheduyet` ở HSV-2026-00167 hỏi khoản 50 tỷ thì được trả lời "Cấp 2 Hội sở" theo §3.1, kèm ghi chú tổng thật là 45 tỷ. Tên cấp lấy từ `_LEVEL_LABEL` (`backend/app/services/engine_conversation_responder.py:40-41,125-128`). |
| Q03 | **Sửa một phần** | Bộ đếm nay ghi đúng "Phản biện: 2 lần, đã xử lý 2". Nhưng cùng trace vẫn có dòng "Validation không phát phản biện nào: các kết luận không mâu thuẫn." Tái hiện ở cảnh 1 VinaNova `case_acd254a2608b` và cảnh 2 Việt Tiến `case_e0ee679bbe55`. Xem Q03 ở danh sách lỗi. |
| Q04 | **Sửa một phần** | Căn cứ trên thẻ đề xuất đã viết thường, gọn: "Thiếu dữ liệu chặn: Chưa có kết quả tra cứu CIC…". Chữ hoa "CẦN BỔ SUNG: thiếu dữ liệu chặn —" còn ở dòng Validation và mục quyết định của trace. Chat "phân tích lại" ghi "Kết luận: CẦN BỔ SUNG/ĐIỀU CHỈNH: …". Phần bỏ nhãn chỉ áp ở `agent_engine/gateway/proposals.py:79`. |
| Q05 | **Đã sửa** | Chuông của HTTD: "Nội dung cần giải trình: Giải trình nguồn tiền trả nợ quý 2..". Còn thừa một dấu chấm (Nhẹ, không lập mã). |
| Q06 | **Đã sửa** | Nút "Ghi quyết định" khóa kèm gợi ý "Cần nhập: lý do quyết định, quyết định và lý do cho từng ngoại lệ chưa xử lý." |
| C-N3 (nghi vấn cũ) | **Đã sửa** | `giamdoc` thấy kết quả đội agent của luồng E, lý do khóa nút "Chỉ QHKH, Thẩm định, Rủi ro, Tuân thủ hoặc Trưởng phòng mới được chạy đội agent". Liên kết dashboard mở được (GET ca 200); ca có trong danh sách trace của `giamdoc`. |
| Nghi vấn "chat chạy lại cả đội" | **Không tái hiện** | Câu hỏi thường được trả lời DIRECT, không tạo `agent.case_run` mới. Chỉ "phân tích lại" tạo ca mới: `qhkh` ở Phúc Lâm, route ORCHESTRATED, +1 ca, 43 giây. |

## Bảng điểm từng vai

| Vai | Lần 5 | Lần 6 | Bằng chứng chính | Trừ điểm vì |
|---|---|---|---|---|
| QHKH (`qhkh`) | 8,5 | **9,0** | Tạo và nộp hồ sơ; rút; gửi lại sau khi rút bị 403 tiếng Việt. Chạy đội agent ở Nháp (MekongDX), Trả về QHKH (Phúc Lâm), Thẩm định chờ bổ sung (Phú Điền), đúng quyết định 11/11. Chuông nhận quyết định có điều kiện, từ chối, giải trình, đều kèm lý do. Cảnh 4 tải bản chụp 3 giây. | Cần xác nhận 6 (không trừ). |
| Hỗ trợ tín dụng (`httd`) | 8,5 | **9,0** | Luồng B: trả lại, gia hạn, gửi lại, yêu cầu bổ sung, nhận. Thấy lý do "Yêu cầu giải trình" (đã chốt b). Cảnh 4: 4 vùng sau 10 giây, thẻ trường "Vốn điều lệ 5 tỷ đồng · AI đề xuất · Nguồn trích… · Độ tin cậy 80% · Tôi đã đối chiếu, xác nhận giá trị". | Thông báo thừa dấu chấm "quý 2.."; câu "Hạn bổ sung… Tải tài liệu bổ sung" trên khung giải trình chưa khớp loại yêu cầu. |
| Thẩm định (`tdinh`, `appraiser2`) | 8,5 | **8,5** | Luồng E chạy đội agent 36,8 giây, Needs Info. Trả lại QHKH ở luồng B. Cảnh 1–3 đúng kết luận. Chat VinaNova đúng LTV, Điều 4.1, từ chối câu thời tiết. | R03: chat cấp phê duyệt gợi ý "có thể thuộc Hội đồng". Q03, Q04 trên trace. |
| Rủi ro (`ruiro`) | 8,5 | **8,5** | Luồng C: trả lại, đồng ý. "Trình phê duyệt" khóa kèm lý do ở luồng A. Xem và chạy lại đội agent ở luồng E. Đại Thành: EBITDA 2025 −22 tỷ đúng DB. | Q03, Q04. Câu "vi phạm điều khoản nào" không nêu EBITDA âm (do seed bị nạp lại, xem Chưa kiểm tra). |
| Tuân thủ (`tuanthu`) | 8,5 | **9,0** | Đủ 4 nút đúng ma trận (`ma-tran-phan-quyen.md:55-70`): Yêu cầu giải trình, Giữ hồ sơ nghi gian lận, Gỡ giữ, Trả lại Thẩm định. Khung đội agent chỉ đọc với lý do "vai trò của bạn không được chạy đội agent ở bước này" (đã chốt e). Giữ gian lận thì các vai khác mất nút, API 403. | Cần xác nhận 3 (không trừ). |
| Cấp phê duyệt cấp 1 (`giamdoc`) | 8,5 | **9,0** | Luồng E: duyệt có điều kiện, 11 ngoại lệ được duyệt, bước xác nhận "Không hoàn tác được". QHKH nhận thông báo có lý do; điều kiện trước giải ngân hiện đúng. Luồng C: trả lại bổ sung, Từ chối. C-N3 đã sửa. | Chưa kiểm chat của `giamdoc` (Chưa kiểm tra). |
| Cấp phê duyệt cấp 2 (`pheduyet`, `pheduyet2`) | 8,5 | **9,0** | Luồng A4: duyệt có điều kiện; 422 `EXCEPTIONS_UNDECIDED` và 409 `VERSION_CONFLICT` hiện tiếng Việt. Cảnh 5: modal, xác nhận, "Đã phê duyệt", nút Quyết định biến mất. Chat đúng thẩm quyền (Q02); "phân tích lại" bị 403 có lý do (đã chốt d). | – |
| Trưởng phòng (`credit.manager`) | 9,0 | **8,0** | "Hồ sơ của phòng" có 20 hồ sơ với bộ lọc Quá hạn / Bị trả lại / Chờ bổ sung / Mới. Tìm kiếm thanh trên được. Chạy đội agent ở luồng A (39 giây). Luồng D: chuyển người, có gợi ý "Chọn người nhận để bật nút Chuyển"; người nhận được thông báo; người cũ thấy "Hồ sơ đã chuyển cho người khác". | **R01** (Vừa): nút "Hỏi trợ lý về HSV-2026-00176" có trên danh sách nhưng bấm vào là 403, không gửi được câu nào. |
| Kiểm toán (`kiemtoan`) | 8,5 | **8,0** | Nhật ký 7.847 dòng; lọc theo số hồ sơ, hành động, người, ngày đều chạy. Ghi nhật ký và chạy agent bị 403 (`AGENT_RUN_NOT_ALLOWED`, thông báo tiếng Việt). Tìm hồ sơ, khách hàng, CIF được. | **R01** (Vừa): "Hỏi trợ lý về HSV-2026-00187" bị 403. Cần xác nhận 5 (không trừ). |
| Quản trị (`quantri`) | 9,0 | **9,0** | `/quan-tri` chỉ đọc: bảng người dùng, tên vai tiếng Việt. Mở hồ sơ thì hiện "Bạn không có quyền xem nội dung này…". Tìm VinaNova ra "Không có kết quả". Đổi vai demo: 11 tài khoản, có băng "Chế độ demo · Đang demo với vai Trưởng phòng…" và nút "Quay về Quản trị"; nhật ký ghi "Quản trị đổi sang vai demo". API nghiệp vụ trả `MISSING_PERMISSION`. | – |

Mọi lần thử sai vai trên giao diện và API đều nhận 403 hoặc 404 có câu tiếng Việt. Không thấy mã thô `LA-` ở hồ sơ đã nộp (đã chốt c) và không thấy UUID.

## Bảng 5 sản phẩm của đề bài

| # | Sản phẩm | Lần 5 | Lần 6 | Bằng chứng | Còn thiếu |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 8,5 | **8,5** | Mỗi lượt có Credit, Compliance, Operations (Document khi có tệp), rồi Validation. Kết luận khác nhau đúng chuyên môn. Trường An: Compliance "Từ chối" vì LTV 214,3% (60/28; trần 19,6 tỷ), Validation tổng hợp "Cần bổ sung", đề xuất `request_documents` và `add_risk_flag`. Validation phản biện 2 lần ở VinaNova. | Q03: trace vừa đếm "Phản biện: 2 lần" vừa ghi "không phát phản biện nào". |
| 2 | Planner giao việc cho executor | 9,0 | **9,0** | Trace v6: "Planner giao việc" kèm văn bản kế hoạch, các dòng "Planner → Credit/Compliance/Operations/Validation giao việc", Validation chạy sau ba chuyên gia. Ảnh `v6-c1-trace.png`, `v6-c2-trace.png`. | – |
| 3 | Agent gọi công cụ và hành động thật | 8,5 | **9,0** | Bảng "Công cụ: agent nào đã gọi (14)" đánh dấu "Agent tự gọi"; "Bảng chung… agent tự chọn". Số đúng DB ở 5 hồ sơ seed (bảng dưới). Cảnh 1: `add_disbursement_condition` thành CONFIRMED sau 4 giây xác nhận. Thẻ đề xuất tách "Điều kiện tiên quyết" và "Điều kiện trước giải ngân". P06 và Q01 đã sửa. | – |
| 4 | Dashboard trace, trạng thái, quyết định | 8,5 | **8,5** | Có "Validation kiểm chứng" với số tính lại, "Quyết định của người duyệt và hành động thật", "Hành động đề xuất và xác nhận", chi phí LLM từng lượt. Cấp phê duyệt xem được lượt chạy (C-N3 đã sửa). | Q03 tự mâu thuẫn; Q04 chữ hoa. Tổng quan tính cả lượt e2e ("379 trên 950 lượt có kết luận, 39,9%"), làm tỷ lệ trông thấp. |
| 5 | So sánh single và multi | 8,0 | **8,0** | v8 đo mù trên bản khóa `735f9a7`, 10 ca × 3 lần × 2 chế độ. Tự tính lại từ tệp thô khớp §15.2 và tab So sánh (bảng dưới). Single không bị làm yếu. Đáp án đăng ký trước khi đo. Các ca multi không hơn được nêu (§15.4). 51 lượt cũ đều chọn xem được; v1 vẫn hiện thật là multi thấp hơn (35,3% so với 72,6%). | R02: nhãn "10 ca, 3 lần mỗi ca" hiện cả ở lượt 8 ca và 5 ca. Không nêu rằng lợi thế đúng cổng (30/30 so với 18/30) phần lớn do cổng tất định `gate.py`. Đáp án `total_exposure`/`audit_required` lệch luật hiện hành nên dòng (a) chỉ 0,707. Dòng (b) định nghĩa sau khi thấy số. |

**Đội agent trên hồ sơ seed** (lượt `ag`, 07:36; đối chiếu `credit.*`):

| Hồ sơ | Người chạy, bước | Kết quả | Số đối chiếu DB | Cấp |
|---|---|---|---|---|
| Đại Thành 80 tỷ | `ruiro`, Rủi ro | Needs Info, 47 s | EBITDA 2025 −22 tỷ; chưa có KYC, CIC | Cấp 2 |
| Trường An 60 tỷ | `tdinh`, Thẩm định | Needs Info, 50 s | TSĐB đủ điều kiện 28 tỷ, LTV 214,3% so với 70%, tối đa 19,6 tỷ | Cấp 2 |
| Phú Điền 30 tỷ | `qhkh`, Thẩm định chờ bổ sung | Rejected | KYC `POSSIBLE_MATCH/HIGH`; Nợ vay/EBITDA (30+30)/20 = 3,0 | Cấp 2 |
| Phúc Lâm 15 tỷ | `qhkh`, Trả về QHKH | Needs Info | Nợ vay/EBITDA (35+15)/5 = 10,0 so với 3,5 | Cấp 1 Giám đốc chi nhánh |
| MekongDX 80 tỷ | `qhkh`, Nháp | Needs Info, AML chưa sàng lọc | LTV 102,6% trên giá khai 78 tỷ | Cấp 2 |
| VinaNova 80 tỷ (cảnh 1) | `tdinh` | Pending Approval | Dư nợ TCTD khác 98 tỷ; DSCR 1,34; cần BCTC kiểm toán (đã chốt a) | Cấp 2 |
| Việt Tiến (cảnh 2) | `tdinh` | Needs Info | `request_documents` | – |
| Sông Hàn (cảnh 3) | `tdinh` | Rejected | CIC nhóm 3 | – |
| Luồng A, E (tự tạo) | `credit.manager`, `tdinh` | Needs Info | – | – |

Tổng cộng 10 hồ sơ khác nhau. Mọi lượt có đề xuất ở trạng thái PROPOSED, không lộ mã thô. Trích dẫn §3.1, §4.1, §6.1 và Điều 6 đều có trong `rag_corpus`.

**Benchmark v8: tự tính lại** từ `agent_engine/benchmark_results/20261112T220826Z-v8 mù trên bản khóa 735f9a7.json` (30 lượt mỗi chế độ, 0 lỗi):

| Chỉ số | Single tự tính | Multi tự tính | §15.2 | Tab So sánh |
|---|---|---|---|---|
| (a) độ phủ, đáp án nguyên vẹn | 0,520 ± 0,152 | 0,707 ± 0,157 | khớp | khớp |
| (b) độ phủ, bỏ `total_exposure`/`audit_required` | 0,675 | 0,983 | khớp | khớp |
| Trích nguồn | 0,883 | 0,942 | khớp | khớp |
| Chính xác trích dẫn | 0,895 | 0,980 | khớp | khớp |
| Phát hiện sai | 1 lượt | 0 | khớp | khớp |
| Đúng cổng | 18/30 | 30/30 | khớp | khớp |
| Trễ | 42,0 s | 38,0 s | khớp | khớp |
| $/ca | 0,00244 | 0,00348 | khớp | khớp |

**Kiểm tính trung thực:**
- **Bản đo.** Tệp ghi `git_commit b505ad2`; diff engine/backend `735f9a7..b505ad2` rỗng.
- **Single không bị làm yếu.** `agent_engine/scripts/benchmark/single_agent_runner.py` sửa lần cuối ở `dd3da5c` (07/11), trước v8. Dùng cùng mô hình, công cụ, RAG và checklist; chỉ không có Planner, Validation và cổng.
- **Đáp án không bị sửa sau khi đo.** `git log` của `agent_engine/scripts/benchmark/cases_v8.json` chỉ có `9ff9ebb 2026-11-10 21:24 "Đăng ký trước bộ đo mù v8 (10 ca, 48 phát hiện), chưa đo"`.
- **Giới hạn và ca không hơn đã nêu.** §15.4 nêu các ca multi không hơn: recall bằng nhau ở J2, J6, J7; trích nguồn thấp hơn ở J1, J2; đắt hơn ở cả 10 ca, trung bình +43%. §15.6 nêu 10 ca, chấm regex, dòng (b) định nghĩa sau.
- **Chưa nêu ở §15.6 hay trên tab.** "Đúng cổng" của multi đến từ cổng tất định `gate.py`, mà §8.1 tự ghi là "hiệu chỉnh offline trên các ca v2-v5". Single chọn NEEDS_INFO ở 27/30 lượt. Giám khảo sẽ hỏi lợi thế này là của "nhiều agent" hay của "một luật tất định".

**Câu hỏi khó giám khảo có thể hỏi:**

| Câu hỏi | Hệ thống trả lời được tới đâu |
|---|---|
| "Agent tự chọn công cụ hay bị code ép gọi?" | Trace ghi "Agent tự gọi" từng lần (14 lần mỗi lượt), bảng chung "agent tự chọn". Trả lời được. |
| "Hai chuyên gia ra kết luận khác nhau thì sao?" | Trường An: Compliance "Từ chối", Validation tổng hợp "Cần bổ sung" kèm lý do. Nhưng trace vừa đếm 2 phản biện vừa ghi "không phát phản biện nào" (Q03); giám khảo dễ bắt. |
| "AI có tự phê duyệt không?" | Không. Đề xuất ở PROPOSED, người xác nhận ghi lý do. Quyết định ở modal của Cấp phê duyệt có bước "Không hoàn tác được" và nhật ký kiểm toán. Trả lời tốt. |
| "VinaNova ai duyệt?" | Khung đội agent: Cấp 2 Hội sở. Chat của `tdinh` cũng ra Cấp 2 nhưng thêm "nếu cộng 98 tỷ TCTD khác thì vượt 100 tỷ… thuộc Hội đồng, cần xác nhận cách tính" (R03), trái `rules.md` Q4. |
| "LTV khi TSĐB chưa định giá?" | Ghi "tạm tính trên giá khai, chưa có chứng thư"; đề xuất bổ sung định giá. Trả lời được. |
| "Bằng chứng multi tốt hơn single?" | Có đo mù đăng ký trước, số khớp tệp thô. Nhưng nếu hỏi "đúng cổng 30/30 có phải nhờ luật tất định?" thì tài liệu chưa nói thẳng; mẫu 10 ca. |
| "Câu ngoài phạm vi?" | Câu thời tiết bị từ chối (REFUSE), có gợi ý câu hỏi hợp lệ. Trả lời tốt. |
| "Kiểm toán/Trưởng phòng hỏi trợ lý về hồ sơ được không?" | Không: 403 (R01). |
| "Chi phí mỗi lượt?" | Trace ghi 7 lần gọi LLM, 14.730 token, 0,0038 USD. Trả lời được. |

## Chat

15 câu đã gửi; 13 câu được LLM trả lời, 2 câu bị 403 (R01).

| Vai, hồ sơ | Câu | Kết quả |
|---|---|---|
| `tdinh`, VinaNova | LTV | Đúng (Q01 đã sửa) |
| `tdinh`, VinaNova | Kết luận | Cấp 2, DSCR 1,34, 98 tỷ ở TCTD khác, BCTC là điều kiện tiên quyết |
| `tdinh`, VinaNova | Điều 4.1 | Đúng, dẫn §4.1 và §6.1 |
| `tdinh`, VinaNova | Thời tiết | REFUSE, có gợi ý |
| `tdinh`, VinaNova | Cấp phê duyệt | Cấp 2, kèm câu gợi ý Hội đồng (R03) |
| `pheduyet`, HSV-167 | Khoản 50 tỷ ai duyệt | Cấp 2 Hội sở (Q02 đã sửa) |
| `pheduyet`, HSV-167 | Kết luận | Đầy đủ, dùng lại kết quả (DIRECT) |
| `pheduyet`, HSV-167 | Phân tích lại | 403, giao diện ghi "Chỉ Quan hệ khách hàng, … mới được chạy đội agent." (đã chốt d) |
| `ruiro`, Đại Thành | 2 câu | Thiếu dữ kiện vì seed bị nạp lại giữa chừng |
| `qhkh`, Phúc Lâm | Nợ vay/EBITDA | 7,0 lần trước khoản vay (35/5), đúng |
| `qhkh`, Phúc Lâm | Phân tích lại | ORCHESTRATED, 43 s, 10 lần, Cấp 1 |
| `kiemtoan`, HSV-187 | – | 403 (R01) |
| `credit.manager`, HSV-176 | – | 403 (R01) |

## 5 cảnh demo

Chạy theo `docs/agent/demo-data.md` sau `reset-demo.sh`. Trước và sau đều rc=0: "ca agent gan ho so: 0, thong bao: 138, outbox cho gui: 0, benchmark_run: 51".

| Cảnh | Vai | Kết quả | Thời gian | Chỗ vấp |
|---|---|---|---|---|
| 1. VinaNova HSV-2026-00187 | `tdinh` | Pending Approval; `add_disbursement_condition` xác nhận thành CONFIRMED | 53 s + 4 s | Trace có Q03 và Q04. Ảnh `d1-c1.png`, `d1-c1-trace.png`, `d1-c1-confirm.png`. |
| 2. Việt Tiến HSV-2026-00223 | `tdinh` | Needs Info, `request_documents` | 41 s | Q03. Ảnh `d1-c2.png`. |
| 3. Sông Hàn HSV-2026-00184 | `tdinh` | Rejected, CIC nhóm 3 | 41 s | – Ảnh `d1-c3.png`. |
| 4. Phú Điền HSV-2026-00196 | `qhkh` tải, `httd` xem | Tải xong 3 s (202); 4 vùng sau 10 s; bấm vùng mới hiện thẻ trường | 10 s | Người trình bày phải biết bấm vào vùng thì thẻ trường mới hiện. Ảnh `d1-c4.png`. |
| 5. Thành Đạt HSV-2026-00163 | `pheduyet` | Modal, xác nhận "Không hoàn tác được", "Đã phê duyệt" | 10 s | Khung không có lượt đội agent sẵn vì không reset `--warm`. Buổi demo nên chạy `--warm`. Ảnh `d1-c5.png`. |

Tổng 176 giây; riêng cảnh 1–3 là 156 giây. Không có lỗi.

## Danh sách lỗi

Không có lỗi Chặn demo hay Cao. Có 2 lỗi Vừa (R01, R03) và 3 lỗi Nhẹ (Q03, Q04, R02).

### R01 · Vừa · Kiểm toán, Trưởng phòng

- **Tái hiện:**
  - `kiemtoan` mở "Việc của tôi", bấm biểu tượng "Hỏi trợ lý về HSV-2026-00187".
  - Hoặc `credit.manager` ở "Hồ sơ của phòng" bấm "Hỏi trợ lý về HSV-2026-00176".
- **Mong đợi:**
  - `ma-tran-phan-quyen.md:226`: chat "Người đăng nhập, mỗi người chỉ thấy phiên của mình".
  - Đã chốt (d): người không giữ hồ sơ hỏi câu phân tích thì được trả lời chỉ đọc từ kết quả đã có.
  - Ít nhất không nên đưa nút cho người sẽ bị chặn.
- **Thực tế:** `POST /api/v1/conversations` trả 403. Khung chat hiện "Vai trò của bạn không có quyền thực hiện thao tác này." và không gửi được câu nào.
- **Ảnh:** `/tmp/g9/shots/ch6-kiemtoan-1.png`, `/tmp/g9/shots/ch7-truongphong-1.png`.
- **Nghi ngờ:**
  - `ConversationService.create` (`backend/app/services/conversation_service.py:196-216`) gọi `authorize()` (`backend/app/runtime_adapters.py:90-96`), hàm này dùng `identity.can_access_loan`.
  - Hàm đó chỉ xét người được giao, quan hệ khách hàng, người giữ bước và `employee_scope` LOAN_APPLICATION; thiếu phạm vi đọc của kiểm toán và phạm vi phòng của trưởng phòng.
  - Nút hiện theo `hasAi` ở `frontend/src/features/my-work/QueueTable.tsx:116-124`, không xét quyền này.

### R03 · Vừa · Thẩm định (chat)

- **Tái hiện:** `tdinh` ở VinaNova HSV-2026-00187 hỏi "Hồ sơ này cần phê duyệt ở cấp nào".
- **Mong đợi:** `docs/business/rules.md` Q4 (dòng 16) và dòng 38: tổng cấp = dư nợ tại ngân hàng + đề xuất mới, không cộng dư nợ TCTD khác; VinaNova là Cấp 2.
- **Thực tế:** trả lời Cấp 2 Hội sở theo §3.1, nhưng thêm "nếu cộng 98 tỷ TCTD khác thì vượt 100 tỷ… thuộc Hội đồng, cần xác nhận cách tính". Câu này gieo nghi ngờ trái với luật đã chốt; người trình có thể đẩy sai lên Hội đồng.
- **Ảnh:** `/tmp/g9/shots/ch6-tdinh-*.png` (câu thứ 5).
- **Nghi ngờ:** lời dặn cho loại câu `authority` ở `backend/app/services/engine_conversation_responder.py:158` không cấm cộng dư nợ TCTD khác. Ngữ cảnh đưa cho LLM có cả số 98 tỷ nên mô hình tự suy. Chưa tìm được dòng gây ra chính xác.

### Q03 (sửa một phần) · Nhẹ · Mọi vai xem trace

- **Tái hiện:** mở trace cảnh 1 (`case_acd254a2608b`) hoặc cảnh 2 (`case_e0ee679bbe55`).
- **Mong đợi:** một trace không tự mâu thuẫn (Q03 lần 5).
- **Thực tế:** cùng màn hình có "Phản biện: 2 lần, đã xử lý 2." và "Validation không phát phản biện nào: các kết luận không mâu thuẫn."
- **Ảnh:** `/tmp/g9/shots/v6-c1-trace.png`, `/tmp/g9/shots/v6-c2-trace.png`.
- **Nghi ngờ:**
  - `frontend/src/features/dashboard/components/CaseTrace.tsx:221-222` chỉ xét `flow` có `kind === 'challenge'`, tức phản biện giữa các kết luận.
  - `CaseTrace.tsx:284` đếm `validation.challenges`, gồm cả phản biện số liệu.

### Q04 (sửa một phần) · Nhẹ · Mọi vai xem trace và chat

- **Tái hiện:** mở trace cảnh 2, xem dòng Validation và mục quyết định. Hoặc gõ "phân tích lại" trong chat.
- **Mong đợi:** căn cứ viết như người, không nhãn cổng viết hoa (Q04 lần 5).
- **Thực tế:** "CẦN BỔ SUNG: thiếu dữ liệu chặn — …" và "Kết luận: CẦN BỔ SUNG/ĐIỀU CHỈNH: …". Thẻ đề xuất thì đã sạch. Câu Validation còn dạng "Thiếu dữ liệu chặn, Chưa có…" (dấu phẩy rồi viết hoa).
- **Ảnh:** `/tmp/g9/shots/v6-c2-trace.png`, `/tmp/g9/shots/ch6-qhkh-2.png`.
- **Nghi ngờ:** chuỗi sinh ở `agent_engine/common/gate.py:28,30` và `agent_engine/agents/validation_agent.py:227,230`. Chỉ `agent_engine/gateway/proposals.py:79` bỏ nhãn.

### R02 · Nhẹ · Mọi vai xem tab So sánh

- **Tái hiện:** dashboard, tab So sánh, chọn một lượt v7 (8 ca) hoặc v1 (5 ca).
- **Mong đợi:** nhãn giới hạn đúng với lượt đang xem (đề bài: so sánh trung thực; §15.6 riêng cho v8).
- **Thực tế:** mọi lượt đều hiện "Giới hạn: bộ ca nhỏ (10 ca, 3 lần mỗi ca)…".
- **Ảnh:** `/tmp/g9/shots/cmp-old-0.png`, `/tmp/g9/shots/cmp-old-1.png`.
- **Nghi ngờ:** hằng `LIMIT_NOTE` ở `frontend/src/features/dashboard/blindRuns.ts:24-25`, hiện cố định ở `ComparisonTab.tsx:363`.

## Cần xác nhận

Bảy mục lần 5 chưa có trả lời của captain. Giữ nguyên, không tính lỗi, không trừ điểm:

1. **Phúc Lâm kết luận mâu thuẫn.** Không tái hiện: chat "phân tích lại" và khung đều Needs Info, 10 lần.
2. **VinaNova đề xuất khi TSĐB chưa định giá.** Nay ghi "tạm tính trên giá khai" và yêu cầu định giá; cảnh 1 vẫn ra Pending Approval kèm điều kiện.
3. **`POSSIBLE_MATCH` tính là trúng.** Còn: Phú Điền `POSSIBLE_MATCH/HIGH` bị Rejected; Compliance ghi "trùng danh sách cảnh báo".
4. **Khách không có `kyc_assessment` hiện "Đã xác minh".** Chưa đo lại lần này.
5. **Nhật ký kiểm toán lọc người thực hiện "agent" ra 0 dòng.** Chưa đo lại.
6. **QHKH không nhận thông báo khi hồ sơ chờ Hội đồng.** Còn (luồng D).
7. **QHKH xem được hồ sơ của mình ở mọi bước.** Còn, đúng `assigned_employee_id`.

Mới:

8. **Kiểm toán có được chat có ngữ cảnh hồ sơ không.** Đây là nửa nghiệp vụ của R01: ma trận dòng 226 cho mọi người đăng nhập chat, nhưng không nói rõ chat gắn hồ sơ cho vai chỉ đọc. Nửa Trưởng phòng ghi là lỗi vì Trưởng phòng được chạy đội agent trên hồ sơ của phòng.
9. **Tổng quan dashboard gộp lượt e2e và lượt thật** ("379 trên 950 lượt có kết luận"). Có nên lọc lượt thử không.
10. **Dữ liệu khách Mekong Flex hiện "402 hồ sơ vay"**, do e2e làm bẩn. Là dữ liệu, không phải code.

## Chưa kiểm tra

- **Bản thô "Xem đầy đủ" của từng chuyên gia.** Chưa mở nên nghi vấn "trace thô còn số đã bị phản biện" chưa xác minh được.
- **Chat của `giamdoc`.** Không đủ ngân sách chat sau khi dành cho các vai khác.
- **Câu "vi phạm điều khoản nào" của `ruiro` ở Đại Thành khi có kết quả đội agent.** Lần thử bị seed nạp lại xóa liên kết lượt chạy (07:54).
- **Chuyển cấp theo nhóm khách hàng liên quan (M04).** Seed không có nhóm liên quan rõ.
- **Email thật.** Worker tắt có chủ ý; chỉ SELECT `integration.notification_delivery`.
- **Cần xác nhận 4 và 5.** Chưa đo lại.
- **Benchmark.** Ngoài phạm vi, không chạy lại; chỉ kiểm tệp thô.

## Để mọi vai và sản phẩm lên 8,5 còn thiếu gì

**Trưởng phòng (8,0) và Kiểm toán (8,0):**
- Sửa R01:
  - Trưởng phòng mở chat gắn hồ sơ trong phòng mình, trả lời chỉ đọc theo (d).
  - Kiểm toán: chờ Cần xác nhận 8. Nếu không cho chat thì ẩn nút "Hỏi trợ lý về …" và ghi lý do, thay vì để 403.
- Phép kiểm cần có: e2e mở chat từ "Việc của tôi" và "Hồ sơ của phòng" cho cả hai vai, gửi được một câu.

**Sản phẩm 5 – So sánh single và multi (8,0):**
- Ghi thẳng ở §15.6 và cạnh kết luận trên tab:
  - "đúng cổng" của multi dựa vào cổng tất định `gate.py` hiệu chỉnh trên v2–v5;
  - single không có cổng này.
  - Tốt hơn nữa: đưa số ablation multi không cổng (§8.1) để giám khảo thấy phần đóng góp của nhiều agent.
- Sửa R02: nhãn giới hạn theo số ca và số lần của lượt đang xem.
- Đăng ký đáp án mới cho `total_exposure`/`audit_required` theo luật tổng cấp hiện hành (§14) cho lần đo sau. Không sửa v8 đã đo.
- Thêm các ca biên đã gặp khi chấm:
  - TSĐB chưa định giá (VinaNova, MekongDX);
  - `POSSIBLE_MATCH` (Phú Điền);
  - dư nợ CIC khác BCTC;
  - thiếu toàn bộ dữ liệu (Đại Thành).

**Để các vai và sản phẩm 1, 4 vững hơn ngưỡng (không bắt buộc để ĐẠT):**
- Q03: bỏ dòng "không phát phản biện nào" khi `validation.challenges > 0`.
- Q04: bỏ nhãn cổng viết hoa ở trace và chat.
- R03: chat cấp phê duyệt không cộng dư nợ TCTD khác.
- Lọc lượt e2e khỏi tổng quan (Cần xác nhận 9).

## Brief ghi khác thực tế

- Brief có đoạn "Đây là LẦN CHẤM 3"; thực tế đây là lần 6 (mục 5 của Build).
- Nghi vấn C-N3 (Cấp phê duyệt thấy danh sách lượt agent rỗng) không còn: đã sửa.
- Nghi vấn "chat có lúc chạy lại cả đội" không tái hiện.
