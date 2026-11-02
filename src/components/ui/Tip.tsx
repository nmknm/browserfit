import { useCallback, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip that works on hover, keyboard focus, and tap (touch).
 * Wraps a single focusable trigger; content is linked via aria-describedby.
 */
export function Tip({ content, children, block }: { content: ReactNode; children: ReactElement | ReactNode; block?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; below: boolean }>({ x: 0, y: 0, below: false });

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = r.top < 90;
    setPos({ x: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const t = tipRef.current;
    if (t) {
      const w = t.offsetWidth;
      const max = window.innerWidth - 8;
      let left = pos.x - w / 2;
      left = Math.max(8, Math.min(left, max - w));
      t.style.left = `${left}px`;
      // Grow from the trigger: x is the trigger's centre measured inside the (viewport-clamped) tip.
      t.style.transformOrigin = `${pos.x - left}px ${pos.below ? '0%' : '100%'}`;
    }
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true } as EventListenerOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos.x]);

  return (
    <>
      <span
        ref={ref}
        className={block ? 'tip-trigger tip-trigger--block' : 'tip-trigger'}
        aria-describedby={open ? id : undefined}
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          if (window.matchMedia('(hover: none)').matches) {
            e.stopPropagation();
            setOpen((o) => !o);
          }
        }}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            className="tip"
            style={{ top: pos.y, left: pos.x, transform: pos.below ? 'none' : 'translateY(-100%)' }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
