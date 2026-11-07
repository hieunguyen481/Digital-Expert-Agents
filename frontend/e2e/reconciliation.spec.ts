import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

// Trang 05 (lát 9). Dữ liệu tài liệu là dữ liệu seed (R__seed_sme_batch1.sql). Các test dùng chung hồ sơ seed nên nằm
// cùng một file, chạy tuần tự, và nạp lại seed khi xong (E2E_RESEED_CMD) vì chốt nguồn / chuyển bước đổi dữ liệu.
const VINANOVA = '/doi-chieu/75000000-0000-4000-8000-000000000001'; // Thẩm định đang giữ, có mâu thuẫn DSCR
const CHECKING = '/doi-chieu/75000000-0000-4000-8000-000000000009'; // HTTD đang giữ bước Hậu kiểm

test.describe.configure({ mode: 'serial' });

test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('tdinh: bấm trường tới đúng vùng tô và bấm vùng tô tới đúng trường (hai chiều)', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(VINANOVA);
  await expect(page.getByText('dữ liệu seed', { exact: false }).first()).toBeVisible();
  const frame = page.getByTestId('page-frame');
  await expect(frame).toBeVisible();
  const regions = frame.locator('[data-testid^="region-"]');
  expect(await regions.count()).toBeGreaterThan(1);

  // Vùng tô -> trường
  const first = regions.nth(0);
  const firstName = (await first.getAttribute('aria-label'))!.replace('Vùng tô: ', '');
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('field-card')).toContainText(firstName);

  // Trường -> vùng tô (qua liên kết "n trường khác trên trang này")
  await page.getByRole('button', { name: /trường khác trên trang này/ }).click();
  const row = page.locator('[data-testid^="field-row-"]').first();
  const rowId = (await row.getAttribute('data-testid'))!.replace('field-row-', '');
  const rowName = (await row.locator('span').first().textContent())!;
  await row.click();
  await expect(page.getByTestId(`region-${rowId}`)).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('field-card')).toContainText(rowName);
});

test('tdinh: mâu thuẫn DSCR hiện cả hai nguồn, chốt nguồn có lý do và ghi nhật ký', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(VINANOVA);
  const conflict = page.getByTestId('conflict-dscr');
  await expect(conflict).toContainText('1,34');
  await expect(conflict).toContainText('1,76');
  await expect(conflict).toContainText('Chưa chốt');

  // Xem vùng tô của nguồn trong tài liệu
  await conflict.getByRole('button', { name: 'Xem vùng tô trong tài liệu' }).first().click();
  await expect(page.locator('[aria-pressed="true"][data-testid^="region-"]')).toHaveCount(1);

  const reason = `Dùng EBITDA đã kiểm toán (e2e ${Date.now()})`;
  const save = conflict.getByRole('button', { name: 'Chốt nguồn này' });
  await expect(save).toBeDisabled();
  await conflict.getByText('1,76').first().click();
  await conflict.getByLabel('Lý do chốt nguồn').fill(reason);
  await save.click();
  await expect(conflict).toContainText('Đã chốt nguồn');
  const log = page.getByRole('table', { name: 'Nhật ký chốt nguồn' });
  await expect(log).toContainText(reason);
  await expect(log).toContainText('1,76');
  await page.reload();
  await expect(page.getByRole('table', { name: 'Nhật ký chốt nguồn' })).toContainText(reason);
});

test('httd: chuyển Thẩm định khóa đến khi checklist đủ, rồi đi qua workflow', async ({ page }) => {
  await loginAs(page, 'httd');
  await page.goto(CHECKING);
  const bar = page.getByTestId('transfer-bar');
  await expect(bar).toContainText('Chưa thể chuyển Thẩm định');
  const go = bar.getByRole('button', { name: 'Chuyển Thẩm định' });
  await expect(go).toBeDisabled();

  // Không đạt cần lý do (>= 5 ký tự)
  await page.getByTestId('item-SME-01-CREDIT-REQUEST').getByRole('button', { name: 'Không đạt' }).click();
  await expect(page.getByRole('button', { name: 'Ghi nhận không đạt' })).toBeDisabled();
  await page.getByRole('button', { name: 'Hủy' }).click();

  // Đạt từng mục còn chờ hậu kiểm
  const pass = page.getByRole('button', { name: 'Đạt', exact: true });
  for (let left = await pass.count(); left > 0; left--) {
    const done = page.waitForResponse((r) => r.url().includes('/check') && r.request().method() === 'POST');
    await pass.first().click();
    expect((await done).status()).toBe(200);
    await expect(pass).toHaveCount(left - 1);
  }
  await expect(go).toBeEnabled();
  await expect(page.getByRole('table', { name: 'Nhật ký hậu kiểm checklist' })).toBeVisible();

  await go.click();
  await expect(page.getByText('APPRAISAL')).toBeVisible();
  await expect(page.getByTestId('transfer-bar')).toHaveCount(0);
});

for (const role of ['qhkh', 'kiemtoan', 'quantri'] as const) {
  test(`${role}: không vào được trang đối chiếu`, async ({ page }) => {
    await loginAs(page, role);
    await page.goto(CHECKING);
    await expect(page.getByRole('heading', { name: /Không có quyền/ }).first()).toBeVisible();
    await expect(page.getByTestId('transfer-bar')).toHaveCount(0);
  });
}
