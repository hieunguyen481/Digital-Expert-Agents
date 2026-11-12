import { Flag as FlagMark, StatusPill } from '@/components/ui';
import { DECISION_LABEL, hasVerdictCondition, type TraceVerdict } from '../agentTrace';

/** Kết luận của một chuyên gia: đỏ/vàng khi cần chú ý, vàng "có điều kiện" khi đạt kèm điều kiện, xanh khi đạt hẳn. */
export function VerdictChip({ v }: { v: Pick<TraceVerdict, 'decision' | 'summary' | 'conditions'> }) {
  const label = DECISION_LABEL[v.decision] ?? v.decision;
  if (v.decision !== 'pass' && v.decision !== 'approve') {
    return <FlagMark level={v.decision === 'reject' || v.decision === 'fail' ? 'r' : 'y'}>{label}</FlagMark>;
  }
  return hasVerdictCondition(v)
    ? <StatusPill tone="warn">{`${label}, có điều kiện`}</StatusPill>
    : <StatusPill tone="ok">{label}</StatusPill>;
}
