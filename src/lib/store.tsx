import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OsId } from './types';
import { BROWSER_BY_ID } from './data';

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: state stays in memory */
  }
}

export function useLocalState<T>(key: string, fallback: T) {
  const [v, setV] = useState<T>(() => readLocal(key, fallback));
  useEffect(() => writeLocal(key, v), [key, v]);
  return [v, setV] as const;
}

export const COMPARE_MAX = 6;

interface AppState {
  os: OsId | null;
  setOs: (os: OsId | null) => void;
  compare: string[];
  toggleCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  inCompare: (id: string) => boolean;
  shortlist: Record<string, string>;
  toggleShortlist: (id: string) => void;
  setNote: (id: string, note: string) => void;
  recent: string[];
  pushRecent: (id: string) => void;
  /** A toast with an action (Undo, Reload) stays until it is used or dismissed. */
  toast: (msg: string, action?: ToastAction) => void;
  toastMsg: string | null;
  /** Changes on every toast() call, so a repeated message still re-enters. */
  toastId: number;
  toastAction: ToastAction | null;
  dismissToast: () => void;
}

export interface ToastAction {
  label: string;
  run: () => void;
}

const Ctx = createContext<AppState | null>(null);

const clean = (ids: string[]) => ids.filter((id) => BROWSER_BY_ID[id]);

export function AppProvider({ children }: { children: ReactNode }) {
  const [os, setOs] = useLocalState<OsId | null>('bf-os', null);
  const [compareRaw, setCompareRaw] = useLocalState<string[]>('bf-compare', []);
  const [shortlist, setShortlist] = useLocalState<Record<string, string>>('bf-shortlist', {});
  const [recentRaw, setRecent] = useLocalState<string[]>('bf-recent', []);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<ToastAction | null>(null);
  const [toastId, setToastId] = useState(0);
  const toastTimer = useRef<number | undefined>(undefined);

  const compare = useMemo(() => clean(compareRaw).slice(0, COMPARE_MAX), [compareRaw]);
  const recent = useMemo(() => clean(recentRaw), [recentRaw]);

  const dismissToast = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setToastMsg(null);
    setToastAction(null);
  }, []);

  const toast = useCallback((msg: string, action?: ToastAction) => {
    window.clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastId((n) => n + 1);
    setToastAction(action ?? null);
    if (!action) toastTimer.current = window.setTimeout(() => setToastMsg(null), 3200);
  }, []);

  const toggleCompare = useCallback(
    (id: string) => {
      setCompareRaw((cur) => {
        const list = clean(cur);
        if (list.includes(id)) return list.filter((x) => x !== id);
        if (list.length >= COMPARE_MAX) {
          toast(`Compare holds ${COMPARE_MAX} browsers. Remove one to add another.`);
          return list;
        }
        return [...list, id];
      });
    },
    [setCompareRaw, toast],
  );

  const value: AppState = {
    os,
    setOs,
    compare,
    toggleCompare,
    setCompare: (ids) => setCompareRaw(clean(ids).slice(0, COMPARE_MAX)),
    inCompare: (id) => compare.includes(id),
    shortlist,
    toggleShortlist: (id) =>
      setShortlist((cur) => {
        const next = { ...cur };
        if (id in next) delete next[id];
        else next[id] = '';
        return next;
      }),
    setNote: (id, note) => setShortlist((cur) => ({ ...cur, [id]: note })),
    recent,
    pushRecent: (id) => setRecent((cur) => [id, ...cur.filter((x) => x !== id)].slice(0, 12)),
    toast,
    toastMsg,
    toastId,
    toastAction,
    dismissToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
