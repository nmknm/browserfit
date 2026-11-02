export type OsId = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'chromeos';
export type EngineId =
  | 'blink'
  | 'gecko'
  | 'webkit'
  | 'libweb'
  | 'goanna'
  | 'servo'
  | 'netsurf'
  | 'dillo'
  | 'text'
  | 'multi'
  | 'trident-legacy'
  | 'edgehtml-legacy';

export type Status =
  | 'active'
  | 'beta'
  | 'alpha'
  | 'early-access'
  | 'maintenance'
  | 'sunsetting'
  | 'discontinued';

export type Group = 'mainstream' | 'privacy' | 'power' | 'ai' | 'forks' | 'minimal' | 'android' | 'regional' | 'mobile';

export type PillarId = 'speed' | 'efficiency' | 'privacy' | 'customization' | 'features' | 'ecosystem' | 'values';

export type CategoryId =
  | 'jsSpeed' | 'pageLoad' | 'networkSpeed' | 'startup' | 'smoothness' | 'graphics'
  | 'memory' | 'cpu' | 'battery' | 'resourceControls' | 'lowEnd' | 'installSize'
  | 'privacyDefaults' | 'blocking' | 'fingerprinting' | 'securityHardening' | 'patchSpeed' | 'telemetry'
  | 'lookCustom' | 'behaviourCustom' | 'advancedSettings' | 'tabManagement' | 'searchFreedom'
  | 'downloads' | 'productivity' | 'media' | 'translation' | 'extras'
  | 'extensions' | 'sync' | 'passwords' | 'mobileApps' | 'webCompat' | 'devTools' | 'accessibility'
  | 'openSource' | 'businessTrust' | 'longevity' | 'ai' | 'beginnerFriendly';

export type FeatureFamily = 'privacy' | 'blocking' | 'tabs' | 'productivity' | 'extensions' | 'sync' | 'media' | 'ai' | 'extras';

export type Support = 'yes' | 'partial' | 'no' | 'extension' | 'paid';
export type Evidence = 'measured-public' | 'documented' | 'editorial';

export type SyncType = 'none' | 'local-only' | 'account' | 'e2ee' | 'self-hostable';
export type PwLevel = 'none' | 'basic' | 'full';
export type Mv2Level = 'full' | 'partial' | 'temporary' | 'mv3-only' | 'none' | 'no-extensions';
export type UboLevel = 'full' | 'lite' | 'builtin-equivalent' | 'none';
export type MobileExt = 'none' | 'own-store' | 'chrome-web-store' | 'firefox-addons' | 'crx-sideload' | 'n/a';
export type AiLevel = 'none' | 'opt-in' | 'on-by-default' | 'agentic';
export type Confidence = 'high' | 'medium' | 'low';

export type StoreId =
  | 'google-play' | 'f-droid' | 'izzy' | 'github' | 'accrescent' | 'preinstalled' | 'apk'
  | 'app-store' | 'mac-app-store' | 'microsoft-store' | 'winget' | 'homebrew'
  | 'flathub' | 'snap' | 'aur' | 'deb' | 'rpm' | 'official-installer' | 'portable';

export interface PlatformInfo {
  status: Status;
  minOs?: string;
  /**
   * `minOs` as a number (major * 100 + minor; Windows uses 601 for 7, 1000 for 10), derived in the build.
   * `confirmed` is false when the research hedges ("unverified", a third-party listing).
   */
  minOsFloor?: { min: number | null; confirmed: boolean };
  arch?: string[];
  stores: StoreId[];
  notes: string[];
  highlights: string[];
  scoreDelta?: Partial<Record<CategoryId, number>>;
  engine?: EngineId;
}

export interface KeyFacts {
  sync: { type: SyncType; items: string[]; crossOs: boolean; note?: string };
  passwordManager: { level: PwLevel; passkeys: boolean; breachCheck: boolean; note?: string };
  mv2: { level: Mv2Level; note?: string; date?: string };
  ublock: UboLevel;
  mobileExtensions: { android: MobileExt; ios: MobileExt };
  ai: { level: AiLevel; killSwitch: boolean; paid?: string | boolean; note?: string };
  privacy: { defaults: string; telemetry: string; jurisdiction: string };
  privacyGrade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export type SandboxLevel = 'strong' | 'basic' | 'none' | 'unknown';
export type IsolationLevel = 'full' | 'partial' | 'none' | 'unknown';
/** How long after the upstream engine's security release the browser ships it. */
export type PatchLag = 'upstream' | 'days' | 'weeks' | 'months' | 'own' | 'stalled' | 'unknown';
export type AutoUpdate = 'background' | 'store' | 'os' | 'manual' | 'unknown';
export type HttpsFirst = 'default' | 'optional' | 'no' | 'unknown';
export type SafeBrowsing = 'google' | 'apple' | 'microsoft' | 'own' | 'other' | 'none' | 'unknown';
export type ExtVetting = 'reviewed' | 'open' | 'sideload' | 'none';
export type BugBounty = 'own' | 'upstream' | 'none' | 'unknown';

/** Compact security facts (derived in the build, overlaid by research/security/<id>.json). */
export interface SecurityFacts {
  sandbox: SandboxLevel;
  siteIsolation: IsolationLevel;
  patchLag: PatchLag;
  /** Short reason for a derived patch lag, e.g. "Chromium 155 vs latest 156". */
  lagNote?: string;
  /** Update mechanism per OS, derived from install channels unless researched. */
  autoUpdate: Partial<Record<OsId, AutoUpdate>>;
  httpsFirst: HttpsFirst;
  safeBrowsing: SafeBrowsing;
  /** Name of a hardened mode (e.g. Lockdown Mode); null = researched and none; undefined = not researched. */
  hardenedMode?: string | null;
  extVetting: ExtVetting;
  bugBounty: BugBounty;
  disclosure?: boolean;
  advisoryUrl?: string;
  /** True when a research/security/<id>.json override exists; otherwise the facts are estimated. */
  researched: boolean;
}

export interface SecurityIncident {
  date: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detail: string;
  url: string;
}

export interface SecurityDetail {
  summary: string;
  incidents: SecurityIncident[];
  sources: { url: string; title: string; accessed: string }[];
}

/** Compact index entry (always loaded). */
export interface BrowserIndex {
  id: string;
  name: string;
  group: Group;
  developer: string;
  hq: string;
  engine: EngineId;
  basedOn: string;
  openSource: boolean | 'partial';
  license: string;
  price: 'free' | 'freemium' | 'paid';
  releaseYear: number;
  status: Status;
  statusNote: string;
  version: { current: string; date: string; upstream?: string };
  tags: string[];
  pitch: string;
  website: string;
  color: string;
  keyFacts: KeyFacts;
  security: SecurityFacts;
  platforms: Partial<Record<OsId, PlatformInfo>>;
  /** 40 scores in CATEGORY_IDS order */
  scores: number[];
  /** 68 features: [supportCode, rating] in FEATURE_IDS order; supportCode index into SUPPORT_CODES */
  features: [number, number][];
  confidence: Confidence;
  lastVerified: string;
}

/** Heavy detail (lazy loaded per browser). */
export interface BrowserDetail {
  id: string;
  aliases: string[];
  businessModel: string;
  paidNote?: string;
  channels: string[];
  updateCadence: string;
  summary: string;
  bestFor: string[];
  notFor: string[];
  pros: { title: string; detail: string }[];
  cons: { title: string; detail: string }[];
  signatureFeatures: string[];
  faq: { q: string; a: string }[];
  timeline: { date: string; event: string }[];
  switching: { imports: string[]; note: string };
  alternatives: string[];
  spec: Record<string, string>;
  /** per category: why + evidence */
  scoreNotes: Record<string, [string, Evidence]>;
  /** per feature note */
  featureNotes: Record<string, string>;
  sources: { url: string; title: string; accessed: string }[];
  unverified: string[];
  engineByOs?: Partial<Record<OsId, EngineId>>;
  security?: SecurityDetail;
}
