import { fmtInt } from '@/utils/format';
import { Alert, Button, Input, Radio, Space, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getErrorMessage } from '@/services/apiClient';
import {
  chooseLeasePayment,
  decideRelatedParty,
  fetchRelatedParties,
  fetchSubmitConditions,
} from './proposalService';
import type { ExposureLine } from './types';

const vnd = (v: string) => `${fmtInt(Number(v))} VND`;
const STATUS: Record<string, { text: string; color: string }> = {
  PROPOSED: { text: 'Chờ xác nhận', color: 'warning' },
  CONFIRMED: { text: 'Thuộc nhóm', color: 'success' },
  NOT_IN_GROUP: { text: 'Không thuộc nhóm', color: 'default' },
};

function PartyRow({ loanId, line, editable, onDone }: { loanId: string; line: ExposureLine; editable: boolean; onDone: () => void }) {
  const [basis, setBasis] = useState('');
  const [notInGroup, setNotInGroup] = useState(false);
  const decide = useMutation({
    mutationFn: (status: 'CONFIRMED' | 'NOT_IN_GROUP') =>
      decideRelatedParty(loanId, line.party_id, { status, basis: status === 'NOT_IN_GROUP' ? basis.trim() : null }),
    onSuccess: onDone,
  });
  const s = line.status ? STATUS[line.status] : null;
  return (
    <li data-testid={`party-${line.party_id}`} style={{ padding: '10px 0', borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
      <Space wrap>
        <b>{line.name}</b>
        {line.relation === 'PRIMARY' ? <Tag>Khách hàng vay</Tag> : s && <Tag color={s.color}>{s.text}</Tag>}
        {line.proposed_by_ai && line.status === 'PROPOSED' && <Tag color="processing">AI gợi ý, cần bạn quyết định</Tag>}
        <span>Dư nợ {vnd(line.outstanding)} · ngoài bảng {vnd(line.off_balance)}</span>
      </Space>
      {line.status === 'NOT_IN_GROUP' && line.basis && <p style={{ margin: '4px 0 0' }}>Căn cứ: {line.basis}</p>}
      {line.relation === 'RELATED' && editable && (
        <Space direction="vertical" size={8} style={{ marginTop: 8, width: '100%' }}>
          <Space wrap>
            <Button disabled={decide.isPending} onClick={() => decide.mutate('CONFIRMED')}>
              Xác nhận thuộc nhóm
            </Button>
            <Button disabled={decide.isPending} onClick={() => setNotInGroup((v) => !v)}>
              Không thuộc nhóm
            </Button>
          </Space>
          {notInGroup && (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                aria-label={`Căn cứ không thuộc nhóm: ${line.name}`}
                placeholder="Căn cứ (tối thiểu 10 ký tự)"
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
              />
              <Button disabled={basis.trim().length < 10 || decide.isPending} onClick={() => decide.mutate('NOT_IN_GROUP')}>
                Lưu căn cứ
              </Button>
            </Space.Compact>
          )}
          {decide.isError && <Alert type="error" showIcon message={getErrorMessage(decide.error)} />}
        </Space>
      )}
    </li>
  );
}

export function RelatedSection({ loanId }: { loanId: string }) {
  const qc = useQueryClient();
  const parties = useQuery({ queryKey: ['proposal-related', loanId], queryFn: () => fetchRelatedParties(loanId) });
  const conds = useQuery({ queryKey: ['proposal-conditions', loanId], queryFn: () => fetchSubmitConditions(loanId) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['proposal-related', loanId] });
    void qc.invalidateQueries({ queryKey: ['proposal-conditions', loanId] });
  };
  const lease = useMutation({
    mutationFn: (v: { id: string; payment: 'ANNUAL' | 'ONE_TIME' }) => chooseLeasePayment(loanId, v.id, v.payment),
    onSuccess: refresh,
  });
  if (parties.isError || conds.isError) return <Alert type="error" showIcon message={getErrorMessage(parties.error ?? conds.error)} />;
  if (!parties.data || !conds.data) return <div aria-busy>Đang tải nhóm khách hàng liên quan…</div>;
  const p = parties.data;
  const leased = conds.data.collaterals.filter((c) => c.on_leased_land);
  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <section aria-label="Nhóm khách hàng liên quan">
        <Typography.Title level={5}>Nhóm khách hàng liên quan</Typography.Title>
        <p>Danh sách do hệ thống đề xuất từ dữ liệu cổ đông và quan hệ; chỉ bạn quyết định bên nào thuộc nhóm.</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {p.lines.map((l) => (
            <PartyRow key={l.party_id} loanId={loanId} line={l} editable={p.editable} onDone={refresh} />
          ))}
        </ul>
        <p style={{ marginTop: 12 }}>
          Tổng cấp tín dụng của nhóm (gồm đề xuất này): <b>{vnd(p.total_exposure)}</b> · cấp phê duyệt <b>cấp {p.required_tier}</b>
        </p>
      </section>
      {leased.length > 0 && (
        <section aria-label="Tài sản trên đất thuê">
          <Typography.Title level={5}>Tài sản trên đất thuê</Typography.Title>
          {leased.map((c) => (
            <div key={c.id} data-testid={`lease-${c.id}`} style={{ padding: '8px 0' }}>
              <b>{c.description ?? c.collateral_type}</b> · chủ sở hữu {c.owner_name}
              <div>
                <Radio.Group
                  disabled={!conds.data.editable || lease.isPending}
                  value={c.land_lease_payment}
                  onChange={(e) => lease.mutate({ id: c.id, payment: e.target.value })}
                  options={[
                    { value: 'ANNUAL', label: 'Trả tiền thuê đất hằng năm' },
                    { value: 'ONE_TIME', label: 'Trả một lần' },
                  ]}
                  aria-label={`Cách trả tiền thuê đất: ${c.description ?? c.collateral_type}`}
                />
              </div>
              {c.land_lease_payment === 'ONE_TIME' && !c.has_lease_proof && <Tag color="warning">Chưa có chứng từ trả một lần</Tag>}
            </div>
          ))}
          {lease.isError && <Alert type="error" showIcon message={getErrorMessage(lease.error)} />}
        </section>
      )}
    </Space>
  );
}
