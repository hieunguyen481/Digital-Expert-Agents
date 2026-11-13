import { expect, test, type Page } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

// R01 (lần 6): Kiểm toán ("Việc của tôi") và Trưởng phòng ("Hồ sơ của phòng") bấm "Hỏi trợ lý về HSV-…" phải
// mở được chat gắn hồ sơ (POST /conversations không 403) và nhận trả lời chỉ đọc. Tốn LLM thật: 1 câu mỗi vai,
// thêm 1 câu "phân tích lại" của Kiểm toán để chứng minh không chạy được đội agent.
const POST_CONV = (r: { url(): string; request(): { method(): string } }) => /\/conversations$/.test(r.url()) && r.request().method() === 'POST';
const POST_MSG = (r: { url(): string; request(): { method(): string } }) => /\/conversations\/[^/]+\/messages$/.test(r.url()) && r.request().method() === 'POST';

async function openAndAsk(page: Page, role: RoleKey, question: string) {
  await loginAs(page, role);
  await page.goto('/viec-cua-toi');
  const button = page.getByRole('button', { name: /^Hỏi trợ lý về / }).first();
  await expect(button).toBeVisible({ timeout: 20_000 });
  const created = page.waitForResponse(POST_CONV, { timeout: 30_000 });
  await button.click();
  const conv = await created;
  expect(conv.status(), await conv.text()).toBeLessThan(300);
  const box = page.getByPlaceholder(/Hỏi về hồ sơ, chính sách/).last();
  const sent = page.waitForResponse(POST_MSG, { timeout: 150_000 });
  await box.fill(question);
  await page.getByRole('button', { name: 'Gửi' }).last().click();
  const r = await sent;
  const body = await r.json().catch(() => ({}));
  const answer: string = body.assistant_message?.content ?? JSON.stringify(body);
  console.log(`CHAT_READONLY ${r.status()} :: ${role} :: ${question} :: ${answer.replace(/\n+/g, ' | ')}`);
  return { status: r.status(), answer };
}

for (const role of ['kiemtoan', 'truongphong'] as RoleKey[]) {
  test(`${role}: mở chat gắn hồ sơ xem được và nhận trả lời chỉ đọc`, async ({ page }) => {
    test.setTimeout(240_000);
    const { status, answer } = await openAndAsk(page, role, 'Tóm tắt ngắn kết luận của đội agent về hồ sơ này.');
    expect(status).toBeLessThan(300);
    expect(answer.length).toBeGreaterThan(20);
  });
}

test('kiemtoan: "phân tích lại" không chạy lại đội agent', async ({ page }) => {
  test.setTimeout(240_000);
  const { status, answer } = await openAndAsk(page, 'kiemtoan', 'phân tích lại hồ sơ này');
  // Bị từ chối (4xx, có lý do) hoặc trả lời chỉ đọc; không được có kết quả của lượt phân tích mới.
  if (status < 300) expect(answer).not.toMatch(/Phân tích đa agent kết thúc|Ý kiến từng chuyên gia/);
  else expect(status).toBe(403);
});
