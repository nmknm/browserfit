import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useIsMobile } from '../../lib/hooks';
import { hideDialog, showDialog } from '../../lib/dialogMotion';

/**
 * Native <dialog> sheet: bottom sheet on phones, side sheet on larger screens.
 * showModal() gives us inert background, Escape, and focus handling for free.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'auto',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'auto' | 'bottom' | 'right';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const mobile = useIsMobile();
  const placement = side === 'auto' ? (mobile ? 'bottom' : 'right') : side;
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) opener.current = document.activeElement;
      showDialog(d, placement); // also resumes from mid-exit if reopened
    } else if (d.open) {
      hideDialog(d, placement).then(() => {
        if (!d.open) (opener.current as HTMLElement | null)?.focus?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dsheet dsheet--${placement}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dsheet__inner">
        {placement === 'bottom' && <div className="sheet-grip" aria-hidden />}
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label={`Close ${title}`}>
            <X />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </dialog>
  );
}
