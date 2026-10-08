// GitHub repo stats — server-side proxy so the optional token never
// reaches the browser. Responses are cached in memory for 60 seconds.

import { NextRequest, NextResponse } from 'next/server';
import { getKey } from '@/lib/api/server-keys';
import type { ApiResult } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

interface GithubRepoStats {
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

const cache = new Map<string, { at: number; body: ApiResult<GithubRepoStats> }>();
const CACHE_TTL = 60_000;

function isValidRepo(repo: string): boolean {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo);
}

export async function GET(req: NextRequest) {
  const repo = (req.nextUrl.searchParams.get('repo') ?? '').trim();
  if (!isValidRepo(repo)) {
    return NextResponse.json<ApiResult<GithubRepoStats>>(
      { ok: false, error: 'Invalid repository — expected "owner/repo".', latencyMs: 0 },
      { status: 400 },
    );
  }

  const cached = cache.get(repo);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return NextResponse.json(cached.body);
  }

  const start = Date.now();
  const token = getKey('github');
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Server-side fetch — not the browser’s.
      cache: 'no-store',
    });
    if (res.status === 404) {
      const body: ApiResult<GithubRepoStats> = { ok: false, error: `Repository not found: ${repo}`, latencyMs: Date.now() - start };
      cache.set(repo, { at: Date.now(), body });
      return NextResponse.json(body, { status: 404 });
    }
    if (!res.ok) {
      const body: ApiResult<GithubRepoStats> = { ok: false, error: `GitHub API error (HTTP ${res.status})`, latencyMs: Date.now() - start };
      return NextResponse.json(body, { status: 502 });
    }
    const json = (await res.json()) as {
      full_name?: string;
      description?: string | null;
      stargazers_count?: number;
      forks_count?: number;
      subscribers_count?: number;
      open_issues_count?: number;
      language?: string | null;
      topics?: string[];
      pushed_at?: string;
      html_url?: string;
    };
    const body: ApiResult<GithubRepoStats> = {
      ok: true,
      latencyMs: Date.now() - start,
      data: {
        fullName: json.full_name ?? repo,
        description: json.description ?? undefined,
        stars: json.stargazers_count ?? 0,
        forks: json.forks_count ?? 0,
        watchers: json.subscribers_count ?? 0,
        openIssues: json.open_issues_count ?? 0,
        language: json.language ?? undefined,
        topics: json.topics ?? [],
        pushedAt: json.pushed_at,
        url: json.html_url ?? `https://github.com/${repo}`,
      },
    };
    cache.set(repo, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json<ApiResult<GithubRepoStats>>(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'GitHub API unreachable from this server',
        latencyMs: Date.now() - start,
      },
      { status: 502 },
    );
  }
}
