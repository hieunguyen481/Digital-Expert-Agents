/**
 * Bảng thuật ngữ tiếng Việt dùng chung cho dashboard, dấu vết agent và so sánh hiệu năng.
 * Tên riêng của agent (Planner, Credit, Compliance, Operations, Validation) giữ nguyên vì là tên vai trong hệ thống;
 * mô tả xung quanh dùng tiếng Việt dưới đây.
 */
export const TERM = {
  trace: 'Dấu vết agent',
  run: 'lượt phân tích',
  runs: 'Lượt phân tích',
  recentRuns: 'Lượt phân tích gần đây',
  totalRuns: 'Tổng lượt phân tích',
  challenge: 'Đối chất giữa các agent',
  plannerAssign: 'Planner giao việc cho đội agent',
  validationCheck: 'Validation kiểm chứng',
  toolCalls: 'Công cụ đã gọi',
  autoCalled: 'Agent tự gọi',
  compensated: 'Hệ thống gọi bù',
  decider: 'Người quyết định',
} as const;

const VENDOR: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', 'meta-llama': 'Meta', mistralai: 'Mistral', deepseek: 'DeepSeek', qwen: 'Qwen', 'x-ai': 'xAI',
};

/** Tên model dễ đọc: `openai/gpt-6-luna` -> `GPT-6 Luna, OpenAI`. Id không có nhà cung cấp được giữ nguyên. */
export function modelName(id: string | null | undefined): string {
  if (!id) return '—';
  const [vendor, ...rest] = id.split('/');
  if (rest.length === 0) return id;
  const parts = rest.join('/').split(/[-_]/).filter(Boolean);
  const cap = (p: string) => (/^gpt$/i.test(p) ? 'GPT' : p.charAt(0).toUpperCase() + p.slice(1));
  // "gpt-6" giữ gạch nối vì đó là tên phiên bản; các phần sau cách nhau bằng khoảng trắng.
  const head = /^gpt$/i.test(parts[0]) && parts[1] ? `${cap(parts[0])}-${parts[1]}` : cap(parts[0]);
  const tail = parts.slice(/^gpt$/i.test(parts[0]) && parts[1] ? 2 : 1).map(cap);
  return `${[head, ...tail].join(' ')}, ${VENDOR[vendor] ?? vendor}`;
}
