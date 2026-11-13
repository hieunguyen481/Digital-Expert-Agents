# Chấm điểm chức năng lần 7 (13/11/2026)

Giám khảo độc lập (crew `ga`, Opus). Chỉ chấm CHỨC NĂNG, luồng, thông báo, phân quyền, độ rõ của thao tác và nội dung. Không chấm thẩm mỹ. Không sửa code.

**Bản được chấm:**
- HEAD `import/duskdash` `de64f54` lúc chấm (sau đó nhánh thêm `bb661b1`, chỉ là tài liệu thẩm mỹ).
- Container API khởi động 02:07 UTC, đã có thay đổi prompt `894c489`.
- DB V069, engine chế độ `llm`.
- Web :3000 chạy từ checkout chính, API :8000, Keycloak :8080.

**Cách chấm:**
- Playwright trên giao diện thật, đăng nhập từng vai bằng tài khoản ở `frontend/e2e/helpers.ts`. Mỗi luồng nhiều bước chạy trong `flock /tmp/do-an-e2e.lock`.
- Thử API trực tiếp cho các việc không được làm.
- Số liệu đối chiếu bằng SELECT (chỉ đọc) trên `credit.*`, `customer.*`, `agent.case_run`, `integration.notification*`, `audit.audit_event`.
- Trích dẫn đối chiếu với `agent_engine/rag_corpus`.
- Script ở `/tmp/gA/specs/`, nhật ký `/tmp/gA/*.jsonl`, ảnh ở `/tmp/gA/shots/`.

**Hồ sơ tự tạo (không đụng hồ sơ seed, ngoài 5 hồ sơ demo):**

| Luồng | Hồ sơ | Số tiền | Nhánh đã đi |
|---|---|---|---|
| A | LA-20261113-94F17573 | 25 tỷ | Thử vai sai từng bước; Trưởng phòng chạy đội agent ở Thẩm định; Rủi ro bị khóa "Trình phê duyệt" có lý do; Tuân thủ; cấp 2 duyệt có điều kiện; 422 ngoại lệ chưa xử lý; 409 xung đột phiên bản |
| B | LA-…-998B1D39 | 2 tỷ | HTTD trả lại; QHKH gia hạn bổ sung; gửi lại; Thẩm định yêu cầu bổ sung; HTTD nhận; Thẩm định trả lại; QHKH rút; gửi lại sau khi rút bị 403 |
| C | LA-…-F27057E3 | 3 tỷ | Rủi ro trả lại; giữ gian lận rồi gỡ; yêu cầu giải trình; Giám đốc trả về bổ sung; Từ chối |
| D | LA-…-784C914F | 120 tỷ | Trưởng phòng chuyển người có lý do; chờ Hội đồng |
| E | LA-20261113-387CF62C | 2 tỷ | Thẩm định chạy đội agent; Giám đốc chi nhánh duyệt có điều kiện cấp 1 |

**Ngân sách LLM (đúng giới hạn):**
- 8/8 lượt đội agent:
  - luồng A và E;
  - Đại Thành (`ruiro`) và MekongDX (`qhkh`);
  - một "phân tích lại" trong chat (Phúc Lâm, `qhkh`);
  - cảnh demo 1, 2, 3.
- 15/20 câu chat. Một câu bị 403 (Kiểm toán "phân tích lại") và một câu bị từ chối ngoài phạm vi, nên hai câu đó không tới LLM.
- Không gặp 402.
- Chi phí một lượt khoảng 0,0032 USD (cảnh 1: 7 lượt gọi, 13.537 token).

**Email:** worker tắt có chủ ý. `integration.notification_delivery` vẫn chỉ có 2 dòng SENT, không có dòng mới. Thông báo được kiểm trong ứng dụng.

**Nhiễu môi trường:**
- Khoảng 10:47 một crew khác chạy e2e đưa HSV-2026-00187 tới "Đã phê duyệt". `audit.audit_event` có WORKFLOW_DECIDE lúc 03:47:19 UTC, actor `…0011`.
- Vì vậy lần chạy demo đầu, cảnh 1 không có nút chạy đội agent. Tôi chạy `reset-demo.sh` rồi chạy lại riêng cảnh 1. Không tính là lỗi ứng dụng.
- Không gặp lỗi bộ đệm vite.

## Kết luận

**KHÔNG ĐẠT.**

- 10/11 vai và 5/5 sản phẩm đạt từ 8,5 trở lên. Vai **Rủi ro được 8,0**, dưới ngưỡng, vì lỗi S02 (chat trả lời sai câu "vi phạm điều khoản nào").
- Không có lỗi Chặn demo hay Cao.
- 4 lỗi mức Vừa:
  - S01: thông báo "Hồ sơ đã chuyển cho người khác" hiện cho cả người chưa từng giữ hồ sơ;
  - S02: chat điều khoản không dùng kết quả đội agent;
  - S03: chat chỉ số nói ngược với lượt phân tích vừa chạy;
  - S04: Giám đốc không mở được chat gắn hồ sơ khi hàng việc trống.
- 3 lỗi mức Nhẹ: Q04 (sửa một phần), S05, S06.
- 5 lỗi của lần 6: R01, R03, Q03 và R02 đã sửa; Q04 mới sửa một phần.
- 5 cảnh demo chạy được, tổng 2 phút 22 giây.
- Trung bình 11 vai là 8,73.

## Kiểm lại lỗi lần 6

Acceptance của brief gọi bảng này là "bảng kiểm lại lỗi lần 5"; theo mục 5 của Build, đây là các lỗi còn mở của lần 6.

| Mã | Mức lần 6 | Trạng thái | Bằng chứng tự đo |
|---|---|---|---|
| R01 (Kiểm toán, Trưởng phòng mở chat gắn hồ sơ) | Vừa | **Đã sửa** | `pa.spec`: `kiemtoan` và `truongphong` tạo hội thoại gắn HSV-2026-00158 được 201. Chat `kiemtoan` ở 187 trả lời kết luận chỉ đọc; "Phân tích lại hồ sơ này" bị 403 `AGENT_RUN_NOT_ALLOWED` kèm câu tiếng Việt hiện trong khung chat. Chat `truongphong` ở 167 trả lời kết luận và DSCR ("chưa có BCTC nên chưa tính được"), đúng DB vì khách 018 không có `sme_financial_year`. Ảnh `ch7-kiemtoan-2.png`, `ch7-truongphong-1.png`. |
| R03 (chat cấp phê duyệt cộng dư nợ TCTD khác) | Vừa | **Đã sửa** | `tdinh` ở 187: "Tổng cấp tín dụng tại ngân hàng là khoản đề xuất mới 80 tỷ … các khoản vay tại TCTD khác … không tính vào tổng cấp tín dụng", Cấp 2 Hội sở. `pheduyet` ở 163: "0 + 55 = 55 tỷ, bậc 20–100 tỷ, §3.1". Cả hai khớp DB. |
| Q03 (trace vừa có phản biện vừa ghi "không phát phản biện") | Nhẹ | **Đã sửa** | Trace `case_0fa1d51aab60` (187): "Phản biện: 2 lần, đã xử lý 2", không còn câu "không phát phản biện". Ba ca 0 phản biện (`d440…`, `4496…`, `cdd7…`) ghi nhất quán "0 lần" và "không phát phản biện nào". Bản thô "Xem đầy đủ" không còn số credit bị phản biện (1,39 lần; LTV 70%); chỉ hiện số tính lại 1,82 lần và 55,2%. |
| Q04 (nhãn cổng viết hoa ở trace và chat) | Nhẹ | **Sửa một phần** | Đã sạch: chat sau "phân tích lại" thật (Phúc Lâm) ghi "Kết luận: Cần bổ sung/điều chỉnh: …" (lần 6 là "CẦN BỔ SUNG/ĐIỀU CHỈNH"); thẻ đề xuất sạch. Còn: trace `d440…`/`cdd7…` ở "Validation → Planner trả kết quả" và "Quyết định của người duyệt" ghi "CẦN BỔ SUNG: thiếu dữ liệu chặn — …"; trace 187 ghi "ĐỀ XUẤT PHÊ DUYỆT với điều kiện tiên quyết"; khung đội agent của MekongDX ghi "Thiếu dữ liệu chặn, Chưa có kết quả sàng lọc…"; chat `tdinh`/`kiemtoan` ghi "ĐỀ XUẤT PHÊ DUYỆT CÓ ĐIỀU KIỆN". |
| R02 (nhãn giới hạn cố định "10 ca") | Nhẹ | **Đã sửa** | Tab So sánh: v8 "10 ca, 3 lần mỗi ca", v7 09/11 16:03 "8 ca, 3 lần", v1 07/11 01:37 "5 ca, 3 lần". Có thêm câu cổng tất định: "Tỷ lệ đúng cổng của đội agent dựa vào cổng quyết định tất định … mô hình đơn lẻ không có cổng này". |

Nghi vấn trong brief:
- **C-N3 (Cấp phê duyệt thấy danh sách lượt agent rỗng):** không còn. `giamdoc` mở được trace luồng E (GET 200) và thấy ca trong danh sách.
- **Chat chạy lại cả đội thay vì dùng lại kết quả:** không tái hiện. Số `agent.case_run` trước và sau mọi câu chat không phải "phân tích lại" đều giữ nguyên (969→969). Chỉ "Phân tích lại hồ sơ này" tăng 969→970.
- **Trace thô còn số đã bị phản biện:** không còn (xem Q03).

## Bảng điểm từng vai

| Vai | Lần 6 | Lần 7 | Đã làm được (bằng chứng) | Trừ điểm |
|---|---|---|---|---|
| QHKH (`qhkh`) | 9,0 | **8,5** | Luồng B: gia hạn bổ sung ("Gia hạn bổ sung thêm 5 ngày LV"), gửi lại, rút; gửi lại sau khi rút bị 403 tiếng Việt "Chỉ người đang giữ bước…". Chuông nhận quyết định kèm lý do (A, C, E) và điều kiện trước giải ngân. Chạy đội agent ở Nháp (MekongDX) và Trả về QHKH (Phúc Lâm, qua chat) theo quyết định 11/11. Ở Chờ Hội đồng, khung ghi lý do khóa. | S03: câu "Nợ vay/EBITDA bao nhiêu?" ngay sau "phân tích lại" nói đội agent "chưa nêu chỉ số này", trong khi câu trước nêu 10,00 lần. Cần xác nhận 6 vẫn còn. |
| HTTD (`httd`) | 9,0 | **9,0** | Trả lại, nhận bổ sung; chuông "Yêu cầu bổ sung … Nội dung cần bổ sung: …", "Nội dung cần giải trình: …". | S06: hai dấu chấm "quý 2..". |
| Thẩm định (`tdinh`) | 8,5 | **9,0** | Chạy đội agent ở cảnh 1–3 và luồng E; xác nhận đề xuất `add_disbursement_condition` sau 4 s; yêu cầu bổ sung; trả lại. Bị khóa "Trình phê duyệt" có lý do "Chưa có ý kiến Rủi ro; Chưa có ý kiến Tuân thủ". Chat thẩm quyền đúng (R03 đã sửa). | Q04 còn ở trace. |
| Rủi ro (`ruiro`) | 8,5 | **8,0** | Trả lại, giữ gian lận (vai khác mất nút), gỡ giữ, yêu cầu giải trình; chạy đội agent ở Đại Thành (Needs Info, số khớp DB); khóa "Trình phê duyệt" có lý do; chat từ chối câu ngoài phạm vi. | **S02 (Vừa):** hỏi "vi phạm điều khoản chính sách nào" ở Đại Thành thì chat trả lời "không cho thấy hồ sơ vi phạm điều khoản nào trong ba điều khoản được cung cấp" và "Chưa có cấp phê duyệt trong dữ liệu", bỏ qua kết quả đội agent 17 phút trước (thiếu CIC, thiếu AML, BCTC kiểm toán bắt buộc vì > 20 tỷ, Cấp 2 Hội sở). |
| Tuân thủ (`tuanthu`) | 9,0 | **9,0** | Chuông "Cần ý kiến Tuân thủ"; ý kiến; khung chỉ đọc có lý do, có 3 nút. Gọi API ngoài phạm vi bị 404 hoặc 403 tiếng Việt. | Cần xác nhận 13 (GET khách 404 khi GET hồ sơ 200). |
| Cấp phê duyệt cấp 1 (`pheduyet`) | 9,0 | **8,5** | Cảnh 5: modal, bước xác nhận "Không hoàn tác được…", "Đã phê duyệt", nút Quyết định biến mất. Hồ sơ cấp 2 trả 404 hoặc 403. Chat thẩm quyền 163 đúng. | **S01 (Vừa):** mở 5/5 hồ sơ ngoài phạm vi (chưa từng giữ, không có thông báo nào của mình) đều ra "Hồ sơ đã chuyển cho người khác". |
| Cấp phê duyệt cấp 2 (`pheduyet2`) | 9,0 | **8,5** | Luồng A: giữ bước, duyệt có điều kiện sau khi xử lý 11 ngoại lệ; 422 `EXCEPTIONS_UNDECIDED`, 409 `VERSION_CONFLICT` bằng tiếng Việt; form trống khóa với "Cần nhập: …". | S01: mở HSV-2026-00201 cũng ra "Hồ sơ đã chuyển cho người khác". |
| Giám đốc chi nhánh (`giamdoc`) | 9,0 | **8,5** | Luồng C: trả về bổ sung, từ chối có bước xác nhận "…bị từ chối và kết thúc. Không hoàn tác được…". Luồng E: duyệt có điều kiện cấp 1. Hồ sơ cấp 2 bị 403 (không 500). Nút Quyết định khóa có title khi người khác giữ. | **S04 (Vừa):** hàng việc trống thì không có lối nào mở chat gắn hồ sơ. Nút "Trợ lý AI" trên trang hồ sơ trả lời "chưa có hồ sơ khách hàng nào được chọn". |
| Trưởng phòng (`credit.manager`) | 8,0 | **9,0** | Trang chủ "Hồ sơ của phòng 19 … 1 quá hạn · 2 bị trả lại · 1 chờ bổ sung". Chuyển người: nút khóa tới khi có lý do; `tdinh2` nhận chuông kèm lý do. Chạy đội agent ở luồng A (45 s, Needs Info). Chat 167 trả lời kết luận và DSCR (R01 đã sửa). | – |
| Kiểm toán (`kiemtoan`) | 8,0 | **9,0** | Xem mọi hồ sơ (200) nhưng mọi thao tác ghi đều bị 403. Chat 187 chỉ đọc đúng; "phân tích lại" bị từ chối bằng câu tiếng Việt (theo (d)). | Q04 trong câu trả lời ("ĐỀ XUẤT PHÊ DUYỆT CÓ ĐIỀU KIỆN"). |
| Quản trị (`quantri`) | 9,0 | **9,0** | Đọc hồ sơ, khách, tạo chat gắn hồ sơ đều bị 403 `ACCESS_DENIED` tiếng Việt; thao tác nghiệp vụ bị `MISSING_PERMISSION`. | Trang `/quan-tri` không đi lại lần này. Cần xác nhận 12. |

## Bảng 5 sản phẩm của đề bài

| # | Sản phẩm | Lần 6 | Lần 7 | Bằng chứng | Còn thiếu |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 8,5 | **9,0** | 10 hồ sơ đa dạng (bảng dưới). Mỗi lượt có Credit, Compliance và Operations, rồi Validation. Chuyên gia kết luận khác nhau đúng chuyên môn: Sông Hàn có Compliance "Từ chối" vì CIC nhóm 3, Credit "Cần bổ sung", tổng hợp Rejected. Validation phản biện 2 số của credit ở 187 và dùng số tính lại. Q03 đã sửa. | Q04 còn ở dòng Validation. |
| 2 | Planner giao việc cho executor | 9,0 | **9,0** | Trace: "Planner giao việc cho đội agent" kèm lý do lập kế hoạch ("Hồ sơ không có tài liệu đính kèm nên không tạo tác vụ trích xuất…"), các dòng "Planner → Credit/Compliance/Operations giao việc", Validation "Chờ kết quả của: Credit, Compliance, Operations". | – |
| 3 | Agent gọi công cụ, hành động thật | 9,0 | **9,0** | Bảng "Công cụ: agent nào đã gọi (14)" với cột "Agent tự gọi"; 9 công cụ MCP. Cảnh 1: `add_disbursement_condition` thành CONFIRMED sau 4 s. Thẻ `request_documents` và `add_risk_flag` đều "Chờ người xác nhận". Operations chỉ soạn bản nháp ("chưa ghi vào hệ thống"). | – |
| 4 | Dashboard trace, trạng thái, quyết định | 8,5 | **8,5** | Q03 đã sửa. Có "Validation kiểm chứng" với số tính lại, "Quyết định của người duyệt và hành động thật", "Hành động đề xuất và xác nhận", chi phí LLM từng lượt. Danh sách có công tắc "Hiện ca kiểm thử (N)" và "Hiện N lượt nháp chưa gọi công cụ". Cấp phê duyệt xem được lượt chạy. | Q04 còn; S05 dấu thập phân; tổng quan vẫn đếm cả lượt e2e ("383 trên 967 lượt", Cần xác nhận 9). |
| 5 | So sánh single và multi | 8,0 | **8,5** | `git diff 735f9a7..HEAD -- agent_engine` chỉ có 1 tệp kết quả (6407 dòng thêm), nên engine không đổi sau khi đo. Tự tính lại từ tệp thô khớp tab (bảng dưới). R02 đã sửa. Câu cổng tất định nằm cạnh kết luận. §15.6 ghi cổng hiệu chỉnh trên v2–v5 và số ablation §8.1 (không cờ 83% so với có cổng 100%). Dòng (a) giữ nguyên đáp án đăng ký; dòng (b) ghi rõ là "số tham khảo có giải thích". Chi phí multi cao hơn được ghi "Đội agent kém hơn". | Bộ ca nhỏ (10 ca), chấm bằng từ khóa. Đáp án mới và ca biên để lần đo sau (đã chốt (g), không trừ). |

**Đội agent đối chiếu DB** (`credit.sme_financial_year`, `credit.collateral`, CIC và KYC qua `truth.sql`):

| Hồ sơ | Trạng thái | Số của đội agent | DB | Khớp |
|---|---|---|---|---|
| HSV-2026-00187 VinaNova 80 tỷ | Pending Approval | Nợ vay/EBITDA (98+80)/98 = 1,82 lần; LTV 80/145 = 55,2%; 0+80 = 80 tỷ → Cấp 2; dư nợ TCTD khác 98 tỷ không cộng | EBITDA 2025 98; CIC TCTD 56+42; 1 TSBĐ 145 tỷ | ✓ |
| HSV-2026-00176 Đại Thành 80 tỷ | Needs Info | EBITDA 2025 −22 tỷ; chưa có CIC, AML; BCTC kiểm toán bắt buộc | EBITDA −22; không có CIC, KYC | ✓ |
| DX-2026-00412 MekongDX 80 tỷ | Needs Info | Doanh thu 530, EBITDA 38; LTV 80/78 = 102,6%; trần 54,6 tỷ | 530/38; tài sản giá khai 78 tỷ × 70% = 54,6 | ✓ |
| HSV-2026-00201 Phúc Lâm 15 tỷ | Needs Info | Nợ vay/EBITDA sau cấp (35+15)/5 = 10,00 lần > 3,5; ≤ 20 tỷ → Giám đốc chi nhánh | Nợ vay 35, EBITDA 5; KYC CLEAR; CIC 1 | ✓ |
| HSV-2026-00184 Sông Hàn 22 tỷ | Rejected | CIC nhóm 3 | CIC nhóm 3 | ✓ |
| HSV-2026-00223 Việt Tiến 20 tỷ | Needs Info | Chưa có BCTC; hạn mức có bảo đảm tối đa 21 tỷ | Không có BCTC; 1 TSBĐ 30 tỷ × 70% = 21 | ✓ |
| HSV-2026-00167 Phương Nam Xanh 45 tỷ (warm) | Needs Info | Chưa có CIC, AML, BCTC; > 20 tỷ nên kiểm toán bắt buộc; Cấp 2 | Không có BCTC, CIC, KYC | ✓ |
| LA-…94F17573 Mekong Flex 25 tỷ | Needs Info | Chưa có AML; BCTC kiểm toán > 20 tỷ | Không có KYC | ✓ |
| LA-…387CF62C Mekong Flex 2 tỷ | Needs Info | 0+2 = 2 tỷ, không vượt 20 tỷ; chưa có AML | – | ✓ |
| HSV-2026-00163 Thành Đạt 55 tỷ (warm) | Needs Info | 0+55 → Cấp 2 | – | ✓ |

**Trích dẫn:** §1.2, §3.1, §3.4, §4.1, §4.2, §4.4, §6.1, §6.3, §7.1 đều có trong `agent_engine/rag_corpus/shared_cs_td_sme_2025.md`; "Điều 6 (AML)" và "Điều 7 (CIC)" có trong `compliance_policy.md`. Không gặp điều khoản bịa.

**So sánh: tab và tệp thô** (`recompute.py` trên tệp v8):

| Chỉ số | Multi (tự tính) | Single (tự tính) | Tab |
|---|---|---|---|
| (a) độ phủ theo đáp án đăng ký | 70,7% | 52,0% | 70,7% ± 15,7% / 52,0% ± 15,2% |
| (b) không tính tổng cấp và yêu cầu BCTC | 98,3% | 67,5% | 98,3% / 67,5% |
| Trích nguồn đúng | 94,2% | 88,3% | 94,2% / 88,3% |
| Đúng cổng | 30/30 | 18/30 | 100% / 60% ± 49,8% |
| Phát hiện sai | 0 | 1/30 | 0,00 / 0,03 ± 0,18 |
| Độ trễ | 38,0 s | 42,0 s | 38,0 / 42,0 giây |
| Chi phí mỗi lượt | 0,00348 USD | 0,00244 USD | 0,0035 / 0,0024 USD, "Đội agent kém hơn" |

**Câu hỏi khó giám khảo có thể hỏi và hệ thống trả lời tới đâu:**
1. *"Lợi thế đúng cổng có phải nhờ nhiều agent không?"* Tab và §15.6 đã tự trả lời: phần lớn nhờ cổng tất định; ablation §8.1 cho thấy multi không cổng chỉ được 83%. Trả lời trung thực.
2. *"Vì sao độ phủ (a) chỉ 70,7%?"* Tab giải thích đáp án đăng ký viết theo luật tổng cấp cũ; dòng (b) được đánh dấu là số tham khảo. Đủ, nhưng giám khảo có thể đòi một lần đo với đáp án mới (để lần đo sau).
3. *"Agent có tự chọn công cụ không, hay hệ thống gọi hộ?"* Trace phân biệt "Agent tự gọi" và "system gọi bù". Trả lời được.
4. *"Hai chuyên gia mâu thuẫn số thì sao?"* Ca 187 cho thấy Validation phản biện và dùng số tính lại. Trả lời được.
5. *"Hỏi chat: hồ sơ vi phạm điều khoản nào?"* **Chưa trả lời được đúng** (S02).
6. *"Hỏi chỉ số ngay sau khi phân tích lại có ra cùng số không?"* **Chưa ổn** (S03).
7. *"Ai không được chạy agent, ai không được quyết định?"* Mọi vai sai đều bị 403/404 bằng câu tiếng Việt, có lý do trên giao diện. Trả lời được.

## Chat (15 câu)

| Vai, hồ sơ | Câu | Kết quả |
|---|---|---|
| `tdinh` 187 | Cấp phê duyệt và vì sao | Đúng (Cấp 2, 80 tỷ, không cộng TCTD khác, §3.1, §3.4) |
| `tdinh` 187 | Kết luận | Đúng; còn chữ hoa (Q04) |
| `kiemtoan` 187 | Kết luận / "phân tích lại" | Đúng chỉ đọc / 403 có câu tiếng Việt |
| `truongphong` 167 | Kết luận / DSCR | Đúng / "chưa có BCTC nên chưa tính được", đúng DB |
| `pheduyet` 163 | Thẩm quyền | Đúng (0+55, Cấp 2, §3.1) |
| `giamdoc` 201 (nút "Trợ lý AI" trên trang hồ sơ) | Kết luận / thẩm quyền | "Chưa có hồ sơ khách hàng nào được chọn" (S04) |
| `ruiro` 176 | Vi phạm điều khoản nào | Sai hướng (S02) |
| `ruiro` 176 | Thời tiết Hà Nội | Từ chối ngoài phạm vi, gợi ý câu đúng phạm vi, 0,2 s |
| `qhkh` 201 | "Phân tích lại hồ sơ này" | Chạy cả đội 44 s; kết luận sạch nhãn hoa; số khớp DB |
| `qhkh` 201 | Kết luận | Đúng, nêu phép tính 50/5 |
| `qhkh` 201 | Nợ vay/EBITDA | 7,0 lần trước cấp (đúng DB) nhưng nói đội agent "chưa nêu chỉ số này" (S03) |
| `pheduyet`, API | Hội thoại PATCH sang khách ngoài phạm vi rồi hỏi | PATCH 200, gửi câu hỏi 403 `ACCESS_DENIED`: không lộ dữ liệu (Cần xác nhận 11) |

403 khi mở chat trên hồ sơ không xem được: `pa.spec`, mỗi vai 7 hồ sơ.
- Mọi cặp có GET hồ sơ 404/403 thì tạo hội thoại gắn hồ sơ đó đều bị 403 `ACCESS_DENIED` tiếng Việt, gồm `httd` DX405, `tdinh` 201/211/DX405, `ruiro` 187/201/211/DX405, `tuanthu`, `pheduyet` và `quantri`.
- Mọi cặp đọc được thì tạo được (201).

## 5 cảnh demo

Chạy theo `docs/agent/demo-data.md`.
- Lần chạy đầu không reset: cảnh 1 vấp vì 187 bị crew khác đưa tới "Đã phê duyệt" (xem Nhiễu môi trường).
- Sau `reset-demo.sh` (rc=0, "ca agent gan ho so: 0, thong bao: 138, outbox cho gui: 0, benchmark_run: 51") chạy lại cảnh 1. Cuối cùng chạy `reset-demo.sh` thêm lần nữa (rc=0). Năm hồ sơ demo đã về trạng thái đầu.

| Cảnh | Vai | Kết quả | Thời gian | Chỗ vấp |
|---|---|---|---|---|
| 1. VinaNova HSV-2026-00187 | `tdinh` | Pending Approval, "Cấp phê duyệt đề xuất: Cấp 2 Hội sở"; `add_disbursement_condition` thành CONFIRMED; thêm `request_documents` cho điều kiện tiên quyết | 53 s + 4 s | Trace còn "ĐỀ XUẤT PHÊ DUYỆT" (Q04) và "= 1.34 (ngưỡng 1.25)" (S05). Ảnh `d1-c1.png`, `d1-c1-confirm.png`, `d1-c1-trace.png`. |
| 2. Việt Tiến HSV-2026-00223 | `tdinh` | Needs Info, `request_documents` "Yêu cầu khách bổ sung 2 mục" | 45 s | – Ảnh `d1-c2.png`. |
| 3. Sông Hàn HSV-2026-00184 | `tdinh` | Rejected, "khách hàng có nợ nhóm 3"; `add_risk_flag` chờ xác nhận | 53 s | – Ảnh `d1-c3.png`. |
| 4. Phú Điền HSV-2026-00196 | `qhkh` tải, `httd` xem | Tải xong 3 s (202); 4 vùng tô sau 10 s | 10 s | Như lần 6: phải bấm vào vùng thì thẻ trường mới hiện. Người trình bày cần biết. Ảnh `d1-c4.png`. |
| 5. Thành Đạt HSV-2026-00163 | `pheduyet` | Modal, bước xác nhận "…Không hoàn tác được…", "Đã phê duyệt", nút Quyết định biến mất | 10 s | – Ảnh `d1-c5.png`. |

Tổng 142 giây (cảnh 1 chạy lại 68 s, cảnh 2–5 lần đầu 74 s cộng phần đăng nhập). Không có lỗi console ngoài cảnh báo antd đã lỗi thời.

## Danh sách lỗi

### S01 · Vừa · Cấp phê duyệt cấp 1, cấp 2, Tuân thủ (mọi vai bị giới hạn phạm vi)

- **Tái hiện:**
  1. Đăng nhập `pheduyet`, mở `/ho-so-vay/94f17573-de8c-4d15-89df-3624e769145d` (luồng A, cấp 2; `pheduyet` chưa từng giữ). Hoặc gọi `GET /api/v1/loan-applications/{id}/overview` với 158, 176, 187, 211.
  2. Hoặc `pheduyet2` mở `/ho-so-vay/75000000-0000-4000-8000-000000000006`.
- **Mong đợi:**
  - C-N5 (chú thích ở `loan_detail_service.py:59`): câu "đã chuyển" chỉ dành cho người có chuông cũ trỏ tới hồ sơ.
  - Người chưa từng liên quan nhận "Không tìm thấy hồ sơ hoặc ngoài phạm vi được xem", như API `GET /loan-applications/{id}` trả `RESOURCE_NOT_FOUND`.
- **Thực tế:**
  - 404 `LOAN_REASSIGNED`, giao diện hiện "Hồ sơ đã chuyển cho người khác – Hồ sơ này không còn ở bước của bạn…", với 5/5 hồ sơ thử. `tuanthu` cũng bị như vậy ở 187 và 211.
  - DB: `approver@` không có dòng `integration.notification` nào cho 94f17573. Bảy dòng của hồ sơ này thuộc approver2, compliance, credit.officer, document.reviewer, risk.
  - Hệ quả: thông tin sai, và lộ việc hồ sơ tồn tại với bất kỳ ai biết mã.
- **Ảnh:** `/tmp/gA/shots/fAd-qd-visible.png`; nhật ký `/tmp/gA/nf.jsonl`.
- **Nghi ngờ:**
  - `backend/app/repositories/loan_detail_repository.py:49-57` chỉ lọc theo `resource_id`, không lọc `employee_id`. Chú thích nói "RLS: chỉ thấy thông báo của chính mình", nhưng `integration.notification` có `relrowsecurity = f` và không có policy nào (SELECT `pg_class`, `pg_policy`).
  - Lời gọi ở `backend/app/services/loan_detail_service.py:60-62`.

### S02 · Vừa · Rủi ro (chat)

- **Tái hiện:**
  1. `ruiro` chạy đội agent ở HSV-2026-00176 (Đại Thành, ca `case_a497f4c81d53`, Needs Info, 10:31).
  2. Từ "Việc của tôi", bấm "Hỏi trợ lý về HSV-2026-00176" và hỏi "Hồ sơ này vi phạm điều khoản chính sách nào? Trích điều khoản."
- **Mong đợi:**
  - Brief: chat trả lời theo loại câu hỏi, có loại "điều khoản".
  - L18 (`engine_conversation_responder.py:352`): còn kết quả hợp lệ thì trả lời từ đó.
  - Ở đây phải nêu §6.1/§6.3 (chưa có CIC), Điều 6 (chưa có AML), §4.1/§6.1 (BCTC kiểm toán bắt buộc vì 80 > 20 tỷ), EBITDA âm, Cấp 2 Hội sở.
- **Thực tế:**
  - "Dữ liệu hiện có không cho thấy hồ sơ vi phạm điều khoản nào trong ba điều khoản được cung cấp… Không có điều khoản nào khác để đối chiếu."
  - Chỉ xét §1.2, §3.4, §4.4.
  - "Chưa có cấp phê duyệt trong dữ liệu."
  - Không có dòng "Dựa trên kết quả phân tích lúc…". Câu "ba điều khoản được cung cấp" làm lộ cách dựng prompt.
- **Ảnh:** `/tmp/gA/shots/ch7-ruiro-1.png`.
- **Nghi ngờ:**
  - Nhánh DIRECT chỉ dùng lại kết quả khi `_METRIC_Q` khớp (`backend/app/services/engine_conversation_responder.py:249`).
  - Regex ở `:142-143` thiếu "điều khoản|vi phạm|chính sách". Vì vậy câu điều khoản chỉ nhận khối RAG `_policy_block` (`:225`).

### S03 · Vừa · QHKH (chat sau "phân tích lại" thật, mục ưu tiên lần 6)

- **Tái hiện:** `qhkh`, "Hỏi trợ lý về HSV-2026-00201", rồi hỏi lần lượt:
  1. "Phân tích lại hồ sơ này": ca mới, Needs Info, "Nợ vay/EBITDA sau cấp 10,00 lần vượt trần 3.5";
  2. "Kết luận của đội agent là gì?": nêu 10,00 lần = 50/5;
  3. "Nợ vay/EBITDA của khách hàng bao nhiêu?".
- **Mong đợi:** câu 3 cùng giá trị với khung đội agent (chú thích ở `engine_conversation_responder.py:250`: "để cùng một giá trị với khung đội agent").
- **Thực tế:** "Nợ vay/EBITDA năm 2025 (hiện hữu, trước khi cấp…) là 7,0 lần… Kết quả phân tích gần nhất của đội agent chưa nêu chỉ số này, chưa có số sau cấp và chưa có ngưỡng". Câu này sai, vì hai câu trước vừa nêu 10,00 lần và trần 3,5.
- **Ảnh:** `/tmp/gA/shots/ch7-qhkh-3.png` (so với `ch7-qhkh-1.png`).
- **Nghi ngờ:**
  - `result_context` với `kind="metric"` trả về ở `backend/app/services/engine_conversation_responder.py:204-205`, trước khi thêm `reason` và `report_text` (`:206-208`).
  - Ca Needs Info không có `package.verdicts`, nên chỉ số đòn bẩy nằm ở `reason` bị bỏ. Prompt chỉ còn 747 ký tự (log `CHAT_TIMING`).

### S04 · Vừa · Giám đốc chi nhánh (chat)

- **Tái hiện:**
  1. `giamdoc` khi "Việc của tôi" trống ("Không có việc đang chờ bạn").
  2. Mở `/ho-so-vay/75000000-0000-4000-8000-000000000006` (xem được, 200), bấm "Trợ lý AI", hỏi "Kết luận của đội agent về hồ sơ này là gì?".
- **Mong đợi:** (d) Mate chốt 13/11: ai xem được hồ sơ thì mở được chat gắn hồ sơ.
- **Thực tế:**
  - "Hiện chưa có hồ sơ khách hàng nào được chọn trong hội thoại…".
  - Không có lối nào trên giao diện để gắn hồ sơ đang xem vào chat. Nút "Hỏi trợ lý về …" chỉ có ở hàng việc.
  - API thì cho phép: `pa.spec` `giamdoc` tạo hội thoại gắn hồ sơ được 201.
- **Ảnh:** `/tmp/gA/shots/ch7-giamdoc-1.png`, `ch7-giamdoc-2.png`.
- **Nghi ngờ:**
  - Ngữ cảnh hồ sơ chỉ được gắn ở `frontend/src/features/my-work/QueueTable.tsx:116-124` (`openWith({type:'case'…})`).
  - Trang chi tiết hồ sơ mở `AiPanel` không kèm `caseId` (`frontend/src/features/ai-panel/AiPanel.tsx:38-39` chọn hội thoại không ngữ cảnh).

### Q04 (sửa một phần) · Nhẹ · Mọi vai xem trace, khung đội agent, chat

- **Tái hiện:** trace `case_d440fb007305` hoặc `case_cdd7964e3cea`, hoặc cảnh 1. Khung đội agent ở DX-2026-00412. Chat "Kết luận…" ở 187.
- **Mong đợi:** căn cứ viết như người, không nhãn cổng viết hoa (Q04 lần 5, lần 6).
- **Thực tế:**
  - "Validation → Planner trả kết quả CẦN BỔ SUNG: thiếu dữ liệu chặn — …";
  - "Quyết định của người duyệt… CẦN BỔ SUNG: …";
  - "ĐỀ XUẤT PHÊ DUYỆT với điều kiện tiên quyết";
  - khung đội agent: "Thiếu dữ liệu chặn, Chưa có kết quả sàng lọc…";
  - chat: "ĐỀ XUẤT PHÊ DUYỆT CÓ ĐIỀU KIỆN".
  Chat sau "phân tích lại" thì đã sạch.
- **Ảnh:** `/tmp/gA/shots/tr-case_d440fb007305.png`, `tr-case_0fa1d51aab60.png`, `ag-MekongDX-panel.png`, `ch7-tdinh-2.png`.
- **Nghi ngờ:**
  - `humanizeGate` (`frontend/src/features/dashboard/agentTrace.ts:303-310`) chỉ áp ở `:300` và `:460`; chưa áp cho dòng luồng "trả kết quả", mục quyết định và khung đội agent trang hồ sơ.
  - Chat DIRECT để LLM chép nguyên nhãn từ `package.recommendation`, vì `plain_gate_label` chỉ áp cho dòng "Kết luận:" ở `engine_conversation_responder.py:189`.

### S05 · Nhẹ · Mọi vai xem trace và chat

- **Tái hiện:** trace cảnh 1, mục Validation. Chat "phân tích lại" ở Phúc Lâm.
- **Mong đợi:** số viết kiểu Việt Nam như phần còn lại của ứng dụng ("1,82 lần", "3,5").
- **Thực tế:** "DSCR chính thức của hồ sơ = 1.34 (… ngưỡng 1.25…)", "(tối đa 3.5)", "vượt trần 3.5", lẫn với "1,82 lần" ngay cạnh.
- **Ảnh:** `/tmp/gA/shots/d1-c1-trace.png`, `ch7-qhkh-1.png`.
- **Nghi ngờ:** `agent_engine/common/facts.py:109` (`:.2f`) và `agent_engine/common/recompute.py:123` (`{lev['max']}`). Test `agent_engine/tests/test_thresholds.py:31` đang khóa dạng dấu chấm, có thể có chủ ý cho máy đọc, nhưng chuỗi này hiện thẳng cho người dùng.

### S06 · Nhẹ · HTTD (thông báo)

- **Tái hiện:** luồng C. Rủi ro "Yêu cầu giải trình" với lý do kết thúc bằng dấu chấm ("Giải trình nguồn tiền trả nợ quý 2."). Xem chuông của `httd`.
- **Mong đợi:** câu thông báo đúng chính tả.
- **Thực tế:** "Nội dung cần giải trình: Giải trình nguồn tiền trả nợ quý 2.." (hai dấu chấm).
- **Ảnh:** `/tmp/gA/shots/fC-httd-explanation.png`.
- **Nghi ngờ:** `infra/database/migrations/V068__explanation_notification_with_reason.sql:15` luôn nối thêm `'.'` sau `btrim(NEW.reason)`.

## Cần xác nhận

Các mục lần 6 chưa có trả lời của captain được giữ nguyên, không tính lỗi, không trừ điểm.
1. **Phúc Lâm kết luận mâu thuẫn.** Không tái hiện: "phân tích lại" ra Needs Info, nhất quán với khung.
2. **VinaNova đề xuất khi TSĐB chưa định giá.** Vẫn "LTV tạm tính 55,2% … giá khai, chưa có chứng thư định giá: cần xác minh"; cảnh 1 ra Pending Approval kèm điều kiện.
3. **`POSSIBLE_MATCH` tính là trúng.** Không đo lại Phú Điền lần này.
4. **Khách không có `kyc_assessment` hiện "Đã xác minh".** Đại Thành và Mekong Flex (không có KYC) nay ghi "chưa có đánh giá KYC/AML trong hệ thống, cần tra cứu trước khi trình". Có vẻ đã hết; chờ captain đóng.
5. **Nhật ký kiểm toán lọc người thực hiện "agent" ra 0 dòng.** Chưa đo lại.
6. **QHKH không nhận thông báo khi hồ sơ chờ Hội đồng.** Còn (luồng D).
7. **QHKH xem được hồ sơ của mình ở mọi bước.** Còn, theo `assigned_employee_id`.
8. *(Lần 6: Kiểm toán chat gắn hồ sơ.)* Đã chốt bằng (d). Bỏ khỏi danh sách.
9. **Tổng quan dashboard gộp lượt e2e và lượt thật** ("383 trên 967 lượt (39,6%)"). Danh sách đã có công tắc "Hiện ca kiểm thử", nhưng tổng quan vẫn đếm cả.
10. **Dữ liệu khách Mekong Flex nhiều hồ sơ e2e.** Là dữ liệu, không phải code.

Mới:

11. **`PATCH /conversations/{id}` nhận `active_customer_id` của khách ngoài phạm vi** (`pheduyet`, `quantri`, `tuanthu` đều được 200). Gửi câu hỏi sau đó thì bị 403 "Customer context is outside the authorized scope", nên không lộ dữ liệu. Nên chặn ngay ở PATCH không? `backend/app/services/conversation_service.py:259-275` không kiểm quyền khách.
12. **Lý do 403 trong `details.reason` là tiếng Anh** ("Customer context is outside the authorized scope"). `message` vẫn là tiếng Việt và giao diện không hiện `details`. Có cần dịch không?
13. **Tuân thủ GET hồ sơ 158/163/176 được 200 nhưng GET khách của hồ sơ đó bị 404**, nên không tạo được chat gắn hồ sơ 158. Ma trận có cho Tuân thủ xem hồ sơ khách không?
14. **Câu chat của `pheduyet` ở 163 ghi "Hiện trạng thái hồ sơ là cần bổ sung, nên chưa thể phê duyệt"** (trạng thái của ca AI), trong khi hồ sơ đang ở bước Phê duyệt và cảnh 5 duyệt được. Có cần tách "trạng thái ca AI" và "bước hồ sơ" trong câu trả lời không?

## Chưa kiểm tra

- **Trang `/quan-tri` (Quản trị chỉ đọc) và nhật ký kiểm toán.** Không đi lại lần này; chỉ thử phân quyền API.
- **Cần xác nhận 3 và 5.** Không đo lại.
- **Chuyển cấp theo nhóm khách hàng liên quan (M04).** Seed không có nhóm liên quan rõ.
- **Chọn lượt "11/11/2026 10:31" ở tab So sánh.** Script không chọn được dù tuỳ chọn có trong danh sách. Có thể do script; không ghi là lỗi.
- **Email thật.** Worker tắt có chủ ý.
- **Benchmark.** Ngoài phạm vi, không chạy lại; chỉ kiểm tệp thô.
- **Chat 5 câu còn lại trong ngân sách.** Để dành.

## Để mọi vai và sản phẩm lên 8,5 còn thiếu gì

**Rủi ro (8,0), vai duy nhất dưới 8,5:**
- Sửa S02 trong `engine_conversation_responder.py`:
  - câu hỏi điều khoản hoặc vi phạm trên hồ sơ đã có lượt chạy cũng phải dùng `_answer_from_latest`, kèm `_policy_block`;
  - không để LLM nói "ba điều khoản được cung cấp".
- Phép kiểm cần có: e2e hỏi "vi phạm điều khoản nào" ở Đại Thành sau một lượt chạy; câu trả lời phải nêu §6.1 (CIC), Điều 6 (AML), §4.1/§6.1 (kiểm toán) và có dòng "Dựa trên kết quả phân tích lúc…".

**Các sản phẩm:** đều ≥ 8,5, không còn mục bắt buộc.

**Để các vai đang ở 8,5 vững hơn ngưỡng (không bắt buộc để ĐẠT, nhưng là lỗi Vừa):**
- S01 (cấp 1, cấp 2): lọc `employee_id = identity.current_employee_id()` trong `had_notification`, hoặc bật RLS cho `integration.notification`.
- S03 (QHKH): đưa `reason` hoặc chỉ số đã tính lại vào bản gọn `kind="metric"` của `result_context`.
- S04 (Giám đốc): trên trang hồ sơ, nút "Trợ lý AI" (hoặc một nút "Hỏi trợ lý về hồ sơ này") mở hội thoại gắn hồ sơ đang xem.
- Q04, S05, S06: chữ hoa nhãn cổng ở trace, khung và chat DIRECT; dấu thập phân; dấu chấm đôi.

## Brief ghi khác thực tế

- Brief có đoạn "Đây là LẦN CHẤM 3"; thực tế đây là lần 7 (mục 5 của Build).
- Acceptance ghi "bảng kiểm lại lỗi lần 5"; bảng ở đây kiểm các lỗi lần 6 (R01, R03, Q03, Q04, R02) như mục 5 của Build yêu cầu.
- Nghi vấn C-N3, "chat chạy lại cả đội" và "trace thô còn số bị phản biện" đều không tái hiện (xem mục Kiểm lại).
- "Crew khác thỉnh thoảng chạy e2e trên cùng DB": đúng, và lần này còn đổi trạng thái hồ sơ demo HSV-2026-00187 (tới "Đã phê duyệt") trong lúc chấm; cần `reset-demo.sh` ngay trước buổi demo.
- `import/duskdash` đi từ `de64f54` lên `bb661b1` trong lúc chấm (chỉ thêm `docs/design/cham-diem-ung-dung-lan-7.md`); không ảnh hưởng chức năng.
