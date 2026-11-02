/**
 * Enter and exit for native <dialog>s, driven by WAAPI instead of CSS transitions.
 * The CSS route (@starting-style + transition on `display`/`overlay`) leaves the top layer the instant
 * close() runs in browsers without `overlay` support (iOS Safari, Firefox), so the exit never shows.
 * Here close() waits for the exit animation to finish, which behaves the same everywhere.
 */
export type DialogKind = 'bottom' | 'right' | 'palette';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const live = new WeakMap<HTMLDialogElement, Animation[]>();

/** Where the dialog sits when hidden. Reduced motion keeps only the fade. */
function hidden(kind: DialogKind): Keyframe {
  if (reduced()) return { opacity: 0, transform: 'none' };
  if (kind === 'bottom') return { opacity: 1, transform: 'translateY(100%)' };
  if (kind === 'right') return { opacity: 1, transform: 'translateX(100%)' };
  return { opacity: 0, transform: 'scale(0.98)' };
}

const timing = (kind: DialogKind, dir: 'in' | 'out') => {
  if (reduced()) return { duration: dir === 'in' ? 160 : 100, easing: EASE_OUT };
  if (kind === 'palette') return { duration: dir === 'in' ? 160 : 100, easing: EASE_OUT };
  return { duration: dir === 'in' ? 320 : 240, easing: EASE_DRAWER };
};

function run(d: HTMLDialogElement, kind: DialogKind, dir: 'in' | 'out'): Animation[] {
  // Retarget: an interrupted animation hands over its current look as the starting point.
  const running = live.get(d);
  // The palette fades its box, not the dialog: an opacity below 1 on an ancestor stops the box's own
  // backdrop-filter from seeing the page, so the blur would pop in only when the fade ends.
  const el = (kind === 'palette' && d.firstElementChild instanceof HTMLElement ? d.firstElementChild : d) as HTMLElement;
  const cs = getComputedStyle(el);
  const here: Keyframe = { opacity: cs.opacity, transform: cs.transform === 'none' ? 'none' : cs.transform };
  let backdrop = dir === 'in' ? 0 : 1;
  if (running?.length) {
    try {
      backdrop = Number(getComputedStyle(d, '::backdrop').opacity);
    } catch {
      /* keep the default */
    }
  }
  running?.forEach((a) => a.cancel());

  const rest: Keyframe = { opacity: 1, transform: 'none' };
  const away = hidden(kind);
  const from = dir === 'in' ? (running?.length ? here : away) : here;
  const to = dir === 'in' ? rest : away;
  const t = { ...timing(kind, dir), fill: 'both' as const };

  const anims = [el.animate([from, to], t)];
  try {
    // The backdrop only fades. Not every browser can animate ::backdrop; it then just appears and goes.
    anims.push(d.animate([{ opacity: backdrop },{ opacity: dir === 'in' ? 1 : 0 }], { ...t, easing: 'ease', pseudoElement: '::backdrop' }));
  } catch {
    /* no ::backdrop animation support */
  }
  live.set(d, anims);
  return anims;
}

export function showDialog(d: HTMLDialogElement, kind: DialogKind) {
  if (!d.open) d.showModal();
  const anims = run(d, kind, 'in');
  anims[0].finished.then(
    () => {
      if (live.get(d) !== anims) return;
      anims.forEach((a) => a.cancel());
      live.delete(d);
    },
    () => {},
  );
}

/** Resolves once the dialog is actually closed (or the close was interrupted by a reopen). */
export function hideDialog(d: HTMLDialogElement, kind: DialogKind): Promise<void> {
  if (!d.open) return Promise.resolve();
  const anims = run(d, kind, 'out');
  return anims[0].finished.then(
    () => {
      if (live.get(d) !== anims) return; // reopened while closing
      d.close();
      anims.forEach((a) => a.cancel());
      live.delete(d);
    },
    () => {},
  );
}
