import { AlertTriangle, CheckCircle2, Info, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { detect, type Detected } from '../lib/detect';
import { BROWSERS, getBrowser, score } from '../lib/data';
import { versionVerdict } from '../lib/versionCheck';
import type { BrowserIndex } from '../lib/types';
import { DEFAULT_WEIGHTS, overall } from '../lib/scoring';
import { useDocTitle } from '../lib/hooks';
import { readLocal, writeLocal } from '../lib/store';
import { BrowserMark } from '../components/ui/BrowserMark';
import { FactsStrip } from '../components/ui/Facts';
import { ScoreNum } from '../components/ui/Score';
import { SupportMark } from './BrowserDetail';

interface Test {
  name: string;
  group: string;
  run: () => boolean | Promise<boolean>;
}

const css = (p: string) => (typeof CSS !== 'undefined' && CSS.supports ? CSS.supports(p) : false);
const w = window as unknown as Record<string, unknown>;
const nav = navigator as unknown as Record<string, unknown>;

const TESTS: Test[] = [
  { group: 'Graphics', name: 'WebGL 2', run: () => !!document.createElement('canvas').getContext('webgl2') },
  { group: 'Graphics', name: 'WebGPU', run: () => 'gpu' in navigator },
  { group: 'Graphics', name: 'OffscreenCanvas', run: () => 'OffscreenCanvas' in w },
  { group: 'Media', name: 'AV1 video', run: () => document.createElement('video').canPlayType('video/mp4; codecs="av01.0.05M.08"') !== '' },
  { group: 'Media', name: 'HEVC / H.265 video', run: () => document.createElement('video').canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== '' },
  { group: 'Media', name: 'VP9 video', run: () => document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '' },
  { group: 'Media', name: 'Picture-in-picture', run: () => 'pictureInPictureEnabled' in document },
  { group: 'Media', name: 'Encrypted media (DRM)', run: () => 'requestMediaKeySystemAccess' in navigator },
  { group: 'Media', name: 'JPEG XL images', run: () => new Promise((r) => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = 'data:image/jxl;base64,/woIAAAMABKIAgC4AF3lEgAAFSqjjBu8nOv58kOHxbSN6wxttW1hSaLIODZJJ3BIEkkaoCUzGM6qJAE='; }) },
  { group: 'Media', name: 'AVIF images', run: () => new Promise((r) => { const i = new Image(); i.onload = () => r(true); i.onerror = () => r(false); i.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A='; }) },
  { group: 'Security', name: 'Passkeys (WebAuthn)', run: () => 'PublicKeyCredential' in w },
  { group: 'Security', name: 'Cross-origin isolation APIs', run: () => 'crossOriginIsolated' in w },
  { group: 'Security', name: 'Trusted Types', run: () => 'trustedTypes' in w },
  { group: 'Security', name: 'Secure context', run: () => window.isSecureContext },
  { group: 'Privacy', name: 'Global Privacy Control signal', run: () => nav.globalPrivacyControl === true },
  { group: 'Privacy', name: 'Do Not Track enabled', run: () => navigator.doNotTrack === '1' },
  { group: 'Privacy', name: 'Storage access API', run: () => 'requestStorageAccess' in document },
  { group: 'Layout & UI', name: 'CSS :has()', run: () => css('selector(:has(a))') },
  { group: 'Layout & UI', name: 'Container queries', run: () => css('container-type: inline-size') },
  { group: 'Layout & UI', name: 'CSS nesting', run: () => css('selector(&)') },
  { group: 'Layout & UI', name: 'Popover API', run: () => 'popover' in HTMLElement.prototype },
  { group: 'Layout & UI', name: 'View transitions', run: () => 'startViewTransition' in document },
  { group: 'Layout & UI', name: 'Scroll-driven animations', run: () => css('animation-timeline: scroll()') },
  { group: 'Layout & UI', name: 'Anchor positioning', run: () => css('anchor-name: --a') },
  { group: 'Layout & UI', name: 'OKLCH colours', run: () => css('color: oklch(0.5 0.1 200)') },
  { group: 'Platform', name: 'Service workers', run: () => 'serviceWorker' in navigator },
  { group: 'Platform', name: 'WebAssembly', run: () => typeof WebAssembly === 'object' },
  { group: 'Platform', name: 'WebTransport', run: () => 'WebTransport' in w },
  { group: 'Platform', name: 'File System Access', run: () => 'showOpenFilePicker' in w },
  { group: 'Platform', name: 'Web Bluetooth', run: () => 'bluetooth' in navigator },
  { group: 'Platform', name: 'Web Share', run: () => 'share' in navigator },
  { group: 'Platform', name: 'Installable web apps (PWA)', run: () => 'onbeforeinstallprompt' in w || 'standalone' in navigator },
];

interface Bench {
  js: number;
  dom: number;
  canvas: number;
  at: string;
}

function benchJs() {
  const t0 = performance.now();
  let ops = 0;
  while (performance.now() - t0 < 600) {
    const arr: number[] = [];
    for (let i = 0; i < 2000; i++) arr.push((i * 2654435761) % 1000);
    arr.sort((a, b) => a - b);
    const o: Record<string, number> = {};
    for (let i = 0; i < 500; i++) o['k' + i] = i;
    JSON.parse(JSON.stringify(o));
    ops++;
  }
  return Math.round(ops / 0.6);
}
function benchDom() {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px';
  document.body.appendChild(host);
  const t0 = performance.now();
  let ops = 0;
  while (performance.now() - t0 < 600) {
    host.innerHTML = '';
    for (let i = 0; i < 100; i++) {
      const d = document.createElement('div');
      d.textContent = 'Row ' + i;
      d.className = 'r' + (i % 5);
      host.appendChild(d);
    }
    void host.offsetHeight;
    ops++;
  }
  host.remove();
  return Math.round(ops / 0.6);
}
function benchCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const t0 = performance.now();
  let ops = 0;
  while (performance.now() - t0 < 600) {
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `hsl(${i * 7},60%,50%)`;
      ctx.fillRect((i * 13) % 480, (i * 29) % 480, 32, 32);
    }
    ctx.getImageData(0, 0, 4, 4);
    ops++;
  }
  return Math.round(ops / 0.6);
}

const fmtDate = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

/** Says whether this browser's version matches the newest in the site's data, and when that data was checked. */
function VersionNote({ d, b }: { d: Detected; b: BrowserIndex | undefined }) {
  const v = versionVerdict(d, b);
  const checked = b ? fmtDate(b.lastVerified) : '';
  let tone = 'info';
  let icon = <Info aria-hidden />;
  let text = '';
  if (v.kind === 'unavailable') {
    if (v.reason === 'fork') text = `Version check isn’t available for ${d.browserName}. It reports its parent engine’s version, so we can’t compare it with a release of its own.`;
    else if (v.reason === 'unknown-browser') text = 'We couldn’t tell which browser this is, so there’s no version to compare.';
    else text = `Version check isn’t available for ${d.browserName}.`;
  } else if (v.kind === 'behind') {
    tone = 'behind';
    icon = <AlertTriangle aria-hidden />;
    text = `${v.behind} ${v.behind === 1 ? 'version' : 'versions'} behind. Update to get the latest security fixes. The newest in our data is ${v.latest} (checked ${checked}).`;
    if (d.browserId === 'firefox') text += ' If you use an ESR (extended support) release, being several versions behind is normal.';
  } else if (v.kind === 'current') {
    tone = 'ok';
    icon = <CheckCircle2 aria-hidden />;
    text = `Up to date. Version ${v.version} matches our data (checked ${checked}).`;
  } else {
    text = `Newer than our data. We last checked ${checked}.`;
  }
  return (
    <div className={`verdict verdict--${tone}`} role="status">
      {icon}
      <p>{text}</p>
    </div>
  );
}

/** Values any site can read without asking. Shown so the fingerprinting advice has something concrete behind it. */
function readableValues() {
  const nav = navigator as unknown as { deviceMemory?: number };
  const rows: [string, string][] = [
    ['Browser string', navigator.userAgent],
    ['Languages', navigator.languages?.join(', ') || navigator.language],
    ['Screen', `${screen.width} × ${screen.height} at ${window.devicePixelRatio}x`],
    ['Time zone', Intl.DateTimeFormat().resolvedOptions().timeZone],
    ['Processor cores', String(navigator.hardwareConcurrency ?? 'Hidden')],
    ['Touch points', String(navigator.maxTouchPoints ?? 0)],
  ];
  if (nav.deviceMemory) rows.push(['Memory', `about ${nav.deviceMemory} GB (rounded down on purpose)`]);
  return rows;
}

export default function You() {
  useDocTitle('Your browser');
  const d = useMemo(detect, []);
  const b = getBrowser(d.browserId);
  const [results, setResults] = useState<Record<string, boolean> | null>(null);
  const [running, setRunning] = useState(false);
  const [bench, setBench] = useState<Bench | null>(null);
  const [history, setHistory] = useState<Bench[]>(() => readLocal('bf-bench', []));
  const [benchRunning, setBenchRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const out: Record<string, boolean> = {};
    for (const t of TESTS) {
      try {
        out[t.name] = !!(await t.run());
      } catch {
        out[t.name] = false;
      }
    }
    setResults(out);
    setRunning(false);
  };

  const runBench = () => {
    setBenchRunning(true);
    setTimeout(() => {
      const r: Bench = { js: benchJs(), dom: benchDom(), canvas: benchCanvas(), at: new Date().toLocaleString() };
      setBench(r);
      const h = [r, ...history].slice(0, 5);
      setHistory(h);
      writeLocal('bf-bench', h);
      setBenchRunning(false);
    }, 50);
  };

  const groups = [...new Set(TESTS.map((t) => t.group))];
  const passed = results ? Object.values(results).filter(Boolean).length : 0;
  const better = b ? BROWSERS.filter((x) => x.status !== 'discontinued' && x.id !== b.id && d.os && x.platforms[d.os] && overall(x, DEFAULT_WEIGHTS, d.os) > overall(b, DEFAULT_WEIGHTS, d.os)).sort((x, y) => overall(y, DEFAULT_WEIGHTS, d.os) - overall(x, DEFAULT_WEIGHTS, d.os)).slice(0, 4) : [];

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Your browser</h1>
          <p className="lede">What you’re using right now, what it can do, and how fast it runs on this device.</p>
        </div>
      </div>

      <div className="you-grid">
        <section className="panel panel-pad stack" aria-labelledby="you-h">
          <h2 id="you-h" className="h-sm">
            Detected
          </h2>
          <dl className="kv">
            <dt>Browser</dt>
            <dd>
              {d.browserName} {d.version}
            </dd>
            <dt>Engine</dt>
            <dd>{d.engineGuess}</dd>
            <dt>Platform</dt>
            <dd>
              {d.osName}
              {d.mobile ? ' (mobile)' : ''}
            </dd>
          </dl>
          <p className="xs faint">Detection reads your browser’s user agent and client hints. Many forks report themselves as Chrome or Firefox, so this can be wrong.</p>
          <VersionNote d={d} b={b} />
          {b && (
            <Link to={`/browser/${b.id}`} className="panel panel-pad row" style={{ flexWrap: 'nowrap' }}>
              <BrowserMark b={b} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{b.name}</strong>
                <FactsStrip b={b} os={d.os} small />
              </div>
              <ScoreNum value={overall(b, DEFAULT_WEIGHTS, d.os)} size="lg" />
            </Link>
          )}
        </section>

        {better.length > 0 && b && (
          <section className="panel panel-pad stack" aria-labelledby="better-h">
            <h2 id="better-h" className="h-sm">
              Rated higher on {d.osName}
            </h2>
            {better.map((x) => (
              <div key={x.id} className="row" style={{ flexWrap: 'nowrap' }}>
                <BrowserMark b={x} size={28} />
                <Link to={`/browser/${x.id}`} style={{ flex: 1 }}>
                  {x.name}
                </Link>
                <ScoreNum value={overall(x, DEFAULT_WEIGHTS, d.os)} size="sm" />
                <Link to={`/switch?from=${b.id}&to=${x.id}`} className="btn btn--sm">
                  Plan switch
                </Link>
              </div>
            ))}
          </section>
        )}
      </div>

      <section className="section" aria-labelledby="read-h">
        <div className="section-head">
          <div>
            <h2 id="read-h">What sites can read from your browser</h2>
            <p>Any page can read these values without asking. Together they can help recognise your device without cookies.</p>
          </div>
        </div>
        <div className="panel panel-pad stack">
          <dl className="kv kv--wrap">
            {readableValues().flatMap(([k, v]) => [<dt key={k + 'k'}>{k}</dt>, <dd key={k + 'v'}>{v}</dd>])}
          </dl>
          {d.os && (
            <>
              <h3 className="h-sm">Browsers that limit this most on {d.osName}</h3>
              <ul className="row readable__list">
                {BROWSERS.filter((x) => x.status !== 'discontinued' && x.platforms[d.os!])
                  .sort((a, z) => score(z, 'fingerprinting', d.os) - score(a, 'fingerprinting', d.os))
                  .slice(0, 6)
                  .map((x) => (
                    <li key={x.id}>
                      <Link to={`/browser/${x.id}`} className="chip">
                        {x.name} <span className="tnum faint">{score(x, 'fingerprinting', d.os).toFixed(1)}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
              <p className="xs faint">Scores are for fingerprint resistance, out of 10. They are editorial ratings, not a measurement of your device.</p>
            </>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="ft-h">
        <div className="section-head">
          <div>
            <h2 id="ft-h">Feature test</h2>
            <p>{TESTS.length} web-platform checks run in your browser. Nothing leaves your device.</p>
          </div>
          <button className="btn btn--primary" onClick={runTests} disabled={running}>
            <Play aria-hidden /> {results ? 'Run again' : 'Run the test'}
          </button>
        </div>
        {results && (
          <>
            <p className="small" aria-live="polite" style={{ marginBottom: 'var(--s-3)' }}>
              <strong className="tnum">
                {passed} / {TESTS.length}
              </strong>{' '}
              features supported.
            </p>
            <div className="grid grid-3">
              {groups.map((g) => (
                <div key={g} className="panel feat-fam">
                  <h3 className="h-sm">{g}</h3>
                  <ul>
                    {TESTS.filter((t) => t.group === g).map((t) => (
                      <li key={t.name} className={`feat ${results[t.name] ? '' : 'feat--no'}`}>
                        <SupportMark s={results[t.name] ? 'yes' : 'no'} />
                        <span className="feat__name">{t.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="section" aria-labelledby="bench-h">
        <div className="section-head">
          <div>
            <h2 id="bench-h">Benchmark this device</h2>
            <p>Three short tests (about 2 seconds). Results are for your device right now; higher is faster.</p>
          </div>
          <button className="btn btn--primary" onClick={runBench} disabled={benchRunning}>
            <Play aria-hidden /> {benchRunning ? 'Running…' : bench ? 'Run again' : 'Start benchmark'}
          </button>
        </div>
        {bench && (
          <div className="grid grid-3" aria-live="polite">
            {[
              ['JavaScript', bench.js, 'sort + JSON rounds per second'],
              ['DOM updates', bench.dom, '100-row rebuilds per second'],
              ['Canvas 2D', bench.canvas, 'draw batches per second'],
            ].map(([n, v, u]) => (
              <div key={n as string} className="panel panel-pad">
                <p className="small muted">{n}</p>
                <p className="bench-num tnum">{(v as number).toLocaleString()}</p>
                <p className="xs faint">{u}</p>
              </div>
            ))}
          </div>
        )}
        {history.length > 1 && (
          <div className="table-wrap" style={{ marginTop: 'var(--s-4)' }}>
            <table className="table">
              <caption className="sr-only">Your previous runs</caption>
              <thead>
                <tr>
                  <th scope="col">Run</th>
                  <th scope="col" className="num">
                    JavaScript
                  </th>
                  <th scope="col" className="num">
                    DOM
                  </th>
                  <th scope="col" className="num">
                    Canvas
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="small">{h.at}</td>
                    <td className="num">{h.js.toLocaleString()}</td>
                    <td className="num">{h.dom.toLocaleString()}</td>
                    <td className="num">{h.canvas.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="xs faint" style={{ marginTop: 'var(--s-3)' }}>
          Background tabs, battery saver and extensions affect results. Compare runs on the same device, not across devices.
        </p>
      </section>
    </div>
  );
}
