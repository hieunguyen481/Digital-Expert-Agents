import { execSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './helpers';

// Chạy đội agent thật (ENGINE_LLM_MODE=llm) từ trang Hồ sơ vay. Hồ sơ VinaNova đang ở Thẩm định, tdinh giữ bước.
// Mỗi lần chạy ghi một case vào DB nên nạp lại seed khi xong (E2E_RESEED_CMD) cho các spec khác.
const LOAN = '75000000-0000-4000-8000-000000000001';
const PAGE_URL = `/ho-so-vay/${LOAN}`;
const API = `http://localhost:8000/api/v1/loan-applications/${LOAN}/agent-runs`;
const FINAL = ['Pending Approval', 'Needs Info', 'Escalated', 'Rejected', 'Completed'];

test.describe.configure({ mode: 'serial' });

test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

async function runCount(page: Page, auth: string): Promise<number> {
  return (await (await page.request.get(API, { headers: { authorization: auth } })).json()).runs.length;
}

async function bearer(page: Page): Promise<string> {
  const req = await page.waitForRequest((r) => r.url().includes('/api/v1/') && !!r.headers().authorization);
  return req.headers().authorization;
}

test('tdinh đang giữ hồ sơ: bấm chạy, thấy tiến trình, kết quả, link trace; chạy lại giữ lượt cũ; trùng bị chặn', async ({ page }) => {
  test.setTimeout(480_000);
  await loginAs(page, 'tdinh');
  const auth = bearer(page);
  await page.goto(PAGE_URL);
  const panel = page.getByTestId('agent-team');
  await expect(panel).toBeVisible();
  const token = await auth;
  const before = await runCount(page, token);
  if (before === 0) await expect(panel.getByTestId('agent-team-empty')).toContainText('Chưa chạy đội agent');

  const link0 = before ? await panel.getByTestId('agent-trace-link').getAttribute('href') : null;
  await panel.getByTestId('run-agent-team').click();
  await expect(panel.getByTestId('agent-run')).toBeVisible({ timeout: 30_000 });
  await expect(panel.getByTestId('agent-trace-link')).not.toHaveAttribute('href', link0 ?? /^$/);

  // Đang chạy: gọi lần hai bị chặn 409 và không tạo thêm lượt.
  await expect.poll(() => runCount(page, token), { timeout: 30_000 }).toBe(before + 1);
  const dup = await page.request.post(API, { headers: { authorization: token } });
  expect(dup.status()).toBe(409);
  expect(await runCount(page, token)).toBe(before + 1);  // chặn trùng: không tạo lượt thứ hai
  expect((await dup.json()).error.code).toBe('AGENT_RUN_IN_PROGRESS');

  await expect.poll(async () => panel.getByTestId('agent-run').getAttribute('data-state'), { timeout: 240_000, intervals: [2000] })
    .toEqual(expect.stringMatching(new RegExp(`^(${FINAL.join('|')})$`)));
  await expect(panel.getByTestId('agent-progress')).toContainText('Credit');
  await expect(panel.getByTestId('agent-findings')).toContainText('Credit');
  await expect(panel.getByTestId('agent-sources')).toContainText(/\S{5,}/);
  await expect(panel).not.toContainText(/Đã phê duyệt/);
  const link = await panel.getByTestId('agent-trace-link').getAttribute('href');
  expect(link).toMatch(/^\/dashboard\?case=case_/);
  const firstCase = link!.split('=')[1];

  // Chạy lại: lượt mới, lượt cũ còn trong lịch sử.
  await panel.getByTestId('run-agent-team').click();
  await expect(panel.getByTestId('agent-trace-link')).not.toHaveAttribute('href', link!);
  await expect(panel.getByTestId('agent-run-history')).toContainText(firstCase, { timeout: 30_000 });
  await expect.poll(() => runCount(page, token), { timeout: 30_000 }).toBe(before + 2);
  const secondLink = await panel.getByTestId('agent-trace-link').getAttribute('href');
  expect(secondLink).not.toBe(link);
  await expect.poll(async () => panel.getByTestId('agent-run').getAttribute('data-state'), { timeout: 240_000, intervals: [2000] })
    .toEqual(expect.stringMatching(new RegExp(`^(${FINAL.join('|')})$`)));

  // Link trace mở đúng case trên dashboard.
  await panel.getByTestId('agent-trace-link').click();
  await expect(page.getByTestId('case-trace')).toBeVisible({ timeout: 30_000 });
});

// Vai trò khác (kể cả người đang giữ hồ sơ ở bước không thuộc QHKH/Thẩm định) xem được nhưng không có nút; POST bị 403 có lý do.
const DENIED = [
  { role: 'ruiro', loan: '75000000-0000-4000-8000-000000000012' }, // Rủi ro đang giữ bước RISK_REVIEW
  { role: 'qhkh', loan: '75000000-0000-4000-8000-000000000004' }, // QHKH nhưng hồ sơ đang ở bước Thẩm định
  { role: 'kiemtoan', loan: LOAN },
] as const;

for (const { role, loan } of DENIED) {
  test(`${role}: không thấy nút chạy, thấy lý do, POST nhận 403 có lý do`, async ({ page }) => {
    await loginAs(page, role);
    const auth = bearer(page);
    await page.goto(`/ho-so-vay/${loan}`);
    const panel = page.getByTestId('agent-team');
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('agent-team-lock')).toContainText(/.{15,}/);
    await expect(panel.getByTestId('run-agent-team')).toHaveCount(0);
    const res = await page.request.post(API.replace(LOAN, loan), { headers: { authorization: await auth } });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('AGENT_RUN_NOT_ALLOWED');
    expect(body.error.message).toMatch(/\S{5,}/);
  });
}
