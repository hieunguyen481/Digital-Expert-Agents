import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { as, createProposal, httdChecksAndTransfers, shot } from './flow-helpers';

// X3 + QA3-01: trưởng phòng chuyển người xử lý trong phòng mình (Q-D2); người không còn giữ bước thấy nút khóa kèm lý do.
test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('trưởng phòng chuyển bước Thẩm định sang đồng nghiệp cùng phòng; người cũ bị khóa thao tác', async ({ page }) => {
  test.setTimeout(240_000);
  const id = await createProposal(page, 'reassign');
  await httdChecksAndTransfers(page, id, 'reassign');

  await as(page, 'truongphong');
  await page.goto(`/ho-so-vay/${id}`);
  const box = page.getByTestId('reassign');
  await expect(box).toBeVisible();
  await box.getByRole('button', { name: 'Chuyển người xử lý' }).click();
  await page.getByLabel('Người nhận').click();
  await page.locator('.ant-select-item-option').filter({ hasText: 'Thẩm định Mẫu 2' }).click();
  await page.locator('#reassign-reason').fill('Cân đối khối lượng công việc trong phòng.');
  await page.getByRole('button', { name: 'Chuyển', exact: true }).click();
  await expect(page.locator('.ant-modal')).toHaveCount(0);
  await shot(page, 'reassign', 'da-chuyen');

  // Người mới giữ bước: không còn thông báo "không giữ bước".
  await as(page, 'tdinh2');
  await page.goto(`/ho-so-vay/${id}`);
  await expect(page.getByText('Chuyên viên Thẩm định Mẫu 2').first()).toBeVisible();
  await expect(page.getByTestId('not-holder-notice')).toHaveCount(0);

  // QA3-01: người cũ vẫn đọc được hồ sơ nhưng không còn nút nào để thao tác trên bước đã chuyển đi.
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${id}`);
  await expect(page.getByText('Chuyên viên Thẩm định Mẫu 2').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trình Rủi ro' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quyết định', exact: true })).toHaveCount(0);
});
