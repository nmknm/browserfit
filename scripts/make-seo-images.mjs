// Renders the social card (public/og.png) and the app icons (favicon.ico, apple-touch-icon.png, icon-192.png,
// icon-512.png, icon-maskable-512.png) with headless Chrome, using the site's own font, logo and browser icons.
//
//   node scripts/make-seo-images.mjs
//
// Set CHROME to a Chrome or Edge executable if it is not in a standard place. The images are committed, so this
// only needs re-running when the card text or logo changes. The card names no counts on purpose, so it never goes stale.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');

const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) throw new Error('No Chrome or Edge found. Set CHROME to its path.');

const MIME = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
const dataUri = (file) => `data:${MIME[path.extname(file)]};base64,${fs.readFileSync(file).toString('base64')}`;

const font = dataUri(path.join(root, 'node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'));
const logo = dataUri(path.join(pub, 'favicon.svg'));

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'bf-seo-'));

function render(html, out, width, height, background = 'ffffffff') {
  const page = path.join(work, `${path.basename(out)}.html`);
  fs.writeFileSync(page, html);
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--user-data-dir=${path.join(work, 'profile')}`,
      `--default-background-color=${background}`,
      `--window-size=${width},${height}`,
      '--virtual-time-budget=3000',
      `--screenshot=${out}`,
      pathToFileURL(page).href,
    ],
    { stdio: 'ignore' },
  );
  const png = fs.readFileSync(out);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  if (w !== width || h !== height) throw new Error(`${path.basename(out)} came out ${w}x${h}, expected ${width}x${height}`);
  return png;
}

// ---- Social card, 1200x630 ----
const SHOWN = ['chrome', 'firefox', 'edge', 'brave', 'opera', 'vivaldi', 'tor-browser', 'duckduckgo', 'arc', 'zen'];
const iconFiles = fs.readdirSync(path.join(pub, 'icons'));
const tiles = SHOWN.map((id) => {
  const file = iconFiles.find((f) => f.slice(0, f.lastIndexOf('.')) === id);
  if (!file) throw new Error(`No icon for ${id} in public/icons`);
  return `<span class="tile"><img src="${dataUri(path.join(pub, 'icons', file))}" alt=""></span>`;
}).join('');

const card = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Geist; src: url(${font}) format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; overflow: hidden; }
body { font-family: Geist, system-ui, sans-serif; background: #fff; color: #0a0a0b; padding: 68px 76px; display: flex; flex-direction: column; }
.brand { display: flex; align-items: center; gap: 16px; font-size: 34px; font-weight: 600; letter-spacing: -0.02em; }
.brand img { width: 58px; height: 58px; }
h1 { margin-top: 52px; font-size: 88px; line-height: 1.02; font-weight: 650; letter-spacing: -0.04em; }
p { margin-top: 26px; font-size: 32px; line-height: 1.35; color: #5b6170; letter-spacing: -0.01em; white-space: nowrap; }
.tiles { margin-top: auto; display: flex; gap: 14px; }
.tile { width: 84px; height: 84px; border: 1px solid #e4e6ec; border-radius: 22px; display: grid; place-items: center; background: #fff; }
.tile img { width: 54px; height: 54px; object-fit: contain; }
</style>
<div class="brand"><img src="${logo}" alt="">Browserfit</div>
<h1>Every web browser,<br>explained.</h1>
<p>Sourced profiles, security grades, rankings and quizzes.</p>
<div class="tiles">${tiles}</div>`;
render(card, path.join(pub, 'og.png'), 1200, 630);

// ---- App icons ----
const iconPage = (size, background) =>
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:${background}}img{display:block;width:${size}px;height:${size}px}</style><img src="${logo}" alt="">`;
render(iconPage(512, 'transparent'), path.join(pub, 'icon-512.png'), 512, 512, '00000000');
// Maskable variant for Android's adaptive icons: the logo sits inside the central safe zone on a full-bleed background.
render(
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:512px;height:512px;overflow:hidden;background:#fff;display:grid;place-items:center}img{display:block;width:338px;height:338px}</style><img src="${logo}" alt="">`,
  path.join(pub, 'icon-maskable-512.png'),
  512,
  512,
);
render(iconPage(192, 'transparent'), path.join(pub, 'icon-192.png'), 192, 192, '00000000');
render(iconPage(180, '#fff'), path.join(pub, 'apple-touch-icon.png'), 180, 180);
const png48 = render(iconPage(48, 'transparent'), path.join(work, 'icon-48.png'), 48, 48, '00000000');

// favicon.ico holding one PNG image (supported by every current browser; crawlers ask for /favicon.ico by default).
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // one image
header.writeUInt8(48, 6); // width
header.writeUInt8(48, 7); // height
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png48.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
fs.writeFileSync(path.join(pub, 'favicon.ico'), Buffer.concat([header, png48]));

fs.rmSync(work, { recursive: true, force: true });
console.log('Wrote og.png, icon-512.png, icon-192.png, apple-touch-icon.png and favicon.ico in public/');
