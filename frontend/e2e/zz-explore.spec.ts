import { expect, test } from '@playwright/test';
import { loginAs } from './helpers';
test('explore', async ({ page }) => {
  test.setTimeout(420000);
  await loginAs(page, 'tdinh');
  await page.goto('/ho-so-vay/75000000-0000-4000-8000-000000000002');
  const panel = page.getByTestId('agent-team');
  await panel.getByTestId('run-agent-team').click();
  await expect(panel.getByTestId('agent-run')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: '/tmp/p13shots/run-start.png', fullPage: true });
  console.log('BTN', await panel.getByTestId('run-agent-team').isDisabled());
  await expect.poll(async () => panel.getByTestId('agent-run').getAttribute('data-state'), { timeout: 360000, intervals: [3000] }).toMatch(/Pending|Needs|Escal|Reject|Complet/);
  await page.screenshot({ path: '/tmp/p13shots/run-end.png', fullPage: true });
  console.log('PANEL', await panel.innerText());
});
