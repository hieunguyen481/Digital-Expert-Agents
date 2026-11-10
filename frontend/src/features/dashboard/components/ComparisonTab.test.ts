import { describe, expect, it } from 'vitest';
import { defaultRunId, isTestRun } from './ComparisonTab';
import type { BenchmarkRunMeta } from '@/types/dashboard';

const m = (run_id: string, cases_version: string, created_at: string, label: string, regrade_of: string | null = null) =>
  ({ run_id, cases_version, created_at, label, regrade_of }) as unknown as BenchmarkRunMeta;

describe('lượt đo mặc định', () => {
  it('bỏ lượt kiểm thử và chấm lại', () => {
    const runs = [
      m('a', 'v4', '2026-11-08T10:00:00Z', 'v4 cuối'),
      m('b', 'v5', '2026-11-08T20:00:00Z', 'v5 kiểm tra mù'),
      m('c', 'v5', '2026-11-09T05:00:00Z', 'abl none v5'),
      m('d', 'v5', '2026-11-09T06:00:00Z', 'v5 chấm lại', 'b'),
    ];
    expect(isTestRun(runs[2])).toBe(true);
    expect(defaultRunId(runs)).toBe('b');
  });
});
