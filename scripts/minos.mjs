// Turns the free-text `minOs` of a platform ("macOS 12+", "Android 8.0 (API 26)", "Unverified") into a number
// the old-device finder can compare. Versions are stored as major * 100 + minor, so 10.15 -> 1015 and 11 -> 1100.
// Windows uses its own scale: XP 501, Vista 600, 7 601, 8 602, 8.1 603, 10 1000, 11 1100.
//
// `confirmed` is false when the text hedges ("unverified", "per Wikipedia", a third-party listing ...),
// so the finder only claims a version floor that the research actually stands behind.

const HEDGE = /unverified|not verified|not confirmed|unspecified|not stated|not published|per wikipedia|third-party|softportal|apkmirror|apkcombo|appbrain|uptodown|filehorse|macupdate|conflicting|one guide|unofficial|historically|older builds|version not|tested on/i;

const WINDOWS = { xp: 501, vista: 600, 7: 601, 8: 602, 8.1: 603, 10: 1000, 11: 1100 };

const MAC_NAMES = {
  lion: 1007,
  'el capitan': 1011,
  sierra: 1012,
  'high sierra': 1013,
  mojave: 1014,
  catalina: 1015,
  'big sur': 1100,
  monterey: 1200,
  ventura: 1300,
  sonoma: 1400,
  sequoia: 1500,
  tahoe: 2600,
};

const ver = (major, minor) => Number(major) * 100 + Number(minor ?? 0);

export function parseMinOs(os, raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { min: null, confirmed: false };
  let min = null;
  if (os === 'windows') {
    const m = text.match(/windows\s*(xp|vista|8\.1|7|8|10|11)(?![\d.])/i);
    if (m) min = WINDOWS[m[1].toLowerCase()] ?? null;
  } else if (os === 'macos') {
    const m = text.match(/(?:macos|os x)\s*(\d+)(?:\.(\d+))?/i);
    if (m) min = ver(m[1], m[2]);
    else {
      // Named releases: take the oldest one mentioned, since that is the real floor.
      const lower = text.toLowerCase();
      const hits = Object.entries(MAC_NAMES)
        .filter(([name]) => new RegExp(`\\b${name}\\b`).test(lower))
        .map(([, v]) => v);
      if (hits.length) min = Math.min(...hits);
    }
  } else if (os === 'android') {
    const m = text.match(/android\s*(\d+)(?:\.(\d+))?/i);
    if (m) min = ver(m[1], m[2]);
  } else if (os === 'ios') {
    const m = text.match(/(?:ios|ipados)\s*(\d+)(?:\.(\d+))?/i);
    if (m) min = ver(m[1], m[2]);
  }
  return { min, confirmed: min != null && !HEDGE.test(text) };
}
