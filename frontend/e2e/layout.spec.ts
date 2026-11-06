import { expect, test } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

const ROLES: RoleKey[] = ['qhkh', 'tdinh', 'pheduyet', 'kiemtoan'];
const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

for (const role of ROLES) {
  test(`${role}: không cuộn ngang, không lỗi console, ≤ 30 phần tử bấm được`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      // Font Google và ảnh ngoài không thuộc phạm vi kiểm tra.
      if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED)/.test(m.text() + m.location().url)) {
        errors.push(m.text());
      }
    });
    await loginAs(page, role);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    for (const size of SIZES) {
      await page.setViewportSize(size);
      for (const aiOpen of [false, true]) {
        const panel = page.locator('aside[aria-label="Trợ lý AI"]');
        const isOpen = (await panel.getAttribute('data-open')) === 'true';
        if (isOpen !== aiOpen) await page.keyboard.press('Control+j');
        await expect(panel).toHaveAttribute('data-open', String(aiOpen));
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${role} ${size.width}x${size.height} AI=${aiOpen}`).toBeLessThanOrEqual(0);
      }
    }

    // Màn đầu 1440×900, AI đóng, chưa cuộn (design-system §9).
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('Control+j');
    await expect(page.locator('aside[aria-label="Trợ lý AI"]')).toHaveAttribute('data-open', 'false');
    const clickable = await page.evaluate(() => {
      const root = document.querySelector('#main-content')!;
      return [...root.querySelectorAll('a, button, select, input, textarea, summary')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
      }).length;
    });
    expect(clickable).toBeLessThanOrEqual(30);
    expect(errors).toEqual([]);
  });
}

test('Ctrl+J mở/đóng, Esc đóng và trả focus', async ({ page }) => {
  await loginAs(page, 'tdinh');
  const panel = page.locator('aside[aria-label="Trợ lý AI"]');
  await page.keyboard.press('Control+j');
  await expect(panel).toHaveAttribute('data-open', 'true');
  await page.keyboard.press('Control+j');
  await expect(panel).toHaveAttribute('data-open', 'false');

  const opener = page.getByRole('button', { name: 'Hỏi AI' }).first();
  await opener.focus();
  await opener.click();
  await expect(panel).toHaveAttribute('data-open', 'true');
  await expect(panel.getByRole('button', { name: 'Đóng Trợ lý AI' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveAttribute('data-open', 'false');
  await expect(opener).toBeFocused();
});
