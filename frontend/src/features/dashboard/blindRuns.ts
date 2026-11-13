/**
 * Lượt đo mù đã đăng ký trước (docs/agent/benchmark-v3-research.md §12, §14, §15, §16, §17). Dòng (b) không có trong
 * `summary` của engine nên được ghi lại ở đây từ tệp kết quả đã lưu; e2e `benchmark-comparison.spec.ts` tính lại
 * từ tệp và đối chiếu từng con số, nên không thể lệch khỏi số đo thật.
 */
export interface BlindStat { mean: number; sd: number }
export interface BlindRunNote {
  /** Mã commit khóa mã engine và backend khi đo. */
  lockedCommit: string;
  /** true: đo lại trên bản mã đang chạy sau khi sửa engine; bộ ca không còn mù chặt. */
  remeasure?: boolean;
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
  '20261113T085421Z-v8 đo lại trên bản khóa 98600a7': {
    lockedCommit: '98600a7',
    remeasure: true,
    a: { single: { mean: 0.5433, sd: 0.1818 }, multi: { mean: 0.7067, sd: 0.1574 } },
    b: { single: { mean: 0.675, sd: 0.2736 }, multi: { mean: 0.9667, sd: 0.0864 } },
  },
  '20261113T175157Z-v8 đo lần ba trên bản khóa 8c9afbc': {
    lockedCommit: '8c9afbc',
    remeasure: true,
    a: { single: { mean: 0.57, sd: 0.1985 }, multi: { mean: 0.7133, sd: 0.1655 } },
    b: { single: { mean: 0.6944, sd: 0.278 }, multi: { mean: 0.975, sd: 0.0763 } },
  },
};

/** Câu giới hạn đặt cạnh kết luận: số ca và số lần theo đúng lượt đang xem. */
export function limitNote(run: { per_case: Record<string, unknown>; runs_per_case: number }): string {
  return `Giới hạn: bộ ca nhỏ (${Object.keys(run.per_case).length} ca, ${run.runs_per_case} lần mỗi ca), chấm bằng từ khóa, không có người chấm; chỉ nói về các ca này.`;
}

/** Điều cần nói thẳng cạnh kết luận về tỷ lệ đúng cổng quyết định. */
export const GATE_NOTE =
  'Tỷ lệ đúng cổng của đội agent dựa vào cổng quyết định tất định (luật cứng) đã được hiệu chỉnh trên các bộ ca trước; mô hình đơn lẻ không có cổng này, nên phần lợi thế ở chỉ số này không chỉ đến từ việc chia việc cho nhiều agent.';

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

/** Câu nói rõ lượt đo lại sau khi sửa engine (bộ ca đã được đo một lần ở lượt trước). */
export const REMEASURE_NOTE =
  'Đây là lượt đo lại trên bản mã đang chạy, sau khi engine được sửa; bộ ca đã được đo ở các lượt trước nên không còn mù chặt. Với lượt đo thứ ba, đây là lần đo sau hai lần sửa engine (sau lượt 1 và sau lượt 2). Các lượt trước vẫn chọn được ở danh sách trên.';
