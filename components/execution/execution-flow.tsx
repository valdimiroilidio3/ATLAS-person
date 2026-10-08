'use client';

// Execution flow — spec §04 + §10.
//
// Two phases:
//   1. PREVIEW — ATLAS shows exactly what it will do before anything runs.
//   2. LIVE    — the run state machine plays out step by step, with real
//                states: thinking → preparing → executing → approval → blocked/completed.

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  PauseCircle,
  Play,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { PERMISSION_LEVELS, RUN_STATUS_META, permissionShort } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { cn } from '@/lib/utils';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress';
import { ErrorState } from '@/components/ui/error-state';
import type { AgentRun, RunStep } from '@/lib/atlas/types';

function StepIcon({ step, runStatus }: { step: RunStep; runStatus: AgentRun['status'] }) {
  if (step.status === 'done') return <Check className="h-4 w-4 text-success" aria-hidden />;
  if (step.status === 'blocked') return <XCircle className="h-4 w-4 text-error" aria-hidden />;
  if (step.status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />;
  if (step.requiresApproval && runStatus === 'waiting-approval')
    return <PauseCircle className="h-4 w-4 text-warning" aria-hidden />;
  return <Circle className="h-4 w-4 text-text-3" aria-hidden />;
}

function StepRow({ step, index, runStatus }: { step: RunStep; index: number; runStatus: AgentRun['status'] }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3.5 py-2.5',
        step.status === 'done' && 'border-success/20 bg-success/[0.04]',
        step.status === 'running' && 'border-accent/30 bg-accent/[0.05]',
        step.status === 'blocked' && 'border-error/30 bg-error/[0.05]',
        step.status === 'pending' && 'border-border bg-surface',
        step.requiresApproval &&
          step.status === 'pending' &&
          runStatus === 'waiting-approval' &&
          'border-warning/30 bg-warning/[0.05]',
      )}
    >
      <span className="mt-0.5 shrink-0">
        <StepIcon step={step} runStatus={runStatus} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm',
            step.status === 'done' && 'text-text-2',
            step.status === 'pending' && 'text-text-2',
            (step.status === 'running' || step.status === 'blocked') && 'text-text',
          )}
        >
          {step.title}
        </p>
        {step.detail && <p className="mt-0.5 text-xs text-text-3">{step.detail}</p>}
        {step.requiresApproval && (
          <p className="mt-1">
            <span className="inline-flex items-center gap-1 rounded border border-warning/25 bg-warning/10 px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-warning">
              <ShieldAlert className="h-2.5 w-2.5" /> {permissionShort(step.approvalLevel ?? 3)} · your approval
              required
            </span>
          </p>
        )}
      </div>
    </motion.li>
  );
}

export default function ExecutionFlow() {
  const router = useRouter();
  const { state, ui, closeExecutionFlow, startRun, approve, openApprovalCenter, openExecutionRun } = useAtlas();

  const { open, plan, runId } = ui.executionFlow;
  const run = useMemo(() => state.runs.find((r) => r.id === runId), [state.runs, runId]);
  const agent = useMemo(() => {
    const id = run?.agentId ?? plan?.agentId;
    return state.agents.find((a) => a.id === id);
  }, [state.agents, run, plan]);

  if (!open) return null;

  const live = Boolean(run);
  const statusMeta = run ? RUN_STATUS_META[run.status] : null;

  // The approval this run is currently waiting on (if any).
  const waitingApproval =
    run?.status === 'waiting-approval'
      ? state.approvals.find((a) => a.id === run.steps[run.currentStepIndex]?.approvalId)
      : undefined;

  const blockedStep = run?.steps.find((s) => s.status === 'blocked');
  const blockedIntegration = blockedStep?.integrationId
    ? state.integrations.find((i) => i.id === blockedStep.integrationId)
    : undefined;

  function handleStart() {
    if (!plan) return;
    const id = startRun(plan);
    openExecutionRun(id);
  }

  return (
    <Modal open={open} onClose={closeExecutionFlow} maxWidth="max-w-xl" labelledBy="execution-flow-title">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">{live ? 'Execution · live' : 'Execution plan · preview'}</p>
            <h3 id="execution-flow-title" className="mt-1 truncate text-base font-semibold tracking-tight">
              {run?.objective ?? plan?.objective}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {agent && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface2 px-2 py-0.5 text-xs text-text-2">
                  <Bot className="h-3 w-3" />
                  {agent.name}
                </span>
              )}
              {agent && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface2 px-2 py-0.5 text-xs text-text-2">
                  <ShieldAlert className="h-3 w-3" />
                  {permissionShort(agent.permissionLevel)} ·{' '}
                  {PERMISSION_LEVELS.find((p) => p.level === agent.permissionLevel)?.name}
                </span>
              )}
              {statusMeta && (
                <Badge tone={statusMeta.tone} pulse={run?.status === 'executing' || run?.status === 'thinking'}>
                  {statusMeta.label}
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={closeExecutionFlow}
            aria-label="Close"
            className="rounded-lg p-1.5 text-text-3 transition-colors hover:bg-white/[0.06] hover:text-text"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>

        {live && run && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-text-3">
                Step {Math.min(run.currentStepIndex + 1, run.steps.length)} of {run.steps.length}
              </span>
              <span className="font-mono tabular text-text-2">{run.progress}%</span>
            </div>
            <ProgressBar
              value={run.progress}
              tone={run.status === 'blocked' ? 'error' : run.status === 'completed' ? 'success' : 'accent'}
            />
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="max-h-[46vh] overflow-y-auto px-6 py-4">
        <ol className="space-y-2">
          <AnimatePresence mode="popLayout">
            {(run?.steps ?? plan?.steps ?? []).map((step, i) => (
              <StepRow key={step.id} step={step} index={i} runStatus={run?.status ?? 'thinking'} />
            ))}
          </AnimatePresence>
        </ol>

        {/* Live: contextual states */}
        {live && run && run.status === 'waiting-approval' && waitingApproval && (
          <div className="mt-4">
            <ErrorState
              icon={PauseCircle}
              title="Waiting for your approval"
              reason={waitingApproval.description}
              action={
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => approve(waitingApproval.id)}>
                    <Check className="h-3.5 w-3.5" /> Approve &amp; continue
                  </Button>
                  <Button variant="ghost" size="sm" onClick={openApprovalCenter}>
                    Review in Approval Center
                  </Button>
                </div>
              }
            />
          </div>
        )}

        {live && run && run.status === 'blocked' && (
          <div className="mt-4">
            <ErrorState
              title={`Blocked — ${blockedStep?.title ?? 'a step cannot continue'}`}
              reason={run.error ?? blockedStep?.blockedReason ?? 'A required integration is not connected.'}
              action={
                <div className="flex flex-wrap gap-2">
                  {blockedIntegration && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        closeExecutionFlow();
                        router.push(`/settings?integration=${blockedIntegration.id}`);
                      }}
                    >
                      Connect {blockedIntegration.name}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={closeExecutionFlow}>
                    Dismiss
                  </Button>
                </div>
              }
            />
          </div>
        )}

        {live && run && run.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-3 rounded-lg border border-success/25 bg-success/[0.06] p-4"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
            <div>
              <p className="text-sm font-medium">Execution completed</p>
              <p className="mt-0.5 text-sm text-text-2">{run.result}</p>
            </div>
          </motion.div>
        )}

        {live && run && run.status === 'cancelled' && (
          <div className="mt-4">
            <ErrorState title="Execution cancelled" reason={run.error ?? 'The run was cancelled.'} />
          </div>
        )}
      </div>

      {/* Footer */}
      <ModalFooter>
        {!live && plan && (
          <>
            <p className="mr-auto inline-flex items-center gap-1.5 text-xs text-text-3">
              <Clock className="h-3.5 w-3.5" />
              Nothing runs until you start it. Sensitive steps pause for approval.
            </p>
            <Button variant="ghost" onClick={closeExecutionFlow}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStart}>
              <Play className="h-3.5 w-3.5" /> Start execution
            </Button>
          </>
        )}
        {live && run && ['completed', 'cancelled', 'blocked'].includes(run.status) && (
          <>
            <p className="mr-auto text-xs text-text-3">
              {run.status === 'blocked' ? 'Resolve the blocker, then start a new run.' : 'This run has finished.'}
            </p>
            <Button variant={run.status === 'completed' ? 'primary' : 'ghost'} onClick={closeExecutionFlow}>
              Done
            </Button>
          </>
        )}
        {live && run && ['thinking', 'preparing', 'executing'].includes(run.status) && (
          <p className="mr-auto inline-flex items-center gap-1.5 text-xs text-text-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> ATLAS is working — this updates live.
          </p>
        )}
        {live && run && run.status === 'waiting-approval' && !waitingApproval && (
          <Button variant="ghost" onClick={closeExecutionFlow}>
            Close
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
