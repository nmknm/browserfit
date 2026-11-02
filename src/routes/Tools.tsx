import { ArrowRight, ArrowRightLeft, Check, Minus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BROWSERS, getBrowser, scoresFor, feature } from '../lib/data';
import { CATEGORIES, FEATURES, FEATURE_FAMILIES, FEATURE_INDEX, OSES, OS_BY_ID } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, fmt, overall } from '../lib/scoring';
import type { BrowserIndex, OsId } from '../lib/types';
import { useDocTitle, useListParam, useParam } from '../lib/hooks';
import { useApp } from '../lib/store';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ScoreNum } from '../components/ui/Score';
import { BrowserPicker } from '../components/BrowserPicker';
import { Empty } from '../components/ui/Controls';
import { Collapse } from '../components/ui/Collapse';
import { MV2_LABEL } from '../components/ui/Facts';
import { SupportMark } from './BrowserDetail';
import { PERSONAS } from '../data/personas';
import { personaWeights } from '../lib/scoring';

const supported = (b: BrowserIndex, fid: string) => {
  const c = b.features[FEATURE_INDEX[fid]]?.[0] ?? 0;
  return c === 1 || c === 2 || c === 3 || c === 4;
};

function OsSelect({ value, onChange }: { value: OsId | null; onChange: (v: string | null) => void }) {
  return (
    <label>
      <span className="sr-only">Platform</span>
      <select className="input select" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">All platforms</option>
        {OSES.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/* =========================== Head to head =========================== */

export function Versus() {
  const [a, setA] = useParam('a');
  const [b, setB] = useParam('b');
  const [osP, setOs] = useParam('os');
  const { os: g } = useApp();
  const os = (osP as OsId | null) ?? g;
  const A = getBrowser(a);
  const B = getBrowser(b);
  useDocTitle(A && B ? `${A.name} vs ${B.name}` : 'Head to head');

  const PAIRS = [
    ['firefox', 'chrome'],
    ['brave', 'firefox'],
    ['zen', 'vivaldi'],
    ['librewolf', 'mullvad-browser'],
    ['edge', 'chrome'],
    ['titanium', 'bare'],
    ['waterfox', 'floorp'],
    ['safari', 'chrome'],
  ].filter((p) => p.every((x) => getBrowser(x)));

  if (!A || !B) {
    return (
      <div className="container page">
        <div className="page-head">
          <div>
            <h1>Head to head</h1>
            <p className="lede">Two browsers, all 40 categories, one verdict.</p>
          </div>
        </div>
        <div className="panel panel-pad vs-pick">
          <div>
            <span className="label">First browser</span>
            {A ? <div className="chip is-on">{A.name}</div> : <BrowserPicker onPick={(x) => setA(x.id)} label="Pick the first browser" />}
          </div>
          <ArrowRightLeft aria-hidden className="vs-pick__icon" />
          <div>
            <span className="label">Second browser</span>
            {B ? <div className="chip is-on">{B.name}</div> : <BrowserPicker onPick={(x) => setB(x.id)} exclude={A ? [A.id] : []} label="Pick the second browser" />}
          </div>
        </div>
        <div className="row" style={{ marginTop: 'var(--s-6)' }}>
          <span className="small muted">Popular match-ups:</span>
          {PAIRS.map((p) => (
            <Link key={p.join()} className="chip" to={`/vs?a=${p[0]}&b=${p[1]}`}>
              {getBrowser(p[0])!.name} vs {getBrowser(p[1])!.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const sa = scoresFor(A, os);
  const sb = scoresFor(B, os);
  let wa = 0,
    wb = 0,
    ties = 0;
  sa.forEach((v, i) => (v > sb[i] ? wa++ : v < sb[i] ? wb++ : ties++));
  const diffs = CATEGORIES.map((c, i) => ({ c, a: sa[i], b: sb[i], d: sa[i] - sb[i] })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  const ta = overall(A, DEFAULT_WEIGHTS, os);
  const tb = overall(B, DEFAULT_WEIGHTS, os);
  const featA = FEATURES.filter((f) => supported(A, f.id) && !supported(B, f.id));
  const featB = FEATURES.filter((f) => supported(B, f.id) && !supported(A, f.id));

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>
            {A.name} vs {B.name}
          </h1>
          <p className="lede">
            {A.name} wins {wa} categories, {B.name} wins {wb}
            {ties ? `, ${ties} tied` : ''}
            {os ? ` on ${OS_BY_ID[os].name}` : ''}.
          </p>
        </div>
        <div className="row">
          <OsSelect value={os} onChange={setOs} />
          <Link className="btn" to={`/vs?a=${B.id}&b=${A.id}${os ? `&os=${os}` : ''}`}>
            <ArrowRightLeft aria-hidden /> Swap
          </Link>
          <Link className="btn" to={`/compare?b=${A.id},${B.id}`}>
            Full comparison
          </Link>
        </div>
      </div>

      <div className="vs-head">
        {[A, B].map((x, i) => (
          <Link key={x.id} to={`/browser/${x.id}`} className={`panel vs-side ${i === 1 ? 'vs-side--b' : ''}`}>
            <BrowserMark b={x} size={56} />
            <div style={{ minWidth: 0 }}>
              <h2 className="truncate">{x.name}</h2>
              <p className="small muted truncate">{x.pitch}</p>
            </div>
            <ScoreNum value={i === 0 ? ta : tb} size="xl" label="Overall" />
          </Link>
        ))}
        <div className="vs-score" aria-label={`Categories won: ${A.name} ${wa}, ${B.name} ${wb}, ties ${ties}`}>
          <span style={{ flex: wa || 0.001, background: 'var(--series-1)' }} />
          <span style={{ flex: ties || 0.001, background: 'var(--surface-3)' }} />
          <span style={{ flex: wb || 0.001, background: 'var(--series-2)' }} />
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Category by category</h2>
          <p>Biggest differences first.</p>
        </div>
        <ul className="panel tug">
          {diffs.map(({ c, a: va, b: vb, d }) => (
            <li key={c.id}>
              <span className={`tug__v tnum ${d > 0 ? 'is-win' : ''}`}>{fmt(va)}</span>
              <span className="tug__track" aria-hidden>
                <span className="tug__a" style={{ width: `${Math.max(0, d) * 10}%` }} />
                <span className="tug__mid" />
                <span className="tug__b" style={{ width: `${Math.max(0, -d) * 10}%` }} />
              </span>
              <span className={`tug__v tnum ${d < 0 ? 'is-win' : ''}`}>{fmt(vb)}</span>
              <span className="tug__name">
                {c.name}
                <span className="sr-only">
                  : {A.name} {fmt(va)}, {B.name} {fmt(vb)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section split">
        {[
          { x: A, list: featA },
          { x: B, list: featB },
        ].map(({ x, list }) => (
          <div key={x.id}>
            <div className="section-head">
              <h2>Only {x.name} has</h2>
            </div>
            <div className="panel panel-pad">
              {list.length ? (
                <div className="row">
                  {list.map((f) => (
                    <span key={f.id} className="chip">
                      {f.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="muted small">Nothing the other doesn’t also have.</p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Who should pick which</h2>
        </div>
        <div className="grid grid-3">
          {PERSONAS.map((p) => {
            const w = personaWeights(p.boost);
            const va = overall(A, w, os);
            const vb = overall(B, w, os);
            const win = va >= vb ? A : B;
            return (
              <div key={p.id} className="panel panel-pad verdict">
                <p className="small muted">{p.name}</p>
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <BrowserMark b={win} size={28} />
                  <strong style={{ flex: 1 }}>{Math.abs(va - vb) < 0.1 ? 'Either' : win.name}</strong>
                  <span className="tnum small muted">
                    {fmt(va)} vs {fmt(vb)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* =========================== Switch planner =========================== */

export function SwitchPlanner() {
  const [from, setFrom] = useParam('from');
  const [to, setTo] = useParam('to');
  const F = getBrowser(from);
  const T = getBrowser(to);
  useDocTitle(F && T ? `Switch from ${F.name} to ${T.name}` : 'Switch planner');
  const sf = F ? scoresFor(F) : [];
  const st = T ? scoresFor(T) : [];
  const gains = F && T ? CATEGORIES.map((c, i) => ({ c, d: st[i] - sf[i] })).filter((x) => x.d >= 1).sort((a, b) => b.d - a.d) : [];
  const losses = F && T ? CATEGORIES.map((c, i) => ({ c, d: st[i] - sf[i] })).filter((x) => x.d <= -1).sort((a, b) => a.d - b.d) : [];
  const lostFeatures = F && T ? FEATURES.filter((f) => supported(F, f.id) && !supported(T, f.id)) : [];
  const newFeatures = F && T ? FEATURES.filter((f) => supported(T, f.id) && !supported(F, f.id)) : [];
  const sameEngine = F && T && F.engine === T.engine;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Switch planner</h1>
          <p className="lede">See what you gain, what you lose, and how to move your data before you switch.</p>
        </div>
      </div>
      <div className="panel panel-pad vs-pick">
        <div>
          <span className="label">I use</span>
          {F ? (
            <button className="chip is-on" onClick={() => setFrom(null)}>
              {F.name} <X aria-hidden />
            </button>
          ) : (
            <BrowserPicker onPick={(x) => setFrom(x.id)} label="Your current browser" />
          )}
        </div>
        <ArrowRight aria-hidden className="vs-pick__icon" />
        <div>
          <span className="label">I’m thinking of</span>
          {T ? (
            <button className="chip is-on" onClick={() => setTo(null)}>
              {T.name} <X aria-hidden />
            </button>
          ) : (
            <BrowserPicker onPick={(x) => setTo(x.id)} exclude={F ? [F.id] : []} label="The browser to switch to" />
          )}
        </div>
      </div>

      <Collapse open={!!(F && T)}>
        {F && T && (
        <>
          <section className="section split">
            <div>
              <div className="section-head">
                <h2>You gain</h2>
              </div>
              <ul className="panel delta-list">
                {gains.length ? (
                  gains.map(({ c, d }) => (
                    <li key={c.id}>
                      <span>{c.name}</span>
                      <span className="badge badge--positive tnum">+{fmt(d)}</span>
                    </li>
                  ))
                ) : (
                  <li className="muted">No category improves by a full point.</li>
                )}
              </ul>
            </div>
            <div>
              <div className="section-head">
                <h2>You lose</h2>
              </div>
              <ul className="panel delta-list">
                {losses.length ? (
                  losses.map(({ c, d }) => (
                    <li key={c.id}>
                      <span>{c.name}</span>
                      <span className="badge badge--negative tnum">{fmt(d)}</span>
                    </li>
                  ))
                ) : (
                  <li className="muted">No category gets worse by a full point.</li>
                )}
              </ul>
            </div>
          </section>
          <section className="section split">
            <div>
              <div className="section-head">
                <h2>Features you’d lose</h2>
              </div>
              <div className="panel panel-pad row">{lostFeatures.length ? lostFeatures.map((f) => <span key={f.id} className="chip"><Minus aria-hidden /> {f.name}</span>) : <span className="muted small">None.</span>}</div>
            </div>
            <div>
              <div className="section-head">
                <h2>New features</h2>
              </div>
              <div className="panel panel-pad row">{newFeatures.length ? newFeatures.map((f) => <span key={f.id} className="chip is-on"><Check aria-hidden /> {f.name}</span>) : <span className="muted small">None.</span>}</div>
            </div>
          </section>
          <section className="section">
            <div className="section-head">
              <h2>Your migration checklist</h2>
            </div>
            <ol className="panel panel-pad steps">
              <li>
                <strong>Export or sync your passwords.</strong> {F.keyFacts.passwordManager.level !== 'none' ? `Export them from ${F.name}’s password manager as CSV, or move to a standalone manager first.` : 'You use a separate manager, so just install its extension.'}
              </li>
              <li>
                <strong>Bring your bookmarks and history.</strong> Most browsers import directly from {F.name} on first run; otherwise export bookmarks as an HTML file.
              </li>
              <li>
                <strong>Check your extensions.</strong> {sameEngine ? `Both use ${F.engine === 'gecko' ? 'Firefox add-ons' : 'the same engine'}, so most extensions carry over.` : `${F.name} and ${T.name} use different engines; reinstall extensions from ${T.keyFacts.mv2.level === 'no-extensions' ? '— (no extension support)' : T.engine === 'gecko' ? 'Firefox Add-ons' : 'the Chrome Web Store'}.`}{' '}
                Manifest V2: {MV2_LABEL[T.keyFacts.mv2.level]}.{' '}
                <Link className="link" to="/extensions">
                  Check specific extensions
                </Link>
              </li>
              <li>
                <strong>Set up sync on your other devices.</strong> {['none', 'local-only'].includes(T.keyFacts.sync.type) ? `${T.name} has no built-in sync.` : `${T.name} syncs ${T.keyFacts.sync.items.join(', ') || 'your data'}.`}
              </li>
              <li>
                <strong>Make it your default browser</strong> on each device, then keep {F.name} for a week in case a site needs it.
              </li>
            </ol>
          </section>
        </>
        )}
      </Collapse>
    </div>
  );
}

/* =========================== Feature finder =========================== */

export function FeatureFinder() {
  useDocTitle('Feature finder');
  const [must, setMust] = useListParam('f');
  const [osP, setOs] = useParam('os');
  const [eng, setEng] = useParam('engine');
  const os = osP as OsId | null;
  const pool = BROWSERS.filter((b) => b.status !== 'discontinued' && (!os || b.platforms[os]) && (!eng || b.engine === eng));
  const scored = pool
    .map((b) => ({ b, have: must.filter((f) => supported(b, f)), miss: must.filter((f) => !supported(b, f)) }))
    .sort((x, y) => x.miss.length - y.miss.length || overall(y.b) - overall(x.b));
  const full = scored.filter((x) => x.miss.length === 0);
  const near = scored.filter((x) => x.miss.length > 0 && x.miss.length <= 2).slice(0, 8);
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Feature finder</h1>
          <p className="lede">Pick the features you can’t live without. Browsers that have all of them appear instantly.</p>
        </div>
        <div className="row">
          <OsSelect value={os} onChange={setOs} />
          <select className="input select" value={eng ?? ''} onChange={(e) => setEng(e.target.value || null)} aria-label="Engine">
            <option value="">Any engine</option>
            <option value="blink">Blink (Chromium)</option>
            <option value="gecko">Gecko (Firefox)</option>
            <option value="webkit">WebKit</option>
          </select>
        </div>
      </div>
      <div className="finder">
        <aside className="panel panel-pad finder__picks">
          {FEATURE_FAMILIES.map((fam) => (
            <fieldset key={fam.id} className="filters__group" style={{ marginBottom: 'var(--s-4)' }}>
              <legend className="label">{fam.name}</legend>
              <div className="row" style={{ gap: 6 }}>
                {FEATURES.filter((f) => f.family === fam.id).map((f) => (
                  <button key={f.id} className="chip" aria-pressed={must.includes(f.id)} onClick={() => setMust(must.includes(f.id) ? must.filter((x) => x !== f.id) : [...must, f.id])}>
                    {f.name}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </aside>
        <div>
          <p className="small muted" aria-live="polite" style={{ marginBottom: 'var(--s-3)' }}>
            {must.length === 0 ? 'Pick at least one feature.' : `${full.length} ${full.length === 1 ? 'browser has' : 'browsers have'} all ${must.length} ${must.length === 1 ? 'feature' : 'features'}.`}
          </p>
          {must.length > 0 && (
            <>
              {full.length ? (
                <div className="panel">
                  {full.map(({ b }) => (
                    <Link key={b.id} to={`/browser/${b.id}`} className="brow" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                      <BrowserMark b={b} size={32} />
                      <span className="brow__id">
                        <span className="brow__name">{b.name}</span>
                        <span className="brow__sub">{b.pitch}</span>
                      </span>
                      <ScoreNum value={overall(b, DEFAULT_WEIGHTS, os)} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="panel">
                  <Empty icon={<Search />} title="No browser has all of these">
                    The closest matches are below.
                  </Empty>
                </div>
              )}
              {near.length > 0 && (
                <>
                  <h2 className="h-sm" style={{ marginTop: 'var(--s-6)' }}>
                    Nearly there
                  </h2>
                  <div className="panel">
                    {near.map(({ b, miss }) => (
                      <Link key={b.id} to={`/browser/${b.id}`} className="brow" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                        <BrowserMark b={b} size={32} />
                        <span className="brow__id">
                          <span className="brow__name">{b.name}</span>
                          <span className="brow__sub">Missing: {miss.map((m) => FEATURES.find((f) => f.id === m)?.name).join(', ')}</span>
                        </span>
                        <span className="badge badge--warning tnum">−{miss.length}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================== Extension checker =========================== */

interface Ext {
  id: string;
  name: string;
  /** desktop requirement */
  needs: 'mv2' | 'any';
  note: string;
}
const EXTS: Ext[] = [
  { id: 'ubo', name: 'uBlock Origin (full)', needs: 'mv2', note: 'Needs Manifest V2. Chrome and Edge now only offer uBlock Origin Lite.' },
  { id: 'ubol', name: 'uBlock Origin Lite', needs: 'any', note: 'Manifest V3 version; runs anywhere Chrome extensions run.' },
  { id: 'umatrix', name: 'uMatrix / NoScript', needs: 'mv2', note: 'Script blockers that rely on Manifest V2 APIs.' },
  { id: 'bitwarden', name: 'Bitwarden', needs: 'any', note: 'Available for Chromium and Firefox; also Safari.' },
  { id: '1password', name: '1Password', needs: 'any', note: 'Chromium, Firefox and Safari.' },
  { id: 'darkreader', name: 'Dark Reader', needs: 'any', note: 'Chromium, Firefox and Safari.' },
  { id: 'tampermonkey', name: 'Tampermonkey / Violentmonkey', needs: 'any', note: 'Userscript managers.' },
  { id: 'sponsorblock', name: 'SponsorBlock', needs: 'any', note: 'Chromium and Firefox.' },
];

export function ExtensionChecker() {
  useDocTitle('Extension checker');
  const [picked, setPicked] = useListParam('x');
  const [osP, setOs] = useParam('os');
  const os = (osP as OsId | null) ?? null;
  const mobile = os === 'android' || os === 'ios';
  const verdict = (b: BrowserIndex, e: Ext): 'yes' | 'partial' | 'no' => {
    const mv2 = b.keyFacts.mv2.level;
    if (mobile) {
      const m = os === 'android' ? b.keyFacts.mobileExtensions.android : b.keyFacts.mobileExtensions.ios;
      if (m === 'none' || m === 'n/a') return 'no';
      if (e.needs === 'mv2') return mv2 === 'full' || m === 'firefox-addons' ? 'yes' : 'no';
      return m === 'own-store' ? 'partial' : 'yes';
    }
    if (mv2 === 'no-extensions') return 'no';
    if (e.needs === 'mv2') {
      if (e.id === 'ubo' && (b.keyFacts.ublock === 'full')) return 'yes';
      return mv2 === 'full' ? 'yes' : mv2 === 'partial' || mv2 === 'temporary' ? 'partial' : 'no';
    }
    if (b.engine === 'webkit') return ['bitwarden', '1password', 'darkreader'].includes(e.id) ? 'partial' : 'no';
    return 'yes';
  };
  const list = BROWSERS.filter((b) => b.status !== 'discontinued' && (!os || b.platforms[os]));
  const rows = list
    .map((b) => ({ b, v: EXTS.filter((e) => picked.includes(e.id)).map((e) => verdict(b, e)) }))
    .map((r) => ({ ...r, ok: r.v.filter((x) => x === 'yes').length + r.v.filter((x) => x === 'partial').length * 0.5 }))
    .sort((x, y) => y.ok - x.ok || overall(y.b) - overall(x.b));
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Extension checker</h1>
          <p className="lede">Pick the extensions you rely on and see which browsers can run them, including on phones.</p>
        </div>
        <OsSelect value={os} onChange={setOs} />
      </div>
      <div className="row" style={{ marginBottom: 'var(--s-6)' }}>
        {EXTS.map((e) => (
          <button key={e.id} className="chip" aria-pressed={picked.includes(e.id)} onClick={() => setPicked(picked.includes(e.id) ? picked.filter((x) => x !== e.id) : [...picked, e.id])} title={e.note}>
            {e.name}
          </button>
        ))}
      </div>
      {picked.length === 0 ? (
        <div className="panel">
          <Empty title="Pick an extension to check">For example uBlock Origin (full), which now needs a browser that still supports Manifest V2.</Empty>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table table--hover">
            <thead>
              <tr>
                <th scope="col">Browser</th>
                {EXTS.filter((e) => picked.includes(e.id)).map((e) => (
                  <th key={e.id} scope="col">
                    {e.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, v }) => (
                <tr key={b.id}>
                  <th scope="row">
                    <Link to={`/browser/${b.id}`} className="row nowrap" style={{ flexWrap: 'nowrap' }}>
                      <BrowserMark b={b} size={24} />
                      {b.name}
                    </Link>
                  </th>
                  {v.map((x, i) => (
                    <td key={i}>
                      <span className="row nowrap" style={{ gap: 6 }}>
                        <SupportMark s={x === 'yes' ? 'yes' : x === 'partial' ? 'partial' : 'no'} />
                        <span className="small">{x === 'yes' ? 'Works' : x === 'partial' ? 'Partly' : 'No'}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small muted" style={{ marginTop: 'var(--s-4)' }}>
        Based on each browser’s extension engine, Manifest V2 status and mobile extension support. Individual extensions can still have their own limits.
      </p>
    </div>
  );
}

/* =========================== Feature matrix =========================== */

export function Matrix() {
  useDocTitle('Feature matrix');
  const [fam, setFam] = useParam('family');
  const [osP, setOs] = useParam('os');
  const [mode, setMode] = useState<'support' | 'scores'>('support');
  const os = osP as OsId | null;
  const list = useMemo(() => BROWSERS.filter((b) => b.status !== 'discontinued' && (!os || b.platforms[os])).sort((a, b) => overall(b, DEFAULT_WEIGHTS, os) - overall(a, DEFAULT_WEIGHTS, os)), [os]);
  const feats = FEATURES.filter((f) => !fam || f.family === fam);
  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Feature matrix</h1>
          <p className="lede">Every browser against every feature or score. Scroll sideways; the browser column stays put.</p>
        </div>
        <div className="row">
          <select className="input select" value={mode} onChange={(e) => setMode(e.target.value as 'support' | 'scores')} aria-label="Show">
            <option value="support">Features</option>
            <option value="scores">Scores</option>
          </select>
          {mode === 'support' && (
            <select className="input select" value={fam ?? ''} onChange={(e) => setFam(e.target.value || null)} aria-label="Feature family">
              <option value="">All feature families</option>
              {FEATURE_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
          <OsSelect value={os} onChange={setOs} />
        </div>
      </div>
      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col" className="matrix__corner">
                Browser
              </th>
              {(mode === 'support' ? feats.map((f) => ({ id: f.id, name: f.name })) : CATEGORIES.map((c) => ({ id: c.id, name: c.name }))).map((c) => (
                <th key={c.id} scope="col" className="matrix__col">
                  <span>{c.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((b) => {
              const s = scoresFor(b, os);
              return (
                <tr key={b.id}>
                  <th scope="row" className="matrix__row">
                    <Link to={`/browser/${b.id}`}>
                      <BrowserMark b={b} size={20} />
                      <span className="truncate">{b.name}</span>
                    </Link>
                  </th>
                  {mode === 'support'
                    ? feats.map((f) => {
                        const { support, rating } = feature(b, f.id);
                        return (
                          <td key={f.id} title={`${b.name} · ${f.name}: ${support}${support !== 'no' ? ` (${rating})` : ''}`}>
                            <SupportMark s={support} />
                          </td>
                        );
                      })
                    : CATEGORIES.map((c, i) => (
                        <td key={c.id} className="matrix__heat tnum" style={{ background: `color-mix(in oklab, var(--seq-5) ${Math.round(s[i] * 9)}%, var(--surface))`, color: s[i] >= 6.5 ? 'white' : 'var(--text)' }}>
                          {fmt(s[i])}
                        </td>
                      ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

