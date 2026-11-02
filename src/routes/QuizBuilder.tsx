import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Link2, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TYPE_LABEL } from '../components/quiz/QuestionView';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ENGINES, FEATURES, FEATURE_BY_ID, FEATURE_FAMILIES, GROUP_LABEL, OSES } from '../data/taxonomy';
import { Q } from '../data/quizzes';
import { BROWSERS } from '../lib/data';
import { useDocTitle } from '../lib/hooks';
import { customLink, describePool, poolMembers, QUESTION_CHOICES, useCustomQuizzes, type CustomQuiz, type PoolSpec } from '../lib/customQuiz';
import { useApp } from '../lib/store';

const STEPS = ['Choose browsers', 'Choose questions', 'Name and save'];

const TOPICS: { label: string; ids: string[] }[] = [
  { label: 'Your setup', ids: ['devices', 'hardware', 'ram', 'tabsScenario', 'current'] },
  { label: 'What matters', ids: ['priorities', 'budget', 'tradeoff', 'blockVsCompat', 'powerVsSimple', 'comfort'] },
  { label: 'Privacy and trust', ids: ['aiTolerance', 'telemetryQ', 'maker', 'openSource', 'stability'] },
  { label: 'Features', ids: ['tabStyle', 'extensions', 'productivity', 'passwordQ', 'syncPhone', 'streaming', 'gaming', 'developer', 'engine', 'price'] },
  { label: 'Android', ids: ['androidExt', 'googlePlay'] },
  { label: 'Feature checklists', ids: ['helpers', 'managed', 'iosNeeds', 'aiFeatures'] },
];

const plural = new Intl.PluralRules('en');
const matchWords = (n: number) => (plural.select(n) === 'one' ? 'browser matches' : 'browsers match');

type ArrayKey = 'os' | 'engines' | 'groups' | 'features';
type FlagKey = 'free' | 'openSource' | 'stable';

/** The single requirement whose removal would leave the most browsers, for the "nothing matches" message. */
function biggestBlocker(pool: PoolSpec) {
  const fields: [string, keyof PoolSpec][] = [
    ['systems', 'os'],
    ['engines', 'engines'],
    ['groups', 'groups'],
    ['Free only', 'free'],
    ['Open source only', 'openSource'],
    ['Hide beta and early access', 'stable'],
    ['must-have features', 'features'],
  ];
  let best: { label: string; n: number } | null = null;
  for (const [label, key] of fields) {
    if (!pool[key]) continue;
    const rest = { ...pool };
    delete rest[key];
    const n = poolMembers(rest).length;
    if (!best || n > best.n) best = { label, n };
  }
  return best;
}

export default function QuizBuilder() {
  useDocTitle('Build your own quiz');
  const [sp] = useSearchParams();
  const { toast } = useApp();
  const [mine, setMine] = useCustomQuizzes();
  const editing = mine.find((q) => q.id === sp.get('edit'));

  const [step, setStep] = useState(0);
  const [pool, setPool] = useState<PoolSpec>(editing?.pool ?? {});
  const [qs, setQs] = useState<string[]>(editing?.questions ?? ['devices', 'blockVsCompat', 'aiTolerance', 'syncPhone']);
  const [adaptive, setAdaptive] = useState(editing?.adaptive ?? true);
  const [name, setName] = useState(editing?.name ?? '');
  const [errors, setErrors] = useState<{ pool?: string; questions?: string; name?: string }>({});
  const [saved, setSaved] = useState<CustomQuiz | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const qErrRef = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const members = useMemo(() => poolMembers(pool), [pool]);
  const blocker = useMemo(() => (members.length ? null : biggestBlocker(pool)), [members.length, pool]);
  const engines = useMemo(() => ENGINES.filter((e) => BROWSERS.some((b) => b.engine === e.id)), []);

  const toggle = (key: ArrayKey, value: string) =>
    setPool((p) => {
      const cur = (p[key] ?? []) as string[];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      const out: Record<string, unknown> = { ...p };
      if (next.length) out[key] = next;
      else delete out[key];
      return out as PoolSpec;
    });
  const flag = (key: FlagKey) =>
    setPool((p) => {
      const out = { ...p };
      if (out[key]) delete out[key];
      else out[key] = true;
      return out;
    });
  const move = (i: number, d: number) =>
    setQs((cur) => {
      const n = [...cur];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x);
      return n;
    });
  const toggleQ = (id: string) => setQs((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const goto = (n: number) => {
    setStep(n);
    window.setTimeout(() => heading.current?.focus(), 0);
  };
  const next = () => {
    if (step === 0) {
      if (!members.length) return setErrors({ pool: 'Choose at least one browser first.' });
      setErrors({});
      return goto(1);
    }
    if (step === 1) {
      if (qs.length < 3) {
        setErrors({ questions: 'Pick at least 3 questions.' });
        window.setTimeout(() => qErrRef.current?.focus(), 0);
        return;
      }
      setErrors({});
      return goto(2);
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: 'Name your quiz to save it.' });
      window.setTimeout(() => nameRef.current?.focus(), 0);
      return;
    }
    const quiz: CustomQuiz = { id: editing?.id ?? `c-${Date.now().toString(36)}`, name: trimmed.slice(0, 60), pool, questions: qs, adaptive, made: editing?.made ?? Date.now() };
    setMine((cur) => (editing ? cur.map((x) => (x.id === quiz.id ? quiz : x)) : [quiz, ...cur]));
    setErrors({});
    setSaved(quiz);
    toast('Quiz saved. Find it under Your quizzes.');
  };

  const copyLink = (quiz: CustomQuiz) => {
    const link = `${location.origin}${location.pathname}#${customLink(quiz)}`;
    navigator.clipboard?.writeText(link).then(
      () => toast('Link copied. It opens your quiz.'),
      () => toast('Couldn’t copy. Copy the address bar instead.'),
    ) ?? toast('Couldn’t copy. Copy the address bar instead.');
  };

  const known = new Set(TOPICS.flatMap((t) => t.ids));
  const topics = [...TOPICS, { label: 'More questions', ids: QUESTION_CHOICES.filter((id) => !known.has(id)) }]
    .map((t) => ({ ...t, ids: t.ids.filter((id) => QUESTION_CHOICES.includes(id)) }))
    .filter((t) => t.ids.length);

  if (saved) {
    return (
      <div className="container page">
        <div className="page-head">
          <div>
            <h1 ref={heading} tabIndex={-1}>
              “{saved.name}” is saved
            </h1>
            <p className="lede">It’s under Your quizzes on this device. Copy the link to let anyone else take it.</p>
          </div>
        </div>
        <div className="panel panel-pad builder__done">
          <p className="muted">
            {saved.questions.length} questions, choosing from {describePool(saved.pool)}.
          </p>
          <div className="row">
            <Link to={`/quiz/${saved.id}`} className="btn btn--primary">
              Start the quiz <ArrowRight aria-hidden />
            </Link>
            <button type="button" className="btn" onClick={() => copyLink(saved)}>
              <Link2 aria-hidden /> Copy link to this quiz
            </button>
            <Link to="/quiz" className="btn btn--ghost">
              Back to quizzes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/quiz">Quizzes</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{editing ? 'Edit quiz' : 'Build your own quiz'}</span>
      </nav>
      <div className="page-head">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {editing ? `Edit “${editing.name}”` : 'Build your own quiz'}
          </h1>
          <p className="lede">Choose which browsers it picks from and which questions it asks. Save it here, or share it with a link.</p>
        </div>
      </div>

      <ol className="bsteps" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className={i < step ? 'is-done' : ''}>
            <button type="button" disabled={i > step} onClick={() => goto(i)}>
              <span className="bsteps__n tnum" aria-hidden>
                {i < step ? <Check /> : i + 1}
              </span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="builder">
        <div className="builder__main">
          {step === 0 && (
            <div className="panel panel-pad builder__form">
              <fieldset>
                <legend>Systems</legend>
                <p className="small muted">Keep browsers that run on at least one of these. Leave all off to include every system.</p>
                <div className="row">
                  {OSES.map((o) => (
                    <button key={o.id} type="button" className="chip" aria-pressed={!!pool.os?.includes(o.id)} onClick={() => toggle('os', o.id)}>
                      {pool.os?.includes(o.id) && <Check aria-hidden />}
                      {o.name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Engine</legend>
                <div className="row">
                  {engines.map((e) => (
                    <button key={e.id} type="button" className="chip" aria-pressed={!!pool.engines?.includes(e.id)} onClick={() => toggle('engines', e.id)}>
                      {pool.engines?.includes(e.id) && <Check aria-hidden />}
                      {e.name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Kind of browser</legend>
                <div className="row">
                  {Object.entries(GROUP_LABEL).map(([id, label]) => (
                    <button key={id} type="button" className="chip" aria-pressed={!!pool.groups?.includes(id as never)} onClick={() => toggle('groups', id)}>
                      {pool.groups?.includes(id as never) && <Check aria-hidden />}
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Only include</legend>
                <div className="row">
                  <button type="button" className="chip" aria-pressed={!!pool.free} onClick={() => flag('free')}>
                    {pool.free && <Check aria-hidden />}Free browsers
                  </button>
                  <button type="button" className="chip" aria-pressed={!!pool.openSource} onClick={() => flag('openSource')}>
                    {pool.openSource && <Check aria-hidden />}Open source
                  </button>
                  <button type="button" className="chip" aria-pressed={!!pool.stable} onClick={() => flag('stable')}>
                    {pool.stable && <Check aria-hidden />}No beta or early access
                  </button>
                </div>
              </fieldset>
              <fieldset>
                <legend>Must-have features</legend>
                {pool.features && (
                  <ul className="row builder__feats">
                    {pool.features.map((f) => (
                      <li key={f}>
                        <button type="button" className="chip is-on" onClick={() => toggle('features', f)} aria-label={`Remove ${FEATURE_BY_ID[f]?.name ?? f}`}>
                          {FEATURE_BY_ID[f]?.name ?? f} <X aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="builder__select">
                  <span className="small muted">Add a must-have feature</span>
                  <select
                    className="select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) toggle('features', e.target.value);
                    }}
                  >
                    <option value="">Choose a feature…</option>
                    {FEATURE_FAMILIES.map((fam) => (
                      <optgroup key={fam.id} label={fam.name}>
                        {FEATURES.filter((f) => f.family === fam.id && !pool.features?.includes(f.id)).map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </fieldset>
              {blocker && (
                <p className="callout callout--warning" role="note">
                  No browsers match. Remove “{blocker.label}” to see {blocker.n}.
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="builder__q">
              <div className="panel panel-pad builder__form">
                <h2 className="h-sm">Pick the questions</h2>
                {topics.map((t) => (
                  <fieldset key={t.label}>
                    <legend>{t.label}</legend>
                    <ul className="bq">
                      {t.ids.map((id) => (
                        <li key={id}>
                          <label className="bq__row">
                            <input type="checkbox" checked={qs.includes(id)} onChange={() => toggleQ(id)} />
                            <span className="bq__title">{Q[id].title}</span>
                            <span className="badge">{TYPE_LABEL[Q[id].type] ?? Q[id].type}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                ))}
              </div>
              <div className="panel panel-pad builder__form">
                <h2 className="h-sm">Your questions ({qs.length})</h2>
                {errors.questions && (
                  <p ref={qErrRef} tabIndex={-1} className="callout callout--warning" role="alert">
                    {errors.questions}
                  </p>
                )}
                {qs.length === 0 ? (
                  <p className="muted small">Nothing picked yet. Tick questions on the left.</p>
                ) : (
                  <ol className="bqlist">
                    {qs.map((id, i) => (
                      <li key={id}>
                        <span className="tnum faint">{i + 1}</span>
                        <span className="bqlist__t">{Q[id].title}</span>
                        <button type="button" className="btn btn--sm btn--icon btn--ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move “${Q[id].title}” up`}>
                          <ArrowUp />
                        </button>
                        <button type="button" className="btn btn--sm btn--icon btn--ghost" disabled={i === qs.length - 1} onClick={() => move(i, 1)} aria-label={`Move “${Q[id].title}” down`}>
                          <ArrowDown />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                <label className="switch">
                  <input type="checkbox" checked={adaptive} onChange={(e) => setAdaptive(e.target.checked)} /> Ask the most useful questions first
                </label>
                <p className="small muted">With 6 or more questions, people can choose a shorter run and the quiz picks the questions that separate the best matches.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="panel panel-pad builder__form">
              <label className="builder__name">
                <span>Quiz name</span>
                <input
                  ref={nameRef}
                  className="input"
                  value={name}
                  maxLength={60}
                  placeholder="Browser for my team"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? 'name-err' : undefined}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {errors.name && (
                <p id="name-err" className="small builder__err">
                  {errors.name}
                </p>
              )}
              <dl className="builder__sum">
                <div>
                  <dt>Browsers</dt>
                  <dd>{describePool(pool)}</dd>
                </div>
                <div>
                  <dt>Questions</dt>
                  <dd>
                    {qs.length}, {adaptive && qs.length >= 6 ? 'most useful first' : 'in your order'}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <aside className="builder__summary panel panel-pad" aria-label="Your quiz so far">
          <p role="status" className="builder__count">
            <strong className="tnum">{members.length}</strong> {matchWords(members.length)}
          </p>
          {errors.pool && <p className="small builder__err">{errors.pool}</p>}
          <p className="small muted builder__what">
            {qs.length} {qs.length === 1 ? 'question' : 'questions'}
          </p>
          {members.length > 0 && (
            <div className="builder__marks" aria-hidden>
              {members.slice(0, 8).map((b) => (
                <BrowserMark key={b.id} b={b} size={24} />
              ))}
              {members.length > 8 && <span className="xs faint tnum">+{members.length - 8}</span>}
            </div>
          )}
          <div className="builder__nav">
            {step > 0 && (
              <button type="button" className="btn" onClick={() => goto(step - 1)}>
                <ArrowLeft aria-hidden /> Back
              </button>
            )}
            <button type="button" className="btn btn--primary" onClick={next}>
              {step === 2 ? 'Save quiz' : 'Next'} {step < 2 && <ArrowRight aria-hidden />}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
