-- V036 (idempotent: cột có thể đã tồn tại trên stack chung do thêm tay trước khi có migration này).
-- Phiên bản bộ chấm + nguồn của lượt đo benchmark, để dashboard chọn giữa các lượt (v1 gốc,
-- v1 chấm lại bằng bộ chấm v2, v2 mới). Lượt cũ mặc định là bộ chấm v1, đo thật.
ALTER TABLE agent.benchmark_run ADD COLUMN IF NOT EXISTS grader_version TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE agent.benchmark_run ADD COLUMN IF NOT EXISTS regrade_of TEXT NULL;
COMMENT ON COLUMN agent.benchmark_run.regrade_of IS 'run_id gốc nếu đây là chấm lại dữ liệu cũ bằng bộ chấm mới (không gọi LLM).';
