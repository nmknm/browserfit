import { CATEGORIES, CATEGORY_IDS, PILLARS } from '../data/taxonomy';
import type { BrowserIndex, CategoryId, OsId, PillarId } from './types';
import { BROWSERS, availableOn, scoresFor } from './data';

export type Weights = Partial<Record<CategoryId, number>>;

export const DEFAULT_WEIGHTS: Weights = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.weight]));

export function overall(b: BrowserIndex, weights: Weights = DEFAULT_WEIGHTS, os?: OsId | null): number {
  const s = scoresFor(b, os);
  let num = 0;
  let den = 0;
  CATEGORY_IDS.forEach((id, i) => {
    const w = weights[id] ?? 0;
    if (w <= 0) return;
    num += s[i] * w;
    den += w;
  });
  return den ? num / den : 0;
}

/**
 * Mean and spread of each category across the live pool. Used to judge a score against what other browsers
 * manage, so a category where nearly everyone scores 9 stops counting as a win for the browsers that have it.
 */
const CATEGORY_STATS = (() => {
  const live = BROWSERS.filter((b) => b.status !== 'discontinued');
  return CATEGORY_IDS.map((_, i) => {
    const vals = live.map((b) => b.scores[i] ?? 0);
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
    return { mean, sd: Math.max(sd, 1) };
  });
})();

/** Category scores re-centred on the pool: an average browser sits at 6, one standard deviation is 1.6 points. */
export function relativeScores(s: number[]): number[] {
  return s.map((v, i) => Math.max(0, Math.min(10, 6 + ((v - CATEGORY_STATS[i].mean) / CATEGORY_STATS[i].sd) * 1.6)));
}

export function pillarScore(b: BrowserIndex, pillar: PillarId, os?: OsId | null): number {
  const s = scoresFor(b, os);
  let num = 0;
  let den = 0;
  CATEGORIES.forEach((c, i) => {
    if (c.pillar !== pillar) return;
    num += s[i] * c.weight;
    den += c.weight;
  });
  return den ? num / den : 0;
}

export function pillarScores(b: BrowserIndex, os?: OsId | null): Record<PillarId, number> {
  return Object.fromEntries(PILLARS.map((p) => [p.id, pillarScore(b, p.id, os)])) as Record<PillarId, number>;
}

/** Spread across categories: low = well-rounded. */
export function consistency(b: BrowserIndex, os?: OsId | null) {
  const s = scoresFor(b, os);
  const mean = s.reduce((a, v) => a + v, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / s.length);
  return { mean, sd };
}

export type ScoreTier = 'poor' | 'fair' | 'good' | 'great' | 'excellent';
export function tierOf(v: number): ScoreTier {
  if (v >= 9) return 'excellent';
  if (v >= 7.5) return 'great';
  if (v >= 6) return 'good';
  if (v >= 4) return 'fair';
  return 'poor';
}
export const TIER_LABEL: Record<ScoreTier, string> = {
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  great: 'Great',
  excellent: 'Excellent',
};
export const tierVar = (v: number) => `var(--score-${tierOf(v)})`;

export function fmt(v: number) {
  return (Math.round(v * 10) / 10).toFixed(1);
}

export interface Ranked {
  b: BrowserIndex;
  value: number;
  rank: number;
}

/** Rank with ties (competition ranking: 1,2,2,4). */
export function rank(list: BrowserIndex[], value: (b: BrowserIndex) => number): Ranked[] {
  const rows = list.map((b) => ({ b, value: Math.round(value(b) * 100) / 100, rank: 0 }));
  rows.sort((a, z) => z.value - a.value || a.b.name.localeCompare(z.b.name));
  rows.forEach((r, i) => {
    r.rank = i > 0 && r.value === rows[i - 1].value ? rows[i - 1].rank : i + 1;
  });
  return rows;
}

export function pool(opts: { os?: OsId | null; includeDiscontinued?: boolean } = {}) {
  return BROWSERS.filter((b) => (opts.includeDiscontinued ? true : b.status !== 'discontinued') && (!opts.os || availableOn(b, opts.os)));
}

/** Rank of a browser in one category among the live pool. */
export function categoryRank(b: BrowserIndex, cat: CategoryId, os?: OsId | null) {
  const p = pool({ os });
  const idx = CATEGORY_IDS.indexOf(cat);
  const ranked = rank(p, (x) => scoresFor(x, os)[idx]);
  const row = ranked.find((r) => r.b.id === b.id);
  return { rank: row?.rank ?? null, of: p.length };
}

export function overallRank(b: BrowserIndex, os?: OsId | null) {
  const p = pool({ os });
  const ranked = rank(p, (x) => overall(x, DEFAULT_WEIGHTS, os));
  const row = ranked.find((r) => r.b.id === b.id);
  return { rank: row?.rank ?? null, of: p.length };
}

export function percentile(rankNo: number | null, of: number) {
  if (!rankNo || !of) return null;
  return Math.max(1, Math.round((rankNo / of) * 100));
}

/**
 * Choose `n` picks from a best-first list so they spread across engines when the fit is close. Each earlier pick
 * on the same engine costs 7% of the best value, and anything more than 18% behind the best is left out.
 * `taken` are browsers already shown (such as the winner) that count toward the spread.
 */
export function diversePicks<T>(sorted: T[], n: number, browser: (t: T) => BrowserIndex, value: (t: T) => number, taken: BrowserIndex[] = []): T[] {
  if (!sorted.length) return [];
  const best = value(sorted[0]);
  const picked: BrowserIndex[] = [...taken];
  const out: T[] = [];
  const left = sorted.filter((t) => value(t) >= best * 0.82 && !taken.some((b) => b.id === browser(t).id));
  while (out.length < n && left.length) {
    let at = 0;
    let top = -Infinity;
    left.forEach((t, i) => {
      const crowd = picked.filter((b) => b.engine === browser(t).engine).length;
      const v = value(t) - crowd * best * 0.07;
      if (v > top) {
        top = v;
        at = i;
      }
    });
    const [pick] = left.splice(at, 1);
    out.push(pick);
    picked.push(browser(pick));
  }
  // Too few close fits: fall back to plain order so the list is still full.
  for (const t of sorted) {
    if (out.length >= n) break;
    if (!out.includes(t) && !taken.some((b) => b.id === browser(t).id)) out.push(t);
  }
  return out;
}

/**
 * Share of its default weight a category keeps when a persona does not mention it. Kept low so the categories the
 * persona cares about decide the order, instead of the browser that is merely good at everything.
 */
const PERSONA_BASE = 0.35;

/** Category weights for a persona: default weight × boost (boost 0 removes the category). */
export function personaWeights(boost: Partial<Record<CategoryId, number>>): Weights {
  return Object.fromEntries(CATEGORIES.map((c) => [c.id, c.weight * (boost[c.id] ?? PERSONA_BASE)]));
}

/** Weights that stress the chosen categories (default weight × boost) and let every other category count for less. */
export function focusWeights(cats: readonly CategoryId[], boost = 5): Weights {
  return personaWeights(Object.fromEntries(cats.map((id) => [id, boost])));
}
