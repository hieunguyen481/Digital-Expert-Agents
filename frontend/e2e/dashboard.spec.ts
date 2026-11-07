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
  } else {
    await expect(trace.getByTestId('trace-stop-reason')).toContainText(/bổ sung hồ sơ|đề xuất từ chối/);
  }
  await expect(trace.getByTestId('trace-decisions')).toContainText('Credit');
  await expect(trace.getByTestId('trace-sources')).toContainText('Nguồn trích dẫn');
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
    await expect(page.getByText(/Chưa có case nào\. Gửi/)).toBeVisible();
    await expect(page.locator('[data-testid^="case-row-"]')).toHaveCount(0);
  });
}
