import { ArrowUpRight, Skull } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BROWSERS, getBrowser } from '../lib/data';
import { STORE_LABEL, ENGINE_BY_ID } from '../data/taxonomy';
import { DEFAULT_WEIGHTS, overall } from '../lib/scoring';
import type { BrowserIndex, Mv2Level } from '../lib/types';
import { useDocTitle, useParam } from '../lib/hooks';
import { BrowserMark } from '../components/ui/BrowserMark';
import { ScoreNum } from '../components/ui/Score';
import { EngineBadge, MV2_HELP, MV2_LABEL, PrivacyGrade } from '../components/ui/Facts';
import { SupportMark } from './BrowserDetail';
import { NEWS, type NewsKind } from '../data/news';
import { FEATURE_INDEX, SUPPORT_CODES } from '../data/taxonomy';

const live = () => BROWSERS.filter((b) => b.status !== 'discontinued');
const byScore = (a: BrowserIndex, b: BrowserIndex) => overall(b) - overall(a);

function BName({ b }: { b: BrowserIndex }) {
  return (
    <Link to={`/browser/${b.id}`} className="row nowrap" style={{ flexWrap: 'nowrap' }}>
      <BrowserMark b={b} size={24} />
      <span>{b.name}</span>
    </Link>
  );
}

/* =========================== MV2 tracker =========================== */

const MV2_TIMELINE = [
  { date: '2025-07', text: 'Chrome 138 disables Manifest V2 extensions on the stable channel; an enterprise policy keeps them alive.' },
  { date: '2026-06-30', text: 'Chrome 150 removes the ExtensionManifestV2Disabled workaround.' },
  { date: '2026-07-28', text: 'Chrome 151 removes the last MV2 flags.' },
  { date: '2026-08-07', text: 'Microsoft starts retiring MV2 in Edge for consumers; done by the end of 2026, enterprises from early 2027.' },
  { date: '2026-08-31', text: 'Google removes uBlock Origin and other MV2 extensions from the Chrome Web Store.' },
  { date: '2026-10', text: 'Firefox reaffirms that uBlock Origin support “is not going anywhere”. Brave keeps self-hosting uBO, AdGuard, uMatrix and NoScript. Opera keeps MV2 “for as long as technically reasonable”.' },
];

export function Mv2Tracker() {
  useDocTitle('Ad blockers & Manifest V2');
  const tiers: Mv2Level[] = ['full', 'partial', 'temporary', 'mv3-only', 'no-extensions', 'none'];
  const groups = tiers.map((t) => ({ t, list: live().filter((b) => b.keyFacts.mv2.level === t).sort(byScore) })).filter((g) => g.list.length);
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Ad blockers & Manifest V2</h1>
          <p className="lede">Chrome has removed Manifest V2, the extension system the full uBlock Origin needs. Here’s where it still works.</p>
        </div>
      </div>
      <div className="mv2-tiers">
        {groups.map((g) => (
          <section key={g.t} className={`panel mv2-tier mv2-tier--${g.t}`} aria-labelledby={`mv2-${g.t}`}>
            <div className="mv2-tier__head">
              <h2 id={`mv2-${g.t}`}>{MV2_LABEL[g.t]}</h2>
              <span className="badge tnum">{g.list.length}</span>
            </div>
            <p className="small muted">{MV2_HELP[g.t]}</p>
            <ul className="mv2-list">
              {g.list.map((b) => (
                <li key={b.id}>
                  <BName b={b} />
                  {b.keyFacts.mv2.note && <span className="xs faint">{b.keyFacts.mv2.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="section">
        <div className="section-head">
          <h2>How we got here</h2>
        </div>
        <ol className="timeline">
          {MV2_TIMELINE.map((t) => (
            <li key={t.date}>
              <time className="tnum">{t.date}</time>
              <p>{t.text}</p>
            </li>
          ))}
        </ol>
        <p className="small muted" style={{ marginTop: 'var(--s-4)' }}>
          Sources:{' '}
          <a className="link" href="https://betanews.com/article/firefox-brave-ublock-origin-chrome-edge/" target="_blank" rel="noreferrer">
            BetaNews
          </a>
          ,{' '}
          <a className="link" href="https://www.neowin.net/news/firefox-gives-latest-update-on-ublock-origin-support-as-chrome-and-microsoft-edge-end-it/" target="_blank" rel="noreferrer">
            Neowin
          </a>
          ,{' '}
          <a className="link" href="https://www.ghacks.net/2026/06/16/google-to-end-manifest-v2-support-in-chrome-disabling-ublock-origin-and-other-ad-blockers/" target="_blank" rel="noreferrer">
            gHacks
          </a>
          .
        </p>
      </section>
    </div>
  );
}

/* =========================== Sync & passwords =========================== */

export function SyncGuide() {
  useDocTitle('Sync & passwords');
  const rows = live()
    .filter((b) => b.keyFacts.sync.type !== 'none' || b.keyFacts.passwordManager.level !== 'none')
    .sort((a, b) => {
      const rank = (x: BrowserIndex) => (x.keyFacts.sync.type === 'e2ee' || x.keyFacts.sync.type === 'self-hostable' ? 2 : x.keyFacts.sync.type === 'account' ? 1 : 0) + (x.keyFacts.sync.crossOs ? 1 : 0);
      return rank(b) - rank(a) || byScore(a, b);
    });
  const items = ['bookmarks', 'passwords', 'history', 'tabs', 'extensions', 'settings'];
  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Sync & passwords</h1>
          <p className="lede">Which browsers keep your data in step across devices, whether it’s end-to-end encrypted, and how good the built-in password manager is.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table table--hover">
          <thead>
            <tr>
              <th scope="col">Browser</th>
              <th scope="col">Sync</th>
              {items.map((i) => (
                <th key={i} scope="col" style={{ textTransform: 'capitalize' }}>
                  {i}
                </th>
              ))}
              <th scope="col">All OSes</th>
              <th scope="col">Passwords</th>
              <th scope="col">Passkeys</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const s = b.keyFacts.sync;
              const p = b.keyFacts.passwordManager;
              return (
                <tr key={b.id}>
                  <th scope="row">
                    <BName b={b} />
                  </th>
                  <td>
                    <span className={`fact fact--sm ${s.type === 'e2ee' || s.type === 'self-hostable' ? 'fact--positive' : s.type === 'none' ? 'fact--off' : ''}`}>{{ none: 'None', 'local-only': 'Local only', account: 'Account', e2ee: 'Encrypted', 'self-hostable': 'Self-host' }[s.type]}</span>
                  </td>
                  {items.map((i) => (
                    <td key={i}>
                      <SupportMark s={s.items.some((x) => x.toLowerCase().includes(i.slice(0, 5))) ? 'yes' : 'no'} />
                    </td>
                  ))}
                  <td>
                    <SupportMark s={s.crossOs ? 'yes' : 'no'} />
                  </td>
                  <td>{p.level === 'none' ? <span className="faint">None</span> : p.level === 'full' ? 'Full' : 'Basic'}</td>
                  <td>
                    <SupportMark s={p.passkeys ? 'yes' : 'no'} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================== Android hub =========================== */

export function AndroidHub() {
  useDocTitle('Advanced Android browsers');
  const [play, setPlay] = useParam('play');
  const list = useMemo(
    () =>
      BROWSERS.filter((b) => b.platforms.android && b.status !== 'discontinued')
        .filter((b) => (play === 'yes' ? b.platforms.android!.stores.includes('google-play') : play === 'no' ? !b.platforms.android!.stores.includes('google-play') : true))
        .sort((a, b) => overall(b, DEFAULT_WEIGHTS, 'android') - overall(a, DEFAULT_WEIGHTS, 'android')),
    [play],
  );
  const extLabel = { none: 'None', 'own-store': 'Own store', 'chrome-web-store': 'Chrome Web Store', 'firefox-addons': 'Firefox add-ons', 'crx-sideload': 'CRX files', 'n/a': '—' } as const;
  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>Advanced Android browsers</h1>
          <p className="lede">Extensions, full uBlock Origin, de-Googled builds, and where to install each one: Google Play, F-Droid or GitHub.</p>
        </div>
        <div className="seg" role="group" aria-label="Google Play">
          {[
            ['', 'All'],
            ['yes', 'On Google Play'],
            ['no', 'Not on Google Play'],
          ].map(([v, l]) => (
            <button key={v} aria-pressed={(play ?? '') === v} onClick={() => setPlay(v || null)}>
              <span>{l}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table className="table table--hover">
          <thead>
            <tr>
              <th scope="col">Browser</th>
              <th scope="col" className="num">
                Android score
              </th>
              <th scope="col">Engine</th>
              <th scope="col">Extensions</th>
              <th scope="col">Full uBO</th>
              <th scope="col">Privacy</th>
              <th scope="col">Where to get it</th>
              <th scope="col">Min. Android</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => {
              const p = b.platforms.android!;
              const ubo = b.features[FEATURE_INDEX.uboFull]?.[0] ?? 0;
              return (
                <tr key={b.id}>
                  <th scope="row">
                    <BName b={b} />
                  </th>
                  <td className="num">
                    <ScoreNum value={overall(b, DEFAULT_WEIGHTS, 'android')} size="sm" />
                  </td>
                  <td>
                    <EngineBadge engine={p.engine ?? b.engine} small />
                  </td>
                  <td>{extLabel[b.keyFacts.mobileExtensions.android]}</td>
                  <td>
                    <SupportMark s={SUPPORT_CODES[ubo]} />
                  </td>
                  <td>
                    <PrivacyGrade grade={b.keyFacts.privacyGrade} small />
                  </td>
                  <td>
                    <span className="row" style={{ gap: 4 }}>
                      {p.stores.map((s) => (
                        <span key={s} className={`fact fact--sm ${s === 'google-play' ? 'fact--accent' : ''}`}>
                          {STORE_LABEL[s]}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="small">{p.minOs ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================== AI hub =========================== */

export function AiHub() {
  useDocTitle('AI browsers');
  const order = { agentic: 0, 'on-by-default': 1, 'opt-in': 2, none: 3 } as const;
  const list = BROWSERS.filter((b) => b.group === 'ai' || b.keyFacts.ai.level !== 'none').sort((a, b) => order[a.keyFacts.ai.level] - order[b.keyFacts.ai.level] || byScore(a, b));
  const antiAi = live().filter((b) => b.keyFacts.ai.level === 'none').sort(byScore).slice(0, 12);
  const f = (b: BrowserIndex, id: string) => SUPPORT_CODES[b.features[FEATURE_INDEX[id]]?.[0] ?? 0];
  return (
    <div className="container container--wide page">
      <div className="page-head">
        <div>
          <h1>AI browsers</h1>
          <p className="lede">Assistants, page summaries and agents that act for you, plus who lets you switch it all off.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table table--hover">
          <thead>
            <tr>
              <th scope="col">Browser</th>
              <th scope="col">AI level</th>
              <th scope="col">Assistant</th>
              <th scope="col">Summaries</th>
              <th scope="col">Agents</th>
              <th scope="col">On-device</th>
              <th scope="col">Off switch</th>
              <th scope="col">Price</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id}>
                <th scope="row">
                  <BName b={b} />
                </th>
                <td>{{ none: 'None', 'opt-in': 'Opt-in', 'on-by-default': 'On by default', agentic: 'Agentic' }[b.keyFacts.ai.level]}</td>
                {['aiAssistant', 'aiSummarizer', 'agenticBrowsing', 'localAi', 'aiKillSwitch'].map((id) => (
                  <td key={id}>
                    <SupportMark s={f(b, id)} />
                  </td>
                ))}
                <td className="small">{b.price === 'free' ? 'Free' : b.price === 'freemium' ? 'Free + paid' : 'Paid'}</td>
                <td className="small">{b.status === 'active' ? 'Active' : b.statusNote || b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Prefer no AI at all?</h2>
          <p>These ship without AI features.</p>
        </div>
        <div className="row">
          {antiAi.map((b) => (
            <Link key={b.id} to={`/browser/${b.id}`} className="chip">
              <BrowserMark b={b} size={18} flat />
              {b.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =========================== News =========================== */

export function News() {
  useDocTitle('Recently changed');
  const [kind, setKind] = useParam('kind');
  const kinds: NewsKind[] = ['Launch', 'Shutdown', 'Policy', 'AI', 'Platform', 'Feature'];
  const items = NEWS.filter((n) => !kind || n.kind === kind);
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Recently changed</h1>
          <p className="lede">Launches, shutdowns and policy changes from 2025 and 2026, each with its source.</p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 'var(--s-6)' }}>
        <button className="chip" aria-pressed={!kind} onClick={() => setKind(null)}>
          All
        </button>
        {kinds.map((k) => (
          <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k}
          </button>
        ))}
      </div>
      <ol className="news">
        {items.map((n) => (
          <li key={n.date + n.title} className="panel news__item">
            <div className="news__meta">
              <time className="tnum small muted">{n.date}</time>
              <span className={`badge badge--${n.tone}`}>{n.kind}</span>
            </div>
            <h2 className="news__title">{n.title}</h2>
            <p className="muted">{n.detail}</p>
            <div className="row">
              {n.browsers
                .map((id) => getBrowser(id))
                .filter(Boolean)
                .map((b) => (
                  <Link key={b!.id} to={`/browser/${b!.id}`} className="chip">
                    <BrowserMark b={b!} size={18} flat />
                    {b!.name}
                  </Link>
                ))}
              <a className="link small" href={n.source.url} target="_blank" rel="noreferrer">
                {n.source.title} <ArrowUpRight aria-hidden style={{ display: 'inline', width: 12, height: 12 }} />
              </a>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* =========================== Graveyard =========================== */

const REPLACED_BY: Record<string, string[]> = {
  arc: ['dia', 'zen', 'crest', 'ardia', 'helium'],
  kiwi: ['edge', 'titanium', 'bare', 'quetta'],
  bromite: ['cromite'],
  mull: ['ironfox'],
  'chatgpt-atlas': ['comet', 'dia', 'opera-neon'],
  'internet-explorer': ['edge'],
  'edge-legacy': ['edge'],
  netscape: ['firefox'],
  sidekick: ['vivaldi', 'zen'],
  fellou: ['comet', 'genspark'],
};

export function Graveyard() {
  useDocTitle('Discounted Browsers');
  const list = BROWSERS.filter((b) => b.status === 'discontinued' || b.status === 'sunsetting').sort((a, b) => (b.version.date || String(b.releaseYear)).localeCompare(a.version.date || String(a.releaseYear)));
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Discounted Browsers</h1>
          <p className="lede">Browsers that ended, or are ending, and what their users moved to.</p>
        </div>
      </div>
      <div className="grid grid-2">
        {list.map((b) => (
          <div key={b.id} className="panel panel-pad grave">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <BrowserMark b={b} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/browser/${b.id}`}>
                  <h2 className="h-sm" style={{ margin: 0 }}>
                    {b.name}
                  </h2>
                </Link>
                <p className="xs muted">
                  {b.releaseYear || '?'} – {b.status === 'sunsetting' ? 'ending soon' : b.version.date?.slice(0, 4) || '?'} · {ENGINE_BY_ID[b.engine].name}
                </p>
              </div>
              {b.status === 'sunsetting' ? <span className="badge badge--warning">Shutting down</span> : <Skull aria-label="Discontinued" style={{ width: 18, height: 18, color: 'var(--text-3)' }} />}
            </div>
            <p className="small">{b.statusNote || b.pitch}</p>
            {REPLACED_BY[b.id] && (
              <div className="row">
                <span className="xs muted">Moved to</span>
                {REPLACED_BY[b.id]
                  .map(getBrowser)
                  .filter(Boolean)
                  .map((x) => (
                    <Link key={x!.id} to={`/browser/${x!.id}`} className="chip">
                      <BrowserMark b={x!} size={16} flat />
                      {x!.name}
                    </Link>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
