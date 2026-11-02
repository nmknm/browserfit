import { Check, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { Q, type QuizDef } from '../../data/quizzes';
import { answerLabel, buildCtx, explainExclusion, personaMatches, switchTrade, type AnswerMap, type Result } from '../../lib/quizEngine';
import { getBrowser } from '../../lib/data';
import { BrowserPicker } from '../BrowserPicker';
import { BrowserMark } from '../ui/BrowserMark';
import { Segmented } from '../ui/Controls';
import type { BrowserIndex, OsId } from '../../lib/types';

/** Extra limits a visitor can add on the result page without retaking the quiz. */
export interface Tweaks {
  free: boolean;
  open: boolean;
  stable: boolean;
  here: boolean;
}
export const NO_TWEAKS: Tweaks = { free: false, open: false, stable: false, here: false };

/** Adds the visitor's extra limits to a scoring context as labelled filters. */
export function applyTweaks(ctx: ReturnType<typeof buildCtx>, t: Tweaks, os: OsId | null) {
  if (t.free) ctx.filters.push({ label: 'free to use', test: (b) => b.price !== 'paid' });
  if (t.open) ctx.filters.push({ label: 'open source', test: (b) => b.openSource === true });
  if (t.stable) ctx.filters.push({ label: 'a stable release', test: (b) => b.status === 'active' || b.status === 'maintenance' });
  if (t.here && os) ctx.filters.push({ label: 'available on this device', test: (b) => !!b.platforms[os] && b.platforms[os]!.status !== 'discontinued' });
  return ctx;
}

type Weight = 'off' | 'on' | 'must';

const weightOf = (a: AnswerMap[string]): Weight => (a.off ? 'off' : a.must ? 'must' : 'on');

export function TunePanel({
  ids,
  answers,
  setAnswers,
  tweaks,
  setTweaks,
  hereOs,
  hereName,
  rankingHref,
}: {
  ids: string[];
  answers: AnswerMap;
  setAnswers: Dispatch<SetStateAction<AnswerMap>>;
  tweaks: Tweaks;
  setTweaks: Dispatch<SetStateAction<Tweaks>>;
  hereOs: OsId | null;
  hereName: string;
  rankingHref: string;
}) {
  const rows = ids.filter((id) => Q[id] && answers[id] && answers[id].value !== 'skip' && answers[id].value != null);
  const set = (id: string, w: Weight) =>
    setAnswers((cur) => {
      if (!cur[id]) return cur;
      const next = { ...cur[id] };
      delete next.off;
      delete next.must;
      if (w === 'off') next.off = true;
      if (w === 'must') next.must = true;
      return { ...cur, [id]: next };
    });
  const chips: { key: keyof Tweaks; label: string; show: boolean }[] = [
    { key: 'free', label: 'Free only', show: true },
    { key: 'open', label: 'Open source only', show: true },
    { key: 'stable', label: 'Hide beta and early access', show: true },
    { key: 'here', label: `Works on ${hereName}`, show: !!hereOs },
  ];
  return (
    <section className="section tune" aria-labelledby="tune-h" style={{ marginTop: 'var(--s-10)' }}>
      <div className="section-head">
        <h2 id="tune-h">Tune this result</h2>
      </div>
      <p className="muted small tune__help">Change how much each answer counts. The ranking updates as you go.</p>
      <div className="panel panel-pad tune__panel">
        <ul className="tune__answers">
          {rows.map((id) => {
            const q = Q[id];
            const a = answers[id];
            const options: { value: Weight; label: string }[] = [
              { value: 'off', label: 'Ignore' },
              { value: 'on', label: 'Normal' },
              ...(q.mustable ? [{ value: 'must' as Weight, label: 'Must' }] : []),
            ];
            return (
              <li key={id} className="tune__row">
                <span className="tune__q">
                  <span className="tune__title">{q.title}</span>
                  <span className="small muted">{answerLabel(q, a.value)}</span>
                </span>
                <Segmented<Weight> label={`How much “${q.title}” counts`} options={options} value={weightOf(a)} onChange={(w) => set(id, w)} />
              </li>
            );
          })}
        </ul>
        <div className="tune__filters">
          <h3 className="h-sm">Narrow the field</h3>
          <div className="row">
            {chips
              .filter((c) => c.show)
              .map((c) => (
                <button key={c.key} type="button" className="chip" aria-pressed={tweaks[c.key]} onClick={() => setTweaks((t) => ({ ...t, [c.key]: !t[c.key] }))}>
                  {tweaks[c.key] && <Check aria-hidden />}
                  {c.label}
                </button>
              ))}
          </div>
          <Link to={rankingHref} className="btn btn--sm tune__rank">
            <SlidersHorizontal aria-hidden /> Fine-tune as a ranking
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Two readings of the answers: which personas they resemble, and how the browser in use compares with the winner. */
export function Insights({ ctx, results, winner, currentId, os }: { ctx: ReturnType<typeof buildCtx>; results: Result[]; winner: BrowserIndex; currentId: string | null; os: OsId | null }) {
  const personas = useMemo(() => personaMatches(ctx).filter((p) => p.pct >= 30).slice(0, 3), [ctx]);
  // A generic "Chromium-based browser" detection could be any fork, so it is not compared.
  const current = currentId && currentId !== 'chromium' ? getBrowser(currentId) : undefined;
  const idx = current ? results.findIndex((r) => r.b.id === current.id) : -1;
  const trade = current && current.id !== winner.id ? switchTrade(ctx, current, winner, os) : null;
  if (!personas.length && !current) return null;
  return (
    <section className="section insights" aria-labelledby="ins-h" style={{ marginTop: 'var(--s-10)' }}>
      <div className="section-head">
        <h2 id="ins-h">How your answers read</h2>
      </div>
      <div className="qres__grid">
        {personas.length > 0 && (
          <div className="panel panel-pad stack">
            <h3 className="h-sm">Closest personas</h3>
            <ul className="persona-bars">
              {personas.map((p) => (
                <li key={p.id}>
                  <Link to={`/rankings?lens=persona&persona=${p.id}`} className="persona-bars__name">
                    {p.name}
                  </Link>
                  <span className="persona-bars__bar" aria-hidden>
                    <span style={{ width: `${p.pct}%` }} />
                  </span>
                  <span className="tnum small">{p.pct}%</span>
                </li>
              ))}
            </ul>
            <p className="xs faint">Based on which categories your answers weighted most.</p>
          </div>
        )}
        {current && (
          <div className="panel panel-pad stack">
            <h3 className="h-sm">Compared with {current.name}, which you’re using now</h3>
            {current.id === winner.id ? (
              <p>You’re already on your best match.</p>
            ) : (
              <>
                <p>{idx >= 0 ? `${current.name} ranks #${idx + 1} of ${results.length} for your answers, a ${results[idx].match}% match.` : `${current.name} doesn’t make this list. “Why isn’t a browser higher?” below shows why.`}</p>
                {trade && trade.gain.length > 0 && (
                  <div>
                    <p className="small">
                      <strong>Switching to {winner.name} gains</strong>
                    </p>
                    <ul className="row insights__chips">
                      {trade.gain.map((g) => (
                        <li key={g.name} className="chip">
                          {g.name} <span className="tnum">+{g.diff.toFixed(1)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trade && trade.lose.length > 0 && (
                  <div>
                    <p className="small">
                      <strong>and gives up</strong>
                    </p>
                    <ul className="row insights__chips">
                      {trade.lose.map((g) => (
                        <li key={g.name} className="chip">
                          {g.name} <span className="tnum">−{Math.abs(g.diff).toFixed(1)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function WhyNot({
  def,
  ctx,
  winner,
  os,
}: {
  def: QuizDef;
  ctx: ReturnType<typeof buildCtx>;
  winner: BrowserIndex;
  os: OsId | null;
}) {
  const [picked, setPicked] = useState<BrowserIndex | null>(null);
  const why = useMemo(() => (picked ? explainExclusion(ctx, def.pool, picked, os, def.poolLabel) : null), [ctx, def.pool, def.poolLabel, picked, os]);
  const msg = picked && why ? describe(picked, why, winner) : '';

  return (
    <section className="section whynot" aria-labelledby="whynot-h" style={{ marginTop: 'var(--s-10)' }}>
      <div className="section-head">
        <h2 id="whynot-h">Why isn’t a browser higher?</h2>
      </div>
      <div className="panel panel-pad whynot__panel">
        <BrowserPicker label="Choose a browser" onPick={setPicked} exclude={[winner.id]} />
        <div role="status" className="whynot__out">
          {picked && why && (
            <div className="whynot__card">
              <BrowserMark b={picked} size={32} />
              <div style={{ minWidth: 0 }}>
                <p className="whynot__line">{msg}</p>
                {why.kind === 'ranked' && why.deficits.length > 0 && (
                  <ul className="row whynot__chips" aria-label={`Where ${picked.name} trails ${winner.name}`}>
                    {why.deficits.map((d) => (
                      <li key={d.name} className="chip">
                        {d.name} <span className="tnum">−{d.diff.toFixed(1)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function describe(b: BrowserIndex, why: ReturnType<typeof explainExclusion>, winner: BrowserIndex) {
  switch (why.kind) {
    case 'discontinued':
      return `${b.name} is discontinued, so quizzes leave it out.`;
    case 'pool':
      return `${b.name} isn’t part of this quiz${why.label ? ` (${why.label} only)` : ''}.`;
    case 'os':
      return `${b.name} isn’t available on ${why.label ?? 'that system'}.`;
    case 'filter':
      return `Left out by “${why.label}”. Remove it to see where ${b.name} ranks.`;
    case 'must':
      return `Left out because it has no ${why.label?.toLowerCase()}, which you marked as a must. Switch that answer to Normal to see where ${b.name} ranks.`;
    default: {
      const lead = `${b.name} ranks #${why.rank} of ${why.of}.`;
      return why.deficits.length ? `${lead} It trails ${winner.name} most on:` : `${lead} It’s close to ${winner.name} across the board.`;
    }
  }
}
