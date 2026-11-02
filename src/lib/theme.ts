export type ThemePref = 'system' | 'light' | 'dark';

/** Light is the default; 'system' is only used once someone picks it, so it is stored explicitly. */
export function getThemePref(): ThemePref {
  try {
    const t = localStorage.getItem('bs-theme');
    return t === 'system' || t === 'dark' ? t : 'light';
  } catch {
    return 'light';
  }
}

/** Apply a theme with transitions suppressed for one frame so colours don't smear. */
export function setThemePref(pref: ThemePref) {
  const root = document.documentElement;
  root.classList.add('no-transitions');
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
  try {
    localStorage.setItem('bs-theme', pref);
  } catch {
    /* ignore */
  }
  void root.offsetHeight;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transitions')));
}

export function isDark() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
