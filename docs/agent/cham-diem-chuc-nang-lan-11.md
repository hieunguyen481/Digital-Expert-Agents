# Chấm điểm chức năng lần 11 (14/11/2026)

Giám khảo độc lập: crew `ge`, Opus. Đây là lần chấm XÁC NHẬN trên bản cuối `28ee04d`, sau khi sửa các lỗi lần 10.

- Chỉ chấm CHỨC NĂNG: luồng, thông báo, phân quyền, độ rõ của thao tác và nội dung.
- Không chấm thẩm mỹ. Không sửa code.

**Bản được chấm:**
- HEAD `mate/ge` `28ee04d`, rẽ từ `import/duskdash`. Có 23 commit trong `6ae6990..28ee04d`.
- DB V070, engine chế độ `llm`. Web :3000 chạy từ checkout chính, API :8000, Keycloak :8080.
- Lệnh `git diff --name-only d58022a..HEAD -- agent_engine` cho đúng 4 tệp kết quả benchmark (1 tệp chính và 3 tệp ở `luot-phu/`). Engine không đổi kể từ bản khóa đo lượt 4.

**Cách chấm:**
- Chạy Playwright trên giao diện thật. Đăng nhập từng vai bằng tài khoản trong `frontend/e2e/helpers.ts`.
- Mỗi luồng nhiều bước chạy trong `flock /tmp/do-an-e2e.lock`, chạy tiền cảnh, timeout 560 s.
- Thử API trực tiếp cho các việc vai đó không được làm.
- Đối chiếu số liệu bằng SELECT chỉ đọc (`default_transaction_read_only=on`). Đối chiếu trích dẫn với `agent_engine/rag_corpus`.
- Script ở `/tmp/ge/specs/`. Nhật ký ở `/tmp/ge/*.jsonl` và `/tmp/ge/*.log`. Ảnh ở `/tmp/ge/shots/`.
- Khi xong đã chạy `flock /tmp/do-an-e2e.lock bash infra/scripts/reset-demo.sh`: rc 0, "ho so LA- con nguoi vay: 0, ca agent gan ho so: 0". Sau đó SELECT cho thấy 187 có 0 điều kiện, cả bảng `credit.pre_disbursement_condition` có 0 dòng.

**Ngân sách LLM: trong giới hạn.**
- Đội agent: **8/8 lượt**. Gồm 3 lượt 187 để đo T02, 3 lượt trong buổi demo (cảnh 1–3), 1 lượt QHKH ở Nháp, 1 lượt Rủi ro.
- Chat: **9/12 câu**. Không gặp 402.
- Bộ đếm `agent.case_run` không dùng để đếm ngân sách được, vì reset xóa cả ca gắn hồ sơ. Đã đếm theo lệnh mình chạy.

**Hồ sơ tự tạo** (reset đã xóa; ngoài 5 hồ sơ demo, không đụng hồ sơ seed nào):

| Luồng | Hồ sơ | Số tiền | Nội dung |
|---|---|---|---|
| A (`fAn`, `fA2`) | LA-20261114-55E87C0D | 25 tỷ | Thử sai vai ở mọi bước, cả UI lẫn API. Rủi ro bị khóa khi chưa có ý kiến Tuân thủ. Ở bước Phê duyệt, `pheduyet2` gọi API không kèm ngoại lệ ra 422, gửi phiên bản cũ ra 409, rồi phê duyệt có điều kiện. |
| B (`fB`) | LA-20261114-1ED6CD9C | 2 tỷ | HTTD trả lại. QHKH gia hạn, nộp lại. Yêu cầu bổ sung, HTTD nhận. Thẩm định trả lại. QHKH rút hồ sơ. |
| C (`fC`) | LA-20261114-C7ECA25D | 3 tỷ | Tuân thủ nhận việc. Rủi ro bị khóa trình rồi trả lại. Giữ nghi gian lận, nhả ra, chờ bổ sung. Giám đốc trả về Thẩm định, sau đó từ chối có bước xác nhận. |
| D (`fD`) | LA-20261114-7CA68715 | 120 tỷ | Trưởng phòng xem "Hồ sơ của phòng", chuyển người (tdinh → tdinh2) có lý do. Hồ sơ chờ Hội đồng. |
| Q (`gqd`) | LA-20261114-679290E8 | 6 tỷ | QHKH chạy đội agent ở Nháp (quyết định 11/11), sau đó hỏi chat 2 câu. |
| R (`gfR`) | LA-20261114-0325630E | 2 tỷ | Rủi ro chạy đội agent. Tuân thủ chỉ đọc. Giám đốc xem dấu vết (C-N3), phê duyệt có điều kiện kèm 11 ngoại lệ. QHKH xem khối điều kiện. |

## Kết luận

**ĐẠT, vẫn sát ngưỡng.**
- Mọi vai và mọi sản phẩm đều từ 8,5 trở lên.
- Không có lỗi mức Chặn demo hay Cao.
- Có 2 lỗi Vừa mới (T09, T10) và 4 lỗi Nhẹ mới (T11–T14).

So với lần 10:
- **Đã sửa, tự đo:** T01, T02 (0/4 lượt 187 còn phản biện về định giá), T03, T04, T06, T08, Cần xác nhận 17 và 18.
- **Sửa gần hết:** T05. Còn sót một mã "(E6)".
- **Sửa một phần:** T07. Điều kiện từ trường phụ đã viết thành việc phải làm. Danh sách vẫn còn mục lặp và mảnh câu hiện trạng.

Hai mục đang đúng 8,5: Thẩm định và Sản phẩm 3. Cả hai bị kéo bởi hai lỗi Vừa mới. Cả hai lỗi đều hiện ngay trên VinaNova (187), hồ sơ của cảnh 1:
- **T09:** thẻ "Yêu cầu khách bổ sung" lẫn việc nội bộ và mảnh câu hiện trạng. Cảnh 1 có 5 mục, trong đó 2 mục không phải tài liệu khách nộp được.
- **T10:** hỏi chat "Vì sao hồ sơ này cần BCTC kiểm toán?" thì nhận câu trả lời "Dữ liệu hiện có không nêu lý do". Trong khi đó chính kết quả đội agent ghi đây là điều kiện tiên quyết theo §4.1, §6.1.

Sản phẩm 1 và Sản phẩm 4 lên 9,0 vì T02, T03, T06, T08 đã sửa.

## Kiểm lại lỗi lần 10

| Mã | Mức lần 10 | Trạng thái | Bằng chứng tự đo |
|---|---|---|---|
| T01 (thẻ ẩn mục, khi xác nhận vẫn gửi đủ) | Vừa | **Đã sửa** | Số mục trên tiêu đề thẻ bằng số phần tử `params.documents` của đề xuất ở 3/3 ca đã mở: `case_33a8ff2c4c40` 4 = 4, `case_38e72df2ef23` 5 = 5, 223 3 = 3. Thân thẻ liệt kê đúng các mục đó (`r187.jsonl`, `d1.jsonl`). Thẻ `add_disbursement_condition` hiện câu đã bỏ chữ "(không chặn trình)". |
| T02 (phản biện sai "chưa có định giá") | Vừa | **Đã sửa** | Bốn lượt cảnh 1 trên 187 (TSĐB chỉ có giá khai): `case_477efdf41a16`, `case_33a8ff2c4c40`, `case_04aad5fcd0e1`, `case_38e72df2ef23` (lượt demo sau reset). **0/4** lượt có dòng phản biện về định giá. Mỗi lượt có đúng 1 phản biện: "credit nêu Nợ vay/EBITDA 1,39 lần (tính lại 1,82 lần)". Ngăn kéo dấu vết ghi "Validation phản biện số liệu 1 lần", khớp với số phản biện (`gtr.log`). |
| T03 (ngưỡng LTV 70% bị đọc thành LTV thực) | Vừa | **Đã sửa** | Gói cuối của 3/3 ca J8 lượt đo bốn trong `agent.case_event` không còn câu "nêu LTV 70%". Cả 187 (0/4) và 37 ca tạo sau 02:29 UTC 14/11 (0/37) cũng không còn. |
| T04 (reset để lại điều kiện mồ côi trên 187) | Vừa | **Đã sửa** | Đã reset hai lần (trước buổi demo, rc 0, 17 s; và cuối buổi chấm). Sau mỗi lần, 187 có 0 dòng `credit.pre_disbursement_condition`. Giao diện hiện "Điều kiện sẽ có sau khi cấp phê duyệt quyết định." (`gpdv`, `d1-c1-pd.png`). |
| T05 (mã tài liệu ở khối Cờ) | Nhẹ | **Đã sửa (còn sót 1 mã)** | Khối Cờ hiện tên tiếng Việt, ví dụ "Đề xuất ngoại lệ tài liệu: Điều lệ công ty đi theo hồ sơ" (`flags.png`). Còn sót mã trong dòng "Sao kê tài khoản 12 tháng; hiệu lực 30 ngày… (E6)" (T14). |
| T06 ("nêu nêu") | Nhẹ | **Đã sửa** | DB: 0/37 ca tạo sau 02:29 UTC 14/11 còn chuỗi "nêu nêu". Ngăn kéo dấu vết của 3 ca 187 cũng không còn (`gtr.log`). |
| T07 (điều kiện là mảnh câu hiện trạng) | Nhẹ | **Sửa một phần** | **Đã sửa:** điều kiện lấy từ trường phụ còn thiếu nay viết thành việc phải làm, ví dụ "Bổ sung thông tin người đại diện pháp luật vào hồ sơ trước giải ngân". **Còn:** (1) Mảnh câu hiện trạng trong danh sách yêu cầu bổ sung ở 2/4 lượt: "Định giá còn chờ xác minh" (`04aad`), "Hạn mức bảo đảm hiện tính bằng 0 do chưa có giá trị định giá đủ điều kiện" (`38e7`, cảnh 1). (2) Mục lặp: "người đại diện" thành hai đề xuất `add_disbursement_condition` riêng, BCTC kiểm toán hai lần, định giá hai lần trong `38e7` (T11). (3) Phần đã biết, chưa sửa: định giá TSĐB nằm ở yêu cầu bổ sung trong 4/4 lượt 187. Ở 223, dù TSĐB đã định giá 30 tỷ, yêu cầu vẫn có "Hoàn thiện hồ sơ pháp lý và định giá tài sản bảo đảm" (1/1). |
| T08 (mã thô ở mục kỹ thuật) | Nhẹ | **Đã sửa** | Không tìm thấy mã thô kiểu `NEEDS_VERIFICATION` trong ngăn kéo dấu vết của 3 ca 187 (`gtr.log` đếm theo regex mã viết hoa có gạch dưới). |
| Cần xác nhận 17 (hồ sơ đã duyệt hiện điều kiện agent chưa xác nhận) | — | **Đã sửa** | `PreDisbursementPanel.tsx:17` không còn nhánh hiện đề xuất chưa xác nhận. Tái hiện ở luồng R: hồ sơ có lượt agent, Giám đốc phê duyệt có điều kiện. QHKH chỉ thấy "Từ quyết định: Mở tài khoản thanh toán trước giải ngân", không thấy dòng "chưa xác nhận" nào (`fR-qhkh-after.png`). |
| Cần xác nhận 18 (bộ đếm "Phản biện 54 lần" đứng yên) | — | **Đã sửa (đổi nhãn)** | Thẻ Tổng quan nay ghi "Đối chất giữa các agent 54 lần; phản biện số liệu xem ở từng lượt" (`gcmp`). Mục "Luồng phối hợp" của dấu vết có dòng "Validation phản biện số liệu 1 lần", khớp với số phản biện của lượt đó. |
| Khối "Điều kiện trước giải ngân" (thay đổi của `ur`) | — | **Đạt** | Chỉ hiện điều kiện đã có người xác nhận, kèm tên và giờ (cảnh 1, `d1-c1-pd.png`). Điều kiện từ quyết định hiện nhãn "Từ quyết định". Gập khi hơn 5 mục: `npx vitest run PreDisbursementPanel` cho 6/6 đạt (7 mục hiện 5 và có nút mở, 5 mục không có nút). Chưa thấy trên giao diện thật vì không hồ sơ nào có hơn 5 điều kiện. |

## Bảng điểm từng vai

| Vai | Lần 10 | Lần 11 | Việc đã đi và bằng chứng | Trừ điểm |
|---|---|---|---|---|
| QHKH (`qhkh`) | 9,0 | **9,0** | **Q:** chạy đội agent ở Nháp (nút bật đúng quyết định 11/11). Ra Needs Info sau 45 s; thẻ yêu cầu 6 mục. Chat trả lời đúng: CIC quá 30 ngày (§6.3), thiếu AML, cấp 1 Giám đốc chi nhánh. **B:** chuông "Hồ sơ bị trả lại… Lý do…", gia hạn, nộp lại, yêu cầu bổ sung có nội dung, rút hồ sơ. **A/C/R:** chuông quyết định kèm lý do ("…bị từ chối. Lý do…", "…phê duyệt có điều kiện. Lý do…"). **D:** panel agent chỉ đọc, có lý do. Mã Nháp hiện "Nháp chưa đánh số". | Chat Nhẹ (T12). Cần xác nhận 6 (không trừ). |
| Hỗ trợ tín dụng (`httd`) | 9,0 | **9,0** | **B:** trả lại có lý do, nhận bổ sung. **C:** chuông "Nội dung cần giải trình…". **A:** gọi API sai bước ra 403. | — |
| Thẩm định (`tdinh`, `tdinh2`) | 8,5 | **8,5** | Chạy đội agent ở cảnh 1–3 và 187 ba lượt. Xác nhận điều kiện xong trong 4 s, dòng mới vào khối kèm tên và giờ. T01, T04, T05 đã sửa. **B:** yêu cầu bổ sung, trả lại. **D:** `tdinh2` nhận chuông "Trưởng phòng chuyển hồ sơ cho bạn: Cân đối…". `tdinh` cũ thấy "Hồ sơ đã chuyển cho người khác". | T09 (Vừa, thẻ yêu cầu bổ sung). T10 (Vừa, chat trả lời sai câu "vì sao"). T11 (Nhẹ, mục lặp). |
| Rủi ro (`ruiro`) | 9,0 | **9,0** | **R:** chạy đội agent ngay trong hồ sơ, ra Needs Info sau 54 s. **C:** "Trình phê duyệt" khóa kèm lý do khi chưa có ý kiến Tuân thủ; trả lại có lý do và tdinh nhận chuông; giữ nghi gian lận ("Tạm dừng nghi gian lận") làm vai khác mất nút, API 403; nhả ra thì sang "Rủi ro – chờ bổ sung". Chat ở 184 trích đúng Điều 7 chính sách Tuân thủ. | Chat Nhẹ (T12): sau khi trích đúng lại nói điều khoản "chưa được tra trực tiếp". |
| Tuân thủ (`tuanthu`) | 9,0 | **9,0** | **A/C:** chuông "Cần ý kiến Tuân thủ…", có dòng trong Việc của tôi. **R:** panel agent chỉ đọc, có lý do. Hồ sơ ngoài phạm vi: 404. | Cần xác nhận 13 (không trừ). |
| Cấp phê duyệt `pheduyet` (tier 2 HO) | 9,0 | **9,0** | **Cảnh 5:** câu xác nhận "…chuyển sang bước Hoàn tất với hạn mức 55 tỷ… Không hoàn tác được"; kết quả "Đã phê duyệt". Chat về thẩm quyền: "Cấp 2 Hội sở… 55 tỷ… §3.1, §3.4". Câu hỏi thời tiết bị REFUSE trong 193 ms. **D:** 404 ở hồ sơ ngoài phạm vi. | — |
| Cấp phê duyệt `pheduyet2` (tier 2 HO) | 9,0 | **9,0** | **A:** gọi API không kèm quyết định ngoại lệ ra 422 `EXCEPTIONS_UNDECIDED`; gửi phiên bản cũ ra 409; phê duyệt có điều kiện kèm 11 ngoại lệ. QHKH nhận chuông "Có quyết định… Lý do…". | — |
| Giám đốc chi nhánh (`giamdoc`) | 9,0 | **9,0** | **C:** trả về Thẩm định (tdinh nhận chuông kèm lý do); từ chối với câu xác nhận "…bị từ chối và kết thúc. Không hoàn tác được". **R:** nhận chuông "Hồ sơ giao cho bạn"; thấy kết quả đội agent và mở được dấu vết (GET 200, C-N3 đạt); phê duyệt có điều kiện kèm 11 ngoại lệ. **D:** 403 ở hồ sơ Hội đồng. Việc của tôi khi trống hiện trạng thái trống rõ ràng. | — |
| Trưởng phòng (`credit.manager`) | 9,0 | **9,0** | **D:** "Hồ sơ của phòng" (19 hồ sơ, cột Người giữ); chuyển người có lý do; người nhận có chuông. **A:** nút chạy đội agent bật ở bước Thẩm định. API quyết định ra 403. | Lần 10 và lần 11 đều chưa chạy thật đội agent (hết ngân sách). Cần xác nhận 19 (không trừ). |
| Kiểm toán (`kiemtoan`) | 9,0 | **9,0** | Đọc được mọi hồ sơ (`gpa`). Nhật ký kiểm toán có 345 dòng, đủ dòng quyết định (`gau`). Mọi thao tác ghi ra 403 ở mọi bước. Đọc được khối điều kiện. Ngăn kéo dấu vết không còn "nêu nêu" hay mã thô. | — |
| Quản trị (`quantri`) | 9,5 | **9,5** | Trang `/quan-tri` ghi "Quản trị người dùng, chỉ đọc". Hồ sơ, khách, điều kiện, quyết định: 403 ở mọi bước (`gpa`, `gpdv`, `gk1`). | — |

**Việc của tôi (`gwk`, 7 vai):** số đếm ở đầu trang khớp số trên các tab. Nhãn hạn đủ dạng. Giám đốc khi trống hiện trạng thái trống.

## Bảng 5 sản phẩm của đề bài

| # | Sản phẩm | Lần 10 | Lần 11 | Bằng chứng | Còn thiếu |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 8,5 | **9,0** | Mỗi lượt có Credit, Compliance, Operations, Document, sau đó Validation. Kết luận khác nhau đúng chuyên môn: 184 Rejected (CIC nhóm 3), 223 Needs Info, 187 Pending Approval 4/4 cấp 2 HO, Mekong Nháp Needs Info, J1–J10 khớp đáp án. Phản biện đòn bẩy đúng 4/4. Không còn phản biện sai về định giá (T02), không còn nhầm ngưỡng LTV (T03), không còn "nêu nêu" (T06). | Cần xác nhận 2 (187 Pending Approval khi TSĐB chưa định giá; không trừ). |
| 2 | Planner giao việc cho executor | 9,0 | **9,0** | Khung hồ sơ hiện "Planner → Credit Compliance Operations Document → Validation → Cấp phê duyệt". Dấu vết có Planner giao việc kèm lý do, và Validation trả về Planner. Tiến độ trực tiếp hiện "N/4 chuyên gia đã xong". | — |
| 3 | Agent gọi công cụ, hành động thật | 8,5 | **8,5** | Người xác nhận thấy đúng danh sách sẽ gửi (T01). Xác nhận điều kiện ghi vào `credit.pre_disbursement_condition` và hiện ở khối kèm người, giờ. Reset sạch (T04). Đề xuất chưa xác nhận không hiện ở hồ sơ đã duyệt (Cần xác nhận 17). Quyền xác nhận đúng vai. Tổng quan ghi 12.888 lần gọi công cụ. | T09 (Vừa): yêu cầu gửi khách lẫn việc nội bộ. T11 (Nhẹ): mục lặp. Phần còn của T07. |
| 4 | Dashboard trace, trạng thái, quyết định | 8,5 | **9,0** | Tổng quan "412 trên 1.032 lượt (39,9%)… Công cụ đã gọi 12.888 lần… Chi phí LLM 4,04 USD". Nhãn "Đối chất giữa các agent". Dòng "Validation phản biện số liệu 1 lần" khớp số phản biện. Liên kết từ hồ sơ mở đúng ca (`/dashboard?case=`). Không còn "nêu nêu" hay mã thô (T06, T08). Người duyệt cấp trên mở được dấu vết (C-N3). | T14 (Nhẹ, "(E6)"). Cần xác nhận 9 (không trừ). |
| 5 | So sánh single và multi | 9,0 | **9,0** | Kiểm trung thực đạt ở mọi mục (xem mục riêng). Tab lấy lượt 4 làm số chính; ba lượt trước vẫn xem được. §18 nêu đủ giới hạn và ghi thẳng sự cố hạ tầng. | T13 (Nhẹ): tab không nói ba lượt J10 được chạy bù; §18 ghi chi phí làm tròn lệch tệp. |

### Câu hỏi khó giám khảo cuộc thi có thể hỏi

1. **"Khi chuyên gia nói sai số, ai bắt và bắt thế nào?"** Trả lời được. Validation tính lại từ công cụ và ghi "credit nêu Nợ vay/EBITDA 1,39 lần (tính lại 1,82 lần)"; gói cuối dùng 1,82 = 178/98. Ở 4/4 lượt 187 chỉ có phản biện đúng này, không còn phản biện sai. Chat cũng giải thích được phản biện, nhưng gọi là "hai điểm" trong khi chỉ có 1 phản biện (T12).
2. **"Agent có tự quyết hay tự hành động không?"** Trả lời được. Không: mọi `action_proposal` chờ người đúng vai xác nhận; vai khác nhận 403 hoặc 404. Quyết định có bước xác nhận "Không hoàn tác được" và được ghi vào nhật ký kiểm toán.
3. **"Cấp nào duyệt hồ sơ này?"** Trả lời được. Gói cuối ghi `required_approver_level` khớp với §3.1 (187 và 163 cấp 2 HO; Mekong 6 tỷ cấp 1 Giám đốc chi nhánh). Chat trả lời đúng tên cấp và kèm §3.4.
4. **"Vì sao hồ sơ này cần BCTC kiểm toán?"** **Không trả lời được qua chat (T10).** Kết quả đội agent có câu trả lời (tổng cấp 80 tỷ > 20 tỷ, theo §4.1, §6.1), nhưng chat nói "Dữ liệu hiện có không nêu lý do". Người trình bày phải mở khung đội agent để chỉ.
5. **"Multi hơn single ở đâu, có trung thực không?"** Trả lời được. Lượt 4 ghi a 0,715 so với 0,528, b 0,983 so với 0,633, cổng 30/30 so với 18/30; multi tốn hơn 51% chi phí mỗi lượt; có ghi các ca multi không hơn. Ba lượt J10 được chạy bù; khi giám khảo hỏi, cần nói rõ việc này vì tab không ghi (T13). Nếu không ghép, multi vẫn hơn (a 0,668 so với 0,526).
6. **"Yêu cầu khách bổ sung do AI soạn có dùng được ngay không?"** **Trả lời được một phần (T09).** Người xác nhận thấy đúng danh sách sẽ gửi. Nhưng ở cảnh 1, danh sách có "Xác nhận giới hạn tập trung ngành theo cấu hình Rủi ro" (việc nội bộ) và "Hạn mức bảo đảm hiện tính bằng 0…" (câu hiện trạng). Người thẩm định phải "Bỏ đề xuất" hoặc chấp nhận gửi nguyên văn; giao diện không cho bỏ từng mục.
7. **"Câu hỏi ngoài phạm vi?"** Trả lời được. Bị từ chối trong 0,19 s và không gọi LLM.
8. **"LTV của khách là bao nhiêu?"** Trả lời được. Với 187, chat nói chưa xác lập vì chưa có định giá, nêu phép tính tham khảo 80/145 = 55,2% và ngưỡng 70% (§7.1). Với 223, ghi 66,7%, ngưỡng 21 tỷ. Cả hai đúng.

## Đội agent so với DB và corpus

Phủ 15 hồ sơ của 15 khách khác nhau:
- 5 hồ sơ có lượt chạy của tôi trên HEAD: 187 (4 lượt), 223, 184, Mekong Nháp (679290E8), 0325630E.
- 10 ca benchmark lượt 4 (CIF-SME-071..080, J1–J10). Chúng chạy trên bản khóa `d58022a`, tức là cùng engine với HEAD.

| Hồ sơ | DB (số tiền, TSĐB, CIC) | Đội agent | Đối chiếu |
|---|---|---|---|
| 187 VinaNova | 80 tỷ; TSĐB khai 145 tỷ, `appraised_value` null, `NEEDS_VERIFICATION`; dư nợ TCTD khác 98 tỷ | 4/4 Pending Approval, `head_office_l2`. Điều kiện tiên quyết là BCTC kiểm toán (§4.1, §6.1). | Cấp đúng: tổng tại ngân hàng 80 tỷ > 20 tỷ. Nợ/EBITDA 1,82 = 178/98, ngưỡng 3,5 (§4.2) đúng. Không còn phản biện về định giá. Yêu cầu bổ sung lẫn việc nội bộ (T09). |
| 223 Việt Tiến | TSĐB APPRAISED 30 tỷ | Needs Info, 1 việc | Tuân thủ ghi LTV 66,7%, ngưỡng 70% = 21 tỷ: đúng (§7.1). Yêu cầu "định giá TSĐB" thừa vì đã có định giá (phần đã biết của T07). |
| 184 Sông Hàn | CIC nợ nhóm 3, quá hạn 14 tỷ | Rejected, `add_risk_flag` HIGH | Đúng `compliance_policy.md` Điều 7 ("nợ nhóm 3 trở lên… không đủ điều kiện cấp tín dụng"). Lần 10 ghi "§6.3" là chưa chính xác: §6.3 nói về hiệu lực tài liệu. Ngoài ra, khung ghi 22 tỷ > 20 tỷ nên BCTC kiểm toán bắt buộc và cấp 2 HO; dư nợ 14 tỷ tại TCTD khác không tính vào cấp, đúng §3.1. |
| Mekong Nháp 679290E8 | 6 tỷ | Needs Info, 6 mục | Cấp 1 Giám đốc chi nhánh (≤ 20 tỷ) đúng. CIC quá 30 ngày (§6.3) và thiếu AML được nêu đúng loại. |
| 0325630E (Rủi ro chạy) | 2 tỷ | Needs Info | Cấp 1 đúng; Giám đốc nhận việc đúng. |
| J1 / J7 / J8 | ≤ 20 tỷ | Pending, `branch_director` | Cấp đúng. J8 (TSĐB APPRAISED 20 tỷ): không còn câu "compliance nêu LTV 70%" (T03 đã sửa). |
| J3 / J9 | > 20 tỷ | Pending, `head_office_l2` | Cấp đúng. |
| J4 | — | Rejected | Khớp đáp án v8. |
| J2, J5, J6, J10 | — | Needs Info | Khớp đáp án v8. |

Các trích dẫn §3.1, §3.4, §4.1, §4.2, §6.1, §6.3, §7.1 của `shared_cs_td_sme_2025.md` và Điều 7 của `compliance_policy.md` đều có trong `agent_engine/rag_corpus` và đúng nội dung.

## Chat (9/12 câu)

| Hội thoại | Câu | Kết quả |
|---|---|---|
| `gqd` qhkh @Mekong Nháp | Kết luận | 18 s. Đúng: CIC quá hạn §6.3–6.4, thiếu AML, cấp 1, Nợ/EBITDA 0,16. Có lỗi chữ "6 tỷ đồng VND" và ngày dạng ISO "2026-10-12" (T12). |
| `gqd` | Thẩm quyền | 11 s. Đúng cấp 1 §3.1, có tách §3.4. Có câu dễ hiểu nhầm "Theo đề xuất của AI (người có thẩm quyền quyết định)" (T12). |
| `gch1` tdinh @187 | Kết luận | 19 s. Đúng: Pending, cấp 2 HO, BCTC kiểm toán §4.1/§6.1, Nợ/EBITDA 1,82, dư nợ TCTD khác không tính vào cấp. |
| `gch1` | Validation phản biện gì | 16 s. Đúng phản biện 1,39 → 1,82, nhưng gọi DSCR là "điểm phản biện thứ hai" trong khi dấu vết ghi 1 lần (T12). |
| `gch1` | LTV và ngưỡng | 10 s. Đúng: chưa xác lập; tham khảo 55,2%; ngưỡng 70% §7.1. |
| `gch1` | Vì sao cần BCTC kiểm toán | 8 s. **Sai (T10):** "Dữ liệu hiện có không nêu lý do". Không có chân trang "Dựa trên kết quả phân tích lúc…", tức là không dùng kết quả đội agent. |
| `gch2` pheduyet @163 | Thẩm quyền | 8 s. Đúng: Cấp 2 HO, 55 tỷ, §3.1, §3.4. |
| `gch2` | Thời tiết Hà Nội | REFUSE trong 193 ms, có gợi ý câu hỏi hợp lệ. Đúng. |
| `gch3` ruiro @184 | Điều khoản nợ nhóm 3 | 8 s. Trích đúng Điều 7 chính sách CIC, nhưng sau đó lại nói "chưa được tra trực tiếp… cần đối chiếu nguyên văn" (T12). |

Mọi câu đi `DIRECT`, riêng câu thời tiết đi `REFUSE` (`ai.message.route_type`). `agent.case_run` trước và sau 7 câu `gch*` đều 1034 → 1034, nên không câu nào chạy lại cả đội. Câu trả lời từ kết quả đã có đều kèm thời điểm lượt chạy và hướng dẫn "phân tích lại".

## Phân quyền (UI và API)

- **A, mọi bước:**
  - Vai không giữ bước nhận 403 hoặc 404.
  - Giao diện hiện "Hồ sơ đang do người khác xử lý…" hoặc "Không tìm thấy nội dung…".
  - `quantri` nhận 403 ở mọi bước.
- **Ma trận (`gpa`):** giống lần 10. `tuanthu` GET khách ra 404, chat ra 403 (Cần xác nhận 13).
- **Khối điều kiện (`gpdv`):**
  - Xem được: `qhkh`, `httd`, `tdinh`, `giamdoc`, `kiemtoan`, `truongphong`.
  - `ruiro`, `tuanthu`, `pheduyet`, `pheduyet2` nhận "Không tìm thấy nội dung" ở 187 vì không giữ bước. `quantri` nhận "Bạn không có quyền xem".
  - 163 không có lượt agent nên không có khối.
- **Ngoài phạm vi (`gk1`):** `pheduyet`/`pheduyet2` nhận 404 `LOAN_NOT_FOUND`.
- **Chạy đội agent:** QHKH bật ở Nháp. Rủi ro bật. Tuân thủ chỉ đọc, có lý do "Chỉ Quan hệ khách hàng, Thẩm định, Rủi ro, Tuân thủ hoặc Trưởng phòng mới được chạy đội agent." (`loan_agent_run_service.py:58`, khớp `ma-tran-phan-quyen.md:229`).
- **D, chờ Hội đồng:**
  - Trạng thái "Chờ phiên Hội đồng – có ở đợt 2".
  - `qhkh`, `tdinh2`, `giamdoc`, `kiemtoan` nhận 403 khi quyết định; `pheduyet`, `pheduyet2` nhận 404.
  - Panel agent của QHKH chỉ đọc, có lý do.
- **Giữ nghi gian lận (C):** Rủi ro không có nút, API 403. Lý do giữ vẫn được che với vai khác (đã chốt (b)).

**Thông báo trong ứng dụng:** có đủ CASE_ASSIGNED, COMPLIANCE_OPINION_NEEDED, CASE_DECIDED, CASE_RETURNED, DEADLINE_EXTENDED, yêu cầu bổ sung và yêu cầu giải trình, mỗi loại kèm lý do. Bảng `integration.notification_delivery` không có dòng mới, đúng vì worker email đang tắt có chủ ý.

## Năm cảnh demo (sau reset; `tdinh` / `qhkh` / `pheduyet`)

Tổng thời gian **194 s**, trong đó reset 17 s. 5/5 cảnh chạy được (`d1.jsonl`). Không gặp lỗi bộ đệm vite.

| Cảnh | Thời gian | Kết quả | Vấp |
|---|---|---|---|
| 1 VinaNova 187 | 41 s chạy, 4 s xác nhận | Pending Approval, cấp 2 HO, 80 tỷ. Khối điều kiện trống trước khi chạy (T04 đã sửa). Xác nhận xong thì khối hiện dòng mới kèm tên và giờ. Validation phản biện 1 lần (đòn bẩy). | Thẻ "Yêu cầu khách bổ sung 5 mục" có việc nội bộ, câu hiện trạng và mục lặp về định giá (T09, T11). |
| 2 Việt Tiến 223 | 52 s | Needs Info, 1 việc cần bổ sung. Tuân thủ ghi LTV 66,7%, ngưỡng 21 tỷ. | Yêu cầu định giá TSĐB dù đã định giá (phần đã biết của T07). |
| 3 Sông Hàn 184 | 56 s | Rejected (CIC nhóm 3), cờ HIGH. | — |
| 4 OCR | 3 s tải lên (202), 10 s cả cảnh | Có 4 vùng nhận dạng. Trang 2 cảnh báo "Tài liệu có thể không thuộc khách hàng của hồ sơ (CONG TY TNHH LAT TAM vs Phú Điền)". | Như lần 10: thẻ trường chỉ hiện khi bấm vào vùng; người trình bày cần biết trước. |
| 5 Thành Đạt 163 | 10 s | Câu xác nhận "…chuyển sang bước Hoàn tất với hạn mức 55 tỷ… Không hoàn tác được". Kết quả "Đã phê duyệt". | — |

Ba lượt agent của buổi demo mất khoảng 2,5 phút, hợp với buổi demo.

## Sản phẩm 5: kiểm trung thực benchmark (không chạy lại)

| Kiểm | Kết quả |
|---|---|
| `git diff --name-only d58022a..HEAD -- agent_engine` | Chỉ 4 tệp kết quả: tệp chính `20261114T031611Z-…d58022a.json` và 3 tệp ở `luot-phu/`. Đạt. |
| Tự tính lại số chính lượt 4 từ tệp thô (`/tmp/ge/bench4.out`) | Single: a 0,528 ± 0,194, b 0,633, cite 0,925, cổng 18/30, tỷ lệ phát hiện sai 0,033, trễ 42,9 s, 0,00257 USD/lượt. Multi: a 0,715 ± 0,153, b 0,983, cite 0,931, cổng 30/30, trễ 40,1 s, 0,00387 USD/lượt. Tổng 0,19294 USD. Khớp tab ("71,5% ± 15,3 so với 52,8% ± 19,4"; b 98,3 so với 63,3). Khớp dòng `agent.benchmark_run` (60 lượt, 0 lỗi, chi phí 0,192943). |
| `cases_v8.json`, `grade.py`, single không đổi giữa lượt 3 và lượt 4 | `cases_v8.json` đổi lần cuối ở `9ff9ebb`. `grade.py` không có commit trong `6ae6990..28ee04d`. Các tệp engine đổi ở `d58022a` là `validation_agent.py`, `common/consistency.py`, `common/facts.py` và test. `single_agent_runner.py` chỉ import `config, identity, llm, mcp_client, rag, policy_checklist`, không tệp nào trong số này đổi. Đạt. |
| Bằng chứng lỗi hạ tầng J10 | `agent.case_event` của `case_5bedff17c5c9` và `case_bd27adaf1d35` có `agent_error: Connection error.` rồi chuyển Escalated. Lượt single hỏng có `APIConnectionError: Connection error.` trong tệp gốc. Đúng là lỗi kết nối, không phải chất lượng agent. |
| Chỉ đúng ba lượt bị thay | Tệp chính có đúng 3 dòng mang `infra_rerun_of`: 1 single và 2 multi, đều là J10. Các dòng còn lại trùng tệp gốc. Đạt. |
| Số chính nếu KHÔNG ghép (tự tính từ tệp gốc) | Single (29 lượt có điểm, 1 lượt lỗi không chấm được): a 0,526, b 0,638, cổng 17/29. Multi (30 lượt, 2 lượt hỏng 0/5): a 0,668, b 0,925, cổng 28/30. Như vậy ghép làm multi tăng 4,7 điểm a, 5,8 điểm b và 2 cổng; single gần như không đổi. Kết luận "multi hơn single" vẫn đúng khi không ghép. |
| Ý kiến về việc ghép | **Trung thực:** có luật chạy bù ghi trước ở §18.1; chỉ chạy bù đúng 3 lượt hỏng, mỗi lượt một lần, không chọn điểm; giữ tệp gốc và tệp bù; §18 ghi thẳng mã ca và nói nếu tính cả lượt hỏng thì multi a thấp hơn. **Chưa đủ rõ ở hai chỗ:** (1) §18 không nêu con số khi không ghép (0,668 / 0,925 / 28 trên 30); (2) tab So sánh, nơi giám khảo xem, không nhắc chạy bù (grep `frontend/src` không thấy "chạy bù", "J10" hay "hạ tầng"). Xem T13. |
| §18 có nêu đủ giới hạn | Có: "không còn mù chặt" (`benchmark-v3-research.md:591`); có nêu các chỗ multi không hơn (J7); có câu "chỉ xác nhận các sửa không làm kém đi, không chứng minh các sửa có tác dụng" (`:624`). Chỉ có ô chi phí `:608` ghi "0,00260 / 0,00388 (+49%)", trong khi tệp thô cho 0,002566 / 0,003865 (+51%) (T13). |
| Tab So sánh | Lấy "Bộ ca v8 lần 4" làm số chính; lượt 1–3 vẫn chọn được (`gcmp`, `cmp.png`). |

## Danh sách lỗi

### T09 · Vừa · Thẩm định (người xác nhận), Sản phẩm 3

- **Bước tái hiện:**
  1. Reset demo.
  2. Đăng nhập `tdinh`, mở HSV-2026-00187 và chạy đội agent (cảnh 1).
  3. Xem thẻ `action-proposal[data-kind=request_documents]`.
- **Mong đợi:** "Yêu cầu bổ sung" là danh sách tài liệu hoặc thông tin mà khách phải nộp. Người đúng vai xác nhận rồi gửi đi (`rules.md`, phần đề xuất hành động của đội agent; `user-flows.md`, phần yêu cầu bổ sung). Việc nội bộ của ngân hàng không thuộc danh sách này.
- **Thực tế:** đo trên 4/4 lượt.
  - Lượt demo `case_38e72df2ef23` có thẻ "Yêu cầu khách bổ sung 5 mục":
    - "Xác nhận giới hạn tập trung ngành theo cấu hình Rủi ro trước khi cấp tín dụng": việc nội bộ của Rủi ro.
    - "Phải có BCTC kiểm toán…".
    - "Bổ sung chứng thư định giá hợp lệ và hoàn tất xác minh tài sản".
    - "Hạn mức bảo đảm hiện tính bằng 0 do chưa có giá trị định giá đủ điều kiện": câu hiện trạng.
    - "Yêu cầu bổ sung hồ sơ định giá trước khi áp dụng LTV": lặp với mục định giá ở trên.
  - `case_33a8ff2c4c40`: có "Đối chiếu thời hạn hiệu lực CIC tại ngày trình phê duyệt" (việc nội bộ) và "Loại tài sản chưa hoàn thiện pháp lý hoặc định giá khỏi giá trị bảo đảm đủ điều kiện" (mảnh câu chính sách).
  - Một lượt có "Trình cấp phê duyệt Cấp 2 Hội sở;…".
  - Một tham số có chữ tiếng Anh "inflow".
  - Thẻ chỉ có "Xác nhận" hoặc "Bỏ đề xuất", không bỏ được từng mục. Người thẩm định phải gửi cả danh sách hoặc bỏ cả thẻ.
- **Ảnh:** `/tmp/ge/shots/d1-c1.png`, `/tmp/ge/shots/r187-1.png`. Nội dung đầy đủ ở `/tmp/ge/d1.jsonl` và `/tmp/ge/r187.jsonl`.
- **Nghi ngờ nguyên nhân:**
  - `agent_engine/gateway/proposals.py:183`: nhánh APPROVE lấy mọi `report.conditions` không thuộc giai đoạn giải ngân (`is_pre_decision`) làm "Yêu cầu khách bổ sung". Không lọc việc nội bộ ("xác nhận… cấu hình Rủi ro", "đối chiếu… CIC", "trình cấp…").
  - `is_actionable` (`:38`) cho mảnh câu hiện trạng lọt qua.
  - `similar(…, 0.7)` (`:181`) không bắt được hai câu định giá viết khác chữ.

### T10 · Vừa · Mọi vai hỏi chat gắn hồ sơ (Thẩm định ở cảnh 1)

- **Bước tái hiện:**
  1. `tdinh` mở chat gắn 187 sau khi đội agent đã chạy.
  2. Hỏi "Vì sao hồ sơ này cần BCTC kiểm toán?".
- **Mong đợi:** trả lời từ kết quả đội agent đã có: tổng cấp 80 tỷ > 20 tỷ nên thuộc diện bắt buộc kiểm toán (`shared_cs_td_sme_2025.md` §4.1, §6.1). Gói cuối ghi đúng như vậy. Chat là nơi hỏi về kết luận và điều khoản (brief; `_KIND_GUIDE`).
- **Thực tế:**
  - Sau 8 s, chat trả lời "Dữ liệu hiện có **không nêu lý do** hay quy định nào về việc hồ sơ… cần BCTC kiểm toán… tôi không thể xác nhận yêu cầu này… cần tra cứu quy định nội bộ".
  - Không có chân trang "Dựa trên kết quả phân tích lúc…", nên không dùng kết quả đội agent.
  - Câu trả lời mâu thuẫn với khung đội agent hiện ngay bên cạnh.
  - `route_type` DIRECT.
- **Ảnh:** `/tmp/ge/shots/ch-tdinh-4.png`. Văn bản ở `/tmp/ge/ch.jsonl`.
- **Nghi ngờ nguyên nhân:** `backend/app/services/engine_conversation_responder.py:296`. Chat chỉ trả lời từ kết quả đã có khi câu hỏi khớp `_METRIC_Q` (`:152`). Danh sách từ khóa không có "BCTC", "kiểm toán", "vì sao", "tại sao", "tài liệu", nên câu hỏi rơi xuống nhánh đọc dữ liệu hồ sơ thô.

### T11 · Nhẹ · Thẩm định, Sản phẩm 3

- **Bước tái hiện:** chạy đội agent trên 187 (cảnh 1) và xem các thẻ đề xuất.
- **Mong đợi:** mỗi việc một dòng, không lặp. Brief yêu cầu "mỗi việc một dòng".
- **Thực tế:**
  - `case_38e72df2ef23` có 2 đề xuất `add_disbursement_condition` riêng cùng nói về người đại diện.
  - Cùng ca đó có hai mục về định giá trong một thẻ yêu cầu bổ sung.
  - Có lượt ghi BCTC kiểm toán hai lần (một lần trong yêu cầu bổ sung, một lần trong căn cứ điều kiện).
- **Ảnh:** `/tmp/ge/shots/d1-c1.png`.
- **Nghi ngờ nguyên nhân:** `agent_engine/gateway/proposals.py:181` (ngưỡng `similar` 0,7 trên tập từ đã bỏ từ dừng) và `:134` (`dedupe_items` 0,6). Hai câu cùng ý nhưng khác chữ không bị gộp.

### T12 · Nhẹ · QHKH, Thẩm định, Rủi ro (chat)

- **Bước tái hiện:** các câu trong mục Chat (`gqd`, `gch1`, `gch3`).
- **Mong đợi:** câu trả lời rõ, không gây hiểu nhầm về vai trò của AI, đúng số lần phản biện, dùng định dạng tiền và ngày của ứng dụng.
- **Thực tế:**
  - "Theo đề xuất của AI (người có thẩm quyền quyết định)…" đọc như thể AI có thẩm quyền.
  - "6 tỷ đồng VND".
  - Ngày "2026-10-12".
  - Gọi DSCR là "điểm phản biện thứ hai" trong khi dấu vết ghi "Validation phản biện số liệu 1 lần".
  - Ở 184, chat trích đúng Điều 7 rồi lại nói "chưa được tra trực tiếp… cần đối chiếu nguyên văn".
- **Ảnh:** `/tmp/ge/shots/qd-chat-1.png`, `/tmp/ge/shots/qd-chat-2.png`, `/tmp/ge/shots/ch-tdinh-2.png`, `/tmp/ge/shots/ch-ruiro-1.png`.
- **Nghi ngờ nguyên nhân:** chữ do LLM viết. Lời nhắc ở `backend/app/services/engine_conversation_responder.py:183` (`_KIND_GUIDE`) chưa cấm các dạng này. Riêng Điều 7: khối điều khoản tra thêm (`_POLICY_NOTE`, `:144`) chỉ nói về CS-TD-SME/2025, nên LLM coi điều khoản của `compliance_policy.md` là "chưa tra".

### T13 · Nhẹ · Sản phẩm 5 (tab So sánh, `benchmark-v3-research.md` §18)

- **Bước tái hiện:**
  1. Mở tab So sánh, chọn "Bộ ca v8 lần 4".
  2. Đọc `docs/agent/benchmark-v3-research.md:598,608`.
- **Mong đợi:** con số chính có ghép chạy bù thì nơi giám khảo xem phải nói rõ việc ghép. Số trong tài liệu khớp tệp thô.
- **Thực tế:**
  - Tab không nhắc ba lượt J10 được chạy bù vì lỗi kết nối.
  - §18 có ghi việc ghép nhưng không nêu số khi không ghép (multi a 0,668, b 0,925, cổng 28/30).
  - Ô chi phí ghi "0,00260 / 0,00388 (+49%)"; tệp thô cho 0,002566 / 0,003865 (+51%). Tab hiện đúng 0,0026 / 0,0039.
- **Ảnh:** `/tmp/ge/shots/cmp.png`.
- **Nghi ngờ nguyên nhân:**
  - `frontend/src/features/dashboard/blindRuns.ts`: mục lượt 4 không có ghi chú chạy bù.
  - `docs/agent/benchmark-v3-research.md:608`.

### T14 · Nhẹ · Thẩm định, Kiểm toán (khối Cờ, phần sót của T05)

- **Bước tái hiện:** mở khối Cờ của hồ sơ có ngoại lệ tài liệu sao kê.
- **Mong đợi:** chỉ hiện tên tài liệu tiếng Việt (T05 lần 10).
- **Thực tế:** "Sao kê tài khoản 12 tháng; hiệu lực 30 ngày… (E6)".
- **Ảnh:** `/tmp/ge/shots/flags.png`.
- **Nghi ngờ nguyên nhân:** chưa tìm được nguồn. Có thể là mã điều khoản ngoại lệ ghép vào chữ seed hoặc chữ của đề xuất ngoại lệ. Không thấy "(E6)" trong `frontend/src/features/loan-detail/*.tsx`.

## Cần xác nhận

Giữ các mục chưa có trả lời của captain. Không tính lỗi, không trừ điểm.

1. **Phúc Lâm kết luận mâu thuẫn.** Không đo lại.
2. **VinaNova đề xuất khi TSĐB chưa định giá.** Còn: 4/4 lượt Pending Approval dù TSĐB `NEEDS_VERIFICATION`. Định giá được nêu ở yêu cầu bổ sung.
3. **`POSSIBLE_MATCH` tính là trúng.** Không đo lại.
4. **Khách không có `kyc_assessment` hiện "Đã xác minh".** Không gặp.
5. **Nhật ký kiểm toán lọc người thực hiện "agent" ra 0 dòng.** Không đo lại.
6. **QHKH không nhận thông báo khi hồ sơ chờ Hội đồng.** Còn. Luồng D: 5 thông báo (CASE_ASSIGNED cho httd, tdinh, tdinh2, ruiro; COMPLIANCE_OPINION_NEEDED), không thông báo nào gửi `credit.officer`.
7. **QHKH xem được hồ sơ của mình ở mọi bước.** Còn (D: panel chỉ đọc).
9. **Tổng quan gộp lượt e2e và lượt thật.** Còn ("412 trên 1.032 lượt").
10. **Dữ liệu khách Mekong Flex có nhiều hồ sơ e2e.** Là dữ liệu.
12. **`details.reason` của 403 là tiếng Anh.** Không đo lại.
13. **Tuân thủ GET hồ sơ 200 nhưng GET khách 404, chat 403.** Còn (`gpa`).
15. **Thời gian ca tính cả thời gian chờ người duyệt.** Không đo lại.

Mới:

19. **Người giữ cũ không nhận thông báo khi Trưởng phòng chuyển hồ sơ.**
    - Luồng D: `tdinh2` nhận chuông "Trưởng phòng chuyển hồ sơ cho bạn: …". `tdinh` chỉ thấy "Hồ sơ đã chuyển cho người khác" khi tự mở lại hồ sơ, không có thông báo nào.
    - `user-flows.md` và `rules.md` không nói rõ người bị thu hồi có phải được báo không.
    - Cần captain cho biết.
20. **Cảnh 4 OCR: thẻ trường chỉ hiện khi bấm vào vùng.** Như lần 10. Là cách trình bày, không phải lỗi. Cần người trình bày biết trước.

Đã đóng: Cần xác nhận 17 và 18 (xem bảng kiểm lại).

## Chưa kiểm tra

- Trưởng phòng chạy thật đội agent: chỉ kiểm nút bật, vì ngân sách 8 lượt đã dùng hết. Lần 9 đã chạy được.
- QHKH chạy đội agent ở "Trả về QHKH" và "Thẩm định chờ bổ sung": chỉ chạy ở Nháp.
- Khối điều kiện gập khi hơn 5 mục trên giao diện thật: chỉ có kiểm thử đơn vị (6/6 đạt). Không hồ sơ nào có hơn 5 điều kiện đã xác nhận.
- Luồng "phân tích lại" (ORCHESTRATED) trong chat: không bấm để giữ ngân sách.
- Gửi email thật: worker tắt có chủ ý.
- Các mục "Không đo lại" trong Cần xác nhận.
- Bảng chấm v8 lượt 4 theo từng ca: chỉ đối chiếu số tổng, các ca J8, J10 và các dòng chạy bù. Không chấm tay lại từng lượt.

## Để mọi vai và sản phẩm lên 8,5 còn thiếu gì

Không còn vai hay sản phẩm nào dưới 8,5. Hai mục đang đúng 8,5, và đây là những gì cần để chúng có biên an toàn:

- **Thẩm định (8,5):**
  - T09: lọc việc nội bộ và câu hiện trạng khỏi "Yêu cầu khách bổ sung". Hoặc cho người xác nhận bỏ từng mục.
  - T10: chat trả lời câu "vì sao / tài liệu / BCTC" từ kết quả đội agent. Có thể thêm từ khóa vào `_METRIC_Q`, hoặc mặc định dùng kết quả đã có khi hồ sơ có lượt hợp lệ.
  - T11: gộp các mục cùng ý.
- **Sản phẩm 3, hành động thật (8,5):**
  - T09, T11.
  - Phần còn của T07: định giá TSĐB lúc ở yêu cầu bổ sung lúc ở điều kiện; yêu cầu định giá khi TSĐB đã định giá (223).

Các vai và sản phẩm 9,0 trở lên không thiếu gì để giữ ngưỡng. Muốn lên cao hơn: T12 (chữ chat), T13 (ghi chú chạy bù trên tab và số khi không ghép trong §18), T14, cùng việc trả lời các mục Cần xác nhận 2, 6, 9, 19.

## Brief ghi khác thực tế

- Mục Acceptance ghi "bảng kiểm lại lỗi lần 9". Bước 5 của brief yêu cầu bảng "Kiểm lại lỗi lần 10". Báo cáo này làm bảng lần 10.
- `graphify-out/` không có trong worktree, nên không chạy được `graphify query`. Đã dùng grep có phạm vi hẹp thay thế.
- `pheduyet` (`approver@`) là tier 2 HO, không phải "cấp 1". Cấp 1 là Giám đốc chi nhánh.
- Tên bảng thật: `identity.employee` (không phải `iam`), `ai.message` (chat), `credit.loan_application.application_number`.
- Không đếm được ngân sách bằng `agent.case_run` vì reset xóa ca gắn hồ sơ.
- Lần 10 ghi 184 bị từ chối "đúng §6.3". Căn cứ đúng là `compliance_policy.md` Điều 7; §6.3 nói về hiệu lực tài liệu.
