import type { ReactNode } from 'react';
import { StatusPill, type PillTone } from './Indicators';
import styles from './ui.module.css';

export type AgentKey = 'planner' | 'credit' | 'compliance' | 'operations' | 'document' | 'validation';
export type AgentState = 'idle' | 'run' | 'done' | 'err' | 'to';
export type AgentTeamVariant = 'full' | 'compact' | 'strip';

/** Danh sách agent theo agent_engine; thứ tự cố định: Planner → 4 agent song song → Validation. */
export const AGENTS: Array<{ key: AgentKey; name: string; role: string }> = [
  { key: 'planner', name: 'Planner', role: 'Lập kế hoạch, giao việc' },
  { key: 'credit', name: 'Credit', role: 'Tài chính: DSCR, DTI, LTV' },
  { key: 'compliance', name: 'Compliance', role: 'Chính sách và tuân thủ' },
  { key: 'operations', name: 'Operations', role: 'Hồ sơ, tài sản bảo đảm, vận hành' },
  { key: 'document', name: 'Document', role: 'Đọc và đối chiếu tài liệu' },
  { key: 'validation', name: 'Validation', role: 'Kiểm chứng chéo, phản biện' },
];
const PARALLEL: AgentKey[] = ['credit', 'compliance', 'operations', 'document'];
const BY_KEY = Object.fromEntries(AGENTS.map((a) => [a.key, a])) as Record<AgentKey, (typeof AGENTS)[number]>;

const STATE_LABEL: Record<AgentState, string> = { idle: 'Chưa chạy', run: 'Đang chạy', done: 'Xong', err: 'Lỗi', to: 'Quá giờ' };
const STATE_TONE: Record<AgentState, PillTone> = { idle: 'neutral', run: 'ai', done: 'ok', err: 'bad', to: 'bad' };

export interface AgentTeamProps {
  /** Trạng thái từng agent; thiếu = chưa chạy. */
  states?: Partial<Record<AgentKey, AgentState>>;
  /** Thời gian chạy (ms) từng agent, lấy từ dữ liệu thật của lượt chạy; thiếu thì không hiện. */
  durationsMs?: Partial<Record<AgentKey, number>>;
  /** Ghi chú ngắn thay cho mô tả vai trò. */
  notes?: Partial<Record<AgentKey, string>>;
  variant?: AgentTeamVariant;
  /** Người quyết định ở cuối, nằm NGOÀI khung AI. `false` để ẩn. */
  human?: false | { who: string; note?: string };
}

const fmtSec = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} giây`;
const ARIA =
  'Đội agent: Planner giao việc cho Credit, Compliance, Operations và Document chạy song song, Validation kiểm chứng, rồi chuyển người quyết định';
const norm = (s: AgentState) => (s === 'to' ? 'err' : s);
const FN_CLASS = { idle: styles.fnIdle, run: styles.fnRun, done: styles.fnDone, err: styles.fnErr } as const;

function Fanout({ inward }: { inward?: boolean }) {
  const ys = [12.5, 37.5, 62.5, 87.5];
  return (
    <div className={styles.cx}>
      <svg viewBox="0 0 32 100" preserveAspectRatio="none" aria-hidden>
        {ys.map((y) => (
          <path key={y} d={inward ? `M0 ${y}C16 ${y} 16 50 32 50` : `M0 50C16 50 16 ${y} 32 ${y}`} />
        ))}
      </svg>
    </div>
  );
}

/**
 * "Đội agent": MỘT thành phần cho mọi màn hình (cây `full`, một dòng `compact`, dải `strip`).
 * Người quyết định luôn nằm ngoài khung nét đứt của AI.
 */
export function AgentTeam({ states = {}, durationsMs = {}, notes = {}, variant = 'full', human = { who: 'Cấp phê duyệt' } }: AgentTeamProps) {
  const st = (k: AgentKey): AgentState => states[k] ?? 'idle';
  const stateText = (k: AgentKey) => (st(k) === 'done' && durationsMs[k] != null ? fmtSec(durationsMs[k]!) : STATE_LABEL[st(k)]);
  const parts = AGENTS.map((a) => durationsMs[a.key]);
  const total =
    AGENTS.every((a) => st(a.key) === 'done') && parts.every((p) => p != null)
      ? durationsMs.planner! + Math.max(...PARALLEL.map((k) => durationsMs[k]!)) + durationsMs.validation!
      : null;

  const hm: ReactNode = human && (
    <div className={styles.atHm}>
      <span className={styles.atArr} aria-hidden>→</span>
      <span className={styles.atHn}>{human.who}</span>
      <span>{human.note ?? 'Người quyết định, ngoài khung AI'}</span>
    </div>
  );

  if (variant === 'compact') {
    const chip = (k: AgentKey) => {
      const s = norm(st(k));
      const cls = s === 'run' ? styles.chipRun : s === 'err' ? styles.chipErr : s === 'idle' ? styles.chipIdle : '';
      return (
        <span key={k} className={`${styles.chip} ${cls}`} title={`${BY_KEY[k].name}: ${notes[k] ?? stateText(k)}`}>
          <i aria-hidden />
          <b>{BY_KEY[k].name}</b>
        </span>
      );
    };
    return (
      <div className={`${styles.at} ${styles.compact}`} role="group" aria-label={ARIA}>
        <div className={styles.atFrame}>
          {chip('planner')}
          <span className={styles.arrAi} aria-hidden>→</span>
          {PARALLEL.map(chip)}
          <span className={styles.arrAi} aria-hidden>→</span>
          {chip('validation')}
          {total != null && <span className={styles.tot}>{fmtSec(total).replace(' giây', '')} giây</span>}
        </div>
        {hm}
      </div>
    );
  }

  if (variant === 'strip') {
    const cell = (k: AgentKey) => (
      <div key={k} className={`${styles.fn} ${FN_CLASS[norm(st(k))]}`} title={`${BY_KEY[k].name}: ${BY_KEY[k].role}`}>
        <b>{BY_KEY[k].name}</b>
        <span className={styles.fnRole}>{notes[k] ?? stateText(k)}</span>
      </div>
    );
    return (
      <div className={`${styles.at} ${styles.strip}`} role="group" aria-label={ARIA}>
        <div className={styles.atFrame}>
          {cell('planner')}
          <span className={styles.arrAi} aria-hidden>→</span>
          <div className={styles.g4}>{PARALLEL.map(cell)}</div>
          <span className={styles.arrAi} aria-hidden>→</span>
          {cell('validation')}
        </div>
        {hm}
      </div>
    );
  }

  const stack = (k: AgentKey) => (
    <div key={k} className={`${styles.fn} ${FN_CLASS[norm(st(k))]}`}>
      <StatusPill tone={STATE_TONE[st(k)]}>{STATE_LABEL[st(k)]}</StatusPill>
      <b>{BY_KEY[k].name}</b>
      <span className={styles.fnRole}>{notes[k] ?? BY_KEY[k].role}</span>
      {st(k) === 'done' && durationsMs[k] != null && <span className={styles.tm}>{fmtSec(durationsMs[k]!)}</span>}
    </div>
  );
  const horiz = (k: AgentKey) => (
    <div key={k} className={`${styles.fn} ${styles.fnHoriz} ${FN_CLASS[norm(st(k))]}`}>
      <div>
        <b>{BY_KEY[k].name}</b>
        <span className={styles.fnRole}>{notes[k] ?? BY_KEY[k].role}</span>
      </div>
      <div className={styles.fnRight}>
        <StatusPill tone={STATE_TONE[st(k)]}>{STATE_LABEL[st(k)]}</StatusPill>
        {st(k) === 'done' && durationsMs[k] != null && <span className={styles.tm}>{fmtSec(durationsMs[k]!)}</span>}
      </div>
    </div>
  );
  return (
    <div className={styles.at} role="group" aria-label={ARIA}>
      <div className={styles.flow}>
        <div className={styles.one}>{stack('planner')}</div>
        <Fanout />
        <div className={styles.col}>{PARALLEL.map((k) => <div key={k}>{horiz(k)}</div>)}</div>
        <Fanout inward />
        <div className={styles.one}>{stack('validation')}</div>
      </div>
      {hm}
    </div>
  );
}
