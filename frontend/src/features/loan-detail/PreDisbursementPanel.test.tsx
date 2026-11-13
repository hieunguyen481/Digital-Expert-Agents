import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PreDisbursementPanel } from './PreDisbursementPanel';

const wrap = (ui: React.ReactElement) => render(ui);

describe('PreDisbursementPanel', () => {
  it('liệt kê điều kiện từ quyết định khi đã phê duyệt; không hiện đề xuất chưa xác nhận của đội agent', () => {
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVED_WITH_CONDITIONS" decisionConditions={['Bảo hiểm tài sản']} />);
    expect(screen.getByText(/Từ quyết định: Bảo hiểm tài sản/)).toBeTruthy();
    expect(screen.queryByText(/chưa xác nhận/)).toBeNull();
    expect(screen.queryByTestId('pre-disbursement-agent')).toBeNull();
  });
  it('trên 5 mục thì gập, bấm "Xem thêm" mở hết', () => {
    const many = Array.from({ length: 7 }, (_, i) => `Điều kiện số ${i + 1}`);
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVED_WITH_CONDITIONS" decisionConditions={many} />);
    expect(screen.getAllByTestId('pre-disbursement-decision')).toHaveLength(5);
    fireEvent.click(screen.getByTestId('pre-disbursement-toggle'));
    expect(screen.getAllByTestId('pre-disbursement-decision')).toHaveLength(7);
  });
  it('đúng 5 mục: không có nút gập', () => {
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVED" decisionConditions={['a', 'b', 'c', 'd', 'e']} />);
    expect(screen.queryByTestId('pre-disbursement-toggle')).toBeNull();
  });
  it('chưa phê duyệt: chỉ hiện điều kiện đã xác nhận, kèm người và thời điểm; AI đề xuất phân biệt với người nhập', () => {
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVAL_PENDING" confirmed={[
      { id: '1', text: 'Hoàn tất đăng ký tài sản', origin: 'AGENT_PROPOSED', confirmed_by_name: 'Nguyễn Văn A', created_at: '2026-11-13T02:00:00Z' },
      { id: '2', text: 'Ký phụ lục', origin: 'MANUAL', confirmed_by_name: 'Trần B', created_at: '2026-11-13T03:00:00Z' },
    ]} />);
    const rows = screen.getAllByTestId('pre-disbursement-confirmed');
    expect(rows[0].textContent).toMatch(/AI đề xuất.*Đã được người xác nhận.*Nguyễn Văn A · 09:00/);
    expect(rows[1].textContent).not.toMatch(/AI đề xuất/);
    expect(screen.queryByTestId('pre-disbursement-empty')).toBeNull();
  });
  it('rỗng sau phê duyệt: có dấu chấm cuối', () => {
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVED" />);
    expect(screen.getByTestId('pre-disbursement-empty').textContent).toBe('Chưa có điều kiện nào được ghi.');
  });
  it('rỗng trước phê duyệt: nói điều kiện sẽ có sau khi cấp phê duyệt quyết định', () => {
    wrap(<PreDisbursementPanel loanId="l1" status="APPROVAL_PENDING" />);
    expect(screen.getByTestId('pre-disbursement-empty').textContent).toBe('Điều kiện sẽ có sau khi cấp phê duyệt quyết định.');
  });
});
