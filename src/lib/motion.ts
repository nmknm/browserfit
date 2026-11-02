import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

/** --ease-out, for Motion props that cannot read CSS variables. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_OUT_CSS = 'cubic-bezier(0.23, 1, 0.32, 1)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * FLIP for a set of boxes that rearrange when state flips (a filter that removes items and lets the
 * rest reflow). Mark each box with data-flip="<stable key>". Call the returned capture() right before
 * the state change (First); the layout effect then measures Last, inverts each surviving box back to
 * where it was, and plays it home. New boxes fade in; removed boxes are simply gone.
 *
 * Deliberately explicit rather than Motion's `layout`: it runs only when capture() was called, so
 * unrelated re-renders (data arriving, content above changing height) never make the boxes glide.
 * Pass auto when the state change is made elsewhere; the hook then captures during the render that sees
 * a new dep. A nested box subtracts its flipped ancestor's delta, otherwise it would be moved twice.
 */
export function useFlip(root: RefObject<HTMLElement | null>, dep: unknown, auto = false) {
  const first = useRef<Map<string, DOMRect> | null>(null);
  const running = useRef<Animation[]>([]);
  const seen = useRef(dep);

  const capture = useCallback(() => {
    const el = root.current;
    if (!el) return;
    // Measured with any in-flight animation still applied, so an interrupted flip starts from where the box is on screen.
    first.current = new Map(Array.from(el.querySelectorAll<HTMLElement>('[data-flip]'), (n) => [n.dataset.flip!, n.getBoundingClientRect()]));
  }, [root]);

  // auto: the change is made somewhere else (another component, a shared setter), so there is no call site
  // for capture(). Rendering happens before React touches the DOM, so measuring here is still First.
  if (auto && !Object.is(seen.current, dep)) capture();
  seen.current = dep;

  useLayoutEffect(() => {
    running.current.forEach((a) => a.cancel()); // so Last is the true layout position
    running.current = [];
    const snap = first.current;
    first.current = null;
    const el = root.current;
    if (!snap || !el || reducedMotion()) return;

    const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-flip]'));
    const lasts = new Map(nodes.map((n) => [n, n.getBoundingClientRect()]));
    const delta = (n: HTMLElement) => {
      const f = snap.get(n.dataset.flip!);
      const l = lasts.get(n)!;
      return f ? { dx: f.left - l.left, dy: f.top - l.top } : null;
    };
    for (const n of nodes) {
      const parent = n.parentElement?.closest<HTMLElement>('[data-flip]') ?? null;
      const pd = parent && lasts.has(parent) ? delta(parent) : null;
      const d = delta(n);
      if (!d) {
        if (parent && !pd) continue; // its parent is fading in already
        running.current.push(n.animate({ opacity: [0, 1] }, { duration: 160, easing: EASE_OUT_CSS }));
        continue;
      }
      const dx = d.dx - (pd?.dx ?? 0);
      const dy = d.dy - (pd?.dy ?? 0);
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      running.current.push(n.animate({ transform: [`translate(${dx}px, ${dy}px)`, 'none'] }, { duration: 220, easing: EASE_OUT_CSS }));
    }
  }, [root, dep]);

  return capture;
}

/**
 * FLIP for an auto-height box whose content changes (search results, dropdown rows).
 * First: the height it had before this commit. Last: the height it has now. Invert and Play: tween
 * between them. If a tween is still running, its current height is the new First, so rapid
 * typing retargets instead of restarting. The box must clip its own overflow.
 */
export function useHeightFlip(ref: RefObject<HTMLElement | null>, dep: unknown, enabled = true, duration = 160) {
  const last = useRef({ el: null as HTMLElement | null, h: 0 });
  const anim = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prev = last.current;
    const running = anim.current;
    const first = running && prev.el === el ? el.offsetHeight : prev.el === el ? prev.h : 0;
    running?.cancel();
    anim.current = null;
    // Disabled (a closed dialog): forget the old height so reopening does not tween from a stale one.
    const next = enabled ? el.offsetHeight : 0;
    last.current = { el, h: next };
    // A hidden box measures 0, and a box that just mounted has no First: nothing to bridge.
    if (!first || !next || first === next || reducedMotion()) return;
    const a = el.animate({ height: [`${first}px`, `${next}px`] }, { duration, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    anim.current = a;
    a.onfinish = a.oncancel = () => {
      if (anim.current === a) anim.current = null;
    };
  }, [ref, dep, enabled, duration]);
}

/**
 * FLIP for a box whose label changes width ("Compare" -> "In compare"). Everything is transform and
 * opacity, so it keeps running while the main thread is busy re-rendering: the box scales from its old
 * width to its new one (anchored at its left edge) while its [data-swap] label fades in, and its siblings
 * translate from where they were. Tweening the width itself would re-lay-out the row every frame, on the
 * main thread, exactly when React is busy handling the click.
 *
 * First is captured during the render that sees a new dep (before React touches the DOM), Last after
 * it, with any running tween cancelled so an interrupted flip restarts from where the box is on screen.
 */
export function useWidthFlip(ref: RefObject<HTMLElement | null>, dep: unknown, duration = 160) {
  const first = useRef<{ el: HTMLElement; box: DOMRect; sibs: Map<Element, DOMRect> } | null>(null);
  const running = useRef<Animation[]>([]);
  const seen = useRef(dep);

  if (!Object.is(seen.current, dep)) {
    const el = ref.current;
    first.current = el
      ? { el, box: el.getBoundingClientRect(), sibs: new Map(Array.from(el.parentElement?.children ?? [], (c) => [c, c.getBoundingClientRect()])) }
      : null;
  }
  seen.current = dep;

  useLayoutEffect(() => {
    running.current.forEach((a) => a.cancel());
    running.current = [];
    const snap = first.current;
    first.current = null;
    const el = ref.current;
    if (!snap || !el || snap.el !== el || reducedMotion()) return;
    const box = el.getBoundingClientRect();
    if (!box.width || Math.abs(snap.box.width - box.width) < 0.5) return;
    const opts = { duration, easing: EASE_OUT_CSS };
    const from = `translate(${snap.box.left - box.left}px, ${snap.box.top - box.top}px) scaleX(${snap.box.width / box.width})`;
    running.current.push(el.animate({ transform: [from, 'none'], transformOrigin: ['left center', 'left center'] }, opts));
    const label = el.querySelector<HTMLElement>('[data-swap]');
    if (label) running.current.push(label.animate({ opacity: [0, 1] }, opts));
    for (const [c, f] of snap.sibs) {
      if (c === el) continue;
      const l = c.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      running.current.push(c.animate({ transform: [`translate(${dx}px, ${dy}px)`, 'none'] }, opts));
    }
  }, [ref, dep, duration]);
}
