import { CATEGORIES } from '../data/taxonomy';
import type { Weights } from './scoring';

/** One digit per category (0–9 → weight 0–4.5), in CATEGORIES order. */
export function encodeWeights(w: Weights) {
  return CATEGORIES.map((c) => Math.round(Math.max(0, Math.min(4.5, w[c.id] ?? 0)) * 2).toString()).join('');
}

export function decodeWeights(s: string | null): Weights | null {
  if (!s || s.length !== CATEGORIES.length || /[^0-9]/.test(s)) return null;
  return Object.fromEntries(CATEGORIES.map((c, i) => [c.id, Number(s[i]) / 2])) as Weights;
}
