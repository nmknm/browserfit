import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Bookmark, Brain, ChevronDown, GitCompare, HelpCircle, Link2, Lock, RotateCcw, Scale, Search, SlidersHorizontal, Sparkles, Swords, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyEvent, type SetStateAction } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Q, QUIZZES, PRIVACY_Q, SECURITY_Q, type Question, type QuizDef } from '../data/quizzes';
import { GuessRunner, TriviaRunner } from './QuizTrivia';
import { answerLabel, buildCtx, confidence, evaluate, everywherePick, findConflict, nextQuestion, perOsPicks, privacyLevel, securityLevel, traceAnswers, type AnswerMap, type Result } from '../lib/quizEngine';
import { decodeResult, encodeResult, resultLink, type SharedResult } from '../lib/quizUrl';
import { customToDef, describePool, resolveCustom, useCustomQuizzes, type CustomQuiz } from '../lib/customQuiz';
import { profileAnswers, saveProfile } from '../lib/quizProfile';
import { detect } from '../lib/detect';
import { applyTweaks, Insights, NO_TWEAKS, TunePanel, WhyNot, type Tweaks } from '../components/quiz/ResultTools';
import { QuestionView, TYPE_LABEL } from '../components/quiz/QuestionView';
import { BrowserMark } from '../components/ui/BrowserMark';
import { Collapse } from '../components/ui/Collapse';
import { FactsStrip } from '../components/ui/Facts';
import { ScoreRing } from '../components/ui/Score';
import { CATEGORIES, ENGINE_BY_ID, OS_BY_ID } from '../data/taxonomy';
import { useApp, readLocal, writeLocal, COMPARE_MAX } from '../lib/store';
import { useDocTitle, useIsMobile } from '../lib/hooks';
import { encodeWeights } from '../lib/weightsUrl';
import { BROWSERS } from '../lib/data';
import { securityFor } from '../lib/security';
import { GradeChip } from '../components/ui/SecurityBits';
import { diversePicks, type Weights } from '../lib/scoring';
import NotFound from './NotFound';

/* ------------------------------ hub ------------------------------ */

/** A short line about where the visitor is with a quiz: unfinished, finished, or their best score. */
function quizState(q: QuizDef): string | null {
  if (q.kind === 'trivia') {
    const best = Object.values(readLocal<Record<string, number>>(q.id === 'myths' ? 'bf-myths-best' : 'bf-iq-best2', {}));
    return best.length ? `Best score ${Math.max(...best)} of 10` : null;
  }
  if (q.kind === 'guess') {
    const best = readLocal<number>('bf-guess-best', 0);
    return best ? `Best score ${best} of 50` : null;
  }
  if (q.kind !== 'match' && q.kind !== 'devices') return null;
  const saved = readLocal<{ asked?: string[]; done?: boolean } | null>(`bf-quiz-${q.id}`, null);
  if (!saved?.asked?.length) return null;
  return saved.done ? 'Finished. Open it to see your result.' : `In progress, ${saved.asked.length} ${saved.asked.length === 1 ? 'question' : 'questions'} in`;
}

export function QuizHub() {
  useDocTitle('Quizzes');
  const state = useMemo(() => Object.fromEntries(QUIZZES.map((q) => [q.id, quizState(q)])) as Record<string, string | null>, []);
  const [mine, setMine] = useCustomQuizzes();
  const { toast } = useApp();
  const remove = (q: CustomQuiz) => {
    setMine((cur) => cur.filter((x) => x.id !== q.id));
    toast('Quiz deleted.', { label: 'Undo', run: () => setMine((cur) => (cur.some((x) => x.id === q.id) ? cur : [q, ...cur])) });
  };
  const duplicate = (q: CustomQuiz) => setMine((cur) => [{ ...q, id: `c-${Date.now().toString(36)}`, name: `${q.name} (copy)`.slice(0, 60), made: Date.now() }, ...cur]);
  const groups = [
    { id: 'find', label: 'Find your browser' },
    { id: 'narrow', label: 'Narrow it down' },
    { id: 'self', label: 'Know yourself' },
  ] as const;
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Quizzes</h1>
          <p className="lede">Adaptive quizzes that explain their answer. Every result shows what moved it, so you can trust it or tweak it.</p>
        </div>
      </div>
      {groups.map((g) => (
        <section key={g.id} className="section" style={{ marginTop: 'var(--s-8)' }}>
          <div className="section-head">
            <h2>{g.label}</h2>
          </div>
          <div className="grid grid-3">
            {QUIZZES.filter((q) => q.group === g.id).map((q) => (
              <Link key={q.id} to={`/quiz/${q.id}`} className={`panel quiz-tile ${q.id === 'matchmaker' ? 'quiz-tile--hero' : ''}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <h3>{q.name}</h3>
                  <span className="badge tnum">~{q.minutes} min</span>
                </div>
                <p className="muted small">{q.blurb}</p>
                <span className="row xs faint">
                  {q.kind === 'trivia' ? '10 questions per run' : q.kind === 'guess' ? '10 rounds' : q.lengths ? `${q.lengths.quick}, ${q.lengths.standard} or ${q.lengths.deep} questions` : `${q.questions.filter((id) => !q.preset?.[id]).length} questions`}
                  {q.poolLabel ? ` · ${q.poolLabel}` : ''}
                </span>
                {state[q.id] && <span className="quiz-tile__state small">{state[q.id]}</span>}
                <span className="quiz-tile__go">
                  Start <ArrowRight aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <section className="section" style={{ marginTop: 'var(--s-10)' }} aria-labelledby="make-h">
        <div className="section-head">
          <h2 id="make-h">Make your own</h2>
        </div>
        <div className="grid grid-3">
          <Link to="/quiz/build" className="panel quiz-tile">
            <h3>Build your own quiz</h3>
            <p className="muted small">Choose the browsers it picks from and the questions it asks. Save it here or share it with a link.</p>
            <span className="quiz-tile__go">
              Start building <ArrowRight aria-hidden />
            </span>
          </Link>
          {mine.map((q) => (
            <div key={q.id} className="panel quiz-tile">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3>{q.name}</h3>
                <span className="badge tnum">{q.questions.length} questions</span>
              </div>
              <p className="muted small">{describePool(q.pool)}</p>
              <div className="row">
                <Link to={`/quiz/${q.id}`} className="btn btn--sm btn--primary">
                  Start
                </Link>
                <Link to={`/quiz/build?edit=${q.id}`} className="btn btn--sm">
                  Edit
                </Link>
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => duplicate(q)}>
                  Duplicate
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => remove(q)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ runner ------------------------------ */

type Length = 'quick' | 'standard' | 'deep';

function LiveTop({ results, total }: { results: Result[]; total: number }) {
  const top = results.slice(0, 5);
  const conf = confidence(results, total);
  return (
    <div className="livetop">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 className="h-sm" style={{ margin: 0 }}>
          Live top 5
        </h2>
        <span className="xs muted">{results.length} candidates</span>
      </div>
      <div className="livetop__conf" aria-label={`Confidence ${conf}%`}>
        <span style={{ width: `${conf}%` }} />
      </div>
      <p className="xs faint">Confidence {conf}% · grows as answers separate the candidates</p>
      <LayoutGroup>
        <ol className="livetop__list">
          {top.map((r, i) => (
            <motion.li key={r.b.id} layout transition={{ type: 'spring', duration: 0.45, bounce: 0.12 }}>
              <span className="tnum faint">{i + 1}</span>
              <BrowserMark b={r.b} size={24} />
              <span className="truncate">{r.b.name}</span>
              <span className="tnum small">{r.match}%</span>
            </motion.li>
          ))}
        </ol>
      </LayoutGroup>
    </div>
  );
}

/** Question types whose options can be picked with the number keys. */
const KEYED = ['single', 'yesno', 'scenario', 'ui', 'thisorthat'];

function QuestionShell({ q, answer, setAnswer, onNext, onBack, onSkip, onFinish, note, impact, index, total, canBack }: { q: Question; answer: AnswerMap[string] | undefined; setAnswer: (a: AnswerMap[string]) => void; onNext: () => void; onBack: () => void; onSkip: () => void; onFinish?: () => void; note?: string; impact?: Record<string, number>; index: number; total: number; canBack: boolean }) {
  const [why, setWhy] = useState(false);
  const has = answer?.value != null && !(Array.isArray(answer.value) && answer.value.length === 0 && q.type !== 'os');
  const keyed = KEYED.includes(q.type) && !!q.options && q.options.length <= 9;
  // Number keys pick an option, but only while focus is in this question and never in a text field.
  const onKeys = (e: ReactKeyEvent) => {
    if (!keyed || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.target as HTMLElement).closest('input:not([type=radio]):not([type=checkbox]), textarea, select, [contenteditable="true"], [role=combobox]')) return;
    const n = Number(e.key);
    const option = Number.isInteger(n) ? q.options![n - 1] : undefined;
    if (!option) return;
    e.preventDefault();
    setAnswer({ value: option.id, must: answer?.must });
  };
  return (
    <motion.div key={q.id} className="qshell" onKeyDown={onKeys} initial={{ opacity: 0, transform: 'translateX(24px)' }} animate={{ opacity: 1, transform: 'translateX(0px)' }} exit={{ opacity: 0, transform: 'translateX(-24px)', transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
      <div className="qprogress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-label={`Question ${index + 1} of ${total}`}>
        <span style={{ transform: `scaleX(${(index + 1) / total})` }} />
      </div>
      <p className="qmeta">
        <span className="tnum">
          {index + 1} / {total}
        </span>
        <span className="badge">{TYPE_LABEL[q.type] ?? q.type}</span>
      </p>
      <h2 className="qtitle">{q.title}</h2>
      {q.help && <p className="qhelp">{q.help}</p>}
      {note && <p className="qhelp qhelp--note">{note}</p>}
      <div className="qbody">
        <QuestionView q={q} value={answer?.value} impact={impact} onChange={(v) => setAnswer({ value: v, must: answer?.must })} />
      </div>
      {keyed && <p className="qkeys small faint">{q.options!.length === 2 ? 'Press 1 or 2 to choose.' : `Press 1 to ${q.options!.length} to choose.`}</p>}
      <div className="qextras">
        {q.mustable && (
          <label className="switch">
            <input type="checkbox" checked={!!answer?.must} onChange={(e) => setAnswer({ value: answer?.value ?? null, must: e.target.checked })} />
            <Lock aria-hidden style={{ width: 14, height: 14 }} /> Make this a must-have
          </label>
        )}
        {q.why && (
          <button className="btn btn--ghost btn--sm" aria-expanded={why} onClick={() => setWhy(!why)}>
            <HelpCircle aria-hidden /> Why we ask
          </button>
        )}
      </div>
      <Collapse open={why && !!q.why}>
        <p className="callout small" style={{ marginBottom: 0 }}>
          {q.why}
        </p>
      </Collapse>
      <div className="qnav">
        <button className="btn" onClick={onBack} disabled={!canBack}>
          <ArrowLeft aria-hidden /> Back
        </button>
        <button className="btn btn--ghost" onClick={onSkip}>
          I don’t mind
        </button>
        <button className="btn btn--primary" onClick={onNext} disabled={!has}>
          {index + 1 >= total ? 'See my result' : 'Next'} <ArrowRight aria-hidden />
        </button>
      </div>
      {onFinish && (
        <p className="qfinish">
          <button className="btn btn--sm" onClick={onFinish}>
            Show my result
          </button>
          <span className="small muted">The quiz is confident already. More questions would sharpen it.</span>
        </p>
      )}
    </motion.div>
  );
}

function MatchRunner({ def, shared }: { def: QuizDef; shared: SharedResult | null }) {
  const key = `bf-quiz-${def.id}`;
  // A shared link shows someone else's result; it never touches this visitor's own saved progress.
  const saved = shared ? null : readLocal<{ answers: AnswerMap; asked: string[]; done: boolean; length: Length } | null>(key, null);
  const isShared = !!shared;
  const initialAsked = shared ? shared.asked : (saved?.asked ?? []);
  const [length, setLength] = useState<Length | null>(def.lengths ? (shared ? (shared.length ?? 'standard') : (saved?.length ?? null)) : 'standard');
  const [answers, setAnswers] = useState<AnswerMap>(() => (shared ? shared.answers : { ...(saved ? {} : profileAnswers(def)), ...(def.preset ?? {}), ...(saved?.answers ?? {}) }));
  const [asked, setAsked] = useState<string[]>(initialAsked);
  const [pos, setPos] = useState(Math.max(0, (initialAsked.length || 1) - 1));
  const [done, setDone] = useState(shared ? true : (saved?.done ?? false));
  const mobile = useIsMobile();
  const [liveOpen, setLiveOpen] = useState(false);
  const here = useMemo(detect, []);
  const nav = useNavigate();
  const lastQuizTo = def.shareCode ? `/quiz/custom?c=${def.shareCode}` : `/quiz/${def.id}`;

  const limit =def.lengths && length ? def.lengths[length] : def.questions.length;
  const adaptiveDef = useMemo(() => ({ ...def, adaptiveLimit: def.lengths ? limit : undefined }), [def, limit]);

  useEffect(() => {
    if (isShared) return;
    writeLocal(key, { answers, asked, done, length });
    saveProfile(answers);
    // The home page offers to continue the quiz that was left unfinished most recently.
    if (done) {
      if (readLocal<{ to: string } | null>('bf-last-quiz', null)?.to === lastQuizTo) writeLocal('bf-last-quiz', null);
    } else if (asked.length > 0) {
      writeLocal('bf-last-quiz', { to: lastQuizTo, name: def.name, step: asked.length });
    }
  }, [answers, asked, done, length, key, isShared, def.name, lastQuizTo]);

  // Start the devices question on the device being used; the visitor can change it.
  useEffect(() => {
    const qid = asked[pos];
    if (!qid || done || isShared || !here.os || Q[qid]?.type !== 'os') return;
    setAnswers((cur) => (cur[qid] ? cur : { ...cur, [qid]: { value: [here.os] } }));
  }, [asked, pos, done, isShared, here.os]);

  // Ensure the current question exists.
  useEffect(() => {
    if (!length || done) return;
    if (asked.length === 0) {
      const first = nextQuestion(adaptiveDef, [], answers);
      if (first) setAsked([first]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length]);

  const ctx = useMemo(() => buildCtx(def, answers), [def, answers]);
  const results = useMemo(() => evaluate(ctx, def.pool), [ctx, def.pool]);

  // For the question on screen: how many browsers each option would leave, shown only where an option adds a requirement.
  const shownId = asked[pos];
  const impact = useMemo(() => {
    const cur = shownId ? Q[shownId] : null;
    if (!cur?.options || !KEYED.includes(cur.type) || done) return undefined;
    const others = { ...answers };
    delete others[cur.id];
    const base = evaluate(buildCtx(def, others), def.pool).length;
    const out: Record<string, number> = {};
    for (const o of cur.options) {
      const n = evaluate(buildCtx(def, { ...others, [cur.id]: { value: o.id } }), def.pool).length;
      if (n < base) out[o.id] = n;
    }
    return Object.keys(out).length ? out : undefined;
  }, [shownId, answers, def.questions, def.pool, done]);

  const reset = () => {
    // From a shared link, "start over" means taking the quiz for yourself.
    if (isShared) return nav(`/quiz/${def.id}`);
    setAnswers({ ...(def.preset ?? {}) });
    setAsked([]);
    setPos(0);
    setDone(false);
    if (def.lengths) setLength(null);
    else {
      const first = nextQuestion(adaptiveDef, [], { ...(def.preset ?? {}) });
      setAsked(first ? [first] : []);
    }
  };

  const advance = () => {
    const flatAsked = asked.slice(0, pos + 1);
    if (flatAsked.length >= limit) {
      setAsked(flatAsked);
      setDone(true);
      return;
    }
    const nxt = nextQuestion(adaptiveDef, flatAsked, answers);
    if (!nxt) {
      setAsked(flatAsked);
      setDone(true);
      return;
    }
    setAsked([...flatAsked, nxt]);
    setPos(flatAsked.length);
  };

  if (def.lengths && !length) {
    return (
      <div className="qstart panel panel-pad">
        <h2>How deep should we go?</h2>
        <p className="muted">The quiz adapts: it asks whatever best separates your top candidates. Longer means a more confident answer.</p>
        <div className="qcards">
          {(['quick', 'standard', 'deep'] as Length[]).map((l) => (
            <button key={l} className="qcard" onClick={() => setLength(l)}>
              <span className="qcard__label">{l === 'quick' ? 'Quick' : l === 'standard' ? 'Standard' : 'Deep'}</span>
              <span className="qcard__sub">
                {def.lengths![l]} questions · about {Math.ceil(def.lengths![l] / 4)} min
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (done) return <MatchResults def={def} answers={answers} setAnswers={setAnswers} asked={asked} length={length} shared={isShared} here={here} onRetake={reset} onEdit={() => { setDone(false); setPos(0); }} />;

  const qid = asked[pos];
  const q = qid ? Q[qid] : null;
  if (!q) return null;
  const total = Math.min(limit, def.questions.filter((id) => !answers[id]?.preset && (!Q[id]?.when || Q[id].when!(Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.value]))))).length);
  const earlier = def.questions.filter((id) => answers[id]?.earlier);
  const canFinish = !!def.lengths && pos + 1 >= 5 && pos + 1 < limit && confidence(results, pos + 1) >= 85;
  const finish = () => {
    setAsked(asked.slice(0, pos + 1));
    setDone(true);
  };

  return (
    <>
      {def.intro && pos === 0 && (
        <p className="callout small qintro" role="note">
          {def.intro}
        </p>
      )}
      {earlier.length > 0 && (
        <section className="qearlier panel panel-pad" aria-labelledby="qearlier-h">
          <h2 id="qearlier-h" className="h-sm">
            You told us earlier
          </h2>
          <ul className="qearlier__list">
            {earlier.map((id) => (
              <li key={id}>
                <span className="muted">{Q[id].title}</span> <strong>{answerLabel(Q[id], answers[id].value)}</strong>
              </li>
            ))}
          </ul>
          <button className="btn btn--sm" onClick={() => setAnswers((cur) => Object.fromEntries(Object.entries(cur).filter(([, a]) => !a.earlier)))}>
            Ask me again
          </button>
        </section>
      )}
      <div className="qrun">
        <div className="qrun__main">
          <AnimatePresence mode="wait" initial={false}>
            <QuestionShell
              key={q.id}
              q={q}
              answer={answers[q.id]}
              setAnswer={(a) => setAnswers((cur) => ({ ...cur, [q.id]: a }))}
              onNext={advance}
              onSkip={() => {
                setAnswers((cur) => ({ ...cur, [q.id]: { value: 'skip' } }));
                setTimeout(advance, 0);
              }}
              onBack={() => setPos((p) => Math.max(0, p - 1))}
              onFinish={canFinish ? finish : undefined}
              impact={impact}
              note={q.type === 'os' && here.os ? `We picked ${here.osName} because that’s what you’re using now. Change it if you like.` : undefined}
              canBack={pos > 0}
              index={pos}
              total={total}
            />
          </AnimatePresence>
          {results.length === 0 && (
            <div className="callout callout--warning" role="status" style={{ marginTop: 'var(--s-4)' }}>
              No browser fits every must-have so far. {(() => { const c = findConflict(ctx, def.pool); return c ? `Relaxing “${c.label}” would leave ${c.n}.` : ''; })()}
            </div>
          )}
        </div>
        {!mobile ? (
          <aside className="qrun__side panel panel-pad" aria-label="Live results">
            <LiveTop results={results} total={pos + 1} />
          </aside>
        ) : (
          <div className="qrun__mobilelive">
            <button className="btn btn--sm" aria-expanded={liveOpen} onClick={() => setLiveOpen(!liveOpen)}>
              <Trophy aria-hidden /> Leading: {results[0]?.b.name ?? '—'} <ChevronDown aria-hidden />
            </button>
            <Collapse open={liveOpen}>
              <div className="panel panel-pad" style={{ marginTop: 8 }}>
                <LiveTop results={results} total={pos + 1} />
              </div>
            </Collapse>
          </div>
        )}
      </div>
    </>
  );
}

function MatchResults({ def, answers, setAnswers, asked, length, shared, here, onRetake, onEdit }: { def: QuizDef; answers: AnswerMap; setAnswers: Dispatch<SetStateAction<AnswerMap>>; asked: string[]; length: Length | null; shared: boolean; here: ReturnType<typeof detect>; onRetake: () => void; onEdit: () => void }) {
  const { setCompare, toggleShortlist, shortlist, toast } = useApp();
  const nav = useNavigate();
  const [tweaks, setTweaks] = useState<Tweaks>(NO_TWEAKS);
  const heading = useRef<HTMLHeadingElement>(null);
  const ctx = useMemo(() => applyTweaks(buildCtx(def, answers), tweaks, here.os), [def, answers, tweaks, here.os]);
  const results = useMemo(() => evaluate(ctx, def.pool), [ctx, def.pool]);
  // Opening a shared link lands on the result, so move focus there.
  useEffect(() => {
    if (shared) heading.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const winner = results[0];
  const trace = useMemo(() => (winner ? traceAnswers(def, asked, answers, winner.b) : []), [def, asked, answers, winner]);
  const perOs = useMemo(() => perOsPicks(ctx, def.pool), [ctx, def.pool]);
  const everywhere = useMemo(() => everywherePick(ctx, def.pool), [ctx, def.pool]);
  const tieCount = winner ? results.filter((r) => r.match === winner.match).length : 0;
  useDocTitle(winner ? (tieCount > 1 ? 'Your result: a tie' : `Your match: ${winner.b.name}`) : 'Quiz result');

  if (!winner) {
    const c = findConflict(ctx, def.pool);
    return (
      <div className="panel empty">
        <h2>No browser fits every must-have</h2>
        <p>{c ? `Your requirement “${c.label}” rules out the rest. Relaxing it leaves ${c.n} browsers.` : 'Try relaxing a requirement.'}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn--primary" onClick={onEdit}>
            Edit my answers
          </button>
          <button className="btn" onClick={onRetake}>
            Start over
          </button>
        </div>
      </div>
    );
  }

  // Browsers showing the same match percentage as the first are a tie: the answers can't separate them, so none is crowned.
  const tied = results.filter((r) => r.match === winner.match);
  const isTie = tied.length > 1;
  const tiedShown = tied.slice(0, COMPARE_MAX);
  const tiedIds = tiedShown.map((r) => r.b.id);
  // Runners-up come from different engines when the fit is close, so the list is a spread and not three near-copies of the winner.
  const runners = diversePicks(results, 3, (r) => r.b, (r) => r.score, isTie ? tied.map((r) => r.b) : [winner.b]);
  const close = !isTie && results[1] && winner.score - results[1].score < 0.12;
  const toTune = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('tune-h')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };
  const flips = trace.filter((t) => t.flips).slice(0, 2);
  const weights: Weights = Object.fromEntries(CATEGORIES.map((c) => [c.id, Math.min(4.5, 0.3 * c.weight + (ctx.w[c.id] ?? 0) * 0.6)]));
  const copyLink = () =>
    navigator.clipboard?.writeText(resultLink(def, encodeResult(answers, asked, length))).then(
      () => toast('Link copied. It opens your result.'),
      () => toast('Couldn’t copy. Copy the address bar instead.'),
    ) ?? toast('Couldn’t copy. Copy the address bar instead.');
  const tuneIds = [...def.questions.filter((id) => answers[id]?.earlier), ...asked].filter((id, i, all) => all.indexOf(id) === i);

  return (
    <div className="qres">
      {shared && (
        <div className="callout qres__shared" role="note">
          <span>You’re viewing a shared result. Changes you make here aren’t saved.</span>
          <Link to={`/quiz/${def.id}`} className="btn btn--sm">
            Take the quiz yourself
          </Link>
        </div>
      )}
      <motion.div className="qres__hero panel" initial={{ opacity: 0, transform: 'scale(0.96) translateY(12px)' }} animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}>
        {isTie ? (
          <>
            <div className="qres__kicker">
              <Scale aria-hidden /> A tie{def.poolLabel ? ` among ${def.poolLabel}` : ''}
            </div>
            <h2 className="qres__name" ref={heading} tabIndex={-1}>
              Too close to call
            </h2>
            <p className="muted">
              Your answers can’t separate {tied.length === 2 ? 'these two browsers' : `these ${tied.length} browsers`}. Each is a {winner.match}% match, so there’s no single winner.
            </p>
            <ul className="qres__tiegrid">
              {tiedShown.map((r) => (
                <li key={r.b.id} className="qres__tiecard">
                  <BrowserMark b={r.b} size={48} />
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/browser/${r.b.id}`} className="qres__tiename">
                      {r.b.name}
                    </Link>
                    <p className="small muted">{r.b.pitch}</p>
                    {(r.reasons.length > 0 || r.drawback) && (
                      <p className="xs faint">
                        {r.reasons[0] ?? ''}
                        {r.reasons[0] && r.drawback ? ' · ' : ''}
                        {r.drawback ? `Drawback: ${r.drawback}` : ''}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {tied.length > tiedShown.length && <p className="small muted">and {tied.length - tiedShown.length} more at {winner.match}%.</p>}
            <h3 className="h-sm" style={{ marginTop: 'var(--s-5)' }}>
              Break the tie
            </h3>
            <div className="row" style={{ marginTop: 'var(--s-2)' }}>
              {tied.length === 2 ? (
                <Link to={`/vs?a=${tied[0].b.id}&b=${tied[1].b.id}`} className="btn btn--primary">
                  <Swords aria-hidden /> Head to head
                </Link>
              ) : (
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    setCompare(tiedIds);
                    nav(`/compare?b=${tiedIds.join(',')}`);
                  }}
                >
                  <GitCompare aria-hidden /> Compare the tied browsers
                </button>
              )}
              <button className="btn" onClick={toTune}>
                <SlidersHorizontal aria-hidden /> Tune your answers
              </button>
              <Link to="/finder" className="btn">
                <Search aria-hidden /> Feature finder
              </Link>
              <Link to="/quiz" className="btn">
                <Brain aria-hidden /> Try another quiz
              </Link>
              <button className="btn btn--ghost" onClick={copyLink}>
                <Link2 aria-hidden /> Copy link to my result
              </button>
            </div>
          </>
        ) : (
        <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }} className="qres__kicker">
          <Sparkles aria-hidden /> Your best match{def.poolLabel ? ` among ${def.poolLabel}` : ''}
        </motion.div>
        <div className="qres__id">
          <motion.div initial={{ transform: 'scale(0.8)', opacity: 0 }} animate={{ transform: 'scale(1)', opacity: 1 }} transition={{ delay: 0.25, type: 'spring', duration: 0.6, bounce: 0.25 }}>
            <BrowserMark b={winner.b} size={88} />
          </motion.div>
          <div style={{ minWidth: 0 }}>
            <h2 className="qres__name" ref={heading} tabIndex={-1}>
              {winner.b.name}
            </h2>
            <p className="muted">{winner.b.pitch}</p>
            <FactsStrip b={winner.b} />
          </div>
          <div className="qres__match">
            <ScoreRing value={winner.match / 10} size={96} stroke={8} label="Match" />
            <span className="small muted">{winner.match}% match</span>
          </div>
        </div>
        <motion.div className="qres__why" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } } }}>
          {winner.reasons.map((r) => (
            <motion.span key={r} className="chip is-on" variants={{ h: { opacity: 0, transform: 'translateY(6px)' }, s: { opacity: 1, transform: 'translateY(0px)' } }}>
              {r}
            </motion.span>
          ))}
          {winner.drawback && (
            <motion.span className="chip" variants={{ h: { opacity: 0 }, s: { opacity: 1 } }}>
              Honest drawback: {winner.drawback}
            </motion.span>
          )}
        </motion.div>
        {close && (
          <p className="callout small" style={{ marginTop: 'var(--s-4)' }}>
            Close call: {results[1].b.name} is almost as good a fit ({results[1].match}%). Compare them before you decide.
          </p>
        )}
        <div className="row" style={{ marginTop: 'var(--s-5)' }}>
          <Link to={`/browser/${winner.b.id}`} className="btn btn--primary">
            Open {winner.b.name}’s profile
          </Link>
          <button
            className="btn"
            onClick={() => {
              const ids = [winner, ...runners.slice(0, 2)].map((r) => r.b.id);
              setCompare(ids);
              nav(`/compare?b=${ids.join(',')}`);
            }}
          >
            <GitCompare aria-hidden /> Compare top 3
          </button>
          <button className="btn" onClick={() => toggleShortlist(winner.b.id)} aria-pressed={winner.b.id in shortlist}>
            <Bookmark aria-hidden /> {winner.b.id in shortlist ? 'Saved' : 'Save'}
          </button>
          <button className="btn btn--ghost" onClick={copyLink}>
            <Link2 aria-hidden /> Copy link to my result
          </button>
        </div>
        </>
        )}
      </motion.div>

      {(perOs.length > 1 || everywhere) && (
        <section className="section" style={{ marginTop: 'var(--s-10)' }}>
          <div className="section-head">
            <h2>A pick for each of your devices</h2>
          </div>
          <div className="grid grid-3">
            {perOs.map(({ os, top }) => (
              <div key={os} className="panel panel-pad">
                <p className="small muted">{OS_BY_ID[os].name}</p>
                {top ? (
                  <Link to={`/browser/${top.b.id}`} className="row" style={{ flexWrap: 'nowrap', marginTop: 6 }}>
                    <BrowserMark b={top.b} size={32} />
                    <strong className="truncate" style={{ flex: 1 }}>
                      {top.b.name}
                    </strong>
                    <span className="tnum small">{top.match}%</span>
                  </Link>
                ) : (
                  <p className="small">No match on this platform with your must-haves.</p>
                )}
              </div>
            ))}
            {everywhere && (
              <div className="panel panel-pad" style={{ borderColor: 'color-mix(in oklab, var(--accent) 45%, var(--border))' }}>
                <p className="small muted">One browser on all your devices</p>
                <Link to={`/browser/${everywhere.b.id}`} className="row" style={{ flexWrap: 'nowrap', marginTop: 6 }}>
                  <BrowserMark b={everywhere.b} size={32} />
                  <strong className="truncate" style={{ flex: 1 }}>
                    {everywhere.b.name}
                  </strong>
                  <span className="tnum small">{everywhere.match}%</span>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <div className="qres__grid">
        <section className="section" style={{ marginTop: 'var(--s-10)' }}>
          <div className="section-head">
            <h2>Runners-up</h2>
          </div>
          <ol className="panel runners">
            {[...runners].sort((a, z) => results.indexOf(a) - results.indexOf(z)).map((r) => (
              <li key={r.b.id}>
                <span className="tnum faint">{results.indexOf(r) + 1}</span>
                <BrowserMark b={r.b} size={32} />
                <span className="brow__id">
                  <Link to={`/browser/${r.b.id}`} className="brow__name">
                    {r.b.name}
                  </Link>
                  <span className="brow__sub">
                    {r.b.engine === 'multi' ? '' : `${ENGINE_BY_ID[r.b.engine]?.name ?? r.b.engine} engine · `}{isTie ? 'Why not tied for first' : 'Why not #1'}: {r.drawback ?? `${(winner.score - r.score).toFixed(2)} points behind overall`}
                  </span>
                </span>
                <span className="tnum small">{r.match}%</span>
              </li>
            ))}
          </ol>
        </section>
        {!isTie && (
        <section className="section" style={{ marginTop: 'var(--s-10)' }}>
          <div className="section-head">
            <h2>What moved your result</h2>
          </div>
          <ul className="panel trace">
            {trace.slice(0, 6).map((t) => {
              const max = Math.max(0.01, ...trace.map((x) => Math.abs(x.delta)));
              return (
                <li key={t.qid}>
                  <span className="trace__q">{t.title}</span>
                  <span className="trace__bar" aria-hidden>
                    <span className={t.delta >= 0 ? 'is-pos' : 'is-neg'} style={{ width: `${(Math.abs(t.delta) / max) * 100}%` }} />
                  </span>
                  <span className="tnum xs">
                    {t.delta >= 0 ? '+' : '−'}
                    {Math.abs(t.delta).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
          {flips.length > 0 && (
            <p className="small muted" style={{ marginTop: 'var(--s-3)' }}>
              {flips.map((f) => `Without your answer to “${f.title}”, ${f.flips} would win.`).join(' ')}
            </p>
          )}
        </section>
        )}
      </div>

      <Insights ctx={ctx} results={results} winner={winner.b} currentId={here.browserId} os={null} />
      <TunePanel ids={tuneIds} answers={answers} setAnswers={setAnswers} tweaks={tweaks} setTweaks={setTweaks} hereOs={here.os} hereName={here.osName} rankingHref={`/rankings/custom?w=${encodeWeights(weights)}`} />
      <WhyNot def={def} ctx={ctx} winner={winner.b} os={null} />

      <div className="row" style={{ marginTop: 'var(--s-8)' }}>
        <button className="btn" onClick={onEdit}>
          <ArrowLeft aria-hidden /> Change my answers
        </button>
        <button className="btn btn--ghost" onClick={onRetake}>
          <RotateCcw aria-hidden /> Start over
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ privacy profile ------------------------------ */

const LEVELS = [
  { n: 1, name: 'Everyday privacy', blurb: 'Stop ads and trackers following you around without changing how you browse.', steps: ['Use a browser that blocks trackers by default', 'Turn on HTTPS-only mode', 'Switch your search engine to a private one', 'Review which sites can use your location and camera'] },
  { n: 2, name: 'Careful', blurb: 'Limit data collection by companies and your network.', steps: ['Everything in level 1', 'Turn on encrypted DNS (DNS over HTTPS)', 'Use separate profiles or containers for work and personal accounts', 'Turn off telemetry and AI features you don’t use', 'Install a full content blocker (uBlock Origin where supported)'] },
  { n: 3, name: 'Hardened', blurb: 'Resist fingerprinting and keep your browsing hard to link together.', steps: ['Everything in level 2', 'Use a browser with strong fingerprint protection (uniform or randomised)', 'Clear cookies and site data when you close the browser', 'Use a trustworthy VPN to hide your IP from sites', 'Avoid logging in to big-tech accounts in the same browser'] },
  { n: 4, name: 'High risk', blurb: 'Hide who and where you are from powerful adversaries.', steps: ['Use Tor Browser for sensitive browsing', 'Keep the security level at Safer or Safest', 'Never log in to personal accounts in Tor', 'Keep your OS and browser updated immediately', 'Consider Tails or a separate device for sensitive work'] },
];

function PrivacyRunner() {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(false);
  if (done) {
    const { level, needsSync } = privacyLevel(answers);
    const L = LEVELS[level - 1];
    const recs = BROWSERS.filter((b) => b.status !== 'discontinued' && (!needsSync || !['none', 'local-only'].includes(b.keyFacts.sync.type)))
      .map((b) => {
        const s = (id: string) => b.scores[CATEGORIES.findIndex((c) => c.id === id)];
        const v = level >= 4 ? s('fingerprinting') * 2 + s('privacyDefaults') + s('securityHardening') : level === 3 ? s('fingerprinting') * 1.5 + s('privacyDefaults') + s('blocking') + s('telemetry') : s('privacyDefaults') + s('blocking') + s('webCompat') + s('telemetry') * 0.5;
        return { b, v };
      })
      .sort((a, z) => z.v - a.v);
    const picks = diversePicks(recs, 4, (r) => r.b, (r) => r.v);
    return (
      <div className="qres">
        <motion.div className="qres__hero panel" initial={{ opacity: 0, transform: 'translateY(12px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}>
          <p className="qres__kicker">Your privacy profile</p>
          <div className="pv-level">
            {LEVELS.map((x) => (
              <span key={x.n} className={x.n <= level ? 'is-on' : ''} aria-hidden />
            ))}
          </div>
          <h2 className="qres__name">
            Level {level}: {L.name}
          </h2>
          <p className="muted">{L.blurb}</p>
        </motion.div>
        <div className="qres__grid">
          <section className="section" style={{ marginTop: 'var(--s-8)' }}>
            <h2 className="h-sm">Your checklist</h2>
            <ul className="panel panel-pad checklist">
              {L.steps.map((s) => (
                <li key={s}>
                  <label className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <input type="checkbox" />
                    <span>{s}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
          <section className="section" style={{ marginTop: 'var(--s-8)' }}>
            <h2 className="h-sm">Browsers that fit this level</h2>
            <div className="panel">
              {picks.map(({ b }) => (
                <Link key={b.id} to={`/browser/${b.id}`} className="brow" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                  <BrowserMark b={b} size={32} />
                  <span className="brow__id">
                    <span className="brow__name">{b.name}</span>
                    <span className="brow__sub">{b.keyFacts.privacy.defaults || b.pitch}</span>
                  </span>
                  <span className="fact">Privacy {b.keyFacts.privacyGrade}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <button className="btn" style={{ marginTop: 'var(--s-6)' }} onClick={() => { setAnswers({}); setPos(0); setDone(false); }}>
          <RotateCcw aria-hidden /> Retake
        </button>
      </div>
    );
  }
  const q = PRIVACY_Q[pos];
  return (
    <div className="qrun qrun--solo">
      <AnimatePresence mode="wait" initial={false}>
        <QuestionShell
          key={q.id}
          q={q}
          answer={answers[q.id]}
          setAnswer={(a) => setAnswers((cur) => ({ ...cur, [q.id]: a }))}
          onNext={() => (pos + 1 >= PRIVACY_Q.length ? setDone(true) : setPos(pos + 1))}
          onSkip={() => (pos + 1 >= PRIVACY_Q.length ? setDone(true) : setPos(pos + 1))}
          onBack={() => setPos(Math.max(0, pos - 1))}
          canBack={pos > 0}
          index={pos}
          total={PRIVACY_Q.length}
        />
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ security check-up ------------------------------ */

const SEC_LEVELS = [
  { n: 1, name: 'Baseline', blurb: 'Your habits carry little extra risk. Keep the basics in place.', steps: ['Turn on automatic browser updates', 'Restart the browser when it asks, so fixes install', 'Install extensions only from the browser’s own reviewed store', 'Use passkeys or a password manager instead of reusing passwords'] },
  { n: 2, name: 'Careful', blurb: 'A few habits or accounts raise your risk. Close the common gaps.', steps: ['Turn on HTTPS-only mode', 'Remove extensions you no longer use', 'Turn on the browser’s bad-site warnings', 'Use passkeys for your email and banking'] },
  { n: 3, name: 'Hardened', blurb: 'You have high-value accounts or risky habits. Add a second line of defence.', steps: ['Use a separate browser profile for banking and work', 'Turn on your browser’s strongest protection mode if it has one', 'Check each extension’s permissions and drop broad ones', 'Switch off AI agents on sites where you sign in'] },
  { n: 4, name: 'High stakes', blurb: 'A compromise would be costly. Treat the browser as part of your security setup.', steps: ['Use a hardware security key for your main accounts', 'Install browser and system updates the day they ship', 'Avoid sensitive sign-ins on public Wi-Fi or shared computers', 'Open unfamiliar links in a disposable profile or a second browser'] },
];

function SecurityRunner() {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>(() => readLocal('bf-sec-check', {}));
  const toggleCheck = (k: string) =>
    setChecks((c) => {
      const n = { ...c, [k]: !c[k] };
      writeLocal('bf-sec-check', n);
      return n;
    });
  if (done) {
    const { level, biggest, oses } = securityLevel(answers);
    const L = SEC_LEVELS[level - 1];
    const steps = SEC_LEVELS.slice(0, level).flatMap((x) => x.steps);
    const fits = (b: (typeof BROWSERS)[number]) => b.status !== 'discontinued' && (!oses.length || oses.some((o) => b.platforms[o] && b.platforms[o]!.status !== 'discontinued'));
    let recs = BROWSERS.filter((b) => fits(b) && (level < 3 || b.security.siteIsolation === 'full'));
    if (!recs.length) recs = BROWSERS.filter(fits);
    const secScore = new Map(recs.map((b) => [b.id, securityFor(b, oses[0] ?? null).score]));
    recs = diversePicks([...recs].sort((a, z) => secScore.get(z.id)! - secScore.get(a.id)!), 4, (b) => b, (b) => secScore.get(b.id)!);
    return (
      <div className="qres">
        <motion.div className="qres__hero panel" initial={{ opacity: 0, transform: 'translateY(12px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}>
          <p className="qres__kicker">Your security profile</p>
          <div className="pv-level">
            {SEC_LEVELS.map((x) => (
              <span key={x.n} className={x.n <= level ? 'is-on' : ''} aria-hidden />
            ))}
          </div>
          <h2 className="qres__name">
            Level {level}: {L.name}
          </h2>
          <p className="muted">{L.blurb}</p>
          {biggest && (
            <p className="small">
              <strong>Biggest gap:</strong> {biggest}
            </p>
          )}
        </motion.div>
        <div className="qres__grid">
          <section className="section" style={{ marginTop: 'var(--s-8)' }}>
            <h2 className="h-sm">Your checklist</h2>
            <ul className="panel panel-pad checklist">
              {steps.map((s) => (
                <li key={s}>
                  <label className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={!!checks[s]} onChange={() => toggleCheck(s)} />
                    <span>{s}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
          <section className="section" style={{ marginTop: 'var(--s-8)' }}>
            <h2 className="h-sm">Browsers that fit this level</h2>
            <div className="panel">
              {recs.map((b) => {
                const r = securityFor(b, oses[0] ?? null);
                return (
                  <Link key={b.id} to={`/browser/${b.id}#security`} className="brow" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                    <BrowserMark b={b} size={32} />
                    <span className="brow__id">
                      <span className="brow__name">{b.name}</span>
                      <span className="brow__sub">{r.weak[0]?.text ?? r.strong[0]?.text ?? b.pitch}</span>
                    </span>
                    <GradeChip grade={r.grade} />
                  </Link>
                );
              })}
            </div>
            <p className="xs faint" style={{ marginTop: 'var(--s-3)' }}>
              Ranked by Security score{level >= 3 ? ', and only browsers with full site isolation' : ''}. <Link to="/security" className="link">See every browser</Link>.
            </p>
          </section>
        </div>
        <div className="row" style={{ marginTop: 'var(--s-6)' }}>
          <button className="btn" onClick={() => { setAnswers({}); setPos(0); setDone(false); }}>
            <RotateCcw aria-hidden /> Retake
          </button>
          <span className="xs faint">Ticks are saved on this device only.</span>
        </div>
      </div>
    );
  }
  const q = SECURITY_Q[pos];
  const last = pos + 1 >= SECURITY_Q.length;
  return (
    <div className="qrun qrun--solo">
      <AnimatePresence mode="wait" initial={false}>
        <QuestionShell
          key={q.id}
          q={q}
          answer={answers[q.id]}
          setAnswer={(a) => setAnswers((cur) => ({ ...cur, [q.id]: a }))}
          onNext={() => (last ? setDone(true) : setPos(pos + 1))}
          onSkip={() => (last ? setDone(true) : setPos(pos + 1))}
          onBack={() => setPos(Math.max(0, pos - 1))}
          canBack={pos > 0}
          index={pos}
          total={SECURITY_Q.length}
        />
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ route ------------------------------ */

export default function QuizRun() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const [savedQuizzes] = useCustomQuizzes();
  const quizCode = sp.get('c');
  const custom = useMemo(() => resolveCustom(id, quizCode, savedQuizzes), [id, quizCode, savedQuizzes]);
  const customDef = useMemo(() => (custom ? customToDef(custom) : undefined), [custom]);
  const def = QUIZZES.find((q) => q.id === id) ?? customDef;
  useDocTitle(def?.name ?? 'Quiz');
  const code = sp.get('r');
  const shared = useMemo(() => (def && (def.kind === 'match' || def.kind === 'devices') ? decodeResult(code, def) : null), [def, code]);
  if (!def) return <NotFound />;
  return (
    <div className="container page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/quiz">Quizzes</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{def.name}</span>
      </nav>
      <div className="page-head">
        <div>
          <h1>{def.name}</h1>
          <p className="lede">{def.blurb}</p>
        </div>
      </div>
      {def.kind === 'privacy' ? <PrivacyRunner /> : def.kind === 'security' ? <SecurityRunner /> : def.kind === 'trivia' ? <TriviaRunner key={def.id} mode={def.id === 'myths' ? 'myths' : 'iq'} /> : def.kind === 'guess' ? <GuessRunner /> : <MatchRunner key={`${def.id}-${shared ? code : ''}`} def={def} shared={shared} />}
    </div>
  );
}
