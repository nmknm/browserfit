import { Check, ChevronDown, ExternalLink, TriangleAlert } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFlip } from '../lib/motion';
import { OS_BY_ID } from '../data/taxonomy';
import { pool, rank } from '../lib/scoring';
import { LAYERS, LAYER_BY_ID, securityFor, type Evidence, type LayerId } from '../lib/security';
import type { BrowserDetail, BrowserIndex, OsId, SecurityIncident } from '../lib/types';
import { ScoreBar, ScoreNum } from './ui/Score';
import { EstimatedBadge, LAYER_ICON } from './ui/SecurityBits';

const EVIDENCE_LABEL: Record<Evidence, string> = {
  documented: 'Documented',
  editorial: 'Editorial',
  estimated: 'Estimated',
  derived: 'From version numbers',
};

const SEVERITY_TONE = { critical: 'negative', high: 'negative', medium: 'warning', low: '' } as const;
const SEVERITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' } as const;

function Incident({ i }: { i: SecurityIncident }) {
  return (
    <li className="sec-event">
      <time className="sec-event__date tnum">{i.date}</time>
      <div className="sec-event__body">
        <a className="link" href={i.url} target="_blank" rel="noreferrer noopener">
          {i.title}
          <ExternalLink aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        {i.detail && <p className="small muted">{i.detail}</p>}
      </div>
      <span className={`badge ${SEVERITY_TONE[i.severity] ? `badge--${SEVERITY_TONE[i.severity]}` : ''}`}>
        <TriangleAlert aria-hidden /> {SEVERITY_LABEL[i.severity]}
      </span>
    </li>
  );
}

/** The profile's own words on a layer, shown beside the structured inputs. */
function profileNote(id: LayerId, spec: Record<string, string> | undefined): { label: string; text: string } | null {
  if (!spec) return null;
  if (id === 'isolation' && spec.sandbox) return { label: 'From the profile', text: spec.sandbox };
  if (id === 'patching' && (spec.patchLag || spec.patchSpeed)) return { label: 'From the profile', text: spec.patchLag || spec.patchSpeed };
  return null;
}

export function SecurityReport({ b, os, detail, failed, onRetry }: { b: BrowserIndex; os: OsId | null; detail: BrowserDetail | null; failed: boolean; onRetry: () => void }) {
  const r = securityFor(b, os);
  const live = pool({ os });
  const rk = b.status === 'discontinued' ? null : rank(live, (x) => securityFor(x, os).score).find((x) => x.b.id === b.id)?.rank ?? null;
  const sec = detail?.security;
  const incidents = sec?.incidents ?? [];
  const sources = sec?.sources ?? [];
  const chips = useRef<HTMLUListElement>(null);
  useFlip(chips, os, true); // the platform changes in the parent, so capture automatically

  return (
    <section id="security" className="dsec" aria-labelledby="h-security">
      <h2 id="h-security">Security report card</h2>

      <div className="panel sec-report">
        <div className={`grade grade--${r.grade}`} role="img" aria-label={`Security grade ${r.grade}`}>
          {r.grade}
        </div>
        <div className="stack" style={{ gap: 'var(--s-3)' }}>
          <div className="sec-report__head">
            <p className="sec-report__score">
              <span className="tnum">{r.score.toFixed(1)}</span> <small>out of 10</small>
            </p>
            {rk && (
              <p className="small muted">
                Ranked {rk} of {live.length}
                {os ? ` on ${OS_BY_ID[os].name}` : ''}
              </p>
            )}
            {r.estimated ? (
              <EstimatedBadge />
            ) : (
              <span className="badge badge--positive">
                <Check aria-hidden /> Verified
              </span>
            )}
          </div>
          {sec?.summary && <p>{sec.summary}</p>}
          {r.estimated && (
            <p className="small muted">
              Estimated from the engine and this profile. We haven’t checked its security details separately. We could determine {r.known} of {r.total} details.
            </p>
          )}
          {(r.weak.length > 0 || r.strong.length > 0) && (
            <ul className="sec-chips" aria-label="Weak spots and strong points" ref={chips}>
              {r.weak.map((c) => (
                <li key={c.text} data-flip={`w:${c.text}`} className="sec-chip sec-chip--weak">
                  <TriangleAlert aria-hidden /> {c.text}
                </li>
              ))}
              {r.strong.slice(0, 2).map((c) => (
                <li key={c.text} data-flip={`s:${c.text}`} className="sec-chip sec-chip--strong">
                  <Check aria-hidden /> {c.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {os === 'ios' && (
        <div className="callout">
          <strong>On iOS:</strong> every browser uses Apple’s WebKit engine and its sandbox, so isolation is the same across iPhone browsers. Differences come from blocking, accounts and privacy features.
        </div>
      )}

      <div className="panel sec-layers">
        {LAYERS.map((l) => {
          const lr = r.layers[l.id];
          const Icon = LAYER_ICON[l.id];
          const note = profileNote(l.id, detail?.spec);
          return (
            <details key={l.id} className="sec-layer">
              <summary>
                <span className="sec-layer__icon">
                  <Icon aria-hidden />
                </span>
                <span className="sec-layer__name">{LAYER_BY_ID[l.id].name}</span>
                <span className="badge tnum sec-layer__weight" title="Share of the Security score">
                  {l.weight}%
                </span>
                <span className="sec-layer__bar">
                  <ScoreBar value={lr.score} animate={false} />
                </span>
                <ScoreNum value={lr.score} size="sm" label={l.name} />
                <ChevronDown className="chev" aria-hidden />
              </summary>
              <div className="sec-layer__body">
                <p className="small muted">{l.what}</p>
                <dl className="sec-inputs">
                  {lr.inputs.map((inp) => (
                    <div key={inp.label} className="sec-input">
                      <dt>{inp.label}</dt>
                      <dd className={inp.known ? '' : 'faint'}>
                        {inp.value}
                        {inp.note && <span className="xs faint sec-input__note">{inp.note}</span>}
                      </dd>
                      <dd className="sec-input__ev">
                        <span className={inp.evidence === 'estimated' ? 'badge sec-est' : 'badge'}>{inp.known ? EVIDENCE_LABEL[inp.evidence] : 'Not scored'}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                {note && (
                  <p className="small">
                    <strong>{note.label}:</strong> <span className="muted">{note.text}</span>
                  </p>
                )}
                <div className="sec-stops">
                  <p className="small">
                    <strong>Stops:</strong> <span className="muted">{l.stops}</span>
                  </p>
                  <p className="small">
                    <strong>Can’t stop:</strong> <span className="muted">{l.cant}</span>
                  </p>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <h3 className="h-sm sec-events-h">Recent security events</h3>
      {failed ? (
        <div className="callout callout--warning">
          Couldn’t load security details. Check your connection and try again.{' '}
          <button type="button" className="btn btn--sm" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : !detail ? (
        <div className="skeleton" style={{ height: 48 }} />
      ) : incidents.length ? (
        <ul className="sec-events">
          {incidents.map((i) => (
            <Incident key={i.url} i={i} />
          ))}
        </ul>
      ) : (
        <p className="muted">None recorded in our sources. That is not proof of safety.</p>
      )}

      <p className="small muted sec-report__foot">
        {sources.length > 0 ? (
          <>
            Sources:{' '}
            {sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ', '}
                <a className="link" href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.title || s.url}
                </a>
              </span>
            ))}
            .{' '}
          </>
        ) : (
          <>No security-specific sources yet; the profile’s sources apply. </>
        )}
        <Link to="/security" className="link">
          Compare with every browser
        </Link>
        {' '}or{' '}
        <Link to="/about" className="link">
          see how we grade
        </Link>
        .
      </p>
    </section>
  );
}
