'use client';

// Goal detail sheet — the full goal operating system view (spec §07).

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  Check,
  Circle,
  CircleDot,
  ListChecks,
  Target,
} from 'lucide-react';
import type { Goal } from '@/lib/atlas/types';
import { goalProgress, deriveProjectProgress } from '@/lib/atlas/engine';
import { daysLeft, formatCurrency, formatDateLong } from '@/lib/atlas/format';
import { cn } from '@/lib/utils';
import { SlideOver } from '@/components/ui/slide-over';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress';
import { useAtlas } from '@/lib/atlas/store';
import { t } from '@/lib/i18n';

const GOAL_STATUS_TONE: Record<Goal['status'], 'success' | 'warning' | 'error' | 'accent'> = {
  'on-track': 'success',
  'at-risk': 'warning',
  behind: 'error',
  completed: 'accent',
};

function MilestoneRow({ title, status }: { title: string; status: 'done' | 'active' | 'todo' }) {
  return (
    <li className="flex items-center gap-2.5 py-2">
      {status === 'done' && <Check className="h-4 w-4 text-success" aria-hidden />}
      {status === 'active' && <CircleDot className="h-4 w-4 text-accent" aria-hidden />}
      {status === 'todo' && <Circle className="h-4 w-4 text-text-3" aria-hidden />}
      <span className={cn('text-sm', status === 'done' ? 'text-text-2 line-through' : 'text-text')}>{title}</span>
    </li>
  );
}

export function GoalDetailSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { state } = useAtlas();
  const [tab, setTab] = useState<'overview' | 'milestones' | 'risks'>('overview');

  const open = Boolean(goal);
  const progress = goal ? goalProgress(goal) : 0;
  const linkedProject = goal?.linkedProjectId
    ? state.projects.find((p) => p.id === goal.linkedProjectId)
    : undefined;

  return (
    <SlideOver open={open} onClose={onClose} title={goal?.title} width="w-full max-w-xl">
      {goal && (
        <div className="flex-1 space-y-6 p-5">
          {/* Header stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-border bg-surface p-3.5">
              <p className="eyebrow">{t('Current')}</p>
              <p className="mt-1.5 text-lg font-semibold tabular">
                {goal.unit === 'currency'
                  ? formatCurrency(goal.current, goal.currency ?? 'EUR')
                  : `${goal.current}${goal.unit === 'percent' ? '%' : ''}`}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3.5">
              <p className="eyebrow">{t('Target')}</p>
              <p className="mt-1.5 text-lg font-semibold tabular">
                {goal.unit === 'currency'
                  ? formatCurrency(goal.target, goal.currency ?? 'EUR')
                  : `${goal.target}${goal.unit === 'percent' ? '%' : ''}`}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3.5">
              <p className="eyebrow">{t('Deadline')}</p>
              <p className="mt-1.5 text-lg font-semibold tabular">{t('{count}d', { count: daysLeft(goal.deadline) })}</p>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-text-3">{progress}{t('% complete')}</span>
              <Badge tone={GOAL_STATUS_TONE[goal.status]}>{goal.status.replace('-', ' ').toUpperCase()}</Badge>
            </div>
            <ProgressBar value={progress} tone={goal.status === 'behind' ? 'error' : goal.status === 'at-risk' ? 'warning' : 'accent'} />
            <p className="mt-2 text-xs text-text-3">
              <Calendar className="mr-1 inline h-3 w-3" aria-hidden />
              {formatDateLong(goal.deadline)}
              {linkedProject && t('· linked to {project} ({progress}%)', { project: linkedProject.name, progress: deriveProjectProgress(linkedProject) })}
            </p>
          </div>

          <p className="text-sm leading-relaxed text-text-2">{goal.objective}</p>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border border-border bg-surface2 p-1">
            {(['overview', 'milestones', 'risks'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  tab === t ? 'bg-surface text-text shadow-sm' : 'text-text-3 hover:text-text-2',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {tab === 'overview' && (
                <div className="space-y-5">
                  <div>
                    <p className="eyebrow mb-2">{t('ATLAS strategy')}</p>
                    <ul className="space-y-1.5">
                      {goal.strategy.map((s) => (
                        <li key={s} className="flex items-center gap-2 text-sm text-text-2">
                          <span className="h-1 w-1 rounded-full bg-accent/70" aria-hidden />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow mb-2">{t('Assumptions · user-defined')}</p>
                    <ul className="space-y-1.5">
                      {goal.assumptions.map((a) => (
                        <li key={a} className="flex items-center gap-2 text-sm text-text-2">
                          <span className="h-1 w-1 rounded-full bg-text-3" aria-hidden />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="eyebrow mb-2">{t('Next actions')}</p>
                    <ul className="space-y-1.5">
                      {goal.nextActions.map((a) => (
                        <li key={a} className="flex items-center gap-2 text-sm text-text">
                          <ListChecks className="h-3.5 w-3.5 text-text-3" aria-hidden />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-accent/25 bg-accent/[0.06] p-4">
                    <p className="eyebrow mb-1.5 text-accent/80">{t('ATLAS recommends')}</p>
                    <p className="text-sm leading-relaxed text-text">{goal.aiRecommendation}</p>
                  </div>
                </div>
              )}

              {tab === 'milestones' && (
                <ul className="divide-y divide-border/60 rounded-lg border border-border">
                  {goal.milestones.map((m) => (
                    <MilestoneRow key={m.id} title={m.title} status={m.status} />
                  ))}
                </ul>
              )}

              {tab === 'risks' && (
                <ul className="space-y-2">
                  {goal.risks.map((r) => (
                    <li
                      key={r}
                      className="flex items-start gap-2.5 rounded-lg border border-warning/20 bg-warning/[0.04] px-3.5 py-2.5 text-sm text-text-2"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </SlideOver>
  );
}
