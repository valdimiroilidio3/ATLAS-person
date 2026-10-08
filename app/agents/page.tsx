'use client';

// AGENTS — spec §09. The Agent Operating System.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Play, ShieldCheck } from 'lucide-react';
import { AGENT_STATUS_META, PERMISSION_LEVELS, permissionShort } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import type { Agent } from '@/lib/atlas/types';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { AgentDetailSheet } from '@/components/agents/agent-detail-sheet';
import { t } from '@/lib/i18n';

function AgentCard({ agent, onOpen }: { agent: Agent; onOpen: (a: Agent) => void }) {
  const { runAgent } = useAtlas();
  const meta = AGENT_STATUS_META[agent.status];
  const tone = meta.tone;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="surface p-5 sm:p-6 flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface2">
            <Bot className="h-5 w-5 text-text-2" aria-hidden />
          </span>
          <div>
            <h3 className="font-semibold tracking-tight">{agent.name}</h3>
            <p className="text-xs text-text-3">{agent.purpose}</p>
          </div>
        </div>
        <Badge tone={tone} pulse={agent.status === 'running'}>
          {t(meta.labelKey)}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="truncate text-text-3">{agent.currentTask}</span>
          <span className="ml-2 shrink-0 font-mono tabular text-text-2">{agent.progress}%</span>
        </div>
        <ProgressBar value={agent.progress} tone={agent.status === 'blocked' ? 'error' : 'accent'} height={5} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface2 px-2 py-0.5 text-[11px] text-text-3">
          <ShieldCheck className="h-3 w-3" />
          {permissionShort(agent.permissionLevel)} · {t(PERMISSION_LEVELS.find((p) => p.level === agent.permissionLevel)?.nameKey ?? '')}
        </span>
        {agent.approvalRequired && (
          <span className="rounded-md border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
            {t('approval required')}
          </span>
        )}
      </div>

      {agent.errors.length > 0 && (
        <p className="mt-3 truncate text-xs text-error">{agent.errors[agent.errors.length - 1]}</p>
      )}

      <div className="mt-auto pt-5 flex items-center justify-between">
        <button onClick={() => onOpen(agent)} className="text-xs text-text-3 transition-colors hover:text-text-2">
          {t('View details')}
        </button>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => {
            runAgent(agent.id, '');
          }}
        >
          <Play className="h-3 w-3" /> {t('Run')}
        </Button>
      </div>
    </motion.article>
  );
}

export default function AgentsPage() {
  const { state } = useAtlas();
  const [selected, setSelected] = useState<Agent | null>(null);

  const statusCounts = state.agents.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="py-8 space-y-8">
      <SectionHeader
        eyebrow={t('Agent operating system')}
        title={t('Agents')}
        description={t('Six specialists. Each has a purpose, tools, a permission level and a live state.')}
      />

      {/* Status strip */}
      <div className="flex flex-wrap gap-2">
        {(['idle', 'running', 'waiting', 'blocked', 'completed', 'error'] as const).map((s) => {
          const meta = AGENT_STATUS_META[s];
          const count = statusCounts[s] ?? 0;
          if (count === 0 && s !== 'idle') return null;
          return (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5"
            >
              <Badge tone={meta.tone} pulse={s === 'running'}>
                {t(meta.labelKey)}
              </Badge>
              <span className="font-mono text-xs tabular text-text-2">{count}</span>
            </span>
          );
        })}
      </div>

      {state.agents.length === 0 ? (
        <Surface padding={false}>
          <EmptyState
            icon={Bot}
            title={t('No agents configured')}
            description={t('ATLAS ships with SCOUT, RESEARCH, CONTENT, SEO, EXECUTION and DEPLOYMENT agents.')}
          />
        </Surface>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onOpen={setSelected} />
          ))}
        </div>
      )}

      <AgentDetailSheet agent={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
