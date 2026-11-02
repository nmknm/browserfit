import { CircleSlash, KeyRound, Puzzle, RefreshCw, Shield, ShieldCheck, Sparkles, Store } from 'lucide-react';
import type { BrowserIndex, EngineId, Mv2Level, OsId, PwLevel, SyncType } from '../../lib/types';
import { ENGINE_BY_ID, STORE_LABEL, STATUS_LABEL } from '../../data/taxonomy';
import { Tip } from './Tip';
import { engineOn } from '../../lib/data';
import { securityFor } from '../../lib/security';

export function EngineBadge({ engine, small }: { engine: EngineId; small?: boolean }) {
  const e = ENGINE_BY_ID[engine];
  return (
    <Tip content={`${e.name} engine · ${e.owner}`}>
      <span className={small ? 'fact fact--sm' : 'fact'}>
        <span className="engine-dot" style={{ background: `var(${e.colorVar})` }} aria-hidden />
        {e.name}
      </span>
    </Tip>
  );
}

const GRADE_TONE: Record<string, string> = { A: 'positive', B: 'positive', C: 'neutral', D: 'warning', E: 'negative', F: 'negative' };
export function PrivacyGrade({ grade, small }: { grade: string; small?: boolean }) {
  return (
    <Tip content={`Privacy grade ${grade}: from defaults, blocking, fingerprinting, telemetry and business model.`}>
      <span className={`fact fact--${GRADE_TONE[grade]} ${small ? 'fact--sm' : ''}`}>
        <Shield aria-hidden />
        Privacy {grade}
      </span>
    </Tip>
  );
}

/** Security grade badge: a computed, editorial grade from seven layers of protection. */
export function SecurityGrade({ b, os, small }: { b: BrowserIndex; os?: OsId | null; small?: boolean }) {
  const r = securityFor(b, os);
  return (
    <Tip content={`Security grade ${r.grade} (${r.score.toFixed(1)} out of 10): seven layers of protection.${r.estimated ? ' Estimated from the engine and this profile.' : ''}`}>
      <span className={`fact fact--${GRADE_TONE[r.grade]} ${small ? 'fact--sm' : ''}`}>
        <ShieldCheck aria-hidden />
        Security {r.grade}
      </span>
    </Tip>
  );
}

const SYNC_LABEL: Record<SyncType, string> = {
  none: 'No sync',
  'local-only': 'Local only',
  account: 'Sync',
  e2ee: 'Encrypted sync',
  'self-hostable': 'Self-host sync',
};
export function SyncBadge({ b, small }: { b: BrowserIndex; small?: boolean }) {
  const s = b.keyFacts.sync;
  const none = s.type === 'none' || s.type === 'local-only';
  return (
    <Tip content={none ? 'No built-in sync between devices.' : `Syncs ${s.items.join(', ') || 'data'}${s.crossOs ? ' across operating systems' : ''}. ${s.note ?? ''}`}>
      <span className={`fact ${none ? 'fact--off' : s.type === 'e2ee' || s.type === 'self-hostable' ? 'fact--positive' : ''} ${small ? 'fact--sm' : ''}`}>
        {none ? <CircleSlash aria-hidden /> : <RefreshCw aria-hidden />}
        {SYNC_LABEL[s.type]}
      </span>
    </Tip>
  );
}

const PW_LABEL: Record<PwLevel, string> = { none: 'No passwords', basic: 'Basic passwords', full: 'Password manager' };
export function PasswordBadge({ b, small }: { b: BrowserIndex; small?: boolean }) {
  const p = b.keyFacts.passwordManager;
  return (
    <Tip content={p.level === 'none' ? 'No built-in password manager.' : `${PW_LABEL[p.level]}${p.passkeys ? ' · passkeys' : ''}${p.breachCheck ? ' · breach alerts' : ''}`}>
      <span className={`fact ${p.level === 'none' ? 'fact--off' : ''} ${small ? 'fact--sm' : ''}`}>
        <KeyRound aria-hidden />
        {p.level === 'full' && p.passkeys ? 'Passwords + passkeys' : PW_LABEL[p.level]}
      </span>
    </Tip>
  );
}

export const MV2_LABEL: Record<Mv2Level, string> = {
  full: 'Full MV2',
  partial: 'Partial MV2',
  temporary: 'MV2 for now',
  'mv3-only': 'MV3 only',
  none: 'No MV2',
  'no-extensions': 'No extensions',
};
export const MV2_HELP: Record<Mv2Level, string> = {
  full: 'Runs any Manifest V2 extension, including the full uBlock Origin.',
  partial: 'Runs a curated set of MV2 extensions only.',
  temporary: 'MV2 still works, but removal has been announced.',
  'mv3-only': 'Only Manifest V3 extensions; uBlock Origin Lite instead of the full version.',
  none: 'No Manifest V2 support.',
  'no-extensions': 'Does not support extensions.',
};
const MV2_TONE: Record<Mv2Level, string> = { full: 'positive', partial: 'neutral', temporary: 'warning', 'mv3-only': 'warning', none: 'negative', 'no-extensions': 'off' };
export function Mv2Badge({ b, small }: { b: BrowserIndex; small?: boolean }) {
  const m = b.keyFacts.mv2;
  return (
    <Tip content={`${MV2_HELP[m.level]}${m.note ? ' ' + m.note : ''}`}>
      <span className={`fact fact--${MV2_TONE[m.level]} ${small ? 'fact--sm' : ''}`}>
        <Puzzle aria-hidden />
        {MV2_LABEL[m.level]}
      </span>
    </Tip>
  );
}

const AI_LABEL = { none: 'No AI', 'opt-in': 'AI opt-in', 'on-by-default': 'AI on', agentic: 'AI agents' };
export function AiBadge({ b, small }: { b: BrowserIndex; small?: boolean }) {
  const a = b.keyFacts.ai;
  return (
    <Tip content={a.level === 'none' ? 'No AI features.' : `${AI_LABEL[a.level]}${a.killSwitch ? ' · one switch turns it off' : ''}${a.note ? ' · ' + a.note : ''}`}>
      <span className={`fact ${a.level === 'none' ? 'fact--off' : ''} ${small ? 'fact--sm' : ''}`}>
        <Sparkles aria-hidden />
        {AI_LABEL[a.level]}
      </span>
    </Tip>
  );
}

export function StoreBadges({ b, os, max = 4 }: { b: BrowserIndex; os: OsId; max?: number }) {
  const p = b.platforms[os];
  if (!p) return null;
  const stores = p.stores.slice(0, max);
  return (
    <span className="row" style={{ gap: 4 }}>
      {stores.map((s) => (
        <span key={s} className={`fact fact--sm ${s === 'google-play' || s === 'app-store' ? 'fact--accent' : ''}`}>
          <Store aria-hidden />
          {STORE_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

export function StatusBadge({ b }: { b: Pick<BrowserIndex, 'status' | 'statusNote'> }) {
  if (b.status === 'active') return null;
  const tone = b.status === 'discontinued' ? 'negative' : b.status === 'sunsetting' ? 'warning' : 'accent';
  return (
    <Tip content={b.statusNote || STATUS_LABEL[b.status]}>
      <span className={`badge badge--${tone}`}>{STATUS_LABEL[b.status]}</span>
    </Tip>
  );
}

export function ConfidenceBadge({ level }: { level: string }) {
  if (level === 'high') return null;
  return (
    <Tip content={level === 'low' ? 'Thin public information: some facts could not be verified.' : 'Some facts rely on a single source.'}>
      <span className="badge">{level === 'low' ? 'Low confidence' : 'Medium confidence'}</span>
    </Tip>
  );
}

/** The key-facts strip shown on every card, row and detail header. */
export function FactsStrip({ b, os, small, showStores, showSecurity }: { b: BrowserIndex; os?: OsId | null; small?: boolean; showStores?: boolean; showSecurity?: boolean }) {
  return (
    <div className="facts" aria-label="Key facts">
      <EngineBadge engine={engineOn(b, os)} small={small} />
      <PrivacyGrade grade={b.keyFacts.privacyGrade} small={small} />
      {showSecurity && <SecurityGrade b={b} os={os} small={small} />}
      <SyncBadge b={b} small={small} />
      <PasswordBadge b={b} small={small} />
      <Mv2Badge b={b} small={small} />
      {!small && <AiBadge b={b} small={small} />}
      {showStores && os && <StoreBadges b={b} os={os} />}
    </div>
  );
}
