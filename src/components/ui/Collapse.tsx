import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT } from '../../lib/motion';

/**
 * Height-auto reveal for content that mounts on toggle. Height is the one non-transform property
 * allowed here: there is no transform equivalent for "push the rest of the page down".
 * Reduced motion keeps the fade and drops the movement.
 */
export function Collapse({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const shut = reduce ? { opacity: 0 } : { height: 0, opacity: 0, overflow: 'hidden' };
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className={className}
          style={{ display: 'flow-root' }} // keeps child margins inside the box so clipping can switch off without a jump
          initial={shut}
          animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
          exit={{ ...shut, transition: { duration: 0.15, ease: EASE_OUT } }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
