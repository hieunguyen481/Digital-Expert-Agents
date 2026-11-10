# Chấm điểm chức năng – lần 1

Ngày chấm: 11/11/2026, khoảng 02:00–04:10 giờ Việt Nam. Ứng dụng: web `:3000`, API `:8000`, engine chế độ `llm`, nhánh `import/duskdash` tại `9903fae`, DB V054.
Cách chấm: đăng nhập từng vai bằng Playwright trên giao diện thật. Hành động bị cấm thử cả trên giao diện lẫn API. Đối chiếu DB chỉ bằng SELECT. Chỉ chấm chức năng, không chấm thẩm mỹ (giao diện đang được làm lại).
Script và log nằm ở `/tmp/g4/` (`specs/*.spec.ts`, `*.jsonl`); ảnh ở `/tmp/g4/shots/`. Đã tiêu 13/30 lượt chạy đội agent, gồm 3 câu hỏi chat vì mỗi câu kích hoạt một lượt đội agent.

## Kết luận

**KHÔNG ĐẠT.**
- Không vai nào và không sản phẩm nào đạt ngưỡng 8,5.
- Có 7 lỗi mức **Cao**: L01–L07.
- Không có lỗi **Chặn demo**: 5 cảnh demo đều đi tới kết quả mong đợi.

Lỗi cần sửa trước:
1. HTTD không có nút trả lại QHKH (L01).
2. Thẻ yêu cầu bổ sung không hiện lý do (L02).
3. Tuân thủ không có việc và không nhận thông báo (L03).
4. Hồ sơ bị từ chối vẫn hiện "Được duyệt: 3 tỷ" (L04).
5. Đội agent ra "Chờ xác nhận / đề xuất phê duyệt" dù Credit và Compliance đều "Cần thêm thông tin" (L05).
6. Cấp phê duyệt do agent nêu sai so với Q4 (L06).
7. Khung đội agent lộ hàng loạt khóa kỹ thuật (L07).

## Bảng điểm theo vai

Tiêu chí: hoàn thành việc / kẹt, lỗi / thông báo và lý do khóa / lộ mã thô / phân quyền.

| Vai (tài khoản) | Điểm | Đã đi qua | Lý do trừ điểm |
|---|---|---|---|
| QHKH (`qhkh`) | 6,5 | Tạo đề xuất (~10 s), gửi HTTD, nhận "Hồ sơ bị trả lại", gia hạn (lần 2 khóa, lý do "chỉ được gia hạn 1 lần"), gửi lại, tải tài liệu bổ sung, khách rút hồ sơ, nhận "Có quyết định… từ chối / phê duyệt có điều kiện", chạy đội agent trên 6 hồ sơ nháp | L02: không thấy Thẩm định cần bổ sung gì. L04: hồ sơ bị từ chối hiện "Được duyệt". L07, L09: lộ mã thô (`COUNCIL_SESSION`, `draft_id`…). L13: lời chào bị cắt tên. L14: sau khi rút vẫn "Còn 1 việc" |
| HTTD (`httd`) | 6,5 | Đạt / Không đạt từng giấy tờ (Không đạt thì khóa chuyển, có lý do "Còn thiếu hoặc hết hạn: …"), chuyển Thẩm định, nhận "Hồ sơ giao cho bạn: Bước Chờ khách bổ sung", Ghi nhận đã bổ sung, xem OCR có vùng tô và thẻ "AI đề xuất" | L01: không có nút "Trả lại QHKH" ở bước Kiểm tra; API thì cho phép. L15: danh sách tài liệu của hồ sơ demo dài 130 tệp trùng |
| Thẩm định (`tdinh`, `tdinh2`) | 7,5 | Yêu cầu bổ sung, Trả lại QHKH, Trình Rủi ro (khóa có lý do "Tờ trình chưa đủ 7 mục"), xử lý cờ, chạy đội agent, xác nhận / bỏ đề xuất (lý do <5 ký tự bị chặn bằng tiếng Việt), nhận lại hồ sơ khi Rủi ro trả | L05, L06, L07 ở khung đội agent. C1: sau khi bị chuyển hồ sơ đi thì `tdinh` nhận 404 trên hồ sơ mình từng xử lý |
| Rủi ro (`ruiro`) | 8,0 | Ghi Ý kiến Rủi ro, Trả lại Thẩm định, Trình phê duyệt (khóa có lý do "Thiếu Ý kiến Rủi ro, ý kiến Tuân thủ hoặc kết luận cờ CIC khách tự nộp"), nhận "Hồ sơ giao cho bạn: Bước Ý kiến Rủi ro". Bị 403 tiếng Việt khi quyết định | Vai này bị chặn bởi L03: chờ Tuân thủ nhưng Tuân thủ không được báo. Không có lỗi riêng của vai |
| Tuân thủ (`tuanthu`) | 5,0 | Ghi được ý kiến Tuân thủ khi tự mở hồ sơ | L03: hồ sơ ở RISK_REVIEW không vào "Việc của tôi" của Tuân thủ (chỉ "Theo dõi", và chỉ khi có cờ mở), không có thông báo nào, trong khi Rủi ro không trình được nếu thiếu ý kiến Tuân thủ |
| Phê duyệt cấp 2 Hội sở (`pheduyet`, `pheduyet2`) | 7,5 | `pheduyet2` giữ hồ sơ 25 tỷ: ghi "Phê duyệt có điều kiện", phải quyết từng ngoại lệ (11 dòng; nút khóa khi thiếu); điều kiện hiện ở "Điều kiện trước giải ngân". `pheduyet` quyết cảnh 5 trong 10 s. Hồ sơ không giữ thì 404; hồ sơ Hội đồng thì 404 | L04 (khi chọn Từ chối). L08: thông báo `EXCEPTIONS_UNDECIDED` bằng tiếng Anh nếu gọi API thiếu ngoại lệ. L10: "Đang giữ" hiện QHKH |
| Giám đốc chi nhánh – cấp 1 (`giamdoc`) | 7,5 | Từ chối hồ sơ 3 tỷ (cấp 1). Ở hồ sơ cấp 2 do người khác giữ: nút Quyết định khóa, lý do "Hồ sơ đang do người khác xử lý…". Ở hồ sơ Hội đồng: xem được, quyết định 403 tiếng Việt | L04 xuất hiện ngay sau quyết định của vai này |
| Trưởng phòng (`credit.manager@`) | 7,0 | Chuyển người xử lý (lý do bắt buộc, danh sách có "· 0 việc đang mở"); người nhận có thông báo; tiêu đề hồ sơ đổi đúng người giữ | L11: giao diện coi Trưởng phòng là QHKH. L12: thông báo "Được giao hồ sơ" không có mã hồ sơ |
| Kiểm toán (`kiemtoan`) | 8,0 | Đọc hồ sơ và trace của mọi ca, mọi hành động ghi bị 403 tiếng Việt | Lộ mã thô ở trace (L07). Trang nhật ký kiểm toán chưa kiểm (xem "Chưa kiểm tra") |
| Quản trị (`quantri`) | 7,0 | Chế độ demo đổi tài khoản bật; không xem được ca agent (404); gọi API chuyển bước bị 403 | L08: thông báo 403 tiếng Anh "You do not have the required permission." |

## Bảng 5 sản phẩm của đề bài

| # | Sản phẩm (đề bài SHB2) | Điểm | Bằng chứng | Trừ điểm |
|---|---|---|---|---|
| 1 | 2–3 chuyên gia phối hợp | 6,5 | Credit · Compliance · Operations chạy song song, Validation kiểm chứng chéo, trên 11 lượt / 9 hồ sơ. CIC nhóm 3 (Sông Hàn) → `Rejected`; thiếu BCTC (Việt Tiến, Nông sản, Đông Á, Cảng Xanh, Đầu tư Mekong) → `Needs Info` có trích §4.2/§6.1 | L05: Mekong Flex 120 tỷ và VinaNova vẫn "đề xuất phê duyệt" dù 2 chuyên gia "Cần thêm thông tin". L06: cấp phê duyệt sai. Credit nêu "DSCR tối thiểu 1,2" (L16) |
| 2 | Planner giao việc cho executor | 8,0 | Khối "Planner giao việc cho đội agent" có lý do ("Credit và compliance chạy song song vì không phụ thuộc nhau… Validation chạy cuối"); thẻ Credit/Compliance/Operations/Validation có nhiệm vụ riêng; khung đội agent vẽ Planner → chuyên gia → Validation → Người quyết định | Lý do của Planner lộ tiếng Anh và khóa (`has collateral=False`, `dry-run`, `count=3`) |
| 3 | Agent gọi công cụ và hành động thật | 7,0 | MCP đọc DB thật: số CIC, TSĐB, BCTC trong trích nguồn khớp `truth.sql` (VinaNova CIC nhóm 1, TS 145 tỷ; Sông Hàn nhóm 3; Việt Tiến không BCTC). `create_loan_draft` tạo bản nháp (chưa hiệu lực). Xác nhận đề xuất `add_disbursement_condition` → "Đã xác nhận và thực hiện" (4 s). Vai sai: 403 `ROLE_NOT_ALLOWED` tiếng Việt; bỏ rồi xác nhận lại: 409 | Dashboard: Document agent 0 xong / 63 lỗi (`get_annual_inflow`). Hưng Phát: 5 điều kiện trước quyết định bị xếp loại "Điều kiện trước giải ngân" (L17) |
| 4 | Dashboard trace, trạng thái, quyết định | 7,0 | `/dashboard?case=…`: trạng thái "Chờ xác nhận", 48 sự kiện, "LLM 7 lượt · 11.762 token · 0,0035 USD", kết luận từng agent, "Chờ kết quả của: Credit, Compliance, Operations", đề xuất và người xác nhận. Phạm vi xem đúng: `pheduyet`, `quantri` 404; `giamdoc`, `kiemtoan` xem hết | L07: mã thô (`total_debt`, `NEEDS_VERIFICATION`, `head_office`, `need_more_info`…). Validation "Đồng ý — ĐỀ XUẤT PHÊ DUYỆT" ngay dưới 2 chuyên gia "Cần thêm thông tin" (L05) |
| 5 | So sánh single và multi | 7,5 | Tab "So sánh hiệu năng": bộ v7, 8 ca × 3 lượt × 2 chế độ; multi 95,2% / single 88,3% độ phủ, trích nguồn 100% / 79,9%, cổng 100% / 75%, độ trễ 18,6 s / 36,2 s; số lấy từ lượt đo đã lưu | Nhãn kỹ thuật lộ trên giao diện ("v7 mù bench7 f0b45e5 single + multi mặc định (OPT_FLAGS đủ, plan bật)"). Chỉ 8 ca. Không chạy lại (benchmark v8 ngoài phạm vi) |

### Câu hỏi khó giám khảo có thể hỏi

| Câu hỏi | Hệ thống trả lời được tới đâu |
|---|---|
| "Agent tự gọi công cụ hay chạy theo kịch bản cố định?" | Trace cho thấy Planner lập kế hoạch có lý do. Trích nguồn ghi tên công cụ (`core-banking:create_loan_draft`) và dữ kiện thật. Chưa có chỗ chỉ ra agent tự chọn công cụ khác nhau theo hồ sơ |
| "Hai chuyên gia bảo cần bổ sung, sao hệ thống vẫn đề xuất phê duyệt?" | **Không trả lời được**: Mekong Flex 120 tỷ ra `Pending Approval` dù AML chưa sàng lọc và không có BCTC kiểm toán (L05) |
| "Hồ sơ 80 tỷ của khách đang nợ 98 tỷ do ai duyệt?" | **Sai**: agent nói "Hội sở chính" (`head_office`). Theo Q4, tổng >100 tỷ thì phải lên Hội đồng (L06) |
| "DSCR ngưỡng bao nhiêu, căn cứ đâu?" | Corpus ghi 1,25 (`shared_cs_td_sme_2025.md:21`). Agent lúc ghi "1,2", lúc trích đúng §4.2 (L16). Lịch sử chat VinaNova có 4 giá trị DSCR khác nhau (1,34 / 1,445 / 1,888 / 1,76) |
| "AI có tự quyết không?" | Trả lời tốt: mọi đề xuất "Chờ người xác nhận"; vai sai bị chặn ở cả giao diện và API; lý do bắt buộc ≥5 ký tự; nhật ký có người xác nhận |
| "Multi hơn single ở đâu, có đo thật không?" | Có số đo đã lưu và hiện rõ. Bộ ca nhỏ (8) và nhãn kỹ thuật làm giảm sức thuyết phục |
| "Chat có trả lời thẳng câu hỏi không?" | Yếu: mỗi câu hỏi chạy lại cả đội agent (~150 s/câu). Hỏi "DSCR bao nhiêu" thì được kết luận chung "CẦN BỔ SUNG…" (L18) |

## 5 cảnh demo (đi như buổi demo thật)

Chạy liền một mạch lúc 03:36–03:42 ngày 11/11, sau đó nạp lại demo (`reset-demo.sh`). Tổng 196 s.

| Cảnh | Vai | Kết quả | Thời gian | Chỗ vấp |
|---|---|---|---|---|
| 1 VinaNova 00187 | `tdinh` | Ra `Pending Approval`, cổng "ĐỀ XUẤT PHÊ DUYỆT — lưu ý…", đề xuất `add_disbursement_condition` "Chờ người xác nhận". Xác nhận → "Đã xác nhận và thực hiện" (4 s). Lần chạy lại: vẫn `Pending Approval`, nhưng sinh 8 đề xuất điều kiện | 57 s (mở trang 2 s); chạy lại 61 s | Credit và Compliance đều "chưa thể kết luận" mà cổng vẫn đề xuất phê duyệt (L05). Lộ `head_office`, `NEEDS_VERIFICATION`, `total_debt` (L06, L07). Số đề xuất thay đổi giữa hai lần (2 → 8) |
| 2 Việt Tiến 00223 | `tdinh` | Ra `Needs Info`, đề xuất `request_documents` "Yêu cầu khách bổ sung 3 mục", trích §4.2, §6.1 | 40 s | Lộ `kyc_assessment`, `need_more_info` |
| 3 Sông Hàn 00184 | `tdinh` | Ra `Rejected`. Compliance "CIC ghi nhận nợ nhóm 3"; 2 đề xuất `add_risk_flag` | 61 s | Credit ghi "thuộc cấp phê duyệt regional" (mã thô; 36 tỷ theo Q4 là "Cấp 2 Hội sở") |
| 4 OCR Phú Điền 00196 | `qhkh` tải, `httd` xem | Tải xong (202) sau 4 s; OCR xong ~15 s; 4 vùng tô có nhãn; thẻ trường "AI đề xuất · Độ tin cậy do AI báo: 80% · Tôi đã đối chiếu, xác nhận giá trị"; cảnh báo "Tài liệu có thể không thuộc khách hàng…" | 8–15 s | Danh sách tài liệu có 130 tệp trùng: `reset-demo.sh` không xóa tệp đã tải (L15). Thẻ trường chỉ hiện sau khi bấm một vùng tô. Crew khác chạy `document-pipeline.spec.ts` (gọi `accept_info` trên hồ sơ này) ngay sau reset làm hồ sơ rời "chờ bổ sung" và nút tải khóa ("Hồ sơ đã chuyển Thẩm định"); trước buổi demo phải reset |
| 5 Thành Đạt 00163 | `pheduyet` | Quyết định → Phê duyệt (không có ngoại lệ) → "Đã phê duyệt", "Được duyệt: 55 tỷ", nút Quyết định biến mất | 10 s | "Đang giữ: Cán bộ Tín dụng Mẫu" sau khi hoàn tất (L10) |

## Danh sách lỗi

Ảnh nằm trong `/tmp/g4/shots/` (tên tệp ghi ở từng lỗi). Đường dẫn mã là nơi nghi gây lỗi, chưa sửa.

### L01 · Cao · HTTD
- **Tái hiện:** hồ sơ mới 2 tỷ, HTTD mở `/doi-chieu/{id}` và đánh "Không đạt" một giấy tờ, rồi mở `/ho-so-vay/{id}`.
- **Mong đợi:** có nút "Trả lại QHKH" ở bước Kiểm tra (`user-flows.md:14` "Trả lại QHKH (HTTD, Thẩm định)"; `ma-tran-phan-quyen.md:53` `return_to_rm` từ CHECKING và APPRAISAL).
- **Thực tế:**
  - Giao diện: trang đối chiếu chỉ có Đạt / Không đạt / Chuyển Thẩm định / Gỡ tài liệu lỗi; panel hành động trống.
  - API: gọi `POST /transitions {action: return_to_rm}` thì trả 200.
  - Hệ quả: HTTD bị kẹt, chỉ chờ được QHKH tự sửa.
- **Ảnh:** `fB-httd-fail-item.png`.
- **Nghi ngờ:** `frontend/src/features/loan-detail/ActionsPanel.tsx:99-101` chỉ hiện nút khi `status === 'APPRAISAL' && has('credit_appraiser')`.

### L02 · Cao · QHKH
- **Tái hiện:** Thẩm định bấm "Yêu cầu bổ sung" với lý do "Bổ sung sao kê tài khoản 6 tháng…"; QHKH mở hồ sơ.
- **Mong đợi:** QHKH thấy nội dung cần bổ sung (E2 trong `rules.md`; docstring `loan_detail_service.py:113`).
- **Thực tế:**
  - Thông báo chỉ ghi "xem nội dung yêu cầu trên hồ sơ".
  - Thẻ `supplement-request` trên hồ sơ lại ghi "Người xử lý chưa ghi nội dung cụ thể."
  - Lý do chỉ có trong `audit.audit_event` (`WORKFLOW_REQUEST_INFO`, `metadata.reason`).
- **Ảnh:** `fB2-qhkh-upload-supplement.png`.
- **Nghi ngờ:** `backend/app/services/loan_detail_service.py:121-127` lấy lý do ở bước đã đóng gần nhất. Bước APPRAISAL vẫn mở khi yêu cầu bổ sung, nên lý do lấy từ CHECKING, mà bước này rỗng.

### L03 · Cao · Tuân thủ
- **Tái hiện:** hồ sơ vào RISK_REVIEW (luồng A 25 tỷ, luồng C3 3 tỷ); `tuanthu` mở "Việc của tôi" và chuông thông báo.
- **Mong đợi:** Tuân thủ có việc và được báo, vì Rủi ro không trình được khi thiếu ý kiến Tuân thủ (`user-flows.md:28`; lý do khóa "Thiếu … ý kiến Tuân thủ").
- **Thực tế:**
  - Không có việc "của tôi" nào.
  - `integration.notification` không có dòng nào cho Tuân thủ.
  - Hồ sơ seed HSV-00176 và 00181 nằm ở RISK_REVIEW mà chưa có `risk_opinion` nào.
- **Ảnh:** `fA-RISK_REVIEW-tuanthu.png`.
- **Nghi ngờ:** `backend/app/repositories/work_item_repository.py:100-150` (QUEUE_SQL): Tuân thủ chỉ thấy RISK_REVIEW dạng "Theo dõi" khi có cờ OPEN, và không bao giờ là "mine". Không có thông báo nào sinh cho Tuân thủ.

### L04 · Cao · Giám đốc chi nhánh, Phê duyệt, QHKH
- **Tái hiện:** hồ sơ 3 tỷ (LA-20261110-240F90CB), `giamdoc` Quyết định → Từ chối.
- **Mong đợi:** hồ sơ bị từ chối không có số tiền được duyệt.
- **Thực tế:**
  - Tiêu đề ghi "Từ chối … Được duyệt: 3 tỷ VND · 24 tháng".
  - DB `credit.loan_decision`: `REJECTED | 3000000000 | 24`.
- **Ảnh:** `fC3-giamdoc-reject.png`.
- **Nghi ngờ:**
  - `frontend/src/features/loan-detail/ActionsPanel.tsx:141` vẫn gửi `approved_amount` khi chọn REJECTED.
  - `backend/app/workflow/service.py:523,560` lưu nguyên giá trị đó.
  - `frontend/src/features/loan-detail/LoanHeader.tsx:40` không xét `decision_type`.

### L05 · Cao · Đội agent (Thẩm định, người duyệt)
- **Tái hiện:** `qhkh` chạy đội agent trên nháp Mekong Flex 120 tỷ (`141c4c6a-…`, case_c46f808eae60). Khách chưa có KYC, không có BCTC.
- **Mong đợi:** `Needs Info`, như các hồ sơ thiếu BCTC khác (E5 trong `rules.md`: BCTC kiểm toán bắt buộc khi tổng >20 tỷ).
- **Thực tế:**
  - Ca ra `Pending Approval` sau 51 s.
  - Credit: "Cần thêm thông tin — … chưa xác nhận đủ hồ sơ kiểm toán bắt buộc".
  - Compliance: "Cần thêm thông tin — cần hoàn tất sàng lọc AML và bổ sung BCTC kiểm toán".
  - Validation: "Đồng ý — ĐỀ XUẤT PHÊ DUYỆT — lưu ý".
  - VinaNova (cảnh 1) lặp lại cùng mẫu này.
- **Ảnh:** `s03-case_c46f808eae60.png`, `g1-mekongflex120-panel.png`.
- **Nghi ngờ:** cổng Validation trong engine cho qua khi chỉ có "lưu ý". Với Nông sản, Đông Á, Cảng Xanh (cũng không BCTC) nó chặn bằng "thiếu dữ liệu chặn"; Mekong Flex có 3 TSĐB nên không bị chặn. Chưa định vị dòng mã.

### L06 · Cao · Đội agent
- **Tái hiện:** đọc khung đội agent hoặc trace của Sông Hàn (36 tỷ), Đầu tư Mekong (45 tỷ), VinaNova (80 tỷ + dư nợ 98 tỷ).
- **Mong đợi:** cấp phê duyệt theo Q4 (`rules.md:16`): ≤20 tỷ GĐ chi nhánh, 20–100 tỷ Cấp 2 Hội sở, >100 tỷ Hội đồng (Q-P `rules.md:215`). Workflow thật đã đưa hồ sơ 120 tỷ vào COUNCIL_SESSION.
- **Thực tế:**
  - Agent ghi "thuộc cấp phê duyệt regional" và hiện "Giám đốc vùng" (vai này không có trong nghiệp vụ).
  - Với tổng >100 tỷ, agent ghi "Hội sở chính" / `head_office`, không phải Hội đồng.
- **Ảnh:** `d1-c3.png`, `d1-c1.png`.
- **Nghi ngờ:** `agent_engine/common/recompute.py:40-44` trả `regional` / `head_office`; `frontend/src/features/dashboard/agentTrace.ts:184` dịch thành "Giám đốc vùng" / "Hội sở chính".

### L07 · Cao · Mọi vai xem đội agent
- **Tái hiện:** chạy đội agent trên bất kỳ hồ sơ nào, đọc khung "Đội agent" trên `/ho-so-vay/{id}`.
- **Mong đợi:** không lộ mã thô (tiêu chí chấm; nguyên tắc tiếng Việt cho người dùng nghiệp vụ).
- **Thực tế:** mọi lượt đều lộ khóa và mã. Ví dụ:
  - `total_debt`, `NEEDS_VERIFICATION`, `debt_service`, `verified_annual_inflow: null`, `kyc_status`, `aml_risk_level`, `cic_group`, `overdue_amount`, `valuation_status`, `legal_status`;
  - `draft_id=draft-case_…`, `create_loan_draft`, `head_office`, `need_more_info`;
  - `collateral_id: None; has_collateral: False`.
  Lượt Mekong Flex 120 lộ thêm `max_secured_limit` trong lịch sử chat, và số in kiểu "80,000,000,000".
- **Ảnh:** `d1-c1.png`, `d1-c2.png`, `g1-*-panel.png`.
- **Nghi ngờ:** trích nguồn của engine trả nguyên dữ kiện công cụ. Giao diện hiện nguyên văn ở khối "Trích nguồn" (`frontend/src/features/loan-detail/AgentTeamPanel.tsx`).

### L08 · Vừa · Quản trị, Phê duyệt
- **Tái hiện:**
  - `quantri` gọi `POST /loan-applications/{id}/transitions`.
  - Người duyệt gọi quyết định khi chưa quyết đủ ngoại lệ.
- **Mong đợi:** thông báo tiếng Việt, như các lỗi 403 khác.
- **Thực tế:**
  - 403 `MISSING_PERMISSION` "You do not have the required permission.".
  - `EXCEPTIONS_UNDECIDED` "Every proposed …".
- **Nghi ngờ:** `backend/app/auth/dependencies.py:74,94`; `backend/app/workflow/service.py:454`.

### L09 · Vừa · QHKH, Thẩm định
- **Tái hiện:** hồ sơ 120 tỷ vào COUNCIL_SESSION; mở khung đội agent.
- **Thực tế:** hiện chữ "COUNCIL_SESSION". Ảnh `fD-view-qhkh.png`, `fD-view-tdinh.png`.
- **Nghi ngờ:** `backend/app/services/loan_agent_run_service.py:34-39` (`_STATUS_VI` có `COMMITTEE` nhưng thiếu `COUNCIL_SESSION`, `WITHDRAWN`); dòng 51 trả nguyên mã.

### L10 · Vừa · mọi vai
- **Tái hiện:** hồ sơ ở APPROVAL do `pheduyet2` giữ, ở COUNCIL_SESSION, hoặc đã quyết định.
- **Thực tế:** tiêu đề ghi "Đang giữ: Cán bộ Tín dụng Mẫu" (QHKH). Sau khi Trưởng phòng chuyển người thì mới đúng.
- **Nghi ngờ:** `backend/app/repositories/loan_detail_repository.py:54,65` lấy `la.assigned_employee_id`; `frontend/src/features/loan-detail/LoanHeader.tsx:54`.

### L11 · Vừa · Trưởng phòng
- **Thực tế:** giao diện coi vai này là QHKH (menu, lời chào).
- **Nghi ngờ:** `frontend/src/auth/roleFromMe.ts:22`.

### L12 · Nhẹ · Thẩm định nhận việc
- **Thực tế:** thông báo "Được giao hồ sơ: Trưởng phòng chuyển hồ sơ cho bạn…" không có mã hồ sơ; các thông báo khác đều có mã.

### L13 · Nhẹ · mọi vai
- **Thực tế:** lời chào ở trang chat cắt mất tên người dùng.
- **Nghi ngờ:** `frontend/src/features/chat/components/WelcomeState.tsx:16-19`.

### L14 · Nhẹ · QHKH
- **Thực tế:** sau "Khách rút hồ sơ" (→ Đã rút), đầu trang vẫn "Còn 1 việc".

### L15 · Vừa · Demo (HTTD)
- **Tái hiện:** mở `/doi-chieu/75000000-0000-4000-8000-000000000005`.
- **Thực tế:**
  - 130 tài liệu gắn với hồ sơ demo, nhiều tệp `scan-khong-chu.pdf` "Lỗi xử lý" và tệp trùng tên.
  - `reset-demo.sh` không xóa các tệp này.
  - Trong buổi demo phải cuộn tìm đúng tệp vừa tải.
- **Ảnh:** `d1-c4.png`, `d2-c4.png`.

### L16 · Vừa · Đội agent (Credit)
- **Thực tế:**
  - Credit viết "DSCR tối thiểu 1,2" (Hưng Phát, Nông sản, Đông Á), trong khi corpus ghi "DSCR dự phóng ≥ 1,25" (`agent_engine/rag_corpus/shared_cs_td_sme_2025.md:21`) và cấu hình là `DSCR_MIN=1.25` (`agent_engine/common/config.py:81`).
  - Hưng Phát: Credit kết luận "Cần thêm thông tin" mà cổng vẫn ra "đề xuất phê duyệt".
- **Nghi ngờ:** LLM tự nêu ngưỡng; corpus không có tệp `credit_*.md` (`agent_engine/common/rag.py:30`).

### L17 · Vừa · Đội agent
- **Thực tế:** Hưng Phát 8 tỷ ra 5 đề xuất loại "Điều kiện trước giải ngân", nhưng nội dung là việc phải làm trước khi quyết định (bổ sung, xác minh dữ liệu). VinaNova lần 1 có 2 đề xuất, lần 2 có 8 đề xuất cùng loại.

### L18 · Vừa · Chat
- **Tái hiện:** `tdinh` mở `/chat`, chọn VinaNova, hỏi "DSCR của hồ sơ này là bao nhiêu, có đạt ngưỡng chính sách không?".
- **Thực tế:**
  - Mỗi câu hỏi chạy lại cả đội agent (152 s, 145 s, 143 s).
  - Hỏi DSCR: câu trả lời là kết luận chung "CẦN BỔ SUNG — …", không nêu thẳng con số.
  - Hỏi "thuộc cấp phê duyệt nào": câu trả lời vừa ghi "trình cấp phê duyệt regional", vừa ghi "Cấp phê duyệt: Hội sở chính", trong khi cùng ca đó nhắc dư nợ 98 tỷ (tổng >100 tỷ).
  - Hỏi xin CCCD và số điện thoại của khách chi nhánh khác: không lộ dữ liệu, nhưng cũng không từ chối; hệ thống chạy lại phân tích VinaNova như mọi câu hỏi khác.
  - Khung kết quả có dòng "Hạn mức đề xuất: VND" (trống số), nhãn "Hội đồng agent", và tham chiếu nội bộ "rules.md Q7".
- **Ảnh:** `d4-chat-*.png`.

## Cần xác nhận

- **C1.** Sau khi Trưởng phòng chuyển hồ sơ sang `tdinh2`, `tdinh` nhận 404 trên hồ sơ mình từng xử lý. Q-M ("người đã xong bước vẫn đọc được") có áp dụng cho người bị chuyển đi không?
- **C2.** `tdinh` và `ruiro` đọc được trace (`GET /agent-cases/case_c46f808eae60` → 200) của một hồ sơ **nháp** do QHKH chạy, khách Mekong Flex. Ca Hưng Phát thì 404. Có thể đây là phạm vi theo khách hàng; cần nghiệp vụ xác nhận có đúng không.
- **C3.** Danh sách "Agent traces" của QHKH hiện "Chưa có lượt phân tích nào trong phạm vi của bạn", dù QHKH vừa chạy 6 lượt (ảnh `s03-case_c46f808eae60.png`). Drawer mở theo link thì xem được. Chưa phân biệt được nguyên nhân là bộ lọc "ca kiểm thử / nháp chưa gọi công cụ" hay lỗi.
- **C4.** Cổng "ĐỀ XUẤT PHÊ DUYỆT — lưu ý, chuyên gia còn ý kiến khác" ở cảnh 1 có phải thiết kế cố ý cho demo không? Nếu là cố ý thì L05 chỉ còn ca Mekong Flex.

## Chưa kiểm tra

- Tuân thủ: kết luận cờ AML/gian lận và báo sớm; luồng giữ hồ sơ vì nghi gian lận (fraud hold).
- Nâng cấp phê duyệt khi tổng tăng sau Thẩm định (Q4 "Nâng cấp phê duyệt").
- Trang nhật ký kiểm toán của Kiểm toán; trang quản trị người dùng của Quản trị.
- Thư email thật: chỉ đọc bảng `integration.notification_delivery`. Bảng có 608 PENDING, 18 PROCESSING kẹt, 16 FAILED "550 5.4.5 Daily user sending limit exceeded", chỉ 2 SENT. Nói cách khác, gửi thư đang hỏng, trái với ghi chú "Worker email thật đang chạy".
- Trả lại từ bước Phê duyệt ("Trả lại bổ sung" ở hộp quyết định): có thấy nút, chưa bấm.
- Đo lại so sánh single/multi (benchmark v8 ngoài phạm vi).
