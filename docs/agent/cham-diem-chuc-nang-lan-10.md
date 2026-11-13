# Chấm điểm chức năng lần 10 (14/11/2026)

Giám khảo độc lập: crew `gd`, Opus. Đây là lần chấm XÁC NHẬN trên bản cuối, sau khi sửa các lỗi lần 9.

- Chỉ chấm CHỨC NĂNG: luồng, thông báo, phân quyền, độ rõ của thao tác và nội dung.
- Không chấm thẩm mỹ. Không sửa code.

**Bản được chấm:**
- HEAD `mate/gd` `6ae6990`, rẽ từ `import/duskdash`. Lúc kết thúc, `import/duskdash` ở `126681b`. Commit thêm vào chỉ có `docs/design/cham-diem-ung-dung-lan-10.md`, không đổi chức năng.
- DB V070, engine chế độ `llm`. Web :3000 chạy từ checkout chính, API :8000, Keycloak :8080.
- Lệnh `git diff --stat 8c9afbc..HEAD -- agent_engine` cho 1 tệp: tệp kết quả benchmark lượt 3. Engine không đổi kể từ bản khóa đo lượt 3.

**Cách chấm:**
- Chạy Playwright trên giao diện thật. Đăng nhập từng vai bằng tài khoản trong `frontend/e2e/helpers.ts`.
- Mỗi luồng nhiều bước chạy trong `flock /tmp/do-an-e2e.lock`, chạy tiền cảnh, có timeout.
- Thử API trực tiếp cho các việc vai đó không được làm.
- Đối chiếu số liệu bằng SELECT chỉ đọc (`default_transaction_read_only=on`). Đối chiếu trích dẫn với `agent_engine/rag_corpus`.
- Script ở `/tmp/gd/specs/`. Nhật ký ở `/tmp/gd/*.jsonl`. Ảnh ở `/tmp/gd/shots/`.
- Khi xong đã chạy hai lần `flock /tmp/do-an-e2e.lock bash infra/scripts/reset-demo.sh` (rc 0, "ho so LA- con nguoi vay: 0, ca agent gan ho so: 0").

**Ngân sách LLM: VƯỢT, giám khảo tự gây ra.**
- Đã chạy **12 lượt** đội agent, trong khi giới hạn là 8. Chat dùng 6/15 câu. Không gặp 402.
- Nguyên nhân: lệnh lọc `c1.spec.ts` của Playwright khớp cả `d1c1.spec.ts`, nên lặp lại cảnh 1 trên VinaNova (187) nhiều lần hơn dự định.
- Theo panel, phần vượt tốn khoảng 0,035 USD.
- Sau khi phát hiện, tôi dừng mọi lượt chạy mới. Phần còn lại dùng các ca benchmark lượt 3, đã có sẵn trong DB và chạy trên cùng engine.
- Đây là lỗi quy trình của giám khảo, không phải lỗi ứng dụng.

**Hồ sơ tự tạo** (reset đã xóa; ngoài 5 hồ sơ demo, không đụng hồ sơ seed nào):

| Luồng | Hồ sơ | Số tiền | Nội dung |
|---|---|---|---|
| A (`fAn`, `fA2`) | LA-20261113-5D0708BE | 25 tỷ | Thử sai vai ở mọi bước, cả UI lẫn API. Trưởng phòng có nút chạy đội agent ở bước Thẩm định (không bấm). Rủi ro bị khóa khi còn chờ ý kiến Tuân thủ. Ở bước Phê duyệt, người giữ là `pheduyet2`: thử API không kèm ngoại lệ ra 422, thử phiên bản cũ ra 409, phê duyệt có điều kiện kèm 11 ngoại lệ. Giám đốc bị khóa. |
| B (`fB`) | LA-20261113-EA16E76D | 2 tỷ | HTTD trả lại. Gia hạn 1 lần. "Rút hồ sơ quá hạn" bị khóa. Nộp lại. Thẩm định yêu cầu bổ sung, HTTD nhận, Thẩm định trả lại. QHKH rút hồ sơ. Gửi lại sau khi rút: 403. |
| C (`fC`) | LA-20261113-F12E4548 | 3 tỷ | Tuân thủ nhận việc. Rủi ro bị khóa trình rồi trả lại. Giữ nghi gian lận, nhả ra, chờ bổ sung, HTTD giải trình. Giám đốc trả bổ sung, sau đó từ chối có bước xác nhận. |
| D (`fD`) | LA-20261113-09035AE2 | 120 tỷ | Trưởng phòng xem "Hồ sơ của phòng" và chuyển người (tdinh → tdinh2) có lý do. Hồ sơ chờ Hội đồng: không vai nào có nút. |
| E (`fEn`) | LA-20261113-12AE2BD9 | 2 tỷ | Rủi ro có nút chạy đội agent đang bật. Tuân thủ chỉ đọc, có hiện lý do. Giám đốc phê duyệt có điều kiện kèm 11 ngoại lệ. |

## Kết luận

**ĐẠT, nhưng sát ngưỡng.**
- Mọi vai và mọi sản phẩm đều từ 8,5 trở lên.
- Không có lỗi mức Chặn demo hay Cao.
- Có 4 lỗi Vừa mới (T01–T04) và 4 lỗi Nhẹ (T05–T08).

Bốn mục đang đúng 8,5: Thẩm định, Sản phẩm 1, Sản phẩm 3, Sản phẩm 4. Chỉ cần thêm một lỗi Vừa ở các mục này là điểm rơi xuống dưới ngưỡng.

So với lần 9:
- **Đã sửa:** S14 (chat gắn hồ sơ lẫn kết quả của hồ sơ khác), S11, S13, phần đòn bẩy của S09, phần chính của S12.
- **Lỗi Vừa mới, cả bốn đều chạm cảnh 1 hoặc hành động thật:**
  - T01: thẻ "Yêu cầu bổ sung" ẩn bớt mục, nhưng khi xác nhận vẫn gửi đủ danh sách thô.
  - T02: Validation phản biện sai "nêu chưa có định giá" khi TSĐB chỉ có giá khai. Gặp ở 5/10 lượt trên hồ sơ cảnh 1.
  - T03: bộ dò LTV vẫn nhầm ngưỡng chính sách 70% với LTV thực (J8 3/3, 187 1/10). Brief yêu cầu kiểm riêng điểm này.
  - T04: reset để lại 3 "điều kiện đã xác nhận" mồ côi trên hồ sơ cảnh 1.
- **Nên sửa trước buổi demo:** T02 và T04. Cả hai hiện ngay trên VinaNova, trước mặt giám khảo.

## Kiểm lại lỗi lần 9

| Mã | Mức lần 9 | Trạng thái | Bằng chứng tự đo |
|---|---|---|---|
| S12 (điều kiện là câu nhận xét) | Vừa | **Sửa phần chính** | Sau bản khóa lượt 3, trong 10 lượt trên 187, 3 lượt trên 223/184 và các ca benchmark J1–J10, không còn câu nhận xét kiểu "DSCR chưa…" nào thành điều kiện riêng. SELECT `agent.action_proposal` kind `request_documents` tạo sau 13/11 17:00: 1/42 đề xuất còn ý nửa nhận xét ("BCTC kiểm toán không bắt buộc theo mức tổng cấp…; hoàn thiện hồ sơ…", CIF-SME-075). Phần còn lại ghi ở T07 (Nhẹ). |
| S14 (chat lẫn hồ sơ của cùng khách) | Vừa | **Đã sửa** | `q14b`: Nháp Sông Hàn (khách có hồ sơ 184 đã có ca) không mượn kết quả của 184; chat nói chưa có lượt cho hồ sơ này. `ch1` (223) và `ch2` (163) trả lời đúng hồ sơ đang mở; `route=DIRECT`. `agent.case_run` trước/sau 6 câu chat: 1089 → 1089, không chạy lại cả đội. |
| S09 sót (Nợ/EBITDA lệch) | Nhẹ | **Đã sửa** (phần đòn bẩy) | 10/10 lượt trên 187 có dòng "Phản biện số liệu: … 1,39 (tính lại 1,82)". Số chính 1,82 = 178/98, ngưỡng 3,5. Không lượt nào để số 1,39 lọt vào findings của gói cuối mà không có phản biện đi kèm (script đếm trên `/tmp/gd/case-*.json`). Bộ dò LTV: xem T03. |
| S11 ("ĐỀ xuất") | Nhẹ | **Đã sửa** | Không còn thấy trong khung đội agent, trace và Tổng quan của 7 vai đã chạy. |
| S05 sót ("0.0 tỷ", mã thô ở mục kỹ thuật) | Nhẹ | **Sửa một phần** | Không còn "0.0 tỷ". Mục "Chi tiết kỹ thuật (kiểm toán)" của ngăn kéo vẫn hiện `NEEDS_VERIFICATION` (T08). |
| S13 (§16 benchmark) | Nhẹ | **Đã sửa** | `benchmark-v3-research.md:501` đã đúng. Mục §17 được kiểm ở phần Sản phẩm 5. |
| S15 ("nêu nêu") | Nhẹ | **Sửa một phần** | Khung đội agent và "Luồng phối hợp" đã hiện "Credit nêu…". Mục kiểm chứng và chi tiết của ngăn kéo dấu vết vẫn hiện "credit nêu nêu" (`tr2.jsonl`, ca `case_8033557986bf`). DB và gói cuối vẫn lưu "nêu nêu". Đây là lỗi code, không phải chữ của LLM (T06). |
| Cần xác nhận 16 lần 9 (điều kiện không hiện, reset không dọn) | — | **Sửa một phần** | Khối "Điều kiện trước giải ngân" đã có, hiện kèm người xác nhận và thời điểm. Reset nay dọn điều kiện của các ca nó xóa, nhưng bỏ sót ca không gắn hồ sơ: còn 3 dòng trên 187 (T04). |

## Bảng điểm từng vai

| Vai | Lần 9 | Lần 10 | Việc đã đi và bằng chứng | Trừ điểm |
|---|---|---|---|---|
| QHKH (`qhkh`) | 8,5 | **9,0** | B: chuông "Hồ sơ bị trả lại… Lý do…". Gia hạn "thêm 5 ngày LV": nút gửi khóa đến khi nhập lý do, sau đó thành "Đã gia hạn 1 lần" (khóa). "Rút hồ sơ quá hạn" khóa kèm lý do. Chuông yêu cầu bổ sung có nội dung. Rút "Đã rút"; gửi lại sau khi rút ra 403 "Chỉ người đang giữ bước…". A/E/C: chuông quyết định kèm lý do ("Hồ sơ được phê duyệt có điều kiện. Lý do: …", "Hồ sơ bị từ chối. Lý do: …"). Khối điều kiện sau phê duyệt: "Từ quyết định: Bổ sung hợp đồng bảo hiểm…; Mở tài khoản thanh toán…". D: panel agent chỉ đọc, có lý do. S14 đã sửa. | Cần xác nhận 6 (không trừ). |
| Hỗ trợ tín dụng (`httd`) | 9,0 | **9,0** | B: trả lại có lý do, nhận bổ sung, chuyển Thẩm định. C: chuông "Nội dung cần giải trình…". A: API sai bước ra 403. | — |
| Thẩm định (`tdinh`, `tdinh2`) | 8,5 | **8,5** | Chạy đội agent (cảnh 1–3, 223, 184). Xác nhận điều kiện xong trong 4 s, hiện "Đã xác nhận và thực hiện"; điều kiện vào khối "Điều kiện trước giải ngân" kèm tên và giờ. Yêu cầu bổ sung và trả lại (B). Chuyển người (D): `tdinh2` nhận chuông "Trưởng phòng chuyển hồ sơ cho bạn: Cân đối khối lượng…"; `tdinh` cũ thấy "Hồ sơ đã chuyển cho người khác…", API 404. | T01 (thẻ ẩn mục nhưng vẫn gửi đủ); T04 (3 điều kiện mồ côi trên hồ sơ của họ); T05 (mã `SME-01-…` ở Cờ). |
| Rủi ro (`ruiro`) | 9,0 | **9,0** | A/C: "Trình phê duyệt" khóa kèm lý do khi chưa có ý kiến Tuân thủ. C: trả lại có lý do và chuông; giữ nghi gian lận làm vai khác mất nút; nhả rồi chờ bổ sung. E: nút chạy đội agent bật. Ngoài bước: 404 khi đọc điều kiện. | — |
| Tuân thủ (`tuanthu`) | 9,0 | **9,0** | A/C: chuông "Cần ý kiến Tuân thủ…". Việc của tôi đúng số. Panel agent chỉ đọc, có lý do (A, E). Hồ sơ ngoài phạm vi: 404 (`k1`). | Cần xác nhận 13 (không trừ). |
| Cấp phê duyệt `pheduyet` (tier 2 HO) | 9,0 | **9,0** | Cảnh 5: modal "Phê duyệt / có điều kiện / Từ chối / Trả lại"; bước xác nhận cho 55 tỷ; kết quả "Đã phê duyệt". Chat thẩm quyền: "Cấp 2 Hội sở… 55.000.000.000 VND… §3.1". Câu ngoài phạm vi bị REFUSE trong 147 ms. A: ở bước Thẩm định và Kiểm tra, API ra 403/404. | — |
| Cấp phê duyệt `pheduyet2` (tier 2 HO) | 9,0 | **9,0** | `fA2`: API không kèm quyết định ngoại lệ ra 422 `EXCEPTIONS_UNDECIDED`. Phiên bản cũ ra 409 "Hồ sơ vừa được người khác cập nhật. Hãy tải lại trang rồi thử lại." Form rỗng bị khóa với lý do "Cần nhập: lý do quyết định, quyết định và lý do cho từng ngoại lệ chưa xử lý." Duyệt 11 ngoại lệ. Câu xác nhận: "…25 tỷ đồng (25.000.000.000 đồng), bằng mức đề nghị, kỳ hạn 24 tháng. Điều kiện bắt buộc trước giải ngân: … Ngoại lệ: 11 chấp thuận, 0 từ chối. Không hoàn tác được." Kết quả "Phê duyệt có điều kiện". Có nhận chuông giao việc. | — |
| Giám đốc chi nhánh (`giamdoc`) | 9,0 | **9,0** | C: trả bổ sung, rồi từ chối với xác nhận "Không hoàn tác được". E: phê duyệt có điều kiện kèm 11 ngoại lệ, câu xác nhận "…2 tỷ đồng (2.000.000.000 đồng)…". A: nút "Quyết định" khóa, title "Hồ sơ đang do người khác xử lý; chỉ người đang giữ bước này mới thực hiện được.", API 403. Việc của tôi trống, hiện rõ trạng thái trống. | — |
| Trưởng phòng (`credit.manager`) | 9,0 | **9,0** | D: thấy "Hồ sơ của phòng", chuyển người có lý do, người nhận có chuông. A: nút chạy đội agent bật ở bước Thẩm định (lần này không bấm vì đã hết ngân sách LLM). API quyết định: 403. | Chưa chạy thật đội agent ở lần 10 (lần 9 đã chạy được). |
| Kiểm toán (`kiemtoan`) | 9,0 | **9,0** | Đọc được mọi hồ sơ (`pa`) và nhật ký kiểm toán (328 dòng, `au`). Mọi thao tác ghi ra 403 ở mọi bước (A). Khối điều kiện của 187 xem được. | — |
| Quản trị (`quantri`) | 9,5 | **9,5** | `/quan-tri` chỉ đọc. Hồ sơ, khách, điều kiện: 403 `MISSING_PERMISSION` ở mọi bước (A, `pdv`). | — |

**Việc của tôi (`wk`, 7 vai):**
- Số đếm ở đầu trang khớp số trên các tab.
- Nhãn hạn hiện đủ các dạng: "còn N ngày LV", "quá hạn 1 ngày LV", "quá hạn hôm nay" (hồ sơ hạn 13/11), "tạm dừng", "Chưa có hạn".
- Sửa của crew `uq` về nhãn hạn và số mục: đạt.

## Bảng 5 sản phẩm của đề bài

| # | Sản phẩm | Lần 9 | Lần 10 | Bằng chứng | Còn thiếu |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 8,5 | **8,5** | Mỗi lượt có Credit, Compliance, Operations, Document, sau đó Validation. Kết luận khác nhau đúng chuyên môn: 184 Rejected (CIC nhóm 3); 223 Needs Info; 187 Pending Approval cấp 2 HO; J4 Rejected; J1, J7, J8 Pending branch_director; J3, J9 head_office_l2. Phản biện đòn bẩy đúng 10/10 lượt. | T02 (phản biện sai về định giá 5/10 lượt trên 187), T03 (nhầm ngưỡng LTV), T06 ("nêu nêu"). |
| 2 | Planner giao việc cho executor | 9,0 | **9,0** | Khung hồ sơ hiện "Planner → Credit Compliance Operations Document → Validation → Cấp phê duyệt". Trace có Planner giao việc kèm lý do, Validation trả về Planner. Tiến độ trực tiếp: "2/4 chuyên gia đã xong". | — |
| 3 | Agent gọi công cụ, hành động thật | 8,5 | **8,5** | Cảnh 1: xác nhận điều kiện xong sau 4 s, ghi vào `credit.pre_disbursement_condition` và hiện ở khối kèm người, giờ. Đề xuất không có hiệu lực khi chưa có người xác nhận. Tổng quan: 13.651 lần gọi công cụ. Quyền xác nhận đúng vai. | T01 (người xác nhận thấy ít mục hơn số mục thực sự được gửi). T04 (điều kiện mồ côi). T07. |
| 4 | Dashboard trace, trạng thái, quyết định | 8,5 | **8,5** | Tổng quan "453 trên 1.089 lượt (41,6%) … Công cụ đã gọi 13.651 lần … Chi phí LLM 4,26 USD, 7.266 lượt gọi". Trace từng lượt có liên kết từ hồ sơ. Quyết định của người duyệt nằm cạnh đề xuất. Khối điều kiện ghi người xác nhận. | T06, T08; Cần xác nhận 18 (bộ đếm "Phản biện của Validation 54 lần" đứng yên). |
| 5 | So sánh single và multi | 8,5 | **9,0** | Kiểm trung thực: mọi mục đều đạt (xem mục riêng). Tab lấy lượt 3 làm số chính; hai lượt trước vẫn xem được. §17 nói đủ các giới hạn. | Lượt 3 không chứng minh được tác dụng của các sửa engine (§17 đã tự nêu). |

### Câu hỏi khó giám khảo cuộc thi có thể hỏi

1. **"Khi chuyên gia nói sai số, ai bắt và bắt thế nào?"** Validation tính lại từ công cụ và ghi "Phản biện số liệu: credit nêu … 1,39 (tính lại 1,82)", gói cuối chỉ dùng số tính lại. Trả lời được. Rủi ro: ở 187, nửa số lượt có thêm một phản biện sai về định giá (T02). Nếu giám khảo hỏi đúng dòng đó, đội không bảo vệ được.
2. **"Agent có tự quyết hay tự hành động không?"** Không. Mọi `action_proposal` đều chờ người đúng vai xác nhận; vai khác nhận 403 hoặc 404; quyết định của người được ghi vào nhật ký kiểm toán. Trả lời được.
3. **"Hệ thống biết hồ sơ này cần cấp nào duyệt?"** Có. Gói cuối ghi `required_approver_level` khớp với `approval_tier` và §3.1; chat trả lời "Cấp 2 Hội sở… §3.1". Trả lời được.
4. **"Multi hơn single ở đâu, có trung thực không?"** Có. §17 nêu cổng 30/30 so với 18/30, độ chính xác b 0,975 so với 0,694; công bố trễ của multi lớn hơn (40,3 s so với 36,6 s) và chi phí cao hơn; có danh sách ca multi không hơn. Trả lời được.
5. **"Câu hỏi ngoài phạm vi?"** Từ chối trong 0,15 s, không gọi LLM. Trả lời được.
6. **"Điều kiện trước giải ngân do AI đề xuất có hiệu lực khi nào?"** Chỉ sau khi người xác nhận; khối ghi tên người và giờ. Nhưng 187 sau reset vẫn có 3 điều kiện từ 10–11/11 (T04), và với hồ sơ đã phê duyệt, panel có nhánh hiện điều kiện chưa xác nhận (Cần xác nhận 17). Trả lời được một phần.
7. **"LTV của khách là bao nhiêu và ngưỡng là bao nhiêu?"** Chat ở 223 trả lời đúng "LTV 66,7%, ngưỡng 70% = 21 tỷ". Nhưng trace của J8 có dòng phản biện coi "LTV 70%" là LTV thực (T03). Trả lời được một phần.

## Đội agent so với DB và corpus

Phủ 13 khách khác nhau:
- 3 hồ sơ có lượt chạy của tôi: 187 (10 lượt), 223, 184.
- 10 ca benchmark lượt 3 trên cùng engine: CIF-SME-071..080 (J1–J10).
- CIF-SME-018: lượt cũ trong DB, Needs Info, đề xuất `request_documents`.

| Hồ sơ | DB (số tiền, TSĐB) | Đội agent | Đối chiếu |
|---|---|---|---|
| 187 VinaNova | 80 tỷ; TSĐB khai 145 tỷ, `appraised_value` null, `NEEDS_VERIFICATION` | 10/10 Pending Approval, `head_office_l2`, điều kiện tiên quyết BCTC kiểm toán (§4.1, §6.1) | Cấp đúng (> 20 tỷ, cấp 2 HO). Nợ/EBITDA 1,82 = 178/98 đúng. Phản biện sai về định giá 5/10 lượt (T02). Nhầm LTV 1/10 lượt (`case_d8eb8ab66535`, T03). |
| 223 Việt Tiến | TSĐB APPRAISED 30 tỷ | Needs Info, 1 việc cần bổ sung | LTV 66,7%, ngưỡng 70% = 21 tỷ đúng (`rag_corpus` §7.1). Phản biện "chưa có định giá" ở hồ sơ này ĐÚNG, vì Credit nói nhầm. |
| 184 Sông Hàn | CIC nợ nhóm 3 | Rejected | Đúng §6.3. |
| J1 / J7 / J8 (12 / 7 / 9 tỷ) | ≤ cấp 1 | Pending, `branch_director` | Cấp đúng. J8: TSĐB APPRAISED 20 tỷ, Tuân thủ viết đúng "LTV 45%; mức tối đa 70%", nhưng Validation vẫn ghi "compliance nêu LTV 70% (tính lại 45,0%)" ở 3/3 lượt (T03). |
| J3 / J9 (55 / 30 tỷ) | > 20 tỷ | Pending, `head_office_l2` | Cấp đúng. J3 TSĐB APPRAISED 60 + 40 tỷ: phản biện định giá đúng. |
| J4 (20 tỷ) | — | Rejected | Khớp đáp án v8. |
| J2, J5, J6, J10 | — | Needs Info | Khớp đáp án v8. |

Trích dẫn §3.1, §4.1, §4.2, §6.1, §6.3, §7.1 đều có trong `agent_engine/rag_corpus` và đúng nội dung (đã đối chiếu ở các câu chat và gói cuối).

## Chat (6/15 câu)

| Hội thoại | Câu | Kết quả |
|---|---|---|
| `ch1` tdinh @223 | Điều khoản áp dụng | DSCR §4.2, cấp 1 §3.1, LTV 66,7% §7.1, CIC §6.3, kèm lưu ý định giá. 19 s. Đúng. |
| `ch1` | LTV | 66,7%, ngưỡng 70% = 21 tỷ, chân trang có thời điểm lượt chạy. Đúng. |
| `ch2` pheduyet @163 | Thẩm quyền | "Cấp 2 Hội sở… 55.000.000.000 VND… §3.1". Đúng. |
| `ch2` | Phở bò | REFUSE, 147 ms. Đúng. |
| `q14b` qhkh Nháp Sông Hàn | Kết luận | Không mượn kết quả của 184. Đúng (S14). |
| `q14b` | Chỉ số | Nói chưa có lượt cho hồ sơ này. Đúng. |

Mọi câu đều đi `route=DIRECT`. Số `case_run` không tăng (1089 → 1089), nên không có câu nào chạy lại cả đội.

## Phân quyền (UI và API)

- **A, mọi bước:** vai không giữ bước nhận 403 hoặc 404; giao diện hiện "Hồ sơ đang do người khác xử lý…" hoặc "Không tìm thấy nội dung…". `quantri` nhận 403 `MISSING_PERMISSION`.
- **Khối "Điều kiện trước giải ngân" (`pdv`):**
  - Xem được: `qhkh`, `httd`, `tdinh`, `giamdoc`, `kiemtoan`, `truongphong`. Mỗi dòng hiện "AI đề xuất · Đã được người xác nhận · Chuyên viên Thẩm định Mẫu · giờ".
  - `ruiro`, `tuanthu`, `pheduyet`, `pheduyet2` nhận 404 khi không giữ bước; `quantri` nhận 403. Khớp quyết định (d): ai xem được hồ sơ thì xem được khối.
  - 163 chưa có điều kiện: hiện "Chưa có điều kiện nào được ghi".
- **D, chờ Hội đồng:** không vai nào có nút; API 403/404.
- **B:** gửi lại sau khi rút ra 403.
- **Tuân thủ:** panel agent chỉ đọc kèm lý do, đúng (e).

## Năm cảnh demo (sau reset; `tdinh` / `qhkh` / `pheduyet`)

Tổng thời gian **172 s**. 5/5 cảnh chạy được (`d1.jsonl`).

| Cảnh | Thời gian | Kết quả | Vấp |
|---|---|---|---|
| 1 VinaNova 187 | 45 s chạy, 4 s xác nhận | Pending Approval, cấp 2 HO, 80 tỷ. Xác nhận điều kiện xong thì khối hiện dòng mới. | Trước khi chạy, khối đã có sẵn 3 điều kiện "đã xác nhận" từ 10–11/11 (T04). Một nửa số lượt có phản biện sai về định giá (T02). |
| 2 Việt Tiến 223 | 37 s | Needs Info, 1 việc cần bổ sung. | — |
| 3 Sông Hàn 184 | 45 s | Rejected (CIC nhóm 3). | — |
| 4 OCR | 4 s tải lên (202), 10 s | Có 4 vùng nhận dạng. | Thẻ OCR chỉ hiện khi bấm vào vùng; người trình bày cần biết trước. |
| 5 Thành Đạt 163 | 10 s | Modal có bước xác nhận; kết quả "Đã phê duyệt", 55 tỷ. | — |

Ba lượt chạy cảnh 1 mất khoảng 2,5 phút, hợp với buổi demo.

## Sản phẩm 5: kiểm trung thực benchmark (không chạy lại)

| Kiểm | Kết quả |
|---|---|
| `git diff 8c9afbc..HEAD -- agent_engine` | 1 tệp: `benchmark_results/20261113T175157Z-*.json`. Đạt. |
| Tự tính lại số chính lượt 3 từ tệp thô | Single: a 0,570, b 0,694, cite 0,914, cổng 18/30, tỷ lệ phát hiện sai 0,067. Multi: a 0,713, b 0,975, cite 0,931, cổng 30/30. Trễ 40,3 s so với 36,6 s. Chi phí 0,1872 USD. Khớp §17 và tab (`/tmp/gd/bench3.out`). |
| `cases_v8.json`, `grade.py`, single không đổi giữa lượt 2 và 3 | `cases_v8.json` đổi lần cuối ở `9ff9ebb`, trước lượt 2. `grade.py` và mã single không có commit nào giữa hai lượt. Các tệp engine đổi trong `f0a427a`, `7e823fe`, `8c9afbc` không nằm trong phần mà single import. Lời khẳng định ở §17.1 đúng. |
| §17 có nêu đủ giới hạn | Có: không còn mù chặt; lần chạy đầu bị cắt do timeout nên chạy lại nguyên lượt; liệt kê các ca multi không hơn; nói lượt này không chứng minh được tác dụng của các sửa engine; độ trễ của single nằm ngoài sai số. |
| Tab So sánh | Lấy lượt 3 làm số chính; lượt 1 và 2 vẫn chọn được (`cmp`). |

## Danh sách lỗi

### T01 · Vừa · Thẩm định (người xác nhận), Sản phẩm 3
- **Bước tái hiện:** tdinh mở 187, chạy đội agent (ca `case_4180866faaa9`), rồi xem thẻ đề xuất "Yêu cầu bổ sung".
- **Mong đợi:** người xác nhận thấy đúng danh sách sẽ được gửi đi (`rules.md`: đề xuất chỉ có hiệu lực sau khi người đúng vai xác nhận, và họ xác nhận đúng nội dung đó).
- **Thực tế:** DB có 4 mục, thẻ và ngăn kéo hiện "2 mục". Các ca `01d6…`, `b183…`, `1a44…` cũng bị ẩn mục. Khi bấm xác nhận, `gateway/actions.py:103` ghép `"; ".join(params.documents)`, tức danh sách thô đủ 4 mục, vào lý do của `request_info`.
- **Ảnh:** `/tmp/gd/shots/d1-c1.png`; chữ ở `tr.jsonl`.
- **Nghi ngờ nguyên nhân:** `frontend/src/features/dashboard/agentTrace.ts:632-646`: `dedupeConditions` gộp hai mục khi có ≥ 50% từ khóa trùng, nên hai việc khác nhau mà dùng chung từ (như "bổ sung", "định giá", "DSCR") bị coi là một. Backend thì không gộp.

### T02 · Vừa · Mọi vai xem cảnh 1, Sản phẩm 1
- **Bước tái hiện:** chạy đội agent trên 187. TSĐB có `declared_value` 145 tỷ, `appraised_value` null, `NEEDS_VERIFICATION`.
- **Mong đợi:** Credit và Compliance nói "chưa có định giá" là đúng, nên Validation không được phản biện câu này (brief, mục (l): chỉ phản biện khi số thực sự lệch).
- **Thực tế:** 5/10 lượt (`19f4`, `1a44`, `3c7f`, `5604`, `f3b6`) có dòng "Phản biện số liệu: credit/compliance nêu nêu chưa có định giá (hồ sơ ghi 145,0 tỷ)" trong package. Ở 223, J3 và J8 (TSĐB đã APPRAISED), phản biện này đúng.
- **Ảnh:** `/tmp/gd/shots/d1-c1-trace.png`; `/tmp/gd/case-case_*.json`.
- **Nghi ngờ nguyên nhân:** `agent_engine/common/consistency.py:84-85` so với `_collateral_totals` (`:30-35`). Hàm này dùng `eligible_value` cộng giá trị của TSĐB bị loại (`excluded.valuation`, tức giá khai), nên vẫn > 0 khi chưa có định giá thẩm định.

### T03 · Vừa · Mọi vai đọc trace, Sản phẩm 1
- **Bước tái hiện:** xem gói cuối của J8 (CIF-SME-078, `case_a54c6dcb1352` và hai lượt khác cùng khách), hoặc 187 `case_d8eb8ab66535`.
- **Mong đợi:** bộ dò LTV không nhầm ngưỡng chính sách với LTV thực (yêu cầu của brief lần 10).
- **Thực tế:** Tuân thủ viết đúng "LTV 45%; mức tối đa 70%" và "hạn mức bảo đảm tối đa 14 tỷ theo LTV 70%". Validation vẫn ghi "compliance nêu LTV 70% (tính lại 45,0%)", và dòng này nằm trong findings của gói cuối. J8 sai 3/3 lượt; 187 sai 1/10 lượt.
- **Ảnh:** không chụp; chữ trong `/tmp/gd/bm3cases.txt`.
- **Nghi ngờ nguyên nhân:** `agent_engine/common/consistency.py:40`. `_THRESHOLD` không có "mức" và "theo", nên cụm "theo LTV 70%" và "LTV … mức tối đa" không được nhận là ngưỡng.

### T04 · Vừa · Mọi vai xem 187 (cảnh 1)
- **Bước tái hiện:** chạy `reset-demo.sh` (đã chạy 2 lần, cả hai rc 0), rồi mở 187.
- **Mong đợi:** sau reset, hồ sơ demo sạch. Khối điều kiện chỉ có điều kiện do người xác nhận trong buổi demo (`rules.md:225`, `demo-data.md`).
- **Thực tế:** còn 3 dòng "AI đề xuất · Đã được người xác nhận · Chuyên viên Thẩm định Mẫu" từ 10–11/11. Nguồn là các proposal `080b2d55`, `78469ee2`, `abdb2055` thuộc ca `case_0ef1295b1234`, `case_d85c411b8b2a`, `case_d233e68e6f49`. Các ca này không có dòng trong `credit.loan_agent_run`. Một dòng là yêu cầu trước khi quyết định ("Bổ sung ngành kinh doanh… để hoàn tất kiểm tra"), không phải điều kiện giải ngân.
- **Ảnh:** `/tmp/gd/shots/d1-c1-pd.png`.
- **Nghi ngờ nguyên nhân:** `infra/database/demo/reset-demo-cleanup.sql:10-14` chỉ xóa ca có trong `loan_agent_run`. Lệnh `:22-23` chỉ xóa điều kiện khi proposal đã mất. Proposal của ca không gắn hồ sơ vẫn còn, nên điều kiện cũng còn.

### T05 · Nhẹ · Thẩm định, mọi vai xem khối Cờ
- **Bước tái hiện:** hồ sơ tự tạo LA-20261113-F12E4548, vai tdinh, khối "Cờ cảnh báo".
- **Mong đợi:** không lộ mã thô (tiêu chí chấm của brief).
- **Thực tế:** 11 dòng dạng "Đề xuất ngoại lệ tài liệu SME-01-CREDIT-REQUEST đi theo hồ sơ · đang mở · Nguồn: Cổng kiểm tra điều kiện". Aria-label của nút "Xử lý cờ này" cũng chứa mã. Trong khi đó, modal quyết định hiện tên tiếng Việt cho cùng các tài liệu.
- **Ảnh:** `/tmp/gd/shots/flag.png`.
- **Nghi ngờ nguyên nhân:** `backend/app/workflow/gates.py:278` ghép `item` là mã tài liệu.

### T06 · Nhẹ · Kiểm toán và mọi vai mở ngăn kéo dấu vết (S15 còn)
- **Thực tế:** mục kiểm chứng và chi tiết hiện "credit nêu nêu …" (`tr2.jsonl`, `case_8033557986bf`). Gói cuối và DB vẫn lưu "nêu nêu".
- **Nghi ngờ nguyên nhân:** `agent_engine/common/consistency.py:101` ghép "nêu {m}", trong khi `m` đã bắt đầu bằng "nêu" (`:85`).

### T07 · Nhẹ · Thẩm định (S12 phần còn)
- **Thực tế, ở cả 10/10 lượt trên 187 và ở J1, J3, J7, J8, J9:**
  - Có dòng "Bổ sung trước giải ngân (không chặn trình): DSCR/lịch trả nợ dự phóng chưa có…; người đại diện pháp luật chưa có trong hồ sơ", viết như mô tả hiện trạng chứ không phải việc phải làm.
  - Đôi khi một mảnh chữ thường bị tách thành điều kiện riêng.
  - Việc định giá TSĐB lúc nằm ở yêu cầu bổ sung, lúc nằm ở điều kiện.
- **Nghi ngờ nguyên nhân:** `agent_engine/gateway/proposals.py` (tách điều kiện) và `common/gate.py` (tiền tố "không chặn trình").

### T08 · Nhẹ · Kiểm toán (S05 còn)
- **Thực tế:** mục "Chi tiết kỹ thuật (kiểm toán)" của ngăn kéo dấu vết hiện trạng thái thô `NEEDS_VERIFICATION`.

## Cần xác nhận

Giữ các mục lần 9 chưa có trả lời của captain. Không tính lỗi, không trừ điểm.

1. **Phúc Lâm kết luận mâu thuẫn.** Không đo lại.
2. **VinaNova đề xuất khi TSĐB chưa định giá.** Còn: 10/10 lượt Pending Approval dù TSĐB `NEEDS_VERIFICATION`.
3. **`POSSIBLE_MATCH` tính là trúng.** Không đo lại.
4. **Khách không có `kyc_assessment` hiện "Đã xác minh".** Không gặp.
5. **Nhật ký kiểm toán lọc người thực hiện "agent" ra 0 dòng.** Không đo lại.
6. **QHKH không nhận thông báo khi hồ sơ chờ Hội đồng.** Còn. Luồng D: `integration.notification` cho LA-…09035AE2 có 5 dòng (HTTD, tdinh, tdinh2, ruiro, tuanthu), không có dòng nào gửi `credit.officer`.
7. **QHKH xem được hồ sơ của mình ở mọi bước.** Còn (D: panel chỉ đọc).
9. **Tổng quan gộp lượt e2e và lượt thật.** Còn ("453 trên 1.089 lượt").
10. **Dữ liệu khách Mekong Flex có nhiều hồ sơ e2e.** Là dữ liệu.
12. **`details.reason` của 403 là tiếng Anh.** Không đo lại.
13. **Tuân thủ GET hồ sơ 200 nhưng GET khách 404, chat 403.** Không đo lại lần này.
15. **Thời gian ca tính cả thời gian chờ người duyệt.** Không đo lại.

Mới:

17. **Hồ sơ đã phê duyệt hiện điều kiện agent chưa xác nhận.**
    - Code: `frontend/src/features/loan-detail/PreDisbursementPanel.tsx:21,38`. Khi hồ sơ ở trạng thái đã phê duyệt, panel lấy `package.conditions` của lượt agent mới nhất và hiện "AI đề xuất · Từ đội agent, chưa xác nhận: …".
    - Mâu thuẫn với `rules.md:225` ("chỉ có hiệu lực sau khi người đúng vai xác nhận. Khi đó điều kiện… hiện ở khối") và với brief ("chỉ hiện sau khi người đúng vai xác nhận").
    - Chưa tái hiện trên giao diện: muốn tái hiện cần chạy đội agent rồi phê duyệt cùng hồ sơ, mà ngân sách LLM đã hết. Hai hồ sơ đã phê duyệt mà tôi xem (5D0708BE, 163) không có lượt agent gắn kèm, nên chỉ hiện "Từ quyết định".
    - Cần captain cho biết: dòng có nhãn "chưa xác nhận" có được phép hiện ở hồ sơ đã duyệt không.
18. **Bộ đếm "Phản biện của Validation 54 lần" đứng yên.**
    - Tổng quan đếm sự kiện `a2a_challenge` (`agent_engine/gateway/db.py:147`). Sự kiện cuối cùng là ngày 12/11 15:41.
    - Trong khi đó, 55 lượt chạy sau 12/11 16:00 có dòng "Phản biện số liệu" trong package. Các dòng này không phải sự kiện nên không được đếm.
    - Giám khảo cuộc thi dễ thấy hai con số không khớp nhau. Cần chốt bộ đếm này đo cái gì, hoặc đổi nhãn.

Đã đóng: mục 16 lần 9, chuyển thành T04 (phần còn lại). Bảng `integration.notification_delivery` không có dòng mới cho các hồ sơ tự tạo (chỉ có 2 dòng SENT ngày 10/11), đúng vì worker email đang tắt có chủ ý. Thông báo trong ứng dụng thì đủ: CASE_ASSIGNED, COMPLIANCE_OPINION_NEEDED, CASE_DECIDED, CASE_RETURNED, DEADLINE_EXTENDED; AGENT_ACTION_PROPOSED gộp thành "23 đề xuất mới… 187".

## Chưa kiểm tra

- QHKH chạy đội agent ở Nháp, Trả về QHKH, Thẩm định chờ bổ sung cho đến khi xong lượt. Chỉ thấy nút bật, không bấm vì hết ngân sách.
- Trưởng phòng và Rủi ro chạy đội agent thật ở lần 10. Chỉ kiểm nút bật; lần 9 đã chạy được.
- Khối điều kiện ở hồ sơ đã phê duyệt có lượt agent (Cần xác nhận 17).
- Luồng "Phân tích lại" (ORCHESTRATED) trong chat.
- Gửi email thật (worker tắt có chủ ý).
- M04 và các mục "Không đo lại" ở trên.
- Kiểm toán lọc nhật ký theo "agent" (Cần xác nhận 5).

## Để mọi vai và sản phẩm lên 8,5 còn thiếu gì

Không còn vai hay sản phẩm nào dưới 8,5. Bốn mục đang đúng 8,5, và đây là những gì cần để chúng có biên an toàn:

- **Thẩm định (8,5):**
  - T01: thẻ "Yêu cầu bổ sung" hiện đủ mục sẽ gửi đi, hoặc backend gửi đúng danh sách đã gộp.
  - T04: reset dọn cả điều kiện của ca không gắn hồ sơ.
  - T05: tên tài liệu tiếng Việt trong khối Cờ.
- **Sản phẩm 1, chuyên gia phối hợp (8,5):**
  - T02: chỉ phản biện "chưa có định giá" khi có `appraised_value`.
  - T03: `_THRESHOLD` nhận "mức", "theo LTV"; thêm ca kiểm thử từ câu của J8.
  - T06.
- **Sản phẩm 3, hành động thật (8,5):**
  - T01; T04; T07.
  - Trả lời Cần xác nhận 17.
- **Sản phẩm 4, dashboard (8,5):**
  - T06; T08.
  - Trả lời Cần xác nhận 18.

Các vai và sản phẩm 9,0 trở lên không thiếu gì để giữ ngưỡng.

## Brief ghi khác thực tế

- Đoạn "LẦN CHẤM 3" là bối cảnh cũ; brief đã tự ghi là bỏ qua.
- `graphify-out/` không có trong worktree, nên không chạy được `graphify query`. Đã dùng grep có phạm vi hẹp thay thế.
- `pheduyet` (`approver@`) là tier 2 HO, không phải "cấp 1". Cấp 1 là Giám đốc chi nhánh (`identity.employee_authority`).
- VinaNova (187) không thuộc danh mục của `qhkh`.
- Nút "Quyết định" đã chuyển lên phần đầu hồ sơ (`loan-header`), không còn trong `actions-panel`. Script cũ ở `/tmp/g4`, `/tmp/g5` cần sửa theo.
