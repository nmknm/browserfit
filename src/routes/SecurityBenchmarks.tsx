import { ExternalLink } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFlip } from '../lib/motion';
import { Link } from 'react-router-dom';
import { BENCHMARKS, BOUNTIES, EXPLOITED_BUGS, FAMILY_LABEL, FAMILY_WHO, KEV_SOURCE, KEV_VERSION, type ExploitedBug } from '../data/securityFacts';
import { useDocTitle } from '../lib/hooks';

const FAMILIES: ExploitedBug['family'][] = ['chromium', 'webkit', 'gecko', 'edge'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
// The timeline runs 1 Jan to 31 Oct 2026 (the catalog was read on 30 Oct).
const START = Date.UTC(2026, 0, 1);
const SPAN = Date.UTC(2026, 10, 1) - START;
const pos = (iso: string) => ((Date.parse(iso) - START) / SPAN) * 100;

const fmtDate = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="link" href={href} target="_blank" rel="noreferrer noopener">
      {children}
      <ExternalLink aria-hidden className="sec-ext" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Timeline({ bugs, active, onActive }: { bugs: ExploitedBug[]; active: string | null; onActive: (cve: string | null) => void }) {
  return (
    <div className="sec-timeline" role="group" aria-label="Timeline of exploited browser bugs added to the CISA catalog in 2026. The table below lists the same entries.">
      <div className="sec-timeline__axis" aria-hidden>
        {MONTHS.map((m, i) => (
          <span key={m} style={{ insetInlineStart: `${(Date.UTC(2026, i, 1) - START) / SPAN * 100}%` }}>
            {m}
          </span>
        ))}
      </div>
      {FAMILIES.map((f) => {
        const items = bugs.filter((b) => b.family === f).sort((a, z) => a.added.localeCompare(z.added));
        let level = 0;
        let prev = -100;
        return (
          <div key={f} className="sec-lane">
            <div className="sec-lane__label">
              <strong>{FAMILY_LABEL[f]}</strong>
              <span className="xs faint">{items.length ? `${items.length} added` : 'None added'}</span>
            </div>
            <div className="sec-lane__track">
              {items.map((b) => {
                const x = pos(b.added);
                level = x - prev < 3 ? level + 1 : 0;
                prev = x;
                return (
                  <button
                    key={b.cve}
                    type="button"
                    className="sec-dot"
                    style={{ insetInlineStart: `${x}%`, insetBlockStart: `${0.75 + level * 0.9}rem` }}
                    aria-pressed={active === b.cve}
                    aria-label={`${b.cve}, ${b.component}, added ${fmtDate(b.added)}`}
                    onMouseEnter={() => onActive(b.cve)}
                    onFocus={() => onActive(b.cve)}
                    onClick={() => onActive(active === b.cve ? null : b.cve)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SecurityBenchmarks() {
  useDocTitle('Benchmarks and zero-days');
  const [fam, setFam] = useState<ExploitedBug['family'] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const bugs = EXPLOITED_BUGS.filter((b) => !fam || b.family === fam);
  const table = [...bugs].sort((a, z) => z.added.localeCompare(a.added) || a.cve.localeCompare(z.cve));
  const kevTable = useRef<HTMLDivElement>(null);
  useFlip(kevTable, table.map((b) => b.cve).join(), true); // the engine-family chips filter this table
  const sel = EXPLOITED_BUGS.find((b) => b.cve === active) ?? null;
  const counts = Object.fromEntries(FAMILIES.map((f) => [f, EXPLOITED_BUGS.filter((b) => b.family === f).length])) as Record<ExploitedBug['family'], number>;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Benchmarks and zero-days</h1>
          <p className="lede">Other people’s browser security tests, the bug-bounty programs behind them, and the browser bugs known to be exploited in 2026. Browserfit runs none of these tests.</p>
        </div>
        <Link to="/security" className="btn">
          See the security grades
        </Link>
      </div>

      <div className="callout sec-read">
        <p>
          <strong>Read this first.</strong>
        </p>
        <ul>
          <li>These are other people’s tests. We cite them and say what each one measures.</li>
          <li>A count of bugs is not a safety ranking. Popular, well-studied browsers have more bugs found and fixed.</li>
          <li>Every figure links to the page we read it on, with the date we read it.</li>
        </ul>
      </div>

      <section className="section" aria-labelledby="bench-h">
        <div className="section-head">
          <div>
            <h2 id="bench-h">Public tests and feeds</h2>
            <p>Where to check a claim yourself.</p>
          </div>
        </div>
        <ul className="sec-benchlist">
          {BENCHMARKS.map((b) => (
            <li key={b.id} className="panel panel-pad sec-bench">
              <div className="sec-bench__head">
                <h3>{b.name}</h3>
                <span className="badge sec-est">Not run by Browserfit</span>
              </div>
              <p className="small muted">{b.publisher}</p>
              <p>{b.measures}</p>
              <p className="small">{b.finding}</p>
              <ul className="row sec-bench__cov" aria-label="Coverage">
                {b.coverage.map((c) => (
                  <li key={c} className="chip">
                    {c}
                  </li>
                ))}
              </ul>
              <p className="xs faint">
                <strong>Limits:</strong> {b.caveat}
              </p>
              <p className="xs faint">
                {b.updated ? `Updated by the publisher ${fmtDate(b.updated)}. ` : ''}Read {fmtDate(b.source.accessed)}.
              </p>
              <Ext href={b.source.url}>Open {b.name}</Ext>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="bounty-h">
        <div className="section-head">
          <div>
            <h2 id="bounty-h">Bug-bounty programs</h2>
            <p>What each vendor pays researchers who report serious bugs privately. Higher payouts signal effort, not safety.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Bug-bounty programs, with the maximum payout each publishes</caption>
            <thead>
              <tr>
                <th scope="col">Program</th>
                <th scope="col">Scope</th>
                <th scope="col">What it pays</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {[...BOUNTIES]
                .sort((a, z) => z.max - a.max)
                .map((b) => (
                  <tr key={b.id}>
                    <th scope="row">{b.program}</th>
                    <td>{b.scope}</td>
                    <td>
                      <span className="sec-pay">{b.headline}</span>
                      <span className="xs faint sec-pay__max">Top figure {money.format(b.max)}.</span>
                      {b.note && <span className="xs faint sec-pay__max">{b.note}</span>}
                    </td>
                    <td className="nowrap">
                      <Ext href={b.source.url}>Read it</Ext>
                      <span className="xs faint sec-pay__max">Read {fmtDate(b.source.accessed)}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="xs faint sec-note">Other browsers publish programs too. We list only the ones whose pages we could read and confirm.</p>
      </section>

      <section className="section" aria-labelledby="kev-h">
        <div className="section-head">
          <div>
            <h2 id="kev-h">Exploited browser bugs, 2026</h2>
            <p>
              Browser-engine bugs that CISA added to its Known Exploited Vulnerabilities catalog this year (version {KEV_VERSION}). The date is when CISA listed the bug, not when it was found.
            </p>
          </div>
        </div>

        <div className="sec-filters__chips" role="group" aria-label="Show one engine family">
          <button type="button" className="chip" aria-pressed={fam === null} onClick={() => setFam(null)}>
            All ({EXPLOITED_BUGS.length})
          </button>
          {FAMILIES.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={fam === f} onClick={() => setFam(fam === f ? null : f)}>
              {FAMILY_LABEL[f]} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="sec-timeline-wrap">
          <Timeline bugs={bugs} active={active} onActive={setActive} />
          <p className="sec-readout small" role="status">
            {sel ? (
              <>
                <strong>{sel.cve}</strong>, {sel.component}, added {fmtDate(sel.added)}. {sel.kevName}.
              </>
            ) : (
              <span className="muted">Select a dot to read its details. The table below lists everything.</span>
            )}
          </p>
        </div>

        <div className="table-wrap" ref={kevTable}>
          <table className="table">
            <caption className="sr-only">Browser bugs added to the CISA exploited-vulnerabilities catalog in 2026, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Added to the catalog</th>
                <th scope="col">Bug</th>
                <th scope="col">Engine</th>
                <th scope="col">Component</th>
                <th scope="col">Who is affected</th>
              </tr>
            </thead>
            <tbody>
              {table.map((b) => (
                <tr key={b.cve} data-flip={b.cve}>
                  <td className="nowrap tnum">{fmtDate(b.added)}</td>
                  <th scope="row" className="nowrap">
                    <Ext href={b.source.url}>{b.cve}</Ext>
                  </th>
                  <td>{FAMILY_LABEL[b.family]}</td>
                  <td>
                    {b.component}
                    {b.note && <span className="xs faint sec-pay__max">{b.note}</span>}
                  </td>
                  <td className="small muted">{FAMILY_WHO[b.family]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="xs faint sec-note">
          Source: <Ext href={KEV_SOURCE.url}>CISA Known Exploited Vulnerabilities catalog</Ext>, read {fmtDate(KEV_SOURCE.accessed)}. No Firefox or Edge-specific entries were added in 2026.
        </p>

        <div className="callout sec-read">
          <p>
            <strong>What these counts do and don’t mean.</strong>
          </p>
          <ul>
            <li>They count bugs known to be exploited, not all bugs. A browser with a short list may simply be a smaller target or less studied.</li>
            <li>Browsers share engines. A Chromium bug affects every Chromium browser until it ships the fix, which is why patching speed matters in the grades.</li>
            <li>
              Check how fast your browser ships fixes on the <Link to="/security" className="link">security hub</Link>.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
