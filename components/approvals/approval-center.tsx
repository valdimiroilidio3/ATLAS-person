'use client';

// Approval Center — spec §11. Sensitive actions never execute silently.

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, History, ShieldCheck, X } from 'lucide-react';
import { PERMISSION_LEVELS, permissionShort } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { timeAgo } from '@/lib/atlas/format';
import { cn } from '@/lib/utils';
import { SlideOver } from '@/components/ui/slide-over';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { t } from '@/lib/i18n';

export default function ApprovalCenter() {
  const { state, ui, closeApprovalCenter, approve, reject } = useAtlas();
  const [showHistory, setShowHistory] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const pending = state.approvals.filter((a) => a.status === 'pending');
  const history = state.approvals.filter((a) => a.status !== 'pending');

  return (
    <SlideOver open={ui.approvalCenterOpen} onClose={closeApprovalCenter} title={t('Approval Center')} width="w-full max-w-lg">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <p className="eyebrow">{t('Permission architecture')}</p>
          <p className="mt-1 text-sm text-text-2">
            {t('ATLAS executes sensitive actions only after your approval. Nothing runs silently.')}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface2 px-2 py-1 font-mono text-[10px] text-text-2">
          <ShieldCheck className="h-3 w-3 text-accent" />
          {permissionShort(state.preferences.defaultPermissionLevel)} {t('default')}
        </span>
      </div>

      <div className="flex-1 space-y-3 p-5">
        {pending.length === 0 && !showHistory && (
          <EmptyState
            icon={ShieldCheck}
            title={t('No approvals pending')}
            description={t('ATLAS is operating within your permissions. Anything sensitive will land here first.')}
          />
        )}

        <AnimatePresence mode="popLayout">
          {pending.map((approval) => (
            <motion.div
              layout
              key={approval.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="rounded-xl border border-warning/25 bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-warning/12 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warning">
                      {permissionShort(approval.level)} · {t(PERMISSION_LEVELS.find((p) => p.level === approval.level)?.nameKey ?? '')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-3">
                      <Clock className="h-3 w-3" /> {timeAgo(approval.createdAt)}
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-semibold">{approval.action}</h4>
                  <p className="mt-0.5 text-sm text-text-2">{approval.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded border border-border bg-surface2 px-1.5 py-0.5 text-[11px] text-text-3">
                      {approval.context.agent}
                    </span>
                    {approval.context.detail && (
                      <span className="rounded border border-border bg-surface2 px-1.5 py-0.5 text-[11px] text-text-3">
                        {approval.context.detail}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {rejectingId === approval.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      reject(approval.id);
                      setRejectingId(null);
                    }}
                  >
                    {t('Confirm rejection')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRejectingId(null)}>
                    {t('Keep pending')}
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="primary" size="sm" onClick={() => approve(approval.id)}>
                    <Check className="h-3.5 w-3.5" /> {t('Approve')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRejectingId(approval.id)}>
                    <X className="h-3.5 w-3.5" /> {t('Reject')}
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {history.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-text-3 transition-colors hover:text-text-2"
            >
              <History className="h-3.5 w-3.5" />
              {showHistory ? t('Hide history') : `History (${history.length})`}
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 space-y-1.5 overflow-hidden"
                >
                  {history.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-text-2">{a.action}</span>
                      <span
                        className={cn(
                          'shrink-0 font-mono text-[10px] uppercase tracking-wider',
                          a.status === 'approved' || a.status === 'executed' ? 'text-success' : 'text-error',
                        )}
                      >
                        {a.status}
                      </span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </SlideOver>
  );
}
