import { BROWSERS } from '../lib/data';
import type { BrowserIndex } from '../lib/types';
import { MYTHS } from './learn';
import type { QOption } from './quizzes';
import { ENGINE_BY_ID, FEATURE_BY_ID, FEATURE_INDEX } from './taxonomy';

export type Difficulty = 'easy' | 'medium' | 'expert';

export interface Trivia {
  id: string;
  type: 'trivia' | 'truefalse' | 'order';
  level: Difficulty;
  title: string;
  /** for `order`, the options are listed in the correct order */
  options: QOption[];
  explain: string;
  link?: { to: string; label: string };
}

const T = (id: string, level: Difficulty, title: string, right: string, wrong: string[], explain: string, link?: Trivia['link']): Trivia => {
  const labels = [right, ...wrong];
  return { id, type: 'trivia', level, title, options: labels.map((label, i) => ({ id: 'abcd'[i], label, ...(i === 0 ? { correct: true } : {}) })), explain, link };
};
const TF = (id: string, level: Difficulty, title: string, answer: boolean, explain: string, link?: Trivia['link']): Trivia => ({
  id,
  type: 'truefalse',
  level,
  title,
  options: [
    { id: 't', label: 'True', ...(answer ? { correct: true } : {}) },
    { id: 'f', label: 'False', ...(!answer ? { correct: true } : {}) },
  ],
  explain,
  link,
});
const ORDER = (id: string, level: Difficulty, title: string, inOrder: string[], explain: string, link?: Trivia['link']): Trivia => ({
  id,
  type: 'order',
  level,
  title,
  options: inOrder.map((label, i) => ({ id: `o${i}`, label })),
  explain,
  link,
});

const LEARN: Trivia['link'] = { to: '/learn', label: 'Open the glossary' };
const HISTORY: Trivia['link'] = { to: '/history', label: 'See the history' };
const ENGINES_PAGE: Trivia['link'] = { to: '/engines', label: 'See the engines' };

/**
 * Hand-written questions. Every answer comes from facts already on the site (glossary, history, news and the profiles),
 * so nothing here goes beyond what the rest of the site says.
 */
export const TRIVIA: Trivia[] = [
  T('t1', 'easy', 'Which engine does every browser on iPhone use?', 'WebKit', ['Blink', 'Gecko', 'Each browser uses its own'], 'Apple requires WebKit on iOS and iPadOS. EU rules now allow other engines on iPhone, but none had shipped as of October 2026.', ENGINES_PAGE),
  TF('t2', 'easy', 'Microsoft Edge is built on Chromium.', true, 'Edge switched from its own EdgeHTML engine to Chromium in January 2020.', HISTORY),
  T('t3', 'easy', 'Which of these is NOT based on Firefox?', 'Vivaldi', ['LibreWolf', 'Zen', 'Tor Browser'], 'Vivaldi is built on Chromium. LibreWolf, Zen and Tor Browser are all Firefox-based.', ENGINES_PAGE),
  T('t4', 'medium', 'What did Chrome remove completely in 2026 that broke the full uBlock Origin?', 'Manifest V2 extension support', ['Third-party cookies', 'The Chrome Web Store', 'Incognito mode'], 'Chrome 151 removed the last Manifest V2 flags, and uBlock Origin was delisted from the Chrome Web Store on August 31, 2026.', { to: '/mv2', label: 'See who keeps uBlock Origin' }),
  T('t5', 'medium', 'Which browser shuts down on December 22, 2026?', 'Arc', ['Opera Mini', 'Waterfox', 'Midori'], 'The Browser Company announced Arc’s end in October 2026 and points users to its successor, Dia.', { to: '/news', label: 'Read the news' }),
  TF('t6', 'medium', 'Blink was originally forked from WebKit.', true, 'Google forked WebKit into Blink in 2013. WebKit itself began as a fork of KDE’s KHTML.', ENGINES_PAGE),
  T('t7', 'medium', 'What is “fingerprinting”?', 'Identifying you from your device’s unique characteristics', ['Logging in with a fingerprint sensor', 'A type of cookie', 'Encrypting your traffic'], 'Sites can combine screen size, fonts, GPU and other traits to recognise a device without cookies.', LEARN),
  T('t8', 'expert', 'Ladybird’s engine shares code with which existing engine?', 'None of them', ['WebKit', 'Gecko', 'Blink'], 'Ladybird’s LibWeb engine is written from scratch; it does not reuse Blink, Gecko or WebKit code.', ENGINES_PAGE),
  T('t9', 'expert', 'Mullvad Browser was developed together with…', 'The Tor Project', ['Brave', 'Mozilla', 'Proton'], 'Mullvad Browser is Tor Browser’s anti-fingerprinting design without the Tor network, built with the Tor Project.', { to: '/browser/mullvad-browser', label: 'Open Mullvad Browser' }),
  TF('t10', 'expert', 'Pale Moon uses the Goanna engine, a fork of older Gecko.', true, 'Pale Moon and Basilisk run on Goanna, maintained by Moonchild Productions.', ENGINES_PAGE),
  T('t11', 'easy', 'Which company makes Safari?', 'Apple', ['Google', 'Microsoft', 'Mozilla'], 'Safari is Apple’s browser, first released in 2003.', HISTORY),
  T('t12', 'expert', 'Which Android browser was renamed from “Helium” to avoid confusion with a desktop browser?', 'Titanium', ['Bare', 'Cromite', 'IronFox'], 'In July 2026 the developer renamed “Helium Browser for Android” to Titanium.', { to: '/news', label: 'Read the news' }),
  T('t13', 'easy', 'Which engine powers Chrome, Edge, Brave, Opera and Vivaldi?', 'Blink', ['Gecko', 'WebKit', 'Goanna'], 'Google forked Blink from WebKit in 2013. Chrome, Edge, Brave, Opera, Vivaldi and nearly every fork run on it.', ENGINES_PAGE),
  TF('t14', 'easy', 'Firefox is built on the Gecko engine.', true, 'Gecko is developed by Mozilla. Firefox, LibreWolf, Zen, Floorp, Waterfox, Tor Browser and Mullvad Browser use it.', ENGINES_PAGE),
  T('t15', 'easy', 'What is a browser “fork”?', 'A browser built from another browser’s source code', ['A browser with two windows', 'A tab that splits in half', 'A browser that only runs on phones'], 'Forks change defaults, add features or strip tracking. LibreWolf forks Firefox; Brave and Vivaldi build on Chromium.', LEARN),
  TF('t16', 'easy', 'A private (incognito) window makes you anonymous to websites.', false, 'Private windows only stop the browser saving history on your device. Sites, your ISP and your employer can still see what you do.', LEARN),
  T('t17', 'easy', 'What does HTTPS-only mode do?', 'Refuses unencrypted connections', ['Blocks every ad', 'Hides your IP address', 'Turns off cookies'], 'It upgrades sites to HTTPS and warns before loading anything insecure.', LEARN),
  T('t18', 'easy', 'What is a passkey?', 'A passwordless sign-in tied to your device', ['A password with a special character', 'A key you plug into the browser', 'A shared team password'], 'Passkeys use public-key cryptography, so there’s no password to phish or leak.', LEARN),
  T('t19', 'medium', 'WebKit began as a fork of which project’s engine?', 'KHTML, from KDE', ['Trident', 'NetSurf', 'Gecko'], 'Apple launched Safari on WebKit in 2003, forked from KDE’s KHTML.', HISTORY),
  T('t20', 'medium', 'Which browser did Microsoft launch in 2015 to replace Internet Explorer?', 'Edge', ['Safari', 'Opera', 'Firefox'], 'Edge launched on a new engine, EdgeHTML. It moved to Chromium in 2020.', HISTORY),
  T('t21', 'medium', 'In what year did Google Chrome launch?', '2008', ['2004', '2006', '2011'], 'Chrome launched in 2008 with a process-per-tab design and the V8 JavaScript engine.', HISTORY),
  T('t22', 'medium', 'What does “ESR” stand for in Firefox ESR?', 'Extended Support Release', ['Enhanced Security Release', 'Early Stable Release', 'External Source Repository'], 'ESR is a slower Firefox branch that gets security fixes for about a year without feature changes.', LEARN),
  T('t23', 'medium', 'Which two browsers build on Firefox ESR?', 'Waterfox and Tor Browser', ['Brave and Vivaldi', 'Safari and Orion', 'Edge and Opera'], 'Waterfox and Tor Browser build on ESR, which suits slower, steadier updates.', LEARN),
  T('t24', 'medium', 'What does site isolation protect against?', 'One site reading another site’s memory', ['Slow downloads', 'Pop-up windows', 'Weak passwords'], 'Putting each site in its own process is a defence against Spectre-style attacks.', LEARN),
  T('t25', 'medium', 'Chrome 156, released in October 2026, lets Gemini answer questions about what?', 'Videos you play', ['Your downloads folder', 'Your saved passwords', 'Other browsers’ tabs'], 'Chrome 156 adds Gemini media understanding as a gradual rollout, and fixes more than 350 security issues.', { to: '/news', label: 'Read the news' }),
  T('t26', 'medium', 'Which browser added a single switch to turn off all AI features in version 148?', 'Firefox', ['Chrome', 'Edge', 'Safari'], 'Firefox 148, in February 2026, lets you disable individual AI features or block all of them at once.', { to: '/ai', label: 'See AI browsers' }),
  T('t27', 'medium', 'What does Brave Origin, launched in June 2026, cost?', '$59.99, once', ['It’s free for everyone', '$4.99 a month', '$19.99 a year'], 'Origin removes Leo AI, Rewards, VPN, Wallet and other extras and keeps Brave Shields. Linux users get it free.', { to: '/browser/brave', label: 'Open Brave' }),
  T('t28', 'medium', 'Zen 1.24b can import Spaces from which two browsers?', 'Arc and Dia', ['Safari and Edge', 'Opera and Vivaldi', 'Brave and Chrome'], 'The October 2026 release moves to Firefox 159 and also makes Boosts shareable.', { to: '/browser/zen', label: 'Open Zen' }),
  T('t29', 'medium', 'In October 2026, Kagi said it would end Orion for which systems?', 'Linux and Windows', ['macOS and iOS', 'Android only', 'ChromeOS only'], 'Kagi will open-source both versions and focus on Orion for macOS and iOS. The Linux beta stops receiving updates.', { to: '/news', label: 'Read the news' }),
  TF('t30', 'medium', 'ChatGPT Atlas stopped working in August 2026.', true, 'OpenAI announced the retirement in July and moved agentic browsing into the ChatGPT desktop app and a Chrome extension.', { to: '/news', label: 'Read the news' }),
  T('t31', 'medium', 'Vivaldi 8.2 added what to Vivaldi on Android?', 'Chrome extensions from the Chrome Web Store', ['A built-in VPN', 'Tab sync to a smartwatch', 'An AI assistant'], 'Vivaldi on Android can now install extensions from the Chrome Web Store (MV3).', { to: '/android', label: 'See Android browsers' }),
  TF('t32', 'medium', 'Safari 27 ships with a built-in MCP server for AI agents.', true, 'Safari 27.0 lets AI agents drive the browser for developers, adds customizable select menus and WebAssembly JSPI, and fixes 844 bugs.', { to: '/browser/safari', label: 'Open Safari' }),
  TF('t33', 'easy', 'Widevine is Google’s DRM for protected video.', true, 'Netflix, Disney+ and others need it. Some privacy forks leave it out or make it optional.', LEARN),
  T('t34', 'easy', 'Which was the first web browser, written at CERN in 1990?', 'WorldWideWeb', ['Mosaic', 'Netscape Navigator', 'Internet Explorer'], 'Tim Berners-Lee wrote the first browser and editor at CERN.', HISTORY),
  T('t35', 'medium', 'Which 1993 browser brought images inline with text and popularised the web?', 'NCSA Mosaic', ['Netscape Navigator', 'Internet Explorer', 'Firefox'], 'Netscape followed in 1994, and Internet Explorer in 1995.', HISTORY),
  T('t36', 'expert', 'Tor Browser 16.0 is the first stable release based on which Firefox ESR?', 'ESR 153', ['ESR 115', 'ESR 128', 'ESR 140'], 'It also adds Linux ARM64 and a redesigned Settings page.', { to: '/browser/tor-browser', label: 'Open Tor Browser' }),
  T('t37', 'expert', 'In October 2026, which two browsers blocked flawed eMudhra certificates within hours?', 'Chrome and Firefox', ['Safari and Edge', 'Brave and Opera', 'Vivaldi and Tor Browser'], 'Weak key generation let anyone derive the private keys. Google blocked them in under two hours and Mozilla in under three.', { to: '/news', label: 'Read the news' }),
  T('t38', 'expert', 'What is “prompt injection” in an AI browser?', 'Hidden text on a page that steers an AI agent', ['A way to speed up pages', 'A kind of ad blocker', 'A fast-typing shortcut'], 'A web page can hide instructions an agent obeys as if you wrote them. It is the main new risk of agentic browsers.', LEARN),
  T('t39', 'expert', 'Which release channel gets new features first, with the most bugs?', 'Nightly', ['Stable', 'Beta', 'Extended Support'], 'Channels run Stable, Beta, Dev and Nightly. Most people should use Stable.', LEARN),
  T('t40', 'expert', 'What does “patch lag” mean?', 'How long a fork takes to ship upstream security fixes', ['The delay before a page loads', 'The gap between two releases of a browser', 'Slow typing in the address bar'], 'Small forks can trail Chrome or Firefox by days or weeks, leaving known holes open.', { to: '/security', label: 'See security grades' }),
  ORDER('t41', 'medium', 'Put these browsers in the order they launched, earliest first.', ['Mosaic (1993)', 'Internet Explorer (1995)', 'Firefox 1.0 (2004)', 'Chrome (2008)'], 'Mosaic 1993, Internet Explorer 1995, Firefox 1.0 in 2004 and Chrome in 2008.', HISTORY),
  ORDER('t42', 'medium', 'Put these in the order they appeared, earliest first.', ['Safari (2003)', 'Firefox 1.0 (2004)', 'Chrome (2008)', 'Edge on EdgeHTML (2015)'], 'Safari 2003, Firefox 1.0 in 2004, Chrome in 2008 and Edge in 2015.', HISTORY),
  ORDER('t43', 'expert', 'Put these engines in the order they were created, earliest first.', ['KHTML (1998)', 'WebKit (2001)', 'Blink (2013)', 'LibWeb (2022)'], 'Each of the first three grew from the one before it. LibWeb is written from scratch.', ENGINES_PAGE),
];

/* ------------------------------ generated questions ------------------------------ */

/** A small seeded random generator, so a run can be rebuilt from its seed. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], rnd: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const known = (b: BrowserIndex) => b.status !== 'discontinued' && b.confidence !== 'low';
const levelOf = (b: BrowserIndex): Difficulty => (b.group === 'mainstream' ? 'easy' : ['privacy', 'power', 'ai'].includes(b.group) ? 'medium' : 'expert');
const profile = (b: BrowserIndex): Trivia['link'] => ({ to: `/browser/${b.id}`, label: `Open ${b.name}` });
const SHOWN_ENGINES = ['blink', 'gecko', 'webkit', 'libweb', 'goanna', 'servo'];

function options(right: string, wrong: string[], rnd: () => number): QOption[] {
  return shuffle([right, ...wrong], rnd).map((label, i) => ({ id: 'abcd'[i], label, ...(label === right ? { correct: true } : {}) }));
}

const GENERATORS: ((b: BrowserIndex, all: BrowserIndex[], rnd: () => number, n: number) => Trivia | null)[] = [
  // Which engine does X use?
  (b, _all, rnd, n) => {
    if (!SHOWN_ENGINES.includes(b.engine)) return null;
    const right = ENGINE_BY_ID[b.engine].name;
    const wrong = shuffle(SHOWN_ENGINES.filter((e) => e !== b.engine), rnd).slice(0, 3).map((e) => ENGINE_BY_ID[e as keyof typeof ENGINE_BY_ID].name);
    return { id: `g${n}`, type: 'trivia', level: levelOf(b), title: `Which engine does ${b.name} use?`, options: options(right, wrong, rnd), explain: `${b.name} runs on ${right}. ${ENGINE_BY_ID[b.engine].blurb}`, link: profile(b) };
  },
  // Who makes X?
  (b, all, rnd, n) => {
    const others = [...new Set(all.filter((x) => x.developer !== b.developer && x.group === b.group).map((x) => x.developer))];
    const more = [...new Set(all.filter((x) => x.developer !== b.developer).map((x) => x.developer))];
    const wrong = shuffle(others.length >= 3 ? others : more, rnd).slice(0, 3);
    if (wrong.length < 3 || !b.developer) return null;
    return { id: `g${n}`, type: 'trivia', level: levelOf(b), title: `Who makes ${b.name}?`, options: options(b.developer, wrong, rnd), explain: `${b.name} is made by ${b.developer}${b.hq ? `, based in ${b.hq}` : ''}.`, link: profile(b) };
  },
  // Which of these was released first?
  (_b, all, rnd, n) => {
    const picks: BrowserIndex[] = [];
    for (const c of shuffle(all.filter((x) => x.group === 'mainstream' || x.group === 'privacy' || x.group === 'power'), rnd)) {
      if (picks.length < 4 && c.releaseYear > 1990 && !picks.some((p) => p.releaseYear === c.releaseYear)) picks.push(c);
    }
    if (picks.length < 4) return null;
    const first = [...picks].sort((a, z) => a.releaseYear - z.releaseYear)[0];
    return {
      id: `g${n}`,
      type: 'trivia',
      level: 'medium',
      title: 'Which of these browsers was released first?',
      options: options(first.name, picks.filter((p) => p !== first).map((p) => p.name), rnd),
      explain: picks.sort((a, z) => a.releaseYear - z.releaseYear).map((p) => `${p.name} ${p.releaseYear}`).join(', ') + '.',
      link: profile(first),
    };
  },
  // Which of these has feature X, according to our data?
  (_b, all, rnd, n) => {
    const fid = shuffle(['verticalTabs', 'uboFull', 'builtinVpn', 'torWindows', 'e2eeSync', 'splitView', 'workspaces', 'translation', 'tabSleeping'], rnd)[0];
    const code = (x: BrowserIndex) => x.features[FEATURE_INDEX[fid]]?.[0] ?? 0;
    const yes = shuffle(all.filter((x) => code(x) === 2 && x.group !== 'regional'), rnd)[0];
    const no = shuffle(all.filter((x) => code(x) === 0 && x.group !== 'regional'), rnd).slice(0, 3);
    if (!yes || no.length < 3) return null;
    const name = FEATURE_BY_ID[fid].name;
    return {
      id: `g${n}`,
      type: 'trivia',
      level: 'expert',
      title: `Which of these browsers has ${name.toLowerCase()}, according to our data?`,
      options: options(yes.name, no.map((x) => x.name), rnd),
      explain: `${yes.name} has ${name.toLowerCase()}. ${no.map((x) => x.name).join(', ')} do not, as of our October 2026 research.`,
      link: { to: '/matrix', label: 'Open the feature matrix' },
    };
  },
  // Is X open source?
  (b, _all, _rnd, n) => {
    if (b.openSource === 'partial' || !['mainstream', 'privacy', 'power', 'ai'].includes(b.group)) return null;
    return {
      id: `g${n}`,
      type: 'truefalse',
      level: 'medium',
      title: `${b.name} is open source.`,
      options: [
        { id: 't', label: 'True', ...(b.openSource ? { correct: true } : {}) },
        { id: 'f', label: 'False', ...(!b.openSource ? { correct: true } : {}) },
      ],
      explain: b.openSource ? `${b.name}’s code is open${b.license ? ` (${b.license})` : ''}.` : `${b.name} is not fully open source${b.license ? `: ${b.license}` : ''}.`,
      link: profile(b),
    };
  },
];

/** Questions made from the profiles. They change with the data, so they never go stale. */
export function generated(rnd: () => number, count: number): Trivia[] {
  const all = BROWSERS.filter(known);
  const out: Trivia[] = [];
  const titles = new Set<string>();
  for (let tries = 0; out.length < count && tries < count * 12; tries++) {
    const b = all[Math.floor(rnd() * all.length)];
    const make = GENERATORS[Math.floor(rnd() * GENERATORS.length)];
    const q = make(b, all, rnd, out.length);
    if (q && !titles.has(q.title)) {
      titles.add(q.title);
      out.push({ ...q, id: `g-${out.length}-${q.title.length}` });
    }
  }
  return out;
}

/** The myths and facts from the glossary as true/false statements. Each myth appears once, as either the myth or the fact. */
function mythQuestions(rnd: () => number): Trivia[] {
  return MYTHS.map((m, i) => {
    const asMyth = rnd() < 0.5;
    return {
      id: `m${i}`,
      type: 'truefalse' as const,
      level: 'medium' as const,
      title: asMyth ? m.myth : m.fact,
      options: [
        { id: 't', label: 'True', ...(!asMyth ? { correct: true } : {}) },
        { id: 'f', label: 'False', ...(asMyth ? { correct: true } : {}) },
      ],
      explain: asMyth ? `That’s a myth. ${m.fact}` : `That’s right. People often believe: “${m.myth}”`,
      link: LEARN,
    };
  });
}

export const RUN_LENGTH = 10;

/** Ten questions for one run. The seed makes the draw repeatable within the run. */
export function buildRun(mode: 'iq' | 'myths', level: Difficulty | 'all', seed: number): Trivia[] {
  const rnd = rng(seed);
  if (mode === 'myths') return shuffle(mythQuestions(rnd), rnd).slice(0, RUN_LENGTH);
  const pool = [...TRIVIA, ...generated(rnd, 36)];
  const by = (l: Difficulty) => shuffle(pool.filter((q) => q.level === l), rnd);
  if (level !== 'all') return by(level).slice(0, RUN_LENGTH);
  return shuffle([...by('easy').slice(0, 4), ...by('medium').slice(0, 3), ...by('expert').slice(0, 3)], rnd);
}

