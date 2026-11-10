import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers';
import { fmtDayTime } from '../src/utils/format';

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

const nf = (v: number, d: number) => new Intl.NumberFormat('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const pct = (v: number) => `${nf(v * 100, 1)}%`;
const withSd = (s: { mean: number; sd: number | null }, f: (v: number) => string) =>
  `${f(s.mean)}${s.sd === null ? '' : ` ± ${f(s.sd)}`}`;

async function expectRun(page: Page, stored: any) {
  await expect(page.getByTestId('cmp-meta')).toContainText(stored.run_id); // nằm trong <details>, vẫn có trong DOM
  await expect(page.getByTestId('cmp-headline')).toContainText(stored.summary.single && stored.summary.multi ? 'điểm phần trăm' : 'chỉ chạy một chế độ');
  await expect(page.getByTestId('cmp-meta')).toContainText(`bộ chấm ${stored.grader_version ?? 'v1'}`);
  for (const mode of ['single', 'multi'] as const) {
    const s = stored.summary[mode];
    if (!s) { // lượt chỉ đo một chế độ: chế độ còn lại hiện —
      await expect(page.getByTestId(`cmp-finding_recall-${mode}`)).toHaveText('—');
      continue;
    }
    await expect(page.getByTestId(`cmp-finding_recall-${mode}`)).toHaveText(withSd(s.finding_recall, pct));
    await expect(page.getByTestId(`cmp-false_findings-${mode}`)).toHaveText(withSd(s.false_findings, (v) => nf(v, 2)));
    await expect(page.getByTestId(`cmp-gate_ok-${mode}`)).toHaveText(withSd(s.gate_ok, pct));
    await expect(page.getByTestId(`cmp-latency_s-${mode}`)).toHaveText(withSd(s.latency_s, (v) => (v < 60 ? `${nf(v, 1)} giây` : `${nf(v / 60, 1)} phút`)));
    await expect(page.getByTestId(`cmp-cost_usd-${mode}`)).toHaveText(withSd(s.cost_usd, (v) => `${nf(v, 4)} USD`));
    for (const id of Object.keys(stored.per_case)) {
      await expect(page.getByTestId(`cmp-case-${id}-${mode}`)).toHaveText(withSd(stored.per_case[id][mode].finding_recall, pct));
    }
  }
}

test('ComparisonTab mặc định là lượt đo thật mới nhất của bộ ca mới nhất và chọn được mọi lượt đã lưu', async ({ page }) => {
  test.setTimeout(240_000); // duyệt từng lượt qua danh sách ảo: càng nhiều lượt càng lâu
  const measured = all.filter((r) => !r.regrade_of && !/kiểm thoái lui|bỏ cờ|kiểm thử|\babl\b|smoke|\btest\b/i.test(r.label ?? ''));
  const newestSet = measured.map((r) => r.cases_version).sort().pop();
  const defaultRun = measured.filter((r) => r.cases_version === newestSet).sort((a, b) => a.created_at.localeCompare(b.created_at)).pop();
  test.skip(!defaultRun, 'Chưa có file kết quả benchmark đo thật');
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: /So sánh hiệu năng/ }).click();

  await expectRun(page, defaultRun); // mặc định
  for (const stored of all) {
    await page.getByTestId('cmp-select').click();
    // Nhãn lựa chọn viết cho người đọc nghiệp vụ (runOptionLabel): giờ đo · bộ ca · so sánh/đa agent · số lượt mỗi ca.
    const both = !!stored.summary.single && !!stored.summary.multi;
    const kind = stored.regrade_of ? ' · chấm lại dữ liệu cũ' : '';
    const expected = `${fmtDayTime(stored.created_at)} · Bộ ca ${stored.cases_version} · ${both ? 'So sánh single và multi' : 'Chỉ đa agent'} · ${stored.runs_per_case} lượt mỗi ca${kind}`;
    const active = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-active');
    // Vài lượt cùng giờ/bộ ca/số lượt có cùng nhãn: thử lần lượt từng mục khớp nhãn tới khi đúng mã lượt.
    let chosen = false;
    for (let skip = 0; skip < 6 && !chosen; skip++) {
      if (skip > 0) await page.getByTestId('cmp-select').click();
      await page.keyboard.press('Home');
      let seen = 0;
      let found = false;
      for (let i = 0; i < all.length + 5 && !found; i++) {
        const title = (await active.first().getAttribute('title').catch(() => null)) ?? '';
        if (title.startsWith(expected) && seen++ === skip) found = true;
        else await page.keyboard.press('ArrowDown');
      }
      if (!found) break;
      await page.keyboard.press('Enter');
      chosen = await page.getByTestId('cmp-meta').innerText().then((t) => t.includes(stored.run_id));
    }
    expect(chosen, `không thấy lượt ${stored.run_id} trong danh sách`).toBe(true);
    await expectRun(page, stored);
  }
});
