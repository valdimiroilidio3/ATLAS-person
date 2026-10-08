// Server-side key store for optional API tokens.
//
// Keys are held in MEMORY ONLY (never persisted, never sent to the client).
// The store lives on globalThis so every route handler in the server
// process shares one instance, even across hot reloads.
//
// GET /api/admin/keys returns masked values only (e.g. "ghp_••••x9f2").

const globalStore = globalThis as unknown as {
  __atlasApiKeys?: Map<string, string>;
  __atlasApiKeyMeta?: Map<string, { setAt: number }>;
};

export const apiKeyStore: Map<string, string> =
  globalStore.__atlasApiKeys ?? (globalStore.__atlasApiKeys = new Map());

export const apiKeyMeta: Map<string, { setAt: number }> =
  globalStore.__atlasApiKeyMeta ?? (globalStore.__atlasApiKeyMeta = new Map());

/** Mask a key for display — first 4 chars + last 4, middle replaced by bullets. */
export function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export function hasKey(provider: string): boolean {
  return apiKeyStore.has(provider);
}

export function getKey(provider: string): string | undefined {
  return apiKeyStore.get(provider);
}
