import { execSync } from 'node:child_process';
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

// Mekong Flex: từ nháp đến gửi HTTD. Cùng file với các test trên để chạy tuần tự (cùng một hồ sơ).
// Gửi đổi trạng thái hồ sơ nên test phải trả seed về như cũ: đặt E2E_RESEED_CMD là lệnh nạp lại seed
// (vd. `docker compose -p <dự án> ... run --rm --no-deps db-seed`); seed R__ chạy lại được và đưa Mekong về nháp.
// Không đặt thì phải tự nạp seed trước lần chạy sau.

test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('qhkh: Mekong đi từ nháp đến gửi HTTD, nút gửi khóa đến khi đủ điều kiện', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto(MEKONG);
  await expect(page.getByText('Đề xuất đã gửi; nội dung chỉ để xem.'), 'Mekong đã gửi từ lần trước: nạp lại seed').toHaveCount(0);

  const submitBtn = page.getByRole('button', { name: 'Gửi Hỗ trợ tín dụng' });
  const conditions = page.getByRole('table', { name: 'Bảng điều kiện gửi' });

  // 1. Chưa đủ điều kiện: nút gửi khóa, kèm lý do.
  await page.getByRole('menuitem', { name: 'Tóm tắt và gửi' }).click();
  await expect(conditions).toBeVisible();
  await expect(submitBtn).toHaveAttribute('aria-disabled', 'true');
  await expect(submitBtn).toHaveAttribute('title', /Chưa đủ điều kiện/);

  // 2. Hồ sơ tài liệu: CIC mô phỏng và ngoại lệ cho từng mục thiếu.
  await page.getByRole('menuitem', { name: 'Hồ sơ tài liệu' }).click();
  const cic = page.getByRole('region', { name: 'Tra cứu CIC' });
  await cic.getByRole('button', { name: 'Tra cứu CIC mới' }).click();
  await expect(cic.getByText('Dữ liệu mô phỏng')).toBeVisible();
  for (const code of ['SME-09-QUARTERLY-FS', 'SME-15-SALES-CONTRACTS']) {
    const row = page.getByTestId(`doc-${code}`);
    await row.getByRole('button', { name: 'Đề xuất ngoại lệ', exact: true }).click();
    await row.getByLabel(`Lý do ngoại lệ: ${code}`).fill('Khách hàng cam kết bổ sung trong 3 ngày làm việc.');
    await row.getByRole('button', { name: 'Gửi đề xuất ngoại lệ', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Rút đề xuất ngoại lệ' })).toBeVisible();
  }

  // 3. Nhóm liên quan và thuê đất: người quyết định, không có giá trị tự điền.
  await page.getByRole('menuitem', { name: 'Nhóm liên quan và tài sản' }).click();
  await page.getByRole('button', { name: 'Xác nhận thuộc nhóm' }).click();
  await expect(page.getByText('Thuộc nhóm', { exact: true })).toBeVisible();
  await page.getByLabel(/Cách trả tiền thuê đất/).getByText('Trả tiền thuê đất hằng năm').click();
  await expect(page.getByText(/Tổng cấp tín dụng của nhóm/)).toBeVisible();

  // 4. Đủ điều kiện: bảng đạt hết, nút mở, gửi thành công.
  await page.getByRole('menuitem', { name: 'Tóm tắt và gửi' }).click();
  await expect(conditions.getByText('Chưa đạt')).toHaveCount(0);
  await expect(submitBtn).toHaveAttribute('aria-disabled', 'false');
  await submitBtn.click();
  await expect(page.getByText('Đã gửi đề xuất sang Hỗ trợ tín dụng.')).toBeVisible();

  // 5. Sau khi gửi hồ sơ chuyển sang chỉ xem.
  await page.reload();
  await expect(page.getByText('Đề xuất đã gửi; nội dung chỉ để xem.')).toBeVisible();
});
