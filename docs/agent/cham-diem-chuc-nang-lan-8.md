# Chấm điểm chức năng lần 8 (13/11/2026)

Giám khảo độc lập (crew `gb`, Opus). Chỉ chấm CHỨC NĂNG, luồng, thông báo, phân quyền, độ rõ của thao tác và nội dung. Không chấm thẩm mỹ. Không sửa code.

**Bản được chấm:**
- HEAD `import/duskdash` `2b0abad` lúc chấm. Trong lúc chấm nhánh lên `912678b`, chỉ thêm `docs/design/cham-diem-ung-dung-lan-8.md`, không ảnh hưởng chức năng.
- Container API khởi động 04:55 UTC, sau commit backend cuối `beeed31`. Container engine khởi động 12/11 20:36 UTC.
- DB V070, engine chế độ `llm`.
- Web :3000 chạy từ checkout chính, API :8000, Keycloak :8080.
- `git diff --stat 735f9a7..HEAD -- agent_engine`: 1 tệp kết quả benchmark, 6407 dòng thêm. Engine không đổi sau lần đo v8.

**Cách chấm:**
- Playwright trên giao diện thật, đăng nhập từng vai bằng tài khoản ở `frontend/e2e/helpers.ts`. Mỗi luồng nhiều bước chạy trong `flock /tmp/do-an-e2e.lock`.
- Thử API trực tiếp cho các việc không được làm.
- Số liệu đối chiếu bằng SELECT chỉ đọc (`default_transaction_read_only=on`) trên `credit.*`, `customer.*`, `banking.*`, `agent.*`, `integration.notification*`, `audit.audit_event`.
- Trích dẫn đối chiếu với `agent_engine/rag_corpus`.
- Script ở `/tmp/gb/specs/`, nhật ký `/tmp/gb/*.jsonl`, ảnh ở `/tmp/gb/shots/`.

**Hồ sơ tự tạo (không đụng hồ sơ seed, ngoài 5 hồ sơ demo):**

| Luồng | Hồ sơ | Số tiền | Nhánh đã đi |
|---|---|---|---|
| A | LA-20261113-88D92679 | 25 tỷ | Thử vai sai từng bước (UI và API); Trưởng phòng chạy đội agent ở Thẩm định; Rủi ro bị khóa "Trình phê duyệt" có lý do; Tuân thủ; cấp 2 duyệt có điều kiện sau 11 ngoại lệ; 422 ngoại lệ chưa xử lý; 409 xung đột phiên bản |
| B | LA-20261113-643BA625 | 2 tỷ | HTTD trả lại; QHKH gia hạn bổ sung; gửi lại; Thẩm định yêu cầu bổ sung; HTTD nhận; Thẩm định trả lại; QHKH rút; gửi lại sau khi rút bị 403 |
| C | LA-20261113-24F4B654 | 3 tỷ | Rủi ro trả lại; giữ gian lận rồi gỡ; yêu cầu giải trình; Giám đốc trả về bổ sung; Từ chối có bước xác nhận |
| D | LA-20261113-430959AF | 120 tỷ | Trưởng phòng chuyển người có lý do; chờ Hội đồng; mọi vai thử quyết định đều bị 403/404 |
| E | LA-20261113-F9E3C7E3 | 2 tỷ | Thẩm định chạy đội agent; Rủi ro, Tuân thủ, Giám đốc xem kết quả; Giám đốc duyệt có điều kiện cấp 1 |
| Nháp | LA-20261113-A85E6BC4 | 8 tỷ | QHKH chạy đội agent ở Nháp (quyết định 11/11/2026) |

**Ngân sách LLM (đúng giới hạn):**
- 8/8 lượt đội agent:
  - Đại Thành 176 (`ruiro`);
  - một "phân tích lại" trong chat (Phúc Lâm 201, `qhkh`);
  - cảnh demo 1, 2, 3;
  - luồng E (`tdinh`), luồng A (`truongphong`);
  - Nháp Mekong Flex (`qhkh`).
- 14/20 câu chat đã gửi. Một câu bị 403 (Kiểm toán "phân tích lại") và một câu bị từ chối ngoài phạm vi (0,23 s), nên 12 câu tới LLM.
- Không gặp 402.
- Chi phí một lượt khoảng 0,004 USD (cảnh 1: 7 lượt gọi, 14.735 token, 0,0038 USD; cảnh 3: 8 lượt, 15.744 token, 0,0050 USD).

**Email:** worker tắt có chủ ý. `integration.notification_delivery` vẫn chỉ có 2 dòng SENT, không có dòng mới. Thông báo kiểm trong ứng dụng (59 thông báo mới trong 2 giờ chấm).

**Nhiễu môi trường:**
- 07:00:44 UTC (14:00 giờ VN), giữa hai lần tôi giữ khóa, một crew khác ghi `WORKFLOW_DECIDE` lên HSV-2026-00187 (actor `…0005`), đưa hồ sơ demo cảnh 1 tới "Đã phê duyệt". Không phải tôi; không tính là lỗi ứng dụng.
- Có lúc 12 tiến trình Playwright khác đang chạy cùng DB.
- Đã chạy `reset-demo.sh` hai lần: trước khi demo và sau khi chấm xong (rc=0, "ho so khong LA-: 65, ho so LA- con nguoi vay: 0, ca agent gan ho so: 0, thong bao: 138, outbox cho gui: 0, benchmark_run: 51").
- Không gặp lỗi bộ đệm vite.

## Kết luận

**ĐẠT** theo tiêu chí ở mục 4 của Build, sát ngưỡng.
- Mọi vai đều từ 8,5 trở lên. Rủi ro lên 9,0 vì S02 đã sửa.
- Mọi sản phẩm từ 8,5 trở lên. Sản phẩm 1 (2–3 chuyên gia phối hợp) xuống 9,0 → 8,5 vì S09; sản phẩm 4 và 5 giữ 8,5.
- Không có lỗi mức Chặn demo hay Cao.
- Rủi ro lớn nhất cho buổi demo: lỗi **Vừa** S09. Cảnh 1 có hai con số Nợ vay/EBITDA khác nhau (Credit 1,39 lần, Validation tính lại 1,82 lần) nhưng trace ghi "Phản biện: 0 lần". Chat nhắc lại 1,39 và nói "không nêu ngưỡng". Đây đúng là câu giám khảo cuộc thi sẽ hỏi ("hai chuyên gia mâu thuẫn số thì sao?"). Khi trình bày nên dẫn cảnh 2 (Việt Tiến, "Phản biện 1 lần, đã xử lý 1").
- Lỗi Nhẹ còn: S05 và Q04 (sửa một phần), S07, S08, S10.

## Kiểm lại lỗi lần 7

| Mã lần 7 | Mức | Trạng thái lần 8 | Bằng chứng tự đo |
|---|---|---|---|
| S01 (cấp phê duyệt, Tuân thủ thấy hồ sơ ngoài phạm vi) | Vừa | **Đã sửa** | `k1.spec`: `pheduyet`, `pheduyet2` GET overview hồ sơ 016/011/001/006/008 bị 404 `LOAN_NOT_FOUND` "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem.". Trang hồ sơ hiện "Không tìm thấy nội dung … ngoài phạm vi được xem của vai trò bạn. Về Việc của tôi". `tuanthu`: 016, 011 được 200 (đã từng có ý kiến); 001, 006, 008 bị 404. DB: `approver@` không có thông báo nào trên các hồ sơ đó. Ảnh `k1-s01-*.png`. |
| S02 (Rủi ro hỏi điều khoản) | Vừa | **Đã sửa** | `ruiro` chạy đội agent ở 176 (Needs Info, 51 s), rồi hỏi "Hồ sơ này vi phạm điều khoản chính sách nào? Trích điều khoản." (18,5 s, DIRECT, không chạy lại đội: `agent.case_run` 978→979→979). Trả lời nêu §4.1/§6.1 BCTC kiểm toán (80 > 20 tỷ), §6.1/§6.3 CIC, §4.2 DSCR chưa đối chiếu, Điều 6 AML, §3.1 Cấp 2, §3.4 (QHKH tạo cũng là người giữ, đúng DB), EBITDA âm. Có câu "trạng thái 'cần bổ sung hồ sơ' là đề xuất của đội agent, không phải bước hiện tại" và dòng "Dựa trên kết quả phân tích lúc 13:28". Không còn "ba điều khoản được cung cấp". Ảnh `chR-ruiro-1.png`. |
| S03 (QHKH hỏi chỉ số sau "phân tích lại") | Vừa | **Đã sửa** ở Phúc Lâm | "Phân tích lại hồ sơ này" (ORCHESTRATED, 43 s), rồi "Nợ vay/EBITDA…" (7,6 s): "sau cấp 10,00 lần, vượt trần 3,5 … trước khi cấp 7,00 lần (35/5)". Khớp DB (nợ vay 35, EBITDA 5). Ảnh `chQ-qhkh-3.png`. Ở VinaNova câu chỉ số còn "không nêu ngưỡng" (ghi vào S09). |
| S04 (Trợ lý AI trên trang hồ sơ không gắn hồ sơ) | Vừa | **Đã sửa** | `giamdoc` mở 201, bấm "Trợ lý AI": tiêu đề "Trợ lý AI HSV-2026-00201". Sang 163 mở lại: "HSV-2026-00163". Chat kết luận và thẩm quyền đúng (10,00 lần, Giám đốc chi nhánh, §3.1, TCTD khác 10 tỷ không cộng). `kiemtoan`, `tdinh`, `pheduyet2` cũng mở được chat gắn hồ sơ từ trang chi tiết. Ảnh `k1-s04-giamdoc*.png`, `chG-giamdoc-1.png`. |
| Q04 (nhãn cổng viết hoa) | Nhẹ | **Sửa một phần** | Trace 3 cảnh demo và khung đội agent đã sạch ("Validation → Planner trả kết quả Đề xuất phê duyệt với điều kiện tiên quyết…", "Cần bổ sung Thiếu dữ liệu bắt buộc…"). Chat DIRECT sạch. Còn: thẻ kết quả trong khung chat hiện nguyên "Validation Cần bổ sung **CẦN BỔ SUNG: thiếu dữ liệu chặn** — …" (`chP`); trace và khung còn "**VƯỢT** ngưỡng" (`tr`, `d1`, `chS`). |
| S05 (số thập phân kiểu Anh) | Nhẹ | **Sửa một phần** | Trace đã "3,92 lần (tối đa 3,5)", "DSCR … 1,34 … ngưỡng 1,25". Còn: chat "phân tích lại" ở 201 "vượt trần 3.5" (`chQ`); thẻ kết quả trong chat "(tối đa 3.5)" (`chS`, `chG`). |
| S06 (hai dấu chấm trong thông báo giải trình) | Nhẹ | **Đã sửa** | Luồng C: chuông `httd` "Nội dung cần giải trình: Giải trình nguồn tiền trả nợ quý 2." (một dấu chấm). Ảnh `fC-httd-explanation.png`. |

Nghi vấn trong brief:
- "Cấp phê duyệt thấy danh sách lượt agent rỗng" (C-N3): không tái hiện. `giamdoc` ở luồng E thấy ca `case_7d9e40a1f61d` ngay trang đầu `/dashboard` (`caseGet` 200).
- "Chat chạy lại cả đội thay vì dùng lại kết quả": không tái hiện. Mọi câu DIRECT giữ nguyên `agent.case_run` (ví dụ 983 → 983 sau 6 câu ở chuỗi 4). Chỉ câu "phân tích lại" mới chạy đội.
- "Trace thô còn số đã bị phản biện": lần này ngược lại. Số sai không bị phản biện nên vẫn nằm trong trace (S09).

## Bảng điểm từng vai

| Vai | Lần 7 | Lần 8 | Đã làm được (bằng chứng) | Trừ điểm |
|---|---|---|---|---|
| QHKH (`qhkh`) | 8,5 | **9,0** | Luồng B: gia hạn ("Gia hạn bổ sung thêm 5 ngày LV"), gửi lại, rút; gửi lại sau khi rút bị 403 "Chỉ người đang giữ bước…". Chạy đội agent ở Nháp (69 s, Needs Info) đúng quyết định 11/11. Chuông có quyết định kèm lý do ("Hồ sơ được phê duyệt có điều kiện. Lý do: …"). Chat sau "phân tích lại" đúng số (S03 đã sửa). Mọi thao tác sai bước bị 403 tiếng Việt. | S05, S07 trong chat. Cần xác nhận 6 (không nhận thông báo khi chờ Hội đồng). |
| HTTD (`httd`) | 9,0 | **9,0** | Trả lại, chuyển Thẩm định, nhận bổ sung; chuông "Yêu cầu bổ sung … Nội dung cần bổ sung: …", "Nội dung cần giải trình: …" (S06 đã sửa). Gọi `submit_to_risk`, `request_info` bị 403. | – |
| Thẩm định (`tdinh`) | 9,0 | **8,5** | Cảnh 1–3 và luồng E chạy đội agent; xác nhận `add_disbursement_condition` sau 4 s; yêu cầu bổ sung; trả lại; nhận chuông trả lại kèm lý do. Chat 184 nêu đúng §4.2 (47/12 = 3,92 > 3,5), CIC nhóm 3, §4.1/§6.1. | S09: ở 187 chat nói "Nợ vay/EBITDA sau cấp là 1,39 lần … kết quả này không nêu ngưỡng". S07 ("theo Q4") trong chat 184. |
| Rủi ro (`ruiro`) | 8,0 | **9,0** | S02 đã sửa. Luồng C: trả lại, giữ gian lận (vai khác mất nút), gỡ giữ, yêu cầu giải trình. Chạy đội agent ở Đại Thành, số khớp DB (EBITDA 2025 −22, không CIC, không KYC). Bị khóa "Trình phê duyệt" có lý do "Chưa có ý kiến Rủi ro; Chưa có ý kiến Tuân thủ". Câu ngoài phạm vi bị từ chối. | – |
| Tuân thủ (`tuanthu`) | 9,0 | **9,0** | Chuông "Cần ý kiến Tuân thủ: … cần ghi ý kiến Tuân thủ để Rủi ro trình phê duyệt."; ghi ý kiến; khung đội agent chỉ đọc có lý do; 3 nút. Ngoài phạm vi bị 404 (S01 đã sửa). | Cần xác nhận 13 (GET khách 404 khi GET hồ sơ 200). |
| Cấp phê duyệt cấp 1 (`pheduyet`) | 8,5 | **9,0** | Cảnh 5: modal, bước xác nhận "…chuyển sang bước Hoàn tất với hạn mức 55 tỷ đồng (55.000.000.000 đồng)… Không hoàn tác được…", "Đã phê duyệt", nút Quyết định biến mất (10 s). S01 đã sửa. Hồ sơ cấp 2 và chờ Hội đồng bị 404. PATCH hội thoại sang khách ngoài phạm vi bị 403. | – |
| Cấp phê duyệt cấp 2 (`pheduyet2`) | 8,5 | **9,0** | Luồng A: chuông "Hồ sơ giao cho bạn … Bước Phê duyệt"; duyệt có điều kiện sau khi xử lý 11 ngoại lệ; form trống khóa với "Cần nhập: lý do quyết định, quyết định và lý do cho từng ngoại lệ chưa xử lý."; 422 `EXCEPTIONS_UNDECIDED`, 409 `VERSION_CONFLICT` tiếng Việt. Chat thẩm quyền đúng (0 + 25 tỷ, Cấp 2, §3.1, §3.4). | Q04 trong thẻ kết quả của chat. |
| Giám đốc chi nhánh (`giamdoc`) | 8,5 | **9,0** | S04 đã sửa. Luồng C: trả về bổ sung, từ chối có xác nhận. Luồng E: duyệt có điều kiện cấp 1. Hồ sơ cấp 2: nút Quyết định khóa kèm "Hồ sơ đang do người khác xử lý; chỉ người đang giữ bước này mới thực hiện được.", API 403. | – |
| Trưởng phòng (`credit.manager`) | 9,0 | **9,0** | Trang chủ "Hồ sơ của phòng 18 … 1 quá hạn · 2 bị trả lại · 1 chờ bổ sung". Chuyển người: nút khóa tới khi có lý do; `tdinh2` nhận "Trưởng phòng chuyển hồ sơ cho bạn: Cân đối khối lượng công việc trong phòng.". Chạy đội agent trên hồ sơ của phòng không cần giữ bước (54 s). Chờ Hội đồng bị khóa đúng ("Chờ phiên Hội đồng – có ở đợt 2"). | – |
| Kiểm toán (`kiemtoan`) | 9,0 | **9,0** | Xem mọi hồ sơ, mọi thao tác ghi bị 403. Chat 187 chỉ đọc; "phân tích lại" bị 403 `AGENT_RUN_NOT_ALLOWED`, câu tiếng Việt hiện trong khung chat. | S09 (chat nhắc lại "Đòn bẩy sau cấp 1,39 lần"). |
| Quản trị (`quantri`) | 9,0 | **9,0** | `/quan-tri`: menu "Quản trị hệ thống / Quản trị / Thông báo"; "Quản trị người dùng Chỉ đọc · Quản trị hệ thống không xem được hồ sơ vay"; bảng 11 tài khoản có phân trang; "Ma trận quyền". Mọi API hồ sơ, khách, chat bị 403 tiếng Việt; thao tác bị `MISSING_PERMISSION`. | S10: dòng "Chạy phân tích hồ sơ" ghi QHKH "—" dù QHKH chạy được đội agent. |

## Bảng 5 sản phẩm của đề bài

| # | Sản phẩm | Lần 7 | Lần 8 | Bằng chứng | Còn thiếu |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 9,0 | **8,5** | 8 hồ sơ đa dạng (bảng dưới). Mỗi lượt có Credit, Compliance, Operations, rồi Validation. Kết luận khác nhau đúng chuyên môn: Sông Hàn có Compliance "Từ chối do CIC nhóm 3", tổng hợp Rejected. Việt Tiến có "Phản biện 1 lần, đã xử lý 1". | S09: ở cảnh 1, Credit (1,39 lần, dùng nợ BCTC 56 tỷ) và Validation (1,82 lần, dùng CIC 98 tỷ) lệch nhau mà không có phản biện. Lần 7 cùng cảnh có 2 phản biện. Cần xác nhận 1 (Phúc Lâm: Credit "từ chối", tổng hợp Needs Info) vẫn còn. |
| 2 | Planner giao việc cho executor | 9,0 | **9,0** | Trace có "Planner giao việc cho đội agent" kèm lý do lập kế hoạch, các dòng "Planner → Credit/Compliance/Operations giao việc", Validation chờ kết quả rồi trả Planner. Khung hồ sơ: "Planner → Credit Compliance Operations Document → Validation → Cấp phê duyệt · Người quyết định, ngoài khung AI". | – |
| 3 | Agent gọi công cụ, hành động thật | 9,0 | **9,0** | Bảng "Công cụ: agent nào đã gọi (14)" có cột "Agent tự gọi"; 9 công cụ MCP ở cảnh 1. Cảnh 1: `add_disbursement_condition` thành CONFIRMED sau 4 s. Cảnh 2 và luồng E: `request_documents` "Chờ người xác nhận" và chuông "Đề xuất mới của đội agent … cần bạn xác nhận hoặc bỏ kèm lý do". Operations chỉ soạn nháp "chưa ghi vào hệ thống". | – |
| 4 | Dashboard trace, trạng thái, quyết định | 8,5 | **8,5** | "Validation kiểm chứng" có số tính lại; "Quyết định của người duyệt và hành động thật"; chi phí LLM từng lượt ("7 lượt, 14.735 token, 0,0038 USD"); công tắc "Hiện ca kiểm thử (199)" và "Hiện 7 lượt nháp chưa gọi công cụ". Q04 và S05 trong trace đã gần sạch. | S09 (trace nói "0 phản biện" trong khi hai số lệch), S07 ("theo Q4"), S08 ("1,000 tỷ"), Q04 còn "VƯỢT". Cần xác nhận 15 (thời gian ca tính cả lúc người duyệt). |
| 5 | So sánh single và multi | 8,5 | **8,5** | Engine không đổi sau đo (diff chỉ 1 tệp kết quả). Tab So sánh (`cmp2.spec`, `giamdoc`): "Lượt đo 13/11/2026 05:08 · Bộ ca v8"; độ phủ 70,7% so với 52,0%; (b) 98,3% / 67,5%; trích nguồn đúng 94,2% / 88,3%; "Tới đúng bước chờ người xác nhận 100,0% / 60,0% ± 49,8%"; phát hiện sai 0,00 / 0,03; độ trễ 38,0 / 42,0 giây; chi phí 0,0035 / 0,0024 USD "Đội agent kém hơn". Có câu nói lợi thế đúng cổng nhờ "cổng quyết định tất định (luật cứng) đã được hiệu chỉnh…". 50 lượt cũ chọn được. | Như lần 7: (a) chỉ 70,7% vì đáp án viết theo luật cũ; bộ ca 10 ca. Việc của lần đo sau (g). |

**Đội agent đối chiếu DB** (`truth.sql`: `credit.sme_financial_year`, `credit.collateral`, `banking.credit_report`, `customer.kyc_assessment`):

| Hồ sơ | Vai chạy | Trạng thái | Số của đội agent | DB | Khớp |
|---|---|---|---|---|---|
| HSV-2026-00187 VinaNova 80 tỷ (cảnh 1) | `tdinh` | Pending Approval | Credit: "Nợ vay sau cấp 136 tỷ / EBITDA 98 tỷ = 1,39 lần"; Validation: "178,0 tỷ / 98,0 tỷ = 1,82 lần"; 0 + 80 = 80 tỷ → Cấp 2; dư nợ TCTD khác 98 tỷ không cộng | BCTC 2025: nợ vay 56, EBITDA 98; CIC TCTD 56 + 42 = 98; 1 TSBĐ 145 tỷ; KYC CLEAR | Cấp và cổng ✓; **chỉ số lệch, không phản biện (S09)** |
| HSV-2026-00223 Việt Tiến 20 tỷ (cảnh 2) | `tdinh` | Needs Info | LTV 20/30 = 66,7%; hạn mức có bảo đảm 21 tỷ; Giám đốc chi nhánh (cấp 1); chưa có BCTC | Không có BCTC; 1 TSBĐ 30 tỷ × 70% = 21 | ✓ |
| HSV-2026-00184 Sông Hàn 22 tỷ (cảnh 3) | `tdinh` | Rejected | CIC nhóm 3, quá hạn 14 tỷ; (25 + 22)/12 = 3,92 > 3,5; Cấp 2 | CIC nhóm 3; nợ vay 25, EBITDA 12 | ✓ |
| HSV-2026-00176 Đại Thành 80 tỷ | `ruiro` | Needs Info | EBITDA 2025 −22 tỷ; chưa có CIC, AML; BCTC kiểm toán bắt buộc; Cấp 2 | EBITDA −22; không CIC, không KYC | ✓ |
| HSV-2026-00201 Phúc Lâm 15 tỷ | `qhkh` (chat) | Needs Info | (35 + 15)/5 = 10,00 lần > 3,5; ≤ 20 tỷ → Giám đốc chi nhánh | Nợ vay 35, EBITDA 5; KYC CLEAR; CIC 1 | ✓ |
| LA-…88D92679 Mekong Flex 25 tỷ | `truongphong` | Needs Info | Chưa có AML; BCTC kiểm toán bắt buộc vì > 20 tỷ; Cấp 2 | Không có KYC | ✓ |
| LA-…F9E3C7E3 Mekong Flex 2 tỷ | `tdinh` | Needs Info | Chưa sàng lọc danh sách đen; thiếu lịch trả nợ để tính DSCR; cấp 1 | Không có KYC, không BCTC | ✓ |
| LA-…A85E6BC4 Mekong Flex 8 tỷ (Nháp) | `qhkh` | Needs Info | Chưa sàng lọc danh sách đen; thiếu nghĩa vụ nợ để tính DSCR; chưa có tài khoản thanh toán (điều kiện trước giải ngân, "không cản trở trình") | Không có KYC | ✓ |

**Trích dẫn:** §1.2, §3.1, §3.4, §4.1, §4.2, §4.4, §6.1, §6.3, §7.1 đều có trong `agent_engine/rag_corpus/shared_cs_td_sme_2025.md`. "Điều 6 (AML)" và "Điều 7 (CIC)" có trong `compliance_policy.md`. Không gặp điều khoản bịa. Một trích dẫn bị đổi dấu số (S08).

**Câu hỏi khó giám khảo có thể hỏi và hệ thống trả lời tới đâu:**
1. *"Lợi thế đúng cổng có phải nhờ nhiều agent không?"* Tab tự nói phần lớn nhờ cổng tất định. Trả lời trung thực.
2. *"Vì sao độ phủ (a) chỉ 70,7%?"* Tab giải thích đáp án viết theo luật tổng cấp cũ; dòng (b) là số tham khảo. Đủ, nhưng giám khảo có thể đòi đo lại với đáp án mới.
3. *"Agent có tự chọn công cụ không?"* Trace phân biệt "Agent tự gọi" và "system gọi bù". Trả lời được.
4. *"Hai chuyên gia mâu thuẫn số thì sao?"* **Ở cảnh 1 lần này chưa trả lời được** (S09). Có ví dụ ở cảnh 2 Việt Tiến ("Phản biện 1 lần, đã xử lý 1"), nên người trình bày nên dẫn ca đó.
5. *"Hồ sơ vi phạm điều khoản nào?"* Trả lời được (Đại Thành, Phúc Lâm, Sông Hàn), có trích điều khoản, tách đề xuất AI và bước hồ sơ.
6. *"Hỏi chỉ số ngay sau khi phân tích lại có ra cùng số không?"* Phúc Lâm ra cùng 10,00 lần. VinaNova ra 1,39 lần (số của Credit, không phải số Validation tính lại).
7. *"Ai không được chạy agent, ai không được quyết định?"* Mọi vai sai bị 403/404 bằng câu tiếng Việt, có lý do trên giao diện. Trả lời được.
8. *"Chat có chạy lại cả đội mỗi câu không, tốn bao nhiêu?"* Không: câu DIRECT 7–20 s, `case_run` không tăng; chỉ "phân tích lại" mới chạy (43 s, khoảng 0,004 USD).

## Chat (14 câu)

| Vai, hồ sơ | Câu | Kết quả |
|---|---|---|
| `ruiro` 176 | Vi phạm điều khoản nào, trích điều khoản | Đúng (S02 đã sửa), 18,5 s |
| `ruiro` 176 | Thời tiết Hà Nội | Từ chối ngoài phạm vi, 0,23 s |
| `qhkh` 201 | "Phân tích lại hồ sơ này" | Chạy cả đội 43 s; Needs Info; còn "trần 3.5" (S05), "theo Q4" (S07) |
| `qhkh` 201 | Kết luận | Đúng, 10,00 lần = (35 + 15)/5, Giám đốc chi nhánh |
| `qhkh` 201 | Nợ vay/EBITDA | Đúng, sau cấp 10,00 lần vượt 3,5; trước cấp 7,00 lần |
| `qhkh` 201 | Vi phạm điều khoản nào | Đúng: §4.2 vi phạm; §3.1; §4.1/§6.1 không bắt buộc (15 tỷ) |
| `giamdoc` 201 (nút "Trợ lý AI" trên trang hồ sơ) | Kết luận / thẩm quyền | Đúng, gắn hồ sơ đang xem (S04 đã sửa) |
| `tdinh` 187 | Kết luận | Đúng cấp và điều kiện tiên quyết; nêu "Đòn bẩy sau cấp 1,39 lần" (S09) |
| `tdinh` 187 | Nợ vay/EBITDA sau cấp | "1,39 lần … không nêu ngưỡng, nên chưa đối chiếu được" (S09) |
| `kiemtoan` 187 | Kết luận / "phân tích lại" | Đúng chỉ đọc / 403 `AGENT_RUN_NOT_ALLOWED` có câu tiếng Việt |
| `pheduyet2` LA-…88D92679 | Thẩm quyền | Đúng: 0 + 25 tỷ, Cấp 2 Hội sở, §3.1, §3.4 |
| `tdinh` 184 | Vi phạm điều khoản nào | Đúng: §4.2 3,92 > 3,5, Điều 7 CIC nhóm 3, §4.1/§6.1, §7.1; còn "theo Q4" (S07) |

Phân quyền chat (`pa.spec`, 7 hồ sơ mỗi vai):
- `pheduyet`: mở chat ở hồ sơ không xem được bị 403 `ACCESS_DENIED`; PATCH hội thoại sang khách 158 bị 403 (đúng (h)).
- `quantri`: mọi hồ sơ, khách, chat bị 403.
- `tuanthu`: PATCH sang 158 bị 404.
- `kiemtoan`: tạo được ở mọi hồ sơ (201), đúng (d).

## 5 cảnh demo

Chạy theo `docs/agent/demo-data.md` ngay sau `reset-demo.sh` (rc=0, 18 s). Tổng 192 giây (lệnh 194 s), không có lỗi console ngoài cảnh báo antd đã lỗi thời.

| Cảnh | Vai | Kết quả | Thời gian | Chỗ vấp |
|---|---|---|---|---|
| 1. VinaNova HSV-2026-00187 | `tdinh` | Pending Approval, "Cấp phê duyệt đề xuất: Cấp 2 Hội sở"; `add_disbursement_condition` thành CONFIRMED sau 4 s | 49 s | Khung "Trích nguồn" hiện "Đòn bẩy sau cấp 1,39 lần" trong khi Validation tính 1,82 và ghi "0 phản biện" (S09). "theo Q4" (S07). Ảnh `d1-c1.png`, `tr-case_b19f7dea3471.png`. |
| 2. Việt Tiến HSV-2026-00223 | `tdinh` | Needs Info; LTV 66,7%; hạn mức 21 tỷ; "Phản biện 1 lần, đã xử lý 1"; `request_documents` "Yêu cầu khách bổ sung 3 mục" | 45 s | Trích §1.2 "≤ 1,000 tỷ đồng" (S08). Ảnh `d1-c2.png`, `tr-case_f1b4af56c7a1.png`. |
| 3. Sông Hàn HSV-2026-00184 | `tdinh` | Rejected, CIC nhóm 3, quá hạn 14 tỷ; Credit 47/12 = 3,92 > 3,5; Cấp 2 | 57 s | "theo Q4" (S07), "VƯỢT ngưỡng" (Q04). Ảnh `d1-c3.png`. |
| 4. Phú Điền HSV-2026-00196 | `qhkh` tải, `httd` xem | Tải 202 trong 4 s; 4 vùng tô sau 10 s | 10 s | Như lần 6, 7: phải bấm vào vùng thì thẻ trường "AI đề xuất / chờ xác nhận" mới hiện. Người trình bày cần biết. Ảnh `d1-c4.png`. |
| 5. Thành Đạt HSV-2026-00163 | `pheduyet` | Modal, bước xác nhận "…hạn mức 55 tỷ đồng (55.000.000.000 đồng), bằng mức đề nghị, kỳ hạn 12 tháng. Không hoàn tác được…", "Đã phê duyệt", nút Quyết định biến mất | 10 s | – Ảnh `d1-c5.png`. |

Sau khi chấm xong đã chạy `reset-demo.sh` lần nữa (rc=0), nên 5 hồ sơ demo về trạng thái ban đầu.

## Danh sách lỗi

### S09 · Vừa · Thẩm định, Kiểm toán, mọi vai xem cảnh 1 (đội agent, trace, chat)

- **Tái hiện:** `reset-demo.sh`, `tdinh` mở `/ho-so-vay/75000000-0000-4000-8000-000000000001`, bấm Chạy đội agent (ca `case_b19f7dea3471`). Xem khung "Trích nguồn", trace mục Validation. Sau đó hỏi chat "Nợ vay/EBITDA sau cấp của khách hàng bao nhiêu?".
- **Mong đợi:** khi chuyên gia và số tính lại lệch nhau, Validation phải phát phản biện và dùng số tính lại (đề bài: phối hợp chuyên gia và kiểm chứng; lần 7 cùng cảnh có 2 phản biện). Câu chỉ số phải nêu ngưỡng 3,5 lần theo `shared_cs_td_sme_2025.md` §4.2.
- **Thực tế:**
  - Credit: "Nợ vay sau cấp 136 tỷ đồng / EBITDA 98 tỷ đồng = 1,39 lần" và "Đòn bẩy sau cấp 1,39 lần". 136 = nợ vay BCTC 56 + 80.
  - Validation tính lại "178,0 tỷ / 98,0 tỷ = 1,82 lần". 178 = dư nợ CIC 98 + 80.
  - Trace ghi "Phản biện: 0 lần… Các kết luận chuyên gia không mâu thuẫn".
  - Chat `tdinh` và `kiemtoan` nhắc lại 1,39; câu chỉ số nói "Kết quả này không nêu ngưỡng, nên chưa đối chiếu được đạt hay không".
  - Cả hai số đều dưới 3,5 nên cổng và cấp không đổi.
- **Ảnh:** `/tmp/gb/shots/d1-c1.png`, `tr-case_b19f7dea3471.png`, `chT-tdinh-2.png`, `chK-kiemtoan-1.png`.
- **Nghi ngờ:**
  - `agent_engine/common/consistency.py:46`: regex đòn bẩy chỉ bắt chữ "Nợ vay/EBITDA … lần", không bắt "Đòn bẩy sau cấp X lần" hay "Nợ vay sau cấp … / EBITDA … = X lần".
  - `check_verdicts` (`consistency.py:75` trở đi) chỉ quét summary, findings, conditions, không quét trích dẫn bằng chứng.
  - Câu chỉ số ở `backend/app/services/engine_conversation_responder.py` (`result_context` với `kind="metric"`) không đưa ngưỡng chính sách khi kết quả không nêu ngưỡng.

### S07 · Nhẹ · Mọi vai xem khung đội agent, trace, chat

- **Tái hiện:** cảnh 1 hoặc 3, khung đội agent và trace mục Validation. Chat "phân tích lại" ở 201, chat điều khoản ở 184.
- **Mong đợi:** không lộ mã quy tắc nội bộ cho người dùng (tiêu chí "không lộ mã thô" của Build).
- **Thực tế:** "dư nợ 14,0 tỷ tại tổ chức tín dụng khác không tính vào cấp phê duyệt **theo Q4**" (184), "dư nợ 98,0 tỷ … theo Q4" (187), chat 201 "khoản 10 tỷ tại TCTD khác không tính theo Q4". "Q4" là mã quyết định nội bộ, không phải điều khoản chính sách.
- **Ảnh:** `/tmp/gb/shots/d1-c3.png`, `chQ-qhkh-1.png`, `chS-tdinh-1.png`.
- **Nghi ngờ:** `agent_engine/common/policy_checklist.py:10` (prompt có "…không tính vào cấp phê duyệt, Q4") và chuỗi căn cứ cấp phê duyệt trong `agent_engine/common/recompute.py`.

### S10 · Nhẹ · Quản trị (`/quan-tri`)

- **Tái hiện:** `quantri` mở `/quan-tri`, bảng "Ma trận quyền", dòng "Chạy phân tích hồ sơ".
- **Mong đợi:** QHKH chạy được đội agent ở Nháp, Trả về QHKH, Thẩm định chờ bổ sung (`docs/business/ma-tran-phan-quyen.md:229`, quyết định 11/11/2026). Trang Quản trị phải cho thấy đúng điều đó.
- **Thực tế:** QHKH "—" ở dòng "Chạy phân tích hồ sơ", trong khi QHKH chạy được đội agent ở Nháp (LA-…A85E6BC4, 69 s). Dòng này là quyền `loan:analyze` (API phân tích cũ). Quyền chạy đội agent đi theo `ROLE_STATUSES`, không hiện ở trang.
- **Ảnh:** `/tmp/gb/shots/k1-quantri.png`, `agD-Flex8-panel.png`.
- **Nghi ngờ:** nhãn `'loan:analyze': 'Chạy phân tích hồ sơ'` ở `frontend/src/features/admin/AdminPage.tsx:52`; ma trận chỉ dựng từ quyền DB (`AdminPage.tsx:104-114`), không có quy tắc `ROLE_STATUSES` ở `backend/app/services/loan_agent_run_service.py:58`.

### S08 · Nhẹ · Mọi vai xem trace (cảnh 2)

- **Tái hiện:** trace `case_f1b4af56c7a1` (cảnh 2 Việt Tiến), bằng chứng Credit trích §1.2.
- **Mong đợi:** trích nguyên văn `agent_engine/rag_corpus/shared_cs_td_sme_2025.md` dòng 6: "doanh thu năm ≤ 1.000 tỷ đồng".
- **Thực tế:** "doanh thu năm ≤ 1,000 tỷ đồng" (3 sự kiện `task_finished`/`state_changed`). Người Việt đọc là 1 tỷ.
- **Ảnh:** `/tmp/gb/shots/tr-case_f1b4af56c7a1.png`.
- **Nghi ngờ:** LLM đổi dấu khi chép trích dẫn; chưa có bước so trích dẫn với corpus nguyên văn trước khi hiện.

### Q04 (sửa một phần) · Nhẹ · Mọi vai xem chat và trace

- **Tái hiện:** `pheduyet2` mở "Trợ lý AI" ở LA-…88D92679, xem thẻ kết quả đội agent trong khung chat. Trace cảnh 3, mục Validation.
- **Mong đợi:** không nhãn cổng viết hoa (Q04 lần 5–7).
- **Thực tế:** thẻ kết quả trong chat hiện "Validation Cần bổ sung **CẦN BỔ SUNG: thiếu dữ liệu chặn** — Chưa có kết quả sàng lọc AML…". Trace và khung hiện "3,92 lần (tối đa 3,5); **VƯỢT** ngưỡng".
- **Ảnh:** `/tmp/gb/shots/chP-pheduyet2-1.png`, `d1-c3.png`.
- **Nghi ngờ:**
  - `frontend/src/features/chat/components/EnginePanel.tsx:120` hiện `v.summary` thô, không qua `scrubInternal`/`humanizeGate`.
  - `humanizeGate` (`frontend/src/features/dashboard/agentTrace.ts:303`) không bắt một từ hoa sau dấu chấm phẩy ("; VƯỢT ngưỡng").
  - Nguồn chuỗi: `agent_engine/common/gate.py:28`, `agent_engine/common/recompute.py:124`.

### S05 (sửa một phần) · Nhẹ · Mọi vai xem chat

- **Tái hiện:** chat "phân tích lại" ở 201; thẻ kết quả trong chat ở 184 hoặc 201.
- **Mong đợi:** số viết kiểu Việt Nam như trace đã sửa ("3,5").
- **Thực tế:** "vượt trần 3.5" (câu ORCHESTRATED), "(tối đa 3.5)" (thẻ kết quả trong chat), trong khi trace cùng ca ghi "(tối đa 3,5)".
- **Ảnh:** `/tmp/gb/shots/chQ-qhkh-1.png`, `chS-tdinh-1.png`.
- **Nghi ngờ:** bộ làm sạch số của trace (`0e6597c`) không áp cho câu trả lời ORCHESTRATED trong `backend/app/services/engine_conversation_responder.py` và `EnginePanel.tsx:120`.

## Cần xác nhận

Các mục lần 7 chưa có trả lời của captain được giữ, không tính lỗi, không trừ điểm.
1. **Phúc Lâm kết luận mâu thuẫn.** Lại gặp: sau "phân tích lại", Credit ghi "từ chối" nhưng tổng hợp Needs Info.
2. **VinaNova đề xuất khi TSĐB chưa định giá.** Còn: chat "Chưa đối chiếu được LTV … thiếu thông tin pháp lý, định giá", nhưng cảnh 1 vẫn Pending Approval.
3. **`POSSIBLE_MATCH` tính là trúng.** Không đo lại.
4. **Khách không có `kyc_assessment` hiện "Đã xác minh".** Không gặp lại: Mekong Flex (không KYC) ghi "chưa hoàn tất sàng lọc danh sách đen". Chờ captain đóng.
5. **Nhật ký kiểm toán lọc người thực hiện "agent" ra 0 dòng.** Không đo lại.
6. **QHKH không nhận thông báo khi hồ sơ chờ Hội đồng.** Còn (luồng D: chuông `qhkh` không có dòng nào cho LA-…430959AF).
7. **QHKH xem được hồ sơ của mình ở mọi bước.** Còn.
9. **Tổng quan dashboard gộp lượt e2e và lượt thật.** Còn ("Đã có kết luận 387 trên 982 lượt (39,4%)").
10. **Dữ liệu khách Mekong Flex nhiều hồ sơ e2e.** Là dữ liệu.
12. **`details.reason` của 403 là tiếng Anh** ("Customer context is outside the authorized scope"). Còn; giao diện không hiện `details`.
13. **Tuân thủ GET hồ sơ 158/163/176/187 được 200 nhưng GET khách bị 404.** Còn (`pa.spec`).

Đã đóng theo các mục đã chốt: 11 (PATCH chặn ngoài phạm vi, đúng (h): `pheduyet`, `quantri` 403, `tuanthu` 404); 14 (chat tách đề xuất AI và bước hồ sơ, đúng (h)).

Mới:

15. **Thời gian ca và giờ "kết quả phân tích" tính cả thời gian chờ người duyệt.** Danh sách lượt ghi VinaNova "Hoàn thành 26 phút 41 giây" (phân tích lúc 13:34, crew khác duyệt lúc 14:00). Chat ở 187 ghi "Dựa trên kết quả phân tích lúc 14:00". LA-…88D92679 ghi "5 phút 29 giây". Thời gian ở đây nên là thời gian phân tích hay cả vòng đời ca?

## Chưa kiểm tra

- **Cần xác nhận 3 và 5.** Không đo lại.
- **Chuyển cấp theo nhóm khách hàng liên quan (M04).** Seed không có nhóm liên quan rõ.
- **Chọn lượt "11/11/2026 10:31" ở tab So sánh.** Lựa chọn có trong danh sách (50 lượt) nhưng script không bấm được. Có thể do script; không ghi là lỗi.
- **Khung đội agent ở DX-2026-00412 MekongDX.** Không chạy lại (hết ngân sách); Q04 ở khung đã kiểm trên các ca khác.
- **Email thật.** Worker tắt có chủ ý.
- **Benchmark.** Ngoài phạm vi, không chạy lại; chỉ kiểm diff engine và tab.
- **Chat 6 câu còn lại trong ngân sách.** Để dành cho demo.

## Để mọi vai và sản phẩm lên 8,5 còn thiếu gì

**Vai và sản phẩm dưới 8,5:** không còn. Mọi vai từ 8,5 đến 9,0; mọi sản phẩm từ 8,5 đến 9,0.

**Để bỏ lỗi Vừa còn lại (không bắt buộc để ĐẠT, nhưng là rủi ro ở cảnh demo 1):**
- S09 (sản phẩm 1, Thẩm định đang 8,5):
  - Validation so mọi số đòn bẩy trong summary, findings và trích dẫn với số tính lại, gồm dạng "Đòn bẩy sau cấp X lần" và "… / EBITDA … = X lần" (`agent_engine/common/consistency.py:46`, `:75`).
  - Khi nợ BCTC (56) và dư nợ CIC (98) lệch nhau, nêu rõ số dùng và phát phản biện.
  - Câu chỉ số trong chat nêu ngưỡng chính sách (§4.2: 3,5 lần) dù kết quả không nêu.
  - Phép kiểm: chạy cảnh 1 ba lần; trace phải có ít nhất 1 phản biện hoặc chỉ một số đòn bẩy; chat "Nợ vay/EBITDA sau cấp" phải ra cùng số Validation và nêu 3,5.

**Để các mục 8,5 vững hơn (lỗi Nhẹ):**
- S07: bỏ "Q4" khỏi prompt và chuỗi căn cứ, thay bằng câu nghiệp vụ (`policy_checklist.py:10`, `recompute.py`).
- Q04, S05: cho `EnginePanel.tsx:120` qua `scrubInternal`; áp bộ làm sạch số cho câu ORCHESTRATED; hạ "VƯỢT".
- S08: so trích dẫn với corpus nguyên văn trước khi hiện.
- S10: trang Quản trị thêm dòng "Chạy đội agent" theo `ROLE_STATUSES`, hoặc đổi nhãn `loan:analyze`.

## Brief ghi khác thực tế

- Brief có đoạn "Đây là LẦN CHẤM 3"; thực tế là lần 8 (mục 5 của Build).
- Acceptance ghi "bảng kiểm lại lỗi lần 5"; bảng ở đây kiểm các lỗi lần 7 (S01–S06, Q04) như mục 5 của Build yêu cầu.
- Nghi vấn C-N3, "chat chạy lại cả đội" không tái hiện. "Trace thô còn số bị phản biện" không tái hiện; vấn đề lần này là số sai không bị phản biện (S09).
- `docs/agent/demo-data.md` còn ghi "Hồ sơ cấp 2 do `giamdoc` mở thì thấy nút Quyết định nhưng ghi bị 500". Thực tế: nút khóa kèm lý do, API trả 403 (luồng A).
- Ô "Số tiền đề nghị" ở trang tạo đề xuất nay tính theo tỷ đồng (script cũ nhập đồng nên nút "Tạo bản nháp" khóa). Đây không phải lỗi ứng dụng; script lần sau cần nhập theo tỷ.
- Crew khác đổi trạng thái hồ sơ demo HSV-2026-00187 trong lúc chấm (lần 7 cũng vậy). Cần chạy `reset-demo.sh` ngay trước buổi demo.
- `import/duskdash` đi từ `2b0abad` lên `912678b` trong lúc chấm (chỉ tài liệu thẩm mỹ).
