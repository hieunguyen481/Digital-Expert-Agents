import { useState } from 'react';
import { Select, Skeleton } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/tables/DataTable';
import { LazyBaseChart } from '@/components/charts/LazyBaseChart';
import { StateBlock, StatusPill, ledgerNum, ledgerTable } from '@/components/ui';
import { fmtDay, fmtDayTime, fmtDec, fmtInt, fmtPct, fmtSec, fmtUsd } from '@/utils/format';
import { modelName } from '@/utils/glossary';
import { getBenchmarkRun, getBenchmarkRuns, getLatestBenchmark } from '@/services/benchmarkService';
import type {
  BenchmarkMode,
  BenchmarkModeSummary,
  BenchmarkRun,
  BenchmarkRunMeta,
  BenchmarkStat,
} from '@/types/dashboard';
import { BLIND_RUNS, GATE_NOTE, REMEASURE_NOTE, limitNote, casesNotBetter } from '../blindRuns';
import styles from '@/pages/AgentDashboardPage.module.css';

type MetricKey = Exclude<keyof BenchmarkModeSummary, 'runs' | 'errors'>;
type Better = 'higher' | 'lower' | 'none';

interface MetricDef {
  key: MetricKey;
  label: string;
  description: string;
  better: Better;
  format: (v: number) => string;
}

const pct = (v: number) => fmtPct(v);
const num = (d: number) => (v: number) => fmtDec(v, d);

export const METRICS: MetricDef[] = [
  { key: 'finding_recall', label: 'Độ phủ phát hiện đúng', description: 'Tỷ lệ phát hiện kỳ vọng được nêu trong kết luận', better: 'higher', format: pct },
  { key: 'false_findings', label: 'Phát hiện sai', description: 'Số khẳng định sai so với dữ liệu (mỗi lượt)', better: 'lower', format: num(2) },
  { key: 'citation_recall', label: 'Trích nguồn đúng', description: 'Tỷ lệ điều khoản/nguồn kỳ vọng được trích', better: 'higher', format: pct },
  { key: 'invalid_citations', label: 'Trích dẫn không tồn tại', description: 'Số điều khoản § trích ngoài chính sách (mỗi lượt)', better: 'lower', format: num(2) },
  { key: 'tool_recall', label: 'Độ phủ công cụ', description: 'Tỷ lệ công cụ bắt buộc đã gọi', better: 'higher', format: pct },
  { key: 'gate_ok', label: 'Tới đúng bước chờ người xác nhận', description: 'Tỷ lệ lượt dừng đúng cổng kỳ vọng, không tự duyệt', better: 'higher', format: pct },
  { key: 'tool_calls', label: 'Số lần tra cứu dữ liệu', description: 'Trung bình mỗi lượt (không xếp hơn/kém)', better: 'none', format: num(1) },
  { key: 'latency_s', label: 'Độ trễ', description: 'Giây từ lúc gửi đến kết luận', better: 'lower', format: fmtSec },
  { key: 'total_tokens', label: 'Khối lượng xử lý AI (token)', description: 'Tổng token LLM mỗi lượt', better: 'lower', format: (v) => fmtInt(v) },
  { key: 'cost_usd', label: 'Chi phí LLM', description: 'USD mỗi lượt gọi mô hình AI (số đo thật từ nhà cung cấp)', better: 'lower', format: (v) => fmtUsd(v) },
];

export function statText(stat: BenchmarkStat | undefined, def: MetricDef): string {
  if (!stat || stat.mean === null) return '—';
  const sd = stat.sd === null ? '' : ` ± ${def.format(stat.sd)}`;
  return `${def.format(stat.mean)}${sd}`;
}

/** Số chế độ thực có trong lượt đo (nhiều lượt chỉ chạy đa agent). */
export function modeCount(run: { summary: { single?: unknown; multi?: unknown } }): string {
  const n = [run.summary.single, run.summary.multi].filter(Boolean).length;
  return n === 1 ? '1 chế độ (đa agent)' : `${n || 2} chế độ`;
}

export function winnerOf(def: MetricDef, s?: BenchmarkModeSummary, m?: BenchmarkModeSummary): 'single' | 'multi' | 'tie' {
  const a = s?.[def.key]?.mean;
  const b = m?.[def.key]?.mean;
  if (def.better === 'none' || a == null || b == null || Math.abs(a - b) < 1e-9) return 'tie';
  const singleWins = def.better === 'higher' ? a > b : a < b;
  return singleWins ? 'single' : 'multi';
}

interface Row {
  id: string;
  label: string;
  description: string;
  single: string;
  multi: string;
  winner: 'single' | 'multi' | 'tie';
}

export function buildRows(run: BenchmarkRun): Row[] {
  const { single, multi } = run.summary;
  return METRICS.map((def) => ({
    id: def.key,
    label: def.label,
    description: def.description,
    single: statText(single?.[def.key], def),
    multi: statText(multi?.[def.key], def),
    winner: winnerOf(def, single, multi),
  }));
}

/** Kết luận sinh từ số đo thật: liệt kê chỉ số mỗi hệ hơn, không có câu cố định. */
export function conclusion(rows: Row[], run: BenchmarkRun): string {
  if (!run.summary.single || !run.summary.multi) return 'Lượt đo này chỉ chạy một chế độ nên chưa có kết luận so sánh.';
  const names = (w: 'single' | 'multi') => rows.filter((r) => r.winner === w).map((r) => r.label.charAt(0).toLowerCase() + r.label.slice(1));
  const s = names('single');
  const m = names('multi');
  const list = (xs: string[]) => (xs.length ? xs.join('; ') : 'không chỉ số nào');
  return `Đội agent hơn ở ${m.length} chỉ số: ${list(m)}. Mô hình đơn lẻ hơn ở ${s.length} chỉ số: ${list(s)}.`;
}

/** Dòng kết luận đầu trang: chênh lệch độ phủ phát hiện đúng giữa hai hệ, tính từ số đo thật. */
export function headline(run: BenchmarkRun): string {
  const a = run.summary.single?.finding_recall?.mean;
  const b = run.summary.multi?.finding_recall?.mean;
  if (a == null || b == null) return 'Lượt đo này chỉ chạy một chế độ nên chưa so sánh được hai hệ.';
  const d = (b - a) * 100;
  if (Math.abs(d) < 0.05) return 'Đội agent và mô hình đơn lẻ bằng nhau về độ phủ phát hiện đúng.';
  return `Đội agent ${d > 0 ? 'cao' : 'thấp'} hơn mô hình đơn lẻ ${fmtDec(Math.abs(d), 1)} điểm phần trăm về độ phủ phát hiện đúng (${fmtPct(b)} so với ${fmtPct(a)}).`;
}

function chartData(run: BenchmarkRun) {
  const keys: MetricKey[] = ['finding_recall', 'citation_recall', 'tool_recall', 'gate_ok'];
  const modes: [BenchmarkMode, string][] = [['single', 'Mô hình đơn lẻ'], ['multi', 'Đội agent']];
  return keys.flatMap((k) => {
    const def = METRICS.find((d) => d.key === k)!;
    return modes.map(([mode, series]) => ({
      category: def.label,
      series,
      value: Math.round((run.summary[mode]?.[k]?.mean ?? 0) * 1000) / 10,
    }));
  });
}

/** Lượt đo kiểm thử/thoái lui/bỏ từng phần (ablation): có nhãn riêng, không làm mặc định. */
export function isTestRun(m: { label: string }): boolean {
  return /kiểm thoái lui|bỏ cờ|kiểm thử|\babl\b|smoke|\btest\b/i.test(m.label ?? '');
}

export function hasBothModes(m: { modes?: string[] }): boolean {
  return !!m.modes && m.modes.includes('single') && m.modes.includes('multi');
}

/** Mặc định: trong các lượt chính thức (ưu tiên lượt có cả hai chế độ) chọn lượt có NHIỀU LẦN LẶP nhất, vì kết quả ổn định hơn; hòa thì bộ ca mới hơn, rồi lượt mới hơn. */
export function defaultRunId(metas: BenchmarkRunMeta[]): string | null {
  const official = metas.filter((m) => !m.regrade_of && !isTestRun(m));
  const both = official.filter(hasBothModes);
  const ok = both.length ? both : official;
  const pick = [...ok].sort((a, b) =>
    (a.runs_per_case ?? 0) - (b.runs_per_case ?? 0)
    || String(a.cases_version).localeCompare(String(b.cases_version))
    || a.created_at.localeCompare(b.created_at)).pop();
  return pick?.run_id ?? null;
}

/** Mô tả lượt đo bằng ngôn ngữ nghiệp vụ (không dùng nhãn dòng lệnh nội bộ). */
export function runDescription(m: Pick<BenchmarkRunMeta, 'runs_per_case' | 'cases_version' | 'modes' | 'regrade_of'>): string {
  if (m.regrade_of) return 'Chấm lại dữ liệu của một lượt đo cũ bằng bộ chấm mới; không chạy lại agent.';
  const n = m.runs_per_case;
  const how = n > 1
    ? `Đo lặp ${n} lần mỗi ca để lấy trung bình, kết quả ổn định hơn.`
    : 'Đo một lần mỗi ca, dùng để kiểm hồi quy nhanh sau khi sửa hệ thống; ít lần lặp nên dao động hơn.';
  return `${hasBothModes(m) ? 'So sánh đội agent với mô hình đơn lẻ' : 'Chỉ đo đội agent'} trên bộ ca ${m.cases_version}. ${how}`;
}

/** Thứ tự đo của bộ ca v8 (nhãn lưu: "v8 mù…" là lần 1, "v8 đo lại…" lần 2, "v8 đo lần ba…" lần 3); lượt khác không có số lần. */
export function blindOrdinal(label: string | null | undefined): number | null {
  const t = label ?? '';
  if (/^v8 đo lần ba(?=\s|$)/.test(t)) return 3;
  if (/^v8 đo lại(?=\s|$)/.test(t)) return 2;
  if (/^v8 mù(?=\s|$)/.test(t)) return 1;
  return null;
}

export function runOptionLabel(m: BenchmarkRunMeta): string {
  const n = blindOrdinal(m.label);
  const kind = m.regrade_of ? ' · chấm lại dữ liệu cũ' : '';
  const modes = hasBothModes(m) ? 'So sánh đội agent và mô hình đơn lẻ' : 'Chỉ đo đội agent';
  return `${fmtDayTime(m.created_at)} · Bộ ca ${m.cases_version}${n ? ` lần ${n}` : ''} · ${modes} · ${m.runs_per_case} lượt mỗi ca${kind}${isTestRun(m) ? ' · [Kiểm thử]' : ''}`;
}

/** Mã kỹ thuật của lượt đo (bộ chấm, chế độ LLM, nhãn dòng lệnh): chỉ là chú thích phụ cho người kiểm tra. */
export function runTechnicalNote(m: Pick<BenchmarkRunMeta, 'grader_version' | 'llm_mode' | 'label'> & { run_id?: string }): string {
  return `${m.run_id ? `Lượt đo ${m.run_id} · ` : ''}Bộ chấm ${m.grader_version} · chế độ LLM ${m.llm_mode}${m.label ? ` · nhãn: ${m.label}` : ''}`;
}

/** Select có hai nhóm: lượt đo chính thức, và nhóm riêng cho ablation/kiểm thoái lui (không xóa lượt nào). */
export function runOptionGroups(metas: BenchmarkRunMeta[]) {
  const opt = (m: BenchmarkRunMeta) => ({ value: m.run_id, label: runOptionLabel(m) });
  const official = metas.filter((m) => !isTestRun(m)).map(opt);
  const tests = metas.filter(isTestRun).map(opt);
  return [
    { label: `Lượt đo chính thức (${official.length})`, options: official },
    ...(tests.length ? [{ label: `Ablation và kiểm thoái lui — không phải kết quả chính (${tests.length})`, options: tests }] : []),
  ];
}

export function ComparisonTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const runsQ = useQuery({ queryKey: ['agent-benchmark-runs'], queryFn: getBenchmarkRuns });
  // Mặc định: lượt đo mới nhất không phải kiểm thử của bộ ca mới nhất; chọn thì đọc đúng lượt đó.
  const defaultId = runsQ.data ? defaultRunId(runsQ.data) : null;
  const effective = selected ?? defaultId;
  const q = useQuery({
    queryKey: ['agent-benchmark', effective],
    queryFn: () => (effective ? getBenchmarkRun(effective) : getLatestBenchmark()),
    enabled: !runsQ.isLoading,
  });

  if (runsQ.isLoading || q.isLoading) return <Skeleton active />;
  if (q.isError) {
    return <StateBlock kind="error" alert title="Không tải được kết quả so sánh" description="Kiểm tra quyền truy cập hoặc trạng thái agent engine." />;
  }
  const run = q.data?.run;
  if (!run) {
    return (
      <div data-testid="cmp-empty">
        <StateBlock kind="empty" title="Chưa có kết quả đo" description="Chạy bộ đo hiệu năng ở môi trường kiểm thử, kết quả sẽ hiện ở đây." />
      </div>
    );
  }

  const rows = buildRows(run);
  const notBetter = casesNotBetter(run.per_case);
  const cases = Object.keys(run.per_case).sort();
  const both = !!run.summary.single && !!run.summary.multi;
  const recall = METRICS[0];
  const single = run.summary.single?.finding_recall;
  const multi = run.summary.multi?.finding_recall;
  const singleModel = modelName(run.specialist_model);
  const verdict = (w: Row['winner']) =>
    w === 'multi' ? <StatusPill tone="ok">Đội agent tốt hơn</StatusPill>
      : w === 'single' ? <StatusPill tone="bad">Đội agent kém hơn</StatusPill>
        : <StatusPill>Ngang nhau</StatusPill>;
  const delta = (def: MetricDef) => {
    const a = run.summary.single?.[def.key]?.mean;
    const b = run.summary.multi?.[def.key]?.mean;
    if (a == null || b == null) return '—';
    const d = b - a;
    const unit = def.format === pct ? ' điểm phần trăm' : '';
    const v = def.format === pct ? fmtDec(Math.abs(d) * 100, 1) : def.format(Math.abs(d));
    return `${d > 0 ? '+' : d < 0 ? '−' : ''}${v}${unit}`;
  };

  return (
    <div className={styles.stack}>
      <section className={styles.card} aria-label="Chọn lượt đo">
        <div className={styles.cardBody}>
          <div className={styles.pickRow}>
            <label htmlFor="cmp-select">Lượt đo</label>
            <Select
              id="cmp-select"
              data-testid="cmp-select"
              value={effective ?? run.run_id}
              onChange={setSelected}
              options={runOptionGroups(runsQ.data ?? [])}
              loading={runsQ.isLoading}
            />
          </div>
          <span className={styles.cmpLabel} data-testid="cmp-label">
            <span style={{ display: 'block' }} data-testid="cmp-desc">{runDescription({ ...run, modes: (['single', 'multi'] as const).filter((k) => !!run.summary[k]) })}</span>
          </span>
          <details className={styles.techDet}>
            <summary>Chi tiết kỹ thuật (kiểm toán)</summary>
            <span data-testid="cmp-tech">{runTechnicalNote(run)}{BLIND_RUNS[run.run_id] ? ` · Bản khóa mã ${BLIND_RUNS[run.run_id].lockedCommit}` : ''}</span>
          </details>
        </div>
      </section>

      <div className={styles.headline} data-testid="cmp-headline" role="note">
        <p className={styles.bannerNote}><b>Nhận xét. </b>{headline(run)}</p>
      </div>

      <div className={styles.note} data-testid="cmp-meta" role="note">
        <p className={styles.bannerNote}>
          <b>Cách đo. </b>
          Bộ ca đánh giá <strong>{run.cases_version}</strong>, {cases.length} ca × {run.runs_per_case} lượt × {modeCount(run)}, đo ngày {fmtDay(run.created_at)}.
          Planner <strong>{modelName(run.planner_model)}</strong>; chuyên gia và mô hình đơn lẻ <strong>{singleModel}</strong>.
          Cách chấm: bộ chấm tự động, không dùng mô hình AI và không có người chấm; so từng phát hiện, điều khoản và công cụ kỳ vọng của mỗi ca với kết luận, cùng một thước cho hai chế độ.
          Chi phí đo thật <strong>{run.total_cost_usd === null ? '—' : fmtUsd(run.total_cost_usd)}</strong>.
        </p>
      </div>

      {both && (
        <div className={styles.vs}>
          <section className={styles.vsTeam} aria-label="Đội agent">
            <h2 className={styles.vsTitle}>Đội agent (6 agent)</h2>
            <span className={styles.vsLabel}>{recall.label}</span>
            <div className={styles.vsRow}><span className={styles.vsBig}>{statText(multi, recall)}</span></div>
          </section>
          <section className={styles.vsSingle} aria-label="Mô hình đơn lẻ">
            <h2 className={styles.vsTitle}>Mô hình đơn lẻ ({singleModel})</h2>
            <span className={styles.vsLabel}>{recall.label}</span>
            <div className={styles.vsRow}><span className={styles.vsBig}>{statText(single, recall)}</span></div>
          </section>
        </div>
      )}

      {BLIND_RUNS[run.run_id] && both && (
        <section className={styles.card} aria-labelledby="cmp-blind" data-testid="cmp-blind">
          <div className={styles.cardHead}>
            <h2 id="cmp-blind">{BLIND_RUNS[run.run_id].remeasure ? 'Số đo chính: đo lại trên bản mã đang chạy' : 'Số đo chính: đo mù trên bản đã khóa mã'}</h2>
            <span className={styles.cardNote}>Bộ ca và cách báo cáo đăng ký trước khi đo; trung bình ± độ lệch chuẩn</span>
          </div>
          <div className={`${styles.cardBody} ${styles.flush}`}>
            <DataTable<{ id: 'a' | 'b'; label: string }>
              rowKey="id"
              size="small"
              pagination={false}
              className={ledgerTable}
              dataSource={[
                { id: 'a', label: '(a) Độ phủ phát hiện theo đáp án đăng ký nguyên vẹn' },
                { id: 'b', label: '(b) Độ phủ không tính tổng cấp tín dụng và yêu cầu BCTC kiểm toán' },
              ]}
              columns={[
                { title: 'Dòng', dataIndex: 'label', key: 'label' },
                { title: 'Đội agent', key: 'multi', align: 'right', className: ledgerNum,
                  render: (_: unknown, r) => <span data-testid={`cmp-blind-${r.id}-multi`}>{fmtPct(BLIND_RUNS[run.run_id][r.id].multi.mean)} ± {fmtPct(BLIND_RUNS[run.run_id][r.id].multi.sd)}</span> },
                { title: 'Mô hình đơn lẻ', key: 'single', align: 'right', className: ledgerNum,
                  render: (_: unknown, r) => <span data-testid={`cmp-blind-${r.id}-single`}>{fmtPct(BLIND_RUNS[run.run_id][r.id].single.mean)} ± {fmtPct(BLIND_RUNS[run.run_id][r.id].single.sd)}</span> },
              ]}
            />
          </div>
          {BLIND_RUNS[run.run_id].remeasure && (
            <p className={styles.muted} style={{ padding: '0 var(--s5) var(--s4)' }} data-testid="cmp-remeasure-note">{REMEASURE_NOTE}</p>
          )}
          <p className={styles.muted} style={{ padding: '0 var(--s5) var(--s4)' }}>
            Dòng (a) là số đăng ký nguyên vẹn. Dòng (b) được định nghĩa sau khi thấy số của bộ đo cũ giảm (đáp án của hai loại phát hiện đó viết theo cách tính tổng cấp tín dụng cũ), nên là số tham khảo có giải thích, không phải kết quả mù thuần túy.
          </p>
        </section>
      )}

      <div className={styles.note} data-testid="cmp-coverage-note" role="note">
        <p className={styles.bannerNote}>
          <b>Vì sao độ phủ khác nhau giữa các lượt đo. </b>
          Từ 11/11/2026 hệ thống tính tổng cấp tín dụng theo đúng quy định (dư nợ tại ngân hàng cộng khoản vay mới, không cộng dư nợ ở tổ chức tín dụng khác).
          Đáp án đăng ký trước của hai loại phát hiện về tổng cấp tín dụng và yêu cầu BCTC kiểm toán được viết theo cách tính cũ nên cả hai chế độ đều không còn khớp,
          làm độ phủ ở các lượt đo sau lần sửa thấp hơn lượt trước đó. Đáp án không được viết lại.
          Số lần lặp mỗi ca cũng khác nhau giữa các lượt, nên đừng so trực tiếp lượt một lần với lượt nhiều lần.
        </p>
      </div>

      <section className={styles.card} aria-labelledby="cmp-detail">
        <div className={styles.cardHead}><h2 id="cmp-detail">Chênh lệch chi tiết</h2><span className={styles.cardNote}>Trung bình ± độ lệch chuẩn</span></div>
        <div className={`${styles.cardBody} ${styles.flush}`}>
          <DataTable<Row>
            rowKey="id"
            dataSource={rows}
            size="small"
            className={`${ledgerTable} ${styles.cmpTable}`}
            columns={[
              {
                title: 'Chỉ số',
                dataIndex: 'label',
                key: 'label',
                render: (label: string, record) => (
                  <span>
                    <span className={styles.metricName}>{label}</span>
                    <span className={styles.metricDesc}>{record.description}</span>
                  </span>
                ),
              },
              {
                title: 'Đội agent', dataIndex: 'multi', key: 'multi', align: 'right', className: ledgerNum,
                render: (value: string, record) => <span className={record.winner === 'multi' ? styles.best : undefined} data-testid={`cmp-${record.id}-multi`}>{value}</span>,
              },
              {
                title: 'Mô hình đơn lẻ', dataIndex: 'single', key: 'single', align: 'right', className: ledgerNum,
                render: (value: string, record) => <span className={record.winner === 'single' ? styles.best : undefined} data-testid={`cmp-${record.id}-single`}>{value}</span>,
              },
              {
                title: 'Chênh lệch', key: 'delta', align: 'right', className: ledgerNum,
                render: (_: unknown, record) => delta(METRICS.find((d) => d.key === record.id)!),
              },
              { title: 'Đánh giá', key: 'verdict', render: (_: unknown, record) => verdict(record.winner) },
            ]}
          />
        </div>
        <div className={styles.verdict}>
          <h3>Kết luận</h3>
          <p data-testid="cmp-conclusion">{conclusion(rows, run)}</p>
          {both && (
            <p data-testid="cmp-not-better">
              {notBetter.length
                ? `Ca đội agent không hơn mô hình đơn lẻ về độ phủ phát hiện (bằng hoặc thấp hơn): ${notBetter.map((c) => `${c.id} (${fmtPct(c.multi)} so với ${fmtPct(c.single)})`).join('; ')}.`
                : 'Không có ca nào đội agent bằng hoặc thấp hơn mô hình đơn lẻ về độ phủ phát hiện.'}
            </p>
          )}
          {both && <p className={styles.muted} data-testid="cmp-gate-note">{GATE_NOTE}</p>}
          <p className={styles.muted} data-testid="cmp-limit">{limitNote(run)}</p>
        </div>
      </section>

      <section className={styles.card} aria-labelledby="cmp-chart">
        <div className={styles.cardHead}><h2 id="cmp-chart">Chất lượng thẩm định: mô hình đơn lẻ so với đội agent</h2><span className={styles.cardNote}>Phần trăm, cột cao hơn là tốt hơn</span></div>
        <div className={styles.cardBody}>
          <LazyBaseChart<ReturnType<typeof chartData>[number]>
            type="column"
            data={chartData(run)}
            height={300}
            ariaLabel="Biểu đồ cột nhóm so sánh độ phủ phát hiện, trích nguồn, công cụ và đúng cổng giữa mô hình đơn lẻ và đội agent"
            config={{
              xField: 'category',
              yField: 'value',
              colorField: 'series',
              group: true,
              scale: { color: { range: ['#6F7660', '#6B4FB8'] } },
              legend: { color: { position: 'top' } },
              style: { radiusTopLeft: 3, radiusTopRight: 3, maxWidth: 46 },
              axis: { y: { title: '%' } },
            }}
          />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="cmp-case">
        <div className={styles.cardHead}><h2 id="cmp-case">Độ phủ phát hiện theo từng ca</h2></div>
        <div className={`${styles.cardBody} ${styles.flush}`}>
          <DataTable<{ id: string; single: string; multi: string }>
            rowKey="id"
            size="small"
            className={ledgerTable}
            pagination={false}
            dataSource={cases.map((id) => ({
              id,
              single: statText(run.per_case[id]?.single?.finding_recall, recall),
              multi: statText(run.per_case[id]?.multi?.finding_recall, recall),
            }))}
            columns={[
              { title: 'Ca', dataIndex: 'id', key: 'id' },
              { title: 'Đội agent', dataIndex: 'multi', key: 'multi', align: 'right', className: ledgerNum, render: (v: string, r) => <span data-testid={`cmp-case-${r.id}-multi`}>{v}</span> },
              { title: 'Mô hình đơn lẻ', dataIndex: 'single', key: 'single', align: 'right', className: ledgerNum, render: (v: string, r) => <span data-testid={`cmp-case-${r.id}-single`}>{v}</span> },
            ]}
          />
        </div>
        <p className={styles.muted} style={{ padding: '0 var(--s5) var(--s4)' }}>
          Chấm bằng từ khóa trên phần kết luận, không có LLM chấm; có thể bỏ sót cách diễn đạt khác.
          Đáp án viết trước khi chạy (bộ ca {run.cases_version}).
        </p>
      </section>
    </div>
  );
}
