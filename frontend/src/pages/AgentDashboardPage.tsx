import { useState } from 'react';
import { Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { PageHead } from '@/features/shell/PageHead';
import { OverviewTab, TracesTab, ComparisonTab } from '@/features/dashboard/components';
import styles from './AgentDashboardPage.module.css';

/**
 * Đội agent: giám sát các lượt chạy (Tổng quan, Dấu vết) và so sánh đội agent với mô hình đơn lẻ.
 * Đáp ứng 2 deliverable của đề bài: dashboard (trace, trạng thái, quyết định, luồng cộng tác) và so sánh single/multi.
 */
export default function AgentDashboardPage() {
  const caseParam = useSearchParams()[0].get('case');
  const [tab, setTab] = useState(caseParam ? 'traces' : 'overview');

  return (
    <div className={styles.page}>
      <PageHead title="Đội agent" facts={['Giám sát các lượt chạy của đội agent. AI chỉ đề xuất, người quyết định.']} />
      <div className={styles.body}>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        more={{ 'aria-label': 'Thêm tab' }}
        items={[
          { key: 'overview', label: 'Tổng quan', children: <OverviewTab /> },
          { key: 'traces', label: 'Dấu vết', children: <TracesTab initialCaseId={caseParam} /> },
          { key: 'comparison', label: 'So sánh', children: <ComparisonTab /> },
        ]}
      />
      </div>
    </div>
  );
}
