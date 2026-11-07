import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers';

const MEKONG = '/de-xuat-vay/75000000-0000-4000-8000-000000000002';
const SEED_PURPOSE = 'Bổ sung vốn lưu động mua giấy cuộn, hạt nhựa PP/PE và mực in cho đơn hàng 2027.';

const purpose = (p: Page) => p.getByLabel('Mục đích vay');

async function setPurpose(p: Page, text: string) {
  const saved = p.waitForResponse((r) => r.request().method() === 'PUT' && r.url().endsWith('/draft'));
  await purpose(p).fill(text);
  expect((await saved).status()).toBe(200);
  await expect(p.getByTestId('save-status')).toContainText('Đã tự lưu nháp');
}

test.describe.configure({ mode: 'serial' });

test('qhkh: nháp Mekong tự lưu rồi khôi phục sau khi tải lại', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto(MEKONG);
  await expect(purpose(page)).toHaveValue(SEED_PURPOSE);
  const edited = `${SEED_PURPOSE} (sửa e2e)`;
  await setPurpose(page, edited);
  await page.reload();
  await expect(purpose(page)).toHaveValue(edited);
  await setPurpose(page, SEED_PURPOSE);
});

test('qhkh: hai tab cùng sửa thì tab sau bị chặn kèm thông báo', async ({ browser }) => {
  const ctx = await browser.newContext();
  const a = await ctx.newPage();
  await loginAs(a, 'qhkh');
  await a.goto(MEKONG);
  await expect(purpose(a)).toHaveValue(SEED_PURPOSE);
  const b = await ctx.newPage();
  await b.goto(MEKONG);
  await expect(purpose(b)).toHaveValue(SEED_PURPOSE);

  await setPurpose(a, `${SEED_PURPOSE} (tab A)`);
  await purpose(b).fill(`${SEED_PURPOSE} (tab B)`);
  await expect(b.getByRole('alert')).toContainText('vừa được lưu ở tab hoặc phiên khác');

  await b.getByRole('button', { name: 'Tải bản mới nhất' }).click();
  await expect(purpose(b)).toHaveValue(`${SEED_PURPOSE} (tab A)`);
  await setPurpose(b, SEED_PURPOSE);
  await ctx.close();
});
