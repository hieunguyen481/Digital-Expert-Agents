# Chấm điểm chức năng – lần 5

Ngày chấm: 13/11/2026, khoảng 02:20–03:50 giờ Việt Nam. Ứng dụng: web `:3000`, API `:8000`, engine chế độ `llm`, nhánh `import/duskdash` tại `be97c77`, DB V067.

Cách chấm:
- Đăng nhập từng vai bằng Playwright trên giao diện thật. Hành động bị cấm thử cả trên giao diện lẫn API.
- Đối chiếu DB chỉ bằng SELECT. Số của đội agent đối chiếu với `agent.case_event`, các bảng `credit.*`, `banking.*`, `customer.*` và `agent_engine/rag_corpus/`.
- Chỉ chấm chức năng, luồng, thông báo, phân quyền và độ rõ của thao tác và nội dung. Không chấm thẩm mỹ.
- Cùng thang 0–10, ngưỡng 8,5 như các lần trước. Không cộng điểm vì đã sửa nhiều. Không tin báo cáo bàn giao của crew `fg`, `fh`, `uj`, `uk`: mọi trạng thái "Đã sửa" dưới đây là tự đo.
- Script, log và ảnh ở `/tmp/g8/` (`specs/*.spec.ts`, `*.jsonl`, `*.log`, `shots/`). Tên ảnh trong báo cáo là tên tệp trong `/tmp/g8/shots/`.
- Mỗi luồng nhiều bước chạy trong `flock /tmp/do-an-e2e.lock`.
- Hồ sơ riêng tự tạo:

  | Luồng | Hồ sơ | Số tiền | Nội dung | Thời gian |
  |---|---|---|---|---|
  | A | `LA-20261112-E820008E` | 25 tỷ | thử vai sai từng bước (giao diện và API), Trưởng phòng chạy đội agent, Tuân thủ, tới cấp 2 | – |
  | A4 | `LA-20261112-219E2C75` | 25 tỷ | phê duyệt có điều kiện ở cấp 2 (`pheduyet2` giữ bước), 422/409 | – |
  | B | `LA-20261112-00AB113F` | 2 tỷ | HTTD trả lại, gia hạn, gửi lại, yêu cầu bổ sung, Thẩm định trả lại, rút, gửi lại sau rút | 84 giây |
  | C | `LA-20261112-0610A568` | 3 tỷ | Rủi ro trả lại, giữ nghi gian lận, yêu cầu giải trình, Phê duyệt trả lại, từ chối | 154 giây |
  | D | `LA-20261112-1B766DD0` | 120 tỷ | Trưởng phòng chuyển người, chờ Hội đồng | 127 giây |
  | E | `LA-20261112-495991AF` | 2 tỷ | đội agent (Thẩm định, Rủi ro chạy lại), phê duyệt có điều kiện cấp 1 | – |

- Đã chạy `flock /tmp/do-an-e2e.lock bash infra/scripts/reset-demo.sh` trước và sau 5 cảnh demo, cả hai rc=0. Lần sau: "ca agent gan ho so: 0, thong bao: 137, outbox cho gui: 0".
- Ngân sách LLM:
  - Đã tiêu 14/15 lượt chạy đội agent: luồng A 1, luồng E 1, `ag1` 5, 3 cảnh demo, 2 lượt do chat "phân tích lại", 2 lượt chạy lại để đo độ ổn định.
  - Đã hỏi 11/30 câu chat.
  - Không gặp 402.
- Worker email tắt và không được bật. Chỉ kiểm thông báo trong ứng dụng và SELECT `integration.notification_delivery` (2 dòng `SENT/EMAIL` từ trước, không phát sinh mới).

## Kết luận

**KHÔNG ĐẠT**, nhưng chỉ còn một điểm dưới ngưỡng:
- Mọi vai từ 8,5 trở lên. Thấp nhất 8,5; cao nhất 9,0 (Trưởng phòng, Quản trị).
- Sản phẩm 1–4 từ 8,5 trở lên. **Sản phẩm 5 (so sánh single và multi) 8,0**: số đo mới nhất là bộ v7 ngày 09/11/2026, chỉ 8 ca, chấm bằng từ khóa. Chính trang So sánh ghi đáp án cũ không còn khớp cách tính tổng cấp tín dụng từ 11/11. Lần này không đo lại vì benchmark nằm ngoài phạm vi.
- Không còn lỗi mức Chặn demo hay Cao. Lỗi Cao duy nhất lần 4 (P03) đã sửa.
- Lỗi mở còn lại đều mức Nhẹ: P06 (còn một phần), Q01–Q06.
- 13/14 mã lỗi lần 4 đã sửa, tự đo lại từng mã. P06 sửa một phần.
- Năm cảnh demo chạy liền mạch trong 180 giây, không vấp lỗi. Kết quả đúng kịch bản `docs/agent/demo-data.md`.

## Kiểm lại lỗi lần 4

| Mã | Mức lần 4 | Trạng thái | Bằng chứng tự đo |
|---|---|---|---|
| P03 | Cao | Đã sửa | `tdinh` bấm "Hỏi trợ lý về HSV-2026-00187" ở Việc của tôi, hỏi EBITDA 2025: "EBITDA năm 2025 của CTCP Bao bì VinaNova là 98 tỷ đồng". Khớp `credit.sme_financial_year`. Đúng ngữ cảnh cả với `pheduyet` (HSV-2026-00167, Phương Nam Xanh), `qhkh` (HSV-2026-00201, Phúc Lâm), `ruiro` (HSV-2026-00176, Đại Thành). Ảnh `ch5-tdinh-1.png`, `ch5-pheduyet-1.png`. |
| P04 | Vừa | Đã sửa | `ruiro` gõ "phân tích lại" ở HSV-2026-00176: route `ORCHESTRATED`, `agent.case_run` 904 → 905, trả đầy đủ kết luận và điểm chính sau 32,6 giây. Câu kế "Kết luận của đội agent là gì?" dùng lại kết quả (route `DIRECT`, không tăng `case_run`). Ảnh `ch5-ruiro-1.png`. |
| P01 | Vừa | Đã sửa | Luồng C: khung yêu cầu của `httd` hiện đúng "Giải trình nguồn tiền trả nợ quý 2.", không còn lý do trả lại cũ. Phần thông báo chưa kèm nội dung tách thành Q05. Ảnh `fC-httd-explanation.png`. |
| P02 | Vừa | Đã sửa | `kiemtoan` lọc nhật ký theo số `LA-20261112-219E2C75` ra 11 dòng, hiện đúng số hồ sơ. Ảnh `au-la.png`. |
| P07 | Vừa | Đã sửa | `qhkh` ở Phúc Lâm hỏi "Nợ vay/EBITDA của hồ sơ này bao nhiêu?": "7,0 lần (hiện hữu, trước khi cấp…). Sau cấp: chưa có số". Hỏi "phân tích lại": chạy 40 giây, trả đủ "Nợ vay/EBITDA sau cấp 10,00 lần vượt trần 3.5 (§4.2)" và các điểm chính. Ảnh `ch5-qhkh-1.png`, `ch5-qhkh-2.png`. |
| N07 | Vừa | Đã sửa | `tdinh` hỏi "Điều 4.1 chính sách tín dụng SME yêu cầu gì?": trả lời đúng §4.1 và §6.1 (khớp `rag_corpus/shared_cs_td_sme_2025.md:17-18`), áp vào hồ sơ 80 tỷ. Không còn 409. Ảnh `ch5-tdinh-3.png`. |
| P06 | Nhẹ | Sửa một phần | Đã hết "validation … valid": thẻ đã xác nhận ghi "Kiểm chứng của Validation…" (`c1c.png`). Còn mã `compliance_policy Điều 6`: trên khung đội agent của luồng A, Đại Thành, Nam Phương, Bắc Hà (`ag1-DaiThanh-panel.png`) và trong câu trả lời "phân tích lại" của `ruiro` (`ch5-ruiro-1.png`). Nguồn `agent_engine/common/facts.py:87`. |
| P05 | Nhẹ | Đã sửa | Hồ sơ D: "Hồ sơ chưa có lượt chạy đội agent." Ảnh `fD-qhkh-team-panel.png`. |
| P08 | Nhẹ | Đã sửa | Thông báo từ chối cho QHKH kèm lý do (`fC-qhkh-final.png`). Lý do khóa "Trình phê duyệt": "Chưa đủ điều kiện: Chưa có Ý kiến Rủi ro; Chưa có Ý kiến Tuân thủ" (`fA-ruiro-before-compliance.png`). Nút "Chuyển" khóa kèm dòng "Chọn người nhận để bật nút Chuyển." (`s5-reassign.png`). |
| P09 | Nhẹ | Đã sửa | Cảnh 4: vùng Vốn điều lệ hiện "Vốn điều lệ 5 tỷ đồng". Dòng nguồn giữ nguyên văn lớp chữ PDF "Von dieu le: 5.000.000.000 dong" kèm ghi chú nguồn, chấp nhận được. Ảnh `c4b.png`. |
| M10 | Nhẹ | Đã sửa | Hồ sơ D ở Hội đồng: `qhkh`, `tdinh2`, `kiemtoan`, `giamdoc` gọi `decide` nhận 403 tiếng Việt "Bạn không có quyền thực hiện thao tác này." kèm lý do. |
| L17 | Vừa | Đã sửa | Cảnh 1 (hai lượt): hai `add_disbursement_condition` khác ý ("xác nhận lịch trả nợ trước giải ngân", "người đại diện pháp luật chưa có trong hồ sơ"). Lượt chạy lại không đề xuất lại điều kiện đã xác nhận. Ảnh `c1c.png`, `ag2-VinaNova2-panel.png`. |
| N09 | Nhẹ | Đã sửa | Phú Điền: "trùng danh sách, thuộc điều kiện dừng bắt buộc", không còn chữ lặp. Phần tính `POSSIBLE_MATCH` là trúng vẫn để ở Cần xác nhận 3. |
| N12 | Nhẹ | Đã sửa | Luồng C và s3: chữ trên nút có tên cờ, ví dụ "Xử lý cờ: Đề xuất ngoại lệ tài liệu SME-01-CR…". |

Mục "Chưa kiểm tra" lần 4:
- Rủi ro do người không được phép chạy "phân tích lại": đã kiểm. `pheduyet` ở HSV-2026-00167 nhận 403 `AGENT_RUN_NOT_ALLOWED`, câu tiếng Việt hiện trong khung chat, không tăng `case_run`.
- Độ ổn định nhiều lượt trên một hồ sơ: đã kiểm. VinaNova chạy 2 lần đều Pending Approval, Cấp 2 Hội sở. Sông Hàn 2 lần đều Rejected vì CIC nhóm 3.
- TSĐB pháp lý chưa rõ (N05/M07): kiểm một phần. Luật loại TSĐB khi pháp lý chưa `VERIFIED` (`agent_engine/common/recompute.py:25`). Trường An tính đúng trên giá trị đủ điều kiện 28 tỷ. Nhưng định giá chưa xác minh vẫn được dùng (Q01).
- Trace thô của chuyên gia còn số đã bị phản biện: kiểm một phần, xem Q03.
- Chuyển cấp theo nhóm liên quan (M04), email thật: chưa kiểm (xem "Chưa kiểm tra").

## Bảng điểm từng vai

| Vai | Lần 4 | Lần 5 | Hoàn thành việc | Kẹt/lỗi | Thông báo, lý do khóa | Mã thô | Phân quyền |
|---|---|---|---|---|---|---|---|
| QHKH | 8,0 | **8,5** | tạo, nộp, sửa sau trả lại, rút, gửi lại; chạy đội agent ở Thẩm định chờ bổ sung (Phú Điền) và Trả về QHKH (Phúc Lâm, qua chat) | không | trả lại, từ chối, có điều kiện đều kèm lý do | `compliance_policy` khi xem hồ sơ chưa có AML | 403/404 tiếng Việt khi vượt quyền |
| HTTD | 8,0 | **8,5** | kiểm tra, trả lại, gia hạn, chấp nhận giải trình, cảnh 4 xem PDF scan | không | khung giải trình đúng nội dung; chuông chưa kèm nội dung (Q05) | không | không quyết định, không chạy agent |
| Thẩm định | 8,0 | **8,5** | chạy đội, xác nhận đề xuất, yêu cầu bổ sung, trả lại, trình Rủi ro; chat đúng ngữ cảnh, điều khoản | không | đề xuất mới báo chuông | Q04 (căn cứ chữ hoa, dài), P06 | người cũ mất quyền sau khi bị chuyển (404) |
| Rủi ro | 8,0 | **8,5** | ý kiến, trả lại, giữ nghi gian lận, giải trình, chạy lại đội, "phân tích lại" | không | khóa "Trình phê duyệt" nói rõ thiếu gì | `compliance_policy Điều 6` trong chat | khi giữ gian lận không còn nút, API 403 |
| Tuân thủ | 8,0 | **8,5** | nhận việc, ghi ý kiến, xem kết quả đội (chỉ xem, có lý do) | không | chuông báo giao việc | P06 trên khung | không chạy đội (đúng mục (e)) |
| Cấp 1 (`giamdoc`) | 8,5 | **8,5** | phê duyệt có điều kiện, trả lại, từ chối, có bước xác nhận nêu hệ quả | không | câu xác nhận rõ "Không hoàn tác được" | không | hồ sơ cấp 2: "Hồ sơ đang do người khác xử lý", API 403 |
| Cấp 2 (`pheduyet`, `pheduyet2`) | 8,5 | **8,5** | cảnh 5 trong 10 giây, có điều kiện, 422 ngoại lệ chưa quyết, 409 xung đột phiên bản tiếng Việt | không | nút "Ghi quyết định" khóa không gợi ý (Q06) | không | chạy đội: 403 tiếng Việt (đúng ma trận) |
| Trưởng phòng | 8,5 | **9,0** | Hồ sơ của phòng (19 hồ sơ), chuyển người có gợi ý, chạy đội ở bước Phê duyệt, tìm kiếm | không | người nhận và người cũ đều được báo | không | không quyết định |
| Kiểm toán | 8,0 | **8,5** | lọc nhật ký theo hành động, người, số hồ sơ, ngày; tìm hồ sơ | không | – | không | chạy đội 403 `AGENT_RUN_NOT_ALLOWED` tiếng Việt |
| Quản trị | 8,5 | **9,0** | `/quan-tri` chỉ đọc, tên vai tiếng Việt, đổi tài khoản demo (11 vai, có băng báo, nút quay lại) | không | "Bạn không có quyền xem nội dung này" | không | không mở được hồ sơ; tìm kiếm không trả hồ sơ, khách |

Lý do không cho cao hơn:
- QHKH, Thẩm định, Rủi ro, Tuân thủ: còn thấy mã `compliance_policy` (P06) và nội dung "Căn cứ" chữ hoa, rất dài (Q04).
- QHKH: vẫn không nhận thông báo khi hồ sơ chờ Hội đồng (Cần xác nhận 6, không trừ điểm).
- HTTD: chuông "Hồ sơ giao cho bạn … Bước Chờ giải trình" không nói cần giải trình gì (Q05).
- Cấp 2: câu hỏi thẩm quyền trong chat không nêu tên cấp (Q02).
- Cấp 1, Cấp 2: nút khóa không có gợi ý (Q06). Câu "Kết luận của đội agent là gì?" khi chưa có lượt trả "Dữ liệu được cung cấp không có phần kết luận…": đúng sự thật nhưng nghe như lỗi kỹ thuật.
- Kiểm toán: lọc người thực hiện "agent" ra 0 dòng (Cần xác nhận 5, không trừ điểm).

## Bảng 5 sản phẩm của đề bài

| # | Sản phẩm | Lần 4 | Lần 5 | Bằng chứng | Còn thiếu |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 8,0 | **8,5** | Mỗi lượt có Credit, Compliance, Operations (Document khi có tệp), rồi Validation. Kết luận từng chuyên gia khác nhau, đúng chuyên môn. Ví dụ Trường An: Compliance "TSĐB chỉ hỗ trợ tối đa 19,6 tỷ" và Credit "chưa đủ căn cứ trả nợ". Validation phản biện số liệu VinaNova "credit nêu Nợ vay/EBITDA 1,39 lần (tính lại 1,82 lần)". | Q03: bộ đếm "Phản biện: 0 lần" trái với dòng phản biện trên thẻ. |
| 2 | Planner giao việc cho executor | 8,5 | **9,0** | Trace có "Planner giao việc cho đội agent" kèm lý do: "Không có tài liệu đính kèm nên không cần bước trích xuất tài liệu…". Từng dòng "Bộ chạy tác vụ → Compliance giao việc …" và "… trả kết quả". Validation chạy sau, chờ kết quả của Credit, Compliance, Operations. Ảnh `v1-TruongAn-trace.png`. | – |
| 3 | Agent gọi công cụ và hành động thật | 8,0 | **8,5** | Trace ghi 14 lần gọi công cụ MCP mỗi lượt, đánh dấu "Agent tự gọi" hoặc "Hệ thống gọi bù" (`get_bank_exposure`). Đề xuất hành động qua người xác nhận: `add_disbursement_condition` thành CONFIRMED trong 4 giây, ghi lý do người xử lý. Nút khóa khi chưa có lý do. Số đúng DB: Đại Thành doanh thu 395 tỷ, EBITDA −22 tỷ; Trường An TSĐB đủ điều kiện 28 tỷ, LTV 214,3%; Sông Hàn CIC nhóm 3; VinaNova lấy dư nợ CIC 98 tỷ (cao hơn BCTC 56 tỷ, có giải thích). | Q01: LTV VinaNova tính trên giá khai chưa định giá. P06. |
| 4 | Dashboard trace, trạng thái, quyết định | 8,5 | **8,5** | Tổng quan: 905 lượt, 11.075 lần gọi công cụ, 54 lần phản biện, trung bình 44,3 giây, 3,57 USD, phân bổ theo trạng thái và theo agent. Trace có sơ đồ, bảng chung của đội, số tính lại, "Người quyết định, ngoài khung AI". Cấp phê duyệt xem được lượt chạy (C-N3 không tái hiện: `giamdoc` thấy 4 lượt luồng E). | Q03; cảnh báo React lồng `<p>` trong `<summary>` (không ảnh hưởng chức năng). |
| 5 | So sánh single và multi | 8,0 | **8,0** | Tab So sánh: v7, 8 ca × 3 lượt × 2 chế độ. Độ phủ 95,2% so với 88,3%; trích nguồn 100% so với 79,9%; dừng đúng cổng 100% so với 75%; 18,6 giây so với 36,2 giây; 5.921 so với 14.050 token. Có độ lệch chuẩn, cách đo, mô hình dùng, chi phí đo 0,097 USD. | Mẫu nhỏ (8 ca), chấm bằng từ khóa, độ lệch ±11–15%. Đáp án cũ lệch luật tổng cấp tín dụng từ 11/11 (trang tự ghi). Chưa có số đo sau các thay đổi 11–13/11. |

Câu hỏi khó giám khảo có thể hỏi:

| Câu hỏi | Hệ thống trả lời được tới đâu |
|---|---|
| "Agent tự chọn công cụ hay bị code ép gọi?" | Trace ghi từng lần gọi "Agent tự gọi" hoặc "Hệ thống gọi bù" kèm lý do chọn công cụ. Trả lời được. |
| "Nếu hai chuyên gia ra số khác nhau thì sao?" | Validation tính lại từ dữ liệu công cụ và ghi "Phản biện số liệu" (VinaNova 1,39 → 1,82). Nhưng bộ đếm trên trace ghi 0 lần (Q03), giám khảo có thể bắt bẻ. |
| "AI có tự phê duyệt không?" | Không. Đề xuất ở trạng thái "Chờ người xác nhận". Quyết định cuối ở modal của Cấp phê duyệt, có bước xác nhận và nhật ký kiểm toán. Trả lời tốt. |
| "Khoản 50 tỷ ai duyệt?" | Khung đội agent ghi "Cấp 2 Hội sở". Chat chỉ nói "thuộc khoảng 20–100 tỷ", không nêu tên cấp vì §3.1 trong corpus không có tên (Q02). |
| "LTV VinaNova đạt chưa khi TSĐB chưa định giá?" | Trace nói "55,2%, trong ngưỡng"; thẻ đề xuất lại nói "chưa đủ điều kiện tính LTV". Tự mâu thuẫn (Q01). |
| "Bằng chứng multi tốt hơn single?" | Có bảng 6/6 chỉ số hơn hoặc ngang. Mẫu 8 ca, chấm từ khóa, đáp án cũ; giám khảo khó tin là tổng quát. |
| "Câu ngoài phạm vi, xin thông tin bảo mật?" | Từ chối trong 1,4 giây (route REFUSE), gợi ý câu hỏi hợp lệ. Trả lời tốt. |
| "Agent có bịa trích dẫn không?" | Benchmark: 0 trích dẫn ngoài chính sách. Kiểm tay §3.1, §4.1, §4.2, §6.1, §6.3, §7.1 đều có trong `rag_corpus`. |

## 5 cảnh demo

Chạy liền một mạch bằng `specs/d1-demo.spec.ts`, sau `reset-demo.sh` (rc=0). Tổng **180 giây**.

| Cảnh | Hồ sơ | Kỳ vọng (`demo-data.md`) | Thực tế | Thời gian | Chỗ vấp |
|---|---|---|---|---|---|
| 1 | VinaNova HSV-2026-00187, `tdinh` | Pending Approval + `add_disbursement_condition` | Pending Approval, Cấp 2 Hội sở; điều kiện tiên quyết BCTC kiểm toán; 2 điều kiện giải ngân khác ý; xác nhận một điều kiện thành CONFIRMED | chạy 49 giây, xác nhận 4 giây | Khung còn đề xuất "Yêu cầu khách bổ sung 5 mục" song song với phê duyệt, người xem dễ lẫn. Thẻ "Căn cứ" rất dài (Q04). LTV tự mâu thuẫn nếu bị hỏi (Q01). |
| 2 | Việt Tiến HSV-2026-00223 | Needs Info + `request_documents` | Needs Info, "Yêu cầu khách bổ sung 1 mục" (BCTC) | 49 giây | "Căn cứ" mở đầu chữ hoa "CẦN BỔ SUNG: thiếu dữ liệu chặn — …" (Q04). |
| 3 | Sông Hàn HSV-2026-00184 | Rejected vì CIC | Rejected, Validation "CIC nhóm 3: không đủ điều kiện cấp tín dụng", 2 đề xuất ghi cờ rủi ro | 41 giây | – |
| 4 | Phú Điền, `qhkh` tải `scan-ho-so-lat-tam.pdf`, `httd` xem | Tải lên, HTTD thấy vùng tô | Tải 202 sau 3 giây; HTTD thấy 4 vùng, bấm vùng ra "Vốn điều lệ 5 tỷ đồng", có nguồn và độ tin cậy | 10 giây | – |
| 5 | Thành Đạt HSV-2026-00163, `pheduyet` | Quyết định | Phê duyệt 55 tỷ, 12 tháng; câu xác nhận "chuyển sang bước Hoàn tất… Không hoàn tác được"; nút Quyết định biến mất sau khi ghi | 10 giây | – |

Ảnh: `d1-c1.png`, `d1-c1-confirm.png`, `d1-c2.png`, `d1-c3.png`, `d1-c4.png`, `c4b.png`, `d1-c5.png`. Không có lỗi console (ngoài cảnh báo `deprecated` của antd).

## Chat: 11 câu, 4 vai

| Vai, hồ sơ | Câu | Route, thời gian | Đánh giá |
|---|---|---|---|
| `tdinh`, VinaNova | EBITDA 2025 | DIRECT, 6,0 giây | đúng 98 tỷ, có nguồn |
| | Kết luận của đội agent | DIRECT, 9,9 giây | dùng lại lượt 03:10, đúng Cấp 2 Hội sở, không chạy lại |
| | Điều 4.1 | DIRECT, 7,6 giây | đúng §4.1, §6.1 |
| | Thời tiết Hà Nội | REFUSE, 1,4 giây | từ chối, gợi ý câu hợp lệ |
| `pheduyet`, Phương Nam Xanh | Thẩm quyền 50 tỷ | DIRECT, 10,9 giây | nói khoảng 20–100 tỷ, không nêu tên cấp (Q02) |
| | Kết luận | DIRECT, 8,0 giây | hồ sơ chưa có lượt; câu trả lời đúng nhưng lời lẽ kỹ thuật |
| | phân tích lại | 403, 0,2 giây | đúng ma trận, câu tiếng Việt hiện trong khung chat |
| `qhkh`, Phúc Lâm | Nợ vay/EBITDA | DIRECT, 5,2 giây | 7,0 lần, ghi rõ trước khi cấp |
| | phân tích lại | ORCHESTRATED, 40 giây | chạy lượt mới, trả đủ nội dung (P07 đã sửa) |
| `ruiro`, Đại Thành | phân tích lại | ORCHESTRATED, 32,6 giây | chạy lượt mới; lộ `compliance_policy Điều 6` (P06) |
| | Kết luận | DIRECT, 9,1 giây | dùng lại lượt vừa chạy, số khớp DB |

`agent.case_run` chỉ tăng ở hai câu "phân tích lại" (903 → 903 → 904 → 905). Nghi vấn "chat chạy lại cả đội thay vì dùng lại kết quả" không tái hiện.

## Danh sách lỗi

Không có lỗi Chặn demo, Cao hay Vừa. Còn 7 lỗi Nhẹ.

### P06 (còn) · Nhẹ · Mọi vai xem đội agent

- **Tái hiện:** mở khung đội agent của hồ sơ chưa có kết quả sàng lọc AML (Đại Thành, Nam Phương, Bắc Hà, luồng A). Hoặc `ruiro` gõ "phân tích lại" ở Đại Thành.
- **Mong đợi:** không lộ mã kỹ thuật (L07, M10 các lần trước).
- **Thực tế:** "…phải hoàn tất trước khi trình (công cụ tra danh sách đen/trừng phạt; compliance_policy Điều 6)". Cùng lượt, câu trả lời DIRECT lại ghi đúng "chính sách tuân thủ Điều 6".
- **Ảnh:** `ag1-DaiThanh-panel.png`, `ch5-ruiro-1.png`.
- **Nghi ngờ:** `agent_engine/common/facts.py:87` ghép chuỗi `"compliance_policy Điều 6)"`.

### Q01 · Nhẹ · Thẩm định, Cấp phê duyệt (VinaNova)

- **Tái hiện:** `tdinh` chạy đội agent ở VinaNova (cảnh 1), mở trace.
- **Mong đợi:**
  - Một lượt không tự mâu thuẫn.
  - `docs/business/rules.md:122` (F3): LTV VinaNova là "Cần xác minh" vì giá trị lấy từ Phiếu TTKH, chưa đối chiếu chứng thư định giá.
- **Thực tế:**
  - DB: TSĐB của CIF-SME-001 có `declared_value` 145 tỷ, `appraised_value` và `eligible_value` rỗng, `valuation_status = NEEDS_VERIFICATION`.
  - Trace: "Tính lại LTV: đề xuất 80,0 tỷ / … = 55,2% (tối đa 70%, tương ứng 101,5 tỷ); trong ngưỡng LTV".
  - Cùng lượt, đề xuất `request_documents` ghi "Tài sản duy nhất đang chờ xác minh định giá nên chưa đủ điều kiện tính LTV".
- **Ảnh:** `v2-VinaNova-trace.png`, `c1c.png`.
- **Nghi ngờ:**
  - `agent_engine/mcp_core_banking/server.py:265` lấy `declared_value` khi chưa có giá định giá.
  - `agent_engine/common/recompute.py:25` coi là đủ điều kiện mọi tài sản pháp lý `clear` có giá trị > 0, không xét `valuation_status`.
  - Phần nghiệp vụ trùng Cần xác nhận 2 lần 4 nên chỉ tính lỗi Nhẹ về nội dung tự mâu thuẫn, không trừ điểm hai lần.

### Q02 · Nhẹ · Cấp phê duyệt, mọi vai dùng chat

- **Tái hiện:** `pheduyet` mở "Hỏi trợ lý về HSV-2026-00167", hỏi "Khoản vay tổng dư nợ 50 tỷ thuộc thẩm quyền phê duyệt cấp nào?".
- **Mong đợi:** nêu tên cấp như khung đội agent ("Cấp 2 Hội sở"), theo bậc ≤20 / 20–100 / >100 tỷ trong `docs/business/rules.md`.
- **Thực tế:** "Mức 50 tỷ đồng thuộc khoảng 20–100 tỷ đồng… đoạn §3.1 được cung cấp chỉ nêu các ngưỡng, chưa ghi tên cấp phê duyệt tương ứng".
- **Ảnh:** `ch5-pheduyet-1.png`.
- **Nghi ngờ:** `agent_engine/rag_corpus/shared_cs_td_sme_2025.md:12` chỉ có ngưỡng. Tên cấp ở khung đội agent lấy từ cấu hình engine, chat không có nguồn đó.

### Q03 · Nhẹ · Mọi vai xem trace

- **Tái hiện:** mở trace lượt VinaNova (`/dashboard?case=…`), so với thẻ đề xuất trên hồ sơ.
- **Mong đợi:** số phản biện khớp nhau. Sản phẩm 1 của đề bài cần thấy được phối hợp và phản biện.
- **Thực tế:**
  - Trace ghi "Validation kiểm chứng · Phản biện: 0 lần, đã xử lý 0. Các kết luận chuyên gia không mâu thuẫn."
  - Thẻ đề xuất ghi "Phản biện số liệu: credit nêu Nợ vay/EBITDA 1,39 lần (tính lại 1,82 lần)".
  - Kết quả thô của Credit (`agent.case_event` `task_finished`) vẫn giữ 1,39. Phần tóm tắt trên trace không hiện số này. Chưa bấm "Xem đầy đủ" để biết bản thô có hiện không.
- **Ảnh:** `v2-VinaNova-trace.png`, `c1c.png`.
- **Nghi ngờ:** `frontend/src/features/dashboard/components/CaseTrace.tsx:282` chỉ đếm `validation.challenges` (đối chất), không đếm ghi chú lệch số của `agent_engine/common/consistency.py:83`.

### Q04 · Nhẹ · Thẩm định, Cấp phê duyệt

- **Tái hiện:** xem đề xuất `request_documents` ở Việt Tiến, Nam Phương, Bắc Hà, hoặc thẻ `add_disbursement_condition` ở VinaNova.
- **Mong đợi:** căn cứ ngắn, viết như người.
- **Thực tế:**
  - "Căn cứ: CẦN BỔ SUNG: thiếu dữ liệu chặn — Chưa có kết quả tra cứu CIC — phải tra cứu…".
  - Mỗi thẻ ở VinaNova lặp lại nguyên khối "Kiểm chứng của Validation: Đã xác thực 3 kết luận…; Kiểm chứng độc lập bằng công cụ: Tính lại tổng cấp tín dụng…".
- **Ảnh:** `d1-c2.png`, `c1c.png`.
- **Nghi ngờ:** `agent_engine/common/gate.py:28` đưa nhãn cổng chữ hoa vào chuỗi lý do và căn cứ đề xuất dùng lại chuỗi đó.

### Q05 · Nhẹ · HTTD

- **Tái hiện:** luồng C. `ruiro` bấm "Yêu cầu giải trình" với lý do "Giải trình nguồn tiền trả nợ quý 2.", sau đó `httd` xem chuông và hồ sơ.
- **Mong đợi:** thông báo nói cần giải trình gì, như thông báo yêu cầu bổ sung (luồng B có nội dung).
- **Thực tế:**
  - Chuông chỉ ghi "Hồ sơ giao cho bạn … Bước Chờ giải trình".
  - Trên hồ sơ, khung đúng nội dung nhưng tiêu đề "Hồ sơ đang chờ bổ sung", không phải "giải trình".
- **Ảnh:** `fC-httd-explanation.png`.
- **Nghi ngờ:** `frontend/src/features/loan-detail/TodoPanel.tsx:22` gộp mọi `supplement_request` không phải `RETURNED` vào một câu. Chưa xác định dòng tạo thông báo.

### Q06 · Nhẹ · Cấp 1, Cấp 2

- **Tái hiện:** luồng A4. Mở "Quyết định", chưa chọn loại và chưa nhập.
- **Mong đợi:** nút khóa có gợi ý cần điền gì, như nút "Chuyển" đã có.
- **Thực tế:** "Ghi quyết định" khóa, không có dòng gợi ý hay `title`.
- **Ảnh:** `fA4-holder-decide-conditional.png`.
- **Nghi ngờ:** `frontend/src/features/loan-detail/DecisionModal.tsx:80` và vùng nút, không có chuỗi gợi ý.

## Cần xác nhận

Sáu mục lần 4 chưa có trả lời của captain. Giữ nguyên ở đây, không tính lỗi, không trừ điểm:
1. Phúc Lâm kết luận mâu thuẫn. Lần này không tái hiện: hai đường (chat "phân tích lại" và khung) đều Needs Info với Nợ vay/EBITDA sau cấp 10,00 lần.
2. VinaNova đề xuất phê duyệt khi TSĐB 0 đồng đủ điều kiện. Thêm bằng chứng: tài sản 145 tỷ chưa định giá vẫn được tính LTV 55,2% (xem Q01).
3. `POSSIBLE_MATCH` tính là trúng. Còn: Phú Điền (`POSSIBLE_MATCH/HIGH`) bị Rejected, Compliance ghi "trùng danh sách", Validation ghi "có thể trùng… dừng cứng".
4. Khách không có `kyc_assessment` hiện "Đã xác minh". Còn: danh sách khách hàng và chat của `pheduyet` ở Phương Nam Xanh nói "KYC đã xác minh".
5. Nhật ký kiểm toán lọc người thực hiện "agent" ra 0 dòng. Còn.
6. QHKH không nhận thông báo khi hồ sơ chờ Hội đồng. Còn (luồng D).

Mới:
7. `qhkh` tìm "Đại Thành" ở thanh trên thấy và mở được HSV-2026-00176 (đang ở Rủi ro). DB: `assigned_employee_id` của hồ sơ là `credit.officer` nên đúng phạm vi. Ghi để captain biết QHKH xem được hồ sơ của mình ở mọi bước.

## Chưa kiểm tra

- Chuyển cấp theo nhóm khách hàng liên quan (M04): seed không có nhóm liên quan rõ, không đủ thời gian dựng.
- Email thật: worker email tắt có chủ ý. Chỉ SELECT `integration.notification_delivery`.
- Bản thô "Xem đầy đủ" của từng chuyên gia trên trace: chưa bấm mở (liên quan Q03).
- Chat của `giamdoc`: không có hồ sơ cấp 1 đang chờ trong seed sau reset nên không có nút "Hỏi trợ lý về …".
- TSĐB máy móc pháp lý `AI_PROPOSED` và thuê đất của Mekong Flex: luồng E có chạy nhưng `reset-demo` đã xóa ca trước khi đối chiếu chi tiết.
- Benchmark v8: ngoài phạm vi, không chạy.

## Để mọi vai và sản phẩm lên 8,5 còn thiếu gì

Mọi vai đã từ 8,5. Chỉ còn một sản phẩm dưới ngưỡng.

**Sản phẩm 5 – So sánh single và multi (8,0):**
- Đo lại sau các thay đổi 11–13/11, với đáp án đăng ký trước viết theo luật tổng cấp tín dụng hiện hành (trang So sánh tự ghi là đáp án cũ lệch).
- Tăng bộ ca, hoặc ít nhất thêm các ca biên đã thấy ở lần chấm này:
  - TSĐB chưa định giá (VinaNova);
  - `POSSIBLE_MATCH` (Phú Điền);
  - dư nợ CIC khác BCTC;
  - thiếu toàn bộ dữ liệu (Đại Thành, Bắc Hà).
- Ghi rõ giới hạn chấm từ khóa ngay bên kết luận, kèm vài ví dụ lượt chấm tay để giám khảo kiểm.

**Để các vai và sản phẩm 1, 3, 4 vững hơn ngưỡng (không bắt buộc để ĐẠT):**
- Bỏ mã `compliance_policy` (P06).
- Thống nhất LTV khi TSĐB chưa định giá (Q01, chờ trả lời Cần xác nhận 2).
- Đếm phản biện số liệu vào bộ đếm trace (Q03).
- Rút gọn và bỏ chữ hoa ở "Căn cứ" (Q04).
- Thông báo giải trình có nội dung (Q05).
- Nút "Ghi quyết định" có gợi ý (Q06).
- Chat nêu tên cấp phê duyệt (Q02).

## Brief ghi khác thực tế

- Brief ghi "Script lần 4 ở `/tmp/g8/specs`". Thực tế `/tmp/g8` chưa tồn tại, script lần 4 ở `/tmp/g7/specs`. Đã chép sang `/tmp/g8/specs` và sửa đường dẫn.
- Holder bước cấp 2 của hồ sơ mới có thể là `pheduyet2`, không phải `pheduyet`. Script phải dò người giữ bước.
- Giám khảo `gu5` chạy `reset-demo.sh --warm` lúc 02:43 làm đóng bước Phê duyệt của một hồ sơ `LA-` của luồng A. Không tính lỗi ứng dụng.
