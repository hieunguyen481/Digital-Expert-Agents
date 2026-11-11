import { Form, Input, Select } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from '@/components/ui';
import { RequireRole } from '@/auth/RequireRole';
import { getErrorMessage } from '@/services/apiClient';
import { PageHead } from '@/features/shell/PageHead';
import { ProposalFrame, type CheckItem } from './ProposalFrame';
import { billionToVnd, validateAmount, validateTerm } from './draftForm';
import { createLoan, fetchProducts, searchCustomers } from './proposalService';
import styles from './proposal.module.css';

function Content() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [customerId, setCustomerId] = useState<string>();
  const [productId, setProductId] = useState<string>();
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const customers = useQuery({ queryKey: ['proposal-customers', q], queryFn: () => searchCustomers(q) });
  const products = useQuery({ queryKey: ['loan-products'], queryFn: fetchProducts });

  const product = products.data?.find((p) => p.id === productId);
  const vnd = billionToVnd(amount);
  const months = /^\d+$/.test(term.trim()) ? Number(term) : 0;
  const amountErr = validateAmount(amount);
  const termErr = validateTerm(term);
  const ready = !!(customerId && product && vnd && months > 0 && !amountErr && !termErr);
  const missing = !customerId ? 'Chọn khách hàng.' : !product ? 'Chọn sản phẩm.'
    : !amount.trim() ? 'Nhập số tiền đề nghị.' : !term.trim() ? 'Nhập kỳ hạn.' : (amountErr ?? termErr);

  const create = async () => {
    if (!ready || !product || !vnd || !customerId) return;
    setBusy(true);
    setErr(null);
    try {
      const loan = await createLoan({ customerId, product, amountVnd: vnd, termMonths: months });
      navigate(`/de-xuat-vay/${loan.id}`);
    } catch (e) {
      setErr(getErrorMessage(e));
      setBusy(false);
    }
  };

  const checks: CheckItem[] = [
    { label: 'Khách hàng', ok: !!customerId, hint: 'Chọn khách hàng trong danh sách.' },
    { label: 'Sản phẩm', ok: !!product, hint: 'Chọn sản phẩm vay.' },
    { label: 'Số tiền đề nghị', ok: !!vnd && !amountErr, hint: amountErr ?? 'Nhập số tiền, đơn vị tỷ đồng.' },
    { label: 'Kỳ hạn', ok: months > 0 && !termErr, hint: termErr ?? 'Nhập số tháng.' },
  ];
  const later = ['Hồ sơ tài liệu', 'Nhóm liên quan và tài sản', 'Tóm tắt và gửi'];

  return (
    <>
      <PageHead
        title="Tạo đề xuất vay"
        crumbs={[{ label: 'Việc của tôi', to: '/viec-cua-toi' }, { label: 'Tạo đề xuất vay' }]}
        facts={['Bước 1 trên 4: Khách hàng và khoản vay. Các mục còn lại điền ở bước soạn.']}
      />
      <div className={styles.page}>
        <ProposalFrame
          current="start"
          steps={[{ key: 'start', label: 'Khách hàng và khoản vay' }, ...later.map((label) => ({ key: label, label, disabled: true }))]}
          checks={checks}
          footer={
            <>
              <ActionButton variant="primary" loading={busy} lockedReason={ready ? undefined : (missing ?? 'Điền đủ thông tin khoản vay.')} onClick={() => void create()}>
                Tạo bản nháp
              </ActionButton>
            </>
          }
        >
          <Form layout="vertical" className={styles.formNarrow}>
            <Form.Item label="Khách hàng (bắt buộc)" htmlFor="new-customer">
              <Select
                id="new-customer"
                showSearch
                filterOption={false}
                onSearch={setQ}
                value={customerId}
                onChange={setCustomerId}
                loading={customers.isFetching}
                placeholder="Tìm theo tên hoặc mã khách hàng"
                options={(customers.data ?? []).map((c) => ({ value: c.id, label: `${c.display_name} · ${c.customer_number}` }))}
                notFoundContent="Không có khách hàng trong phạm vi của bạn"
              />
            </Form.Item>
            <Form.Item label="Sản phẩm (bắt buộc)" htmlFor="new-product">
              <Select
                id="new-product"
                value={productId}
                onChange={setProductId}
                placeholder="Chọn sản phẩm vay"
                options={(products.data ?? []).map((p) => ({ value: p.id, label: p.product_name }))}
              />
            </Form.Item>
            <Form.Item label="Số tiền đề nghị, tỷ đồng (bắt buộc)" htmlFor="new-amount" validateStatus={amountErr ? 'error' : undefined} help={amountErr ?? 'Ví dụ 15 hoặc 12,5.'}>
              <Input id="new-amount" inputMode="decimal" suffix="tỷ đồng" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Form.Item>
            <Form.Item label="Kỳ hạn (tháng) (bắt buộc)" htmlFor="new-term" validateStatus={termErr ? 'error' : undefined} help={termErr ?? 'Nhập số tháng, ví dụ 12.'}>
              <Input id="new-term" inputMode="numeric" suffix="tháng" value={term} onChange={(e) => setTerm(e.target.value)} />
            </Form.Item>
            {err && <div role="alert" className={styles.err}>{err} Kiểm tra lại thông tin rồi bấm Tạo bản nháp.</div>}
          </Form>
        </ProposalFrame>
      </div>
    </>
  );
}

export default function NewProposalPage() {
  return (
    <RequireRole allow={['qhkh']} pageName="Tạo đề xuất vay">
      <Content />
    </RequireRole>
  );
}
