import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { appraiserSubmitsToRisk, as, createProposal, httdChecksAndTransfers } from './flow-helpers';

// L01/L02: HTTD trả lại QHKH từ bước Kiểm tra, QHKH thấy lý do. L03: Tuân thủ có việc + thông báo ở bước Ý kiến Rủi ro.
// Nhánh giữ hồ sơ nghi gian lận và yêu cầu giải trình (Q-N).
test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

async function actWithReason(page: import('@playwright/test').Page, button: string, reason: string, confirm: string) {
  await page.getByRole('button', { name: button, exact: true }).click();
  await page.locator('#action-text').fill(reason);
  await page.getByRole('button', { name: confirm, exact: true }).click();
}

test('L01/L02: HTTD trả lại QHKH ở bước Kiểm tra kèm lý do; QHKH thấy đúng lý do trên hồ sơ và thông báo', async ({ page }) => {
  test.setTimeout(300_000);
  const id = await createProposal(page, 'cb1');
  await as(page, 'httd');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Trả lại QHKH', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Trả lại', exact: true })).toBeDisabled(); // bắt buộc lý do
  await page.locator('#action-text').fill('Thiếu chữ ký người đại diện trên đề xuất.');
  await page.getByRole('button', { name: 'Trả lại', exact: true }).click();
  await as(page, 'qhkh');
  await page.goto(`/ho-so-vay/${id}`);
  await expect(page.getByText('Thiếu chữ ký người đại diện trên đề xuất.').first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Thông báo' }).click();
  await expect(page.getByTestId('notification-item').filter({ hasText: 'Thiếu chữ ký người đại diện' }).first()).toBeVisible();
});

test('L03 + giữ hồ sơ nghi gian lận + yêu cầu giải trình: Tuân thủ có việc, được báo, việc đóng khi ghi ý kiến', async ({ page }) => {
  test.setTimeout(420_000);
  const id = await createProposal(page, 'cb2');
  await httdChecksAndTransfers(page, id, 'cb2');
  await appraiserSubmitsToRisk(page, id, 'cb2');

  await as(page, 'tuanthu');
  await page.goto('/viec-cua-toi');
  const row = page.locator(`a[href="/ho-so-vay/${id}"]`);
  await expect(row.first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Thông báo' }).click();
  await expect(page.getByTestId('notification-item').filter({ hasText: 'Cần ý kiến Tuân thủ' }).first()).toBeVisible();

  await page.goto(`/ho-so-vay/${id}`);
  await actWithReason(page, 'Giữ hồ sơ nghi gian lận', 'Chữ ký trên hợp đồng không khớp mẫu lưu.', 'Giữ hồ sơ');
  await expect(page.getByText('Tạm dừng nghi gian lận').first()).toBeVisible({ timeout: 30_000 });
  await actWithReason(page, 'Đóng xử lý nghi gian lận', 'Đã đối chiếu, chữ ký hợp lệ.', 'Đóng xử lý');
  await expect(page.getByRole('button', { name: 'Ghi ý kiến Tuân thủ' })).toBeVisible({ timeout: 30_000 });

  await actWithReason(page, 'Yêu cầu giải trình', 'Giải trình nguồn tiền trả nợ quý 2.', 'Gửi yêu cầu');
  await as(page, 'httd');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Ghi nhận đã giải trình' }).click();
  await expect(page.getByText('Chờ ý kiến rủi ro').first()).toBeVisible({ timeout: 30_000 });

  await as(page, 'tuanthu');
  await page.goto(`/ho-so-vay/${id}`);
  await actWithReason(page, 'Ghi ý kiến Tuân thủ', 'Không phát hiện vấn đề.', 'Ghi ý kiến');
  await expect(page.getByRole('button', { name: 'Ghi ý kiến Tuân thủ' })).toHaveCount(0);
  await page.goto('/viec-cua-toi');
  await expect(page.locator(`a[href="/ho-so-vay/${id}"]`)).toHaveCount(0); // việc đóng khi đã ghi ý kiến
});
