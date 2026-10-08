'use client';

// NEXT BEST ACTION — spec §04. The single most important interactive
// component on the product. The Execute button opens a real execution flow.

import { motion } from 'framer-motion';
import { ArrowRight, Crosshair } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import { deriveNextBestAction } from '@/lib/atlas/engine';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Target } from 'lucide-react';
import { t } from '@/lib/i18n';

export function NextBestAction() {
  const { state, openExecutionPreview } = useAtlas();
  const nba = deriveNextBestAction(state);

  if (!nba) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{t('Next best action')}</h2>
        <EmptyState
          icon={Target}
          title={t('Nothing queued')}
          description={t('ATLAS found no pending high-value action. Create a goal or ask SCOUT to find opportunities.')}
        />
      </section>
    );
  }

  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-xl border border-accent/25 bg-surface p-6 sm:p-8 shadow-card"
      >
        <div
          className="absolute left-0 top-0 h-full w-[3px] bg-accent"
          aria-hidden
        />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-3 inline-flex items-center gap-1.5">
              <Crosshair className="h-3 w-3 text-accent" aria-hidden />
              {t('Next best action · P')}{nba.priority}
            </p>
            <h2 className="display text-2xl sm:text-3xl">{nba.title}</h2>
            <div className="mt-4 space-y-1.5">
              <p className="eyebrow">{t('Reasoning')}</p>
              {nba.reasoning.map((line) => (
                <p key={line} className="flex items-start gap-2 text-sm text-text-2">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/70" aria-hidden />
                  {line}
                </p>
              ))}
            </div>
          </div>
          <div className="shrink-0">
            <Button
              variant="primary"
              size="lg"
              className="w-full lg:w-auto px-7"
              onClick={() => openExecutionPreview(nba.plan)}
            >
              {t('Execute')} <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-2 text-center text-xs text-text-3 lg:text-right">
              {t('ATLAS shows the full plan before anything runs.')}
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
