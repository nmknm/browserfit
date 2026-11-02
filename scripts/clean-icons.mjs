// Site icons often ship on an opaque white square, which shows as a white block in dark mode.
// This drops that background (flood fill from the edges) and re-saves those icons as transparent PNGs.
// Uses a local Chrome to decode/draw (handles ico/webp/svg); set CHROME to override its path.
//   node scripts/fetch-icons.mjs && node scripts/clean-icons.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const iconsDir = path.join(root, 'public', 'icons');
const jsonPath = path.join(root, 'src/data/generated/icons.json');
const icons = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const files = Object.entries(icons).filter(([, v]) => v.kind === 'img').map(([id, v]) => ({ id, file: v.file }));

const page = `<!doctype html><body><script>
const files = ${JSON.stringify(files)};
const MAX = 256, WHITE = 238;
const isWhite = (d, i) => d[i + 3] > 200 && d[i] >= WHITE && d[i + 1] >= WHITE && d[i + 2] >= WHITE;
async function run() {
  const out = {};
  for (const f of files) {
    try {
      const img = new Image();
      img.src = '/icons/' + f.file;
      await img.decode();
      const s = Math.min(1, MAX / Math.max(img.naturalWidth || MAX, img.naturalHeight || MAX));
      const w = Math.round((img.naturalWidth || MAX) * s), h = Math.round((img.naturalHeight || MAX) * s);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, w, h);
      const im = x.getImageData(0, 0, w, h), d = im.data;
      const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + w - 1) * 4];
      if (!corners.every((i) => isWhite(d, i))) { out[f.id] = null; continue; }
      const seen = new Uint8Array(w * h), stack = [];
      const push = (px, py) => { if (px < 0 || py < 0 || px >= w || py >= h) return; const k = py * w + px; if (seen[k] || !isWhite(d, k * 4)) return; seen[k] = 1; stack.push(k); };
      for (let i = 0; i < w; i++) { push(i, 0); push(i, h - 1); }
      for (let j = 0; j < h; j++) { push(0, j); push(w - 1, j); }
      while (stack.length) { const k = stack.pop(), px = k % w, py = (k / w) | 0; push(px + 1, py); push(px - 1, py); push(px, py + 1); push(px, py - 1); }
      // Soften the 1px fringe left next to removed pixels.
      const gone = (k) => seen[k] === 1;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        const k = py * w + px;
        if (gone(k)) { d[k * 4 + 3] = 0; continue; }
        const near = (px > 0 && gone(k - 1)) || (px < w - 1 && gone(k + 1)) || (py > 0 && gone(k - w)) || (py < h - 1 && gone(k + w));
        if (near && d[k * 4] > 215 && d[k * 4 + 1] > 215 && d[k * 4 + 2] > 215) d[k * 4 + 3] = Math.min(d[k * 4 + 3], 90);
      }
      x.putImageData(im, 0, 0);
      // Crop to the remaining artwork (as a square) so the removed margin doesn't shrink the icon.
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) if (d[(py * w + px) * 4 + 3] > 24) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
      if (x1 < 0) { out[f.id] = null; continue; }
      const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
      const sq = document.createElement('canvas'); sq.width = side; sq.height = side;
      sq.getContext('2d').drawImage(c, Math.round((side - (x1 - x0 + 1)) / 2) - x0, Math.round((side - (y1 - y0 + 1)) / 2) - y0);
      out[f.id] = sq.toDataURL('image/png');
    } catch (e) { out[f.id] = null; }
  }
  await fetch('/result', { method: 'POST', body: JSON.stringify(out) });
}
run();
</script>`;

let deliver;
const delivered = new Promise((r) => (deliver = r));
const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    const parts = [];
    req.on('data', (c) => parts.push(c)).on('end', () => { res.end('ok'); deliver(Buffer.concat(parts).toString()); });
    return;
  }
  if (req.url === '/') { res.setHeader('content-type', 'text/html'); return res.end(page); }
  const file = path.join(root, 'public', decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(iconsDir.replace(/\\/g, path.sep).slice(0, -5)) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  const ext = path.extname(file).slice(1);
  res.setHeader('content-type', { svg: 'image/svg+xml', ico: 'image/x-icon', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', gif: 'image/gif' }[ext] ?? 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'clean-icons-'));
const proc = spawn(chrome, ['--headless', '--disable-gpu', `--user-data-dir=${profile}`, `http://127.0.0.1:${port}/`], { stdio: 'ignore' });
let out;
try {
  out = JSON.parse(await Promise.race([delivered, new Promise((_, rej) => setTimeout(() => rej(new Error('Chrome did not report back')), 120000))]));
} finally {
  proc.kill();
  server.close();
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* Chrome may still hold the profile; it's in the temp dir */ }
}

let cleaned = 0;
for (const [id, dataUrl] of Object.entries(out)) {
  if (!dataUrl) continue;
  const old = icons[id].file;
  const file = `${id}.png`;
  fs.writeFileSync(path.join(iconsDir, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
  if (old !== file) fs.rmSync(path.join(iconsDir, old));
  icons[id].file = file;
  cleaned++;
  console.log('  cleaned:', id);
}
fs.writeFileSync(jsonPath, JSON.stringify(icons));
console.log(`cleaned ${cleaned} of ${files.length} site icons`);
