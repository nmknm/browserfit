import rawIndex from '../data/generated/index.json';
import type { BrowserDetail, BrowserIndex, CategoryId, OsId } from './types';
import { CATEGORY_IDS, CATEGORY_INDEX, FEATURE_INDEX, SUPPORT_CODES } from '../data/taxonomy';

export const BROWSERS = rawIndex as unknown as BrowserIndex[];
export const BROWSER_BY_ID: Record<string, BrowserIndex> = Object.fromEntries(BROWSERS.map((b) => [b.id, b]));

const detailLoaders = import.meta.glob<{ default: BrowserDetail }>('../data/generated/detail/*.json');
const detailCache = new Map<string, BrowserDetail>();

export async function loadDetail(id: string): Promise<BrowserDetail | null> {
  if (detailCache.has(id)) return detailCache.get(id)!;
  const loader = detailLoaders[`../data/generated/detail/${id}.json`];
  if (!loader) return null;
  const mod = await loader();
  detailCache.set(id, mod.default);
  return mod.default;
}

export function getBrowser(id: string | undefined | null): BrowserIndex | undefined {
  return id ? BROWSER_BY_ID[id] : undefined;
}

/** Raw category score, optionally adjusted for an OS. */
export function score(b: BrowserIndex, cat: CategoryId, os?: OsId | null): number {
  let v = b.scores[CATEGORY_INDEX[cat]] ?? 0;
  if (os) {
    const d = b.platforms[os]?.scoreDelta?.[cat];
    if (d) v = Math.max(0, Math.min(10, v + d));
  }
  return v;
}

export function scoresFor(b: BrowserIndex, os?: OsId | null): number[] {
  if (!os || !b.platforms[os]?.scoreDelta) return b.scores;
  const delta = b.platforms[os]!.scoreDelta!;
  return b.scores.map((v, i) => {
    const d = delta[CATEGORY_IDS[i]];
    return d ? Math.max(0, Math.min(10, v + d)) : v;
  });
}

export function feature(b: BrowserIndex, fid: string) {
  const [code, rating] = b.features[FEATURE_INDEX[fid]] ?? [0, 0];
  return { support: SUPPORT_CODES[code], rating };
}

export function availableOn(b: BrowserIndex, os: OsId): boolean {
  const p = b.platforms[os];
  return !!p && p.status !== 'discontinued';
}

export function isLive(b: BrowserIndex) {
  return b.status !== 'discontinued';
}

export function engineOn(b: BrowserIndex, os?: OsId | null) {
  return (os && b.platforms[os]?.engine) || b.engine;
}
