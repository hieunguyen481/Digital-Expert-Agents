import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { as, createProposal, FINAL, httdChecksAndTransfers, runAgentTeam, shot } from './flow-helpers';

// Đi trọn luồng như người dùng thật, trên stack thật (ENGINE_LLM_MODE=llm), không đụng DB:
//   viết Tờ trình → Rủi ro, Tuân thủ cho ý kiến → Phê duyệt → người có thẩm quyền quyết định → ca agent đóng,
//   hành động ghi nhật ký → xuất PDF Tờ trình.
// Luồng thứ hai (khách thiếu BCTC): đội agent dừng "Cần bổ sung" → Thẩm định yêu cầu bổ sung → QHKH tải tài liệu → HTTD ghi nhận → quay lại Thẩm định.
// Ảnh từng bước ghi vào FLOW_SHOTS (mặc định thư mục tạm), không commit.

test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});



let loanA = '';
let caseA = '';
let stateA = '';

test('luồng 1: QHKH tạo đề xuất, gửi HTTD', async ({ page }) => {
  test.setTimeout(240_000);
  loanA = await createProposal(page, 'f1');
});

test('luồng 1: HTTD kiểm tra, chuyển Thẩm định; Thẩm định chạy đội agent và mở trace', async ({ page }) => {
  test.setTimeout(480_000);
  await httdChecksAndTransfers(page, loanA, 'f1');
  ({ caseId: caseA, state: stateA } = await runAgentTeam(page, loanA, 'f1'));
  await page.getByTestId('agent-trace-link').click();
  await expect(page.getByTestId('case-trace')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('trace-dag')).toContainText('Validation');
  await shot(page, 'f1', '08-trace');
  expect(stateA).toMatch(FINAL);
});

test('luồng 1: Thẩm định viết Tờ trình, trình Rủi ro; Rủi ro và Tuân thủ cho ý kiến, trình phê duyệt', async ({ page }) => {
  test.setTimeout(240_000);
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${loanA}`);
  for (let n = 1; n <= 7; n++) {
    const box = page.locator(`#memo-${n}`);
    await box.fill(`Mục ${n}: nội dung thẩm định do chuyên viên viết, đã đối chiếu với kết quả đội agent và hồ sơ khách hàng.`);
    await box.blur();
  }
  await expect(page.getByTestId('memo-save-status')).toContainText('7/7 mục đã điền');
  await shot(page, 'f1', '09-to-trinh');
  await page.getByRole('button', { name: 'Trình Rủi ro' }).click();
  await expect(page.getByText('Đang cho ý kiến rủi ro').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'f1', '10-trinh-rui-ro');

  await as(page, 'ruiro');
  await page.goto(`/ho-so-vay/${loanA}`);
  await page.getByRole('button', { name: 'Ghi Ý kiến Rủi ro' }).click();
  await page.locator('#action-text').fill('Rủi ro: chấp nhận được với điều kiện theo dõi dòng tiền hằng quý.');
  await page.getByRole('button', { name: 'Ghi ý kiến', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ghi Ý kiến Rủi ro' })).toHaveCount(0);

  await as(page, 'tuanthu');
  await page.goto(`/ho-so-vay/${loanA}`);
  await page.getByRole('button', { name: 'Ghi ý kiến Tuân thủ' }).click();
  await page.locator('#action-text').fill('Tuân thủ: không có cờ vi phạm, KYC và CIC còn hiệu lực.');
  await page.getByRole('button', { name: 'Ghi ý kiến', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ghi ý kiến Tuân thủ' })).toHaveCount(0);

  await as(page, 'ruiro');
  await page.goto(`/ho-so-vay/${loanA}`);
  await page.getByRole('button', { name: 'Trình phê duyệt' }).click();
  await expect(page.getByText('Chờ phê duyệt').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'f1', '11-cho-phe-duyet');
});

test('luồng 1: người có thẩm quyền quyết định; ca agent đóng, hành động ghi nhật ký; xuất PDF Tờ trình', async ({ page }) => {
  test.setTimeout(240_000);
  // Đề xuất 2 tỷ thuộc cấp 1: Giám đốc chi nhánh quyết định.
  await as(page, 'giamdoc');
  await page.goto(`/ho-so-vay/${loanA}`);
  await expect(page.getByTestId('actions-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Quyết định', exact: true }).click();
  // Cấp phê duyệt phải chấp thuận hoặc từ chối từng ngoại lệ tài liệu (E1) mới ghi được quyết định.
  const rows = page.getByTestId('exception-row');
  await expect(rows.first()).toBeVisible();
  for (let i = 0; i < (await rows.count()); i++) await rows.nth(i).getByText('Chấp thuận').click();
  await page.locator('#action-text').fill('Phê duyệt theo đề xuất của Thẩm định, kèm theo dõi dòng tiền hằng quý.');
  await shot(page, 'f1', '12-quyet-dinh');
  await page.getByRole('button', { name: 'Ghi quyết định' }).click();
  await expect(page.getByText(/Đã phê duyệt|Phê duyệt có điều kiện/).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'f1', '13-da-quyet-dinh');

  // Tờ trình đã chốt khi trình: xuất PDF.
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${loanA}`);
  const download = page.waitForEvent('download');
  await page.getByTestId('memo-pdf').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.pdf$/i);
  await shot(page, 'f1', '14-xuat-pdf');

  // Trace: ca đã đóng theo quyết định trên hồ sơ, có bước người duyệt và hành động thật.
  await page.goto(`/dashboard?case=${caseA}`);
  const trace = page.getByTestId('case-trace');
  await expect(trace).toBeVisible({ timeout: 30_000 });
  await expect(trace.getByTestId('case-state')).toContainText('Hoàn thành');
  await shot(page, 'f1', '15-trace-sau-quyet-dinh');
});

// Luồng 2: đội agent dừng "Cần bổ sung" → Thẩm định yêu cầu bổ sung → QHKH tải tài liệu → HTTD ghi nhận → Thẩm định xử lý tiếp.
test('luồng 2: đội agent dừng Cần bổ sung; yêu cầu bổ sung, QHKH tải tài liệu, HTTD ghi nhận, quay lại Thẩm định', async ({ page }) => {
  test.setTimeout(540_000);
  // Khách chưa có BCTC trong core banking: thiếu dữ liệu chặn nên đội agent dừng "Cần bổ sung" (thiếu tài khoản chỉ là điều kiện trước giải ngân, Q-V).
  const loanB = await createProposal(page, 'f2', 'Logistics Cảng Xanh');
  await httdChecksAndTransfers(page, loanB, 'f2');
  const run = await runAgentTeam(page, loanB, 'f2');
  expect(run.state).toBe('Needs Info');
  await expect(page.getByTestId('agent-run-state')).toContainText('Cần bổ sung');

  await page.getByRole('button', { name: 'Yêu cầu bổ sung' }).click();
  await page.locator('#action-text').fill('Cần sao kê tài khoản 6 tháng gần nhất và báo cáo tài chính để tính DSCR.');
  await page.getByRole('button', { name: 'Gửi yêu cầu' }).click();
  await expect(page.getByText('Thẩm định – chờ bổ sung').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'f2', '09-yeu-cau-bo-sung');

  await as(page, 'qhkh');
  await page.goto(`/doi-chieu/${loanB}`);
  await expect(page.getByRole('button', { name: 'Tải tài liệu bổ sung' })).toBeEnabled();
  const done = page.waitForResponse((r) => /\/documents\/uploads\/[^/]+\/complete$/.test(r.url()));
  await page.getByTestId('recon-upload').setInputFiles(resolve(process.cwd(), 'e2e/fixtures/ho-so-lat-tam.pdf'));
  expect((await done).status()).toBe(202);
  await shot(page, 'f2', '10-qhkh-tai-tai-lieu');

  await as(page, 'httd');
  await page.goto(`/ho-so-vay/${loanB}`);
  await page.getByRole('button', { name: 'Ghi nhận đã bổ sung' }).click();
  await expect(page.getByText('Đang thẩm định').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, 'f2', '11-httd-ghi-nhan');

  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${loanB}`);
  await expect(page.getByTestId('run-agent-team')).toBeEnabled();
  await expect(page.getByTestId('agent-run-state')).toContainText('Cần bổ sung');
  await shot(page, 'f2', '12-tdinh-tiep-tuc');
});
