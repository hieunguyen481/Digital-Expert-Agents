import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';

// M09: hỏi về hồ sơ đã có lượt phân tích phải trả lời dưới 20 giây (không chạy lại đội agent).
const QUESTIONS = [
  'DSCR của hồ sơ này là bao nhiêu và có đạt ngưỡng không?',
  'Nợ vay trên EBITDA của hồ sơ này là bao nhiêu?',
  'Cấp nào phê duyệt hồ sơ này, theo điều khoản nào của chính sách?',
];

test('chat về hồ sơ đã phân tích trả lời nhanh, thẻ kết quả không rỗng/không lộ mã', async ({ page }) => {
  test.setTimeout(300_000);
  await loginAs(page, 'tdinh');
  await page.goto('/chat');
  const box = page.getByPlaceholder(/Hỏi Trợ lý AI/);
  await box.fill('/VinaNova');
  await page.getByText(/VinaNova/i).first().click();
  const times: number[] = [];
  for (const q of QUESTIONS) {
    const t0 = Date.now();
    const resp = page.waitForResponse((r) => r.url().includes('/messages') && r.request().method() === 'POST', { timeout: 150_000 });
    await box.fill(q);
    await page.getByRole('button', { name: 'Gửi' }).click();
    const r = await resp;
    const ms = Date.now() - t0;
    await page.waitForTimeout(1500);
    const content = (await page.locator('#main-content').innerText()).slice(-1800);
    console.log(`CHAT_MS ${ms} :: ${q.slice(0, 40)} :: ${content.slice(-700).replace(/\n+/g, ' | ')}`);
    expect(content).not.toMatch(/Pending Approval|Needs Info|need_more_info|existing_obligations|loan_applications|transaction_summary|\bflag\b/);
    const body = await r.text();
    if (q.includes('điều khoản')) expect(body).toMatch(/3\.1/);
    expect(r.status()).toBeLessThan(300);
    times.push(ms);
    await page.waitForTimeout(500);
  }
  expect(Math.max(...times)).toBeLessThan(20_000);
});
