import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

/**
 * Quét tiếp cận WCAG AA tự động trên mọi trang, cho 9 vai (stack thật).
 * Đo: tương phản chữ (1.4.3), vòng focus (1.4.11), tên truy cập của nút và ô nhập (4.1.2),
 * đúng một h1 và một main (1.3.1), cỡ chữ nhỏ nhất. Đặt A11Y_REPORT=1 để chỉ ghi bảng, không fail.
 * Bảng JSON ghi vào A11Y_OUT (mặc định /tmp/ua-nen-tiep-can/a11y.json).
 */
const REPORT_ONLY = process.env.A11Y_REPORT === '1';
const OUT = process.env.A11Y_OUT ?? '/tmp/ua-nen-tiep-can/a11y.json';
const ROLES: RoleKey[] = ['qhkh', 'httd', 'tdinh', 'ruiro', 'tuanthu', 'pheduyet', 'truongphong', 'kiemtoan', 'quantri'];
const STATIC_PAGES = ['/viec-cua-toi', '/de-xuat-vay', '/doi-chieu', '/nhat-ky-kiem-toan', '/tra-cuu-chinh-sach', '/chat', '/dashboard', '/thong-bao', '/khach-hang', '/khong-ton-tai'];
const MIN_FONT = 12;
const CHAT_MIN_FONT = 12;

interface Row { role: string; path: string; h1: number; main: number; minFont: number; contrastFails: string[]; unnamed: string[]; focusFails: string[]; }

async function measure(page: Page): Promise<Omit<Row, 'role' | 'path'>> {
  const base = await page.evaluate(() => {
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = (c: { r: number; g: number; b: number }) => {
      const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const over = (top: { r: number; g: number; b: number; a: number }, bot: { r: number; g: number; b: number }) => ({
      r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a),
    });
    const bgOf = (el: Element): { r: number; g: number; b: number } | null => {
      const chain: Element[] = [];
      for (let e: Element | null = el; e; e = e.parentElement) chain.push(e);
      let acc = { r: 255, g: 255, b: 255 };
      for (const e of chain.reverse()) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== 'none') return null; // gradient/ảnh: không đo được
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0) acc = over(c, acc);
      }
      return acc;
    };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
      }
      return true;
    };
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String((el as HTMLElement).className || '').toString().split(' ').slice(0, 2).join('.')}`.slice(0, 70);
    // 1. tương phản chữ + cỡ chữ nhỏ nhất
    let minFont = 99;
    const fails: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !(n.textContent ?? '').trim() || !visible(el)) continue;
      seen.add(el);
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || el.closest('.sr-only,[aria-hidden="true"],.skip-link')) continue;
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (fs < minFont) minFont = fs;
      if (el.closest('[disabled],[aria-disabled="true"],.ant-btn-disabled')) continue;
      const bg = bgOf(el);
      const fg = parse(cs.color);
      if (!bg || !fg) continue;
      const eff = over({ ...fg, a: fg.a * 1 }, bg);
      const r = ratio(eff, bg);
      const large = fs >= 24 || (fs >= 18.66 && Number(cs.fontWeight) >= 700);
      if (r < (large ? 3 : 4.5)) fails.push(`${r.toFixed(2)} ${label(el)} "${(n.textContent ?? '').trim().slice(0, 24)}"`);
    }
    // 2. tên truy cập
    const unnamed: string[] = [];
    for (const el of Array.from(document.querySelectorAll('button, [role="button"], a[href], input:not([type=hidden]), textarea, select, [role="tab"], [role="combobox"]'))) {
      if (!visible(el)) continue;
      const h = el as HTMLElement;
      let name = (h.getAttribute('aria-label') ?? '').trim() || (h.getAttribute('title') ?? '').trim();
      const lb = h.getAttribute('aria-labelledby');
      if (!name && lb) name = lb.split(' ').map((i) => document.getElementById(i)?.textContent ?? '').join('').trim();
      if (!name && (h as HTMLInputElement).labels?.length) name = Array.from((h as HTMLInputElement).labels ?? []).map((l) => l.textContent).join('').trim();
      if (!name) name = (h.innerText ?? '').trim() || (h.querySelector('img[alt]')?.getAttribute('alt') ?? '');
      if (!name && h.tagName === 'INPUT' && (h as HTMLInputElement).placeholder) name = 'placeholder';
      if (!name && el.closest('.ant-select') && el.closest('.ant-select')?.getAttribute('aria-label')) name = 'x';
      if (!name) unnamed.push(label(el));
    }
    return { h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main, [role="main"]').length, minFont, contrastFails: Array.from(new Set(fails)).slice(0, 12), unnamed: Array.from(new Set(unnamed)).slice(0, 12) };
  });
  return { ...base, focusFails: await focusRing(page) };
}

/** Tab qua tối đa 20 phần tử, đo tương phản vòng focus (outline hoặc box-shadow) với nền xung quanh. */
async function focusRing(page: Page): Promise<string[]> {
  const fails: string[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const res = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) return null;
      // Ô thật nằm trong vỏ vẽ vòng focus (Antd Select, Segmented, Input có tiền tố; ô tìm kiếm thanh trên đánh dấu data-focus-ring).
      const el = (active.closest('.ant-select, .ant-picker, .ant-segmented-item, .ant-input-affix-wrapper, [data-focus-ring]') as HTMLElement | null) ?? active;
      const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = (c: { r: number; g: number; b: number }) => { const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const cs = getComputedStyle(el);
      let bg = { r: 255, g: 255, b: 255 };
      for (let e: Element | null = el.parentElement; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.9) { bg = c; break; } }
      const cr = (c: { r: number; g: number; b: number }) => { const [x, y] = [lum(c), lum(bg)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const cands: { r: number; g: number; b: number; a: number }[] = [];
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) { const c = parse(cs.outlineColor); if (c) cands.push(c); }
      for (const s of cs.boxShadow.match(/rgba?\([^)]+\)\s+0px 0px 0px \d+px/g) ?? []) { const c = parse(s); if (c && c.a > 0.5) cands.push(c); }
      if (cs.borderTopStyle !== 'none' && el.matches('.ant-input, .ant-input-affix-wrapper, .ant-select, .ant-picker, input, textarea')) { const c = parse(cs.borderTopColor); if (c) cands.push(c); }
      const ring = cands.sort((p, q) => cr(q) - cr(p))[0] ?? null;
      if (!ring) return { name: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`, ratio: 0 };
      return { name: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`, ratio: cr(ring) };
    });
    if (res && res.ratio < 3) fails.push(`${res.ratio.toFixed(2)} ${res.name}`);
  }
  return Array.from(new Set(fails)).slice(0, 8);
}

const rows: Row[] = [];

test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

for (const role of ROLES) {
  test(`a11y quét mọi trang: ${role}`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await loginAs(page, role);
    const paths = [...STATIC_PAGES];
    for (const list of ['/viec-cua-toi', '/doi-chieu']) {
      await page.goto(list);
      await page.waitForLoadState('networkidle');
      const hrefs = await page.locator('a[href^="/ho-so-vay/"], a[href^="/doi-chieu/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') as string));
      for (const h of hrefs.slice(0, 1)) if (!paths.includes(h)) paths.push(h);
    }
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);
      const m = await measure(page);
      rows.push({ role, path, ...m });
    }
    // panel AI mở (nút "Trợ lý AI" ở thanh trên) — đo cỡ chữ và nhãn
    await page.goto('/viec-cua-toi');
    const ai = page.getByRole('button', { name: /Trợ lý|Hỏi/ }).first();
    if (await ai.count()) {
      await ai.click();
      await page.waitForTimeout(600);
      const m = await measure(page);
      rows.push({ role, path: 'panel-ai@/viec-cua-toi', ...m });
    }
  });
}

test('a11y: ghi bảng và kiểm ngưỡng', async () => {
  mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
  writeFileSync(OUT, JSON.stringify(rows, null, 1));
  const bad = rows.flatMap((r) => {
    const out: string[] = [];
    const isChat = r.path.startsWith('/chat') || r.path.startsWith('panel-ai');
    if (r.path !== '/khong-ton-tai' || true) {
      if (r.h1 !== 1) out.push(`h1=${r.h1}`);
      if (r.main !== 1) out.push(`main=${r.main}`);
    }
    if (r.minFont < (isChat ? CHAT_MIN_FONT : MIN_FONT)) out.push(`minFont=${r.minFont}`);
    if (r.contrastFails.length) out.push(`contrast:${r.contrastFails.join(' | ')}`);
    if (r.unnamed.length) out.push(`unnamed:${r.unnamed.join(' | ')}`);
    if (r.focusFails.length) out.push(`focus:${r.focusFails.join(' | ')}`);
    return out.length ? [`${r.role} ${r.path}: ${out.join('; ')}`] : [];
  });
  console.log(`A11Y rows=${rows.length} bad=${bad.length}\n${bad.slice(0, 60).join('\n')}`);
  if (!REPORT_ONLY) expect(bad, bad.join('\n')).toEqual([]);
});
