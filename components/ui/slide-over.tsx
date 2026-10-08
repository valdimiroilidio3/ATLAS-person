'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

export function SlideOver({
  open,
  onClose,
  children,
  title,
  width = 'w-full max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'absolute inset-y-0 right-0 flex flex-col border-l border-border-strong bg-elevated shadow-card',
              width,
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                <button
                  onClick={onClose}
                  aria-label={t('Close')}
                  className="rounded-lg p-1.5 text-text-3 transition-colors hover:bg-white/[0.06] hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
