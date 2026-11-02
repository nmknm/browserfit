import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Filter, Info, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useFlip } from '../lib/motion';
import { Link, useSearchParams } from 'react-router-dom';
import { BROWSERS, availableOn, engineOn, getBrowser } from '../lib/data';
import { ENGINES, OSES } from '../data/taxonomy';
import { rank } from '../lib/scoring';
import { GRADES, GRADE_TONE, LAYERS, LAG_HELP, LAG_LABEL, ISOLATION_LABEL, securityFor, updateFor, versionsBehind, type Grade, type LayerId } from '../lib/security';
import type { BrowserIndex, EngineId, IsolationLevel, OsId, PatchLag } from '../lib/types';
import { detect } from '../lib/detect';
import { useApp } from '../lib/store';
import { useDocTitle, useIsMobile } from '../lib/hooks';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ScoreBar, ScoreNum } from '../components/ui/Score';
import { Segmented, Empty } from '../components/ui/Controls';
import { Sheet } from '../components/ui/Sheet';
import { GradeChip, HeatCell, LAYER_ICON } from '../components/ui/SecurityBits';

type SortKey = 'score' | 'name' | LayerId;
type Flag = 'oss' | 'auto' | 'iso' | 'verified' | 'dead';
type TileFlag = 'noiso' | 'manual' | 'months';

const FLAG_LABEL: Record<Flag, string> = { oss: 'Open source', auto: 'Updates itself', iso: 'Full site isolation', verified: 'Verified only', dead: 'Include discontinued' };
const TILE_LABEL: Record<TileFlag, string> = { noiso: 'without site isolation', manual: 'on manual updates', months: 'months behind engine fixes' };
const GRADE_SPEAK: Record<Grade, string> = { A: 'Strongest', B: 'Strong', C: 'Solid', D: 'Mixed', E: 'Weak', F: 'Very weak' };

const csv = (v: string | null) => (v ?? '').split(',').filter(Boolean);

/** URL-backed filter state, so every view is shareable. */
function useSecState() {
  const [sp, setSp] = useSearchParams();
  const { os: globalOs } = useApp();
  const osParam = sp.get('os');
  const os: OsId | null = osParam === 'all' ? null : ((osParam as OsId | null) ?? globalOs);
  const write = (mut: (n: URLSearchParams) => void) =>
    setSp(
      (cur) => {
        const n = new URLSearchParams(cur);
        mut(n);
        return n;
      },
      { replace: true },
    );
  const set = (k: string, v: string | null) => write((n) => (v == null || v === '' ? n.delete(k) : n.set(k, v)));
  const toggle = (k: string, v: string) =>
    write((n) => {
      const list = csv(n.get(k));
      const i = list.indexOf(v);
      if (i >= 0) list.splice(i, 1);
      else list.push(v);
      if (list.length) n.set(k, list.join(','));
      else n.delete(k);
    });
  return {
    os,
    osAll: osParam === 'all',
    engine: sp.get('engine'),
    q: (sp.get('q') ?? '').trim().toLowerCase(),
    qRaw: sp.get('q') ?? '',
    sort: (sp.get('sort') as SortKey | null) ?? 'score',
    order: (sp.get('order') as 'asc' | 'desc' | null) ?? null,
    grades: csv(sp.get('grade')) as Grade[],
    flags: csv(sp.get('f')) as Flag[],
    tiles: csv(sp.get('t')) as TileFlag[],
    set,
    toggle,
    reset: () => setSp(new URLSearchParams(sp.get('os') ? { os: sp.get('os')! } : {}), { replace: true }),
    anyFilter: [...sp.keys()].some((k) => k !== 'os' && k !== 'sort' && k !== 'order'),
  };
}
type SecState = ReturnType<typeof useSecState>;

interface Row {
  b: BrowserIndex;
  r: ReturnType<typeof securityFor>;
}

const TILE_TEST: Record<TileFlag, (b: BrowserIndex, os: OsId | null) => boolean> = {
  noiso: (b) => b.security.siteIsolation === 'none',
  manual: (b, os) => updateFor(b, os) === 'manual',
  months: (b) => b.security.patchLag === 'months' || b.security.patchLag === 'stalled',
};
const FLAG_TEST: Record<Exclude<Flag, 'dead'>, (b: BrowserIndex, os: OsId | null) => boolean> = {
  oss: (b) => b.openSource === true,
  auto: (b, os) => ['background', 'store'].includes(updateFor(b, os)),
  iso: (b) => b.security.siteIsolation === 'full',
  verified: (b) => b.security.researched,
};

function FilterControls({ st, engineOptions }: { st: SecState; engineOptions: { value: EngineId; label: string }[] }) {
  return (
    <div className="sec-filters">
      <label className="sec-filters__field">
        <span className="label">Platform</span>
        <select className="input select" value={st.osAll ? 'all' : (st.os ?? 'all')} onChange={(e) => st.set('os', e.target.value)}>
          <option value="all">All platforms</option>
          {OSES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="sec-filters__field">
        <span className="label">Engine</span>
        <select className="input select" value={st.engine ?? ''} onChange={(e) => st.set('engine', e.target.value || null)}>
          <option value="">Any engine</option>
          {engineOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="sec-filters__field sec-filters__search">
        <span className="label">Search</span>
        <span className="sec-search">
          <Search aria-hidden />
          <input className="input" type="search" value={st.qRaw} placeholder="Browser or developer" onChange={(e) => st.set('q', e.target.value)} />
        </span>
      </label>
      <div className="sec-filters__chips" role="group" aria-label="Narrow the list">
        {(Object.keys(FLAG_LABEL) as Flag[]).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={st.flags.includes(f)} onClick={() => st.toggle('f', f)}>
            {FLAG_LABEL[f]}
          </button>
        ))}
        {st.anyFilter && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={st.reset}>
            <X aria-hidden /> Reset filters
          </button>
        )}
      </div>
    </div>
  );
}

function GradeBar({ counts, active, onToggle }: { counts: Record<Grade, number>; active: Grade[]; onToggle: (g: Grade) => void }) {
  const total = GRADES.reduce((a, g) => a + counts[g], 0);
  return (
    <div className="sec-gradebar" role="group" aria-label="Filter by security grade">
      {GRADES.map((g) =>
        counts[g] ? (
          <button
            key={g}
            type="button"
            className={`sec-gradebar__seg sec-gradebar__seg--${GRADE_TONE[g]}`}
            style={{ flexGrow: Math.max(counts[g], total * 0.04) }}
            aria-pressed={active.includes(g)}
            aria-label={`Grade ${g}, ${counts[g]} browsers`}
            data-dim={active.length > 0 && !active.includes(g) ? '' : undefined}
            onClick={() => onToggle(g)}
          >
            <span className="sec-gradebar__letter">{g}</span>
            <span className="sec-gradebar__n tnum">{counts[g]}</span>
          </button>
        ) : null,
      )}
    </div>
  );
}

function SortHead({ id, label, title, st, align }: { id: SortKey; label: string; title?: string; st: SecState; align?: 'end' }) {
  const on = st.sort === id;
  const order = st.order ?? (id === 'name' ? 'asc' : 'desc');
  const next = () => {
    if (on) st.set('order', order === 'desc' ? 'asc' : 'desc');
    else {
      st.set('sort', id === 'score' ? null : id);
      st.set('order', null);
    }
  };
  return (
    <th scope="col" aria-sort={on ? (order === 'desc' ? 'descending' : 'ascending') : 'none'} className={align === 'end' ? 'sec-th sec-th--end' : 'sec-th'}>
      <button type="button" className="sec-sort" onClick={next} title={title}>
        {label}
        {on ? order === 'desc' ? <ArrowDown aria-hidden /> : <ArrowUp aria-hidden /> : <ChevronsUpDown aria-hidden />}
      </button>
    </th>
  );
}

const ROW_LIMIT = 30;

function Leaderboard({ rows, ranks, st }: { rows: Row[]; ranks: Map<string, number>; st: SecState }) {
  const [all, setAll] = useState(false);
  const shown = all || st.q ? rows : rows.slice(0, ROW_LIMIT);
  return (
    <>
      <LeaderboardTable rows={shown} ranks={ranks} st={st} />
      {shown.length < rows.length && (
        <button type="button" className="btn sec-showall" onClick={() => setAll(true)}>
          Show {rows.length - shown.length} more browsers
        </button>
      )}
    </>
  );
}

function LeaderboardTable({ rows, ranks, st }: { rows: Row[]; ranks: Map<string, number>; st: SecState }) {
  // Sorting, filtering and "show more" reorder the rows; FLIP them so you can follow where a browser went.
  const wrap = useRef<HTMLDivElement>(null);
  useFlip(wrap, rows.map((r) => r.b.id).join(), true);
  return (
    <div ref={wrap} className="table-wrap sec-table-wrap" role="region" aria-label="Security leaderboard" tabIndex={0}>
      <table className="table sec-table">
        <caption className="sr-only">Browsers ranked by security score, with one column for each of the seven layers of protection. Select a column heading to sort.</caption>
        <thead>
          <tr>
            <SortHead id="name" label="Browser" st={st} />
            <th scope="col" className="sec-th sec-th--end">
              Grade
            </th>
            <SortHead id="score" label="Score" st={st} align="end" />
            {LAYERS.map((l) => (
              <SortHead key={l.id} id={l.id} label={l.short} title={`${l.name}: ${l.what}`} st={st} align="end" />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ b, r }, i) => (
            <tr key={b.id} data-flip={b.id} className={i >= ROW_LIMIT ? 'sec-row--more' : undefined}>
              <th scope="row" className="sec-name">
                <div className="sec-name__in">
                  <span className="sec-rank tnum">{ranks.get(b.id) ?? '–'}</span>
                  <BrowserMark b={b} size={28} />
                  <span className="sec-name__text">
                    <Link to={`/browser/${b.id}#security`} className="sec-name__link">
                      {b.name}
                    </Link>
                    {!r.estimated && (
                      <span className="sec-verified">
                        <Check aria-hidden /> Verified
                      </span>
                    )}
                  </span>
                </div>
              </th>
              <td className="sec-grade-cell">
                <GradeChip grade={r.grade} size="sm" />
              </td>
              <td className="sec-score">
                <div className="sec-score__in">
                  <span className="sec-score__bar">
                    <ScoreBar value={r.score} compact animate={false} />
                  </span>
                  <ScoreNum value={r.score} size="sm" label={`${b.name} security score`} />
                </div>
              </td>
              {LAYERS.map((l) => (
                <HeatCell key={l.id} value={r.layers[l.id].score} label={`${b.name}, ${l.name}`} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TierList({ items, open, onOpen }: { items: BrowserIndex[]; open: boolean; onOpen: () => void }) {
  const shown = open ? items : items.slice(0, 8);
  return (
    <>
      <ul className="mv2-list sec-tier-list">
        {shown.map((b, i) => (
          <li key={b.id} className={i >= 8 ? 'sec-row--more' : undefined}>
            <Link to={`/browser/${b.id}#security`} className="sec-tier-link">
              <BrowserMark b={b} size={20} />
              <span>{b.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!open && items.length > 8 && (
        <button type="button" className="btn btn--ghost btn--sm sec-tier-more" onClick={onOpen}>
          Show {items.length - 8} more
        </button>
      )}
    </>
  );
}

function Tiers({ list, os }: { list: BrowserIndex[]; os: OsId | null }) {
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const lagTiers: PatchLag[] = ['upstream', 'days', 'weeks', 'months', 'own', 'stalled'];
  const isoTiers: IsolationLevel[] = ['full', 'partial', 'none'];
  const group = <T extends string>(pick: (b: BrowserIndex) => T, tier: T) => list.filter((b) => pick(b) === tier).sort((a, z) => securityFor(z, os).score - securityFor(a, os).score);
  const unknownLag = list.filter((b) => b.security.patchLag === 'unknown').length;
  const unknownIso = list.filter((b) => b.security.siteIsolation === 'unknown').length;
  return (
    <div className="sec-tiers">
      <div>
        <h3 className="h-sm">How fast fixes arrive</h3>
        <div className="mv2-tiers">
          {lagTiers.map((t) => {
            const items = group((b) => b.security.patchLag, t);
            if (!items.length) return null;
            return (
              <section key={t} className="panel mv2-tier" aria-labelledby={`lag-${t}`}>
                <div className="mv2-tier__head">
                  <h4 id={`lag-${t}`}>{LAG_LABEL[t]}</h4>
                  <span className="badge tnum">{items.length}</span>
                </div>
                <p className="small muted">{LAG_HELP[t]}</p>
                <TierList items={items} open={!!opened[`lag-${t}`]} onOpen={() => setOpened((o) => ({ ...o, [`lag-${t}`]: true }))} />
              </section>
            );
          })}
        </div>
        {unknownLag > 0 && <p className="xs faint sec-note">{unknownLag} more could not be placed because their upstream version is not published.</p>}
      </div>
      <div>
        <h3 className="h-sm">Site isolation</h3>
        <div className="mv2-tiers">
          {isoTiers.map((t) => {
            const items = group((b) => b.security.siteIsolation, t);
            if (!items.length) return null;
            return (
              <section key={t} className="panel mv2-tier" aria-labelledby={`iso-${t}`}>
                <div className="mv2-tier__head">
                  <h4 id={`iso-${t}`}>{ISOLATION_LABEL[t]}</h4>
                  <span className="badge tnum">{items.length}</span>
                </div>
                <TierList items={items} open={!!opened[`iso-${t}`]} onOpen={() => setOpened((o) => ({ ...o, [`iso-${t}`]: true }))} />
              </section>
            );
          })}
        </div>
        {unknownIso > 0 && <p className="xs faint sec-note">{unknownIso} more are not verified yet.</p>}
      </div>
    </div>
  );
}

type EngineGroup = 'blink' | 'gecko' | 'webkit' | 'other';
const GROUP_LABEL: Record<EngineGroup, string> = { blink: 'Blink', gecko: 'Gecko', webkit: 'WebKit', other: 'Other' };

function EngineSpread({ list, os }: { list: BrowserIndex[]; os: OsId | null }) {
  const [grp, setGrp] = useState<EngineGroup>('blink');
  const groupOf = (b: BrowserIndex): EngineGroup => {
    const e = engineOn(b, os);
    return e === 'blink' || e === 'gecko' || e === 'webkit' ? e : 'other';
  };
  const members = list.filter((b) => groupOf(b) === grp);
  const stats = LAYERS.map((l) => {
    const v = members.map((b) => securityFor(b, os).layers[l.id].score).sort((a, z) => a - z);
    if (!v.length) return { l, min: 0, max: 0, med: 0, spread: 0 };
    return { l, min: v[0], max: v[v.length - 1], med: v[Math.floor((v.length - 1) / 2)] + (v.length % 2 ? 0 : (v[v.length / 2] - v[v.length / 2 - 1]) / 2), spread: v[v.length - 1] - v[0] };
  });
  const widest = Math.max(...stats.map((s) => s.spread));
  const counts = (g: EngineGroup) => list.filter((b) => groupOf(b) === g).length;
  return (
    <div className="stack">
      <Segmented<EngineGroup>
        label="Engine family"
        value={grp}
        onChange={setGrp}
        options={(['blink', 'gecko', 'webkit', 'other'] as EngineGroup[]).map((g) => ({ value: g, label: `${GROUP_LABEL[g]} (${counts(g)})` }))}
      />
      {members.length < 2 ? (
        <p className="muted">Not enough browsers on this engine to compare. Try another platform or engine family.</p>
      ) : (
        <>
          <ul className="sec-range-list">
            {stats.map((s) => (
              <li key={s.l.id} className="sec-range">
                <span className="sec-range__name">{s.l.name}</span>
                <span className="sec-range__track" aria-hidden>
                  <span className="sec-range__bar" style={{ insetInlineStart: `${s.min * 10}%`, inlineSize: `${Math.max(s.max - s.min, 0.15) * 10}%` }} />
                  <span className="sec-range__med" style={{ insetInlineStart: `${s.med * 10}%` }} />
                </span>
                <span className="sec-range__spread tnum">
                  {s.spread === widest && widest > 0 ? <strong>Widest: {s.spread.toFixed(1)}</strong> : `Spread ${s.spread.toFixed(1)}`}
                </span>
              </li>
            ))}
          </ul>
          <details className="sec-twin">
            <summary>View as table</summary>
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Lowest, middle and highest layer score among {GROUP_LABEL[grp]} browsers</caption>
                <thead>
                  <tr>
                    <th scope="col">Layer</th>
                    <th scope="col" className="num">
                      Lowest
                    </th>
                    <th scope="col" className="num">
                      Middle
                    </th>
                    <th scope="col" className="num">
                      Highest
                    </th>
                    <th scope="col" className="num">
                      Spread
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.l.id}>
                      <th scope="row">{s.l.name}</th>
                      <td className="num">{s.min.toFixed(1)}</td>
                      <td className="num">{s.med.toFixed(1)}</td>
                      <td className="num">{s.max.toFixed(1)}</td>
                      <td className="num">{s.spread.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function GradingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="How we grade security" footer={<Link to="/about" className="link">Read the full method</Link>}>
      <div className="stack">
        <p className="small muted">The Security score is a weighted average of seven layers, each 0–10. The weights are our editorial judgement. No browser stops every attack.</p>
        <ul className="sec-method">
          {LAYERS.map((l) => {
            const Icon = LAYER_ICON[l.id];
            return (
              <li key={l.id}>
                <span className="sec-method__icon">
                  <Icon aria-hidden />
                </span>
                <div>
                  <p className="sec-method__title">
                    {l.name} <span className="badge tnum">{l.weight}%</span>
                  </p>
                  <p className="small muted">{l.what}</p>
                  <p className="xs"><strong>Stops:</strong> {l.stops}</p>
                  <p className="xs"><strong>Can’t stop:</strong> {l.cant}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="small muted">
          <strong>Estimated</strong> means the engine and profile gave us the facts but we haven’t checked that browser’s security details on their own. Unknown facts are left out of a layer, never counted against it.
        </p>
      </div>
    </Sheet>
  );
}

export default function Security() {
  useDocTitle('Browser security');
  const st = useSecState();
  const mobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const d = useMemo(detect, []);
  const mine = getBrowser(d.browserId);
  const { os } = st;

  // Everything the filters can reach, before the grade bar and stat tiles narrow it.
  const pool = useMemo(() => BROWSERS.filter((b) => (st.flags.includes('dead') ? true : b.status !== 'discontinued') && (!os || availableOn(b, os))), [os, st.flags]);
  const ranks = useMemo(() => {
    const live = BROWSERS.filter((b) => b.status !== 'discontinued' && (!os || availableOn(b, os)));
    const map = new Map<string, number>();
    rank(live, (b) => securityFor(b, os).score).forEach((x) => map.set(x.b.id, x.rank));
    return map;
  }, [os]);
  const base = useMemo(() => {
    const flagFns = st.flags.filter((f): f is Exclude<Flag, 'dead'> => f !== 'dead');
    return pool
      .filter((b) => !st.engine || engineOn(b, os) === st.engine)
      .filter((b) => !st.q || `${b.name} ${b.developer} ${b.tags.join(' ')}`.toLowerCase().includes(st.q))
      .filter((b) => flagFns.every((f) => FLAG_TEST[f](b, os)));
  }, [pool, st.engine, st.q, st.flags, os]);
  const gradeCounts = useMemo(() => {
    const c = Object.fromEntries(GRADES.map((g) => [g, 0])) as Record<Grade, number>;
    base.filter((b) => st.tiles.every((t) => TILE_TEST[t](b, os))).forEach((b) => c[securityFor(b, os).grade]++);
    return c;
  }, [base, st.tiles, os]);
  const tileCounts = useMemo(() => {
    const c = {} as Record<TileFlag, number>;
    (Object.keys(TILE_TEST) as TileFlag[]).forEach((t) => (c[t] = base.filter((b) => TILE_TEST[t](b, os)).length));
    return c;
  }, [base, os]);

  const rows = useMemo(() => {
    const order = st.order ?? (st.sort === 'name' ? 'asc' : 'desc');
    const out: Row[] = base
      .filter((b) => st.tiles.every((t) => TILE_TEST[t](b, os)))
      .map((b) => ({ b, r: securityFor(b, os) }))
      .filter((x) => !st.grades.length || st.grades.includes(x.r.grade));
    const val = (x: Row) => (st.sort === 'score' ? x.r.score : st.sort === 'name' ? 0 : x.r.layers[st.sort].score);
    out.sort((a, z) => {
      const c = st.sort === 'name' ? a.b.name.localeCompare(z.b.name) : val(a) - val(z);
      return (order === 'desc' ? -c : c) || a.b.name.localeCompare(z.b.name);
    });
    return out;
  }, [base, st.tiles, st.grades, st.sort, st.order, os]);

  const engineOptions = ENGINES.filter((e) => !e.id.includes('legacy') && pool.some((b) => engineOn(b, os) === e.id)).map((e) => ({ value: e.id, label: e.name }));
  const estimated = rows.filter((x) => x.r.estimated).length;
  const gap = mine && d.browserId ? versionsBehind(d.browserId, Number(d.version)) : null;
  const myRow = mine ? securityFor(mine, d.os) : null;

  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Browser security</h1>
          <p className="lede">Seven layers of protection, graded A–F for every browser. These are editorial scores from public documentation, not lab tests.</p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => setGradeOpen(true)}>
            <Info aria-hidden /> See how we grade
          </button>
          <Link to="/security/benchmarks" className="btn">
            Benchmarks and zero-days
          </Link>
          <Link to="/quiz/security" className="btn btn--primary">
            Take the security check-up
          </Link>
        </div>
      </div>

      {mine && myRow && (
        <Link to={`/browser/${mine.id}#security`} className="panel sec-you">
          <BrowserMark b={mine} size={32} />
          <span className="sec-you__text">
            <strong>
              You’re on {d.browserName} {d.version}.
            </strong>{' '}
            <span className="muted">
              Security grade {myRow.grade}, ranked {ranks.get(mine.id) ?? '–'} of {ranks.size} on {d.osName}.
              {gap && gap.behind > 0 && ` Your version is ${gap.behind} release${gap.behind === 1 ? '' : 's'} behind the latest ${gap.engine} (${gap.latest}); update it.`}
              {gap && gap.behind === 0 && ` It matches the latest ${gap.engine} release.`}
            </span>
          </span>
          <GradeChip grade={myRow.grade} />
        </Link>
      )}

      <section aria-label="Filters" className="sec-controls">
        {mobile ? (
          <button type="button" className="btn" onClick={() => setFiltersOpen(true)}>
            <Filter aria-hidden /> Filters {st.anyFilter && <span className="badge badge--accent tnum">on</span>}
          </button>
        ) : (
          <FilterControls st={st} engineOptions={engineOptions} />
        )}
        <p className="sec-status small muted" role="status">
          Showing {rows.length} of {pool.length} browsers. {rows.length - estimated} verified, {estimated} estimated from the engine and profile.
        </p>
      </section>

      <div className="sec-tiles" role="group" aria-label="Narrow to a risk">
        {(Object.keys(TILE_LABEL) as TileFlag[]).map((t) => (
          <button key={t} type="button" className="sec-tile" aria-pressed={st.tiles.includes(t)} onClick={() => st.toggle('t', t)}>
            <span className="sec-tile__n">{tileCounts[t]}</span>
            <span className="sec-tile__label">{TILE_LABEL[t]}</span>
            {st.tiles.includes(t) && <Check aria-hidden className="sec-tile__check" />}
          </button>
        ))}
      </div>

      <GradeBar counts={gradeCounts} active={st.grades} onToggle={(g) => st.toggle('grade', g)} />
      <p className="xs faint sec-gradekey">{GRADES.map((g) => `${g}: ${GRADE_SPEAK[g].toLowerCase()}`).join('; ')}.</p>

      {rows.length === 0 ? (
        <div className="panel">
          <Empty title="No browsers match these filters" action={<button type="button" className="btn" onClick={st.reset}>Reset filters</button>}>
            Try removing a filter, or switch to all platforms.
          </Empty>
        </div>
      ) : (
        <>
          {mobile && (
            <label className="sec-sortselect">
              <span className="label">Sort by</span>
              <select
                className="input select"
                value={st.sort}
                onChange={(e) => {
                  st.set('sort', e.target.value === 'score' ? null : e.target.value);
                  st.set('order', null);
                }}
              >
                <option value="score">Security score</option>
                <option value="name">Name</option>
                {LAYERS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="xs faint sec-scrollhint">Scroll sideways to see all seven layers.</p>
          <Leaderboard rows={rows} ranks={ranks} st={st} />
        </>
      )}

      <section className="section" aria-labelledby="tiers-h">
        <div className="section-head">
          <div>
            <h2 id="tiers-h">Fix delivery and page isolation</h2>
            <p>Where each browser sits today, for the browsers your filters leave in.</p>
          </div>
        </div>
        <Tiers list={rows.map((x) => x.b)} os={os} />
      </section>

      <section className="section" aria-labelledby="spread-h">
        <div className="section-head">
          <div>
            <h2 id="spread-h">What the engine decides, and what you choose</h2>
            <p>Browsers on one engine share most of its isolation. A wide spread means the browser you pick matters for that layer.</p>
          </div>
        </div>
        <EngineSpread list={pool.filter((b) => b.status !== 'discontinued')} os={os} />
      </section>

      <section className="section" aria-labelledby="next-h">
        <div className="section-head">
          <h2 id="next-h">Keep going</h2>
        </div>
        <ul className="sec-next">
          <li>
            <Link to="/security/benchmarks" className="sec-next__link">
              <strong>Benchmarks and zero-days</strong>
              <span className="small muted">Other people’s tests and the 2026 list of exploited browser bugs.</span>
            </Link>
          </li>
          <li>
            <Link to="/tradeoffs?x=sec&y=p:privacy" className="sec-next__link">
              <strong>Security against privacy</strong>
              <span className="small muted">Plot both scores for every browser and see which are strong at both.</span>
            </Link>
          </li>
          <li>
            <Link to="/quiz/security" className="sec-next__link">
              <strong>Security check-up</strong>
              <span className="small muted">A short quiz that gives you a risk level and a checklist for your setup.</span>
            </Link>
          </li>
        </ul>
      </section>

      <GradingSheet open={gradeOpen} onClose={() => setGradeOpen(false)} />
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <button type="button" className="btn btn--primary" onClick={() => setFiltersOpen(false)}>
            Show {rows.length} browsers
          </button>
        }
      >
        <FilterControls st={st} engineOptions={engineOptions} />
      </Sheet>
    </div>
  );
}
