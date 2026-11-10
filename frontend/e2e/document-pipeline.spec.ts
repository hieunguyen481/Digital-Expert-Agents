import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { type RoleKey } from './helpers';
import { as, createProposal, httdChecksAndTransfers } from './flow-helpers';

// Lát 8: QHKH tải PDF thật lên trang 05 (/documents/uploads -> MinIO -> outbox -> Kafka -> worker), HTTD nhận bổ sung
// rồi thấy trường AI đề xuất có vùng tô đúng trang. Chạy trên stack thật có worker; nạp lại seed khi xong.
const API = 'http://localhost:8000/api/v1';
// L15: hồ sơ riêng do chính test tạo (LA-…, bị reset dọn), không ghi lên hồ sơ demo HSV-2026-00196.
let LOAN = '';
const SENT = '75000000-0000-4000-8000-000000000009'; // đã chuyển Hậu kiểm: QHKH không được tải

test.describe.configure({ mode: 'serial' });
test.beforeEach(async ({ page, browser }) => {
  test.setTimeout(300_000);
  LOAN = await createProposal(page, 'doc-pipeline');
  await httdChecksAndTransfers(page, LOAN, 'doc-pipeline');
  const tdinh = await bearer(browser, 'tdinh');
  const headers = { authorization: tdinh.auth };
  const view = await (await tdinh.request.get(`${API}/loan-applications/${LOAN}/reconciliation`, { headers })).json();
  const ask = await tdinh.request.post(`${API}/loan-applications/${LOAN}/transitions`, {
    headers, data: { action: 'request_info', reason: 'Cần bản scan hồ sơ pháp lý mới nhất.', expected_version: view.transfer.expected_version },
  });
  expect(ask.status(), await ask.text()).toBe(200); // Thẩm định yêu cầu bổ sung: QHKH giữ, HTTD nhận lại
  await tdinh.page.context().close();
});
test.afterEach(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

/** Đăng nhập thật rồi lấy bearer từ chính request của ứng dụng (token chỉ nằm trong bộ nhớ trình duyệt). */
async function bearer(browser: Browser, role: RoleKey): Promise<{ auth: string; request: Page['request']; page: Page }> {
  const context = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? 3000}` });
  const page = await context.newPage();
  const seen = page.waitForRequest((r) => r.url().startsWith(API) && !!r.headers().authorization);
  await as(page, role);
  await page.goto('/cong-viec');
  return { auth: (await seen).headers().authorization, request: page.request, page };
}

async function uploadViaUi(page: Page, file: string): Promise<string> {
  await as(page, 'qhkh');
  await page.goto(`/doi-chieu/${LOAN}`);
  await expect(page.getByRole('button', { name: 'Tải tài liệu bổ sung' })).toBeEnabled();
  const done = page.waitForResponse((r) => /\/documents\/uploads\/[^/]+\/complete$/.test(r.url()));
  await page.getByTestId('recon-upload').setInputFiles(resolve(process.cwd(), 'e2e/fixtures', file));
  const documentId = (await (await done).json()).document_id as string;
  await expect(page.getByTestId('page-frame').or(page.getByTestId('processing-progress'))
    .or(page.getByTestId('processing-error')).first()).toBeVisible({ timeout: 60_000 });
  return documentId;
}

async function httdAcceptsAndOpens(browser: Browser, documentId: string): Promise<Page> {
  const httd = await bearer(browser, 'httd');
  const headers = { authorization: httd.auth };
  const view = await (await httd.request.get(`${API}/loan-applications/${LOAN}/reconciliation`, { headers })).json();
  const accept = await httd.request.post(`${API}/loan-applications/${LOAN}/transitions`, {
    headers, data: { action: 'accept_info', expected_version: view.transfer.expected_version },
  });
  expect(accept.status(), await accept.text()).toBe(200); // chuyển bước: HTTD ghi nhận bổ sung
  const page = httd.page; // đã đăng nhập HTTD trong ngữ cảnh riêng
  await page.goto(`/doi-chieu/${LOAN}`);
  await page.getByTestId(`doc-${documentId}`).click();
  return page;
}

test('qhkh tải PDF thật lên, httd thấy trường AI đề xuất có vùng tô đúng trang 2', async ({ page, browser }) => {
  test.setTimeout(300_000);
  const documentId = await uploadViaUi(page, 'ho-so-lat-tam.pdf');
  const hp = await httdAcceptsAndOpens(browser, documentId);
  const frame = hp.getByTestId('page-frame');
  await expect(frame).toBeVisible({ timeout: 180_000 });
  await expect(hp.getByTestId('processing-progress')).toHaveCount(0, { timeout: 180_000 });
  await expect(hp.getByTestId('source-note')).toContainText('tải lên');
  const regions = frame.locator('[data-testid^="region-"]');
  await expect(regions.first()).toBeVisible({ timeout: 60_000 });
  await expect(frame).toHaveAttribute('aria-label', 'Trang 2');
  // Nhãn của vùng kề (L06) có thể phủ lên tâm vùng đầu; người dùng bấm nhãn vẫn chọn được vùng đó, nên gửi sự kiện thẳng.
  await regions.first().dispatchEvent('click');
  await expect(hp.getByTestId('field-card')).toContainText(/chờ xác nhận|AI đề xuất/i);
  const box = (await regions.first().boundingBox())!;
  const fbox = (await frame.boundingBox())!;
  expect(box.y).toBeGreaterThan(fbox.y + fbox.height * 0.05);
});

test('qhkh tải PDF scan (ảnh, không lớp chữ): OCR đọc ra trường AI đề xuất có vùng tô', async ({ page, browser }) => {
  test.setTimeout(300_000);
  const documentId = await uploadViaUi(page, 'scan-ho-so-lat-tam.pdf');
  const hp = await httdAcceptsAndOpens(browser, documentId);
  const frame = hp.getByTestId('page-frame');
  await expect(frame).toBeVisible({ timeout: 180_000 });
  await expect(hp.getByTestId('processing-progress')).toHaveCount(0, { timeout: 180_000 });
  await expect(hp.getByTestId('processing-error')).toHaveCount(0);
  const regions = frame.locator('[data-testid^="region-"]');
  await expect(regions.first()).toBeVisible({ timeout: 60_000 });
  await regions.first().dispatchEvent('click');
  await expect(hp.getByTestId('field-card')).toContainText(/chờ xác nhận|AI đề xuất/i);
});

test('PDF không có lớp chữ: tài liệu thất bại, giao diện báo lỗi, không treo', async ({ page, browser }) => {
  test.setTimeout(300_000);
  const documentId = await uploadViaUi(page, 'scan-khong-chu.pdf');
  const hp = await httdAcceptsAndOpens(browser, documentId);
  await expect(hp.getByTestId('processing-error')).toContainText('PDF không có lớp chữ', { timeout: 180_000 });
});

test('qhkh không tải được khi hồ sơ đã chuyển: nút khóa kèm câu lý do, API trả 403 không phải 500', async ({ page, browser }) => {
  await as(page, 'qhkh');
  await page.goto(`/doi-chieu/${SENT}`);
  await expect(page.getByRole('button', { name: 'Tải tài liệu bổ sung' })).toBeDisabled();
  await expect(page.getByTestId('upload-lock')).toHaveText('Hồ sơ đã chuyển Thẩm định');
  const qhkh = await bearer(browser, 'qhkh');
  const view = await (await qhkh.request.get(`${API}/loan-applications/${SENT}/reconciliation`, {
    headers: { authorization: qhkh.auth },
  })).json();
  const res = await qhkh.request.post(`${API}/documents/uploads`, {
    headers: { authorization: qhkh.auth, 'Idempotency-Key': crypto.randomUUID() },
    data: {
      customer_id: view.customer_id, loan_application_id: SENT, original_filename: 'x.pdf',
      expected_mime_type: 'application/pdf', expected_size_bytes: 10, expected_sha256: 'a'.repeat(64),
    },
  });
  expect(res.status()).toBe(403);
  expect(JSON.stringify(await res.json())).toContain('Hồ sơ đã chuyển Thẩm định');
});
