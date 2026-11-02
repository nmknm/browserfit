import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BROWSERS, getBrowser, scoresFor } from '../lib/data';
import { CATEGORIES, CATEGORY_IDS, OSES, PILLARS } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, fmt, overall, pillarScores, pool } from '../lib/scoring';
import { LAYERS, securityFor, securityScore, type LayerId } from '../lib/security';
import type { BrowserIndex, OsId } from '../lib/types';
import { useDocTitle, useListParam, useParam } from '../lib/hooks';
import { BrowserMark } from '../components/ui/BrowserMark';
import { BrowserPicker } from '../components/BrowserPicker';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)'];

function axisValue(b: BrowserIndex, key: string, os: OsId | null) {
  if (key === 'overall') return overall(b, DEFAULT_WEIGHTS, os);
  if (key === 'sec') return securityScore(b, os);
  if (key.startsWith('s:')) return securityFor(b, os).layers[key.slice(2) as LayerId].score;
  if (key.startsWith('p:')) return pillarScores(b, os)[key.slice(2) as keyof ReturnType<typeof pillarScores>];
  return scoresFor(b, os)[CATEGORY_IDS.indexOf(key as never)];
}
const keyLabel = (k: string) => (k === 'overall' ? 'Overall' : k === 'sec' ? 'Security score' : k.startsWith('s:') ? LAYERS.find((l) => l.id === k.slice(2))!.name :  k.startsWith('p:') ? PILLARS.find((p) => p.id === k.slice(2))!.name : CATEGORIES.find((c) => c.id === k)!.name);

function AxisSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="overall">Overall</option>
        <optgroup label="Security (seven layers)">
          <option value="sec">Security score</option>
          {LAYERS.map((l) => (
            <option key={l.id} value={'s:' + l.id}>
              {l.name}
            </option>
          ))}
        </optgroup>
        {PILLARS.map((p) => (
          <optgroup key={p.id} label={p.name}>
            <option value={'p:' + p.id}>{p.name} (pillar)</option>
            {CATEGORIES.filter((c) => c.pillar === p.id).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/* =========================== Trade-off explorer =========================== */

export function Tradeoffs() {
  useDocTitle('Trade-off explorer');
  const [xP, setX] = useParam('x');
  const [yP, setY] = useParam('y');
  const [osP, setOs] = useParam('os');
  const [hover, setHover] = useState<string | null>(null);
  const nav = useNavigate();
  const x = xP ?? 'p:privacy';
  const y = yP ?? 'beginnerFriendly';
  const os = osP as OsId | null;
  const pts = useMemo(() => pool({ os }).map((b) => ({ b, x: axisValue(b, x, os), y: axisValue(b, y, os) })), [x, y, os]);
  // Pareto frontier: points not dominated by any other.
  const frontier = pts.filter((p) => !pts.some((q) => q !== p && q.x >= p.x && q.y >= p.y && (q.x > p.x || q.y > p.y)));
  const front = [...frontier].sort((a, b) => a.x - b.x);
  const W = 720,
    H = 480,
    M = { l: 48, r: 24, t: 20, b: 44 };
  const sx = (v: number) => M.l + (v / 10) * (W - M.l - M.r);
  const sy = (v: number) => H - M.b - (v / 10) * (H - M.t - M.b);
  const hv = pts.find((p) => p.b.id === hover);
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Trade-off explorer</h1>
          <p className="lede">Plot any two categories. Browsers on the highlighted frontier can’t be beaten on both at once.</p>
        </div>
      </div>
      <div className="row" style={{ alignItems: 'flex-end', marginBottom: 'var(--s-4)' }}>
        <AxisSelect value={x} onChange={(v) => setX(v)} label="Across (x)" />
        <AxisSelect value={y} onChange={(v) => setY(v)} label="Up (y)" />
        <label>
          <span className="label">Platform</span>
          <select className="input select" value={os ?? ''} onChange={(e) => setOs(e.target.value || null)}>
            <option value="">All platforms</option>
            {OSES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="scatter-layout">
        <div className="panel panel-pad scatter-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} className="scatter" role="img" aria-label={`Scatter plot of ${keyLabel(x)} against ${keyLabel(y)}`}>
            {[0, 2, 4, 6, 8, 10].map((t) => (
              <g key={t}>
                <line x1={sx(0)} x2={sx(10)} y1={sy(t)} y2={sy(t)} stroke="var(--viz-grid)" />
                <text x={M.l - 10} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--viz-axis)">
                  {t}
                </text>
                <text x={sx(t)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="var(--viz-axis)">
                  {t}
                </text>
              </g>
            ))}
            <text x={(W + M.l) / 2} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--text-2)" fontWeight={500}>
              {keyLabel(x)} →
            </text>
            <text x={14} y={(H - M.b) / 2} textAnchor="middle" fontSize="12" fill="var(--text-2)" fontWeight={500} transform={`rotate(-90 14 ${(H - M.b) / 2})`}>
              {keyLabel(y)} →
            </text>
            <polyline points={front.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 4" />
            {pts.map((p) => {
              const onF = frontier.includes(p);
              return (
                <g
                  key={p.b.id}
                  tabIndex={0}
                  role="link"
                  aria-label={`${p.b.name}: ${keyLabel(x)} ${fmt(p.x)}, ${keyLabel(y)} ${fmt(p.y)}${onF ? ', on the frontier' : ''}`}
                  onMouseEnter={() => setHover(p.b.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(p.b.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => nav(`/browser/${p.b.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && nav(`/browser/${p.b.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={sx(p.x)} cy={sy(p.y)} r={14} fill="transparent" />
                  <circle cx={sx(p.x)} cy={sy(p.y)} r={hover === p.b.id ? 7 : onF ? 6 : 4.5} fill={onF ? 'var(--accent)' : 'var(--viz-axis)'} fillOpacity={onF ? 1 : 0.55} stroke="var(--surface)" strokeWidth={2} />
                  {onF && (
                    <text x={sx(p.x) + 9} y={sy(p.y) - 8} fontSize="11" fontWeight={600} fill="var(--text)">
                      {p.b.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hv && (
            <div className="scatter__tip" aria-hidden>
              <strong>{hv.b.name}</strong> · {keyLabel(x)} {fmt(hv.x)} · {keyLabel(y)} {fmt(hv.y)}
            </div>
          )}
        </div>
        <div className="panel">
          <h2 className="h-sm panel-head" style={{ margin: 0 }}>
            On the frontier
          </h2>
          {front
            .slice()
            .reverse()
            .map((p) => (
              <Link key={p.b.id} to={`/browser/${p.b.id}`} className="brow" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                <BrowserMark b={p.b} size={26} />
                <span className="truncate">{p.b.name}</span>
                <span className="tnum small muted">
                  {fmt(p.x)} · {fmt(p.y)}
                </span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

/* =========================== Rank shifts (bump chart) =========================== */

export function Bump() {
  useDocTitle('Rank shifts');
  const [ids, setIds] = useListParam('b');
  const [pillarP, setPillar] = useParam('pillar');
  const def = ['firefox', 'chrome', 'brave', 'safari', 'vivaldi', 'zen'].filter((x) => getBrowser(x));
  const fallback = def.length >= 3 ? def : BROWSERS.filter((b) => b.status !== 'discontinued').sort((a, b) => overall(b) - overall(a)).slice(0, 5).map((b) => b.id);
  const sel = (ids.length ? ids : fallback).map(getBrowser).filter(Boolean).slice(0, 6) as BrowserIndex[];
  const cats = CATEGORIES.filter((c) => !pillarP || c.pillar === pillarP);
  const all = pool();
  const ranks = sel.map((b) => cats.map((c) => {
    const i = CATEGORY_IDS.indexOf(c.id);
    const v = b.scores[i];
    return 1 + all.filter((x) => x.scores[i] > v).length;
  }));
  const maxRank = Math.max(10, ...ranks.flat());
  const W = Math.max(640, cats.length * 56),
    H = 380,
    M = { l: 40, r: 120, t: 16, b: 100 };
  const sx = (i: number) => M.l + (i / Math.max(1, cats.length - 1)) * (W - M.l - M.r);
  const sy = (r: number) => M.t + ((r - 1) / (maxRank - 1)) * (H - M.t - M.b);
  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Rank shifts</h1>
          <p className="lede">Where each browser ranks in every category among all {all.length} active browsers. Lines show how a browser rises and falls.</p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 'var(--s-4)' }}>
        <select className="input select" value={pillarP ?? ''} onChange={(e) => setPillar(e.target.value || null)} aria-label="Pillar" style={{ width: 'auto' }}>
          <option value="">All 40 categories</option>
          {PILLARS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <ul className="legend">
          {sel.map((b, i) => (
            <li key={b.id}>
              <i style={{ background: SERIES[i] }} />
              {b.name}
              <button className="btn btn--ghost btn--sm btn--icon" aria-label={`Remove ${b.name}`} onClick={() => setIds(sel.filter((x) => x.id !== b.id).map((x) => x.id))}>
                ×
              </button>
            </li>
          ))}
        </ul>
        {sel.length < 6 && (
          <div style={{ width: '14rem' }}>
            <BrowserPicker onPick={(b) => setIds([...sel.map((x) => x.id), b.id])} exclude={sel.map((x) => x.id)} />
          </div>
        )}
      </div>
      <div className="panel panel-pad" style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: W * 0.8 }} role="img" aria-label="Bump chart of category ranks">
          {[1, 5, 10, 20, 30, 40, 60, 80, 100].filter((r) => r <= maxRank).map((r) => (
            <g key={r}>
              <line x1={M.l} x2={W - M.r} y1={sy(r)} y2={sy(r)} stroke="var(--viz-grid)" />
              <text x={M.l - 8} y={sy(r) + 4} fontSize="11" textAnchor="end" fill="var(--viz-axis)">
                #{r}
              </text>
            </g>
          ))}
          {cats.map((c, i) => (
            <text key={c.id} x={sx(i)} y={H - M.b + 12} fontSize="10.5" fill="var(--text-2)" textAnchor="end" transform={`rotate(-50 ${sx(i)} ${H - M.b + 12})`}>
              {c.name}
            </text>
          ))}
          {sel.map((b, si) => (
            <g key={b.id}>
              <polyline points={ranks[si].map((r, i) => `${sx(i)},${sy(r)}`).join(' ')} fill="none" stroke={SERIES[si]} strokeWidth={2.5} strokeLinejoin="round" />
              {ranks[si].map((r, i) => (
                <circle key={i} cx={sx(i)} cy={sy(r)} r={4} fill={SERIES[si]} stroke="var(--surface)" strokeWidth={2}>
                  <title>{`${b.name} · ${cats[i].name}: #${r}`}</title>
                </circle>
              ))}
              <text x={W - M.r + 8} y={sy(ranks[si][ranks[si].length - 1]) + 4} fontSize="11.5" fontWeight={600} fill={SERIES[si]}>
                {b.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* =========================== Win matrix =========================== */

export function WinMatrix() {
  useDocTitle('Win matrix');
  const [nP, setN] = useParam('n');
  const n = Number(nP ?? 15);
  const top = BROWSERS.filter((b) => b.status !== 'discontinued').sort((a, b) => overall(b) - overall(a)).slice(0, n);
  const wins = (a: BrowserIndex, b: BrowserIndex) => a.scores.filter((v, i) => v > b.scores[i]).length;
  const share = top.map((a) => ({ a, w: top.reduce((s, b) => s + (a === b ? 0 : wins(a, b)), 0) })).sort((x, y) => y.w - x.w);
  const order = share.map((s) => s.a);
  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Win matrix</h1>
          <p className="lede">Each cell shows how many of the 40 categories the row browser beats the column browser in. Blue means the row wins more often.</p>
        </div>
        <select className="input select" value={n} onChange={(e) => setN(e.target.value)} aria-label="How many browsers" style={{ width: 'auto' }}>
          {[10, 15, 20, 30].map((x) => (
            <option key={x} value={x}>
              Top {x}
            </option>
          ))}
        </select>
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="matrix__corner" scope="col">
                Row beats column in…
              </th>
              {order.map((b) => (
                <th key={b.id} scope="col" className="matrix__col">
                  <span>{b.name}</span>
                </th>
              ))}
              <th scope="col" className="matrix__col">
                <span>Total wins</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {order.map((a) => (
              <tr key={a.id}>
                <th scope="row" className="matrix__row">
                  <Link to={`/browser/${a.id}`}>
                    <BrowserMark b={a} size={20} />
                    <span className="truncate">{a.name}</span>
                  </Link>
                </th>
                {order.map((b) => {
                  if (a === b) return <td key={b.id} className="faint">–</td>;
                  const w = wins(a, b);
                  const l = wins(b, a);
                  const t = w / Math.max(1, w + l);
                  return (
                    <td key={b.id} className="matrix__heat tnum" title={`${a.name} beats ${b.name} in ${w}, loses ${l}`} style={{ background: t >= 0.5 ? `color-mix(in oklab, var(--seq-4) ${Math.round((t - 0.5) * 160)}%, var(--surface))` : `color-mix(in oklab, var(--series-2) ${Math.round((0.5 - t) * 120)}%, var(--surface))` }}>
                      {w}
                    </td>
                  );
                })}
                <td className="tnum" style={{ fontWeight: 700 }}>
                  {share.find((s) => s.a === a)!.w}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================== Pillar explorer (parallel coordinates) =========================== */

export function Parallel() {
  useDocTitle('Pillar explorer');
  const [min, setMin] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<string | null>(null);
  const list = useMemo(() => BROWSERS.filter((b) => b.status !== 'discontinued').map((b) => ({ b, p: pillarScores(b) })), []);
  const pass = list.filter((x) => PILLARS.every((p) => x.p[p.id] >= (min[p.id] ?? 0)));
  const W = 900,
    H = 420,
    M = { l: 30, r: 30, t: 30, b: 50 };
  const sx = (i: number) => M.l + (i / (PILLARS.length - 1)) * (W - M.l - M.r);
  const sy = (v: number) => M.t + (1 - (v - 3) / 7) * (H - M.t - M.b);
  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Pillar explorer</h1>
          <p className="lede">Every active browser across the 7 pillars. Raise a minimum to filter; lines that survive meet every bar.</p>
        </div>
        <p className="small muted" aria-live="polite">
          {pass.length} of {list.length} browsers meet your minimums
        </p>
      </div>
      <div className="pc-controls">
        {PILLARS.map((p) => (
          <label key={p.id} className="pc-control">
            <span className="small">
              {p.short} ≥ <b className="tnum">{(min[p.id] ?? 0).toFixed(1)}</b>
            </span>
            <input type="range" className="range" min={0} max={9} step={0.5} value={min[p.id] ?? 0} style={{ ['--fill' as string]: `${((min[p.id] ?? 0) / 9) * 100}%` }} onChange={(e) => setMin({ ...min, [p.id]: Number(e.target.value) })} aria-label={`Minimum ${p.name}`} />
          </label>
        ))}
      </div>
      <div className="panel panel-pad" style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 640 }} role="img" aria-label="Parallel coordinates of pillar scores">
          {PILLARS.map((p, i) => (
            <g key={p.id}>
              <line x1={sx(i)} x2={sx(i)} y1={M.t} y2={H - M.b} stroke="var(--border-strong)" />
              <text x={sx(i)} y={H - M.b + 22} fontSize="12" textAnchor="middle" fill="var(--text)" fontWeight={600}>
                {p.short}
              </text>
              {min[p.id] ? <rect x={sx(i) - 6} y={sy(min[p.id])} width={12} height={H - M.b - sy(min[p.id])} fill="var(--negative)" opacity={0.15} /> : null}
            </g>
          ))}
          {[4, 6, 8, 10].map((v) => (
            <text key={v} x={M.l - 10} y={sy(v) + 4} fontSize="10" textAnchor="end" fill="var(--viz-axis)">
              {v}
            </text>
          ))}
          {list.map(({ b, p }) => {
            const ok = pass.some((x) => x.b === b);
            return (
              <polyline
                key={b.id}
                points={PILLARS.map((pl, i) => `${sx(i)},${sy(p[pl.id])}`).join(' ')}
                fill="none"
                stroke={hover === b.id ? 'var(--accent)' : ok ? 'var(--series-1)' : 'var(--viz-grid)'}
                strokeOpacity={hover === b.id ? 1 : ok ? 0.55 : 0.6}
                strokeWidth={hover === b.id ? 3 : 1.5}
                onMouseEnter={() => setHover(b.id)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{b.name}</title>
              </polyline>
            );
          })}
        </svg>
      </div>
      <div className="row" style={{ marginTop: 'var(--s-4)' }}>
        {pass
          .sort((a, b) => overall(b.b) - overall(a.b))
          .map(({ b }) => (
            <Link key={b.id} to={`/browser/${b.id}`} className="chip" onMouseEnter={() => setHover(b.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(b.id)} onBlur={() => setHover(null)}>
              <BrowserMark b={b} size={18} flat />
              {b.name}
            </Link>
          ))}
      </div>
    </div>
  );
}
