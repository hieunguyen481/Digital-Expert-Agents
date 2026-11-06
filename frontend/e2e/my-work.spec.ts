import { expect, test } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

const CASES: Array<{ role: RoleKey; title: string; badge: string | null }> = [
  { role: 'qhkh', title: 'Hồ sơ của tôi', badge: '4' },
  { role: 'httd', title: 'Hồ sơ chờ kiểm tra', badge: '3' },
  { role: 'tdinh', title: 'Việc của tôi', badge: '3' },
  { role: 'ruiro', title: 'Hồ sơ chờ ý kiến', badge: '2' },
  { role: 'pheduyet', title: 'Hồ sơ chờ phê duyệt', badge: '3' },
  { role: 'kiemtoan', title: 'Hồ sơ vay (chỉ đọc)', badge: null },
];

for (const c of CASES) {
  test(`${c.role}: tiêu đề và badge từ /work-items thật`, async ({ page }) => {
    await loginAs(page, c.role);
    await expect(page).toHaveURL(/\/viec-cua-toi/);
    await expect(page.getByRole('heading', { level: 1, name: c.title })).toBeVisible();
    const badge = page.getByTestId('rail-badge');
    if (c.badge) await expect(badge).toHaveText(c.badge);
    else await expect(badge).toHaveCount(0);
  });
}

test('qhkh: lọc "Chờ bổ sung" chỉ còn HSV-2026-00196', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.getByText('Chờ bổ sung', { exact: true }).click();
  await expect(page).toHaveURL(/#filter=bosung/);
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('HSV-2026-00196');
});

test('quantri: thấy NoAccess, không có Trợ lý AI', async ({ page }) => {
  await loginAs(page, 'quantri');
  await page.goto('/viec-cua-toi');
  await expect(page.getByRole('alert')).toContainText('Không có quyền');
  await expect(page.getByRole('button', { name: 'Trợ lý AI' })).toHaveCount(0);
  await expect(page.getByLabel('Trợ lý AI', { exact: true })).toHaveCount(0);
});
