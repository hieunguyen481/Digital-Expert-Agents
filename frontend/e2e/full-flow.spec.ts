import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

// Đi trọn luồng như người dùng thật, trên stack thật (ENGINE_LLM_MODE=llm), không đụng DB:
//   QHKH tạo đề xuất → gửi HTTD → HTTD kiểm tra, chuyển Thẩm định → Thẩm định chạy đội agent, mở trace,
//   viết Tờ trình → Rủi ro, Tuân thủ cho ý kiến → Phê duyệt → người có thẩm quyền quyết định → ca agent đóng,
//   hành động ghi nhật ký → xuất PDF Tờ trình.
// Luồng thứ hai: đội agent dừng "Cần bổ sung" → Thẩm định yêu cầu bổ sung → QHKH tải tài liệu → HTTD ghi nhận → quay lại Thẩm định.
// Ảnh từng bước ghi vào FLOW_SHOTS (mặc định thư mục tạm), không commit.
const SHOTS = process.env.FLOW_SHOTS ?? join(tmpdir(), 'p13-shots');
mkdirSync(SHOTS, { recursive: true });
const API = 'http://localhost:8000/api/v1';
const FINAL = /^(Pending Approval|Needs Info|Escalated|Rejected|Completed)$/;

test.describe.configure({ mode: 'serial' });
test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

async function shot(page: Page, flow: string, name: string) {
  await page.screenshot({ path: join(SHOTS, `${flow}-${name}.png`), fullPage: true });
}

/** Phiên mới cho từng vai: đăng nhập Keycloak thật, giữ bearer từ chính request của ứng dụng. */
async function as(page: Page, role: RoleKey): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => undefined);
  await loginAs(page, role);
}

async function createProposal(page: Page, flow: string): Promise<string> {
  await as(page, 'qhkh');
  await page.goto('/de-xuat-vay');
  await page.locator('#new-customer').click();
  await page.keyboard.type('Mekong Flex');
  await page.locator('.ant-select-item-option').filter({ hasText: 'Mekong Flex' }).first().click();
  await page.locator('#new-product').click();
  await page.locator('.ant-select-item-option').filter({ hasText: 'Hạn mức vốn' }).click();
  await page.locator('#new-amount').fill('2');
  await page.locator('#new-term').fill('24');
  await shot(page, flow, '01-tao-de-xuat');
  await page.getByRole('button', { name: 'Tạo bản nháp' }).click();
  await page.waitForURL(/de-xuat-vay\/[0-9a-f-]{36}$/);
  const id = page.url().split('/').pop()!;
  await page.getByLabel('Mục đích vay').fill('Bổ sung vốn lưu động mua nguyên liệu cho đơn hàng quý 1 năm 2027.');
  await expect(page.getByTestId('save-status')).toContainText('Đã tự lưu nháp');
  // CIC mẫu của khách đã hết hạn: bấm tra cứu mới như người dùng thật.
  await page.getByRole('menuitem', { name: 'Hồ sơ tài liệu' }).click();
  // Danh mục tài liệu bắt buộc sinh sẵn cho hồ sơ mới: không có mục nào thì chưa đủ (L01).
  const list = page.getByRole('list', { name: 'Danh mục tài liệu' });
  await expect(list.locator('li')).not.toHaveCount(0);
    // Dùng PDF không có lớp chữ để không sinh trường AI (QHKH chưa có chỗ xác nhận trường, báo cáo QA mục 6).
  // Tải một tài liệu vào đúng mục; các mục còn lại đi bằng đề xuất ngoại lệ có lý do (E1).
  const up = page.waitForResponse((r) => /\/checklist\/[^/]+\/documents$/.test(r.url()) && r.status() === 204);
  await page.getByTestId('upload-SME-02-BUSINESS-REGISTRATION')
    .setInputFiles(resolve(process.cwd(), 'e2e/fixtures/scan-khong-chu.pdf'));
  await up;
  await expect(page.getByTestId('doc-SME-02-BUSINESS-REGISTRATION')).toContainText('Đã đủ');
  for (let left = await page.getByRole('button', { name: 'Đề xuất ngoại lệ', exact: true }).count(); left > 0; left--) {
    await page.getByRole('button', { name: 'Đề xuất ngoại lệ', exact: true }).first().click();
    await page.getByPlaceholder('Lý do (tối thiểu 10 ký tự)').fill('Khách hứa bổ sung trong tuần tới theo cam kết.');
    await page.getByRole('button', { name: 'Gửi đề xuất ngoại lệ' }).click();
    await expect(page.getByRole('button', { name: 'Đề xuất ngoại lệ', exact: true })).toHaveCount(left - 1);
  }
  const cic = page.getByRole('region', { name: 'Tra cứu CIC' });
  await cic.getByRole('button', { name: 'Tra cứu CIC mới' }).click();
  await expect(cic).toContainText('hiệu lực đến hết');
  await shot(page, flow, '02-tra-cuu-cic');
  await page.getByRole('menuitem', { name: 'Tóm tắt và gửi' }).click();
  const send = page.getByRole('button', { name: 'Gửi Hỗ trợ tín dụng' });
  await expect(send).toBeEnabled();
  await shot(page, flow, '03-dieu-kien-gui');
  await send.click();
  await expect(page.getByText(/Đã gửi|đã chuyển|Đang kiểm tra/).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, flow, '04-da-gui-httd');
  return id;
}

async function httdChecksAndTransfers(page: Page, id: string, flow: string) {
  await as(page, 'httd');
  await page.goto(`/doi-chieu/${id}`);
  const bar = page.getByTestId('transfer-bar');
  const go = bar.getByRole('button', { name: 'Chuyển Thẩm định' });
  const pass = page.getByRole('button', { name: 'Đạt', exact: true });
  await expect(pass.first()).toBeVisible(); // mục có tài liệu: hậu kiểm từng mục
  for (let left = await pass.count(); left > 0; left--) {
    await pass.first().click();
    await expect(pass).toHaveCount(left - 1);
  }
  await expect(go).toBeEnabled();
  await shot(page, flow, '05-httd-kiem-tra');
  await go.click();
  await expect(page.getByText('Đang thẩm định')).toBeVisible();
}

/** Thẩm định bấm chạy đội agent, xem tiến trình, chờ kết quả cuối; trả case id. */
async function runAgentTeam(page: Page, id: string, flow: string): Promise<{ caseId: string; state: string }> {
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${id}`);
  const panel = page.getByTestId('agent-team');
  await expect(panel.getByTestId('agent-team-empty')).toContainText('Chưa chạy đội agent');
  await panel.getByTestId('run-agent-team').click();
  await expect(panel.getByTestId('agent-run')).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByTestId('run-agent-team')).toBeDisabled(); // khóa khi đang chạy
  await shot(page, flow, '06-agent-dang-chay');
  await expect.poll(async () => panel.getByTestId('agent-run').getAttribute('data-state'), { timeout: 300_000, intervals: [3000] })
    .toEqual(expect.stringMatching(FINAL));
  const state = (await panel.getByTestId('agent-run').getAttribute('data-state'))!;
  await expect(panel.getByTestId('agent-findings')).toContainText('Credit');
  await expect(panel.getByTestId('run-agent-team')).toBeEnabled();
  await shot(page, flow, '07-agent-ket-qua');
  const caseId = (await panel.getByTestId('agent-trace-link').getAttribute('href'))!.split('=')[1];
  return { caseId, state };
}

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
  const loanB = await createProposal(page, 'f2');
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
