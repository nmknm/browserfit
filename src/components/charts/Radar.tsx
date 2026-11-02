import { motion } from 'motion/react';
import { useState } from 'react';
import { fmt } from '../../lib/scoring';

export interface RadarSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
}

/**
 * Radar (spider) chart, 0–10 scale. Up to 3 overlaid series (dataviz all-pairs cap).
 * Hover/focus an axis to read every series' value; a table view is provided by the caller.
 */
export function Radar({ axes, series, size = 320, label }: { axes: string[]; series: RadarSeries[]; size?: number; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const pad = 56;
  const c = size / 2;
  const r = c - pad;
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => [c + Math.cos(angle(i)) * r * (v / 10), c + Math.sin(angle(i)) * r * (v / 10)] as const;
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).join(',')).join(' ');

  return (
    <figure className="radar" aria-label={label}>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        {[2, 4, 6, 8, 10].map((g) => (
          <polygon key={g} points={poly(Array(n).fill(g))} fill="none" stroke="var(--viz-grid)" strokeWidth={g === 10 ? 1.25 : 1} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, 10);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--viz-grid)" />;
        })}
        {series.map((s) => (
          <motion.polygon
            key={s.id}
            initial={false}
            animate={{ points: poly(s.values) }}
            transition={{ duration: 0.45, ease: [0.77, 0, 0.175, 1] }}
            fill={s.color}
            fillOpacity={series.length > 1 ? 0.1 : 0.16}
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {series.map((s) =>
          s.values.map((v, i) => {
            const [x, y] = pt(i, v);
            return <motion.circle key={s.id + i} initial={false} animate={{ cx: x, cy: y }} transition={{ duration: 0.45, ease: [0.77, 0, 0.175, 1] }} r={hover === i ? 4.5 : 3} fill={s.color} stroke="var(--surface)" strokeWidth={2} />;
          }),
        )}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 12.4);
          const anchor = Math.abs(x - c) < 4 ? 'middle' : x > c ? 'start' : 'end';
          return (
            <g
              key={a}
              tabIndex={0}
              role="button"
              aria-label={`${a}: ${series.map((s) => `${s.label} ${fmt(s.values[i])}`).join(', ')}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="radar__axis"
            >
              <circle cx={x} cy={y} r={22} fill="transparent" />
              <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fill={hover === i ? 'var(--text)' : 'var(--text-2)'} fontSize="11.5" fontWeight={hover === i ? 600 : 500}>
                {a}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <figcaption className="radar__read" aria-hidden>
          <strong>{axes[hover]}</strong>
          {series.map((s) => (
            <span key={s.id}>
              <i style={{ background: s.color }} />
              {s.label} <b className="tnum">{fmt(s.values[hover])}</b>
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
