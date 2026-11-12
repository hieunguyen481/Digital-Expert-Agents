/**
 * Lượt đo mù đã đăng ký trước (docs/agent/benchmark-v3-research.md §12, §14, §15). Dòng (b) không có trong
 * `summary` của engine nên được ghi lại ở đây từ tệp kết quả đã lưu; e2e `benchmark-comparison.spec.ts` tính lại
 * từ tệp và đối chiếu từng con số, nên không thể lệch khỏi số đo thật.
 */
export interface BlindStat { mean: number; sd: number }
export interface BlindRunNote {
  /** Mã commit khóa mã engine và backend khi đo. */
  lockedCommit: string;
  /** (a) độ phủ theo đáp án đăng ký nguyên vẹn; (b) không tính hai loại phát hiện tổng cấp tín dụng và BCTC kiểm toán. */
  a: { single: BlindStat; multi: BlindStat };
  b: { single: BlindStat; multi: BlindStat };
}

export const BLIND_RUNS: Record<string, BlindRunNote> = {
  '20261112T220826Z-v8 mù trên bản khóa 735f9a7': {
    lockedCommit: '735f9a7',
    a: { single: { mean: 0.52, sd: 0.1523 }, multi: { mean: 0.7067, sd: 0.1574 } },
    b: { single: { mean: 0.675, sd: 0.281 }, multi: { mean: 0.9833, sd: 0.0632 } },
  },
};

/** Câu giới hạn đặt cạnh kết luận cho mọi lượt đo. */
export const LIMIT_NOTE =
  'Giới hạn: bộ ca nhỏ (10 ca, 3 lần mỗi ca), chấm bằng từ khóa, không có người chấm; chỉ nói về các ca này.';

/** Ca đội agent không hơn mô hình đơn lẻ về độ phủ phát hiện (bằng hoặc thấp hơn). */
export function casesNotBetter(
  perCase: Record<string, { single?: { finding_recall?: { mean: number | null } }; multi?: { finding_recall?: { mean: number | null } } }>,
): { id: string; single: number; multi: number }[] {
  return Object.keys(perCase).sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).flatMap((id) => {
    const s = perCase[id]?.single?.finding_recall?.mean;
    const m = perCase[id]?.multi?.finding_recall?.mean;
    return s != null && m != null && m <= s + 1e-9 ? [{ id, single: s, multi: m }] : [];
  });
}
