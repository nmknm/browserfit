import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { playBar, snapshotBar, type BarSnap } from '../../lib/barFlip';

/** The bar floats on any scroll away from the very top and docks only when back at it. */
const FLOAT_AT = 0;
const DOCK_AT = 0;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Floats the top bar once the page scrolls past the top and docks it again on return.
 * The state change is a real layout change (width, margin, radius); FLIP turns it into a
 * transform animation: measure First, flip the class, measure Last, Invert, then Play.
 */
export function useFloatingTopbar() {
  const ref = useRef<HTMLElement>(null);
  const [floating, setFloating] = useState(() => window.scrollY > FLOAT_AT);
  const floatingRef = useRef(floating);
  const first = useRef<Map<string, BarSnap> | null>(null);
  const running = useRef<Animation[]>([]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const next = floatingRef.current ? y > DOCK_AT : y > FLOAT_AT;
      if (next === floatingRef.current || !ref.current) return;
      first.current = snapshotBar(ref.current); // First: measured before React commits the class change
      floatingRef.current = next;
      setFloating(next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.topbar = floating ? 'floating' : 'docked';
    // Drop any in-flight animation so Last is measured at its true layout position.
    running.current.forEach((a) => a.cancel());
    running.current = [];
    const snap = first.current;
    first.current = null;
    if (!snap || !ref.current || reducedMotion()) return;
    running.current = playBar(ref.current, snap);
  }, [floating]);

  return { ref, floating };
}
