'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { greeting } from '@/lib/atlas/format';
import { useAtlas } from '@/lib/atlas/store';

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!now) return <span className="font-mono text-xs text-text-3 tabular">&nbsp;</span>;
  return (
    <span className="font-mono text-xs text-text-3 tabular" suppressHydrationWarning>
      {now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export function Hero() {
  const { state } = useAtlas();
  const today = new Date();
  const dateLine = today.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });

  const pendingApprovals = state.approvals.filter((a) => a.status === 'pending').length;
  const blockedCount =
    state.runs.filter((r) => r.status === 'blocked').length +
    state.agents.filter((a) => a.status === 'blocked').length;
  const freshLeads = state.opportunities.filter((o) => o.status === 'new' && !o.outreachApproved).length;

  const meta: string[] = [];
  if (freshLeads > 0) meta.push(`${freshLeads} high-intent leads waiting`);
  if (pendingApprovals > 0) meta.push(`${pendingApprovals} approvals pending`);
  if (blockedCount > 0) meta.push(`${blockedCount} blocked`);

  return (
    <div className="pt-10 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">{dateLine}</p>
            <h1 className="display text-4xl sm:text-5xl">
              {greeting()}, {state.user.name.split(' ')[0]}.
            </h1>
            <p className="mt-3 text-lg text-text-2">ATLAS has analyzed your current state.</p>
          </div>
          <LiveClock />
        </div>
        {meta.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {meta.map((m) => (
              <span
                key={m}
                className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-text-2"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
