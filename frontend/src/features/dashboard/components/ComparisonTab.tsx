import { useState } from 'react';
import { Alert, Card, Empty, Select, Skeleton, Typography } from 'antd';
import { CheckCircleFilled, ThunderboltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/tables/DataTable';
import { LazyBaseChart } from '@/components/charts/LazyBaseChart';
import { shbColors } from '@/theme/tokens';
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
import styles from '@/pages/AgentDashboardPage.module.css';

const { Text } = Typography;

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
  { key: 'tool_calls', label: 'Số lượt gọi công cụ MCP', description: 'Trung bình mỗi lượt (không xếp hơn/kém)', better: 'none', format: num(1) },
  { key: 'latency_s', label: 'Độ trễ', description: 'Giây từ lúc gửi đến kết luận', better: 'lower', format: fmtSec },
  { key: 'total_tokens', label: 'Token', description: 'Tổng token LLM mỗi lượt', better: 'lower', format: (v) => fmtInt(v) },
  { key: 'cost_usd', label: 'Chi phí LLM', description: 'USD mỗi lượt (OpenRouter usage.cost)', better: 'lower', format: (v) => fmtUsd(v) },
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
  const names = (w: 'single' | 'multi') => rows.filter((r) => r.winner === w).map((r) => r.label.toLowerCase());
  const s = names('single');
  const m = names('multi');
  const list = (xs: string[]) => (xs.length ? xs.join('; ') : 'không chỉ số nào');
  return `Hệ đa agent hơn ở ${m.length} chỉ số: ${list(m)}. Chatbot đơn agent hơn ở ${s.length} chỉ số: ${list(s)}.`;
}

/** Dòng kết luận đầu trang: chênh lệch độ phủ phát hiện đúng giữa hai hệ, tính từ số đo thật. */
export function headline(run: BenchmarkRun): string {
  const a = run.summary.single?.finding_recall?.mean;
  const b = run.summary.multi?.finding_recall?.mean;
  if (a == null || b == null) return 'Lượt đo này chỉ chạy một chế độ nên chưa so sánh được hai hệ.';
  const d = (b - a) * 100;
  if (Math.abs(d) < 0.05) return 'Hệ đa agent và chatbot đơn agent bằng nhau về độ phủ phát hiện đúng.';
  return `Hệ đa agent ${d > 0 ? 'cao' : 'thấp'} hơn chatbot đơn agent ${fmtDec(Math.abs(d), 1)} điểm phần trăm về độ phủ phát hiện đúng (${fmtPct(b)} so với ${fmtPct(a)}).`;
}

function chartData(run: BenchmarkRun) {
  const keys: MetricKey[] = ['finding_recall', 'citation_recall', 'tool_recall', 'gate_ok'];
  const modes: [BenchmarkMode, string][] = [['single', 'Đơn agent'], ['multi', 'Đa agent']];
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
  return /kiểm thoái lui|kiểm thử|\babl\b|smoke|\btest\b/i.test(m.label ?? '');
}

export function hasBothModes(m: { modes?: string[] }): boolean {
  return !!m.modes && m.modes.includes('single') && m.modes.includes('multi');
}

/** Mặc định: lượt hai chế độ chính thức (không chấm lại, không kiểm thử) mới nhất; chưa có thì lượt chính thức mới nhất. */
export function defaultRunId(metas: BenchmarkRunMeta[]): string | null {
  const official = metas.filter((m) => !m.regrade_of && !isTestRun(m));
  const both = official.filter(hasBothModes);
  const ok = both.length ? both : official;
  const set = ok.map((m) => m.cases_version).sort().pop();
  const pick = ok.filter((m) => m.cases_version === set).sort((a, b) => a.created_at.localeCompare(b.created_at)).pop();
  return pick?.run_id ?? null;
}

export function runOptionLabel(m: BenchmarkRunMeta): string {
  const when = fmtDayTime(m.created_at);
  const kind = m.regrade_of ? 'chấm lại dữ liệu cũ' : 'đo mới';
  return `Bộ ca ${m.cases_version} · bộ chấm ${m.grader_version} · chế độ ${m.llm_mode} · ${kind} · ${when}${m.label ? ` · ${m.label}` : ''}${isTestRun(m) ? ' · [Kiểm thử]' : ''}`;
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
    return <Alert type="error" showIcon message="Không tải được kết quả so sánh" description="Kiểm tra quyền truy cập hoặc trạng thái agent engine." />;
  }
  const run = q.data?.run;
  if (!run) {
    return (
      <Card size="small" data-testid="cmp-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có kết quả đo. Chạy: python3 agent_engine/scripts/benchmark/run.py"
        />
      </Card>
    );
  }

  const rows = buildRows(run);
  const cases = Object.keys(run.per_case).sort();
  return (
    <>
      <Card size="small" className={styles.section}>
        <span style={{ marginRight: 8 }}>Lượt đo:</span>
        <Select
          data-testid="cmp-select"
          style={{ minWidth: 560, maxWidth: '100%' }}
          value={effective ?? run.run_id}
          onChange={setSelected}
          options={(runsQ.data ?? []).map((m) => ({ value: m.run_id, label: runOptionLabel(m) }))}
          loading={runsQ.isLoading}
        />
        <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }} data-testid="cmp-label">
          {run.label || `Đo mới, bộ chấm ${run.grader_version}`}
        </Text>
      </Card>
      <Alert type="info" showIcon style={{ marginBottom: 12 }} data-testid="cmp-headline" message={headline(run)} />
      <div className={styles.cmpHead} data-testid="cmp-meta">
        <ThunderboltOutlined />
        <span>
          Bộ ca <strong>{run.cases_version}</strong> · bộ chấm <strong>{run.grader_version}</strong> · {cases.length} ca × {run.runs_per_case} lượt × {modeCount(run)} ·{' '}
          Planner <strong>{modelName(run.planner_model)}</strong> · Chuyên gia/đơn agent <strong>{modelName(run.specialist_model)}</strong> ·{' '}
          chế độ {run.llm_mode} · chi phí đo thật{' '}
          <strong>{run.total_cost_usd === null ? '—' : fmtUsd(run.total_cost_usd)}</strong> · {fmtDay(run.created_at)}
          <details style={{ display: 'inline', marginLeft: 6 }}><summary style={{ display: 'inline', cursor: 'pointer', color: 'var(--text-3)' }}>Mã kỹ thuật</summary> <code>{run.run_id}</code></details>
        </span>
      </div>

      <Card className={styles.section} title="Chất lượng thẩm định — đơn agent so với đa agent" size="small">
        <p className={styles.sectionDesc}>
          Trung bình trên cùng bộ ca, cùng bộ chấm tự động (phần trăm; cột cao hơn là tốt hơn).
        </p>
        <LazyBaseChart<ReturnType<typeof chartData>[number]>
          type="column"
          data={chartData(run)}
          height={300}
          ariaLabel="Biểu đồ cột nhóm so sánh độ phủ phát hiện, trích nguồn, công cụ và đúng cổng giữa đơn agent và đa agent"
          config={{
            xField: 'category',
            yField: 'value',
            colorField: 'series',
            group: true,
            scale: { color: { range: [shbColors.navy[300], shbColors.orange[500]] } },
            legend: { color: { position: 'top' } },
            style: { radiusTopLeft: 5, radiusTopRight: 5, maxWidth: 46 },
            axis: { y: { title: '%' } },
          }}
        />
      </Card>

      <Card className={styles.section} title="So sánh chi tiết (trung bình ± độ lệch chuẩn)" size="small">
        <DataTable<Row>
          rowKey="id"
          dataSource={rows}
          size="small"
          columns={[
            {
              title: 'Chỉ tiêu',
              dataIndex: 'label',
              key: 'label',
              render: (label: string, record) => (
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 550 }}>{label}</span>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>{record.description}</Text>
                </span>
              ),
            },
            {
              title: 'Chatbot đơn agent',
              dataIndex: 'single',
              key: 'single',
              render: (value: string, record) => (
                <span className={styles.winnerCell} data-testid={`cmp-${record.id}-single`}>
                  {record.winner === 'single' && <CheckCircleFilled style={{ color: shbColors.semantic.success }} />}
                  {value}
                </span>
              ),
            },
            {
              title: 'Hệ đa agent',
              dataIndex: 'multi',
              key: 'multi',
              render: (value: string, record) => (
                <span className={styles.winnerCell} data-testid={`cmp-${record.id}-multi`}>
                  {record.winner === 'multi' && <CheckCircleFilled style={{ color: shbColors.semantic.success }} />}
                  <strong>{value}</strong>
                </span>
              ),
            },
          ]}
        />

        <div className={styles.verdict}>
          <h4 className={styles.verdictTitle}>Kết luận</h4>
          <p className={styles.verdictText} data-testid="cmp-conclusion">{conclusion(rows, run)}</p>
        </div>
      </Card>

      <Card className={styles.section} title="Độ phủ phát hiện theo từng ca" size="small">
        <DataTable<{ id: string; single: string; multi: string }>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={cases.map((id) => {
            const def = METRICS[0];
            return {
              id,
              single: statText(run.per_case[id]?.single?.finding_recall, def),
              multi: statText(run.per_case[id]?.multi?.finding_recall, def),
            };
          })}
          columns={[
            { title: 'Ca', dataIndex: 'id', key: 'id' },
            { title: 'Đơn agent', dataIndex: 'single', key: 'single', render: (v: string, r) => <span data-testid={`cmp-case-${r.id}-single`}>{v}</span> },
            { title: 'Đa agent', dataIndex: 'multi', key: 'multi', render: (v: string, r) => <span data-testid={`cmp-case-${r.id}-multi`}>{v}</span> },
          ]}
        />
        <p className={styles.sectionDesc} style={{ marginTop: 10 }}>
          Chấm bằng từ khóa trên phần kết luận, không có LLM chấm; có thể bỏ sót cách diễn đạt khác.
          Đáp án viết trước khi chạy (bộ ca {run.cases_version}).
        </p>
      </Card>
    </>
  );
}
