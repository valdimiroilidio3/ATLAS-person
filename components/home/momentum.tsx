'use client';

// MOMENTUM — spec §05. Goal progression with honest labels:
// actual · projected · target — never fabricated financial data.

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import { goalProgress } from '@/lib/atlas/engine';
import { daysLeft, formatCurrency, formatDate } from '@/lib/atlas/format';
import { ProgressBar } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}) {
  const valueTone = {
    neutral: 'text-text',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-surface2 p-3.5">
      <p className="eyebrow">{label}</p>
      <p className={cn('mt-1.5 text-xl font-semibold tabular tracking-tight', valueTone)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-3">{sub}</p>}
    </div>
  );
}

export function Momentum() {
  const { state } = useAtlas();
  const goal = state.goals.find((g) => g.id === 'g-revenue') ?? state.goals[0];
  if (!goal) return null;

  const progress = goalProgress(goal);
  const currency = goal.currency ?? state.preferences.currency;
  const projected = goal.projected ?? Math.round(goal.current);
  const gap = Math.max(0, goal.target - goal.current);
  const shortfall = Math.max(0, goal.target - projected);
  const remainingDays = daysLeft(goal.deadline);

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Momentum</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-3">
          <TrendingUp className="h-3.5 w-3.5" /> {goal.title}
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="surface p-6"
      >
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left: the progression */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5">
              <span className="display text-3xl tabular">
                {formatCurrency(goal.current, currency)}
              </span>
              <span className="text-lg text-text-3">
                → {formatCurrency(goal.target, currency)}
                {goal.unit === 'currency' ? ' / month' : ''}
              </span>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-text-3">Progress</span>
                <span className="font-mono tabular text-text-2">{progress}%</span>
              </div>
              <ProgressBar value={progress} height={8} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-text-2">
              {shortfall > 0 ? (
                <>
                  At your current trajectory you project{' '}
                  <span className="font-medium text-text">{formatCurrency(projected, currency)}</span> —{' '}
                  <span className="font-medium text-warning">
                    {formatCurrency(shortfall, currency)} short
                  </span>{' '}
                  of target by {formatDate(goal.deadline)}.
                </>
              ) : (
                <>
                  Projected <span className="font-medium text-text">{formatCurrency(projected, currency)}</span>{' '}
                  meets the target by {formatDate(goal.deadline)}.
                </>
              )}
            </p>
          </div>

          {/* Right: the numbers, honestly labelled */}
          <div className="grid w-full max-w-md grid-cols-2 gap-2.5 lg:max-w-sm">
            <Stat label="Actual · MTD" value={formatCurrency(goal.current, currency)} tone="accent" sub="this month" />
            <Stat label="Target" value={formatCurrency(goal.target, currency)} sub="per month" />
            <Stat
              label="Projected"
              value={formatCurrency(projected, currency)}
              sub="estimated"
              tone={shortfall > 0 ? 'warning' : 'success'}
            />
            <Stat label="Remaining gap" value={formatCurrency(gap, currency)} sub={`${remainingDays} days left`} />
          </div>
        </div>

        <div className="mt-6 hairline pt-5">
          <p className="eyebrow mb-2.5">Required pace · your assumptions</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {goal.assumptions.map((a) => (
              <span key={a} className="text-sm text-text-2">
                {a}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-text-3">
            This is a strategic planning interface based on user-defined assumptions — not financial advice.
            Actuals come from connected sources only.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
