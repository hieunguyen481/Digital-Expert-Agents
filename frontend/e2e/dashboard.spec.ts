import { expect, test } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

const REQUEST =
  'Phân tích sâu hồ sơ vay VinaNova: thẩm định tín dụng, kiểm tra tuân thủ chính sách và đề xuất hạn mức';

async function openCases(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Bảng điều khiển agent' }).click();
  await page.getByRole('tab', { name: /Agent traces/ }).click();
}

test('dashboard hiện đúng case vừa chạy ở /chat: DAG, task, luồng phối hợp, công cụ, quyết định', async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, 'tdinh');
  await page.goto('/chat');
  await page.getByPlaceholder(/Hỏi SH-AI/).fill('/VinaNova');
  await page.getByText(/VinaNova/i).first().click();
  const caseResp = page.waitForResponse((r) => /\/agent-cases\/case_[0-9a-f]+$/.test(r.url()), { timeout: 120_000 });
  await page.getByPlaceholder(/Hỏi SH-AI/).fill(REQUEST);
  await page.getByRole('button', { name: 'Gửi' }).click();
  const caseId = /(case_[0-9a-f]+)$/.exec((await caseResp).url())![1];
  // Engine llm dừng ở Chờ xác nhận hoặc Cần bổ sung/Từ chối; cả hai đều chờ người, không tự duyệt.
  const confirm = page.locator('#main-content').getByTestId('confirm-card');
  await expect(confirm.or(page.locator('#main-content').getByTestId('stop-card'))).toBeVisible({ timeout: 120_000 });
  const pending = await confirm.isVisible();
  // Q-V: thiếu tài khoản thanh toán là điều kiện trước giải ngân, không chặn trình: hồ sơ đủ điều kiện ra Đề xuất phê duyệt.
  if (!pending) await expect(page.locator('#main-content').getByTestId('stop-card')).not.toContainText(/tài khoản thanh toán/i);

  await openCases(page);
  const row = page.getByTestId(`case-row-${caseId}`);
  await expect(row).toBeVisible();
  await row.click();

  const trace = page.getByTestId('case-trace');
  await expect(trace.getByTestId('case-state')).toContainText(pending ? 'Chờ xác nhận' : /Cần bổ sung|Từ chối/);
  await expect(trace.getByTestId('trace-dag')).toContainText('Credit');
  await expect(trace.getByTestId('trace-dag')).toContainText('Compliance');
  await expect(trace.getByTestId('trace-dag')).toContainText('Validation');
  const tasks = trace.locator('[data-testid^="dag-task-"]');
  expect(await tasks.count()).toBeGreaterThanOrEqual(3);
  await expect(tasks.filter({ hasText: 'Xong' })).toHaveCount(await tasks.count());
  await expect(trace.getByTestId('trace-flow')).toContainText('Validation');
  await expect(trace.getByTestId('trace-flow').getByText(/challenge|không phát challenge/).first()).toBeVisible();
  await expect(trace.getByTestId('trace-tools')).toContainText('get_');
  if (pending) {
    await expect(trace.getByTestId('trace-decisions')).toContainText('Đang chờ người có thẩm quyền xác nhận');
    await expect(trace).toContainText(/Đề xuất phê duyệt/i);
  } else {
    await expect(trace.getByTestId('trace-stop-reason')).toContainText(/bổ sung hồ sơ|đề xuất từ chối/);
  }
  await expect(trace.getByTestId('trace-decisions')).toContainText('Credit');
  await expect(trace.getByTestId('trace-sources')).toContainText('Nguồn trích dẫn');

  // Người duyệt hiện bằng tên, không bao giờ bằng UUID; không tra được thì ghi "Không rõ".
  // Chỉ chèn sự kiện quyết định vào phản hồi events; tên được tra qua endpoint backend thật.
  const APPROVER_HO = '10000000-0000-4000-8000-000000000005';
  const UNKNOWN = '99999999-9999-4999-8999-999999999999';
  await page.route(`**/agent-cases/${caseId}/events*`, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    const list = Array.isArray(body) ? body : body.events;
    list.push(
      { id: 9_000_001, agent: 'hitl', type: 'approved', ts: 0, payload: { approver: APPROVER_HO } },
      { id: 9_000_002, agent: 'hitl', type: 'rejected', ts: 0, payload: { approver: UNKNOWN, reason: 'thử' } },
    );
    await route.fulfill({ response: res, json: body });
  });
  await page.reload();
  await openCases(page);
  await page.getByTestId(`case-row-${caseId}`).click();
  const decisions = page.getByTestId('case-trace').getByTestId('trace-decisions');
  await expect(decisions).toContainText('Người xác nhận: Không rõ');
  await expect(decisions).not.toContainText(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  await expect(decisions.getByText(/Người xác nhận: (?!Không rõ).+/)).toBeVisible();
});

test('tổng quan lấy số liệu thật từ trace', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.getByRole('link', { name: 'Bảng điều khiển agent' }).click();
  const overview = page.getByTestId('overview');
  await expect(overview).toContainText('Tổng case');
  await expect(overview).toContainText('Công cụ MCP đã gọi');
});

const NO_ACCESS: RoleKey[] = ['pheduyet'];
for (const role of NO_ACCESS) {
  test(`vai trò ${role} không thấy case của người khác`, async ({ page }) => {
    await loginAs(page, role);
    await openCases(page);
    await expect(page.getByText(/Chưa có case nào trong phạm vi của bạn/)).toBeVisible();
    await expect(page.locator('[data-testid^="case-row-"]')).toHaveCount(0);
  });
}
