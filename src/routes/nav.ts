import {
  Accessibility,
  Activity,
  Award,
  Bookmark,
  BarChart3,
  Bot,
  BookOpen,
  Boxes,
  Brain,
  Cpu,
  EyeOff,
  FlaskConical,
  Gauge,
  GitCompare,
  Grid3x3,
  HardDrive,
  HeartPulse,
  History,
  KeyRound,
  Layers,
  LayoutGrid,
  ListChecks,
  Map as MapIcon,
  Newspaper,
  Puzzle,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Shuffle,
  Siren,
  Skull,
  SlidersHorizontal,
  Smartphone,
  Swords,
  Trophy,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { BROWSERS } from '../lib/data';

export interface NavItem {
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}
export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    id: 'browsers',
    label: 'Browsers',
    items: [
      { to: '/browsers', label: 'All browsers', desc: `${BROWSERS.length} browsers: details, scores, features`, icon: LayoutGrid },
      { to: '/os/windows', label: 'By operating system', desc: 'Windows, macOS, Linux, mobile, ChromeOS', icon: MapIcon },
      { to: '/collections', label: 'Collections', desc: 'Ready-made lists: old PCs, no Chromium', icon: Layers },
      { to: '/android', label: 'Advanced Android', desc: 'Extensions, Google Play, de-Googled picks', icon: Smartphone },
      { to: '/ai', label: 'AI browsers', desc: 'Agentic features, pricing and AI off switches', icon: Bot },
      { to: '/news', label: 'Recently changed', desc: 'Launches, shutdowns and policy changes', icon: Newspaper },
      { to: '/graveyard', label: 'Discounted Browsers', desc: 'Discontinued browsers and replacements', icon: Skull },
      { to: '/shortlist', label: 'Your shortlist', desc: 'Browsers you saved, with your notes', icon: Bookmark },
    ],
  },
  {
    id: 'rank',
    label: 'Rankings',
    items: [
      { to: '/rankings', label: 'Leaderboards', desc: 'Overall, by category, by OS and by persona', icon: Trophy },
      { to: '/rankings/custom', label: 'Build your ranking', desc: 'Weight 40 categories your way', icon: SlidersHorizontal },
      { to: '/tradeoffs', label: 'Trade-off explorer', desc: 'Plot any two categories against each other', icon: Scale },
      { to: '/rankings/bump', label: 'Rank shifts', desc: 'How ranks change from category to category', icon: Activity },
      { to: '/rankings/h2h', label: 'Win matrix', desc: 'Who beats whom across all categories', icon: Waypoints },
      { to: '/rankings/parallel', label: 'Pillar explorer', desc: 'All browsers across the 7 pillars', icon: BarChart3 },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { to: '/quiz', label: 'Quizzes', desc: 'Adaptive quizzes to find your browser', icon: Brain },
      { to: '/compare', label: 'Compare side by side', desc: 'Up to 6 browsers, every score and feature', icon: GitCompare },
      { to: '/vs', label: 'Head to head', desc: 'Two browsers, category by category', icon: Swords },
      { to: '/finder', label: 'Feature finder', desc: 'Pick must-have features, see matches', icon: Search },
      { to: '/extensions', label: 'Extension checker', desc: 'Which browsers run the extensions you need', icon: ListChecks },
      { to: '/switch', label: 'Switch planner', desc: 'What you gain and lose when you switch', icon: Shuffle },
      { to: '/old-device', label: 'Old-device finder', desc: 'Browsers that still install on your OS', icon: HardDrive },
      { to: '/you', label: 'Your browser', desc: 'Detect, test and benchmark this browser', icon: Gauge },
      { to: '/matrix', label: 'Feature matrix', desc: 'Every browser × every feature', icon: Grid3x3 },
      { to: '/tierlist', label: 'Tier list maker', desc: 'Drag browsers into S to D tiers and share', icon: Award },
      { to: '/battle', label: 'Battle bracket', desc: 'A knockout to crown your favourite', icon: Boxes },
    ],
  },
  {
    id: 'guides',
    label: 'Guides',
    items: [
      { to: '/privacy', label: 'Browser privacy', desc: 'Privacy grades, defaults and telemetry', icon: EyeOff },
      { to: '/security', label: 'Browser security', desc: 'Security grades, patching and isolation', icon: ShieldCheck },
      { to: '/security/benchmarks', label: 'Benchmarks & zero-days', desc: 'Security tests, bounties and zero-days', icon: Siren },
      { to: '/accessibility', label: 'Accessibility', desc: 'Screen readers, zoom and keyboard support', icon: Accessibility },
      { to: '/mv2', label: 'Ad blockers & MV2', desc: 'Which browsers keep the full uBlock Origin', icon: Puzzle },
      { to: '/sync', label: 'Sync & passwords', desc: 'Encrypted sync and password managers', icon: KeyRound },
      { to: '/engines', label: 'Browser engines', desc: 'Blink, Gecko, WebKit and the independents', icon: Cpu },
      { to: '/history', label: 'Browser history', desc: 'From 1990 to 2026', icon: History },
      { to: '/learn', label: 'Glossary & myths', desc: 'Fingerprinting, MV3, engines explained', icon: BookOpen },
      { to: '/about', label: 'How we score', desc: 'Categories, evidence types and sources', icon: FlaskConical },
      { to: '/data-health', label: 'Data health', desc: 'How fresh and well-sourced profiles are', icon: HeartPulse },
    ],
  },
];

// Reached from the topbar button, so it stays out of the menus but is still searchable
const SETTINGS_ITEM: NavItem = { to: '/settings', label: 'Settings', desc: 'Theme, platform, backup and restore, and clearing what’s saved here', icon: Settings };

export const ALL_NAV_ITEMS = [...NAV.flatMap((g) => g.items), SETTINGS_ITEM];
