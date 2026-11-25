import { expect, test, type Browser } from '@playwright/test';
import { loginAs } from './helpers';

const DECIDE = '/ho-so-vay/75000000-0000-4000-8000-000000000013';

/** Bảo đảm hồ sơ có một lượt đội agent: nếu chưa có, Trưởng phòng chạy một lượt thật (tốn LLM) rồi chờ kết thúc. */
async function ensureAgentRun(browser: Browser, path: string): Promise<void> {
  const ctx = await browser.newContext({ baseURL: `http://localhost:${process.env.PORT ?? 3000}` });
  const p = await ctx.newPage();
  try {
    await loginAs(p, 'truongphong');
    await p.goto(path);
    const run = p.getByTestId('run-agent-team');
    await expect(p.getByTestId('agent-run').or(p.getByTestId('agent-team-empty'))).toBeVisible({ timeout: 20_000 });
    if (!(await p.getByTestId('agent-run').isVisible()) && (await run.isVisible().catch(() => false))) await run.click();
    await expect(p.getByTestId('agent-run')).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => p.getByTestId('agent-run').getAttribute('data-state'), { timeout: 330_000, intervals: [5000] })
      .toMatch(/Pending Approval|Needs Info|Escalated|Completed|Rejected/);
  } finally { await ctx.close(); }
}

/** Đo các chỗ trình bày: màu hạn đối chiếu, khung tài liệu, tiêu đề cột, tên ô nhập chat, focus sau Esc ở trace. */
test('hạn đối chiếu: cùng ngày thì cùng ngưỡng màu, có ghi số ngày', async ({ page }) => {
  await loginAs(page, 'httd');
  await page.goto('/doi-chieu');
  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  const byDay = new Map<string, Set<string>>();
  for (const r of await rows.all()) {
    const chip = r.locator('td').last().locator('span').first();
    const text = (await chip.innerText()).trim();
    if (/tạm dừng|Không đặt hạn|Đã kết thúc/.test(text)) continue;
    expect(text).toMatch(/\d{2}\/\d{2}\/\d{4} · (còn \d+ ngày LV|hạn hôm nay|quá hạn hôm nay|quá hạn \d+ ngày LV|quá hạn từ \d{2}\/\d{2})/);
    const day = text.slice(0, 10);
    const cls = await chip.evaluate((e) => getComputedStyle(e).color);
    byDay.set(day, (byDay.get(day) ?? new Set()).add(cls));
  }
  for (const [, colors] of byDay) expect(colors.size).toBe(1);
});

test('tiêu đề cột số dùng chữ sans, ô số dùng chữ số bảng (v4: không còn mono)', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/viec-cua-toi');
  const th = page.locator('thead th', { hasText: 'Số tiền' }).first();
  await expect(th).toBeVisible();
  expect(await th.evaluate((e) => getComputedStyle(e).fontFamily)).not.toMatch(/mono/i);
  expect(await page.locator('tbody td', { hasText: /tỷ|triệu/ }).first().evaluate((e) => getComputedStyle(e).fontVariantNumeric)).toContain('tabular-nums');
});

test('ô nhập của chat có tên truy cập', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/chat');
  await expect(page.locator('textarea').first()).toHaveAttribute('aria-label', /Câu hỏi/);
});

test('Esc đóng ngăn kéo trace, focus về dòng đã mở', async ({ page, browser }) => {
  test.setTimeout(420_000);
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Dấu vết' }).click();
  const row = page.locator('[data-testid^="case-row-"]').first();
  if (!(await row.isVisible({ timeout: 5000 }).catch(() => false))) {
    await ensureAgentRun(browser, DECIDE);
    await page.reload();
    await page.getByRole('tab', { name: 'Dấu vết' }).click();
  }
  await expect(row).toBeVisible();
  const id = await row.getAttribute('data-testid');
  await row.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe(id);
});

const NO_LOWER = /^\p{Ll}/u;

test('00163: có câu "AI đề xuất", không mục nào bắt đầu bằng chữ thường, vs hay "— "', async ({ page, browser }) => {
  test.setTimeout(420_000);
  await ensureAgentRun(browser, DECIDE);
  await loginAs(page, 'pheduyet');
  await page.goto(DECIDE);
  const reco = page.getByTestId('agent-recommendation');
  await expect(reco).toBeVisible({ timeout: 20_000 });
  await expect(reco).toContainText('AI đề xuất');
  const items = await page.getByTestId('agent-team').locator('li').allInnerTexts();
  for (const t of items) {
    expect(t.trim(), `mục "${t}" bắt đầu bằng chữ thường`).not.toMatch(NO_LOWER);
    expect(t).not.toMatch(/ vs |— /);
  }
});

test('ngăn kéo trace: mục không bắt đầu bằng chữ thường', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Dấu vết' }).click();
  const row = page.locator('[data-testid^="case-row-"]').first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  const items = await page.getByRole('dialog').locator('li').allInnerTexts();
  for (const t of items) expect(t.trim(), `mục "${t}"`).not.toMatch(NO_LOWER);
});

test('Kiểm toán: không có nút "Sửa đề xuất" và không có "Việc của bạn"', async ({ page }) => {
  await loginAs(page, 'kiemtoan');
  await page.goto('/viec-cua-toi');
  await expect(page.getByRole('table').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Sửa đề xuất/ })).toHaveCount(0);
  await page.goto(DECIDE);
  await expect(page.getByTestId('loan-header')).toBeVisible();
  await expect(page.getByTestId('todo-panel')).toHaveCount(0);
  await expect(page.getByText('Việc của bạn')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Sửa đề xuất/ })).toHaveCount(0);
});

test('lưới 1920: ô tìm kiếm thẳng mép trái nội dung ở trang rộng và trang hẹp', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loginAs(page, 'httd');
  for (const path of ['/doi-chieu', '/thong-bao']) {
    await page.goto(path);
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    const search = await page.getByRole('combobox', { name: 'Tìm kiếm' }).evaluate((el) => el.closest('[role=search]')!.getBoundingClientRect().left);
    const head = await h1.evaluate((el) => el.getBoundingClientRect().left);
    expect(Math.abs(search - head), `${path}: ô tìm ${search}, tiêu đề ${head}`).toBeLessThanOrEqual(2);
  }
});

test('khung tải giữ menu và thanh trên khi hồ sơ người dùng chưa về', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.route('**/api/v1/me', async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });
  await page.reload();
  await expect(page.getByTestId('shell-loading')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link').first()).toBeVisible();
  await expect(page.locator('[role=search]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
});

test('OCR: tên tài liệu không còn tiền tố mã loại chữ hoa', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto('/doi-chieu/75000000-0000-4000-8000-000000000001');
  await expect(page.getByRole('region', { name: 'Danh mục tài liệu' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Tài liệu đang xem' })).toBeVisible();
  const raw = await page.locator('main').innerText();
  expect(raw).not.toMatch(/\b[A-Z]{3,6} ·/);
});

/** Văn phong: mọi khối chữ AI trên trang hồ sơ đi qua đường làm sạch chung, không lộ mã nội bộ hay viết tắt thô. */
const AI_BAD = /\bvs\b|##|compliance_policy|\bVND\b|:\s*$/m;
for (const [no, id] of [['00187', '000000000001'], ['00163', '000000000013'], ['00167', '000000000018']] as const) {
  test(`chữ AI sạch trên hồ sơ HSV-2026-${no}`, async ({ page }) => {
    await loginAs(page, 'truongphong');
    await page.goto(`/ho-so-vay/75000000-0000-4000-8000-${id}`);
    await expect(page.getByTestId('agent-team')).toBeVisible({ timeout: 20_000 });
    const blocks = page.locator('[data-testid="agent-team"], [data-testid="actions-panel"]');
    const lines = (await blocks.locator('p, li, b, span, h3').allInnerTexts()).flatMap((t) => t.split('\n').map((x) => x.trim())).filter(Boolean);
    for (const l of lines) expect(l, `dòng chữ AI: ${l}`).not.toMatch(AI_BAD);
  });
}

/** Lượt hoàn thiện cuối (lần 6): các chỗ trình bày đo được. */
test('403: không có nhãn tên trang mồ côi phía trên tiêu đề', async ({ page }) => {
  await loginAs(page, 'quantri');
  await page.goto('/viec-cua-toi');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toContainText('Không có quyền');
  const stray = await page.locator('main p').filter({ hasText: /^Việc của tôi$/ }).count();
  expect(stray).toBe(0);
});

test('khung tải có chữ gợi ý ở ô tìm và chỗ avatar', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.route('**/api/v1/me', async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });
  await page.reload();
  const skel = page.getByTestId('shell-search-skel');
  await expect(skel).toContainText('Tìm hồ sơ');
  await expect(page.getByTestId('shell-avatar-skel')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
});

test('Dashboard: ô lọc lượt nháp không xuống dòng; Document không ghi 0 trơ trọi', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  const rows = page.getByRole('table').filter({ hasText: 'Lượt tham gia' }).locator('tbody tr:not(.ant-table-measure-row)');
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  for (const r of await rows.all()) {
    const cells = await r.locator('td').allInnerTexts();
    if (/Document/.test(cells[0] ?? '') && Number(cells[2]?.replace(/\D/g, '') || 0) + Number(cells[3]?.replace(/\D/g, '') || 0) > 0) {
      expect(cells[1].trim(), `Document: ${cells.join(' | ')}`).not.toBe('0');
    }
  }
  await page.getByRole('tab', { name: 'Dấu vết' }).click();
  const box = page.getByTestId('trace-show-empty');
  if (await box.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const h = await box.evaluate((e) => e.getBoundingClientRect().height);
    expect(h).toBeLessThan(40);
  }
});

test('ngăn kéo trace: mỗi agent trong kế hoạch có heading h3', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Dấu vết' }).click();
  const row = page.locator('[data-testid^="case-row-"]').first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.locator('[data-testid^="dag-task-"]').first()).toBeVisible({ timeout: 20_000 });
  const tasks = await dlg.locator('[data-testid^="dag-task-"]').count();
  expect(tasks).toBeGreaterThan(0);
  expect(await dlg.locator('[data-testid^="dag-task-"] h3').count()).toBe(tasks);
  await expect(dlg.getByText('Planner (điều phối)').first()).toBeVisible();
});

test('Phê duyệt: kết luận AI gập danh sách việc bổ sung; ô số của modal có vòng focus 3px', async ({ page }) => {
  await loginAs(page, 'pheduyet');
  await page.goto(DECIDE);
  const cond = page.getByTestId('agent-conditions');
  if (await cond.count()) {
    expect(await cond.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);
  }
  await page.getByRole('button', { name: 'Quyết định', exact: true }).click();
  const amount = page.locator('#decision-amount');
  await expect(amount).toBeVisible();
  await amount.focus();
  const w = await page.locator('.ant-input-number-focused').first().evaluate((e) => getComputedStyle(e).outlineWidth);
  expect(w).toBe('3px');
});

test('đối chiếu: nút mở tài liệu không lặp tên mục và không còn "(minh họa)"', async ({ page }) => {
  await loginAs(page, 'httd');
  await page.goto('/doi-chieu/75000000-0000-4000-8000-000000000001');
  const list = page.getByRole('region', { name: 'Danh mục tài liệu' });
  await expect(list).toBeVisible();
  expect(await list.innerText()).not.toMatch(/minh họa/);
  for (const item of await list.locator('[data-testid^="item-"]').all()) {
    const label = (await item.locator('b').first().innerText()).trim().toLowerCase();
    for (const b of await item.locator('button[data-testid^="doc-"]').all()) {
      expect((await b.innerText()).trim().toLowerCase()).not.toBe(label);
    }
  }
});

test('Khách hàng: cột rủi ro không lặp "Chưa xếp hạng" ở mọi dòng', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/khach-hang');
  await expect(page.getByRole('table', { name: 'Khách hàng' })).toBeVisible();
  expect(await page.getByRole('table', { name: 'Khách hàng' }).getByText('Chưa xếp hạng', { exact: true }).count()).toBe(0);
});

/** Lần 6 (UN): dữ liệu trình diễn sạch và các chỗ trình bày đo được. */
const SEED_LOAN = '75000000-0000-4000-8000-000000000001';
const NO_TEST_TEXT = /e2e|\(dữ liệu mẫu\)|\(hư cấu\)/i;
test('hồ sơ seed: tờ trình và trang đối chiếu không còn chữ e2e, "(dữ liệu mẫu)", "(hư cấu)"', async ({ page }) => {
  await loginAs(page, 'tdinh');
  await page.goto(`/ho-so-vay/${SEED_LOAN}`);
  await expect(page.getByTestId('agent-team')).toBeVisible({ timeout: 20_000 });
  expect(await page.locator('main').innerText()).not.toMatch(NO_TEST_TEXT);
  await page.goto(`/doi-chieu/${SEED_LOAN}`);
  await expect(page.getByRole('region', { name: 'Danh mục tài liệu' })).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(NO_TEST_TEXT);
});

test('chi tiết khách hàng có khối "Hoạt động gần đây" với dòng thời gian', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/khach-hang');
  const table = page.getByRole('table', { name: 'Khách hàng' });
  await expect(table).toBeVisible();
  await table.getByRole('link').first().click();
  const card = page.getByTestId('customer-activity');
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.getByRole('heading', { name: 'Hoạt động gần đây' })).toBeVisible();
  expect(await card.locator('li').count()).toBeGreaterThan(0);
});

test('Dashboard: ghi chú trong bảng agent dùng chữ sans màu xám, không dùng mono', async ({ page }) => {
  await loginAs(page, 'truongphong');
  await page.goto('/dashboard');
  const notes = page.getByTestId('cell-note');
  if (await notes.count()) {
    const font = await notes.first().evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font).toMatch(/Be Vietnam Pro/);
  }
});

/** Toàn văn ngăn kéo dấu vết của mọi hồ sơ trình diễn có lượt chạy: không lộ chuỗi cổng, biệt ngữ hay tên agent viết thường. */
test('ngăn kéo trace: toàn văn không còn chuỗi cổng thô, "chặn", "challenge", tên agent viết thường', async ({ page }) => {
  test.setTimeout(240_000);
  await loginAs(page, 'qhkh');
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Dấu vết' }).click();
  const rows = page.locator('[data-testid^="case-row-"]');
  await expect(rows.first()).toBeVisible({ timeout: 60_000 });
  const n = Math.min(await rows.count(), 6);
  for (let i = 0; i < n; i += 1) {
    await rows.nth(i).click();
    const drawer = page.locator('.ant-drawer-body');
    await expect(drawer.getByTestId('trace-decisions')).toBeVisible({ timeout: 20_000 });
    const text = await drawer.innerText();
    expect(text, `ngăn kéo ${i}: nhãn cổng viết hoa`).not.toMatch(/CẦN BỔ SUNG|TỪ CHỐI:|CHUYỂN CẤP:/);
    expect(text, `ngăn kéo ${i}: biệt ngữ`).not.toMatch(/\bchặn\b|\bchallenge\b/i);
    expect(text, `ngăn kéo ${i}: số thập phân dấu chấm`).not.toMatch(/(?:tối đa|ngưỡng|DSCR\s*[=≥]?)\s*\d\.\d/);
    expect(text, `ngăn kéo ${i}: 0,0 tỷ`).not.toMatch(/(?<![\d.,])0,0 tỷ/);
    expect(text, `ngăn kéo ${i}: tên agent viết thường giữa câu`).not.toMatch(/(?<![\p{L}_.])(credit|compliance|operations|document|validation|planner)(?![\p{L}_.])/u);
    expect(text, `ngăn kéo ${i}: 0,0 tỷ`).not.toMatch(/\b0(?:,0)? tỷ\b/);
    expect(text, `ngăn kéo ${i}: nhãn lặp "X: X:"`).not.toMatch(/(\p{L}[^\n:]{3,60}): \1:/u);
    expect(text, `ngăn kéo ${i}: dòng bắt đầu bằng dấu phẩy`).not.toMatch(/^\s*,/m);
    expect(text, `ngăn kéo ${i}: "cấp Cấp"`).not.toMatch(/\bcấp Cấp\b/);
    expect(text, `ngăn kéo ${i}: dấu nghìn kiểu Anh`).not.toMatch(/\d,\d{3}(?:,\d{3})* (?:tỷ|đồng)/);
    expect(text, `ngăn kéo ${i}: biệt ngữ vận hành`).not.toMatch(/sau cấp TD|checkpoint|\bSLA\b|SME KHDN SME/i);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  }
});

/** S04: mở panel Trợ lý AI ở trang chi tiết hồ sơ thì panel gắn đúng hồ sơ đang xem. */
test('trang hồ sơ: panel Trợ lý AI gắn đúng hồ sơ đang xem', async ({ page }) => {
  await loginAs(page, 'truongphong');
  await page.goto('/ho-so-vay/75000000-0000-4000-8000-000000000001');
  await expect(page.getByTestId('agent-team')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Trợ lý AI' }).first().click();
  await expect(page.getByRole('complementary', { name: 'Trợ lý AI' })).toContainText('HSV-2026-00187');
});

/** Vòng 8, việc 8: cột "Mức rủi ro" chỉ hiện khi trang có ít nhất một khách đã xếp hạng. */
test('Khách hàng: không có xếp hạng nào thì ẩn cả cột Mức rủi ro, giữ ghi chú', async ({ page }) => {
  await loginAs(page, 'qhkh');
  await page.goto('/khach-hang');
  const table = page.getByRole('table', { name: 'Khách hàng' });
  await expect(table).toBeVisible();
  const hasCol = (await table.getByRole('columnheader', { name: 'Mức rủi ro' }).count()) > 0;
  const note = await page.getByText('Chưa khách hàng nào trên trang này có xếp hạng rủi ro.').count();
  // Cột hiện thì không có ghi chú; ghi chú chỉ khi không khách nào có xếp hạng (ít khách có xếp hạng thì ẩn cột, không ghi chú)
  if (hasCol) expect(note).toBe(0);
});

/** Vòng 9: quét toàn văn theo LOẠI lỗi (không theo từng câu): từ in hoa đầu câu ngoài danh sách viết tắt, ".;", "VND" trong khối AI. */
const KEEP_CAPS = new Set(['CIC', 'AML', 'KYC', 'KYB', 'BCTC', 'DSCR', 'LTV', 'EBITDA', 'SME', 'TSĐB', 'TCTD', 'OCR', 'AI', 'VND', 'HSV', 'LA', 'CS', 'TD', 'HĐTD', 'KHDN', 'CCCD', 'NHNN', 'TT', 'QĐ', 'ID', 'PDF', 'DTI', 'GPKD', 'VAT', 'II', 'III', 'IV', 'HM', 'EMP', 'CIF', 'DEMO', 'SLA', 'SHB', 'ICR', 'HĐQT', 'CMND', 'PEP', 'UBND', 'MST', 'TNHH', 'CP', 'NPL', 'ROE', 'ROA', 'CEO', 'HSTD', 'QHKH', 'HTTD', 'API']);
export function shoutingStarts(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.split(/(?:^|[\n.!?:]\s+)/u)) {
    const first = sentence.trim().split(/\s+/)[0]?.replace(/[^\p{L}\d-]/gu, '') ?? '';
    if (first.length >= 2 && /\p{L}/u.test(first) && first === first.toLocaleUpperCase('vi') && first !== first.toLocaleLowerCase('vi')
      && !KEEP_CAPS.has(first) && !/\d|-/.test(first)) out.push(first);
  }
  return out;
}
for (const [no, id] of [['00187', '000000000001'], ['00163', '000000000013'], ['00167', '000000000018']] as const) {
  test(`quét toàn văn khối AI, ngăn kéo và panel của HSV-2026-${no}`, async ({ page }) => {
    await loginAs(page, 'truongphong');
    await page.goto(`/ho-so-vay/75000000-0000-4000-8000-${id}`);
    await expect(page.getByTestId('agent-team')).toBeVisible({ timeout: 20_000 });
    const texts: Record<string, string> = {};
    texts.chiTiet = await page.locator('[data-testid="agent-team"], [data-testid="actions-panel"]').allInnerTexts().then((a) => a.join('\n'));
    await page.getByRole('button', { name: 'Trợ lý AI' }).first().click();
    texts.panel = await page.getByRole('complementary', { name: 'Trợ lý AI' }).innerText();
    for (const [k, t] of Object.entries(texts)) {
      expect(shoutingStarts(t), `${k}: từ in hoa đầu câu`).toEqual([]);
      expect(t, `${k}: ".;"`).not.toMatch(/\.\s*;|\.\./);
      expect(t, `${k}: VND`).not.toMatch(/\bVND\b/);
    }
  });
}

test('tra cứu chính sách: nút xóa từ khóa có tên truy cập', async ({ page }) => {
  await loginAs(page, 'httd');
  await page.goto('/tra-cuu-chinh-sach');
  await page.getByLabel('Tìm điều khoản').fill('DSCR');
  await expect(page.locator('button.ant-input-clear-icon')).toHaveAttribute('aria-label', 'Xóa từ khóa');
});
