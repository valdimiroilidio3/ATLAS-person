'use client';

// Agent detail sheet — spec §09.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, Info, Play, ShieldCheck, Wrench } from 'lucide-react';
import type { Agent } from '@/lib/atlas/types';
import { AGENT_STATUS_META, PERMISSION_LEVELS, permissionShort } from '@/lib/atlas/constants';
import { timeAgo } from '@/lib/atlas/format';
import { useAtlas } from '@/lib/atlas/store';
import { SlideOver } from '@/components/ui/slide-over';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { Input } from '@/components/ui/inputs';
import { t } from '@/lib/i18n';

export function AgentDetailSheet({ agent, onClose }: { agent: Agent | null; onClose: () => void }) {
  const { runAgent } = useAtlas();
  const [objective, setObjective] = useState('');
  const open = Boolean(agent);
  const meta = agent ? AGENT_STATUS_META[agent.status] : null;

  const handleRun = () => {
    if (!agent) return;
    runAgent(agent.id, objective);
    setObjective('');
    onClose();
  };

  return (
    <SlideOver open={open} onClose={onClose} title={agent?.name} width="w-full max-w-xl">
      {agent && meta && (
        <div className="flex-1 space-y-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <Badge tone={meta.tone} pulse={agent.status === 'running'}>
              {t(meta.labelKey)}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              {permissionShort(agent.permissionLevel)} · {t(PERMISSION_LEVELS.find((p) => p.level === agent.permissionLevel)?.nameKey ?? '')}
              {agent.approvalRequired ? ' · approval required' : ' · no approval required'}
            </span>
          </div>

          <div>
            <p className="eyebrow">{t('Purpose')}</p>
            <p className="mt-1 text-sm text-text">{agent.purpose}</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-text-3">{t('Current task ·')} {agent.currentTask}</span>
              <span className="font-mono tabular text-text-2">{agent.progress}%</span>
            </div>
            <ProgressBar value={agent.progress} tone={agent.status === 'blocked' ? 'error' : 'accent'} />
          </div>

          <div>
            <p className="eyebrow mb-2">{t('Tools')}</p>
            <div className="flex flex-wrap gap-1.5">
              {agent.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface2 px-2.5 py-1 text-xs text-text-2"
                >
                  <Wrench className="h-3 w-3 text-text-3" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">{t('Run this agent')}</p>
            <div className="flex gap-2">
              <Input
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder={`What should ${agent.name} do?`}
                onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              />
              <Button variant="primary" size="md" onClick={handleRun}>
                <Play className="h-3.5 w-3.5" /> {t('Run')}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-text-3">
              {t('Sensitive steps pause for your approval. Results are logged to Activity.')}
            </p>
          </div>

          <div>
            <p className="eyebrow mb-2">{t('Results')}</p>
            {agent.results.length === 0 ? (
              <p className="text-sm text-text-3">{t('No results yet.')}</p>
            ) : (
              <ul className="space-y-1.5">
                {agent.results.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {agent.errors.length > 0 && (
            <div>
              <p className="eyebrow mb-2">{t('Errors')}</p>
              <ul className="space-y-1.5">
                {agent.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-error">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="eyebrow mb-2">{t('Activity')}</p>
            {agent.activity.length === 0 ? (
              <p className="text-sm text-text-3">{t('No activity yet.')}</p>
            ) : (
              <ul className="space-y-2">
                {agent.activity.map((a, i) => (
                  <motion.li
                    key={a.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <span className="shrink-0 pt-0.5 text-text-3">
                      {a.tone === 'success' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
                      ) : a.tone === 'error' ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-error" aria-hidden />
                      ) : a.tone === 'warning' ? (
                        <Clock className="h-3.5 w-3.5 text-warning" aria-hidden />
                      ) : (
                        <Info className="h-3.5 w-3.5 text-text-3" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-text-2">
                      {a.title}
                      <span className="ml-2 font-mono text-[10px] text-text-3">{timeAgo(a.time)}</span>
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  );
}
