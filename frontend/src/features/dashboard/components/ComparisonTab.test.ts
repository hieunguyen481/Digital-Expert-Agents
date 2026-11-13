import { describe, expect, it } from 'vitest';
import { buildRows, conclusion, defaultRunId, hasBothModes, isTestRun } from './ComparisonTab';
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

describe('lượt đo mặc định là lượt hai chế độ chính thức (B3)', () => {
  const mm = (run_id: string, created_at: string, label: string, modes: ('single' | 'multi')[]) =>
    ({ run_id, cases_version: 'v7', created_at, label, regrade_of: null, modes }) as unknown as BenchmarkRunMeta;

  it('ưu tiên lượt có cả single và multi dù lượt một chế độ mới hơn', () => {
    const runs = [
      mm('two', '2026-11-09T09:03:00Z', 'v7 mù single + multi', ['multi', 'single']),
      mm('one', '2026-11-09T09:19:00Z', 'v7 mù multi', ['multi']),
    ];
    expect(hasBothModes(runs[0])).toBe(true);
    expect(defaultRunId(runs)).toBe('two');
  });

  it('chưa có lượt hai chế độ thì dùng lượt chính thức mới nhất', () => {
    const runs = [mm('one', '2026-11-09T09:19:00Z', 'v7 mù multi', ['multi'])];
    expect(defaultRunId(runs)).toBe('one');
  });
});


describe('kết luận khi lượt chỉ có một chế độ (B3)', () => {
  it('không in "hơn ở 0 chỉ số"', () => {
    const run = { summary: { multi: { finding_recall: { mean: 0.9 } } } } as unknown as Parameters<typeof buildRows>[0];
    const text = conclusion(buildRows(run), run);
    expect(text).toContain('chỉ chạy một chế độ');
    expect(text).not.toContain('hơn ở 0');
  });
});

describe('lượt đo mặc định có nhiều lần lặp nhất', () => {
  const rr = (run_id: string, runs_per_case: number, created_at: string) =>
    ({ run_id, cases_version: 'v7', created_at, label: 'x', regrade_of: null, modes: ['multi', 'single'], runs_per_case }) as unknown as BenchmarkRunMeta;
  it('chọn lượt 3 lần dù lượt 1 lần mới hơn', () => {
    expect(defaultRunId([rr('three', 3, '2026-11-09T09:00:00Z'), rr('one', 1, '2026-11-11T09:00:00Z')])).toBe('three');
  });
});

describe('nhãn lần đo của bộ ca v8', () => {
  it('đánh số lần 1, 2, 3 theo nhãn lưu', async () => {
    const { blindOrdinal } = await import('./ComparisonTab');
    expect(blindOrdinal('v8 mù trên bản khóa 735f9a7')).toBe(1);
    expect(blindOrdinal('v8 đo lại trên bản khóa 98600a7')).toBe(2);
    expect(blindOrdinal('v8 đo lần ba trên bản khóa 8c9afbc')).toBe(3);
  });
  it('lượt khác không gắn số lần', async () => {
    const { blindOrdinal } = await import('./ComparisonTab');
    expect(blindOrdinal('v7 kiểm thoái lui')).toBeNull();
    expect(blindOrdinal(null)).toBeNull();
  });
});
