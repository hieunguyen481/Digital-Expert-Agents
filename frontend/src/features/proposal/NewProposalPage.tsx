import { Button, Form, Input, Select } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RequireRole } from '@/auth/RequireRole';
import { getErrorMessage } from '@/services/apiClient';
import { PageHead } from '@/features/shell/PageHead';
import { billionToVnd } from './draftForm';
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
  const ready = !!(customerId && product && vnd && months > 0);

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
        actions={
          <Button type="primary" disabled={!ready || busy} loading={busy} onClick={() => void create()}>
            Tạo bản nháp
          </Button>
        }
      />
      <div className={styles.page}>
        <Form layout="vertical" style={{ maxWidth: 560 }}>
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
          <Form.Item label="Số tiền đề nghị (tỷ đồng)" htmlFor="new-amount">
            <Input id="new-amount" inputMode="decimal" suffix="tỷ đồng" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Form.Item>
          <Form.Item label="Kỳ hạn (tháng)" htmlFor="new-term">
            <Input id="new-term" inputMode="numeric" suffix="tháng" value={term} onChange={(e) => setTerm(e.target.value)} />
          </Form.Item>
          {err && <div role="alert" style={{ color: 'var(--ant-color-error)' }}>{err}</div>}
        </Form>
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
