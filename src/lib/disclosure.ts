/**
 * FLIP open and close for native <details> (FAQ, score pillars, security layers).
 * One delegated click handler, so every <details> in SELECTOR animates without markup changes.
 *
 * Expand: First = the box's height, then really open it (Last). Everything after it on the page sits
 * lower by the difference, so Invert moves it up by that much (translateY) and Play slides it home.
 * The new content is never animated itself: the box (and any bordered ancestor, like the panel around
 * the FAQ) is clipped from the bottom by the same amount, so the revealed edge travels with the content
 * below it. Only transform and clip-path animate; no height.
 *
 * Collapse is the same thing played backwards, except the content has to stay on screen while it is
 * swept away, so it closes at the END: measure the closed layout, restore it, play, then commit.
 * Clicking again mid-animation reverses a close, or collapses an open that is still settling.
 */
const SELECTOR = 'details.disclosure, details.pillar-block, details.sec-layer, details.sec-twin';
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const running = new WeakMap<HTMLDetailsElement, { anims: Animation[]; closing: boolean }>();

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Negative insets leave room for focus rings and shadows on the sides and top.
const inset = (bottom: number) => `inset(-16px -16px ${bottom}px -16px)`;

/** Everything after `d` in document order that a layout change at `d` pushes: later siblings at every level. */
function trailing(d: HTMLElement) {
  const out: HTMLElement[] = [];
  for (let el: HTMLElement | null = d; el && el !== document.documentElement; el = el.parentElement) {
    for (let s = el.nextElementSibling as HTMLElement | null; s; s = s.nextElementSibling as HTMLElement | null) {
      if (['SCRIPT', 'STYLE', 'LINK', 'DIALOG'].includes(s.tagName)) continue;
      const pos = getComputedStyle(s).position;
      if (pos === 'fixed' || pos === 'absolute') continue; // not moved by flow changes
      out.push(s);
    }
  }
  return out;
}

/** Ancestors with a visible box (border, background or shadow) whose bottom edge moves with the content. */
function boxed(d: HTMLElement) {
  const out: HTMLElement[] = [];
  for (let el = d.parentElement; el && el.id !== 'main' && el !== document.body; el = el.parentElement) {
    const cs = getComputedStyle(el);
    const border = parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none';
    const fill = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
    if (border || fill || cs.boxShadow !== 'none') out.push(el);
  }
  return out;
}

/** `delta` is how far the layout below moves: positive when opening, negative when closing. */
function play(d: HTMLDetailsElement, delta: number, closing: boolean) {
  const dist = Math.abs(delta);
  const o = { duration: closing ? 200 : 240, easing: EASE, fill: 'both' as const };
  const slide = closing ? [0, delta] : [-delta, 0];
  const sweep = closing ? [0, dist] : [dist, 0];

  const anims = [d, ...boxed(d)].map((el) => el.animate({ clipPath: [inset(sweep[0]), inset(sweep[1])] }, o));
  for (const s of trailing(d)) anims.push(s.animate({ transform: [`translateY(${slide[0]}px)`, `translateY(${slide[1]}px)`] }, o));

  running.set(d, { anims, closing });
  if (closing) d.dataset.closing = ''; // lets the chevron turn at once instead of at the commit
  anims[0].finished.then(
    () => {
      if (running.get(d)?.anims !== anims) return; // superseded
      if (closing) d.open = false;
      delete d.dataset.closing;
      anims.forEach((a) => a.cancel()); // same task as the commit, so no frame shows the old layout
      running.delete(d);
    },
    () => {},
  );
}

function toggle(d: HTMLDetailsElement) {
  const prev = running.get(d);
  if (prev) {
    prev.anims.forEach((a) => a.cancel());
    running.delete(d);
    delete d.dataset.closing;
    if (prev.closing) return; // the click means "keep it open"
  }
  if (!d.open) {
    const first = d.getBoundingClientRect().height;
    d.open = true;
    const delta = d.getBoundingClientRect().height - first;
    if (Math.abs(delta) >= 1) play(d, delta, false);
  } else {
    const first = d.getBoundingClientRect().height;
    d.open = false;
    const last = d.getBoundingClientRect().height;
    d.open = true; // put the content back; it stays until the sweep has finished
    if (Math.abs(last - first) >= 1) play(d, last - first, true);
    else d.open = false;
  }
}

export function installDisclosure() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || reduced()) return; // reduced motion: the native instant toggle
    const summary = (e.target as Element | null)?.closest?.('summary');
    const d = summary?.parentElement;
    if (!summary || !(d instanceof HTMLDetailsElement) || !d.matches(SELECTOR)) return;
    e.preventDefault();
    toggle(d);
  });
}
