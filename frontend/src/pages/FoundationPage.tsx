import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { Input, Select, Table, Tabs } from 'antd';
import { Button } from 'antd';
import { PageHead } from '@/features/shell/PageHead';
import {
  ActionButton,
  AgentTeam,
  AiBlock,
  CaseStepper,
  Flag,
  HumanBlock,
  KpiCard,
  StateBlock,
  StatusPill,
  Timeline,
  ledgerNum,
  ledgerTable,
} from '@/components/ui';
import { SHBLogo } from '@/components/common/SHBLogo';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { colors } from '@/theme';
import styles from './FoundationPage.module.css';

/**
 * Trang xem thành phần (chỉ DEV, `/foundation`). Mọi giá trị trong trang này là MẪU để xem giao diện,
 * không phải dữ liệu nghiệp vụ; trang không có trong bản build chạy thật.
 */
const BUTTON_STATES: Array<[string, boolean, boolean]> = [
  ['Mặc định', false, false],
  ['Disabled', true, false],
  ['Đang tải', false, true],
];

const SAMPLE_ROWS = [
  { key: '1', name: 'Mẫu A', id: 'MAU-0001', amount: 15_000_000_000, flag: 'g' as const },
  { key: '2', name: 'Mẫu B', id: 'MAU-0002', amount: 8_250_000_000, flag: 'y' as const },
  { key: '3', name: 'Mẫu C', id: 'MAU-0003', amount: 30_000_000_000, flag: 'r' as const },
];
const FLAG_TEXT = { g: 'Thấp', y: 'Trung bình', r: 'Cao' } as const;

export default function FoundationPage() {
  return (
    <>
      <PageHead
        title="Thành phần"
        facts={['Mọi trạng thái của thành phần dùng chung', 'Giá trị trong trang là mẫu, chỉ có ở bản DEV']}
        crumbs={[{ label: 'Việc của tôi', to: '/viec-cua-toi' }, { label: 'Thành phần' }]}
      />
      <div className={styles.sections}>
        <section aria-labelledby="f-color">
          <h2 id="f-color">Màu và chữ</h2>
          <div className={styles.swatches}>
            {Object.entries(colors).map(([k, v]) => (
              <div className={styles.sw} key={k}>
                <i style={{ background: v }} />
                <span>{k} {v}</span>
              </div>
            ))}
          </div>
          <div className={styles.secT}>Chữ</div>
          <p style={{ font: '600 var(--fs-26)/1.2 var(--font-display)', margin: 0 }}>Tiêu đề Newsreader: Thẩm định tín dụng</p>
          <p style={{ margin: '4px 0' }}>Nội dung Be Vietnam Pro: Hồ sơ vay vốn lưu động, thời hạn 12 tháng.</p>
          <p className="num" style={{ fontFamily: 'var(--font-num)', textAlign: 'left', margin: 0 }}>IBM Plex Mono: 1.250.000.000 · 12,5%</p>
          <div style={{ marginTop: 8 }}><SHBLogo showProductName /></div>
        </section>

        <section aria-labelledby="f-btn">
          <h2 id="f-btn">Nút</h2>
          {(['default', 'primary', 'gold', 'ai', 'danger'] as const).map((v) => (
            <div key={v}>
              <div className={styles.secT}>
                {{ default: 'Nút thường', primary: 'Nút chính (navy)', gold: 'Nút chốt (đồng), tối đa một nút mỗi màn hình, góc trên phải', ai: 'Nút AI', danger: 'Nút nguy hiểm' }[v]}
              </div>
              <div className={styles.gal}>
                {BUTTON_STATES.map(([label, disabled, loading]) => (
                  <div className={styles.cell} key={label}>
                    <span className={styles.lbl}>{label}</span>
                    <ActionButton variant={v} disabled={disabled} loading={loading} icon={v === 'primary' ? <PlusOutlined /> : v === 'default' ? <SaveOutlined /> : undefined}>
                      {{ default: 'Lưu bản nháp', primary: 'Gửi hồ sơ', gold: 'Chuyển Thẩm định', ai: 'Hỏi AI', danger: 'Từ chối' }[v]}
                    </ActionButton>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.secT}>Khóa kèm lý do</div>
          <ActionButton variant="gold" lockedReason="Còn 2 mục kiểm tra chưa xong.">Chuyển Thẩm định</ActionButton>
        </section>

        <section aria-labelledby="f-in">
          <h2 id="f-in">Ô nhập, chọn, tab</h2>
          <div className={styles.gal}>
            <div className={styles.cell}><span className={styles.lbl}>Mặc định</span><Input aria-label="Ví dụ mặc định" placeholder="Nhập nội dung" /></div>
            <div className={styles.cell}><span className={styles.lbl}>Disabled</span><Input aria-label="Ví dụ disabled" disabled value="Không sửa được" /></div>
            <div className={styles.cell}><span className={styles.lbl}>Lỗi</span><Input aria-label="Ví dụ lỗi" status="error" defaultValue="abc" aria-invalid aria-describedby="f-err" /><div id="f-err" style={{ color: 'var(--danger-700)', fontSize: 12, marginTop: 4 }}>Nhập số, ví dụ 12.</div></div>
            <div className={styles.cell}><span className={styles.lbl}>Chọn</span><Select aria-label="Ví dụ chọn" style={{ width: '100%' }} placeholder="Chọn" options={[{ value: 'a', label: 'Tùy chọn 1' }, { value: 'b', label: 'Tùy chọn 2' }]} /></div>
          </div>
          <div className={styles.secT}>Tab</div>
          <Tabs items={[{ key: 't', label: 'Tổng quan', children: null }, { key: 'u', label: 'Dấu vết', children: null }, { key: 'v', label: 'So sánh (chưa có dữ liệu)', disabled: true }]} />
        </section>

        <section aria-labelledby="f-tbl">
          <h2 id="f-tbl">Bảng kiểu sổ cái</h2>
          <div className={styles.card}>
            <Table
              className={ledgerTable}
              size="middle"
              pagination={false}
              dataSource={SAMPLE_ROWS}
              columns={[
                { title: 'Khách hàng', dataIndex: 'name', render: (v: string, r) => <><b>{v}</b><div style={{ font: '400 12px var(--font-num)', color: 'var(--ink-3)' }}>{r.id}</div></> },
                { title: 'Số tiền (đồng)', dataIndex: 'amount', align: 'right', className: ledgerNum, render: (v: number) => v.toLocaleString('vi-VN') },
                { title: 'Rủi ro', dataIndex: 'flag', render: (f: 'g' | 'y' | 'r') => <Flag level={f}>{FLAG_TEXT[f]}</Flag> },
              ]}
            />
          </div>
        </section>

        <section aria-labelledby="f-tag">
          <h2 id="f-tag">Thẻ chỉ số, badge, cờ</h2>
          <div className={styles.gal}>
            <KpiCard hero label="Chỉ số chính (mẫu)" value="12" note="hồ sơ" />
            <KpiCard label="Chỉ số phụ (mẫu)" value="3,4" note="ngày" delta={<span style={{ color: 'var(--ok-700)' }}>▼ 0,2 so với kỳ trước</span>} />
          </div>
          <div className={styles.secT}>Badge và cờ</div>
          <div className={styles.row}>
            <StatusPill>Nháp</StatusPill><StatusPill tone="ok">Đạt</StatusPill><StatusPill tone="warn">Chờ bổ sung</StatusPill>
            <StatusPill tone="bad">Quá hạn</StatusPill><StatusPill tone="info">Đang xử lý</StatusPill><StatusPill tone="ai">AI đang chạy</StatusPill><StatusPill tone="human">Người quyết định</StatusPill>
            <Flag level="g">Thấp</Flag><Flag level="y">Trung bình</Flag><Flag level="r">Cao</Flag>
          </div>
        </section>

        <section aria-labelledby="f-st">
          <h2 id="f-st">Bước hồ sơ và dòng thời gian</h2>
          <CaseStepper current={2} />
          <CaseStepper current={2} returned />
          <div style={{ maxWidth: 480, marginTop: 16 }}>
            <Timeline
              entries={[
                { key: 'a', time: 'Mẫu · 09:10', title: 'Chuyên viên gửi hồ sơ' },
                { key: 'b', time: 'Mẫu · 09:12', title: 'AI đề xuất kiểm tra', ai: true },
                { key: 'c', time: 'Mẫu · 10:40', title: 'Thẩm định nhận hồ sơ', current: true },
              ]}
            />
          </div>
        </section>

        <section aria-labelledby="f-blk">
          <h2 id="f-blk">Khối AI và khối người quyết định</h2>
          <div className={styles.galWide}>
            <AiBlock title="Tóm tắt rủi ro">Nội dung do AI sinh, chưa được xác nhận. Người phụ trách xem và sửa trước khi dùng.</AiBlock>
            <HumanBlock title="Quyết định phê duyệt">Quyết định do Cấp phê duyệt hoặc Hội đồng xác nhận, có ghi nhật ký.</HumanBlock>
          </div>
        </section>

        <section aria-labelledby="f-team">
          <h2 id="f-team">Đội agent (một thành phần, ba biến thể)</h2>
          <div className={styles.secT}>Cây (full)</div>
          <AgentTeam states={{ planner: 'done', credit: 'done', compliance: 'run', operations: 'idle', document: 'err' }} durationsMs={{ planner: 2100, credit: 7700 }} />
          <div className={styles.secT}>Thu gọn (compact)</div>
          <AgentTeam variant="compact" states={{ planner: 'done', credit: 'done', compliance: 'run', document: 'err' }} />
          <div className={styles.secT}>Dải (strip)</div>
          <AgentTeam variant="strip" states={{ planner: 'done', credit: 'done', compliance: 'done', operations: 'done', document: 'done', validation: 'done' }} durationsMs={{ planner: 2100, credit: 7700, compliance: 6300, operations: 5100, document: 9500, validation: 3800 }} />
        </section>

        <section aria-labelledby="f-state">
          <h2 id="f-state">Trạng thái</h2>
          <div className={styles.galWide}>
            <div className={styles.stateCard}><StateBlock kind="empty" title="Chưa có hồ sơ nào" description="Khi có hồ sơ giao cho bạn, chúng xuất hiện ở đây." action={<Button type="primary">Tạo đề xuất vay</Button>} /></div>
            <div className={styles.stateCard}><StateBlock kind="error" title="Không tải được dữ liệu" description="Kiểm tra kết nối rồi thử lại." action={<Button type="primary">Thử lại</Button>} /></div>
            <div className={styles.stateCard}><StateBlock kind="forbidden" title="Không có quyền xem trang này" description="Trang này không thuộc phạm vi vai của bạn." action={<Button type="primary">Về Việc của tôi</Button>} /></div>
            <div className={styles.stateCard}><StateBlock kind="notfound" code="404" title="Không tìm thấy trang" description="Đường dẫn có thể đã cũ." action={<Button type="primary">Về Việc của tôi</Button>} /></div>
            <div className={styles.stateCard}><LoadingScreen inline message="Đang tải" /></div>
          </div>
        </section>
      </div>
    </>
  );
}
