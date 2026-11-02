import { AnimatePresence, motion } from 'motion/react';
import { Brain, ChevronDown, GitCompare, Home, LayoutGrid, Menu, Search, Settings, Trophy } from 'lucide-react';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { NAV } from '../../routes/nav';
import { useApp } from '../../lib/store';
import { OSES } from '../../data/taxonomy';
import type { OsId } from '../../lib/types';
import { CommandPalette } from './CommandPalette';
import { CompareTray } from './CompareTray';
import { Sheet } from '../ui/Sheet';
import { useIsMobile } from '../../lib/hooks';
import { useFloatingTopbar } from './useFloatingTopbar';
import { useBarHoverFlip } from './useBarHoverFlip';
import { EASE_OUT } from '../../lib/motion';

function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label="Browserfit home">
      {/* A browser window with a check in the page: the browser that fits. */}
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <rect x="2" y="3" width="20" height="18" rx="4.5" fill="var(--accent)" />
        <circle cx="5.5" cy="5.75" r="0.9" fill="#fff" />
        <circle cx="8.2" cy="5.75" r="0.9" fill="#fff" />
        <circle cx="10.9" cy="5.75" r="0.9" fill="#fff" />
        <rect x="4" y="8.25" width="16" height="10.75" rx="2.5" fill="oklch(0.73 0.14 252)" />
        <path d="M8.4 13.7l2.4 2.4 4.8-4.9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Browserfit</span>
    </Link>
  );
}

export function OsSelect({ compact }: { compact?: boolean }) {
  const { os, setOs } = useApp();
  return (
    <label className={compact ? 'os-select os-select--compact' : 'os-select'}>
      <span className="sr-only">Score browsers for</span>
      <select className="input select" value={os ?? ''} onChange={(e) => setOs((e.target.value || null) as OsId | null)}>
        <option value="">All platforms</option>
        {OSES.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/* Panels fade in/out only when the menu opens from, or closes to, nothing. Moving between
   triggers while one is open swaps panels with no motion (`instant`). */
const PANEL = {
  hidden: (instant: boolean) => (instant ? { opacity: 1, transform: 'translateY(0px) scale(1)' } : { opacity: 0, transform: 'translateY(-4px) scale(0.98)' }),
  shown: { opacity: 1, transform: 'translateY(0px) scale(1)', transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] as const } },
  gone: (instant: boolean) => ({ opacity: instant ? 1 : 0, transform: instant ? 'translateY(0px) scale(1)' : 'translateY(-4px) scale(0.98)', transition: { duration: instant ? 0 : 0.12 } }),
};

function MegaMenu() {
  const [{ open, instant }, setState] = useState<{ open: string | null; instant: boolean }>({ open: null, instant: false });
  const setOpen = (next: string | null | ((o: string | null) => string | null)) =>
    setState((s) => {
      const n = typeof next === 'function' ? next(s.open) : next;
      return n === s.open ? s : { open: n, instant: s.open !== null && n !== null };
    });
  const loc = useLocation();
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(null), [loc.pathname]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  return (
    <div className="mega" ref={wrap} onMouseLeave={() => setOpen(null)}>
      {NAV.map((g) => {
        const active = g.items.some((i) => loc.pathname === i.to || loc.pathname.startsWith(i.to + '/'));
        return (
          <div key={g.id} className="mega__group" onMouseEnter={() => window.matchMedia('(hover: hover)').matches && setOpen(g.id)}>
            <button
              className={`mega__trigger ${active ? 'is-active' : ''}`}
              aria-expanded={open === g.id}
              aria-controls={`mega-${g.id}`}
              onClick={() => setOpen((o) => (o === g.id ? null : g.id))}
            >
              {g.label}
              <ChevronDown aria-hidden />
            </button>
            <AnimatePresence custom={instant}>
              {open === g.id && (
                <motion.div
                  id={`mega-${g.id}`}
                  className={g.items.length > 6 ? "mega__panel mega__panel--wide" : "mega__panel"}
                  variants={PANEL}
                  custom={instant}
                  initial="hidden"
                  animate="shown"
                  exit="gone"
                >
                  <ul>
                    {g.items.map((i) => (
                      <li key={i.to}>
                        <NavLink to={i.to} className="mega__item">
                          <span className="mega__icon">
                            <i.icon aria-hidden />
                          </span>
                          <span>
                            <span className="mega__label">{i.label}</span>
                            <span className="mega__desc">{i.desc}</span>
                          </span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const loc = useLocation();
  useEffect(() => onClose(), [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const ql = q.trim().toLowerCase();
  return (
    <Sheet open={open} onClose={onClose} title="All tools" side="bottom">
      <input className="input" placeholder="Search tools" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tools" />
      <div style={{ marginBlock: 'var(--s-4)' }}>
        <Link to="/settings" className="btn" onClick={onClose}>
          <Settings aria-hidden /> Settings
        </Link>
      </div>
      {NAV.map((g) => {
        const items = g.items.filter((i) => !ql || (i.label + ' ' + i.desc).toLowerCase().includes(ql));
        if (!items.length) return null;
        return (
          <section key={g.id} className="more-group">
            <h3>{g.label}</h3>
            <ul>
              {items.map((i) => (
                <li key={i.to}>
                  {/* Close on tap: the route is lazy, so waiting for the pathname change left the sheet sitting open */}
                  <Link to={i.to} className="more-item" onClick={onClose}>
                    <i.icon aria-hidden />
                    <span>
                      <span className="mega__label">{i.label}</span>
                      <span className="mega__desc">{i.desc}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Sheet>
  );
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const { compare } = useApp();
  const items = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/browsers', label: 'Browsers', icon: LayoutGrid },
    { to: '/rankings', label: 'Rankings', icon: Trophy },
    { to: '/quiz', label: 'Quiz', icon: Brain },
    { to: '/compare', label: 'Compare', icon: GitCompare, badge: compare.length || null },
  ];
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className="bottom-nav__item">
          <span className="bottom-nav__icon">
            <i.icon aria-hidden />
            {i.badge ? <span className="bottom-nav__badge tnum">{i.badge}</span> : null}
          </span>
          {i.label}
        </NavLink>
      ))}
      <button className="bottom-nav__item" onClick={onMore}>
        <span className="bottom-nav__icon">
          <Menu aria-hidden />
        </span>
        More
      </button>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Wordmark />
          <p className="muted small" style={{ marginTop: 'var(--s-3)', maxWidth: '40ch' }}>
            Independent browser comparisons. Scores are editorial assessments grounded in cited public sources, last reviewed October 2026.
          </p>
          <ul className="footer__links">
            <li>
              <a href="https://github.com/nmknm/browserfit" target="_blank" rel="noreferrer">
                Source on GitHub
              </a>
            </li>
            <li>
              <a href="https://nmkslab.web.app/" target="_blank" rel="noreferrer">
                More from Nmk's Lab
              </a>
            </li>
          </ul>
        </div>
        {NAV.map((g) => (
          <div key={g.id}>
            <h2 className="footer__h">{g.label}</h2>
            <ul>
              {g.items.slice(0, 5).map((i) => (
                <li key={i.to}>
                  <Link to={i.to}>{i.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { toastMsg, toastId, toastAction, dismissToast } = useApp();
  const loc = useLocation();
  const mobile = useIsMobile();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const topbar = useFloatingTopbar();
  const endRef = useRef<HTMLDivElement>(null);
  useBarHoverFlip(endRef);

  // Route change: scroll to top, move focus to the page heading.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    const t = window.setTimeout(() => {
      const h1 = mainRef.current?.querySelector('h1') as HTMLElement | null;
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [loc.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.matches('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header ref={topbar.ref} className={topbar.floating ? 'topbar is-floating' : 'topbar'}>
        <div className="topbar__pill">
          <span className="topbar__bg" data-flip="bg" data-flip-box aria-hidden />
          <div className="container container--wide topbar__inner">
            <div data-flip="brand" className="topbar__brand">
              <Wordmark />
            </div>
            {!mobile && (
              <div data-flip="menu" className="topbar__menu">
                <MegaMenu />
              </div>
            )}
            <div ref={endRef} className="topbar__end" data-flip="end">
              <Link to="/settings" className="tb-ctl tb-settings" data-hover-flip aria-label="Settings">
                <span className="tb-ctl__bg" data-flip="settings-bg" data-flip-box aria-hidden />
                <span className="tb-ctl__icon" data-flip="settings-icon">
                  <Settings aria-hidden />
                </span>
                <span className="tb-ctl__label">Settings</span>
              </Link>
              <button className="tb-ctl search-trigger" data-hover-flip onClick={() => setPaletteOpen(true)} aria-label="Search browsers and tools">
                <span className="tb-ctl__bg" data-flip="search-bg" data-flip-box aria-hidden />
                <span className="tb-ctl__icon" data-flip="search-icon">
                  <Search aria-hidden />
                </span>
                <span className="tb-ctl__label">Search</span>
                <span className="kbd">Ctrl K</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main id="main" ref={mainRef} className="main">
        <Suspense fallback={<RouteSkeleton />}>
          <div key={loc.pathname} className="route-in">
            {children}
          </div>
        </Suspense>
      </main>
      <Footer />
      <CompareTray />
      {mobile && <BottomNav onMore={() => setMoreOpen(true)} />}
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <div role="status" aria-live="polite" className="sr-only">
        {toastMsg}
      </div>
      <AnimatePresence>
        {toastMsg && (
          <motion.div key={toastId} className="toast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8, transition: { duration: 0.1 } }} transition={{ duration: 0.2, ease: EASE_OUT }}>
            <span>{toastMsg}</span>
            {toastAction && (
              <>
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    toastAction.run();
                    dismissToast();
                  }}
                >
                  {toastAction.label}
                </button>
                <button type="button" className="toast__dismiss" onClick={dismissToast} aria-label="Dismiss">
                  ×
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function RouteSkeleton() {
  return (
    <div className="container page" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 36, width: '40%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 32 }} />
      <div className="grid grid-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 160 }} />
        ))}
      </div>
    </div>
  );
}
