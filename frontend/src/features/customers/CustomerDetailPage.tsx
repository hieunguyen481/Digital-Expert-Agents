import { useQuery } from '@tanstack/react-query';
import { Skeleton, Table } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useUiRole } from '@/auth/session';
import { ActionButton, StateBlock, StatusPill, ledgerNum, ledgerTable } from '@/components/ui';
import { statusLabel } from '@/features/my-work/format';
import { PageHead } from '@/features/shell/PageHead';
import apiClient from '@/services/apiClient';
import type { ApiError } from '@/types/api';
import { fmtInt } from '@/utils/format';
import { formatDate } from '@/utils/formatDate';
import { customerName, customerStatusLabel, kycInfo, riskInfo, segmentLabel, type CustomerRow } from './customerFormat';
import styles from './customers.module.css';

interface LoanRow {
  id: string;
  application_number: string;
  requested_amount: string;
  currency: string;
  requested_term_months: number;
  status: string;
}

/** Chi tiết khách hàng (mockup 26): thông tin từ GET /customers/:id, hồ sơ vay từ /customers/:id/loan-applications. */
export default function CustomerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useUiRole();
  const cust = useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: async () => (await apiClient.get<CustomerRow>(`/customers/${id}`)).data,
    retry: false,
  });
  const loans = useQuery({
    queryKey: ['customers', 'loans', id],
    enabled: cust.isSuccess,
    queryFn: async () => (await apiClient.get<LoanRow[]>(`/customers/${id}/loan-applications`)).data,
  });
  const crumbs = [{ label: 'Khách hàng SME', to: '/khach-hang' }];

  if (cust.isLoading) return <div className={styles.page} role="status" aria-label="Đang tải"><Skeleton active /></div>;
  if (cust.isError || !cust.data) {
    const status = (cust.error as ApiError | null)?.status;
    const back = <ActionButton onClick={() => navigate('/khach-hang')}>Về danh sách khách hàng</ActionButton>;
    return (
      <>
        <PageHead title="Khách hàng" crumbs={[...crumbs, { label: 'Chi tiết' }]} />
        <div className={styles.page}>
          {status === 403 ? (
            <StateBlock kind="forbidden" title="Bạn không có quyền xem khách hàng này" description="Khách hàng nằm ngoài phạm vi bạn được xem." action={back} />
          ) : status === 404 || status === 422 ? (
            <StateBlock kind="notfound" title="Không tìm thấy khách hàng" description="Mã khách hàng trong đường dẫn không tồn tại hoặc nằm ngoài phạm vi bạn được xem." action={back} />
          ) : (
            <StateBlock kind="error" title="Không tải được khách hàng" description="Thử lại sau ít phút." action={<ActionButton onClick={() => void cust.refetch()}>Tải lại</ActionButton>} />
          )}
        </div>
      </>
    );
  }
  const c = cust.data;
  const name = customerName(c);
  const [kycLabel, kycTone] = kycInfo(c.kyc_status);
  const risk = riskInfo(c.risk_rating);
  const seg = segmentLabel(c.customer_segment);
  return (
    <>
      <PageHead
        title={name}
        crumbs={[...crumbs, { label: name }]}
        facts={[c.customer_number, seg, loans.data ? `${loans.data.length} hồ sơ vay` : null]}
        actions={role === 'qhkh' ? <ActionButton variant="primary" onClick={() => navigate('/de-xuat-vay')}>Tạo đề xuất vay</ActionButton> : undefined}
      />
      <div className={styles.page}>
        <div className={styles.cols}>
          <section className={styles.card} aria-labelledby="kh-hs">
            <div className={styles.cardHead}><h2 id="kh-hs">Hồ sơ vay của khách hàng</h2></div>
            {loans.isLoading && <div className={styles.cardBody}><Skeleton active /></div>}
            {loans.isError && <StateBlock compact kind="error" title="Không tải được hồ sơ vay" action={<ActionButton onClick={() => void loans.refetch()}>Tải lại</ActionButton>} />}
            {loans.data && loans.data.length === 0 && <StateBlock compact kind="empty" title="Chưa có hồ sơ vay" description="Khách hàng này chưa có hồ sơ vay nào." />}
            {loans.data && loans.data.length > 0 && (
              <Table<LoanRow>
                className={ledgerTable}
                rowKey="id"
                pagination={false}
                dataSource={loans.data}
                aria-label="Hồ sơ vay của khách hàng"
                columns={[
                  { title: 'Mã hồ sơ', render: (_, r) => <Link className={styles.link} to={`/ho-so-vay/${r.id}`}>{r.application_number}</Link> },
                  { title: 'Số tiền (đồng)', align: 'right', className: ledgerNum, render: (_, r) => fmtInt(Number(r.requested_amount)) },
                  { title: 'Kỳ hạn', align: 'right', className: ledgerNum, render: (_, r) => `${r.requested_term_months} tháng` },
                  { title: 'Trạng thái', render: (_, r) => <StatusPill>{statusLabel(r.status)}</StatusPill> },
                ]}
              />
            )}
          </section>
          <aside className={styles.card} aria-labelledby="kh-tt">
            <div className={styles.cardHead}><h2 id="kh-tt">Thông tin khách hàng</h2></div>
            <div className={styles.cardBody}>
              <dl className={styles.meta}>
                <div><dt>Tên</dt><dd>{name}</dd></div>
                <div><dt>Mã khách hàng</dt><dd className={styles.id}>{c.customer_number}</dd></div>
                {seg && <div><dt>Phân khúc</dt><dd>{seg}</dd></div>}
                <div><dt>Xác minh KYC</dt><dd><StatusPill tone={kycTone}>{kycLabel}</StatusPill></dd></div>
                <div><dt>Mức rủi ro</dt><dd>{risk ? <StatusPill tone={risk[1]}>{risk[0]}</StatusPill> : 'Chưa xếp hạng'}</dd></div>
                <div><dt>Trạng thái</dt><dd>{customerStatusLabel(c.status)}</dd></div>
                <div><dt>Cập nhật</dt><dd>{formatDate(c.updated_at)}</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
