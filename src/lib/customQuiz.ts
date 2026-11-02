import { Q, type QuizDef } from '../data/quizzes';
import { ENGINE_BY_ID, FEATURE_BY_ID, FEATURE_INDEX, GROUP_LABEL, OS_BY_ID } from '../data/taxonomy';
import { BROWSERS, BROWSER_BY_ID } from './data';
import { fromBase64Url, toBase64Url } from './quizUrl';
import { useLocalState } from './store';
import type { BrowserIndex, EngineId, Group, OsId } from './types';

/** Which browsers a quiz chooses from. Every field narrows the field; an empty spec means every browser. */
export interface PoolSpec {
  os?: OsId[];
  engines?: EngineId[];
  free?: boolean;
  openSource?: boolean;
  stable?: boolean;
  groups?: Group[];
  /** feature ids the browser must support */
  features?: string[];
  /** an exact set of browsers, for example a shortlist */
  ids?: string[];
}

export interface CustomQuiz {
  id: string;
  name: string;
  pool: PoolSpec;
  questions: string[];
  /** let the quiz ask the most useful questions first and offer a shorter run */
  adaptive: boolean;
  made: number;
}

export const CUSTOM_KEY = 'bf-custom-quizzes';
const MAX_QUESTIONS = 30;
const MAX_IDS = 60;

const supports = (b: BrowserIndex, fid: string) => [1, 2, 3].includes(b.features[FEATURE_INDEX[fid]]?.[0] ?? 0);
const live = (b: BrowserIndex) => b.status !== 'discontinued';

export function compilePool(spec: PoolSpec): (b: BrowserIndex) => boolean {
  return (b) => {
    if (spec.ids?.length && !spec.ids.includes(b.id)) return false;
    if (spec.os?.length && !spec.os.some((o) => b.platforms[o] && b.platforms[o]!.status !== 'discontinued')) return false;
    if (spec.engines?.length && !spec.engines.includes(b.engine)) return false;
    if (spec.free && b.price === 'paid') return false;
    if (spec.openSource && b.openSource !== true) return false;
    if (spec.stable && !(b.status === 'active' || b.status === 'maintenance')) return false;
    if (spec.groups?.length && !spec.groups.includes(b.group)) return false;
    if (spec.features?.length && !spec.features.every((f) => supports(b, f))) return false;
    return true;
  };
}

/** Browsers a spec leaves in play (discontinued browsers are always left out, as in every quiz). */
export function poolMembers(spec: PoolSpec) {
  const test = compilePool(spec);
  return BROWSERS.filter((b) => live(b) && test(b));
}

const list = (items: string[], joiner = ' or ') => items.join(joiner);

/** A short plain description of a pool, for tiles and the result heading. */
export function describePool(spec: PoolSpec): string {
  if (spec.ids?.length) return `${spec.ids.length} browsers you chose`;
  const parts: string[] = [];
  if (spec.os?.length) parts.push(`on ${list(spec.os.map((o) => OS_BY_ID[o]?.name ?? o))}`);
  if (spec.engines?.length) parts.push(`${list(spec.engines.map((e) => ENGINE_BY_ID[e]?.name ?? e))} engine`);
  if (spec.groups?.length) parts.push(list(spec.groups.map((g) => (GROUP_LABEL[g] ?? g).toLowerCase())));
  if (spec.free) parts.push('free');
  if (spec.openSource) parts.push('open source');
  if (spec.stable) parts.push('no beta');
  if (spec.features?.length) parts.push(`with ${list(spec.features.map((f) => (FEATURE_BY_ID[f]?.name ?? f).toLowerCase()), ' and ')}`);
  return parts.length ? `browsers ${parts.join(', ')}` : 'every browser';
}

/** Questions a visitor can put in their own quiz. Baselines (preset in other quizzes) are not offered. */
export const QUESTION_CHOICES = Object.keys(Q).filter((id) => !id.startsWith('base') && Q[id].type !== 'trivia');

export function customToDef(c: CustomQuiz): QuizDef {
  const n = c.questions.length;
  return {
    id: c.id,
    name: c.name,
    group: 'find',
    blurb: `Your quiz, choosing from ${describePool(c.pool)}.`,
    minutes: Math.max(1, Math.round(n / 3)),
    kind: 'match',
    questions: c.questions,
    pool: compilePool(c.pool),
    poolLabel: describePool(c.pool),
    lengths: c.adaptive && n >= 6 ? { quick: Math.max(3, Math.round(n / 3)), standard: Math.max(4, Math.round((n * 2) / 3)), deep: n } : undefined,
    shareCode: encodeCustom(c),
  };
}

/* ------------------------------ saving and sharing ------------------------------ */

const pick = <T extends string>(v: unknown, known: (id: string) => boolean): T[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is T => typeof x === 'string' && known(x));
  return out.length ? out : undefined;
};

export function cleanPool(raw: unknown): PoolSpec {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const spec: PoolSpec = {};
  const os = pick<OsId>(r.os, (id) => id in OS_BY_ID);
  const engines = pick<EngineId>(r.engines, (id) => id in ENGINE_BY_ID);
  const groups = pick<Group>(r.groups, (id) => id in GROUP_LABEL);
  const features = pick<string>(r.features, (id) => id in FEATURE_BY_ID);
  const ids = pick<string>(r.ids, (id) => id in BROWSER_BY_ID)?.slice(0, MAX_IDS);
  if (os) spec.os = os;
  if (engines) spec.engines = engines;
  if (groups) spec.groups = groups;
  if (features) spec.features = features;
  if (ids) spec.ids = ids;
  if (r.free === true) spec.free = true;
  if (r.openSource === true) spec.openSource = true;
  if (r.stable === true) spec.stable = true;
  return spec;
}

export function cleanQuestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const id of raw) if (typeof id === 'string' && QUESTION_CHOICES.includes(id) && !out.includes(id)) out.push(id);
  return out.slice(0, MAX_QUESTIONS);
}

export function encodeCustom(c: Pick<CustomQuiz, 'name' | 'pool' | 'questions' | 'adaptive'>) {
  return toBase64Url(JSON.stringify({ n: c.name, p: c.pool, q: c.questions, a: c.adaptive ? 1 : 0 }));
}

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

/** Reads a code made by encodeCustom. Anything unknown is dropped; a quiz with no questions is refused. */
export function decodeCustom(code: string | null): CustomQuiz | null {
  if (!code || code.length > 6000 || /[^A-Za-z0-9_-]/.test(code)) return null;
  try {
    const d = JSON.parse(fromBase64Url(code)) as { n?: unknown; p?: unknown; q?: unknown; a?: unknown };
    const questions = cleanQuestions(d.q);
    if (!questions.length) return null;
    const name = typeof d.n === 'string' && d.n.trim() ? d.n.trim().slice(0, 60) : 'Shared quiz';
    return { id: `u-${hash(code)}`, name, pool: cleanPool(d.p), questions, adaptive: d.a === 1, made: 0 };
  } catch {
    return null;
  }
}

export function useCustomQuizzes() {
  return useLocalState<CustomQuiz[]>(CUSTOM_KEY, []);
}

/** The quiz a /quiz/:id link points to, when it is not a built-in one. */
export function resolveCustom(id: string | undefined, code: string | null, saved: CustomQuiz[]): CustomQuiz | null {
  if (id === 'custom') return decodeCustom(code);
  if (id?.startsWith('c-')) {
    const found = saved.find((q) => q.id === id);
    return found ? { ...found, pool: cleanPool(found.pool), questions: cleanQuestions(found.questions) } : null;
  }
  return null;
}

/** A link that opens a custom quiz for anyone, with nothing saved on their side. */
export function customLink(c: Pick<CustomQuiz, 'name' | 'pool' | 'questions' | 'adaptive'>) {
  return `/quiz/custom?c=${encodeCustom(c)}`;
}

/** The questions a shortlist decider asks: broad ones that tell finalists apart. */
export const DECIDER_QUESTIONS = ['priorities', 'blockVsCompat', 'powerVsSimple', 'aiTolerance', 'extensions', 'syncPhone', 'tabStyle', 'telemetryQ', 'hardware', 'tradeoff'];
