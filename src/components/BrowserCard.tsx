import { memo, useCallback, useRef } from 'react';
import { Bookmark, BookmarkCheck, Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BrowserIndex, OsId } from '../lib/types';
import { BrowserMark } from './ui/BrowserMark';
import { FactsStrip, StatusBadge } from './ui/Facts';
import { ScoreBar, ScoreNum } from './ui/Score';
import { DEFAULT_WEIGHTS, overall, pillarScores } from '../lib/scoring';
import { PILLARS, OS_BY_ID, OSES } from '../data/taxonomy';
import { useApp } from '../lib/store';
import { PILLAR_ICON } from './ui/PillarIcon';
import { useWidthFlip } from '../lib/motion';

/**
 * Pops the new icon in when its state flips (CSS transition on the remounted icon, so it runs off the main
 * thread). Only an icon that replaced another animates; one that mounts with the card does not.
 */
function IconSwap({ state, children }: { state: string; children: React.ReactNode }) {
  const seen = useRef(state);
  const flipped = useRef(false);
  if (seen.current !== state) {
    seen.current = state;
    flipped.current = true;
  }
  return (
    <span className="icon-swap">
      <span key={state} className={flipped.current ? 'icon-swap__in' : undefined}>
        {children}
      </span>
    </span>
  );
}

/** A callback with a stable identity that always calls the latest one, so memoised buttons are not re-rendered by it. */
function useStable<A extends unknown[]>(fn: (...args: A) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: A) => ref.current(...args), []);
}

export function OsDots({ b }: { b: BrowserIndex }) {
  return (
    <span className="os-dots" aria-label={`Available on ${OSES.filter((o) => b.platforms[o.id]).map((o) => o.name).join(', ')}`}>
      {OSES.map((o) => {
        const p = b.platforms[o.id];
        return (
          <span key={o.id} className={`os-dot ${p ? (p.status === 'discontinued' ? 'is-dead' : 'is-on') : ''}`} aria-hidden title={p ? o.name : `Not on ${o.name}`}>
            {o.short}
          </span>
        );
      })}
    </span>
  );
}

const CompareButton = memo(function CompareButton({ id, on, small, toggle }: { id: string; on: boolean; small?: boolean; toggle: (id: string) => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useWidthFlip(btn, on);
  return (
    <button
      ref={btn}
      className={`btn ${small ? 'btn--sm' : ''} ${on ? 'is-on-btn' : ''}`}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
    >
      <IconSwap state={on ? 'on' : 'off'}>{on ? <Check aria-hidden /> : <Plus aria-hidden />}</IconSwap>
      <span data-swap>{on ? 'In compare' : 'Compare'}</span>
    </button>
  );
});

/** Context consumers re-render on every app state change; the button underneath only when its own state flips. */
export function CompareToggle({ b, small }: { b: BrowserIndex; small?: boolean }) {
  const { inCompare, toggleCompare } = useApp();
  const toggle = useStable(toggleCompare);
  return <CompareButton id={b.id} on={inCompare(b.id)} small={small} toggle={toggle} />;
}

const ShortlistButton = memo(function ShortlistButton({ id, name, on, toggle }: { id: string; name: string; on: boolean; toggle: (id: string) => void }) {
  return (
    <button
      className="btn btn--sm btn--icon"
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from shortlist` : `Save ${name} to shortlist`}
      title={on ? 'Saved' : 'Save'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
    >
      <IconSwap state={on ? 'on' : 'off'}>{on ? <BookmarkCheck aria-hidden style={{ color: 'var(--accent-text)' }} /> : <Bookmark aria-hidden />}</IconSwap>
    </button>
  );
});

export function ShortlistToggle({ b }: { b: BrowserIndex }) {
  const { shortlist, toggleShortlist } = useApp();
  const toggle = useStable(toggleShortlist);
  return <ShortlistButton id={b.id} name={b.name} on={b.id in shortlist} toggle={toggle} />;
}

/** Grid card for a browser: identity, pitch, score, pillar bars, facts strip. */
export const BrowserCard = memo(function BrowserCard({ b, os, rank }: { b: BrowserIndex; os?: OsId | null; rank?: number }) {
  const total = overall(b, DEFAULT_WEIGHTS, os);
  const ps = pillarScores(b, os);
  return (
    <Link to={`/browser/${b.id}`} className="bcard panel">
      <div className="bcard__top">
        <BrowserMark b={b} size={40} />
        <div className="bcard__id">
          <h3 className="truncate">
            {rank ? <span className="faint tnum">{rank}. </span> : null}
            {b.name}
          </h3>
          <p className="truncate small muted">{b.developer}</p>
        </div>
        <ScoreNum value={total} size="lg" label="Overall" />
      </div>
      <p className="bcard__pitch">{b.pitch}</p>
      <div className="bcard__pillars" aria-label="Pillar scores">
        {PILLARS.map((p) => {
          const I = PILLAR_ICON[p.id];
          return (
            <div key={p.id} className="bcard__pillar" title={`${p.name}: ${ps[p.id].toFixed(1)}`} role="img" aria-label={`${p.name} ${ps[p.id].toFixed(1)}`}>
              <I aria-hidden />
              <ScoreBar value={ps[p.id]} compact />
            </div>
          );
        })}
      </div>
      <FactsStrip b={b} os={os} small />
      <div className="bcard__foot">
        <OsDots b={b} />
        <StatusBadge b={b} />
        <span className="bcard__actions">
          <ShortlistToggle b={b} />
          <CompareToggle b={b} small />
        </span>
      </div>
      {os && !b.platforms[os] && <p className="xs faint">Not available on {OS_BY_ID[os].name}</p>}
    </Link>
  );
});

/** Dense list row variant. */
export const BrowserRow = memo(function BrowserRow({ b, os, rank, value, right, flipKey }: { b: BrowserIndex; os?: OsId | null; rank?: number; value?: number; right?: React.ReactNode; flipKey?: string }) {
  const v = value ?? overall(b, DEFAULT_WEIGHTS, os);
  return (
    <Link to={`/browser/${b.id}`} className="brow" data-flip={flipKey}>
      {rank != null && <span className="brow__rank tnum">{rank}</span>}
      <BrowserMark b={b} size={32} />
      <span className="brow__id">
        <span className="brow__name truncate">{b.name}</span>
        <span className="brow__sub truncate">{b.pitch}</span>
      </span>
      <span className="brow__bar">
        <ScoreBar value={v} />
      </span>
      <ScoreNum value={v} />
      {right}
    </Link>
  );
});
