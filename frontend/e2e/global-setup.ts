import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

// Mỗi lượt e2e bắt đầu từ seed sạch: spec phụ thuộc trạng thái seed (đối chiếu, pipeline tài liệu) không bị lệch bởi lượt trước.
export default function globalSetup() {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
  // Thư sinh từ e2e không bao giờ vào hàng gửi email (ra hộp thư thật): tắt công tắc hàng gửi trước khi chạy.
  const off = process.env.E2E_EMAIL_OFF_CMD ?? `bash ${resolve(process.cwd(), '../infra/scripts/email-outbox.sh')} off`;
  try { execSync(off, { stdio: 'ignore', timeout: 60_000 }); } catch { /* không có stack (chạy cục bộ không DB) */ }
}
