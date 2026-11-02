import { Brain, FileText, Link2, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrowserMark } from '../components/ui/BrowserMark';
import { Empty } from '../components/ui/Controls';
import { FactsStrip } from '../components/ui/Facts';
import { ScoreNum } from '../components/ui/Score';
import { GradeChip } from '../components/ui/SecurityBits';
import { OS_BY_ID } from '../data/taxonomy';
import { getBrowser, loadDetail } from '../lib/data';
import { customLink, DECIDER_QUESTIONS } from '../lib/customQuiz';
import { today } from '../lib/exportTable';
import { useDocTitle } from '../lib/hooks';
import { DEFAULT_WEIGHTS, overall } from '../lib/scoring';
import { securityFor } from '../lib/security';
import { useApp } from '../lib/store';
import type { BrowserDetail, BrowserIndex } from '../lib/types';

const fmtDate = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

function markdown(items: { b: BrowserIndex; d?: BrowserDetail; note?: string }[], os: Parameters<typeof overall>[2]) {
  const out = [`# Browser shortlist, ${fmtDate(today())}`, ''];
  for (const { b, d, note } of items) {
    out.push(`## ${b.name}`, `${b.pitch}`, '', `Overall ${overall(b, DEFAULT_WEIGHTS, os).toFixed(1)} out of 10. Security grade ${securityFor(b, os).grade}. Privacy grade ${b.keyFacts.privacyGrade}.`, '');
    if (d?.pros.length) out.push(`**Strengths:** ${d.pros.slice(0, 3).map((p) => p.title).join('; ')}`);
    if (d?.cons.length) out.push(`**Drawbacks:** ${d.cons.slice(0, 2).map((p) => p.title).join('; ')}`);
    if (note) out.push(`**Your note:** ${note}`);
    out.push('');
  }
  return out.join('\n');
}

/** One page about the browsers you are weighing: strengths, drawbacks and your own notes. Print it or copy it as text. */
export default function ShortlistBrief() {
  useDocTitle('Shortlist brief');
  const { shortlist, os, toast } = useApp();
  const [sp] = useSearchParams();
  const fromLink = sp.get('ids');
  const ids = useMemo(() => (fromLink ? fromLink.split(',') : Object.keys(shortlist)).filter((id) => getBrowser(id)).slice(0, 12), [fromLink, shortlist]);
  const [details, setDetails] = useState<Record<string, BrowserDetail | null>>({});

  useEffect(() => {
    let alive = true;
    Promise.all(ids.map(async (id) => [id, await loadDetail(id)] as const)).then((pairs) => alive && setDetails(Object.fromEntries(pairs)));
    return () => {
      alive = false;
    };
  }, [ids]);

  const items = ids.map((id) => ({ b: getBrowser(id)!, d: details[id] ?? undefined, note: fromLink ? undefined : shortlist[id] || undefined }));
  const copy = (text: string, done: string) => navigator.clipboard?.writeText(text).then(() => toast(done), () => toast('Couldn’t copy. Select the text instead.')) ?? toast('Couldn’t copy. Select the text instead.');

  if (!items.length) {
    return (
      <div className="container page">
        <div className="page-head">
          <div>
            <h1>Shortlist brief</h1>
          </div>
        </div>
        <div className="panel">
          <Empty title="Nothing to summarise yet" action={<Link to="/browsers" className="btn btn--primary">Browse browsers</Link>}>
            Save browsers to your shortlist and this page turns them into a one-page brief you can print or share.
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="container page brief">
      <div className="page-head">
        <div>
          <h1>Shortlist brief</h1>
          <p className="lede">
            {items.length} {items.length === 1 ? 'browser' : 'browsers'}, {fmtDate(today())}.{os ? ` Scored for ${OS_BY_ID[os].name}.` : ''}
          </p>
        </div>
        <div className="row no-print">
          <button type="button" className="btn btn--primary" onClick={() => copy(markdown(items, os), 'Brief copied as text.')}>
            <FileText aria-hidden /> Copy as Markdown
          </button>
          <button type="button" className="btn" onClick={() => window.print()}>
            <Printer aria-hidden /> Print
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => copy(`${location.origin}${location.pathname}#/shortlist/brief?ids=${ids.join(',')}`, 'Link copied. It opens this list.')}>
            <Link2 aria-hidden /> Copy link to this list
          </button>
        </div>
      </div>

      <div className="brief__list">
        {items.map(({ b, d, note }) => (
          <section key={b.id} className="panel panel-pad brief__item" aria-labelledby={`brief-${b.id}`}>
            <div className="brief__head">
              <BrowserMark b={b} size={40} />
              <div className="brief__id">
                <h2 id={`brief-${b.id}`}>
                  <Link to={`/browser/${b.id}`}>{b.name}</Link>
                </h2>
                <p className="muted small">{b.pitch}</p>
              </div>
              <div className="brief__scores">
                <ScoreNum value={overall(b, DEFAULT_WEIGHTS, os)} size="lg" label="Overall" />
                <GradeChip grade={securityFor(b, os).grade} />
              </div>
            </div>
            <FactsStrip b={b} os={os} small />
            <div className="brief__cols">
              <div>
                <h3 className="h-sm">Strengths</h3>
                {d ? (
                  <ul>
                    {d.pros.slice(0, 3).map((p) => (
                      <li key={p.title}>{p.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="small faint">Loading…</p>
                )}
              </div>
              <div>
                <h3 className="h-sm">Drawbacks</h3>
                {d ? (
                  <ul>
                    {d.cons.slice(0, 2).map((p) => (
                      <li key={p.title}>{p.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="small faint">Loading…</p>
                )}
              </div>
            </div>
            {note && (
              <p className="brief__note">
                <strong>Your note:</strong> {note}
              </p>
            )}
          </section>
        ))}
      </div>

      {items.length >= 2 && (
        <p className="no-print brief__decide">
          Still stuck?{' '}
          <Link to={customLink({ name: 'Decide my shortlist', pool: { ids }, questions: DECIDER_QUESTIONS, adaptive: true })} className="btn btn--sm">
            <Brain aria-hidden /> Let a quiz decide
          </Link>
        </p>
      )}
    </div>
  );
}
