'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  onClose,
  children,
  className,
  maxWidth = 'max-w-lg',
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'relative w-full rounded-xl border border-border-strong bg-elevated shadow-card outline-none',
              'max-h-[85vh] overflow-y-auto',
              maxWidth,
              className,
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({
  title,
  description,
  onClose,
  eyebrow,
}: {
  title: string;
  description?: string;
  onClose?: () => void;
  eyebrow?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div className="space-y-1">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && <p className="text-sm text-text-2">{description}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-text-3 transition-colors hover:bg-white/[0.06] hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-border px-6 py-4', className)}>
      {children}
    </div>
  );
}
