import { Bot, Container, FileSearch, Globe, KeyRound, Puzzle, RefreshCw, type LucideIcon } from 'lucide-react';
import { GRADE_TONE, heatStep, type Grade, type LayerId } from '../../lib/security';
import { Tip } from './Tip';

export const LAYER_ICON: Record<LayerId, LucideIcon> = {
  isolation: Container,
  patching: RefreshCw,
  web: Globe,
  accounts: KeyRound,
  extensions: Puzzle,
  transparency: FileSearch,
  ai: Bot,
};

/** Letter grade chip for tables and lists. The letter is always printed; colour only reinforces it. */
export function GradeChip({ grade, size = 'md', kind = 'Security' }: { grade: Grade; size?: 'sm' | 'md'; kind?: 'Security' | 'Privacy' }) {
  return (
    <span className={`sec-grade sec-grade--${GRADE_TONE[grade]} sec-grade--${size}`}>
      <span className="sr-only">{kind} grade </span>
      {grade}
    </span>
  );
}

/** A table cell that shows a 0–10 layer score as a heat chip with the number always printed. */
export function HeatCell({ value, label }: { value: number; label: string }) {
  return (
    <td className="sec-heat">
      <span className="sec-heat__chip" data-heat={heatStep(value)} title={`${label}: ${value.toFixed(1)} out of 10`}>
        {value.toFixed(1)}
      </span>
    </td>
  );
}

/** Marks facts that are derived from the engine and profile, not separately verified. */
export function EstimatedBadge({ small }: { small?: boolean }) {
  return (
    <Tip content="Estimated from the engine and this browser’s profile. We haven’t checked its security details separately.">
      <span className={small ? 'badge sec-est sec-est--sm' : 'badge sec-est'}>Estimated</span>
    </Tip>
  );
}
