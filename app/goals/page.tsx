'use client';

// GOALS — spec §07. A goal operating system.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, TrendingUp } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import { goalProgress } from '@/lib/atlas/engine';
import { daysLeft, formatCurrency, formatDate } from '@/lib/atlas/format';
import type { Goal } from '@/lib/atlas/types';
import { cn } from '@/lib/utils';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { GoalDetailSheet } from '@/components/goals/goal-detail-sheet';
import { t } from '@/lib/i18n';

const STATUS_TONE: Record<Goal['status'], 'success' | 'warning' | 'error' | 'accent'> = {
  'on-track': 'success',
  'at-risk': 'warning',
  behind: 'error',
  completed: 'accent',
};

function formatGoalValue(goal: Goal, value: number): string {
  if (goal.unit === 'currency') return formatCurrency(value, goal.currency ?? 'EUR');
  if (goal.unit === 'percent') return `${value}%`;
  return String(value);
}

function GoalCard({ goal, onOpen, featured = false }: { goal: Goal; onOpen: (g: Goal) => void; featured?: boolean }) {
  const progress = goalProgress(goal);
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onOpen(goal)}
      className={cn(
        'surface-interactive w-full text-left p-5 sm:p-6 flex flex-col',
        featured && 'border-accent/25',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{featured ? t('Primary goal') : t('Goal')}</p>
          <h3 className={cn('mt-1 font-semibold tracking-tight', featured ? 'text-xl' : 'text-base')}>
            {goal.title}
          </h3>
        </div>
        <Badge tone={STATUS_TONE[goal.status]}>{goal.status.replace('-', ' ')}</Badge>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className={cn('font-semibold tabular tracking-tight', featured ? 'text-2xl' : 'text-xl')}>
          {formatGoalValue(goal, goal.current)}
        </span>
        <span className="text-sm text-text-3">/ {formatGoalValue(goal, goal.target)}</span>
        <span className="ml-auto font-mono text-xs tabular text-text-2">{progress}%</span>
      </div>

      <div className="mt-2">
        <ProgressBar value={progress} height={6} tone={goal.status === 'behind' ? 'error' : goal.status === 'at-risk' ? 'warning' : 'accent'} />
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-text-3">
        <span>{daysLeft(goal.deadline)} {t('days left ·')} {formatDate(goal.deadline)}</span>
        <span className="group-hover:text-text-2">{goal.milestones.filter((m) => m.status === 'done').length}/{goal.milestones.length} {t('milestones')}</span>
      </div>
    </motion.button>
  );
}

export default function GoalsPage() {
  const { state, openCreateGoal } = useAtlas();
  const [selected, setSelected] = useState<Goal | null>(null);

  const primary = state.goals.find((g) => g.id === 'g-revenue') ?? state.goals[0];
  const others = state.goals.filter((g) => g.id !== primary?.id);

  return (
    <div className="py-8 space-y-8">
      <SectionHeader
        eyebrow={t('Goal operating system')}
        title={t('Goals')}
        description={t('Objectives, targets, assumptions and strategy — measured, not wished for.')}
        action={
          <Button variant="primary" size="sm" onClick={openCreateGoal}>
            <Plus className="h-3.5 w-3.5" /> {t('New goal')}
          </Button>
        }
      />

      {state.goals.length === 0 ? (
        <Surface padding={false}>
          <EmptyState
            icon={Target}
            title={t('No goals yet')}
            description={t('Give ATLAS something worth optimizing. A goal becomes a strategy, milestones and a next best action.')}
            action={
              <Button variant="primary" onClick={openCreateGoal}>
                <Plus className="h-3.5 w-3.5" /> {t('Create your first goal')}
              </Button>
            }
          />
        </Surface>
      ) : (
        <>
          {primary && <GoalCard goal={primary} onOpen={setSelected} featured />}
          {others.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {others.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onOpen={setSelected} />
              ))}
            </div>
          )}

          {primary && primary.aiRecommendation && (
            <Surface className="border-accent/20 bg-accent/[0.04]">
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="eyebrow mb-1 text-accent/80">{t('ATLAS recommends')}</p>
                  <p className="text-sm leading-relaxed text-text">{primary.aiRecommendation}</p>
                </div>
              </div>
            </Surface>
          )}
        </>
      )}

      <GoalDetailSheet goal={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
