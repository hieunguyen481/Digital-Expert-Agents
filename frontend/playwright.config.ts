import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

/** E2E chạy trên stack thật: Keycloak :8080, backend :8000, frontend dev :3000. */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  fullyParallel: false,
  // Mọi spec dùng chung một DB seed; spec đổi trạng thái tự nạp lại seed (E2E_RESEED_CMD),
  // chạy song song thì lần nạp lại của file này phá dữ liệu file kia đang dùng.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
