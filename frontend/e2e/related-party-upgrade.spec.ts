import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { as, createProposal, httdChecksAndTransfers } from './flow-helpers';

// M04 / F10: Thẩm định rà lại nhóm liên quan của hồ sơ đang giữ; xác nhận thêm bên thuộc nhóm làm tổng vượt cấp
// đã trình thì hiện "Nâng cấp phê duyệt" và đi trọn tới khi cấp được nâng.
test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('thẩm định xác nhận bên liên quan làm tổng vượt cấp 2, nâng cấp phê duyệt lên cấp 3', async ({ page }) => {
  test.setTimeout(280_000);
  // 90 tỷ: cấp 2 (đến 100 tỷ); cộng 15,2 tỷ dư nợ của bên liên quan thì vượt 100 tỷ.
  const id = await createProposal(page, 'm04', 'Mekong Flex', 90);
  await httdChecksAndTransfers(page, id, 'm04');

  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${id}`);
  const review = page.getByTestId('related-review');
  await expect(review).toBeVisible();
  await expect(review.getByTestId('review-required-tier')).toHaveText('cấp 2');
  await expect(page.getByRole('button', { name: /Nâng cấp phê duyệt/ })).toHaveCount(0);

  await review.getByRole('button', { name: 'Xác nhận thuộc nhóm' }).click();
  await expect(review.getByTestId('review-required-tier')).toHaveText('cấp 3');
  const upgrade = page.getByRole('button', { name: /Nâng cấp phê duyệt \(cấp 2 → 3\)/ });
  await expect(upgrade).toBeVisible();

  await upgrade.click();
  await page.locator('#action-text').fill('Tổng cấp tín dụng của nhóm vượt 100 tỷ sau khi xác nhận bên liên quan.');
  await page.getByRole('button', { name: 'Nâng cấp', exact: true }).click();
  await expect(page.getByRole('button', { name: /Nâng cấp phê duyệt/ })).toHaveCount(0);
});
