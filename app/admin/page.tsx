'use client';

// ADMIN — API Hub. Every free API ATLAS integrates with, managed in one
// place: enable/disable, connection tests with latency + sample, the
// optional GitHub token (server-side only) and the feature toggles that
// decide which live features are on. Honest states only: a test that
// cannot reach an API says so — nothing is ever faked.

import { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Globe,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/inputs';
import { useAtlas } from '@/lib/atlas/store';
import { API_REGISTRY, isApiEnabled, type ApiId } from '@/lib/api/registry';
import { probeApi, type ApiProbeSample } from '@/lib/api/client';
import type { ApiResult } from '@/lib/api/client';
import { t } from '@/lib/i18n';

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; latencyMs: number; summary: string; detail?: string; at: number }
  | { status: 'error'; latencyMs: number; error: string; at: number };

interface KeyInfo {
  provider: string;
  masked: string;
  setAt: number | null;
}

export default function AdminPage() {
  const { state, setApiEnabled, setApiFeature, setGithubRepo, toast } = useAtlas();
  const { apiConfig } = state;

  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [egressIp, setEgressIp] = useState<string | null>(null);
  const [egressState, setEgressState] = useState<'loading' | 'ok' | 'error'>('loading');

  // GitHub token management (server-side store)
  const [tokenInput, setTokenInput] = useState('');
  const [keyInfo, setKeyInfo] = useState<KeyInfo[]>([]);
  const [savingKey, setSavingKey] = useState(false);

  // Diagnostics: public egress IP (ipify — client-side, keyless)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const body = (await res.json()) as { ip?: string };
        if (!cancelled) {
          setEgressIp(body.ip ?? null);
          setEgressState('ok');
        }
      } catch {
        if (!cancelled) setEgressState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load masked key info (never the raw key)
  const refreshKeys = async () => {
    try {
      const res = await fetch('/api/admin/keys');
      const body = (await res.json()) as { ok: boolean; keys: KeyInfo[] };
      if (body.ok) setKeyInfo(body.keys);
    } catch {
      // Keys stay server-side; if the route is unreachable we simply show none.
    }
  };
  useEffect(() => {
    refreshKeys();
  }, []);

  const githubKey = keyInfo.find((k) => k.provider === 'github');

  const runTest = async (id: ApiId) => {
    setTests((prev) => ({ ...prev, [id]: { status: 'testing' } }));
    const result: ApiResult<ApiProbeSample> = await probeApi(id);
    setTests((prev) => ({
      ...prev,
      [id]: result.ok
        ? {
            status: 'ok',
            latencyMs: result.latencyMs,
            summary: result.data?.summary ?? '',
            detail: result.data?.detail,
            at: Date.now(),
          }
        : { status: 'error', latencyMs: result.latencyMs, error: result.error ?? 'Failed', at: Date.now() },
    }));
  };

  const saveToken = async () => {
    if (!tokenInput.trim()) return;
    setSavingKey(true);
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'github', key: tokenInput.trim() }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (body.ok) {
        setTokenInput('');
        await refreshKeys();
        toast(t('API key saved'), t('Stored in server memory only — it never reaches the browser. GitHub limit: 5,000 req/h.'), 'success');
      } else {
        toast(t('Could not save the key'), body.error ?? '', 'error');
      }
    } catch {
      toast(t('Could not save the key'), t('The admin route is unreachable from this browser.'), 'error');
    } finally {
      setSavingKey(false);
    }
  };

  const removeToken = async () => {
    try {
      await fetch('/api/admin/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'github' }),
      });
      await refreshKeys();
      toast(t('API key removed'), t('The GitHub token was deleted from server memory.'), 'success');
    } catch {
      toast(t('Could not remove the key'), t('The admin route is unreachable from this browser.'), 'error');
    }
  };

  const enabledCount = API_REGISTRY.filter((a) => isApiEnabled(apiConfig.enabled, a.id)).length;

  const features: { key: keyof typeof apiConfig.features; labelKey: string; hintKey: string }[] = [
    { key: 'liveRates', labelKey: 'Live exchange rates (Frankfurter)', hintKey: 'Shows a live ECB rate line in the Momentum section.' },
    { key: 'liveSignals', labelKey: 'Live tech signals (HN · Stack Overflow · Dev.to · npm)', hintKey: 'Powers the live signals panel in Radar.' },
    { key: 'prospectEnrichment', labelKey: 'Prospect enrichment (Clearbit · REST Countries · Nationalize)', hintKey: 'Logos, country facts and name-origin chips in the Radar prospects panel.' },
    { key: 'dailyQuote', labelKey: 'Quote of the day (Quotable)', hintKey: 'Adds a daily quote to the intelligence briefing.' },
    { key: 'githubStats', labelKey: 'GitHub repository stats', hintKey: 'Shows live repo stats in the project sheet when a repository is configured.' },
  ];

  return (
    <div className="mx-auto max-w-shell px-4 py-8 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow={t('Admin')}
        title={t('API Hub')}
        description={t('Every free API ATLAS uses, managed in one place. All of them are free and keyless — only GitHub accepts an optional token, and it never leaves the server.')}
      />

      <div className="mt-6 grid gap-4">
        {/* ---- diagnostics ---- */}
        <Surface>
          <div className="mb-4 flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-text-3" aria-hidden />
            <h3 className="text-sm font-semibold">{t('Diagnostics')}</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface2 px-3.5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-3">{t('Public egress IP')}</p>
              <p className="mt-1 text-sm tabular text-text-2">
                {egressState === 'loading' && <span className="text-text-3">{t('Checking…')}</span>}
                {egressState === 'ok' && (egressIp ?? '—')}
                {egressState === 'error' && <span className="text-warning">{t('Unavailable')}</span>}
              </p>
              <p className="mt-0.5 text-[11px] text-text-3">api.ipify.org</p>
            </div>
            <div className="rounded-lg border border-border bg-surface2 px-3.5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-3">{t('APIs registered')}</p>
              <p className="mt-1 text-sm tabular text-text-2">{API_REGISTRY.length}</p>
              <p className="mt-0.5 text-[11px] text-text-3">{t('all free · all keyless except GitHub (optional)')}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface2 px-3.5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-3">{t('APIs enabled')}</p>
              <p className="mt-1 text-sm tabular text-text-2">
                {enabledCount} / {API_REGISTRY.length}
              </p>
              <p className="mt-0.5 text-[11px] text-text-3">{t('disabled APIs show honest “off” states in the UI')}</p>
            </div>
          </div>
        </Surface>

        {/* ---- GitHub configuration ---- */}
        <Surface>
          <div className="mb-4 flex items-center gap-2.5">
            <KeyRound className="h-4 w-4 text-text-3" aria-hidden />
            <h3 className="text-sm font-semibold">{t('GitHub — repository & optional token')}</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('Repository (owner/repo)')} hint={t('Powers live stats in the project sheet — stars, forks, open issues, language, last push.')}>
              <Input
                value={apiConfig.githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="vercel/next.js"
                spellCheck={false}
              />
            </Field>
            <Field label={t('Personal access token (optional)')} hint={t('Stored in server memory only — never sent to the browser. Raises the GitHub limit from 60 to 5,000 requests/hour.')}>
              <Input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={githubKey ? githubKey.masked : 'ghp_…'}
                spellCheck={false}
                autoComplete="off"
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={saveToken} disabled={!tokenInput.trim() || savingKey}>
              {savingKey ? t('Saving…') : t('Save token')}
            </Button>
            {githubKey && (
              <Button variant="subtle" size="sm" onClick={removeToken}>
                {t('Remove token')}
              </Button>
            )}
            <span className="text-xs text-text-3">
              {githubKey
                ? t('Token active: {masked} — set {date}', { masked: githubKey.masked, date: new Date(githubKey.setAt ?? 0).toLocaleString() })
                : t('No token stored — using the anonymous limit (60 req/h).')}
            </span>
          </div>
        </Surface>

        {/* ---- API registry ---- */}
        <Surface padding={false}>
          <div className="flex items-center justify-between px-5 pb-3 pt-5 sm:px-6">
            <div className="flex items-center gap-2.5">
              <PlugZap className="h-4 w-4 text-text-3" aria-hidden />
              <h3 className="text-sm font-semibold">{t('Connected APIs')}</h3>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => API_REGISTRY.forEach((a) => runTest(a.id))}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('Test all')}
            </Button>
          </div>
          <div className="divide-y divide-border">
            {API_REGISTRY.map((api) => {
              const enabled = isApiEnabled(apiConfig.enabled, api.id);
              const test = tests[api.id];
              return (
                <div key={api.id} className="px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{api.name}</span>
                        <Badge tone="neutral">{api.tier}</Badge>
                        <Badge tone={api.keyRequired === 'none' ? 'success' : 'accent'}>
                          {api.keyRequired === 'none' ? t('no key') : t('optional key')}
                        </Badge>
                        <Badge tone="info">{api.scope === 'server' ? t('server route') : t('browser')}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-text-3">{api.endpoint}</p>
                      <p className="mt-1 text-xs text-text-2">{t(api.powersKey)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <label className="flex items-center gap-2 text-xs text-text-3">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setApiEnabled(api.id, e.target.checked)}
                          className="h-4 w-4 accent-[#e9b44c]"
                          aria-label={t('Enable {name}', { name: api.name })}
                        />
                        {t('Enabled')}
                      </label>
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() => runTest(api.id)}
                        disabled={test?.status === 'testing'}
                      >
                        {test?.status === 'testing' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {t('Test')}
                      </Button>
                    </div>
                  </div>
                  {test && test.status !== 'idle' && test.status !== 'testing' && (
                    <div
                      className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                        test.status === 'ok'
                          ? 'border-success/25 bg-success/10 text-success'
                          : 'border-error/25 bg-error/10 text-error'
                      }`}
                    >
                      {test.status === 'ok' ? (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      )}
                      <span className="min-w-0">
                        <span className="font-medium">
                          {test.status === 'ok' ? t('OK') : t('Failed')} · {test.latencyMs}ms
                        </span>
                        {' — '}
                        {test.status === 'ok' ? test.summary : test.error}
                        {test.status === 'ok' && test.detail ? <span className="block text-text-3">{test.detail}</span> : null}
                      </span>
                    </div>
                  )}
                  {test?.status === 'testing' && (
                    <p className="mt-3 text-xs text-text-3">{t('Testing…')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Surface>

        {/* ---- feature toggles ---- */}
        <Surface>
          <div className="mb-4 flex items-center gap-2.5">
            <Shield className="h-4 w-4 text-text-3" aria-hidden />
            <h3 className="text-sm font-semibold">{t('Live features')}</h3>
          </div>
          <p className="mb-3 text-xs text-text-3">
            {t('Each toggle decides whether a live feature reads from its API. Turning one off shows an honest “off” state instead of stale data.')}
          </p>
          <div className="grid gap-2.5">
            {features.map((f) => (
              <label
                key={f.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface2 px-3.5 py-3"
              >
                <span>
                  <span className="block text-sm text-text-2">{t(f.labelKey)}</span>
                  <span className="block text-xs text-text-3">{t(f.hintKey)}</span>
                </span>
                <input
                  type="checkbox"
                  checked={apiConfig.features[f.key]}
                  onChange={(e) => setApiFeature(f.key, e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-[#e9b44c]"
                  aria-label={t(f.labelKey)}
                />
              </label>
            ))}
          </div>
        </Surface>

        {/* ---- honest note ---- */}
        <Surface className="border-border bg-surface2">
          <div className="flex items-start gap-3">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-text-3" aria-hidden />
            <p className="text-xs leading-relaxed text-text-3">
              {t('All APIs on this page are free, public and keyless (GitHub’s token is optional). Calls marked “browser” run from your browser; GitHub runs through a server route so the token never reaches the client. If an API cannot be reached from your network, the UI says so — ATLAS never fakes a connection.')}
            </p>
          </div>
        </Surface>
      </div>
    </div>
  );
}
