import { motion } from 'motion/react';
import { TIER_LABEL, fmt, tierOf, tierVar } from '../../lib/scoring';

/** Score number with its tier swatch; the number is always printed (never colour alone). */
export function ScoreNum({ value, size = 'md', label }: { value: number; size?: 'sm' | 'md' | 'lg' | 'xl'; label?: string }) {
  const tier = tierOf(value);
  return (
    <span className={`score-num score-num--${size}`} aria-label={`${label ? label + ': ' : ''}${fmt(value)} out of 10, ${TIER_LABEL[tier]}`}>
      <span className="score-num__dot" style={{ background: tierVar(value) }} aria-hidden />
      <span className="tnum">{fmt(value)}</span>
    </span>
  );
}

export function ScoreBar({ value, max = 10, compact, color, animate = true }: { value: number; max?: number; compact?: boolean; color?: string; animate?: boolean }) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <span className={compact ? 'score-bar score-bar--compact' : 'score-bar'} aria-hidden>
      <motion.span
        className="score-bar__fill"
        style={{ background: color ?? tierVar(value), transformOrigin: 'left center' }}
        initial={animate ? { scaleX: 0 } : false}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      />
    </span>
  );
}

export function ScoreRing({ value, size = 64, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 10));
  return (
    <span className="score-ring" style={{ width: size, height: size }} role="img" aria-label={`${label ?? 'Overall'} ${fmt(value)} out of 10, ${TIER_LABEL[tierOf(value)]}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--score-track)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tierVar(value)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="score-ring__value tnum" style={{ fontSize: size * 0.3 }}>
        {fmt(value)}
      </span>
    </span>
  );
}

export function TierLegend() {
  const tiers: [string, number][] = [
    ['0–3.9', 2],
    ['4–5.9', 5],
    ['6–7.4', 7],
    ['7.5–8.9', 8],
    ['9–10', 9.5],
  ];
  return (
    <ul className="tier-legend" aria-label="Score scale">
      {tiers.map(([range, v]) => (
        <li key={range}>
          <span className="score-num__dot" style={{ background: tierVar(v) }} aria-hidden />
          {TIER_LABEL[tierOf(v)]} <span className="faint tnum">{range}</span>
        </li>
      ))}
    </ul>
  );
}
