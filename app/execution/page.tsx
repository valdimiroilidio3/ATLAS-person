'use client';

// EXECUTION CENTER — spec §10. Mission control for agent runs.

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Gauge,
  Loader2,
  PauseCircle,
  Play,
  Plus,
  XCircle,
} from 'lucide-react';
import { RUN_STATUS_META } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { deriveNextBestAction } from '@/lib/atlas/engine';
import { formatDate, formatTime, isToday } from '@/lib/atlas/format';
import type { AgentRun, RunStep } from '@/lib/atlas/types';
import { cn } from '@/lib/utils';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { t } from '@/lib/i18n';

function stepIcon(step: RunStep, runStatus: AgentRun['status']) {
  if (step.status === 'done') return <Check className="h-3.5 w-3.5 text-success" aria-hidden />;
  if (step.status === 'blocked') return <XCircle className="h-3.5 w-3.5 text-error" aria-hidden />;
  if (step.status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden />;
  if (step.requiresApproval && runStatus === 'waiting-approval')
    return <PauseCircle className="h-3.5 w-3.5 text-warning" aria-hidden />;
  return <Circle className="h-3.5 w-3.5 text-text-3" aria-hidden />;
}

function RunCard({ run, onOpen }: { run: AgentRun; onOpen: (r: AgentRun) => void }) {
  const { state, approve, openApprovalCenter } = useAtlas();
  const agent = state.agents.find((a) => a.id === run.agentId);
  const meta = RUN_STATUS_META[run.status];

  const waitingApproval =
    run.status === 'waiting-approval'
      ? state.approvals.find((a) => a.id === run.steps[run.currentStepIndex]?.approvalId)
      : undefined;

  const blockedStep = run.steps.find((s) => s.status === 'blocked');

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="surface p-5 flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-border bg-surface2 px-2 py-0.5 text-xs text-text-2">
              {agent?.name ?? 'ATLAS'}
            </span>
            <Badge tone={meta.tone} pulse={run.status === 'executing' || run.status === 'thinking'}>
              {t(meta.labelKey)}
            </Badge>
          </div>
          <h3 className="mt-2 text-sm font-semibold leading-snug">{run.objective}</h3>
          <p className="mt-0.5 text-xs text-text-3">
            {t('Started')} {isToday(run.startedAt) ? formatTime(run.startedAt) : formatDate(run.startedAt)} · {run.createdBy === 'atlas' ? 'initiated by ATLAS' : 'initiated by you'}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm tabular text-text-2">{run.progress}%</span>
      </div>

      <div className="mt-3">
        <ProgressBar
          value={run.progress}
          height={5}
          tone={run.status === 'blocked' ? 'error' : run.status === 'completed' ? 'success' : 'accent'}
        />
      </div>

      <ol className="mt-4 space-y-1.5">
        {run.steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2 text-xs">
            <span className="shrink-0">{stepIcon(step, run.status)}</span>
            <span
              className={cn(
                'truncate',
                step.status === 'done' ? 'text-text-3 line-through' : 'text-text-2',
                step.status === 'blocked' && 'text-error',
              )}
            >
              {step.title}
            </span>
            {step.requiresApproval && (
              <span className="ml-auto shrink-0 rounded border border-warning/25 bg-warning/10 px-1 py-px font-mono text-[9px] uppercase tracking-wider text-warning">
                {t('approval')}
              </span>
            )}
          </li>
        ))}
      </ol>

      {run.error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-error/25 bg-error/[0.05] px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error" aria-hidden />
          <p className="text-xs text-text-2">{run.error}</p>
        </div>
      )}

      {run.result && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-success/25 bg-success/[0.05] px-3 py-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          <p className="text-xs text-text-2">{run.result}</p>
        </div>
      )}

      <div className="mt-auto pt-4 flex items-center justify-end gap-2">
        {run.status === 'waiting-approval' && waitingApproval && (
          <>
            <Button variant="ghost" size="sm" onClick={openApprovalCenter}>
              {t('Approval Center')}
            </Button>
            <Button variant="primary" size="sm" onClick={() => approve(waitingApproval.id)}>
              <Check className="h-3 w-3" /> {t('Approve')}
            </Button>
          </>
        )}
        {run.status === 'blocked' && blockedStep?.integrationId && (
          <Button variant="subtle" size="sm" onClick={() => onOpen(run)}>
            {t('Review blocker')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onOpen(run)}>
          {t('Inspect')}
        </Button>
      </div>
    </motion.article>
  );
}

export default function ExecutionPage() {
  const { state, openExecutionPreview, openExecutionRun } = useAtlas();

  const runs = state.runs;
  const active = runs.filter((r) =>
    ['thinking', 'preparing', 'executing', 'waiting-approval'].includes(r.status),
  );
  const blocked = runs.filter((r) => r.status === 'blocked');
  const finished = runs.filter((r) => ['completed', 'cancelled', 'error'].includes(r.status));

  const nba = deriveNextBestAction(state);

  return (
    <div className="py-8 space-y-8">
      <SectionHeader
        eyebrow={t('Mission control')}
        title={t('Execution')}
        description={t('Every agent run, live. ATLAS distinguishes thinking, preparing, executing, approval, blocked and completed.')}
        action={
          nba ? (
            <Button variant="primary" size="sm" onClick={() => openExecutionPreview(nba.plan)}>
              <Plus className="h-3.5 w-3.5" /> {t('Execute next best action')}
            </Button>
          ) : undefined
        }
      />

      {/* State legend */}
      <div className="flex flex-wrap gap-2">
        {(['thinking', 'preparing', 'executing', 'waiting-approval', 'blocked', 'completed'] as const).map((s) => {
          const meta = RUN_STATUS_META[s];
          return (
            <span key={s} className="inline-flex items-center gap-1.5 text-xs text-text-3">
              <Badge tone={meta.tone}>{t(meta.labelKey)}</Badge>
            </span>
          );
        })}
      </div>

      {runs.length === 0 ? (
        <Surface padding={false}>
          <EmptyState
            icon={Gauge}
            title={t('Nothing running')}
            description={t('Start the next best action or run an agent. ATLAS will coordinate the work and pause for approvals.')}
            action={
              nba ? (
                <Button variant="primary" onClick={() => openExecutionPreview(nba.plan)}>
                  <Play className="h-3.5 w-3.5" /> {t('Execute —')} {nba.title}
                </Button>
              ) : undefined
            }
          />
        </Surface>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h3 className="eyebrow mb-3">{t('In flight ·')} {active.length}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((run) => (
                  <RunCard key={run.id} run={run} onOpen={(r) => openExecutionRun(r.id)} />
                ))}
              </div>
            </section>
          )}

          {blocked.length > 0 && (
            <section>
              <h3 className="eyebrow mb-3">{t('Blocked ·')} {blocked.length}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {blocked.map((run) => (
                  <RunCard key={run.id} run={run} onOpen={(r) => openExecutionRun(r.id)} />
                ))}
              </div>
            </section>
          )}

          {finished.length > 0 && (
            <section>
              <h3 className="eyebrow mb-3">{t('Finished ·')} {finished.length}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {finished.map((run) => (
                  <RunCard key={run.id} run={run} onOpen={(r) => openExecutionRun(r.id)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
