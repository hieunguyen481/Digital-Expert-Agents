import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Đối chiếu số hiện trên tab "So sánh hiệu năng" với MỌI file kết quả đã lưu
 * (agent_engine/benchmark_results/*.json, bản đã nạp vào agent.benchmark_run), chọn qua danh sách lượt đo.
 * Mặc định phải là lượt đo thật của bộ ca mới nhất (v3), lượt mới nhất trong bộ đó. Cần stack thật và kết quả đã nạp: `run.py --import-file <file>`.
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

test('ComparisonTab mặc định là lượt đo thật mới nhất của bộ ca mới nhất và chọn được mọi lượt đã lưu', async ({ page }) => {
  const measured = all.filter((r) => !r.regrade_of);
  const newestSet = measured.map((r) => r.cases_version).sort().pop();
  const defaultRun = measured.filter((r) => r.cases_version === newestSet).sort((a, b) => a.created_at.localeCompare(b.created_at)).pop();
  test.skip(!defaultRun, 'Chưa có file kết quả benchmark đo thật');
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /So sánh hiệu năng/ }).click();

  await expectRun(page, defaultRun); // mặc định
  for (const stored of all) {
    await page.getByTestId('cmp-select').click();
    const kind = stored.regrade_of ? 'chấm lại dữ liệu cũ' : 'đo mới';
    const re = new RegExp(`Bộ ca ${stored.cases_version} · bộ chấm ${stored.grader_version ?? 'v1'} · chế độ ${stored.llm_mode} · ${kind}`);
    // Nhiều lượt có thể cùng bộ ca/bộ chấm/chế độ: chọn đúng lượt theo nhãn riêng của nó.
    const option = page.locator('.ant-select-item-option', { hasText: re }).filter({ hasText: stored.label }).first();
    // Danh sách ảo của antd chỉ dựng các mục đang hiện: cuộn dần tới khi mục cần chọn xuất hiện.
    for (let i = 0; i < 40 && (await option.count()) === 0; i++) {
      await page.locator('.rc-virtual-list-holder').first().evaluate((el) => el.scrollBy(0, 100));
    }
    await option.click();
    await expectRun(page, stored);
  }
});
