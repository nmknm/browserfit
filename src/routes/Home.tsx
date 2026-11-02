import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowRight, Brain, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BROWSERS, getBrowser } from '../lib/data';
import { EASE_OUT, useHeightFlip } from '../lib/motion';
import { DEFAULT_WEIGHTS, focusWeights, overall, rank, type Weights } from '../lib/scoring';
import { detect } from '../lib/detect';
import { ENGINES, GROUP_LABEL, OSES, CATEGORIES } from '../data/taxonomy';
import { BrowserMark } from '../components/ui/BrowserMark';
import { FactsStrip } from '../components/ui/Facts';
import { ScoreBar, ScoreNum } from '../components/ui/Score';
import { GradeChip } from '../components/ui/SecurityBits';
import { privacyOrder, securityFor, type Grade } from '../lib/security';
import { NAV } from './nav';
import { readLocal, useApp } from '../lib/store';
import { useDocTitle } from '../lib/hooks';
import { NEWS } from '../data/news';

const PRIORITIES = [
  { id: 'privacy', label: 'Privacy', cats: ['privacyDefaults', 'blocking', 'fingerprinting', 'telemetry'] },
  { id: 'speed', label: 'Speed', cats: ['jsSpeed', 'pageLoad', 'networkSpeed', 'smoothness'] },
  { id: 'battery', label: 'Battery & RAM', cats: ['battery', 'memory', 'cpu'] },
  { id: 'custom', label: 'Customization', cats: ['lookCustom', 'behaviourCustom', 'advancedSettings', 'tabManagement'] },
  { id: 'ext', label: 'Extensions', cats: ['extensions'] },
  { id: 'easy', label: 'Easy to use', cats: ['beginnerFriendly', 'webCompat'] },
] as const;

const NAV_ORDER = ['tools', 'rank', 'guides', 'browsers'];

const NAV_BLURB: Record<string, string> = {
  browsers: 'Find, filter and shortlist browsers.',
  rank: 'See who leads, or weight it your way.',
  tools: 'Compare, test and decide.',
  guides: 'Privacy, security and how it all works.',
};

function HeroSearch() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const ql = q.trim().toLowerCase();
  const hits = ql ? BROWSERS.filter((b) => b.name.toLowerCase().includes(ql) || b.tags.some((t) => t.includes(ql))).slice(0, 6) : [];
  const box = useRef<HTMLUListElement>(null);
  useHeightFlip(box, hits.map((b) => b.id).join());
  return (
    <form
      className="hero-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (hits[0]) nav(`/browser/${hits[0].id}`);
        else nav(`/browsers?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search aria-hidden />
      <input
        className="hero-search__input"
        placeholder="Look up a browser: Firefox, Brave, Zen…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Look up a browser"
        aria-controls="hero-hits"
      />
      <AnimatePresence>
        {hits.length > 0 && (
          <motion.ul
            ref={box}
            id="hero-hits"
            className="hero-search__hits"
            aria-label="Matching browsers"
            initial={{ opacity: 0, transform: 'translateY(-4px) scale(0.98)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
            exit={{ opacity: 0, transform: 'translateY(-4px) scale(0.98)', transition: { duration: 0.1, ease: EASE_OUT } }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            {hits.map((b) => (
              <motion.li key={b.id} layout="position" transition={{ duration: 0.16, ease: EASE_OUT }}>
                <Link to={`/browser/${b.id}`}>
                  <BrowserMark b={b} size={26} />
                  <span className="truncate">{b.name}</span>
                  <span className="faint small truncate">{b.developer}</span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </form>
  );
}

function YouCard() {
  const d = useMemo(detect, []);
  const b = getBrowser(d.browserId);
  return (
    <div className="you-card panel">
      <div className="you-card__head">
        <span className="badge badge--accent">Detected</span>
        <span className="small muted">
          You’re on {d.browserName}
          {d.version ? ` ${d.version}` : ''} · {d.osName}
        </span>
      </div>
      {b ? (
        <>
          <div className="row" style={{ gap: 'var(--s-3)', flexWrap: 'nowrap' }}>
            <BrowserMark b={b} size={48} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 className="truncate" style={{ fontSize: 'var(--text-xl)' }}>
                {b.name}
              </h2>
              <p className="muted small truncate">{b.pitch}</p>
            </div>
            <ScoreNum value={overall(b, DEFAULT_WEIGHTS, d.os)} size="xl" label="Overall" />
          </div>
          <FactsStrip b={b} os={d.os} />
          <div className="row">
            <Link to={`/browser/${b.id}`} className="btn btn--sm">
              Open profile
            </Link>
            <Link to="/you" className="btn btn--sm btn--ghost">
              Test & benchmark it <ArrowRight aria-hidden />
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="muted">We couldn’t match this browser to a profile yet. Many forks identify as Chrome or Firefox.</p>
          <Link to="/you" className="btn btn--sm">
            Run the browser test
          </Link>
        </>
      )}
    </div>
  );
}

function MostSecure() {
  const { os } = useApp();
  const rows = useMemo(() => rank(BROWSERS.filter((b) => b.status !== 'discontinued' && (!os || b.platforms[os])), (b) => securityFor(b, os).score).slice(0, 5), [os]);
  return (
    <section className="section" aria-labelledby="sec-h">
      <div className="section-head">
        <div>
          <h2 id="sec-h">Most secure right now</h2>
          <p>Graded on seven layers of protection, from isolation to patching.</p>
        </div>
        <Link to="/security" className="btn btn--sm btn--ghost">
          All security grades <ArrowRight aria-hidden />
        </Link>
      </div>
      <div className="panel">
        <ol className="toplist">
          {rows.map((r) => (
            <li key={r.b.id}>
              <Link to={`/browser/${r.b.id}#security`} className="brow">
                <span className="brow__rank tnum">{r.rank}</span>
                <BrowserMark b={r.b} size={32} />
                <span className="brow__id">
                  <span className="brow__name truncate">{r.b.name}</span>
                  <span className="brow__sub truncate">{securityFor(r.b, os).strong[0]?.text ?? r.b.pitch}</span>
                </span>
                <span className="brow__bar">
                  <ScoreBar value={r.value} animate={false} />
                </span>
                <GradeChip grade={securityFor(r.b, os).grade} />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The first five browsers in the privacy guide, in the guide's own order. */
function MostPrivate() {
  const { os } = useApp();
  const rows = useMemo(() => privacyOrder(BROWSERS.filter((b) => b.status !== 'discontinued' && (!os || b.platforms[os])), os).slice(0, 5), [os]);
  return (
    <section className="section" aria-labelledby="priv-h">
      <div className="section-head">
        <div>
          <h2 id="priv-h">Most private right now</h2>
          <p>Graded on privacy by default, blocking, fingerprint resistance, telemetry and business model.</p>
        </div>
        <Link to="/privacy" className="btn btn--sm btn--ghost">
          Browser privacy guide <ArrowRight aria-hidden />
        </Link>
      </div>
      <div className="panel">
        <ol className="toplist">
          {rows.map((r, i) => (
            <li key={r.b.id}>
              <Link to={`/browser/${r.b.id}#privacy`} className="brow">
                <span className="brow__rank tnum">{i + 1}</span>
                <BrowserMark b={r.b} size={32} />
                <span className="brow__id">
                  <span className="brow__name truncate">{r.b.name}</span>
                  <span className="brow__sub truncate">{r.b.keyFacts.privacy.defaults || r.b.pitch}</span>
                </span>
                <span className="brow__bar">
                  <ScoreBar value={(r.defaults + r.fingerprint + r.telemetry) / 3} animate={false} />
                </span>
                <GradeChip grade={r.b.keyFacts.privacyGrade as Grade} kind="Privacy" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TopRated() {
  const [pri, setPri] = useState<string[]>([]);
  const { os } = useApp();
  const weights: Weights = useMemo(() => {
    if (!pri.length) return DEFAULT_WEIGHTS;
    return focusWeights(PRIORITIES.filter((p) => pri.includes(p.id)).flatMap((p) => p.cats));
  }, [pri]);
  const rows = useMemo(
    () => rank(BROWSERS.filter((b) => b.status !== 'discontinued' && (!os || b.platforms[os])), (b) => overall(b, weights, os)).slice(0, 8),
    [weights, os],
  );
  return (
    <section className="section" aria-labelledby="top-h">
      <div className="section-head">
        <div>
          <h2 id="top-h">Top rated right now</h2>
          <p>Pick what matters to you and watch the list re-rank.</p>
        </div>
        <Link to="/rankings" className="btn btn--sm btn--ghost">
          All leaderboards <ArrowRight aria-hidden />
        </Link>
      </div>
      <div className="row" style={{ marginBottom: 'var(--s-4)' }} role="group" aria-label="Priorities">
        {PRIORITIES.map((p) => (
          <button key={p.id} className="chip" aria-pressed={pri.includes(p.id)} onClick={() => setPri((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}>
            {p.label}
          </button>
        ))}
        {pri.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => setPri([])}>
            Reset
          </button>
        )}
      </div>
      <div className="panel">
        <LayoutGroup>
          <ol className="toplist" aria-live="polite">
            {rows.map((r) => (
              <motion.li key={r.b.id} layout transition={{ type: 'spring', duration: 0.45, bounce: 0.12 }}>
                <Link to={`/browser/${r.b.id}`} className="brow">
                  <span className="brow__rank tnum">{r.rank}</span>
                  <BrowserMark b={r.b} size={32} />
                  <span className="brow__id">
                    <span className="brow__name truncate">{r.b.name}</span>
                    <span className="brow__sub truncate">{r.b.pitch}</span>
                  </span>
                  <span className="brow__bar">
                    <ScoreBar value={r.value} animate={false} />
                  </span>
                  <ScoreNum value={r.value} />
                </Link>
              </motion.li>
            ))}
          </ol>
        </LayoutGroup>
      </div>
    </section>
  );
}

/** Shown only to returning visitors: an unfinished quiz and the browsers they looked at last. */
function Resume() {
  const { recent } = useApp();
  const quiz = useMemo(() => readLocal<{ to: string; name: string; step: number } | null>('bf-last-quiz', null), []);
  const seen = recent.map((id) => getBrowser(id)).filter((b): b is NonNullable<typeof b> => !!b).slice(0, 6);
  if (!quiz && !seen.length) return null;
  return (
    <section className="section resume" aria-label="Pick up where you left off">
      {quiz && (
        <Link to={quiz.to} className="panel resume__quiz">
          <Brain aria-hidden />
          <span>
            <strong>Continue “{quiz.name}”</strong>
            <span className="small muted"> · question {quiz.step}</span>
          </span>
          <ArrowRight aria-hidden />
        </Link>
      )}
      {seen.length > 0 && (
        <div className="resume__seen">
          <h2 className="h-sm">Recently viewed</h2>
          <ul className="row">
            {seen.map((b) => (
              <li key={b.id}>
                <Link to={`/browser/${b.id}`} className="chip">
                  <BrowserMark b={b} size={18} flat />
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  useDocTitle('');
  const { setOs } = useApp();
  const live = BROWSERS.filter((b) => b.status !== 'discontinued');
  const groups = Object.entries(GROUP_LABEL)
    .map(([id, label]) => ({ id, label, list: BROWSERS.filter((b) => b.group === id) }))
    .filter((g) => g.list.length);
  const engines = ENGINES.map((e) => ({ e, n: live.filter((b) => b.engine === e.id).length })).filter((x) => x.n);
  const maxEng = Math.max(1, ...engines.map((x) => x.n));

  return (
    <div className="container">
      <section className="hero">
        <div className="hero__copy">
          <h1>Every web browser, explained.</h1>
          <p className="hero__sub">
            Detailed profiles of {BROWSERS.length} browsers on every platform: {CATEGORIES.length} rated categories, features, privacy, sync, extensions and sources.
          </p>
          <HeroSearch />
          <div className="row hero__os" aria-label="Browse by platform">
            {OSES.map((o) => (
              <Link key={o.id} to={`/os/${o.id}`} className="chip" onClick={() => setOs(o.id)}>
                {o.name}
              </Link>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--s-6)' }}>
            <Link to="/browsers" className="btn btn--primary btn--lg">
              Browse all browsers
            </Link>
            <Link to="/quiz" className="btn btn--lg">
              <Brain aria-hidden /> Find mine in 2 minutes
            </Link>
          </div>
        </div>
        <YouCard />
      </section>

      <Resume />

      <section className="section" aria-labelledby="types-h">
        <div className="section-head">
          <h2 id="types-h">Browse by type</h2>
          <Link to="/browsers" className="btn btn--sm btn--ghost">
            All {BROWSERS.length} <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="grid grid-3">
          {groups.map((g) => (
            <Link key={g.id} to={`/browsers?group=${g.id}`} className="panel type-tile">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3>{g.label}</h3>
                <span className="badge tnum">{g.list.length}</span>
              </div>
              <div className="type-tile__marks" aria-hidden>
                {g.list.slice(0, 7).map((b) => (
                  <BrowserMark key={b.id} b={b} size={30} />
                ))}
              </div>
              <p className="small muted truncate">{g.list.slice(0, 4).map((b) => b.name).join(', ')}</p>
            </Link>
          ))}
        </div>
      </section>

      <TopRated />
      <MostPrivate />
      <MostSecure />

      <section className="section split split--match" aria-labelledby="eng-h">
        <div>
          <div className="section-head">
            <h2 id="eng-h">What’s under the hood</h2>
          </div>
          <div className="panel panel-pad stack">
            {engines.map(({ e, n }) => (
              <Link key={e.id} to={`/browsers?engine=${e.id}`} className="eng-row">
                <span className="eng-row__name">
                  <span className="engine-dot" style={{ background: `var(${e.colorVar})` }} aria-hidden />
                  {e.name}
                </span>
                <span className="eng-row__bar">
                  <span style={{ width: `${(n / maxEng) * 100}%`, background: `var(${e.colorVar})` }} />
                </span>
                <span className="tnum small muted">{n}</span>
              </Link>
            ))}
            <Link to="/engines" className="link small">
              How engines differ
            </Link>
          </div>
        </div>
        <div>
          <div className="section-head">
            <h2>Recently changed</h2>
            <Link to="/news" className="btn btn--sm btn--ghost">
              All changes <ArrowRight aria-hidden />
            </Link>
          </div>
          <ul className="panel news-mini">
            {NEWS.slice(0, 9).map((n) => (
              <li key={n.date + n.title}>
                <span className={`badge badge--${n.tone}`}>{n.kind}</span>
                <span className="news-mini__title">{n.title}</span>
                <time className="faint xs tnum">{n.date}</time>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {NAV_ORDER.map((id) => NAV.find((g) => g.id === id)!).map((g, i, all) => (
        <section key={g.id} className="section" aria-labelledby={`nav-${g.id}-h`} style={i === all.length - 1 ? { marginBottom: 'var(--s-20)' } : undefined}>
          <div className="section-head">
            <h2 id={`nav-${g.id}-h`}>{g.label}</h2>
            <p>{NAV_BLURB[g.id]}</p>
          </div>
          <div className="grid grid-4">
            {g.items.map((t) => (
              <Link key={t.to} to={t.to} className="panel tool-tile">
                <t.icon aria-hidden />
                <span className="mega__label">{t.label}</span>
                <span className="mega__desc">{t.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
