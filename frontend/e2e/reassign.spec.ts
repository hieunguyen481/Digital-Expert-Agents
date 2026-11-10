import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { as, createProposal, httdChecksAndTransfers, shot } from './flow-helpers';

// X3: trưởng phòng chuyển người xử lý trong phòng mình (Q-D2); người nhận giữ bước, người cũ mất quyền.
test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('trưởng phòng chuyển bước Thẩm định sang đồng nghiệp cùng phòng; người cũ mất quyền', async ({ page }) => {
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

  // Người cũ không còn giữ bước nên hồ sơ ra ngoài phạm vi xem của họ: trang không tìm thấy, không có nút thao tác.
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${id}`);
  await expect(page.getByText('Không tìm thấy nội dung')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trình Rủi ro' })).toHaveCount(0);
});
