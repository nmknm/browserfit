import { LayoutGroup, motion } from 'motion/react';
import { Filter, LayoutGrid, List, SearchX, Table2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useFlip } from '../lib/motion';
import { useSearchParams, Link } from 'react-router-dom';
import { BROWSERS, engineOn, scoresFor } from '../lib/data';
import { CATEGORIES, CATEGORY_IDS, ENGINES, GROUP_LABEL, OSES, PILLARS, STATUS_LABEL, STORE_LABEL } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, overall, pillarScore } from '../lib/scoring';
import { securityFor, securityScore, updateFor } from '../lib/security';
import type { BrowserIndex, OsId, PillarId } from '../lib/types';
import { BrowserCard, BrowserRow, OsDots } from '../components/BrowserCard';
import { Empty, Segmented } from '../components/ui/Controls';
import { Collapse } from '../components/ui/Collapse';
import { Sheet } from '../components/ui/Sheet';
import { useApp } from '../lib/store';
import { useDocTitle, useIsMobile } from '../lib/hooks';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ScoreNum } from '../components/ui/Score';
import { EngineBadge, Mv2Badge, PasswordBadge, PrivacyGrade, SyncBadge } from '../components/ui/Facts';
import { MV2_LABEL } from '../components/ui/Facts';

interface FilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  test: (b: BrowserIndex, v: string, os: OsId | null) => boolean;
}

const FILTERS: FilterDef[] = [
  { key: 'group', label: 'Type', options: Object.entries(GROUP_LABEL).map(([value, label]) => ({ value, label })), test: (b, v) => b.group === v },
  { key: 'engine', label: 'Core engine', options: ENGINES.filter((e) => !e.id.includes('legacy')).map((e) => ({ value: e.id, label: e.name })), test: (b, v, os) => engineOn(b, os) === v },
  {
    key: 'sync',
    label: 'Sync',
    options: [
      { value: 'any', label: 'Has sync' },
      { value: 'e2ee', label: 'Encrypted sync' },
      { value: 'crossos', label: 'Syncs across OSes' },
      { value: 'none', label: 'No sync' },
    ],
    test: (b, v) => {
      const s = b.keyFacts.sync;
      const has = s.type !== 'none' && s.type !== 'local-only';
      if (v === 'any') return has;
      if (v === 'e2ee') return s.type === 'e2ee' || s.type === 'self-hostable';
      if (v === 'crossos') return has && s.crossOs;
      return !has;
    },
  },
  {
    key: 'pw',
    label: 'Password manager',
    options: [
      { value: 'full', label: 'Full manager' },
      { value: 'any', label: 'Any' },
      { value: 'passkeys', label: 'Passkeys' },
      { value: 'none', label: 'None' },
    ],
    test: (b, v) => {
      const p = b.keyFacts.passwordManager;
      if (v === 'full') return p.level === 'full';
      if (v === 'any') return p.level !== 'none';
      if (v === 'passkeys') return p.passkeys;
      return p.level === 'none';
    },
  },
  {
    key: 'mv2',
    label: 'Manifest V2 / uBlock Origin',
    options: [
      { value: 'ubo', label: 'Full uBlock Origin' },
      ...(['full', 'partial', 'temporary', 'mv3-only', 'no-extensions'] as const).map((v) => ({ value: v, label: MV2_LABEL[v] })),
    ],
    test: (b, v) => (v === 'ubo' ? b.keyFacts.ublock === 'full' : b.keyFacts.mv2.level === v),
  },
  {
    key: 'privacy',
    label: 'Privacy grade',
    options: [
      { value: 'A', label: 'A only' },
      { value: 'B', label: 'B or better' },
      { value: 'C', label: 'C or better' },
    ],
    test: (b, v) => b.keyFacts.privacyGrade <= v,
  },
  {
    key: 'sec',
    label: 'Security grade',
    options: [
      { value: 'A', label: 'A only' },
      { value: 'B', label: 'B or better' },
      { value: 'C', label: 'C or better' },
    ],
    test: (b, v, os) => securityFor(b, os).grade <= v,
  },
  {
    key: 'secfix',
    label: 'Security updates',
    options: [
      { value: 'auto', label: 'Updates itself' },
      { value: 'fast', label: 'Fixes within days' },
      { value: 'iso', label: 'Full site isolation' },
    ],
    test: (b, v, os) => (v === 'auto' ? ['background', 'store'].includes(updateFor(b, os)) : v === 'fast' ? ['upstream', 'days'].includes(b.security.patchLag) : b.security.siteIsolation === 'full'),
  },
  {
    key: 'ai',
    label: 'AI',
    options: [
      { value: 'none', label: 'No AI' },
      { value: 'off', label: 'AI with off switch' },
      { value: 'agentic', label: 'AI agents' },
    ],
    test: (b, v) => (v === 'none' ? b.keyFacts.ai.level === 'none' : v === 'off' ? b.keyFacts.ai.level === 'none' || b.keyFacts.ai.killSwitch : b.keyFacts.ai.level === 'agentic'),
  },
  {
    key: 'store',
    label: 'Where to get it',
    options: (['google-play', 'f-droid', 'github', 'app-store', 'microsoft-store', 'flathub', 'homebrew', 'winget'] as const).map((s) => ({ value: s, label: STORE_LABEL[s] })),
    test: (b, v, os) => Object.entries(b.platforms).some(([o, p]) => (!os || o === os) && p?.stores.includes(v as never)),
  },
  {
    key: 'mobext',
    label: 'Extensions on Android',
    options: [{ value: 'yes', label: 'Supports extensions' }],
    test: (b) => !['none', 'n/a'].includes(b.keyFacts.mobileExtensions.android),
  },
  {
    key: 'oss',
    label: 'License',
    options: [
      { value: 'open', label: 'Open source' },
      { value: 'closed', label: 'Closed source' },
    ],
    test: (b, v) => (v === 'open' ? b.openSource === true : b.openSource !== true),
  },
  {
    key: 'price',
    label: 'Price',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'freemium', label: 'Free + paid tier' },
      { value: 'paid', label: 'Paid' },
    ],
    test: (b, v) => b.price === v,
  },
  {
    key: 'status',
    label: 'Status',
    options: Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
    test: (b, v) => b.status === v,
  },
];

const SORTS = [
  { value: 'overall', label: 'Overall score' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'newest', label: 'Newest first' },
  { value: 'security', label: 'Security score' },
  ...PILLARS.map((p) => ({ value: 'p:' + p.id, label: p.name })),
  ...CATEGORIES.map((c) => ({ value: 'c:' + c.id, label: c.name })),
];

// A filter can hold several values, stored comma-separated in the URL. Values within one filter are OR'd; different filters are AND'd.
const vals = (sp: URLSearchParams, key: string) => (sp.get(key) ?? '').split(',').filter(Boolean);

function FilterPanel({ sp, set, toggle, count }: { sp: URLSearchParams; set: (k: string, v: string | null) => void; toggle: (k: string, v: string) => void; count: number }) {
  const { os, setOs } = useApp();
  return (
    <div className="filters">
      <div className="filters__group">
        <label className="label" htmlFor="f-os">
          Platform
        </label>
        <select id="f-os" className="input select" value={os ?? ''} onChange={(e) => setOs((e.target.value || null) as OsId | null)}>
          <option value="">All platforms</option>
          {OSES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      {FILTERS.map((f) => {
        const cur = vals(sp, f.key);
        return (
          <fieldset key={f.key} className="filters__group">
            <legend className="label">{f.label}</legend>
            <div className="row" style={{ gap: 6 }}>
              {f.options.map((o) => (
                <button key={o.value} type="button" className="chip" aria-pressed={cur.includes(o.value)} onClick={() => toggle(f.key, o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
      <label className="switch">
        <input type="checkbox" checked={sp.get('dead') === '1'} onChange={(e) => set('dead', e.target.checked ? '1' : null)} />
        Show discontinued browsers
      </label>
      <p className="small muted" aria-live="polite">
        {count} {count === 1 ? 'browser matches' : 'browsers match'}
      </p>
    </div>
  );
}

export default function Browsers() {
  useDocTitle('All browsers');
  const [sp, setSp] = useSearchParams();
  const { os } = useApp();
  const mobile = useIsMobile();
  const [sheet, setSheet] = useState(false);
  const view = (sp.get('view') as 'grid' | 'list' | 'table') ?? 'grid';
  const sort = sp.get('sort') ?? 'overall';
  const q = (sp.get('q') ?? '').trim().toLowerCase();

  const set = (k: string, v: string | null) =>
    setSp(
      (cur) => {
        const n = new URLSearchParams(cur);
        if (v == null || v === '') n.delete(k);
        else n.set(k, v);
        return n;
      },
      { replace: true },
    );

  const toggle = (k: string, v: string) =>
    setSp(
      (cur) => {
        const n = new URLSearchParams(cur);
        const next = vals(n, k);
        const i = next.indexOf(v);
        if (i >= 0) next.splice(i, 1);
        else next.push(v);
        if (next.length) n.set(k, next.join(','));
        else n.delete(k);
        return n;
      },
      { replace: true },
    );

  const active = FILTERS.flatMap((f) => vals(sp, f.key).map((v) => ({ f, v })));
  const list = useMemo(() => {
    let l = BROWSERS.filter((b) => (sp.get('dead') === '1' || vals(sp, 'status').includes('discontinued') ? true : b.status !== 'discontinued'));
    if (os) l = l.filter((b) => b.platforms[os]);
    if (q) l = l.filter((b) => (b.name + ' ' + b.developer + ' ' + b.tags.join(' ') + ' ' + b.pitch).toLowerCase().includes(q));
    for (const f of FILTERS) {
      const v = vals(sp, f.key);
      if (v.length) l = l.filter((b) => v.some((x) => f.test(b, x, os)));
    }
    const val = (b: BrowserIndex): number => {
      if (sort.startsWith('p:')) return pillarScore(b, sort.slice(2) as PillarId, os);
      if (sort.startsWith('c:')) return scoresFor(b, os)[CATEGORY_IDS.indexOf(sort.slice(2) as never)];
      if (sort === 'newest') return b.releaseYear;
      if (sort === 'security') return securityScore(b, os);
      return overall(b, DEFAULT_WEIGHTS, os);
    };
    return sort === 'name' ? [...l].sort((a, b) => a.name.localeCompare(b.name)) : [...l].sort((a, b) => val(b) - val(a) || a.name.localeCompare(b.name));
  }, [sp, os, q, sort]);

  // List and table views reorder and filter instantly; FLIP the rows (the grid view already animates via Motion layout).
  const results = useRef<HTMLDivElement>(null);
  useFlip(results, `${view}|${list.map((b) => b.id).join()}`, true);

  const sortValue = (b: BrowserIndex) =>
    sort === 'security' ? securityScore(b, os) : sort.startsWith('p:') ? pillarScore(b, sort.slice(2) as PillarId, os) : sort.startsWith('c:') ? scoresFor(b, os)[CATEGORY_IDS.indexOf(sort.slice(2) as never)] : overall(b, DEFAULT_WEIGHTS, os);

  const clearAll = () => setSp(new URLSearchParams(view !== 'grid' ? { view } : {}), { replace: true });

  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>All browsers</h1>
          <p className="lede">Every profile in one place. Filter by platform, engine, sync, password manager, extension support and more.</p>
        </div>
      </div>

      <div className="dir">
        {!mobile && (
          <aside className="dir__side" aria-label="Filters">
            <FilterPanel sp={sp} set={set} toggle={toggle} count={list.length} />
          </aside>
        )}
        <div className="dir__main">
          <div className="dir__bar">
            <input className="input dir__search" type="search" placeholder="Search by name, maker or tag" value={sp.get('q') ?? ''} onChange={(e) => set('q', e.target.value)} aria-label="Search browsers" />
            {mobile && (
              <button className="btn" onClick={() => setSheet(true)}>
                <Filter aria-hidden /> Filters {active.length ? <span className="badge badge--accent tnum">{active.length}</span> : null}
              </button>
            )}
            <label className="dir__sort">
              <span className="sr-only">Sort by</span>
              <select className="input select" value={sort} onChange={(e) => set('sort', e.target.value === 'overall' ? null : e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </label>
            <Segmented
              label="View"
              value={view}
              onChange={(v) => set('view', v === 'grid' ? null : v)}
              options={[
                { value: 'grid', label: <span className="sr-only">Grid</span>, icon: <LayoutGrid aria-hidden /> },
                { value: 'list', label: <span className="sr-only">List</span>, icon: <List aria-hidden /> },
                { value: 'table', label: <span className="sr-only">Table</span>, icon: <Table2 aria-hidden /> },
              ]}
            />
          </div>

          <Collapse open={active.length > 0 || !!q}>
            <div className="row" style={{ marginBottom: 'var(--s-4)' }}>
              {active.map(({ f, v }) => (
                <button key={f.key + v} className="chip is-on chip--enter" onClick={() => toggle(f.key, v)} aria-label={`Remove filter ${f.label}: ${f.options.find((o) => o.value === v)?.label}`}>
                  {f.label}: {f.options.find((o) => o.value === v)?.label}
                  <X aria-hidden />
                </button>
              ))}
              <button className="btn btn--ghost btn--sm" onClick={clearAll}>
                Clear all
              </button>
            </div>
          </Collapse>

          <p className="sr-only" aria-live="polite">
            {list.length} browsers shown
          </p>

          {list.length === 0 ? (
            <div className="panel">
              <Empty
                icon={<SearchX />}
                title={q ? `No browsers match “${q}”` : 'No browsers match these filters'}
                action={
                  <button className="btn btn--primary" onClick={clearAll}>
                    Clear filters
                  </button>
                }
              >
                Try removing a filter{os ? ` or switching from ${OSES.find((o) => o.id === os)?.name} to all platforms` : ''}.
              </Empty>
            </div>
          ) : view === 'grid' ? (
            <LayoutGroup>
              <motion.div className="grid grid-3" layout>
                {list.map((b) => (
                  <motion.div key={b.id} className="bcard-cell" layout="position" transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
                    <BrowserCard b={b} os={os} />
                  </motion.div>
                ))}
              </motion.div>
            </LayoutGroup>
          ) : view === 'list' ? (
            <div className="panel" ref={results}>
              {list.map((b, i) => (
                <BrowserRow key={b.id} b={b} os={os} rank={sort === 'name' ? undefined : i + 1} value={sortValue(b)} flipKey={`l:${b.id}`} />
              ))}
            </div>
          ) : (
            <div className="table-wrap" ref={results}>
              <table className="table table--hover">
                <thead>
                  <tr>
                    <th scope="col">Browser</th>
                    <th scope="col" className="num">
                      {SORTS.find((s) => s.value === sort && sort !== 'name' && sort !== 'newest')?.label ?? 'Overall'}
                    </th>
                    <th scope="col">Engine</th>
                    <th scope="col">Privacy</th>
                    <th scope="col">Sync</th>
                    <th scope="col">Passwords</th>
                    <th scope="col">Extensions</th>
                    <th scope="col">Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <tr key={b.id} data-flip={`t:${b.id}`}>
                      <th scope="row">
                        <Link to={`/browser/${b.id}`} className="row nowrap" style={{ flexWrap: 'nowrap' }}>
                          <BrowserMark b={b} size={24} />
                          {b.name}
                        </Link>
                      </th>
                      <td className="num">
                        <ScoreNum value={sortValue(b)} size="sm" />
                      </td>
                      <td>
                        <EngineBadge engine={engineOn(b, os)} small />
                      </td>
                      <td>
                        <PrivacyGrade grade={b.keyFacts.privacyGrade} small />
                      </td>
                      <td>
                        <SyncBadge b={b} small />
                      </td>
                      <td>
                        <PasswordBadge b={b} small />
                      </td>
                      <td>
                        <Mv2Badge b={b} small />
                      </td>
                      <td>
                        <OsDots b={b} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {mobile && (
        <Sheet
          open={sheet}
          onClose={() => setSheet(false)}
          title="Filters"
          footer={
            <>
              <button className="btn" onClick={clearAll}>
                Clear
              </button>
              <button className="btn btn--primary" onClick={() => setSheet(false)}>
                Show {list.length} {list.length === 1 ? 'browser' : 'browsers'}
              </button>
            </>
          }
        >
          <FilterPanel sp={sp} set={set} toggle={toggle} count={list.length} />
        </Sheet>
      )}
    </div>
  );
}
