import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

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

test('Esc đóng ngăn kéo trace, focus về dòng đã mở', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Dấu vết' }).click();
  const row = page.locator('[data-testid^="case-row-"]').first();
  await expect(row).toBeVisible();
  const id = await row.getAttribute('data-testid');
  await row.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe(id);
});
