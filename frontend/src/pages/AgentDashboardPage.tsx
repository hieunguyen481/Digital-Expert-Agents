import { useState } from 'react';
import { Tabs } from 'antd';
import {
  DeploymentUnitOutlined,
  RiseOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { PageHead } from '@/features/shell/PageHead';
import { OverviewTab, TracesTab, ComparisonTab } from '@/features/dashboard/components';
import styles from './AgentDashboardPage.module.css';

/**
 * Dashboard giám sát hệ chuyên gia số.
 *
 * Đáp ứng 2 deliverable của đề bài:
 * 1. "A dashboard showing agent traces, task status, decisions, collaboration flows"
 * 2. "A performance comparison between a single-agent chatbot and the multi-agent system"
 */
export default function AgentDashboardPage() {
  const caseParam = useSearchParams()[0].get('case');
  const [tab, setTab] = useState(caseParam ? 'traces' : 'overview');

  return (
    <div className={styles.page}>
      <PageHead title="Giám sát đội agent"
        facts={['Theo dõi tiến trình, quyết định và luồng cộng tác giữa các agent chuyên môn']} />
      <div className={styles.container}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <RiseOutlined /> Tổng quan
                </span>
              ),
              children: <OverviewTab />,
            },
            {
              key: 'traces',
              label: (
                <span>
                  <DeploymentUnitOutlined /> Agent traces
                </span>
              ),
              children: <TracesTab initialCaseId={caseParam} />,
            },
            {
              key: 'comparison',
              label: (
                <span>
                  <ThunderboltOutlined /> So sánh hiệu năng
                </span>
              ),
              children: <ComparisonTab />,
            },
          ]}
        />
      </div>
    </div>
  );
}
