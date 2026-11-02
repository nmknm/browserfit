import { Q, type Question, type QuizDef } from '../data/quizzes';
import { OS_BY_ID } from '../data/taxonomy';
import { BROWSER_BY_ID } from './data';
import type { AnswerMap } from './quizEngine';

export type QuizLength = 'quick' | 'standard' | 'deep';

export interface SharedResult {
  answers: AnswerMap;
  /** question ids in the order they were asked */
  asked: string[];
  length: QuizLength | null;
}

const LENGTH_CODE: Record<QuizLength, string> = { quick: 'q', standard: 's', deep: 'd' };
const MUST = 1;
const OFF = 2;
const MAX_CODE = 6000;

export function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(code: string) {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** A compact, URL-safe code for a finished quiz. Presets are left out because the quiz definition restores them. */
export function encodeResult(answers: AnswerMap, asked: string[], length: QuizLength | null) {
  const rows: unknown[] = [];
  for (const id of asked) {
    const a = answers[id];
    if (!a || a.preset || a.value == null) continue;
    const flags = (a.must ? MUST : 0) | (a.off ? OFF : 0);
    rows.push(flags ? [id, a.value, flags] : [id, a.value]);
  }
  return toBase64Url(JSON.stringify(length ? { q: rows, l: LENGTH_CODE[length] } : { q: rows }));
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optionIds = (q: Question) => (q.options ?? []).map((o) => o.id);

/** Returns the cleaned value, or undefined when it does not fit the question. */
function cleanValue(q: Question, value: unknown): unknown {
  if (value === 'skip') return 'skip';
  switch (q.type) {
    case 'os':
      return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v in OS_BY_ID) : undefined;
    case 'multi':
    case 'extensions': {
      if (!Array.isArray(value)) return undefined;
      const ok = optionIds(q);
      return value.filter((v): v is string => typeof v === 'string' && ok.includes(v));
    }
    case 'slider':
    case 'tolerance':
      return isNum(value) && value >= 0 && value <= 4 ? Math.round(value) : undefined;
    case 'rank': {
      const ids = (q.items ?? []).map((i) => i.id);
      return Array.isArray(value) && value.length === ids.length && ids.every((id) => value.includes(id)) ? value : undefined;
    }
    case 'tradeoff':
      return Array.isArray(value) && value.length === 2 && value.every((n) => isNum(n) && n >= 0 && n <= 1) ? value : undefined;
    case 'triage': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
      const rec = value as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const it of q.triage ?? []) if (rec[it.id] === 'must' || rec[it.id] === 'nice') out[it.id] = rec[it.id] as string;
      return out;
    }
    case 'number': {
      const n = q.number;
      return n && isNum(value) && value >= n.min && value <= n.max ? value : undefined;
    }
    case 'browser': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
      const v = value as { id?: unknown; gripes?: unknown; different?: unknown };
      const id = typeof v.id === 'string' && BROWSER_BY_ID[v.id] ? v.id : null;
      const known = (q.gripes ?? []).map((g) => g.id);
      const gripes = Array.isArray(v.gripes) ? v.gripes.filter((g): g is string => typeof g === 'string' && known.includes(g)) : [];
      return { id, gripes, ...(v.different === true && id ? { different: true } : {}) };
    }
    case 'budget': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
      const rec = value as Record<string, unknown>;
      const out: Record<string, number> = {};
      for (const it of q.items ?? []) {
        const n = rec[it.id];
        out[it.id] = isNum(n) ? Math.max(0, Math.min(100, n)) : 0;
      }
      return out;
    }
    default:
      return typeof value === 'string' && optionIds(q).includes(value) ? value : undefined;
  }
}

/** Reads a code made by encodeResult. Unknown questions and malformed answers are dropped, never trusted. */
export function decodeResult(code: string | null, def: QuizDef): SharedResult | null {
  if (!code || code.length > MAX_CODE || /[^A-Za-z0-9_-]/.test(code)) return null;
  try {
    const data = JSON.parse(fromBase64Url(code)) as { q?: unknown; l?: unknown };
    if (!data || !Array.isArray(data.q)) return null;
    const answers: AnswerMap = { ...(def.preset ?? {}) };
    const asked: string[] = [];
    for (const row of data.q.slice(0, 80)) {
      if (!Array.isArray(row) || typeof row[0] !== 'string') continue;
      const id = row[0];
      const q = Q[id];
      if (!q || !def.questions.includes(id) || asked.includes(id)) continue;
      const value = cleanValue(q, row[1]);
      if (value === undefined) continue;
      const flags = isNum(row[2]) ? row[2] : 0;
      answers[id] = { value, ...(flags & MUST ? { must: true } : {}), ...(flags & OFF ? { off: true } : {}) };
      asked.push(id);
    }
    if (!asked.length) return null;
    const length = (Object.keys(LENGTH_CODE) as QuizLength[]).find((l) => LENGTH_CODE[l] === data.l) ?? null;
    return { answers, asked, length: def.lengths ? length : null };
  } catch {
    return null;
  }
}

/** The full link that opens a result. A custom quiz carries its own definition in the link. */
export function resultLink(def: Pick<QuizDef, 'id' | 'shareCode'>, code: string) {
  const path = def.shareCode ? `/quiz/custom?c=${def.shareCode}&r=${code}` : `/quiz/${def.id}?r=${code}`;
  return `${location.origin}${location.pathname}#${path}`;
}
