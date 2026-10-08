'use client';

// Global command palette — spec §12. CMD/CTRL + K. Feels instant.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Brain,
  ChevronRight,
  Command as CommandIcon,
  Globe,
  ListChecks,
  Loader2,
  PlugZap,
  Search,
  Sparkles,
  Target,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NAV_ITEMS } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { cn } from '@/lib/utils';
import { IntentResult } from '@/components/brain/intent-result';
import type { InterpretedIntent } from '@/lib/atlas/engine';
import { t } from '@/lib/i18n';

interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: LucideIcon;
  keywords: string;
  perform: () => void;
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 100 - t.indexOf(q);
  let score = 0;
  let qi = 0;
  let streak = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      qi++;
      streak++;
      score += 1 + streak * 0.4;
    } else {
      streak = 0;
    }
  }
  return qi === q.length ? score : 0;
}

const GROUP_ORDER = ['Ask ATLAS', 'Actions', 'Agents', 'Navigate'];

export default function CommandPalette() {
  const router = useRouter();
  const {
    state,
    ui,
    closeCommandPalette,
    openApprovalCenter,
    openCreateGoal,
    openExecutionPreview,
    openExecutionRun,
    startNextBestAction,
    interpret,
    setLanguage,
    toast,
  } = useAtlas();

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'commands' | 'ask'>('commands');
  const [activeIndex, setActiveIndex] = useState(0);
  const [askInput, setAskInput] = useState('');
  const [intent, setIntent] = useState<InterpretedIntent | null>(null);
  const [busy, setBusy] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const askInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const open = ui.commandPaletteOpen;

  // Reset + focus whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setMode('commands');
      setIntent(null);
      setAskInput('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const list: PaletteCommand[] = [];

    list.push({
      id: 'ask',
      label: t('Ask ATLAS…'),
      hint: t('natural language'),
      group: 'Ask ATLAS',
      icon: Brain,
      keywords: 'ask atlas ai brain objective intent plan strategy',
      perform: () => setMode('ask'),
    });

    list.push({
      id: 'execute-nba',
      label: t('Execute next best action'),
      hint: t('highest-value action'),
      group: 'Actions',
      icon: Sparkles,
      keywords: 'execute run do next best action highest value',
      perform: () => {
        const result = startNextBestAction();
        if (result) {
          closeCommandPalette();
          openExecutionRun(result.runId);
        }
      },
    });
    list.push({
      id: 'create-goal',
      label: t('Create goal'),
      group: 'Actions',
      icon: Target,
      keywords: 'create goal new target objective',
      perform: () => {
        closeCommandPalette();
        openCreateGoal();
      },
    });
    list.push({
      id: 'review-approvals',
      label: t('Review approvals'),
      hint: `${state.approvals.filter((a) => a.status === 'pending').length} pending`,
      group: 'Actions',
      icon: ListChecks,
      keywords: 'approvals review pending approve permission',
      perform: () => {
        closeCommandPalette();
        openApprovalCenter();
      },
    });

    for (const agent of state.agents) {
      list.push({
        id: `run-${agent.id}`,
        label: t('Run {agent} agent', { agent: agent.name }),
        hint: agent.purpose,
        group: 'Agents',
        icon: Bot,
        keywords: `run start ${agent.name.toLowerCase()} agent ${agent.purpose}`,
        perform: () => {
          closeCommandPalette();
          router.push('/agents');
        },
      });
    }

    for (const item of NAV_ITEMS) {
      list.push({
        id: `go-${item.href}`,
        label: item.href === '/' ? t('Go to Home') : t('Go to {name}', { name: t(item.labelKey) }),
        group: 'Navigate',
        icon: item.icon,
        keywords: `go navigate open ${t(item.labelKey).toLowerCase()} page`,
        perform: () => {
          closeCommandPalette();
          router.push(item.href);
        },
      });
    }

    // Language — Portuguese is the official language of ATLAS.
    list.push({
      id: 'lang-pt',
      label: t('Idioma: Português'),
      hint: t('official language'),
      group: 'Actions',
      icon: Globe,
      keywords: 'language idioma portugues portuguese pt official idioma oficial',
      perform: () => {
        closeCommandPalette();
        if (state.preferences.language !== 'pt') setLanguage('pt');
        else toast(t('Language changed'), t('Portuguese is already active.'), 'info');
      },
    });
    list.push({
      id: 'lang-en',
      label: t('Language: English'),
      hint: t('switch language'),
      group: 'Actions',
      icon: Globe,
      keywords: 'language idioma english inglês en switch trocar',
      perform: () => {
        closeCommandPalette();
        if (state.preferences.language !== 'en') setLanguage('en');
        else toast(t('Language changed'), t('English is already active.'), 'info');
      },
    });

    // Live signals — jump to the Radar, where the live panel lives.
    list.push({
      id: 'refresh-signals',
      label: t('Refresh live signals'),
      hint: t('Hacker News · Stack Overflow · Dev.to · npm'),
      group: 'Actions',
      icon: Sparkles,
      keywords: 'refresh reload signals live hacker news stack overflow dev.to npm radar atualizar sinais',
      perform: () => {
        closeCommandPalette();
        router.push('/radar');
        toast(t('Live signals'), t('The live panel reloads every time you open the Radar.'), 'info');
      },
    });

    // API hub — test and manage every free API integration.
    list.push({
      id: 'test-apis',
      label: t('Test APIs'),
      hint: t('Admin · API Hub'),
      group: 'Actions',
      icon: PlugZap,
      keywords: 'api apis test hub admin free github npm integration testar apis',
      perform: () => {
        closeCommandPalette();
        router.push('/admin');
      },
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.agents, state.approvals, state.preferences.language]);

  const filtered = useMemo(() => {
    if (mode === 'ask' || !query.trim()) return commands;
    const scored = commands
      .map((cmd) => ({
        cmd,
        score: Math.max(
          fuzzyScore(query, cmd.label),
          fuzzyScore(query, cmd.keywords),
          fuzzyScore(query, cmd.hint ?? ''),
        ),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((x) => x.cmd);
  }, [commands, query, mode]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>();
    for (const cmd of filtered) {
      const arr = map.get(cmd.group) ?? [];
      arr.push(cmd);
      map.set(cmd.group, arr);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }));
  }, [filtered]);

  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCommandPalette();
        return;
      }
      if (mode === 'commands') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const cmd = flat[activeIndex];
          if (cmd) cmd.perform();
        } else if (e.key === '/' && !query) {
          e.preventDefault();
          setMode('ask');
          setTimeout(() => askInputRef.current?.focus(), 20);
        }
      } else {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitAsk();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, flat, activeIndex, query, askInput, intent]);

  // Keep the active row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function submitAsk() {
    const text = askInput.trim();
    if (!text) return;
    setBusy(true);
    // The interpreter is synchronous and deterministic — the brief
    // "thinking" beat keeps the interaction feeling considered.
    setTimeout(() => {
      setIntent(interpret(text));
      setBusy(false);
    }, 420);
  }

  function handleStartExecution() {
    if (!intent?.plan) return;
    closeCommandPalette();
    openExecutionPreview({
      agentId: intent.plan.agentId,
      objective: intent.plan.objective,
      kind: intent.plan.kind,
      steps: intent.plan.steps,
      linkedProjectId: intent.plan.linkedProjectId,
    });
  }

  const exampleChips = [
    'What should I do today?',
    'Launch my website.',
    'Why am I behind?',
    'Build a strategy to reach €2,000/month.',
  ];

  let rowIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex justify-center p-4 sm:items-start sm:pt-[14vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={closeCommandPalette}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('Command bar')}
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border-strong bg-elevated shadow-card"
          >
            {/* Input row */}
            <div className="flex items-center gap-3 border-b border-border px-4">
              {mode === 'commands' ? (
                <Search className="h-4 w-4 shrink-0 text-text-3" aria-hidden />
              ) : (
                <Brain className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              )}
              {mode === 'commands' ? (
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('Type a command or search…')}
                  aria-label={t('Command bar')}
                  className="h-12 flex-1 bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
                />
              ) : (
                <input
                  ref={askInputRef}
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder={t('Ask ATLAS — “Launch my website.”')}
                  aria-label={t('Ask ATLAS')}
                  className="h-12 flex-1 bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
                />
              )}
              {mode === 'commands' ? (
                <button
                  onClick={() => setMode('ask')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface2 px-2 py-1 text-[11px] text-text-2 transition-colors hover:border-border-strong hover:text-text"
                >
                  <Brain className="h-3 w-3" /> {t('Ask ATLAS')}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMode('commands');
                    setIntent(null);
                    setTimeout(() => inputRef.current?.focus(), 20);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface2 px-2 py-1 text-[11px] text-text-2 transition-colors hover:border-border-strong hover:text-text"
                >
                  <CommandIcon className="h-3 w-3" /> {t('Commands')}
                </button>
              )}
              <button
                onClick={closeCommandPalette}
                aria-label={t('Close command bar')}
                className="rounded-md p-1 text-text-3 transition-colors hover:bg-white/[0.06] hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div ref={listRef} className="max-h-[56vh] overflow-y-auto p-1.5">
              {mode === 'commands' && (
                <>
                  {grouped.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-text-3">
                      {t('No commands match “')}{query}”.
                    </div>
                  )}
                  {grouped.map(({ group, items }) => (
                    <div key={group} className="mb-1">
                      <p className="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-3">
                        {t(group)}
                      </p>
                      {items.map((cmd) => {
                        rowIndex += 1;
                        const index = rowIndex;
                        const active = index === activeIndex;
                        return (
                          <button
                            key={cmd.id}
                            data-index={index}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={cmd.perform}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                              active ? 'bg-accent/10 text-text' : 'text-text-2 hover:bg-white/[0.04]',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface2',
                                active && 'border-accent/40',
                              )}
                            >
                              <cmd.icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium">{cmd.label}</span>
                              {cmd.hint && (
                                <span className="block truncate text-xs text-text-3">{cmd.hint}</span>
                              )}
                            </span>
                            {active && <ChevronRight className="h-3.5 w-3.5 text-text-3" aria-hidden />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}

              {mode === 'ask' && (
                <div className="space-y-3 p-1.5">
                  {!intent && !busy && (
                    <>
                      <p className="px-2 text-xs text-text-3">
                        {t('Describe an objective in plain language. ATLAS converts it into a structured plan — nothing is executed without your approval.')}
                      </p>
                      <div className="flex flex-wrap gap-1.5 px-2">
                        {exampleChips.map((chip) => (
                          <button
                            key={chip}
                            onClick={() => {
                              setAskInput(chip);
                              setTimeout(() => submitAsk(), 10);
                            }}
                            className="rounded-md border border-border bg-surface2 px-2.5 py-1 text-xs text-text-2 transition-colors hover:border-border-strong hover:text-text"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={submitAsk}
                        disabled={!askInput.trim()}
                        className="mx-2 inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-[#171004] transition-colors hover:bg-accent-strong disabled:opacity-40"
                      >
                        {t('Ask ATLAS')} <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {busy && (
                    <div className="flex items-center gap-2.5 px-3 py-4 text-sm text-text-2">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      {t('ATLAS is structuring your objective…')}
                    </div>
                  )}
                  {intent && (
                    <div className="space-y-2">
                      <IntentResult
                        intent={intent}
                        compact
                        onStartExecution={intent.plan ? handleStartExecution : undefined}
                        onCreateGoal={
                          intent.type === 'build-strategy' || intent.type === 'create-goal'
                            ? () => {
                                closeCommandPalette();
                                openCreateGoal();
                              }
                            : undefined
                        }
                        onPickChip={(text) => {
                          setAskInput(text);
                          setIntent(null);
                          setTimeout(() => submitAsk(), 10);
                        }}
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setIntent(null);
                            setAskInput('');
                            askInputRef.current?.focus();
                          }}
                          className="text-xs text-text-3 hover:text-text-2"
                        >
                          {t('Ask something else')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-text-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="kbd">↑</kbd>
                  <kbd className="kbd">↓</kbd> {t('navigate')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="kbd">⏎</kbd> {t('select')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="kbd">{t('esc')}</kbd> {t('close')}
                </span>
              </div>
              <span className="font-mono">ATLAS</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
