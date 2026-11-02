// Site icons arrive in whatever size the browser's own site serves: a dozen of ours were 100-390 KB each and are
// drawn at 18-88 px, which made them most of the home page's weight. This scales every heavy raster icon down to
// at most 192 px and re-saves it as PNG or WebP, whichever is smaller (vector icons are left alone).
// Uses a local Chrome to decode and draw (handles ico/webp/png); set CHROME to override its path.
//   node scripts/fetch-icons.mjs && node scripts/clean-icons.mjs && node scripts/shrink-icons.mjs
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const iconsDir = path.join(root, 'public', 'icons');
const jsonPath = path.join(root, 'src/data/generated/icons.json');
const icons = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const RASTER = new Set(['.png', '.ico', '.webp', '.jpg', '.jpeg', '.gif']);
const HEAVY_BYTES = 20 * 1024; // leave anything lighter than this as it is
const MAX_SIDE = 192; // the largest mark is drawn at 88 px, so this still covers a 2x screen
const MIN_SAVING = 0.15; // only swap a file when the new one is at least this much smaller

const files = Object.entries(icons)
  .filter(([, v]) => v.kind === 'img')
  .map(([id, v]) => ({ id, file: v.file, bytes: fs.statSync(path.join(iconsDir, v.file)).size }))
  .filter((f) => RASTER.has(path.extname(f.file).toLowerCase()) && f.bytes > HEAVY_BYTES);

if (!files.length) {
  console.log('no heavy icons to shrink');
  process.exit(0);
}

const page = `<!doctype html><body><script>
const files = ${JSON.stringify(files)};
const MAX = ${MAX_SIDE};
async function run() {
  const out = {};
  for (const f of files) {
    try {
      const img = new Image();
      img.src = '/icons/' + f.file;
      await img.decode();
      const nw = img.naturalWidth || MAX, nh = img.naturalHeight || MAX;
      const s = Math.min(1, MAX / Math.max(nw, nh));
      const w = Math.max(1, Math.round(nw * s)), h = Math.max(1, Math.round(nh * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, 0, 0, w, h);
      out[f.id] = { w, h, png: c.toDataURL('image/png'), webp: c.toDataURL('image/webp', 0.92) };
    } catch (e) { out[f.id] = null; }
  }
  await fetch('/result', { method: 'POST', body: JSON.stringify(out) });
}
run();
</script>`;

const MIME = { '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
let deliver;
const delivered = new Promise((r) => (deliver = r));
const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const parts = [];
    req.on('data', (c) => parts.push(c)).on('end', () => {
      res.end('ok');
      deliver(Buffer.concat(parts).toString());
    });
    return;
  }
  if (req.url === '/') {
    res.setHeader('content-type', 'text/html');
    return res.end(page);
  }
  const name = path.basename(decodeURIComponent(req.url.split('?')[0]));
  const file = path.join(iconsDir, name);
  if (!fs.existsSync(file)) {
    res.statusCode = 404;
    return res.end();
  }
  res.setHeader('content-type', MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shrink-icons-'));
const proc = spawn(chrome, ['--headless', '--disable-gpu', `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
let out;
try {
  out = JSON.parse(await Promise.race([delivered, new Promise((_, rej) => setTimeout(() => rej(new Error('Chrome did not report back')), 120000))]));
} finally {
  proc.kill();
  server.close();
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  } catch {
    /* Chrome may still hold the profile; it's in the temp dir */
  }
}

const decode = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64');
let shrunk = 0;
let savedBytes = 0;
for (const f of files) {
  const r = out[f.id];
  if (!r) {
    console.log('  skipped (could not decode):', f.id);
    continue;
  }
  const candidates = [
    { ext: '.png', data: decode(r.png) },
    { ext: '.webp', data: decode(r.webp) },
  ].sort((a, b) => a.data.length - b.data.length);
  const best = candidates[0];
  if (best.data.length > f.bytes * (1 - MIN_SAVING)) continue;
  const file = `${f.id}${best.ext}`;
  fs.writeFileSync(path.join(iconsDir, file), best.data);
  if (file !== f.file) fs.rmSync(path.join(iconsDir, f.file));
  icons[f.id].file = file;
  shrunk++;
  savedBytes += f.bytes - best.data.length;
  console.log(`  ${f.id}: ${Math.round(f.bytes / 1024)} KB -> ${Math.round(best.data.length / 1024)} KB (${r.w}x${r.h} ${best.ext.slice(1)})`);
}
fs.writeFileSync(jsonPath, JSON.stringify(icons));
console.log(`shrunk ${shrunk} of ${files.length} heavy icons, saving ${Math.round(savedBytes / 1024)} KB`);
