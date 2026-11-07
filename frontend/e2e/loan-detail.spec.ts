import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

// Trang 02b (lát 10, 10b). Dữ liệu là dữ liệu seed (R__seed_sme_batch1.sql). Các test dùng chung hồ sơ seed nên nằm cùng
// một file, chạy tuần tự, và nạp lại seed khi xong (E2E_RESEED_CMD) vì Tờ trình tự lưu đổi dữ liệu.
const VINANOVA = '/ho-so-vay/75000000-0000-4000-8000-000000000001';

test.describe.configure({ mode: 'serial' });

test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('tdinh: DSCR 1,34 (khai báo) và ≈1,76 (tính lại), mỗi số có nguồn', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(VINANOVA);
  const declared = page.getByTestId('metric-dscr-DECLARED');
  const recomputed = page.getByTestId('metric-dscr-RECOMPUTED');
  await expect(declared).toContainText('1,34');
  await expect(recomputed).toContainText('≈ 1,76');
  for (const cell of [declared, recomputed]) {
    await expect(cell.getByTestId('metric-source')).toContainText('Nguồn:');
    await expect(cell.getByTestId('metric-source').getByRole('link')).toBeVisible();
  }
  await expect(page.getByTestId('metric-row-dscr')).toContainText('≥');
});

test('mọi ô chỉ số trên 02b đều có nguồn', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(VINANOVA);
  const cells = page.locator('[data-testid^="metric-"][data-testid$="-DECLARED"], [data-testid^="metric-"][data-testid$="-RECOMPUTED"]');
  await expect(cells.first()).toBeVisible();
  const n = await cells.count();
  expect(n).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < n; i++) {
    const cell = cells.nth(i);
    await expect(cell.getByTestId('metric-source')).toContainText(/Nguồn: .+/);
    await expect(cell.getByTestId('metric-source').getByRole('link')).toHaveCount(1);
  }
});

test('tdinh: Tờ trình tự lưu và còn nguyên sau khi tải lại; nút hành động lát 11 bị khóa', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(VINANOVA);
  const box = page.locator('#memo-4');
  await expect(box).toBeVisible();
  const text = `Nhận định e2e ${Date.now()}`;
  await box.fill(text);
  await expect(page.getByTestId('memo-save-status')).toContainText('Đã tự lưu');
  await page.reload();
  await expect(page.locator('#memo-4')).toHaveValue(text);
  await expect(page.getByRole('button', { name: /chưa hỗ trợ/ })).toBeDisabled();
});

test('ruiro: hồ sơ còn ở Thẩm định nên ngoài phạm vi, không thấy chỉ số lẫn bản nháp Tờ trình', async ({ page }) => {
  await loginAs(page, 'ruiro');
  await page.goto(VINANOVA);
  await expect(page.getByText('ngoài phạm vi được xem')).toBeVisible();
  await expect(page.locator('#memo-4')).toHaveCount(0);
  await expect(page.getByTestId('metric-dscr-DECLARED')).toHaveCount(0);
});
