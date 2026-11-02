import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Brain, FileText, GitCompare, Link2, RotateCcw, Trophy, X } from 'lucide-react';
import { customLink, DECIDER_QUESTIONS } from '../lib/customQuiz';
import { useMemo, useRef, useState } from 'react';
import { useFlip } from '../lib/motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BROWSERS, getBrowser } from '../lib/data';
import { CATEGORIES } from '../data/taxonomy';
import { fmt, overall } from '../lib/scoring';
import type { BrowserIndex } from '../lib/types';
import { useDocTitle } from '../lib/hooks';
import { useApp } from '../lib/store';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ScoreNum } from '../components/ui/Score';
import { FactsStrip } from '../components/ui/Facts';
import { Empty } from '../components/ui/Controls';

/* =========================== Tier list =========================== */

const TIERS = ['S', 'A', 'B', 'C', 'D'] as const;
type Tier = (typeof TIERS)[number] | 'pool';

function editorialTier(b: BrowserIndex): Tier {
  const v = overall(b);
  return v >= 7.8 ? 'S' : v >= 7.2 ? 'A' : v >= 6.5 ? 'B' : v >= 5.5 ? 'C' : 'D';
}

export function TierList() {
  useDocTitle('Tier list maker');
  const [sp, setSp] = useSearchParams();
  const { toast } = useApp();
  const [sel, setSel] = useState<string | null>(null);
  const tiers = useRef<HTMLDivElement>(null);
  const flip = useFlip(tiers, sp.toString());
  const live = useMemo(() => BROWSERS.filter((b) => b.status !== 'discontinued').sort((a, b) => overall(b) - overall(a)), []);

  const parsed = useMemo(() => {
    const t = sp.get('t');
    const map: Record<string, Tier> = {};
    if (t) {
      for (const part of t.split('|')) {
        const [tier, ids] = part.split(':');
        if (TIERS.includes(tier as never)) for (const id of (ids ?? '').split(',')) if (getBrowser(id)) map[id] = tier as Tier;
      }
      return map;
    }
    return null;
  }, [sp]);
  const placement: Record<string, Tier> = parsed ?? Object.fromEntries(live.map((b) => [b.id, editorialTier(b)]));
  const isEditorial = !parsed;

  const save = (m: Record<string, Tier>) => {
    const s = TIERS.map((t) => `${t}:${Object.keys(m).filter((id) => m[id] === t).join(',')}`).join('|');
    setSp({ t: s }, { replace: true });
  };
  const move = (id: string, tier: Tier) => {
    flip(); // First: chips glide from where they were to their new tier
    save({ ...placement, [id]: tier });
    setSel(null);
  };
  const pool = live.filter((b) => !placement[b.id] || placement[b.id] === 'pool');

  const Chip = ({ b }: { b: BrowserIndex }) => (
    <button
      data-flip={b.id}
      className={`tier-chip ${sel === b.id ? 'is-sel' : ''}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', b.id)}
      onClick={() => setSel(sel === b.id ? null : b.id)}
      onKeyDown={(e) => {
        const k = e.key.toUpperCase();
        if (TIERS.includes(k as never)) {
          e.preventDefault();
          move(b.id, k as Tier);
        } else if (k === 'BACKSPACE' || k === 'DELETE') move(b.id, 'pool');
      }}
      aria-pressed={sel === b.id}
      aria-label={`${b.name}, tier ${placement[b.id] ?? 'unranked'}. Press S, A, B, C or D to move.`}
    >
      <BrowserMark b={b} size={28} />
      <span className="tier-chip__name">{b.name}</span>
    </button>
  );

  const Row = ({ tier, list }: { tier: Tier; list: BrowserIndex[] }) => (
    <div
      className={`tier-row tier-row--${tier}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData('text/plain');
        if (id) move(id, tier);
      }}
    >
      <button className="tier-label" onClick={() => sel && move(sel, tier)} aria-label={sel ? `Move ${getBrowser(sel)?.name} to ${tier === 'pool' ? 'unranked' : 'tier ' + tier}` : `Tier ${tier}`} disabled={!sel}>
        {tier === 'pool' ? 'Unranked' : tier}
      </button>
      <div className="tier-items">
        {list.map((b) => (
          <Chip key={b.id} b={b} />
        ))}
        {sel && list.length === 0 && <span className="xs faint">Tap the tier label to move here</span>}
      </div>
    </div>
  );

  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Tier list maker</h1>
          <p className="lede">Starts from our scores. Drag browsers between tiers, or tap a browser then tap a tier. On a keyboard, focus a browser and press S, A, B, C or D.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setSp({}, { replace: true })}>
            <RotateCcw aria-hidden /> Reset to our scores
          </button>
          <button className="btn" onClick={() => save(Object.fromEntries(live.map((b) => [b.id, 'pool' as Tier])))}>
            Start empty
          </button>
          <button className="btn btn--primary" onClick={() => navigator.clipboard?.writeText(location.href).then(() => toast('Link to your tier list copied'), () => toast('Copy the address bar to share'))}>
            <Link2 aria-hidden /> Share
          </button>
        </div>
      </div>
      {isEditorial && <p className="callout small">This is the editorial starting point. Move anything and it becomes yours; the link saves it.</p>}
      <div className="tiers" ref={tiers}>
        {TIERS.map((t) => (
          <Row key={t} tier={t} list={live.filter((b) => placement[b.id] === t)} />
        ))}
        {pool.length > 0 && <Row tier="pool" list={pool} />}
      </div>
    </div>
  );
}

/* =========================== Battle bracket =========================== */

function hints(a: BrowserIndex, b: BrowserIndex) {
  return CATEGORIES.map((c, i) => ({ c, d: a.scores[i] - b.scores[i] }))
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
    .slice(0, 3);
}

export function Battle() {
  useDocTitle('Battle bracket');
  const [size, setSize] = useState<8 | 16 | null>(null);
  const [rounds, setRounds] = useState<BrowserIndex[][]>([]);
  const [picks, setPicks] = useState<BrowserIndex[]>([]);
  const start = (n: 8 | 16) => {
    const seeds = BROWSERS.filter((b) => b.status !== 'discontinued').sort((a, b) => overall(b) - overall(a)).slice(0, n);
    // standard seeding: 1 vs n, 2 vs n-1, …
    const order: BrowserIndex[] = [];
    for (let i = 0; i < n / 2; i++) order.push(seeds[i], seeds[n - 1 - i]);
    setSize(n);
    setRounds([order]);
    setPicks([]);
  };
  const cur = rounds[rounds.length - 1] ?? [];
  const matchIdx = picks.length;
  const a = cur[matchIdx * 2];
  const b = cur[matchIdx * 2 + 1];
  const champion = rounds.length && cur.length === 1 ? cur[0] : null;

  const pick = (w: BrowserIndex) => {
    const np = [...picks, w];
    if (np.length * 2 >= cur.length) {
      setRounds([...rounds, np]);
      setPicks([]);
    } else setPicks(np);
  };

  if (!size) {
    return (
      <div className="container page">
        <div className="page-head">
          <div>
            <h1>Battle bracket</h1>
            <p className="lede">A knockout tournament of the top-rated browsers. You pick each winner; we show where they differ most.</p>
          </div>
        </div>
        <div className="qcards" style={{ maxWidth: '32rem' }}>
          {([8, 16] as const).map((n) => (
            <button key={n} className="qcard" onClick={() => start(n)}>
              <span className="qcard__label">{n} browsers</span>
              <span className="qcard__sub">{n - 1} match-ups</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Battle bracket</h1>
          <p className="lede">
            {champion ? 'We have a champion.' : `Round ${rounds.length} · match ${matchIdx + 1} of ${cur.length / 2}`}
          </p>
        </div>
        <button className="btn" onClick={() => setSize(null)}>
          <RotateCcw aria-hidden /> New bracket
        </button>
      </div>
      <AnimatePresence mode="wait">
        {champion ? (
          <motion.div key="champ" className="panel qres__hero" initial={{ opacity: 0, transform: 'scale(0.95)' }} animate={{ opacity: 1, transform: 'scale(1)' }} transition={{ type: 'spring', duration: 0.6, bounce: 0.25 }}>
            <p className="qres__kicker">
              <Trophy aria-hidden /> Your champion
            </p>
            <div className="row" style={{ marginTop: 'var(--s-4)', flexWrap: 'nowrap' }}>
              <BrowserMark b={champion} size={80} />
              <div>
                <h2 className="qres__name">{champion.name}</h2>
                <FactsStrip b={champion} />
              </div>
            </div>
            <div className="row" style={{ marginTop: 'var(--s-4)' }}>
              <Link className="btn btn--primary" to={`/browser/${champion.id}`}>
                Open profile
              </Link>
              <button className="btn" onClick={() => start(size)}>
                Play again
              </button>
            </div>
          </motion.div>
        ) : (
          a &&
          b && (
            <motion.div key={a.id + b.id} className="battle" initial={{ opacity: 0, transform: 'translateY(10px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
              {[a, b].map((x, i) => {
                const other = i === 0 ? b : a;
                return (
                  <button key={x.id} className="panel battle__card" onClick={() => pick(x)}>
                    <BrowserMark b={x} size={56} />
                    <span className="qcard__label">{x.name}</span>
                    <ScoreNum value={overall(x)} />
                    <ul className="battle__hints">
                      {hints(x, other).map(({ c, d }) => (
                        <li key={c.id} className={d > 0 ? 'is-up' : 'is-down'}>
                          {c.name} {d > 0 ? '+' : '−'}
                          {fmt(Math.abs(d))}
                        </li>
                      ))}
                    </ul>
                    <span className="btn btn--primary btn--sm">Pick {x.name}</span>
                  </button>
                );
              })}
              <span className="qtot__or" aria-hidden>
                vs
              </span>
            </motion.div>
          )
        )}
      </AnimatePresence>
      <div className="bracket" aria-label="Bracket so far">
        {rounds.map((r, ri) => (
          <ol key={ri} className="bracket__round">
            {r.map((x, i) => (
              <li key={x.id + i} className={rounds[ri + 1]?.includes(x) ? 'is-through' : rounds[ri + 1] ? 'is-out' : ''}>
                <BrowserMark b={x} size={18} />
                <span className="truncate">{x.name}</span>
              </li>
            ))}
          </ol>
        ))}
      </div>
    </div>
  );
}

/* =========================== Shortlist =========================== */

export function Shortlist() {
  useDocTitle('Your shortlist');
  const { shortlist, toggleShortlist, setNote, setCompare } = useApp();
  const nav = useNavigate();
  const list = Object.keys(shortlist).map(getBrowser).filter(Boolean) as BrowserIndex[];
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Your shortlist</h1>
          <p className="lede">Browsers you’ve saved, with your own notes. Saved on this device only.</p>
        </div>
        {list.length >= 2 && (
          <div className="row">
            <button
              className="btn btn--primary"
              onClick={() => {
                const ids = list.slice(0, 6).map((b) => b.id);
                setCompare(ids);
                nav(`/compare?b=${ids.join(',')}`);
              }}
            >
              <GitCompare aria-hidden /> Compare {Math.min(6, list.length)}
            </button>
            <Link to={customLink({ name: 'Decide my shortlist', pool: { ids: list.map((b) => b.id) }, questions: DECIDER_QUESTIONS, adaptive: true })} className="btn">
              <Brain aria-hidden /> Let a quiz decide
            </Link>
            <Link to="/shortlist/brief" className="btn btn--ghost">
              <FileText aria-hidden /> Open the brief
            </Link>
          </div>
        )}
      </div>
      {list.length === 1 && (
        <p className="small muted" style={{ marginBottom: 'var(--s-4)' }}>
          Save at least 2 browsers first to let a quiz decide between them. <Link to="/browsers" className="link">Browse browsers</Link>
        </p>
      )}
      {list.length === 0 ? (
        <div className="panel">
          <Empty icon={<Bookmark />} title="Nothing saved yet" action={<Link to="/browsers" className="btn btn--primary">Browse browsers</Link>}>
            Use the bookmark button on any browser to keep it here while you decide.
          </Empty>
        </div>
      ) : (
        <div className="grid grid-2">
          {list.map((b) => (
            <div key={b.id} className="panel panel-pad stack">
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <BrowserMark b={b} size={40} />
                <Link to={`/browser/${b.id}`} style={{ flex: 1, minWidth: 0 }}>
                  <strong className="truncate" style={{ display: 'block' }}>
                    {b.name}
                  </strong>
                  <span className="small muted truncate" style={{ display: 'block' }}>
                    {b.pitch}
                  </span>
                </Link>
                <ScoreNum value={overall(b)} size="lg" />
                <button className="btn btn--ghost btn--icon btn--sm" onClick={() => toggleShortlist(b.id)} aria-label={`Remove ${b.name} from shortlist`}>
                  <X />
                </button>
              </div>
              <FactsStrip b={b} small />
              <label>
                <span className="sr-only">Notes on {b.name}</span>
                <textarea className="input" rows={2} placeholder="Your notes" value={shortlist[b.id] ?? ''} onChange={(e) => setNote(b.id, e.target.value)} style={{ paddingBlock: 8, resize: 'vertical' }} />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
