'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import type { Toast as ToastType } from '@/lib/atlas/types';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

const toneMeta: Record<ToastType['tone'], { icon: LucideIcon; iconClass: string; barClass: string }> = {
  info: { icon: Info, iconClass: 'text-text-2', barClass: 'bg-text-3' },
  success: { icon: CheckCircle2, iconClass: 'text-success', barClass: 'bg-success' },
  warning: { icon: AlertTriangle, iconClass: 'text-warning', barClass: 'bg-warning' },
  error: { icon: XCircle, iconClass: 'text-error', barClass: 'bg-error' },
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { dismissToast } = useAtlas();
  const meta = toneMeta[toast.tone];
  const Icon = meta.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="relative w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border-strong bg-elevated shadow-card"
      role="status"
    >
      <div className={cn('absolute left-0 top-0 h-full w-[3px]', meta.barClass)} aria-hidden />
      <div className="flex items-start gap-3 p-4 pl-[18px]">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', meta.iconClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug text-text">{toast.title}</p>
          {toast.body && <p className="mt-0.5 text-xs leading-snug text-text-2">{toast.body}</p>}
        </div>
        <button
          onClick={() => dismissToast(toast.id)}
          aria-label={t('Dismiss notification')}
          className="rounded-md p-1 text-text-3 transition-colors hover:bg-white/[0.06] hover:text-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function Toaster() {
  const { state } = useAtlas();
  const toasts = state.toasts;
  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2"
      aria-live="polite"
      aria-label={t('Notifications')}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
