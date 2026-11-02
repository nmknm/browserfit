import type { CategoryId, EngineId, FeatureFamily, OsId, PillarId, StoreId, Support } from '../lib/types';

export interface Pillar {
  id: PillarId;
  name: string;
  short: string;
  blurb: string;
}

export const PILLARS: Pillar[] = [
  { id: 'speed', name: 'Speed', short: 'Speed', blurb: 'How fast pages, scripts and downloads feel.' },
  { id: 'efficiency', name: 'Efficiency', short: 'Efficiency', blurb: 'Memory, CPU, battery and how light it runs.' },
  { id: 'privacy', name: 'Privacy & Security', short: 'Privacy', blurb: 'What it blocks, what it sends, how well it is hardened.' },
  { id: 'customization', name: 'Customization & Control', short: 'Control', blurb: 'How far you can shape the browser to your habits.' },
  { id: 'features', name: 'Features & Productivity', short: 'Features', blurb: 'Built-in tools that save you extensions.' },
  { id: 'ecosystem', name: 'Ecosystem', short: 'Ecosystem', blurb: 'Extensions, sync, passwords, mobile apps and compatibility.' },
  { id: 'values', name: 'Values & Trust', short: 'Trust', blurb: 'Openness, business model, longevity, AI and ease of use.' },
];

export interface Category {
  id: CategoryId;
  pillar: PillarId;
  name: string;
  plain: string;
  techy: string;
  ten: string;
  zero: string;
  weight: number;
}

const c = (
  id: CategoryId,
  pillar: PillarId,
  name: string,
  plain: string,
  techy: string,
  ten: string,
  zero: string,
  weight = 1,
): Category => ({ id, pillar, name, plain, techy, ten, zero, weight });

export const CATEGORIES: Category[] = [
  c('jsSpeed', 'speed', 'JavaScript speed', 'How quickly web apps like Gmail or Figma react.', 'JS engine throughput and latency, as in Speedometer 3 and JetStream class benchmarks.', 'Top of public benchmarks.', 'No JavaScript at all.', 1.2),
  c('pageLoad', 'speed', 'Page loading', 'How fast a page appears and becomes usable.', 'Parsing, layout, paint and loading pipeline (LCP-type behaviour).', 'Pages appear instantly.', 'Slow or broken rendering.', 1.2),
  c('networkSpeed', 'speed', 'Network & downloads', 'How quickly it fetches pages and files.', 'HTTP/2 and HTTP/3 (QUIC), preconnect/prefetch, parallel downloads, proxy or relay overhead.', 'Modern protocols, no relays slowing you.', 'Routed through slow relays or old stacks.'),
  c('startup', 'speed', 'Startup time', 'How fast it opens from cold.', 'Cold-start time to first usable window.', 'Opens instantly.', 'Long cold start.', 0.6),
  c('smoothness', 'speed', 'Smoothness', 'Scrolling and animations without stutter.', 'Compositor quality, frame pacing, input latency.', 'Butter-smooth everywhere.', 'Visible jank.', 0.8),
  c('graphics', 'speed', 'Graphics & gaming', 'Browser games, 3D and video effects.', 'WebGL 2, WebGPU, canvas and media pipeline performance.', 'Full WebGPU and fast WebGL.', 'No GPU acceleration.', 0.6),
  c('memory', 'efficiency', 'Memory use', 'How much RAM it needs with many tabs.', 'Per-process overhead, tab discarding, shared memory.', 'Very light on RAM.', 'RAM hungry.', 1),
  c('cpu', 'efficiency', 'CPU use', 'How hard it works your processor.', 'Background throttling, timer clamping, idle CPU.', 'Near idle when idle.', 'Keeps the CPU busy.', 0.8),
  c('battery', 'efficiency', 'Battery life', 'How long your laptop or phone lasts.', 'Energy per page, background work, hardware decoding.', 'Among the longest battery life measured.', 'Drains battery fast.', 1),
  c('resourceControls', 'efficiency', 'Resource controls', 'Tools to limit RAM, CPU or sleeping tabs.', 'Tab sleeping, memory saver, energy saver, RAM/CPU limiters.', 'Fine-grained limiters and sleep rules.', 'No controls.', 0.6),
  c('lowEnd', 'efficiency', 'Old & low-end PCs', 'Runs well on old or cheap hardware.', 'Minimum requirements, legacy OS support, light UI.', 'Snappy on a 10-year-old laptop.', 'Needs modern hardware.', 0.6),
  c('installSize', 'efficiency', 'Install size', 'Download and disk footprint.', 'Installer and on-disk size, bundled components.', 'Tiny.', 'Very large.', 0.3),
  c('privacyDefaults', 'privacy', 'Privacy by default', 'Private out of the box, no setup.', 'Default third-party cookie policy, partitioning, search engine and data sharing defaults.', 'Private with zero setup.', 'Tracking-friendly defaults.', 1.3),
  c('blocking', 'privacy', 'Ad & tracker blocking', 'Blocks ads and trackers.', 'Built-in filter engine quality, list support, MV2 blocker support.', 'Blocks nearly everything, customizable.', 'No blocking possible.', 1.2),
  c('fingerprinting', 'privacy', 'Fingerprint resistance', 'Stops sites recognising your device.', 'Canvas/WebGL/audio noise or uniformity, font and screen protections.', 'Uniform or randomized fingerprint.', 'Fully fingerprintable.', 0.9),
  c('securityHardening', 'privacy', 'Security hardening', 'Protection against malicious sites and exploits.', 'Sandboxing, site isolation, exploit mitigations, safe browsing.', 'Strong sandbox and site isolation.', 'Weak isolation.', 1.2),
  c('patchSpeed', 'privacy', 'Patch speed', 'How fast security fixes reach you.', 'Lag behind upstream security releases; update mechanism.', 'Same-day fixes.', 'Months behind upstream.', 1.1),
  c('telemetry', 'privacy', 'Telemetry & transparency', 'How little it phones home, and how honest it is.', 'Telemetry volume, opt-out, documented data flows.', 'No telemetry or fully transparent.', 'Heavy undisclosed collection.', 1),
  c('lookCustom', 'customization', 'Look & layout', 'Themes, toolbars and layout options.', 'Theme engine, toolbar editor, tab position, CSS customisation.', 'Rebuild the whole UI.', 'Fixed UI.', 0.8),
  c('behaviourCustom', 'customization', 'Behaviour & shortcuts', 'Shortcuts, gestures and per-site rules.', 'Keyboard remapping, mouse gestures, per-site settings, startup rules.', 'Everything remappable.', 'No options.', 0.8),
  c('advancedSettings', 'customization', 'Advanced settings', 'Depth of power-user options.', 'Flags, about:config, enterprise policies, hidden prefs.', 'Every knob is reachable.', 'No advanced options.', 0.7),
  c('tabManagement', 'customization', 'Tab management', 'Vertical tabs, groups, workspaces, split view.', 'Tab stacks, workspaces, tiling, search, hibernation UI.', 'Every tab tool built in.', 'Basic tab strip.', 1),
  c('searchFreedom', 'customization', 'Search freedom', 'Pick any search engine easily.', 'Custom engines, keywords/bangs, default lock-in.', 'Any engine, keywords, easy.', 'Locked default.', 0.5),
  c('downloads', 'features', 'Download manager', 'Pause, resume and manage downloads.', 'Resume support, parallel connections, per-site download rules.', 'Full download manager.', 'Minimal downloads.', 0.6),
  c('productivity', 'features', 'Productivity tools', 'Notes, reader, screenshots, sidebar, PiP.', 'Reader view, notes, web panels, capture, command palette.', 'A full toolbox built in.', 'None.', 0.8),
  c('media', 'features', 'Media & streaming', 'Netflix in HD, codecs, picture-in-picture.', 'Widevine level, HEVC/AV1, hardware decoding, PiP.', 'Full DRM, every codec.', 'No DRM, limited codecs.', 0.8),
  c('translation', 'features', 'Translation', 'Translate pages built in.', 'On-device or cloud translation, language coverage, privacy.', 'Instant, private, many languages.', 'None.', 0.5),
  c('extras', 'features', 'Built-in extras', 'VPN, mail, RSS and other extras that are actually good.', 'Quality of bundled services (VPN, mail, RSS, wallet).', 'Valuable, well-built extras.', 'No extras.', 0.4),
  c('extensions', 'ecosystem', 'Extensions', 'Add-on catalogue and how powerful add-ons can be.', 'Store access, Manifest V2 support, mobile extensions.', 'Huge store, full MV2 power.', 'No extensions.', 1.2),
  c('sync', 'ecosystem', 'Sync & devices', 'Your tabs and bookmarks everywhere.', 'What syncs, encryption, platforms covered.', 'Encrypted sync on every OS.', 'No sync.', 1),
  c('passwords', 'ecosystem', 'Password manager', 'Built-in password and passkey handling.', 'Autofill quality, passkeys, breach alerts, export.', 'Full manager with passkeys.', 'No password manager.', 0.8),
  c('mobileApps', 'ecosystem', 'Mobile apps', 'Quality of the phone versions.', 'Android/iOS availability, feature parity.', 'Great apps on both phones.', 'No mobile app.', 0.9),
  c('webCompat', 'ecosystem', 'Site compatibility', 'Sites just work.', 'Standards coverage and real-world compatibility.', 'Everything works.', 'Many sites break.', 1.2),
  c('devTools', 'ecosystem', 'Developer tools', 'Tools for web developers.', 'Inspector, debugger, performance, network, protocol support.', 'Devtools that professionals choose first.', 'None.', 0.5),
  c('accessibility', 'ecosystem', 'Accessibility', 'Screen readers, zoom, keyboard use.', 'A11y tree quality, caret browsing, high contrast, reader support.', 'Excellent assistive support.', 'Poor support.', 0.8),
  c('openSource', 'values', 'Open source & independence', 'Code you can inspect, not tied to big tech.', 'License, build reproducibility, governance, engine independence.', 'Fully open and independent.', 'Closed source.', 0.8),
  c('businessTrust', 'values', 'Business-model trust', 'How the company makes money and whether you can trust it.', 'Revenue model, ownership, jurisdiction, track record.', 'Aligned incentives, clean record.', 'Data-driven or troubled record.', 1),
  c('longevity', 'values', 'Longevity & updates', 'Will it still be maintained next year?', 'Release cadence, team size, funding, status.', 'Long-term, well-funded.', 'Discontinued.', 1),
  c('ai', 'values', 'AI features', 'Built-in AI assistants and agents.', 'Assistant, summarisation, agentic browsing, local models.', 'Capable AI and agents.', 'No AI at all.', 0.5),
  c('beginnerFriendly', 'values', 'Beginner friendly', 'Easy for anyone to use.', 'Onboarding, defaults, UI clarity.', 'Anyone can use it with no help.', 'Expert-only.', 0.9),
];

export const CATEGORY_IDS = CATEGORIES.map((x) => x.id);
export const CATEGORY_INDEX: Record<CategoryId, number> = Object.fromEntries(CATEGORY_IDS.map((id, i) => [id, i])) as Record<CategoryId, number>;
export const CATEGORY_BY_ID: Record<CategoryId, Category> = Object.fromEntries(CATEGORIES.map((x) => [x.id, x])) as Record<CategoryId, Category>;
export const PILLAR_BY_ID = Object.fromEntries(PILLARS.map((p) => [p.id, p])) as Record<PillarId, Pillar>;

export interface Feature {
  id: string;
  family: FeatureFamily;
  name: string;
  hint: string;
}

const f = (id: string, family: FeatureFamily, name: string, hint: string): Feature => ({ id, family, name, hint });

export const FEATURE_FAMILIES: { id: FeatureFamily; name: string }[] = [
  { id: 'privacy', name: 'Privacy' },
  { id: 'blocking', name: 'Blocking' },
  { id: 'tabs', name: 'Tabs' },
  { id: 'productivity', name: 'Productivity' },
  { id: 'extensions', name: 'Extensions' },
  { id: 'sync', name: 'Sync & accounts' },
  { id: 'media', name: 'Media' },
  { id: 'ai', name: 'AI' },
  { id: 'extras', name: 'Extras' },
];

export const FEATURES: Feature[] = [
  f('trackingProtection', 'privacy', 'Tracking protection', 'Blocks cross-site trackers'),
  f('fingerprintProtection', 'privacy', 'Fingerprint protection', 'Resists device fingerprinting'),
  f('httpsOnly', 'privacy', 'HTTPS-only mode', 'Upgrades or blocks insecure connections'),
  f('doh', 'privacy', 'Encrypted DNS', 'DNS over HTTPS'),
  f('torWindows', 'privacy', 'Tor windows', 'Built-in Tor / onion browsing'),
  f('builtinVpn', 'privacy', 'Built-in VPN/proxy', 'VPN or proxy included'),
  f('cookieIsolation', 'privacy', 'Cookie isolation', 'Partitioned third-party storage'),
  f('queryStripping', 'privacy', 'Tracking-parameter stripping', 'Removes tracking query parameters'),
  f('telemetryOptOut', 'privacy', 'Telemetry opt-out', 'All telemetry can be turned off'),
  f('privateHardening', 'privacy', 'Hardened private mode', 'Private windows with extra protection'),
  f('adBlocker', 'blocking', 'Ad blocker', 'Built-in ad blocking'),
  f('cosmeticFiltering', 'blocking', 'Cosmetic filtering', 'Hides empty ad boxes and annoyances'),
  f('customFilterLists', 'blocking', 'Custom filter lists', 'Add your own lists and rules'),
  f('youtubeAds', 'blocking', 'YouTube ad blocking', 'Blocks video ads reliably'),
  f('cookieBanners', 'blocking', 'Cookie-banner blocking', 'Dismisses consent pop-ups'),
  f('verticalTabs', 'tabs', 'Vertical tabs', 'Tabs in a side list'),
  f('tabGroups', 'tabs', 'Tab groups', 'Named, coloured groups'),
  f('tabStacks', 'tabs', 'Tab stacks', 'Nested tabs'),
  f('workspaces', 'tabs', 'Workspaces', 'Separate sets of tabs'),
  f('splitView', 'tabs', 'Split view', 'Two or more pages side by side'),
  f('tabSleeping', 'tabs', 'Tab sleeping', 'Unloads idle tabs'),
  f('tabSearch', 'tabs', 'Tab search', 'Find open tabs fast'),
  f('pinnedTabs', 'tabs', 'Pinned tabs', 'Keep key tabs fixed'),
  f('tabTiling', 'tabs', 'Tab tiling', 'Tile many tabs in one view'),
  f('readerMode', 'productivity', 'Reader mode', 'Clean reading view'),
  f('notes', 'productivity', 'Notes', 'Built-in notes'),
  f('webPanels', 'productivity', 'Web panels / sidebar', 'Sites docked in a sidebar'),
  f('pip', 'productivity', 'Picture-in-picture', 'Floating video'),
  f('screenshots', 'productivity', 'Screenshots', 'Capture full pages'),
  f('commandBar', 'productivity', 'Command bar', 'Run actions from a palette'),
  f('mouseGestures', 'productivity', 'Mouse gestures', 'Navigate with gestures'),
  f('keyboardShortcuts', 'productivity', 'Custom shortcuts', 'Remap keyboard shortcuts'),
  f('readLater', 'productivity', 'Read later', 'Save pages for later'),
  f('mailCalendarRss', 'productivity', 'Mail, calendar & feeds', 'Built-in mail, calendar or RSS'),
  f('chromeWebStore', 'extensions', 'Chrome Web Store', 'Installs Chrome extensions'),
  f('firefoxAddons', 'extensions', 'Firefox add-ons', 'Installs Firefox add-ons'),
  f('mv2Support', 'extensions', 'Manifest V2', 'Runs classic MV2 extensions'),
  f('uboFull', 'extensions', 'Full uBlock Origin', 'Full uBO, not the Lite version'),
  f('mobileExtensions', 'extensions', 'Mobile extensions', 'Extensions on phones'),
  f('userscripts', 'extensions', 'Userscripts', 'Run user scripts'),
  f('syncBookmarks', 'sync', 'Bookmark & history sync', 'Bookmarks and history across devices'),
  f('syncPasswords', 'sync', 'Password sync', 'Passwords across devices'),
  f('syncTabs', 'sync', 'Open-tab sync', 'See tabs from other devices'),
  f('e2eeSync', 'sync', 'End-to-end encrypted sync', 'Only you can read synced data'),
  f('profiles', 'sync', 'Profiles', 'Separate profiles'),
  f('passwordManager', 'sync', 'Password manager', 'Saves and fills passwords'),
  f('passkeys', 'sync', 'Passkeys', 'Passwordless sign-in'),
  f('importData', 'sync', 'Import data', 'Import from other browsers'),
  f('widevine', 'media', 'Widevine DRM', 'Plays protected streams'),
  f('netflix4k', 'media', '4K streaming', '4K on Netflix and similar'),
  f('hevc', 'media', 'HEVC / H.265', 'Plays HEVC video'),
  f('av1', 'media', 'AV1', 'Plays AV1 video'),
  f('hwDecode', 'media', 'Hardware decoding', 'GPU video decoding'),
  f('aiAssistant', 'ai', 'AI assistant', 'Chat assistant in the browser'),
  f('aiSummarizer', 'ai', 'Page summaries', 'AI summaries of pages'),
  f('agenticBrowsing', 'ai', 'Agentic browsing', 'AI that acts on pages for you'),
  f('localAi', 'ai', 'On-device AI', 'AI models that run locally'),
  f('aiKillSwitch', 'ai', 'AI off switch', 'One switch to disable AI'),
  f('translation', 'extras', 'Page translation', 'Translate whole pages'),
  f('cryptoWallet', 'extras', 'Crypto wallet', 'Built-in wallet'),
  f('pwaInstall', 'extras', 'Install web apps', 'Install sites as apps'),
  f('enterprisePolicies', 'extras', 'Enterprise policies', 'Managed policies for IT'),
  f('kioskMode', 'extras', 'Kiosk mode', 'Locked full-screen mode'),
  f('panicButton', 'extras', 'Panic button', 'Instantly hide or close everything'),
  f('downloadManager', 'extras', 'Download manager', 'Full download manager'),
  f('customThemes', 'extras', 'Custom themes', 'Install or build themes'),
  f('customSearchEngines', 'extras', 'Custom search engines', 'Add any search engine'),
  f('devtools', 'extras', 'Developer tools', 'Built-in devtools'),
];

export const FEATURE_IDS = FEATURES.map((x) => x.id);
export const FEATURE_INDEX: Record<string, number> = Object.fromEntries(FEATURE_IDS.map((id, i) => [id, i]));
export const FEATURE_BY_ID: Record<string, Feature> = Object.fromEntries(FEATURES.map((x) => [x.id, x]));

export const SUPPORT_CODES: Support[] = ['no', 'partial', 'yes', 'extension', 'paid'];
export const SUPPORT_LABEL: Record<Support, string> = {
  yes: 'Built in',
  partial: 'Partial',
  no: 'No',
  extension: 'Via extension',
  paid: 'Paid',
};

export interface OsInfo {
  id: OsId;
  name: string;
  short: string;
  kind: 'desktop' | 'mobile';
  rules: string[];
}

export const OSES: OsInfo[] = [
  { id: 'windows', name: 'Windows', short: 'Win', kind: 'desktop', rules: ['Edge is preinstalled; change the default in Settings → Apps → Default apps.', 'Most browsers ship x64 and ARM64 builds.'] },
  { id: 'macos', name: 'macOS', short: 'Mac', kind: 'desktop', rules: ['Safari is preinstalled and gets the best battery life on Apple silicon.', 'Some newer browsers are Apple-silicon only.'] },
  { id: 'linux', name: 'Linux', short: 'Linux', kind: 'desktop', rules: ['Flatpak and Snap builds may restrict hardware video decoding or native messaging.', 'Distro repositories sometimes lag official builds.'] },
  { id: 'android', name: 'Android', short: 'Android', kind: 'mobile', rules: ['Browsers bring their own engine.', 'Extensions are possible: Firefox, Edge, Vivaldi, Titanium, Bare, Quetta and Lemur support them.', 'Not every browser is on Google Play; some use F-Droid or GitHub.'] },
  { id: 'ios', name: 'iOS & iPadOS', short: 'iOS', kind: 'mobile', rules: ['Every iOS browser uses Apple’s WebKit engine.', 'EU rules allow other engines on iPhone, but no Blink or Gecko browser has shipped as of Oct 2026.', 'Extensions are limited to Safari Web Extensions (Safari, Orion and a few others).'] },
  { id: 'chromeos', name: 'ChromeOS', short: 'ChromeOS', kind: 'desktop', rules: ['Chrome is built in; Android browsers can run from Google Play.', 'Linux apps (Crostini) can run Linux desktop browsers.'] },
];
export const OS_BY_ID = Object.fromEntries(OSES.map((o) => [o.id, o])) as Record<OsId, OsInfo>;
export const OS_IDS = OSES.map((o) => o.id);

export interface EngineInfo {
  id: EngineId;
  name: string;
  owner: string;
  colorVar: string;
  blurb: string;
  independent: boolean;
}

export const ENGINES: EngineInfo[] = [
  { id: 'blink', name: 'Blink', owner: 'Google (Chromium project)', colorVar: '--eng-blink', blurb: 'Chromium’s engine, forked from WebKit in 2013. Powers Chrome, Edge, Brave, Opera, Vivaldi and most forks.', independent: false },
  { id: 'gecko', name: 'Gecko', owner: 'Mozilla', colorVar: '--eng-gecko', blurb: 'Firefox’s engine, the main independent alternative to Chromium. Powers Firefox, LibreWolf, Zen, Tor Browser and more.', independent: true },
  { id: 'webkit', name: 'WebKit', owner: 'Apple', colorVar: '--eng-webkit', blurb: 'Safari’s engine and the required engine on iPhone and iPad. Also used by GNOME Web and Orion.', independent: true },
  { id: 'libweb', name: 'LibWeb', owner: 'Ladybird Browser Initiative', colorVar: '--eng-libweb', blurb: 'A brand-new engine written from scratch for Ladybird, with no code from Blink, Gecko or WebKit.', independent: true },
  { id: 'goanna', name: 'Goanna', owner: 'Moonchild Productions', colorVar: '--eng-goanna', blurb: 'A long-running fork of older Gecko used by Pale Moon and Basilisk.', independent: true },
  { id: 'servo', name: 'Servo', owner: 'Linux Foundation Europe', colorVar: '--eng-servo', blurb: 'A Rust engine started at Mozilla, now an independent project. Embeddable; servoshell is a demo browser.', independent: true },
  { id: 'netsurf', name: 'NetSurf', owner: 'NetSurf project', colorVar: '--eng-other', blurb: 'A small layout engine written in C with its own HTML parser, CSS library and Duktape JavaScript. Built for old and low-power hardware; handles only older web standards.', independent: true },
  { id: 'dillo', name: 'Dillo', owner: 'Dillo project', colorVar: '--eng-other', blurb: 'A tiny C++ rendering engine built on FLTK with its own HTML and CSS parsers and no JavaScript. Made for very old and low-power machines.', independent: true },
  { id: 'multi', name: 'Multiple', owner: '—', colorVar: '--eng-other', blurb: 'Uses different engines per platform or per site.', independent: false },
  { id: 'text', name: 'Text-mode', owner: '—', colorVar: '--eng-other', blurb: 'Terminal browsers that render text only, without CSS layout or JavaScript.', independent: true },
  { id: 'trident-legacy', name: 'Trident', owner: 'Microsoft (retired)', colorVar: '--eng-other', blurb: 'Internet Explorer’s engine, retired.', independent: true },
  { id: 'edgehtml-legacy', name: 'EdgeHTML', owner: 'Microsoft (retired)', colorVar: '--eng-other', blurb: 'The engine of the original Edge, replaced by Chromium in 2020.', independent: true },
];
export const ENGINE_BY_ID = Object.fromEntries(ENGINES.map((e) => [e.id, e])) as Record<EngineId, EngineInfo>;

export const STORE_LABEL: Record<StoreId, string> = {
  'google-play': 'Google Play',
  'f-droid': 'F-Droid',
  izzy: 'IzzyOnDroid',
  github: 'GitHub',
  accrescent: 'Accrescent',
  preinstalled: 'Preinstalled',
  apk: 'APK download',
  'app-store': 'App Store',
  'mac-app-store': 'Mac App Store',
  'microsoft-store': 'Microsoft Store',
  winget: 'winget',
  homebrew: 'Homebrew',
  flathub: 'Flathub',
  snap: 'Snap',
  aur: 'AUR',
  deb: '.deb',
  rpm: '.rpm',
  'official-installer': 'Official installer',
  portable: 'Portable',
};

export const GROUP_LABEL: Record<string, string> = {
  mainstream: 'Mainstream',
  privacy: 'Privacy',
  power: 'Power user',
  ai: 'AI & agentic',
  forks: 'Forks & legacy',
  minimal: 'Minimal & indie',
  android: 'Advanced Android',
  regional: 'Regional',
  mobile: 'Mobile-first',
};

export const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  beta: 'Beta',
  alpha: 'Alpha',
  'early-access': 'Early access',
  maintenance: 'Maintenance',
  sunsetting: 'Shutting down',
  discontinued: 'Discontinued',
};
