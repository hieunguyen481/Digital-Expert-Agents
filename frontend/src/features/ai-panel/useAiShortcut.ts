import { useEffect } from 'react';
import { useAiPanel } from './AiPanelContext';

/** Ctrl+J bật/tắt panel, kể cả khi focus đang ở trong ô nhập. */
export function useAiShortcut(): void {
  const { toggle } = useAiPanel();
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);
}
