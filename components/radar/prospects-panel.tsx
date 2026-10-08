'use client';

// Prospects panel for the Radar — enriches each opportunity with three
// free, keyless APIs: Clearbit (logo), REST Countries (country facts) and
// Nationalize (probable origin of the contact’s first name). Every piece
// degrades honestly: if an API is unreachable, that chip simply doesn’t
// render — the prospect itself is never hidden.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Globe2, MapPin, UserRound } from 'lucide-react';
import { Surface } from '@/components/ui/surface';
import { Badge } from '@/components/ui/badge';
import { useAtlas } from '@/lib/atlas/store';
import type { Opportunity } from '@/lib/atlas/types';
import {
  clearbitLogoUrl,
  fetchCountryFacts,
  fetchNameOrigin,
  type CountryFacts,
  type NameOrigin,
} from '@/lib/api/client';
import { isApiEnabled } from '@/lib/api/registry';
import { t } from '@/lib/i18n';

interface Enriched {
  facts?: CountryFacts;
  origins?: NameOrigin[];
  logoFailed?: boolean;
}

export function ProspectsPanel() {
  const { state } = useAtlas();
  const enabled = state.apiConfig.features.prospectEnrichment;
  const opportunities = state.opportunities.filter((o) => o.status === 'new');

  const [enriched, setEnriched] = useState<Record<string, Enriched>>({});

  const canClearbit = enabled && isApiEnabled(state.apiConfig.enabled, 'clearbit');
  const canCountries = enabled && isApiEnabled(state.apiConfig.enabled, 'rest-countries');
  const canNationalize = enabled && isApiEnabled(state.apiConfig.enabled, 'nationalize');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = async () => {
      const next: Record<string, Enriched> = {};
      await Promise.all(
        opportunities.map(async (o) => {
          const entry: Enriched = {};
          if (canCountries && o.country) {
            const r = await fetchCountryFacts(o.country);
            if (r.ok && r.data) entry.facts = r.data;
          }
          if (canNationalize && o.person) {
            const first = o.person.split(' ')[0];
            if (first) {
              const r = await fetchNameOrigin(first);
              if (r.ok && r.data && r.data.length > 0) entry.origins = r.data.slice(0, 2);
            }
          }
          next[o.id] = entry;
        }),
      );
      if (!cancelled) setEnriched(next);
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, canClearbit, canCountries, canNationalize, state.opportunities]);

  if (!enabled) {
    return (
      <Surface>
        <p className="eyebrow mb-2">{t('Prospects')}</p>
        <p className="text-sm text-text-3">
          {t('Prospect enrichment is off — enable it in Admin · API Hub to see company logos, country facts and name-origin signals here.')}
        </p>
      </Surface>
    );
  }

  if (opportunities.length === 0) return null;

  return (
    <Surface>
      <div className="mb-3 flex items-center gap-2.5">
        <Building2 className="h-3.5 w-3.5 text-accent" aria-hidden />
        <p className="eyebrow">{t('Prospects')}</p>
        <span className="font-mono text-[10px] tabular text-text-3">{opportunities.length}</span>
      </div>

      <ul className="space-y-1.5">
        {opportunities.map((o, i) => (
          <ProspectRow
            key={o.id}
            opportunity={o}
            index={i}
            entry={enriched[o.id]}
            canClearbit={canClearbit}
          />
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-text-3">
        {t('Enriched with free, keyless APIs: Clearbit Logo · REST Countries · Nationalize')}
      </p>
    </Surface>
  );
}

function ProspectRow({
  opportunity,
  index,
  entry,
  canClearbit,
}: {
  opportunity: Opportunity;
  index: number;
  entry?: Enriched;
  canClearbit: boolean;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = canClearbit && !!opportunity.domain && !logoFailed;
  const facts = entry?.facts;
  const topOrigin = entry?.origins?.[0];

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
    >
      {showLogo ? (
        <img
          src={clearbitLogoUrl(opportunity.domain!, 40)}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          onError={() => setLogoFailed(true)}
          className="h-7 w-7 shrink-0 rounded-md border border-border bg-surface2 object-contain"
        />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface2">
          <Building2 className="h-3.5 w-3.5 text-text-3" aria-hidden />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-text">{opportunity.company}</span>
          <span className="shrink-0 font-mono text-[10px] tabular text-accent">{opportunity.matchScore}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-3">
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3 w-3" aria-hidden />
            {opportunity.person}
            {opportunity.role ? ` · ${opportunity.role}` : ''}
          </span>
          {facts?.capital && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {facts.capital}
              {facts.currency ? ` · ${facts.currency}` : ''}
            </span>
          )}
          {topOrigin && (
            <Badge tone="info">
              <Globe2 className="h-3 w-3" aria-hidden />
              {t('likely origin: {country}', { country: topOrigin.countryId })}{' '}
              {Math.round(topOrigin.probability * 100)}%
            </Badge>
          )}
        </div>
      </div>

      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-text-3">{opportunity.source}</span>
    </motion.li>
  );
}
