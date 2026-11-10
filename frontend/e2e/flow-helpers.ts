import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

// Bước dùng chung của các luồng đi trọn trên stack thật (full-flow, decision-branches).
const SHOTS = process.env.FLOW_SHOTS ?? join(tmpdir(), 'p13-shots');
mkdirSync(SHOTS, { recursive: true });
export const FINAL = /^(Pending Approval|Needs Info|Escalated|Rejected|Completed)$/;

export async function shot(page: Page, flow: string, name: string) {
  await page.screenshot({ path: join(SHOTS, `${flow}-${name}.png`), fullPage: true });
}

/** Phiên mới cho từng vai: đăng nhập Keycloak thật, giữ bearer từ chính request của ứng dụng. */
export async function as(page: Page, role: RoleKey): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => undefined);
  await loginAs(page, role);
}

export async function createProposal(
  page: Page, flow: string, customer = 'Mekong Flex', amountBillion = 2,
): Promise<string> {
  await as(page, 'qhkh');
  await page.goto('/de-xuat-vay');
  await page.locator('#new-customer').click();
  await page.keyboard.type(customer);
  await page.locator('.ant-select-item-option').filter({ hasText: customer }).first().click();
  await page.locator('#new-product').click();
  await page.locator('.ant-select-item-option').filter({ hasText: 'Hạn mức vốn' }).click();
  await page.locator('#new-amount').fill(String(amountBillion));
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
  if (amountBillion > 20) {
    // E5: trên 20 tỷ bắt buộc BCTC kiểm toán; tải vào đúng mục để đủ điều kiện (QA3-05).
    const audited = page.waitForResponse((r) => /\/checklist\/[^/]+\/documents$/.test(r.url()) && r.status() === 204);
    await page.getByTestId('upload-SME-08-AUDITED-FS').setInputFiles(resolve(process.cwd(), 'e2e/fixtures/scan-khong-chu.pdf'));
    await audited;
    await expect(page.getByTestId('doc-SME-08-AUDITED-FS')).toContainText('Đã đủ');
  }
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

export async function httdChecksAndTransfers(page: Page, id: string, flow: string) {
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
export async function runAgentTeam(page: Page, id: string, flow: string): Promise<{ caseId: string; state: string }> {
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


/** Thẩm định điền đủ 7 mục Tờ trình và trình Rủi ro (không cần chạy đội agent). */
export async function appraiserSubmitsToRisk(page: Page, id: string, flow: string, round = 1) {
  await as(page, 'tdinh');
  await page.goto(`/ho-so-vay/${id}`);
  for (let n = 1; n <= 7; n++) {
    const box = page.locator(`#memo-${n}`);
    await box.fill(`Mục ${n}: nội dung thẩm định lần ${round} do chuyên viên viết, đã đối chiếu hồ sơ khách hàng.`);
    await box.blur();
  }
  await expect(page.getByTestId('memo-save-status')).toContainText('7/7 mục đã điền');
  await page.getByRole('button', { name: 'Trình Rủi ro' }).click();
  await expect(page.getByText('Đang cho ý kiến rủi ro').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, flow, `trinh-rui-ro-${round}`);
}

/** Rủi ro và Tuân thủ cho ý kiến, Rủi ro trình phê duyệt. */
export async function opinionsAndSubmitToApproval(page: Page, id: string, flow: string) {
  await as(page, 'ruiro');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Ghi Ý kiến Rủi ro' }).click();
  await page.locator('#action-text').fill('Rủi ro: chấp nhận được với điều kiện theo dõi dòng tiền hằng quý.');
  await page.getByRole('button', { name: 'Ghi ý kiến', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ghi Ý kiến Rủi ro' })).toHaveCount(0);
  await as(page, 'tuanthu');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Ghi ý kiến Tuân thủ' }).click();
  await page.locator('#action-text').fill('Tuân thủ: không có cờ vi phạm, KYC và CIC còn hiệu lực.');
  await page.getByRole('button', { name: 'Ghi ý kiến', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ghi ý kiến Tuân thủ' })).toHaveCount(0);
  await as(page, 'ruiro');
  await page.goto(`/ho-so-vay/${id}`);
  await page.getByRole('button', { name: 'Trình phê duyệt' }).click();
  await expect(page.getByText('Chờ phê duyệt').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, flow, 'cho-phe-duyet');
}
