'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb, Target } from 'lucide-react';
import type { Insight } from '@/lib/atlas/types';
import { INSIGHT_META } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { formatDate, formatTime, isToday } from '@/lib/atlas/format';
import { deriveNextBestAction } from '@/lib/atlas/engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const { state, openExecutionPreview, openExecutionRun } = useAtlas();
  const meta = INSIGHT_META[insight.type];

  const handleAction = () => {
    switch (insight.actionKind) {
      case 'execute-nba': {
        const nba = deriveNextBestAction(state);
        if (nba) openExecutionPreview(nba.plan);
        break;
      }
      case 'open-execution': {
        const run = state.runs.find((r) => r.status === 'blocked');
        if (run) openExecutionRun(run.id);
        break;
      }
      case 'connect': {
        if (insight.integrationId) {
          const el = document.querySelector(`[data-integration="${insight.integrationId}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      }
      case 'view-project': {
        if (insight.projectId) {
          window.location.href = '/projects';
        }
        break;
      }
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="surface p-5 flex flex-col"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="font-mono text-[10px] text-text-3">{isToday(insight.createdAt) ? formatTime(insight.createdAt) : formatDate(insight.createdAt)}</span>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug">{insight.title}</h3>
      <p className="mt-1.5 text-sm text-text-2">{insight.description}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface2 p-3">
          <p className="eyebrow mb-1">Why this matters</p>
          <p className="text-xs leading-relaxed text-text-2">{insight.whyItMatters}</p>
        </div>
        <div className="rounded-lg border border-accent/20 bg-accent/[0.05] p-3">
          <p className="eyebrow mb-1 text-accent/80">What ATLAS recommends</p>
          <p className="text-xs leading-relaxed text-text">{insight.recommendation}</p>
        </div>
      </div>

      {insight.actionLabel && (
        <div className="mt-4 pt-3 hairline">
          <Button variant="ghost" size="sm" onClick={handleAction}>
            {insight.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </motion.article>
  );
}
