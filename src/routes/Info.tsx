import { ArrowRight, RotateCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFlip } from '../lib/motion';
import { Link, useParams, Navigate } from 'react-router-dom';
import { BROWSERS, getBrowser } from '../lib/data';
import { CATEGORIES, ENGINES, OSES, OS_BY_ID, PILLARS, STATUS_LABEL } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, overall, pool, rank } from '../lib/scoring';
import type { OsId } from '../lib/types';
import { useDocTitle } from '../lib/hooks';
import { useApp } from '../lib/store';
import { LAYERS } from '../lib/security';
import { BrowserMark } from '../components/ui/BrowserMark';
import { TierLegend } from '../components/ui/Score';
import { RankList } from './Rankings';
import { GLOSSARY, HISTORY, LINEAGE, MYTHS } from '../data/learn';
import { BrowserCard } from '../components/BrowserCard';

/* =========================== Engines =========================== */

export function Engines() {
  useDocTitle('Browser engines');
  const live = BROWSERS.filter((b) => b.status !== 'discontinued');
  const W = 920;
  const roots = LINEAGE.filter((n) => !n.parent);
  // simple layered layout: x by year, y by root lane
  const lane = (id: string): number => {
    const n = LINEAGE.find((x) => x.id === id)!;
    return n.parent ? lane(n.parent) : roots.findIndex((r) => r.id === id);
  };
  const childOffset: Record<string, number> = {};
  const pos = (id: string) => {
    const n = LINEAGE.find((x) => x.id === id)!;
    const x = 40 + ((n.year - 1996) / (2024 - 1996)) * (W - 200);
    const base = lane(id) * 92 + 40;
    if (!(id in childOffset)) {
      const siblings = LINEAGE.filter((s) => s.parent === n.parent && n.parent);
      childOffset[id] = n.parent ? siblings.findIndex((s) => s.id === id) * 34 : 0;
    }
    return { x, y: base + childOffset[id] };
  };
  const H = roots.length * 92 + 40;
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Browser engines</h1>
          <p className="lede">Almost every browser is built on one of a handful of engines. The engine decides compatibility, extensions and much of the speed.</p>
        </div>
      </div>
      <div className="grid grid-3">
        {ENGINES.filter((e) => live.some((b) => b.engine === e.id)).map((e) => {
          const list = live.filter((b) => b.engine === e.id).sort((a, b) => overall(b) - overall(a));
          return (
            <div key={e.id} className="panel panel-pad engine-card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 className="h-sm" style={{ margin: 0 }}>
                  <span className="engine-dot" style={{ background: `var(${e.colorVar})`, width: 10, height: 10 }} aria-hidden />
                  {e.name}
                </h2>
                <span className="badge tnum">{list.length} {list.length === 1 ? 'browser' : 'browsers'}</span>
              </div>
              <p className="xs muted">{e.owner}</p>
              <p className="small">{e.blurb}</p>
              <div className="type-tile__marks" aria-hidden>
                {list.slice(0, 8).map((b) => (
                  <BrowserMark key={b.id} b={b} size={26} />
                ))}
              </div>
              <Link to={`/browsers?engine=${e.id}`} className="link small">
                See all {e.name} browsers
              </Link>
            </div>
          );
        })}
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Family tree</h2>
          <p>Who forked whom, by year.</p>
        </div>
        <div className="panel lineage-wrap">
          <svg viewBox={`0 0 ${W} ${H + 20}`} className="lineage" role="img" aria-label="Engine family tree: KHTML to WebKit to Blink; Netscape to Gecko to Goanna and Servo; Trident to EdgeHTML; LibWeb independent.">
            {[1996, 2000, 2005, 2010, 2015, 2020, 2024].map((y) => {
              const x = 40 + ((y - 1996) / (2024 - 1996)) * (W - 200);
              return (
                <g key={y}>
                  <line x1={x} x2={x} y1={10} y2={H} stroke="var(--viz-grid)" strokeDasharray="3 4" />
                  <text x={x} y={H + 14} textAnchor="middle" fontSize="11" fill="var(--text-3)">
                    {y}
                  </text>
                </g>
              );
            })}
            {LINEAGE.filter((n) => n.parent).map((n) => {
              const a = pos(n.parent!);
              const b = pos(n.id);
              return <path key={n.id} d={`M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`} fill="none" stroke="var(--border-strong)" strokeWidth={2} />;
            })}
            {LINEAGE.map((n) => {
              const p = pos(n.id);
              const color = n.engine === 'other' ? 'var(--eng-other)' : `var(--eng-${n.engine})`;
              const count = (n.browsers ?? []).filter((id) => getBrowser(id)).length;
              // A node whose next neighbour on the same row is close would have its label run through it, so that label sits above the dot.
              const crowded = LINEAGE.some((o) => {
                const q = pos(o.id);
                return o.id !== n.id && Math.abs(q.y - p.y) < 20 && q.x > p.x && q.x - p.x < 150;
              });
              const lx = crowded ? p.x - 8 : p.x + 14;
              const ly = crowded ? p.y - 24 : p.y + 4;
              return (
                <g key={n.id}>
                  <circle cx={p.x} cy={p.y} r={8} fill={color} stroke="var(--surface)" strokeWidth={3} />
                  <text x={lx} y={ly} fontSize="13" fontWeight={600} fill="var(--text)">
                    {n.label}
                  </text>
                  {count > 0 && (
                    <text x={lx} y={ly + 14} fontSize="11" fill="var(--text-3)">
                      {count} {count === 1 ? 'browser' : 'browsers'} here
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </section>
    </div>
  );
}

/* =========================== History =========================== */

export function History() {
  useDocTitle('Browser history');
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>A short history of web browsers</h1>
          <p className="lede">From the first browser at CERN to the AI browsers of 2026.</p>
        </div>
        <Link to="/graveyard" className="btn">
          Visit Discounted Browsers <ArrowRight aria-hidden />
        </Link>
      </div>
      <ol className="history">
        {HISTORY.map((h) => (
          <li key={h.year} className="history__item">
            <span className="history__year tnum">{h.year}</span>
            <div className="panel panel-pad">
              <h2 className="h-sm" style={{ margin: 0 }}>
                {h.title}
              </h2>
              <p className="small muted">{h.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* =========================== Learn =========================== */

function FlipCard({ t }: { t: (typeof GLOSSARY)[number] }) {
  const [flip, setFlip] = useState(false);
  return (
    <button data-flip={t.term} className={`flip ${flip ? 'is-flipped' : ''}`} aria-pressed={flip} onClick={() => setFlip(!flip)} aria-label={`${t.term}: ${flip ? t.detail : t.short}`}>
      <span className="flip__inner" aria-hidden>
        <span className="flip__face">
          <span className="badge">{t.tag}</span>
          <span className="flip__term">{t.term}</span>
          <span className="flip__short">{t.short}</span>
          <span className="flip__hint">
            <RotateCw /> More
          </span>
        </span>
        <span className="flip__face flip__face--back">
          <span className="flip__term">{t.term}</span>
          <span className="small">{t.detail}</span>
        </span>
      </span>
    </button>
  );
}

export function Learn() {
  useDocTitle('Glossary & myths');
  const [tag, setTag] = useState<string | null>(null);
  const tags = [...new Set(GLOSSARY.map((g) => g.tag))];
  const grid = useRef<HTMLDivElement>(null);
  const flip = useFlip(grid, tag);
  const pick = (t: string | null) => {
    flip(); // First: before the filter removes cards and the rest reflow
    setTag(t);
  };
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Glossary & myths</h1>
          <p className="lede">The words you’ll meet on this site, in plain language. Tap a card for more.</p>
        </div>
        <Link to="/quiz/iq" className="btn">
          Test yourself: Browser IQ
        </Link>
      </div>
      <div className="row" style={{ marginBottom: 'var(--s-4)' }}>
        <button className="chip" aria-pressed={!tag} onClick={() => pick(null)}>
          All
        </button>
        {tags.map((t) => (
          <button key={t} className="chip" aria-pressed={tag === t} onClick={() => pick(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-3" ref={grid}>
        {GLOSSARY.filter((g) => !tag || g.tag === tag).map((t) => (
          <FlipCard key={t.term} t={t} />
        ))}
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Myth vs fact</h2>
        </div>
        <div className="grid grid-2">
          {MYTHS.map((m) => (
            <div key={m.myth} className="panel myth">
              <p className="myth__myth">
                <span className="badge badge--negative">Myth</span> {m.myth}
              </p>
              <p className="myth__fact">
                <span className="badge badge--positive">Fact</span> {m.fact}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =========================== About / methodology =========================== */

export function About() {
  useDocTitle('How we score');
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>How we score</h1>
          <p className="lede">Every score is an editorial judgement grounded in a recorded fact and cited sources, last reviewed October 29, 2026.</p>
        </div>
      </div>
      <div className="grid grid-3">
        <div className="panel panel-pad">
          <h2 className="h-sm">Measured (public)</h2>
          <p className="small muted">Backed by a published benchmark or test, such as Speedometer, JetStream or battery tests from reviewers. We cite it; we don’t run our own lab.</p>
        </div>
        <div className="panel panel-pad">
          <h2 className="h-sm">Documented</h2>
          <p className="small muted">Taken from the browser’s own documentation, release notes, privacy policy or source code.</p>
        </div>
        <div className="panel panel-pad">
          <h2 className="h-sm">Editorial</h2>
          <p className="small muted">Our judgement where no measurement exists, calibrated against reference browsers so scores stay consistent.</p>
        </div>
      </div>
      <section className="section" id="security" aria-labelledby="sec-grade-h">
        <div className="section-head">
          <div>
            <h2 id="sec-grade-h">How we grade security</h2>
            <p>A separate Security score, not part of the 40-category overall score.</p>
          </div>
          <Link to="/security" className="btn btn--sm">
            See the security grades
          </Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">The seven layers of protection and their weights in the Security score</caption>
            <thead>
              <tr>
                <th scope="col">Layer</th>
                <th scope="col" className="num">
                  Weight
                </th>
                <th scope="col">What it looks at</th>
              </tr>
            </thead>
            <tbody>
              {LAYERS.map((l) => (
                <tr key={l.id}>
                  <th scope="row">{l.name}</th>
                  <td className="num">{l.weight}%</td>
                  <td className="small muted">{l.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 'var(--s-3)', maxWidth: '70ch' }}>
          Each layer is scored 0–10 from facts we recorded about the browser and from related ratings in the 40 categories. Grades run A (8.0 and up) to F (below 4.0). Weights are our editorial judgement. A fact we could not verify is left out of its layer, never counted against the browser, and the browser is marked Estimated until we check it. No browser stops every attack, and these are not lab tests.
        </p>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>The score scale</h2>
        </div>
        <div className="panel panel-pad">
          <TierLegend />
          <p className="small muted" style={{ marginTop: 'var(--s-3)' }}>
            Every score is shown as a number with a colour band; colour is never the only signal. Overall scores are weighted averages of the 40 categories. Per-platform scores adjust categories where a browser differs on that OS (for example, no extensions on iOS).
          </p>
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>40 categories in 7 pillars</h2>
        </div>
        <div className="grid grid-2">
          {PILLARS.map((p) => (
            <div key={p.id} className="panel panel-pad">
              <h3 className="h-sm">{p.name}</h3>
              <p className="small muted" style={{ marginBottom: 'var(--s-3)' }}>
                {p.blurb}
              </p>
              <dl className="kv">
                {CATEGORIES.filter((c) => c.pillar === p.id).map((c) => (
                  <div key={c.id} style={{ display: 'contents' }}>
                    <dt>
                      {c.name} <span className="faint xs">×{c.weight}</span>
                    </dt>
                    <dd className="small" style={{ fontWeight: 400 }}>
                      {c.plain} <span className="faint">10 = {c.ten}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>Confidence and honesty</h2>
        </div>
        <ul className="panel panel-pad stack small" style={{ listStyle: 'none' }}>
          <li>Each browser shows a confidence level. Low means public information was thin or sources disagreed.</li>
          <li>Claims we couldn’t verify are listed under “Not independently verified” on each profile.</li>
          <li>We never invent benchmark numbers, user counts or reviews. The only numbers we measure are the ones your own browser produces on the Your browser page.</li>
          <li>Browser marks are simple monograms, not the browsers’ logos.</li>
        </ul>
      </section>
    </div>
  );
}

/* =========================== OS page =========================== */

export function OsPage() {
  const { os } = useParams();
  const { setOs } = useApp();
  const info = OS_BY_ID[os as OsId];
  useDocTitle(info ? `Best browsers for ${info.name}` : 'Platform');
  if (!info) return <Navigate to="/os/windows" replace />;
  const id = info.id;
  const rows = rank(pool({ os: id }), (b) => overall(b, DEFAULT_WEIGHTS, id));
  const top3 = rows.slice(0, 3);
  const preinstalled = BROWSERS.filter((b) => b.platforms[id]?.stores.includes('preinstalled'));
  return (
    <div className="container page">
      <div className="os-tabs" role="navigation" aria-label="Platforms">
        {OSES.map((o) => (
          <Link key={o.id} to={`/os/${o.id}`} className={`chip ${o.id === id ? 'is-on' : ''}`} aria-current={o.id === id ? 'page' : undefined}>
            {o.name}
          </Link>
        ))}
      </div>
      <div className="page-head" style={{ marginTop: 'var(--s-6)' }}>
        <div>
          <h1>Best browsers for {info.name}</h1>
          <p className="lede">
            {rows.length} browsers available on {info.name}, scored for this platform.
          </p>
        </div>
        <button className="btn" onClick={() => setOs(id)}>
          Score everything for {info.short}
        </button>
      </div>
      <div className="grid grid-3">
        {top3.map((r) => (
          <BrowserCard key={r.b.id} b={r.b} os={id} rank={r.rank} />
        ))}
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Good to know on {info.name}</h2>
        </div>
        <ul className="panel panel-pad stack small" style={{ listStyle: 'none' }}>
          {info.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
          {preinstalled.length > 0 && <li>Preinstalled: {preinstalled.map((b) => b.name).join(', ')}.</li>}
        </ul>
      </section>
      <section className="section">
        <div className="section-head">
          <h2>Full {info.name} leaderboard</h2>
          <TierLegend />
        </div>
        <RankList rows={rows} valueLabel={`${info.name} score`} extra={(b) => `${STATUS_LABEL[b.platforms[id]!.status]}${b.platforms[id]!.minOsFloor?.confirmed ? ` · ${b.platforms[id]!.minOs}` : ''}`} />
      </section>
    </div>
  );
}
