'use client';

// Live tech signals for the Radar — powered by four free, keyless APIs
// (Hacker News, Stack Exchange, Dev.to, npm Registry). Honest states:
// loading → data | unreachable | disabled (admin toggle).

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, ExternalLink, RefreshCw } from 'lucide-react';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { useAtlas } from '@/lib/atlas/store';
import { fetchLiveSignals, type LiveSignal } from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/registry';
import { t } from '@/lib/i18n';

const SOURCE_TONE: Record<LiveSignal['source'], string> = {
  'Hacker News': 'text-accent',
  'Stack Overflow': 'text-accent',
  'Dev.to': 'text-accent',
  npm: 'text-accent',
};

export function LiveSignals() {
  const { state } = useAtlas();
  const enabled =
    state.apiConfig.features.liveSignals &&
    ['hacker-news', 'stack-exchange', 'dev-to', 'npm'].every((id) =>
      isApiEnabled(state.apiConfig.enabled, id as never),
    );

  const [signals, setSignals] = useState<LiveSignal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchLiveSignals();
    setLoading(false);
    if (result.ok && result.data) {
      setSignals(result.data);
      setLatencyMs(result.latencyMs);
    } else {
      setSignals(null);
      setError(result.error ?? t('Unavailable'));
    }
  };

  useEffect(() => {
    if (!enabled) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) {
    return (
      <Surface>
        <p className="eyebrow mb-2">{t('Live signals')}</p>
        <p className="text-sm text-text-3">
          {t('Live signals are off — enable them in Admin · API Hub to see Hacker News, Stack Overflow, Dev.to and npm trends here.')}
        </p>
      </Surface>
    );
  }

  return (
    <Surface>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="h-3.5 w-3.5 text-accent" aria-hidden />
          <p className="eyebrow">{t('Live signals')}</p>
          {latencyMs !== null && (
            <span className="font-mono text-[10px] tabular text-text-3">{latencyMs}ms</span>
          )}
        </div>
        <Button variant="subtle" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('Refresh')}
        </Button>
      </div>

      {signals && signals.length > 0 ? (
        <motion.ul
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-1.5"
        >
          {signals.map((s) => (
            <li key={s.id} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.03]">
              <span className={`mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-wider ${SOURCE_TONE[s.source]}`}>
                {s.source}
              </span>
              <span className="min-w-0 flex-1">
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-text-2 transition-colors hover:text-text inline-flex items-center gap-1"
                  >
                    <span className="truncate">{s.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-text-3" aria-hidden />
                  </a>
                ) : (
                  <span className="text-text-2">{s.title}</span>
                )}
                {s.meta && <span className="ml-2 text-xs text-text-3">{s.meta}</span>}
              </span>
            </li>
          ))}
        </motion.ul>
      ) : error ? (
        <p className="text-sm text-warning">
          {t('Live signals unavailable from this network: {error}', { error })}
        </p>
      ) : (
        <p className="text-sm text-text-3">{t('Loading live signals…')}</p>
      )}

      <p className="mt-3 text-[11px] text-text-3">
        {t('Free, keyless APIs: Hacker News · Stack Exchange · Dev.to · npm Registry')}
      </p>
    </Surface>
  );
}
