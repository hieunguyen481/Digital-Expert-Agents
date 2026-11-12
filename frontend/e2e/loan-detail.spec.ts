import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

// Trang 02b (lát 10, 10b). Dữ liệu là dữ liệu seed (R__seed_sme_batch1.sql). Các test dùng chung hồ sơ seed nên nằm cùng
// một file, chạy tuần tự, và nạp lại seed khi xong (E2E_RESEED_CMD) vì Tờ trình tự lưu đổi dữ liệu.
const VINANOVA = '/ho-so-vay/75000000-0000-4000-8000-000000000001';

test.describe.configure({ mode: 'serial' });

test.afterAll(() => {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
});

test('tdinh: DSCR 1,34 (khai báo) và ≈1,76 (tính lại), mỗi số có nguồn', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(VINANOVA);
  const declared = page.getByTestId('metric-dscr-DECLARED');
  const recomputed = page.getByTestId('metric-dscr-RECOMPUTED');
  await expect(declared).toContainText('1,34');
  await expect(recomputed).toContainText('≈ 1,76');
  for (const cell of [declared, recomputed]) {
    await expect(cell.getByTestId('metric-source')).toContainText('Nguồn:');
    await expect(cell.getByTestId('metric-source').getByRole('link')).toBeVisible();
  }
  await expect(page.getByTestId('metric-row-dscr')).toContainText('≥');
});

test('mọi ô chỉ số trên 02b đều có nguồn', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(VINANOVA);
  const cells = page.locator('[data-testid^="metric-"][data-testid$="-DECLARED"], [data-testid^="metric-"][data-testid$="-RECOMPUTED"]');
  await expect(cells.first()).toBeVisible();
  const n = await cells.count();
  expect(n).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < n; i++) {
    const cell = cells.nth(i);
    await expect(cell.getByTestId('metric-source')).toContainText(/Nguồn: .+/);
    await expect(cell.getByTestId('metric-source').getByRole('link')).toHaveCount(1);
  }
});

test('tdinh: Tờ trình tự lưu và còn nguyên sau khi tải lại', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(VINANOVA);
  const box = page.locator('#memo-4');
  await expect(box).toBeVisible();
  const text = `Nhận định e2e ${Date.now()}`;
  await box.fill(text);
  await expect(page.getByTestId('memo-save-status')).toContainText('Đã tự lưu');
  await page.reload();
  await expect(page.locator('#memo-4')).toHaveValue(text);
  await expect(page.getByTestId('memo-pdf')).toBeVisible(); // khóa/mở theo bản chốt: xem MemoPanel.test.tsx
  await expect(page.getByRole('button', { name: 'Trình Rủi ro', exact: true })).toBeVisible();
});

test('ruiro: hồ sơ còn ở Thẩm định nên ngoài phạm vi, không thấy chỉ số lẫn bản nháp Tờ trình', async ({ page }) => {
  await loginAs(page, 'ruiro');
  await page.goto(VINANOVA);
  await expect(page.getByText('Hồ sơ đã chuyển cho người khác')).toBeVisible();
  await expect(page.locator('#memo-4')).toHaveCount(0);
  await expect(page.getByTestId('metric-dscr-DECLARED')).toHaveCount(0);
});

// Lát 11: VinaNova đi từ Thẩm định tới quyết định cấp 2 bằng đăng nhập Keycloak thật. Chạy sau các test trên (cùng hồ sơ seed).
test('VinaNova: Thẩm định → Trình Rủi ro → Ý kiến Rủi ro/Tuân thủ → Phê duyệt → quyết định', async ({ browser }) => {
  test.setTimeout(240_000);
  const open = async (role: RoleKey) => {
    const page = await (await browser.newContext()).newPage();
    await loginAs(page, role);
    await page.goto(VINANOVA);
    return page;
  };
  const dialog = (page: import('@playwright/test').Page) => page.getByRole('dialog');

  // 1. Thẩm định: điền Tờ trình, xử lý cờ chặn, Báo sớm cờ CIC (không đổi bước), rồi Trình Rủi ro.
  let page = await open('tdinh');
  // Chốt nguồn mâu thuẫn DSCR ở trang Đối chiếu (điều kiện của cổng Trình Rủi ro).
  await page.goto(VINANOVA.replace('/ho-so-vay/', '/doi-chieu/'));
  for (const code of ['dscr', 'debt', 'cfo']) {
    const conflict = page.getByTestId(`conflict-${code}`);
    await conflict.locator('input[type="radio"]').first().check({ force: true });
    await conflict.getByLabel('Lý do chốt nguồn').fill(`Chốt nguồn ${code} (e2e 11)`);
    await conflict.getByRole('button', { name: 'Chốt nguồn này' }).click();
    await expect(conflict).toContainText('Đã chốt nguồn');
  }
  // Xác nhận các trường AI điền/cần kiểm chứng (điều kiện của cổng Trình Rủi ro) bằng chính hàm xác nhận của trang Đối chiếu.
  const confirmed = await page.evaluate(async (loanId) => {
    const svc = await import('/src/features/reconciliation/reconciliationService.ts');
    const view = await svc.fetchReconciliation(loanId);
    let n = 0;
    for (const d of view.documents) {
      const detail = await svc.fetchReconDocument(loanId, d.document_id);
      for (const f of detail.fields) {
        if (f.verification_status === 'AI_PROPOSED' || f.verification_status === 'NEEDS_VERIFICATION') {
          await svc.confirmField(f.field_id, 'Đã đối chiếu với tài liệu gốc (e2e 11)');
          n++;
        }
      }
    }
    return n;
  }, '75000000-0000-4000-8000-000000000001');
  expect(confirmed).toBeGreaterThan(0);
  await page.goto(VINANOVA);
  for (const n of ['1', '2', '3', '4', '5', '6', '7']) {
    const box = page.locator(`#memo-${n}`);
    if (!(await box.inputValue()).trim()) await box.fill(`Nội dung e2e mục ${n}`);
  }
  await page.locator('#memo-7').blur();
  await expect(page.getByTestId('memo-save-status')).toContainText('Đã tự lưu');
  const handle = page.getByRole('button', { name: 'Xử lý cờ' });
  for (let left = await handle.count(); left > 0; left--) {
    await handle.first().click();
    await dialog(page).locator('#action-text').fill('Đã rà soát nguồn');
    await dialog(page).getByRole('button', { name: 'Đã xử lý' }).click();
    await expect(handle).toHaveCount(left - 1);
  }
  await page.getByRole('button', { name: 'Báo sớm Tuân thủ' }).click();
  await dialog(page).locator('#action-text').fill('Nghi vấn CIC khách tự nộp');
  await dialog(page).getByRole('button', { name: 'Gửi báo sớm' }).click();
  await expect(page.getByRole('button', { name: 'Đã báo sớm' })).toBeVisible();
  await expect(page.getByText('Đang thẩm định').first()).toBeVisible(); // Báo sớm không đổi bước
  await page.getByRole('button', { name: 'Trình Rủi ro', exact: true }).click();
  await expect(page.getByText('Chờ ý kiến rủi ro').first()).toBeVisible();
  await expect(page.getByText('Bản đã chốt lúc trình')).toBeVisible();
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('memo-pdf').click()]);
  expect(pdf.suggestedFilename()).toMatch(/^to-trinh-.*\.pdf$/);
  expect(fs.readFileSync((await pdf.path()) as string).subarray(0, 4).toString()).toBe('%PDF');

  // 2. Rủi ro ghi ý kiến; chưa đủ ý kiến Tuân thủ thì chưa trình được phê duyệt.
  page = await open('ruiro');
  await page.getByRole('button', { name: 'Ghi Ý kiến Rủi ro' }).click();
  await dialog(page).locator('#action-text').fill('Rủi ro: chấp nhận với điều kiện theo dõi DSCR');
  await dialog(page).getByRole('button', { name: 'Ghi ý kiến' }).click();
  await expect(page.getByTestId('opinion-RISK')).toBeVisible();
  const toApproval = page.getByRole('button', { name: 'Trình phê duyệt' });
  await expect(toApproval).toBeDisabled();
  await expect(toApproval).toHaveAttribute('title', /Chưa có Ý kiến/);

  // 3. Tuân thủ: kết luận cờ CIC (3 lựa chọn, bắt buộc lý do, không gợi ý trước) và ghi ý kiến.
  page = await open('tuanthu');
  await page.getByRole('button', { name: 'Kết luận cờ' }).click();
  await expect(dialog(page).getByRole('radio')).toHaveCount(3);
  await expect(dialog(page).getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(dialog(page).getByRole('button', { name: 'Kết luận', exact: true })).toBeDisabled();
  await dialog(page).getByRole('radio', { name: /Không có vấn đề/ }).check();
  await dialog(page).locator('#action-text').fill('Đã đối chiếu CIC trực tiếp, bản nộp hợp lệ');
  await dialog(page).getByRole('button', { name: 'Kết luận', exact: true }).click();
  await expect(page.getByTestId('flag-row').filter({ hasText: 'Kết luận Tuân thủ' })).toBeVisible();
  await page.getByRole('button', { name: 'Ghi ý kiến tuân thủ' }).click();
  await dialog(page).locator('#action-text').fill('Tuân thủ: không có vi phạm');
  await dialog(page).getByRole('button', { name: 'Ghi ý kiến' }).click();
  await expect(page.getByTestId('opinion-COMPLIANCE')).toBeVisible();

  // 4. Rủi ro trình phê duyệt; hồ sơ vào bước Phê duyệt.
  page = await open('ruiro');
  await page.getByRole('button', { name: 'Trình phê duyệt' }).click();
  await expect(page.getByText('Chờ phê duyệt').first()).toBeVisible();

  // 5. Cấp 2 quyết định, bắt buộc lý do.
  // Bước Phê duyệt giao cho cấp 2 ít việc đang mở nhất (routing); mở bằng người được giao.
  page = await open('pheduyet');
  await page.waitForLoadState('networkidle');
  if ((await page.getByTestId('actions-panel').count()) === 0) {
    await page.context().close();
    page = await open('pheduyet2');
    await expect(page.getByTestId('actions-panel')).toBeVisible();
  }
  await expect(page.getByTestId('e8-notice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Quyết định', exact: true }).click();
  await expect(dialog(page).getByRole('button', { name: 'Ghi quyết định' })).toBeDisabled();
  await dialog(page).locator('#action-text').fill('Đủ điều kiện, phê duyệt theo đề nghị');
  await dialog(page).getByRole('button', { name: 'Ghi quyết định' }).click();
  await page.getByRole('button', { name: /^Xác nhận phê duyệt/ }).click();
  await expect(page.getByText('Đã phê duyệt').first()).toBeVisible();
});
