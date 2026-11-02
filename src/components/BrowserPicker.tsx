import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { BROWSERS } from '../lib/data';
import { EASE_OUT } from '../lib/motion';
import { BrowserMark } from './ui/BrowserMark';
import type { BrowserIndex } from '../lib/types';

/** Combobox to pick a browser (APG combobox with listbox popup). */
export function BrowserPicker({
  onPick,
  exclude = [],
  label = 'Add a browser',
  filter,
  autoFocus,
}: {
  onPick: (b: BrowserIndex) => void;
  exclude?: string[];
  label?: string;
  filter?: (b: BrowserIndex) => boolean;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return BROWSERS.filter((b) => !exclude.includes(b.id) && (!filter || filter(b)) && (!ql || b.name.toLowerCase().includes(ql) || b.developer.toLowerCase().includes(ql)))
      .sort((a, b) => {
        const as = a.name.toLowerCase().startsWith(ql) ? 0 : 1;
        const bs = b.name.toLowerCase().startsWith(ql) ? 0 : 1;
        return as - bs || a.name.localeCompare(b.name);
      })
      .slice(0, 30);
  }, [q, exclude, filter]);

  const pick = (b?: BrowserIndex) => {
    if (!b) return;
    onPick(b);
    setQ('');
    setOpen(false);
    setActive(0);
  };

  return (
    <div className="picker">
      <Plus className="picker__icon" aria-hidden />
      <input
        ref={input}
        autoFocus={autoFocus}
        className="input picker__input"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && list[active] ? `${id}-${list[active].id}` : undefined}
        aria-autocomplete="list"
        aria-label={label}
        placeholder={label}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(list.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(list[active]);
          } else if (e.key === 'Escape') setOpen(false);
        }}
      />
      <AnimatePresence>
        {open && (
          <motion.ul
            id={`${id}-list`}
            role="listbox"
            className="picker__list"
            aria-label="Browsers"
            initial={{ opacity: 0, transform: 'translateY(-4px) scale(0.98)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
            exit={{ opacity: 0, transform: 'translateY(-4px) scale(0.98)', transition: { duration: 0.1, ease: EASE_OUT } }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            {list.length === 0 && <li className="picker__empty">No browsers match “{q}”.</li>}
            {list.map((b, i) => (
              <li
                key={b.id}
                id={`${id}-${b.id}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setActive(i)}
                onClick={() => pick(b)}
              >
                <BrowserMark b={b} size={24} />
                <span className="truncate">{b.name}</span>
                <span className="faint xs truncate">{b.developer}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
