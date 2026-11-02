import type { BrowserIndex, CategoryId, OsId } from '../lib/types';
import { CATEGORY_INDEX, FEATURE_INDEX } from './taxonomy';

export interface QuizCtx {
  /** additive weight per category (on top of a small base) */
  w: Partial<Record<CategoryId, number>>;
  /** feature ids that must be supported (yes or partial) */
  must: string[];
  /** hard filters with a human label (for conflict messages) */
  filters: { label: string; test: (b: BrowserIndex) => boolean }[];
  /** devices the visitor uses */
  oses: OsId[];
  /** feature ids that count in a browser's favour when supported, but are not required (set by the engine) */
  soft?: string[];
}

export type QType =
  | 'single'
  | 'multi'
  | 'slider'
  | 'rank'
  | 'thisorthat'
  | 'tradeoff'
  | 'ui'
  | 'os'
  | 'scenario'
  | 'tolerance'
  | 'yesno'
  | 'extensions'
  | 'budget'
  | 'triage'
  | 'number'
  | 'browser'
  | 'trivia'
  | 'truefalse'
  | 'order';

/** One row of a triage question: the visitor rates it Must have, Nice to have or Don't mind. */
export interface TriageItem {
  id: string;
  label: string;
  sub?: string;
  /** feature id: Must makes it a hard requirement, Nice a soft one */
  feature?: string;
  /** categories this row weights up */
  cats?: CategoryId[];
  /** weight for Nice to have; Must counts 1.5 times as much */
  weight?: number;
}

/** A number question: presets for quick taps plus a stepper. */
export interface NumberSpec {
  unit: string;
  min: number;
  max: number;
  step: number;
  presets: number[];
  /** a hint about this device, shown only when the browser can say */
  hint?: () => string | null;
}

/** Something that bugs the visitor about their current browser. */
export interface Gripe {
  id: string;
  label: string;
  cats: CategoryId[];
}

export type TriageLevel = 'must' | 'nice' | 'no';
export interface BrowserAnswer {
  id: string | null;
  gripes: string[];
  /** leave the current browser out of the results */
  different?: boolean;
}

export interface QOption {
  id: string;
  label: string;
  sub?: string;
  apply?: (c: QuizCtx) => void;
  /** trivia: is this the right answer */
  correct?: boolean;
}

export interface QItem {
  id: string;
  label: string;
  cats: CategoryId[];
}

export interface Question {
  id: string;
  type: QType;
  title: string;
  help?: string;
  /** why we ask (shown on request) */
  why?: string;
  options?: QOption[];
  items?: QItem[];
  triage?: TriageItem[];
  number?: NumberSpec;
  gripes?: Gripe[];
  /** slider/tolerance: labels for 0..4 */
  scale?: string[];
  /** slider/tolerance: categories this weights */
  cats?: CategoryId[];
  /** tradeoff pad axes: [x-low, x-high, y-low, y-high] */
  axes?: [string, string, string, string];
  when?: (a: Answers) => boolean;
  /** custom apply for complex types */
  apply?: (value: unknown, c: QuizCtx) => void;
  /** trivia explanation */
  explain?: string;
  /** "must have" toggle allowed on this question */
  mustable?: boolean;
  /** sample answers the adaptive picker tries; derived from type and options when omitted */
  probes?: unknown[];
}

export type Answers = Record<string, unknown>;

const add = (c: QuizCtx, cats: CategoryId[], v: number) => {
  for (const k of cats) c.w[k] = (c.w[k] ?? 0) + v;
};
const feat = (b: BrowserIndex, idx: number) => b.features[idx]?.[0] ?? 0;

/** Reads a triage answer. An older answer saved as a plain list of picked ids counts as "Nice to have". */
export function triageLevels(v: unknown): Record<string, TriageLevel> {
  if (Array.isArray(v)) return Object.fromEntries((v as string[]).map((id) => [id, 'nice' as TriageLevel]));
  return v && typeof v === 'object' ? (v as Record<string, TriageLevel>) : {};
}

const applyTriage = (items: TriageItem[]) => (v: unknown, c: QuizCtx) => {
  const levels = triageLevels(v);
  for (const it of items) {
    const level = levels[it.id];
    if (!level || level === 'no') continue;
    if (it.cats) add(c, it.cats, (it.weight ?? 1) * (level === 'must' ? 1.5 : 1));
    if (it.feature) {
      if (level === 'must') c.must.push(it.feature);
      else (c.soft ??= []).push(it.feature);
    }
  }
};

const PRODUCTIVITY_ITEMS: TriageItem[] = [
  { id: 'split', label: 'Split view', sub: 'Two pages side by side', feature: 'splitView', cats: ['productivity', 'tabManagement'], weight: 0.8 },
  { id: 'notes', label: 'Notes', feature: 'notes', cats: ['productivity'], weight: 0.8 },
  { id: 'reader', label: 'Reader mode', feature: 'readerMode', cats: ['productivity'], weight: 0.4 },
  { id: 'translate', label: 'Page translation', feature: 'translation', cats: ['translation'], weight: 1.5 },
  { id: 'vpn', label: 'Built-in VPN', feature: 'builtinVpn', cats: ['extras'], weight: 1 },
  { id: 'mail', label: 'Mail, calendar or RSS', feature: 'mailCalendarRss', cats: ['extras', 'productivity'], weight: 1 },
  { id: 'panels', label: 'Sidebar web panels', feature: 'webPanels', cats: ['productivity'], weight: 0.8 },
];

/* ------------------------------------------------------------------ */
/* Question bank                                                       */
/* ------------------------------------------------------------------ */

export const Q: Record<string, Question> = {
  devices: {
    id: 'devices',
    type: 'os',
    title: 'Which devices will you use it on?',
    help: 'Pick all that apply. We’ll suggest a pick for each device too.',
    why: 'A browser has to exist on your platforms, and some are very different on each one.',
    apply: (v, c) => {
      const oses = (v as OsId[]) ?? [];
      c.oses = oses;
      if (oses.length) c.filters.push({ label: 'available on at least one of your devices', test: (b) => oses.some((o) => b.platforms[o] && b.platforms[o]!.status !== 'discontinued') });
      if (oses.length > 1) add(c, ['sync', 'mobileApps'], 1.5);
    },
  },
  priorities: {
    id: 'priorities',
    type: 'rank',
    title: 'Put these in order of importance',
    help: 'Drag, or use the arrow buttons. Top matters most.',
    why: 'Ranking forces trade-offs, which separates browsers better than rating everything “important”.',
    items: [
      { id: 'privacy', label: 'Privacy & blocking', cats: ['privacyDefaults', 'blocking', 'fingerprinting', 'telemetry'] },
      { id: 'speed', label: 'Speed', cats: ['jsSpeed', 'pageLoad', 'smoothness'] },
      { id: 'battery', label: 'Battery & memory', cats: ['battery', 'memory', 'cpu'] },
      { id: 'custom', label: 'Customization & tabs', cats: ['lookCustom', 'behaviourCustom', 'tabManagement'] },
      { id: 'ext', label: 'Extensions & features', cats: ['extensions', 'productivity'] },
      { id: 'easy', label: 'Simple & compatible', cats: ['beginnerFriendly', 'webCompat'] },
    ],
    apply: (v, c) => {
      const order = (v as string[]) ?? [];
      const items = Q.priorities.items!;
      order.forEach((id, i) => {
        const it = items.find((x) => x.id === id);
        if (it) add(c, it.cats, [4, 3, 2, 1.2, 0.6, 0.2][i] ?? 0);
      });
    },
  },
  blockVsCompat: {
    id: 'blockVsCompat',
    type: 'thisorthat',
    title: 'Which matters more?',
    help: 'Swipe, use the arrow keys, or tap a card.',
    options: [
      { id: 'block', label: 'Blocks everything out of the box', sub: 'Ads and trackers gone, even if a site occasionally breaks', apply: (c) => add(c, ['blocking', 'privacyDefaults'], 2.5) },
      { id: 'compat', label: 'Every site just works', sub: 'No fiddling, maximum compatibility', apply: (c) => add(c, ['webCompat', 'beginnerFriendly'], 2.5) },
    ],
  },
  powerVsSimple: {
    id: 'powerVsSimple',
    type: 'thisorthat',
    title: 'Which sounds more like you?',
    options: [
      { id: 'power', label: 'Give me every setting', sub: 'I like tuning things exactly how I want', apply: (c) => add(c, ['advancedSettings', 'behaviourCustom', 'lookCustom'], 2) },
      { id: 'simple', label: 'Keep it clean and simple', sub: 'Sensible defaults, few decisions', apply: (c) => add(c, ['beginnerFriendly', 'startup'], 2) },
    ],
  },
  tabStyle: {
    id: 'tabStyle',
    type: 'ui',
    title: 'Which layout would you enjoy using every day?',
    mustable: true,
    options: [
      { id: 'classic', label: 'Classic tabs on top', apply: (c) => add(c, ['beginnerFriendly'], 1) },
      { id: 'vertical', label: 'Vertical tabs in a sidebar', apply: (c) => { add(c, ['tabManagement'], 2); c.must.push('verticalTabs'); } },
      { id: 'spaces', label: 'Workspaces & split view', apply: (c) => { add(c, ['tabManagement', 'productivity'], 2.5); c.must.push('workspaces'); } },
      { id: 'minimal', label: 'Minimal, almost no UI', apply: (c) => add(c, ['lookCustom', 'memory'], 1.5) },
    ],
  },
  tradeoff: {
    id: 'tradeoff',
    type: 'tradeoff',
    title: 'Place yourself on the map',
    help: 'Drag the dot, or use the arrow keys.',
    axes: ['Convenience', 'Privacy', 'Simplicity', 'Power'],
    apply: (v, c) => {
      const [x, y] = (v as [number, number]) ?? [0.5, 0.5];
      add(c, ['privacyDefaults', 'blocking', 'fingerprinting', 'telemetry'], x * 3);
      add(c, ['beginnerFriendly', 'sync', 'passwords'], (1 - x) * 3);
      add(c, ['advancedSettings', 'behaviourCustom', 'tabManagement', 'extensions'], y * 3);
      add(c, ['beginnerFriendly', 'startup'], (1 - y) * 2);
    },
  },
  aiTolerance: {
    id: 'aiTolerance',
    type: 'tolerance',
    title: 'How do you feel about AI in your browser?',
    scale: ['No AI, please', 'Only if I can switch it off', 'Neutral', 'Helpful assistant', 'Agents that act for me'],
    apply: (v, c) => {
      const n = Number(v ?? 2);
      if (n === 0) {
        c.w.ai = 0;
        c.filters.push({ label: 'no AI, or a single AI off switch', test: (b) => b.keyFacts.ai.level === 'none' || b.keyFacts.ai.killSwitch });
        add(c, ['telemetry'], 0.5);
      } else if (n === 1) c.filters.push({ label: 'an AI off switch', test: (b) => b.keyFacts.ai.level === 'none' || b.keyFacts.ai.killSwitch });
      else if (n >= 3) add(c, ['ai'], n === 4 ? 5 : 2.5);
    },
  },
  extensions: {
    id: 'extensions',
    type: 'extensions',
    title: 'Which extensions can’t you live without?',
    help: 'Pick any. Choose none if you don’t use extensions.',
    mustable: true,
    options: [
      { id: 'ubo', label: 'uBlock Origin (full)', sub: 'Needs Manifest V2', apply: (c) => { c.must.push('uboFull'); add(c, ['extensions', 'blocking'], 1.5); } },
      { id: 'pw', label: 'Password manager', sub: 'Bitwarden, 1Password…', apply: (c) => add(c, ['extensions'], 1.5) },
      { id: 'dark', label: 'Dark Reader', apply: (c) => add(c, ['extensions'], 0.8) },
      { id: 'scripts', label: 'Userscripts', sub: 'Tampermonkey, Violentmonkey', apply: (c) => { add(c, ['extensions'], 1); c.must.push('userscripts'); } },
      { id: 'mobile', label: 'Extensions on my phone too', apply: (c) => { c.must.push('mobileExtensions'); add(c, ['mobileApps'], 1); } },
      { id: 'none', label: 'I don’t use extensions', apply: (c) => add(c, ['memory', 'beginnerFriendly'], 0.5) },
    ],
  },
  syncPhone: {
    id: 'syncPhone',
    type: 'yesno',
    title: 'Do you want your tabs, bookmarks and passwords on every device?',
    mustable: true,
    options: [
      { id: 'yes', label: 'Yes', apply: (c) => { add(c, ['sync', 'passwords', 'mobileApps'], 2.5); c.filters.push({ label: 'built-in sync', test: (b) => !['none', 'local-only'].includes(b.keyFacts.sync.type) }); } },
      { id: 'no', label: 'No', apply: (c) => add(c, ['privacyDefaults'], 0.5) },
      { id: 'unsure', label: 'Not sure' },
    ],
  },
  tabsScenario: {
    id: 'tabsScenario',
    type: 'scenario',
    title: 'It’s 4pm. How many tabs are open?',
    options: [
      { id: 'few', label: 'Fewer than 10', sub: 'I close them as I go', apply: (c) => add(c, ['startup', 'beginnerFriendly'], 1) },
      { id: 'many', label: '20 to 50', sub: 'Organised chaos', apply: (c) => add(c, ['tabManagement', 'memory'], 2) },
      { id: 'tons', label: 'I stopped counting at 100', sub: 'And my laptop fan knows it', apply: (c) => add(c, ['tabManagement', 'memory', 'resourceControls'], 3) },
    ],
  },
  budget: {
    id: 'budget',
    type: 'budget',
    title: 'Split 100 points between these',
    help: 'Use the + and − buttons or the sliders. Points must add up to 100.',
    items: [
      { id: 'speed', label: 'Speed', cats: ['jsSpeed', 'pageLoad', 'networkSpeed'] },
      { id: 'privacy', label: 'Privacy', cats: ['privacyDefaults', 'blocking', 'fingerprinting'] },
      { id: 'battery', label: 'Battery', cats: ['battery', 'memory'] },
      { id: 'features', label: 'Built-in features', cats: ['productivity', 'extras', 'translation'] },
      { id: 'custom', label: 'Customization', cats: ['lookCustom', 'behaviourCustom'] },
    ],
    apply: (v, c) => {
      const pts = (v as Record<string, number>) ?? {};
      for (const it of Q.budget.items!) add(c, it.cats, ((pts[it.id] ?? 20) / 100) * 6);
    },
  },
  openSource: {
    id: 'openSource',
    type: 'slider',
    title: 'How much does open-source code matter to you?',
    scale: ['Not at all', 'A little', 'Somewhat', 'A lot', 'Essential'],
    cats: ['openSource'],
    mustable: true,
    apply: (v, c) => {
      const n = Number(v ?? 2);
      add(c, ['openSource'], n * 1.2);
      if (n === 4) c.filters.push({ label: 'open source', test: (b) => b.openSource === true });
    },
  },
  maker: {
    id: 'maker',
    type: 'single',
    title: 'Does it matter who makes it?',
    options: [
      { id: 'any', label: 'Not really', sub: 'Big tech is fine if it works', apply: (c) => add(c, ['webCompat', 'longevity'], 1) },
      { id: 'indie', label: 'I prefer independent makers', sub: 'Not owned by an ad or tech giant', apply: (c) => add(c, ['businessTrust', 'openSource'], 2.5) },
      { id: 'community', label: 'Community or non-profit only', sub: 'Open source, no commercial agenda', apply: (c) => { add(c, ['businessTrust', 'openSource', 'telemetry'], 3); c.filters.push({ label: 'open source', test: (b) => b.openSource === true }); } },
    ],
  },
  streaming: {
    id: 'streaming',
    type: 'yesno',
    title: 'Do you watch Netflix, Disney+ or other protected streams in the browser?',
    options: [
      { id: 'yes', label: 'Yes', apply: (c) => { add(c, ['media'], 3); c.must.push('widevine'); } },
      { id: 'no', label: 'No' },
    ],
  },
  gaming: {
    id: 'gaming',
    type: 'slider',
    title: 'How much do you play games or use 3D/graphics apps in the browser?',
    scale: ['Never', 'Rarely', 'Sometimes', 'Often', 'All the time'],
    cats: ['graphics', 'smoothness'],
    apply: (v, c) => add(c, ['graphics', 'smoothness'], Number(v ?? 0) * 0.9),
  },
  developer: {
    id: 'developer',
    type: 'yesno',
    title: 'Are you a web developer?',
    options: [
      { id: 'yes', label: 'Yes', apply: (c) => add(c, ['devTools', 'webCompat', 'jsSpeed'], 2.5) },
      { id: 'no', label: 'No' },
    ],
  },
  engine: {
    id: 'engine',
    type: 'single',
    title: 'Chromium or not?',
    help: 'Most browsers run on Google’s Chromium. Some people prefer an independent engine.',
    why: 'Engine choice affects extension compatibility, Manifest V2 support and web diversity.',
    mustable: true,
    options: [
      { id: 'any', label: 'I don’t mind' },
      { id: 'chromium', label: 'Chromium, for maximum compatibility', apply: (c) => { add(c, ['webCompat'], 1.5); c.filters.push({ label: 'a Chromium (Blink) engine', test: (b) => b.engine === 'blink' }); } },
      { id: 'not', label: 'Anything but Chromium', apply: (c) => { add(c, ['openSource'], 0.5); c.filters.push({ label: 'a non-Chromium engine', test: (b) => b.engine !== 'blink' }); } },
    ],
  },
  androidExt: {
    id: 'androidExt',
    type: 'yesno',
    title: 'On Android, do you want to install extensions?',
    help: 'Add-ons such as an ad blocker or a password manager.',
    when: (a) => ((a.devices as OsId[]) ?? []).includes('android'),
    mustable: true,
    options: [
      { id: 'yes', label: 'Yes', apply: (c) => { add(c, ['extensions', 'mobileApps'], 2); c.filters.push({ label: 'extensions on Android', test: (b) => !['none', 'n/a'].includes(b.keyFacts.mobileExtensions.android) }); } },
      { id: 'no', label: 'No' },
    ],
  },
  googlePlay: {
    id: 'googlePlay',
    type: 'yesno',
    title: 'Must it be on Google Play?',
    help: 'Some excellent Android browsers are only on F-Droid or GitHub.',
    when: (a) => ((a.devices as OsId[]) ?? []).includes('android'),
    options: [
      { id: 'yes', label: 'Yes, Google Play only', apply: (c) => c.filters.push({ label: 'available on Google Play', test: (b) => !b.platforms.android || !!b.platforms.android.stores.includes('google-play') }) },
      { id: 'no', label: 'F-Droid or GitHub is fine', apply: (c) => add(c, ['openSource'], 0.5) },
    ],
  },
  hardware: {
    id: 'hardware',
    type: 'scenario',
    title: 'What kind of computer or phone are you on?',
    options: [
      { id: 'new', label: 'Recent and fast', apply: (c) => add(c, ['graphics'], 0.5) },
      { id: 'laptop', label: 'A laptop I use on battery', apply: (c) => add(c, ['battery', 'cpu'], 2.5) },
      { id: 'old', label: 'Old or low-end', sub: '4 GB RAM or less, or 8+ years old', apply: (c) => add(c, ['lowEnd', 'memory', 'cpu', 'installSize'], 3) },
    ],
  },
  comfort: {
    id: 'comfort',
    type: 'single',
    title: 'How comfortable are you with settings?',
    options: [
      { id: 'none', label: 'I want it to just work', apply: (c) => add(c, ['beginnerFriendly', 'privacyDefaults'], 3) },
      { id: 'some', label: 'I’ll tweak a few things', apply: (c) => add(c, ['behaviourCustom'], 1) },
      { id: 'expert', label: 'I live in about:config', apply: (c) => add(c, ['advancedSettings', 'behaviourCustom'], 3) },
    ],
  },
  productivity: {
    id: 'productivity',
    type: 'triage',
    title: 'Which built-in tools matter to you?',
    help: 'Rate each one. Anything you leave as “Don’t mind” is ignored.',
    triage: PRODUCTIVITY_ITEMS,
    apply: applyTriage(PRODUCTIVITY_ITEMS),
  },
  ram: {
    id: 'ram',
    type: 'number',
    title: 'How much memory (RAM) does your computer have?',
    help: 'Pick the closest. If you’re not sure, choose “I don’t mind”.',
    why: 'Memory decides how many tabs you can keep open before a browser slows everything down.',
    number: {
      unit: 'GB',
      min: 1,
      max: 128,
      step: 1,
      presets: [2, 4, 8, 16, 32],
      hint: () => {
        const gb = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
        return gb ? `This device reports about ${gb} GB${gb >= 8 ? ' or more' : ''}. Browsers round this down on purpose.` : null;
      },
    },
    apply: (v, c) => {
      const gb = Number(v);
      if (!Number.isFinite(gb)) return;
      if (gb <= 4) add(c, ['lowEnd', 'memory', 'cpu', 'installSize'], 3);
      else if (gb <= 8) add(c, ['memory', 'resourceControls'], 1.2);
    },
  },
  current: {
    id: 'current',
    type: 'browser',
    title: 'Which browser do you use now?',
    help: 'Then tell us what bugs you about it. Both are optional.',
    why: 'Knowing what you’re leaving helps us avoid picking the same problems again.',
    gripes: [
      { id: 'slow', label: 'It feels slow', cats: ['jsSpeed', 'pageLoad', 'smoothness'] },
      { id: 'memory', label: 'It uses too much memory', cats: ['memory', 'cpu', 'battery'] },
      { id: 'privacy', label: 'I don’t trust its privacy', cats: ['privacyDefaults', 'telemetry', 'blocking'] },
      { id: 'extensions', label: 'My extensions stopped working', cats: ['extensions', 'blocking'] },
      { id: 'ai', label: 'Too much AI', cats: ['beginnerFriendly', 'telemetry'] },
    ],
    apply: (v, c) => {
      const a = v as BrowserAnswer | null;
      if (!a) return;
      for (const g of Q.current.gripes ?? []) if (a.gripes?.includes(g.id)) add(c, g.cats, 2);
      if (a.gripes?.includes('ai')) c.filters.push({ label: 'an AI off switch', test: (b) => b.keyFacts.ai.level === 'none' || b.keyFacts.ai.killSwitch });
      if (a.different && a.id) c.filters.push({ label: 'a different browser from your current one', test: (b) => b.id !== a.id });
    },
  },
  telemetryQ: {
    id: 'telemetryQ',
    type: 'single',
    title: 'Anonymous usage data sent to the maker is…',
    options: [
      { id: 'fine', label: 'Fine, it helps them improve' },
      { id: 'optout', label: 'OK if I can turn it off', apply: (c) => { add(c, ['telemetry'], 1); c.must.push('telemetryOptOut'); } },
      { id: 'never', label: 'Never acceptable', apply: (c) => add(c, ['telemetry', 'businessTrust'], 3.5) },
    ],
  },
  stability: {
    id: 'stability',
    type: 'yesno',
    title: 'Are you OK with beta or early-access browsers?',
    options: [
      { id: 'yes', label: 'Yes, I like new things' },
      { id: 'no', label: 'No, stable releases only', apply: (c) => { add(c, ['longevity'], 1.5); c.filters.push({ label: 'a stable release', test: (b) => b.status === 'active' || b.status === 'maintenance' }); } },
    ],
  },
  price: {
    id: 'price',
    type: 'yesno',
    title: 'Would you pay for a browser?',
    options: [
      { id: 'no', label: 'No, free only', apply: (c) => c.filters.push({ label: 'free to use', test: (b) => b.price !== 'paid' }) },
      { id: 'yes', label: 'Yes, if it’s worth it' },
    ],
  },
  passwordQ: {
    id: 'passwordQ',
    type: 'single',
    title: 'Where do you keep your passwords?',
    options: [
      { id: 'browser', label: 'In the browser', apply: (c) => { add(c, ['passwords'], 3); c.must.push('passwordManager'); } },
      { id: 'separate', label: 'A separate password manager', apply: (c) => add(c, ['extensions'], 1) },
      { id: 'memory', label: 'In my head (please don’t)', apply: (c) => add(c, ['passwords'], 1) },
    ],
  },
  helpers: {
    id: 'helpers',
    type: 'triage',
    title: 'What would help them most?',
    help: 'Rate each one. Leave the rest as “Don’t mind”.',
    triage: [
      { id: 'ads', label: 'Fewer ads and scam pop-ups', sub: 'A built-in ad blocker', feature: 'adBlocker', cats: ['blocking'], weight: 1.2 },
      { id: 'reader', label: 'Easier reading', sub: 'Reader mode strips the clutter', feature: 'readerMode', cats: ['accessibility'], weight: 1 },
      { id: 'translate', label: 'Pages in other languages', sub: 'Translate a whole page', feature: 'translation', cats: ['translation'], weight: 1.2 },
      { id: 'passwords', label: 'Remembering passwords for them', sub: 'A built-in password manager', feature: 'passwordManager', cats: ['passwords'], weight: 1.2 },
      { id: 'consent', label: 'Fewer cookie pop-ups', feature: 'cookieBanners', cats: ['blocking'], weight: 0.8 },
    ],
    apply: (v, c) => applyTriage(Q.helpers.triage!)(v, c),
  },
  managed: {
    id: 'managed',
    type: 'triage',
    title: 'What does IT or your school need?',
    help: 'Rate each one. If you’re not sure, leave it as “Don’t mind”.',
    triage: [
      { id: 'policies', label: 'Settings an admin can manage', sub: 'Central policies', feature: 'enterprisePolicies', cats: ['advancedSettings'], weight: 1 },
      { id: 'profiles', label: 'Separate work and personal profiles', feature: 'profiles', cats: ['sync'], weight: 1 },
      { id: 'sync', label: 'Bookmarks and history on every work device', feature: 'syncBookmarks', cats: ['sync'], weight: 1 },
      { id: 'passwords', label: 'A password manager', feature: 'passwordManager', cats: ['passwords'], weight: 1 },
      { id: 'webstore', label: 'Chrome Web Store extensions', feature: 'chromeWebStore', cats: ['extensions'], weight: 1 },
      { id: 'kiosk', label: 'Kiosk mode', sub: 'A locked full-screen browser', feature: 'kioskMode', weight: 1 },
    ],
    apply: (v, c) => applyTriage(Q.managed.triage!)(v, c),
  },
  iosNeeds: {
    id: 'iosNeeds',
    type: 'triage',
    title: 'What do you need on your iPhone or iPad?',
    help: 'Every iPhone browser runs on Apple’s WebKit engine, so the differences are in the features around it.',
    triage: [
      { id: 'blocking', label: 'Ad and tracker blocking', feature: 'adBlocker', cats: ['blocking'], weight: 1.5 },
      { id: 'extensions', label: 'Extensions on iPhone', feature: 'mobileExtensions', cats: ['extensions', 'mobileApps'], weight: 1.5 },
      { id: 'tabs', label: 'Open tabs from my computer', feature: 'syncTabs', cats: ['sync'], weight: 1.2 },
      { id: 'private', label: 'A hardened private mode', feature: 'privateHardening', cats: ['privacyDefaults'], weight: 1 },
      { id: 'passwords', label: 'A password manager', feature: 'passwordManager', cats: ['passwords'], weight: 1 },
      { id: 'translate', label: 'Page translation', feature: 'translation', cats: ['translation'], weight: 1 },
    ],
    apply: (v, c) => applyTriage(Q.iosNeeds.triage!)(v, c),
  },
  aiFeatures: {
    id: 'aiFeatures',
    type: 'triage',
    title: 'Which AI features would you use?',
    help: 'Rate each one. Anything you don’t want, leave as “Don’t mind”.',
    triage: [
      { id: 'assistant', label: 'An AI assistant', sub: 'Chat in a sidebar', feature: 'aiAssistant', cats: ['ai'], weight: 1.5 },
      { id: 'summary', label: 'Page summaries', feature: 'aiSummarizer', cats: ['ai'], weight: 1 },
      { id: 'agent', label: 'An agent that acts for me', sub: 'Clicks and types on pages', feature: 'agenticBrowsing', cats: ['ai'], weight: 1.2 },
      { id: 'local', label: 'AI that runs on my device', feature: 'localAi', cats: ['ai', 'telemetry'], weight: 1 },
      { id: 'off', label: 'A one-click AI off switch', feature: 'aiKillSwitch', weight: 1 },
    ],
    apply: (v, c) => applyTriage(Q.aiFeatures.triage!)(v, c),
  },
  /* Baselines: preset in a quiz so its theme counts without being asked. */
  baseFamily: {
    id: 'baseFamily',
    type: 'single',
    title: 'For family',
    apply: (_v, c) => add(c, ['beginnerFriendly', 'accessibility', 'securityHardening', 'blocking', 'passwords'], 2.5),
  },
  baseWork: {
    id: 'baseWork',
    type: 'single',
    title: 'For work',
    apply: (_v, c) => add(c, ['patchSpeed', 'securityHardening', 'longevity', 'advancedSettings'], 2.5),
  },
};

/* ------------------------------------------------------------------ */
/* Privacy profile questions (scored into a threat level)              */
/* ------------------------------------------------------------------ */

export const PRIVACY_Q: Question[] = [
  { id: 'pv-who', type: 'multi', title: 'Who do you want to keep your browsing from?', options: [
    { id: 'ads', label: 'Advertisers & data brokers' }, { id: 'isp', label: 'My internet provider or Wi-Fi owner' }, { id: 'employer', label: 'My employer or school' }, { id: 'gov', label: 'Governments or powerful adversaries' }, { id: 'people', label: 'People who share my device' } ] },
  { id: 'pv-accounts', type: 'single', title: 'How much do you stay logged in to Google, Meta or Microsoft?', options: [
    { id: 'always', label: 'Always, everywhere' }, { id: 'some', label: 'Some services' }, { id: 'rarely', label: 'Rarely or never' } ] },
  { id: 'pv-breakage', type: 'tolerance', title: 'How much site breakage will you put up with for privacy?', scale: ['None', 'A little', 'Some', 'Quite a lot', 'Whatever it takes'] },
  { id: 'pv-anon', type: 'yesno', title: 'Do you need to hide your IP address or location from sites?', options: [ { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' } ] },
  { id: 'pv-fp', type: 'thisorthat', title: 'Which worries you more?', options: [ { id: 'track', label: 'Being tracked across sites', sub: 'Ads following me around' }, { id: 'identify', label: 'Being identified at all', sub: 'Even without cookies' } ] },
  { id: 'pv-sync', type: 'yesno', title: 'Do you need cloud sync?', options: [ { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' } ] },
];

/* ------------------------------------------------------------------ */
/* Security check-up questions (scored into a risk level)              */
/* ------------------------------------------------------------------ */

export const SECURITY_Q: Question[] = [
  { id: 'sc-os', type: 'os', title: 'Which devices do you browse on?', help: 'Pick all that apply. We only suggest browsers that exist on at least one of them.' },
  { id: 'sc-updates', type: 'single', title: 'How do you handle browser updates?', options: [
    { id: 'auto', label: 'They install themselves' }, { id: 'prompt', label: 'I update when it asks me' }, { id: 'delay', label: 'I put them off for weeks' }, { id: 'unsure', label: 'I am not sure' } ] },
  { id: 'sc-ext', type: 'single', title: 'How many extensions do you have installed?', options: [
    { id: 'none', label: 'None' }, { id: 'few', label: 'One to five' }, { id: 'many', label: 'Six to fifteen' }, { id: 'lots', label: 'More than fifteen' } ] },
  { id: 'sc-accounts', type: 'multi', title: 'Which accounts do you sign in to in your browser?', help: 'High-value accounts raise the stakes if the browser is compromised.', options: [
    { id: 'bank', label: 'Banking or payments' }, { id: 'work', label: 'Work email or files' }, { id: 'crypto', label: 'Crypto wallets or exchanges' }, { id: 'social', label: 'Social media and shopping' } ] },
  { id: 'sc-wifi', type: 'single', title: 'How often do you use public Wi-Fi or a shared computer?', options: [
    { id: 'never', label: 'Never' }, { id: 'sometimes', label: 'Sometimes' }, { id: 'often', label: 'Often' } ] },
  { id: 'sc-downloads', type: 'single', title: 'How careful are you with downloads and links?', options: [
    { id: 'careful', label: 'Very careful' }, { id: 'mostly', label: 'Mostly careful' }, { id: 'fast', label: 'I click first' } ] },
  { id: 'sc-ai', type: 'single', title: 'Do you let an AI assistant or agent act in your browser?', options: [
    { id: 'no', label: 'No' }, { id: 'assist', label: 'An assistant that answers questions' }, { id: 'agent', label: 'An agent that clicks and types for me' } ] },
];


/* ------------------------------------------------------------------ */
/* Quizzes                                                             */
/* ------------------------------------------------------------------ */

export interface QuizDef {
  id: string;
  name: string;
  group: 'find' | 'narrow' | 'self';
  blurb: string;
  minutes: number;
  kind: 'match' | 'privacy' | 'security' | 'devices' | 'trivia' | 'guess';
  /** question ids, in default order */
  questions: string[];
  /** adaptive: choose next question by information gain, stop at this many */
  adaptiveLimit?: number;
  /** restrict candidates */
  pool?: (b: BrowserIndex) => boolean;
  poolLabel?: string;
  lengths?: { quick: number; standard: number; deep: number };
  /** answers assumed by this quiz (not asked) */
  preset?: Record<string, { value: unknown; preset: true }>;
  /** weights this quiz always carries, so its own theme counts even when the matching questions are skipped */
  focus?: Partial<Record<CategoryId, number>>;
  /** a line shown above the first question */
  intro?: string;
  /** custom quizzes: the code that rebuilds this quiz, so a shared result link works for someone who never saved it */
  shareCode?: string;
}

const FIREFOX_BASED = (b: BrowserIndex) => b.engine === 'gecko';
const CHROMIUM_BASED = (b: BrowserIndex) => b.engine === 'blink';
const live = (b: BrowserIndex) => b.status !== 'discontinued';
/** Everyday quizzes leave out text-mode browsers such as w3m, which are not a realistic pick for most visitors. */
const graphical = (b: BrowserIndex) => live(b) && b.engine !== 'text';
const cat = (b: BrowserIndex, id: CategoryId) => b.scores[CATEGORY_INDEX[id]] ?? 0;
const has = (b: BrowserIndex, fid: string) => [1, 2, 3].includes(b.features[FEATURE_INDEX[fid]]?.[0] ?? 0);
const onOs = (os: OsId) => (b: BrowserIndex) => !!b.platforms[os] && b.platforms[os]!.status !== 'discontinued';

export const QUIZZES: QuizDef[] = [
  {
    id: 'matchmaker',
    name: 'Browser Matchmaker',
    group: 'find',
    blurb: 'The full adaptive quiz. It picks the next question that best separates your top candidates.',
    minutes: 3,
    kind: 'match',
    pool: graphical,
    poolLabel: 'browsers',
    questions: ['devices', 'priorities', 'blockVsCompat', 'tabStyle', 'aiTolerance', 'extensions', 'syncPhone', 'tradeoff', 'tabsScenario', 'hardware', 'engine', 'androidExt', 'googlePlay', 'budget', 'openSource', 'maker', 'streaming', 'gaming', 'developer', 'comfort', 'productivity', 'telemetryQ', 'stability', 'price', 'passwordQ', 'powerVsSimple'],
    lengths: { quick: 6, standard: 14, deep: 26 },
  },
  { id: 'sixty', name: '60-second Pick', group: 'find', blurb: 'Six quick questions, one confident answer.', minutes: 1, kind: 'match', pool: graphical, poolLabel: 'browsers', questions: ['devices', 'blockVsCompat', 'aiTolerance', 'tabStyle', 'syncPhone', 'hardware'] },
  { id: 'devices', name: 'Multi-device Planner', group: 'find', blurb: 'The best setup across all your devices, with sync and passwords checked.', minutes: 2, kind: 'devices', pool: graphical, poolLabel: 'browsers', questions: ['devices', 'syncPhone', 'passwordQ', 'blockVsCompat', 'aiTolerance', 'androidExt', 'googlePlay'] },
  { id: 'firefox-fork', name: 'Which Firefox fork?', group: 'narrow', blurb: 'Firefox, LibreWolf, Zen, Floorp, Waterfox, Mullvad and more.', minutes: 2, kind: 'match', questions: ['devices', 'tabStyle', 'blockVsCompat', 'comfort', 'aiTolerance', 'syncPhone', 'stability', 'powerVsSimple'], pool: FIREFOX_BASED, poolLabel: 'Firefox-based browsers' },
  { id: 'chromium-fork', name: 'Which Chromium browser?', group: 'narrow', blurb: 'Chrome, Edge, Brave, Vivaldi, Opera, Thorium, Helium and more.', minutes: 2, kind: 'match', questions: ['devices', 'extensions', 'blockVsCompat', 'aiTolerance', 'tabStyle', 'maker', 'hardware', 'productivity'], pool: CHROMIUM_BASED, poolLabel: 'Chromium-based browsers' },
  { id: 'arc', name: 'Arc refugee', group: 'narrow', blurb: 'Arc ends on Dec 22, 2026. Find the successor that fits how you used it.', minutes: 2, kind: 'match', questions: ['devices', 'tabStyle', 'engine', 'aiTolerance', 'productivity', 'syncPhone', 'stability'], pool: (b) => b.status !== 'discontinued' && b.id !== 'arc' && (feat(b, 18) >= 1 || feat(b, 15) >= 1), poolLabel: 'browsers with vertical tabs or workspaces' },
  { id: 'android', focus: { mobileApps: 3, extensions: 2 }, name: 'Android power user', group: 'narrow', blurb: 'Extensions, de-Googling, Google Play or not.', minutes: 2, kind: 'match', questions: ['devices', 'androidExt', 'googlePlay', 'extensions', 'blockVsCompat', 'aiTolerance', 'openSource', 'syncPhone'], preset: { devices: { value: ['android'], preset: true } }, pool: (b) => !!b.platforms.android && b.platforms.android.status !== 'discontinued', poolLabel: 'Android browsers' },
  { id: 'developer', focus: { devTools: 4, webCompat: 2, advancedSettings: 1.5 }, name: 'Developer’s browser', group: 'narrow', blurb: 'Devtools, standards, engines and testing.', minutes: 2, kind: 'match', questions: ['devices', 'engine', 'extensions', 'tabStyle', 'aiTolerance', 'productivity', 'powerVsSimple'] },
  { id: 'oldpc', focus: { lowEnd: 4, memory: 3, cpu: 3, installSize: 2, startup: 1.5 }, name: 'Old or low-end PC', group: 'narrow', blurb: 'Browsers that stay quick on a slow computer or little memory.', minutes: 2, kind: 'match', questions: ['devices', 'ram', 'tabsScenario', 'extensions', 'blockVsCompat', 'syncPhone', 'current'], pool: (b) => graphical(b) && cat(b, 'lowEnd') >= 6, poolLabel: 'browsers that run well on modest hardware' },
  { id: 'family', focus: { beginnerFriendly: 4, patchSpeed: 2.5, securityHardening: 2, passwords: 2, sync: 1.5, accessibility: 1.5 }, name: 'For a parent or grandparent', group: 'narrow', blurb: 'Simple, safe and easy to live with, for someone who just wants it to work.', minutes: 2, kind: 'match', questions: ['baseFamily', 'devices', 'comfort', 'helpers', 'passwordQ', 'syncPhone', 'current'], preset: { baseFamily: { value: true, preset: true } }, pool: (b) => graphical(b) && cat(b, 'beginnerFriendly') >= 6.5, poolLabel: 'browsers that are easy to use' },
  { id: 'work', focus: { patchSpeed: 3, longevity: 3, securityHardening: 2, advancedSettings: 2 }, name: 'Work or school device', group: 'narrow', blurb: 'Browsers an IT team can manage that keep getting fixes.', minutes: 2, kind: 'match', questions: ['baseWork', 'devices', 'managed', 'passwordQ', 'syncPhone', 'stability', 'extensions', 'productivity'], preset: { baseWork: { value: true, preset: true } }, pool: (b) => graphical(b) && has(b, 'enterprisePolicies'), poolLabel: 'browsers with enterprise policies' },
  { id: 'iphone', name: 'iPhone and iPad', group: 'narrow', blurb: 'Every iPhone browser uses WebKit. Find the one with the features you need.', intro: 'On iPhone and iPad, Apple requires every browser to use its WebKit engine, so Chrome, Firefox and the rest differ in features, not in how pages render.', minutes: 2, kind: 'match', questions: ['devices', 'iosNeeds', 'blockVsCompat', 'aiTolerance', 'syncPhone', 'passwordQ', 'tabStyle'], preset: { devices: { value: ['ios'], preset: true } }, pool: onOs('ios'), poolLabel: 'iPhone and iPad browsers' },
  { id: 'mac', focus: { battery: 3, cpu: 2, memory: 1.5 }, name: 'Mac', group: 'narrow', blurb: 'The best fit for a MacBook or iMac, battery included.', minutes: 2, kind: 'match', questions: ['devices', 'tabStyle', 'blockVsCompat', 'aiTolerance', 'extensions', 'syncPhone', 'passwordQ', 'comfort', 'hardware', 'current'], preset: { devices: { value: ['macos'], preset: true } }, pool: onOs('macos'), poolLabel: 'Mac browsers' },
  { id: 'linux', focus: { openSource: 2, advancedSettings: 1.5 }, name: 'Linux desktop', group: 'narrow', blurb: 'Native packages, open source and the settings Linux users like.', minutes: 2, kind: 'match', questions: ['devices', 'tabStyle', 'blockVsCompat', 'aiTolerance', 'extensions', 'openSource', 'comfort', 'syncPhone', 'engine'], preset: { devices: { value: ['linux'], preset: true } }, pool: onOs('linux'), poolLabel: 'Linux browsers' },
  { id: 'degoogled', focus: { openSource: 3, telemetry: 3, businessTrust: 2, privacyDefaults: 2 }, name: 'De-Googled and open source', group: 'narrow', blurb: 'Open-source browsers with little data going back to the maker.', minutes: 2, kind: 'match', questions: ['devices', 'maker', 'telemetryQ', 'engine', 'androidExt', 'googlePlay', 'comfort', 'syncPhone'], pool: (b) => live(b) && b.openSource === true, poolLabel: 'open-source browsers' },
  { id: 'leave-chrome', focus: { extensions: 3, blocking: 2, privacyDefaults: 1.5 }, name: 'Leaving Chrome', group: 'narrow', blurb: 'Chrome ended Manifest V2 and the full uBlock Origin. Find a browser that keeps what you rely on.', intro: 'Chrome removed Manifest V2 in 2026, and uBlock Origin left its store. Tell us which extensions you need and we’ll find browsers that still run them.', minutes: 2, kind: 'match', questions: ['devices', 'extensions', 'current', 'engine', 'syncPhone', 'tabStyle', 'blockVsCompat'], pool: (b) => graphical(b) && b.id !== 'chrome', poolLabel: 'browsers other than Chrome' },
  { id: 'ai-finder', focus: { ai: 4 }, name: 'AI browser finder', group: 'narrow', blurb: 'Browsers with assistants and agents built in, and the ones that let you turn them off.', minutes: 2, kind: 'match', questions: ['devices', 'aiTolerance', 'aiFeatures', 'price', 'productivity', 'syncPhone'], pool: (b) => live(b) && b.keyFacts.ai.level !== 'none', poolLabel: 'browsers with built-in AI' },
  { id: 'privacy', name: 'Privacy Profile', group: 'self', blurb: 'Work out your threat model, a hardening level and a settings checklist.', minutes: 2, kind: 'privacy', questions: PRIVACY_Q.map((q) => q.id) },
  { id: 'security', name: 'Security Check-up', group: 'self', blurb: 'Seven questions about your habits give you a risk level, a checklist and browsers that fit.', minutes: 2, kind: 'security', questions: SECURITY_Q.map((x) => x.id) },
  { id: 'iq', name: 'Browser IQ', group: 'self', blurb: 'How well do you know browsers? Easy, medium or expert, with explanations.', minutes: 2, kind: 'trivia', questions: [] },
  { id: 'myths', name: 'Myth or fact', group: 'self', blurb: 'Common beliefs about browsers. Decide which are true.', minutes: 2, kind: 'trivia', questions: [] },
  { id: 'guess', name: 'Guess the browser', group: 'self', blurb: 'Clues appear one at a time. The fewer you need, the more you score.', minutes: 4, kind: 'guess', questions: [] },
];
