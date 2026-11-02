import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ConfidenceBadge } from '../components/ui/Facts';
import { STATUS_LABEL } from '../data/taxonomy';
import { BROWSERS } from '../lib/data';
import { useDocTitle } from '../lib/hooks';

const DAY = 86_400_000;
const fmt = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

const BUCKETS = [
  { id: 'fresh', label: 'Within 30 days', max: 30, step: 6 },
  { id: 'recent', label: '31 to 60 days', max: 60, step: 4 },
  { id: 'aging', label: '61 to 90 days', max: 90, step: 2 },
  { id: 'old', label: 'Over 90 days', max: Infinity, step: 1 },
] as const;

/** How current and how well-sourced the data behind the site is, counted from the profiles themselves. */
export default function DataHealth() {
  useDocTitle('Data health');
  const stats = useMemo(() => {
    const live = BROWSERS.filter((b) => b.status !== 'discontinued');
    const now = Date.now();
    const age = (b: (typeof live)[number]) => Math.max(0, Math.floor((now - new Date(b.lastVerified).getTime()) / DAY));
    const buckets = BUCKETS.map((k, i) => ({ ...k, n: live.filter((b) => age(b) <= k.max && (i === 0 || age(b) > BUCKETS[i - 1].max)).length }));
    const confidence = (['high', 'medium', 'low'] as const).map((level) => ({ level, n: live.filter((b) => b.confidence === level).length }));
    const researched = live.filter((b) => b.security.researched).length;
    const oldest = [...live].sort((a, z) => a.lastVerified.localeCompare(z.lastVerified)).slice(0, 8);
    const low = live.filter((b) => b.confidence === 'low').sort((a, z) => a.name.localeCompare(z.name));
    return { live, buckets, confidence, researched, oldest, low, age };
  }, []);
  const total = stats.live.length;
  const fresh = stats.buckets[0].n;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Data health</h1>
          <p className="lede">How current and how well-sourced the profiles are, counted from the data itself. Every browser shows its own confidence and last-checked date.</p>
        </div>
      </div>

      <div className="grid grid-3 health-tiles">
        <div className="panel panel-pad">
          <p className="small muted">Browsers still available</p>
          <p className="health-num tnum">{total}</p>
          <p className="xs faint">Discontinued browsers are kept as profiles but left out of rankings and quizzes.</p>
        </div>
        <div className="panel panel-pad">
          <p className="small muted">Checked in the last 30 days</p>
          <p className="health-num tnum">
            {Math.round((fresh / total) * 100)}
            <span className="health-unit">%</span>
          </p>
          <p className="xs faint tnum">
            {fresh} of {total} browsers
          </p>
        </div>
        <div className="panel panel-pad">
          <p className="small muted">Security details researched</p>
          <p className="health-num tnum">
            {stats.researched}
            <span className="health-unit"> of {total}</span>
          </p>
          <p className="xs faint">The rest are estimated from the engine and profile, and labelled Estimated.</p>
        </div>
      </div>

      <section className="section" aria-labelledby="fresh-h">
        <div className="section-head">
          <h2 id="fresh-h">How recently each browser was checked</h2>
        </div>
        <div className="panel panel-pad stack">
          <div className="freshbar" aria-hidden>
            {stats.buckets.map((k) =>
              k.n ? (
                <span key={k.id} style={{ flexGrow: k.n, background: `var(--seq-${k.step})` }} />
              ) : null,
            )}
          </div>
          <ul className="health-legend">
            {stats.buckets.map((k) => (
              <li key={k.id}>
                <span className="health-legend__sw" style={{ background: `var(--seq-${k.step})` }} aria-hidden />
                <span>{k.label}</span>
                <strong className="tnum">{k.n}</strong>
              </li>
            ))}
          </ul>
          <p className="xs faint">Counted from today’s date against each profile’s last-checked date.</p>
        </div>
      </section>

      <section className="section" aria-labelledby="conf-h">
        <div className="section-head">
          <h2 id="conf-h">Confidence in what we know</h2>
        </div>
        <div className="panel panel-pad stack">
          <ul className="health-legend">
            {stats.confidence.map((c) => (
              <li key={c.level}>
                <ConfidenceBadge level={c.level} />
                <strong className="tnum">{c.n}</strong>
              </li>
            ))}
          </ul>
          <p className="small muted">Low means public information was thin or sources disagreed. Those browsers are listed below so you can weigh their scores accordingly.</p>
        </div>
      </section>

      <div className="qres__grid">
        <section className="section" aria-labelledby="low-h" style={{ marginTop: 'var(--s-10)' }}>
          <div className="section-head">
            <h2 id="low-h">Low confidence ({stats.low.length})</h2>
          </div>
          {stats.low.length ? (
            <ul className="panel health-list">
              {stats.low.map((b) => (
                <li key={b.id}>
                  <Link to={`/browser/${b.id}#sources`} className="health-row">
                    <BrowserMark b={b} size={28} />
                    <span className="health-row__id">
                      <strong>{b.name}</strong>
                      <span className="small muted">{STATUS_LABEL[b.status]}</span>
                    </span>
                    <time className="small muted tnum" dateTime={b.lastVerified}>
                      {fmt(b.lastVerified)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel panel-pad muted">No browser is rated low confidence.</p>
          )}
        </section>
        <section className="section" aria-labelledby="old-h" style={{ marginTop: 'var(--s-10)' }}>
          <div className="section-head">
            <h2 id="old-h">Longest since checked</h2>
          </div>
          <ul className="panel health-list">
            {stats.oldest.map((b) => (
              <li key={b.id}>
                <Link to={`/browser/${b.id}#sources`} className="health-row">
                  <BrowserMark b={b} size={28} />
                  <span className="health-row__id">
                    <strong>{b.name}</strong>
                    <span className="small muted tnum">{stats.age(b)} days ago</span>
                  </span>
                  <time className="small muted tnum" dateTime={b.lastVerified}>
                    {fmt(b.lastVerified)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="small muted health-foot">
        Scores are editorial assessments from public sources, not lab tests. Read how scores and evidence types work on <Link to="/about" className="link">How we score</Link>.
      </p>
    </div>
  );
}
