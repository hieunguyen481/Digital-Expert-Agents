import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';

export type RoleKey = 'qhkh' | 'httd' | 'tdinh' | 'ruiro' | 'tuanthu' | 'pheduyet' | 'pheduyet2' | 'kiemtoan' | 'quantri';

export const ACCOUNTS: Record<RoleKey, string> = {
  qhkh: 'credit.officer@example.local',
  httd: 'document.reviewer@example.local',
  tdinh: 'appraiser@example.local',
  ruiro: 'risk@example.local',
  tuanthu: 'compliance@example.local',
  pheduyet: 'approver@example.local',
  pheduyet2: 'approver2@example.local',
  kiemtoan: 'auditor@example.local',
  quantri: 'admin@example.local',
};

/** Mật khẩu seed đọc lúc chạy từ infra/.env.local; không ghi ra file hay log. */
function seedPassword(): string {
  if (process.env.SEED_USER_PASSWORD) return process.env.SEED_USER_PASSWORD;
  const text = readFileSync(resolve(process.cwd(), '../infra/.env.local'), 'utf8');
  const match = text.match(/^SEED_USER_PASSWORD=(.*)$/m);
  if (!match) throw new Error('Thiếu SEED_USER_PASSWORD trong infra/.env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

/** Đăng nhập Keycloak thật rồi chờ khung ứng dụng hiện ra. */
export async function loginAs(page: Page, role: RoleKey): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.locator('#username').fill(ACCOUNTS[role]);
  await page.locator('#password').fill(seedPassword());
  await page.locator('#kc-login').click();
  await page.waitForURL(/localhost:3000\/(?!login)/);
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
}
