// Collects a logo for each browser: simple-icons (CC0 vector) where it has one,
// otherwise the icon the browser's own site declares. Writes public/icons/* and
// src/data/generated/icons.json. Browsers with no usable icon keep the monogram.
//   npm i --no-save simple-icons && node scripts/fetch-icons.mjs
//   ONLY=ghostery,netsurf node scripts/fetch-icons.mjs   (only these; keeps the other icons)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });
const index = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/index.json'), 'utf8'));
const browsers = Array.isArray(index) ? index : index.browsers;

let si = {};
try {
  si = createRequire(import.meta.url)('simple-icons');
} catch {
  console.warn('simple-icons not installed; only site icons will be used');
}

// browser id -> simple-icons export name
const SI = {
  chrome: 'siGooglechrome', firefox: 'siFirefox', 'firefox-focus': 'siFirefoxbrowser', safari: 'siSafari',
  brave: 'siBrave', opera: 'siOpera', 'opera-gx': 'siOperagx', vivaldi: 'siVivaldi', 'tor-browser': 'siTorbrowser',
  duckduckgo: 'siDuckduckgo', arc: 'siArc', librewolf: 'siLibrewolf', floorp: 'siFloorp', zen: 'siZenbrowser',
  'mullvad-browser': 'siMullvad', 'naver-whale': 'siNaver', 'huawei-browser': 'siHuawei', 'mi-browser': 'siXiaomi',
  'qq-browser': 'siQq', comet: 'siPerplexity', 'fennec-fdroid': 'siFdroid', vanadium: 'siGrapheneos',
  'gnome-web': 'siGnome', konqueror: 'siKde', falkon: 'siKde', 'gnu-icecat': 'siGnuicecat',
};

// Sites that aren't the browser's own, so their favicon would be the wrong brand.
const NOT_OWN = /(^|\.)(github\.com|wikipedia\.org|toolfolio\.com|flaviocopes\.com|play\.google\.com|f-droid\.org|substack\.com|sourceforge\.net|learn\.microsoft\.com|grapheneos\.org|divestos\.org|apps\.kde\.org|apps\.gnome\.org|gnu\.org|chatgpt\.com|labs\.google)$/;

// Black-and-white site icons: inverted in dark mode so the logo stays visible without a white tile.
const INVERT_IN_DARK = new Set(['aside', 'polar', 'opera-neon']);
// Site icons that render blank.
const SKIP = new Set();

// Per-browser icon URL where the site's declared icon is wrong (another brand's), outdated, or missing; null = skip the site.
// Commons names are the current logo (P154) of the browser's Wikidata item; Play URLs are the store listing's icon.
const commons = (file) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}`;
const SITE_OVERRIDE = {
  safari: null, // apple.com serves the Apple logo
  falkon: 'https://commons.wikimedia.org/wiki/Special:FilePath/Icon_of_Falkon_3.0.svg',
  'gnome-web': 'https://commons.wikimedia.org/wiki/Special:FilePath/GNOME_Web_logo_(2021-03).svg',
  'tor-browser': commons('Tor Browser icon (New).png'), // torproject.org still declares the pre-2023 onion
  'internet-explorer': commons('Internet Explorer 10+11 logo.svg'),
  'edge-legacy': commons('Microsoft Edge logo (2015–2019).svg'),
  netscape: commons('Netscape icon.svg'),
  bromite: commons('Bromite logo.svg'),
  cromite: commons('Cromite Logo.png'),
  'ungoogled-chromium': commons('Ungoogled-chromium logo.webp'),
  trivalent: commons('Trivalent.svg'),
  'chatgpt-atlas': commons('ChatGPT Atlas Logo.png'),
  via: commons('Via Browser logo.png'),
  netsurf: commons('NetSurf-logo.svg'),
  'srware-iron': commons('Iron logo.png'),
  'k-meleon': commons('KM-circle.png'),
  seamonkey: commons('SeaMonkey.svg'),
  yandex: commons('Yandex Browser icon.svg'),
  kiwi: 'https://github.com/kiwibrowser.png?size=256', // org avatar is the app icon
  blanc: 'https://raw.githubusercontent.com/bnfy/blanc/main/assets/sunrise-app-icon.png',
  iceraven: 'https://raw.githubusercontent.com/fork-maintainers/iceraven-browser/iceraven/app/src/forkRelease/res/mipmap-xxxhdpi/ic_launcher.png',
  nyxt: 'https://raw.githubusercontent.com/atlas-engineer/nyxt/master/assets/icons/nyxt_256x256.png',
  lemur: 'https://play-lh.googleusercontent.com/Mfk-PRbMViXSvER0Ma-4yMSPo9CqDILU30xGvhk-S1SYhNy6U27rTYmWSFBdpMnezpISkwED_owQLjmzaFn1McA=s256',
  jiosphere: 'https://play-lh.googleusercontent.com/8U759tGG-KRwn6lih4x47SE6lgF69R0JW5jEaqxOoe9c3zx-7jlnG59vX0ZPGHOSHjehIXVIz7zZ3JNa82B3Ng=s256',
  'phoenix-browser': 'https://play-lh.googleusercontent.com/ndCQwi8PJu8yvL4etcxrjAqZJJUPq6saEUSAT5BkU5aUXgow5Xy7zBcMg-CQgU8ZAwxYwnTZBFgZbac_ce3usTQ=s256',
  titanium: 'https://play-lh.googleusercontent.com/4JZbe1aLNMxey4NdYOhKci_U5OIe9mVw6PmG6vCSs_-rNs4lo3TEGFdJvUTcU2qzch2T3WkmPVCILYU-uBWung=s256',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
// Wikimedia rejects browser-spoofing user agents; it wants a descriptive one.
const WIKIMEDIA_UA = 'browserfit-icon-fetch/1.0 (https://github.com/; icon collection script)';
const get = (url, opts = {}) => fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': /wikimedia\.org$/.test(new URL(url).hostname) ? WIKIMEDIA_UA : UA }, ...opts });

function sniff(buf) {
  if (buf.length < 16) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.slice(0, 3).toString() === 'GIF') return 'gif';
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return 'ico';
  if (/<svg[\s>]/i.test(buf.slice(0, 1500).toString('utf8'))) return 'svg';
  return null;
}

/** Declared icons of a page, best first (apple-touch/svg/big before small). */
function declaredIcons(html, base) {
  const out = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1].toLowerCase() ?? '';
    if (!/icon/.test(rel) || /mask-icon/.test(rel)) continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href || href.startsWith('data:')) continue;
    const sizes = /sizes\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? '';
    const px = sizes === 'any' ? 512 : parseInt(sizes) || 0;
    let url;
    try { url = new URL(href, base).href; } catch { continue; }
    const score = (rel.includes('apple') ? 1000 : 0) + (/\.svg(\?|$)/i.test(url) ? 900 : 0) + Math.min(px, 512);
    out.push({ url, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out.map((o) => o.url);
}

async function fetchImage(url) {
  try {
    const r = await get(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const kind = sniff(buf);
    return kind && buf.length < 400_000 ? { buf, kind } : null;
  } catch { return null; }
}

async function siteIcon(site) {
  const host = new URL(site).hostname;
  if (NOT_OWN.test(host)) return null;
  const candidates = [];
  try {
    const r = await get(site);
    if (r.ok) candidates.push(...declaredIcons(await r.text(), r.url));
  } catch { /* fall through to generic lookups */ }
  const origin = new URL(site).origin;
  candidates.push(`${origin}/apple-touch-icon.png`, `${origin}/favicon.ico`, `https://www.google.com/s2/favicons?domain=${host}&sz=128`);
  for (const url of candidates) {
    const img = await fetchImage(url);
    if (img) return img;
  }
  return null;
}

// Every browser simple-icons covers also keeps its single-colour glyph, which chips draw in place of the full-colour logo.
function addGlyphs(icons) {
  for (const [id, name] of Object.entries(SI)) {
    const g = si[name];
    if (!g || !icons[id]) continue;
    icons[id].glyph = { path: g.path, hex: '#' + g.hex };
  }
}

// GLYPHS_ONLY=1 re-attaches the glyphs to the existing icons.json without fetching anything.
if (process.env.GLYPHS_ONLY) {
  const file = path.join(root, 'src/data/generated/icons.json');
  const icons = JSON.parse(fs.readFileSync(file, 'utf8'));
  addGlyphs(icons);
  fs.writeFileSync(file, JSON.stringify(icons));
  console.log('glyphs:', Object.values(icons).filter((v) => v.glyph || v.kind === 'svg').length);
  process.exit(0);
}

// ONLY=id1,id2 refreshes just those browsers and keeps every other icon as it is.
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const iconsPath = path.join(root, 'src/data/generated/icons.json');
const result = only && fs.existsSync(iconsPath) ? JSON.parse(fs.readFileSync(iconsPath, 'utf8')) : {};
const fromSite = [];
for (const b of browsers) {
  if (only && !only.has(b.id)) continue;
  for (const f of fs.readdirSync(outDir)) if (f.startsWith(b.id + '.')) fs.rmSync(path.join(outDir, f));
  delete result[b.id];
  fromSite.push(b);
}

const queue = [...fromSite];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const b = queue.shift();
    const img = SKIP.has(b.id) || SITE_OVERRIDE[b.id] === null ? null : await (SITE_OVERRIDE[b.id] ? fetchImage(SITE_OVERRIDE[b.id]) : siteIcon(b.website)).catch(() => null);
    if (!img) {
      // Full-colour site icon unavailable: fall back to the single-colour simple-icons glyph in its brand colour.
      const glyph = SI[b.id] && si[SI[b.id]];
      if (glyph) result[b.id] = { kind: 'svg', path: glyph.path, hex: '#' + glyph.hex };
      else console.log('  no icon:', b.id);
      continue;
    }
    const file = `${b.id}.${img.kind}`;
    fs.writeFileSync(path.join(outDir, file), img.buf);
    result[b.id] = { kind: 'img', file, ...(INVERT_IN_DARK.has(b.id) && { invert: true }) };
  }
}));

addGlyphs(result);
const sorted = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(path.join(root, 'src/data/generated/icons.json'), JSON.stringify(sorted));
const n = Object.keys(sorted).length;
console.log(`icons: ${n}/${browsers.length} (svg ${Object.values(sorted).filter((v) => v.kind === 'svg').length}, site ${Object.values(sorted).filter((v) => v.kind === 'img').length})`);
