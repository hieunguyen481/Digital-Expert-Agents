# Chấm điểm chức năng – lần 2

Ngày chấm: 11/11/2026, khoảng 07:20–10:30 giờ Việt Nam. Ứng dụng: web `:3000`, API `:8000`, engine chế độ `llm`, nhánh `import/duskdash` tại `b1dbe16`, DB V059.
Cách chấm:
- Đăng nhập từng vai bằng Playwright trên giao diện thật; hành động bị cấm thử cả trên giao diện lẫn API.
- Đối chiếu DB chỉ bằng SELECT; số của đội agent đối chiếu với `agent.case_event` và `agent_engine/rag_corpus/`.
- Chỉ chấm chức năng, luồng, thông báo, phân quyền, độ rõ của thao tác; không chấm thẩm mỹ.
- Script, log và ảnh ở `/tmp/g5/` (`specs/*.spec.ts`, `*.jsonl`, `shots/`). Tên ảnh trong báo cáo là tên tệp trong `/tmp/g5/shots/`.
- Hồ sơ riêng tự tạo: A `LA-20261111-73CBDC47` (25 tỷ), B `83bfa5bd` (2 tỷ), C `LA-20261111-CE5418F6` (3 tỷ), D `LA-20261111-1730E79B` (120 tỷ), cộng các hồ sơ nháp và hồ sơ chạy đội agent. Sau khi đi 5 cảnh demo đã chạy `reset-demo.sh`.
- Đã tiêu 10/30 lượt chạy đội agent.

## Kết luận

**KHÔNG ĐẠT.**
- Có 5 vai dưới 8,5: Quản trị 5,5; Trưởng phòng 6,5; QHKH, HTTD, Thẩm định 8,0. Có 4 sản phẩm dưới 8,5: số 1, 3, 4, 5 cùng 7,5.
- Có 2 lỗi mức **Cao**: M01 (Quản trị không có trang làm việc) và M02 (Trưởng phòng không tìm được hồ sơ của phòng để chuyển).
- Không có lỗi **Chặn demo**: 5 cảnh demo đi tới kết quả mong đợi trong 152 giây.

So với lần 1:
- Đã sửa 15/18 lỗi L của lần 1. L07 và L18 sửa một phần; L17 còn.
- Trong 4 mục C: C4 không còn; C1 theo Q-W (chờ xác nhận); C2 và C3 còn (C-N3).
- Tuân thủ tăng từ 5,0 lên 8,5. Rủi ro, hai cấp phê duyệt và Kiểm toán đạt 8,5.

Việc cần làm trước (theo thứ tự):
1. M02: cho Trưởng phòng một cách tìm hồ sơ của phòng (danh sách "Hồ sơ của phòng" hoặc ô tìm kiếm).
2. M01: chốt phạm vi trang Quản trị. Nếu đợt này không làm thì ghi rõ ở đề bài và kịch bản demo (C-N4).
3. M08, L17: Validation bắt mâu thuẫn số giữa chuyên gia; gộp đề xuất trùng, tách "việc trước khi quyết định" khỏi "điều kiện trước giải ngân".
4. M07: không che số tiền như số tài khoản.
5. L07, L18: bỏ tên kỹ thuật trong trích nguồn; "Hạn mức đề xuất: VND" trống ở chat.

## Kiểm lại lỗi lần 1

| Mã | Mức lần 1 | Trạng thái | Bằng chứng lần 2 |
|---|---|---|---|
| L01 | Cao | Đã sửa | HTTD có nút "Trả lại QHKH" ở `/ho-so-vay/{id}`, bấm xong hồ sơ "Trả về QHKH", QHKH nhận chuông "Hồ sơ bị trả lại … Lý do: …" (luồng B, `fB.jsonl` bước `httd-return-ui`, `qhkh-returned`). |
| L02 | Cao | Đã sửa | Thẻ bổ sung của QHKH hiện nguyên lý do "Bổ sung sao kê tài khoản 6 tháng…" và hạn 18/11/2026 (`fB` bước `qhkh-supplement`). |
| L03 | Cao | Đã sửa | Hồ sơ A vào RISK_REVIEW: Tuân thủ nhận chuông "Cần ý kiến Tuân thủ…", "Việc của tôi" có 1 việc (`fA` bước `tuanthu-work`; luồng C cũng vậy). |
| L04 | Cao | Đã sửa | Hồ sơ C bị `giamdoc` từ chối: đầu trang "Từ chối", không còn "Được duyệt"; QHKH nhận "Hồ sơ bị từ chối" (`fC` bước `giamdoc-reject`, `qhkh-final`). |
| L05 | Cao | Đã sửa | QHKH chạy lại đúng ca lần 1 (nháp Mekong Flex 120 tỷ, khách chưa KYC, chưa BCTC): ra `Needs Info`, Validation "thiếu dữ liệu chặn — Bản CIC tra cứu ngày 2026-10-08 đã quá 30 ngày… Chưa có kết quả sàng lọc AML", đề xuất "Yêu cầu khách bổ sung 6 mục" (`ag4.jsonl` Flex120, case_07d9417f1045). Đông Á, Cảng Xanh, Nông sản, Việt Tiến cũng ra `Needs Info`. |
| L06 | Cao | Đã sửa | Cấp đúng Q4 trên cả 6 hồ sơ đối chiếu: VinaNova 80 tỷ "Cấp 2 Hội sở" (dư nợ 98 tỷ ở TCTD khác không tính), Sông Hàn 22 tỷ "dư nợ tại ngân hàng 0 + 22 = 22 tỷ; Cấp 2 Hội sở", Việt Tiến 20 tỷ "chi nhánh (cấp 1) §3.1", Trường An 60 tỷ "Cấp 2 Hội sở; dư nợ 5 tỷ tại TCTD khác không tính theo Q4". Khớp `rules.md:16` và corpus `shared_cs_td_sme_2025.md:12`. |
| L07 | Cao | Sửa một phần | Khung đội agent không còn khóa JSON, nhưng khối "Trích nguồn" vẫn lộ tên kỹ thuật: `customer.kyc_assessment`, `so_tinh_lai`, `compliance_policy`, `collateral: "[]"` (`d1.jsonl` c1, c3; `ag2.jsonl`). Số tiền bị che nhầm thành "giá trị định giá=30*****00.0" (xem M07). |
| L08 | Vừa | Đã sửa | Mọi 403/404/409/422 gặp trong lần 2 đều tiếng Việt: `MISSING_PERMISSION`, `ACCESS_DENIED` "Chỉ người đang giữ bước…", `EXCEPTIONS_UNDECIDED`, `VERSION_CONFLICT`, `ROLE_NOT_ALLOWED` "Vai trò của bạn không được xác nhận hoặc bỏ loại đề xuất này", `REASON_REQUIRED`, `PROPOSAL_DISMISSED` (`fA`, `d4.jsonl`). |
| L09 | Vừa | Đã sửa | Hồ sơ D 120 tỷ: "Chờ phiên Hội đồng – có ở đợt 2", không còn mã thô; QHKH thấy lý do khóa đội agent tiếng Việt (`fD` bước `council`, `qhkh-team-panel`). |
| L10 | Vừa | Đã sửa | Đầu trang ghi đúng người giữ: "Đang giữ: Pham Thu Ha" (cấp 2), "Đang giữ: Giám đốc Chi nhánh" (cấp 1) (`fA` bước `who-holds`, `fC`). |
| L11 | Vừa | Đã sửa | Trưởng phòng có menu riêng "Trưởng phòng Tín dụng · Hồ sơ của phòng" (`sR.jsonl`). Còn lỗi mới M02 về nội dung trang. |
| L12 | Nhẹ | Đã sửa | Chuông của `tdinh2`: "Được giao hồ sơ: LA-20261111-1730E79B Trưởng phòng chuyển hồ sơ cho bạn: <lý do>" (`fD` bước `tdinh2-receives`). |
| L13 | Nhẹ | Đã sửa (theo mã) | `WelcomeState.tsx:42` in đủ `staffName.trim()` (commit `2d7cf17`). Lần 2 không chụp lại lời chào vì các phiên chat đều mở thẳng vào hồ sơ. |
| L14 | Nhẹ | Đã sửa | Sau "Khách rút hồ sơ", "Việc của tôi" của QHKH còn 0 việc (`fB` bước `after-withdraw-probe`, `inMyWork: 0`). Còn lỗi mới M03 ở thanh bước. |
| L15 | Vừa | Đã sửa | Trước khi tải ở cảnh 4, hồ sơ Phú Điền có 0 tài liệu (`c4b.jsonl` `n0: 0`); sau `reset-demo.sh` không còn tài liệu cũ chồng lên. |
| L16 | Vừa | Đã sửa | `agent_engine/common/rag.py:30-31` nạp thêm `shared_*.md` cho mọi miền; Credit trích "Nợ vay/EBITDA … (tối đa 3.5)" và "DSCR ≥1,25" đúng `shared_cs_td_sme_2025.md:21`. Sông Hàn: (25+22)/12 = 3,92 > 3,5, khớp `credit.sme_financial_year`. |
| L17 | Vừa | Còn | VinaNova chạy lại vẫn ra 8 đề xuất (2 `add_risk_flag`, 1 `request_documents`, 5 `add_disbursement_condition`), lượt trước ra 10. "BCTC kiểm toán" lặp 3 lần; một "điều kiện trước giải ngân" có nội dung "Chưa thể phê duyệt: cần xác nhận hồ sơ kiểm toán…" (`d1.jsonl` c1, `d4.jsonl` props). Mỗi đề xuất sinh một thông báo: 10 thông báo giống tiêu đề trong cùng 1 giây (xem M05). |
| L18 | Vừa | Sửa một phần | Chat không còn nhãn "Hội đồng agent" và "rules.md Q7". Thẻ kết quả vẫn ghi "Hạn mức đề xuất: VND" (trống số) và trạng thái tiếng Anh "Pending Approval", "Credit: flag" (ảnh `d4-chat-Cho tô.png`). Câu trả lời DSCR tự mâu thuẫn (xem M08). |
| C1 | – | Như Q-W (chờ chủ dự án xác nhận) | `tdinh` bị chuyển đi nhận 404 trên hồ sơ D. Chuông cũ "Hồ sơ giao cho bạn" vẫn trỏ tới hồ sơ đó, bấm vào ra 404 (`fD` bước `tdinh-old`). |
| C2 | – | Còn như lần 1 | `tdinh` và `ruiro` vẫn đọc được trace của lượt QHKH chạy trên nháp (`GET /agent-cases/case_07d9417f1045` → 200, `c23.jsonl`). Chuyển sang "Cần xác nhận" C-N3. |
| C3 | – | Còn như lần 1 | Trang Đội agent của `qhkh` không liệt kê lượt vừa chạy trên nháp Mekong Flex (`c23.jsonl` `has: false`). Chuyển sang C-N3. |
| C4 | – | Không còn | Cảnh 1 nay ghi "ĐỀ XUẤT PHÊ DUYỆT hạn mức 80 tỷ VND kèm điều kiện", không còn "chuyên gia còn ý kiến khác". |

## Bảng điểm theo vai

Tiêu chí: hoàn thành việc / kẹt, lỗi / thông báo và lý do khóa / lộ mã thô / phân quyền.

| Vai (tài khoản) | Lần 1 | Lần 2 | Đã đi qua lần 2 | Lý do trừ điểm |
|---|---|---|---|---|
| QHKH (`qhkh`) | 6,5 | 8,0 | Tạo đề xuất; nhận "Hồ sơ bị trả lại" kèm lý do; gia hạn (lần 2 khóa "chỉ được gia hạn 1 lần", "Rút hồ sơ quá hạn" khóa có lý do); gửi lại; bổ sung theo yêu cầu Thẩm định; khách rút; nhận "Có quyết định… phê duyệt có điều kiện" và "Hồ sơ bị từ chối"; điều kiện trước giải ngân "Từ quyết định". Gọi API ngoài phần việc: 403 tiếng Việt. | M03 thanh bước hồ sơ đã rút hiện ✓ mọi bước. Lý do có hai dấu chấm "rõ.. Hồ sơ". Checklist lộ mã `SME-01-CREDIT-REQUEST`. "Khách hàng SME" và ô tìm kiếm báo "sẽ có ở đợt sau". |
| HTTD (`httd`) | 6,5 | 8,0 | Đạt / Không đạt giấy tờ, Trả lại QHKH, chuyển Thẩm định, nhận bổ sung, "Ghi nhận đã giải trình" ở bước Rủi ro – chờ bổ sung; mở tài liệu OCR cảnh 4 (4 vùng tô, cảnh báo "Tài liệu có thể không thuộc khách hàng của hồ sơ"). Tra cứu CIC khóa có lý do "thiếu văn bản đồng ý tra cứu CIC của khách (§6.1)". | M06 nhãn vùng tô đè lên vùng khác, không bấm được vùng "Vốn điều lệ". 107 thông báo chưa đọc, nhiều bản trùng (xem "Cần xác nhận" C-N1). |
| Thẩm định (`tdinh`, `tdinh2`) | 7,5 | 8,0 | Yêu cầu bổ sung, Trả lại QHKH, Trình Rủi ro, nhận hồ sơ Rủi ro trả lại và trình lại, nhận hồ sơ Phê duyệt trả lại (lý do ở dòng thời gian), chạy đội agent, xác nhận và bỏ đề xuất (bỏ cần lý do ≥5 ký tự, bỏ lần 2 ra 409), chat theo hồ sơ. Dòng thời gian che lý do fraud "Lý do bị hạn chế theo vai trò". | M04 không có đường trên giao diện để Thẩm định cộng lại người liên quan rồi "Nâng cấp phê duyệt" (F10). Khung "bổ sung" trống sau khi Phê duyệt trả lại, lý do chỉ ở dòng thời gian. 8–10 đề xuất mỗi lượt (L17). 11 nút "Xử lý cờ". |
| Rủi ro (`ruiro`) | 8,0 | 8,5 | Trả lại Thẩm định; ghi ý kiến; "Trình phê duyệt" khóa có lý do "Thiếu Ý kiến Rủi ro, ý kiến Tuân thủ hoặc kết luận cờ CIC"; trình phê duyệt; khi hồ sơ bị giữ vì nghi gian lận thì không có nút, gọi API 403 tiếng Việt. | Không chạy được đội agent khi giữ hồ sơ, trái `ma-tran-phan-quyen.md:219` (C-N2). |
| Tuân thủ (`tuanthu`) | 5,0 | 8,5 | Nhận việc và chuông khi hồ sơ vào RISK_REVIEW; ghi ý kiến; kết luận cờ; "Tạm dừng nghi gian lận", gỡ, rồi yêu cầu giải trình (hồ sơ sang "Rủi ro – chờ bổ sung", HTTD nhận chuông "Bước Chờ giải trình"). | Không chạy được đội agent (C-N2). Không có lỗi Cao. |
| Phê duyệt cấp 1 – Giám đốc chi nhánh (`giamdoc`) | 7,5 | 8,5 | Hồ sơ C 3 tỷ: "Trả lại bổ sung" (hồ sơ về Đang thẩm định, lý do vào dòng thời gian), rồi Từ chối ở vòng 2. Ở hồ sơ cấp 2 do người khác giữ: nút Quyết định khóa có lý do. Hàng đợi rỗng khi không có việc. | Thẩm định không thấy lý do trả lại ngay ở khung việc cần làm, chỉ ở dòng thời gian (trừ cho luồng). |
| Phê duyệt cấp 2 Hội sở (`pheduyet`, `pheduyet2`) | 7,5 | 8,5 | `pheduyet2` giữ hồ sơ A 25 tỷ: phê duyệt có điều kiện, quyết từng ngoại lệ (11 dòng). `pheduyet` phê duyệt Thành Đạt 55 tỷ ở cảnh 5, nút Quyết định biến mất sau khi ghi. Hồ sơ Hội đồng: mọi người gọi quyết định đều 403/404. | Ngoại lệ hiện mã checklist thô (`SME-…`). Trang Đội agent của `pheduyet` "Chưa có lượt phân tích" trong khi các vai khác thấy hàng trăm (C-N3). |
| Trưởng phòng (`credit.manager@`) | 7,0 | 6,5 | Chuyển hồ sơ D sang `tdinh2` (lý do bắt buộc; danh sách người nhận có "0 việc đang mở"); người nhận có chuông kèm mã hồ sơ; người cũ nhận 404. | M02: "Hồ sơ của phòng" luôn "0 hồ sơ đang chờ bạn"; ô tìm kiếm khóa "sẽ có ở đợt sau"; "Khách hàng SME" chưa có trang; mở `/customer/{id}` của khách trong phòng ra "Không tìm thấy khách hàng". Muốn chuyển hồ sơ phải có sẵn đường dẫn. Không chạy được đội agent (C-N2). |
| Kiểm toán (`kiemtoan`) | 8,0 | 8,5 | "Hồ sơ vay – chỉ đọc" có danh sách và bộ lọc; nhật ký kiểm toán 50 dòng/trang, có người thao tác, hành động tiếng Việt, đối tượng, mã hồ sơ, kết quả; mọi thao tác ghi bị 403. `/audit-events` chỉ Kiểm toán được 200. | Cột hành động in kèm mã thô (`WORKFLOW_DECIDE`, `CASE_FLAG_HANDLE`…) dạng chữ phụ, cố ý ở `AuditLogPage.tsx:71`; chấp nhận được với kiểm toán viên. Chưa thử lọc theo hồ sơ. |
| Quản trị (`quantri`) | 7,0 | 5,5 | Đổi tài khoản demo: danh sách 11 tài khoản, băng "Chế độ demo · Đang demo với vai …", "Quay về Quản trị" hoạt động. API nghiệp vụ (`/work-items`, `/policies`, `/audit-events`) 403. | M01: không có trang quản trị nào. Mọi trang báo "Tài khoản quản trị chỉ quản lý người dùng, phân quyền, ngưỡng và cấu hình AI", nhưng nút "Mở Quản trị" khóa "Trang Quản trị sẽ có ở đợt sau". Vai này không làm được việc nào của mình ngoài chế độ demo. |

## Bảng 5 sản phẩm của đề bài

Căn cứ: 10 lượt chạy đội agent trên 9 khách khác nhau (VinaNova ×2, Việt Tiến, Sông Hàn, Trường An, Nông sản Tây Nguyên, Mekong Flex 120, Hưng Phát, Đông Á, Cảng Xanh). Mỗi lượt đối chiếu cấp, cổng và số với DB (`truth.sql`) và corpus.

| # | Sản phẩm (đề bài SHB2) | Lần 1 | Lần 2 | Bằng chứng | Trừ điểm |
|---|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 6,5 | 7,5 | Credit · Compliance · Operations chạy song song, Validation phản biện. Cổng đúng dữ liệu ở 10/10 lượt: thiếu BCTC/AML ra `Needs Info` (5 ca), CIC nhóm 3 ra `Rejected` (Sông Hàn), đủ dữ liệu ra `Pending Approval` (VinaNova, Hưng Phát). | M08: số không nhất quán giữa chuyên gia mà Validation không bắt (Trường An: Credit "chưa có định giá", Compliance "TSĐB định giá 28 tỷ, pháp lý rõ"; VinaNova Nợ/EBITDA 1,39 và 1,82 trong cùng lượt). Đề xuất phê duyệt nhưng điều kiện ghi "Chưa thể phê duyệt…" (VinaNova, Hưng Phát). |
| 2 | Planner giao việc cho executor | 8,0 | 8,5 | Trace có `plan_created` → `tasks_dispatched` T1–T3 song song → T4 Validation; orchestrator tính lại dữ kiện (`facts_recomputed`, bù `get_bank_exposure`). Khung "Planner → Credit · Compliance · Operations → Validation → Người quyết định" ở mọi hồ sơ. | Không có lỗi đáng kể. |
| 3 | Agent gọi công cụ và hành động thật | 7,0 | 7,5 | 14 lần gọi công cụ mỗi lượt. Số khớp DB: Sông Hàn (25+22)/12 = 3,92 > 3,5; Việt Tiến LTV 20/30 = 66,7%, hạn mức bảo đảm 21 tỷ; CIC Mekong Flex 08/10 quá 30 ngày; TSĐB Mekong Flex chỉ DECLARED nên giá trị đủ điều kiện 0. Xác nhận đề xuất tạo điều kiện thật ("Đã xác nhận và thực hiện"); bỏ cần lý do; vai sai 403/404 tiếng Việt. | L17: 8–10 đề xuất mỗi lượt, trùng nội dung. M05: mỗi đề xuất một thông báo. `add_risk_flag` mang nội dung điều kiện. |
| 4 | Dashboard trace, trạng thái, quyết định | 7,0 | 7,5 | Danh sách lượt: khách, hồ sơ, mã lượt, yêu cầu, trạng thái tiếng Việt, số công cụ, thời gian. Drawer trace theo bước; dòng "Người quyết định · AI chỉ đề xuất". Hồ sơ hiện "Đã kết thúc · 49 sự kiện". | L07 sửa một phần (tên kỹ thuật trong trích nguồn). M07 số tiền bị che. C-N3 phạm vi danh sách (QHKH không thấy lượt của mình, `pheduyet` thấy rỗng). |
| 5 | So sánh single và multi | 7,5 | 7,5 | Tab "So sánh hiệu năng" (`c23-compare.png`): bộ v7, 8 ca × 1 lượt × 2 chế độ. Multi hơn single: độ phủ 69,0% so với 53,3%, trích nguồn đúng 100% so với 89,6%, dừng đúng cổng 100% so với 75%. Nêu thẳng single rẻ hơn (0,0022 so với 0,0033 USD) và nhanh hơn (38,8 so với 40,0 giây). Ghi rõ "chấm bằng từ khóa, không có LLM chấm". | Chỉ 1 lượt mỗi ca (lần 1 là 3), độ lệch từng ca đều ±0,0. Mẫu 8 ca nhỏ. Lộ nhãn nội bộ "nhãn: f7 sau sửa L05-L18 v7 một lượt mỗi ca" và "Mã kỹ thuật". |

### Câu hỏi khó giám khảo có thể hỏi

| Câu hỏi | Hệ thống trả lời được tới đâu |
|---|---|
| Agent có tự duyệt khoản vay không? | Được. Cổng ghi "AI chỉ đề xuất"; chỉ `loan_approver` quyết; đề xuất phải có người xác nhận; vai sai bị 403 `ROLE_NOT_ALLOWED`. Benchmark "dừng đúng cổng 100%". |
| Hai chuyên gia nói ngược nhau thì ai phân xử? | Một phần. Validation bắt được thiếu dữ liệu chặn (CIC hết hạn, chưa AML, chưa BCTC), nhưng bỏ qua mâu thuẫn số giữa Credit và Compliance (M08). |
| Số liệu lấy từ đâu, có bịa không? | Phần lớn. Trích nguồn nêu công cụ và giá trị, khớp DB ở mọi số đã đối chiếu. Nhưng số tiền bị che "30*****00.0" (M07), và chat tự mâu thuẫn về DSCR. |
| VinaNova 80 tỷ, nợ 98 tỷ ở nơi khác, vì sao chỉ cấp 2? | Được. Agent ghi "dư nợ 98 tỷ tại TCTD khác không tính theo Q4", khớp `rules.md:16`. |
| Multi hơn single bao nhiêu, đo thế nào? | Một phần. +15,6 điểm phần trăm độ phủ trên 8 ca × 1 lượt, chấm từ khóa, nêu rõ chi phí cao hơn. Giám khảo sẽ hỏi độ lặp lại và cỡ mẫu; trang không có. |
| Chạy lại có ra cùng kết quả không? | Một phần. VinaNova hai lượt cùng cổng (`Pending Approval`, cấp 2), nhưng 10 rồi 8 đề xuất với điều kiện diễn đạt khác. |
| Hỏi chat CCCD, số điện thoại khách khác thì sao? | Được. Từ chối rõ: "Tôi không cung cấp thông tin định danh cá nhân…" (`d4-chat-Cho tô.png`). |
| Thiếu dữ liệu thì agent làm gì? | Được. Ra `Needs Info`, liệt kê mục cần bổ sung kèm điều khoản (§4.2, §6.1, §6.3, compliance Điều 6) và đề xuất `request_documents`. |
| Hỏi chat "hồ sơ thuộc cấp nào, vì sao" | Một phần. Trả lời "Cấp 2 Hội sở" nhưng nói "Dữ liệu không có nội dung quy định CS-TD-SME/2025 §3.1", dù §3.1 nằm ở `shared_cs_td_sme_2025.md:12`. Mỗi câu chat mất 94–104 giây. |

## 5 cảnh demo (đi như buổi demo thật)

Chạy liền một mạch bằng `d1-demo.spec.ts` (`d1.jsonl`), rồi `reset-demo.sh`. Tổng **152 giây** cho 5 cảnh.

| Cảnh | Hồ sơ | Thời gian | Kết quả | Chỗ vấp |
|---|---|---|---|---|
| 1. Đề xuất phê duyệt kèm điều kiện | VinaNova 80 tỷ, `tdinh` | 37 s (mở trang 2 s) | `Pending Approval`, "ĐỀ XUẤT PHÊ DUYỆT hạn mức 80 tỷ VND kèm điều kiện", Cấp 2 Hội sở; có thẻ `add_disbursement_condition`; xác nhận một thẻ 4 s, thẻ chuyển "Đã xác nhận và thực hiện". | 10 thẻ đề xuất, BCTC kiểm toán lặp 3 lần. Một điều kiện ghi "Chưa thể phê duyệt…" ngay dưới "ĐỀ XUẤT PHÊ DUYỆT". Trích nguồn lộ `kyc_assessment`. |
| 2. Cần bổ sung | Việt Tiến 20 tỷ, `tdinh` | 37 s | `Needs Info`, "Chưa có BCTC… chưa tính được Nợ vay/EBITDA (§4.2, §6.1)"; thẻ `request_documents` "Yêu cầu khách bổ sung 2 mục"; cấp 1 đúng. | Không. |
| 3. Từ chối vì CIC | Sông Hàn 22 tỷ, `tdinh` | 37 s | `Rejected`, "TỪ CHỐI: CIC nhóm 3", nợ quá hạn 14 tỷ, Nợ vay/EBITDA 3,92 > 3,5. | Trích nguồn lộ `so_tinh_lai`, `collateral: "[]"`. |
| 4. OCR PDF scan | Phú Điền, `qhkh` tải, `httd` xem | 4 s tải + 10 s xử lý và mở | 4 vùng tô; cảnh báo "Tài liệu có thể không thuộc khách hàng của hồ sơ (CONG TY TNHH LAT TAM)"; bấm vùng ra thẻ "Mã số thuế 0312345678 · AI đề xuất · Độ tin cậy do AI báo 80% · Tôi đã đối chiếu, xác nhận giá trị" (`c4b.jsonl`). | Thẻ chỉ hiện sau khi bấm một vùng; nhãn vùng đè nhau, vùng "Vốn điều lệ" không bấm được (M06). Người trình bày nên bấm vùng dưới cùng hoặc chọn ở danh sách trường bên cạnh. |
| 5. Đi tới quyết định | Thành Đạt 55 tỷ, `pheduyet` | 10 s | Ghi "Phê duyệt"; đầu trang "Đã phê duyệt · Được duyệt: 55 tỷ VND"; nút Quyết định biến mất. | Không. |

## Danh sách lỗi

Mẫu: mã · mức · vai. Chỉ ghi lỗi đã tái hiện trong lần 2. Lỗi lần 1 còn lại (L07, L17, L18) xem bảng "Kiểm lại lỗi lần 1".

### M01 · Cao · Quản trị
- **Tái hiện:** đăng nhập `quantri`, mở bất kỳ trang nào trong menu.
- **Mong đợi:** chính trang báo vai này "quản lý người dùng, phân quyền, ngưỡng và cấu hình AI" (`NoAccess.tsx`); ngưỡng cấp phê duyệt "cấu hình được" (`rules.md:16`).
- **Thực tế:** không có trang nào để làm các việc đó. Nút "Mở Quản trị" bị khóa với tooltip "Trang Quản trị sẽ có ở đợt sau". Vai chỉ dùng được chế độ demo đổi tài khoản.
- **Ảnh:** `sR2-quantri-home.png`.
- **Nghi ngờ:** chưa làm; `frontend/src/features/shell/NoAccess.tsx:35-41`. Nếu phạm vi đợt này cố ý bỏ trang quản trị thì hạ mức (C-N4).

### M02 · Cao · Trưởng phòng
- **Tái hiện:** đăng nhập `credit.manager@`, mở "Hồ sơ của phòng". Thử ô tìm kiếm, menu "Khách hàng SME", và `/customer/56000000-0000-4000-8000-000000000002` (Mekong Flex, khách có hồ sơ 120 tỷ của phòng).
- **Mong đợi:** Trưởng phòng chuyển người xử lý cho hồ sơ trong phòng (`rules.md:199` Q-B, `ma-tran-phan-quyen.md:68` Q-D2), nên phải tìm được hồ sơ của phòng.
- **Thực tế:**
  - "Hồ sơ của phòng" luôn ghi "Không có việc đang chờ bạn · 0 hồ sơ đang chờ bạn".
  - Ô tìm kiếm bị khóa ("Tìm kiếm sẽ có ở đợt sau").
  - "Khách hàng SME" chỉ hiện toast "sẽ có ở đợt sau".
  - Trang khách hàng báo "Không tìm thấy khách hàng".
  - Chỉ chuyển được khi đã có sẵn đường dẫn hồ sơ (luồng D làm vậy).
- **Ảnh:** `fD-truongphong-home.png`, `sR3-tp-customer.png`.
- **Nghi ngờ:**
  - `backend/app/services/work_item_service.py:124-150`: ngoài Kiểm toán, mọi vai chỉ nhận `queue(employee_id)`.
  - Nhãn "Hồ sơ của phòng" ở `frontend/src/features/my-work/roleCopy.ts:11,22` hứa một danh sách không có.
  - `frontend/src/features/shell/Topbar.tsx:19` khóa ô tìm kiếm.

### M03 · Vừa · QHKH (và mọi vai xem hồ sơ đã rút)
- **Tái hiện:** luồng B, QHKH bấm "Khách rút hồ sơ" (hồ sơ → Đã rút), xem thanh bước ở đầu trang.
- **Mong đợi:** thanh bước cho thấy hồ sơ dừng ở bước nào, không như đã đi hết quy trình.
- **Thực tế:** cả 6 bước đều ✓, giống hồ sơ hoàn tất.
- **Ảnh:** `fB-qhkh-withdraw.png`.
- **Nghi ngờ:** `frontend/src/features/loan-detail/LoanHeader.tsx:11-18`, `stageIndex` trả 5 cho mọi trạng thái khác, kể cả WITHDRAWN.

### M04 · Vừa · Thẩm định
- **Tái hiện:** `tdinh` mở `/de-xuat-vay/75000000-0000-4000-8000-000000000003` để rà người liên quan theo F10.
- **Mong đợi:** "Thẩm định cộng lại mà vượt cấp thì Nâng cấp phê duyệt" (`rules.md:129` F10, `rules.md:16` Q4).
- **Thực tế:**
  - Trang báo "Trang “Tạo đề xuất vay” không thuộc phạm vi của Chuyên viên Thẩm định" (`sR2.jsonl`).
  - Phần người liên quan chỉ có ở trang đề xuất.
  - Nút "Nâng cấp phê duyệt" chỉ hiện khi `tier.upgrade_due`.
  - Không có thao tác nào trên giao diện làm tổng tăng sau khi trình, nên nhánh nâng cấp không đi được.
- **Ảnh:** `sR2-tdinh-proposal.png`.
- **Nghi ngờ:** `backend/app/services/case_action_service.py:95-103`; `backend/app/workflow/service.py:323-327` (cấp chỉ ghi lúc trình).

### M05 · Vừa · Thẩm định (người nhận đề xuất)
- **Tái hiện:** chạy đội agent cảnh 1 (VinaNova), xem chuông của `tdinh`.
- **Mong đợi:** một thông báo cho một lượt chạy, hoặc thông báo gộp.
- **Thực tế:** 10 thông báo "Đề xuất mới của đội agent: HSV-2026-00187" cùng giây 08:26:28, mỗi đề xuất một thông báo. `appraiser@` có 95 thông báo chưa đọc.
- **Ảnh:** —. SELECT `integration.notification` theo tiêu đề.
- **Nghi ngờ:** trigger ở `infra/database/migrations/V051__notification_events_and_scope_guard.sql:74` chạy cho từng đề xuất.

### M06 · Nhẹ · HTTD (cảnh 4)
- **Tái hiện:** `httd` mở tài liệu scan Phú Điền, bấm vùng tô đầu tiên ("Vốn điều lệ").
- **Mong đợi:** mở thẻ trường.
- **Thực tế:** nhãn "Người đại diện pháp luật" của vùng bên dưới đè lên, không bấm được (Playwright: "subtree intercepts pointer events"). Nhãn cũng che chữ gốc của dòng trên. Vẫn chọn được từ danh sách trường bên cạnh.
- **Ảnh:** `d1-c4.png`.
- **Nghi ngờ:** `frontend/src/features/reconciliation/reconciliation.module.css:12` (`.regionText` đặt `bottom: 100%`, cao 16 px, đè lên vùng phía trên).

### M07 · Vừa · Mọi vai xem đội agent
- **Tái hiện:** chạy đội agent cảnh 2 (Việt Tiến), đọc "Trích nguồn".
- **Mong đợi:** giá trị TSĐB 30 tỷ đọc được (che PII là cho CCCD, số tài khoản, số điện thoại).
- **Thực tế:** "giá trị định giá=30*****00.0".
- **Ảnh:** `d1-c2.png`.
- **Nghi ngờ:** `agent_engine/common/pii.py:9`, mẫu `\b(\d{2})\d{5,8}(\d{2})\b` cho số TK/SĐT cũng khớp số tiền.

### M08 · Vừa · Đội agent
- **Tái hiện:**
  - Trường An 60 tỷ (case_3bca55fe2ca6).
  - VinaNova 80 tỷ (case_d233e68e6f49).
  - Chat của `tdinh` về VinaNova: "DSCR của hồ sơ này là bao nhiêu…".
- **Mong đợi:** Validation "kiểm chứng chéo, phản biện" bắt được số không thống nhất giữa chuyên gia.
- **Thực tế:**
  - Trường An: Credit "chưa có giá trị định giá và pháp lý", Compliance "TSĐB định giá 28 tỷ, pháp lý rõ" (DB khai báo 30 tỷ); Validation không nêu.
  - VinaNova: cùng lượt có Nợ vay/EBITDA "1,39 lần" và "178/98 = 1,82 lần".
  - Chat: "DSCR 1,34 lần… tính lại cho 1,445 lần, EBITDA 98 tỷ so với 128 tỷ", rồi lại "không có EBITDA". DB có EBITDA 2025 là 98 tỷ.
- **Ảnh:** `d4-chat-DSCR c.png`.
- **Nghi ngờ:** chưa định vị trong Validation của engine; `agent.case_event` lưu cả hai số.

### M09 · Nhẹ · Chat
- **Tái hiện:** `tdinh` hỏi 3 câu trong chat theo hồ sơ VinaNova.
- **Mong đợi:** trả lời trong thời gian dùng được khi demo.
- **Thực tế:** 101, 104 và 94 giây mỗi câu. Không tạo lượt đội agent mới (`agent.case_run` không tăng).
- **Ảnh:** `d4-chat-*.png`.
- **Nghi ngờ:** chưa định vị.

### M10 · Nhẹ · Mọi vai
- **Tái hiện:** đọc các trang dưới đây.
- **Mong đợi:** không lộ mã thô hay tiếng Anh với người dùng nghiệp vụ.
- **Thực tế:**
  - Chat: "Đội agent · Pending Approval", "Credit: flag".
  - Khung Hưng Phát: `data_label`.
  - Tab so sánh: "nhãn: f7 sau sửa L05-L18…".
  - Ngoại lệ: mã checklist `SME-…`, `SME-01-CREDIT-REQUEST`.
  - Lý do trả lại có hai dấu chấm "rõ.. Hồ sơ".
- **Ảnh:** `d4-chat-Cho tô.png`, `c23-compare.png`, `fB-*.png`.
- **Nghi ngờ:** `frontend/src/features/chat/components/EnginePanel.tsx:158`.

## Cần xác nhận

- **C-N1.** Thông báo "Hồ sơ giao cho bạn: HSV-2026-00184" có 10 bản chưa đọc cho `appraiser@` (5 cho `risk@`, 5 cho `document.reviewer@`) trong ngày. Có vẻ do các crew nạp lại seed nhiều lần, mỗi lần sinh lại thông báo mà không xóa bản cũ. Nếu đúng thì không xảy ra khi dùng thật, nhưng demo sẽ thấy chuông đầy (`document.reviewer@` 107 chưa đọc).
- **C-N2.** Ai được chạy đội agent?
  - `ma-tran-phan-quyen.md:219`: "Thẩm định, Rủi ro, Tuân thủ, Trưởng phòng; QHKH không".
  - Mã `backend/app/services/loan_agent_run_service.py:23-26` cho QHKH (Nháp, Trả về, Chờ bổ sung) và Thẩm định (Đang thẩm định).
  - Kết quả: Rủi ro đang giữ hồ sơ Đại Thành và Nam Phương bị khóa "Chỉ Quan hệ khách hàng hoặc Thẩm định đang giữ hồ sơ mới được chạy đội agent" (`ag3.jsonl`).
  - Cần chốt bên nào đúng.
- **C-N3.** Phạm vi trace:
  - `tdinh` và `ruiro` đọc được trace lượt QHKH chạy trên nháp (C2 lần 1).
  - QHKH không thấy lượt của mình trong danh sách (C3 lần 1).
  - `pheduyet` thấy "Chưa có lượt phân tích" trong khi `pheduyet2` thấy 17 và QHKH, GĐ, Trưởng phòng, Kiểm toán thấy 822.
- **C-N4.** Phạm vi đợt này có gồm trang Quản trị (M01), ô tìm kiếm và "Khách hàng SME" (M02) không? Q-B ghi Trưởng phòng "chỉ phân công chứ không có trang riêng", nhưng không nói Trưởng phòng tìm hồ sơ bằng cách nào.
- **C-N5.** (C1 lần 1, Q-W) Người bị chuyển hồ sơ đi nhận 404 là đúng quyết định. Chuông cũ vẫn trỏ tới hồ sơ và bấm vào ra 404: có cần ẩn hoặc ghi "đã chuyển cho người khác" không?
- **C-N6.** Sau khi Phê duyệt "Trả lại bổ sung" về Thẩm định, lý do chỉ ở dòng thời gian, khung "bổ sung" trống. Lý do có cần hiện ở khung việc cần làm như các nhánh trả lại khác không?

## Chưa kiểm tra

- Bộ lọc và mở chi tiết dòng trong nhật ký kiểm toán: chỉ đọc trang danh sách.
- Quản trị mở `/chat` được (trang chat trống). Chưa thử hỏi về một hồ sơ để xem có lộ nội dung tín dụng không.
- Bấm "Nâng cấp phê duyệt": không có đường trên giao diện để điều kiện xảy ra (M04).
- Phiên Hội đồng (đợt 2): chỉ kiểm hồ sơ 120 tỷ dừng ở "Chờ phiên Hội đồng" và không ai quyết được.
- Thư email thật: worker tắt; `notification_delivery` không có dòng mới trong ngày.
- Benchmark v8 (ngoài phạm vi), độ lặp lại khi chạy nhiều lượt.
- Lời chào trang chat (L13) chưa chụp lại, chỉ kiểm mã.
- Hưng Phát và Đầu tư Mekong qua HTTD: tra cứu CIC khóa vì thiếu văn bản đồng ý (§6.1), nên hai ca đó chạy dưới dạng nháp của QHKH. Ca E5 Đầu tư Mekong (15,2 tỷ tại ngân hàng + 5 tỷ) chưa chạy.

## Những điều trong brief khác thực tế

- "Trang quản trị": chưa có. `NoAccess.tsx:35-41` khóa nút "Mở Quản trị" với "Trang Quản trị sẽ có ở đợt sau".
- Demo cảnh 5 trong `demo-data.md` vẫn đúng (`pheduyet` giữ Thành Đạt). Ghi chú "giamdoc mở hồ sơ cấp 2 thì ghi bị 500" đã cũ: lần 2 nút Quyết định khóa có lý do.
- Bảng `integration.notification_delivery` chỉ còn 2 dòng SENT (10/11), không có dòng mới trong ngày chấm vì worker email đang tắt (`integration.email_outbox_setting.enabled = f`). Lần 1 ghi 608 PENDING; bảng đã được dọn.
