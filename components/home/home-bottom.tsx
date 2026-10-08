'use client';

// Home bottom strip: agents snapshot · top radar insight · recent activity.

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { AGENT_STATUS_META, INSIGHT_META } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { formatTime, isToday, isYesterday } from '@/lib/atlas/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function dayLabel(iso: string): string {
  if (isToday(iso)) return 'Today';
  if (isYesterday(iso)) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function HomeBottom() {
  const { state } = useAtlas();

  const agents = state.agents.slice(0, 6);
  const topInsights = state.insights.slice(0, 2);
  const recent = state.activities.slice(0, 3);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Agents snapshot */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="surface p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Agents</h3>
          <Link href="/agents" className="text-xs text-text-3 hover:text-text-2">
            View all
          </Link>
        </div>
        <ul className="space-y-2.5">
          {agents.map((agent) => {
            const meta = AGENT_STATUS_META[agent.status];
            return (
              <li key={agent.id}>
                <Link
                  href="/agents"
                  className="group flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-white/[0.03]"
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      agent.status === 'running' && 'bg-accent animate-dot-pulse',
                      agent.status === 'idle' && 'bg-text-3',
                      agent.status === 'waiting' && 'bg-warning',
                      agent.status === 'blocked' && 'bg-error',
                      agent.status === 'completed' && 'bg-success',
                      agent.status === 'error' && 'bg-error',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{agent.name}</span>
                    <span className="block truncate text-xs text-text-3">{agent.currentTask}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-text-3">{agent.progress}%</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.section>

      {/* Radar preview */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="surface p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Radar</h3>
          <Link href="/radar" className="text-xs text-text-3 hover:text-text-2">
            View all
          </Link>
        </div>
        <ul className="space-y-3">
          {topInsights.map((insight) => {
            const meta = INSIGHT_META[insight.type];
            return (
              <li key={insight.id}>
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <p className="mt-1.5 text-[13px] font-medium leading-snug">{insight.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-text-2">{insight.recommendation}</p>
              </li>
            );
          })}
        </ul>
      </motion.section>

      {/* Recent activity */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.19, ease: [0.22, 1, 0.36, 1] }}
        className="surface p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Activity</h3>
          <Link href="/activity" className="inline-flex items-center gap-1 text-xs text-text-3 hover:text-text-2">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="space-y-2.5">
          {recent.map((event) => (
            <li key={event.id} className="flex items-start gap-3">
              <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular text-text-3">
                {isToday(event.time) ? formatTime(event.time) : dayLabel(event.time)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-text-2">
                  <span className="font-medium text-text">{event.actor}</span> {event.title}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </motion.section>
    </div>
  );
}
