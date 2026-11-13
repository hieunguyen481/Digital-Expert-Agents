import { useQuery } from '@tanstack/react-query';
import { Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RequireRole } from '@/auth/RequireRole';
import { StateBlock, StatusPill, type PillTone, ledgerNum, ledgerTable } from '@/components/ui';
import { UI_ROLE_LABEL, uiRoleFromRoles } from '@/auth/roleFromMe';
import { PageHead } from '@/features/shell/PageHead';
import apiClient from '@/services/apiClient';
import { paginationItemRender } from '@/utils/paginationRender';
import styles from './admin.module.css';

export interface AdminUser {
  employee_id: string;
  employee_code: string;
  full_name: string;
  email: string;
  department: string | null;
  branch: string | null;
  status: string;
  roles: string[];
}
export interface AdminPermissionRow {
  role_code: string;
  role_name: string;
  permissions: string[];
}
export interface AdminThreshold {
  tier: number;
  max_total_vnd: string | null;
  valid_from: string;
  approvers: number;
}
export interface AdminAiConfig {
  flags: { key: string; label: string; value: string }[];
  note: string;
}

const get = async <T,>(path: string): Promise<T> => (await apiClient.get<T>(`/admin/${path}`)).data;

/** Nhãn vai tiếng Việt: dùng lại bảng nhãn của thanh bên; hai vai chung một nhãn ở thanh bên thì tách ra để cột không trùng. */
const SPLIT_ROLE: Record<string, string> = { risk_officer: 'Quản lý rủi ro', compliance_officer: 'Chuyên viên tuân thủ' };
export function roleLabel(code: string, fallback?: string): string {
  const ui = uiRoleFromRoles([code]);
  return SPLIT_ROLE[code] ?? (ui ? UI_ROLE_LABEL[ui] : fallback ?? 'Vai khác');
}

/** Nhóm vai quyết định màu chip: kiểm soát (rủi ro, tuân thủ, kiểm toán) xanh dương, quản trị và phê duyệt màu "người", còn lại trung tính. */
export function roleTone(code: string): PillTone {
  if (/risk|compliance|audit/i.test(code ?? '')) return 'info';
  if (/admin|approver|manager/i.test(code ?? '')) return 'human';
  return 'neutral';
}

/** Nhãn tiếng Việt của mã quyền; mã gốc hiện nhỏ bên dưới. */
const PERM_LABEL: Record<string, string> = {
  'account:read': 'Xem tài khoản', 'admin:manage': 'Quản trị hệ thống', 'audit:read': 'Xem nhật ký kiểm toán',
  'customer:read': 'Xem khách hàng', 'customer:search': 'Tìm khách hàng',
  'document:download': 'Tải tài liệu', 'document:read': 'Xem tài liệu', 'document:upload': 'Tải tài liệu lên', 'document:verify': 'Đối chiếu tài liệu',
  'loan:analyze': 'Chạy phân tích hồ sơ', 'loan:approve': 'Quyết định phê duyệt', 'loan:create': 'Tạo hồ sơ vay', 'loan:read': 'Xem hồ sơ vay',
  'loan:submit': 'Trình hồ sơ', 'loan:update': 'Sửa hồ sơ vay', 'policy:read': 'Tra cứu chính sách',
  'report:export': 'Xuất báo cáo', 'report:generate': 'Lập báo cáo', 'report:read': 'Xem báo cáo', 'report:review': 'Soát báo cáo',
  'transaction:read': 'Xem giao dịch',
};
export const permLabel = (code: string): string => PERM_LABEL[code] ?? 'Quyền khác';

const TIER_LABEL: Record<number, string> = {
  1: 'Cấp 1 · Phê duyệt tại chi nhánh',
  2: 'Cấp 2 · Phê duyệt Hội sở',
  3: 'Cấp 3 · Hội đồng tín dụng',
};

export function formatLimit(max: string | null): string {
  if (max === null) return 'Không giới hạn trên';
  const billions = Number(max) / 1e9;
  return `Đến ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(billions)} tỷ đồng`;
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className={styles.card} aria-label={title}>
      <header className={styles.cardHead}>
        <h2>{title}</h2>
        <p>{hint}</p>
      </header>
      {children}
    </section>
  );
}

function Users() {
  const q = useQuery({ queryKey: ['admin', 'users'], queryFn: () => get<AdminUser[]>('users') });
  const columns: ColumnsType<AdminUser> = [
    { title: 'Họ tên', dataIndex: 'full_name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phòng', key: 'dept', render: (_, r) => r.department ?? '—' },
    { title: 'Mã nhân viên', dataIndex: 'employee_code', key: 'code', render: (v: string) => <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-num)', fontSize: 'var(--fs-12)' }}>{v}</span> },
    { title: 'Vai', key: 'roles', render: (_, r) => r.roles.map((x) => <StatusPill key={x} tone={roleTone(x)}>{roleLabel(x)}</StatusPill>) },
  ];
  return (
    <Section title="Người dùng và vai" hint="Tài khoản nhân viên và vai đang có hiệu lực. Thêm, khóa hoặc đổi vai thực hiện ở Keycloak và dữ liệu nhân sự.">
      {q.isLoading && <Skeleton active />}
      {q.isError && <StateBlock kind="error" title="Không tải được người dùng" description="Thử lại sau ít phút." />}
      {q.data && <Table rowKey="employee_id" size="small" pagination={{ pageSize: 10, hideOnSinglePage: true, itemRender: paginationItemRender }} className={ledgerTable} columns={columns} dataSource={q.data} />}
    </Section>
  );
}

function Permissions() {
  const q = useQuery({ queryKey: ['admin', 'permissions'], queryFn: () => get<AdminPermissionRow[]>('permissions') });
  const roles = q.data ?? [];
  const codes = Array.from(new Set(roles.flatMap((r) => r.permissions))).sort();
  const columns: ColumnsType<{ code: string }> = [
    {
      title: 'Quyền', dataIndex: 'code', key: 'code', fixed: 'left', width: 240,
      render: (c: string) => (<><div>{permLabel(c)}</div><code className={styles.permCode}>{c}</code></>),
    },
    ...roles.map((r) => ({
      title: roleLabel(r.role_code, r.role_name),
      key: r.role_code,
      align: 'center' as const,
      render: (_: unknown, row: { code: string }) => (r.permissions.includes(row.code) ? <span aria-label="Được">✔</span> : <span aria-label="Không">—</span>),
    })),
  ];
  return (
    <Section title="Ma trận quyền" hint="Quyền chức năng của từng vai. Phạm vi dữ liệu do chính sách truy cập ở cơ sở dữ liệu quyết định. Chỉ đổi qua migration và seed.">
      {q.isLoading && <Skeleton active />}
      {q.isError && <StateBlock kind="error" title="Không tải được ma trận quyền" description="Thử lại sau ít phút." />}
      {q.data && <Table rowKey="code" size="small" pagination={false} scroll={{ x: 'max-content' }} className={`${ledgerTable} ${styles.matrix}`} columns={columns} dataSource={codes.map((code) => ({ code }))} />}
    </Section>
  );
}

function Thresholds() {
  const q = useQuery({ queryKey: ['admin', 'thresholds'], queryFn: () => get<AdminThreshold[]>('thresholds') });
  const columns: ColumnsType<AdminThreshold> = [
    { title: 'Cấp phê duyệt', key: 'tier', render: (_, r) => TIER_LABEL[r.tier] ?? `Cấp ${r.tier}` },
    { title: 'Hạn mức tổng tối đa', key: 'max', align: 'right', className: ledgerNum, render: (_, r) => formatLimit(r.max_total_vnd) },
    { title: 'Người có thẩm quyền', dataIndex: 'approvers', key: 'approvers', align: 'right', className: ledgerNum },
    { title: 'Áp dụng từ', dataIndex: 'valid_from', key: 'from' },
  ];
  return (
    <Section title="Ngưỡng cấp phê duyệt" hint="Ngưỡng đang áp dụng khi hệ thống định tuyến hồ sơ. Đổi ngưỡng bằng migration, chưa sửa được trên web.">
      {q.isLoading && <Skeleton active />}
      {q.isError && <StateBlock kind="error" title="Không tải được ngưỡng" description="Thử lại sau ít phút." />}
      {q.data && <Table rowKey="tier" size="small" pagination={false} className={ledgerTable} columns={columns} dataSource={q.data} />}
    </Section>
  );
}

function AiConfig() {
  const q = useQuery({ queryKey: ['admin', 'ai-config'], queryFn: () => get<AdminAiConfig>('ai-config') });
  return (
    <Section title="Cấu hình AI" hint={q.data?.note ?? 'Mô hình và cờ đang dùng. Không hiển thị khóa API.'}>
      {q.isLoading && <Skeleton active />}
      {q.isError && <StateBlock kind="error" title="Không tải được cấu hình AI" description="Thử lại sau ít phút." />}
      {q.data && (
        <dl className={styles.flags}>
          {q.data.flags.map((f) => (
            <div key={f.key} className={styles.flag}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}

export default function AdminPage() {
  return (
    <RequireRole allow={['quantri']} pageName="Quản trị">
      <PageHead title="Quản trị người dùng" facts={['Chỉ đọc', 'Quản trị hệ thống không xem được hồ sơ vay']} />
      <div className={styles.page}>
        <Users />
        <Permissions />
        <Thresholds />
        <AiConfig />
      </div>
    </RequireRole>
  );
}
