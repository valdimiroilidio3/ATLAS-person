'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, RotateCcw, Settings } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

export function UserMenu() {
  const { state, resetDemoData } = useAtlas();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  const initials = state.user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('User menu')}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface2 text-[11px] font-medium text-text-2 transition-colors hover:border-accent/40 hover:text-text"
      >
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            role="menu"
            className="absolute right-0 top-10 z-50 w-60 overflow-hidden rounded-xl border border-border-strong bg-elevated shadow-card"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium">{state.user.name}</p>
              <p className="truncate text-xs text-text-3">{state.user.email}</p>
            </div>
            <div className="p-1.5">
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  router.push('/settings');
                }}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text-2 hover:bg-white/[0.05] hover:text-text')}
              >
                <Settings className="h-4 w-4" /> {t('Settings')}
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  resetDemoData();
                }}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text-2 hover:bg-white/[0.05] hover:text-text')}
              >
                <RotateCcw className="h-4 w-4" /> {t('Reset demo data')}
              </button>
            </div>
            <div className="border-t border-border px-4 py-2.5 text-[11px] text-text-3">
              {t('ATLAS · Personal AI Command Center')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
