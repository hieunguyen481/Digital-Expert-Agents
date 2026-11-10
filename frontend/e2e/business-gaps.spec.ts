import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { as, createProposal, httdChecksAndTransfers, shot } from './flow-helpers';

// R-01/R-02/R-04: gia hạn hạn bổ sung, rút hồ sơ, thông báo trên chuông, nhật ký kiểm toán, tra cứu chính sách.
test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

let loanId = '';

test('R-02: Thẩm định trả lại QHKH thì QHKH thấy thông báo trên chuông, bấm mở đúng hồ sơ', async ({ page }) => {
  test.setTimeout(300_000);
  loanId = await createProposal(page, 'g1');
  await httdChecksAndTransfers(page, loanId, 'g1');
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${loanId}`);
  await page.getByRole('button', { name: 'Trả lại QHKH' }).click();
  await page.locator('#action-text').fill('Cần sửa nguồn trả nợ trong đề xuất.');
  await page.getByRole('button', { name: 'Trả lại', exact: true }).click();
  await expect(page.getByText('Đã trả QHKH').first().or(page.getByText(/trả.*QHKH/i).first())).toBeVisible({ timeout: 30_000 });

  await as(page, 'qhkh');
  await page.goto('/');
  await expect(page.getByTestId('bell-dot')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Thông báo' }).click();
  const item = page.getByTestId('notification-item').filter({ hasText: /trả lại|sửa/i }).first();
  await expect(item).toBeVisible();
  await shot(page, 'g1', 'chuong-thong-bao');
  await item.click();
  await expect(page).toHaveURL(new RegExp(`/ho-so-vay/${loanId}`));
});

test('R-01: QHKH gia hạn hạn bổ sung đúng 1 lần, chưa quá hạn thì không rút loại quá hạn, khách rút thì được', async ({ page }) => {
  test.setTimeout(120_000);
  await as(page, 'qhkh');
  await page.goto(`/ho-so-vay/${loanId}`);
  await expect(page.getByRole('button', { name: 'Rút hồ sơ quá hạn' })).toBeDisabled();
  await page.getByRole('button', { name: /Gia hạn hạn bổ sung/ }).click();
  await expect(page.getByRole('button', { name: 'Gia hạn', exact: true })).toBeDisabled(); // thiếu lý do thì khóa
  await page.locator('#action-text').fill('Khách cần thêm thời gian lấy báo cáo kiểm toán.');
  await page.getByRole('button', { name: 'Gia hạn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đã gia hạn 1 lần' })).toBeDisabled({ timeout: 30_000 });
  await shot(page, 'g1', 'da-gia-han');
  await page.getByRole('button', { name: 'Khách rút hồ sơ' }).click();
  await page.locator('#action-text').fill('Khách đề nghị rút hồ sơ.');
  await page.getByRole('button', { name: 'Rút hồ sơ', exact: true }).click();
  await expect(page.getByText('Đã rút').first()).toBeVisible({ timeout: 30_000 });
});

test('R-04: Kiểm toán lọc nhật ký theo hành động; Tra cứu chính sách tìm điều khoản; mục chưa có hiện toast', async ({ page }) => {
  test.setTimeout(120_000);
  await as(page, 'kiemtoan');
  await page.goto('/nhat-ky-kiem-toan');
  await page.getByLabel('Hành động').fill('WORKFLOW_EXTEND_DEADLINE');
  await page.getByRole('button', { name: 'Lọc' }).click();
  const table = page.getByRole('table', { name: 'Nhật ký kiểm toán' });
  await expect(table.getByText('WORKFLOW_EXTEND_DEADLINE').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'g1', 'nhat-ky');

  await as(page, 'qhkh');
  await page.goto('/tra-cuu-chinh-sach');
  await expect(page.getByRole('table', { name: 'Danh sách chính sách' })).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('Tìm điều khoản').fill('DSCR');
  await page.getByRole('button', { name: 'Tìm' }).click();
  await expect(page.getByTestId('policy-results')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Khách hàng SME' }).click();
  await expect(page.getByText('Khách hàng SME: sẽ có ở đợt sau')).toBeVisible();

  await as(page, 'quantri');
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Nhật ký/ })).toHaveCount(0);
});
