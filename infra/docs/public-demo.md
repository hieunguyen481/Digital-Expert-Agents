# Link demo công khai

Mở hệ thống đang chạy trên máy này ra internet bằng một link `https://….trycloudflare.com` (Cloudflare quick tunnel, không cần tài khoản).

```bash
bash infra/scripts/public-demo.sh on    # dựng web bản cùng nguồn, bật proxy + tunnel, in link
bash infra/scripts/public-demo.sh url   # xem link đang mở
bash infra/scripts/public-demo.sh off   # tắt, đưa cấu hình về chỉ chạy local
```

Cách hoạt động:
- `edge` (Caddy, `infra/public/Caddyfile`) gom một cổng `localhost:8088`: `/` là web, `/api/*` là backend, `/realms/bank-ai/*` và `/resources/*` là Keycloak, các bucket MinIO cho URL ký sẵn. Realm `master` và trang quản trị Keycloak không đi qua proxy.
- `tunnel` (cloudflared) đưa `edge` ra internet.
- Keycloak không cố định hostname, nên `iss` của token theo địa chỉ người dùng gọi tới. Backend và engine nhận thêm các issuer trong `KEYCLOAK_EXTRA_ISSUERS`; chữ ký vẫn kiểm bằng JWKS nội bộ.
- Script thêm link vào `redirectUris`/`webOrigins` của client `bank-ai-frontend` và gỡ link cũ.

Giới hạn:
- Máy và Docker phải chạy trong lúc người khác truy cập. Link đổi mỗi khi tunnel được tạo lại (khởi động lại máy, `off` rồi `on`): chạy lại `on` và gửi link mới.
- Khi đang bật, URL ký sẵn của MinIO trỏ về link công khai: dùng link công khai để tải và xem tài liệu. Tắt trước khi chạy e2e.
- Quick tunnel của Cloudflare dành cho thử nghiệm, không có cam kết sẵn sàng. Cần link cố định thì tạo named tunnel bằng tài khoản Cloudflare.
