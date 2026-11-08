# Benchmark single-agent vs multi-agent

Chạy 1 ca (một lệnh): `python3 agent_engine/scripts/benchmark/run.py --cases C1 --runs 1`
Cả bộ: `python3 agent_engine/scripts/benchmark/run.py --runs 3` (mặc định `cases_v2.json`: 10 ca x 3 lần x 2 chế độ, chặn ở `--max-cost 2`).
Chấm lại dữ liệu cũ bằng bộ chấm hiện tại (không gọi LLM, giữ bản gốc): `... run.py --regrade-file agent_engine/benchmark_results/<file>.json`.
Nạp lại file đã lưu vào Postgres: `... run.py --import-file agent_engine/benchmark_results/<file>.json`.

- `cases_v2.json`: 5 ca v1 (chỉnh tool bắt buộc theo rules.md, mẫu forbidden chặt hơn) + 5 ca mới C6-C10 trên hồ sơ seed `R__seed_benchmark_profiles.sql`; C6-C10 không dùng để sửa agent.
- `cases_v5.json`: 6 ca F1-F6 (seed `R__seed_benchmark_v5_profiles.sql`, khách ...0041-0046) — BỘ KIỂM TRA MÙ: đăng ký trước khi sửa engine ở vòng tối ưu v4, không chạy và không đọc điểm cho tới lượt đo cuối. v4 từ nay là "bộ đã dùng để tối ưu".
- Bộ chấm v3 (`--grader v3`, mặc định): như v2 nhưng chỉ chấm văn bản kết luận cuối (multi = báo cáo cuối hợp nhất, không gộp nháp chuyên gia; single = câu trả lời), trích dẫn chấm trên văn bản đó, thêm `citation_precision` (nguồn chính sách §/Điều được liệt kê có xuất hiện trong văn bản kết luận không), `sources_listed`, `report_chars`. v2 giữ nguyên (`--grader v2`). Chấm lại v4 cũ: `... --regrade-file <file> --cases-file agent_engine/scripts/benchmark/cases_v4.json --grader v3`.
- `cases_v4.json`: 6 ca liên phòng ban E1-E6 trên seed `R__seed_benchmark_v4_profiles.sql` (nạp thủ công như v3), đăng ký trước khi sửa engine v4; giả thuyết ở cuối `docs/agent/benchmark-v3-research.md`.
- `cases_v3.json`: 8 ca liên phòng ban D1-D8 (nhiều TSĐB, xung đột nguồn, tính lại số) trên seed `R__seed_benchmark_v3_profiles.sql`; đăng ký trước khi sửa engine, bộ chấm v2 giữ nguyên. Giả thuyết: `docs/agent/benchmark-v3-research.md`.
- Mỗi lượt multi lưu thêm `final_report_text` (báo cáo cuối hợp nhất của engine) để đối chiếu; điểm vẫn chấm trên `conclusion_text` (hợp các verdict) cho cả hai chế độ.
- `cases_v1.json`: ca đo + đáp án viết TRƯỚC khi chạy (đừng sửa; đổi thì tạo `cases_v2.json`).
- `grade.py`: bộ chấm regex dùng chung hai chế độ, không có LLM chấm. v2 bỏ qua khớp `forbidden` nằm trong câu phủ định (không/chưa/false/trở lên).
- Cả hai chế độ nhận cùng `common/policy_checklist.py` (tổng cấp tín dụng, BCTC kiểm toán); MCP dùng lại kết quả đọc trong cùng một case (audit `cache_hit`, không tính vào số lượt gọi).
- `single_agent_runner.py`: chatbot đơn chạy trong container engine (cùng model Specialist, tool MCP, RAG, danh tính, `llm.tool_loop`; không planner/agent chuyên môn/Validation).
- Kết quả: `agent_engine/benchmark_results/<run_id>.json` (nhãn thời gian, model, phiên bản bộ ca, commit) + bảng `agent.benchmark_run` (V032).

Đo: số lượt MCP = `audit.engine_mcp_call` trong cửa sổ thời gian của lượt chạy (cùng nguồn cho cả hai); token/chi phí = `LLM_USAGE` (OpenRouter `usage.cost`) phát sinh trong lượt (multi: đọc `/engine/logs/*.log`, cần chạy tuần tự, không ai dùng engine cùng lúc); độ trễ = tường đồng hồ.
Giới hạn: chấm bằng từ khóa nên có thể bỏ sót cách diễn đạt khác hoặc khớp nhầm; phần phát hiện chỉ chấm trên kết luận (summary/findings/conditions/narrative), không chấm evidence.

Kết quả bench5 (v4 = bộ đã dùng để tối ưu, v5 = kiểm tra mù, bộ chấm v3): xem `docs/agent/benchmark-v3-research.md` §7.
