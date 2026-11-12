import { expect, test } from '@playwright/test';
import { loginAs, type RoleKey } from './helpers';

// P03: "Hỏi trợ lý về <hồ sơ>" phải gắn đúng hồ sơ và khách hàng của dòng đang mở; mở lần lượt hai hồ sơ
// khác khách thì câu trả lời nói đúng tên khách của từng hồ sơ (không dùng lại hội thoại của khách khác).
// Tốn LLM thật: 2 vai x 2 hồ sơ = 4 câu.
for (const role of ['tdinh', 'pheduyet'] as RoleKey[]) {
  test(`${role}: Hỏi trợ lý gắn đúng khách của từng hồ sơ`, async ({ page }) => {
    test.setTimeout(240_000);
    await loginAs(page, role);
    await page.goto('/viec-cua-toi');
    const buttons = page.getByRole('button', { name: /^Hỏi trợ lý về / });
    await expect(buttons.first()).toBeVisible({ timeout: 20_000 });
    const labels = await buttons.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
    const rows = await page.locator('tbody tr').evaluateAll((els) => els.map((e) => e.textContent ?? ''));
    expect(labels.length).toBeGreaterThanOrEqual(2);

    // Chọn hai hồ sơ khác khách: lấy tên khách từ chip sau khi mở.
    const seen = new Map<string, string>(); // tên khách -> nhãn nút
    for (const label of labels) {
      if (seen.size >= 2) break;
      await page.getByRole('button', { name: label }).first().click();
      const chip = page.getByTestId('ai-context-chip');
      await expect(chip).toBeVisible();
      const name = ((await chip.innerText()).split('·')[1] ?? '').trim();
      if (name && !seen.has(name)) seen.set(name, label);
      await page.getByRole('button', { name: 'Đóng Trợ lý AI' }).click();
    }
    expect(seen.size, `hai khách khác nhau trong ${rows.length} dòng`).toBe(2);

    for (const [name, label] of seen) {
      await page.getByRole('button', { name: label }).first().click();
      const token = name.split(/\s+/).pop()!.replace(/[^\p{L}\p{N}]/gu, '');
      const box = page.getByPlaceholder(/Hỏi về hồ sơ, chính sách/).last();
      const resp = page.waitForResponse((r) => /\/conversations\/[^/]+\/messages$/.test(r.url()) && r.request().method() === 'POST', { timeout: 120_000 });
      await box.fill('EBITDA năm 2025 của khách hàng trong hồ sơ này là bao nhiêu?');
      await page.getByRole('button', { name: 'Gửi' }).last().click();
      const r = await resp;
      expect(r.ok(), await r.text()).toBe(true);
      const body = await r.json();
      expect(body.assistant_message.content, `trả lời cho ${label}`).toContain(token);
      await page.getByRole('button', { name: 'Đóng Trợ lý AI' }).click();
    }
  });
}
