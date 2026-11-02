import { motion } from 'motion/react';
import { ArrowRight, Brain, Layers, ListChecks, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BROWSERS } from '../../lib/data';
import { readLocal } from '../../lib/store';
import { EASE_OUT, useHeightFlip } from '../../lib/motion';
import { hideDialog, showDialog } from '../../lib/dialogMotion';
import { ALL_NAV_ITEMS } from '../../routes/nav';
import { BrowserMark } from '../ui/BrowserMark';
import { ENGINE_BY_ID, FEATURES, FEATURE_INDEX, OSES } from '../../data/taxonomy';

interface Item {
  id: string;
  kind: 'browser' | 'tool' | 'os' | 'quiz' | 'collection' | 'feature';
  label: string;
  sub: string;
  to: string;
  b?: (typeof BROWSERS)[number];
}

const ITEMS: Item[] = [
  ...BROWSERS.map((b) => ({
    id: 'b-' + b.id,
    kind: 'browser' as const,
    label: b.name,
    sub: `${ENGINE_BY_ID[b.engine].name} · ${b.developer}`,
    to: `/browser/${b.id}`,
    b,
  })),
  ...ALL_NAV_ITEMS.map((i) => ({ id: 't-' + i.to, kind: 'tool' as const, label: i.label, sub: i.desc, to: i.to })),
  ...OSES.map((o) => ({ id: 'o-' + o.id, kind: 'os' as const, label: `Best browsers for ${o.name}`, sub: 'Platform guide', to: `/os/${o.id}` })),
  // A feature name finds the browsers that have it, for example "vertical tabs".
  ...FEATURES.map((f) => {
    const n = BROWSERS.filter((b) => b.status !== 'discontinued' && [1, 2, 3].includes(b.features[FEATURE_INDEX[f.id]]?.[0] ?? 0)).length;
    return { id: 'f-' + f.id, kind: 'feature' as const, label: f.name, sub: `Feature · ${n} ${n === 1 ? 'browser has' : 'browsers have'} it`, to: `/finder?f=${f.id}` };
  }),
];

const KIND_ICON = { quiz: Brain, collection: Layers, feature: ListChecks } as const;

function score(item: Item, q: string) {
  const l = item.label.toLowerCase();
  if (l === q) return 100;
  if (l.startsWith(q)) return 80;
  if (l.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  if (l.includes(q)) return 40;
  if (item.sub.toLowerCase().includes(q)) return 20;
  return 0;
}

/**
 * Command palette (APG combobox + listbox). It is opened from the keyboard many times a day, so the
 * dialog itself only does a 160ms fade (100ms out, see lib/dialogMotion.ts). The motion that earns
 * its keep is inside: the list height and the rows FLIP between result sets, and one highlight
 * slides between rows instead of teleporting.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [session, setSession] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results$ = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const viaKey = useRef(false);
  const nav = useNavigate();
  const [extra, setExtra] = useState<Item[]>([]);
  const loaded = useRef(false);

  // Quizzes and collections are loaded the first time the palette opens, so the first page stays small.
  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    Promise.all([import('../../data/quizzes'), import('../../data/collections')]).then(([qz, col]) => {
      const mine = readLocal<{ id: string; name: string }[]>('bf-custom-quizzes', []);
      setExtra([
        ...qz.QUIZZES.map((x) => ({ id: 'q-' + x.id, kind: 'quiz' as const, label: x.name, sub: `Quiz · ${x.blurb}`, to: `/quiz/${x.id}` })),
        ...mine.map((x) => ({ id: 'q-' + x.id, kind: 'quiz' as const, label: x.name, sub: 'Quiz · yours', to: `/quiz/${x.id}` })),
        ...col.COLLECTIONS.map((x) => ({ id: 'c-' + x.id, kind: 'collection' as const, label: x.name, sub: `Collection · ${x.blurb}`, to: `/collections/${x.id}` })),
      ]);
    });
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      const fresh = !d.open;
      showDialog(d, 'palette');
      if (fresh) {
        setQ('');
        setActive(0);
        setSession((s) => s + 1); // remount the rows so a reopened palette never shuffles from the last search
      }
      requestAnimationFrame(() => input.current?.focus());
    } else if (d.open) hideDialog(d, 'palette');
  }, [open]);

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) {
      return [
        ...ITEMS.filter((i) => i.kind === 'tool').slice(0, 8),
        ...ITEMS.filter((i) => i.kind === 'browser').slice(0, 6),
      ];
    }
    return [...ITEMS, ...extra]
      .map((i) => ({ i, s: score(i, ql) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.i.label.localeCompare(b.i.label))
      .slice(0, 14)
      .map((x) => x.i);
  }, [q, extra]);

  // `session` re-measures once the dialog is actually displayed, so the first change after opening has a real First.
  useHeightFlip(results$, `${session}:${q}`, open);

  // Arrow keys keep the highlighted row in view. offsetTop ignores in-flight FLIP transforms, which
  // scrollIntoView would read. Hovering never scrolls, or the list would chase the pointer.
  useEffect(() => {
    const ul = list.current;
    const row = ul?.children[active] as HTMLElement | undefined;
    if (!ul || !row || !viaKey.current) return;
    viaKey.current = false;
    const pad = parseFloat(getComputedStyle(ul).paddingTop) || 0;
    if (row.offsetTop - pad < ul.scrollTop) ul.scrollTop = row.offsetTop - pad;
    else if (row.offsetTop + row.offsetHeight + pad > ul.scrollTop + ul.clientHeight) ul.scrollTop = row.offsetTop + row.offsetHeight + pad - ul.clientHeight;
  }, [active]);

  const go = (item?: Item) => {
    if (!item) return;
    onClose();
    nav(item.to);
  };

  return (
    <dialog
      ref={ref}
      className="palette"
      aria-label="Search"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <motion.div className="palette__box" layoutRoot>
        <div className="palette__input">
          <Search aria-hidden />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={results[active] ? `pal-${results[active].id}` : undefined}
            aria-autocomplete="list"
            placeholder="Search browsers, features, quizzes, tools…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                viaKey.current = true;
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                viaKey.current = true;
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(results[active]);
              }
            }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div ref={results$} className="palette__results">
          <motion.ul key={session} ref={list} layoutScroll id="palette-list" role="listbox" className="palette__list" aria-label="Results">
            {results.length === 0 && <li className="palette__empty">No matches for “{q}”. Try a browser name like “Firefox”, or a tool like “compare”.</li>}
            {results.map((r, i) => (
              <motion.li
                key={r.id}
                id={`pal-${r.id}`}
                role="option"
                aria-selected={i === active}
                className="palette__item"
                layout="position"
                transition={{ duration: 0.16, ease: EASE_OUT }}
                onMouseMove={() => setActive(i)}
                onClick={() => go(r)}
              >
                {/* One highlight per query: it slides between rows while you arrow or hover, and simply
                    appears (no cross-query slide) when typing re-ranks the list. */}
                {i === active && <motion.span key={q} layoutId={`pal-hl-${q}`} className="palette__hl" style={{ borderRadius: 8 }} transition={{ type: 'spring', duration: 0.2, bounce: 0 }} aria-hidden />}
                {r.b ? (
                  <BrowserMark b={r.b} size={28} />
                ) : (
                  <span className="palette__kind">
                    {r.kind === 'quiz' || r.kind === 'collection' || r.kind === 'feature' ? (() => { const Icon = KIND_ICON[r.kind]; return <Icon aria-hidden style={{ width: 14, height: 14 }} />; })() : r.kind === 'os' ? 'OS' : 'Tool'}
                  </span>
                )}
                <span className="palette__text">
                  <span className="truncate">{r.label}</span>
                  <span className="palette__sub truncate">{r.sub}</span>
                </span>
                <ArrowRight className="palette__go" aria-hidden />
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
    </dialog>
  );
}
