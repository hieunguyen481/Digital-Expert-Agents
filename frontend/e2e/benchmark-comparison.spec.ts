import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Đối chiếu số hiện trên tab "So sánh hiệu năng" với file kết quả đã lưu
 * (agent_engine/benchmark_results/*.json, bản đã nạp vào agent.benchmark_run).
 * Cần stack thật và kết quả đã nạp: `run.py --import-file <file>`.
 */
const DIR = resolve(process.cwd(), '../agent_engine/benchmark_results');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
const stored = files.length ? JSON.parse(readFileSync(resolve(DIR, files[files.length - 1]), 'utf8')) : null;

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const withSd = (s: { mean: number; sd: number | null }, f: (v: number) => string) =>
  `${f(s.mean)}${s.sd === null ? '' : ` ± ${f(s.sd)}`}`;

test('ComparisonTab hiện đúng số trong kết quả benchmark đã lưu', async ({ page }) => {
  test.skip(!stored, 'Chưa có file kết quả benchmark');
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /So sánh hiệu năng/ }).click();

  await expect(page.getByTestId('cmp-meta')).toContainText(stored.run_id);
  for (const mode of ['single', 'multi'] as const) {
    const s = stored.summary[mode];
    await expect(page.getByTestId(`cmp-finding_recall-${mode}`)).toHaveText(withSd(s.finding_recall, pct));
    await expect(page.getByTestId(`cmp-gate_ok-${mode}`)).toHaveText(withSd(s.gate_ok, pct));
    await expect(page.getByTestId(`cmp-latency_s-${mode}`)).toHaveText(withSd(s.latency_s, (v) => `${v.toFixed(1)}s`));
    await expect(page.getByTestId(`cmp-cost_usd-${mode}`)).toHaveText(withSd(s.cost_usd, (v) => `$${v.toFixed(4)}`));
    for (const id of Object.keys(stored.per_case)) {
      await expect(page.getByTestId(`cmp-case-${id}-${mode}`)).toHaveText(withSd(stored.per_case[id][mode].finding_recall, pct));
    }
  }
});
