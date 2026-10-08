'use client';

// MOMENTUM — spec §05. Goal progression with honest labels:
// actual · projected · target — never fabricated financial data.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import { goalProgress } from '@/lib/atlas/engine';
import { daysLeft, formatCurrency, formatDate } from '@/lib/atlas/format';
import { ProgressBar } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { fetchExchangeRates, type ExchangeRates } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/registry';

function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}) {
  const valueTone = {
    neutral: 'text-text',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning',
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-surface2 p-3.5">
      <p className="eyebrow">{label}</p>
      <p className={cn('mt-1.5 text-xl font-semibold tabular tracking-tight', valueTone)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-3">{sub}</p>}
    </div>
  );
}

function LiveRates() {
  const { state } = useAtlas();
  const enabled =
    state.apiConfig.features.liveRates && isApiEnabled(state.apiConfig.enabled, 'frankfurter');
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const result = await fetchExchangeRates();
      if (cancelled) return;
      if (result.ok && result.data) setRates(result.data);
      else setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="mt-6 hairline pt-5">
        <p className="text-xs text-text-3">
          {t('Live rates are off — enable “Live exchange rates” in the Admin · API Hub.')}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 hairline pt-5">
      <p className="eyebrow mb-2">{t('Live rate · ECB')}</p>
      {rates ? (
        <p className="text-sm text-text-2">
          {t('1 EUR = {usd} USD · {gbp} GBP', {
            usd: rates.usd.toFixed(4),
            gbp: rates.gbp.toFixed(4),
          })}{' '}
          <span className="text-text-3">
            ({t('European Central Bank, via Frankfurter')} · {rates.date})
          </span>
        </p>
      ) : failed ? (
        <p className="text-sm text-warning">{t('Live rates unavailable from this network right now.')}</p>
      ) : (
        <p className="text-sm text-text-3">{t('Loading live rates…')}</p>
      )}
    </div>
  );
}

export function Momentum() {
  const { state } = useAtlas();
  const goal = state.goals.find((g) => g.id === 'g-revenue') ?? state.goals[0];
  if (!goal) return null;

  const progress = goalProgress(goal);
  const currency = goal.currency ?? state.preferences.currency;
  const projected = goal.projected ?? Math.round(goal.current);
  const gap = Math.max(0, goal.target - goal.current);
  const shortfall = Math.max(0, goal.target - projected);
  const remainingDays = daysLeft(goal.deadline);

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t('Momentum')}</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-text-3">
          <TrendingUp className="h-3.5 w-3.5" /> {goal.title}
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="surface p-6"
      >
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left: the progression */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5">
              <span className="display text-3xl tabular">
                {formatCurrency(goal.current, currency)}
              </span>
              <span className="text-lg text-text-3">
                → {formatCurrency(goal.target, currency)}
                {goal.unit === 'currency' ? t(' / month') : ''}
              </span>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-text-3">{t('Progress')}</span>
                <span className="font-mono tabular text-text-2">{progress}%</span>
              </div>
              <ProgressBar value={progress} height={8} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-text-2">
              {shortfall > 0 ? (
                <>
                  {t('At your current trajectory you project')}{' '}
                  <span className="font-medium text-text">{formatCurrency(projected, currency)}</span> —{' '}
                  <span className="font-medium text-warning">
                    {formatCurrency(shortfall, currency)} {t('short')}
                  </span>{' '}
                  {t('of target by')} {formatDate(goal.deadline)}.
                </>
              ) : (
                <>
                  {t('Projected')} <span className="font-medium text-text">{formatCurrency(projected, currency)}</span>{' '}
                  {t('meets the target by')} {formatDate(goal.deadline)}.
                </>
              )}
            </p>
          </div>

          {/* Right: the numbers, honestly labelled */}
          <div className="grid w-full max-w-md grid-cols-2 gap-2.5 lg:max-w-sm">
            <Stat label={t('Actual · MTD')} value={formatCurrency(goal.current, currency)} tone="accent" sub={t('this month')} />
            <Stat label={t('Target')} value={formatCurrency(goal.target, currency)} sub={t('per month')} />
            <Stat
              label={t('Projected')}
              value={formatCurrency(projected, currency)}
              sub={t('estimated')}
              tone={shortfall > 0 ? 'warning' : 'success'}
            />
            <Stat label={t('Remaining gap')} value={formatCurrency(gap, currency)} sub={`${remainingDays} days left`} />
          </div>
        </div>

        <LiveRates />

        <div className="mt-6 hairline pt-5">
          <p className="eyebrow mb-2.5">{t('Required pace · your assumptions')}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {goal.assumptions.map((a) => (
              <span key={a} className="text-sm text-text-2">
                {a}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-text-3">
            {t('This is a strategic planning interface based on user-defined assumptions — not financial advice. Actuals come from connected sources only.')}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
