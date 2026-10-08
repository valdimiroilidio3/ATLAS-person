'use client';

// TODAY — spec §03. What needs attention, with priority, status, context
// and a recommended action. Every action is wired to the execution engine.

import { motion } from 'framer-motion';
import { ArrowRight, Flame, Users, Package, AlertTriangle } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import {
  catalogPlan,
  deployPlan,
  deriveNextBestAction,
  deriveProjectProgress,
  sendApprovedPlan,
} from '@/lib/atlas/engine';
import { PROJECT_STATUS_META } from '@/lib/atlas/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TodayItem {
  key: string;
  priority: string;
  title: string;
  context: string;
  statusLabel: string;
  tone: 'error' | 'accent' | 'warning' | 'info';
  actionLabel: string;
  onAction: () => void;
  icon: typeof Flame;
  disabled?: boolean;
}

export function TodaySection() {
  const { state, openExecutionPreview } = useAtlas();

  const items: TodayItem[] = [];

  const orbita = state.projects.find((p) => p.id === 'p-orbita');
  const weaf = state.projects.find((p) => p.id === 'p-weaf');
  const fresh = state.opportunities.filter((o) => o.status === 'new' && !o.outreachApproved);
  const approved = state.opportunities.filter((o) => o.outreachApproved && o.status === 'new');

  if (approved.length > 0) {
    items.push({
      key: 'send',
      priority: 'P1',
      title: 'SCOUT',
      context: `${approved.length} approved messages are ready — a connected channel is missing.`,
      statusLabel: 'READY TO SEND',
      tone: 'warning',
      actionLabel: 'Send',
      icon: Users,
      onAction: () =>
        openExecutionPreview({
          agentId: 'a-scout',
          objective: `Send ${approved.length} approved messages`,
          kind: 'send-approved',
          steps: sendApprovedPlan(approved.length),
          linkedOpportunityIds: approved.map((o) => o.id),
        }),
    });
  }

  if (fresh.length > 0) {
    items.push({
      key: 'scout',
      priority: 'P1',
      title: 'SCOUT',
      context: `${fresh.length} high-intent prospects detected. Scored against your ICP.`,
      statusLabel: 'ACTIONABLE',
      tone: 'accent',
      actionLabel: 'Execute',
      icon: Users,
      onAction: () => {
        const nba = deriveNextBestAction(state);
        if (nba) openExecutionPreview(nba.plan);
      },
    });
  }

  if (orbita) {
    const blocked = orbita.status === 'blocked';
    items.push({
      key: 'orbita',
      priority: blocked ? 'P1' : 'P2',
      title: 'ORBITA',
      context: blocked
        ? 'Launch blocked by deployment configuration — environment variables are missing.'
        : `Launch in progress — ${deriveProjectProgress(orbita)}% complete.`,
      statusLabel: PROJECT_STATUS_META[orbita.status].label,
      tone: blocked ? 'error' : 'accent',
      actionLabel: blocked ? 'Resolve' : 'Review',
      icon: blocked ? AlertTriangle : Flame,
      onAction: () =>
        openExecutionPreview({
          agentId: 'a-execution',
          objective: blocked ? 'Resolve the ORBITA deployment blocker' : 'Prepare and deploy ORBITA',
          kind: 'deploy',
          steps: deployPlan(orbita),
          linkedProjectId: orbita.id,
        }),
    });
  }

  if (weaf) {
    const active = weaf.milestones.find((m) => m.status === 'active');
    const done = !active;
    items.push({
      key: 'weaf',
      priority: done ? 'P3' : 'P2',
      title: 'WEAF',
      context: done
        ? `Product catalog complete — ${deriveProjectProgress(weaf)}%.`
        : 'Product catalog requires completion — one item remains.',
      statusLabel: done ? 'COMPLETED' : 'IN PROGRESS',
      tone: done ? 'info' : 'warning',
      actionLabel: done ? 'Completed' : 'Complete',
      icon: Package,
      disabled: done,
      onAction: done
        ? () => {}
        : () =>
            openExecutionPreview({
              agentId: 'a-content',
              objective: 'Complete the WEAF catalog',
              kind: 'catalog',
              steps: catalogPlan(weaf),
              linkedProjectId: weaf.id,
            }),
    });
  }

  // Keep the three most important, in priority order.
  const visible = items.slice(0, 3);

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Today</h2>
        <p className="text-sm text-text-2">
          {visible.length} {visible.length === 1 ? 'thing' : 'things'} need your attention.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {visible.map((item, i) => (
          <motion.article
            key={item.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className="surface flex flex-col p-5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-text-3">{item.priority}</span>
              <Badge tone={item.tone}>{item.statusLabel}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface2">
                <item.icon className="h-4 w-4 text-text-2" aria-hidden />
              </span>
              <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
            </div>
            <p className="mt-2.5 flex-1 text-sm leading-relaxed text-text-2">{item.context}</p>
            <div className="mt-4 hairline pt-4">
              <p className="eyebrow mb-2">Recommended action</p>
              <Button
                variant={item.key === 'scout' || item.key === 'send' ? 'primary' : 'ghost'}
                size="sm"
                className="w-full"
                onClick={item.onAction}
                disabled={item.disabled}
              >
                {item.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
