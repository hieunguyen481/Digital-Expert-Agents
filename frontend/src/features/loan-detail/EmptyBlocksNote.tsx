import styles from './loan-detail.module.css';

export type EmptyKey = 'metrics' | 'flags' | 'conditions' | 'collaterals';
const LABEL: Record<EmptyKey, string> = {
  metrics: 'chỉ số có nguồn', flags: 'cờ', conditions: 'điều kiện trước giải ngân', collaterals: 'tài sản bảo đảm',
};
const ORDER: EmptyKey[] = ['metrics', 'flags', 'conditions', 'collaterals'];

/** Các khối đang rỗng, theo thứ tự hiển thị trên trang. */
export function emptyBlocks(isEmpty: Record<EmptyKey, boolean>): { key: EmptyKey; label: string }[] {
  return ORDER.filter((k) => isEmpty[k]).map((k) => ({ key: k, label: LABEL[k] }));
}

/** Một dòng thay cho nhiều thẻ rỗng, để màn đầu không toàn khung trống. */
export function EmptyBlocksNote({ labels }: { labels: string[] }) {
  return <p className={styles.note} data-testid="loan-empty-blocks" style={{ margin: 0 }}>Chưa có: {labels.join(', ')}.</p>;
}
