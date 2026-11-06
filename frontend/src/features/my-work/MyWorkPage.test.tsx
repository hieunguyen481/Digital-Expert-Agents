import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueueFilter, WorkItem, WorkItemsResponse } from './types';

const useMe = vi.fn();
const useWorkItems = vi.fn();
vi.mock('@/auth/session', () => ({ useMe: () => useMe() }));
vi.mock('./useWorkItems', () => ({ useWorkItems: (f: QueueFilter, e?: boolean) => useWorkItems(f, e) }));
vi.mock('@/features/ai-panel/AiPanel', () => ({ AiPanel: () => null }));
vi.mock('@/auth/keycloak', () => ({ logout: vi.fn() }));
vi.mock('@/services/apiClient', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { meta: { total: 0 } } }) },
  getErrorMessage: () => 'lỗi',
}));

import { AppLayout } from '@/features/shell/AppLayout';
import MyWorkPage from './MyWorkPage';

const ROLE_CASES = [
  ['credit_officer', 'Hồ sơ của tôi'],
  ['document_reviewer', 'Hồ sơ chờ kiểm tra'],
  ['credit_appraiser', 'Việc của tôi'],
  ['risk_officer', 'Hồ sơ chờ ý kiến'],
  ['loan_approver', 'Hồ sơ chờ phê duyệt'],
  ['auditor', 'Hồ sơ vay (chỉ đọc)'],
] as const;

const item = (o: Partial<WorkItem>): WorkItem => ({
  loan_application_id: 'id-' + (o.application_number ?? 'x'),
  application_number: 'HSV-1',
  customer_name: 'Công ty A',
  requested_amount: '80000000000',
  status: 'APPRAISAL',
  step_code: 'APPRAISAL',
  step_received_at: '2026-11-02T08:00:00Z',
  due_at: '2026-11-10T10:00:00Z',
  paused: false,
  remaining_workdays: null,
  sla_level: 'ok',
  mine: true,
  tags: [],
  open_flags: 0,
  high_flags: 0,
  fields_to_confirm: 0,
  ...o,
});

const data = (items: WorkItem[], badge = items.filter((i) => i.mine).length): WorkItemsResponse => ({
  badge,
  facts: { overdue: 1, due_within_1_workday: 0, returned: 0, waiting_supplement: 0 },
  items,
});

function setup(role: string, work: unknown, hash = '') {
  useMe.mockReturnValue({
    data: { roles: [role], full_name: 'Người Dùng', approval_tier: 1 },
    isError: false,
  });
  useWorkItems.mockReturnValue(work);
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/viec-cua-toi${hash}`]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/viec-cua-toi" element={<MyWorkPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const ok = (d: WorkItemsResponse) => ({ data: d, isError: false, isLoading: false, refetch: vi.fn() });

describe('MyWorkPage', () => {
  beforeEach(() => {
    useMe.mockReset();
    useWorkItems.mockReset();
  });

  it.each(ROLE_CASES)('tiêu đề đúng cho %s', (role, title) => {
    setup(role, ok(data([item({})])));
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('badge bằng giá trị backend trả về; hero là việc đầu', () => {
    setup('credit_appraiser', ok(data([item({ application_number: 'HSV-2026-00100', customer_name: 'Khách Đầu Tiên', fields_to_confirm: 3 }), item({ application_number: 'HSV-2', customer_name: 'Khách Hai' })], 3)));
    expect(screen.getByTestId('rail-badge')).toHaveTextContent('3');
    const hero = screen.getByLabelText('Việc khẩn nhất');
    expect(hero).toHaveTextContent('Khách Đầu Tiên');
    expect(hero).toHaveTextContent('Xác nhận 3 số liệu');
  });

  it('đổi bộ lọc ghi hash và gọi đúng filter', async () => {
    setup('credit_appraiser', ok(data([item({})])));
    await userEvent.click(screen.getByText('Quá hạn'));
    expect(useWorkItems.mock.calls.some((c) => c[0] === 'over')).toBe(true);
  });

  it('đọc bộ lọc từ hash', () => {
    setup('credit_appraiser', ok(data([item({})])), '#filter=bosung');
    expect(useWorkItems.mock.calls.some((c) => c[0] === 'bosung')).toBe(true);
  });

  it('hàng theo dõi có nhãn', () => {
    setup('risk_officer', ok(data([item({}), item({ application_number: 'HSV-9', customer_name: 'Khách Theo Dõi', mine: false })])));
    expect(screen.getByText('Theo dõi')).toBeInTheDocument();
  });

  it('empty: câu chữ rõ, không hero', () => {
    setup('credit_appraiser', ok(data([], 0)));
    expect(screen.getByText('Không có việc đang chờ bạn')).toBeInTheDocument();
    expect(screen.queryByLabelText('Việc khẩn nhất')).toBeNull();
  });

  it('error: có nút thử lại và rail vẫn hiện', () => {
    setup('credit_appraiser', { data: undefined, isError: true, error: { code: 'server_error', message: 'x' }, refetch: vi.fn() });
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
  });

  it('quản trị thấy NoAccess', () => {
    setup('admin', ok(data([])));
    expect(screen.getByRole('alert')).toHaveTextContent('Không có quyền');
  });

  it('QHKH: nút Tạo đề xuất vay bị khóa', () => {
    setup('credit_officer', ok(data([item({})])));
    const head = screen.getByRole('banner');
    expect(within(head).getByRole('button', { name: /Tạo đề xuất vay/ })).toBeDisabled();
  });
});
