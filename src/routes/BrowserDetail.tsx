import { AlertTriangle, ArrowUpRight, Check, ChevronDown, CircleDollarSign, ExternalLink, Minus, Printer, Puzzle, Swords, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { detect } from '../lib/detect';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BROWSERS, engineOn, getBrowser, loadDetail, scoresFor } from '../lib/data';
import { useFlip } from '../lib/motion';
import { useFloatingSecnav } from '../components/layout/useFloatingSecnav';
import { glideBox } from '../lib/barFlip';
import { Collapse } from '../components/ui/Collapse';
import { CATEGORIES, ENGINE_BY_ID, FEATURE_FAMILIES, FEATURES, OS_BY_ID, OSES, PILLARS, STATUS_LABEL, STORE_LABEL, SUPPORT_LABEL, FEATURE_INDEX, SUPPORT_CODES, GROUP_LABEL } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, categoryRank, fmt, overall, overallRank, pillarScores, rank, pool } from '../lib/scoring';
import type { BrowserDetail as Detail, BrowserIndex, CategoryId, OsId, Support } from '../lib/types';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ConfidenceBadge, FactsStrip, StatusBadge, MV2_HELP } from '../components/ui/Facts';
import { ScoreBar, ScoreNum, ScoreRing } from '../components/ui/Score';
import { Radar } from '../components/charts/Radar';
import { Segmented } from '../components/ui/Controls';
import { CompareToggle, ShortlistToggle, BrowserCard } from '../components/BrowserCard';
import { Tip } from '../components/ui/Tip';
import { SecurityReport } from '../components/SecurityReport';
import { useApp } from '../lib/store';
import { useDocTitle } from '../lib/hooks';
import NotFound from './NotFound';

const SECTIONS = [
  ['overview', 'Overview'],
  ['scores', 'Scores'],
  ['features', 'Features'],
  ['specs', 'Specs'],
  ['platforms', 'Platforms'],
  ['privacy', 'Privacy'],
  ['security', 'Security'],
  ['proscons', 'Pros & cons'],
  ['faq', 'FAQ'],
  ['history', 'History'],
  ['sources', 'Sources'],
] as const;

const EVIDENCE_LABEL = { 'measured-public': 'Measured (public)', documented: 'Documented', editorial: 'Editorial' } as const;

export function SupportMark({ s }: { s: Support }) {
  const Icon = s === 'yes' ? Check : s === 'partial' ? Minus : s === 'extension' ? Puzzle : s === 'paid' ? CircleDollarSign : X;
  return (
    <span className={`smark smark--${s}`} aria-label={SUPPORT_LABEL[s]}>
      <Icon aria-hidden />
    </span>
  );
}

function similar(b: BrowserIndex, n = 4) {
  const a = b.scores;
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return BROWSERS.filter((x) => x.id !== b.id && x.status !== 'discontinued')
    .map((x) => {
      const dot = a.reduce((s, v, i) => s + v * x.scores[i], 0);
      return { x, sim: dot / (norm(a) * norm(x.scores) || 1) + (x.engine === b.engine ? 0.01 : 0) };
    })
    .sort((p, q) => q.sim - p.sim)
    .slice(0, n)
    .map((r) => r.x);
}

function SectionNav() {
  const [active, setActive] = useState<string>('overview');
  const bar = useFloatingSecnav();
  // Current section: the last one whose top has passed a line just under the bars (the last section once the
  // page bottoms out, since the short ones at the end can never reach the line). Read from scroll position
  // rather than an IntersectionObserver, which only reports the sections that changed.
  // A click picks its target at once and holds it while the page scrolls there, so the highlight does not
  // sweep through every section on the way and a target the page cannot scroll to still stays selected.
  // Any user input releases the hold.
  const hold = useRef<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      if (hold.current) return;
      const line = window.matchMedia('(max-width: 60rem)').matches ? 160 : 140;
      let cur: string = SECTIONS[0][0];
      for (const [id] of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) cur = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = SECTIONS[SECTIONS.length - 1][0];
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const release = () => {
      hold.current = null;
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    for (const t of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) window.addEventListener(t, release, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      for (const t of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) window.removeEventListener(t, release);
    };
  }, []);

  // The current-section highlight glides from the old link to the new one (FLIP): the old box is still laid
  // out (just hidden), so it gives First; the new box is Last. Skipped while the bar itself is floating or docking.
  const prevActive = useRef(active);
  useLayoutEffect(() => {
    const from = prevActive.current;
    prevActive.current = active;
    const l = bar.list.current;
    if (from === active || !l || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const oldHl = l.querySelector<HTMLElement>(`[data-flip="hl:${from}"]`);
    const newHl = l.querySelector<HTMLElement>(`[data-flip="hl:${active}"]`);
    if (!oldHl || !newHl) return;
    const first = oldHl.getBoundingClientRect(); // includes a glide still in flight, so a retarget starts where it is on screen
    oldHl.getAnimations().forEach((a) => a.cancel());
    newHl.getAnimations().forEach((a) => a.cancel());
    if (bar.nav.current?.getAnimations({ subtree: true }).some((a) => !(a instanceof CSSTransition))) return;
    glideBox(newHl, first, oldHl);
  }, [active]);

  // When the bar scrolls sideways, keep the current section in view.
  useEffect(() => {
    const l = bar.list.current;
    const a = l?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!l || !a || l.dataset.overflow !== 'true') return;
    const lr = l.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    l.scrollBy({ left: ar.left - lr.left - (lr.width - ar.width) / 2, behavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="secnav-slot" ref={bar.slot}>
      <span className="secnav-probe" ref={bar.probe} aria-hidden />
      <nav ref={bar.nav} className={bar.floating ? 'secnav is-floating' : 'secnav'} aria-label="Sections">
        <span className="secnav__bg" data-flip="bg" data-flip-box aria-hidden />
        <div className="secnav__list" ref={bar.list}>
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} data-flip={id} aria-current={active === id ? 'true' : undefined} onClick={(e) => {
              e.preventDefault();
              hold.current = id;
              setActive(id);
              document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            }}>
              <span className="secnav__hl" data-flip={`hl:${id}`} data-flip-box="current" aria-hidden />
              {label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function BrowserDetail() {
  const { id } = useParams();
  const b = getBrowser(id);
  const { os: globalOs, pushRecent } = useApp();
  const [os, setOs] = useState<OsId | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [techy, setTechy] = useState(false);
  const [onlySupported, setOnlySupported] = useState(false);
  const featGrid = useRef<HTMLDivElement>(null);
  const flipFeatures = useFlip(featGrid, onlySupported);
  // Platform and "technical" are changed from several places, so these capture themselves (auto).
  const strengths = useRef<HTMLDivElement>(null);
  useFlip(strengths, os, true);
  const scoresSec = useRef<HTMLElement>(null);
  useFlip(scoresSec, techy, true);
  useDocTitle(b ? b.name : 'Not found');

  const fetchDetail = (id: string) => {
    setFailed(false);
    loadDetail(id)
      .then((d) => (d ? setDetail(d) : setFailed(true)))
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    if (!b) return;
    pushRecent(b.id);
    setOs(globalOs && b.platforms[globalOs] ? globalOs : null);
    setDetail(null);
    fetchDetail(b.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.id]);

  const scores = useMemo(() => (b ? scoresFor(b, os) : []), [b, os]);
  const ranks = useMemo(() => (b ? CATEGORIES.map((c) => categoryRank(b, c.id, os)) : []), [b, os]);
  // The browser being used right now, when it can be told and is not this one. A generic "Chromium-based" guess is skipped.
  const mine = useMemo(() => {
    const id = detect().browserId;
    return id && id !== 'chromium' && id !== b?.id ? getBrowser(id) : undefined;
  }, [b?.id]);
  if (!b) return <NotFound />;

  const total = overall(b, DEFAULT_WEIGHTS, os);
  const or = overallRank(b, os);
  const ps = pillarScores(b, os);
  const pillarRanks = PILLARS.map((p) => {
    const r = rank(pool({ os }), (x) => pillarScores(x, os)[p.id]);
    return r.find((x) => x.b.id === b.id)?.rank ?? null;
  });
  const order = CATEGORIES.map((c, i) => ({ c, v: scores[i], r: ranks[i] })).sort((a, z) => z.v - a.v);
  const strongest = order.slice(0, 4);
  const weakest = order.slice(-3).reverse();
  const osList = OSES.filter((o) => b.platforms[o.id]);
  const rival = similar(b, 1)[0];
  const engine = ENGINE_BY_ID[engineOn(b, os)];
  const live = pool({ os }).length;

  return (
    <div className="container page detail">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/browsers">Browsers</Link>
        <span aria-hidden>/</span>
        <Link to={`/browsers?group=${b.group}`}>{GROUP_LABEL[b.group]}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{b.name}</span>
      </nav>

      <header className="dhead">
        <div className="dhead__id">
          <BrowserMark b={b} size={72} />
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 6 }}>
              <StatusBadge b={b} />
              <ConfidenceBadge level={b.confidence} />
            </div>
            <h1>{b.name}</h1>
            <p className="dhead__meta">
              {b.developer}
              {b.releaseYear ? ` · since ${b.releaseYear}` : ''}
              {b.license ? ` · ${b.license}` : ''}
              {b.version.current ? ` · v${b.version.current.replace(/^v/i, '')}` : ''}
            </p>
            <p className="dhead__pitch">{b.pitch}</p>
            {b.statusNote && (
              <p className="dhead__alert">
                <AlertTriangle aria-hidden /> {b.statusNote}
              </p>
            )}
          </div>
        </div>
        <div className="dhead__score panel">
          <ScoreRing value={total} size={96} stroke={8} />
          <div>
            <p className="small muted">Overall{os ? ` on ${OS_BY_ID[os].name}` : ''}</p>
            <p className="dhead__rank">
              {b.status === 'discontinued' ? 'Discontinued' : or.rank ? <>#{or.rank} <span className="faint">of {or.of}</span></> : '—'}
            </p>
            <Link to="/about" className="link xs">
              How we score
            </Link>
          </div>
        </div>
      </header>

      <div className="dhead__bar">
        <FactsStrip b={b} os={os} showSecurity />
        <div className="row no-print">
          {b.website && (
            <a className="btn btn--primary" href={b.website} target="_blank" rel="noreferrer noopener">
              Visit website <ExternalLink aria-hidden />
            </a>
          )}
          <CompareToggle b={b} />
          <ShortlistToggle b={b} />
          {(mine || rival) && (
            <Link className="btn" to={`/vs?a=${b.id}&b=${(mine ?? rival)!.id}`}>
              <Swords aria-hidden /> {mine ? `Compare with your ${mine.name}` : `vs ${rival!.name}`}
            </Link>
          )}
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => window.print()} aria-label="Print this profile" title="Print this profile">
            <Printer aria-hidden />
          </button>
        </div>
      </div>

      {osList.length > 1 && (
        <div className="dos">
          <span className="small muted">Show details for</span>
          <Segmented
            label="Platform"
            value={os ?? 'all'}
            onChange={(v) => setOs(v === 'all' ? null : (v as OsId))}
            options={[{ value: 'all', label: 'General' }, ...osList.map((o) => ({ value: o.id, label: o.short }))]}
          />
        </div>
      )}

      <div className="dlayout">
        <SectionNav />
        <div className="dlayout__main">
          {/* ---------- overview ---------- */}
          <section id="overview" className="dsec" aria-labelledby="h-overview">
            <h2 id="h-overview">Overview</h2>
            {detail?.summary ? <p className="dlead">{detail.summary}</p> : !failed && <div className="skeleton" style={{ height: 48 }} />}
            <Collapse open={!!(os && b.platforms[os] && (b.platforms[os]!.notes.length > 0 || engine.id !== b.engine))}>
              {os && b.platforms[os] && (
              <div className="callout">
                <strong>On {OS_BY_ID[os].name}:</strong> {engine.id !== b.engine ? `uses the ${engine.name} engine. ` : ''}
                {b.platforms[os]!.notes.join(' ')}
              </div>
              )}
            </Collapse>
            <div className="ov-grid">
              <div className="panel panel-pad">
                <h3 className="h-sm">Pillar scores</h3>
                <Radar axes={PILLARS.map((p) => p.short)} series={[{ id: b.id, label: b.name, color: 'var(--series-1)', values: PILLARS.map((p) => ps[p.id]) }]} label={`${b.name} pillar scores`} />
                <ul className="pillar-list">
                  {PILLARS.map((p, i) => (
                    <li key={p.id}>
                      <a href={`#pillar-${p.id}`}>{p.name}</a>
                      <ScoreBar value={ps[p.id]} />
                      <ScoreNum value={ps[p.id]} size="sm" label={p.name} />
                      <span className="xs faint tnum">#{pillarRanks[i] ?? '–'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="stack" ref={strengths}>
                <div className="panel panel-pad">
                  <h3 className="h-sm">Strongest at</h3>
                  <ul className="strength">
                    {strongest.map(({ c, v, r }) => (
                      <li key={c.id} data-flip={`s:${c.id}`}>
                        <span>{c.name}</span>
                        <ScoreNum value={v} size="sm" label={c.name} />
                        {r.rank && r.rank <= Math.max(3, Math.round(live * 0.1)) && <span className="badge badge--positive">Top {Math.max(1, Math.round((r.rank / r.of) * 100))}%</span>}
                      </li>
                    ))}
                  </ul>
                  <h3 className="h-sm" style={{ marginTop: 'var(--s-4)' }}>
                    Weakest at
                  </h3>
                  <ul className="strength">
                    {weakest.map(({ c, v }) => (
                      <li key={c.id} data-flip={`w:${c.id}`}>
                        <span>{c.name}</span>
                        <ScoreNum value={v} size="sm" label={c.name} />
                      </li>
                    ))}
                  </ul>
                </div>
                {detail && (detail.bestFor.length > 0 || detail.notFor.length > 0) && (
                  <div className="fit-grid">
                    <div className="panel panel-pad fit fit--yes">
                      <h3 className="h-sm">
                        <ThumbsUp aria-hidden /> Best for
                      </h3>
                      <ul>
                        {detail.bestFor.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="panel panel-pad fit fit--no">
                      <h3 className="h-sm">
                        <ThumbsDown aria-hidden /> Skip if
                      </h3>
                      <ul>
                        {detail.notFor.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {detail && detail.signatureFeatures.length > 0 && (
              <div className="row" style={{ marginTop: 'var(--s-4)' }} aria-label="Signature features">
                <span className="small muted">Known for</span>
                {detail.signatureFeatures.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* ---------- scores ---------- */}
          <section id="scores" className="dsec" aria-labelledby="h-scores" ref={scoresSec}>
            <div className="dsec__head">
              <h2 id="h-scores">Scores in 40 categories</h2>
              <label className="switch">
                <input type="checkbox" checked={techy} onChange={(e) => setTechy(e.target.checked)} />
                Technical explanations
              </label>
            </div>
            {PILLARS.map((p, pi) => (
              <details key={p.id} id={`pillar-${p.id}`} className="pillar-block panel" open={pi < 3} data-flip={`p:${p.id}`}>
                <summary>
                  <span className="pillar-block__name">{p.name}</span>
                  <ScoreBar value={ps[p.id]} />
                  <ScoreNum value={ps[p.id]} label={p.name} />
                  <ChevronDown className="chev" aria-hidden />
                </summary>
                <ul className="cat-list">
                  {CATEGORIES.map((c, i) => ({ c, i }))
                    .filter(({ c }) => c.pillar === p.id)
                    .map(({ c, i }) => {
                      const note = detail?.scoreNotes[c.id];
                      return (
                        <li key={c.id} className="cat-row" data-flip={`c:${c.id}`}>
                          <div className="cat-row__name">
                            <Tip content={<><strong>{c.name}</strong><br />{techy ? c.techy : c.plain}<br /><span style={{ opacity: 0.75 }}>10 = {c.ten}</span></>}>
                              <span className="dotted">{c.name}</span>
                            </Tip>
                            <span className="cat-row__why">{note?.[0] || (techy ? c.techy : c.plain)}</span>
                          </div>
                          <ScoreBar value={scores[i]} />
                          <ScoreNum value={scores[i]} label={c.name} />
                          <span className="cat-row__meta">
                            <span className="tnum">#{ranks[i].rank ?? '–'}</span>
                            {note && <span className={`ev ev--${note[1]}`}>{EVIDENCE_LABEL[note[1]]}</span>}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </details>
            ))}
          </section>

          {/* ---------- features ---------- */}
          <section id="features" className="dsec" aria-labelledby="h-features">
            <div className="dsec__head">
              <h2 id="h-features">Features</h2>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={onlySupported}
                  onChange={(e) => {
                    flipFeatures(); // First: measure before the filter changes what is rendered
                    setOnlySupported(e.target.checked);
                  }}
                />
                Only show supported
              </label>
            </div>
            <ul className="legend" style={{ marginBottom: 'var(--s-4)' }} aria-label="Feature legend">
              {(['yes', 'partial', 'extension', 'paid', 'no'] as Support[]).map((s) => (
                <li key={s}>
                  <SupportMark s={s} /> {SUPPORT_LABEL[s]}
                </li>
              ))}
            </ul>
            <div className="feat-grid" ref={featGrid}>
              {FEATURE_FAMILIES.map((fam) => {
                const feats = FEATURES.filter((f) => f.family === fam.id).filter((f) => !onlySupported || b.features[FEATURE_INDEX[f.id]][0] !== 0);
                if (!feats.length) return null;
                return (
                  <div key={fam.id} className="panel feat-fam" data-flip={`fam:${fam.id}`}>
                    <h3 className="h-sm">{fam.name}</h3>
                    <ul>
                      {feats.map((f) => {
                        const [code, rating] = b.features[FEATURE_INDEX[f.id]];
                        const s = SUPPORT_CODES[code];
                        const note = detail?.featureNotes[f.id];
                        return (
                          <li key={f.id} data-flip={`feat:${f.id}`} className={`feat ${s === 'no' ? 'feat--no' : ''}`}>
                            <SupportMark s={s} />
                            <Tip content={<>{f.hint}{note ? <><br />{note}</> : null}</>}>
                              <span className="feat__name">{f.name}</span>
                            </Tip>
                            {s !== 'no' && <span className="feat__rating tnum" aria-label={`Quality ${rating} out of 10`}>{fmt(rating)}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------- specs ---------- */}
          <section id="specs" className="dsec" aria-labelledby="h-specs">
            <h2 id="h-specs">Specs</h2>
            <div className="spec-grid">
              <dl className="kv panel panel-pad">
                <dt>Developer</dt>
                <dd>{b.developer}</dd>
                <dt>Headquarters</dt>
                <dd>{b.hq || '—'}</dd>
                <dt>Core engine</dt>
                <dd>
                  {ENGINE_BY_ID[b.engine].name}
                  {b.basedOn ? ` · based on ${b.basedOn}` : ''}
                  {detail?.engineByOs && Object.keys(detail.engineByOs).length ? ` (${Object.entries(detail.engineByOs).map(([o, e]) => `${ENGINE_BY_ID[e!].name} on ${OS_BY_ID[o as OsId].short}`).join(', ')})` : ''}
                </dd>
                <dt>Current version</dt>
                <dd>
                  {b.version.current || '—'}
                  {b.version.date ? <span className="faint"> · {b.version.date}</span> : null}
                  {b.version.upstream ? <span className="faint"> · {b.version.upstream}</span> : null}
                </dd>
                <dt>Status</dt>
                <dd>{STATUS_LABEL[b.status]}</dd>
                <dt>License</dt>
                <dd>
                  {b.license || '—'} {b.openSource === true ? '(open source)' : b.openSource === 'partial' ? '(partly open)' : '(closed source)'}
                </dd>
                <dt>Price</dt>
                <dd>{b.price === 'free' ? 'Free' : b.price === 'freemium' ? `Free, with paid tiers${detail?.paidNote ? ` (${detail.paidNote})` : ''}` : `Paid${detail?.paidNote ? ` (${detail.paidNote})` : ''}`}</dd>
                <dt>Business model</dt>
                <dd>{detail?.businessModel || '—'}</dd>
                {detail?.channels.length ? (
                  <>
                    <dt>Release channels</dt>
                    <dd>{detail.channels.join(', ')}</dd>
                  </>
                ) : null}
                {detail?.updateCadence && (
                  <>
                    <dt>Update cadence</dt>
                    <dd>{detail.updateCadence}</dd>
                  </>
                )}
              </dl>
              <dl className="kv panel panel-pad">
                <dt>Sync</dt>
                <dd>
                  {b.keyFacts.sync.type === 'none' ? 'None' : `${b.keyFacts.sync.type === 'e2ee' ? 'End-to-end encrypted' : b.keyFacts.sync.type === 'self-hostable' ? 'Self-hostable' : b.keyFacts.sync.type === 'local-only' ? 'Local only' : 'Account sync'}${b.keyFacts.sync.items.length ? ': ' + b.keyFacts.sync.items.join(', ') : ''}`}
                  {b.keyFacts.sync.note ? <span className="faint"> · {b.keyFacts.sync.note}</span> : null}
                </dd>
                <dt>Password manager</dt>
                <dd>
                  {b.keyFacts.passwordManager.level === 'none' ? 'None' : b.keyFacts.passwordManager.level === 'full' ? 'Full' : 'Basic'}
                  {b.keyFacts.passwordManager.passkeys ? ' · passkeys' : ''}
                  {b.keyFacts.passwordManager.breachCheck ? ' · breach alerts' : ''}
                </dd>
                <dt>Manifest V2</dt>
                <dd>
                  {MV2_HELP[b.keyFacts.mv2.level]}
                  {b.keyFacts.mv2.note ? <span className="faint"> {b.keyFacts.mv2.note}</span> : null}
                </dd>
                <dt>uBlock Origin</dt>
                <dd>{{ full: 'Full version', lite: 'Lite (MV3) only', 'builtin-equivalent': 'Built-in blocker of similar strength', none: 'Not available' }[b.keyFacts.ublock]}</dd>
                <dt>Extensions on Android</dt>
                <dd>{{ none: 'No', 'own-store': 'Own add-on store', 'chrome-web-store': 'Chrome Web Store', 'firefox-addons': 'Firefox add-ons', 'crx-sideload': 'CRX files', 'n/a': 'No Android version' }[b.keyFacts.mobileExtensions.android]}</dd>
                <dt>AI</dt>
                <dd>
                  {{ none: 'None', 'opt-in': 'Opt-in', 'on-by-default': 'On by default', agentic: 'Agentic (acts for you)' }[b.keyFacts.ai.level]}
                  {b.keyFacts.ai.level !== 'none' && (b.keyFacts.ai.killSwitch ? ' · one switch turns it off' : ' · no single off switch')}
                  {b.keyFacts.ai.note ? <span className="faint"> · {b.keyFacts.ai.note}</span> : null}
                </dd>
                {detail &&
                  Object.entries(detail.spec).map(([k, v]) => (
                    <SpecRow key={k} k={k} v={v} />
                  ))}
              </dl>
            </div>
          </section>

          {/* ---------- platforms ---------- */}
          <section id="platforms" className="dsec" aria-labelledby="h-platforms">
            <h2 id="h-platforms">Platforms</h2>
            <div className="grid grid-3">
              {OSES.map((o) => {
                const p = b.platforms[o.id];
                const e = ENGINE_BY_ID[engineOn(b, o.id)];
                return (
                  <div key={o.id} className={`panel panel-pad plat ${p ? '' : 'plat--none'} ${os === o.id ? 'plat--on' : ''}`}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <h3 className="h-sm">{o.name}</h3>
                      {p ? <span className={`badge ${p.status === 'active' ? 'badge--positive' : p.status === 'discontinued' ? 'badge--negative' : 'badge--warning'}`}>{STATUS_LABEL[p.status]}</span> : <span className="badge">Not available</span>}
                    </div>
                    {p && (
                      <>
                        <p className="small muted">
                          {e.name} engine{p.minOs ? ` · ${p.minOs}+` : ''}
                          {p.arch?.length ? ` · ${p.arch.join(', ')}` : ''}
                        </p>
                        {p.stores.length > 0 && (
                          <div className="row" style={{ gap: 4 }}>
                            {p.stores.map((s) => (
                              <span key={s} className={`fact fact--sm ${s === 'google-play' || s === 'app-store' ? 'fact--accent' : ''}`}>
                                {STORE_LABEL[s]}
                              </span>
                            ))}
                          </div>
                        )}
                        {o.id === 'android' && !p.stores.includes('google-play') && <p className="xs" style={{ color: 'var(--warning)' }}>Not on Google Play</p>}
                        {(p.highlights.length > 0 || p.notes.length > 0) && (
                          <ul className="plat__notes">
                            {[...p.highlights, ...p.notes].slice(0, 5).map((n) => (
                              <li key={n}>{n}</li>
                            ))}
                          </ul>
                        )}
                        {p.scoreDelta && (
                          <div className="row" style={{ gap: 4 }}>
                            {Object.entries(p.scoreDelta).map(([k, d]) => (
                              <span key={k} className={`fact fact--sm ${d! > 0 ? 'fact--positive' : 'fact--negative'}`}>
                                {CATEGORIES.find((c) => c.id === k)?.name} {d! > 0 ? '+' : ''}
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                        <button className="btn btn--sm btn--ghost" onClick={() => { setOs(o.id); document.getElementById('overview')?.scrollIntoView(); }}>
                          See scores on {o.short}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------- privacy ---------- */}
          <section id="privacy" className="dsec" aria-labelledby="h-privacy">
            <h2 id="h-privacy">Privacy report card</h2>
            <div className="privacy-card panel panel-pad">
              <div className={`grade grade--${b.keyFacts.privacyGrade}`} aria-label={`Privacy grade ${b.keyFacts.privacyGrade}`}>
                {b.keyFacts.privacyGrade}
              </div>
              <div className="stack" style={{ gap: 'var(--s-3)' }}>
                {(['privacyDefaults', 'blocking', 'fingerprinting', 'telemetry', 'securityHardening', 'businessTrust'] as CategoryId[]).map((cid) => {
                  const c = CATEGORIES.find((x) => x.id === cid)!;
                  const v = scores[CATEGORIES.indexOf(c)];
                  return (
                    <div key={cid} className="pc-row">
                      <span>{c.name}</span>
                      <ScoreBar value={v} />
                      <ScoreNum value={v} size="sm" label={c.name} />
                    </div>
                  );
                })}
              </div>
              <dl className="kv privacy-card__kv">
                <dt>Out of the box</dt>
                <dd>{b.keyFacts.privacy.defaults || '—'}</dd>
                <dt>Telemetry</dt>
                <dd>{b.keyFacts.privacy.telemetry || '—'}</dd>
                <dt>Jurisdiction</dt>
                <dd>{b.keyFacts.privacy.jurisdiction || b.hq || '—'}</dd>
              </dl>
            </div>
          </section>

          {/* ---------- security ---------- */}
          <SecurityReport b={b} os={os} detail={detail} failed={failed} onRetry={() => fetchDetail(b.id)} />

          {/* ---------- pros & cons ---------- */}
          <section id="proscons" className="dsec" aria-labelledby="h-pc">
            <h2 id="h-pc">Pros & cons</h2>
            {detail ? (
              <div className="pc-grid">
                <ul className="panel pc pc--pro" aria-label="Pros">
                  {detail.pros.map((p) => (
                    <li key={p.title}>
                      <ThumbsUp aria-hidden />
                      <div>
                        <strong>{p.title}</strong>
                        <p>{p.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <ul className="panel pc pc--con" aria-label="Cons">
                  {detail.cons.map((p) => (
                    <li key={p.title}>
                      <ThumbsDown aria-hidden />
                      <div>
                        <strong>{p.title}</strong>
                        <p>{p.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="skeleton" style={{ height: 160 }} />
            )}
          </section>

          {/* ---------- FAQ ---------- */}
          <section id="faq" className="dsec" aria-labelledby="h-faq">
            <h2 id="h-faq">Questions</h2>
            <div className="panel faq">
              {detail?.faq.map((f) => (
                <details key={f.q} className="disclosure">
                  <summary>
                    {f.q}
                    <ChevronDown className="chev" aria-hidden />
                  </summary>
                  <p className="muted">{f.a}</p>
                </details>
              ))}
              {detail && detail.switching.note && (
                <details className="disclosure">
                  <summary>
                    How do I switch to {b.name}?
                    <ChevronDown className="chev" aria-hidden />
                  </summary>
                  <p className="muted">{detail.switching.note}</p>
                  {detail.switching.imports.length > 0 && (
                    <div className="row" style={{ marginTop: 8 }}>
                      <span className="small muted">Imports:</span>
                      {detail.switching.imports.map((i) => (
                        <span key={i} className="fact fact--sm">
                          {i}
                        </span>
                      ))}
                    </div>
                  )}
                </details>
              )}
            </div>
          </section>

          {/* ---------- history ---------- */}
          <section id="history" className="dsec" aria-labelledby="h-history">
            <h2 id="h-history">History</h2>
            <ol className="timeline">
              {[...(detail?.timeline ?? [])]
                .sort((a, z) => a.date.localeCompare(z.date))
                .map((t) => (
                  <li key={t.date + t.event}>
                    <time className="tnum">{t.date}</time>
                    <p>{t.event}</p>
                  </li>
                ))}
            </ol>
          </section>

          {/* ---------- sources ---------- */}
          <section id="sources" className="dsec" aria-labelledby="h-sources">
            <h2 id="h-sources">Sources</h2>
            <div className="panel panel-pad stack">
              <p className="small muted">
                Last verified {b.lastVerified}. Scores are editorial assessments grounded in these sources; each score above is marked measured, documented or editorial.
              </p>
              <ul className="sources">
                {detail?.sources.map((s) => (
                  <li key={s.url}>
                    <a className="link" href={s.url} target="_blank" rel="noreferrer noopener">
                      {s.title || s.url}
                    </a>
                    <ArrowUpRight aria-hidden />
                  </li>
                ))}
              </ul>
              {detail && detail.unverified.length > 0 && (
                <div className="callout callout--warning">
                  <strong>Not independently verified:</strong>
                  <ul>
                    {detail.unverified.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section className="dsec" aria-labelledby="h-similar">
            <h2 id="h-similar">Similar browsers</h2>
            <div className="grid grid-2">
              {similar(b).map((x) => (
                <BrowserCard key={x.id} b={x} os={os} />
              ))}
            </div>
            {detail && detail.alternatives.filter((a) => getBrowser(a)).length > 0 && (
              <div className="row" style={{ marginTop: 'var(--s-4)' }}>
                <span className="small muted">Also consider</span>
                {detail.alternatives
                  .map((a) => getBrowser(a))
                  .filter(Boolean)
                  .map((x) => (
                    <Link key={x!.id} to={`/browser/${x!.id}`} className="chip">
                      <BrowserMark b={x!} size={18} flat />
                      {x!.name}
                    </Link>
                  ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const SPEC_LABEL: Record<string, string> = {
  defaultSearch: 'Default search',
  telemetry: 'Telemetry',
  drm: 'DRM',
  codecs: 'Video codecs',
  sandbox: 'Sandboxing',
  patchLag: 'Security patches',
  languages: 'Languages',
};
function SpecRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{SPEC_LABEL[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</dt>
      <dd>{v}</dd>
    </>
  );
}
