import { Alert, Button, Typography } from 'antd';
import type { SaveState } from './useDraftAutosave';

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

export function SaveStatusText({ state }: { state: SaveState }) {
  const text =
    state.kind === 'saving'
      ? 'Đang lưu nháp…'
      : state.kind === 'saved'
        ? `Đã tự lưu nháp lúc ${fmt(state.at)}`
        : state.kind === 'invalid'
          ? 'Chưa lưu: số tiền hoặc kỳ hạn chưa hợp lệ'
          : state.kind === 'error'
            ? `Chưa lưu được: ${state.message}`
            : state.kind === 'conflict'
              ? 'Chưa lưu: nháp đã đổi ở nơi khác'
              : 'Chưa có thay đổi';
  return (
    <Typography.Text type={state.kind === 'error' || state.kind === 'conflict' ? 'danger' : 'secondary'} role="status" data-testid="save-status">
      {text}
    </Typography.Text>
  );
}

export function ConflictBanner({ state, onReload }: { state: SaveState; onReload: () => void }) {
  if (state.kind !== 'conflict') return null;
  return (
    <Alert
      type="error"
      showIcon
      role="alert"
      message="Đề xuất này vừa được lưu ở tab hoặc phiên khác"
      description={`${state.savedBy ? `${state.savedBy} đã lưu` : 'Đã có bản lưu mới hơn'}${
        state.savedAt ? ` lúc ${fmt(state.savedAt)}` : ''
      }. Thay đổi của bạn chưa được ghi để tránh đè mất bản kia. Tải bản mới nhất rồi sửa tiếp.`}
      action={<Button onClick={onReload}>Tải bản mới nhất</Button>}
    />
  );
}
