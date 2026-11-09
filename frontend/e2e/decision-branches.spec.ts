import { execSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import {
  appraiserSubmitsToRisk, as, createProposal, httdChecksAndTransfers, opinionsAndSubmitToApproval, runAgentTeam, shot,
} from './flow-helpers';

// Các nhánh quyết định ngoài đường phê duyệt thẳng: Từ chối, Phê duyệt có điều kiện, cấp phê duyệt trả về Thẩm định,
// Rủi ro trả lại Thẩm định. Mỗi nhánh đi trên hồ sơ mới, qua giao diện thật; không đụng DB.
test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

/** Đưa hồ sơ mới tới bước Phê duyệt (2 tỷ thuộc cấp 1: Giám đốc chi nhánh quyết định). */
async function toApproval(page: Page, flow: string, withAgent = false): Promise<string> {
  const id = await createProposal(page, flow);
  await httdChecksAndTransfers(page, id, flow);
  if (withAgent) {
    await runAgentTeam(page, id, flow);
    // Q-V: thiếu tài khoản thanh toán là điều kiện trước giải ngân, hiện ở kết quả đội agent, không chặn trình.
    await expect(page.getByTestId('agent-findings')).toContainText(/tài khoản/i);
    await shot(page, flow, 'dieu-kien-truoc-giai-ngan');
  }
  await appraiserSubmitsToRisk(page, id, flow);
  await opinionsAndSubmitToApproval(page, id, flow);
  return id;
}

async function openDecision(page: Page, id: string) {
  await as(page, 'giamdoc');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Quyết định', exact: true }).click();
  const rows = page.getByTestId('exception-row');
  await expect(rows.first()).toBeVisible();
  for (let i = 0; i < (await rows.count()); i++) await rows.nth(i).getByText('Chấp thuận').click();
}

async function pickDecision(page: Page, label: string) {
  await page.getByLabel('Loại quyết định').click();
  await page.locator('.ant-select-item-option').filter({ hasText: label }).click();
}

test('nhánh Từ chối: Giám đốc từ chối, hồ sơ đóng; điều kiện trước giải ngân hiện khi thiếu tài khoản', async ({ page }) => {
  test.setTimeout(600_000);
  const id = await toApproval(page, 'b1', true);
  await openDecision(page, id);
  await pickDecision(page, 'Từ chối');
  await page.locator('#action-text').fill('Từ chối: dòng tiền không đủ chịu nợ theo đánh giá của cấp phê duyệt.');
  await shot(page, 'b1', 'quyet-dinh');
  await page.getByRole('button', { name: 'Ghi quyết định' }).click();
  await expect(page.getByText('Từ chối').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Quyết định', exact: true })).toHaveCount(0);
  await shot(page, 'b1', 'da-tu-choi');
});

test('nhánh Phê duyệt có điều kiện: điều kiện được ghi và hồ sơ đóng', async ({ page }) => {
  test.setTimeout(600_000);
  const id = await toApproval(page, 'b2');
  await openDecision(page, id);
  await pickDecision(page, 'Phê duyệt có điều kiện');
  await page.getByPlaceholder('Mỗi điều kiện một dòng').fill('Mở tài khoản thanh toán trước giải ngân\nTheo dõi dòng tiền hằng quý');
  await page.locator('#action-text').fill('Phê duyệt có điều kiện theo đề xuất của Thẩm định.');
  await page.getByRole('button', { name: 'Ghi quyết định' }).click();
  await expect(page.getByText(/Phê duyệt có điều kiện/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Mở tài khoản thanh toán trước giải ngân').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quyết định', exact: true })).toHaveCount(0);
  await shot(page, 'b2', 'da-quyet-dinh');
});

test('nhánh Trả về Thẩm định: cấp phê duyệt trả lại, Thẩm định thấy hồ sơ và trình lại được', async ({ page }) => {
  test.setTimeout(600_000);
  const id = await toApproval(page, 'b3');
  await openDecision(page, id);
  await page.locator('#action-text').fill('Cần Thẩm định làm rõ nguồn trả nợ trước khi phê duyệt.');
  await page.getByRole('button', { name: 'Trả lại bổ sung' }).click();
  await expect(page.getByText('Đang thẩm định').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'b3', 'da-tra-ve');
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${id}`);
  await expect(page.getByRole('button', { name: 'Trình Rủi ro' })).toBeVisible();
});

test('nhánh Rủi ro trả lại Thẩm định: lý do bắt buộc, hồ sơ về Thẩm định', async ({ page }) => {
  test.setTimeout(600_000);
  const id = await createProposal(page, 'b4');
  await httdChecksAndTransfers(page, id, 'b4');
  await appraiserSubmitsToRisk(page, id, 'b4');
  await as(page, 'ruiro');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Trả lại Thẩm định' }).click();
  await expect(page.getByRole('button', { name: 'Trả lại', exact: true })).toBeDisabled(); // thiếu lý do thì khóa
  await page.locator('#action-text').fill('Cần bổ sung phân tích rủi ro tập trung ngành trước khi cho ý kiến.');
  await page.getByRole('button', { name: 'Trả lại', exact: true }).click();
  await expect(page.getByText('Đang thẩm định').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'b4', 'da-tra-lai');
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${id}`);
  await expect(page.getByRole('button', { name: 'Trình Rủi ro' })).toBeVisible();
});
