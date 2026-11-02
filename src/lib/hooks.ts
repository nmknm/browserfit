import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';

export function useMedia(query: string) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

export const useIsMobile = () => useMedia('(max-width: 47.99rem)');
export const useCoarse = () => useMedia('(pointer: coarse)');

export function useDocTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Browserfit` : 'Browserfit — compare every web browser';
  }, [title]);
}

/** Read/write one URL search param as a string list or string. */
export function useParam(name: string): [string | null, (v: string | null) => void] {
  const [sp, setSp] = useSearchParams();
  const value = sp.get(name);
  const set = (v: string | null) => {
    setSp(
      (cur) => {
        const n = new URLSearchParams(cur);
        if (v == null || v === '') n.delete(name);
        else n.set(name, v);
        return n;
      },
      { replace: true },
    );
  };
  return [value, set];
}

export function useListParam(name: string): [string[], (v: string[]) => void] {
  const [v, set] = useParam(name);
  const list = v ? v.split(',').filter(Boolean) : [];
  return [list, (next) => set(next.length ? next.join(',') : null)];
}

export function useMotionOK() {
  return !useReducedMotion();
}
