'use client';

// RADAR — spec §14. The intelligence layer: opportunities, risks, signals, trends, blockers.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radar as RadarIcon } from 'lucide-react';
import { INSIGHT_META } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import type { InsightType } from '@/lib/atlas/types';
import { cn } from '@/lib/utils';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { EmptyState } from '@/components/ui/empty-state';
import { InsightCard } from '@/components/radar/insight-card';
import { LiveSignals } from '@/components/radar/live-signals';
import { ProspectsPanel } from '@/components/radar/prospects-panel';
import { t } from '@/lib/i18n';

const FILTERS: { id: InsightType | 'all'; labelKey: string }[] = [
  { id: 'all', labelKey: 'All' },
  { id: 'opportunity', labelKey: 'Opportunities' },
  { id: 'risk', labelKey: 'Risks' },
  { id: 'signal', labelKey: 'Signals' },
  { id: 'trend', labelKey: 'Trends' },
  { id: 'blocker', labelKey: 'Blockers' },
];

export default function RadarPage() {
  const { state } = useAtlas();
  const [filter, setFilter] = useState<InsightType | 'all'>('all');

  const insights = state.insights.filter((i) => filter === 'all' || i.type === filter);

  return (
    <div className="py-8 space-y-8">
      <SectionHeader
        eyebrow={t('Intelligence layer')}
        title={t('Radar')}
        description={t('Opportunities, risks, signals, trends and blockers — each with why it matters and what ATLAS recommends.')}
      />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = f.id === 'all' ? state.insights.length : state.insights.filter((i) => i.type === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                active
                  ? 'border-accent/40 bg-accent/10 text-text'
                  : 'border-border bg-surface text-text-2 hover:border-border-strong hover:text-text',
              )}
            >
              <span className={cn('font-mono uppercase tracking-wider')} style={{ color: f.id === 'all' ? undefined : 'inherit' }}>
                {f.id === 'all' ? t('All') : t(INSIGHT_META[f.id].labelKey)}
              </span>
              <span className="font-mono tabular text-text-3">{count}</span>
            </button>
          );
        })}
      </div>

      {insights.length === 0 ? (
        <Surface padding={false}>
          <EmptyState
            icon={RadarIcon}
            title={t('Radar is quiet')}
            description={t('No insights of this type right now. ATLAS surfaces opportunities, risks, signals, trends and blockers here.')}
          />
        </Surface>
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2">
          {insights.map((insight, i) => (
            <InsightCard key={insight.id} insight={insight} index={i} />
          ))}
        </motion.div>
      )}

      {/* Live layer — free, keyless APIs (Hacker News · Stack Exchange · Dev.to · npm) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LiveSignals />
        <ProspectsPanel />
      </div>
    </div>
  );
}
