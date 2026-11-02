import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrowserMark } from '../components/ui/BrowserMark';
import { Empty } from '../components/ui/Controls';
import { TierLegend } from '../components/ui/Score';
import { COLLECTIONS, COLLECTION_BY_ID, type Collection } from '../data/collections';
import { CATEGORY_BY_ID, CATEGORY_INDEX, OS_BY_ID } from '../data/taxonomy';
import { scoresFor } from '../lib/data';
import { useDocTitle } from '../lib/hooks';
import { DEFAULT_WEIGHTS, overall, pool, rank } from '../lib/scoring';
import { useApp } from '../lib/store';
import type { OsId } from '../lib/types';
import { RankList } from './Rankings';
import NotFound from './NotFound';

/** Members of a collection, ranked. The visitor's chosen system narrows the pool and scores for that system. */
function membersOf(c: Collection, os: OsId | null) {
  const value = (b: Parameters<Collection['test']>[0]) => (c.sort ? scoresFor(b, os)[CATEGORY_INDEX[c.sort]] : overall(b, DEFAULT_WEIGHTS, os));
  return rank(pool({ os }).filter(c.test), value);
}

export function Collections() {
  useDocTitle('Collections');
  const { os } = useApp();
  const cards = useMemo(() => COLLECTIONS.map((c) => ({ c, rows: membersOf(c, os) })), [os]);
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Collections</h1>
          <p className="lede">Ready-made lists for common needs. Every list follows a rule over the profiles, so it updates when the data does.</p>
        </div>
      </div>
      {os && <p className="small muted coll-note">Showing browsers available on {OS_BY_ID[os].name}. Change the system in the top bar.</p>}
      <div className="grid grid-3">
        {cards.map(({ c, rows }) => (
          <Link key={c.id} to={`/collections/${c.id}`} className="panel quiz-tile coll-card">
            <h3>{c.name}</h3>
            <p className="muted small">{c.blurb}</p>
            <div className="coll-card__marks" aria-hidden>
              {rows.slice(0, 4).map((r) => (
                <BrowserMark key={r.b.id} b={r.b} size={28} />
              ))}
            </div>
            <span className="row xs faint">
              <span className="tnum">{rows.length}</span> {rows.length === 1 ? 'browser' : 'browsers'}
            </span>
            <span className="quiz-tile__go">
              See the list <ArrowRight aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CollectionPage() {
  const { id } = useParams();
  const c = id ? COLLECTION_BY_ID[id] : undefined;
  const { os } = useApp();
  useDocTitle(c?.name ?? 'Collection');
  const rows = useMemo(() => (c ? membersOf(c, os) : []), [c, os]);
  if (!c) return <NotFound />;
  const valueLabel = c.sort ? CATEGORY_BY_ID[c.sort].name : 'Overall score';
  return (
    <div className="container page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/collections">Collections</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{c.name}</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>{c.name}</h1>
          <p className="lede">{c.blurb}</p>
        </div>
      </div>
      <p className="small muted coll-note">
        <strong>How browsers get in:</strong> {c.rule} Ranked by {valueLabel.toLowerCase()}.
        {os ? ` Showing browsers available on ${OS_BY_ID[os].name}.` : ''}
      </p>
      {rows.length ? (
        <section className="section" style={{ marginTop: 'var(--s-6)' }}>
          <div className="section-head">
            <h2>
              <span className="tnum">{rows.length}</span> {rows.length === 1 ? 'browser' : 'browsers'}
            </h2>
            <TierLegend />
          </div>
          <RankList rows={rows} valueLabel={valueLabel} />
        </section>
      ) : (
        <div className="panel">
          <Empty title="No browsers in this list" action={<Link to="/collections" className="btn btn--primary">See all collections</Link>}>
            None of them are available on {os ? OS_BY_ID[os].name : 'this system'}. Pick a different system in the top bar, or try another list.
          </Empty>
        </div>
      )}
      <section className="section">
        <div className="section-head">
          <h2>More collections</h2>
        </div>
        <ul className="row coll-more">
          {COLLECTIONS.filter((x) => x.id !== c.id).map((x) => (
            <li key={x.id}>
              <Link to={`/collections/${x.id}`} className="chip">
                {x.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="small muted" style={{ marginTop: 'var(--s-4)' }}>
          Want one list narrowed to your needs? <Link to="/quiz/build" className="link">Build your own quiz</Link> or <Link to="/quiz" className="link">take a quiz</Link>.
        </p>
      </section>
    </div>
  );
}
