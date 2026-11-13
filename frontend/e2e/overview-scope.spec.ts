import { execSync } from 'node:child_process';
import { expect, test, type Browser } from '@playwright/test';
import { type RoleKey } from './helpers';
import { as, createProposal, httdChecksAndTransfers } from './flow-helpers';

// S01: GET /loan-applications/{id}/overview chỉ nói "đã chuyển" với người từng nhận thông báo của CHÍNH họ;
// người chưa từng giữ hồ sơ nhận "không tìm thấy hoặc ngoài phạm vi" như API chi tiết.
const API = 'http://localhost:8000/api/v1';
test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

async function overview(browser: Browser, role: RoleKey, id: string) {
  const context = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? 3000}` });
  const page = await context.newPage();
  const seen = page.waitForRequest((r) => r.url().startsWith(API) && !!r.headers().authorization);
  await as(page, role);
  await page.goto('/cong-viec');
  const auth = (await seen).headers().authorization;
  const res = await page.request.get(`${API}/loan-applications/${id}/overview`, { headers: { authorization: auth } });
  const body = await res.json();
  await context.close();
  return { status: res.status(), code: body?.error?.code ?? body?.code };
}

test('người từng giữ hồ sơ nhận "đã chuyển"; người chưa từng giữ nhận "không tìm thấy"', async ({ page, browser }) => {
  test.setTimeout(300_000);
  const id = await createProposal(page, 'overview-scope');
  await httdChecksAndTransfers(page, id, 'overview-scope');
  await as(page, 'truongphong');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByTestId('reassign').getByRole('button', { name: 'Chuyển người xử lý' }).click();
  await page.getByLabel('Người nhận').click();
  await page.locator('.ant-select-item-option').filter({ hasText: 'Thẩm định Mẫu 2' }).click();
  await page.locator('#reassign-reason').fill('Cân đối khối lượng công việc trong phòng.');
  await page.getByRole('button', { name: 'Chuyển', exact: true }).click();
  await expect(page.locator('.ant-modal')).toHaveCount(0);

  const old = await overview(browser, 'tdinh', id);
  expect(old.status).toBe(404);
  expect(old.code).toBe('LOAN_REASSIGNED');
  const stranger = await overview(browser, 'pheduyet2', id);
  expect(stranger.status).toBe(404);
  expect(stranger.code).toBe('LOAN_NOT_FOUND');
});
