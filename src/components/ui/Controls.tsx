import { motion } from 'motion/react';
import { useId, useRef, type ReactNode, type KeyboardEvent } from 'react';

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

/** Segmented control with a sliding pill (state change, < 250ms). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const id = useId();
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.value === value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', duration: 0.3, bounce: 0 }} />}
          <span>
            {o.icon}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/** APG tabs: arrow keys move, Home/End jump. Panels are rendered by the caller. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
}: {
  tabs: { value: T; label: ReactNode; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  idBase: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = tabs.findIndex((t) => t.value === value);
  const onKey = (e: KeyboardEvent) => {
    let n = idx;
    if (e.key === 'ArrowRight') n = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`${idBase}-tab-${t.value}`}
          aria-controls={`${idBase}-panel-${t.value}`}
          aria-selected={t.value === value}
          tabIndex={t.value === value ? 0 : -1}
          className="tab"
          onClick={() => onChange(t.value)}
        >
          {t.icon}
          {t.label}
          {t.value === value && <motion.span layoutId={`tabind-${idBase}`} className="tab-indicator" transition={{ type: 'spring', duration: 0.3, bounce: 0 }} />}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
