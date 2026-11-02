/**
 * FLIP for a floating bar whose real layout changes (width, position, radius, content order) when it
 * docks or floats. Mark every box that should travel with data-flip="<stable key>". A box that also
 * changes size (the bar's background, a highlight) adds data-flip-box: it is scaled as well as moved,
 * with its corner radius counter-scaled so the corners stay round on screen the whole way.
 */
const DURATION = 420;
const GLIDE = 300;
const STEPS = 28;

export type BarSnap = { rect: DOMRect; radius: number };

// Strong ease-out, sampled into keyframes so scale and corner radius stay in step.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);
/** Softer ease-out for small hover growth: moves at once (no dead start) and settles gently. */
export const easeSoft = (t: number) => 1 - Math.pow(1 - t, 3);

/** Vertical corner radius as it appears on screen right now (layout radius x current scale). */
function visualRadius(el: HTMLElement, rect: DOMRect) {
  const parts = getComputedStyle(el).borderTopLeftRadius.split(' ');
  const ry = parseFloat(parts[parts.length - 1]) || 0;
  return el.offsetHeight ? (ry * rect.height) / el.offsetHeight : ry;
}

/** Keyframes that carry a box from `from` (its old rect and visual radius) to where it is now, corners kept round. */
function boxFrames(el: HTMLElement, from: DOMRect, fromRadius: number, l: DOMRect, dx: number, dy: number, round = true, ease = easeOut) {
  const sx = from.width / l.width;
  const sy = from.height / l.height;
  const last = visualRadius(el, l);
  const frames: Keyframe[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const e = ease(i / STEPS);
    const cx = sx + (1 - sx) * e;
    const cy = sy + (1 - sy) * e;
    const r = fromRadius + (last - fromRadius) * e;
    const transform = `translate(${dx * (1 - e)}px, ${dy * (1 - e)}px) scale(${cx}, ${cy})`;
    // Divide by the scale so the corners read as circles on screen the whole way.
    frames.push(round ? { transform, borderRadius: `${r / cx}px / ${r / cy}px` } : { transform });
  }
  return frames;
}

/**
 * A highlight that moves from one box to another (the current tab in a bar): the new box glides in from
 * where the old one is. `from` is the old box's rect and `fromEl` is read for its corner radius.
 */
export function glideBox(el: HTMLElement, from: DOMRect, fromEl: HTMLElement) {
  const l = el.getBoundingClientRect();
  if (!l.width || !l.height || !from.width || !from.height) return null;
  // Transform only, so it stays off the main thread; a highlight keeps its height, so its corners barely change.
  const frames = boxFrames(el, from, visualRadius(fromEl, from), l, from.left - l.left, from.top - l.top, false);
  return el.animate(frames, { duration: GLIDE, easing: 'linear' });
}

/** First: measure every marked box before the state change is committed. */
export function snapshotBar(root: HTMLElement) {
  const snaps = new Map<string, BarSnap>();
  root.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
    const rect = el.getBoundingClientRect();
    snaps.set(el.dataset.flip!, { rect, radius: el.hasAttribute('data-flip-box') ? visualRadius(el, rect) : 0 });
  });
  return snaps;
}

/** Last, Invert, Play: after the commit, put each box back where it was and play it home. */
export function playBar(root: HTMLElement, first: Map<string, BarSnap>, duration = DURATION, ease = easeOut) {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-flip]'));
  const lasts = new Map(nodes.map((n) => [n, n.getBoundingClientRect()]));
  const delta = (n: HTMLElement) => {
    const f = first.get(n.dataset.flip!);
    const l = lasts.get(n)!;
    return f ? { dx: f.rect.left - l.left, dy: f.rect.top - l.top } : null;
  };
  const anims: Animation[] = [];
  for (const el of nodes) {
    const f = first.get(el.dataset.flip!);
    const l = lasts.get(el)!;
    const d = delta(el);
    if (!f || !d || !l.width || !l.height) continue;
    // A highlight that is not showing (data-flip-box="current" outside the current link) has nothing to animate.
    if (el.dataset.flipBox === 'current' && !el.closest('[aria-current="true"]')) continue;
    // A box inside another moving box rides along with it, so only its own share is applied.
    const parent = el.parentElement?.closest<HTMLElement>('[data-flip]') ?? null;
    const pd = parent ? delta(parent) : null;
    const dx = d.dx - (pd?.dx ?? 0);
    const dy = d.dy - (pd?.dy ?? 0);

    let frames: Keyframe[] = [];
    if (el.hasAttribute('data-flip-box')) {
      // A box that neither moved nor resized (the control next to the one being hovered) has nothing to play.
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(f.rect.width - l.width) < 0.5 && Math.abs(f.rect.height - l.height) < 0.5) continue;
      frames = boxFrames(el, f.rect, f.radius, l, dx, dy, true, ease);
    } else {
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      for (let i = 0; i <= STEPS; i++) {
        const e = ease(i / STEPS);
        frames.push({ transform: `translate(${dx * (1 - e)}px, ${dy * (1 - e)}px)` });
      }
    }
    anims.push(el.animate(frames, { duration, easing: 'linear' }));
  }
  return anims;
}
