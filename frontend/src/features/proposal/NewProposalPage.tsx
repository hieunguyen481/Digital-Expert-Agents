import { Form, Input, Select } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from '@/components/ui';
import { RequireRole } from '@/auth/RequireRole';
import { getErrorMessage } from '@/services/apiClient';
import { PageHead } from '@/features/shell/PageHead';
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

  return (
    <>
      <PageHead
        title="Tạo đề xuất vay"
        crumbs={[{ label: 'Việc của tôi', to: '/viec-cua-toi' }, { label: 'Tạo đề xuất vay' }]}
        facts={['Chọn khách hàng, sản phẩm, số tiền và kỳ hạn. Các mục còn lại điền ở bước soạn.']}
        actions={
          <ActionButton variant="primary" loading={busy} lockedReason={ready ? undefined : (missing ?? 'Điền đủ thông tin khoản vay.')} onClick={() => void create()}>
            Tạo bản nháp
          </ActionButton>
        }
      />
      <div className={styles.page}>
        <section className={styles.card} aria-label="Thông tin khoản vay">
        <Form layout="vertical" className={styles.formNarrow}>
          <Form.Item label="Khách hàng" htmlFor="new-customer">
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
          <Form.Item label="Sản phẩm" htmlFor="new-product">
            <Select
              id="new-product"
              value={productId}
              onChange={setProductId}
              options={(products.data ?? []).map((p) => ({ value: p.id, label: p.product_name }))}
            />
          </Form.Item>
          <Form.Item label="Số tiền đề nghị (tỷ đồng)" htmlFor="new-amount" validateStatus={amountErr ? 'error' : undefined} help={amountErr ?? undefined}>
            <Input id="new-amount" inputMode="decimal" suffix="tỷ đồng" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Form.Item>
          <Form.Item label="Kỳ hạn (tháng)" htmlFor="new-term" validateStatus={termErr ? 'error' : undefined} help={termErr ?? undefined}>
            <Input id="new-term" inputMode="numeric" suffix="tháng" value={term} onChange={(e) => setTerm(e.target.value)} />
          </Form.Item>
          {err && <div role="alert" className={styles.err}>{err}</div>}
        </Form>
        </section>
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
