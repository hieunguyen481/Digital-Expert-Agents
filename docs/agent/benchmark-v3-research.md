# Benchmark v3: vì sao đội agent thua ở v2 và cách làm cho thắng một cách hợp lệ

Viết TRƯỚC khi sửa engine và trước mọi lượt đo v3. Dữ liệu: `agent_engine/benchmark_results/20261107T022317Z-v2 llm sau sửa lỗi A2A business_id (c2ac762).json` và bảng `agent.case_event`.

## 1. Nguyên nhân thua đo được ở v2 (multi 84,4% recall so với single 95,4%)
- **Không ai tính con số mà đáp án cần.** C6 (`case_7c0d2ab6e1dd`): Compliance nêu "LTV 70% tương ứng 19,6 tỷ" và "khoản vay 12 tỷ nằm trong trần", Credit nêu tổng 17 tỷ; không agent nào viết tỷ lệ LTV của khoản vay (12/28 ≈ 43%), nên `ltv` trượt cả 3 lượt. C10 (`case_50dbd0ecdb96`): Compliance viết "trần 21 tỷ, thấp hơn đề nghị 4 tỷ" (chênh lệch) nhưng không viết LTV 83%; `ltv_over` trượt 3/3.
- **Bước tổng hợp chỉ ghép `findings`.** `validation_agent` gộp `findings`/`conditions`; `summary`, nguồn trích (`evidence.source`) và dữ kiện nằm trong `summary` của chuyên gia không đi vào kết luận cuối. Nhánh Cần bổ sung/Từ chối của `orchestrator.run_analysis` chỉ phát `validation.summary` và `findings`. C1 (`case_0e4374fd0a01`): ngưỡng DSCR của Credit không vào kết luận.
- **Trích nguồn mất ở khâu tìm tài liệu.** `rag.search("compliance", ...)` trả top-3 BM25 và các đoạn `compliance_policy.md` thắng đoạn §7.1 của CS-TD-SME/2025, nên Compliance trích "Điều 8" thay vì §7.1: citation_recall multi 66,7% so với 96,7%.
- **Chuyên gia thiếu ngữ cảnh.** Planner đặt `check_collateral` theo cờ trong request (`planner.py`); LLM planner đôi khi bỏ trường này nên Compliance nhận "kiểm tra TSĐB: False" (C10). `compliance_agent._rules_task` chỉ xét `cols[0]` nên bỏ qua TSĐB thứ hai.
- **Chi phí/trễ.** 2,1 lần chi phí (0,0046 so với 0,0022 USD) và +11 s: các lượt LLM của Planner, 3 chuyên gia, narrative; Operations chờ Credit+Compliance.
- **Ca v2 quá nhỏ**: ~7 lượt công cụ, một agent ôm đủ ngữ cảnh nên đội không có lợi thế cấu trúc.

## 2. Cơ chế hợp lệ để đội vượt single
1. **Tổng hợp không mất thông tin:** báo cáo cuối = hợp xác định (khử trùng lặp) summary + findings + conditions + nguồn trích của mọi chuyên gia + challenge; áp cho phê duyệt, Cần bổ sung, Từ chối.
2. **Kiểm chứng độc lập:** Validation tự gọi công cụ, tính lại tổng cấp tín dụng, cấp phê duyệt, nghĩa vụ kiểm toán, LTV (cộng mọi TSĐB đã rõ pháp lý), trần cho vay có bảo đảm, Nợ vay/EBITDA sau cấp, DSCR (nếu có gốc+lãi), so với số của chuyên gia; lệch thì challenge, chuyên gia sửa trong số vòng hiện có (`MAX_CHALLENGE_ROUNDS`).
3. **Ngữ cảnh và chính sách riêng:** mỗi chuyên gia tìm cả điều khoản chuyên ngành lẫn điều khoản CS-TD-SME/2025; Planner bật kiểm TSĐB theo dữ liệu lõi.
4. **Song song:** xem xét cho các bước độc lập chạy song song (chỉ làm nếu không làm giảm chất lượng và không tạo bản nháp cho hồ sơ đã bị dừng).

Công thức lấy từ `rules.md` (Q4, Q5/E5, Q-T) và CS-TD-SME/2025 §3.1, §4.1, §4.2, §6.1, §7.1; không dùng đáp án hay từ khóa của ca đo. Single-agent giữ nguyên prompt và checklist chung.

## 3. Giả thuyết cho v3 (viết trước khi đo)
`cases_v3.json`: 8 ca liên phòng ban D1-D8 trên hồ sơ mới (nhiều TSĐB trong đó có tài sản chưa rõ pháp lý, khai báo khác thẩm định, nợ CIC khác BCTC, tiền về khác doanh thu, ranh giới 20 tỷ, nợ nhóm 2, chưa có tài khoản, trúng danh sách trừng phạt).
- **H1 (chính):** `finding_recall` multi ≥ single. Lý do: các phát hiện cần tính lại (LTV %, tổng, Nợ/EBITDA, trần bảo đảm) do Validation tính độc lập và ghi vào báo cáo cuối.
- **H2:** `citation_recall` multi ≥ single, nhờ tìm điều khoản chung cho mọi chuyên gia.
- **H3:** `false_findings` multi ≤ single (challenge và tính lại bắt số sai). Mẫu nhỏ nên chỉ nêu xu hướng.
- **H4 (không kỳ vọng thắng):** trễ và chi phí multi vẫn cao hơn single; mục tiêu là thu hẹp, không đảo.
- **H5:** v2 kiểm thoái lui: multi không tệ hơn lượt v2 trước (84,4%), kỳ vọng tiến gần single.
- Nếu H1 sai, báo số thật và không sửa tiếp trên chính v3.

## 4. Giới hạn đã biết
- Công cụ hiện chưa có nhóm khách hàng liên quan (không có tool đọc quan hệ), nên v3 không đo ca nhóm liên quan; ghi vào việc còn lại.
- DSCR không tính lại được trên v3 vì seed không có khoản gốc/lãi trong tài liệu; Validation chỉ tính lại khi có.
- Bộ chấm `grade.py` v2 giữ nguyên, áp như nhau cho hai chế độ. Văn bản chấm của multi vẫn là hợp mọi `task_finished` (như v2) để so sánh được; báo cáo cuối cũng được lưu (`final_report_text`) và chấm riêng như số phụ.
- Chấm bằng từ khóa nên có thể sót cách diễn đạt khác; cỡ mẫu 8 ca x 3 lần, độ lệch chuẩn lớn.

## 5. Chẩn đoán v3 sau sửa (viết TRƯỚC khi đăng ký v4 và sửa engine v4)
Dữ liệu: `20261107T050214Z-v3 sau sửa engine (c0294f7).json` và `agent.case_event` của 24 case multi; không tốn lượt LLM mới.
- **Trích nguồn: 22/24 lượt multi mất `cite_ltv` (§7.1), ở khâu chuyên gia nộp verdict.** Tra `task_finished`: `§7.1` chỉ xuất hiện 2 lần (đều Credit), Compliance/Operations 0/24; báo cáo cuối cũng chỉ 2/24 vì `report.merge_verdicts` giữ đủ mọi `evidence` đã có. Nguyên nhân: `evidence` do LLM tự viết trong `submit_verdict` (vd. D1 case_dfc79fb09f80: nguồn là "compliance_policy.md — Điều 8. Tài sản bảo đảm" chứ không §7.1), còn kết quả `search_*_policy` không được đính tự động vào evidence và không được audit. `cite_ltv` mất ở D1, D3, D4, D6, D7 (cả 3 lượt) = các ca có TSĐB; single đưa "§4.2, §7.1" vì tự liệt kê điều khoản trong một câu trả lời.
- **Phát hiện sai multi 0,25 (6/24) so với single 0,21; đến từ 2 chuyên gia khác nhau.** `false_audit_required` (D2 case_c4054b6cadad, case_68f7d8494fdf; D5 case_912ea2d84f4f; D6 case_2d09bdfee1d1, case_668314dd610b): câu điều kiện "Nếu tổng nợ 45 + 10 = 55 tỷ vượt 20 tỷ… phải có BCTC kiểm toán" do Compliance/Credit dùng số CIC 45 tỷ chưa đối chiếu, trong khi Validation đã tính lại bằng công cụ 16 tỷ ("chưa bắt buộc BCTC kiểm toán"). Báo cáo cuối giữ cả hai nên mâu thuẫn. `false_blacklist` (D6 case_9851845114c5) thực ra là "blacklist không hit" khớp mẫu do bộ chấm không nhận ra phủ định; không sửa bộ chấm.
- **Giả thuyết v4:** (H1) đính tự động các điều khoản chính sách mà chuyên gia đã tra cứu (nhãn § từ tiêu đề đoạn) vào evidence verdict, theo agent, nên `citation_recall` multi ≥ single mà không phụ thuộc LLM nhớ viết; (H2) Validation hạ cấp/loại phát hiện và điều kiện của chuyên gia mâu thuẫn với số nó tự tính từ công cụ, nên `false_findings` multi ≤ single; (H3) `finding_recall` giữ ≥ single; (H4) trễ và chi phí vẫn cao hơn. Nếu H1/H2 sai trên v4, báo số thật và dừng.

## 6. Kết quả v4 (commit engine 9f8d182; 6 ca × 3 lần × 2 chế độ, $0,131) và v3 kiểm thoái lui (1 lần, $0,060)
| chỉ số (trung bình ± độ lệch) | v4 single | v4 multi | v3 lại single | v3 lại multi |
| --- | --- | --- | --- | --- |
| finding_recall | 0,767 ± 0,183 | 0,856 ± 0,160 | 0,860 ± 0,236 | 0,975 ± 0,071 |
| citation_recall | 0,917 ± 0,164 | 1,000 ± 0,000 | 0,958 ± 0,118 | 1,000 ± 0,000 |
| false_findings | 0,167 ± 0,383 | 0,278 ± 0,461 | 0,375 ± 0,744 | 0,250 ± 0,463 |
| trễ (s) / chi phí ($) | 36,1 / 0,0024 | 44,8 / 0,0049 | 39,2 / 0,0025 | 46,2 / 0,0050 |
- Đối chiếu: **H1 đúng** (nguồn: multi 100% so với single 91,7%; v3 từ 80,6% lên 100%). **H3 đúng** (phát hiện: multi 85,6% so với 76,7%). **H2 sai trên v4**: phát hiện sai multi 0,28 so với single 0,17. **H4 đúng**: trễ +24%, chi phí gấp ~2.
- Nguyên nhân H2 sai: bộ chấm v2 đọc cả bản nháp của chuyên gia (hợp mọi `task_finished`), nên câu điều kiện "Nếu tổng vượt 20 tỷ, phải có BCTC kiểm toán" của chuyên gia vẫn bị tính dù Validation đã hạ cấp khỏi báo cáo cuối; E2 còn khớp nhầm câu "chưa bắt buộc BCTC kiểm toán" của chính Validation. Chấm riêng trên `final_report_text` (số phụ, không phải số chính thức): finding 0,844, false 0,111.
- Không sửa thêm engine hay bộ chấm sau khi thấy số v4 (Open decision 1 thuộc captain). Cỡ mẫu nhỏ, độ lệch chuẩn lớn.

## 7. Kết quả vòng tối ưu bench5 (commit engine eae6ad3; bộ chấm v3 trừ khi ghi v2)

Bộ chấm v3 chấm cùng một cách cho 2 chế độ, chỉ trên văn bản kết luận cuối (multi: báo cáo cuối, không gộp nháp chuyên gia), có thêm độ chính xác trích dẫn. Mỗi bộ 6 ca × 3 lần × 2 chế độ. Tổng chi phí hai lượt cuối $0,295 (2 vòng tối ưu trên v4 tốn thêm, tổng toàn đợt < $1). Chỉ dùng 2 trong 3 vòng cho phép.

**v4: bộ đã dùng để tối ưu** (multi | single)

| chỉ số | multi | single |
| --- | --- | --- |
| recall phát hiện (v3) | 0,82±0,23 | 0,70±0,23 |
| recall phát hiện (v2) | 0,82 | 0,70 |
| trích nguồn (recall, v3) | 0,96±0,11 | 0,90±0,20 |
| độ chính xác trích dẫn | 0,93±0,09 | 0,93±0,13 |
| phát hiện sai | 0,06±0,24 | 0,17±0,38 |
| đúng cổng | 0,78±0,43 | 0,83±0,38 |
| trễ (s) | 52,6±8,6 | 37,5±7,5 |
| chi phí / ca ($) | 0,0056 | 0,0025 |
| nguồn liệt kê | 21,1 | 8,0 |
| độ dài báo cáo (ký tự) | 7.330 | 4.500 |

**v5: kiểm tra mù** (đăng ký trước khi sửa engine, đo một lần)

| chỉ số | multi | single |
| --- | --- | --- |
| recall phát hiện | 0,90±0,11 | 0,86±0,17 |
| trích nguồn (recall) | 1,00±0 | 0,93±0,14 |
| độ chính xác trích dẫn | 0,96±0,06 | 0,95±0,13 |
| phát hiện sai | 0,06±0,24 | 0,33±0,49 |
| đúng cổng | 0,83±0,38 | 0,83±0,38 |
| trễ (s) | 57,9±10 | 35,5±6,6 |
| chi phí / ca ($) | 0,0059 | 0,0024 |
| nguồn liệt kê | 20,8 | 8,1 |
| độ dài báo cáo (ký tự) | 7.650 | 4.650 |

Kết luận trung thực: multi hơn single về recall phát hiện, trích nguồn và phát hiện sai trên cả v4 lẫn v5 (chênh lệch recall nhỏ so với độ lệch, 18 lượt mỗi chế độ, chưa đủ để khẳng định thống kê). Multi KHÔNG hơn về đúng cổng (v4 kém 0,78 so với 0,83; v5 bằng nhau), trễ (chậm hơn ~1,5 lần), chi phí (~2,4 lần), độ dài báo cáo (dài hơn ~1,6 lần) và số nguồn liệt kê. Độ chính xác trích dẫn bằng nhau trong sai số. Nguyên nhân sai cổng chưa sửa được ở mức chung: chuyên gia trả need_more_info khi thiếu trường dữ liệu (DSCR, người đại diện pháp lý), trong khi single vẫn duyệt. Gọi tool song song không giảm trễ đo được. Các lượt LLM của planner và bước viết tường thuật chưa bỏ.

## 8. Vòng tối ưu bench6: đăng ký trước (viết TRƯỚC khi sửa engine và trước mọi số đo của vòng này)

**Bộ kiểm tra mù v6** (`cases_v6.json`, seed `R__seed_benchmark_v6_profiles.sql`, khách ...0051-0058): 8 ca G1-G8, không chạy và không đọc điểm cho tới lượt đo cuối; đúng một lượt đo (3 lần × 2 chế độ). v4 và v5 đã bị xem điểm nên từ nay là bộ phát triển; bộ chấm v3 giữ nguyên. Đáp án đối chiếu `rules.md` (Q4, Q5/E5, Q7, Q-O) và CS-TD-SME/2025. Cấu trúc cổng: 5 ca thiếu trường phụ (DSCR, người đại diện) nhưng mọi ngưỡng tính được đều đạt, đáp án PENDING_APPROVAL (Q7: "Cần xác minh" không chặn); 3 ca thiếu dữ liệu chặn thật, đáp án NEEDS_INFO (G3 không có kết quả CIC, G4 không có BCTC, G6 CIC quá 30 ngày theo §6.3). Hai ca đã bỏ trước khi chạy vì `rules.md` không đủ làm đáp án (chưa có đánh giá KYC/AML: Q3 không quy định trạng thái cuối) hoặc trùng tiêu chí D8 (trừng phạt).

**Giả thuyết:** (H1) cổng xác định từ dữ kiện công cụ và phát hiện đã kiểm chứng làm đúng cổng multi ≥ single mà không giảm recall; (H2) bảng dữ kiện chung + bỏ lượt LLM thừa (planner, tường thuật) giảm trễ và chi phí multi; (H3) multi vẫn không rẻ hơn single về chi phí. Nếu H1 sai trên v6, báo số thật, không sửa tiếp trên v6.

**Cách chọn tổ hợp thắng (viết trước khi có số).** Mỗi hướng là một cờ cấu hình bật/tắt. Ablation chỉ multi, mỗi biến thể 1 lần mỗi ca trên v4 + v5 (12 lượt/biến thể), gồm baseline (mọi cờ tắt), từng cờ riêng lẻ, và các tổ hợp. Độ dao động = sai số chuẩn của baseline trong cùng đợt, SE = sd/√12, cho từng chỉ số.
1. **Loại** biến thể có recall phát hiện thấp hơn baseline quá 1 SE, hoặc trích nguồn thấp hơn baseline quá 1 SE, hoặc phát hiện sai cao hơn baseline quá 1 SE.
2. Trong số còn lại, xếp theo thứ tự: (a) tỷ lệ đúng cổng cao hơn (khác biệt từ 1 lượt trở lên); (b) trễ trung bình thấp hơn (chênh dưới 5% coi là hòa); (c) chi phí thấp hơn.
3. Nếu không biến thể nào còn lại hơn baseline ở (a)-(c), giữ baseline (cờ mặc định tắt) và báo rõ. Hướng không có tác dụng đo được thì bỏ, ghi lý do.
4. Single-agent giữ nguyên prompt, model Specialist đang cấu hình, checklist chung; phân model theo vai trò chỉ thử trong các model đã cấu hình hoặc rẻ hơn.
5. Lượt đo cuối: v6 3 lần × 2 chế độ và v5 1 lần × 2 chế độ (kiểm thoái lui) với tổ hợp đã chọn; tổng chi phí mọi lượt đo của vòng chặn bằng `--max-cost 2`; mọi số v1 đến v5 vẫn hiển thị.

### 8.1 Kết quả ablation (v4 + v5 = bộ phát triển, chỉ multi, 1 lần/ca, 12 lượt/biến thể)

Số liệu tính từ `agent_engine/benchmark_results/*abl*.json` (đã nạp `agent.benchmark_run` để dashboard chọn được). Cổng xác định (`gate.py`) được hiệu chỉnh offline trên các ca v2-v5 (khớp 29/30; C6 v2 lệch vì D6 v3 coi thiếu tài khoản thanh toán là chặn) nên "đúng cổng" của biến thể có cờ `gate` trên v4/v5 là số trên bộ phát triển, không phải bằng chứng tổng quát; bằng chứng là v6 mù.

| biến thể | recall | trích nguồn | chính xác trích | phát hiện sai | đúng cổng | trễ s | $/ca | token |
|---|---|---|---|---|---|---|---|---|
| (không cờ) | 85% | 97% | 94% | 0.00 | 83% | 62.2 | 0.0058 | 24290 |
| gate | 88% | 100% | 93% | 0.00 | 100% | 67.7 | 0.0059 | 25457 |
| facts | 97% | 100% | 99% | 0.00 | 58% | 40.7 | 0.0044 | 14796 |
| plan | 87% | 97% | 94% | 0.00 | 92% | 50.0 | 0.0045 | 20554 |
| report | 84% | 97% | 98% | 0.08 | 92% | 53.3 | 0.0041 | 17951 |
| challenge | 87% | 97% | 98% | 0.08 | 83% | 51.3 | 0.0056 | 24902 |
| facts,compact | 93% | 100% | 97% | 0.00 | 67% | 31.5 | 0.0037 | 12222 |
| gate,facts,plan,report,challenge,compact | 91% | 100% | 99% | 0.00 | 100% | 21.0 | 0.0016 | 5988 |

**Áp dụng luật đã viết:** (1) loại `report` và `challenge` khi bật riêng (mỗi cái 1/12 lượt có phát hiện sai, baseline 0; `report` còn recall 84% < 85%); (2) trong số còn lại, `gate` đứng đầu về đúng cổng (100% so với 83%), tổ hợp đầy đủ vừa 100% đúng cổng vừa recall 91%, trích nguồn 100%, phát hiện sai 0, trễ 21,0 s (so 62,2 s), chi phí $0,0016 (so $0,0058). `facts` riêng làm giảm đúng cổng (58%) vì chuyên gia thiếu trường phụ vẫn trả need_more_info — chỉ có ích khi đi cùng `gate`. Chọn: **tổ hợp đầy đủ `gate,facts,plan,report,challenge,compact` làm mặc định** (`config.OPT_FLAGS`). Không có hướng nào bị bỏ khỏi tổ hợp bằng đo "bỏ một"; ablation "tổ hợp trừ một hướng" không chạy (tiết kiệm chi phí), nên không tách được đóng góp riêng của `report`, `challenge`, `compact` trong tổ hợp. Hướng chưa làm: bỏ phiếu/tự kiểm cổng (cổng đã xác định, không còn bất đồng LLM để bỏ phiếu), phân model theo vai trò (không cần: chi phí đã giảm 72%; single giữ nguyên model Specialist gpt-6-luna), prompt caching (nhà cung cấp OpenRouter không bật; prompt chuyên gia nay ngắn nên lợi ích nhỏ).

### 8.2 Bản đồ thời gian theo bước, ca F1 (v5), multi, một lượt

| bước | trước (không cờ) | sau (tổ hợp mặc định) |
|---|---|---|
| Planner (LLM haiku-5.5) | 7,8 s, 1129+1545 token | 0,6 s, 0 LLM (template + 3 công cụ đọc) |
| Credit | 44,5 s, 5 lượt LLM + tool loop | 12,8 s, 1 lượt LLM (1379+1282 token) |
| Compliance | 22,7 s, 5 lượt LLM | 23,0 s, 1 lượt LLM (1716+1768 token) |
| Validation (kiểm chứng + tường thuật LLM haiku) | 11,0 s, 3759+2366 token | 0,1 s, 0 LLM |
| Tổng thời gian tường | 63,4 s | 23,8 s |
| Chi phí | khoảng $0,0059 | $0,0016 |

Thời gian còn lại gần như toàn là một lượt `submit_verdict` dài của chuyên gia (credit/compliance chạy song song, thật). Log: `scratchpad/timeline_base_F1.txt`, `timeline_after_F1.txt` (đã sao vào mục này).

### 8.3 Kết quả cuối (tổ hợp mặc định, commit ef86834; đo đúng một lần, đã nạp `agent.benchmark_run`)
**v6 (kiểm tra mù, 3 lần)** — nhãn: v6 cuối ef86834 (kiểm tra mù); tổng chi phí $0.0942

| chỉ số | single TB (sd) | multi TB (sd) |
|---|---|---|
| recall phát hiện | 0.896 (0.194) | 0.854 (0.337) |
| trích nguồn | 0.924 (0.155) | 0.875 (0.338) |
| chính xác trích dẫn | 0.907 (0.132) | 0.987 (0.040) |
| phát hiện sai | 0.208 (0.509) | 0.000 (0.000) |
| trích sai | 0.042 (0.204) | 0.042 (0.204) |
| đúng cổng | 0.375 (0.495) | 0.875 (0.338) |
| trễ s | 41.567 (5.486) | 21.208 (10.741) |
| $/ca | 0.002 (0.000) | 0.002 (0.001) |
| token | 14952.667 (3423.384) | 5246.500 (2215.163) |
| lỗi | 0 | 0 |

**v5 kiểm thoái lui (1 lần/ca; bộ phát triển)** — v5 kiểm thoái lui ef86834; tổng chi phí $0.0239

| chỉ số | single TB (sd) | multi TB (sd) |
|---|---|---|
| recall phát hiện | 0.858 (0.169) | 0.925 (0.117) |
| trích nguồn | 0.944 (0.136) | 1.000 (0.000) |
| chính xác trích dẫn | 0.868 (0.166) | 0.979 (0.051) |
| phát hiện sai | 0.333 (0.516) | 0.000 (0.000) |
| đúng cổng | 0.833 (0.408) | 1.000 (0.000) |
| trễ s | 37.700 (3.533) | 20.567 (3.100) |
| $/ca | 0.002 (0.000) | 0.002 (0.000) |
| token | 13032.833 (696.162) | 5657.500 (1097.598) |


v6 theo ca (recall / đúng cổng; multi | single): G1 1,00/1 | 1,00/0; G2 1,00/1 | 1,00/0; **G3 0,00/0 | 1,00/1**; G4 1,00/1 | 1,00/1; G5 1,00/1 | 1,00/0; G6 1,00/1 | 0,50/1; G7 1,00/1 | 1,00/0; G8 0,83/1 | 0,67/0.

**Đọc trung thực.** Trên v6 mù multi hơn single ở đúng cổng (88% so 38%), chính xác trích dẫn (99% so 91%), phát hiện sai (0 so 0,21), trễ (21,2 so 41,6 s) và token (5,2k so 15,0k); chi phí/ca bằng nhau ở mức làm tròn (xem file kết quả). Multi **không hơn** ở recall phát hiện (85% so 90%) và trích nguồn (88% so 92%), và độ lệch multi lớn. Toàn bộ chênh lệch recall đến từ G3: cả 3 lượt multi của G3 (khách chưa có kết quả CIC) bị ESCALATED sau 1 giây do lỗi trong Planner xác định (`cic_group` null so sánh `>= 2`), không ra kết luận. Các ca khác multi ≥ single về recall. Lỗi đã sửa trong code (commit riêng, có test), **không đo lại v6** theo quy định đo một lượt; số G3 ở trên là số thật đã đo. Ước lượng: nếu G3 không sập, recall multi của v6 sẽ khoảng 97%, nhưng đây là suy đoán, không phải số đo. v5 kiểm thoái lui (bộ phát triển, 1 lần/ca): multi hơn single ở mọi chỉ số.

## 9. Bench7: đo mù độc lập (v7) và xem lại single

### 9.1 Cơ cấu bộ ca v7 (đăng ký trước mọi lượt đo; không chạy engine hay LLM trên ca trước commit này)
`cases_v7.json` (H1-H8, seed `R__seed_benchmark_v7_profiles.sql`, khách ...0061-0068), 33 phát hiện bắt buộc, trung bình 4,13/ca (v2-v5: 3,6-4,0; v6: 3,12). Đáp án từ `rules.md` (Q4, Q5/E5, Q7, Q-O), CS-TD-SME/2025 §3.1, §4.1, §4.2, §6.1, §6.3, §7.1 và `compliance_policy` Điều 7; quy ước tính như v4-v6.

| ca | nội dung | gate chấp nhận | số phát hiện |
|---|---|---|---|
| H1 | hai TSĐB 40 tỷ, tổng 28 tỷ, LTV 45%, trần có bảo đảm 28 tỷ | PENDING_APPROVAL | 5 |
| H2 | CIC nhóm 4 dù tài chính tốt, tổng 17 tỷ | REJECTED | 4 |
| H3 | Nợ vay/EBITDA 3,83 vượt 3,5, tổng 36 tỷ | NEEDS_INFO hoặc REJECTED | 4 |
| H4 | CIC 48 tỷ cao hơn BCTC 30 tỷ, đòn bẩy 2,9 | PENDING_APPROVAL | 4 |
| H5 | CIC cách 50 ngày (§6.3), tổng 26 tỷ | NEEDS_INFO | 4 |
| H6 | không có BCTC, tổng 21 tỷ | NEEDS_INFO | 3 |
| H7 | CIC có nợ nhóm 2 (giải trình, cấp cao hơn) | PENDING_APPROVAL hoặc NEEDS_INFO | 4 |
| H8 | tổng 105 tỷ > 100, LTV 56,3% | PENDING_APPROVAL hoặc NEEDS_INFO | 5 |

Cổng thiếu dữ liệu: 2/8 (H5, H6; tối đa 3). Cổng không dồn một giá trị: PENDING_APPROVAL (H1, H4 và chấp nhận thêm ở H7, H8), REJECTED (H2, chấp nhận thêm ở H3), NEEDS_INFO (H5, H6). Ca bỏ trước khi chạy: ngành rủi ro cao (Điều 9) vì `get_business` trả `industry_risk=None`, nên rules/corpus không đủ làm đáp án kiểm chứng được; thiếu tài khoản thanh toán (trùng D6); trừng phạt (trùng D8). Đo đúng một lần mỗi cấu hình: single, multi mặc định, multi bỏ cờ `plan`; cả hai cấu hình multi đều được báo cáo, không chọn cấu hình nào làm số chính dựa trên điểm v7.

### 9.2 Kết quả v7 (24 lượt/cấu hình, `--max-cost 1`, bộ chấm v3 giữ nguyên, đúng một lượt đo, đã nạp `agent.benchmark_run`)
Nhãn: `v7 mù bench7 f0b45e5 single + multi mặc định (OPT_FLAGS đủ, plan bật)` (chi phí $0.0970) và `v7 mù bench7 f0b45e5 multi bỏ cờ plan (Planner LLM)` (chi phí $0.0638); mỗi file ghi `git_commit` 0b51af4 = f0b45e5 + commit đăng ký v7 (không đổi code engine/single/chấm). Engine đo: build từ worktree này, `OPT_FLAGS` mặc định (cổng 8021) và `OPT_FLAGS=gate,facts,report,challenge,compact` (cổng 8022). Cả hai cấu hình multi đều được báo cáo; không chọn cấu hình nào làm số chính.

| chỉ số | single TB (sd) | multi mặc định TB (sd) | multi bỏ plan TB (sd) |
|---|---|---|---|
| recall phát hiện | 0.883 (0.151) | 0.952 (0.113) | 0.969 (0.085) |
| trích nguồn | 0.799 (0.239) | 1.000 (0.000) | 1.000 (0.000) |
| chính xác trích dẫn | 0.885 (0.151) | 0.995 (0.026) | 0.975 (0.059) |
| phát hiện sai | 0.000 | 0.000 | 0.000 |
| trích sai | 0.000 | 0.000 | 0.000 |
| đúng cổng | 0.750 (0.442) | 1.000 (0.000) | 1.000 (0.000) |
| trễ s | 36.2 (9.7) | 18.6 (2.8) | 33.3 (15.5) |
| $/ca | 0.00234 (0.00041) | 0.00170 (0.00038) | 0.00266 (0.00029) |
| token | 14 050 (2 690) | 5 921 (674) | 8 951 (643) |
| lỗi | 0 | 0 | 0 |

Sai số chuẩn (sd/√24): recall single 0.031, multi 0.023, multi bỏ plan 0.017; trích nguồn single 0.049; đúng cổng single 0.090.

### 9.3 Theo ca (recall / trích nguồn / đúng cổng / trễ s / $ mỗi ca; thứ tự single · multi mặc định · multi bỏ plan)
| ca | recall | trích nguồn | đúng cổng | trễ s | $/ca |
|---|---|---|---|---|---|
| H1 | 0.80 · 1.00 · 1.00 | 0.89 · 1.00 · 1.00 | 0.00 · 1.00 · 1.00 | 36 · 21 · 29 | 0.0023 · 0.0018 · 0.0027 |
| H2 | 1.00 · 1.00 · 1.00 | 0.67 · 1.00 · 1.00 | 1.00 · 1.00 · 1.00 | 26 · 17 · 62 | 0.0017 · 0.0013 · 0.0024 |
| H3 | 1.00 · 1.00 · 1.00 | 0.83 · 1.00 · 1.00 | 1.00 · 1.00 · 1.00 | 49 · 17 · 24 | 0.0028 · 0.0019 · 0.0024 |
| H4 | 0.75 · 0.75 · 0.75 | 1.00 · 1.00 · 1.00 | 0.00 · 1.00 · 1.00 | 34 · 22 · 38 | 0.0023 · 0.0020 · 0.0032 |
| H5 | 1.00 · 1.00 · 1.00 | 0.78 · 1.00 · 1.00 | 1.00 · 1.00 · 1.00 | 36 · 17 · 28 | 0.0024 · 0.0017 · 0.0027 |
| H6 | 1.00 · 1.00 · 1.00 | 0.67 · 1.00 · 1.00 | 1.00 · 1.00 · 1.00 | 30 · 17 · 26 | 0.0020 · 0.0014 · 0.0025 |
| H7 | 0.92 · 1.00 · 1.00 | 0.67 · 1.00 · 1.00 | 1.00 · 1.00 · 1.00 | 33 · 17 · 30 | 0.0023 · 0.0017 · 0.0025 |
| H8 | 0.60 · 0.87 · 1.00 | 0.89 · 1.00 · 1.00 | 1.00 · 1.00 · 1.00 | 45 · 20 · 30 | 0.0028 · 0.0017 · 0.0028 |

**Đọc trung thực (v7).**
- Multi hơn single, ngoài dao động: trích nguồn (100% so 80%, chênh 20 điểm ≈ 4 SE), đúng cổng (100% so 75%, chênh 25 điểm ≈ 2,8 SE; toàn bộ mất ở H1 và H4, nơi single chọn NEEDS_INFO vì thiếu trường phụ, 6/24 lượt), chính xác trích dẫn (99,5% so 88,5%), token (5,9k so 14,1k, ít hơn 58%) và trễ (18,6 so 36,2 s, bằng một nửa) ở cấu hình mặc định.
- Recall: multi 95,2% / 96,9% so single 88,3%; chênh 7-9 điểm nhưng chỉ khoảng 1,8 SE (mặc định) đến 2,5 SE (bỏ plan): hướng nghiêng về multi, chưa chắc ngoài dao động ở n = 24. Phát hiện sai: 0 ở cả ba (v6: single 0,21).
- Multi **không hơn** hoặc không phân biệt được: (a) multi bỏ plan không nhanh hơn single (33,3 so 36,2 s, sd 15,5; một ca H2 có lượt 62 s) và đắt hơn single 14% ($0,00266 so $0,00234); chỉ cấu hình mặc định rẻ hơn single (-27%) và nhanh hơn; (b) hai cấu hình multi chênh nhau về recall (95,2% so 96,9%) trong dao động; chênh về trễ và chi phí (mặc định tốt hơn) ngoài dao động; (c) H4 (leverage) multi mất 6/6 lượt và single 3/3 do bộ chấm: regex tôi viết `2[.,]9\b` không khớp "2,90" mà multi ghi đúng (58/20 = 2,90, lấy số CIC cao hơn); single thật sự sai (dùng nợ BCTC, 2,0 lần). Theo quy tắc không sửa đáp án sau khi xem kết quả, giữ nguyên điểm; nếu tính 2,90 là khớp thì recall multi H4 là 1,00. (d) H8: single mất `ltv`, `max_secured` ở 3/3 lượt; multi mất 2 chi tiết ở 1 lượt.
- Multi không sập trên v7 (0 lỗi, 0 ESCALATED); ca G3 của v6 (CIC chưa tra cứu) không có trong v7, nên bản sửa `ba7b696` chưa được đo lại bằng ca đó.
- So với v6: single trích nguồn 80% thấp hơn các lần đo single trước (90-100% từ v2); đúng cổng single 75% (v6: 38%). Multi mặc định đúng cổng 100% (v6: 88%, G3 sập).

### 9.4 Xem lại single: có đổi hay chỉ do độ khó bộ ca?
Bảng mọi lượt đo có chế độ single (số từ `agent_engine/benchmark_results/*.json`, không phải bản `-regrade`; "chấm" = phiên bản bộ chấm lúc đo, v2 chấm cả evidence nên không so thẳng với v3; "ca nhắm cổng" = số ca đăng ký riêng để kiểm cổng: v6 theo ghi chú đăng ký 8/8, v7 2/8; các bộ trước không đăng ký ca nhắm cổng):

| lượt đo (nhãn rút gọn) | bộ | chấm | commit | recall | trích nguồn | phát hiện sai | đúng cổng | TB phát hiện bắt buộc/ca | ca nhắm cổng |
|---|---|---|---|---|---|---|---|---|---|
| 11-06 full | v1 (5 ca) | v2 | e0ff7ba | 73% | 63% | 0.20 | 100% | 4.80 | 0 |
| 11-06 llmmode | v1 (5 ca) | v2 | 22001ce | 60% | 57% | 0.40 | 100% | 4.80 | 0 |
| 11-07 v2llm | v2 (10 ca) | v2 | 42442fc | 97% | 92% | 0.30 | 90% | 3.80 | 0 |
| 11-07 v2 llm sau sửa lỗi A2A busines | v2 (10 ca) | v2 | c2ac762 | 95% | 97% | 0.13 | 90% | 3.80 | 0 |
| 11-07 v3 trước sửa engine (ee8865d) | v3 (8 ca) | v2 | c0294f7 | 92% | 97% | 0.25 | 100% | 3.62 | 0 |
| 11-07 v3 sau sửa engine (c0294f7) | v3 (8 ca) | v2 | c0294f7 | 94% | 96% | 0.21 | 100% | 3.62 | 0 |
| 11-07 v2 kiểm thoái lui (c0294f7) | v2 (10 ca) | v2 | c0294f7 | 89% | 100% | 0.20 | 90% | 3.80 | 0 |
| 11-08 v4 sau sửa (9f8d182) | v4 (6 ca) | v2 | 9f8d182 | 77% | 92% | 0.17 | 83% | 4.00 | 0 |
| 11-08 v3 kiểm thoái lui (9f8d182) | v3 (8 ca) | v2 | 9f8d182 | 86% | 96% | 0.38 | 100% | 3.62 | 0 |
| 11-08 v4 cuối eae6ad3 (bộ đã dùng để | v4 (6 ca) | v3 | eae6ad3 | 70% | 90% | 0.17 | 83% | 4.00 | 0 |
| 11-08 v5 cuối eae6ad3 (kiểm tra mù) | v5 (6 ca) | v3 | eae6ad3 | 86% | 93% | 0.33 | 83% | 3.83 | 0 |
| 11-09 v6 cuối ef86834 (kiểm tra mù) | v6 (8 ca) | v3 | ef86834 | 90% | 92% | 0.21 | 38% | 3.12 | 8 |
| 11-09 v5 kiểm thoái lui ef86834 | v5 (6 ca) | v3 | ef86834 | 86% | 94% | 0.33 | 83% | 3.83 | 0 |
| 11-09 v7 mù bench7 f0b45e5 single +  | v7 (8 ca) | v3 | 0b51af4 | 88% | 80% | 0.00 | 75% | 4.12 | 2 |

Đối chiếu code (lịch sử git, `git log -- <file>`):
- `scripts/benchmark/single_agent_runner.py`: 3 commit, cuối cùng `dd3da5c` (11-07 trước mọi lượt đo từ v2 trở đi); không đổi từ đó. `common/policy_checklist.py` và `common/mcp_client.py`: lần sửa cuối `dd3da5c` (11-07).
- `common/rag.py`: `db055a3` (11-08 23:20, sau lượt v5 20:06) chỉ thêm hàm `clause()` cho Validation; `rag.search` mà single dùng không đổi. `rag_corpus/`: lần sửa cuối `f02abe6` (11-07 00:10), trước mọi lượt từ v2.
- `common/llm.py`: `e6f352d` (11-09 02:06, giữa v5 và v6) làm `tool_loop` chạy các tool_call cùng lượt song song và bỏ qua tool đứng sau `submit_verdict`; đây là thay đổi code duy nhất chạm đường chạy của single sau v5. Về nghĩa: cùng tập tool chạy, cùng kết quả trả về, chỉ đổi thời điểm; không đổi prompt, model, nhiệt độ. Không thể loại hoàn toàn ảnh hưởng nhỏ lên trễ; recall single ở v5 chạy lại sau thay đổi (11-09 07:27, 85,8%) bằng lượt trước (86,1%) nên không thấy ảnh hưởng lên chất lượng.
- Cấu hình: mọi file kết quả ghi `specialist_model = openai/gpt-6-luna`, không đổi giữa các lượt (mặc định trong `config.py` là mặc định mã; model thật lấy từ env).

Kết luận có bằng chứng:
1. **Single không mạnh lên.** Code đường chạy single không đổi từ 11-07 ngoài `tool_loop` song song; cùng bộ v5 hai lần đo cách nhau ~11 giờ cho 86,1% và 85,8% (độ lệch 0,3 điểm), nên nhiễu lấy mẫu trên cùng bộ ca là nhỏ.
2. **Số recall single dao động theo bộ ca, không theo thời gian hay số phát hiện/ca.** Cùng code từ v3 trở đi: 94% (v3), 70% (v4), 86% (v5), 90% (v6), 88% (v7); TB phát hiện bắt buộc/ca là 3,62; 4,00; 3,83; 3,12; 4,12. Không có quan hệ đơn điệu (v4 4,00 → 70%; v7 4,12 → 88%). Giả thuyết "v6 dễ hơn về tìm phát hiện" chỉ đúng một nửa: v6 có TB thấp nhất (3,12), nhưng single v6 (90%) vẫn nằm trong khoảng 86-94% của v3, v5, v7 và thấp hơn v2/v3; chỉ cao hơn v4 vì v4 là bộ khó (70%).
3. **Chỉ số single biến động mạnh nhất là đúng cổng, và đó là hệ quả của cơ cấu bộ ca**: 83-100% ở v2-v5 (nơi đáp án chủ yếu NEEDS_INFO/REJECTED), 38% ở v6 (8/8 ca nhắm cổng, 5 ca đáp án PENDING_APPROVAL do thiếu trường phụ), 75% ở v7 (2/8 ca nhắm cổng, 4 ca đáp án PENDING_APPROVAL; single chọn NEEDS_INFO ở H1 và H4). Single thiên về NEEDS_INFO khi thiếu trường phụ ở mọi bộ; bộ ca quyết định điểm cổng của nó.
4. Trích nguồn single v7 (80%) thấp hơn các lần trước (90-100%); bộ v7 yêu cầu thêm §4.2 (đòn bẩy), §6.3 (hiệu lực CIC) vì nhiều ca đòi hỏi các § này; chưa tách được nguyên nhân (không đo thêm theo phạm vi bench7).
Không có bằng chứng nào cho thấy code single thay đổi để tốt lên; chênh lệch giữa các lượt đo single giải thích được bằng nội dung bộ ca và dao động lấy mẫu (SE recall single 0,03 ở n = 24). Không sửa single để "làm yếu" hay tối ưu.

## 10. Cờ `agent_tools`: chuyên gia tự chọn và gọi công cụ (kiểm thoái lui, KHÔNG phải kiểm tra mù)

**Cách làm.** Cờ mới `agent_tools` (mặc định bật, cần `LLM_MODE=llm`; tắt thì về đường cũ `facts.gather` gọi hết công cụ trước). Khi bật, orchestrator không gọi `gather` nữa; hai pha:
1. Tín dụng và Tuân thủ chạy một lượt `llm.tool_loop` chọn công cụ, chỉ thấy công cụ trong `_SCOPES` của mình (Tín dụng: financials, loans, inflow; Tuân thủ: business, blacklist, cic, collateral) cộng `da_du_du_lieu`; cùng đường MCP/danh tính/audit như cũ. Mỗi công cụ tối đa một lần mỗi case (bảng theo (case, chuyên môn) nằm trong tiến trình agent, chạy lại khi bị challenge thì dùng lại, không gọi MCP lần nữa). Công cụ bắt buộc (cả phạm vi; TSĐB chỉ bắt buộc khi hồ sơ khai có TSĐB hoặc được yêu cầu kiểm) mà LLM bỏ sót thì hệ thống **gọi bù**. Sau đó `facts.build` (hàm thuần, không đổi) tính lại số trên phần đã gom, và chuyên gia kết luận bằng đúng `_facts_task` cũ.
2. Orchestrator hợp bảng của hai chuyên gia (tách khỏi verdict trước khi lưu), gọi bù phần còn thiếu cho Validation, dựng bảng chung đầy đủ bằng `build`; cổng xác định giữ nguyên.

Trace: `tool_call` giữ `agent` thật đã gọi, `arg_keys` (không giá trị tham số), `duration_ms`, thêm `initiated_by` (`agent` | `system_compensation`; lời gọi bù ghi dưới agent `orchestrator`, không gán cho chuyên gia). Sự kiện mới: `shared_board_updated` (công cụ do agent gọi, đã bù, khóa bảng) theo chuyên gia và `facts_recomputed` (số tính lại, bù ở pha 2) của orchestrator; khóa mới là bổ sung, `CaseTrace.tsx` không đổi. Giới hạn đã biết: số tính lại của chuyên gia chỉ trên phạm vi của mình (Tín dụng không thấy CIC nên không có dòng đối chiếu nợ BCTC/CIC); đối chiếu đầy đủ vẫn nằm ở bảng chung của Validation/cổng.

**Đo** (multi, 1 lần/ca, `--max-cost 0.5`, bộ chấm v3, Planner LLM; "trước" = cùng commit, `OPT_FLAGS=gate,facts,report,challenge,compact`; chạy tuần tự, đã nạp `agent.benchmark_run`). v5 và v7 đều đã xem điểm trước đó nên đây là kiểm tra thoái lui. Một lượt đầu chạy chồng hai tiến trình đo nên đã hủy và đo lại tuần tự.

| chỉ số | v5 trước | v5 sau | v7 trước | v7 sau |
|---|---|---|---|---|
| recall phát hiện | 0.925 | 0.925 | 0.969 | 0.969 |
| trích nguồn | 1.000 | 1.000 | 1.000 | 1.000 |
| chính xác trích dẫn | 0.967 | 0.976 | 0.979 | 0.984 |
| phát hiện sai (tổng) | 0 | 0 | 0 | 0 |
| đúng cổng | 1.00 | 1.00 | 1.00 | 1.00 |
| trễ s | 26.8 | 25.9 | 24.8 | 31.3 |
| $/ca | 0.00282 | 0.00258 | 0.00287 | 0.00295 |
| token/ca | 17 322 | 20 443 | 17 487 | 21 936 |
| lỗi | 0 | 0 | 0 | 0 |

Gọi bù (sau): v5 1/42 lượt gọi công cụ của chuyên gia/orchestrator (2,4%), v7 0/56; không công cụ nào lặp theo (case, agent, công cụ). Mốc v7 cũ (multi Planner LLM, 24 lượt, 3 lần/ca): trễ 33,3 s, $0,00266.

**Đọc trung thực.** Chất lượng không đổi (1 lần/ca, 6 và 8 ca nên chỉ bắt được thoái lui lớn). Thêm lượt LLM chọn công cụ tăng token ~18–25%, chi phí −8% (v5) và +3% (v7), trễ −3% (v5) và +26% (v7); với n=6–8 và độ lệch trễ ~10–15 s, chênh lệch trễ không tách được khỏi dao động. Công cụ thực tế do LLM tự gọi gần như đủ, nên tỉ lệ gọi bù thấp; chưa kiểm ca LLM bỏ sót nhiều.
