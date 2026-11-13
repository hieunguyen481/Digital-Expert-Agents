import { expect, test } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

// M09: hỏi về hồ sơ đã có lượt phân tích phải trả lời dưới 20 giây (không chạy lại đội agent).
// Vai chạy qua biến CHAT_ROLE (mặc định tdinh); câu chốt thẩm quyền chỉ hiện khi câu hỏi liên quan quyết định.
const ROLE = (process.env.CHAT_ROLE ?? 'tdinh') as RoleKey;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const QUESTIONS = [
  { q: 'Kết luận thẩm định gần nhất của VinaNova là gì?' },
  { q: 'Ai là người quyết định hồ sơ này?', authority: true },
  { q: 'DSCR của hồ sơ này là bao nhiêu và có đạt ngưỡng không?', short: true },
  { q: 'Nợ vay trên EBITDA của hồ sơ này là bao nhiêu?', short: true },
  { q: 'Cấp nào phê duyệt hồ sơ này, theo điều khoản nào của chính sách?', clause: true, authority: true },
  { q: 'Thời tiết Hà Nội hôm nay thế nào?', outOfScope: true },
];
const CLOSING = /Bạn không có thẩm quyền phê duyệt; chuyển hồ sơ cho người duyệt/;

test(`chat về hồ sơ đã phân tích (${ROLE}): 6 câu nhanh, không lộ mã, đúng loại câu`, async ({ page }) => {
  test.setTimeout(300_000);
  await loginAs(page, ROLE);
  await page.goto('/chat');
  const box = page.getByPlaceholder(/Hỏi Trợ lý AI/);
  await box.fill('/VinaNova');
  await page.getByRole('option', { name: /VinaNova/i }).first().click();
  const times: number[] = [];
  for (const item of QUESTIONS) {
    const t0 = Date.now();
    const resp = page.waitForResponse((r) => r.url().includes('/messages') && r.request().method() === 'POST', { timeout: 150_000 });
    await box.fill(item.q);
    await page.getByRole('button', { name: 'Gửi' }).click();
    const r = await resp;
    const ms = Date.now() - t0;
    await page.waitForTimeout(1500);
    const answer: string = (await r.json()).assistant_message?.content ?? '';
    const screen = (await page.locator('#main-content').innerText()).slice(-1800);
    console.log(`CHAT_MS ${ms} :: ${ROLE} :: ${item.q} :: ${answer.replace(/\n+/g, ' | ')}`);
    expect(r.status()).toBeLessThan(300);
    expect(answer.length).toBeGreaterThan(20);
    expect(answer).not.toMatch(UUID);
    expect(screen).not.toMatch(UUID);
    expect(screen).not.toMatch(/Pending Approval|Needs Info|need_more_info|existing_obligations|loan_applications|transaction_summary|\bflag\b/);
    if (item.clause) expect(answer).toMatch(/3\.1/);
    if (item.short) expect(answer.length).toBeLessThan(900);
    if (item.outOfScope) expect(answer).toMatch(/ngoài phạm vi/);
    if (!item.authority) expect(screen.split('Trợ lý AI').slice(-1)[0]).not.toMatch(CLOSING);
    expect(ms).toBeLessThan(20_000);
    times.push(ms);
    await page.waitForTimeout(500);
  }
  expect(Math.max(...times)).toBeLessThan(20_000);
});
