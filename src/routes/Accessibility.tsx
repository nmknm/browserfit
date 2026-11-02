import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrowserMark } from '../components/ui/BrowserMark';
import { TierLegend } from '../components/ui/Score';
import { CATEGORY_BY_ID, CATEGORY_INDEX, FEATURES, FEATURE_INDEX, OS_BY_ID } from '../data/taxonomy';
import { loadDetail, scoresFor } from '../lib/data';
import { useDocTitle } from '../lib/hooks';
import { pool, rank } from '../lib/scoring';
import { useApp } from '../lib/store';
import type { BrowserDetail, Evidence } from '../lib/types';
import { RankList } from './Rankings';

const EVIDENCE: Record<Evidence, string> = { 'measured-public': 'Measured, public', documented: 'Documented', editorial: 'Editorial' };
/** Features that make a browser easier to read or operate; each links to the feature finder. */
const HELPFUL = ['readerMode', 'translation', 'keyboardShortcuts', 'customThemes', 'pip'];
const TOP = 20;

/** How well each browser works with screen readers, zoom and keyboards, from the existing accessibility score. */
export default function Accessibility() {
  useDocTitle('Accessibility');
  const { os } = useApp();
  const cat = CATEGORY_BY_ID.accessibility;
  const [all, setAll] = useState(false);
  const rows = useMemo(() => rank(pool({ os }), (b) => scoresFor(b, os)[CATEGORY_INDEX.accessibility]), [os]);
  const shown = all ? rows : rows.slice(0, TOP);
  const [notes, setNotes] = useState<Record<string, BrowserDetail | null>>({});
  const topIds = rows.slice(0, 5).map((r) => r.b.id).join();

  useEffect(() => {
    let alive = true;
    Promise.all(topIds.split(',').filter(Boolean).map(async (id) => [id, await loadDetail(id)] as const)).then((pairs) => alive && setNotes(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [topIds]);

  const helpful = HELPFUL.map((id) => {
    const f = FEATURES.find((x) => x.id === id)!;
    const n = rows.filter((r) => [1, 2, 3].includes(r.b.features[FEATURE_INDEX[id]]?.[0] ?? 0)).length;
    return { f, n };
  });

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Accessibility</h1>
          <p className="lede">Which browsers work best with screen readers, zoom and the keyboard. This ranks the accessibility score that every profile already has.</p>
        </div>
      </div>
      {os && <p className="small muted coll-note">Showing browsers available on {OS_BY_ID[os].name}. Change the system in the top bar.</p>}

      <section className="section" aria-labelledby="cover-h" style={{ marginTop: 'var(--s-4)' }}>
        <div className="section-head">
          <h2 id="cover-h">What the score covers</h2>
        </div>
        <dl className="panel panel-pad access-cover">
          <div>
            <dt>In plain words</dt>
            <dd>{cat.plain}</dd>
          </div>
          <div>
            <dt>What we look at</dt>
            <dd>{cat.techy}</dd>
          </div>
          <div>
            <dt>A 10 means</dt>
            <dd>{cat.ten}</dd>
          </div>
          <div>
            <dt>A 0 means</dt>
            <dd>{cat.zero}</dd>
          </div>
        </dl>
      </section>

      <section className="section" aria-labelledby="help-h">
        <div className="section-head">
          <h2 id="help-h">Features that help</h2>
          <p>Tap one to see which browsers have it.</p>
        </div>
        <ul className="row access-feats">
          {helpful.map(({ f, n }) => (
            <li key={f.id}>
              <Link to={`/finder?f=${f.id}`} className="chip">
                {f.name} <span className="tnum faint">{n}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="rank-h">
        <div className="section-head">
          <h2 id="rank-h">Ranked by accessibility</h2>
          <TierLegend />
        </div>
        <RankList rows={shown} valueLabel="Accessibility score" />
        {rows.length > TOP && (
          <p style={{ marginTop: 'var(--s-4)' }}>
            <button type="button" className="btn" aria-expanded={all} onClick={() => setAll(!all)}>
              {all ? `Show the top ${TOP}` : `Show all ${rows.length}`}
            </button>
          </p>
        )}
      </section>

      <section className="section" aria-labelledby="why-h">
        <div className="section-head">
          <h2 id="why-h">The evidence behind the top five</h2>
        </div>
        <ul className="access-notes">
          {rows.slice(0, 5).map(({ b }) => {
            const note = notes[b.id]?.scoreNotes?.accessibility;
            return (
              <li key={b.id} className="panel panel-pad">
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <BrowserMark b={b} size={32} />
                  <Link to={`/browser/${b.id}#scores`} className="access-notes__name">
                    {b.name}
                  </Link>
                </div>
                {note ? (
                  <>
                    <p>{note[0]}</p>
                    <p className="xs faint">Evidence: {EVIDENCE[note[1]]}</p>
                  </>
                ) : (
                  <p className="small faint">{notes[b.id] === undefined ? 'Loading…' : 'No note on file for this score.'}</p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="small muted" style={{ marginTop: 'var(--s-4)' }}>
          Scores are editorial assessments from public sources, not an audit of each browser’s assistive-technology support. Test with your own tools before you commit.
        </p>
      </section>
    </div>
  );
}
