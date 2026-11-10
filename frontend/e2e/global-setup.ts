import { execSync } from 'node:child_process';

// Mỗi lượt e2e bắt đầu từ seed sạch: spec phụ thuộc trạng thái seed (đối chiếu, pipeline tài liệu) không bị lệch bởi lượt trước.
export default function globalSetup() {
  const cmd = process.env.E2E_RESEED_CMD;
  if (cmd) execSync(cmd, { stdio: 'ignore', timeout: 240_000 });
}
