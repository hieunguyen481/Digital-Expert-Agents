import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MetricsPanel } from './MetricsPanel';
import type { Metric, MetricValue } from './types';

const val = (kind: MetricValue['kind'], n: number): MetricValue => ({
  kind, result: null, field_id: kind, document_id: 'd1', document_title: 'Báo cáo tài chính', page_number: 3,
  source_type: 'OCR', verification_status: 'VERIFIED', value_text: String(n), value_number: n, note: null,
  verified_by_name: null, verified_at: null,
});
const dscr: Metric = {
  code: 'dscr', label: 'DSCR dự phóng', unit: 'lần', clause: null, threshold: { op: '>=', value: 1.2 },
  conflict_id: 'c1', chosen: null, values: [val('DECLARED', 1.34), val('RECOMPUTED', 1.76)],
};

describe('MetricsPanel', () => {
  it('hiện DSCR khai báo và tính lại, mỗi giá trị kèm nguồn', () => {
    render(<MemoryRouter><MetricsPanel loanId="l1" metrics={[dscr]} /></MemoryRouter>);
    const d = screen.getByTestId('metric-dscr-DECLARED');
    const r = screen.getByTestId('metric-dscr-RECOMPUTED');
    expect(d).toHaveTextContent('1,34');
    expect(r).toHaveTextContent('≈ 1,76');
    for (const cell of [d, r]) expect(within(cell).getByTestId('metric-source')).toHaveTextContent('Nguồn: Báo cáo tài chính, trang 3');
  });

  it('không có chỉ số thì nói rõ, không dựng số', () => {
    render(<MemoryRouter><MetricsPanel loanId="l1" metrics={[]} /></MemoryRouter>);
    expect(screen.getByText(/Chưa có chỉ số nào có tài liệu nguồn/)).toBeInTheDocument();
    expect(screen.queryByTestId('metric-source')).toBeNull();
  });
});
