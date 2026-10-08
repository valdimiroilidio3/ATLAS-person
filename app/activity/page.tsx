'use client';

// ACTIVITY — spec §16. Chronological stream, virtualized (spec §23).

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity as ActivityIcon, CheckCircle2, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { ACTIVITY_KIND_META } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { summarizeActivity } from '@/lib/atlas/engine';
import { formatDate, formatTime, isToday, isYesterday } from '@/lib/atlas/format';
import type { ActivityEvent } from '@/lib/atlas/types';
import { cn } from '@/lib/utils';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { EmptyState } from '@/components/ui/empty-state';
import { VirtualList } from '@/components/ui/virtual-list';
import { t } from '@/lib/i18n';

const ROW_HEIGHT = 64;

function ActivityRow({ event }: { event: ActivityEvent }) {
  const kindMeta = ACTIVITY_KIND_META[event.kind];
  return (
    <div className="flex h-full items-center gap-4 border-b border-border/60 px-5">
      <span className="w-14 shrink-0 font-mono text-[11px] tabular text-text-3">
        {isToday(event.time) ? formatTime(event.time) : isYesterday(event.time) ? t('Yesterday') : formatDate(event.time)}
      </span>
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
          event.tone === 'success' && 'border-success/25 bg-success/10 text-success',
          event.tone === 'error' && 'border-error/25 bg-error/10 text-error',
          event.tone === 'warning' && 'border-warning/25 bg-warning/10 text-warning',
          (!event.tone || event.tone === 'info') && 'border-border bg-surface2 text-text-3',
        )}
        aria-hidden
      >
        {event.tone === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
        {event.tone === 'error' && <AlertTriangle className="h-3.5 w-3.5" />}
        {event.tone === 'warning' && <ShieldAlert className="h-3.5 w-3.5" />}
        {(!event.tone || event.tone === 'info') && <Info className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text">
          <span className="font-medium">{event.actor}</span>
          <span className="text-text-3"> · </span>
          {event.title}
        </p>
        {event.detail && <p className="truncate text-xs text-text-3">{event.detail}</p>}
      </div>
      <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-3 sm:block">
        {t(kindMeta.labelKey)}
      </span>
    </div>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'error' | 'neutral' }) {
  const valueClass = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    neutral: 'text-text',
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className={cn('text-xl font-semibold tabular', valueClass)}>{value}</p>
      <p className="mt-0.5 text-xs text-text-3">{label}</p>
    </div>
  );
}

export default function ActivityPage() {
  const { state } = useAtlas();
  const summary = useMemo(() => summarizeActivity(state), [state]);

  const events = useMemo(
    () => [...state.activities].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    [state.activities],
  );

  return (
    <div className="py-8 space-y-8">
      <SectionHeader
        eyebrow={t('Chronological stream')}
        title={t('Activity')}
        description={t('Everything ATLAS and its agents have done — with meaningful context.')}
      />

      <div className="grid grid-cols-3 gap-3">
        <SummaryChip label={t('completed today')} value={summary.completedToday} tone="success" />
        <SummaryChip label={t('awaiting approval')} value={summary.awaitingApproval} tone="warning" />
        <SummaryChip label="blocked" value={summary.blocked} tone="error" />
      </div>

      <Surface padding={false} className="overflow-hidden">
        {events.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title={t('No activity yet')}
            description={t('When ATLAS and its agents do work, it shows up here — every run, approval and decision.')}
          />
        ) : (
          <div style={{ height: Math.min(640, Math.max(320, events.length * ROW_HEIGHT)) }}>
            <VirtualList
              items={events}
              itemHeight={ROW_HEIGHT}
              className="h-full"
              renderItem={(event) => (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <ActivityRow event={event} />
                </motion.div>
              )}
            />
          </div>
        )}
      </Surface>

      <p className="text-xs text-text-3">
        {t('The feed is windowed for performance — scroll to load more of history.')}
      </p>
    </div>
  );
}
