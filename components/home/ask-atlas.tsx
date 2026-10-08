'use client';

// AI Brain — spec §06. Natural-language objectives in, structured plans out.

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Loader2, Send } from 'lucide-react';
import { useAtlas } from '@/lib/atlas/store';
import type { InterpretedIntent } from '@/lib/atlas/engine';
import { IntentResult } from '@/components/brain/intent-result';

const EXAMPLE_CHIPS = [
  'What should I do today?',
  'Launch my website.',
  'Why am I behind?',
  'Find opportunities.',
  'Build a strategy to reach €2,000/month.',
  'Prepare ORBITA for launch.',
  'Analyze my current projects.',
];

export function AskAtlas() {
  const { interpret, openExecutionPreview, openCreateGoal } = useAtlas();
  const [input, setInput] = useState('');
  const [intent, setIntent] = useState<InterpretedIntent | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setIntent(null);
    setTimeout(() => {
      setIntent(interpret(value));
      setBusy(false);
    }, 420);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-accent" aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight">Ask ATLAS</h2>
      </div>

      <div className="surface p-0 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Brain className="h-4 w-4 shrink-0 text-text-3" aria-hidden />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit(input);
            }}
            placeholder="Launch my new website.  ·  What should I do today?  ·  Why am I behind?"
            aria-label="Ask ATLAS"
            className="h-12 flex-1 bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
          />
          <button
            onClick={() => submit(input)}
            disabled={!input.trim() || busy}
            aria-label="Ask ATLAS"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[#171004] transition-colors hover:bg-accent-strong disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 px-4 py-3">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setInput(chip);
                submit(chip);
              }}
              className="rounded-md border border-border bg-surface2 px-2.5 py-1 text-xs text-text-2 transition-colors hover:border-border-strong hover:text-text"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 text-sm text-text-2"
          >
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            ATLAS is structuring your objective…
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {intent && (
          <IntentResult
            intent={intent}
            onStartExecution={
              intent.plan && intent.plan.steps.length > 0
                ? () =>
                    openExecutionPreview({
                      agentId: intent.plan!.agentId,
                      objective: intent.plan!.objective,
                      kind: intent.plan!.kind,
                      steps: intent.plan!.steps,
                      linkedProjectId: intent.plan!.linkedProjectId,
                    })
                : undefined
            }
            onCreateGoal={
              intent.type === 'build-strategy' || intent.type === 'create-goal' ? () => openCreateGoal() : undefined
            }
            onPickChip={(text) => {
              setInput(text);
              submit(text);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
