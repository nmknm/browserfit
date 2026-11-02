/** Everything the site keeps on this device lives under `bf-*` keys, plus the theme choice. */
const OWN = (key: string) => key.startsWith('bf-') || key === 'bs-theme';
const MAX_BYTES = 1_500_000;
const MAX_KEY = 100;
export const FLASH_KEY = 'bf-flash';

export interface Backup {
  app: 'browserfit';
  version: 1;
  exported: string;
  data: Record<string, string>;
}

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function storedKeys(): string[] {
  try {
    return Object.keys(localStorage).filter((k) => OWN(k) && k !== FLASH_KEY);
  } catch {
    return [];
  }
}

export function makeBackup(): Backup {
  const data: Record<string, string> = {};
  for (const key of storedKeys()) {
    const v = read(key);
    if (v != null) data[key] = v;
  }
  return { app: 'browserfit', version: 1, exported: new Date().toISOString(), data };
}

export type Checked = { ok: true; data: Record<string, string> } | { ok: false };

/** A backup is trusted only when it is a Browserfit file of our own keys holding valid JSON, and not huge. */
export function checkBackup(text: string): Checked {
  if (text.length > MAX_BYTES) return { ok: false };
  try {
    const raw = JSON.parse(text) as Partial<Backup>;
    if (!raw || raw.app !== 'browserfit' || raw.version !== 1 || !raw.data || typeof raw.data !== 'object' || Array.isArray(raw.data)) return { ok: false };
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw.data)) {
      if (key.length > MAX_KEY || !OWN(key) || key === FLASH_KEY || typeof value !== 'string') return { ok: false };
      if (key !== 'bs-theme') JSON.parse(value);
      data[key] = value;
    }
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

export function restore(data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage blocked */
    }
  }
}

export function clearAll() {
  for (const key of storedKeys()) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage blocked */
    }
  }
}

/** A message that survives the page reload that follows a restore or a clear. */
export function flash(message: string) {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    /* ignore */
  }
}
export function takeFlash() {
  try {
    const m = sessionStorage.getItem(FLASH_KEY);
    sessionStorage.removeItem(FLASH_KEY);
    return m;
  } catch {
    return null;
  }
}

const parse = <T,>(key: string, fallback: T): T => {
  try {
    const raw = read(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
};

const plural = new Intl.PluralRules('en');
const noun = (n: number, one: string, other: string) => `${n} ${plural.select(n) === 'one' ? one : other}`;

/** What is stored, in words, for the Settings page. */
export function summary(): { label: string; count: number }[] {
  const keys = storedKeys();
  const rows: { label: string; count: number }[] = [
    { label: 'shortlisted browsers', count: Object.keys(parse<Record<string, string>>('bf-shortlist', {})).length },
    { label: 'saved quizzes', count: parse<unknown[]>('bf-custom-quizzes', []).length },
    { label: 'quizzes started or finished', count: keys.filter((k) => k.startsWith('bf-quiz-')).length },
    { label: 'benchmark runs', count: parse<unknown[]>('bf-bench', []).length },
    { label: 'recently viewed browsers', count: parse<unknown[]>('bf-recent', []).length },
  ];
  return rows.filter((r) => r.count > 0);
}

/** "5 shortlisted browsers, 3 saved quizzes" for a confirmation. */
export function describe(rows = summary()) {
  const unit = (label: string, n: number) => {
    const singular: Record<string, string> = { 'shortlisted browsers': 'shortlisted browser', 'saved quizzes': 'saved quiz', 'quizzes started or finished': 'quiz started or finished', 'benchmark runs': 'benchmark run', 'recently viewed browsers': 'recently viewed browser' };
    return noun(n, singular[label] ?? label, label);
  };
  return rows.map((r) => unit(r.label, r.count)).join(', ');
}
