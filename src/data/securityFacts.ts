// Public security facts shown on /security/benchmarks. Every entry carries the page it came from and the
// date we read it (enforced by scripts/check-security-facts.mjs). Nothing here is measured by Browserfit.
// Keep this file free of imports so the check script can load it directly.

export interface FactSource {
  url: string;
  title: string;
  /** ISO date we read the page. */
  accessed: string;
}

export interface Benchmark {
  id: string;
  name: string;
  publisher: string;
  /** One sentence: what it measures or lists. */
  measures: string;
  /** What we read there, in a sentence or two. */
  finding: string;
  coverage: string[];
  /** Date the publisher last updated it, when it states one. */
  updated?: string;
  /** Where it falls short as a ranking of browser security. */
  caveat: string;
  source: FactSource;
}

export interface Bounty {
  id: string;
  program: string;
  /** What the program covers. */
  scope: string;
  /** The amount as the publisher states it. */
  headline: string;
  /** Numeric maximum in US dollars for sorting. */
  max: number;
  note?: string;
  source: FactSource;
}

export interface ExploitedBug {
  cve: string;
  /** Date CISA added it to the Known Exploited Vulnerabilities catalog. */
  added: string;
  family: 'chromium' | 'webkit' | 'gecko' | 'edge';
  component: string;
  /** Name CISA uses in its catalog. */
  kevName: string;
  note?: string;
  source: FactSource;
}

const ACCESSED = '2026-10-30';

export const KEV_VERSION = '2026.10.29';
export const KEV_SOURCE: FactSource = {
  url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
  title: `CISA Known Exploited Vulnerabilities catalog, version ${KEV_VERSION}`,
  accessed: ACCESSED,
};

export const BENCHMARKS: Benchmark[] = [
  {
    id: 'privacytests',
    name: 'PrivacyTests.org',
    publisher: 'Open-source project (source on GitHub)',
    measures: 'Automated, open-source tests of browser privacy features, run on each browser release.',
    finding: 'Issue 105 (2026-10-22) tests Brave 1.97, Chrome 156.0, DuckDuckGo 1.212, Edge 155.0, Firefox 158.0 and LibreWolf on desktop, with separate tables for private modes, iOS, Android and nightly builds.',
    coverage: ['Desktop', 'Private modes', 'iOS', 'Android', 'Nightly builds'],
    updated: '2026-10-22',
    caveat: 'Tests privacy behaviour such as tracker blocking, not exploit resistance, and covers a small set of browsers.',
    source: { url: 'https://privacytests.org/', title: 'PrivacyTests.org', accessed: ACCESSED },
  },
  {
    id: 'cover-your-tracks',
    name: 'Cover Your Tracks',
    publisher: 'Electronic Frontier Foundation',
    measures: 'Whether your browser blocks simulated third-party trackers, and how unique your browser looks (its fingerprint).',
    finding: 'Runs in your own browser and reports a tracking-protection result and a uniqueness score compared with other visitors.',
    coverage: ['The browser you open it in'],
    caveat: 'Describes one browser on one device at one moment, so results are not comparable across people.',
    source: { url: 'https://coveryourtracks.eff.org/', title: 'Cover Your Tracks', accessed: ACCESSED },
  },
  {
    id: 'pwn2own-berlin-2026',
    name: 'Pwn2Own Berlin 2026',
    publisher: 'Zero Day Initiative (Trend Micro)',
    measures: 'A live hacking contest where researchers try to exploit up-to-date products for prizes.',
    finding:
      'Edge: Orange Tsai of DEVCORE chained four logic bugs to escape the sandbox and won $175,000 (day one). Firefox and Safari renderer-only entries were withdrawn or did not work in time. After day two the event had paid $908,750 for 39 unique zero-days across all categories.',
    coverage: ['Edge', 'Firefox', 'Safari'],
    updated: '2026-05-15',
    caveat: 'A few attempts in a few days. A failed or withdrawn entry says little about how safe a browser is.',
    source: { url: 'https://www.thezdi.com/blog/2026/5/15/pwn2own-berlin-2026-day-two-results', title: 'ZDI: Pwn2Own Berlin 2026, day two results', accessed: ACCESSED },
  },
  {
    id: 'cisa-kev',
    name: 'CISA Known Exploited Vulnerabilities',
    publisher: 'US Cybersecurity and Infrastructure Security Agency',
    measures: 'A catalog of vulnerabilities that CISA has evidence are being exploited in the wild.',
    finding: `Version ${KEV_VERSION} lists seven Chromium bugs and three older WebKit bugs added during 2026, and none for Firefox or Edge. The timeline below is built from it.`,
    coverage: ['All vendors'],
    updated: '2026-10-29',
    caveat: 'Counts only what CISA tracks. Widely used, heavily studied engines appear more often, so a short list is not proof of safety.',
    source: KEV_SOURCE,
  },
  {
    id: 'chrome-releases',
    name: 'Chrome Releases blog',
    publisher: 'Google',
    measures: 'Every Chrome release, with the security fixes in each and a note when an exploit is known to exist.',
    finding: 'The primary place to check how quickly a Chromium fix ships, since Edge, Brave, Opera and others follow it.',
    coverage: ['Chrome', 'Chromium'],
    caveat: 'Lists fixes, not how fast each fork adopts them.',
    source: { url: 'https://chromereleases.googleblog.com/', title: 'Chrome Releases', accessed: ACCESSED },
  },
  {
    id: 'mozilla-advisories',
    name: 'Mozilla Foundation Security Advisories',
    publisher: 'Mozilla',
    measures: 'Security advisories for Firefox and other Mozilla products, one per release.',
    finding: 'Lists each fixed vulnerability with its severity and the versions affected, including Firefox ESR.',
    coverage: ['Firefox', 'Firefox ESR'],
    caveat: 'Covers Mozilla’s own builds. Forks such as LibreWolf and Tor Browser publish their own releases.',
    source: { url: 'https://www.mozilla.org/en-US/security/advisories/', title: 'Mozilla Security Advisories', accessed: ACCESSED },
  },
  {
    id: 'apple-security-releases',
    name: 'Apple security releases',
    publisher: 'Apple',
    measures: 'Security content of every Safari, iOS and macOS update.',
    finding: 'Safari and WebKit fixes ship with Apple’s operating system updates, which also matters for every browser on iPhone.',
    coverage: ['Safari', 'WebKit', 'iOS browsers'],
    caveat: 'Written by the vendor, and older updates are sometimes revised.',
    source: { url: 'https://support.apple.com/en-us/100100', title: 'Apple security releases', accessed: ACCESSED },
  },
  {
    id: 'edge-release-notes',
    name: 'Microsoft Edge release notes',
    publisher: 'Microsoft',
    measures: 'What changed in each Edge Stable release, including security updates.',
    finding: 'Shows which Chromium version each Edge release is based on.',
    coverage: ['Edge'],
    caveat: 'Edge-specific; Chromium fixes are listed by Google.',
    source: { url: 'https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-stable-channel', title: 'Microsoft Edge release notes for Stable channel', accessed: ACCESSED },
  },
];

export const BOUNTIES: Bounty[] = [
  {
    id: 'apple',
    program: 'Apple Security Bounty',
    scope: 'Apple products and services (not specific to Safari)',
    headline: 'Over $5 million with bonuses; base rewards up to $2 million',
    max: 5_000_000,
    note: 'The page lists categories on a separate page, so there is no Safari-only figure here.',
    source: { url: 'https://security.apple.com/bounty/', title: 'Apple Security Bounty', accessed: ACCESSED },
  },
  {
    id: 'mozilla',
    program: 'Mozilla client bug bounty',
    scope: 'Firefox for desktop, Android and iOS, including Nightly and Beta',
    headline: 'Up to $20,000 for critical or high bugs',
    max: 20_000,
    note: 'Sandbox escapes and bypassing WebExtension install prompts are in the top tier.',
    source: { url: 'https://www.mozilla.org/en-US/security/client-bug-bounty/', title: 'Mozilla client bug bounty guidelines', accessed: ACCESSED },
  },
  {
    id: 'chrome',
    program: 'Chrome Vulnerability Reward Program',
    scope: 'Chrome browser, network and GPU processes, renderer and V8',
    headline: 'Up to $20,000 for controlled memory writes from web content and for high-impact sandbox escapes',
    max: 20_000,
    note: 'Announced October 2026: renderer write and use-after-free bugs up to $8,000, V8 sandbox issues $5,000. Read from a news report of Google’s announcement; Google’s own rules page did not load as text.',
    source: { url: 'https://www.helpnetsecurity.com/2026/10/14/google-chrome-vulnerability-rewards-program-updates/', title: 'Help Net Security: Google raises Chrome bug bounty payments (2026-10-14)', accessed: ACCESSED },
  },
  {
    id: 'edge',
    program: 'Microsoft Edge bounty',
    scope: 'Edge (Chromium-based) Dev, Beta and Stable, for bugs that do not reproduce in Chrome',
    headline: '$100 to $30,000, more at Microsoft’s discretion',
    max: 30_000,
    source: { url: 'https://www.microsoft.com/en-us/msrc/bounty-new-edge', title: 'Microsoft Edge Bounty Program', accessed: ACCESSED },
  },
];

const nvd = (cve: string): FactSource => ({ url: `https://nvd.nist.gov/vuln/detail/${cve}`, title: `NVD: ${cve}`, accessed: ACCESSED });

/** Browser-engine bugs CISA added to its exploited list in 2026, newest last. */
export const EXPLOITED_BUGS: ExploitedBug[] = [
  { cve: 'CVE-2026-2441', added: '2026-02-17', family: 'chromium', component: 'CSS', kevName: 'Google Chromium CSS Use-After-Free Vulnerability', source: nvd('CVE-2026-2441') },
  { cve: 'CVE-2023-43000', added: '2026-03-05', family: 'webkit', component: 'WebKit', kevName: 'Apple Multiple products Use-After-Free Vulnerability', note: 'An older bug added to the catalog in 2026. CISA lists the product as Apple Multiple Products.', source: nvd('CVE-2023-43000') },
  { cve: 'CVE-2021-30952', added: '2026-03-05', family: 'webkit', component: 'WebKit', kevName: 'Apple Multiple Products Integer Overflow or Wraparound Vulnerability', note: 'An older bug added to the catalog in 2026. CISA lists the product as Apple Multiple Products.', source: nvd('CVE-2021-30952') },
  { cve: 'CVE-2026-3909', added: '2026-03-13', family: 'chromium', component: 'Skia', kevName: 'Google Skia Out-of-Bounds Write Vulnerability', source: nvd('CVE-2026-3909') },
  { cve: 'CVE-2026-3910', added: '2026-03-13', family: 'chromium', component: 'V8', kevName: 'Google Chromium V8 Improper Restriction of Operations Within the Bounds of a Memory Buffer Vulnerability', source: nvd('CVE-2026-3910') },
  { cve: 'CVE-2025-31277', added: '2026-03-20', family: 'webkit', component: 'WebKit', kevName: 'Apple Multiple Products Buffer Overflow Vulnerability', note: 'An older bug added to the catalog in 2026. CISA lists the product as Apple Multiple Products.', source: nvd('CVE-2025-31277') },
  { cve: 'CVE-2026-5281', added: '2026-04-01', family: 'chromium', component: 'Dawn (WebGPU)', kevName: 'Google Dawn Use-After-Free Vulnerability', source: nvd('CVE-2026-5281') },
  { cve: 'CVE-2026-11645', added: '2026-06-09', family: 'chromium', component: 'V8', kevName: 'Google Chromium V8 Out-of-Bounds Read and Write Vulnerability', source: nvd('CVE-2026-11645') },
  { cve: 'CVE-2026-85046', added: '2026-09-04', family: 'chromium', component: 'V8', kevName: 'Google Chromium V8 Type Confusion Vulnerability', source: nvd('CVE-2026-85046') },
  { cve: 'CVE-2026-87491', added: '2026-09-09', family: 'chromium', component: 'V8', kevName: 'Google Chromium V8 Out of Bounds Write Vulnerability', source: nvd('CVE-2026-87491') },
];

export const FAMILY_LABEL: Record<ExploitedBug['family'], string> = {
  chromium: 'Chromium',
  webkit: 'WebKit',
  gecko: 'Gecko (Firefox)',
  edge: 'Edge only',
};
export const FAMILY_WHO: Record<ExploitedBug['family'], string> = {
  chromium: 'Chrome, Edge, Brave, Opera, Vivaldi and most forks',
  webkit: 'Safari and every browser on iPhone and iPad',
  gecko: 'Firefox, LibreWolf, Tor Browser and forks',
  edge: 'Microsoft Edge specific code',
};
