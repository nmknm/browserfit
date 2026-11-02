import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrowserMark } from '../components/ui/BrowserMark';
import { Empty } from '../components/ui/Controls';
import { PrivacyGrade } from '../components/ui/Facts';
import { FEATURE_INDEX, OSES, OS_BY_ID } from '../data/taxonomy';
import { BROWSERS } from '../lib/data';
import { useDocTitle } from '../lib/hooks';
import { GRADES, GRADE_TONE, heatStep, privacyOrder, type Grade } from '../lib/security';
import { useApp } from '../lib/store';
import type { BrowserIndex, OsId } from '../lib/types';

type Flag = 'oss' | 'fp' | 'tel' | 'cookie' | 'dead';
const FLAG_LABEL: Record<Flag, string> = { oss: 'Open source', fp: 'Fingerprint protection', tel: 'Telemetry can be turned off', cookie: 'Cookie isolation', dead: 'Include discontinued' };
const has = (b: BrowserIndex, fid: string) => [1, 2, 3].includes(b.features[FEATURE_INDEX[fid]]?.[0] ?? 0);
const FLAG_TEST: Record<Exclude<Flag, 'dead'>, (b: BrowserIndex) => boolean> = {
  oss: (b) => b.openSource === true,
  fp: (b) => has(b, 'fingerprintProtection'),
  tel: (b) => has(b, 'telemetryOptOut'),
  cookie: (b) => has(b, 'cookieIsolation'),
};

const csv = (v: string | null) => (v ?? '').split(',').filter(Boolean);
const ROW_LIMIT = 30;

function Chip({ value, label }: { value: number; label: string }) {
  return (
    <span className="priv-score">
      <span className="priv-score__label">{label}</span>
      <span className="sec-heat__chip" data-heat={heatStep(value)} title={`${label}: ${value.toFixed(1)} out of 10`}>
        {value.toFixed(1)}
      </span>
    </span>
  );
}

/** Privacy at a glance for every browser: the grade, what it does by default, what it sends home and where its maker is based. */
export default function Privacy() {
  useDocTitle('Browser privacy');
  const { os: globalOs } = useApp();
  const [sp, setSp] = useSearchParams();
  const [all, setAll] = useState(false);
  const osParam = sp.get('os');
  const os: OsId | null = osParam === 'all' ? null : ((osParam as OsId | null) ?? globalOs);
  const grades = csv(sp.get('grade')) as Grade[];
  const flags = csv(sp.get('f')) as Flag[];
  const q = (sp.get('q') ?? '').trim().toLowerCase();

  const write = (mut: (n: URLSearchParams) => void) =>
    setSp(
      (cur) => {
        const n = new URLSearchParams(cur);
        mut(n);
        return n;
      },
      { replace: true },
    );
  const toggle = (key: string, value: string) =>
    write((n) => {
      const list = csv(n.get(key));
      const i = list.indexOf(value);
      if (i >= 0) list.splice(i, 1);
      else list.push(value);
      if (list.length) n.set(key, list.join(','));
      else n.delete(key);
    });
  const anyFilter = grades.length > 0 || flags.length > 0 || q !== '';

  // The grade bar counts every browser the other filters leave in, so it shows what each grade would add.
  const base = useMemo(
    () =>
      BROWSERS.filter((b) => (flags.includes('dead') || b.status !== 'discontinued') && (!os || b.platforms[os]) && flags.filter((f): f is Exclude<Flag, 'dead'> => f !== 'dead').every((f) => FLAG_TEST[f](b)) && (!q || b.name.toLowerCase().includes(q) || b.developer.toLowerCase().includes(q))),
    [os, flags.join(), q], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const counts = Object.fromEntries(GRADES.map((g) => [g, base.filter((b) => b.keyFacts.privacyGrade === g).length])) as Record<Grade, number>;
  const rows = useMemo(
    () => privacyOrder(base.filter((b) => !grades.length || grades.includes(b.keyFacts.privacyGrade)), os),
    [base, grades.join(), os], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const shown = all ? rows : rows.slice(0, ROW_LIMIT);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Browser privacy</h1>
          <p className="lede">Every browser’s privacy grade, what it does by default, and what it sends home. Grades come from five scores: privacy by default, blocking, fingerprint resistance, telemetry and business model.</p>
        </div>
        <Link to="/quiz/privacy" className="btn btn--primary">
          Find your privacy level
        </Link>
      </div>

      <div className="sec-gradebar" role="group" aria-label="Filter by privacy grade">
        {GRADES.map((g) =>
          counts[g] ? (
            <button
              key={g}
              type="button"
              className={`sec-gradebar__seg sec-gradebar__seg--${GRADE_TONE[g]}`}
              style={{ flexGrow: Math.max(counts[g], base.length * 0.04) }}
              aria-pressed={grades.includes(g)}
              aria-label={`Privacy grade ${g}, ${counts[g]} ${counts[g] === 1 ? 'browser' : 'browsers'}`}
              data-dim={grades.length > 0 && !grades.includes(g) ? '' : undefined}
              onClick={() => toggle('grade', g)}
            >
              <span className="sec-gradebar__letter">{g}</span>
              <span className="sec-gradebar__n tnum">{counts[g]}</span>
            </button>
          ) : null,
        )}
      </div>

      <div className="priv-filters">
        <label>
          <span className="label">Platform</span>
          <select className="input select" value={osParam === 'all' ? 'all' : (os ?? 'all')} onChange={(e) => write((n) => n.set('os', e.target.value))}>
            <option value="all">All platforms</option>
            {OSES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="priv-filters__search">
          <span className="label">Search</span>
          <span className="sec-search">
            <Search aria-hidden />
            <input className="input" type="search" value={sp.get('q') ?? ''} placeholder="Browser or developer" onChange={(e) => write((n) => (e.target.value ? n.set('q', e.target.value) : n.delete('q')))} />
          </span>
        </label>
        <div className="priv-filters__chips" role="group" aria-label="Narrow the list">
          {(Object.keys(FLAG_LABEL) as Flag[]).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={flags.includes(f)} onClick={() => toggle('f', f)}>
              {FLAG_LABEL[f]}
            </button>
          ))}
          {anyFilter && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSp(osParam ? { os: osParam } : {}, { replace: true })}>
              <X aria-hidden /> Reset filters
            </button>
          )}
        </div>
      </div>

      <p className="small muted priv-count" role="status">
        <span className="tnum">{rows.length}</span> {rows.length === 1 ? 'browser' : 'browsers'}
        {os ? ` on ${OS_BY_ID[os].name}` : ''}. Scores are 0 to 10 and shown for {os ? OS_BY_ID[os].name : 'all platforms'}.
      </p>

      {rows.length ? (
        <>
          <ol className="panel priv-list" aria-label="Browsers by privacy grade">
            {shown.map(({ b, defaults, fingerprint, telemetry }) => (
              <li key={b.id} className="priv-row">
                <Link to={`/browser/${b.id}#privacy`} className="priv-row__id">
                  <BrowserMark b={b} size={32} />
                  <span className="priv-row__name">
                    <strong>{b.name}</strong>
                    <span className="small muted">Jurisdiction: {b.keyFacts.privacy.jurisdiction || 'not stated'}</span>
                  </span>
                </Link>
                <PrivacyGrade grade={b.keyFacts.privacyGrade} small />
                <dl className="priv-row__facts">
                  <div>
                    <dt>By default</dt>
                    <dd>{b.keyFacts.privacy.defaults || 'Not described'}</dd>
                  </div>
                  <div>
                    <dt>Telemetry</dt>
                    <dd>{b.keyFacts.privacy.telemetry || 'Not described'}</dd>
                  </div>
                </dl>
                <span className="priv-row__scores">
                  <Chip value={defaults} label="Defaults" />
                  <Chip value={fingerprint} label="Fingerprint" />
                  <Chip value={telemetry} label="Telemetry" />
                </span>
              </li>
            ))}
          </ol>
          {rows.length > ROW_LIMIT && (
            <p className="priv-more">
              <button type="button" className="btn" onClick={() => setAll(!all)} aria-expanded={all}>
                {all ? `Show the top ${ROW_LIMIT}` : `Show all ${rows.length}`}
              </button>
            </p>
          )}
        </>
      ) : (
        <div className="panel">
          <Empty title="No browsers match" action={<button type="button" className="btn btn--primary" onClick={() => setSp({}, { replace: true })}>Reset filters</button>}>
            Try a different grade or remove a filter.
          </Empty>
        </div>
      )}

      <p className="small muted priv-foot">
        Grades are editorial assessments from public sources, not lab tests. Open a profile to see the evidence behind each score. For how well a browser resists attacks, see <Link to="/security" className="link">Browser security</Link>.
      </p>
    </div>
  );
}
