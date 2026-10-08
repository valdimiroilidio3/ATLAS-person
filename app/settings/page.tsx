'use client';

// SETTINGS — spec §19 + §26 + §27. Profile, preferences, integrations,
// permission architecture and data controls.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Link2, RotateCcw, ShieldCheck, User as UserIcon } from 'lucide-react';
import { PERMISSION_LEVELS } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import type { ApprovalLevel, Currency, Integration } from '@/lib/atlas/types';
import { SectionHeader, Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field, Input, Select } from '@/components/ui/inputs';
import { ConnectIntegrationModal } from '@/components/settings/connect-integration-modal';
import { LOCALES, t, type Locale } from '@/lib/i18n';

function ProfileSection() {
  const { state, updateProfile, toast } = useAtlas();
  const [name, setName] = useState(state.user.name);
  const [email, setEmail] = useState(state.user.email);

  useEffect(() => {
    setName(state.user.name);
    setEmail(state.user.email);
  }, [state.user.name, state.user.email]);

  return (
    <Surface>
      <div className="mb-4 flex items-center gap-2.5">
        <UserIcon className="h-4 w-4 text-text-3" aria-hidden />
        <h3 className="text-sm font-semibold">{t('Profile')}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('Email')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-3">
          <span>{t('Timezone ·')} {state.user.timezone}</span>
          <span>{t('Role ·')} {state.user.role}</span>
        </div>
        <Button
          variant="subtle"
          size="sm"
          onClick={() => {
            updateProfile({ name: name.trim() || state.user.name, email: email.trim() || state.user.email });
            toast(t('Profile saved'), t('ATLAS greets you by name.'), 'success');
          }}
        >
          {t('Save profile')}
        </Button>
      </div>
    </Surface>
  );
}

function LanguageSection() {
  const { state, setLanguage } = useAtlas();
  const current = state.preferences.language;
  return (
    <Surface>
      <div className="mb-4 flex items-center gap-2.5">
        <Globe className="h-4 w-4 text-text-3" aria-hidden />
        <h3 className="text-sm font-semibold">{t('Language')}</h3>
      </div>
      <p className="mb-3 text-xs text-text-3">
        {t('Portuguese is the official language of ATLAS. Switching reloads the demo data in the new language — your goals and memories are kept.')}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {LOCALES.map((loc) => {
          const active = current === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => setLanguage(loc.id as Locale)}
              aria-pressed={active}
              className={`flex items-center justify-between rounded-lg border px-3.5 py-3 text-left transition-colors ${
                active
                  ? 'border-accent/50 bg-accent/10 text-text'
                  : 'border-border bg-surface2 text-text-2 hover:border-border-strong hover:text-text'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base" aria-hidden>{loc.flag}</span>
                <span className="text-sm font-medium">{loc.label}</span>
              </span>
              {active && <span className="font-mono text-[10px] uppercase tracking-wider text-accent">{t('Active')}</span>}
            </button>
          );
        })}
      </div>
    </Surface>
  );
}

function PreferencesSection() {
  const { state, updatePreferences } = useAtlas();
  const prefs = state.preferences;
  return (
    <Surface>
      <div className="mb-4 flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-text-3" aria-hidden />
        <h3 className="text-sm font-semibold">{t('Preferences')}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Default agent permission level')} hint={t('Agents never exceed this without approval.')}>
          <Select
            value={prefs.defaultPermissionLevel}
            onChange={(e) => updatePreferences({ defaultPermissionLevel: Number(e.target.value) as ApprovalLevel })}
          >
            {PERMISSION_LEVELS.map((p) => (
              <option key={p.level} value={p.level}>
                {p.short} · {t(p.nameKey)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('Currency')}>
          <Select
            value={prefs.currency}
            onChange={(e) => updatePreferences({ currency: e.target.value as Currency })}
          >
            <option value="EUR">{t('EUR · Euro')}</option>
            <option value="USD">{t('USD · US Dollar')}</option>
            <option value="GBP">{t('GBP · British Pound')}</option>
          </Select>
        </Field>
        <Field label={t('Daily briefing time')}>
          <Input
            type="time"
            value={prefs.briefingTime}
            onChange={(e) => updatePreferences({ briefingTime: e.target.value })}
          />
        </Field>
        <Field label={t('Week starts on')}>
          <Select
            value={prefs.weekStartsOn}
            onChange={(e) => updatePreferences({ weekStartsOn: Number(e.target.value) as 0 | 1 })}
          >
            <option value={1}>{t('Monday')}</option>
            <option value={0}>{t('Sunday')}</option>
          </Select>
        </Field>
      </div>
      <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface2 px-3.5 py-3">
        <span className="text-sm text-text-2">{t('Enable the daily intelligence briefing')}</span>
        <input
          type="checkbox"
          checked={prefs.briefingEnabled}
          onChange={(e) => updatePreferences({ briefingEnabled: e.target.checked })}
          className="h-4 w-4 accent-[#e9b44c]"
        />
      </label>
    </Surface>
  );
}

function IntegrationsSection({ onConnect }: { onConnect: (i: Integration) => void }) {
  const { state } = useAtlas();
  const connected = state.integrations.filter((i) => i.connected).length;
  return (
    <Surface>
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t('Integrations')}</h3>
          <p className="mt-0.5 text-xs text-text-3">
            {connected === 0
              ? t('Nothing connected. ATLAS prepares everything; integrations let it act.')
              : `${connected} connected.`}
          </p>
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {state.integrations.map((integration) => {
          const IntegrationIcon = integration.icon;
          return (
          <div
            key={integration.id}
            data-integration={integration.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface2 p-3 transition-colors"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
              <IntegrationIcon className="h-4 w-4 text-text-2" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{integration.name}</p>
              <p className="truncate text-xs text-text-3">{integration.description}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {integration.connected ? (
                <Badge tone="success">{t('CONNECTED')}</Badge>
              ) : (
                <>
                  <Badge tone="neutral">{t('NOT CONNECTED')}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => onConnect(integration)}>
                    <Link2 className="h-3 w-3" /> {t('Connect')}
                  </Button>
                </>
              )}
            </div>
          </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-text-3">
        {t('Adapters are implemented behind clean boundaries. Tokens are encrypted at rest and never exposed client-side. Unconnected integrations are shown honestly — ATLAS never fakes a connection.')}
      </p>
    </Surface>
  );
}

function PermissionLevelsSection() {
  return (
    <Surface>
      <div className="mb-4 flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-text-3" aria-hidden />
        <h3 className="text-sm font-semibold">{t('Permission architecture')}</h3>
      </div>
      <div className="space-y-2">
        {PERMISSION_LEVELS.map((p) => (
          <div key={p.level} className="flex items-start gap-3 rounded-lg border border-border bg-surface2 px-3.5 py-2.5">
            <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 font-mono text-[11px] text-accent">
              {p.short}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t(p.nameKey)}</p>
              <p className="text-xs text-text-3">{t(p.descriptionKey)}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-text-3">
        {t('Sending messages, publishing content, deploying and spending money require approval by default. Deleting data always requires explicit approval. Audit logs record every decision.')}
      </p>
    </Surface>
  );
}

function DangerZone() {
  const { resetDemoData } = useAtlas();
  const router = useRouter();
  return (
    <Surface className="border-error/25">
      <h3 className="text-sm font-semibold text-error">{t('Demo data')}</h3>
      <p className="mt-1 text-xs text-text-3">
        {t('Reset ATLAS to its initial state. This clears locally stored state and restores the seed.')}
      </p>
      <div className="mt-3">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            resetDemoData();
            router.refresh();
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> {t('Reset demo data')}
        </Button>
      </div>
    </Surface>
  );
}

function SettingsContent() {
  const [connectTarget, setConnectTarget] = useState<Integration | null>(null);
  const { state } = useAtlas();

  // Deep link: /settings?integration=vercel opens the connect modal.
  // Read from window.location so the page stays fully server-rendered.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('integration');
    if (!id) return;
    const integration = state.integrations.find((i) => i.id === id);
    if (integration && !integration.connected) {
      setConnectTarget(integration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="py-8 space-y-8">
      <SectionHeader
        eyebrow={t('Settings')}
        title={t('Settings')}
        description={t('Your profile, preferences, integrations and permission boundaries.')}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileSection />
        <LanguageSection />
        <PreferencesSection />
        <IntegrationsSection onConnect={setConnectTarget} />
        <PermissionLevelsSection />
      </div>

      <DangerZone />

      <ConnectIntegrationModal
        integration={connectTarget}
        open={Boolean(connectTarget)}
        onClose={() => setConnectTarget(null)}
      />
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
