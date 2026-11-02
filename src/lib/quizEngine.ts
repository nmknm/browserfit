import { CATEGORIES, CATEGORY_IDS, FEATURE_INDEX, FEATURE_BY_ID, OS_BY_ID } from '../data/taxonomy';
import { Q, triageLevels, type Answers, type BrowserAnswer, type QuizCtx, type QuizDef, type Question } from '../data/quizzes';
import { PERSONAS } from '../data/personas';
import { BROWSERS, getBrowser, scoresFor } from './data';
import { relativeScores } from './scoring';
import type { BrowserIndex, CategoryId, OsId } from './types';

export interface AnswerValue {
  value: unknown;
  must?: boolean;
  preset?: boolean;
  /** the visitor chose to ignore this answer; the value is kept so it can be switched back on */
  off?: boolean;
  /** carried over from an earlier quiz, so it is shown rather than asked */
  earlier?: boolean;
}
export type AnswerMap = Record<string, AnswerValue>;

export interface Result {
  b: BrowserIndex;
  score: number;
  match: number;
  reasons: string[];
  drawback: string | null;
  missing: string[];
}

const BASE = 0.1;
/** Answer weights are raised to this power, so the few things a visitor stressed outweigh many small preferences that all-rounders pick up. */
const SHARPEN = 1.25;

function optionApply(q: Question, value: unknown, c: QuizCtx) {
  if (q.apply) return q.apply(value, c);
  if (!q.options) return;
  const ids = Array.isArray(value) ? (value as string[]) : [value as string];
  for (const id of ids) q.options.find((o) => o.id === id)?.apply?.(c);
}

/** Turn answers into a scoring context. Feature must-haves are hard only when the visitor marked them. */
export function buildCtx(def: Pick<QuizDef, 'questions' | 'focus'>, answers: AnswerMap, skip?: string): QuizCtx & { soft: string[] } {
  const ctx: QuizCtx & { soft: string[] } = { w: { ...def.focus }, must: [], filters: [], oses: [], soft: [] };
  for (const id of def.questions) {
    if (id === skip) continue;
    const q = Q[id];
    const a = answers[id];
    if (!q || !a || a.off || a.value == null || a.value === 'skip') continue;
    const before = ctx.must.length;
    optionApply(q, a.value, ctx);
    // A triage question decides hard versus soft per row, so its Must rows stay hard.
    if (!a.must && q.type !== 'triage') ctx.soft.push(...ctx.must.splice(before));
  }
  return ctx;
}

function weightsOf(ctx: QuizCtx): Partial<Record<CategoryId, number>> {
  const w: Partial<Record<CategoryId, number>> = {};
  for (const c of CATEGORIES) w[c.id] = c.id in ctx.w ? Math.max(0, BASE * c.weight + Math.max(0, ctx.w[c.id] ?? 0) ** SHARPEN) : BASE * c.weight;
  if (ctx.w.ai === 0) w.ai = 0;
  return w;
}

const supported = (b: BrowserIndex, f: string) => {
  const code = b.features[FEATURE_INDEX[f]]?.[0] ?? 0;
  return code === 1 || code === 2 || code === 3;
};

function scoreOne(b: BrowserIndex, w: Partial<Record<CategoryId, number>>, soft: string[], os: OsId | null) {
  const s = relativeScores(scoresFor(b, os));
  let num = 0;
  let den = 0;
  CATEGORY_IDS.forEach((id, i) => {
    const wi = w[id] ?? 0;
    num += s[i] * wi;
    den += wi;
  });
  let v = den ? num / den : 0;
  for (const f of soft) v += supported(b, f) ? 0.12 : -0.35;
  return Math.max(0, Math.min(10, v));
}

export function evaluate(ctx: QuizCtx & { soft: string[] }, pool?: (b: BrowserIndex) => boolean, os: OsId | null = null): Result[] {
  const w = weightsOf(ctx);
  const cands = BROWSERS.filter((b) => b.status !== 'discontinued' && (!pool || pool(b)) && ctx.filters.every((f) => f.test(b)) && ctx.must.every((f) => supported(b, f)) && (!os || b.platforms[os]));
  const ranked = cands.map((b) => ({ b, score: scoreOne(b, w, ctx.soft, os) })).sort((a, z) => z.score - a.score);
  const top = ranked[0]?.score ?? 10;
  const weighted = CATEGORIES.map((c, i) => ({ c, i, w: w[c.id] ?? 0 })).filter((x) => x.w > BASE * x.c.weight + 0.01);
  return ranked.map(({ b, score }) => {
    const s = scoresFor(b, os);
    const contrib = weighted.map((x) => ({ ...x, v: s[x.i], gain: (s[x.i] - 6) * x.w })).sort((a, z) => z.gain - a.gain);
    const reasons = contrib
      .filter((x) => x.v >= 7)
      .slice(0, 3)
      .map((x) => `${x.c.name}: ${x.v.toFixed(1)}/10`);
    const worst = [...contrib].sort((a, z) => a.gain - z.gain)[0];
    const missing = ctx.soft.filter((f) => !supported(b, f)).map((f) => FEATURE_BY_ID[f]?.name ?? f);
    // Match % blends absolute quality with closeness to the best result.
    const match = Math.round(Math.min(99, (score / 10) * 55 + (score / (top || 1)) * 44));
    return { b, score, match, reasons, drawback: worst && worst.v < 7 ? `${worst.c.name} is only ${worst.v.toFixed(1)}/10` : missing[0] ? `No ${missing[0].toLowerCase()}` : null, missing };
  });
}

/** Which hard constraint removes the most candidates (for the “nothing matches” message). */
export function findConflict(ctx: QuizCtx & { soft: string[] }, pool?: (b: BrowserIndex) => boolean) {
  const base = BROWSERS.filter((b) => b.status !== 'discontinued' && (!pool || pool(b)));
  const options: { label: string; n: number; kind: 'filter' | 'must'; key: string }[] = [];
  ctx.filters.forEach((f, i) => {
    const others = ctx.filters.filter((_, j) => j !== i);
    const n = base.filter((b) => others.every((o) => o.test(b)) && ctx.must.every((m) => supported(b, m))).length;
    options.push({ label: f.label, n, kind: 'filter', key: String(i) });
  });
  ctx.must.forEach((m) => {
    const n = base.filter((b) => ctx.filters.every((o) => o.test(b)) && ctx.must.filter((x) => x !== m).every((x) => supported(b, x))).length;
    options.push({ label: FEATURE_BY_ID[m]?.name ?? m, n, kind: 'must', key: m });
  });
  return options.sort((a, z) => z.n - a.n)[0] ?? null;
}

/** Sample answers to a question, used to estimate how much asking it would change the winner. */
export function probes(q: Question): unknown[] {
  if (q.probes) return q.probes;
  const ids = (q.items ?? []).map((i) => i.id);
  switch (q.type) {
    case 'os':
      return [];
    case 'slider':
    case 'tolerance':
      return [0, 2, 4];
    case 'rank':
      // Each of the first few items moved to the top.
      return ids.slice(0, 4).map((_, k) => [...ids.slice(k), ...ids.slice(0, k)]);
    case 'tradeoff':
      return [[0, 0], [1, 0], [0, 1], [1, 1]];
    case 'budget':
      return ids.map((id) => Object.fromEntries(ids.map((x) => [x, x === id ? 60 : Math.round(40 / Math.max(1, ids.length - 1))])));
    case 'multi':
    case 'extensions':
      return (q.options ?? []).map((o) => [o.id]);
    case 'triage':
      return (q.triage ?? []).map((it) => ({ [it.id]: 'must' }));
    case 'number':
      return q.number?.presets ?? [];
    case 'browser':
      return (q.gripes ?? []).map((g) => ({ id: null, gripes: [g.id] }));
    default:
      return (q.options ?? []).map((o) => o.id);
  }
}

/** Pick the remaining question whose answers most change the current winner (information gain proxy). */
export function nextQuestion(def: QuizDef, asked: string[], answers: AnswerMap): string | null {
  const flatAnswers: Answers = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.value]));
  const remaining = def.questions.filter((id) => !asked.includes(id) && !answers[id]?.preset && Q[id] && (!Q[id].when || Q[id].when!(flatAnswers)));
  if (!remaining.length) return null;
  if (!def.adaptiveLimit) return remaining[0];
  // Always ask devices first.
  if (remaining.includes('devices')) return 'devices';
  let best = remaining[0];
  let bestGain = -1;
  for (const id of remaining) {
    const samples = probes(Q[id]);
    if (samples.length < 2) continue;
    const winners = new Set<string>();
    for (const value of samples) {
      const trial = { ...answers, [id]: { value } };
      const r = evaluate(buildCtx(def, trial), def.pool)[0];
      if (r) winners.add(r.b.id);
    }
    const gain = winners.size + (def.questions.indexOf(id) < 6 ? 0.5 : 0);
    if (gain > bestGain) {
      bestGain = gain;
      best = id;
    }
  }
  return best;
}

/** How sure the quiz is about its winner, 0–98: a wide lead over the runner-up and more answers raise it. */
export function confidence(results: Result[], answered: number) {
  const gap = results.length > 1 ? results[0].score - results[1].score : 1;
  return Math.round(Math.min(98, 40 + gap * 90 + Math.min(1, answered / 10) * 25));
}

/** A short plain-language label for an answer, used in summaries. */
export function answerLabel(q: Question, value: unknown): string {
  if (value == null || value === 'skip') return 'No preference';
  if (q.type === 'os') {
    const list = (value as OsId[]).map((o) => OS_BY_ID[o]?.name ?? o);
    return list.length ? list.join(', ') : 'No device chosen';
  }
  if (q.type === 'slider' || q.type === 'tolerance') return q.scale?.[Number(value)] ?? String(value);
  if (q.type === 'rank') {
    const first = (value as string[])[0];
    return `Top: ${q.items?.find((i) => i.id === first)?.label ?? first}`;
  }
  if (q.type === 'budget') {
    const pts = value as Record<string, number>;
    const top = Object.entries(pts).sort((a, z) => z[1] - a[1])[0];
    return top ? `Most points: ${q.items?.find((i) => i.id === top[0])?.label ?? top[0]}` : 'Points split';
  }
  if (q.type === 'tradeoff') return 'Placed on the map';
  if (q.type === 'number') return `${value} ${q.number?.unit ?? ''}`.trim();
  if (q.type === 'triage') {
    const levels = triageLevels(value);
    const name = (id: string) => q.triage?.find((t) => t.id === id)?.label ?? id;
    const must = Object.keys(levels).filter((id) => levels[id] === 'must').map(name);
    const nice = Object.keys(levels).filter((id) => levels[id] === 'nice').map(name);
    const parts = [must.length ? `Must: ${must.join(', ')}` : '', nice.length ? `Nice: ${nice.join(', ')}` : ''].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Nothing required';
  }
  if (q.type === 'browser') {
    const a = value as BrowserAnswer;
    const name = a.id ? (getBrowser(a.id)?.name ?? a.id) : 'No browser chosen';
    const gripes = (a.gripes ?? []).map((g) => q.gripes?.find((x) => x.id === g)?.label.toLowerCase() ?? g);
    return gripes.length ? `${name} · ${gripes.join(', ')}` : name;
  }
  const ids = Array.isArray(value) ? (value as string[]) : [value as string];
  const labels = ids.map((id) => q.options?.find((o) => o.id === id)?.label ?? String(id));
  return labels.length ? labels.join(', ') : 'None';
}

/** What changes when moving from one browser to another, counting only the categories the answers care about. */
export function switchTrade(ctx: QuizCtx & { soft: string[] }, from: BrowserIndex, to: BrowserIndex, os: OsId | null = null) {
  const w = weightsOf(ctx);
  const a = scoresFor(from, os);
  const b = scoresFor(to, os);
  const rows = CATEGORIES.map((c, i) => ({ name: c.name, diff: Math.round((b[i] - a[i]) * 10) / 10, weighted: (b[i] - a[i]) * (w[c.id] ?? 0) }));
  return {
    gain: rows.filter((r) => r.diff >= 0.5 && r.weighted > 0).sort((x, z) => z.weighted - x.weighted).slice(0, 3),
    lose: rows.filter((r) => r.diff <= -0.5 && r.weighted < 0).sort((x, z) => x.weighted - z.weighted).slice(0, 2),
  };
}

/** How closely the weights these answers produced follow each persona's emphasis (cosine similarity, 0 to 100). */
export function personaMatches(ctx: QuizCtx) {
  const mine = CATEGORY_IDS.map((id) => Math.max(0, ctx.w[id] ?? 0));
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  const nm = norm(mine);
  if (!nm) return [];
  return PERSONAS.map((p) => {
    const theirs = CATEGORY_IDS.map((id) => p.boost[id] ?? 0);
    const nt = norm(theirs);
    const dot = mine.reduce((s, x, i) => s + x * theirs[i], 0);
    return { id: p.id, name: p.name, pct: nt ? Math.round((dot / (nm * nt)) * 100) : 0 };
  })
    .filter((m) => m.pct > 0)
    .sort((a, z) => z.pct - a.pct);
}

export interface Exclusion {
  kind: 'discontinued' | 'pool' | 'filter' | 'must' | 'os' | 'ranked';
  /** the requirement that removed the browser (kinds filter, must, pool) */
  label?: string;
  /** 1-based position when the browser is still in the running */
  rank?: number;
  of?: number;
  /** categories where the browser trails the winner, weighted, biggest first */
  deficits: { name: string; diff: number }[];
}

/** Why a browser is not the winner: left out by a requirement, or ranked lower, with where it trails. */
export function explainExclusion(ctx: QuizCtx & { soft: string[] }, pool: ((b: BrowserIndex) => boolean) | undefined, b: BrowserIndex, os: OsId | null = null, poolLabel?: string): Exclusion {
  const none: Exclusion['deficits'] = [];
  if (b.status === 'discontinued') return { kind: 'discontinued', deficits: none };
  if (pool && !pool(b)) return { kind: 'pool', label: poolLabel, deficits: none };
  if (os && !b.platforms[os]) return { kind: 'os', label: OS_BY_ID[os]?.name, deficits: none };
  const failedFilter = ctx.filters.find((f) => !f.test(b));
  if (failedFilter) return { kind: 'filter', label: failedFilter.label, deficits: none };
  const failedMust = ctx.must.find((m) => !supported(b, m));
  if (failedMust) return { kind: 'must', label: FEATURE_BY_ID[failedMust]?.name ?? failedMust, deficits: none };
  const results = evaluate(ctx, pool, os);
  const idx = results.findIndex((r) => r.b.id === b.id);
  const winner = results[0];
  const deficits: Exclusion['deficits'] = [];
  if (winner && winner.b.id !== b.id) {
    const w = weightsOf(ctx);
    const mine = scoresFor(b, os);
    const theirs = scoresFor(winner.b, os);
    CATEGORIES.map((c, i) => ({ name: c.name, diff: theirs[i] - mine[i], weighted: (theirs[i] - mine[i]) * (w[c.id] ?? 0) }))
      .filter((x) => x.diff > 0.4 && x.weighted > 0)
      .sort((a, z) => z.weighted - a.weighted)
      .slice(0, 3)
      .forEach((x) => deficits.push({ name: x.name, diff: Math.round(x.diff * 10) / 10 }));
  }
  return { kind: 'ranked', rank: idx + 1, of: results.length, deficits };
}

export interface Trace {
  qid: string;
  title: string;
  delta: number;
  flips: string | null;
}

/** For each answer: how much it moved the winner, and whether dropping it changes the winner. */
export function traceAnswers(def: QuizDef, ids: string[], answers: AnswerMap, winner: BrowserIndex): Trace[] {
  const full = buildCtx(def, answers);
  const base = evaluate(full, def.pool).find((r) => r.b.id === winner.id)?.score ?? 0;
  return ids
    .filter((id) => answers[id] && answers[id].value !== 'skip' && !answers[id].off)
    .map((id) => {
      const without = evaluate(buildCtx(def, answers, id), def.pool);
      const mine = without.find((r) => r.b.id === winner.id)?.score ?? base;
      const top = without[0];
      return { qid: id, title: Q[id]?.title ?? id, delta: base - mine, flips: top && top.b.id !== winner.id ? top.b.name : null };
    })
    .sort((a, z) => Math.abs(z.delta) - Math.abs(a.delta));
}

export function perOsPicks(ctx: QuizCtx & { soft: string[] }, pool?: (b: BrowserIndex) => boolean) {
  return ctx.oses.map((os) => ({ os, top: evaluate(ctx, pool, os)[0] ?? null }));
}

/** Best single browser available on every chosen device. */
export function everywherePick(ctx: QuizCtx & { soft: string[] }, pool?: (b: BrowserIndex) => boolean) {
  if (ctx.oses.length < 2) return null;
  return evaluate(ctx, (b) => (!pool || pool(b)) && ctx.oses.every((o) => b.platforms[o] && b.platforms[o]!.status !== 'discontinued'))[0] ?? null;
}

/** Privacy profile: threat level 1–4 from the privacy questions. */
export function privacyLevel(answers: AnswerMap) {
  let pts = 0;
  const who = (answers['pv-who']?.value as string[]) ?? [];
  pts += who.includes('ads') ? 1 : 0;
  pts += who.includes('isp') ? 2 : 0;
  pts += who.includes('employer') ? 1 : 0;
  pts += who.includes('gov') ? 4 : 0;
  pts += who.includes('people') ? 1 : 0;
  const acc = answers['pv-accounts']?.value;
  pts += acc === 'rarely' ? 2 : acc === 'some' ? 1 : 0;
  pts += Number(answers['pv-breakage']?.value ?? 1);
  pts += answers['pv-anon']?.value === 'yes' ? 3 : 0;
  pts += answers['pv-fp']?.value === 'identify' ? 2 : 0;
  const level = pts >= 11 ? 4 : pts >= 7 ? 3 : pts >= 4 ? 2 : 1;
  return { level, pts, needsSync: answers['pv-sync']?.value === 'yes' };
}

/** Security check-up: risk level 1–4, the points behind it, and the habits that cost the most. */
export function securityLevel(answers: AnswerMap) {
  const v = (id: string) => answers[id]?.value;
  const parts: { gap: string; pts: number }[] = [];
  const add = (pts: number, gap: string) => parts.push({ pts, gap });
  const upd = v('sc-updates');
  add(upd === 'delay' ? 3 : upd === 'unsure' ? 2 : upd === 'prompt' ? 1 : 0, 'You delay or are unsure about updates, which leaves known bugs open for longer.');
  const ext = v('sc-ext');
  add(ext === 'lots' ? 3 : ext === 'many' ? 2 : ext === 'few' ? 1 : 0, 'You run many extensions, and every extension can read what you browse.');
  const acc = (v('sc-accounts') as string[]) ?? [];
  add((acc.includes('bank') ? 2 : 0) + (acc.includes('work') ? 2 : 0) + (acc.includes('crypto') ? 3 : 0) + (acc.includes('social') ? 1 : 0), 'You sign in to high-value accounts in this browser, so a compromise costs more.');
  const wifi = v('sc-wifi');
  add(wifi === 'often' ? 2 : wifi === 'sometimes' ? 1 : 0, 'You use public Wi-Fi or shared computers, where connections are easier to watch.');
  const dl = v('sc-downloads');
  add(dl === 'fast' ? 3 : dl === 'mostly' ? 1 : 0, 'You click links and downloads quickly, which is how most drive-by attacks start.');
  const ai = v('sc-ai');
  add(ai === 'agent' ? 3 : ai === 'assist' ? 1 : 0, 'An AI agent can be steered by hidden instructions in a web page.');
  const pts = parts.reduce((a, p) => a + p.pts, 0);
  const level = pts >= 12 ? 4 : pts >= 8 ? 3 : pts >= 4 ? 2 : 1;
  const biggest = [...parts].sort((a, z) => z.pts - a.pts)[0];
  const oses = ((v('sc-os') as OsId[]) ?? []).filter(Boolean);
  return { level, pts, biggest: biggest && biggest.pts > 0 ? biggest.gap : null, oses };
}
