import { CheckCircle2, ChevronDown, Clock3, HelpCircle } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ScoreNum } from '../components/ui/Score';
import { STATUS_LABEL } from '../data/taxonomy';
import { BROWSERS } from '../lib/data';
import { detect } from '../lib/detect';
import { useDocTitle } from '../lib/hooks';
import { DEFAULT_WEIGHTS, overall } from '../lib/scoring';
import type { BrowserIndex, OsId, PlatformInfo } from '../lib/types';

type FinderOs = Extract<OsId, 'windows' | 'macos' | 'android' | 'ios'>;

/** Versions are major * 100 + minor, as parsed in the build (Windows: 601 = 7, 603 = 8.1, 1000 = 10). */
const VERSIONS: Record<FinderOs, { value: number; label: string }[]> = {
  windows: [
    { value: 501, label: 'Windows XP' },
    { value: 600, label: 'Windows Vista' },
    { value: 601, label: 'Windows 7' },
    { value: 602, label: 'Windows 8' },
    { value: 603, label: 'Windows 8.1' },
    { value: 1000, label: 'Windows 10' },
    { value: 1100, label: 'Windows 11' },
  ],
  macos: [
    { value: 1009, label: 'OS X 10.9 Mavericks' },
    { value: 1010, label: 'OS X 10.10 Yosemite' },
    { value: 1011, label: 'OS X 10.11 El Capitan' },
    { value: 1012, label: 'macOS 10.12 Sierra' },
    { value: 1013, label: 'macOS 10.13 High Sierra' },
    { value: 1014, label: 'macOS 10.14 Mojave' },
    { value: 1015, label: 'macOS 10.15 Catalina' },
    { value: 1100, label: 'macOS 11 Big Sur' },
    { value: 1200, label: 'macOS 12 Monterey' },
    { value: 1300, label: 'macOS 13 Ventura' },
    { value: 1400, label: 'macOS 14 Sonoma' },
    { value: 1500, label: 'macOS 15 Sequoia' },
    { value: 2600, label: 'macOS 26 Tahoe' },
  ],
  android: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((n) => ({ value: n * 100, label: `Android ${n}` })),
  ios: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 26].map((n) => ({ value: n * 100, label: `iOS ${n}` })),
};

const DEFAULT_VERSION: Record<FinderOs, number> = { windows: 1000, macos: 1200, android: 900, ios: 1500 };
const OS_NAME: Record<FinderOs, string> = { windows: 'Windows', macos: 'macOS', android: 'Android', ios: 'iPhone and iPad' };
const FINDER_OSES = Object.keys(VERSIONS) as FinderOs[];

/** "Windows 10", "macOS 12", "Android 8" for a parsed floor. */
function floorLabel(os: FinderOs, min: number) {
  const exact = VERSIONS[os].find((v) => v.value === min);
  if (exact) return exact.label;
  const major = Math.floor(min / 100);
  const minor = min % 100;
  const base = os === 'windows' ? 'Windows' : os === 'macos' ? 'macOS' : os === 'android' ? 'Android' : 'iOS';
  return `${base} ${major}${minor ? `.${minor}` : ''}`;
}

interface Row {
  b: BrowserIndex;
  p: PlatformInfo;
  score: number;
}

/** A note that explains what happens on older systems ("frozen at v109", "last version"), when the research has one. */
const olderNote = (p: PlatformInfo) => p.notes.find((n) => /frozen|last (version|release|build)|ended|dropped|no longer|legacy/i.test(n));

function RowList({ rows, os, mode }: { rows: Row[]; os: FinderOs; mode: 'runs' | 'newer' | 'unsure' }) {
  return (
    <ul className="panel devlist">
      {rows.map(({ b, p, score }) => (
        <li key={b.id}>
          <Link to={`/browser/${b.id}`} className="devrow">
            <BrowserMark b={b} size={32} />
            <span className="devrow__id">
              <span className="devrow__name">
                {b.name}
                {p.status !== 'active' && <span className="badge">{STATUS_LABEL[p.status]}</span>}
              </span>
              <span className="devrow__sub">
                {mode === 'unsure' ? `Listed as “${p.minOs}”` : `Needs ${floorLabel(os, p.minOsFloor!.min!)} or newer`}
                {mode !== 'runs' && olderNote(p) ? ` · ${olderNote(p)}` : ''}
              </span>
            </span>
            <ScoreNum value={score} size="sm" label="Overall" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Group({ icon, title, count, open, children }: { icon: ReactNode; title: string; count: number; open?: boolean; children: ReactNode }) {
  if (open) {
    return (
      <section className="devgroup" aria-label={title}>
        <h2 className="devgroup__t">
          {icon}
          {title} <span className="badge tnum">{count}</span>
        </h2>
        {children}
      </section>
    );
  }
  return (
    <details className="disclosure devgroup">
      <summary>
        <span className="devgroup__t">
          {icon}
          {title} <span className="badge tnum">{count}</span>
        </span>
        <ChevronDown className="chev" aria-hidden />
      </summary>
      {children}
    </details>
  );
}

export default function DeviceFinder() {
  useDocTitle('Old-device finder');
  const [sp, setSp] = useSearchParams();
  const here = useMemo(detect, []);
  const fromUrl = sp.get('os') as FinderOs | null;
  const os: FinderOs = fromUrl && FINDER_OSES.includes(fromUrl) ? fromUrl : FINDER_OSES.includes(here.os as FinderOs) ? (here.os as FinderOs) : 'windows';
  const asked = Number(sp.get('v'));
  const version = VERSIONS[os].some((v) => v.value === asked) ? asked : DEFAULT_VERSION[os];
  const versionLabel = VERSIONS[os].find((v) => v.value === version)!.label;
  const set = (next: { os?: FinderOs; v?: number }) => {
    const nextOs = next.os ?? os;
    const nextV = next.os ? DEFAULT_VERSION[nextOs] : (next.v ?? version);
    setSp({ os: nextOs, v: String(nextV) }, { replace: true });
  };

  const { runs, newer, unsure } = useMemo(() => {
    const rows: Row[] = BROWSERS.flatMap((b) => {
      const p = b.platforms[os];
      return p && p.status !== 'discontinued' ? [{ b, p, score: overall(b, DEFAULT_WEIGHTS, os) }] : [];
    }).sort((a, z) => z.score - a.score);
    const confirmed = (r: Row) => r.p.minOsFloor?.confirmed && r.p.minOsFloor.min != null;
    return {
      runs: rows.filter((r) => confirmed(r) && r.p.minOsFloor!.min! <= version),
      newer: rows.filter((r) => confirmed(r) && r.p.minOsFloor!.min! > version),
      unsure: rows.filter((r) => !confirmed(r)),
    };
  }, [os, version]);

  const asOf = useMemo(() => {
    const latest = BROWSERS.map((b) => b.lastVerified).sort().at(-1);
    return latest ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(latest)) : null;
  }, []);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Old-device finder</h1>
          <p className="lede">Pick your system and version to see which browsers still install on it.</p>
        </div>
      </div>

      <div className="panel panel-pad devpick">
        <label>
          <span className="small muted">System</span>
          <select className="select" value={os} onChange={(e) => set({ os: e.target.value as FinderOs })}>
            {FINDER_OSES.map((o) => (
              <option key={o} value={o}>
                {OS_NAME[o]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="small muted">Version</span>
          <select className="select" value={version} onChange={(e) => set({ v: Number(e.target.value) })}>
            {VERSIONS[os].map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="status" className="sr-only">
        {runs.length} browsers run on {versionLabel}
      </div>

      <div className="devgroups">
        <Group open icon={<CheckCircle2 aria-hidden />} title={`Runs on ${versionLabel}`} count={runs.length}>
          {runs.length ? (
            <RowList rows={runs} os={os} mode="runs" />
          ) : (
            <p className="panel panel-pad muted">No browser lists {versionLabel} as supported. Check the groups below for newer or unconfirmed requirements.</p>
          )}
        </Group>
        <Group icon={<Clock3 aria-hidden />} title="Needs a newer version" count={newer.length}>
          <RowList rows={newer} os={os} mode="newer" />
        </Group>
        <Group icon={<HelpCircle aria-hidden />} title="Not confirmed" count={unsure.length}>
          <RowList rows={unsure} os={os} mode="unsure" />
        </Group>
      </div>

      <p className="small muted devfoot">
        Based on each browser’s listed minimum system{asOf ? `, as of ${asOf}` : ''}. Not confirmed means our sources don’t say, or they disagree. Check the maker’s site before you install, and note that a browser can run on an old system without still getting security fixes there.
      </p>
    </div>
  );
}
