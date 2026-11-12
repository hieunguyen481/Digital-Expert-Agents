import { expect, test, type Browser } from '@playwright/test';
import { loginAs } from './helpers';

const DECIDE = '/ho-so-vay/75000000-0000-4000-8000-000000000013';

/** Bảo đảm hồ sơ có một lượt đội agent: nếu chưa có, Trưởng phòng chạy một lượt thật (tốn LLM) rồi chờ kết thúc. */
async function ensureAgentRun(browser: Browser, path: string): Promise<void> {
  const ctx = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? 3000}` });
  const p = await ctx.newPage();
  try {
    await loginAs(p, 'truongphong');
    await p.goto(path);
    const run = p.getByTestId('run-agent-team');
    await expect(p.getByTestId('agent-run').or(p.getByTestId('agent-team-empty'))).toBeVisible({ timeout: 20_000 });
    if (!(await p.getByTestId('agent-run').isVisible()) && (await run.isVisible().catch(() => false))) await run.click();
    await expect(p.getByTestId('agent-run')).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => p.getByTestId('agent-run').getAttribute('data-state'), { timeout: 330_000, intervals: [5000] })
      .toMatch(/Pending Approval|Needs Info|Escalated|Completed|Rejected/);
  } finally { await ctx.close(); }
}

/** Đo các chỗ trình bày: màu hạn đối chiếu, khung tài liệu, tiêu đề cột, tên ô nhập chat, focus sau Esc ở trace. */
test('hạn đối chiếu: cùng ngày thì cùng ngưỡng màu, có ghi số ngày', async ({ page }) => {
  await loginAs(page, 'httd');
  await page.goto('/doi-chieu');
  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  const byDay = new Map<string, Set<string>>();
  for (const r of await rows.all()) {
    const chip = r.locator('td').last().locator('span').first();
    const text = (await chip.innerText()).trim();
    if (/tạm dừng/.test(text)) continue;
    expect(text).toMatch(/\d{2}\/\d{2}\/\d{4} · (còn \d+ ngày LV|hạn hôm nay|quá hạn \d+ ngày LV)/);
    const day = text.slice(0, 10);
    const cls = await chip.evaluate((e) => getComputedStyle(e).color);
    byDay.set(day, (byDay.get(day) ?? new Set()).add(cls));
  }
  for (const [, colors] of byDay) expect(colors.size).toBe(1);
});

test('tiêu đề cột số dùng chữ sans, ô số dùng mono', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/viec-cua-toi');
  const th = page.locator('thead th', { hasText: 'Số tiền' }).first();
  await expect(th).toBeVisible();
  expect(await th.evaluate((e) => getComputedStyle(e).fontFamily)).not.toMatch(/mono/i);
  expect(await page.locator('tbody td', { hasText: /tỷ|triệu/ }).first().evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/mono/i);
});

test('ô nhập của chat có tên truy cập', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/chat');
  await expect(page.locator('textarea').first()).toHaveAttribute('aria-label', /Câu hỏi/);
});

test('Esc đóng ngăn kéo trace, focus về dòng đã mở', async ({ page, browser }) => {
  test.setTimeout(420_000);
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Dấu vết' }).click();
  const row = page.locator('[data-testid^="case-row-"]').first();
  if (!(await row.isVisible({ timeout: 5000 }).catch(() => false))) {
    await ensureAgentRun(browser, DECIDE);
    await page.reload();
    await page.getByRole('tab', { name: 'Dấu vết' }).click();
  }
  await expect(row).toBeVisible();
  const id = await row.getAttribute('data-testid');
  await row.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe(id);
});

const NO_LOWER = /^\p{Ll}/u;

test('00163: có câu "AI đề xuất", không mục nào bắt đầu bằng chữ thường, vs hay "— "', async ({ page, browser }) => {
  test.setTimeout(420_000);
  await ensureAgentRun(browser, DECIDE);
  await loginAs(page, 'pheduyet');
  await page.goto(DECIDE);
  const reco = page.getByTestId('agent-recommendation');
  await expect(reco).toBeVisible({ timeout: 20_000 });
  await expect(reco).toContainText('AI đề xuất');
  const items = await page.getByTestId('agent-team').locator('li').allInnerTexts();
  for (const t of items) {
    expect(t.trim(), `mục "${t}" bắt đầu bằng chữ thường`).not.toMatch(NO_LOWER);
    expect(t).not.toMatch(/ vs |— /);
  }
});

test('ngăn kéo trace: mục không bắt đầu bằng chữ thường', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Dấu vết' }).click();
  const row = page.locator('[data-testid^="case-row-"]').first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  const items = await page.getByRole('dialog').locator('li').allInnerTexts();
  for (const t of items) expect(t.trim(), `mục "${t}"`).not.toMatch(NO_LOWER);
});

test('Kiểm toán: không có nút "Sửa đề xuất" và không có "Việc của bạn"', async ({ page }) => {
  await loginAs(page, 'kiemtoan');
  await page.goto('/viec-cua-toi');
  await expect(page.getByRole('table').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sửa đề xuất/ })).toHaveCount(0);
  await page.goto(DECIDE);
  await expect(page.getByTestId('loan-header')).toBeVisible();
  await expect(page.getByTestId('todo-panel')).toHaveCount(0);
  await expect(page.getByText('Việc của bạn')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Sửa đề xuất/ })).toHaveCount(0);
});
