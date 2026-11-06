# E2E trên stack thật

Cần stack đang chạy (Keycloak :8080, backend :8000) và đã seed. `npm run e2e` tự bật `npm run dev` ở cổng 3000 nếu chưa có.

- Tài khoản: `*@example.local` (credit.officer, document.reviewer, appraiser, risk, approver, auditor, admin). Mật khẩu đọc lúc chạy từ `SEED_USER_PASSWORD` (biến môi trường hoặc `infra/.env.local`), không ghi ra file.
- Mỗi test đăng nhập Keycloak thật, không lưu storage state.
- Lần đầu: `npx playwright install chromium`. Trên WSL thiếu thư viện hệ thống (`libnspr4`, `libnss3`, `libasound2`) thì cài bằng `sudo npx playwright install-deps chromium`.
