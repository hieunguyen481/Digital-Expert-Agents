import { defineConfig, devices } from '@playwright/test';

/** E2E chạy trên stack thật: Keycloak :8080, backend :8000, frontend dev :3000. */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  // Mọi spec dùng chung một DB seed; spec đổi trạng thái tự nạp lại seed (E2E_RESEED_CMD),
  // chạy song song thì lần nạp lại của file này phá dữ liệu file kia đang dùng.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
