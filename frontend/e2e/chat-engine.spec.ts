import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

const REQUEST =
  'Phân tích sâu hồ sơ vay VinaNova: thẩm định tín dụng, kiểm tra tuân thủ chính sách và đề xuất hạn mức';

async function pickVinaNova(page: import('@playwright/test').Page) {
  await page.goto('/chat');
  const box = page.getByPlaceholder(/Hỏi SH-AI/);
  await box.fill('/VinaNova');
  await page.getByText(/VinaNova/i).first().click();
}

test('thẩm định viên: yêu cầu phức tạp → multi-agent thật → chờ người xác nhận', async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, 'tdinh');
  await pickVinaNova(page);
  const box = page.getByPlaceholder(/Hỏi SH-AI/);
  await box.fill(REQUEST);
  await page.getByRole('button', { name: 'Gửi' }).click();

  const panel = page.locator('#main-content').getByTestId('engine-panel');
  await expect(panel).toBeVisible({ timeout: 120_000 });
  const flow = page.locator('#main-content').getByTestId('engine-flow');
  for (const agent of ['Planner', 'Credit', 'Compliance', 'Validation']) {
    await expect(flow).toContainText(agent);
  }
  await expect(page.locator('#main-content').getByTestId('engine-verdicts')).toContainText('Credit');
  await expect(page.locator('#main-content').getByTestId('engine-sources')).toContainText('Nguồn trích dẫn');
  await expect(page.locator('#main-content').getByTestId('confirm-card')).toContainText('Đang chờ người có thẩm quyền xác nhận');
  // Thẩm định viên không có quyền duyệt: không có nút xác nhận phê duyệt.
  await expect(page.locator('#main-content').getByRole('button', { name: 'Xác nhận phê duyệt' })).toHaveCount(0);
});

test('QHKH gửi phân tích sâu bị từ chối với thông báo dễ hiểu', async ({ page }) => {
  test.setTimeout(120_000);
  await loginAs(page, 'qhkh');
  await pickVinaNova(page);
  await page.getByPlaceholder(/Hỏi SH-AI/).fill(REQUEST);
  await page.getByRole('button', { name: 'Gửi' }).click();
  await expect(page.locator('#main-content').getByText(/không có quyền thực hiện thao tác này/)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#main-content').getByTestId('engine-panel')).toHaveCount(0);
});
