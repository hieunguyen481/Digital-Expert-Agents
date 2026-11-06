import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export interface AiContext {
  type: 'case' | 'metric' | 'flag' | 'doc' | 'policy' | 'customer' | 'session';
  id: string;
  label: string;
}

export interface AiPanelState {
  open: boolean;
  context: AiContext | null;
  /** Mở panel (hoặc chỉ đổi ngữ cảnh nếu đang mở). Không bao giờ nhân đôi panel. */
  openWith: (context?: AiContext) => void;
  close: () => void;
  toggle: () => void;
}

const Ctx = createContext<AiPanelState | null>(null);

export function AiPanelProvider({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<AiContext | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const openWith = useCallback(
    (next?: AiContext) => {
      if (!enabled) return;
      setOpen((wasOpen) => {
        if (!wasOpen) opener.current = document.activeElement as HTMLElement | null;
        return true;
      });
      if (next) setContext(next);
    },
    [enabled],
  );

  const close = useCallback(() => {
    setOpen(false);
    const target = opener.current;
    opener.current = null;
    // Trả focus sau khi panel đã inert.
    queueMicrotask(() => target?.focus?.());
  }, []);

  const toggle = useCallback(() => {
    if (open) close();
    else openWith();
  }, [open, close, openWith]);

  const value = useMemo<AiPanelState>(
    () => ({ open: enabled && open, context, openWith, close, toggle }),
    [enabled, open, context, openWith, close, toggle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAiPanel(): AiPanelState {
  const value = useContext(Ctx);
  if (!value) throw new Error('useAiPanel phải nằm trong AiPanelProvider');
  return value;
}
