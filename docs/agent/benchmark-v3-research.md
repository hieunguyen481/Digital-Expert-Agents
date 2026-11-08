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
