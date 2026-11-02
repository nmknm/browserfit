// Converts research/raw/*.json (agent fact sheets) into the app's data bundle:
//   src/data/generated/index.json         compact, always loaded
//   src/data/generated/detail/<id>.json   heavy, lazy loaded per browser
// Validates ids, clamps scores, fills gaps, and reports problems.
import fs from 'node:fs';
import path from 'node:path';
import { deriveSecurity } from './security-derive.mjs';
import { parseMinOs } from './minos.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const rawDir = path.join(root, 'research', 'raw');
const outDir = path.join(root, 'src', 'data', 'generated');
const detailDir = path.join(outDir, 'detail');
fs.mkdirSync(detailDir, { recursive: true });

const taxonomy = fs.readFileSync(path.join(root, 'src', 'data', 'taxonomy.ts'), 'utf8');
const CATEGORY_IDS = [...taxonomy.matchAll(/^\s*c\('([a-zA-Z]+)'/gm)].map((m) => m[1]);
const FEATURE_IDS = [...taxonomy.matchAll(/^\s*f\('([a-zA-Z0-9]+)'/gm)].map((m) => m[1]);
const SUPPORT_CODES = ['no', 'partial', 'yes', 'extension', 'paid'];
const OS = ['windows', 'macos', 'linux', 'android', 'ios', 'chromeos'];
const ENGINES = ['blink', 'gecko', 'webkit', 'libweb', 'goanna', 'servo', 'netsurf', 'dillo', 'text', 'multi', 'trident-legacy', 'edgehtml-legacy'];
const STATUSES = ['active', 'beta', 'alpha', 'early-access', 'maintenance', 'sunsetting', 'discontinued'];
const STORES = ['google-play', 'f-droid', 'izzy', 'github', 'accrescent', 'preinstalled', 'apk', 'app-store', 'mac-app-store', 'microsoft-store', 'winget', 'homebrew', 'flathub', 'snap', 'aur', 'deb', 'rpm', 'official-installer', 'portable'];

// Security: reference engine versions and optional researched overrides (never written into research/raw).
const securityDir = path.join(root, 'research', 'security');
const enginesFile = path.join(root, 'research', 'engines.json');
const engines = fs.existsSync(enginesFile) ? JSON.parse(fs.readFileSync(enginesFile, 'utf8')) : {};
const readSecurityOverride = (id) => {
  const file = path.join(securityDir, `${id}.json`);
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    warn.push(`${id}: invalid security JSON (${e.message})`);
    return undefined;
  }
};

if (CATEGORY_IDS.length !== 40) throw new Error(`Expected 40 categories, got ${CATEGORY_IDS.length}`);
if (FEATURE_IDS.length !== 68) throw new Error(`Expected 68 features, got ${FEATURE_IDS.length}`);

// Identity hues for monograms (approximate brand hue, not logos).
const HUES = {
  chrome: 'oklch(0.6 0.17 145)', edge: 'oklch(0.58 0.14 200)', firefox: 'oklch(0.66 0.19 45)', safari: 'oklch(0.6 0.16 240)',
  opera: 'oklch(0.57 0.21 25)', 'opera-gx': 'oklch(0.58 0.22 15)', 'opera-air': 'oklch(0.62 0.12 200)', 'opera-neon': 'oklch(0.68 0.2 140)', 'opera-mini': 'oklch(0.57 0.21 25)',
  brave: 'oklch(0.63 0.2 38)', vivaldi: 'oklch(0.58 0.2 25)', 'tor-browser': 'oklch(0.48 0.16 300)', librewolf: 'oklch(0.58 0.14 255)',
  'mullvad-browser': 'oklch(0.48 0.1 250)', duckduckgo: 'oklch(0.62 0.19 40)', zen: 'oklch(0.32 0.02 260)', arc: 'oklch(0.6 0.18 280)',
  dia: 'oklch(0.55 0.16 270)', comet: 'oklch(0.55 0.08 200)', samsung: 'oklch(0.55 0.18 275)', 'samsung-browser': 'oklch(0.55 0.18 275)',
  waterfox: 'oklch(0.58 0.14 230)', floorp: 'oklch(0.6 0.14 200)', orion: 'oklch(0.6 0.16 300)', helium: 'oklch(0.55 0.12 230)',
  titanium: 'oklch(0.5 0.04 250)', bare: 'oklch(0.4 0.02 260)', ladybird: 'oklch(0.6 0.2 25)', chromium: 'oklch(0.58 0.13 240)',
};
function hashHue(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `oklch(0.56 0.13 ${h % 360})`;
}

// Short display names: drop corporate prefixes and a redundant trailing "Browser".
const NAME_OVERRIDES = {
  firefox: 'Firefox', safari: 'Safari', chrome: 'Chrome', edge: 'Edge', zen: 'Zen', bare: 'Bare', titanium: 'Titanium',
  comet: 'Comet', duckduckgo: 'DuckDuckGo', 'sigma-ai': 'Sigma AI', genspark: 'Genspark', quetta: 'Quetta', lemur: 'Lemur',
  mises: 'Mises', via: 'Via', puffin: 'Puffin', aloha: 'Aloha', rill: 'Rill', kiwi: 'Kiwi', 'opera': 'Opera', 'samsung-browser': 'Samsung Browser',
  'edge-legacy': 'Edge Legacy', 'internet-explorer': 'Internet Explorer', 'chatgpt-atlas': 'ChatGPT Atlas', 'google-disco': 'Google Disco',
  ghostery: 'Ghostery', island: 'Island',
};
function displayName(id, name) {
  if (NAME_OVERRIDES[id]) return NAME_OVERRIDES[id];
  return name.replace(/^(Mozilla|Apple|Google|Microsoft|Perplexity|Kagi|Zoho)\s+(?=\S)/, '');
}

const clamp = (n) => Math.max(0, Math.min(10, Math.round(Number(n) * 2) / 2));
const warn = [];
const str = (v, d = '') => (typeof v === 'string' ? v : d);
const arr = (v) => (Array.isArray(v) ? v : []);

function grade(scores) {
  const g = (id) => scores[CATEGORY_IDS.indexOf(id)];
  const v = g('privacyDefaults') * 0.3 + g('blocking') * 0.2 + g('fingerprinting') * 0.15 + g('telemetry') * 0.2 + g('businessTrust') * 0.15;
  if (v >= 8.5) return 'A';
  if (v >= 7.5) return 'B';
  if (v >= 6.5) return 'C';
  if (v >= 5) return 'D';
  if (v >= 3.5) return 'E';
  return 'F';
}

const files = fs.existsSync(rawDir) ? fs.readdirSync(rawDir).filter((f) => f.endsWith('.json')) : [];
const index = [];
const seen = new Set();

for (const file of files.sort()) {
  let r;
  try {
    r = JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf8'));
  } catch (e) {
    warn.push(`${file}: invalid JSON (${e.message})`);
    continue;
  }
  const id = str(r.id, file.replace(/\.json$/, ''));
  if (seen.has(id)) {
    warn.push(`${id}: duplicate id`);
    continue;
  }
  seen.add(id);

  const engine = ENGINES.includes(r.engine) ? r.engine : (warn.push(`${id}: unknown engine ${r.engine}`), 'blink');
  const status = STATUSES.includes(r.status) ? r.status : (warn.push(`${id}: unknown status ${r.status}`), 'active');

  // scores
  const scoreNotes = {};
  const scores = CATEGORY_IDS.map((cid) => {
    const s = r.scores?.[cid];
    if (!s) {
      warn.push(`${id}: missing score ${cid}`);
      return 0;
    }
    const [n, why, ev] = Array.isArray(s) ? s : [s.score ?? s, s.why ?? '', s.evidence ?? 'editorial'];
    // Scores inherited from a similar browser are labelled honestly as estimates.
    const estimated = /^baseline from/i.test(str(why));
    scoreNotes[cid] = [estimated ? 'Estimated from a similar browser; not separately evaluated' : str(why), estimated ? 'editorial' : ['measured-public', 'documented', 'editorial'].includes(ev) ? ev : 'editorial'];
    return clamp(n);
  });

  // features
  const featureNotes = {};
  const features = FEATURE_IDS.map((fid) => {
    const v = r.features?.[fid];
    if (!v) {
      warn.push(`${id}: missing feature ${fid}`);
      return [0, 0];
    }
    const [sup, rating, note] = Array.isArray(v) ? v : [v.support, v.rating, v.note];
    let code = SUPPORT_CODES.indexOf(sup);
    if (code < 0) {
      warn.push(`${id}: bad support ${fid}=${sup}`);
      code = 0;
    }
    if (note) featureNotes[fid] = String(note);
    return [code, clamp(rating ?? 0)];
  });

  // platforms
  const platforms = {};
  for (const os of OS) {
    const p = r.platforms?.[os];
    if (!p) continue;
    const scoreDelta = {};
    for (const [k, v] of Object.entries(p.scoreDelta ?? {})) {
      if (CATEGORY_IDS.includes(k) && Number.isFinite(Number(v))) scoreDelta[k] = Number(v);
    }
    platforms[os] = {
      status: STATUSES.includes(p.status) ? p.status : status,
      minOs: str(p.minOs) || undefined,
      // A number the old-device finder can compare; only set for OSes with real version numbers.
      ...(['windows', 'macos', 'android', 'ios'].includes(os) && p.minOs ? { minOsFloor: parseMinOs(os, str(p.minOs)) } : {}),
      arch: arr(p.arch).map(String),
      stores: arr(p.stores).filter((s) => STORES.includes(s)),
      notes: arr(p.notes).map(String).slice(0, 6),
      highlights: arr(p.highlights).map(String).slice(0, 6),
      ...(Object.keys(scoreDelta).length ? { scoreDelta } : {}),
      ...(r.keyFacts?.engineByOs?.[os] && ENGINES.includes(r.keyFacts.engineByOs[os]) ? { engine: r.keyFacts.engineByOs[os] } : {}),
    };
    const unknownStores = arr(p.stores).filter((s) => !STORES.includes(s));
    if (unknownStores.length) warn.push(`${id}/${os}: unknown stores ${unknownStores.join(',')}`);
  }
  if (!Object.keys(platforms).length) warn.push(`${id}: no platforms`);

  const kf = r.keyFacts ?? {};
  const keyFacts = {
    sync: { type: kf.sync?.type ?? 'none', items: arr(kf.sync?.items), crossOs: !!kf.sync?.crossOs, note: str(kf.sync?.note) },
    passwordManager: { level: kf.passwordManager?.level ?? 'none', passkeys: !!kf.passwordManager?.passkeys, breachCheck: !!kf.passwordManager?.breachCheck, note: str(kf.passwordManager?.note) },
    mv2: { level: kf.mv2?.level ?? 'no-extensions', note: str(kf.mv2?.note), date: str(kf.mv2?.date) },
    ublock: kf.ublock ?? 'none',
    mobileExtensions: { android: kf.mobileExtensions?.android ?? 'n/a', ios: kf.mobileExtensions?.ios ?? 'n/a' },
    ai: { level: kf.ai?.level ?? 'none', killSwitch: !!kf.ai?.killSwitch, paid: kf.ai?.paid ?? false, note: str(kf.ai?.note) },
    privacy: { defaults: str(kf.privacy?.defaults), telemetry: str(kf.privacy?.telemetry), jurisdiction: str(kf.privacy?.jurisdiction, str(r.hq)) },
    privacyGrade: grade(scores),
  };

  const sec = deriveSecurity({ ...r, id, engine, status }, engines, readSecurityOverride(id));
  warn.push(...sec.warnings);

  index.push({
    id,
    name: displayName(id, str(r.name, id)),
    group: str(r.group, 'mainstream'),
    developer: str(r.developer),
    hq: str(r.hq),
    engine,
    basedOn: str(r.basedOn),
    openSource: r.openSource === 'partial' ? 'partial' : !!r.openSource,
    license: str(r.license),
    price: ['free', 'freemium', 'paid'].includes(r.price) ? r.price : 'free',
    releaseYear: Number(r.releaseYear) || 0,
    status,
    statusNote: str(r.statusNote),
    version: { current: str(r.version?.current), date: str(r.version?.date), upstream: str(r.version?.upstream) || undefined },
    tags: arr(r.tags).map(String).slice(0, 8),
    pitch: str(r.pitch),
    website: str(r.website),
    color: HUES[id] ?? hashHue(id),
    keyFacts,
    security: sec.facts,
    platforms,
    scores,
    features,
    confidence: ['high', 'medium', 'low'].includes(r.confidence) ? r.confidence : 'medium',
    lastVerified: str(r.lastVerified, '2026-10-29'),
  });

  const detail = {
    id,
    aliases: [...new Set([str(r.name), ...arr(r.aliases)].filter((a) => a && a !== displayName(id, str(r.name, id))))],
    businessModel: str(r.businessModel),
    paidNote: str(r.paidNote) || undefined,
    channels: arr(r.channels),
    updateCadence: str(r.updateCadence),
    summary: str(r.summary),
    bestFor: arr(r.bestFor),
    notFor: arr(r.notFor),
    pros: arr(r.pros),
    cons: arr(r.cons),
    signatureFeatures: arr(r.signatureFeatures),
    faq: arr(r.faq),
    timeline: arr(r.timeline),
    switching: { imports: arr(r.switching?.imports), note: str(r.switching?.note) },
    alternatives: arr(r.alternatives),
    spec: Object.fromEntries(Object.entries(r.spec ?? {}).map(([k, v]) => [k, String(v)])),
    scoreNotes,
    featureNotes,
    sources: arr(r.sources).filter((s) => s && s.url),
    unverified: arr(r.unverified),
    engineByOs: kf.engineByOs ?? undefined,
    security: sec.detail,
  };
  fs.writeFileSync(path.join(detailDir, `${id}.json`), JSON.stringify(detail));
}

// prune alternatives referencing unknown ids happens at runtime; keep stable order by name
index.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index));
fs.writeFileSync(path.join(outDir, 'engines.json'), JSON.stringify(engines));

console.log(`Built ${index.length} browsers from ${files.length} files.`);
if (warn.length) {
  const counts = {};
  for (const w of warn) counts[w.split(':')[0]] = (counts[w.split(':')[0]] ?? 0) + 1;
  console.log(`${warn.length} warnings. First 40:`);
  for (const w of warn.slice(0, 40)) console.log('  - ' + w);
}
