import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers';
import { fmtDayTime, fmtSec } from '../src/utils/format';

/**
 * Đối chiếu số hiện trên tab "So sánh" với MỌI file kết quả đã lưu
 * (agent_engine/benchmark_results/*.json, bản đã nạp vào agent.benchmark_run), chọn qua danh sách lượt đo.
 * Mặc định phải là lượt chính thức hai chế độ có nhiều lần lặp nhất. Cần stack thật và kết quả đã nạp: `run.py --import-file <file>`.
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
    await expect(page.getByTestId(`cmp-latency_s-${mode}`)).toHaveText(withSd(s.latency_s, fmtSec));
    await expect(page.getByTestId(`cmp-cost_usd-${mode}`)).toHaveText(withSd(s.cost_usd, (v) => `${nf(v, 4)} USD`));
    for (const id of Object.keys(stored.per_case)) {
      await expect(page.getByTestId(`cmp-case-${id}-${mode}`)).toHaveText(withSd(stored.per_case[id][mode].finding_recall, pct));
    }
  }
}

test('ComparisonTab mặc định là lượt đo thật mới nhất của bộ ca mới nhất và chọn được mọi lượt đã lưu', async ({ page }) => {
  test.setTimeout(240_000); // duyệt từng lượt qua danh sách ảo: càng nhiều lượt càng lâu
  const measured = all.filter((r) => !r.regrade_of && !/kiểm thoái lui|bỏ cờ|kiểm thử|\babl\b|smoke|\btest\b/i.test(r.label ?? ''));
  const both = measured.filter((r) => r.summary?.single && r.summary?.multi);
  const pool = both.length ? both : measured;
  // mặc định: lượt chính thức có nhiều lần lặp nhất; hòa thì bộ ca mới hơn, rồi lượt mới hơn
  const defaultRun = [...pool].sort((a, b) => (a.runs_per_case ?? 0) - (b.runs_per_case ?? 0)
    || String(a.cases_version).localeCompare(String(b.cases_version)) || a.created_at.localeCompare(b.created_at)).pop();
  test.skip(!defaultRun, 'Chưa có file kết quả benchmark đo thật');
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'So sánh' }).click();

  await expectRun(page, defaultRun); // mặc định
  // Nhãn lựa chọn viết cho người đọc nghiệp vụ (runOptionLabel): giờ đo · bộ ca · so sánh/đa agent · số lượt mỗi ca.
  // Vài lượt cùng giờ/bộ ca/số lượt có cùng nhãn: gom theo nhãn, chọn lần lượt từng mục khớp và đối chiếu theo mã lượt hiện ở chú thích.
  const labelOf = (r: any) => `${fmtDayTime(r.created_at)} · Bộ ca ${r.cases_version} · ${r.summary.single && r.summary.multi ? 'So sánh single và multi' : 'Chỉ đo đội agent'} · ${r.runs_per_case} lượt mỗi ca${r.regrade_of ? ' · chấm lại dữ liệu cũ' : ''}`;
  const groups = new Map<string, any[]>();
  for (const r of all) groups.set(labelOf(r), [...(groups.get(labelOf(r)) ?? []), r]);
  for (const [expected, members] of groups) {
    const covered = new Set<string>();
    for (let k = 0; k < members.length; k++) {
      await page.getByTestId('cmp-select').click();
      const active = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-active');
      await page.keyboard.press('Home');
      let seen = 0;
      let found = false;
      for (let i = 0; i < all.length * 2 + 20 && !found; i++) {
        const title = (await active.first().getAttribute('title').catch(() => null)) ?? '';
        if (title.replace(' · [Kiểm thử]', '') === expected && seen++ === k) found = true;
        else await page.keyboard.press('ArrowDown');
      }
      expect(found, `không thấy mục ${k + 1} của nhãn: ${expected}`).toBe(true);
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('cmp-meta')).toContainText(new RegExp(members.map((m) => m.run_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')));
      const meta = (await page.getByTestId('cmp-meta').textContent()) ?? '';
      // mã lượt chấm lại chứa mã lượt gốc làm tiền tố: lấy mã khớp dài nhất.
      const stored = [...members].sort((a, b) => b.run_id.length - a.run_id.length).find((m) => meta.includes(m.run_id));
      expect(stored, `mục chọn không phải lượt nào trong nhóm: ${expected}`).toBeTruthy();
      covered.add(stored.run_id);
      await expectRun(page, stored);
    }
    expect(covered.size, `nhóm nhãn ${expected} chưa phủ hết lượt`).toBe(members.length);
  }
});
