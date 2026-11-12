import { expect, test, type Page } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

/**
 * Vòng focus (WCAG 2.4.7, 1.4.11) của điều khiển form mà quét chung `a11y.spec.ts` không chạm tới trong 20 lần Tab:
 * Select và DatePicker ở Nhật ký, đoạn bộ lọc Việc của tôi, phân trang Quản trị, thẻ lựa chọn ở modal quyết định.
 * Tab tới đúng điều khiển rồi đo tương phản của vòng (outline hoặc box-shadow) với nền cha.
 */
const SHELL = '.ant-select, .ant-picker, .ant-segmented-item, .ant-input-affix-wrapper, .ant-pagination-item, .ant-pagination-prev, .ant-pagination-next, [data-focus-ring]';

async function ringAt(page: Page, targetSel: string, maxTabs = 60): Promise<{ ratio: number; name: string } | null> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate(([t, shell]) => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body || !(a.matches(t) || a.closest(t))) return null;
      const el = (a.closest(shell) as HTMLElement | null) ?? a;
      const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c: { r: number; g: number; b: number }) => { const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      let bg = { r: 255, g: 255, b: 255 };
      for (let e: Element | null = el.parentElement; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) { bg = c; break; } }
      const cr = (c: { r: number; g: number; b: number }) => { const [x, y] = [lum(c), lum(bg)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const cs = getComputedStyle(el);
      const cands: { r: number; g: number; b: number; a: number }[] = [];
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) { const c = parse(cs.outlineColor); if (c) cands.push(c); }
      for (const s of cs.boxShadow.match(/rgba?\([^)]+\)\s+0px 0px 0px \d+px/g) ?? []) { const c = parse(s); if (c && c.a > 0.5) cands.push(c); }
      const best = cands.sort((p, q) => cr(q) - cr(p))[0];
      return { ratio: best ? cr(best) : 0, name: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}` };
    }, [targetSel, SHELL] as const);
    if (hit) return hit;
  }
  return null;
}

async function as(page: Page, role: RoleKey) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await loginAs(page, role);
}

test('focus: Select và DatePicker ở Nhật ký kiểm toán', async ({ page }) => {
  await as(page, 'kiemtoan');
  await page.goto('/nhat-ky-kiem-toan');
  await page.waitForLoadState('networkidle');
  for (const sel of ['.ant-select', '.ant-picker']) {
    const r = await ringAt(page, sel);
    expect(r, sel).not.toBeNull();
    console.log(`FOCUS ${sel} ${r!.ratio.toFixed(2)} ${r!.name}`);
    expect(r!.ratio, sel).toBeGreaterThanOrEqual(3);
  }
});

test('focus: đoạn bộ lọc Việc của tôi', async ({ page }) => {
  await as(page, 'qhkh');
  await page.goto('/viec-cua-toi');
  await page.waitForLoadState('networkidle');
  const r = await ringAt(page, '.ant-segmented-item');
  expect(r).not.toBeNull();
  console.log(`FOCUS segmented ${r!.ratio.toFixed(2)} ${r!.name}`);
  expect(r!.ratio).toBeGreaterThanOrEqual(3);
});

test('focus: phân trang Quản trị', async ({ page }) => {
  await as(page, 'quantri');
  await page.goto('/quan-tri');
  await page.waitForLoadState('networkidle');
  const r = await ringAt(page, '.ant-pagination-item, .ant-pagination-next, .ant-pagination-prev', 80);
  if (!r) { console.log('FOCUS pagination: không có phân trang trên trang này'); return; }
  console.log(`FOCUS pagination ${r.ratio.toFixed(2)} ${r.name}`);
  expect(r.ratio).toBeGreaterThanOrEqual(3);
});

test('focus: thẻ lựa chọn ở modal quyết định và nút Đóng', async ({ page }) => {
  await as(page, 'pheduyet');
  await page.goto('/viec-cua-toi');
  await page.locator('a[href^="/ho-so-vay/"]').first().waitFor({ timeout: 15_000 }).catch(() => undefined);
  const href = await page.locator('a[href^="/ho-so-vay/"]').first().getAttribute('href').catch(() => null);
  test.skip(!href, 'không có hồ sơ');
  await page.goto(href!);
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.waitForTimeout(2500);
  const btn = page.getByRole('button', { name: 'Quyết định', exact: true }).first();
  test.skip(!(await btn.count()) || !(await btn.isEnabled()), 'nút Quyết định khóa ở hồ sơ này');
  await btn.click();
  await expect(page.getByRole('radiogroup', { name: 'Loại quyết định' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đóng', exact: true })).toBeVisible();
  const r = await ringAt(page, '.ant-modal input[type=radio]', 10);
  expect(r).not.toBeNull();
  console.log(`FOCUS thẻ lựa chọn ${r!.ratio.toFixed(2)} ${r!.name}`);
  expect(r!.ratio).toBeGreaterThanOrEqual(3);

  // Bước xác nhận từ chối: chữ nút đủ tương phản, focus ở "Quay lại", Tab không rơi ra ngoài hộp thoại.
  const dlg = page.getByRole('dialog');
  await dlg.getByRole('radiogroup', { name: 'Loại quyết định' }).getByText('Từ chối', { exact: true }).click();
  const rows = dlg.getByTestId('exception-row');
  for (let i = 0; i < (await rows.count()); i++) { await rows.nth(i).getByText('Chấp thuận').click(); await rows.nth(i).getByRole('textbox').fill('Chấp thuận ngoại lệ'); }
  await dlg.locator('#action-text').fill('Kiểm tra giao diện, không gửi.');
  await dlg.getByRole('button', { name: 'Ghi quyết định' }).click();
  await expect(dlg.getByTestId('decision-confirm')).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Quay lại' })).toBeFocused();
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/xac-nhan-tu-choi-sau.png` });
  const low = await dlg.evaluate((root) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => { const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const out: string[] = [];
    root.querySelectorAll('button').forEach((b) => {
      let bg = rgb(getComputedStyle(b).backgroundColor);
      for (let e: Element | null = b.parentElement; e && bg.length > 3 && bg[3] === 0; e = e.parentElement) bg = rgb(getComputedStyle(e).backgroundColor);
      if (bg.length > 3 && bg[3] === 0) bg = [255, 255, 255];
      const [x, y] = [lum(rgb(getComputedStyle(b).color)), lum(bg)].sort((p, q) => q - p);
      const ratio = (x + 0.05) / (y + 0.05);
      if (ratio < 4.5) out.push(`${(b.textContent ?? '').trim()}: ${ratio.toFixed(2)}`);
    });
    return out;
  });
  expect(low, 'nút trong hộp thoại có chữ thiếu tương phản').toEqual([]);
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), 'Tab rơi ra ngoài hộp thoại').toBe(true);
});
