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

test('qhkh: Mekong tra CIC mô phỏng, kết quả có nhãn và hạn hiệu lực', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto(MEKONG);
  await page.getByRole('menuitem', { name: 'Hồ sơ tài liệu' }).click();
  const cic = page.getByRole('region', { name: 'Tra cứu CIC' });
  await expect(cic).toContainText('Văn bản đồng ý: đã xác nhận');
  await cic.getByRole('button', { name: 'Tra cứu CIC mới' }).click();
  await expect(cic).toContainText('hiệu lực đến hết');
  await expect(cic.getByText('Dữ liệu mô phỏng')).toBeVisible();
  await expect(page.getByTestId('doc-SME-09-QUARTERLY-FS')).toContainText('Thiếu');
});

test('qhkh: nút tra CIC bị khóa kèm lý do khi văn bản đồng ý quá hạn', async ({ page }) => {
  await loginAs(page, 'qhkh');
  // Giả lập phản hồi API của cùng hợp đồng để kiểm tra riêng hành vi khóa nút; dữ liệu seed không đổi.
  await page.route('**/loan-applications/*/cic', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.consent = { ...body.consent, code: 'EXPIRED', usable: false, lock_reason: 'Chưa tra cứu CIC được: văn bản đồng ý tra cứu CIC đã quá hạn ghi trên văn bản. Cần văn bản đồng ý mới của khách (§6.1).' };
    body.lookup_locked = true;
    body.lock_reason = body.consent.lock_reason;
    await route.fulfill({ response: res, json: body });
  });
  await page.goto(MEKONG);
  await page.getByRole('menuitem', { name: 'Hồ sơ tài liệu' }).click();
  const btn = page.getByRole('button', { name: 'Tra cứu CIC mới' });
  await expect(btn).toHaveAttribute('aria-disabled', 'true');
  await expect(btn).toHaveAttribute('title', /quá hạn ghi trên văn bản/);
});
