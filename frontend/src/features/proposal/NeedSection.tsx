import { Alert, Form, Input, Radio, Select } from 'antd';
import { useMemo } from 'react';
import { billionToVnd } from './draftForm';
import type { DraftForm, LoanProduct } from './types';

interface Props {
  form: DraftForm;
  products: LoanProduct[];
  disabled: boolean;
  onChange: (patch: Partial<DraftForm>) => void;
}

const BILLION = 1_000_000_000;

/** Mục 2 "Nhu cầu vay": sản phẩm, số tiền (tỷ đồng), kỳ hạn, mục đích, nguồn trả nợ, có TSBĐ. */
export function NeedSection({ form, products, disabled, onChange }: Props) {
  const product = products.find((p) => p.id === form.productId);
  const vnd = billionToVnd(form.amountBillion);
  const term = /^\d+$/.test(form.termMonths.trim()) ? Number(form.termMonths) : null;

  const amountMsg = useMemo(() => {
    if (!vnd) return 'Nhập số tiền lớn hơn 0, đơn vị tỷ đồng. Ví dụ 15 hoặc 12,5.';
    if (product?.min_amount && Number(vnd) < Number(product.min_amount))
      return `Số tiền tối thiểu của sản phẩm là ${Number(product.min_amount) / BILLION} tỷ đồng.`;
    if (product?.max_amount && Number(vnd) > Number(product.max_amount))
      return `Số tiền tối đa của sản phẩm là ${Number(product.max_amount) / BILLION} tỷ đồng.`;
    return null;
  }, [vnd, product]);
  const termMsg = useMemo(() => {
    if (term === null || term <= 0) return 'Nhập kỳ hạn là số tháng lớn hơn 0. Ví dụ 12.';
    if (product?.min_term_months && term < product.min_term_months)
      return `Kỳ hạn tối thiểu ${product.min_term_months} tháng.`;
    if (product?.max_term_months && term > product.max_term_months)
      return `Kỳ hạn tối đa ${product.max_term_months} tháng.`;
    return null;
  }, [term, product]);

  return (
    <Form layout="vertical" disabled={disabled} aria-label="Nhu cầu vay">
      <Form.Item label="Sản phẩm (bắt buộc)" htmlFor="need-product">
        <Select
          id="need-product"
          placeholder="Chọn sản phẩm vay"
          value={form.productId}
          options={products.map((p) => ({ value: p.id, label: p.product_name }))}
          onChange={(productId: string) => onChange({ productId })}
        />
      </Form.Item>
      <Form.Item
        label="Số tiền đề nghị (tỷ đồng) (bắt buộc)"
        htmlFor="need-amount"
        validateStatus={amountMsg ? 'warning' : undefined}
        help={amountMsg ?? undefined}
      >
        <Input
          id="need-amount"
          inputMode="decimal"
          suffix="tỷ đồng"
          value={form.amountBillion}
          onChange={(e) => onChange({ amountBillion: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label="Kỳ hạn (tháng) (bắt buộc)"
        htmlFor="need-term"
        validateStatus={termMsg ? 'warning' : undefined}
        help={termMsg ?? undefined}
      >
        <Input
          id="need-term"
          inputMode="numeric"
          suffix="tháng"
          value={form.termMonths}
          onChange={(e) => onChange({ termMonths: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="Mục đích vay" htmlFor="need-purpose">
        <Input.TextArea
          id="need-purpose"
          placeholder="Ví dụ: bổ sung vốn lưu động"
          rows={2}
          value={form.purposeText}
          onChange={(e) => onChange({ purposeText: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label="Nguồn và kỳ trả nợ"
        htmlFor="need-repay"
        extra="Nêu nguồn trả và kỳ trả. Số liệu dòng tiền do Thẩm định kiểm chứng."
      >
        <Input.TextArea
          id="need-repay"
          placeholder="Nêu nguồn tiền trả nợ cụ thể và kỳ trả"
          rows={2}
          value={form.repaymentText}
          onChange={(e) => onChange({ repaymentText: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="Tài sản bảo đảm">
        <Radio.Group
          value={form.secured}
          onChange={(e) => onChange({ secured: e.target.value as boolean })}
          options={[
            { value: true, label: 'Có tài sản bảo đảm' },
            { value: false, label: 'Tín chấp' },
          ]}
        />
      </Form.Item>
      {(amountMsg || termMsg) && (
        <Alert type="warning" showIcon message="Số liệu nằm ngoài giới hạn sản phẩm; vẫn lưu nháp được, nhưng cần sửa trước khi gửi." />
      )}
    </Form>
  );
}
