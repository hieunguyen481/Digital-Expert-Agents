import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

// Điều kiện trước giải ngân do đội agent đề xuất chỉ hiện trên hồ sơ sau khi người đúng vai xác nhận.
// Spec tự chèn một lượt agent giả lập và một đề xuất điều kiện (như agent-actions.spec.ts), rồi nạp lại seed.
const LOAN = '75000000-0000-4000-8000-000000000001';
const CASE = 'case_e2e_dcond';
const PROP = 'a2000000-0000-4000-8000-000000000003';
const TEXT = 'Hoàn tất đăng ký tài sản bảo đảm trước giải ngân (e2e)';
const PSQL = process.env.E2E_PSQL_CMD ?? 'docker exec -i bank-ai-workbench-postgres-1 psql -U postgres -d bank_ai -v ON_ERROR_STOP=1';

test.describe.configure({ mode: 'serial' });

const sql = (q: string) => execSync(PSQL, { input: q, stdio: ['pipe', 'ignore', 'inherit'], timeout: 60_000 });

const CLEAN = `
DELETE FROM agent.action_log WHERE case_id = '${CASE}';
DELETE FROM agent.case_event WHERE case_id = '${CASE}';
DELETE FROM agent.action_proposal WHERE case_id = '${CASE}';
DELETE FROM credit.loan_agent_run WHERE case_id = '${CASE}';
DELETE FROM agent.case_run WHERE case_id = '${CASE}';
DELETE FROM credit.pre_disbursement_condition WHERE source LIKE 'AGENT:a2000000%';
`;

test.beforeAll(() => {
  sql(CLEAN + `
INSERT INTO agent.case_run (case_id, customer_id, submitted_by, state, payload, created_at, updated_at)
  SELECT '${CASE}', primary_customer_id, '10000000-0000-4000-8000-000000000008', 'Pending Approval',
         '{"request":{"loan_application_id":"${LOAN}"}}'::jsonb, extract(epoch from now()) + 100000, extract(epoch from now()) + 100000
  FROM credit.loan_application WHERE id = '${LOAN}';
INSERT INTO credit.loan_agent_run (id, loan_application_id, case_id, started_by, created_at)
  VALUES (gen_random_uuid(), '${LOAN}', '${CASE}', '10000000-0000-4000-8000-000000000008', now() + interval '1 day');
INSERT INTO agent.action_proposal (id, case_id, kind, title, rationale, evidence, params, source_agent, created_at) VALUES
 ('${PROP}', '${CASE}', 'add_disbursement_condition', 'Điều kiện giải ngân', 'Cần đăng ký tài sản bảo đảm',
   '["Hồ sơ tài sản"]', '{"text":"${TEXT}"}', 'credit', 3);
`);
});

test.afterAll(() => {
  try { sql(CLEAN); } catch { /* seed dọn tiếp */ }
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('thẩm định xác nhận đề xuất điều kiện: khối "Điều kiện trước giải ngân" tự hiện điều kiện, người và lúc xác nhận', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(`/ho-so-vay/${LOAN}`);
  const block = page.getByTestId('pre-disbursement');
  // Hồ sơ rỗng nhiều khối thì "Điều kiện trước giải ngân" gộp vào một dòng "Chưa có: …"; khi đó khối chưa có để đếm, chỉ cần dòng gộp nhắc đúng mục này.
  await expect(block.or(page.getByTestId('loan-empty-blocks'))).toBeVisible({ timeout: 30_000 });
  if (!(await block.isVisible())) {
    await expect(page.getByTestId('loan-empty-blocks')).toContainText('điều kiện trước giải ngân');
  }
  // Hồ sơ có thể đã có điều kiện từ lần chạy thật trước: không giả định rỗng, chỉ đếm trước/sau.
  if (await block.isVisible()) await expect(block.getByTestId('pre-disbursement-confirmed').first().or(block.getByTestId('pre-disbursement-empty'))).toBeVisible();
  const expand = async () => { const t = block.getByTestId('pre-disbursement-toggle'); if (await t.count() && (await t.getAttribute('aria-expanded')) === 'false') await t.click(); };
  await expand();
  const before = await block.getByTestId('pre-disbursement-confirmed').count();
  // Đề xuất chưa xác nhận (đang nằm ở thẻ đề xuất hành động) không hiện ở khối này, kể cả khi có gói kết quả của đội agent.
  await expect(block).not.toContainText('chưa xác nhận');
  await expect(block.getByTestId('pre-disbursement-agent')).toHaveCount(0);

  const card = page.getByTestId('action-proposal').and(page.locator('[data-kind="add_disbursement_condition"]'));
  await card.getByTestId('proposal-confirm').click();
  await card.getByTestId('proposal-reason').fill('Đồng ý điều kiện');
  await card.getByTestId('proposal-submit').click();
  await expect(card).toHaveAttribute('data-status', 'CONFIRMED', { timeout: 20_000 });

  await expect(async () => { await expand(); await expect(block.getByTestId('pre-disbursement-confirmed')).toHaveCount(before + 1); }).toPass({ timeout: 20_000 });
  const row = block.getByTestId('pre-disbursement-confirmed').filter({ hasText: TEXT });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(TEXT);
  await expect(row).toContainText('AI đề xuất');
  await expect(row).toContainText('Đã được người xác nhận');
  await expect(row).toContainText(/\d{2}:\d{2}/);
  await expect(row).not.toContainText('a2000000');
  await page.setViewportSize({ width: 1366, height: 800 });
  await block.scrollIntoViewIfNeeded();
  await block.screenshot({ path: '/tmp/fo/dcond-1366.png' });
  await page.setViewportSize({ width: 1920, height: 1000 });
  await block.screenshot({ path: '/tmp/fo/dcond-1920.png' });
});

test('QHKH (chỉ đọc) thấy điều kiện đã xác nhận, không có nút sửa', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto(`/ho-so-vay/${LOAN}`);
  const row = page.getByTestId('pre-disbursement').getByTestId('pre-disbursement-confirmed').filter({ hasText: TEXT });
  await expect(row).toContainText(TEXT, { timeout: 30_000 });
  await expect(page.getByTestId('pre-disbursement').getByRole('button')).toHaveCount(0);
});
