import { AnimatePresence, motion } from 'motion/react';
import { GitCompare, X } from 'lucide-react';
import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWidthFlip } from '../../lib/motion';
import { COMPARE_MAX, useApp } from '../../lib/store';
import { getBrowser } from '../../lib/data';
import { BrowserMark } from '../ui/BrowserMark';

/** Floating tray showing the browsers queued for comparison (fixed slots, honest capacity). */
export function CompareTray() {
  const { compare, toggleCompare, setCompare } = useApp();
  const loc = useLocation();
  const hidden = loc.pathname.startsWith('/compare') || compare.length === 0;
  const go = useRef<HTMLAnchorElement>(null);
  useWidthFlip(go, compare.length >= 2);
  const url = `/compare?b=${compare.join(',')}`;
  return (
    <AnimatePresence>
      {!hidden && (
        <motion.aside
          className="tray"
          aria-label="Compare tray"
          initial={{ opacity: 0, transform: 'translateY(16px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          exit={{ opacity: 0, transform: 'translateY(16px)', transition: { duration: 0.15 } }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        >
          <ul className="tray__slots">
            {Array.from({ length: COMPARE_MAX }).map((_, i) => {
              const b = getBrowser(compare[i]);
              return (
                <li key={i} className={b ? 'tray__slot' : 'tray__slot tray__slot--empty'}>
                  <span aria-hidden />
                  <AnimatePresence initial={false}>
                    {b && (
                      <motion.button
                        key={b.id}
                        onClick={() => toggleCompare(b.id)}
                        aria-label={`Remove ${b.name} from compare`}
                        title={`Remove ${b.name}`}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <BrowserMark b={b} size={28} />
                        <X className="tray__x" aria-hidden />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
          <span className="tray__count tnum">
            {compare.length}/{COMPARE_MAX}
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => setCompare([])}>
            Clear
          </button>
          <Link ref={go} to={url} className={`btn btn--primary btn--sm ${compare.length < 2 ? 'is-disabled' : ''}`} aria-disabled={compare.length < 2}>
            <GitCompare aria-hidden />
            <span data-swap>Compare {compare.length >= 2 ? compare.length : ''}</span>
          </Link>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
