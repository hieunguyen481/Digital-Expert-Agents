import { test, expect, type Page } from '@playwright/test';
import { appraiserSubmitsToRisk, as, createProposal, httdChecksAndTransfers } from './flow-helpers';

async function withReason(page: Page, btn: string | RegExp, ok: string, text: string) {
  await page.getByRole('button', { name: btn }).first().click();
  await page.locator('#action-text').fill(text);
  await page.getByRole('button', { name: ok, exact: true }).click();
}

// P01 + P08: lý do "Yêu cầu giải trình" lưu ở bước; HTTD thấy đúng lý do giải trình, lý do giữ gian lận vẫn che; lý do khóa "Trình phê duyệt" nêu đúng mục còn thiếu.
test('Rủi ro yêu cầu giải trình: HTTD thấy đúng nội dung, không thấy lý do trả lại cũ', async ({ page }) => {
  test.setTimeout(520_000);
  const OLD = 'Cần bổ sung phân tích rủi ro tập trung ngành trước khi cho ý kiến.';
  const NEW = 'Giải trình nguồn tiền trả nợ quý 2.';
  const id = await createProposal(page, 'RE', 'Mekong Flex', 3);
  await httdChecksAndTransfers(page, id, 'RE');
  await appraiserSubmitsToRisk(page, id, 'RE', 1);
  await as(page, 'ruiro'); await page.goto(`/ho-so-vay/${id}`);
  await withReason(page, 'Trả lại Thẩm định', 'Trả lại', OLD);
  await expect(page.getByTestId('loan-status')).not.toHaveText(/Rủi ro/, { timeout: 15_000 });
  await appraiserSubmitsToRisk(page, id, 'RE', 2);
  await as(page, 'ruiro'); await page.goto(`/ho-so-vay/${id}`);
  // P08: lý do khóa nói đúng mục còn thiếu, không nối "hoặc"
  const lock = (await page.getByTestId('todo-panel').innerText().catch(() => '')) + (await page.locator('main').innerText());
  expect(lock).toMatch(/Chưa có ý kiến (Rủi ro|Tuân thủ)/);
  expect(lock).not.toMatch(/Ý kiến Rủi ro, ý kiến Tuân thủ hoặc/);
  await as(page, 'tuanthu'); await page.goto(`/ho-so-vay/${id}`);
  await withReason(page, 'Giữ hồ sơ nghi gian lận', 'Giữ hồ sơ', 'Chữ ký trên hợp đồng không khớp mẫu lưu.');
  await expect(page.getByRole('button', { name: 'Đóng xử lý nghi gian lận' })).toBeVisible({ timeout: 15_000 });
  await withReason(page, 'Đóng xử lý nghi gian lận', 'Đóng xử lý', 'Đã đối chiếu, chữ ký hợp lệ.');
  await expect(page.getByRole('button', { name: 'Yêu cầu giải trình' }).first()).toBeVisible({ timeout: 15_000 });
  await withReason(page, 'Yêu cầu giải trình', 'Gửi yêu cầu', NEW);
  // Captain 13/11/2026: HTTD (người xử lý bước Chờ giải trình) thấy đúng lý do giải trình, không thấy lý do trả lại cũ
  // và không thấy lý do giữ nghi gian lận (vẫn che, Q-M).
  await as(page, 'httd'); await page.goto(`/ho-so-vay/${id}`);
  const sup = page.getByTestId('supplement-request');
  await expect(sup).toContainText(NEW, { timeout: 15_000 });
  await expect(sup).not.toContainText(OLD);
  // Q05: thông báo gửi HTTD nêu nội dung cần giải trình.
  await page.goto('/thong-bao');
  await expect(page.locator('main')).toContainText(`Nội dung cần giải trình: ${NEW}`, { timeout: 15_000 });
  await page.goto(`/ho-so-vay/${id}`);
  await expect(page.locator('main')).not.toContainText('Chữ ký trên hợp đồng không khớp mẫu lưu');
  // Vai được xem (Rủi ro) cũng thấy lý do giải trình.
  await as(page, 'ruiro'); await page.goto(`/ho-so-vay/${id}`);
  await expect(page.getByTestId('supplement-request')).toContainText(NEW, { timeout: 15_000 });
});
