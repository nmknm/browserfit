import { useState } from 'react';
import type { BrowserIndex } from '../../lib/types';
import iconData from '../../data/generated/icons.json';

type Glyph = { path: string; hex: string };
type IconEntry = ({ kind: 'svg' } & Glyph) | { kind: 'img'; file: string; invert?: boolean; glyph?: Glyph };
const ICONS = iconData as Record<string, IconEntry>;

function initials(name: string) {
  const clean = name.replace(/\(.*?\)/g, '').replace(/browser/i, '').trim();
  const parts = clean.split(/[\s\-_.]+/).filter(Boolean);
  if (parts.length >= 2 && parts[0].length <= 3 && /^\d/.test(parts[0])) return parts[0].slice(0, 2);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const w = parts[0] ?? name;
  return (w[0].toUpperCase() + (w[1] ?? '').toLowerCase()).trim();
}

/**
 * The browser's icon: its logo where we have one (vector glyph from simple-icons, or the icon its own
 * site declares), otherwise a typographic monogram in the browser's identity hue.
 * `flat` (used inside chips) drops the tile and padding: the solid-colour vector glyph where we have one, else the original icon.
 */
export function BrowserMark({ b, size = 32, flat = false }: { b: Pick<BrowserIndex, 'id' | 'name' | 'color' | 'status'>; size?: number; flat?: boolean }) {
  const dead = b.status === 'discontinued';
  const icon = ICONS[b.id];
  const [broken, setBroken] = useState(false);
  const radius = Math.round(size * (flat ? 0.44 : 0.36));

  const cls = `bmark${flat ? ' bmark--flat' : ''}${dead ? ' bmark--dead' : ''}`;
  const base = { width: size, height: size, borderRadius: radius } as const;

  const glyph = icon?.kind === 'svg' ? icon : icon?.glyph;
  if (flat && glyph) {
    return (
      <span className={cls} aria-hidden style={{ width: size, height: size, borderRadius: Math.round(size * 0.34), overflow: 'hidden', ['--mark-c' as string]: glyph.hex }}>
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
          <path d={glyph.path} />
        </svg>
      </span>
    );
  }

  if (icon?.kind === 'img' && !broken) {
    return (
      <span
        className={`${cls} bmark--img${icon.invert ? ' bmark--invert' : ''}`}
        aria-hidden
        style={{ ...base, padding: flat ? 0 : Math.round(size * 0.12), ['--mark-c' as string]: b.color }}
      >
        <img src={`${import.meta.env.BASE_URL}icons/${icon.file}`} alt="" width={size} height={size} loading="lazy" decoding="async" style={{ borderRadius: Math.round(size * (flat ? 0.34 : 0.26)) }} onError={() => setBroken(true)} />
      </span>
    );
  }

  return (
    <span className={`bmark${dead ? ' bmark--dead' : ''}`} aria-hidden style={{ ...base, fontSize: size * (flat ? 0.56 : 0.38), ['--mark-c' as string]: icon?.kind === 'svg' ? icon.hex : b.color }}>
      {icon?.kind === 'svg' ? (
        <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="currentColor">
          <path d={icon.path} />
        </svg>
      ) : (
        initials(b.name)
      )}
    </span>
  );
}
