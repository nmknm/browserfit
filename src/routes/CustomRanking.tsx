import { ChevronDown, Link2, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES, OSES, PILLARS, FEATURES, FEATURE_INDEX } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, overall, pool, rank, personaWeights, type Weights } from '../lib/scoring';
import type { OsId, PillarId } from '../lib/types';
import { PERSONAS } from '../data/personas';
import { RankList } from './Rankings';
import { decodeWeights, encodeWeights } from '../lib/weightsUrl';
import { useApp, useLocalState } from '../lib/store';
import { useDocTitle, useIsMobile } from '../lib/hooks';
import { Sheet } from '../components/ui/Sheet';
import { BrowserMark } from '../components/ui/BrowserMark';
import { Collapse } from '../components/ui/Collapse';

const MUST_HAVE = ['adBlocker', 'verticalTabs', 'workspaces', 'splitView', 'e2eeSync', 'passwordManager', 'uboFull', 'mobileExtensions', 'translation', 'readerMode', 'aiKillSwitch', 'builtinVpn'];

const encode = encodeWeights;
const decode = decodeWeights;

function WeightPanel({ w, setW, open, setOpen }: { w: Weights; setW: (w: Weights) => void; open: Record<string, boolean>; setOpen: (o: Record<string, boolean>) => void }) {
  const pillarAvg = (p: PillarId) => {
    const cs = CATEGORIES.filter((c) => c.pillar === p);
    return cs.reduce((a, c) => a + (w[c.id] ?? 0), 0) / cs.length;
  };
  return (
    <div className="weights">
      {PILLARS.map((p) => {
        const avg = pillarAvg(p.id);
        return (
          <div key={p.id} className="wpillar">
            <div className="wrow wrow--pillar">
              <button className="wpillar__toggle" aria-expanded={!!open[p.id]} onClick={() => setOpen({ ...open, [p.id]: !open[p.id] })}>
                <ChevronDown aria-hidden />
                {p.name}
              </button>
              <input
                type="range"
                className="range"
                min={0}
                max={4.5}
                step={0.5}
                value={avg}
                style={{ ['--fill' as string]: `${(avg / 4.5) * 100}%` }}
                aria-label={`${p.name} weight`}
                aria-valuetext={`${avg.toFixed(1)}`}
                onChange={(e) => {
                  const target = Number(e.target.value);
                  const ratio = avg > 0 ? target / avg : 1;
                  const n = { ...w };
                  for (const c of CATEGORIES.filter((c) => c.pillar === p.id)) n[c.id] = avg > 0 ? Math.min(4.5, Math.round((w[c.id] ?? 0) * ratio * 2) / 2) : target;
                  setW(n);
                }}
              />
              <span className="tnum small">{avg.toFixed(1)}</span>
            </div>
            <Collapse open={!!open[p.id]}>
              {CATEGORIES.filter((c) => c.pillar === p.id).map((c) => {
                const v = w[c.id] ?? 0;
                return (
                  <div key={c.id} className="wrow">
                    <label htmlFor={`w-${c.id}`} className="small">
                      {c.name}
                    </label>
                    <input
                      id={`w-${c.id}`}
                      type="range"
                      className="range"
                      min={0}
                      max={4.5}
                      step={0.5}
                      value={v}
                      style={{ ['--fill' as string]: `${(v / 4.5) * 100}%` }}
                      onChange={(e) => setW({ ...w, [c.id]: Number(e.target.value) })}
                    />
                    <span className={`tnum small ${v === 0 ? 'faint' : ''}`}>{v === 0 ? 'Off' : v.toFixed(1)}</span>
                  </div>
                );
              })}
            </Collapse>
          </div>
        );
      })}
    </div>
  );
}

export default function CustomRanking() {
  useDocTitle('Build your ranking');
  const [sp, setSp] = useSearchParams();
  const { os: globalOs, toast } = useApp();
  const mobile = useIsMobile();
  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useLocalState<{ name: string; w: string }[]>('bf-profiles', []);
  const w = decode(sp.get('w')) ?? DEFAULT_WEIGHTS;
  const os = (sp.get('os') as OsId | null) ?? globalOs;
  const must = (sp.get('must') ?? '').split(',').filter((x) => FEATURE_INDEX[x] != null);

  const update = (k: string, v: string | null) =>
    setSp(
      (cur) => {
        const n = new URLSearchParams(cur);
        if (!v) n.delete(k);
        else n.set(k, v);
        return n;
      },
      { replace: true },
    );
  const setW = (nw: Weights) => update('w', encode(nw));

  const rows = useMemo(() => {
    const p = pool({ os }).filter((b) => must.every((f) => b.features[FEATURE_INDEX[f]][0] === 2 || b.features[FEATURE_INDEX[f]][0] === 1));
    return rank(p, (b) => overall(b, w, os));
  }, [w, os, must.join()]);

  const panel = (
    <>
      <div className="stack" style={{ gap: 'var(--s-3)' }}>
        <div>
          <span className="label">Start from a preset</span>
          <div className="row">
            <button className="chip" onClick={() => update('w', null)}>
              Balanced
            </button>
            {PERSONAS.map((p) => (
              <button key={p.id} className="chip" onClick={() => setW(personaWeights(p.boost))}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Must have</span>
          <div className="row">
            {MUST_HAVE.map((f) => (
              <button key={f} className="chip" aria-pressed={must.includes(f)} onClick={() => update('must', (must.includes(f) ? must.filter((x) => x !== f) : [...must, f]).join(',') || null)}>
                {FEATURES.find((x) => x.id === f)?.name}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span className="label">Platform</span>
          <select className="input select" value={os ?? ''} onChange={(e) => update('os', e.target.value || null)}>
            <option value="">All platforms</option>
            {OSES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <h2 className="h-sm" style={{ marginTop: 'var(--s-5)' }}>
        Weights <span className="faint xs">0 = ignore · 4.5 = crucial · open a pillar to tune its categories</span>
      </h2>
      <WeightPanel w={w} setW={setW} open={open} setOpen={setOpen} />
    </>
  );

  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Build your own ranking</h1>
          <p className="lede">Weight what matters to you. The list re-ranks instantly, and the link remembers your weights.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setSp(new URLSearchParams(), { replace: true })}>
            <RotateCcw aria-hidden /> Reset
          </button>
          <button
            className="btn"
            onClick={() => {
              const name = `Profile ${saved.length + 1}`;
              setSaved([...saved, { name, w: encode(w) }]);
              toast(`Saved as “${name}”`);
            }}
          >
            Save profile
          </button>
          <button className="btn" onClick={() => navigator.clipboard?.writeText(location.href).then(() => toast('Link copied'), () => toast('Copy the address bar to share'))}>
            <Link2 aria-hidden /> Copy link
          </button>
        </div>
      </div>

      {saved.length > 0 && (
        <div className="row" style={{ marginBottom: 'var(--s-4)' }}>
          <span className="small muted">Your profiles:</span>
          {saved.map((s, i) => (
            <span key={i} className="chip">
              <button onClick={() => update('w', s.w)}>{s.name}</button>
              <button aria-label={`Delete ${s.name}`} onClick={() => setSaved(saved.filter((_, j) => j !== i))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="custom">
        {!mobile && <aside className="custom__side panel panel-pad">{panel}</aside>}
        <div>
          {mobile && (
            <div className="custom__mobilebar">
              <div className="row" style={{ gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
                {rows.slice(0, 3).map((r) => (
                  <span key={r.b.id} className="chip">
                    <BrowserMark b={r.b} size={18} flat /> {r.rank}. {r.b.name}
                  </span>
                ))}
              </div>
              <button className="btn btn--primary" onClick={() => setSheet(true)}>
                Adjust weights
              </button>
            </div>
          )}
          <p className="sr-only" aria-live="polite">
            Top browser: {rows[0]?.b.name ?? 'none'}
          </p>
          {rows.length ? (
            <RankList rows={rows} valueLabel="Your score" />
          ) : (
            <div className="panel empty">
              <h3>No browser has all of those must-haves</h3>
              <p>Remove a must-have feature to see results.</p>
              <button className="btn btn--primary" onClick={() => update('must', null)}>
                Clear must-haves
              </button>
            </div>
          )}
        </div>
      </div>
      {mobile && (
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Adjust weights" footer={<button className="btn btn--primary" onClick={() => setSheet(false)}>Show ranking</button>}>
          {panel}
        </Sheet>
      )}
    </div>
  );
}

