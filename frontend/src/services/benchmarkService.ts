import apiClient from './apiClient';
import type { BenchmarkLatest, BenchmarkRunMeta } from '@/types/dashboard';

/** Lượt mặc định (đo mới của bộ ca mới nhất); chưa có thì `status: 'empty'`. Không có đường dự phòng bằng số giả. */
export async function getLatestBenchmark(): Promise<BenchmarkLatest> {
  return (await apiClient.get<BenchmarkLatest>('/agent-benchmark/latest')).data;
}

/** Danh sách các lượt đo đã lưu (đo mới, chấm lại dữ liệu cũ, bản cũ). */
export async function getBenchmarkRuns(): Promise<BenchmarkRunMeta[]> {
  return (await apiClient.get<{ runs: BenchmarkRunMeta[] }>('/agent-benchmark/runs')).data.runs;
}

export async function getBenchmarkRun(runId: string): Promise<BenchmarkLatest> {
  return (await apiClient.get<BenchmarkLatest>(`/agent-benchmark/runs/${encodeURIComponent(runId)}`)).data;
}
