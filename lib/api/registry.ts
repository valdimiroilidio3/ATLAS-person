// Free-API registry — every external API ATLAS integrates with.
//
// Tier is always "free" and every API is keyless except GitHub, where a
// token is OPTIONAL (raises the rate limit from 60 → 5,000 req/h). The
// token never leaves the server: it is stored in server memory and used
// only by the Next.js route handlers under app/api/.
//
// scope: "client"  → called from the browser (CORS-enabled, keyless).
//        "server"  → called through a Next.js route handler (key stays server-side).

export type ApiId =
  | 'github'
  | 'npm'
  | 'rest-countries'
  | 'frankfurter'
  | 'hacker-news'
  | 'stack-exchange'
  | 'dev-to'
  | 'wikipedia'
  | 'quotable'
  | 'clearbit'
  | 'nationalize'
  | 'ipify';

export interface ApiDefinition {
  id: ApiId;
  name: string;
  provider: string;
  tier: 'free';
  /** "none" = no key needed · "optional" = key improves limits, never required. */
  keyRequired: 'none' | 'optional';
  scope: 'client' | 'server';
  /** Dictionary key describing the feature this API powers. */
  powersKey: string;
  /** Human-readable endpoint (or docs link) shown in the Admin hub. */
  endpoint: string;
  docsUrl: string;
}

export const API_REGISTRY: ApiDefinition[] = [
  {
    id: 'github',
    name: 'GitHub REST API',
    provider: 'GitHub',
    tier: 'free',
    keyRequired: 'optional',
    scope: 'server',
    powersKey: 'Live repository stats in the ORBITA project sheet (stars, forks, open issues, language, last push).',
    endpoint: 'api.github.com',
    docsUrl: 'https://docs.github.com/en/rest',
  },
  {
    id: 'npm',
    name: 'npm Registry',
    provider: 'npm',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Version-check signal in Radar — “a new Next.js version is available”.',
    endpoint: 'registry.npmjs.org',
    docsUrl: 'https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md',
  },
  {
    id: 'rest-countries',
    name: 'REST Countries',
    provider: 'restcountries.com',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Prospect enrichment in Radar — capital, currency and population for each company’s country.',
    endpoint: 'restcountries.com/v3.1',
    docsUrl: 'https://restcountries.com',
  },
  {
    id: 'frankfurter',
    name: 'Frankfurter',
    provider: 'frankfurter.app',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Live ECB exchange rates in the Momentum section (EUR → USD / GBP).',
    endpoint: 'api.frankfurter.app',
    docsUrl: 'https://frankfurter.dev',
  },
  {
    id: 'hacker-news',
    name: 'Hacker News (Firebase)',
    provider: 'news.ycombinator.com',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Live tech-trend signals in Radar — current top stories.',
    endpoint: 'hacker-news.firebaseio.com/v0',
    docsUrl: 'https://github.com/HackerNews/API',
  },
  {
    id: 'stack-exchange',
    name: 'Stack Exchange API',
    provider: 'stackexchange.com',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Live developer signals in Radar — hot questions on Stack Overflow.',
    endpoint: 'api.stackexchange.com/2.3',
    docsUrl: 'https://api.stackexchange.com/docs',
  },
  {
    id: 'dev-to',
    name: 'Dev.to API',
    provider: 'dev.to',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Live article trends in Radar — top published article right now.',
    endpoint: 'dev.to/api',
    docsUrl: 'https://developers.forem.com/api',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia API',
    provider: 'wikipedia.org',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Quick research summaries for companies and topics.',
    endpoint: 'en.wikipedia.org/w/api.php',
    docsUrl: 'https://www.mediawiki.org/wiki/API:Main_page',
  },
  {
    id: 'quotable',
    name: 'Quotable',
    provider: 'quotable.io',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Quote of the day in the daily briefing.',
    endpoint: 'api.quotable.io',
    docsUrl: 'https://github.com/lukePeavey/quotable',
  },
  {
    id: 'clearbit',
    name: 'Clearbit Logo API',
    provider: 'clearbit.com',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Company logos for every prospect in the Radar prospects panel.',
    endpoint: 'logo.clearbit.com/{domain}',
    docsUrl: 'https://clearbit.com/docs#logo-api',
  },
  {
    id: 'nationalize',
    name: 'Nationalize API',
    provider: 'nationalize.io',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Probable origin of each prospect’s first name (lead-context chip).',
    endpoint: 'api.nationalize.io',
    docsUrl: 'https://nationalize.io',
  },
  {
    id: 'ipify',
    name: 'IPify',
    provider: 'ipify.org',
    tier: 'free',
    keyRequired: 'none',
    scope: 'client',
    powersKey: 'Admin diagnostics — shows the public egress IP of this deployment.',
    endpoint: 'api.ipify.org',
    docsUrl: 'https://www.ipify.org',
  },
];

export function getApiDefinition(id: ApiId): ApiDefinition | undefined {
  return API_REGISTRY.find((a) => a.id === id);
}

export function isApiEnabled(enabled: Record<string, boolean>, id: ApiId): boolean {
  return enabled[id] !== false;
}
