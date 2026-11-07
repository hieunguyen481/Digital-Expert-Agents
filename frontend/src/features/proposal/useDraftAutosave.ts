import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError } from '@/services/apiClient';
import { draftToForm, formToSaveBody, sameForm } from './draftForm';
import { fetchDraft, saveDraft } from './proposalService';
import type { Draft, DraftForm } from './types';

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; savedBy: string | null; savedAt: string | null };

interface Options {
  debounceMs?: number;
}

/**
 * Tự lưu nháp: gõ xong `debounceMs` thì PUT kèm version đã nạp. Server lệch version (tab/phiên khác
 * đã lưu) trả 409 VERSION_CONFLICT → dừng tự lưu, không ghi đè, chờ người dùng "Tải bản mới nhất".
 */
export function useDraftAutosave(loanId: string, { debounceMs = 1200 }: Options = {}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const base = useRef<{ form: DraftForm; version: number } | null>(null);
  const latest = useRef<DraftForm | null>(null);
  const inflight = useRef(false);
  const conflict = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const adopt = useCallback((d: Draft) => {
    const f = draftToForm(d);
    base.current = { form: f, version: d.version };
    latest.current = f;
    conflict.current = false;
    setDraft(d);
    setForm(f);
    setState(d.saved_at ? { kind: 'saved', at: d.saved_at } : { kind: 'idle' });
  }, []);

  const reload = useCallback(async () => {
    try {
      adopt(await fetchDraft(loanId));
      setLoadError(null);
    } catch (e) {
      setLoadError(isApiError(e) ? e.message : 'Không tải được nháp');
    }
  }, [adopt, loanId]);

  useEffect(() => {
    void reload();
    return () => clearTimeout(timer.current);
  }, [reload]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (inflight.current || conflict.current || !base.current || !latest.current) return;
    if (sameForm(latest.current, base.current.form)) return;
    const sending = latest.current;
    const body = formToSaveBody(sending, base.current.version);
    if (!body) {
      setState({ kind: 'invalid' });
      return;
    }
    inflight.current = true;
    setState({ kind: 'saving' });
    try {
      const saved = await saveDraft(loanId, body);
      base.current = { form: sending, version: saved.version };
      setDraft(saved);
      setState({ kind: 'saved', at: saved.saved_at ?? new Date().toISOString() });
    } catch (e) {
      if (isApiError(e) && e.status === 409 && e.code === 'VERSION_CONFLICT') {
        conflict.current = true;
        const d = (e.details ?? {}) as { saved_by_name?: string | null; saved_at?: string | null };
        setState({ kind: 'conflict', savedBy: d.saved_by_name ?? null, savedAt: d.saved_at ?? null });
      } else {
        setState({ kind: 'error', message: isApiError(e) ? e.message : 'Không lưu được nháp' });
      }
    } finally {
      inflight.current = false;
    }
    // Có thay đổi trong lúc đang lưu: lưu tiếp bản mới nhất.
    if (!conflict.current && latest.current && base.current && !sameForm(latest.current, base.current.form)) {
      timer.current = setTimeout(() => void flush(), 0);
    }
  }, [loanId]);

  const change = useCallback(
    (patch: Partial<DraftForm>) => {
      setForm((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        latest.current = next;
        return next;
      });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), debounceMs);
    },
    [debounceMs, flush],
  );

  return { draft, form, loadError, state, change, saveNow: flush, reload };
}
