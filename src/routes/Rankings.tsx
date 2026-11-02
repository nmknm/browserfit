import { LayoutGroup, motion } from 'motion/react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, CATEGORY_IDS, OSES, PILLARS, OS_BY_ID } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, consistency, overall, personaWeights, pillarScore, pool, rank, fmt } from '../lib/scoring';
import { scoresFor } from '../lib/data';
import type { BrowserIndex, OsId, PillarId } from '../lib/types';
import { PERSONAS } from '../data/personas';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ScoreBar, ScoreNum, TierLegend } from '../components/ui/Score';
import { Tabs } from '../components/ui/Controls';
import { useParam, useDocTitle } from '../lib/hooks';
import { useApp } from '../lib/store';
import { NAV } from './nav';

type Lens = 'overall' | 'category' | 'platform' | 'persona' | 'rounded';

export function RankList({ rows, valueLabel, extra }: { rows: { b: BrowserIndex; value: number; rank: number }[]; valueLabel: string; extra?: (b: BrowserIndex) => React.ReactNode }) {
  return (
    <LayoutGroup>
      <ol className="panel ranklist" aria-label={`Ranked by ${valueLabel}`}>
        {rows.map((r) => (
          <motion.li key={r.b.id} layout="position" transition={{ type: 'spring', duration: 0.45, bounce: 0.1 }}>
            <Link to={`/browser/${r.b.id}`} className="brow">
              <span className={`brow__rank tnum ${r.rank <= 3 ? 'is-podium' : ''}`}>{r.rank}</span>
              <BrowserMark b={r.b} size={32} />
              <span className="brow__id">
                <span className="brow__name truncate">{r.b.name}</span>
                <span className="brow__sub truncate">{extra ? extra(r.b) : r.b.pitch}</span>
              </span>
              <span className="brow__bar">
                <ScoreBar value={r.value} animate={false} />
              </span>
              <ScoreNum value={r.value} label={valueLabel} />
            </Link>
          </motion.li>
        ))}
      </ol>
    </LayoutGroup>
  );
}

function Podium({ rows }: { rows: { b: BrowserIndex; value: number; rank: number }[] }) {
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <div className="podium" aria-hidden>
      {order.map((r) => (
        <Link key={r.b.id} to={`/browser/${r.b.id}`} className={`podium__step podium__step--${r.rank}`} tabIndex={-1}>
          <BrowserMark b={r.b} size={r.rank === 1 ? 56 : 44} />
          <span className="podium__name truncate">{r.b.name}</span>
          <ScoreNum value={r.value} />
          <span className="podium__block tnum">{r.rank}</span>
        </Link>
      ))}
    </div>
  );
}

export default function Rankings() {
  useDocTitle('Rankings');
  const { os: globalOs } = useApp();
  const [lensP, setLens] = useParam('lens');
  const [catP, setCat] = useParam('cat');
  const [osP, setOsP] = useParam('os');
  const [perP, setPer] = useParam('persona');
  const lens = (lensP as Lens) ?? 'overall';
  const os = (osP as OsId | null) ?? (lens === 'platform' ? 'windows' : globalOs);
  const cat = catP ?? 'p:privacy';
  const persona = PERSONAS.find((p) => p.id === perP) ?? PERSONAS[0];

  const rows = useMemo(() => {
    const p = pool({ os });
    if (lens === 'category') {
      if (cat.startsWith('p:')) return rank(p, (b) => pillarScore(b, cat.slice(2) as PillarId, os));
      const i = CATEGORY_IDS.indexOf(cat as never);
      return rank(p, (b) => scoresFor(b, os)[i]);
    }
    if (lens === 'persona') {
      const w = personaWeights(persona.boost);
      return rank(p, (b) => overall(b, w, os));
    }
    if (lens === 'rounded') return rank(p, (b) => 10 - consistency(b, os).sd * 3).map((r) => ({ ...r, value: overall(r.b, DEFAULT_WEIGHTS, os) }));
    return rank(p, (b) => overall(b, DEFAULT_WEIGHTS, os));
  }, [lens, os, cat, persona]);

  const catLabel = cat.startsWith('p:') ? PILLARS.find((p) => p.id === cat.slice(2))?.name : CATEGORIES.find((c) => c.id === cat)?.name;
  const rankTools = NAV.find((g) => g.id === 'rank')!.items.filter((i) => i.to !== '/rankings');

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Rankings</h1>
          <p className="lede">Leaderboards for every way of looking at a browser. Ties share a rank.</p>
        </div>
        <Link to="/rankings/custom" className="btn btn--primary">
          <SlidersHorizontal aria-hidden /> Build your own ranking
        </Link>
      </div>

      <Tabs<Lens>
        idBase="rank"
        label="Ranking lens"
        value={lens}
        onChange={(v) => setLens(v === 'overall' ? null : v)}
        tabs={[
          { value: 'overall', label: 'Overall' },
          { value: 'category', label: 'By category' },
          { value: 'platform', label: 'By platform' },
          { value: 'persona', label: 'By persona' },
          { value: 'rounded', label: 'Most well-rounded' },
        ]}
      />

      <div className="rank-layout" role="tabpanel" id={`rank-panel-${lens}`} aria-labelledby={`rank-tab-${lens}`}>
        <div className="rank-controls">
          {lens === 'category' && (
            <label>
              <span className="label">Category</span>
              <select className="input select" value={cat} onChange={(e) => setCat(e.target.value)}>
                {PILLARS.map((p) => (
                  <optgroup key={p.id} label={p.name}>
                    <option value={'p:' + p.id}>{p.name} (pillar)</option>
                    {CATEGORIES.filter((c) => c.pillar === p.id).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
          {lens === 'persona' && (
            <div>
              <span className="label">Persona</span>
              <div className="row">
                {PERSONAS.map((p) => (
                  <button key={p.id} className="chip" aria-pressed={p.id === persona.id} onClick={() => setPer(p.id)}>
                    {p.name}
                  </button>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>
                {persona.blurb}
              </p>
            </div>
          )}
          <label>
            <span className="label">Platform</span>
            <select className="input select" value={os ?? ''} onChange={(e) => setOsP(e.target.value || null)}>
              {lens !== 'platform' && <option value="">All platforms</option>}
              {OSES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          {lens === 'rounded' && <p className="small muted">Ranked by how evenly a browser scores across all 40 categories (low spread), not by its peak.</p>}
          <TierLegend />
        </div>

        <div>
          <h2 className="rank-title">
            {lens === 'overall' && `Best overall${os ? ` on ${OS_BY_ID[os].name}` : ''}`}
            {lens === 'category' && `Best for ${catLabel}${os ? ` on ${OS_BY_ID[os].name}` : ''}`}
            {lens === 'platform' && `Best on ${OS_BY_ID[os as OsId].name}`}
            {lens === 'persona' && `Best for: ${persona.name}`}
            {lens === 'rounded' && 'Most well-rounded'}
            <span className="faint small"> · {rows.length} browsers</span>
          </h2>
          {rows.length >= 3 && <Podium rows={rows} />}
          <RankList
            rows={rows}
            valueLabel={catLabel ?? 'Overall'}
            extra={lens === 'rounded' ? (b) => `Spread ±${fmt(consistency(b, os).sd)} across categories` : undefined}
          />
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>More ranking tools</h2>
        </div>
        <div className="grid grid-3">
          {rankTools.map((t) => (
            <Link key={t.to} to={t.to} className="panel tool-tile">
              <t.icon aria-hidden />
              <span className="mega__label">
                {t.label} <ArrowRight aria-hidden style={{ display: 'inline', width: 14, height: 14 }} />
              </span>
              <span className="mega__desc">{t.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
