import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

const TOKEN_URL = '**/protocol/openid-connect/token';

test('401 khi token hết hạn: tự làm mới rồi gửi lại, trang vẫn tải được', async ({ page }) => {
  await loginAs(page, 'tdinh');
  let rejected = false;
  await page.route('**/api/v1/work-items*', async (route) => {
    if (!rejected) {
      rejected = true;
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"expired"}' });
    } else {
      await route.continue();
    }
  });
  const refresh = page.waitForRequest((r) => r.url().includes('/protocol/openid-connect/token') && r.method() === 'POST');
  const retried = page.waitForResponse((r) => r.url().includes('/work-items') && r.status() === 200);
  await page.getByText(/^Quá hạn/).click();
  await refresh;
  await retried;
  await expect(page.getByRole('heading', { level: 1, name: 'Việc của tôi' })).toBeVisible();
});

test('phiên Keycloak đã mất: chuyển về /login giữ returnTo', async ({ page, context }) => {
  await loginAs(page, 'tdinh');
  await context.clearCookies();
  await page.route(TOKEN_URL, (route) =>
    route.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"invalid_grant"}' }),
  );
  await page.route('**/api/v1/work-items*', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"expired"}' }),
  );
  await page.getByText(/^Quá hạn/).click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fviec-cua-toi/);
});
