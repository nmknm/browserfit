import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { playBar, snapshotBar, type BarSnap } from '../../lib/barFlip';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A flex list that is wider than its box scrolls sideways; a grid list or one that fits does not. */
function syncOverflow(list: HTMLElement | null) {
  if (!list) return;
  const row = getComputedStyle(list).display === 'flex';
  list.dataset.overflow = row && list.scrollWidth > list.clientWidth + 1 ? 'true' : 'false';
}

/**
 * On narrow screens the section nav is a bar that sits in its place until that place scrolls up under
 * the top bar. From then on it floats as a second bar below it, and docks back into place on the
 * way up. (On wide screens it is a plain sticky sidebar and never floats.) The slot keeps the nav's space while it floats, so the page never reflows. Like the top bar,
 * the change is a real layout change that FLIP turns into transforms: measure First, flip the class,
 * measure Last, Invert, then Play.
 *
 * `probe` is a fixed point at --stick-top, so the threshold follows the top bar (docked or floating)
 * without parsing CSS lengths.
 */
export function useFloatingSecnav() {
  const slot = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [floating, setFloating] = useState(false);
  const floatingRef = useRef(false);
  const settled = useRef(false);
  const first = useRef<Map<string, BarSnap> | null>(null);
  const running = useRef<Animation[]>([]);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 60rem)');
    let raf = 0;
    const update = () => {
      raf = 0;
      const s = slot.current;
      const n = nav.current;
      const p = probe.current;
      if (!s || !n || !p) return;
      // Wide screens keep a sticky sidebar; only the narrow-screen bar floats.
      const next = narrow.matches && s.getBoundingClientRect().top <= p.getBoundingClientRect().top + 0.5;
      if (next === floatingRef.current) return;
      // The first reading on a page that loads already scrolled just sets the state; nothing travels.
      // Nothing travels on first load, or when the screen crosses the breakpoint (the layout is swapped, not moved).
      first.current = settled.current && narrow.matches ? snapshotBar(n) : null; // First: measured before React commits the class change
      settled.current = true;
      if (next) s.style.height = `${n.offsetHeight}px`;
      floatingRef.current = next;
      setFloating(next);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    settled.current = true;
    const ro = new ResizeObserver(() => syncOverflow(list.current));
    if (list.current) ro.observe(list.current);
    // The top bar floating or docking moves --stick-top without any scroll event.
    const mo = new MutationObserver(onScroll);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-topbar'] });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    // Drop any in-flight animation so Last is measured at its true layout position.
    running.current.forEach((a) => a.cancel());
    running.current = [];
    if (!floating && slot.current) slot.current.style.height = '';
    syncOverflow(list.current);
    const snap = first.current;
    first.current = null;
    if (!snap || !nav.current || reducedMotion()) return;
    running.current = playBar(nav.current, snap);
  }, [floating]);

  return { slot, nav, list, probe, floating };
}
