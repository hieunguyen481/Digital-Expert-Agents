import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  appraiserSubmitsToRisk, as, createProposal, httdChecksAndTransfers, opinionsAndSubmitToApproval, shot,
} from './flow-helpers';

// QA3-05: hồ sơ trên 20 tỷ đi trọn qua giao diện (tải BCTC kiểm toán vào đúng mục) tới quyết định của cấp 2;
// Q-P: hồ sơ trên 100 tỷ hiện đúng trạng thái chờ Hội đồng, không kẹt im lặng.
test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('hồ sơ 25 tỷ: tải BCTC kiểm toán, đi trọn tới quyết định của cấp 2', async ({ page }) => {
  test.setTimeout(280_000);
  const id = await createProposal(page, 't2', 'Mekong Flex', 25);
  await httdChecksAndTransfers(page, id, 't2');
  await appraiserSubmitsToRisk(page, id, 't2');
  await opinionsAndSubmitToApproval(page, id, 't2');
  // Bước Phê duyệt giao cho cấp 2 ít việc đang mở nhất; mở bằng người được giao.
  await as(page, 'pheduyet');
  await page.goto(`/ho-so-vay/${id}`);
  await page.waitForLoadState('networkidle');
  if ((await page.getByTestId('actions-panel').count()) === 0) {
    await as(page, 'pheduyet2');
    await page.goto(`/ho-so-vay/${id}`);
    await expect(page.getByTestId('actions-panel')).toBeVisible();
  }
  await page.getByRole('button', { name: 'Quyết định', exact: true }).click();
  const rows = page.getByTestId('exception-row');
  await expect(rows.first()).toBeVisible();
  for (let i = 0; i < (await rows.count()); i++) {
    await rows.nth(i).getByText('Chấp thuận').click();
    await rows.nth(i).getByRole('textbox').fill('Chấp thuận ngoại lệ theo cam kết bổ sung của khách.');
  }
  await page.locator('#action-text').fill('Đủ điều kiện, phê duyệt theo đề nghị.');
  await page.getByRole('button', { name: 'Ghi quyết định' }).click();
  await expect(page.getByTestId('decision-confirm')).toContainText('Không hoàn tác được');
  await page.getByRole('button', { name: /^Xác nhận/ }).click();
  await expect(page.getByText(/Đã phê duyệt|Phê duyệt có điều kiện/).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 't2', 'da-quyet-dinh');
});

test('hồ sơ 120 tỷ: sau Rủi ro trình thì chờ phiên Hội đồng (Q-P), không giao cho ai', async ({ page }) => {
  test.setTimeout(280_000);
  const id = await createProposal(page, 't2c', 'Mekong Flex', 120);
  await httdChecksAndTransfers(page, id, 't2c');
  await appraiserSubmitsToRisk(page, id, 't2c');
  await as(page, 'ruiro');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Ghi Ý kiến Rủi ro' }).click();
  await page.locator('#action-text').fill('Rủi ro: chấp nhận được với điều kiện theo dõi dòng tiền hằng quý.');
  await page.getByRole('button', { name: 'Ghi ý kiến', exact: true }).click();
  await as(page, 'tuanthu');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Ghi ý kiến Tuân thủ' }).click();
  await page.locator('#action-text').fill('Tuân thủ: không có cờ vi phạm, KYC và CIC còn hiệu lực.');
  await page.getByRole('button', { name: 'Ghi ý kiến', exact: true }).click();
  await as(page, 'ruiro');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Trình phê duyệt' }).click();
  await expect(page.getByText('Chờ phiên Hội đồng – có ở đợt 2').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 't2c', 'cho-hoi-dong');
  // Không ai có việc trên hồ sơ này: người trình không còn nút hành động nào.
  await expect(page.getByRole('button', { name: 'Trình phê duyệt' })).toHaveCount(0);
});
