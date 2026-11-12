import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

/** Khung và tiếp cận: ô tìm kiếm combobox, panel AI phủ lên dưới 1440px, trang lỗi hồ sơ có h1, không tràn ngang. */
const OUT = '/tmp/uf-tiep-can-khung';
mkdirSync(OUT, { recursive: true });

test('ô tìm kiếm: combobox, mũi tên, Enter, mã mono', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await loginAs(page, 'qhkh');
  await page.goto('/viec-cua-toi');
  const box = page.getByRole('combobox', { name: 'Tìm kiếm' });
  await box.fill('HSV');
  await expect(page.getByRole('option').first()).toBeVisible();
  await expect(box).toHaveAttribute('aria-expanded', 'true');
  await box.press('ArrowDown');
  const id = await box.getAttribute('aria-activedescendant');
  expect(id).toBeTruthy();
  await expect(page.locator(`#${id}`)).toHaveAttribute('aria-selected', 'true');
  const font = await page.getByRole('option').first().locator('b').evaluate((e) => getComputedStyle(e).fontFamily);
  expect(font).toContain('Plex Mono');
  await page.screenshot({ path: `${OUT}/search-1366.png` });
  await box.press('ArrowDown');
  expect(await box.getAttribute('aria-activedescendant')).not.toBe(id);
  await box.press('Enter');
  await expect(page).toHaveURL(/\/(ho-so-vay|customer)\//);
});

for (const [w, h] of [[1366, 768], [1920, 1080]] as const) {
  test(`panel AI ${w}: ${w < 1440 ? 'phủ lên, không đẩy nội dung' : 'đẩy nội dung'}; không tràn ngang`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await loginAs(page, 'qhkh');
    await page.goto('/viec-cua-toi');
    await page.waitForLoadState('networkidle');
    const width = () => page.locator('main').evaluate((m) => m.getBoundingClientRect().width);
    const before = await width();
    await page.getByRole('button', { name: /Trợ lý|Hỏi/ }).first().click();
    await page.waitForTimeout(500);
    const after = await width();
    if (w < 1440) expect(after).toBe(before); else expect(after).toBeLessThan(before);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(ov).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${OUT}/aipanel-${w}.png` });
  });
}

test('trang lỗi hồ sơ có đúng 1 h1; thanh bên cao đủ màn khi tải', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await loginAs(page, 'qhkh');
  await page.goto('/ho-so-vay/00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('alert').first()).toBeVisible();
  expect(await page.locator('h1').count()).toBe(1);
  await page.screenshot({ path: `${OUT}/loan-error-1366.png` });
  // Khung tải: chậm /me để thấy khung chờ, thanh bên phải cao bằng màn hình.
  await page.route('**/api/v1/me*', async (r) => { await new Promise((s) => setTimeout(s, 3000)); await r.continue(); });
  await page.goto('/viec-cua-toi');
  const side = page.getByTestId('shell-loading').locator('> :first-child');
  await expect(side).toBeVisible();
  const h = await side.evaluate((e) => e.getBoundingClientRect().height);
  console.log(`SIDEBAR-LOADING h=${h}`);
  expect(h).toBeGreaterThanOrEqual(760);
  await page.screenshot({ path: `${OUT}/loading-1366.png` });
});
