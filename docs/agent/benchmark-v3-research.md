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

Số liệu tính từ `agent_engine/benchmark_results/*abl*.json` (không nạp dashboard). Cổng xác định (`gate.py`) được hiệu chỉnh offline trên các ca v2-v5 (khớp 29/30; C6 v2 lệch vì D6 v3 coi thiếu tài khoản thanh toán là chặn) nên "đúng cổng" của biến thể có cờ `gate` trên v4/v5 là số trên bộ phát triển, không phải bằng chứng tổng quát; bằng chứng là v6 mù.

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
