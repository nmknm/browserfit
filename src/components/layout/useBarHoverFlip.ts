import { useEffect, type RefObject } from 'react';
import { easeSoft, playBar, snapshotBar } from '../../lib/barFlip';

const DURATION = 300;
const STEPS = 28;
const FEATHER = 22; // keep in step with --feather in layout.css

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

/**
 * Frames for the label while its pill grows or shrinks. The label stays attached to the icon (dx is the
 * icon's travel), so it never passes behind it. It fades and wipes open from the icon's side, so it gets
 * longer as the pill grows and shorter as it shrinks, and is clipped at the pill's right edge, which does
 * not move for these right-anchored controls. A label that stays (wide search bar) just rides the edge.
 */
function labelFrames(kind: 'in' | 'out' | 'stay', dx: number, pill: { first: DOMRect; last: DOMRect }, label: DOMRect) {
  return Array.from({ length: STEPS + 1 }, (_, i): Keyframe => {
    const e = easeSoft(i / STEPS);
    const tx = dx * (1 - e);
    if (kind === 'stay') return { transform: `translateX(${tx}px)` };
    // --wipe is the front of the reveal measured from the label's start; the mask (layout.css) fades
    // over the FEATHER px behind it, so the edge is a soft gradient rather than a crop.
    const front = (kind === 'in' ? e : 1 - e) * (label.width + FEATHER);
    const right = pill.last.right + (pill.first.right - pill.last.right) * (1 - e);
    const beyond = label.left + tx + label.width - right;
    return {
      transform: `translateX(${tx}px)`,
      opacity: kind === 'in' ? e : 1 - e,
      '--wipe': `${front}px`,
      clipPath: `inset(0px ${clamp(beyond, label.width)}px 0px 0px)`,
    };
  });
}

/**
 * Controls marked data-hover-flip grow (class is-hot) while a cursor hovers them. The growth is a
 * real layout change, so it plays as a FLIP: measure First, toggle the class, then Invert and Play.
 * Driven by pointer events, not :hover, so a tap on a touchscreen never expands anything.
 */
export function useBarHoverFlip(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const bar = root.current;
    if (!bar) return;
    let running: Animation[] = [];
    let ghosts: HTMLElement[] = [];
    const clear = () => {
      running.forEach((a) => a.cancel());
      running = [];
      ghosts.forEach((g) => g.remove());
      ghosts = [];
    };
    const shown = (el: HTMLElement) => el.getClientRects().length > 0;

    const set = (el: HTMLElement, hot: boolean) => {
      if (el.classList.contains('is-hot') === hot) return;
      const label = el.querySelector<HTMLElement>('.tb-ctl__label')!;
      const icon = el.querySelector<HTMLElement>('.tb-ctl__icon')!;
      const bg = el.querySelector<HTMLElement>('.tb-ctl__bg')!;
      const first = snapshotBar(bar); // measured with any in-flight transform, so a quick re-hover continues from where it is
      const iconFrom = icon.getBoundingClientRect();
      const was = shown(label);
      // A label that is about to leave is copied in place so it can fade out instead of vanishing.
      let ghost: HTMLElement | null = null;
      if (was && !reducedMotion()) {
        ghost = document.createElement('span');
        ghost.className = 'tb-ctl__ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.textContent = label.textContent;
        ghost.style.left = `${label.offsetLeft}px`;
        ghost.style.top = `${label.offsetTop}px`;
      }
      clear();
      if (ghost) {
        el.appendChild(ghost);
        ghosts.push(ghost);
      }
      el.classList.toggle('is-hot', hot);
      if (reducedMotion()) return;

      // Last: measured before any animation starts, so these are the final layout positions.
      const pill = { first: first.get(bg.dataset.flip!)!.rect, last: bg.getBoundingClientRect() };
      const dx = iconFrom.left - icon.getBoundingClientRect().left;
      const now = shown(label);
      const mover = now ? label : ghost;
      const labelLast = mover?.getBoundingClientRect();
      running = playBar(bar, first, DURATION, easeSoft);
      if (now) ghost?.remove(); // the label stayed (wide search bar), so nothing is leaving
      if (!mover || !labelLast) return;
      const kind = now ? (was ? 'stay' : 'in') : 'out';
      const a = mover.animate(labelFrames(kind, dx, pill, labelLast), { duration: DURATION, easing: 'linear' });
      running.push(a);
      if (kind === 'out') a.onfinish = () => mover.remove();
    };

    const off: Array<() => void> = [];
    bar.querySelectorAll<HTMLElement>('[data-hover-flip]').forEach((el) => {
      const enter = (e: PointerEvent) => e.pointerType !== 'touch' && set(el, true);
      const leave = () => set(el, false);
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
      off.push(() => {
        el.removeEventListener('pointerenter', enter);
        el.removeEventListener('pointerleave', leave);
      });
    });
    return () => {
      off.forEach((f) => f());
      clear();
    };
  }, [root]);
}
