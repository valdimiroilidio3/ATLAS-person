// Admin key management — the ONLY place optional API tokens enter the system.
//
// POST   { provider, key }  → store in server memory (masked on read)
// GET    → list providers with masked keys (never the raw key)
// DELETE { provider }       → remove
//
// Tokens are never persisted to disk and never returned to the client
// in plain text. This route exists so the GitHub token can raise the
// rate limit (60 → 5,000 req/h) without ever being exposed to the browser.

import { NextRequest, NextResponse } from 'next/server';
import { apiKeyStore, apiKeyMeta, maskKey } from '@/lib/api/server-keys';

export const dynamic = 'force-dynamic';

const ALLOWED_PROVIDERS = new Set(['github']);

export async function GET() {
  const keys = Array.from(apiKeyStore.keys()).map((provider) => ({
    provider,
    masked: maskKey(apiKeyStore.get(provider) ?? ''),
    setAt: apiKeyMeta.get(provider)?.setAt ?? null,
  }));
  return NextResponse.json({ ok: true, keys });
}

export async function POST(req: NextRequest) {
  let body: { provider?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const provider = (body.provider ?? '').toLowerCase().trim();
  const key = (body.key ?? '').trim();
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ ok: false, error: `Unsupported provider: ${provider || '(empty)'}` }, { status: 400 });
  }
  if (!key) {
    return NextResponse.json({ ok: false, error: 'Key is empty' }, { status: 400 });
  }
  apiKeyStore.set(provider, key);
  apiKeyMeta.set(provider, { setAt: Date.now() });
  return NextResponse.json({ ok: true, provider, masked: maskKey(key) });
}

export async function DELETE(req: NextRequest) {
  let body: { provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const provider = (body.provider ?? '').toLowerCase().trim();
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ ok: false, error: `Unsupported provider: ${provider || '(empty)'}` }, { status: 400 });
  }
  apiKeyStore.delete(provider);
  apiKeyMeta.delete(provider);
  return NextResponse.json({ ok: true, provider, removed: true });
}
