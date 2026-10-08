'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check, Circle, CircleDot, Flag, GitBranch, ListChecks, Target } from 'lucide-react';
import type { InterpretedIntent } from '@/lib/atlas/engine';
import { permissionShort } from '@/lib/atlas/constants';
import { formatDateLong } from '@/lib/atlas/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(value * 100)}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="font-mono text-[10px] text-text-3">{Math.round(value * 100)}% confidence</span>
    </div>
  );
}

function ChecklistItem({ title, status }: { title: string; status: 'done' | 'active' | 'todo' }) {
  return (
    <li className="flex items-center gap-2.5 py-1">
      {status === 'done' && <Check className="h-3.5 w-3.5 text-success" aria-hidden />}
      {status === 'active' && <CircleDot className="h-3.5 w-3.5 text-accent" aria-hidden />}
      {status === 'todo' && <Circle className="h-3.5 w-3.5 text-text-3" aria-hidden />}
      <span
        className={cn(
          'text-sm',
          status === 'done' ? 'text-text-2 line-through' : status === 'active' ? 'text-text' : 'text-text-2',
        )}
      >
        {title}
      </span>
    </li>
  );
}

function ChipList({ items, onPick }: { items: string[]; onPick?: (text: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((chip) => (
        <button
          key={chip}
          onClick={() => onPick?.(chip)}
          className="rounded-md border border-border bg-surface2 px-2.5 py-1 text-xs text-text-2 transition-colors hover:border-border-strong hover:text-text"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

/**
 * Renders ATLAS's structured response to a natural-language objective.
 * Spec §18: structured outputs, concise reasoning — no chain-of-thought.
 */
export function IntentResult({
  intent,
  onStartExecution,
  onCreateGoal,
  onPickChip,
  compact = false,
}: {
  intent: InterpretedIntent;
  onStartExecution?: () => void;
  onCreateGoal?: () => void;
  onPickChip?: (text: string) => void;
  compact?: boolean;
}) {
  const { goalPreview, plan, briefing, answer, summary } = intent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn('rounded-xl border border-border bg-surface', compact ? 'p-4 space-y-3' : 'p-5 space-y-4')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">ATLAS · {intent.type.replace(/-/g, ' ')}</p>
          <p className="mt-1 text-sm font-medium text-text">{summary}</p>
        </div>
        <ConfidenceMeter value={intent.confidence} />
      </div>

      {answer && <p className="text-sm leading-relaxed text-text-2">{answer}</p>}

      {briefing && (
        <div className="space-y-3">
          <div>
            <p className="eyebrow mb-1.5">Today's priorities</p>
            <ol className="space-y-1">
              {briefing.priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 font-mono text-[11px] text-text-3">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-text">{p}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-warning/25 bg-warning/[0.06] px-3 py-2">
            <p className="eyebrow mb-1 text-warning/80">Avoid</p>
            <p className="text-sm text-text-2">{briefing.avoid}</p>
          </div>
          <div className="rounded-lg border border-success/25 bg-success/[0.06] px-3 py-2">
            <p className="eyebrow mb-1 text-success/80">Opportunity</p>
            <p className="text-sm text-text-2">{briefing.opportunity}</p>
          </div>
        </div>
      )}

      {goalPreview && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Target className="h-3.5 w-3.5 text-text-3" aria-hidden />
              <span className="font-medium">{goalPreview.title}</span>
            </span>
            {goalPreview.deadline && (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-2">
                <Flag className="h-3.5 w-3.5 text-text-3" aria-hidden />
                {formatDateLong(goalPreview.deadline)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-sm text-text-2">
              <GitBranch className="h-3.5 w-3.5 text-text-3" aria-hidden />
              {permissionShort(goalPreview.requiredApproval)} · approval required
            </span>
          </div>

          {goalPreview.checklist && goalPreview.checklist.length > 0 && (
            <div>
              <p className="eyebrow mb-1.5">Plan</p>
              <ul className="divide-y divide-border/60 rounded-lg border border-border">
                {goalPreview.checklist.map((item) => (
                  <ChecklistItem key={item.title} title={item.title} status={item.status} />
                ))}
              </ul>
            </div>
          )}

          {!goalPreview.checklist && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="eyebrow mb-1.5">Strategy</p>
                <ul className="space-y-1">
                  {goalPreview.strategy.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-sm text-text-2">
                      <span className="h-1 w-1 rounded-full bg-accent/70" aria-hidden />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-1.5">Actions</p>
                <ul className="space-y-1">
                  {goalPreview.actions.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-sm text-text-2">
                      <ListChecks className="h-3.5 w-3.5 text-text-3" aria-hidden />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-1.5">Dependencies</p>
                <ul className="space-y-1">
                  {goalPreview.dependencies.map((d) => (
                    <li key={d} className="text-sm text-text-2">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-1.5">Risks</p>
                <ul className="space-y-1">
                  {goalPreview.risks.map((r) => (
                    <li key={r} className="text-sm text-text-2">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {plan && plan.steps.length > 0 && !goalPreview?.checklist && (
        <div>
          <p className="eyebrow mb-1.5">Execution plan</p>
          <ol className="space-y-1">
            {plan.steps.map((step, i) => (
              <li key={step.id} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 font-mono text-[11px] text-text-3">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-text-2">{step.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(onStartExecution || onCreateGoal) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {onStartExecution && plan && (
            <Button variant="primary" size="sm" onClick={onStartExecution}>
              Start execution <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {onCreateGoal && intent.type === 'build-strategy' && (
            <Button variant="subtle" size="sm" onClick={onCreateGoal}>
              Create this goal
            </Button>
          )}
          {intent.type === 'create-goal' && onCreateGoal && (
            <Button variant="primary" size="sm" onClick={onCreateGoal}>
              Create goal
            </Button>
          )}
        </div>
      )}

      <ChipList items={intent.suggestedChips} onPick={onPickChip} />
    </motion.div>
  );
}
