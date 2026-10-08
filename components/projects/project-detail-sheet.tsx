'use client';

// Project detail sheet — spec §08.

import { motion } from 'framer-motion';
import { AlertTriangle, Check, Circle, CircleDot, Users } from 'lucide-react';
import type { Project } from '@/lib/atlas/types';
import { deriveProjectProgress } from '@/lib/atlas/engine';
import { PROJECT_STATUS_META } from '@/lib/atlas/constants';
import { formatDate, formatDateLong } from '@/lib/atlas/format';
import { useAtlas } from '@/lib/atlas/store';
import { cn } from '@/lib/utils';
import { SlideOver } from '@/components/ui/slide-over';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress';
import { ErrorState } from '@/components/ui/error-state';

export function ProjectDetailSheet({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { state } = useAtlas();
  const open = Boolean(project);
  const progress = project ? deriveProjectProgress(project) : 0;
  const meta = project ? PROJECT_STATUS_META[project.status] : null;

  const assignedAgents = project ? state.agents.filter((a) => project.agentIds.includes(a.id)) : [];
  const recentActivity = project
    ? state.activities.filter((a) => a.detail?.toLowerCase().includes(project.name.toLowerCase())).slice(0, 8)
    : [];

  return (
    <SlideOver open={open} onClose={onClose} title={project?.name} width="w-full max-w-xl">
      {project && meta && (
        <div className="flex-1 space-y-6 p-5">
          <div className="flex items-center justify-between">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="font-mono text-sm tabular text-text-2">{progress}%</span>
          </div>
          <ProgressBar value={progress} tone={project.status === 'blocked' ? 'error' : 'accent'} height={8} />

          <p className="text-sm leading-relaxed text-text-2">{project.objective}</p>

          {project.deadline && (
            <p className="text-xs text-text-3">Deadline · {formatDateLong(project.deadline)} ({formatDate(project.deadline)})</p>
          )}

          {project.blockers.length > 0 && (
            <div className="space-y-2">
              <p className="eyebrow">Blockers</p>
              {project.blockers.map((b) => (
                <ErrorState key={b.id} title={b.title} reason={b.reason} />
              ))}
            </div>
          )}

          <div>
            <p className="eyebrow mb-2">Milestones · {project.milestones.filter((m) => m.status === 'done').length}/{project.milestones.length}</p>
            <ul className="divide-y divide-border/60 rounded-lg border border-border">
              {project.milestones.map((m, i) => (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="flex items-center gap-2.5 px-3 py-2"
                >
                  {m.status === 'done' && <Check className="h-4 w-4 text-success" aria-hidden />}
                  {m.status === 'active' && <CircleDot className="h-4 w-4 text-accent" aria-hidden />}
                  {m.status === 'todo' && <Circle className="h-4 w-4 text-text-3" aria-hidden />}
                  <span className={cn('text-sm', m.status === 'done' ? 'text-text-2 line-through' : 'text-text')}>
                    {m.title}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-2">Agents</p>
            <div className="flex flex-wrap gap-2">
              {assignedAgents.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface2 px-2.5 py-1 text-xs text-text-2"
                >
                  <Users className="h-3 w-3 text-text-3" />
                  {a.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Next action</p>
            <p className="text-sm text-text">{project.nextAction}</p>
          </div>

          {recentActivity.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Recent activity</p>
              <ul className="space-y-2">
                {recentActivity.map((a) => (
                  <li key={a.id} className="text-sm text-text-2">
                    <span className="font-medium text-text">{a.actor}</span> {a.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </SlideOver>
  );
}
