import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { as, runAgentTeam, shot } from './flow-helpers';
import { loginAs } from './helpers';

// Các cảnh demo trong docs/agent/demo-data.md, chạy sau lệnh đặt lại (infra/scripts/reset-demo.sh).
// Ảnh vào FLOW_SHOTS (mặc định thư mục tạm; khi nghiệm thu: /tmp/d1). Cảnh chạy đội agent thật (ENGINE_LLM_MODE=llm).
const ID = (n: string) => `75000000-0000-4000-8000-${n}`;
const SCENE = {
  needInfo: { loan: ID('000091000000'), no: 'HSV-2026-00223' },      // Việt Tiến, thiếu BCTC
  cicReject: { loan: ID('000000000004'), no: 'HSV-2026-00184' },     // Sông Hàn, CIC nhóm 3
  ocr: { loan: ID('000000000005'), no: 'HSV-2026-00196' },           // Phú Điền, chờ bổ sung
  vina: { loan: ID('000000000001'), no: 'HSV-2026-00187' },          // VinaNova
  decide: { loan: ID('000000000013'), no: 'HSV-2026-00163' },        // Thành Đạt, đang ở Phê duyệt
};
const RESET = process.env.E2E_RESET_DEMO_CMD ?? resolve(process.cwd(), '../infra/scripts/reset-demo.sh');

test.describe.configure({ mode: 'serial' });
test.beforeAll(() => { execSync(RESET, { stdio: 'ignore', timeout: 300_000 }); });
test.afterAll(() => { if (!process.env.E2E_KEEP_DEMO) execSync(RESET, { stdio: 'ignore', timeout: 300_000 }); });

// Không lộ khóa kỹ thuật hay nhãn nội bộ ra giao diện (L06, L07, L18).
const FORBIDDEN = /regional|head_office|total_debt|NEEDS_VERIFICATION|Giám đốc vùng|Hội đồng agent|rules\.md/i;
async function noTechnicalKeys(page: Page) {
  const text = await page.locator('body').innerText();
  const m = FORBIDDEN.exec(text);
  expect(m ? text.slice(Math.max(0, m.index - 80), m.index + 60) : null, 'giao diện lộ khóa kỹ thuật').toBeNull();
}

async function proposals(page: Page) {
  const list = page.getByTestId('action-proposal');
  await expect(list.first()).toBeVisible({ timeout: 30_000 });
  return list;
}

test('cảnh 1: đội agent ra Đề xuất phê duyệt kèm điều kiện trước giải ngân', async ({ page }) => {
  test.setTimeout(480_000);
  const { state } = await runAgentTeam(page, SCENE.vina.loan, 'd1-s1');
  expect(state).toBe('Pending Approval');
  await expect(page.getByTestId('agent-team')).toContainText(/Đề xuất phê duyệt/i);
  await proposals(page);
  await expect(page.locator('[data-testid="action-proposal"][data-kind="add_disbursement_condition"]').first()).toBeVisible();
  await noTechnicalKeys(page);
  await shot(page, 'd1-s1', 'de-xuat-phe-duyet');
});

test('cảnh 2: đội agent ra Cần bổ sung kèm đề xuất yêu cầu bổ sung', async ({ page }) => {
  test.setTimeout(480_000);
  const { state } = await runAgentTeam(page, SCENE.needInfo.loan, 'd1-s2');
  expect(state).toBe('Needs Info');
  await proposals(page);
  await expect(page.locator('[data-testid="action-proposal"][data-kind="request_documents"]').first()).toBeVisible();
  await noTechnicalKeys(page);
  await shot(page, 'd1-s2', 'can-bo-sung');
});

test('cảnh 3: hồ sơ bị từ chối vì CIC nợ xấu', async ({ page }) => {
  test.setTimeout(480_000);
  const { state } = await runAgentTeam(page, SCENE.cicReject.loan, 'd1-s3');
  expect(state).toBe('Rejected');
  await expect(page.getByTestId('agent-team')).toContainText(/CIC|nợ xấu|nhóm 3/i);
  await noTechnicalKeys(page);
  await shot(page, 'd1-s3', 'tu-choi-cic');
});

test('cảnh 4: PDF scan được OCR đọc ra trường có vùng tô', async ({ page, browser }) => {
  test.setTimeout(300_000);
  await loginAs(page, 'qhkh');
  await page.goto(`/doi-chieu/${SCENE.ocr.loan}`);
  await expect(page.getByRole('button', { name: 'Tải tài liệu bổ sung' })).toBeEnabled();
  const done = page.waitForResponse((r) => /\/documents\/uploads\/[^/]+\/complete$/.test(r.url()));
  await page.getByTestId('recon-upload').setInputFiles(resolve(process.cwd(), 'e2e/fixtures/scan-ho-so-lat-tam.pdf'));
  const documentId = (await (await done).json()).document_id as string;
  const ctx = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? 3000}` });
  const hp = await ctx.newPage();
  await as(hp, 'httd');
  await hp.goto(`/doi-chieu/${SCENE.ocr.loan}`);
  await hp.getByTestId(`doc-${documentId}`).click();
  const frame = hp.getByTestId('page-frame');
  await expect(frame).toBeVisible({ timeout: 180_000 });
  await expect(hp.getByTestId('processing-progress')).toHaveCount(0, { timeout: 180_000 });
  const regions = frame.locator('[data-testid^="region-"]');
  await expect(regions.first()).toBeVisible({ timeout: 60_000 });
  await regions.first().dispatchEvent('click');
  await expect(hp.getByTestId('field-card')).toContainText(/chờ xác nhận|AI đề xuất/i);
  await shot(hp, 'd1-s4', 'ocr-vung-to');
  await ctx.close();
});

test('cảnh 5: hồ sơ ở bước Phê duyệt đi tới quyết định của người có thẩm quyền', async ({ page }) => {
  test.setTimeout(300_000);
  const { loan } = SCENE.decide;
  let decided = false;
  // Hồ sơ cấp 2 (55 tỷ): người Phê duyệt quyết định; Giám đốc chi nhánh thấy nút nhưng ghi bị 500 RLS (xem demo-data.md).
  for (const role of ['pheduyet'] as const) {
    await as(page, role);
    await page.goto(`/ho-so-vay/${loan}`);
    const btn = page.getByRole('button', { name: 'Quyết định', exact: true });
    if (!(await btn.waitFor({ timeout: 15_000 }).then(() => true, () => false)) || !(await btn.isEnabled())) continue;
    await noTechnicalKeys(page);
    await shot(page, 'd1-s5', 'cho-quyet-dinh');
    await btn.click();
    const rows = page.getByTestId('exception-row');
    await rows.first().waitFor({ timeout: 10_000 }).catch(() => undefined);
    for (let i = 0; i < (await rows.count()); i++) { await rows.nth(i).getByText('Chấp thuận').click(); await rows.nth(i).getByRole('textbox').fill('Chấp thuận ngoại lệ theo đề xuất'); }
    await page.locator('#action-text').fill('Phê duyệt theo đề xuất của Thẩm định, kèm điều kiện trước giải ngân.');
    await page.getByRole('button', { name: 'Ghi quyết định' }).click();
    await expect(page.getByText(/Đã phê duyệt|Phê duyệt có điều kiện/).first()).toBeVisible({ timeout: 30_000 });
    await shot(page, 'd1-s5', 'da-quyet-dinh');
    decided = true;
    break;
  }
  expect(decided, 'không vai nào có nút Quyết định').toBe(true);
});
