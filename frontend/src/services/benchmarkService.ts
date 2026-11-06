import apiClient from './apiClient';
import type { BenchmarkLatest } from '@/types/dashboard';

/** Kết quả benchmark đã lưu; chưa có thì `status: 'empty'`. Không có đường dự phòng bằng số giả. */
export async function getLatestBenchmark(): Promise<BenchmarkLatest> {
  return (await apiClient.get<BenchmarkLatest>('/agent-benchmark/latest')).data;
}
