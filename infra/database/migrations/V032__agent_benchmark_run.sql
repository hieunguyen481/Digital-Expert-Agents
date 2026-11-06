-- Ket qua benchmark single-agent vs multi-agent (agent_engine/scripts/benchmark).
-- Chi chua so do va ket luan da chay that; khong co du lieu khach ngoai van ban ket luan trong `runs`,
-- nen API chi tra tong hop + so do tung luot (khong tra van ban).
CREATE TABLE agent.benchmark_run (
    run_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    cases_version TEXT NOT NULL,
    llm_mode TEXT NOT NULL,
    planner_model TEXT NOT NULL,
    specialist_model TEXT NOT NULL,
    git_commit TEXT NOT NULL,
    runs_per_case INTEGER NOT NULL CHECK (runs_per_case > 0),
    total_cost_usd NUMERIC(12, 6),
    summary JSONB NOT NULL,
    per_case JSONB NOT NULL,
    runs JSONB NOT NULL
);
CREATE INDEX ix_benchmark_run_created ON agent.benchmark_run(created_at DESC);

ALTER TABLE agent.benchmark_run ENABLE ROW LEVEL SECURITY;
-- Doc: nhan vien dang hoat dong (identity.current_employee_id() kiem tra ACTIVE). Khong co quyen ghi
-- cho bank_engine: ket qua duoc nap boi script benchmark bang quyen van hanh.
CREATE POLICY benchmark_run_read_policy ON agent.benchmark_run FOR SELECT TO bank_engine
    USING (identity.current_employee_id() IS NOT NULL);
GRANT SELECT ON agent.benchmark_run TO bank_engine;
