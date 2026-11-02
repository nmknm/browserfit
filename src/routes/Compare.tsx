import { Crown, Download, FileText, GitCompare, Link2, Printer, X } from 'lucide-react';
import { compareTable, downloadText, toCsv, toMarkdown, today } from '../lib/exportTable';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFlip } from '../lib/motion';
import { Link } from 'react-router-dom';
import { engineOn, getBrowser, scoresFor } from '../lib/data';
import { CATEGORIES, FEATURE_FAMILIES, FEATURES, FEATURE_INDEX, OSES, OS_BY_ID, PILLARS, STORE_LABEL, SUPPORT_CODES } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, fmt, overall, personaWeights, pillarScores } from '../lib/scoring';
import type { BrowserIndex, OsId } from '../lib/types';
import { COMPARE_MAX, useApp } from '../lib/store';
import { useDocTitle, useListParam, useParam } from '../lib/hooks';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ScoreBar, ScoreNum } from '../components/ui/Score';
import { Radar } from '../components/charts/Radar';
import { BrowserPicker } from '../components/BrowserPicker';
import { Empty } from '../components/ui/Controls';
import { EngineBadge, MV2_LABEL, PrivacyGrade, SecurityGrade } from '../components/ui/Facts';
import { BOUNTY_LABEL, HTTPS_LABEL, ISOLATION_LABEL, LAG_LABEL, LAYERS, SAFE_LABEL, SANDBOX_LABEL, UPDATE_LABEL, securityFor, updateFor } from '../lib/security';
import { SupportMark } from './BrowserDetail';
import { PERSONAS } from '../data/personas';

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)'];

function Winner() {
  return (
    <span className="win" aria-label="Best in this comparison">
      <Crown aria-hidden />
      <span className="sr-only">Best</span>
    </span>
  );
}

export default function Compare() {
  useDocTitle('Compare browsers');
  const { compare, setCompare, os: globalOs, toast } = useApp();
  const [ids, setIds] = useListParam('b');
  const [osParam, setOsParam] = useParam('os');
  const [diffOnly, setDiffOnly] = useState(true);
  const os = (osParam as OsId | null) ?? globalOs;

  // URL is the source of truth; fall back to the tray when the URL is empty.
  useEffect(() => {
    if (!ids.length && compare.length) setIds(compare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const unknown = ids.filter((i) => !getBrowser(i));
  const list = ids.map(getBrowser).filter(Boolean).slice(0, COMPARE_MAX) as BrowserIndex[];
  useEffect(() => {
    setCompare(list.map((b) => b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  const add = (b: BrowserIndex) => setIds([...list.map((x) => x.id), b.id].slice(0, COMPARE_MAX));
  const remove = (id: string) => setIds(list.map((x) => x.id).filter((x) => x !== id));
  const scores = useMemo(() => list.map((b) => scoresFor(b, os)), [list, os]);
  const totals = list.map((b) => overall(b, DEFAULT_WEIGHTS, os));
  const pillars = list.map((b) => pillarScores(b, os));
  const secs = list.map((b) => securityFor(b, os));
  // FLIP: toggling a section or the differences filter, adding or removing a browser, or switching platform reflows the grid.
  const grid = useRef<HTMLDivElement>(null);
  const [openState, setOpenState] = useState<Record<string, boolean>>({}); // explicit open/closed per group; unset means its default
  const colKeys = list.map((b) => b.id);
  const flip = useFlip(grid, JSON.stringify([diffOnly, openState]), false);
  useFlip(grid, colKeys.join() + '|' + os, true);
  const toggleGroup = (title: string, now: boolean) => {
    flip();
    setOpenState((m) => ({ ...m, [title]: !now }));
  };

  const best = (vals: number[]) => {
    const m = Math.max(...vals);
    const winners = vals.filter((v) => v === m).length;
    return { m, tie: winners > 1 && winners === vals.length };
  };

  if (list.length === 0) {
    return (
      <div className="container page">
        <div className="page-head">
          <div>
            <h1>Compare browsers</h1>
            <p className="lede">Put up to {COMPARE_MAX} browsers side by side: key facts, 40 scores and every feature.</p>
          </div>
        </div>
        {unknown.length > 0 && (
          <div className="callout callout--warning">
            We couldn’t find {unknown.join(', ')}. The link may be old; pick browsers below instead.
          </div>
        )}
        <div className="panel">
          <Empty icon={<GitCompare />} title="Pick at least two browsers" action={<div style={{ width: 'min(100%, 24rem)' }}><BrowserPicker onPick={add} autoFocus /></div>}>
            Search for a browser to start, or use “Compare” on any browser card.
          </Empty>
          <div className="row" style={{ justifyContent: 'center', paddingBottom: 'var(--s-8)' }}>
            <span className="small muted">Popular:</span>
            {[
              ['firefox', 'brave'],
              ['chrome', 'edge'],
              ['zen', 'vivaldi'],
              ['librewolf', 'mullvad-browser'],
              ['titanium', 'bare'],
            ]
              .filter((p) => p.every((x) => getBrowser(x)))
              .map((p) => (
                <button key={p.join()} className="chip" onClick={() => setIds(p)}>
                  {p.map((x) => getBrowser(x)!.name).join(' vs ')}
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  }

  const cols = `var(--cmp-label, minmax(9rem, 13rem)) repeat(${list.length}, minmax(var(--cmp-col, 8.5rem), 1fr))`;
  const featRows = FEATURES.filter((f) => {
    if (!diffOnly) return true;
    const vals = list.map((b) => b.features[FEATURE_INDEX[f.id]][0]);
    return new Set(vals).size > 1;
  });

  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Compare {list.map((b) => b.name).join(' vs ')}</h1>
          <p className="lede">Key facts first, then scores and features. Winners are marked with a crown.</p>
        </div>
        <div className="row">
          <label>
            <span className="sr-only">Platform</span>
            <select className="input select" value={os ?? ''} onChange={(e) => setOsParam(e.target.value || null)}>
              <option value="">All platforms</option>
              {OSES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href).then(
                () => toast('Link copied'),
                () => toast('Copy the address bar to share this comparison'),
              );
            }}
          >
            <Link2 aria-hidden /> Copy link
          </button>
        </div>
      </div>
      <div className="row no-print cmp-export" role="group" aria-label="Export this comparison">
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() =>
            navigator.clipboard?.writeText(toMarkdown(compareTable(list, os), `Comparison: ${list.map((b) => b.name).join(' vs ')}`)).then(
              () => toast('Table copied as Markdown.'),
              () => toast('Couldn’t copy. Try the CSV download instead.'),
            ) ?? toast('Couldn’t copy. Try the CSV download instead.')
          }
        >
          <FileText aria-hidden /> Copy as Markdown
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => downloadText(`browserfit-compare-${today()}.csv`, toCsv(compareTable(list, os)), 'text/csv')}>
          <Download aria-hidden /> Download CSV
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => window.print()}>
          <Printer aria-hidden /> Print
        </button>
      </div>

      {list.length < COMPARE_MAX && (
        <div className="cmp-add-mobile">
          <BrowserPicker onPick={add} exclude={list.map((b) => b.id)} />
        </div>
      )}
      <div className="cmp-scroll">
        <div className="cmp" ref={grid} style={{ gridTemplateColumns: cols }}>
          {/* header row */}
          <div className="cmp__corner">
            {list.length < COMPARE_MAX && <BrowserPicker onPick={add} exclude={list.map((b) => b.id)} />}
          </div>
          {list.map((b, i) => (
            <div key={b.id} data-flip={`h:${b.id}`} className="cmp__head">
              <span className="cmp__swatch" style={{ background: SERIES[i] }} aria-hidden />
              <button className="btn btn--ghost btn--icon btn--sm cmp__remove" onClick={() => remove(b.id)} aria-label={`Remove ${b.name}`}>
                <X />
              </button>
              <Link to={`/browser/${b.id}`} className="cmp__id">
                <BrowserMark b={b} size={40} />
                <span className="cmp__name">{b.name}</span>
              </Link>
              <ScoreNum value={totals[i]} size="lg" label="Overall" />
              {totals[i] === Math.max(...totals) && list.length > 1 && <Winner />}
              {os && !b.platforms[os] && <span className="badge badge--warning">Not on {OS_BY_ID[os].short}</span>}
            </div>
          ))}

          {/* key facts */}
          <div className="cmp__section" data-flip="s:facts">Key facts</div>
          <Row label="Core engine" cells={list.map((b) => <EngineBadge key={b.id} engine={engineOn(b, os)} small />)} />
          <Row label="Privacy grade" cells={list.map((b) => <PrivacyGrade key={b.id} grade={b.keyFacts.privacyGrade} small />)} />
          <Row label="Sync" cells={list.map((b) => <span key={b.id}>{b.keyFacts.sync.type === 'none' ? 'None' : b.keyFacts.sync.type === 'e2ee' ? 'Encrypted' : b.keyFacts.sync.type === 'self-hostable' ? 'Self-hostable' : b.keyFacts.sync.type === 'local-only' ? 'Local only' : 'Account'}{b.keyFacts.sync.crossOs ? ' · all OSes' : ''}</span>)} />
          <Row label="Password manager" cells={list.map((b) => <span key={b.id}>{b.keyFacts.passwordManager.level === 'none' ? 'None' : b.keyFacts.passwordManager.level === 'full' ? 'Full' : 'Basic'}{b.keyFacts.passwordManager.passkeys ? ' · passkeys' : ''}</span>)} />
          <Row label="Manifest V2" cells={list.map((b) => <span key={b.id}>{MV2_LABEL[b.keyFacts.mv2.level]}</span>)} />
          <Row label="uBlock Origin" cells={list.map((b) => <span key={b.id}>{{ full: 'Full', lite: 'Lite only', 'builtin-equivalent': 'Built-in blocker', none: 'No' }[b.keyFacts.ublock]}</span>)} />
          <Row label="Android extensions" cells={list.map((b) => <span key={b.id}>{{ none: 'No', 'own-store': 'Own store', 'chrome-web-store': 'Chrome Web Store', 'firefox-addons': 'Firefox add-ons', 'crx-sideload': 'CRX files', 'n/a': '—' }[b.keyFacts.mobileExtensions.android]}</span>)} />
          <Row label="AI" cells={list.map((b) => <span key={b.id}>{{ none: 'None', 'opt-in': 'Opt-in', 'on-by-default': 'On by default', agentic: 'Agents' }[b.keyFacts.ai.level]}{b.keyFacts.ai.level !== 'none' && b.keyFacts.ai.killSwitch ? ' · off switch' : ''}</span>)} />
          <Row label="Open source" cells={list.map((b) => <span key={b.id}>{b.openSource === true ? 'Yes' : b.openSource === 'partial' ? 'Partly' : 'No'}</span>)} />
          <Row label="Price" cells={list.map((b) => <span key={b.id}>{b.price === 'free' ? 'Free' : b.price === 'freemium' ? 'Free + paid' : 'Paid'}</span>)} />
          {OSES.map((o) => (
            <Row
              key={o.id}
              label={`On ${o.name}`}
              cells={list.map((b) => {
                const p = b.platforms[o.id];
                return p ? (
                  <span key={b.id} className="xs">
                    {p.stores.slice(0, 3).map((s) => STORE_LABEL[s]).join(', ') || 'Available'}
                    {p.status !== 'active' ? ` (${p.status})` : ''}
                  </span>
                ) : (
                  <span key={b.id} className="faint">
                    —
                  </span>
                );
              })}
            />
          ))}

          {/* security */}
          <Group title="Security" isOpen={openState.Security ?? true} onToggle={toggleGroup} cols={colKeys}>
            <Row label="Security grade" cells={list.map((b) => <SecurityGrade key={b.id} b={b} os={os} small />)} />
            <Row
              label="Security score"
              cells={(() => {
                const vals = secs.map((x) => x.score);
                const { m, tie } = best(vals);
                return vals.map((v, i) => (
                  <span key={i} className="cmp__score">
                    <ScoreBar value={v} compact animate={false} />
                    <ScoreNum value={v} size="sm" label="Security score" />
                    {v === m && !tie && list.length > 1 && <Winner />}
                  </span>
                ));
              })()}
            />
            {LAYERS.map((l) => {
              const vals = secs.map((x) => x.layers[l.id].score);
              const { m, tie } = best(vals);
              return (
                <Row
                  key={l.id}
                  label={l.name}
                  cells={vals.map((v, i) => (
                    <span key={i} className="cmp__score">
                      <ScoreBar value={v} compact animate={false} />
                      <ScoreNum value={v} size="sm" label={l.name} />
                      {v === m && !tie && list.length > 1 && <Winner />}
                    </span>
                  ))}
                />
              );
            })}
            <Row label="Sandbox" cells={list.map((b) => <span key={b.id}>{SANDBOX_LABEL[b.security.sandbox]}</span>)} />
            <Row label="Site isolation" cells={list.map((b) => <span key={b.id}>{ISOLATION_LABEL[b.security.siteIsolation]}</span>)} />
            <Row label="Fix delivery" cells={list.map((b) => <span key={b.id}>{LAG_LABEL[b.security.patchLag]}</span>)} />
            <Row label={os ? 'Updates on ' + OS_BY_ID[os].short : 'Updates'} cells={list.map((b) => <span key={b.id}>{UPDATE_LABEL[updateFor(b, os)]}</span>)} />
            <Row label="HTTPS-only mode" cells={list.map((b) => <span key={b.id}>{HTTPS_LABEL[b.security.httpsFirst]}</span>)} />
            <Row label="Bad-site warnings" cells={list.map((b) => <span key={b.id}>{SAFE_LABEL[b.security.safeBrowsing]}</span>)} />
            <Row label="Bug-bounty program" cells={list.map((b) => <span key={b.id}>{BOUNTY_LABEL[b.security.bugBounty]}</span>)} />
          </Group>

          {/* pillars */}
          <div className="cmp__section" data-flip="s:pillars">Pillars</div>
          {PILLARS.map((p) => {
            const vals = pillars.map((x) => x[p.id]);
            const { m, tie } = best(vals);
            return (
              <Row
                key={p.id}
                label={p.name}
                cells={vals.map((v, i) => (
                  <span key={i} className="cmp__score">
                    <ScoreBar value={v} compact />
                    <ScoreNum value={v} size="sm" label={p.name} />
                    {v === m && !tie && list.length > 1 && <Winner />}
                  </span>
                ))}
              />
            );
          })}

          {/* categories */}
          {PILLARS.map((p) => (
            <Group key={p.id} title={p.name} isOpen={openState[p.name] ?? false} onToggle={toggleGroup} cols={colKeys}>
              {CATEGORIES.map((c, ci) => ({ c, ci }))
                .filter(({ c }) => c.pillar === p.id)
                .map(({ c, ci }) => {
                  const vals = scores.map((s) => s[ci]);
                  const { m, tie } = best(vals);
                  return (
                    <Row
                      key={c.id}
                      label={c.name}
                      cells={vals.map((v, i) => (
                        <span key={i} className="cmp__score">
                          <ScoreBar value={v} compact animate={false} />
                          <ScoreNum value={v} size="sm" label={c.name} />
                          {v === m && !tie && list.length > 1 && <Winner />}
                        </span>
                      ))}
                    />
                  );
                })}
            </Group>
          ))}

          {/* features */}
          <div className="cmp__section cmp__section--bar" data-flip="s:features">
            <span>Features</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={diffOnly}
                onChange={(e) => {
                  flip(); // First
                  setDiffOnly(e.target.checked);
                }}
              />
              Only differences ({featRows.length})
            </label>
          </div>
          {FEATURE_FAMILIES.map((fam) => {
            const rows = featRows.filter((f) => f.family === fam.id);
            if (!rows.length) return null;
            return (
              <Group key={fam.id} title={fam.name} isOpen={openState[fam.name] ?? true} onToggle={toggleGroup} cols={colKeys}>
                {rows.map((f) => (
                  <Row
                    key={f.id}
                    label={f.name}
                    cells={list.map((b) => {
                      const [code, rating] = b.features[FEATURE_INDEX[f.id]];
                      const s = SUPPORT_CODES[code];
                      return (
                        <span key={b.id} className="cmp__feat">
                          <SupportMark s={s} />
                          {s !== 'no' && <span className="tnum xs muted">{fmt(rating)}</span>}
                        </span>
                      );
                    })}
                  />
                ))}
              </Group>
            );
          })}
        </div>
      </div>

      <section className="section" aria-labelledby="h-radar">
        <div className="section-head">
          <h2 id="h-radar">Shape of each browser</h2>
          <p>Pillar scores out of 10{os ? ` on ${OS_BY_ID[os].name}` : ''}.</p>
        </div>
        {list.length <= 3 ? (
          <div className="panel panel-pad">
            <ul className="legend" style={{ justifyContent: 'center' }}>
              {list.map((b, i) => (
                <li key={b.id}>
                  <i style={{ background: SERIES[i] }} />
                  {b.name}
                </li>
              ))}
            </ul>
            <Radar axes={PILLARS.map((p) => p.short)} series={list.map((b, i) => ({ id: b.id, label: b.name, color: SERIES[i], values: PILLARS.map((p) => pillars[i][p.id]) }))} label="Pillar comparison" size={360} />
          </div>
        ) : (
          <div className="grid grid-3">
            {list.map((b, i) => (
              <div key={b.id} className="panel panel-pad">
                <h3 className="h-sm">
                  <i className="legend-dot" style={{ background: SERIES[i] }} /> {b.name}
                </h3>
                <Radar axes={PILLARS.map((p) => p.short)} series={[{ id: b.id, label: b.name, color: SERIES[i], values: PILLARS.map((p) => pillars[i][p.id]) }]} label={`${b.name} pillars`} size={280} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="h-verdict">
        <div className="section-head">
          <h2 id="h-verdict">Who should pick which</h2>
          <p>The best of these {list.length} for each kind of user.</p>
        </div>
        <div className="grid grid-3">
          {PERSONAS.map((p) => {
            const w = personaWeights(p.boost);
            const vals = list.map((b) => overall(b, w, os));
            const top = vals.indexOf(Math.max(...vals));
            const second = [...vals].sort((a, z) => z - a)[1];
            const b = list[top];
            return (
              <div key={p.id} className="panel panel-pad verdict">
                <p className="small muted">{p.name}</p>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <BrowserMark b={b} size={32} />
                  <strong className="truncate" style={{ flex: 1 }}>
                    {b.name}
                  </strong>
                  <ScoreNum value={vals[top]} label={`${b.name} for ${p.name}`} />
                </div>
                <p className="xs faint">{list.length > 1 && second != null ? (vals[top] - second < 0.15 ? 'Close call' : `Leads by ${fmt(vals[top] - second)}`) : p.blurb}</p>
              </div>
            );
          })}
        </div>
      </section>

      {list.length >= 2 && (
        <p className="small muted" style={{ marginTop: 'var(--s-8)' }}>
          Want a closer look at two of these?{' '}
          <Link className="link" to={`/vs?a=${list[0].id}&b=${list[1].id}`}>
            Open {list[0].name} vs {list[1].name} head to head
          </Link>
          .
        </p>
      )}
    </div>
  );
}

const Ctx = createContext<{ group: string; cols: string[] }>({ group: '', cols: [] });

function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  const { group, cols } = useContext(Ctx);
  const k = `r:${group}:${label}`;
  return (
    <>
      <div className="cmp__label" data-flip={k}>
        {label}
      </div>
      {cells.map((c, i) => (
        <div key={cols[i] ?? i} className="cmp__cell" data-flip={`${k}:${cols[i] ?? i}`}>
          {c}
        </div>
      ))}
    </>
  );
}

/** Open state lives in Compare so a toggle can capture First before it changes. */
function Group({ title, children, isOpen, onToggle, cols }: { title: string; children: React.ReactNode; isOpen: boolean; onToggle: (title: string, now: boolean) => void; cols: string[] }) {
  return (
    <>
      <button className="cmp__section cmp__section--toggle" data-flip={`g:${title}`} aria-expanded={isOpen} onClick={() => onToggle(title, isOpen)}>
        <span>{title}</span>
        <span className="xs muted">{isOpen ? 'Hide' : 'Show'}</span>
      </button>
      {isOpen && <Ctx.Provider value={{ group: title, cols }}>{children}</Ctx.Provider>}
    </>
  );
}
