const LOAN_CODE = /\s*\bLA-\d{8}-[0-9A-Fa-f]{8}\b/g;
const SAMPLE_SUFFIX = /\s*\((?:dữ liệu mẫu|mẫu)\)/gi;

const ANY_LOAN_CODE = /\b(?:LA-\d{8}-[0-9A-Fa-f]{8}|HSV-\d{4}-\d{3,})\b/;

/** Mã hồ sơ xuất hiện trong tiêu đề hoặc nội dung thô của thông báo (tiêu đề trước), hoặc null. Chịu được chuỗi rỗng và undefined. */
export function loanCodeIn(...texts: Array<string | null | undefined>): string | null {
  for (const t of texts) {
    const m = typeof t === 'string' ? t.match(ANY_LOAN_CODE) : null;
    if (m) return m[0];
  }
  return null;
}

/** Tiêu đề thông báo luôn kèm mã hồ sơ để phân biệt các dòng cùng loại; không có mã trong dữ liệu thì giữ nguyên. */
export function titleWithCode(cleanTitle: string, code: string | null): string {
  return code && !cleanTitle.includes(code) ? `${cleanTitle} · ${code}` : cleanTitle;
}

/** Bỏ mã kỹ thuật của hồ sơ, hậu tố "(dữ liệu mẫu)" và dấu chấm thừa khỏi câu thông báo. */
export function cleanNotificationText(text: string): { text: string; sample: boolean } {
  const sample = SAMPLE_SUFFIX.test(text);
  SAMPLE_SUFFIX.lastIndex = 0;
  const out = text
    .replace(LOAN_CODE, '')
    .replace(SAMPLE_SUFFIX, '')
    .replace(/\.{2,}(?!\.)/g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/:$/, '')
    .trim();
  return { text: out, sample };
}

interface Groupable { id: string; title: string; message: string; status: string; resource_id: string | null }

/** Gộp các thông báo trùng (cùng tiêu đề, nội dung đã làm sạch và hồ sơ) thành một dòng có số lần. */
export function groupNotifications<T extends Groupable>(items: T[]): Array<{ head: T; ids: string[]; count: number; unread: boolean; title: string; message: string; sample: boolean; code?: string | null }> {
  const map = new Map<string, { head: T; ids: string[]; count: number; unread: boolean; title: string; message: string; sample: boolean; code?: string | null }>();
  for (const n of items) {
    const t = cleanNotificationText(n.title);
    const m = cleanNotificationText(n.message);
    const code = loanCodeIn(n.title, n.message);
    const key = `${t.text}|${m.text}|${n.resource_id ?? ''}|${code ?? ''}`;
    const g = map.get(key);
    if (g) {
      g.ids.push(n.id);
      g.count += 1;
      g.unread = g.unread || n.status === 'UNREAD';
    } else {
      map.set(key, { head: n, ids: [n.id], count: 1, unread: n.status === 'UNREAD', title: titleWithCode(t.text, code), message: m.text, sample: t.sample || m.sample, code });
    }
  }
  return [...map.values()];
}
