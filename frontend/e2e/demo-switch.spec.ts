import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

/** Số bản ghi kiểm toán DEMO_ACCOUNT_SWITCH, đọc thẳng DB của stack. */
function switchAuditCount(): number {
  const out = execFileSync('docker', ['exec', 'bank-ai-workbench-postgres-1', 'psql', '-U', 'postgres', '-d', 'bank_ai', '-Atc',
    "select count(*) from audit.audit_event where action='DEMO_ACCOUNT_SWITCH'"], { encoding: 'utf8' });
  return Number(out.trim());
}

test.describe('chế độ demo đổi tài khoản', () => {
  test('Quản trị đổi qua từng vai rồi quay về; có nhật ký kiểm toán', async ({ page }) => {
    test.setTimeout(180_000);
    const before = switchAuditCount();
    await loginAs(page, 'quantri');
    const switcher = page.getByTestId('demo-switcher');
    await expect(switcher).toBeVisible();
    await switcher.click();
    const options = page.getByTestId('demo-option');
    await expect(options.first()).toBeVisible();
    const total = await options.count();
    expect(total).toBeGreaterThanOrEqual(8);
    const labels = await options.allTextContents();
    expect(labels.every((t) => t.includes('@example.local') && t.split(' · ').length === 3)).toBe(true);
    expect(labels.some((t) => t.includes('admin@example.local'))).toBe(false);
    await page.keyboard.press('Escape');

    for (let i = 0; i < total; i++) {
      if (i > 0) {
        await expect(page.getByTestId('demo-switcher')).toBeVisible();
      }
      // Từ phiên demo, Quản trị không còn danh sách; quay về rồi chọn tiếp.
      await page.getByTestId('demo-switcher').click();
      const labelsNow = await page.getByTestId('demo-option').allTextContents();
      const email = labelsNow[i].split(' · ')[2];
      await page.getByTestId('demo-option').nth(i).click();
      await expect(page.getByTestId('demo-banner')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('demo-banner')).toContainText('Đang demo với vai');
      await expect(page.getByTestId('demo-banner')).toContainText(email);
      await expect(page.getByTestId('demo-switcher')).toHaveCount(0);
      await page.getByTestId('demo-exit').click();
      await expect(page.getByTestId('demo-banner')).toHaveCount(0);
      await expect(page.getByTestId('demo-switcher')).toBeVisible({ timeout: 30_000 });
    }
    expect(switchAuditCount()).toBe(before + total);
  });
});
