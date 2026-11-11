import {
  AuditOutlined,
  BankOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  FundOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ComponentType } from 'react';
import type { UiRole } from '@/auth/roleFromMe';

export interface QuickPrompt {
  id: string;
  title: string;
  description: string;
  /** Icon component từ @ant-design/icons — nguồn icon duy nhất của dự án. */
  icon: ComponentType;
  /** Câu hỏi thực tế được gửi khi chọn thẻ; không chứa mã hồ sơ hay tên khách cụ thể. */
  prompt: string;
}

const CONCLUSION: QuickPrompt = {
  id: 'conclusion',
  title: 'Kết luận thẩm định',
  description: 'Kết luận gần nhất của đội agent về hồ sơ',
  icon: SolutionOutlined,
  prompt: 'Kết luận thẩm định gần nhất của hồ sơ này là gì?',
};
const METRICS: QuickPrompt = {
  id: 'metrics',
  title: 'Chỉ số DSCR, LTV',
  description: 'Các chỉ số tài chính và ngưỡng chính sách',
  icon: FundOutlined,
  prompt: 'Chỉ số DSCR và LTV của hồ sơ này là bao nhiêu, so với ngưỡng chính sách?',
};
const FLAGS: QuickPrompt = {
  id: 'flags',
  title: 'Cờ rủi ro',
  description: 'Điểm cần lưu ý và điều kiện kèm theo',
  icon: ExclamationCircleOutlined,
  prompt: 'Hồ sơ này có cờ rủi ro hay điều kiện kèm theo nào cần lưu ý?',
};
const POLICY: QuickPrompt = {
  id: 'policy',
  title: 'Điều khoản chính sách',
  description: 'Điều khoản áp dụng và ngưỡng cho phép',
  icon: BankOutlined,
  prompt: 'Điều khoản chính sách nào quy định tỷ lệ cho vay tối đa trên tài sản bảo đảm?',
};
const AUTHORITY: QuickPrompt = {
  id: 'authority',
  title: 'Ai quyết định',
  description: 'Cấp phê duyệt theo thẩm quyền',
  icon: TeamOutlined,
  prompt: 'Hồ sơ này thuộc thẩm quyền phê duyệt của cấp nào?',
};
const LIMIT: QuickPrompt = {
  id: 'limit',
  title: 'Hạn mức và dư nợ',
  description: 'Hạn mức đề nghị, dư nợ hiện hữu của khách',
  icon: AuditOutlined,
  prompt: 'Hạn mức đề nghị và dư nợ hiện hữu của khách hàng là bao nhiêu?',
};
const COMPLIANCE: QuickPrompt = {
  id: 'compliance',
  title: 'Tuân thủ',
  description: 'Quy định áp dụng cho hồ sơ',
  icon: SafetyCertificateOutlined,
  prompt: 'Quy định nào cần tuân thủ khi xét hồ sơ vay vốn lưu động này?',
};
const PROCESS: QuickPrompt = {
  id: 'process',
  title: 'Quy trình xử lý',
  description: 'Các bước và chứng từ theo chính sách',
  icon: FileSearchOutlined,
  prompt: 'Hồ sơ vay vốn lưu động SME cần những chứng từ nào theo chính sách?',
};

/** 3–4 câu hỏi gợi ý theo vai; mọi câu đều là câu hỏi hợp lệ về hồ sơ hoặc chính sách. */
const BY_ROLE: Partial<Record<UiRole, readonly QuickPrompt[]>> = {
  qhkh: [LIMIT, CONCLUSION, POLICY, PROCESS],
  httd: [PROCESS, LIMIT, POLICY],
  tdinh: [METRICS, CONCLUSION, FLAGS, POLICY],
  ruiro: [FLAGS, COMPLIANCE, POLICY, METRICS],
  pheduyet: [CONCLUSION, FLAGS, AUTHORITY, METRICS],
  truongphong: [CONCLUSION, METRICS, AUTHORITY, FLAGS],
  kiemtoan: [CONCLUSION, AUTHORITY, POLICY],
};

export function quickPromptsFor(role: UiRole | null | undefined): readonly QuickPrompt[] {
  return (role && BY_ROLE[role]) || [CONCLUSION, METRICS, FLAGS, POLICY];
}
