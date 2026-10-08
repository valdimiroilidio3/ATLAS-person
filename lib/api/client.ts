// Client-side adapters for the free-API registry.
//
// Every adapter returns a structured { ok, data, error, latencyMs } result
// and never throws — the UI renders honest loading / error / data states.
// All of these APIs are keyless and CORS-enabled, so they are called
// directly from the browser. Nothing secret is ever exposed here.
//
// The only keyed API (GitHub) goes through the server route handlers.

import type { ApiId } from './registry';

export interface ApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  latencyMs: number;
}

async function timed<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
  const start = Date.now();
  try {
    const data = await fn();
    return { ok: true, data, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Request failed',
      latencyMs: Date.now() - start,
    };
  }
}

/** Explicit success result (avoids spreading generic-typed results). */
const okResult = <T,>(latencyMs: number, data: T): ApiResult<T> => ({ ok: true, data, latencyMs });
/** Explicit failure forwarded from another result. */
const failResult = (r: ApiResult<unknown>): ApiResult<never> => ({
  ok: false,
  error: r.error,
  latencyMs: r.latencyMs,
});

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const withTimeout = <T>(promise: Promise<T>, ms = 8000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);

// ---------------------------------------------------------------- probes (Admin "Test")

export interface ApiProbeSample {
  summary: string;
  detail?: string;
}

export async function probeApi(id: ApiId): Promise<ApiResult<ApiProbeSample>> {
  switch (id) {
    case 'npm': {
      const r = await timed(() =>
        withTimeout(getJson<{ version?: string; name?: string }>('https://registry.npmjs.org/next/latest')),
      );
      return r.ok
        ? okResult(r.latencyMs, { summary: `${r.data?.name ?? 'next'}@${r.data?.version ?? '?'}`, detail: 'registry.npmjs.org' })
        : failResult(r);
    }
    case 'rest-countries': {
      const r = await timed(() =>
        withTimeout(getJson<Array<{ name?: { common?: string } }>>('https://restcountries.com/v3.1/alpha/PT')),
      );
      return r.ok
        ? okResult(r.latencyMs, { summary: r.data?.[0]?.name?.common ?? 'Portugal', detail: 'restcountries.com/v3.1' })
        : failResult(r);
    }
    case 'frankfurter': {
      const r = await timed(() =>
        withTimeout(getJson<{ rates?: Record<string, number> }>('https://api.frankfurter.app/latest?from=USD&to=EUR')),
      );
      return r.ok
        ? okResult(r.latencyMs, { summary: `1 USD = ${r.data?.rates?.EUR ?? '?'} EUR`, detail: 'api.frankfurter.app (ECB rates)' })
        : failResult(r);
    }
    case 'hacker-news': {
      const r = await timed(async () => {
        const ids = await withTimeout(getJson<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json'));
        const first = await withTimeout(
          getJson<{ title?: string }>(`https://hacker-news.firebaseio.com/v0/item/${ids[0]}.json`),
        );
        return { count: ids.length, title: first.title ?? '' };
      });
      return r.ok
        ? okResult(r.latencyMs, {
            summary: `Top story: ${r.data?.title ?? '?'}`,
            detail: `${r.data?.count ?? '?'} stories in the top list`,
          })
        : failResult(r);
    }
    case 'stack-exchange': {
      const r = await timed(() =>
        withTimeout(
          getJson<{ items?: Array<{ title?: string }> }>(
            'https://api.stackexchange.com/2.3/questions?order=desc&sort=hot&site=stackoverflow&pagesize=1',
          ),
        ),
      );
      return r.ok
        ? okResult(r.latencyMs, { summary: `Hot: ${r.data?.items?.[0]?.title ?? '?'}`, detail: 'api.stackexchange.com' })
        : failResult(r);
    }
    case 'dev-to': {
      const r = await timed(() =>
        withTimeout(
          getJson<Array<{ title?: string; user?: { name?: string } }>>('https://dev.to/api/articles?per_page=1&top=7'),
        ),
      );
      return r.ok
        ? okResult(r.latencyMs, { summary: r.data?.[0]?.title ?? '?', detail: `by ${r.data?.[0]?.user?.name ?? '?'} — dev.to` })
        : failResult(r);
    }
    case 'wikipedia': {
      const r = await timed(() =>
        withTimeout(
          getJson<{ query?: { search?: Array<{ title?: string }> } }>(
            'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=Next.js&format=json&srlimit=1',
          ),
        ),
      );
      return r.ok
        ? okResult(r.latencyMs, { summary: r.data?.query?.search?.[0]?.title ?? '?', detail: 'en.wikipedia.org (search)' })
        : failResult(r);
    }
    case 'quotable': {
      const r = await timed(() =>
        withTimeout(getJson<Array<{ content?: string; author?: string }>>('https://api.quotable.io/quotes/random')),
      );
      return r.ok
        ? okResult(r.latencyMs, { summary: `“${r.data?.[0]?.content ?? '?'}”`, detail: `— ${r.data?.[0]?.author ?? '?'} — quotable.io` })
        : failResult(r);
    }
    case 'clearbit': {
      // Logo API is an image endpoint — probe by loading it.
      const start = Date.now();
      const loaded = await new Promise<boolean>((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => resolve(false), 8000);
        img.onload = () => {
          clearTimeout(timer);
          resolve(true);
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(false);
        };
        img.src = 'https://logo.clearbit.com/vercel.com?size=64';
      });
      return loaded
        ? okResult(Date.now() - start, { summary: 'logo.clearbit.com/vercel.com', detail: '64×64 logo loaded' })
        : { ok: false, error: 'Logo endpoint unreachable', latencyMs: Date.now() - start };
    }
    case 'nationalize': {
      const r = await timed(() =>
        withTimeout(
          getJson<{ country?: Array<{ country_id?: string; probability?: number }> }>('https://api.nationalize.io/?name=Maria'),
        ),
      );
      const top = r.data?.country?.[0];
      return r.ok
        ? okResult(r.latencyMs, {
            summary: `Maria → ${top?.country_id ?? '?'} (${Math.round((top?.probability ?? 0) * 100)}%)`,
            detail: 'api.nationalize.io',
          })
        : failResult(r);
    }
    case 'ipify': {
      const r = await timed(() => withTimeout(getJson<{ ip?: string }>('https://api.ipify.org?format=json')));
      return r.ok
        ? okResult(r.latencyMs, { summary: r.data?.ip ?? '?', detail: 'public egress IP — ipify.org' })
        : failResult(r);
    }
    case 'github':
      // Probed through the server route (the token, if any, lives there).
      return timed(async () => {
        const res = await fetch('/api/github/test', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as {
          ok: boolean;
          error?: string;
          latencyMs: number;
          summary?: string;
          detail?: string;
        };
        if (!body.ok) throw new Error(body.error ?? 'GitHub test failed');
        return { summary: body.summary ?? 'api.github.com', detail: body.detail ?? 'server route /api/github/test' };
      });
    default:
      return { ok: false, error: 'Unknown API', latencyMs: 0 };
  }
}

// ---------------------------------------------------------------- feature adapters

export interface ExchangeRates {
  base: string;
  usd: number;
  gbp: number;
  date: string;
}

/** Live ECB rates (Frankfurter) — EUR → USD / GBP for the Momentum section. */
export async function fetchExchangeRates(): Promise<ApiResult<ExchangeRates>> {
  const r = await timed(() =>
    withTimeout(
      getJson<{ base?: string; date?: string; rates?: { USD?: number; GBP?: number } }>(
        'https://api.frankfurter.app/latest?from=EUR&to=USD,GBP',
      ),
    ),
  );
  if (!r.ok || !r.data?.rates?.USD || !r.data?.rates?.GBP) return failResult(r);
  return okResult(r.latencyMs, {
    base: r.data.base ?? 'EUR',
    usd: r.data.rates.USD,
    gbp: r.data.rates.GBP,
    date: r.data.date ?? '',
  });
}

export interface LiveSignal {
  id: string;
  source: 'Hacker News' | 'Stack Overflow' | 'Dev.to' | 'npm';
  title: string;
  url?: string;
  meta?: string;
}

/** Live tech signals for the Radar — HN top stories, SO hot questions, Dev.to, npm version. */
export async function fetchLiveSignals(): Promise<ApiResult<LiveSignal[]>> {
  const start = Date.now();
  const signals: LiveSignal[] = [];
  const errors: string[] = [];

  // Hacker News — top 3 stories
  try {
    const ids = await withTimeout(getJson<number[]>('https://hacker-news.firebaseio.com/v0/topstories.json'));
    const tops = await Promise.all(
      ids.slice(0, 3).map((id) =>
        withTimeout(
          getJson<{ title?: string; url?: string; score?: number }>(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          ),
        ),
      ),
    );
    for (const item of tops) {
      if (item.title)
        signals.push({
          id: `hn-${item.title.slice(0, 24)}`,
          source: 'Hacker News',
          title: item.title,
          url: item.url,
          meta: `${item.score ?? '?'} points`,
        });
    }
  } catch {
    errors.push('Hacker News');
  }

  // Stack Exchange — hot questions
  try {
    const data = await withTimeout(
      getJson<{ items?: Array<{ title?: string; link?: string; score?: number }> }>(
        'https://api.stackexchange.com/2.3/questions?order=desc&sort=hot&site=stackoverflow&pagesize=2',
      ),
    );
    for (const q of data.items ?? []) {
      if (q.title)
        signals.push({
          id: `so-${q.title.slice(0, 24)}`,
          source: 'Stack Overflow',
          title: q.title,
          url: q.link,
          meta: `${q.score ?? '?'} score`,
        });
    }
  } catch {
    errors.push('Stack Exchange');
  }

  // Dev.to — top article this week
  try {
    const articles = await withTimeout(
      getJson<Array<{ title?: string; url?: string; user?: { name?: string } }>>(
        'https://dev.to/api/articles?per_page=1&top=7',
      ),
    );
    const top = articles?.[0];
    if (top?.title)
      signals.push({
        id: `devto-${top.title.slice(0, 24)}`,
        source: 'Dev.to',
        title: top.title,
        url: top.url,
        meta: `by ${top.user?.name ?? '?'}`,
      });
  } catch {
    errors.push('Dev.to');
  }

  // npm — Next.js latest version (version-check signal)
  try {
    const pkg = await withTimeout(getJson<{ version?: string }>('https://registry.npmjs.org/next/latest'));
    if (pkg.version)
      signals.push({
        id: 'npm-next',
        source: 'npm',
        title: `Next.js ${pkg.version} is the latest stable release`,
        url: 'https://www.npmjs.com/package/next',
        meta: 'registry.npmjs.org',
      });
  } catch {
    errors.push('npm');
  }

  if (signals.length === 0) {
    return { ok: false, error: errors.length ? `Unreachable: ${errors.join(', ')}` : 'No signals', latencyMs: Date.now() - start };
  }
  return okResult(Date.now() - start, signals);
}

export interface CountryFacts {
  name: string;
  capital?: string;
  currency?: string;
  population?: number;
  flag?: string;
}

/** REST Countries — facts for a prospect’s country (accepts name or ISO code). */
export async function fetchCountryFacts(country: string): Promise<ApiResult<CountryFacts>> {
  const r = await timed(() =>
    withTimeout(
      getJson<
        Array<{
          name?: { common?: string };
          capital?: string[];
          currencies?: Record<string, { name?: string; symbol?: string }>;
          population?: number;
          flag?: string;
        }>
      >(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fullText=true`),
    ),
  );
  if (!r.ok || !r.data?.[0]) return failResult(r);
  const c = r.data[0];
  const currency = c.currencies ? Object.values(c.currencies)[0] : undefined;
  return okResult(r.latencyMs, {
    name: c.name?.common ?? country,
    capital: c.capital?.[0],
    currency: currency ? `${currency.name ?? ''} ${currency.symbol ?? ''}`.trim() : undefined,
    population: c.population,
    flag: c.flag,
  });
}

export interface Quote {
  content: string;
  author: string;
}

/** Quotable — quote of the day for the daily briefing. */
export async function fetchQuote(): Promise<ApiResult<Quote>> {
  const r = await timed(() =>
    withTimeout(getJson<Array<{ content?: string; author?: string }>>('https://api.quotable.io/quotes/random')),
  );
  if (!r.ok || !r.data?.[0]) return failResult(r);
  return okResult(r.latencyMs, { content: r.data[0].content ?? '', author: r.data[0].author ?? '' });
}

export interface NameOrigin {
  countryId: string;
  probability: number;
}

/** Nationalize — probable origin of a first name. */
export async function fetchNameOrigin(firstName: string): Promise<ApiResult<NameOrigin[]>> {
  const r = await timed(() =>
    withTimeout(
      getJson<{ country?: Array<{ country_id?: string; probability?: number }> }>(
        `https://api.nationalize.io/?name=${encodeURIComponent(firstName)}`,
      ),
    ),
  );
  if (!r.ok || !r.data?.country) return failResult(r);
  return okResult(
    r.latencyMs,
    r.data.country.map((c) => ({ countryId: c.country_id ?? '?', probability: c.probability ?? 0 })),
  );
}

/** Clearbit — deterministic logo URL for a company domain. */
export function clearbitLogoUrl(domain: string, size = 64): string {
  return `https://logo.clearbit.com/${encodeURIComponent(domain)}?size=${size}`;
}

/** Wikipedia — short search summary for a topic. */
export async function fetchWikipediaSummary(topic: string): Promise<ApiResult<{ title: string; extract: string }>> {
  const r = await timed(() =>
    withTimeout(
      getJson<{ query?: { search?: Array<{ title?: string; snippet?: string }> } }>(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=1`,
      ),
    ),
  );
  const hit = r.data?.query?.search?.[0];
  if (!r.ok || !hit) return failResult(r);
  return okResult(r.latencyMs, { title: hit.title ?? topic, extract: (hit.snippet ?? '').replace(/<[^>]+>/g, '') });
}

/** GitHub — live repo stats, via the server route (token stays server-side). */
export interface GithubRepoStats {
  fullName: string;
  description?: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  language?: string;
  topics: string[];
  pushedAt?: string;
  url: string;
}

export async function fetchGithubRepoStats(repo: string): Promise<ApiResult<GithubRepoStats>> {
  return timed(async () => {
    const res = await fetch(`/api/github/repo?repo=${encodeURIComponent(repo)}`, { cache: 'no-store' });
    const body = (await res.json()) as ApiResult<GithubRepoStats>;
    if (!res.ok || !body.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    return body.data as GithubRepoStats;
  });
}
