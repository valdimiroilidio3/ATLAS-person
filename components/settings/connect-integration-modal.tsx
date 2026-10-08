'use client';

// Integration connect modal — spec §19.
//
// Honest by design: no fake "connected" states. The adapter boundary is
// ready; OAuth credentials live server-side, outside this preview.

import { ShieldCheck } from 'lucide-react';
import type { Integration } from '@/lib/atlas/types';
import { Modal, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ConnectIntegrationModal({
  integration,
  open,
  onClose,
}: {
  integration: Integration | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!integration) return null;
  const IntegrationIcon = integration.icon;
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md" labelledBy="integration-title">
      <ModalHeader
        eyebrow="Integration · adapter boundary"
        title={integration.name}
        description={integration.description}
        onClose={onClose}
      />
      <div className="space-y-4 px-6 py-5">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface2">
            <IntegrationIcon className="h-5 w-5 text-text-2" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{integration.name}</p>
            <p className="text-xs text-text-3">{integration.provider}</p>
          </div>
          <Badge tone="neutral">NOT CONNECTED</Badge>
        </div>

        <div>
          <p className="eyebrow mb-2">Requested scopes</p>
          <ul className="space-y-1.5">
            {integration.scopes.map((scope) => (
              <li
                key={scope}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-text-2"
              >
                <span className="h-1 w-1 rounded-full bg-text-3" aria-hidden />
                {scope}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-surface2 px-3.5 py-3">
          <p className="text-xs leading-relaxed text-text-2">
            <span className="font-medium text-text">Adapter status: {integration.adapterStatus}.</span> The{' '}
            {integration.provider} adapter is implemented behind a clean boundary. OAuth credentials are
            configured server-side — this preview has no credentials, so connecting would be a guess, and ATLAS
            never guesses. Wire the adapter to a real token store and this button completes the flow.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border px-3.5 py-3 text-xs text-text-3">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          Tokens are encrypted at rest, scoped to the permissions above, and never exposed client-side.
        </div>
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="subtle"
          onClick={() => {
            // Honest no-op: there is nothing to connect in this environment.
            onClose();
          }}
        >
          Adapter ready — configure OAuth server-side
        </Button>
      </ModalFooter>
    </Modal>
  );
}
