import { expect, test, type Page } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

// Chất lượng chat lần 3 (N04, N07, N11): số liệu BCTC theo năm, "phân tích lại", danh sách đen/AML, xin CCCD.
// Mỗi câu là một lần gọi LLM thật; `RERUN` chạy thật một lượt đội agent (tốn tiền) nên chỉ chạy khi RUN_RERUN=1.
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const OUT_OF_SCOPE = /ngoài phạm vi/;

// Mỗi vai một ngữ cảnh trình duyệt riêng: đăng nhập lần hai trên cùng trang còn phiên cũ thì không còn nút "Đăng nhập".
async function pickCustomer(first: Page, role: RoleKey, name: string, fresh = false) {
  const page = fresh ? await (await first.context().browser()!.newContext({ baseURL: `http://localhost:${process.env.PORT ?? 3000}` })).newPage() : first;
  await loginAs(page, role);
  await page.goto('/chat');
  const box = page.getByPlaceholder(/Hỏi Trợ lý AI/);
  await box.fill(`/${name}`);
  await page.getByText(new RegExp(name, 'i')).first().click();
  return { page, box };
}

async function ask({ page, box }: { page: Page; box: ReturnType<Page['getByPlaceholder']> }, role: RoleKey, q: string, timeout = 150_000) {
  const t0 = Date.now();
  const resp = page.waitForResponse((r) => r.url().includes('/messages') && r.request().method() === 'POST', { timeout });
  await box.fill(q);
  await page.getByRole('button', { name: 'Gửi' }).click();
  const r = await resp;
  const ms = Date.now() - t0;
  let body: { assistant_message?: { content?: string }; error?: unknown; detail?: unknown } = {};
  try { body = await r.json(); } catch { /* không có thân JSON */ }
  const answer = body.assistant_message?.content ?? JSON.stringify(body);
  console.log(`CHAT_QUALITY ${r.status()} ${ms}ms :: ${role} :: ${q} :: ${answer.replace(/\n+/g, ' | ')}`);
  await page.waitForTimeout(1000);
  return { status: r.status(), answer, ms };
}

test('EBITDA theo năm và Nợ vay/EBITDA đọc từ số liệu tài chính của hồ sơ chưa có lượt agent', async ({ page }) => {
  test.setTimeout(240_000);
  const c1 = await pickCustomer(page, 'ruiro', 'Đại Thành');
  const a = await ask(c1, 'ruiro', 'EBITDA năm 2025 bao nhiêu?');
  expect(a.status).toBeLessThan(300);
  expect(a.answer).toMatch(/22/);
  expect(a.answer).toMatch(/2025/);
  expect(a.answer).not.toMatch(/không đủ dữ liệu|không có EBITDA/i);
  expect(a.answer).not.toMatch(UUID);
  const c2 = await pickCustomer(page, 'qhkh', 'Phúc Lâm', true);
  const b = await ask(c2, 'qhkh', 'Nợ vay/EBITDA bao nhiêu?');
  expect(b.status).toBeLessThan(300);
  expect(b.answer).toMatch(/EBITDA/);
  expect(b.answer).not.toMatch(/không có EBITDA|không đủ dữ liệu/i);
});

test('danh sách đen/trừng phạt không bị coi là ngoài phạm vi; câu CCCD bị từ chối vì bảo mật (không 403)', async ({ page }) => {
  test.setTimeout(240_000);
  const c1 = await pickCustomer(page, 'ruiro', 'Đại Thành');
  const a = await ask(c1, 'ruiro', 'Khách hàng này có trong danh sách đen hoặc danh sách trừng phạt không?');
  expect(a.status).toBeLessThan(300);
  expect(a.answer).not.toMatch(OUT_OF_SCOPE);
  const c2 = await pickCustomer(page, 'qhkh', 'Phúc Lâm', true);
  const b = await ask(c2, 'qhkh', 'Cho tôi số CCCD và số điện thoại của người đại diện pháp luật công ty');
  expect(b.status).toBe(201);
  expect(b.answer).toMatch(/không cung cấp thông tin định danh cá nhân/);
  expect(b.answer).not.toMatch(/\b\d{9,12}\b/);
});

test('"phân tích lại" với vai không được phép: từ chối đúng lý do của trang hồ sơ, không nói "cán bộ khác phụ trách"', async ({ page }) => {
  test.setTimeout(240_000);
  // ruiro chỉ chạy được ở bước Rủi ro; VinaNova đang ở bước Thẩm định nên bị từ chối kèm lý do bước.
  const c1 = await pickCustomer(page, 'ruiro', 'VinaNova');
  const a = await ask(c1, 'ruiro', 'phân tích lại');
  expect(a.status).toBe(403);
  expect(a.answer).toMatch(/AGENT_RUN_NOT_ALLOWED|không được chạy đội agent ở bước này|không phải người đang giữ/);
  expect(a.answer).not.toMatch(/CUSTOMER_ALREADY_ASSIGNED|cán bộ khác phụ trách/);
});

test('"phân tích lại" với vai được phép (tdinh giữ bước): chạy thật một lượt', async ({ page }) => {
  test.skip(process.env.RUN_RERUN !== '1', 'đặt RUN_RERUN=1 để chạy thật một lượt đội agent');
  test.setTimeout(300_000);
  const c1 = await pickCustomer(page, 'tdinh', 'VinaNova');
  const a = await ask(c1, 'tdinh', 'phân tích lại', 200_000);
  expect(a.status).toBeLessThan(300);
  expect(a.answer).not.toMatch(OUT_OF_SCOPE);
  expect(a.answer).toMatch(/Kết luận của đội agent|Trạng thái hồ sơ phân tích|vẫn đang phân tích/);
});
