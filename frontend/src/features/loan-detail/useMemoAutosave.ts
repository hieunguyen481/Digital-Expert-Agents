import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isApiError } from '@/services/apiClient';
import { decideAiBlock, fetchMemo, saveMemo } from './loanDetailService';
import type { MemoView } from './types';

export type MemoSaveState =
  | { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: string }
  | { kind: 'error'; message: string } | { kind: 'conflict' };

/** Tự lưu Tờ trình: gõ xong `debounceMs` thì PUT kèm version đã nạp; 409 VERSION_CONFLICT → dừng, không ghi đè. */
export function useMemoAutosave(loanId: string, debounceMs = 1200) {
  const qc = useQueryClient();
  const [view, setView] = useState<MemoView | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [state, setState] = useState<MemoSaveState>({ kind: 'idle' });
  const [loadError, setLoadError] = useState<string | null>(null);
  const version = useRef(0);
  const dirty = useRef<Record<string, string>>({});
  const inflight = useRef(false);
  const conflict = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const adopt = useCallback((v: MemoView) => {
    setView(v);
    version.current = v.draft?.version ?? 0;
    const next: Record<string, string> = {};
    Object.entries(v.draft?.sections ?? {}).forEach(([k, s]) => { next[k] = s.body; });
    dirty.current = {};
    conflict.current = false;
    setBodies(next);
  }, []);

  const reload = useCallback(async () => {
    try { adopt(await fetchMemo(loanId)); setLoadError(null); setState({ kind: 'idle' }); }
    catch (e) { setLoadError(isApiError(e) ? e.message : 'Không tải được Tờ trình'); }
  }, [adopt, loanId]);

  useEffect(() => { void reload(); return () => clearTimeout(timer.current); }, [reload]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (inflight.current || conflict.current || Object.keys(dirty.current).length === 0) return;
    const sending = dirty.current;
    dirty.current = {};
    inflight.current = true;
    setState({ kind: 'saving' });
    try {
      const v = await saveMemo(loanId, version.current, sending);
      version.current = v.draft?.version ?? version.current;
      setView(v);
      setState({ kind: 'saved', at: v.draft?.updated_at ?? new Date().toISOString() });
      void qc.invalidateQueries({ queryKey: ['loan-actions', loanId] }); // điều kiện khóa phụ thuộc tờ trình (L11)
    } catch (e) {
      dirty.current = { ...sending, ...dirty.current };
      if (isApiError(e) && e.status === 409 && e.code === 'VERSION_CONFLICT') {
        conflict.current = true;
        setState({ kind: 'conflict' });
      } else {
        setState({ kind: 'error', message: isApiError(e) ? e.message : 'Không lưu được Tờ trình' });
      }
    } finally { inflight.current = false; }
    if (!conflict.current && Object.keys(dirty.current).length) timer.current = setTimeout(() => void flush(), 0);
  }, [loanId]);

  const change = useCallback((section: string, text: string) => {
    setBodies((b) => ({ ...b, [section]: text }));
    dirty.current = { ...dirty.current, [section]: text };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), debounceMs);
  }, [debounceMs, flush]);

  const decide = useCallback(async (blockId: string, decision: 'CONFIRM' | 'REJECT') => {
    await flush();
    try {
      const v = await decideAiBlock(loanId, blockId, version.current, decision);
      version.current = v.draft?.version ?? version.current;
      setView(v);
      setState({ kind: 'saved', at: new Date().toISOString() });
    } catch (e) {
      if (isApiError(e) && e.status === 409 && e.code === 'VERSION_CONFLICT') { conflict.current = true; setState({ kind: 'conflict' }); }
      else setState({ kind: 'error', message: isApiError(e) ? e.message : 'Không ghi được quyết định' });
    }
  }, [flush, loanId]);

  return { view, bodies, state, loadError, change, decide, reload, saveNow: flush };
}
