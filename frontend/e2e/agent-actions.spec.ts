import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

// Đề xuất hành động ghi của đội agent: agent chỉ đề xuất; người đúng vai trò xác nhận/bỏ kèm lý do.
// Spec tự chèn một lượt agent giả lập của hồ sơ VinaNova và 3 đề xuất (một mỗi loại) vào DB, rồi nạp lại seed.
const LOAN = '75000000-0000-4000-8000-000000000001';
const CASE = 'case_e2e_actions';
const PSQL = process.env.E2E_PSQL_CMD ?? 'docker exec -i bank-ai-workbench-postgres-1 psql -U postgres -d bank_ai -v ON_ERROR_STOP=1';
const KINDS = ['add_risk_flag', 'request_documents', 'add_disbursement_condition'] as const;

test.describe.configure({ mode: 'serial' });

const sql = (q: string) => execSync(PSQL, { input: q, stdio: ['pipe', 'ignore', 'inherit'], timeout: 60_000 });

test.beforeAll(() => {
  sql(`
DELETE FROM agent.action_proposal WHERE case_id = '${CASE}';
DELETE FROM credit.loan_agent_run WHERE case_id = '${CASE}';
DELETE FROM agent.case_run WHERE case_id = '${CASE}';
INSERT INTO agent.case_run (case_id, customer_id, submitted_by, state, payload, created_at, updated_at)
  SELECT '${CASE}', primary_customer_id, '10000000-0000-4000-8000-000000000008', 'Pending Approval',
         '{"loan_application_id":"${LOAN}"}'::jsonb, extract(epoch from now()) + 100000, extract(epoch from now()) + 100000
  FROM credit.loan_application WHERE id = '${LOAN}';
INSERT INTO credit.loan_agent_run (id, loan_application_id, case_id, started_by, created_at)
  VALUES (gen_random_uuid(), '${LOAN}', '${CASE}', '10000000-0000-4000-8000-000000000008', now() + interval '1 day');
INSERT INTO agent.action_proposal (id, case_id, kind, title, rationale, evidence, params, source_agent, created_at) VALUES
 ('a1000000-0000-4000-8000-000000000001', '${CASE}', 'add_risk_flag', 'Ghi cờ rủi ro: doanh thu lệch', 'Doanh thu khai báo lệch sao kê',
   '["Sao kê 6 tháng"]', '{"code":"agent_revenue_gap","severity":"MEDIUM"}', 'risk', 1),
 ('a1000000-0000-4000-8000-000000000002', '${CASE}', 'request_documents', 'Yêu cầu bổ sung tài liệu', 'Thiếu báo cáo thuế quý 4',
   '["Checklist"]', '{"documents":["Báo cáo thuế quý 4"],"reason":"Thiếu báo cáo thuế"}', 'document', 2),
 ('a1000000-0000-4000-8000-000000000003', '${CASE}', 'add_disbursement_condition', 'Điều kiện giải ngân', 'Cần đăng ký tài sản bảo đảm',
   '["Hồ sơ tài sản"]', '{"condition":"Hoàn tất đăng ký tài sản bảo đảm trước giải ngân"}', 'credit', 3);
`);
});

test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

const card = (page: import('@playwright/test').Page, kind: string) =>
  page.getByTestId('action-proposal').and(page.locator(`[data-kind="${kind}"]`));

test('người không đúng vai trò (rủi ro) thấy đề xuất nhưng không có nút xác nhận', async ({ page }) => {
  await loginAs(page, 'ruiro');
  await page.goto(`/ho-so-vay/${LOAN}`);
  await expect(card(page, 'request_documents')).toBeVisible({ timeout: 30_000 });
  await expect(card(page, 'request_documents').getByTestId('proposal-locked')).toBeVisible();
  await expect(page.getByTestId('proposal-confirm')).toHaveCount(0);
});

test('thẩm định xác nhận ghi cờ, bỏ yêu cầu bổ sung, xác nhận điều kiện; bấm hai lần không nhân đôi; trace có chuỗi', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(`/ho-so-vay/${LOAN}`);
  for (const kind of KINDS) await expect(card(page, kind)).toBeVisible({ timeout: 30_000 });

  // Xác nhận phải có lý do.
  await card(page, 'add_risk_flag').getByTestId('proposal-confirm').click();
  await expect(card(page, 'add_risk_flag').getByTestId('proposal-submit')).toBeDisabled();
  await card(page, 'add_risk_flag').getByTestId('proposal-reason').fill('Đã đối chiếu sao kê, đồng ý ghi cờ');
  await card(page, 'add_risk_flag').getByTestId('proposal-submit').dblclick();
  await expect(card(page, 'add_risk_flag')).toHaveAttribute('data-status', 'CONFIRMED', { timeout: 20_000 });

  await card(page, 'request_documents').getByTestId('proposal-dismiss').click();
  await card(page, 'request_documents').getByTestId('proposal-reason').fill('Khách đã nộp bản giấy');
  await card(page, 'request_documents').getByTestId('proposal-submit').click();
  await expect(card(page, 'request_documents')).toHaveAttribute('data-status', 'DISMISSED', { timeout: 20_000 });

  await card(page, 'add_disbursement_condition').getByTestId('proposal-confirm').click();
  await card(page, 'add_disbursement_condition').getByTestId('proposal-reason').fill('Đồng ý điều kiện');
  await card(page, 'add_disbursement_condition').getByTestId('proposal-submit').click();
  await expect(card(page, 'add_disbursement_condition')).toHaveAttribute('data-status', 'CONFIRMED', { timeout: 20_000 });

  // Nhật ký: mỗi đề xuất đã xác nhận chỉ thực hiện đúng một lần.
  const n = execSync(`${PSQL} -Atc "SELECT count(*) FROM agent.action_log WHERE case_id='${CASE}'"`, { encoding: 'utf8' }).trim();
  expect(Number(n)).toBe(2);
  const flags = execSync(`${PSQL} -Atc "SELECT count(*) FROM credit.case_flag WHERE loan_application_id='${LOAN}' AND source LIKE 'AGENT:a1000000%'"`, { encoding: 'utf8' }).trim();
  expect(Number(flags)).toBe(1);

  await page.goto(`/dashboard?case=${CASE}`);
  await expect(page.getByTestId('trace-proposal-chain')).toHaveCount(3, { timeout: 30_000 });
  await expect(page.getByTestId('trace-proposals')).toContainText(/xác nhận/i);
});
