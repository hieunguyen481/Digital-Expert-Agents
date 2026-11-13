import { expect, test } from '@playwright/test';
import { createProposal } from './flow-helpers';

// S14: khách đã có hồ sơ vay khác, mở "Trợ lý AI" trên hồ sơ mới và hỏi "Hồ sơ này còn thiếu gì để trình?":
// trả lời phải nói về hồ sơ đang mở (nêu mã của nó), không lấy số tiền/kỳ hạn của hồ sơ kia. 1 câu LLM thật.
test('qhkh: hồ sơ thứ hai của khách, trợ lý trả lời về hồ sơ đang mở', async ({ page }) => {
  test.setTimeout(300_000);
  const amountBillion = 3.7; // khác hẳn số tiền các hồ sơ seed của khách
  const id = await createProposal(page, 'chat-second-loan', 'Mekong Flex', amountBillion);
  const loanResp = page.waitForResponse((r) => r.url().includes(id) && r.request().method() === 'GET'
    && (r.headers()['content-type'] ?? '').includes('json'), { timeout: 30_000 });
  await page.goto(`/de-xuat-vay/${id}`);
  const loan = await (await loanResp).json();
  const number: string = loan.application_number ?? loan.loan?.application_number ?? '';
  expect(number, 'mã hồ sơ mới').toMatch(/\S/);

  await page.goto('/viec-cua-toi');
  const ask = page.getByRole('button', { name: new RegExp(`^Hỏi trợ lý về .*${number.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`) }).first();
  await expect(ask).toBeVisible({ timeout: 20_000 });
  await ask.click();
  const box = page.getByPlaceholder(/Hỏi về hồ sơ, chính sách/).last();
  const resp = page.waitForResponse((r) => /\/conversations\/[^/]+\/messages$/.test(r.url()) && r.request().method() === 'POST', { timeout: 150_000 });
  await box.fill('Hồ sơ này còn thiếu gì để trình?');
  await page.getByRole('button', { name: 'Gửi' }).last().click();
  const r = await resp;
  expect(r.ok(), await r.text()).toBe(true);
  const answer: string = (await r.json()).assistant_message.content;
  console.log(`CHAT_SECOND_LOAN ${number} :: ${answer.replace(/\n+/g, ' | ')}`);
  expect(answer, 'nêu mã hồ sơ đang mở').toContain(number);
});
