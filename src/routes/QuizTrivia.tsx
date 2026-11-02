import { motion } from 'motion/react';
import { ArrowRight, Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrowserPicker } from '../components/BrowserPicker';
import { QuestionView } from '../components/quiz/QuestionView';
import { BrowserMark } from '../components/ui/BrowserMark';
import { buildRun, RUN_LENGTH, rng, shuffle, type Difficulty, type Trivia } from '../data/trivia';
import { ENGINE_BY_ID, GROUP_LABEL } from '../data/taxonomy';
import type { Question } from '../data/quizzes';
import { BROWSERS } from '../lib/data';
import { readLocal, writeLocal } from '../lib/store';
import type { BrowserIndex } from '../lib/types';

const newSeed = () => Math.floor(Math.random() * 2 ** 31);
const EASE = [0.23, 1, 0.32, 1] as const;

const LEVEL_LABEL: Record<Difficulty | 'all', string> = { easy: 'Easy', medium: 'Medium', expert: 'Expert', all: 'A mix of all three' };

function verdict(score: number, total: number, mode: 'iq' | 'myths') {
  const pct = total ? score / total : 0;
  if (mode === 'myths') return pct === 1 ? 'Every one right. Nothing gets past you.' : pct >= 0.7 ? 'Sharp. You spot a myth quickly.' : pct >= 0.4 ? 'A fair start. The explanations below fill in the rest.' : 'Plenty of these fool people. The explanations below help.';
  return pct === 1 ? 'Perfect. You could write this site.' : pct >= 0.7 ? 'Sharp. You know your engines from your forks.' : pct >= 0.4 ? 'Solid basics. The glossary fills the gaps.' : 'Everyone starts somewhere. The glossary is a good next stop.';
}

/** Browser IQ and Myth or fact: ten questions per run, drawn from a bank plus questions made from the profiles. */
export function TriviaRunner({ mode }: { mode: 'iq' | 'myths' }) {
  const bestKey = mode === 'iq' ? 'bf-iq-best2' : 'bf-myths-best';
  const [level, setLevel] = useState<Difficulty | 'all' | null>(mode === 'myths' ? 'all' : null);
  const [seed, setSeed] = useState(newSeed);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [best, setBest] = useState(() => readLocal<Record<string, number>>(bestKey, {}));
  const run = useMemo(() => (level ? buildRun(mode, level, seed) : []), [mode, level, seed]);

  const answered = (t: Trivia) => (t.type === 'order' ? !!checked[t.id] : t.id in picked);
  const right = (t: Trivia) => (t.type === 'order' ? !!checked[t.id] && (drafts[t.id] ?? []).join() === t.options.map((o) => o.id).join() : !!t.options.find((o) => o.id === picked[t.id])?.correct);
  const finished = run.length > 0 && pos >= run.length;
  const score = run.filter(right).length;

  useEffect(() => {
    if (!finished || !level) return;
    setBest((cur) => {
      if ((cur[level] ?? -1) >= score) return cur;
      const next = { ...cur, [level]: score };
      writeLocal(bestKey, next);
      return next;
    });
  }, [finished, level, score, bestKey]);

  const start = (l: Difficulty | 'all') => {
    setLevel(l);
    setSeed(newSeed());
    setPos(0);
    setPicked({});
    setDrafts({});
    setChecked({});
  };

  if (!level) {
    return (
      <div className="qstart panel panel-pad">
        <h2>Pick a level</h2>
        <p className="muted">Each run asks {RUN_LENGTH} questions, drawn fresh from a bank of hand-written and generated ones.</p>
        <div className="qcards">
          {(['easy', 'medium', 'expert', 'all'] as const).map((l) => (
            <button key={l} className="qcard" onClick={() => start(l)}>
              <span className="qcard__label">{LEVEL_LABEL[l]}</span>
              <span className="qcard__sub tnum">{best[l] != null ? `Best ${best[l]} of ${RUN_LENGTH}` : `${RUN_LENGTH} questions`}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (finished) {
    const missed = run.filter((t) => !right(t));
    return (
      <div className="qres">
        <motion.div className="qres__hero panel" initial={{ opacity: 0, transform: 'scale(0.96)' }} animate={{ opacity: 1, transform: 'scale(1)' }} transition={{ duration: 0.5, ease: EASE }}>
          <p className="qres__kicker">{mode === 'iq' ? 'Browser IQ' : 'Myth or fact'}</p>
          <h2 className="qres__name tnum">
            {score} / {run.length}
          </h2>
          <p className="muted">{verdict(score, run.length, mode)}</p>
          {best[level] != null && (
            <p className="small muted tnum">
              Best at this level: {best[level]} of {RUN_LENGTH}
            </p>
          )}
          <div className="row" style={{ marginTop: 'var(--s-4)' }}>
            <button className="btn btn--primary" onClick={() => start(level)}>
              Play again
            </button>
            {mode === 'iq' && (
              <button className="btn" onClick={() => setLevel(null)}>
                Change level
              </button>
            )}
            <Link to="/learn" className="btn btn--ghost">
              Open the glossary
            </Link>
          </div>
        </motion.div>
        {missed.length > 0 && (
          <section className="section" style={{ marginTop: 'var(--s-8)' }} aria-labelledby="missed-h">
            <div className="section-head">
              <h2 id="missed-h">Worth another look</h2>
            </div>
            <ul className="panel trivia-review">
              {missed.map((t) => (
                <li key={t.id}>
                  <p className="trivia-review__q">{t.title}</p>
                  <p className="small">
                    <strong>{t.type === 'order' ? 'Correct order: ' : 'Answer: '}</strong>
                    {t.type === 'order' ? t.options.map((o) => o.label).join(' → ') : t.options.find((o) => o.correct)?.label}
                  </p>
                  <p className="small muted">{t.explain}</p>
                  {t.link && (
                    <Link to={t.link.to} className="link small">
                      {t.link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  const t = run[pos];
  if (!t) return null;
  const done = answered(t);
  const ok = right(t);
  const q: Question = { id: t.id, type: t.type, title: t.title, options: t.options };
  const value = t.type === 'order' ? drafts[t.id] : picked[t.id];
  return (
    <div className="qrun qrun--solo">
      <div className="qshell">
        <div className="qprogress" aria-hidden>
          <span style={{ transform: `scaleX(${(pos + 1) / run.length})` }} />
        </div>
        <p className="qmeta">
          <span className="tnum">
            {pos + 1} / {run.length}
          </span>
          <span className="badge">{t.level}</span>
        </p>
        <h2 className="qtitle">{t.title}</h2>
        <div className="qbody">
          <QuestionView
            key={t.id}
            q={q}
            value={value}
            onChange={(v) => (t.type === 'order' ? setDrafts((d) => ({ ...d, [t.id]: v as string[] })) : setPicked((p) => ({ ...p, [t.id]: v as string })))}
            reveal={done}
          />
        </div>
        {done && (
          <motion.div className={`callout ${ok ? '' : 'callout--warning'}`} role="status" initial={{ opacity: 0, transform: 'translateY(6px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: 0.2 }}>
            <strong>{ok ? 'Correct. ' : 'Not quite. '}</strong>
            {t.explain}
            {t.link && (
              <>
                {' '}
                <Link to={t.link.to} className="link">
                  {t.link.label}
                </Link>
              </>
            )}
          </motion.div>
        )}
        <div className="qnav">
          <span />
          {t.type === 'order' && !done ? (
            <button className="btn btn--primary" onClick={() => setChecked((c) => ({ ...c, [t.id]: true }))}>
              Check order
            </button>
          ) : (
            <span />
          )}
          <button className="btn btn--primary" disabled={!done} onClick={() => setPos(pos + 1)}>
            {pos + 1 >= run.length ? 'See my score' : 'Next'} <ArrowRight aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Guess the browser ------------------------------ */

/** Words that name nothing on their own, in browser names and in maker names. */
const STOP = new Set([
  ...['browser', 'web', 'internet', 'the', 'and', 'for', 'with', 'mobile', 'secure', 'privacy', 'private', 'edition', 'lite', 'mini', 'beta', 'open', 'source'],
  ...['software', 'inc', 'ltd', 'llc', 'corporation', 'foundation', 'project', 'team', 'company', 'labs', 'technologies', 'platforms', 'limited'],
  ...['community', 'individual', 'developer', 'developers', 'volunteer', 'decentralised', 'contributors', 'original', 'author', 'unknown'],
]);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Hides the browser's name and its maker's name, including the parts of run-together names ("JioSphere" gives "Jio" and "Sphere"),
 * so a clue does not give the answer away.
 */
function nameWords(b: BrowserIndex) {
  const words = new Set<string>();
  for (const source of [b.name, b.developer]) {
    for (const w of source.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/)) {
      if (w.length >= 3 && !STOP.has(w.toLowerCase())) words.add(w);
    }
  }
  return [...words];
}

function redact(text: string, b: BrowserIndex) {
  let out = text.replaceAll(new RegExp(escapeRe(b.name), 'gi'), '[name hidden]');
  for (const w of nameWords(b)) out = out.replaceAll(new RegExp(`\\b${escapeRe(w)}`, 'gi'), '[name hidden]');
  return out;
}

/** The place part of a headquarters note ("Germany (KDE e.V.)" gives "Germany"); null when it names a project, not a place. */
function countryOf(hq: string | undefined) {
  const lead = (hq ?? '').split(/[(;,]/)[0].trim();
  return lead && lead.length <= 28 && !/project|community|decentrali|volunteer|unknown|individual|original|international/i.test(lead) ? lead : null;
}

/** Five clues, from broad to specific. None may contain the browser's name or its maker's name. */
function cluesFor(b: BrowserIndex): string[] {
  const bits = nameWords(b).map((w) => w.toLowerCase());
  const engineName = ENGINE_BY_ID[b.engine]?.name ?? b.engine;
  // Engines that share a name with their browser (Dillo, Servo, NetSurf) would give the answer away.
  const engineLeaks = bits.some((w) => engineName.toLowerCase().includes(w) || w.includes(engineName.toLowerCase()));
  const engine = b.engine === 'multi' ? 'different engines on different systems' : engineLeaks ? 'an engine of its own' : `the ${engineName} engine`;
  const tags = b.tags.filter((tag) => !bits.some((n) => tag.toLowerCase().includes(n))).slice(0, 4);
  const place = countryOf(b.hq);
  return [
    `It runs on ${engine}. It’s counted as a ${(GROUP_LABEL[b.group] ?? b.group).toLowerCase()} browser.`,
    place ? `Its maker is based in ${place}.` : `It is ${b.price === 'paid' ? 'a paid browser' : b.price === 'freemium' ? 'free with paid extras' : 'free to use'}.`,
    `It was first released in ${b.releaseYear}.`,
    tags.length ? `It’s known for: ${tags.join(', ')}.` : `It is ${b.openSource === true ? 'open source' : 'not fully open source'}.`,
    redact(b.pitch, b),
  ];
}

const ROUNDS = 10;
const BEST_KEY = 'bf-guess-best';

export function GuessRunner() {
  const [seed, setSeed] = useState(newSeed);
  const targets = useMemo(() => {
    const pool = BROWSERS.filter((b) => b.status !== 'discontinued' && b.confidence !== 'low');
    return shuffle(pool, rng(seed)).slice(0, ROUNDS);
  }, [seed]);
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState(1);
  const [result, setResult] = useState<{ guess: BrowserIndex | null; right: boolean; points: number } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [best, setBest] = useState(() => readLocal<number>(BEST_KEY, 0));

  const total = scores.reduce((a, n) => a + n, 0);
  const finished = round >= ROUNDS;
  useEffect(() => {
    if (!finished) return;
    setBest((cur) => {
      if (cur >= total) return cur;
      writeLocal(BEST_KEY, total);
      return total;
    });
  }, [finished, total]);

  const reset = () => {
    setSeed(newSeed());
    setRound(0);
    setShown(1);
    setResult(null);
    setScores([]);
  };

  if (finished) {
    const max = ROUNDS * 5;
    return (
      <div className="qres">
        <motion.div className="qres__hero panel" initial={{ opacity: 0, transform: 'scale(0.96)' }} animate={{ opacity: 1, transform: 'scale(1)' }} transition={{ duration: 0.5, ease: EASE }}>
          <p className="qres__kicker">Guess the browser</p>
          <h2 className="qres__name tnum">
            {total} / {max}
          </h2>
          <p className="muted">{total >= 40 ? 'You recognise browsers from the faintest clues.' : total >= 25 ? 'Solid. A couple of clues is often all you need.' : 'Each profile on the site has more clues. Try the Browsers page for a warm-up.'}</p>
          <p className="small muted tnum">Best score: {Math.max(best, total)} of {max}</p>
          <div className="row" style={{ marginTop: 'var(--s-4)' }}>
            <button className="btn btn--primary" onClick={reset}>
              Play again
            </button>
            <Link to="/browsers" className="btn btn--ghost">
              Browse all browsers
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const target = targets[round];
  const clues = cluesFor(target);
  const worth = 6 - shown;
  const submit = (b: BrowserIndex | null) => {
    const right = !!b && b.id === target.id;
    const points = right ? worth : 0;
    setResult({ guess: b, right, points });
    setScores((s) => [...s, points]);
  };

  return (
    <div className="qrun qrun--solo">
      <div className="qshell">
        <div className="qprogress" aria-hidden>
          <span style={{ transform: `scaleX(${(round + 1) / ROUNDS})` }} />
        </div>
        <p className="qmeta">
          <span className="tnum">
            Round {round + 1} / {ROUNDS}
          </span>
          <span className="badge tnum">{total} points</span>
        </p>
        <h2 className="qtitle">Which browser is this?</h2>
        <ol className="clues">
          {clues.slice(0, shown).map((c, i) => (
            <li key={i}>
              <span className="clues__n tnum" aria-hidden>
                {i + 1}
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
        <div role="status" className="sr-only">
          {result ? '' : `Clue ${shown} of ${clues.length}: ${clues[shown - 1]}`}
        </div>

        {!result ? (
          <div className="guess__act">
            <div className="guess__pick">
              <BrowserPicker label="Type a browser name" onPick={(b) => submit(b)} />
              <p className="small muted">Right now a correct guess is worth <strong className="tnum">{worth}</strong> {worth === 1 ? 'point' : 'points'}.</p>
            </div>
            <div className="row">
              {shown < clues.length && (
                <button type="button" className="btn" onClick={() => setShown(shown + 1)}>
                  Reveal clue {shown + 1} <span className="tnum faint">(worth {worth - 1})</span>
                </button>
              )}
              <button type="button" className="btn btn--ghost" onClick={() => submit(null)}>
                Show the answer
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`callout guess__res ${result.right ? '' : 'callout--warning'}`} role="status">
              <BrowserMark b={target} size={40} />
              <div>
                <p>
                  <strong>
                    {result.right ? <Check aria-hidden className="guess__ico" /> : <X aria-hidden className="guess__ico" />}
                    {result.right ? `Correct. +${result.points} ${result.points === 1 ? 'point' : 'points'}.` : result.guess ? `Not quite. You said ${result.guess.name}.` : 'No guess this round.'}
                  </strong>
                </p>
                <p>
                  It was <Link to={`/browser/${target.id}`} className="link">{target.name}</Link>. {target.pitch}
                </p>
              </div>
            </div>
            <div className="qnav">
              <span />
              <span />
              <button
                className="btn btn--primary"
                onClick={() => {
                  setRound(round + 1);
                  setShown(1);
                  setResult(null);
                }}
              >
                {round + 1 >= ROUNDS ? 'See my score' : 'Next round'} <ArrowRight aria-hidden />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
