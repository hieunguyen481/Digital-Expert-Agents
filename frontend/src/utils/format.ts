/** Định dạng số, tiền, thời gian dùng chung cho toàn ứng dụng: luôn `vi-VN` (dấu phẩy thập phân, chấm phân cách nghìn). */
const TZ = 'Asia/Ho_Chi_Minh';

export const fmtInt = (n: number): string => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);

/** Số thập phân cố định `digits` chữ số: 40,6 */
export const fmtDec = (n: number, digits = 1): string =>
  new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

/** Tỷ lệ 0..1 -> "45,6%" */
export const fmtPct = (fraction: number, digits = 1): string => `${fmtDec(fraction * 100, digits)}%`;

/** Chi phí USD: "0,0032 USD" */
export const fmtUsd = (n: number, digits = 4): string => `${fmtDec(n, digits)} USD`;

export const fmtVnd = (n: number): string => `${fmtInt(n)} VND`;

export const fmtSec = (s: number): string => (s < 60 ? `${fmtDec(s, 1)} giây` : `${fmtDec(s / 60, 1)} phút`);

const toDate = (v: string | number | Date): Date => (typeof v === 'number' ? new Date(v * 1000) : new Date(v));

/** "10/11/2026" */
export const fmtDay = (v: string | number | Date): string =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ }).format(toDate(v));

/** "10/11/2026 01:18" (số nguyên là giây epoch) */
export const fmtDayTime = (v: string | number | Date): string =>
  `${fmtDay(v)} ${new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(toDate(v))}`;
