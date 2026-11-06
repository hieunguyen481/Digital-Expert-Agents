import { Alert, Button, Card, Empty, Skeleton, Tag } from 'antd';
import {
  CheckCircleFilled, ClockCircleOutlined, DeploymentUnitOutlined, DollarOutlined, ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/tables/DataTable';
import { shbColors } from '@/theme/tokens';
import { getAgentCaseStats } from '@/services/agentCaseService';
import { STATE_COLOR, agentName, fmtSeconds, stateLabel } from '../agentTrace';
import styles from '@/pages/AgentDashboardPage.module.css';

/** Tổng quan: mọi số liệu tính từ trace thật trong Postgres, chỉ trên các case vai trò này được xem. */
export function OverviewTab() {
  const q = useQuery({ queryKey: ['agent-case-stats'], queryFn: getAgentCaseStats, refetchInterval: 10_000 });
  if (q.isLoading) return <Skeleton active />;
  if (q.isError) {
    return (
      <Alert type="error" showIcon message="Không tải được số liệu tổng quan"
        action={<Button size="small" onClick={() => void q.refetch()}>Thử lại</Button>} />
    );
  }
  const s = q.data;
  if (!s || s.cases === 0) {
    return <Empty description="Chưa có case nào để tổng hợp. Gửi một yêu cầu phân tích sâu ở trang trò chuyện, số liệu sẽ hiện ở đây." />;
  }

  const done = (s.by_state['Completed'] ?? 0) + (s.by_state['Pending Approval'] ?? 0);
  const tiles = [
    { label: 'Tổng case', icon: <DeploymentUnitOutlined />, value: String(s.cases), unit: 'case' },
    { label: 'Đã có kết luận', icon: <CheckCircleFilled style={{ color: shbColors.semantic.success }} />, value: String(done), unit: `/ ${s.cases}` },
    { label: 'Công cụ đã gọi', icon: <ToolOutlined />, value: String(s.tool_calls), unit: 'lần', accent: true },
    { label: 'Challenge của Validation', icon: <WarningOutlined />, value: String(s.challenges), unit: 'lần' },
    ...(s.avg_seconds != null
      ? [{ label: 'Thời gian trung bình', icon: <ClockCircleOutlined />, value: fmtSeconds(s.avg_seconds).split(' ')[0], unit: fmtSeconds(s.avg_seconds).split(' ')[1] }]
      : []),
    ...(s.cost_usd != null
      ? [{ label: 'Chi phí LLM', icon: <DollarOutlined />, value: s.cost_usd.toFixed(4), unit: `USD · ${s.llm_calls} lượt` }]
      : []),
  ];

  return (
    <div data-testid="overview">
      <div className={styles.kpiGrid}>
        {tiles.map((t) => (
          <div key={t.label} className={styles.kpi}>
            <span className={styles.kpiLabel}>{t.icon}{t.label}</span>
            <span className={[styles.kpiValue, t.accent ? styles.kpiAccent : ''].join(' ')}>
              {t.value} <span className={styles.kpiUnit}>{t.unit}</span>
            </span>
          </div>
        ))}
      </div>

      <Card className={styles.section} title="Trạng thái case" size="small">
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(s.by_state).map(([st, n]) => (
            <Tag key={st} color={STATE_COLOR[st] ?? 'default'}>{stateLabel(st)}: {n}</Tag>
          ))}
        </span>
      </Card>

      <Card className={styles.section} title="Theo từng agent" size="small">
        <DataTable<(typeof s.agents)[number]> rowKey="agent" dataSource={s.agents} size="small"
          emptyTitle="Chưa có tác vụ nào hoàn tất"
          columns={[
            { title: 'Agent', dataIndex: 'agent', key: 'agent', render: (a: string) => agentName(a) },
            { title: 'Tác vụ hoàn tất', dataIndex: 'tasks', key: 'tasks', align: 'right' },
            { title: 'Lỗi', dataIndex: 'errors', key: 'errors', align: 'right' },
            { title: 'Công cụ gọi', dataIndex: 'tool_calls', key: 'tool_calls', align: 'right' },
          ]}
        />
      </Card>

      {s.tools.length > 0 && (
        <Card className={styles.section} title="Công cụ MCP đã gọi" size="small">
          <DataTable<(typeof s.tools)[number]> rowKey="tool" dataSource={s.tools} size="small"
            columns={[
              { title: 'Công cụ', dataIndex: 'tool', key: 'tool' },
              { title: 'Số lần', dataIndex: 'n', key: 'n', align: 'right' },
              { title: 'Không thành công', dataIndex: 'failed', key: 'failed', align: 'right' },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
