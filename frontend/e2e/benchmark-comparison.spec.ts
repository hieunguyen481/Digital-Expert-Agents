import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Đối chiếu số hiện trên tab "So sánh hiệu năng" với MỌI file kết quả đã lưu
 * (agent_engine/benchmark_results/*.json, bản đã nạp vào agent.benchmark_run), chọn qua danh sách lượt đo.
 * Mặc định phải là lượt v2 đo mới nhất. Cần stack thật và kết quả đã nạp: `run.py --import-file <file>`.
 */
const DIR = resolve(process.cwd(), '../agent_engine/benchmark_results');
const all = readdirSync(DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(resolve(DIR, f), 'utf8')));

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const withSd = (s: { mean: number; sd: number | null }, f: (v: number) => string) =>
  `${f(s.mean)}${s.sd === null ? '' : ` ± ${f(s.sd)}`}`;

async function expectRun(page: Page, stored: any) {
  await expect(page.getByTestId('cmp-meta')).toContainText(stored.run_id);
  await expect(page.getByTestId('cmp-meta')).toContainText(`bộ chấm ${stored.grader_version ?? 'v1'}`);
  for (const mode of ['single', 'multi'] as const) {
    const s = stored.summary[mode];
    await expect(page.getByTestId(`cmp-finding_recall-${mode}`)).toHaveText(withSd(s.finding_recall, pct));
    await expect(page.getByTestId(`cmp-false_findings-${mode}`)).toHaveText(withSd(s.false_findings, (v) => v.toFixed(2)));
    await expect(page.getByTestId(`cmp-gate_ok-${mode}`)).toHaveText(withSd(s.gate_ok, pct));
    await expect(page.getByTestId(`cmp-latency_s-${mode}`)).toHaveText(withSd(s.latency_s, (v) => `${v.toFixed(1)}s`));
    await expect(page.getByTestId(`cmp-cost_usd-${mode}`)).toHaveText(withSd(s.cost_usd, (v) => `$${v.toFixed(4)}`));
    for (const id of Object.keys(stored.per_case)) {
      await expect(page.getByTestId(`cmp-case-${id}-${mode}`)).toHaveText(withSd(stored.per_case[id][mode].finding_recall, pct));
    }
  }
}

test('ComparisonTab mặc định là lượt v2 đo mới nhất và chọn được mọi lượt đã lưu', async ({ page }) => {
  const measuredV2 = all.filter((r) => r.cases_version === 'v2' && !r.regrade_of).pop();
  test.skip(!measuredV2, 'Chưa có file kết quả benchmark v2');
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /So sánh hiệu năng/ }).click();

  await expectRun(page, measuredV2); // mặc định
  for (const stored of all) {
    await page.getByTestId('cmp-select').click();
    const kind = stored.regrade_of ? 'chấm lại dữ liệu cũ' : 'đo mới';
    const re = new RegExp(`Bộ ca ${stored.cases_version} · bộ chấm ${stored.grader_version ?? 'v1'} · chế độ ${stored.llm_mode} · ${kind}`);
    await page.locator('.ant-select-item-option', { hasText: re }).first().click();
    await expectRun(page, stored);
  }
});
