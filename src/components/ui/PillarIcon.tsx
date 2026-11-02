import { BadgeCheck, Battery, Blocks, Gauge, Shield, SlidersHorizontal, Wrench, type LucideIcon } from 'lucide-react';
import type { PillarId } from '../../lib/types';

export const PILLAR_ICON: Record<PillarId, LucideIcon> = {
  speed: Gauge,
  efficiency: Battery,
  privacy: Shield,
  customization: SlidersHorizontal,
  features: Wrench,
  ecosystem: Blocks,
  values: BadgeCheck,
};
