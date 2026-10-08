// GitHub connectivity test for the Admin hub — runs server-side so the
// optional token is used but never exposed. Reports rate-limit state so
// the user can see whether the token is active (5,000 vs 60 req/h).

import { NextRequest, NextResponse } from 'next/server';
import { getKey, hasKey, maskKey, apiKeyStore } from '@/lib/api/server-keys';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const start = Date.now();
  const token = getKey('github');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch('https://api.github.com/rate_limit', { headers, cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `GitHub API error (HTTP ${res.status})`, latencyMs: Date.now() - start },
        { status: 502 },
      );
    }
    const json = (await res.json()) as {
      resources?: {
        core?: { limit?: number; remaining?: number; used?: number; reset?: number };
      };
    };
    const core = json.resources?.core;
    return NextResponse.json({
      ok: true,
      latencyMs: Date.now() - start,
      authenticated: hasKey('github'),
      maskedKey: token ? maskKey(token) : null,
      rateLimit: {
        limit: core?.limit ?? null,
        remaining: core?.remaining ?? null,
        used: core?.used ?? null,
        resetAt: core?.reset ? new Date(core.reset * 1000).toISOString() : null,
      },
      summary: token
        ? `Authenticated as token ${maskKey(token)} — ${core?.limit ?? '?'} req/h`
        : (core?.limit ?? 0) >= 5000
          ? `Unauthenticated — ${core?.limit ?? '?'} req/h (this network already has an elevated limit)`
          : `Unauthenticated — ${core?.limit ?? '?'} req/h (add a token for 5,000)`,
      detail: 'api.github.com/rate_limit',
      // keep the raw key referenced so tree-shaking keeps the store import honest
      _storeSize: apiKeyStore.size,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'GitHub API unreachable from this server',
        latencyMs: Date.now() - start,
      },
      { status: 502 },
    );
  }
}
