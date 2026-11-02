import type { Detected } from './detect';
import type { BrowserIndex } from './types';

/** Browsers whose user agent carries their own version number. Forks report their parent engine's version instead. */
const OWN_VERSION = ['chrome', 'edge', 'firefox', 'safari', 'opera', 'vivaldi'];

export type Verdict =
  | { kind: 'current' | 'ahead'; version: number; latest: number }
  | { kind: 'behind'; version: number; latest: number; behind: number }
  | { kind: 'unavailable'; reason: 'unknown-browser' | 'fork' | 'no-data' };

const major = (s: string | undefined) => {
  const m = s?.match(/\d+/);
  return m ? Number(m[0]) : null;
};

/**
 * Compares the major version this browser reports with the newest one in the site's data.
 * It is a snapshot comparison, not a live check, so callers must say when the data was last checked.
 */
export function versionVerdict(d: Detected, b: BrowserIndex | undefined): Verdict {
  if (!d.browserId || !b) return { kind: 'unavailable', reason: 'unknown-browser' };
  if (!OWN_VERSION.includes(d.browserId)) return { kind: 'unavailable', reason: 'fork' };
  const mine = major(d.version);
  const latest = major(b.version.current);
  if (mine == null || latest == null) return { kind: 'unavailable', reason: 'no-data' };
  if (mine === latest) return { kind: 'current', version: mine, latest };
  if (mine > latest) return { kind: 'ahead', version: mine, latest };
  return { kind: 'behind', version: mine, latest, behind: latest - mine };
}
