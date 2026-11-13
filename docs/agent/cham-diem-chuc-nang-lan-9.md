# Chấm điểm chức năng lần 9 (13/11/2026)

Giám khảo độc lập (crew `gc`, Opus). Đây là lần chấm XÁC NHẬN trên bản cuối, sau khi sửa các lỗi lần 8. Chỉ chấm CHỨC NĂNG, luồng, thông báo, phân quyền, độ rõ của thao tác và nội dung. Không chấm thẩm mỹ. Không sửa code.

**Bản được chấm:**
- HEAD `import/duskdash` `a2fe669` lúc chấm. Trong lúc chấm nhánh lên `5ffe652`, commit này chỉ thêm `docs/design/cham-diem-ung-dung-lan-9.md`, không ảnh hưởng chức năng.
- DB V070, engine chế độ `llm`. Web :3000 chạy từ checkout chính, API :8000, Keycloak :8080.
- `git diff --stat 98600a7..HEAD -- agent_engine`: 1 tệp, là tệp kết quả benchmark lượt đo lại. Engine không đổi sau bản khóa đo lại.

**Cách chấm:**
- Playwright trên giao diện thật, đăng nhập từng vai bằng tài khoản ở `frontend/e2e/helpers.ts`. Mỗi luồng nhiều bước chạy trong `flock /tmp/do-an-e2e.lock`, chạy tiền cảnh, có timeout.
- Thử API trực tiếp cho các việc không được làm.
- Số liệu đối chiếu bằng SELECT chỉ đọc (`default_transaction_read_only=on`).
- Trích dẫn đối chiếu với `agent_engine/rag_corpus`.
- Script ở `/tmp/gc/specs/`, nhật ký `/tmp/gc/*.jsonl`, ảnh ở `/tmp/gc/shots/`.
- Ngân sách LLM đã dùng: 8/8 lượt chạy đội agent, 11/20 câu chat. Không gặp 402.
- Xong việc đã chạy `flock /tmp/do-an-e2e.lock bash infra/scripts/reset-demo.sh` (rc 0: "ho so LA- con nguoi vay: 0, ca agent gan ho so: 0").

**Hồ sơ tự tạo (đã bị reset xóa sau khi chấm; không đụng hồ sơ seed ngoài 5 hồ sơ demo):**

| Luồng | Hồ sơ | Số tiền | Nội dung |
|---|---|---|---|
| A | LA-20261113-AE5E270E | 25 tỷ | Kiểm sai vai ở mọi bước (UI và API). Trưởng phòng chạy đội agent ở Thẩm định. Rủi ro chờ ý kiến. Cấp 2 (`pheduyet2`) phê duyệt có điều kiện kèm 11 ngoại lệ. Giám đốc bị khóa. |
| B | LA-20261113-A73CC25D | 2 tỷ | HTTD trả lại, gia hạn 1 lần, rút quá hạn bị khóa, nộp lại, Thẩm định yêu cầu bổ sung, tải lên, HTTD nhận, Thẩm định trả lại, QHKH rút, rồi gửi lại sau khi rút bị 403. |
| C | LA-20261113-76EFBA3F | 3 tỷ | Tuân thủ nhận việc. Rủi ro bị khóa trình khi thiếu ý kiến. Rủi ro trả lại. Giữ nghi gian lận, nhả, Rủi ro chờ bổ sung, HTTD giải trình. Giám đốc trả bổ sung, rồi từ chối có xác nhận. |
| D | LA-20261113-A07C5E81 | 120 tỷ | Trưởng phòng xem Hồ sơ của phòng, chuyển người (tdinh → tdinh2) có lý do. Hồ sơ chờ Hội đồng: mọi vai không có nút. |
| E | LA-20261113-091AF109 | 2 tỷ | Thẩm định chạy đội agent (Needs Info, có đề xuất `request_documents`). Rủi ro chạy được. Tuân thủ chỉ đọc. Giám đốc phê duyệt có điều kiện. |
| agD | LA-20261113-0DFFDD6E | 8 tỷ | Khách Mekong Flex đã có hồ sơ seed khác. Thẩm định chạy đội agent; QHKH hỏi chat (S14). |
| qd/qd2 | 9bdc35ef… (Nháp) | — | QHKH mở Nháp: `can_run:true`, nút bật. HTTD bị 404. |

## Kết luận

**ĐẠT** theo tiêu chí ở mục 4 của Build, sát ngưỡng.
- Mọi vai từ 8,5 trở lên. QHKH xuống 9,0 → 8,5 vì lỗi mới S14. Thẩm định giữ 8,5 vì S12. Quản trị lên 9,5 vì S10 đã sửa.
- Mọi sản phẩm từ 8,5 trở lên. Sản phẩm 3 (hành động thật) xuống 9,0 → 8,5 vì S12.
- Không có lỗi mức Chặn demo hay Cao.
- Lỗi Vừa còn hai cái, đều mới phát hiện ở lần này:
  - **S12:** đội agent đề xuất "Điều kiện trước giải ngân" là câu nhận xét, không phải điều kiện. Câu "Các chỉ tiêu hiện tính được khác chưa cho thấy vi phạm ngưỡng" đã được xác nhận và ghi vào `credit.pre_disbursement_condition` ngay ở cảnh demo 1.
  - **S14:** QHKH hỏi chat "Hồ sơ này còn thiếu gì để trình?" ở hồ sơ 8 tỷ của Mekong Flex. Chat trả lời về một hồ sơ khác của cùng khách (DX-2026-00412, 80 tỷ, Nháp).
- S09 (lỗi Vừa lần 8) đã sửa phần lớn:
  - 2/3 lượt cảnh 1 có phản biện 1,39 → 1,82.
  - Chat trả lời đúng 1,82 lần và ngưỡng 3,5 ở cả 3 lượt.
  - Lượt còn lại: Credit viết "Nợ sau cấp 136 tỷ/EBITDA 98 tỷ = 1,39 lần". Bộ dò không bắt được cách viết này, nên lượt đó không có phản biện. Gói cuối còn cả hai số trong `findings`. Còn ở mức Nhẹ.
- Rủi ro lớn nhất cho buổi demo:
  - Cảnh 1 có thể hiện "ĐỀ xuất phê duyệt…" (S11).
  - Danh sách "Điều kiện trước giải ngân" có câu vô nghĩa (S12). Người trình bày đừng bấm xác nhận dòng "Các chỉ tiêu hiện tính được khác…".

## Kiểm lại lỗi lần 8

| Mã lần 8 | Mức lần 8 | Trạng thái lần 9 | Bằng chứng tự đo |
|---|---|---|---|
| S09 (đòn bẩy hai số, không phản biện; chat nhắc 1,39) | Vừa | **Sửa một phần** (còn Nhẹ) | Cảnh 1 VinaNova, 3 lượt:<br>• Lượt `case_e829dd0a96d5`: Validation "Phản biện số liệu: credit nêu Nợ vay/EBITDA 1,39 lần (tính lại 1,82 lần)".<br>• Lượt `case_8ca5a0cd6e16`: cùng câu phản biện.<br>• Lượt `case_360a4775aa3b`: Credit "Nợ sau cấp 136 tỷ/EBITDA 98 tỷ = 1,39 lần", không có phản biện. `approval_package_ready` giữ cả dòng 1,39 lẫn dòng "Tính lại … 178,0 tỷ / 98,0 tỷ = 1,82 lần (tối đa 3,5 lần)". Khung và trace chỉ hiện 1,82; JSON gói cuối còn 1,39.<br>• Chat "Nợ vay/EBITDA sau cấp…" ở cả 3 lượt: 1,82 lần, ngưỡng 3,5 lần.<br>• DB: CIC 98 tỷ + đề nghị 80 = 178; EBITDA 2025 98 tỷ; nợ BCTC 56 tỷ (56 + 80 = 136, ra số 1,39 của Credit). |
| S07 ("Q4" lộ ra người dùng) | Nhẹ | **Đã sửa** | Không còn "Q4" ở khung 3 cảnh, trace, chat điều khoản ở 184 (`ch184b`) và chat thẩm quyền ở LA-…AE5E270E. Đếm "Q4" trong văn bản trang = 0. |
| S08 ("≤ 1,000 tỷ") | Nhẹ | **Đã sửa** | Cảnh 2 Việt Tiến: trace trích §1.2 "doanh thu năm ≤ 1.000 tỷ đồng". |
| S10 (Quản trị: QHKH "—" ở dòng chạy phân tích) | Nhẹ | **Đã sửa** | `/quan-tri`, Ma trận quyền, dòng "Chạy phân tích hồ sơ `loan:analyze`": cột QHKH ghi "Theo bước: Nháp, Trả về QHKH, chờ bổ sung" (`k1.jsonl`, ảnh `k1-quantri.png`). |
| Q04 (nhãn cổng viết hoa) | Nhẹ | **Sửa một phần** | Không còn "VƯỢT", "CẦN BỔ SUNG:" ở thẻ kết quả trong chat (`EnginePanel`), khung và trace. Nay lại có "**ĐỀ** xuất phê duyệt với điều kiện tiên quyết" ở khung và trace cảnh 1, cả 3 lượt. Ghi thành S11. |
| S05 (số thập phân kiểu Anh) | Nhẹ | **Sửa một phần** | Khung, trace chính và thẻ chat đã "1,82 lần (tối đa 3,5 lần)". Còn ở trace mục "Chi tiết kỹ thuật (kiểm toán)": "0.0 tỷ + đề xuất 80.0 tỷ = 80.0 tỷ". Câu trả lời ORCHESTRATED ("phân tích lại") chưa đo lại được vì hết lượt chạy. |

## Bảng điểm từng vai

| Vai | Lần 8 | Lần 9 | Việc đã đi và bằng chứng | Trừ điểm |
|---|---|---|---|---|
| QHKH (`qhkh`) | 9,0 | **8,5** | Luồng B: chuông "Hồ sơ bị trả lại… Lý do: Giấy đăng ký kinh doanh bản scan mờ…". Gia hạn "thêm 5 ngày LV", rồi khóa "Hạn bổ sung chỉ được gia hạn 1 lần". "Rút hồ sơ quá hạn" khóa kèm lý do. Chuông "Yêu cầu bổ sung… Nội dung cần bổ sung…", tải lên 202, rút "Đã rút". Gửi lại sau rút: 403 "Chỉ người đang giữ bước…". Nháp mới: `can_run:true`, "Chưa chạy đội agent trên hồ sơ này." Chuông "Có quyết định… bị từ chối. Lý do…" (C) và "phê duyệt có điều kiện" kèm 2 điều kiện (A). Ở bước Hội đồng: "vai trò của bạn không được chạy đội agent ở bước này". | S14 (Vừa): chat trả lời về hồ sơ khác của cùng khách. |
| Hỗ trợ tín dụng (`httd`) | 9,0 | **9,0** | Trả lại có lý do, nhận bổ sung, chuyển Thẩm định (B). Chuông "Nội dung cần giải trình: Giải trình nguồn tiền trả nợ quý 2." (C). Nháp của QHKH: 404 (`qd2`). API sai bước: 403 (A). | — |
| Thẩm định (`tdinh`, `tdinh2`) | 8,5 | **8,5** | Chạy đội agent (E, agD, cảnh 1–3). Đề xuất `request_documents` "Yêu cầu khách bổ sung 5 mục", chuông "Đề xuất mới của đội agent…". Yêu cầu bổ sung, trả lại (B). Chuyển người: `tdinh2` nhận chuông "Trưởng phòng chuyển hồ sơ cho bạn: Cân đối khối lượng…"; `tdinh` cũ thấy "Hồ sơ đã chuyển cho người khác…". | S12 (Vừa): đề xuất điều kiện vô nghĩa mà Thẩm định có thể xác nhận vào DB. S09 sót ở 1/3 lượt (Nhẹ). S11 (Nhẹ). |
| Rủi ro (`ruiro`) | 9,0 | **9,0** | "Trình phê duyệt" khóa "Chưa đủ điều kiện: Chưa có ý kiến Rủi ro; Chưa có ý kiến Tuân thủ". Trả lại: Thẩm định nhận chuông kèm lý do. Giữ nghi gian lận: vai khác mất nút. Nhả, rồi Rủi ro chờ bổ sung. Chạy đội agent bật (E). | — |
| Tuân thủ (`tuanthu`) | 9,0 | **9,0** | Chuông "Cần ý kiến Tuân thủ…". Cho ý kiến (C). Panel agent chỉ đọc, có lý do (E, A). Hồ sơ ngoài phạm vi: 404 (`k1`). | Cần xác nhận 13 (không trừ). |
| Cấp phê duyệt cấp 1 (`pheduyet`) | 9,0 | **9,0** | Cảnh 5: modal có bước xác nhận cho 55 tỷ, ra "Đã phê duyệt". Hồ sơ ngoài phạm vi và hồ sơ Hội đồng: 404, giao diện "Không tìm thấy nội dung…". Chat thẩm quyền. | — |
| Cấp phê duyệt cấp 2 (`pheduyet2`) | 9,0 | **9,0** | A: API không quyết ngoại lệ → 422 `EXCEPTIONS_UNDECIDED`; form rỗng khóa; duyệt 11 ngoại lệ; xác nhận "…25 tỷ đồng (25.000.000.000 đồng)…"; trạng thái "Phê duyệt có điều kiện". Chat thẩm quyền đúng "Cấp 2 Hội sở, §3.1". | — |
| Giám đốc chi nhánh (`giamdoc`) | 9,0 | **9,0** | C: trả bổ sung có xác nhận "…quay lại bước Thẩm định… Hồ sơ chưa bị từ chối." Từ chối có xác nhận "…Không hoàn tác được…". E: phê duyệt có điều kiện. A: nút "Quyết định" khóa với title "Hồ sơ đang do người khác xử lý…", API 403. Trợ lý AI gắn đúng hồ sơ 201 → 163. Tab So sánh. | — |
| Trưởng phòng (`credit.manager`) | 9,0 | **9,0** | Trang chủ "Hồ sơ của phòng 2 quá hạn · 2 bị trả lại · 1 chờ bổ sung". Chuyển người có lý do (D). Chạy đội agent ở Thẩm định (A, `case_58d22ab1f3f2`, 33 s, "Bổ sung BCTC kiểm toán…" đúng với > 20 tỷ). API quyết định: 403. | — |
| Kiểm toán (`kiemtoan`) | 9,0 | **9,0** | Đọc mọi hồ sơ (`pa`). Mọi thao tác ghi: 403 ở mọi bước (A, D). Chat "Phân tích lại" ra 403 `AGENT_RUN_NOT_ALLOWED`, câu tiếng Việt hiện trong chat. Câu thời tiết bị từ chối ngoài phạm vi (0,14 s). | — |
| Quản trị (`quantri`) | 9,0 | **9,5** | `/quan-tri` chỉ đọc: "Quản trị người dùng Chỉ đọc · Quản trị hệ thống không xem được hồ sơ vay"; Ma trận quyền đúng (S10). Hồ sơ, khách, chat: 403 `MISSING_PERMISSION` ở mọi bước. | — |

## Bảng 5 sản phẩm của đề bài

| # | Sản phẩm | Lần 8 | Lần 9 | Bằng chứng | Còn thiếu |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 8,5 | **8,5** | Mỗi lượt có Credit, Compliance, Operations, Document rồi Validation. Kết luận khác nhau đúng chuyên môn:<br>• Sông Hàn: Compliance "Từ chối đề nghị vay do CIC ghi nhận nợ nhóm 3", tổng hợp Rejected.<br>• Việt Tiến: Credit "Cần bổ sung", Compliance "hạn mức bảo đảm tối đa 21 tỷ đồng" (30 × 70%), tổng hợp Needs Info.<br>• VinaNova: Pending Approval, Cấp 2.<br>Phản biện số liệu có ở 2/3 lượt VinaNova. | S09 sót 1/3 lượt. S12: gộp ý kiến chuyên gia sinh "điều kiện" vô nghĩa. |
| 2 | Planner giao việc cho executor | 9,0 | **9,0** | Khung hồ sơ "Planner → Credit Compliance Operations Document → Validation". Trace có Planner giao việc kèm lý do, Validation trả Planner. | — |
| 3 | Agent gọi công cụ, hành động thật | 9,0 | **8,5** | Cảnh 1: xác nhận điều kiện → "Đã xác nhận và thực hiện" sau 4 s, có dòng trong `credit.pre_disbursement_condition`. E: `request_documents` chờ người duyệt, chuông cho người giữ bước. Không có đề xuất nào tự thực hiện khi chưa xác nhận. | S12: nội dung hành động có thể vô nghĩa mà vẫn ghi được. Điều kiện đã ghi không hiện ở đâu trên hồ sơ (Cần xác nhận 16). |
| 4 | Dashboard trace, trạng thái, quyết định | 8,5 | **8,5** | Tổng quan "415 trên 1.029 lượt (40,3%) … Phản biện của Validation 54 lần … Chi phí LLM 4,04…". Trace từng lượt. Liên kết trace từ hồ sơ hoạt động (E). Quyết định của người duyệt nằm cạnh đề xuất. | S11 "ĐỀ xuất". S05 sót "0.0 tỷ" ở mục kỹ thuật. |
| 5 | So sánh single và multi | 8,5 | **8,5** | Kiểm trung thực, đạt hầu hết (mục riêng bên dưới). Tab mặc định lấy lượt đo lại 13/11 15:54; lượt 1 05:08 vẫn chọn được. Có ghi chú "không còn mù chặt". Có danh sách ca multi không hơn (J2, J4, J7, J10). Có dòng "Mô hình đơn lẻ hơn ở 2 chỉ số: độ trễ; chi phí LLM". | S13: §16 viết single "giữ nguyên", nhưng prompt single đổi theo `fcbc57f`. |

### Câu hỏi khó giám khảo cuộc thi có thể hỏi

| Câu hỏi | Hệ thống trả lời được tới đâu |
|---|---|
| "Hai chuyên gia ra hai số khác nhau thì sao?" | Cảnh 1 thường có dòng phản biện "credit nêu 1,39 (tính lại 1,82)". Gói cuối dùng 1,82, chat nêu 1,82 và 3,5. Nhưng 1/3 lượt không có phản biện vì cách viết "Nợ sau cấp …/EBITDA" lọt bộ dò (S09 sót). |
| "Agent tự hành động hay người quyết?" | Rõ: "AI đề xuất – chưa xác nhận", "Đề xuất của đội agent chưa có hiệu lực". Hành động chỉ chạy sau khi người bấm xác nhận. Vai không được phép thì nút khóa kèm lý do. |
| "Đề xuất này có đáng tin không, ai kiểm?" | Có Validation tính lại, cổng tất định, trích điều khoản. Nhưng nội dung điều kiện có lúc vô nghĩa (S12), nên giám khảo bấm vào sẽ thấy. |
| "Multi hơn single bao nhiêu, có công bằng không?" | Tab và §16 nêu số kèm sai số, chỗ multi không hơn, chi phí +56%, trễ chậm hơn, cổng dựa vào `gate.py`, không còn mù chặt. Chỗ còn hở: prompt single có đổi (S13). |
| "Hỏi một câu ngoài ngân hàng?" | Từ chối ngay, 0,14 s. |
| "Vai X có thấy hồ sơ Y không?" | Phân quyền đúng ở mọi bước đã thử, cả UI lẫn API (bảng dưới). |

## Đội agent so với DB và corpus

| Hồ sơ | Ca | Kết quả | Đối chiếu DB / corpus | Khớp |
|---|---|---|---|---|
| HSV-2026-00187 VinaNova 80 tỷ (3 lượt) | `e829…`, `360a…`, `8ca5…` | Pending Approval, Cấp 2 Hội sở; 41 s mỗi lượt | CIC `total_outstanding` 98 tỷ + 80 = 178; EBITDA 2025 98 tỷ → 1,82 ≤ 3,5. TSĐB `declared_value` 145 tỷ, `valuation_status` NEEDS_VERIFICATION → "145,0 tỷ là giá khai, chưa có chứng thư định giá (§7.1)". | Có. Credit dùng nợ BCTC 56 tỷ → 1,39; phản biện ở 2/3 lượt (S09). |
| HSV-2026-00223 Việt Tiến 20 tỷ | `b5652ccef448` | Needs Info | Không có dòng `sme_financial_year` → "chưa có BCTC, chưa tính được Nợ vay/EBITDA". TSĐB 30 tỷ đã định giá → LTV 66,7%, hạn mức bảo đảm 21 tỷ. §1.2 trích "≤ 1.000 tỷ". | Có |
| HSV-2026-00184 Sông Hàn 22 tỷ | `8608fc6b4f32` | Rejected | CIC `debt_group` 3. EBITDA 12, nợ 25 → (25 + 22)/12 = 3,92 > 3,5 (§4.2). 22 > 20 tỷ → BCTC kiểm toán (§4.1, §6.1). Chat: "Điều 7 (Lịch sử tín dụng CIC)… nhóm 3", khớp `compliance_policy.md:9–10`. | Có |
| LA-…091AF109 (E) 2 tỷ | `ce3f37b3bc75` | Needs Info, `request_documents` 5 mục | Hồ sơ mới thiếu tài liệu. | Có |
| LA-…AE5E270E (A) 25 tỷ, Trưởng phòng chạy | `58d22ab1f3f2` | Needs Info, 33 s | > 20 tỷ → "Bổ sung BCTC kiểm toán". Đúng (a) đã chốt. | Có |
| LA-…0DFFDD6E (agD) 8 tỷ, Mekong Flex | `ff2a54bc4964` | Needs Info, 33 s, 2 việc | Khách chưa có KYC → "chưa hoàn tất tra cứu danh sách cảnh báo". | Có |

Lượt đội agent thật lần này phủ 6 hồ sơ khác nhau (8 lượt). Brief yêu cầu ít nhất 8 hồ sơ. Hai hồ sơ còn thiếu không chạy được vì hết ngân sách 8 lượt, do ưu tiên chạy S09 ba lần. Phần bù là 10 ca J1–J10 của lượt đo lại v8 (60 lượt, tệp thô). Tôi đã tính lại số chính từ tệp thô (mục Sản phẩm 5).

## Chat (11/20 câu)

| # | Vai, hồ sơ | Câu hỏi | Kết quả |
|---|---|---|---|
| 1–3 | `tdinh`, 187 (sau mỗi lượt S09) | Nợ vay/EBITDA sau cấp? | Cả 3: 1,82 lần, ngưỡng 3,5 lần (§4.2). Đúng. |
| 4–5 | `tdinh`, 192 (script mở nhầm hồ sơ) | Điều khoản; tổng cấp | Trả lời đúng theo hồ sơ 192. Có lỗi chính tả "hồ sơn" (chữ LLM). |
| 6 | `pheduyet2`, LA-…AE5E270E | Thẩm quyền | "Cấp 2 Hội sở, §3.1, 25 tỷ", chân trang "Dựa trên kết quả phân tích lúc 18:18…". Đúng. |
| 7 | `kiemtoan`, 187 | Phân tích lại | 403 `AGENT_RUN_NOT_ALLOWED`, câu tiếng Việt hiện trong chat. Đúng phân quyền. |
| 8 | `kiemtoan`, 187 | Thời tiết | Từ chối ngoài phạm vi, 0,14 s. Đúng. |
| 9 | `qhkh`, LA-…0DFFDD6E | Hồ sơ này còn thiếu gì để trình? | **Sai hồ sơ (S14):** trả lời về "DX-2026-00412 (80.000.000.000 VND, 12 tháng)… đang ở trạng thái nháp". |
| 10 | `tdinh`, 184 | Vi phạm điều khoản nào? | "Điều 7… nhóm 3… quá hạn 14 tỷ"; 3,92 > 3,5 §4.2; BCTC kiểm toán 22 > 20 (§4.1, §6.1); Cấp 2 §3.1; không có Q4. Đúng. Chưa nêu tên văn bản của "Điều 7" (rất nhẹ). |
| 11 | `tdinh`, 184 | Tổng cấp tín dụng? | 22 tỷ, Cấp 2, §3.4. Khớp DB. |

"Chat chạy lại cả đội thay vì dùng lại kết quả": không tái hiện. Câu chỉ số, điều khoản, thẩm quyền đều trả lời trong vài giây, dựa trên kết quả đã có.

## Phân quyền (UI và API)

| Bước | Vai thử | Kết quả |
|---|---|---|
| CHECKING | qhkh, tdinh, ruiro, pheduyet, kiemtoan, quantri | 403 `ACCESS_DENIED` "Vai trò của bạn không được thực…" hoặc 404 ngoài phạm vi; quantri 403 `MISSING_PERMISSION` |
| APPRAISAL | httd, qhkh, ruiro, tdinh2 (trước khi chuyển), truongphong, kiemtoan | 403 hoặc 404; Trưởng phòng không quyết được |
| RISK_REVIEW | tdinh, pheduyet, qhkh | 403 hoặc 404 |
| APPROVAL (cấp 2) | giamdoc, ruiro, kiemtoan, quantri, tdinh | 403; giamdoc "Chỉ người đang giữ bước xử lý…", nút khóa có title |
| COUNCIL_SESSION | qhkh, tdinh2, giamdoc, kiemtoan, pheduyet, pheduyet2 | 403 hoặc 404, không vai nào có nút |
| Ngoài phạm vi | pheduyet, pheduyet2 với 016/011/001/006/008 | 404, giao diện "Không tìm thấy nội dung…" |

Không lộ mã thô ở giao diện. Mã lỗi chỉ có trong JSON API.

## Năm cảnh demo (sau reset, `tdinh` / `qhkh` / `pheduyet`)

| Cảnh | Hồ sơ | Thời gian | Kết quả | Chỗ vấp |
|---|---|---|---|---|
| 1 | 187 VinaNova | 41 s chạy + 4 s xác nhận | Pending Approval, Cấp 2, phản biện 1,39 → 1,82 | "ĐỀ xuất…" (S11). Danh sách điều kiện có câu vô nghĩa và đã xác nhận được (S12). |
| 2 | 223 Việt Tiến | 41 s | Needs Info, LTV 66,7%, 21 tỷ, §1.2 "≤ 1.000 tỷ" | — |
| 3 | 184 Sông Hàn | 41 s | Rejected, CIC nhóm 3, 3,92 lần, không có Q4 | — |
| 4 | 196 Phú Điền (OCR) | 10 s (tải lên 202 trong 3 s) | 4 vùng OCR | Phải bấm vào vùng mới hiện thẻ (script lúc đầu đọc ra 0 thẻ). Không tính lỗi. |
| 5 | 163 Thành Đạt | 10 s | Modal có bước xác nhận 55 tỷ, ra "Đã phê duyệt" | — |

Tổng 164 s, không có lỗi console. Cảnh 1–3 mỗi cảnh chờ khoảng 41 s cho đội agent; khi trình bày nên nói trong lúc chờ.

## Sản phẩm 5: kiểm trung thực benchmark (không chạy lại)

- `git diff --stat 98600a7..HEAD -- agent_engine`: chỉ 1 tệp, `benchmark_results/20261113T085421Z-v8 đo lại trên bản khóa 98600a7.json`. Đạt.
- Trường `git_commit` của tệp thô là "40d74ed". Đây là commit chỉ có tài liệu; `git diff 98600a7..40d74ed -- agent_engine` rỗng. Đạt.
- `cases_v8.json` đổi lần cuối ở `9ff9ebb` (đăng ký). `grade.py` và `single_agent_runner.py` không có commit sau `735f9a7`. Đạt.
- Số chính tự tính lại từ tệp thô (60 lượt, 3 lượt/ca, tổng chi phí 0,1863 USD), multi so với single:

| Chỉ số | Multi | Single |
|---|---|---|
| Độ phủ (a) | 70,7 ± 15,7 | 54,3 ± 18,2 |
| Độ phủ (b) | 96,7 ± 8,6 | 67,5 ± 27,4 |
| Trích nguồn đúng | 94,2 ± 12,0 | 91,7 ± 14,2 |
| Đúng cổng | 100 | 60,0 ± 49,8 |
| Trễ | 38,7 ± 8,4 s | 34,4 ± 7,1 s |
| Chi phí mỗi lượt | 0,0038 USD | 0,0024 USD |
| Token | 13.528 | 16.252 |
| Phát hiện sai | 0 | 0,03 |

  Các số này khớp §16 và tab So sánh. Chia theo ca cũng khớp §16.3.
- Công bố:
  - Có "Cảnh báo: không còn mù chặt" (§16).
  - Có danh sách ca multi không hơn: J7 recall; J2, J4, J10 bằng; trích J1/J2 thấp hơn; chi phí +56% ở cả 10 ca; trễ chậm hơn 9/10 ca.
  - Có nêu single nhanh hơn ở lượt 2 (42,0 → 34,4 s, ngoài sai số) và nói chưa rõ nguyên nhân.
  - Đạt.
- **Hở (S13, Nhẹ):** §16 và §15.6 ghi "single giữ nguyên". Mục commit đã đổi chỉ tả `fcbc57f` là "bỏ mã … Q4 khỏi chữ hiển thị". Thực tế `fcbc57f` sửa `agent_engine/common/policy_checklist.py:10`, và `single_agent_runner.py:22,32` nhúng `POLICY_CHECKLIST` vào prompt single. Prompt single giữa hai lượt có đổi (", Q4" → "theo quy tắc tính tổng cấp tín dụng, §3.1"). Thay đổi nhỏ, nhưng là một biến chưa công bố bên cạnh độ trễ single thay đổi.

## Danh sách lỗi

Xếp từ nặng tới nhẹ. Không có lỗi Chặn demo hay Cao.

### S12 · Vừa · Thẩm định (người xác nhận), mọi vai xem khung đội agent

- **Tái hiện:** sau reset, `tdinh` mở HSV-2026-00187, bấm "Chạy đội agent", chờ khoảng 41 s. Xem "Yêu cầu bổ sung và điều kiện đội agent đề xuất", rồi xác nhận đề xuất "Điều kiện trước giải ngân".
- **Mong đợi:** điều kiện trước giải ngân phải là việc cụ thể mà khách hoặc ngân hàng làm được. Đó là nội dung của hành động thật (đề bài: agent hành động thật; `docs/business/rules.md:222` Q-V: điều kiện bổ sung trước giải ngân là việc cụ thể như mở tài khoản; Build mục 1 "độ rõ ràng của … nội dung").
- **Thực tế:**
  - Danh sách đề xuất có cả câu nhận xét: "Các chỉ tiêu hiện tính được khác chưa cho thấy vi phạm ngưỡng", "KYB đạt, không có trùng danh sách đen, CIC nhóm 1", "Hồ sơ cần bổ sung trước khi xem xét phê duyệt".
  - Xác nhận câu đầu → "Đã xác nhận và thực hiện". DB có dòng `credit.pre_disbursement_condition` 2026-11-13 10:49:32 UTC, `condition_text` = "Các chỉ tiêu hiện tính được khác chưa cho thấy vi phạm ngưỡng". Dòng này vẫn còn sau reset.
  - Ở hồ sơ khác: "Hạn mức đủ điều kiện hiện tại là 0 đồng", tiền tố "Bổ sung trước giải ngân (không cản trở trình): …".
  - Cả 3 lượt VinaNova đều có.
- **Ảnh:** `/tmp/gc/shots/d1-c1.png`, `d1-c1-confirm.png`.
- **Nghi ngờ:** `agent_engine/common/gate.py:41` (`split_clauses`) tách mọi mệnh đề trong summary của chuyên gia thành "điều kiện". `gate.py:59` (`conditions_summary`) và `gate.py:73` (`reconcile_experts`) gộp mà không lọc câu nhận xét hay câu kết luận "đạt".

### S14 · Vừa · QHKH (và mọi vai hỏi chat ở khách có nhiều hồ sơ)

- **Tái hiện:**
  - Tạo đề xuất mới 8 tỷ, 24 tháng cho Mekong Flex, khách đã có seed DX-2026-00412 80 tỷ. Chuyển Thẩm định và chạy đội agent (`case_ff2a54bc4964`).
  - `qhkh` mở "Trợ lý AI" trên hồ sơ mới (cuộc trò chuyện có `active_loan_application_id` đúng LA-…0DFFDD6E). Hỏi "Hồ sơ này còn thiếu gì để trình?".
- **Mong đợi:** chat gắn hồ sơ trả lời về chính hồ sơ đó (quyết định (d), (h): chat gắn hồ sơ, trả lời từ kết quả đã có).
- **Thực tế:** "…DX-2026-00412 (80.000.000.000 VND, 12 tháng)… đang ở trạng thái nháp…", tức là hồ sơ khác của cùng khách. Người dùng dễ hiểu nhầm hồ sơ đang xem còn thiếu những mục của hồ sơ kia.
- **Ảnh:** `/tmp/gc/shots/chQ-chat-1.png`.
- **Nghi ngờ:**
  - `backend/app/services/llm_conversation_responder.py:385`: `loans = await customers.list_loans(customer_id)` đưa mọi hồ sơ của khách vào ngữ cảnh, không lọc theo `active_loan_application_id`.
  - `backend/app/services/engine_conversation_responder.py:149`: `_METRIC_Q` không bắt "còn thiếu gì / trình", nên không dùng lại kết quả đội agent đã có cho hồ sơ này.
  - Seed chỉ có 1 hồ sơ mỗi khách (0/65 khách có hơn 1), nên 5 cảnh demo không gặp lỗi này. Dùng thật thì sẽ gặp.

### S09 (sót) · Nhẹ · Thẩm định, mọi vai xem cảnh 1

- **Tái hiện:** chạy cảnh 1 VinaNova vài lần. Lượt nào Credit viết "Nợ sau cấp 136 tỷ/EBITDA 98 tỷ = 1,39 lần" thì không có phản biện (`case_360a4775aa3b`).
- **Mong đợi:** số đòn bẩy lệch số tính lại thì có phản biện, và gói cuối chỉ dùng một số (Build mục 5, ưu tiên S09).
- **Thực tế:**
  - Lượt đó không có phản biện. `findings` của `approval_package_ready` giữ cả "1,39 lần" lẫn "1,82 lần".
  - Khung, trace và chat hiện 1,82, nên người dùng không thấy, trừ khi đọc JSON hoặc trace thô.
  - Thuộc mục (l) đã chốt chỉ khi có phản biện. Ở đây số lệch mà không có phản biện, nên tính lỗi, mức Nhẹ vì giao diện đã dùng một số.
- **Ảnh:** `/tmp/gc/case-case_360a4775aa3b.json` (JSON ca; không có ảnh riêng).
- **Nghi ngờ:** `agent_engine/common/consistency.py:39`, `_LEVERAGE` bắt buộc chữ "Nợ vay" (hoặc "Đòn bẩy") trước "/ EBITDA", nên "Nợ sau cấp …/EBITDA" lọt.

### S11 · Nhẹ · Mọi vai xem khung đội agent và trace

- **Tái hiện:** cảnh 1, khung "Kết luận của đội agent" và trace.
- **Mong đợi:** không có nhãn cổng viết hoa (Q04 lần 5–8).
- **Thực tế:** "**ĐỀ** xuất phê duyệt với điều kiện tiên quyết: phải có BCTC kiểm toán…", ở cả 3 lượt.
- **Ảnh:** `/tmp/gc/shots/d1-c1.png`, `d1-c1-trace.png`.
- **Nghi ngờ:**
  - `frontend/src/features/dashboard/agentTrace.ts:343–344`: `scrubStyle` gọi `lowerShouting` (`:340`) trước. Hàm này hạ "XUẤT PHÊ DUYỆT" nhưng bỏ sót chữ đầu câu "ĐỀ", vì lookbehind cần ký tự đứng trước.
  - Sau đó `humanizeGate` (`:310`) cần ít nhất 2 từ hoa liên tiếp, nên không còn bắt được.

### S05 (sót) · Nhẹ · Kiểm toán, mọi vai mở chi tiết trace

- **Tái hiện:** trace cảnh 1, mục "Chi tiết kỹ thuật (kiểm toán)".
- **Mong đợi:** số viết kiểu Việt Nam như phần chính.
- **Thực tế:** "0.0 tỷ + đề xuất 80.0 tỷ = 80.0 tỷ". Phần chính đã viết "178,0 tỷ / 98,0 tỷ = 1,82 lần (tối đa 3,5 lần)".
- **Ảnh:** `/tmp/gc/shots/d1-c1-trace.png`.
- **Nghi ngờ:** mục kỹ thuật hiện chuỗi gốc từ `agent_engine/common/recompute.py`, không qua `decimalVi` (`agentTrace.ts:324`).

### S13 · Nhẹ · Sản phẩm 5 (tab So sánh, `benchmark-v3-research.md` §16)

- **Tái hiện:**
  - `git show fcbc57f -- agent_engine/common/policy_checklist.py`.
  - `grep -n POLICY_CHECKLIST agent_engine/scripts/benchmark/single_agent_runner.py` ra dòng 22 và 32.
- **Mong đợi:** báo cáo công bố mọi thay đổi chạm vào single giữa hai lượt (Build mục 5: "single-agent không đổi giữa hai lượt").
- **Thực tế:** §16 ghi "single giữ nguyên"; mục commit đã đổi ghi `fcbc57f` chỉ đổi "chữ hiển thị". Prompt single có đổi vài chữ.
- **Ảnh:** không có (bằng chứng là git).
- **Nghi ngờ:** `docs/agent/benchmark-v3-research.md:434` và `:499`.

### S15 · Nhẹ · Mọi vai đọc chữ AI

- **Thực tế:**
  - Lặp chữ "nêu nêu" trong một câu phản biện lượt 2 (`case_360a4775aa3b`).
  - "hồ sơn" trong câu trả lời chat 192.
- **Mong đợi:** chữ đúng chính tả.
- **Nghi ngờ:** chữ LLM, không có bước soát. Mức rất nhẹ.

## Cần xác nhận

Các mục lần 8 chưa có trả lời của captain được giữ. Không tính lỗi, không trừ điểm.
1. **Phúc Lâm kết luận mâu thuẫn.** Không đo lại.
2. **VinaNova đề xuất khi TSĐB chưa định giá.** Còn. Cảnh 1 vẫn Pending Approval dù TSĐB 145 tỷ NEEDS_VERIFICATION, và có điều kiện "định giá tài sản bảo đảm trước giải ngân".
3. **`POSSIBLE_MATCH` tính là trúng.** Không đo lại.
4. **Khách không có `kyc_assessment` hiện "Đã xác minh".** Không gặp. Mekong Flex ghi "chưa hoàn tất tra cứu danh sách cảnh báo".
5. **Nhật ký kiểm toán lọc người thực hiện "agent" ra 0 dòng.** Không đo lại.
6. **QHKH không nhận thông báo khi hồ sơ chờ Hội đồng.** Còn. Luồng D: `integration.notification` cho LA-…A07C5E81 không có dòng nào gửi `credit.officer`.
7. **QHKH xem được hồ sơ của mình ở mọi bước.** Còn.
9. **Tổng quan dashboard gộp lượt e2e và lượt thật.** Còn ("415 trên 1.029 lượt").
10. **Dữ liệu khách Mekong Flex nhiều hồ sơ e2e.** Là dữ liệu. Đây cũng là điều kiện gây S14.
12. **`details.reason` của 403 là tiếng Anh.** Không đo lại; giao diện không hiện `details`.
13. **Tuân thủ GET hồ sơ được 200 nhưng GET khách bị 404, chat 403** (158). Còn (`pa.spec`).
15. **Thời gian ca tính cả thời gian chờ người duyệt.** Không đo lại.

Mới:

16. **Điều kiện trước giải ngân đã xác nhận không hiện ở đâu và không bị reset xóa.**
    - `credit.pre_disbursement_condition` của 187 sau reset còn 7 dòng (12/11 16:13 đến 13/11 10:49), đều có `source` "AGENT:…" từ các ca đã bị xóa.
    - Trong `backend/app` và `frontend/src`, ngoài chính kho dữ liệu, không có chỗ nào đọc bảng này: `case_action_repository.py:186` `disbursement_conditions()` không có nơi gọi.
    - `reset-demo-cleanup.sql` không xóa bảng này.
    - Cần captain cho biết: điều kiện đã xác nhận có phải hiện trên hồ sơ (cho QHKH hay người giải ngân) không, và reset có phải dọn bảng này không.

Đã đóng theo các mục đã chốt: 11, 14 (đúng (h)). Hàng đợi `integration.notification_delivery` không có dòng mới cho các hồ sơ tự tạo, vì worker email tắt có chủ ý. Thông báo trong ứng dụng thì có đủ.

## Chưa kiểm tra

- **Hai hồ sơ đa dạng còn thiếu cho đủ 8 hồ sơ chạy đội agent thật.** Hết ngân sách 8 lượt, do chạy S09 ba lần trên 187.
- **QHKH tự chạy đội agent ở Nháp đến khi xong.** Chỉ kiểm quyền: API `can_run:true`, nút bật. Lượt định chạy đã bị script đưa sang Thẩm định trước (lỗi script).
- **Câu ORCHESTRATED "phân tích lại" (S05).** Hết lượt chạy.
- **Cần xác nhận 1, 3, 5, 12, 15.** Không đo lại.
- **Chuyển cấp theo nhóm khách hàng liên quan (M04).** Seed không có nhóm liên quan rõ.
- **Email thật.** Worker tắt có chủ ý.
- **Benchmark.** Ngoài phạm vi, không chạy lại; chỉ kiểm diff, tệp thô, tab và §16.
- **9 câu chat còn lại.** Để dành cho demo.

## Để mọi vai và sản phẩm lên 8,5 còn thiếu gì

**Vai và sản phẩm dưới 8,5:** không còn.
- QHKH 8,5, Thẩm định 8,5, các vai khác 9,0 đến 9,5.
- Sản phẩm 1, 3, 4, 5 ở 8,5; sản phẩm 2 ở 9,0.

**Để các mục đang 8,5 vững hơn:**
- QHKH (S14):
  - Ngữ cảnh chat gắn hồ sơ chỉ đưa hồ sơ đang mở. Hồ sơ khác của khách đưa riêng, có nhãn "hồ sơ khác" (`llm_conversation_responder.py:385`).
  - Thêm "còn thiếu / trình / bổ sung" vào `_METRIC_Q` (`engine_conversation_responder.py:149`) để dùng lại kết quả đội agent.
  - Phép kiểm: khách có 2 hồ sơ, hỏi "Hồ sơ này còn thiếu gì để trình?" phải ra đúng mã hồ sơ đang mở.
- Thẩm định và sản phẩm 3 (S12):
  - Chỉ đưa vào "Điều kiện trước giải ngân" mệnh đề có động từ hành động (bổ sung, cung cấp, mở, định giá, xác nhận…).
  - Bỏ câu kết luận "đạt", "chưa cho thấy vi phạm", "hạn mức … 0 đồng" (`gate.py:41`, `:59`, `:73`).
  - Phép kiểm: 3 lượt cảnh 1, danh sách điều kiện không có câu nhận xét.
- Sản phẩm 1 (S09 sót): `_LEVERAGE` (`consistency.py:39`) nhận "Nợ … /EBITDA … = X lần" không cần chữ "vay". Phép kiểm: 3 lượt cảnh 1 đều có phản biện hoặc chỉ một số đòn bẩy trong `findings`.
- Sản phẩm 4 (S11, S05):
  - Áp `humanizeGate` trước `lowerShouting`, hoặc cho `lowerShouting` bắt từ hoa đầu câu (`agentTrace.ts:340–344`).
  - Áp `decimalVi` cho mục "Chi tiết kỹ thuật".
- Sản phẩm 5 (S13): §16 ghi rõ `fcbc57f` có đổi prompt dùng chung cho single (`policy_checklist.py:10` → `single_agent_runner.py:32`).

## Brief ghi khác thực tế

- Brief có đoạn "Đây là LẦN CHẤM 3"; thực tế là lần 9 (mục 5 của Build).
- Acceptance ghi "bảng kiểm lại lỗi lần 5"; bảng ở đây kiểm các lỗi lần 8 như mục 5 của Build yêu cầu.
- Brief ghi "single-agent không đổi giữa hai lượt" là điều cần kiểm. `grade.py`, `single_agent_runner.py`, `cases_v8.json` đúng là không đổi, nhưng prompt single có đổi qua `policy_checklist.py` (S13).
- `graphify-out/graph.json` không có trong worktree này, nên `graphify query` không chạy được; đã dùng grep có phạm vi.
- `import/duskdash` đi từ `a2fe669` lên `5ffe652` trong lúc chấm (chỉ tài liệu thẩm mỹ).
- Crew khác chạy reset trong lúc chấm (187 trở lại Thẩm định). Cần chạy `reset-demo.sh` ngay trước buổi demo. Reset không xóa `credit.pre_disbursement_condition` (Cần xác nhận 16).
