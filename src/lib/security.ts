import engines from '../data/generated/engines.json';
import { feature, scoresFor } from './data';
import { CATEGORY_INDEX } from '../data/taxonomy';
import type { AutoUpdate, BrowserIndex, CategoryId, OsId } from './types';

/* ------------------------------------------------------------------ */
/* Layers of protection                                                */
/* ------------------------------------------------------------------ */

export type LayerId = 'isolation' | 'patching' | 'web' | 'accounts' | 'extensions' | 'transparency' | 'ai';

export interface LayerInfo {
  id: LayerId;
  /** Column heading. */
  short: string;
  name: string;
  /** Share of the Security score, in percent. */
  weight: number;
  /** One sentence: what this layer is about. */
  what: string;
  stops: string;
  cant: string;
}

export const LAYERS: LayerInfo[] = [
  {
    id: 'isolation',
    short: 'Isolation',
    name: 'Isolation',
    weight: 25,
    what: 'How well a web page is walled off from your files, other tabs and other sites.',
    stops: 'A compromised page reaching your files, other tabs or other sites.',
    cant: 'Bugs in your operating system, or an extension you installed.',
  },
  {
    id: 'patching',
    short: 'Patching',
    name: 'Patching',
    weight: 25,
    what: 'How quickly security fixes reach you, and whether they install themselves.',
    stops: 'Attacks that use bugs already fixed upstream.',
    cant: 'Zero-day bugs that nobody has fixed yet.',
  },
  {
    id: 'web',
    short: 'Web',
    name: 'Web protections',
    weight: 15,
    what: 'Defences against insecure connections, fake sites and risky downloads.',
    stops: 'Plain-HTTP snooping, known bad sites and downloads.',
    cant: 'A convincing phishing page that no list has caught yet.',
  },
  {
    id: 'accounts',
    short: 'Accounts',
    name: 'Accounts & credentials',
    weight: 10,
    what: 'How safely the browser handles passwords, passkeys and synced data.',
    stops: 'Phished or reused passwords, and a sync server that can read your data.',
    cant: 'Malware that is already running on your device.',
  },
  {
    id: 'extensions',
    short: 'Extensions',
    name: 'Extension & content risk',
    weight: 10,
    what: 'Exposure to risky extensions, and protection from malicious ads.',
    stops: 'Malicious ads, and unreviewed or sideloaded extensions.',
    cant: 'A trusted extension that turns bad after an update.',
  },
  {
    id: 'transparency',
    short: 'Transparency',
    name: 'Transparency & response',
    weight: 10,
    what: 'Whether bugs can be reported, are disclosed and can be inspected.',
    stops: 'Bugs staying hidden because nobody is looking or listening.',
    cant: 'Guarantee that a reported bug is fixed quickly.',
  },
  {
    id: 'ai',
    short: 'AI',
    name: 'AI-agent exposure',
    weight: 5,
    what: 'How much new attack surface AI features add, such as hidden instructions in a web page steering an agent.',
    stops: 'Nothing: this layer rewards having no AI agent, or a way to switch it off.',
    cant: 'Judge how good the AI itself is.',
  },
];
export const LAYER_BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l])) as Record<LayerId, LayerInfo>;
export const LAYER_IDS = LAYERS.map((l) => l.id);

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const SANDBOX_LABEL = { strong: 'Strong', basic: 'Partial', none: 'None', unknown: 'Not verified' } as const;
export const ISOLATION_LABEL = { full: 'Full', partial: 'Partial', none: 'None', unknown: 'Not verified' } as const;
export const LAG_LABEL = {
  upstream: 'Ships fixes first',
  days: 'Days behind',
  weeks: 'Weeks behind',
  months: 'Months behind',
  own: 'Own engine',
  stalled: 'Not maintained',
  unknown: 'Not verified',
} as const;
export const UPDATE_LABEL: Record<AutoUpdate, string> = {
  background: 'Updates itself',
  store: 'Updates via app store',
  os: 'Updates with the system',
  manual: 'Manual updates',
  unknown: 'Not verified',
};
export const HTTPS_LABEL = { default: 'On by default', optional: 'Optional', no: 'None', unknown: 'Not verified' } as const;
export const SAFE_LABEL = { google: 'Google Safe Browsing', apple: 'Apple fraud warnings', microsoft: 'Microsoft SmartScreen', own: 'Own service', other: 'Other service', none: 'None', unknown: 'Not verified' } as const;
export const VETTING_LABEL = { reviewed: 'Reviewed store', open: 'Open store', sideload: 'Sideloaded only', none: 'No extensions' } as const;
export const BOUNTY_LABEL = { own: 'Own program', upstream: 'Engine program only', none: 'None', unknown: 'Not verified' } as const;

/** Short per-tier help for the patch tiers. */
export const LAG_HELP = {
  upstream: 'Owns the engine: its security fixes arrive here first.',
  days: 'Usually within about two weeks of the engine’s fix.',
  weeks: 'Typically two to eight weeks behind.',
  months: 'More than two months behind the engine’s fixes.',
  own: 'Maintains its own engine, so speed depends on a small team.',
  stalled: 'No longer maintained, or no recent security releases.',
  unknown: 'We could not verify how fast fixes arrive.',
} as const;

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];
/** Lower bound of each grade, tuned on the real distribution (see About › How we grade security). */
export const GRADE_MIN: Record<Grade, number> = { A: 8, B: 7, C: 6, D: 5, E: 4, F: 0 };
export function gradeOf(score: number): Grade {
  return GRADES.find((g) => score >= GRADE_MIN[g]) ?? 'F';
}

export type Evidence = 'documented' | 'editorial' | 'estimated' | 'derived';

export interface LayerInput {
  label: string;
  /** Human value, e.g. "Strong" or "9.5". */
  value: string;
  /** False when the fact is not verified; such inputs are shown but not scored. */
  known: boolean;
  evidence: Evidence;
  note?: string;
}

export interface LayerResult {
  id: LayerId;
  score: number;
  inputs: LayerInput[];
}

export interface Chip {
  text: string;
}

export interface SecurityResult {
  layers: Record<LayerId, LayerResult>;
  score: number;
  grade: Grade;
  /** False when a research/security override backs these facts. */
  estimated: boolean;
  /** Structured details we could verify, out of the total checked. */
  known: number;
  total: number;
  weak: Chip[];
  strong: Chip[];
}

const mean = (xs: { v: number; w: number }[]) => {
  const w = xs.reduce((a, x) => a + x.w, 0);
  return w ? xs.reduce((a, x) => a + x.v * x.w, 0) / w : null;
};
const clamp = (n: number) => Math.max(0, Math.min(10, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

const SANDBOX_PTS = { strong: 10, basic: 5, none: 0 } as const;
const ISOLATION_PTS = { full: 10, partial: 5.5, none: 1 } as const;
const LAG_PTS = { upstream: 10, days: 8.5, weeks: 6, months: 2.5, own: 5, stalled: 0.5 } as const;
const UPDATE_PTS = { background: 10, store: 9, os: 6, manual: 2 } as const;
const HTTPS_PTS = { default: 10, optional: 6, no: 0 } as const;
const VETTING_PTS = { reviewed: 8, open: 4, sideload: 3, none: 8 } as const;
const BOUNTY_PTS = { own: 10, upstream: 6, none: 2 } as const;

const cat = (b: BrowserIndex, id: CategoryId, os?: OsId | null) => scoresFor(b, os)[CATEGORY_INDEX[id]] ?? 0;
const num = (v: number) => v.toFixed(1);

/** Update mechanism for one OS, or the typical value across the browser's platforms. */
export function updateFor(b: BrowserIndex, os?: OsId | null): AutoUpdate {
  const u = b.security.autoUpdate;
  if (os) return u[os] ?? 'unknown';
  const known = Object.values(u).filter((v) => v !== 'unknown');
  if (!known.length) return 'unknown';
  // Weakest known channel decides: one manual platform is worth flagging.
  return known.includes('manual') ? 'manual' : known.includes('os') ? 'os' : known.includes('store') ? 'store' : 'background';
}

const cache = new Map<string, SecurityResult>();

export function securityFor(b: BrowserIndex, os?: OsId | null): SecurityResult {
  const key = `${b.id}:${os ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = b.security;
  const est = !s.researched;
  const ev = (documented: boolean): Evidence => (s.researched && documented ? 'documented' : 'estimated');
  let known = 0;
  let total = 0;
  const count = (isKnown: boolean) => {
    total++;
    if (isKnown) known++;
  };

  /* --- isolation --- */
  const hardening = cat(b, 'securityHardening', os);
  const sb = s.sandbox !== 'unknown' ? SANDBOX_PTS[s.sandbox] : null;
  const iso = s.siteIsolation !== 'unknown' ? ISOLATION_PTS[s.siteIsolation] : null;
  count(sb !== null);
  count(iso !== null);
  const isoStruct = mean([...(sb !== null ? [{ v: sb, w: 1 }] : []), ...(iso !== null ? [{ v: iso, w: 1 }] : [])]);
  const isolation: LayerResult = {
    id: 'isolation',
    score: clamp(isoStruct !== null ? 0.6 * isoStruct + 0.4 * hardening : hardening),
    inputs: [
      { label: 'Sandbox', value: SANDBOX_LABEL[s.sandbox], known: sb !== null, evidence: ev(true) },
      { label: 'Site isolation', value: ISOLATION_LABEL[s.siteIsolation], known: iso !== null, evidence: ev(true) },
      { label: 'Hardening score', value: num(hardening), known: true, evidence: 'editorial', note: 'Part of the 40-category ratings' },
    ],
  };

  /* --- patching --- */
  const patchSpeed = cat(b, 'patchSpeed', os);
  const lag = s.patchLag !== 'unknown' ? LAG_PTS[s.patchLag] : null;
  const upd = updateFor(b, os);
  const updPts = upd !== 'unknown' ? UPDATE_PTS[upd] : null;
  count(lag !== null);
  count(updPts !== null);
  const patchStruct = mean([...(lag !== null ? [{ v: lag, w: 0.6 }] : []), ...(updPts !== null ? [{ v: updPts, w: 0.4 }] : [])]);
  const patching: LayerResult = {
    id: 'patching',
    score: clamp(patchStruct !== null ? 0.5 * patchStruct + 0.5 * patchSpeed : patchSpeed),
    inputs: [
      { label: 'Fix delivery', value: LAG_LABEL[s.patchLag], known: lag !== null, evidence: s.researched ? 'documented' : 'derived', note: s.lagNote },
      { label: os ? 'Updates on this OS' : 'Updates', value: UPDATE_LABEL[upd], known: updPts !== null, evidence: ev(true), note: 'Worked out from how it is installed unless we verified it' },
      { label: 'Patch-speed score', value: num(patchSpeed), known: true, evidence: 'editorial', note: 'Part of the 40-category ratings' },
    ],
  };

  /* --- web protections --- */
  const httpsFeature = feature(b, 'httpsOnly');
  const doh = feature(b, 'doh');
  const priv = feature(b, 'privateHardening');
  const httpsPts = s.httpsFirst !== 'unknown' ? (s.researched ? HTTPS_PTS[s.httpsFirst] : httpsFeature.rating) : null;
  const safePts = s.safeBrowsing === 'unknown' ? null : s.safeBrowsing === 'none' ? 0 : 10;
  const hardPts = s.hardenedMode === undefined ? null : s.hardenedMode === null ? 3 : 10;
  count(httpsPts !== null);
  count(safePts !== null);
  count(hardPts !== null);
  const webScore = mean([
    ...(httpsPts !== null ? [{ v: httpsPts, w: 0.35 }] : []),
    { v: doh.rating, w: 0.15 },
    { v: priv.rating, w: 0.15 },
    ...(safePts !== null ? [{ v: safePts, w: 0.2 }] : []),
    ...(hardPts !== null ? [{ v: hardPts, w: 0.15 }] : []),
  ]);
  const web: LayerResult = {
    id: 'web',
    score: clamp(webScore ?? 0),
    inputs: [
      { label: 'HTTPS-only mode', value: HTTPS_LABEL[s.httpsFirst], known: httpsPts !== null, evidence: ev(true), note: httpsFeature.support === 'no' ? undefined : `Feature rating ${num(httpsFeature.rating)}` },
      { label: 'Encrypted DNS', value: doh.support === 'no' ? 'No' : `Rated ${num(doh.rating)}`, known: true, evidence: 'editorial' },
      { label: 'Hardened private mode', value: priv.support === 'no' ? 'No' : `Rated ${num(priv.rating)}`, known: true, evidence: 'editorial' },
      { label: 'Bad-site warnings', value: SAFE_LABEL[s.safeBrowsing], known: safePts !== null, evidence: ev(true) },
      { label: 'Hardened mode', value: s.hardenedMode === undefined ? 'Not verified' : s.hardenedMode ?? 'None found', known: hardPts !== null, evidence: ev(true) },
    ],
  };

  /* --- accounts & credentials --- */
  const pm = b.keyFacts.passwordManager;
  const sync = b.keyFacts.sync;
  // A browser with no built-in credential store has nothing to leak and nothing to rate:
  // those parts are left out (neutral), not scored as zero.
  const hasPm = pm.level !== 'none';
  const accountParts = [
    ...(hasPm ? [{ v: pm.level === 'full' ? 9 : 5.5, w: 0.45 }] : []),
    ...(hasPm || pm.passkeys ? [{ v: pm.passkeys ? 10 : 0, w: 0.25 }] : []),
    ...(hasPm ? [{ v: pm.breachCheck ? 10 : 0, w: 0.1 }] : []),
    ...(sync.type === 'e2ee' || sync.type === 'self-hostable' ? [{ v: 10, w: 0.2 }] : sync.type === 'account' ? [{ v: 3, w: 0.2 }] : []),
  ];
  const accounts: LayerResult = {
    id: 'accounts',
    score: clamp(mean(accountParts) ?? 5),
    inputs: [
      { label: 'Password manager', value: pm.level === 'full' ? 'Full' : pm.level === 'basic' ? 'Basic' : 'None built in', known: true, evidence: 'documented', note: hasPm ? undefined : 'Left out of the score, not counted against it' },
      { label: 'Passkeys', value: pm.passkeys ? 'Yes' : 'No', known: true, evidence: 'documented' },
      { label: 'Breach alerts', value: pm.breachCheck ? 'Yes' : 'No', known: true, evidence: 'documented' },
      { label: 'Sync encryption', value: sync.type === 'e2ee' ? 'End-to-end' : sync.type === 'self-hostable' ? 'Self-hosted' : sync.type === 'account' ? 'Provider can read' : 'No sync', known: true, evidence: 'documented' },
    ],
  };

  /* --- extension & content risk --- */
  const blocking = cat(b, 'blocking', os);
  const extensions: LayerResult = {
    id: 'extensions',
    score: clamp(0.5 * VETTING_PTS[s.extVetting] + 0.5 * blocking),
    inputs: [
      { label: 'Extension source', value: VETTING_LABEL[s.extVetting], known: true, evidence: ev(true), note: 'Worked out from the stores it supports unless we verified it' },
      { label: 'Ad and tracker blocking', value: num(blocking), known: true, evidence: 'editorial', note: 'Part of the 40-category ratings' },
    ],
  };

  /* --- transparency & response --- */
  const openSource = cat(b, 'openSource', os);
  const bounty = s.bugBounty !== 'unknown' ? BOUNTY_PTS[s.bugBounty] : null;
  const disc = s.disclosure === undefined ? null : s.disclosure ? 8 : 2;
  const adv = s.advisoryUrl ? 10 : null;
  count(bounty !== null);
  count(disc !== null);
  count(adv !== null);
  const transparency: LayerResult = {
    id: 'transparency',
    score: clamp(
      mean([
        { v: openSource, w: 0.4 },
        ...(bounty !== null ? [{ v: bounty, w: 0.3 }] : []),
        ...(disc !== null ? [{ v: disc, w: 0.15 }] : []),
        ...(adv !== null ? [{ v: adv, w: 0.15 }] : []),
      ]) ?? openSource,
    ),
    inputs: [
      { label: 'Bug-bounty program', value: BOUNTY_LABEL[s.bugBounty], known: bounty !== null, evidence: ev(true) },
      { label: 'Published security policy', value: s.disclosure === undefined ? 'Not verified' : s.disclosure ? 'Yes' : 'No', known: disc !== null, evidence: ev(true) },
      { label: 'Security advisories page', value: s.advisoryUrl ? 'Yes' : 'Not verified', known: adv !== null, evidence: ev(true) },
      { label: 'Open-source score', value: num(openSource), known: true, evidence: 'editorial', note: 'Part of the 40-category ratings' },
    ],
  };

  /* --- AI-agent exposure --- */
  const ai = b.keyFacts.ai;
  const aiPts =
    ai.level === 'none' ? 10 : ai.level === 'opt-in' ? (ai.killSwitch ? 8 : 6.5) : ai.level === 'on-by-default' ? (ai.killSwitch ? 5.5 : 4) : ai.killSwitch ? 4.5 : 2.5;
  const aiLayer: LayerResult = {
    id: 'ai',
    score: aiPts,
    inputs: [
      { label: 'AI features', value: ai.level === 'none' ? 'None' : ai.level === 'opt-in' ? 'Opt-in' : ai.level === 'on-by-default' ? 'On by default' : 'Acts for you (agent)', known: true, evidence: 'documented' },
      { label: 'Off switch', value: ai.level === 'none' ? 'Not needed' : ai.killSwitch ? 'Yes' : 'No', known: true, evidence: 'documented' },
    ],
  };

  const layers = { isolation, patching, web, accounts, extensions, transparency, ai: aiLayer } as Record<LayerId, LayerResult>;
  for (const l of LAYERS) layers[l.id].score = round1(layers[l.id].score);
  const score = round1(LAYERS.reduce((a, l) => a + layers[l.id].score * l.weight, 0) / LAYERS.reduce((a, l) => a + l.weight, 0));

  /* --- chips --- */
  const weak: Chip[] = [];
  const strong: Chip[] = [];
  if (b.status === 'discontinued') weak.push({ text: 'No longer maintained' });
  if (s.sandbox === 'none') weak.push({ text: 'No process sandbox' });
  else if (s.sandbox === 'basic') weak.push({ text: 'Partial sandbox' });
  if (s.siteIsolation === 'none') weak.push({ text: 'No site isolation' });
  if (b.status !== 'discontinued') {
    if (s.patchLag === 'months') weak.push({ text: 'Months behind engine fixes' });
    if (s.patchLag === 'stalled') weak.push({ text: 'No recent security releases' });
  }
  if (upd === 'manual' && b.status !== 'discontinued') weak.push({ text: os ? 'Updates are manual on this OS' : 'Updates are manual on some platforms' });
  if (s.httpsFirst === 'no') weak.push({ text: 'No HTTPS-only mode' });
  if (ai.level === 'agentic' && !ai.killSwitch) weak.push({ text: 'AI agent with no off switch' });
  if (s.extVetting === 'sideload') weak.push({ text: 'Extensions come from outside a reviewed store' });

  if (s.sandbox === 'strong' && s.siteIsolation === 'full') strong.push({ text: 'Strong sandbox and site isolation' });
  if ((s.patchLag === 'upstream' || s.patchLag === 'days') && (upd === 'background' || upd === 'store')) strong.push({ text: 'Fast, automatic security fixes' });
  if (s.hardenedMode) strong.push({ text: s.hardenedMode });
  if (pm.passkeys && (sync.type === 'e2ee' || sync.type === 'self-hostable')) strong.push({ text: 'Passkeys and encrypted sync' });
  if (s.bugBounty === 'own' && s.researched) strong.push({ text: 'Runs its own bug-bounty program' });

  const result: SecurityResult = { layers, score, grade: gradeOf(score), estimated: est, known, total, weak, strong };
  cache.set(key, result);
  return result;
}

export const securityScore = (b: BrowserIndex, os?: OsId | null) => securityFor(b, os).score;
export const securityGrade = (b: BrowserIndex, os?: OsId | null) => securityFor(b, os).grade;

/** Colour tone for a grade, shared with the Privacy grade. */
export const GRADE_TONE: Record<Grade, 'positive' | 'neutral' | 'warning' | 'negative'> = { A: 'positive', B: 'positive', C: 'neutral', D: 'warning', E: 'negative', F: 'negative' };

/** The three scores the privacy guide shows next to each browser's grade, for one platform (or all). */
export function privacyScores(b: BrowserIndex, os?: OsId | null) {
  const s = scoresFor(b, os);
  return { defaults: s[CATEGORY_INDEX.privacyDefaults], fingerprint: s[CATEGORY_INDEX.fingerprinting], telemetry: s[CATEGORY_INDEX.telemetry] };
}

/** Browsers in the privacy guide's order: best grade first, then the sum of defaults, fingerprint and telemetry scores. */
export function privacyOrder(list: BrowserIndex[], os?: OsId | null) {
  return list
    .map((b) => ({ b, ...privacyScores(b, os) }))
    .sort((a, z) => a.b.keyFacts.privacyGrade.localeCompare(z.b.keyFacts.privacyGrade) || z.defaults + z.fingerprint + z.telemetry - (a.defaults + a.fingerprint + a.telemetry) || a.b.name.localeCompare(z.b.name));
}

/** Heat step 0–6 for a 0–10 score (maps to the --heat-* tokens). */
export const heatStep = (v: number) => Math.min(6, Math.max(0, Math.floor(v / 1.45)));

/** Browsers whose reported major version is the engine's own major, so a gap to the latest stable is meaningful. */
const GAP_ENGINE: Record<string, 'chromium' | 'firefox'> = { chrome: 'chromium', chromium: 'chromium', brave: 'chromium', edge: 'chromium', firefox: 'firefox' };

/** How many releases the visitor's reported version is behind the latest stable, or null when we can't tell. */
export function versionsBehind(browserId: string | null, major: number): { behind: number; latest: number; engine: 'Chromium' | 'Firefox' } | null {
  const eng = browserId ? GAP_ENGINE[browserId] : undefined;
  if (!eng || !Number.isFinite(major) || major <= 0) return null;
  const latest = engines[eng].major;
  return { behind: Math.max(0, latest - major), latest, engine: eng === 'chromium' ? 'Chromium' : 'Firefox' };
}
